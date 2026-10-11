import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
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

  async assertCanReadResource(resourceId: string, headers: RequestHeaders) {
    const userId = this.getUserId(headers);
    const links = await this.projectProcesses.find({ where: { resourceId } });
    if (
      !links.length ||
      links.some((link) => link.usage === ProjectProcessUsage.Common)
    ) {
      return;
    }

    const memberships = await this.projectMembers.find({
      where: links.map((link) => ({ projectId: link.projectId, userId })),
    });
    if (!memberships.length) {
      throw new ForbiddenException(
        'Reading this resource requires membership in a linked project',
      );
    }
  }

  async filterReadableResources<T extends { id: string | { value: string } }>(
    resources: T[],
    headers: RequestHeaders,
  ): Promise<T[]> {
    if (!resources.length) return resources;
    const userId = this.getUserId(headers);
    const resourceIds = resources.map(({ id }) =>
      typeof id === 'string' ? id : id.value,
    );
    const links = await this.projectProcesses.find({
      where: { resourceId: In(resourceIds) },
    });
    const linkedResourceIds = new Set(links.map((link) => link.resourceId));
    const globallyReadableIds = new Set(
      links
        .filter((link) => link.usage === ProjectProcessUsage.Common)
        .map((link) => link.resourceId),
    );
    const restrictedLinks = links.filter(
      (link) => link.usage !== ProjectProcessUsage.Common,
    );
    const memberships = restrictedLinks.length
      ? await this.projectMembers.find({
          where: restrictedLinks.map((link) => ({
            projectId: link.projectId,
            userId,
          })),
        })
      : [];
    const allowedProjectIds = new Set(
      memberships.map((membership) => membership.projectId),
    );
    const allowedResourceIds = new Set(
      restrictedLinks
        .filter((link) => allowedProjectIds.has(link.projectId))
        .map((link) => link.resourceId),
    );

    return resources.filter(({ id }) => {
      const resourceId = typeof id === 'string' ? id : id.value;
      return (
        !linkedResourceIds.has(resourceId) ||
        globallyReadableIds.has(resourceId) ||
        allowedResourceIds.has(resourceId)
      );
    });
  }

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
      return (
        role === ProjectMemberRole.Modeler || role === ProjectMemberRole.Admin
      );
    });

    if (!canEditEveryProject) {
      throw new ForbiddenException(
        'Editing this resource requires modeler access to every linked project',
      );
    }
  }

  private getUserId(headers: RequestHeaders): string {
    const configuredHeader = this.configService.getOrThrow<string>(
      'userHeader',
    );
    const userId =
      headers[configuredHeader] ?? headers[configuredHeader.toLowerCase()];
    if (!userId?.trim()) {
      throw new ForbiddenException('Authenticated user identity is missing');
    }
    return userId.trim();
  }
}
