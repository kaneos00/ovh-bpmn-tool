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
import { ConfigService } from '@nestjs/config';
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
    private readonly configService: ConfigService,
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
    const userId = this.getUserId(headers);
    const memberships = await this.projectMembers.find({ where: { userId } });
    if (!memberships.length) return [];
    return this.projects.find({
      where: { id: In(memberships.map(({ projectId }) => projectId)) },
      order: { name: 'ASC' },
    });
  }

  @Post()
  @UseAcl([UserGroup.RW])
  async createProject(
    @Body() body: { name?: string; description?: string },
    @Headers() headers: RequestHeaders,
  ) {
    const userId = this.getUserId(headers);
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

  @Get(':projectId')
  @UseAcl()
  async getProject(
    @Param('projectId') projectId: string,
    @Headers() headers: RequestHeaders,
  ) {
    await this.assertProjectRole(projectId, headers, ProjectMemberRole.Viewer);
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
    await this.assertProjectRole(projectId, headers, ProjectMemberRole.Viewer);
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
    const userId = this.getUserId(headers);
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

    let sourceResourceId: string | null = null;
    if (usage === ProjectProcessUsage.Variant) {
      if (!body.sourceResourceId || body.sourceResourceId === body.resourceId) {
        throw new BadRequestException(
          'A variant must reference a different source process',
        );
      }
      const source = await this.resources.findOneBy({
        id: body.sourceResourceId,
      });
      if (!source || source.type !== ResourceTypeEnum.Process) {
        throw new BadRequestException(
          'sourceResourceId must identify an existing process',
        );
      }
      sourceResourceId = source.id;
    } else if (body.sourceResourceId) {
      throw new BadRequestException(
        'sourceResourceId is only valid for variants',
      );
    }

    const link = this.projectProcesses.create({
      projectId,
      resourceId: resource.id,
      usage,
      sourceResourceId,
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
    const userId = this.getUserId(headers);
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
            version: sourceContent.version ? sourceContent.version + 1 : 1,
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
    const actorId = this.getUserId(headers);
    await this.assertProjectRole(projectId, headers, ProjectMemberRole.Admin);
    const userId = userIdParam.trim();
    if (!userId || userId.length > 255) {
      throw new BadRequestException('userId must contain 1 to 255 characters');
    }
    if (!body.role || !Object.values(ProjectMemberRole).includes(body.role)) {
      throw new BadRequestException('role must be viewer, modeler, or admin');
    }

    const existing = await this.projectMembers.findOneBy({ projectId, userId });
    if (
      existing?.role === ProjectMemberRole.Admin &&
      body.role !== ProjectMemberRole.Admin
    ) {
      await this.assertNotLastAdmin(projectId, userId);
    }
    const member =
      existing ??
      this.projectMembers.create({
        projectId,
        userId,
        createdBy: actorId,
      });
    member.role = body.role;
    return this.projectMembers.save(member);
  }

  @Delete(':projectId/members/:userId')
  @UseAcl([UserGroup.RW])
  async removeProjectMember(
    @Param('projectId') projectId: string,
    @Param('userId') userId: string,
    @Headers() headers: RequestHeaders,
  ) {
    await this.assertProjectRole(projectId, headers, ProjectMemberRole.Admin);
    const member = await this.projectMembers.findOneBy({ projectId, userId });
    if (!member) throw new NotFoundException('Project member not found');
    if (member.role === ProjectMemberRole.Admin) {
      await this.assertNotLastAdmin(projectId, userId);
    }
    await this.projectMembers.delete({ projectId, userId });
    return { deleted: true, projectId, userId };
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

  private async assertProjectRole(
    projectId: string,
    headers: RequestHeaders,
    minimumRole: ProjectMemberRole,
  ) {
    await this.assertProjectExists(projectId);
    const userId = this.getUserId(headers);
    const membership = await this.projectMembers.findOneBy({
      projectId,
      userId,
    });
    const roleRank: Record<ProjectMemberRole, number> = {
      [ProjectMemberRole.Viewer]: 1,
      [ProjectMemberRole.Modeler]: 2,
      [ProjectMemberRole.Admin]: 3,
    };
    if (!membership || roleRank[membership.role] < roleRank[minimumRole]) {
      throw new ForbiddenException('Insufficient project permissions');
    }
    return membership;
  }

  private async assertNotLastAdmin(projectId: string, userId: string) {
    const admins = await this.projectMembers.find({
      where: { projectId, role: ProjectMemberRole.Admin },
    });
    if (admins.length <= 1 && admins[0]?.userId === userId) {
      throw new BadRequestException(
        'A project must retain at least one administrator',
      );
    }
  }

  private async assertProjectExists(projectId: string) {
    const project = await this.projects.findOneBy({ id: projectId });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }
}
