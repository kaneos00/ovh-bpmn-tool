import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Param,
  Put,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { UseAcl } from '../../../../shared-kernel/modules/acl/infrastructure/acl.decorator';
import { UserGroup } from '../../../../shared-kernel/utils/UserGroup';
import { ProjectMemberRole, ProjectMemberTypeOrmEntity } from '../entities/projectMember.ormEntity';
import { ProjectProcessTypeOrmEntity } from '../entities/projectProcess.ormEntity';
import {
  ProjectRaciEntryTypeOrmEntity,
  ProjectRaciRole,
} from '../entities/projectRaciEntry.ormEntity';

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
    const userId = await this.assertRole(projectId, headers, ProjectMemberRole.Modeler);
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
        throw new BadRequestException(`RACI entry ${index} contains an oversized field`);
      }
      if (!Object.values(ProjectRaciRole).includes(entry.role as ProjectRaciRole)) {
        throw new BadRequestException(`RACI entry ${index} has an invalid role`);
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
      const key = [entry.resourceId, entry.taskId, entry.actorName].join('|');
      if (unique.has(key)) {
        throw new BadRequestException(
          'An actor can have only one RACI role per task in a process',
        );
      }
      unique.add(key);
    }

    if (normalized.length) {
      const processIds = [...new Set(normalized.map((entry) => entry.resourceId))];
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

  private async assertRole(
    projectId: string,
    headers: RequestHeaders,
    minimumRole: ProjectMemberRole,
  ): Promise<string> {
    const configuredHeader = this.configService.getOrThrow<string>('userHeader');
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
