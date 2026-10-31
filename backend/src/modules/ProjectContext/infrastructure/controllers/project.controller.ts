import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Headers,
  NotFoundException,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, IsNull, Repository } from 'typeorm';
import { UseAcl } from '../../../../shared-kernel/modules/acl/infrastructure/acl.decorator';
import { UserGroup } from '../../../../shared-kernel/utils/UserGroup';
import { ResourceTypeOrmEntity } from '../../../ResourceContext/infrastructure/entities/resource.ormEntity';
import { ResourceTypeEnum } from '../../../ResourceContext/shared/types/Resource';
import { ContentTypeOrmEntity } from '../../../ResourceContext/infrastructure/entities/content.ormEntity';
import { ContentStatusEnum } from '../../../ResourceContext/shared/types/Content';
import {
  ProjectProcessTypeOrmEntity,
  ProjectProcessUsage,
} from '../entities/projectProcess.ormEntity';
import { ProjectTypeOrmEntity } from '../entities/project.ormEntity';
import {
  ProjectMemberRole,
  ProjectMemberTypeOrmEntity,
} from '../entities/projectMember.ormEntity';
import { ProjectResourceAccessService } from '../../projectResourceAccess.service';

type RequestHeaders = Record<string, string | undefined>;

@Controller('projects')
export class ProjectController {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(ProjectTypeOrmEntity)
    private readonly projects: Repository<ProjectTypeOrmEntity>,
    @InjectRepository(ProjectProcessTypeOrmEntity)
    private readonly projectProcesses: Repository<ProjectProcessTypeOrmEntity>,
    @InjectRepository(ResourceTypeOrmEntity)
    private readonly resources: Repository<ResourceTypeOrmEntity>,
    @InjectRepository(ProjectMemberTypeOrmEntity)
    private readonly projectMembers: Repository<ProjectMemberTypeOrmEntity>,
    private readonly projectResourceAccess: ProjectResourceAccessService,
  ) {}

  @Get()
  @UseAcl()
  async listProjects(@Headers() headers: RequestHeaders) {
    const userId = this.projectResourceAccess.getAuthenticatedUserId(headers);
    const memberships = await this.projectMembers.find({ where: { userId } });
    if (!memberships.length) return [];
    return this.projects.find({
      where: { id: In(memberships.map(({ projectId }) => projectId)) },
      order: { name: 'ASC' },
    });
  }

  /**
   * Signed-in user's workspace: only projects linked to their membership,
   * with their project role and the processes available in each project.
   */
  @Get('me/workspace')
  @UseAcl()
  async getMyWorkspace(@Headers() headers: RequestHeaders) {
    const userId = this.projectResourceAccess.getAuthenticatedUserId(headers);
    const memberships = await this.projectMembers.find({
      where: { userId },
      order: { createdAt: 'ASC' },
    });
    if (!memberships.length) return { userId, projects: [] };

    const projectIds = [
      ...new Set(memberships.map(({ projectId }) => projectId)),
    ];
    const [projects, links] = await Promise.all([
      this.projects.find({
        where: { id: In(projectIds) },
        order: { name: 'ASC' },
      }),
      this.projectProcesses.find({
        where: { projectId: In(projectIds) },
        order: { createdAt: 'ASC' },
      }),
    ]);
    const resourceIds = [...new Set(links.map(({ resourceId }) => resourceId))];
    const resources = resourceIds.length
      ? await this.resources.find({
          where: { id: In(resourceIds), type: ResourceTypeEnum.Process },
        })
      : [];
    const resourceById = new Map(
      resources.map((resource) => [resource.id, resource]),
    );
    const linksByProject = new Map<string, typeof links>();
    for (const link of links) {
      const projectLinks = linksByProject.get(link.projectId) ?? [];
      projectLinks.push(link);
      linksByProject.set(link.projectId, projectLinks);
    }
    const roleByProject = new Map(
      memberships.map(({ projectId, role }) => [projectId, role]),
    );

    return {
      userId,
      projects: projects.map((project) => ({
        id: project.id,
        name: project.name,
        description: project.description,
        role: roleByProject.get(project.id),
        processes: (linksByProject.get(project.id) ?? []).map((link) => ({
          resourceId: link.resourceId,
          name: resourceById.get(link.resourceId)?.name ?? link.resourceId,
          usage: link.usage,
          sourceResourceId: link.sourceResourceId,
        })),
      })),
    };
  }

  /**
   * Sharing metadata for the process description page.
   * The shared flag is available to every reader; project names are limited to
   * read-write/admin profiles, and navigation is authorized per project.
   */
  @Get('processes/:resourceId/shares')
  @UseAcl()
  async getProcessShares(
    @Param('resourceId') resourceId: string,
    @Headers() headers: RequestHeaders,
  ) {
    await this.projectResourceAccess.assertCanReadResource(resourceId, headers);
    const links = await this.projectProcesses.find({
      where: { resourceId },
      order: { createdAt: 'ASC' },
    });
    const projectIds = [...new Set(links.map((link) => link.projectId))];
    if (!projectIds.length) return { shared: false, projects: [] };

    const userId = this.projectResourceAccess.getAuthenticatedUserId(headers);
    const isOrganizationAdmin =
      this.projectResourceAccess.hasOrganizationAdminRole(headers);
    const canSeeProjectNames =
      isOrganizationAdmin ||
      this.projectResourceAccess.hasOrganizationReadWriteRole(headers);
    const memberships = await this.projectMembers.find({
      where: projectIds.map((projectId) => ({ projectId, userId })),
    });
    const roleByProject = new Map(
      memberships.map((membership) => [membership.projectId, membership.role]),
    );
    const projects = canSeeProjectNames
      ? await this.projects.find({
          where: { id: In(projectIds) },
          order: { name: 'ASC' },
        })
      : [];

    return {
      shared: projectIds.length > 1,
      projects: projects.map((project) => ({
        id: project.id,
        name: project.name,
        canNavigate:
          isOrganizationAdmin ||
          roleByProject.get(project.id) === ProjectMemberRole.Admin,
      })),
    };
  }

  @Post()
  @UseAcl([UserGroup.RW, UserGroup.Admin])
  async createProject(
    @Body() body: { name?: string; description?: string },
    @Headers() headers: RequestHeaders,
  ) {
    const userId = this.projectResourceAccess.getAuthenticatedUserId(headers);
    const name = body.name?.trim();
    if (!name) throw new BadRequestException('Project name is required');
    if (name.length > 255) {
      throw new BadRequestException(
        'Project name must be 255 characters or fewer',
      );
    }

    const project = this.projects.create({
      name,
      description: body.description?.trim() || null,
      createdBy: userId,
    });

    try {
      const savedProject = await this.projects.save(project);
      try {
        await this.projectMembers.save(
          this.projectMembers.create({
            projectId: savedProject.id,
            userId,
            role: ProjectMemberRole.Admin,
            createdBy: userId,
          }),
        );
      } catch (error) {
        await this.projects.delete({ id: savedProject.id });
        throw error;
      }
      return savedProject;
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictException('A project with this name already exists');
      }
      throw error;
    }
  }

  /**
   * Organization-wide read model for the administration screens.
   *
   * Access is restricted to the dedicated organization administrator ACL
   * group. User identities are sourced from project membership records
   * because this application does not own an organization-wide identity directory.
   */
  @Get('administration/overview')
  @UseAcl([UserGroup.Admin])
  async getAdministrationOverview() {
    const [projects, memberships, links, processResources] = await Promise.all([
      this.projects.find({ order: { name: 'ASC' } }),
      this.projectMembers.find({ order: { userId: 'ASC' } }),
      this.projectProcesses.find({ order: { createdAt: 'ASC' } }),
      this.resources.find({
        where: { type: ResourceTypeEnum.Process },
        order: { name: 'ASC' },
      }),
    ]);

    const projectById = new Map(
      projects.map((project) => [project.id, project]),
    );
    const resourceById = new Map(
      processResources.map((resource) => [resource.id, resource]),
    );
    const membershipsByProject = new Map<string, typeof memberships>();
    const linksByProject = new Map<string, typeof links>();
    const membershipsByUser = new Map<string, typeof memberships>();
    const linksByResource = new Map<string, typeof links>();

    for (const membership of memberships) {
      const projectMemberships =
        membershipsByProject.get(membership.projectId) ?? [];
      projectMemberships.push(membership);
      membershipsByProject.set(membership.projectId, projectMemberships);

      const userMemberships = membershipsByUser.get(membership.userId) ?? [];
      userMemberships.push(membership);
      membershipsByUser.set(membership.userId, userMemberships);
    }

    for (const link of links) {
      const projectLinks = linksByProject.get(link.projectId) ?? [];
      projectLinks.push(link);
      linksByProject.set(link.projectId, projectLinks);

      const resourceLinks = linksByResource.get(link.resourceId) ?? [];
      resourceLinks.push(link);
      linksByResource.set(link.resourceId, resourceLinks);
    }

    return {
      projects: projects.map((project) => ({
        ...project,
        membersCount: (membershipsByProject.get(project.id) ?? []).length,
        processes: (linksByProject.get(project.id) ?? []).map((link) => ({
          resourceId: link.resourceId,
          name: resourceById.get(link.resourceId)?.name ?? link.resourceId,
          usage: link.usage,
          sourceResourceId: link.sourceResourceId,
        })),
      })),
      users: [...membershipsByUser.entries()]
        .map(([userId, userMemberships]) => ({
          userId,
          projects: userMemberships
            .map((membership) => ({
              projectId: membership.projectId,
              projectName:
                projectById.get(membership.projectId)?.name ??
                membership.projectId,
              role: membership.role,
            }))
            .sort((left, right) =>
              left.projectName.localeCompare(right.projectName),
            ),
        }))
        .sort((left, right) => left.userId.localeCompare(right.userId)),
      processes: processResources.map((resource) => ({
        id: resource.id,
        name: resource.name,
        description: resource.description,
        projects: (linksByResource.get(resource.id) ?? []).map((link) => ({
          projectId: link.projectId,
          projectName: projectById.get(link.projectId)?.name ?? link.projectId,
          usage: link.usage,
          sourceResourceId: link.sourceResourceId,
        })),
      })),
    };
  }

  @Put('administration/projects/:projectId/members/:userId')
  @UseAcl([UserGroup.Admin])
  async setOrganizationProjectMember(
    @Param('projectId') projectId: string,
    @Param('userId') userIdParam: string,
    @Body() body: { role?: ProjectMemberRole },
    @Headers() headers: RequestHeaders,
  ) {
    const actorId = this.projectResourceAccess.getAuthenticatedUserId(headers);
    const userId = this.validateUserId(userIdParam);
    const role = this.validateMemberRole(body.role);
    return this.changeProjectMember(projectId, userId, role, actorId);
  }

  @Delete('administration/projects/:projectId/members/:userId')
  @UseAcl([UserGroup.Admin])
  async removeOrganizationProjectMember(
    @Param('projectId') projectId: string,
    @Param('userId') userIdParam: string,
  ) {
    const userId = this.validateUserId(userIdParam);
    return this.changeProjectMember(projectId, userId, null);
  }

  @Put('administration/projects/:projectId')
  @UseAcl([UserGroup.Admin])
  async updateOrganizationProject(
    @Param('projectId') projectId: string,
    @Body() body: { name?: string; description?: string },
  ) {
    const project = await this.assertProjectExists(projectId);

    if (body.name !== undefined) {
      const name = body.name.trim();
      if (!name || name.length > 255) {
        throw new BadRequestException(
          'Project name must contain 1 to 255 characters',
        );
      }
      project.name = name;
    }
    if (body.description !== undefined) {
      project.description = body.description.trim() || null;
    }

    try {
      return await this.projects.save(project);
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictException('A project with this name already exists');
      }
      throw error;
    }
  }

  @Delete('administration/projects/:projectId')
  @UseAcl([UserGroup.Admin])
  async deleteOrganizationProject(@Param('projectId') projectId: string) {
    await this.assertProjectExists(projectId);
    const linkedProcesses = await this.projectProcesses.count({
      where: { projectId },
    });
    if (linkedProcesses > 0) {
      throw new BadRequestException(
        'Remove or delete all linked processes before deleting this project',
      );
    }
    const result = await this.projects.delete({ id: projectId });
    if (!result.affected) throw new NotFoundException('Project not found');
    return { deleted: true, projectId };
  }

  @Get(':projectId')
  @UseAcl()
  async getProject(
    @Param('projectId') projectId: string,
    @Headers() headers: RequestHeaders,
  ) {
    await this.assertProjectReadRole(projectId, headers);
    return this.assertProjectExists(projectId);
  }

  @Put(':projectId')
  @UseAcl([UserGroup.RW])
  async updateProject(
    @Param('projectId') projectId: string,
    @Body() body: { name?: string; description?: string },
    @Headers() headers: RequestHeaders,
  ) {
    await this.assertProjectRole(projectId, headers, ProjectMemberRole.Admin);
    const project = await this.assertProjectExists(projectId);

    if (body.name !== undefined) {
      const name = body.name.trim();
      if (!name || name.length > 255) {
        throw new BadRequestException(
          'Project name must contain 1 to 255 characters',
        );
      }
      project.name = name;
    }
    if (body.description !== undefined) {
      project.description = body.description.trim() || null;
    }

    try {
      return await this.projects.save(project);
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictException('A project with this name already exists');
      }
      throw error;
    }
  }

  @Delete(':projectId')
  @UseAcl([UserGroup.RW])
  async deleteProject(
    @Param('projectId') projectId: string,
    @Headers() headers: RequestHeaders,
  ) {
    await this.assertProjectRole(projectId, headers, ProjectMemberRole.Admin);
    const linkedProcesses = await this.projectProcesses.count({
      where: { projectId },
    });
    if (linkedProcesses > 0) {
      throw new BadRequestException(
        'Remove or delete all linked processes before deleting this project',
      );
    }
    const result = await this.projects.delete({ id: projectId });
    if (!result.affected) throw new NotFoundException('Project not found');
    return { deleted: true, projectId };
  }

  @Get(':projectId/processes')
  @UseAcl()
  async listProjectProcesses(
    @Param('projectId') projectId: string,
    @Headers() headers: RequestHeaders,
  ) {
    await this.assertProjectReadRole(projectId, headers);
    const links = await this.projectProcesses.find({
      where: { projectId },
      order: { createdAt: 'ASC' },
    });
    const resources = links.length
      ? await this.resources.findBy(
          links.map((link) => ({ id: link.resourceId })),
        )
      : [];
    const byId = new Map(resources.map((resource) => [resource.id, resource]));
    return links.map((link) => ({
      ...link,
      resource: byId.get(link.resourceId) ?? null,
    }));
  }

  @Post(':projectId/processes')
  @UseAcl([UserGroup.RW])
  async linkProcess(
    @Param('projectId') projectId: string,
    @Body()
    body: {
      resourceId?: string;
      usage?: ProjectProcessUsage;
      sourceResourceId?: string;
    },
    @Headers() headers: RequestHeaders,
  ) {
    const userId = this.projectResourceAccess.getAuthenticatedUserId(headers);
    await this.assertProjectRole(projectId, headers, ProjectMemberRole.Modeler);
    if (!body.resourceId) {
      throw new BadRequestException('resourceId is required');
    }

    const usage = body.usage ?? ProjectProcessUsage.ProjectSpecific;
    if (!Object.values(ProjectProcessUsage).includes(usage)) {
      throw new BadRequestException('Unsupported process usage');
    }

    if (usage === ProjectProcessUsage.Variant) {
      throw new BadRequestException(
        'Use POST /projects/:projectId/processes/variants to create an independent variant',
      );
    }

    if (usage === ProjectProcessUsage.Common) {
      await this.assertProjectRole(projectId, headers, ProjectMemberRole.Admin);
    }

    const resource = await this.resources.findOneBy({ id: body.resourceId });
    if (!resource || resource.type !== ResourceTypeEnum.Process) {
      throw new BadRequestException(
        'resourceId must identify an existing process',
      );
    }

    // Do not let a project modeler attach a restricted process by guessing its ID.
    await this.projectResourceAccess.assertCanReadResource(
      resource.id,
      headers,
    );

    if (body.sourceResourceId) {
      throw new BadRequestException(
        'sourceResourceId is only valid for variants',
      );
    }

    const link = this.projectProcesses.create({
      projectId,
      resourceId: resource.id,
      usage,
      sourceResourceId: null,
      createdBy: userId,
    });

    try {
      return await this.projectProcesses.save(link);
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictException(
          'This process is already linked to the project',
        );
      }
      throw error;
    }
  }

  @Post(':projectId/processes/variants')
  @UseAcl([UserGroup.RW])
  async createProcessVariant(
    @Param('projectId') projectId: string,
    @Body()
    body: {
      sourceResourceId?: string;
      name?: string;
      description?: string;
    },
    @Headers() headers: RequestHeaders,
  ) {
    const userId = this.projectResourceAccess.getAuthenticatedUserId(headers);
    await this.assertProjectRole(projectId, headers, ProjectMemberRole.Modeler);

    if (!body.sourceResourceId) {
      throw new BadRequestException('sourceResourceId is required');
    }
    const source = await this.resources.findOneBy({
      id: body.sourceResourceId,
    });
    if (!source || source.type !== ResourceTypeEnum.Process) {
      throw new BadRequestException(
        'sourceResourceId must identify an existing process',
      );
    }
    // Cloning must obey the same project visibility rules as opening the source.
    await this.projectResourceAccess.assertCanReadResource(source.id, headers);
    const project = await this.assertProjectExists(projectId);
    const name = body.name?.trim() || `${source.name} - ${project.name}`;
    if (!name || name.length > 255) {
      throw new BadRequestException(
        'Variant name must contain 1 to 255 characters',
      );
    }

    try {
      return await this.dataSource.transaction(async (manager) => {
        const resources = manager.getRepository(ResourceTypeOrmEntity);
        const contents = manager.getRepository(ContentTypeOrmEntity);
        const projectProcesses = manager.getRepository(
          ProjectProcessTypeOrmEntity,
        );

        const duplicate = await resources.findOne({
          where: {
            name,
            parentId: source.parentId ? source.parentId : IsNull(),
          },
        });
        if (duplicate) {
          throw new ConflictException(
            'A resource with this name already exists in the same folder',
          );
        }

        const sourceContent = await contents.findOne({
          where: {
            resourceId: source.id,
            status: ContentStatusEnum.Published,
          },
          order: { version: 'DESC', createdAt: 'DESC' },
        });
        if (!sourceContent) {
          throw new BadRequestException(
            'The source process must have a published BPMN version before it can be cloned',
          );
        }

        const variant = await resources.save(
          resources.create({
            name,
            description: body.description?.trim() || source.description || null,
            depth: source.depth,
            parentId: source.parentId,
            type: ResourceTypeEnum.Process,
            authToken: null,
            createdBy: userId,
          }),
        );

        await contents.save(
          contents.create({
            resourceId: variant.id,
            content: sourceContent.content,
            pngContent: sourceContent.pngContent,
            status: ContentStatusEnum.Draft,
            // A variant is an independent resource with its own version history.
            version: 1,
            createdBy: userId,
            updatedBy: userId,
          }),
        );

        const link = await projectProcesses.save(
          projectProcesses.create({
            projectId,
            resourceId: variant.id,
            usage: ProjectProcessUsage.Variant,
            sourceResourceId: source.id,
            createdBy: userId,
          }),
        );

        return {
          ...link,
          resource: variant,
          sourceResourceId: source.id,
          copiedFromVersion: sourceContent.version,
        };
      });
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictException(
          'A variant with this name or project link already exists',
        );
      }
      throw error;
    }
  }

  @Delete(':projectId/processes/:resourceId')
  @UseAcl([UserGroup.RW])
  async unlinkProcess(
    @Param('projectId') projectId: string,
    @Param('resourceId') resourceId: string,
    @Headers() headers: RequestHeaders,
  ) {
    await this.assertProjectRole(projectId, headers, ProjectMemberRole.Modeler);
    const link = await this.projectProcesses.findOneBy({
      projectId,
      resourceId,
    });
    if (!link) throw new NotFoundException('Process link not found');
    const linksToResource = await this.projectProcesses.count({
      where: { resourceId },
    });
    if (linksToResource <= 1) {
      throw new BadRequestException(
        'A process cannot be unlinked from its last project because that would remove project-level access restrictions; delete the process instead',
      );
    }
    const result = await this.projectProcesses.delete({
      projectId,
      resourceId,
    });
    if (!result.affected) throw new NotFoundException('Process link not found');
    return {
      deleted: true,
      projectId,
      resourceId,
    };
  }

  @Get(':projectId/members')
  @UseAcl()
  async listProjectMembers(
    @Param('projectId') projectId: string,
    @Headers() headers: RequestHeaders,
  ) {
    await this.assertProjectRole(projectId, headers, ProjectMemberRole.Viewer);
    return this.projectMembers.find({
      where: { projectId },
      order: { userId: 'ASC' },
    });
  }

  @Put(':projectId/members/:userId')
  @UseAcl([UserGroup.RW])
  async setProjectMember(
    @Param('projectId') projectId: string,
    @Param('userId') userIdParam: string,
    @Body() body: { role?: ProjectMemberRole },
    @Headers() headers: RequestHeaders,
  ) {
    const actorId = this.projectResourceAccess.getAuthenticatedUserId(headers);
    const userId = this.validateUserId(userIdParam);
    const role = this.validateMemberRole(body.role);
    return this.changeProjectMember(projectId, userId, role, actorId, headers);
  }

  @Delete(':projectId/members/:userId')
  @UseAcl([UserGroup.RW])
  async removeProjectMember(
    @Param('projectId') projectId: string,
    @Param('userId') userIdParam: string,
    @Headers() headers: RequestHeaders,
  ) {
    const userId = this.validateUserId(userIdParam);
    return this.changeProjectMember(
      projectId,
      userId,
      null,
      undefined,
      headers,
    );
  }

  private validateUserId(userIdParam: string): string {
    const userId = userIdParam.trim();
    if (!userId || userId.length > 255) {
      throw new BadRequestException('userId must contain 1 to 255 characters');
    }
    return userId;
  }

  private validateMemberRole(role?: ProjectMemberRole): ProjectMemberRole {
    if (!role || !Object.values(ProjectMemberRole).includes(role)) {
      throw new BadRequestException('role must be viewer, modeler, or admin');
    }
    return role;
  }

  /**
   * Serialize membership changes per project. Locking the project row ensures
   * concurrent removals/demotions cannot both observe themselves as non-final
   * administrators and leave a project without an administrator.
   */
  private async changeProjectMember(
    projectId: string,
    userId: string,
    role: ProjectMemberRole | null,
    actorId?: string,
    headers?: RequestHeaders,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const projectRepository = manager.getRepository(ProjectTypeOrmEntity);
      const project = await projectRepository.findOne({
        where: { id: projectId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!project) throw new NotFoundException('Project not found');

      const members = manager.getRepository(ProjectMemberTypeOrmEntity);
      if (headers) {
        const requesterId =
          this.projectResourceAccess.getAuthenticatedUserId(headers);
        const requester = await members.findOneBy({
          projectId,
          userId: requesterId,
        });
        if (!requester || requester.role !== ProjectMemberRole.Admin) {
          throw new ForbiddenException('Insufficient project permissions');
        }
      }

      const existing = await members.findOneBy({ projectId, userId });
      if (role === null) {
        if (!existing) throw new NotFoundException('Project member not found');
      }

      if (
        existing?.role === ProjectMemberRole.Admin &&
        (role === null || role !== ProjectMemberRole.Admin)
      ) {
        const admins = await members.find({
          where: { projectId, role: ProjectMemberRole.Admin },
        });
        if (admins.length <= 1) {
          throw new BadRequestException(
            'A project must retain at least one administrator',
          );
        }
      }

      if (role === null) {
        await members.delete({ projectId, userId });
        return { deleted: true, projectId, userId };
      }

      const member =
        existing ??
        members.create({
          projectId,
          userId,
          createdBy: actorId,
        });
      member.role = role;
      return members.save(member);
    });
  }

  private async assertProjectReadRole(
    projectId: string,
    headers: RequestHeaders,
  ) {
    const isOrganizationAdmin =
      this.projectResourceAccess.hasOrganizationAdminRole(headers);
    if (isOrganizationAdmin) {
      await this.assertProjectExists(projectId);
      return;
    }
    await this.assertProjectRole(projectId, headers, ProjectMemberRole.Viewer);
  }

  private async assertProjectRole(
    projectId: string,
    headers: RequestHeaders,
    minimumRole: ProjectMemberRole,
  ) {
    await this.assertProjectExists(projectId);
    return this.projectResourceAccess.assertProjectRole(
      projectId,
      headers,
      minimumRole,
    );
  }

  private async assertProjectExists(projectId: string) {
    const project = await this.projects.findOneBy({ id: projectId });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }
}
