import { randomBytes, randomUUID } from 'crypto';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { ContentStatusEnum } from '../../../ResourceContext/shared/types/Content';
import { ContentTypeOrmEntity } from '../../../ResourceContext/infrastructure/entities/content.ormEntity';
import { ResourceTypeOrmEntity } from '../../../ResourceContext/infrastructure/entities/resource.ormEntity';
import { publishDraftContentWithinTransaction } from '../../../ResourceContext/infrastructure/repositories/typeorm/content-publication-transaction';

export async function createProposalWorkspace(
  manager: EntityManager,
  params: {
    source: ResourceTypeOrmEntity;
    publishedContent: ContentTypeOrmEntity;
    createdBy: string;
  },
): Promise<{
  resource: ResourceTypeOrmEntity;
  content: ContentTypeOrmEntity;
}> {
  const resources = manager.getRepository(ResourceTypeOrmEntity);
  const contents = manager.getRepository(ContentTypeOrmEntity);
  const resource = await resources.save(
    resources.create({
      name: `${params.source.name.slice(0, 220)} — proposition ${randomUUID().slice(0, 8)}`,
      description: params.source.description,
      depth: params.source.depth,
      parentId: params.source.parentId,
      sourceResourceId: params.source.id,
      type: params.source.type,
      authToken: null,
      createdBy: params.createdBy,
    }),
  );
  const content = await contents.save(
    contents.create({
      resourceId: resource.id,
      status: ContentStatusEnum.Draft,
      version: 1,
      content: params.publishedContent.content,
      changeComment: null,
      pngContent: null,
      updatedBy: params.createdBy,
      createdBy: params.createdBy,
    }),
  );
  return { resource, content };
}

export async function publishProposalWorkspace(
  manager: EntityManager,
  params: {
    sourceResourceId: string;
    workspaceResourceId: string;
    submittedContentId: string;
    expectedSourceContentId: string;
    updatedBy: string;
    pngContent: string;
    changeComment: string;
  },
): Promise<ContentTypeOrmEntity> {
  return publishDraftContentWithinTransaction(manager, {
    targetResourceId: params.sourceResourceId,
    draftResourceId: params.workspaceResourceId,
    draftContentId: params.submittedContentId,
    expectedPublishedContentId: params.expectedSourceContentId,
    updatedBy: params.updatedBy,
    pngContent: params.pngContent,
    changeComment: params.changeComment,
    authToken: randomBytes(32).toString('hex'),
  });
}
