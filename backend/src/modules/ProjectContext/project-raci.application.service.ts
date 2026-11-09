import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectMemberRole } from './infrastructure/entities/projectMember.ormEntity';
import { ProjectTypeOrmEntity } from './infrastructure/entities/project.ormEntity';
import { ProjectProcessTypeOrmEntity } from './infrastructure/entities/projectProcess.ormEntity';
import { ProjectRaciActorTypeOrmEntity } from './infrastructure/entities/projectRaciActor.ormEntity';
import { ProjectRaciEntryTypeOrmEntity } from './infrastructure/entities/projectRaciEntry.ormEntity';
import { ProjectResourceAccessService } from './projectResourceAccess.service';

export type ProjectRaciRequestHeaders = Record<string, string | undefined>;

export interface ProjectRaciScopeSnapshot {
  projectId: string;
  resourceId: string;
  /** Actor register is project-wide in the current schema, not resource-scoped. */
  actors: ProjectRaciActorTypeOrmEntity[];
  /** Assignments are restricted to the selected project and process. */
  entries: ProjectRaciEntryTypeOrmEntity[];
}

/**
 * Narrow read facade for consumers outside ProjectContext.
 *
 * It deliberately exposes no mutation API until a transaction-scoped
 * application unit of work can coordinate RACI rows and BPMN publication.
 */
@Injectable()
export class ProjectRaciApplicationService {
  constructor(
    private readonly access: ProjectResourceAccessService,
    @InjectRepository(ProjectProcessTypeOrmEntity)
    private readonly projectProcesses: Repository<ProjectProcessTypeOrmEntity>,
    @InjectRepository(ProjectRaciActorTypeOrmEntity)
    private readonly actors: Repository<ProjectRaciActorTypeOrmEntity>,
    @InjectRepository(ProjectRaciEntryTypeOrmEntity)
    private readonly entries: Repository<ProjectRaciEntryTypeOrmEntity>,
  ) {}

  async readProjectRaciScope(
    projectId: string,
    resourceId: string,
    headers: ProjectRaciRequestHeaders,
  ): Promise<ProjectRaciScopeSnapshot> {
    await this.access.assertProjectRole(
      projectId,
      headers,
      ProjectMemberRole.Viewer,
    );

    const link = await this.projectProcesses.findOne({
      where: { projectId, resourceId },
    });
    if (!link) {
      throw new NotFoundException(
        'The selected process is not linked to this project',
      );
    }

    const [actors, entries] = await Promise.all([
      this.actors.find({
        where: { projectId },
        order: { active: 'DESC', name: 'ASC' },
      }),
      this.entries.find({
        where: { projectId, resourceId },
        order: { taskName: 'ASC', actorName: 'ASC' },
      }),
    ]);

    return { projectId, resourceId, actors, entries };
  }

  async readProjectRaciRegistry(
    projectId: string,
    headers: ProjectRaciRequestHeaders,
  ): Promise<ProjectRaciActorTypeOrmEntity[]> {
    await this.access.assertProjectRole(
      projectId,
      headers,
      ProjectMemberRole.Viewer,
    );
    return this.actors.find({
      where: { projectId },
      order: { active: 'DESC', name: 'ASC' },
    });
  }

  /**
   * Cross-project actor inventory for the isolated governance module.
   * This is deliberately read-only and requires organization-admin authority;
   * project membership is not sufficient for a cross-project view.
   */
  async readOrganizationActorInventory(
    headers: ProjectRaciRequestHeaders,
  ): Promise<
    Array<{
      projectId: string;
      projectName: string;
      actorId: string;
      actorName: string;
      normalizedName: string;
      active: boolean;
      origin: string;
    }>
  > {
    if (!this.access.hasOrganizationAdminRole(headers)) {
      throw new ForbiddenException(
        'Organization administrator role is required',
      );
    }

    return this.actors
      .createQueryBuilder('actor')
      .innerJoin(
        ProjectTypeOrmEntity,
        'project',
        'project.id = actor."projectId"',
      )
      .select('actor."projectId"', 'projectId')
      .addSelect('project.name', 'projectName')
      .addSelect('actor.id', 'actorId')
      .addSelect('actor.name', 'actorName')
      .addSelect('actor."normalizedName"', 'normalizedName')
      .addSelect('actor.active', 'active')
      .addSelect('actor.origin', 'origin')
      .orderBy('project.name', 'ASC')
      .addOrderBy('actor.name', 'ASC')
      .getRawMany();
  }
}
