import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ProjectProcessTypeOrmEntity,
  ProjectProcessUsage,
} from './infrastructure/entities/projectProcess.ormEntity';
import {
  ProjectMemberRole,
  ProjectMemberTypeOrmEntity,
} from './infrastructure/entities/projectMember.ormEntity';

type RequestHeaders = Record<string, string | undefined>;

/**
 * Protects legacy resource/content endpoints when a resource is attached to
 * one or more projects. Common processes are read-only through these generic
 * endpoints because they need a separate central-library authorization policy.
 */
@Injectable()
export class ProjectResourceAccessService {
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(ProjectProcessTypeOrmEntity)
    private readonly projectProcesses: Repository<ProjectProcessTypeOrmEntity>,
    @InjectRepository(ProjectMemberTypeOrmEntity)
    private readonly projectMembers: Repository<ProjectMemberTypeOrmEntity>,
  ) {}

  async assertCanEditResource(resourceId: string, headers: RequestHeaders) {
    const userId = this.getUserId(headers);
    const links = await this.projectProcesses.find({ where: { resourceId } });

    // Preserve existing ACL behavior for resources not yet attached to a project.
    if (!links.length) return;

    if (links.some((link) => link.usage === ProjectProcessUsage.Common)) {
      throw new ForbiddenException(
        'Common processes are read-only through resource endpoints',
      );
    }

    const memberships = await this.projectMembers.find({
      where: links.map((link) => ({ projectId: link.projectId, userId })),
    });
    const roleByProject = new Map(
      memberships.map((membership) => [membership.projectId, membership.role]),
    );

    const canEditEveryProject = links.every((link) => {
      const role = roleByProject.get(link.projectId);
      return role === ProjectMemberRole.Modeler || role === ProjectMemberRole.Admin;
    });

    if (!canEditEveryProject) {
      throw new ForbiddenException(
        'Editing this resource requires modeler access to every linked project',
      );
    }
  }

  private getUserId(headers: RequestHeaders): string {
    const configuredHeader = this.configService.getOrThrow<string>('userHeader');
    const userId =
      headers[configuredHeader] ?? headers[configuredHeader.toLowerCase()];
    if (!userId?.trim()) {
      throw new ForbiddenException('Authenticated user identity is missing');
    }
    return userId.trim();
  }
}
