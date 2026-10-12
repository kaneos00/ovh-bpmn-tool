import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { UseAcl } from '../../../../shared-kernel/modules/acl/infrastructure/acl.decorator';
import { UserGroup } from '../../../../shared-kernel/utils/UserGroup';
import {
  ProjectMemberRole,
  ProjectMemberTypeOrmEntity,
} from '../entities/projectMember.ormEntity';
import { ProjectProcessTypeOrmEntity } from '../entities/projectProcess.ormEntity';
import {
  ProjectRaciEntryTypeOrmEntity,
  ProjectRaciRole,
} from '../entities/projectRaciEntry.ormEntity';
import { ProjectRaciActorTypeOrmEntity } from '../entities/projectRaciActor.ormEntity';

type RequestHeaders = Record<string, string | undefined>;

type RaciEntryInput = {
  resourceId?: string;
  taskId?: string;
  taskName?: string;
  actorName?: string;
  role?: ProjectRaciRole;
};

@Controller('projects/:projectId/raci')
export class ProjectRaciController {
  constructor(
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
    @InjectRepository(ProjectMemberTypeOrmEntity)
    private readonly projectMembers: Repository<ProjectMemberTypeOrmEntity>,
    @InjectRepository(ProjectProcessTypeOrmEntity)
    private readonly projectProcesses: Repository<ProjectProcessTypeOrmEntity>,
    @InjectRepository(ProjectRaciEntryTypeOrmEntity)
    private readonly entries: Repository<ProjectRaciEntryTypeOrmEntity>,
    @InjectRepository(ProjectRaciActorTypeOrmEntity)
    private readonly actors: Repository<ProjectRaciActorTypeOrmEntity>,
  ) {}

  @Get()
  @UseAcl()
  async getProjectRaci(
    @Param('projectId') projectId: string,
    @Headers() headers: RequestHeaders,
  ) {
    await this.assertRole(projectId, headers, ProjectMemberRole.Viewer);
    return this.entries.find({
      where: { projectId },
      order: { resourceId: 'ASC', taskName: 'ASC', actorName: 'ASC' },
    });
  }

  /**
   * Replaces the project's RACI matrix atomically. The client should send the
   * complete current matrix; each assignment is scoped to a process linked to
   * this project and to a stable BPMN element id.
   */
  @Put()
  @UseAcl([UserGroup.RW])
  async replaceProjectRaci(
    @Param('projectId') projectId: string,
    @Body() body: { entries?: RaciEntryInput[] },
    @Headers() headers: RequestHeaders,
  ) {
    const userId = await this.assertRole(
      projectId,
      headers,
      ProjectMemberRole.Modeler,
    );
    if (!Array.isArray(body.entries)) {
      throw new BadRequestException('entries must be an array');
    }

    const normalized = body.entries.map((entry, index) => {
      const resourceId = entry.resourceId?.trim();
      const taskId = entry.taskId?.trim();
      const taskName = entry.taskName?.trim();
      const actorName = entry.actorName?.trim();
      if (!resourceId || !taskId || !taskName || !actorName) {
        throw new BadRequestException(
          `RACI entry ${index} requires resourceId, taskId, taskName and actorName`,
        );
      }
      if (
        resourceId.length > 36 ||
        taskId.length > 255 ||
        taskName.length > 255 ||
        actorName.length > 255
      ) {
        throw new BadRequestException(
          `RACI entry ${index} contains an oversized field`,
        );
      }
      if (
        !Object.values(ProjectRaciRole).includes(entry.role as ProjectRaciRole)
      ) {
        throw new BadRequestException(
          `RACI entry ${index} has an invalid role`,
        );
      }
      return {
        projectId,
        createdBy: userId,
        resourceId,
        taskId,
        taskName,
        actorName,
        role: entry.role as ProjectRaciRole,
      };
    });

    const unique = new Set<string>();
    for (const entry of normalized) {
      const key = JSON.stringify([
        entry.resourceId,
        entry.taskId,
        this.normalizeActorName(entry.actorName),
      ]);
      if (unique.has(key)) {
        throw new BadRequestException(
          'An actor can have only one RACI role per task in a process',
        );
      }
      unique.add(key);
    }

    if (normalized.length) {
      const registeredActors = await this.actors.find({
        where: { projectId, active: true },
      });
      const registeredNames = new Set(
        registeredActors.map((actor) => actor.normalizedName),
      );
      const unregistered = normalized.find(
        (entry) =>
          !registeredNames.has(this.normalizeActorName(entry.actorName)),
      );
      if (unregistered) {
        throw new BadRequestException(
          `Actor "${unregistered.actorName}" is not registered in this project`,
        );
      }
    }

    if (normalized.length) {
      const processIds = [
        ...new Set(normalized.map((entry) => entry.resourceId)),
      ];
      const linked = await this.projectProcesses.find({
        where: { projectId, resourceId: In(processIds) },
      });
      const linkedIds = new Set(linked.map((link) => link.resourceId));
      const unknown = processIds.find((id) => !linkedIds.has(id));
      if (unknown) {
        throw new BadRequestException(
          `Process ${unknown} is not linked to project ${projectId}`,
        );
      }
    }

    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(ProjectRaciEntryTypeOrmEntity);
      await repository.delete({ projectId });
      if (!normalized.length) return [];
      return repository.save(repository.create(normalized));
    });
  }

  @Get('actors')
  @UseAcl()
  async getProjectActors(
    @Param('projectId') projectId: string,
    @Headers() headers: RequestHeaders,
  ) {
    await this.assertRole(projectId, headers, ProjectMemberRole.Viewer);
    return this.actors.find({
      where: { projectId },
      order: { active: 'DESC', name: 'ASC' },
    });
  }

  @Post('actors')
  @UseAcl([UserGroup.RW])
  async createProjectActor(
    @Param('projectId') projectId: string,
    @Body() body: { name?: string },
    @Headers() headers: RequestHeaders,
  ) {
    const userId = await this.assertRole(
      projectId,
      headers,
      ProjectMemberRole.Modeler,
    );
    const name = this.validateActorName(body.name);
    const normalizedName = this.normalizeActorName(name);
    const existing = await this.actors.findOne({
      where: { projectId, normalizedName },
    });
    if (existing) {
      throw new ConflictException(
        'An actor with this name already exists in the project',
      );
    }
    try {
      return await this.actors.save(
        this.actors.create({
          projectId,
          name,
          normalizedName,
          active: true,
          origin: 'manual',
          createdBy: userId,
        }),
      );
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictException(
          'An actor with this name already exists in the project',
        );
      }
      throw error;
    }
  }

  /**
   * Adds actors found in published BPMN diagrams without reactivating an actor
   * that a project administrator or modeler has deliberately deactivated.
   */
  @Post('actors/sync')
  @UseAcl([UserGroup.RW])
  async syncProjectActors(
    @Param('projectId') projectId: string,
    @Body() body: { names?: string[] },
    @Headers() headers: RequestHeaders,
  ) {
    const userId = await this.assertRole(
      projectId,
      headers,
      ProjectMemberRole.Modeler,
    );
    if (!Array.isArray(body.names) || body.names.length > 500) {
      throw new BadRequestException(
        'names must be an array containing at most 500 actor names',
      );
    }

    const normalized = new Map<string, string>();
    for (const value of body.names) {
      const name = this.validateActorName(value);
      const key = this.normalizeActorName(name);
      if (!normalized.has(key)) normalized.set(key, name);
    }

    const existing = await this.actors.find({ where: { projectId } });
    const known = new Set(existing.map((actor) => actor.normalizedName));
    const additions = [...normalized.entries()]
      .filter(([key]) => !known.has(key))
      .map(([normalizedName, name]) => ({
        projectId,
        name,
        normalizedName,
        active: true,
        origin: 'bpmn' as const,
        createdBy: userId,
      }));

    if (additions.length) {
      await this.dataSource.transaction(async (manager) => {
        await manager
          .createQueryBuilder()
          .insert()
          .into(ProjectRaciActorTypeOrmEntity)
          .values(additions)
          .orIgnore()
          .execute();
      });
    }

    return this.actors.find({
      where: { projectId },
      order: { active: 'DESC', name: 'ASC' },
    });
  }

  @Put('actors/:actorId')
  @UseAcl([UserGroup.RW])
  async renameProjectActor(
    @Param('projectId') projectId: string,
    @Param('actorId') actorId: string,
    @Body() body: { name?: string },
    @Headers() headers: RequestHeaders,
  ) {
    await this.assertRole(projectId, headers, ProjectMemberRole.Modeler);
    const name = this.validateActorName(body.name);
    const normalizedName = this.normalizeActorName(name);

    return this.dataSource.transaction(async (manager) => {
      const actors = manager.getRepository(ProjectRaciActorTypeOrmEntity);
      const entries = manager.getRepository(ProjectRaciEntryTypeOrmEntity);
      const actor = await actors.findOne({
        where: { id: actorId, projectId },
      });
      if (!actor) throw new NotFoundException('Project actor not found');
      const duplicate = await actors.findOne({
        where: { projectId, normalizedName },
      });
      if (duplicate && duplicate.id !== actor.id) {
        throw new ConflictException(
          'An actor with this name already exists in the project',
        );
      }

      if (actor.name !== name) {
        // Avoid collapsing two legacy assignments into the same unique cell.
        const conflictingAssignments = await entries
          .createQueryBuilder('entry')
          .where('entry."projectId" = :projectId', { projectId })
          .andWhere('lower(btrim(entry."actorName")) = :normalizedName', {
            normalizedName,
          })
          .andWhere('lower(btrim(entry."actorName")) <> :oldName', {
            oldName: actor.normalizedName,
          })
          .getCount();
        if (conflictingAssignments > 0) {
          throw new ConflictException(
            'Assignments already exist under the target actor name; reconcile them before renaming',
          );
        }
        await entries
          .createQueryBuilder()
          .update(ProjectRaciEntryTypeOrmEntity)
          .set({ actorName: name, updatedAt: () => 'now()' })
          .where('"projectId" = :projectId', { projectId })
          .andWhere('lower(btrim("actorName")) = :oldName', {
            oldName: actor.normalizedName,
          })
          .execute();
        actor.name = name;
        actor.normalizedName = normalizedName;
        await actors.save(actor);
      }
      return actor;
    });
  }

  @Patch('actors/:actorId')
  @UseAcl([UserGroup.RW])
  async setProjectActorActive(
    @Param('projectId') projectId: string,
    @Param('actorId') actorId: string,
    @Body() body: { active?: boolean },
    @Headers() headers: RequestHeaders,
  ) {
    await this.assertRole(projectId, headers, ProjectMemberRole.Modeler);
    if (typeof body.active !== 'boolean') {
      throw new BadRequestException('active must be a boolean');
    }
    const actor = await this.actors.findOne({
      where: { id: actorId, projectId },
    });
    if (!actor) throw new NotFoundException('Project actor not found');
    actor.active = body.active;
    return this.actors.save(actor);
  }

  private validateActorName(value?: string): string {
    if (typeof value !== 'string') {
      throw new BadRequestException('Actor name is required');
    }
    const name = value.trim();
    if (!name || name.length > 255) {
      throw new BadRequestException(
        'Actor name must contain 1 to 255 characters',
      );
    }
    return name;
  }

  private normalizeActorName(name: string): string {
    return name.trim().toLocaleLowerCase();
  }

  private async assertRole(
    projectId: string,
    headers: RequestHeaders,
    minimumRole: ProjectMemberRole,
  ): Promise<string> {
    const configuredHeader =
      this.configService.getOrThrow<string>('userHeader');
    const userId =
      headers[configuredHeader] ?? headers[configuredHeader.toLowerCase()];
    if (!userId?.trim()) {
      throw new ForbiddenException('Authenticated user identity is missing');
    }
    const membership = await this.projectMembers.findOne({
      where: { projectId, userId: userId.trim() },
    });
    const rank = {
      [ProjectMemberRole.Viewer]: 1,
      [ProjectMemberRole.Modeler]: 2,
      [ProjectMemberRole.Admin]: 3,
    };
    if (!membership || rank[membership.role] < rank[minimumRole]) {
      throw new ForbiddenException('Insufficient project role for RACI access');
    }
    return userId.trim();
  }
}
