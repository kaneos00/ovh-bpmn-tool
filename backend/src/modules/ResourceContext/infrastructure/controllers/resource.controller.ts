import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
  Headers,
  ConflictException,
  BadRequestException,
  Query,
} from '@nestjs/common';
import { UseAcl } from '../../../../shared-kernel/modules/acl/infrastructure/acl.decorator';
import { UserGroup } from '../../../../shared-kernel/utils/UserGroup';
import { ResourceMapper } from '../mappers/resource.mapper';

import { CreateResourceCommandHandler } from '../../application/commands/Resource/createResource/createResource.commandHandler';
import { CreateResourceCommand } from '../../application/commands/Resource/createResource/createResource.command';

import { ListResourceQueryHandler } from '../../application/queries/Resource/listResource/listResource.queryHandler';

import { DeleteResourceCommandHandler } from '../../application/commands/Resource/deleteResource/deleteResource.commandHandler';
import { DeleteResourceCommand } from '../../application/commands/Resource/deleteResource/deleteResource.command';

import { UpdateResourceCommandHandler } from '../../application/commands/Resource/updateResource/updateResource.commandHandler';
import {
  UpdateResourceBody,
  UpdateResourceCommand,
} from '../../application/commands/Resource/updateResource/updateResource.command';

import { GetResourceQueryHandler } from '../../application/queries/Resource/getResource/getResource.queryHandler';
import { GetResourceQuery } from '../../application/queries/Resource/getResource/getResource.query';

import { ResourceTypeEnum } from '../../../../modules/ResourceContext/shared/types/Resource';
import { ContentStatusEnum } from '../../../../modules/ResourceContext/shared/types/Content';
import { ListContentQueryHandler } from '../../application/queries/Content/listContent/listContent.queryHandler';
import { GetXmlContentQueryHandler } from '../../application/queries/Content/getXmlContent/getXmlContent.queryHandler';
import { CreateContentCommandHandler } from '../../application/commands/Content/createContent/createContent.commandHandler';
import { ResourceNameExistError } from '../../../../modules/ResourceContext/application/commands/Resource/resource.error';
import { ConfigService } from '@nestjs/config';
import { ProjectResourceAccessService } from '../../../ProjectContext/projectResourceAccess.service';

@Controller('resources')
export class ResourceController {
  constructor(
    private readonly configService: ConfigService,
    private readonly projectResourceAccess: ProjectResourceAccessService,
    private readonly createResourceCommandHandler: CreateResourceCommandHandler,
    private readonly updateResourceCommandHandler: UpdateResourceCommandHandler,
    private readonly deleteResourceCommandHandler: DeleteResourceCommandHandler,
    private readonly listResourceCommandHandler: ListResourceQueryHandler,
    private readonly getResourceQueryHandler: GetResourceQueryHandler,
    private readonly listContentQueryHandler: ListContentQueryHandler,
    private readonly getXmlContentQueryHandler: GetXmlContentQueryHandler,
    private readonly createContentCommandHandler: CreateContentCommandHandler,
  ) {}

  @Get()
  @UseAcl()
  async listResource(
    @Query('filter.type') type: ResourceTypeEnum,
    @Query('filter.depth') depth: number,
    @Query('filter.parentId') parentId: string,
    @Headers() headers: Record<string, string>,
  ) {
    const resourcesResult = await this.listResourceCommandHandler.execute({
      filters: {
        type,
        depth,
        parentId,
      },
    });

    if (!resourcesResult.ok) {
      throw resourcesResult.fail;
    }

    const readableResources =
      await this.projectResourceAccess.filterReadableResources(
        resourcesResult.ok,
        headers,
      );
    return readableResources.map(ResourceMapper.toPresenter);
  }

  @Get('/:resourceId')
  @UseAcl()
  async getResource(
    @Param() params: GetResourceQuery,
    @Headers() headers: Record<string, string>,
  ) {
    await this.projectResourceAccess.assertCanReadResource(
      params.resourceId,
      headers,
    );
    const resourceResult = await this.getResourceQueryHandler.execute(params);

    if (!resourceResult.ok) {
      throw new NotFoundException(
        `Cannot find resource with id ${params.resourceId}`,
      );
    }

    return ResourceMapper.toPresenter(resourceResult.ok);
  }

  @Post()
  @UseAcl([UserGroup.RW])
  async createResource(
    @Body() createResourceCommand: CreateResourceCommand,
    @Headers() headers: Record<string, string>,
  ) {
    const createResourceResult =
      await this.createResourceCommandHandler.execute({
        ...createResourceCommand,
        createdBy: headers[this.configService.getOrThrow('userHeader')],
      });

    if (!createResourceResult.ok) {
      if (createResourceResult.fail instanceof ResourceNameExistError) {
        throw new ConflictException(createResourceResult.fail.message);
      }
      throw new BadRequestException(createResourceResult.fail.message);
    }

    return ResourceMapper.toPresenter(createResourceResult.ok);
  }

  @Put('/:resourceId')
  @UseAcl([UserGroup.RW])
  async updateResource(
    @Param() params: Pick<UpdateResourceCommand, 'resourceId'>,
    @Body() updateResourceCommand: UpdateResourceBody,
    @Headers() headers: Record<string, string>,
  ) {
    await this.projectResourceAccess.assertCanEditResource(
      params.resourceId,
      headers,
    );
    const updateResult = await this.updateResourceCommandHandler.execute({
      ...updateResourceCommand,
      resourceId: params.resourceId,
    });

    if (updateResult.fail) {
      if (updateResult.fail instanceof ResourceNameExistError) {
        throw new ConflictException(updateResult.fail.message);
      }
      throw new BadRequestException(updateResult.fail.message);
    }

    return ResourceMapper.toPresenter(updateResult.ok);
  }

  /**
   * Clone a process resource and seed its first draft from the most recent
   * available BPMN content. This creates a separate resource; it does not
   * alter the source process or attach the copy to any project automatically.
   */
  @Post('/:resourceId/clone')
  @UseAcl([UserGroup.RW])
  async cloneResource(
    @Param('resourceId') resourceId: string,
    @Body() body: { name?: string },
    @Headers() headers: Record<string, string>,
  ) {
    const cloneName = body?.name?.trim();
    if (!cloneName) {
      throw new BadRequestException('A name is required to clone a process');
    }

    await this.projectResourceAccess.assertCanReadResource(resourceId, headers);
    await this.projectResourceAccess.assertCanCloneResource(
      resourceId,
      headers,
    );
    const sourceResult = await this.getResourceQueryHandler.execute({
      resourceId,
    });
    if (sourceResult.fail || !sourceResult.ok) {
      throw new NotFoundException(`Cannot find resource with id ${resourceId}`);
    }
    const source = sourceResult.ok;
    if (source.type !== ResourceTypeEnum.Process) {
      throw new BadRequestException('Only BPMN processes can be cloned');
    }

    const contentsResult = await this.listContentQueryHandler.execute(
      resourceId,
      { filters: {} },
    );
    if (contentsResult.fail) {
      throw new BadRequestException(contentsResult.fail.message);
    }
    const sourceContent = [...contentsResult.ok].sort((left, right) => {
      const rank = (status: ContentStatusEnum | undefined) =>
        status === ContentStatusEnum.Published
          ? 2
          : status === ContentStatusEnum.Draft
            ? 1
            : 0;
      return (
        rank(right.state.status) - rank(left.state.status) ||
        (right.state.version ?? 0) - (left.state.version ?? 0)
      );
    })[0];

    let sourceXml: string | undefined;
    if (sourceContent) {
      const xmlResult = await this.getXmlContentQueryHandler.execute(
        resourceId,
        sourceContent.id.value,
      );
      if (xmlResult.fail) {
        throw new BadRequestException(xmlResult.fail.message);
      }
      sourceXml = xmlResult.ok ?? undefined;
      if (!sourceXml) {
        throw new BadRequestException(
          'The source process has no BPMN content to clone',
        );
      }
    }

    const createdBy = headers[this.configService.getOrThrow('userHeader')];
    const cloneResult = await this.createResourceCommandHandler.execute({
      name: cloneName,
      description: source.description ?? '',
      parentId: source.parentId ?? undefined,
      createdBy,
      type: ResourceTypeEnum.Process,
    });
    if (cloneResult.fail) {
      if (cloneResult.fail instanceof ResourceNameExistError) {
        throw new ConflictException(cloneResult.fail.message);
      }
      throw new BadRequestException(cloneResult.fail.message);
    }

    if (sourceXml) {
      const contentResult = await this.createContentCommandHandler.execute({
        resourceId: cloneResult.ok.id.value,
        content: sourceXml,
        createdBy,
      });
      if (contentResult.fail) {
        // Best-effort cleanup prevents an empty duplicate if content copying fails.
        await this.deleteResourceCommandHandler.execute({
          resourceId: cloneResult.ok.id.value,
        });
        throw new BadRequestException(contentResult.fail.message);
      }
    }

    return ResourceMapper.toPresenter(cloneResult.ok);
  }

  @Delete('/:resourceId')
  @UseAcl([UserGroup.RW])
  async deleteResource(
    @Param() deleteResourceCommand: DeleteResourceCommand,
    @Headers() headers: Record<string, string>,
  ) {
    await this.projectResourceAccess.assertCanDeleteResourceTree(
      deleteResourceCommand.resourceId,
      headers,
    );
    const deleteResult = await this.deleteResourceCommandHandler.execute(
      deleteResourceCommand,
    );

    if (!deleteResult.ok) {
      throw new NotFoundException();
    }

    return deleteResult.ok;
  }
}
