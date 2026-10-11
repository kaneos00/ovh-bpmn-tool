import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  Headers,
  NotFoundException,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { UseAcl } from '../../../../shared-kernel/modules/acl/infrastructure/acl.decorator';
import { UserGroup } from '../../../../shared-kernel/utils/UserGroup';
import { ResourceTypeOrmEntity } from '../../../ResourceContext/infrastructure/entities/resource.ormEntity';
import { ResourceTypeEnum } from '../../../ResourceContext/shared/types/Resource';
import { Repository } from 'typeorm';
import {
  ProjectProcessTypeOrmEntity,
  ProjectProcessUsage,
} from '../entities/projectProcess.ormEntity';
import { ProjectTypeOrmEntity } from '../entities/project.ormEntity';
import { ProjectMemberRole, ProjectMemberTypeOrmEntity } from '../entities/projectMember.ormEntity';

@Controller('projects')
export class ProjectController {
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(ProjectTypeOrmEntity)
    private readonly projects: Repository<ProjectTypeOrmEntity>,
    @InjectRepository(ProjectProcessTypeOrmEntity)
    private readonly projectProcesses: Repository<ProjectProcessTypeOrmEntity>,
    @InjectRepository(ResourceTypeOrmEntity)
    private readonly resources: Repository<ResourceTypeOrmEntity>,
    @InjectRepository(ProjectMemberTypeOrmEntity)
    private readonly projectMembers: Repository<ProjectMemberTypeOrmEntity>,
  ) {}

  @Get()
  @UseAcl()
  async listProjects() {
    return this.projects.find({ order: { name: 'ASC' } });
  }

  @Post()
  @UseAcl([UserGroup.RW])
  async createProject(
    @Body() body: { name?: string; description?: string },
    @Headers() headers: Record<string, string>,
  ) {
    const name = body.name?.trim();
    if (!name) throw new BadRequestException('Project name is required');
    if (name.length > 255) {
      throw new BadRequestException('Project name must be 255 characters or fewer');
    }

    const project = this.projects.create({
      name,
      description: body.description?.trim() || null,
      createdBy: headers[this.configService.getOrThrow('userHeader')],
    });

    try {
      return await this.projects.save(project);
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictException('A project with this name already exists');
      }
      throw error;
    }
  }

  @Get(':projectId')
  @UseAcl()
  async getProject(@Param('projectId') projectId: string) {
    const project = await this.projects.findOneBy({ id: projectId });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  @Put(':projectId')
  @UseAcl([UserGroup.RW])
  async updateProject(
    @Param('projectId') projectId: string,
    @Body() body: { name?: string; description?: string },
  ) {
    const project = await this.projects.findOneBy({ id: projectId });
    if (!project) throw new NotFoundException('Project not found');

    if (body.name !== undefined) {
      const name = body.name.trim();
      if (!name || name.length > 255) {
        throw new BadRequestException('Project name must contain 1 to 255 characters');
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
  async deleteProject(@Param('projectId') projectId: string) {
    const result = await this.projects.delete({ id: projectId });
    if (!result.affected) throw new NotFoundException('Project not found');
    return { deleted: true, projectId };
  }

  @Get(':projectId/processes')
  @UseAcl()
  async listProjectProcesses(@Param('projectId') projectId: string) {
    await this.assertProjectExists(projectId);
    const links = await this.projectProcesses.find({
      where: { projectId },
      order: { createdAt: 'ASC' },
    });
    const resources = await this.resources.findBy(
      links.map((link) => ({ id: link.resourceId })),
    );
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
    @Headers() headers: Record<string, string>,
  ) {
    await this.assertProjectExists(projectId);
    if (!body.resourceId) throw new BadRequestException('resourceId is required');

    const usage = body.usage ?? ProjectProcessUsage.ProjectSpecific;
    if (!Object.values(ProjectProcessUsage).includes(usage)) {
      throw new BadRequestException('Unsupported process usage');
    }

    const resource = await this.resources.findOneBy({ id: body.resourceId });
    if (!resource || resource.type !== ResourceTypeEnum.Process) {
      throw new BadRequestException('resourceId must identify an existing process');
    }

    let sourceResourceId: string | null = null;
    if (usage === ProjectProcessUsage.Variant) {
      if (!body.sourceResourceId || body.sourceResourceId === body.resourceId) {
        throw new BadRequestException('A variant must reference a different source process');
      }
      const source = await this.resources.findOneBy({ id: body.sourceResourceId });
      if (!source || source.type !== ResourceTypeEnum.Process) {
        throw new BadRequestException('sourceResourceId must identify an existing process');
      }
      sourceResourceId = source.id;
    } else if (body.sourceResourceId) {
      throw new BadRequestException('sourceResourceId is only valid for variants');
    }

    const link = this.projectProcesses.create({
      projectId,
      resourceId: resource.id,
      usage,
      sourceResourceId,
      createdBy: headers[this.configService.getOrThrow('userHeader')],
    });

    try {
      return await this.projectProcesses.save(link);
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictException('This process is already linked to the project');
      }
      throw error;
    }
  }

  @Delete(':projectId/processes/:resourceId')
  @UseAcl([UserGroup.RW])
  async unlinkProcess(
    @Param('projectId') projectId: string,
    @Param('resourceId') resourceId: string,
  ) {
    await this.assertProjectExists(projectId);
    const result = await this.projectProcesses.delete({ projectId, resourceId });
    if (!result.affected) throw new NotFoundException('Process link not found');
    return { deleted: true, projectId, resourceId };
  }


  @Get(':projectId/members')
  @UseAcl()
  async listProjectMembers(@Param('projectId') projectId: string) {
    await this.assertProjectExists(projectId);
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
    @Headers() headers: Record<string, string>,
  ) {
    await this.assertProjectExists(projectId);
    const userId = userIdParam.trim();
    if (!userId || userId.length > 255) {
      throw new BadRequestException('userId must contain 1 to 255 characters');
    }
    if (!body.role || !Object.values(ProjectMemberRole).includes(body.role)) {
      throw new BadRequestException('role must be viewer, modeler, or admin');
    }

    const existing = await this.projectMembers.findOneBy({ projectId, userId });
    const member = existing ?? this.projectMembers.create({
      projectId,
      userId,
      createdBy: headers[this.configService.getOrThrow('userHeader')],
    });
    member.role = body.role;
    return this.projectMembers.save(member);
  }

  @Delete(':projectId/members/:userId')
  @UseAcl([UserGroup.RW])
  async removeProjectMember(
    @Param('projectId') projectId: string,
    @Param('userId') userId: string,
  ) {
    await this.assertProjectExists(projectId);
    const result = await this.projectMembers.delete({ projectId, userId });
    if (!result.affected) throw new NotFoundException('Project member not found');
    return { deleted: true, projectId, userId };
  }

  private async assertProjectExists(projectId: string) {
    const project = await this.projects.findOneBy({ id: projectId });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }
}
