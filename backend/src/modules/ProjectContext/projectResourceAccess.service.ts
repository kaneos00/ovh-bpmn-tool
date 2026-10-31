import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ResourceTypeOrmEntity } from '../ResourceContext/infrastructure/entities/resource.ormEntity';
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
    @InjectRepository(ResourceTypeOrmEntity)
    private readonly resources: Repository<ResourceTypeOrmEntity>,
  ) {}

  /** Resolve the trusted identity header consistently across project controllers. */
  getAuthenticatedUserId(headers: RequestHeaders): string {
    const configuredHeader =
      this.configService.getOrThrow<string>('userHeader');
    const userId =
      headers[configuredHeader] ?? headers[configuredHeader.toLowerCase()];
    if (!userId?.trim()) {
      throw new ForbiddenException('Authenticated user identity is missing');
    }
    return userId.trim();
  }

  /** Organization-level group checks shared by project controllers. */
  hasOrganizationAdminRole(headers: RequestHeaders): boolean {
    return this.getUserGroups(headers).some((group) =>
      group.startsWith('bpmn-tool-admin-'),
    );
  }

  hasOrganizationReadWriteRole(headers: RequestHeaders): boolean {
    return this.getUserGroups(headers).some((group) =>
      group.startsWith('bpmn-tool-readwrite-'),
    );
  }

  /** Shared role hierarchy for project-scoped controllers. */
  async assertProjectRole(
    projectId: string,
    headers: RequestHeaders,
    minimumRole: ProjectMemberRole,
  ): Promise<string> {
    const userId = this.getAuthenticatedUserId(headers);
    const membership = await this.projectMembers.findOne({
      where: { projectId, userId },
    });
    const rank: Record<ProjectMemberRole, number> = {
      [ProjectMemberRole.Viewer]: 1,
      [ProjectMemberRole.Modeler]: 2,
      [ProjectMemberRole.Admin]: 3,
    };
    if (!membership || rank[membership.role] < rank[minimumRole]) {
      throw new ForbiddenException('Insufficient project role');
    }
    return userId;
  }

  async assertCanReadResource(resourceId: string, headers: RequestHeaders) {
    const userId = this.getAuthenticatedUserId(headers);
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
    const userId = this.getAuthenticatedUserId(headers);
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

  /**
   * Cloning creates a new resource and never mutates the source. Global ACL
   * still gates the endpoint; project-specific sources additionally require
   * modeler/admin rights so a viewer cannot export a private process.
   */
  async assertCanCloneResource(resourceId: string, headers: RequestHeaders) {
    const links = await this.projectProcesses.find({ where: { resourceId } });
    const restrictedLinks = links.filter(
      (link) => link.usage !== ProjectProcessUsage.Common,
    );
    if (!restrictedLinks.length) return;

    const userId = this.getAuthenticatedUserId(headers);
    const memberships = await this.projectMembers.find({
      where: restrictedLinks.map((link) => ({
        projectId: link.projectId,
        userId,
      })),
    });
    const roleByProject = new Map(
      memberships.map((membership) => [membership.projectId, membership.role]),
    );
    const canClone = restrictedLinks.every((link) => {
      const role = roleByProject.get(link.projectId);
      return (
        role === ProjectMemberRole.Modeler || role === ProjectMemberRole.Admin
      );
    });
    if (!canClone) {
      throw new ForbiddenException(
        'Cloning a project-specific process requires modeler access to every linked project',
      );
    }
  }

  async assertCanEditResource(
    resourceId: string,
    headers: RequestHeaders,
    options: { allowCommonForOrganizationAdmin?: boolean } = {},
  ) {
    const userId = this.getAuthenticatedUserId(headers);
    const links = await this.projectProcesses.find({ where: { resourceId } });

    // Preserve existing ACL behavior for resources not yet attached to a project.
    if (!links.length) return;

    if (links.some((link) => link.usage === ProjectProcessUsage.Common)) {
      if (
        options.allowCommonForOrganizationAdmin &&
        this.hasOrganizationAdminRole(headers)
      ) {
        return;
      }
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

  async assertCanDeleteResource(resourceId: string) {
    const links = await this.projectProcesses.find({ where: { resourceId } });
    if (links.some((link) => link.usage === ProjectProcessUsage.Common)) {
      throw new ForbiddenException(
        'Common processes cannot be deleted through generic resource endpoints',
      );
    }

    const linkedProjectIds = new Set(links.map((link) => link.projectId));
    if (linkedProjectIds.size > 1) {
      throw new BadRequestException(
        'This process is shared by multiple projects; unlink it from all projects before deleting it',
      );
    }

    const dependentVariants = await this.projectProcesses.count({
      where: { sourceResourceId: resourceId },
    });
    if (dependentVariants > 0) {
      throw new BadRequestException(
        'This process is the source of one or more variants; remove those variants before deleting the source process',
      );
    }
  }

  /**
   * Resource deletion removes the selected resource and its descendant tree.
   * Check every affected resource first so a folder cannot bypass project
   * access rules by deleting a protected child process indirectly.
   */
  async assertCanDeleteResourceTree(
    resourceId: string,
    headers: RequestHeaders,
  ) {
    const resourceIds = [resourceId];
    const visited = new Set(resourceIds);
    let parentIds = [resourceId];

    while (parentIds.length) {
      const children = await this.resources.find({
        where: { parentId: In(parentIds) },
        select: { id: true, parentId: true },
      });
      const nextParentIds = children
        .map((child) => child.id)
        .filter((id) => !visited.has(id));

      for (const id of nextParentIds) {
        visited.add(id);
        resourceIds.push(id);
      }
      parentIds = nextParentIds;
    }

    for (const id of resourceIds) {
      await this.assertCanEditResource(id, headers);
      await this.assertCanDeleteResource(id);
    }
  }

  private getUserGroups(headers: RequestHeaders): string[] {
    const configuredHeader =
      this.configService.getOrThrow<string>('userGroupsHeader');
    const groups =
      headers[configuredHeader] ??
      headers[configuredHeader.toLowerCase()] ??
      '';
    return groups.split(',').map((group) => group.trim());
  }
}
