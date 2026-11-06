import { randomBytes, randomUUID } from 'crypto';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { ContentStatusEnum } from '../../../ResourceContext/shared/types/Content';
import { ContentTypeOrmEntity } from '../../../ResourceContext/infrastructure/entities/content.ormEntity';
import { ResourceTypeOrmEntity } from '../../../ResourceContext/infrastructure/entities/resource.ormEntity';

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
  const resources = manager.getRepository(ResourceTypeOrmEntity);
  const contents = manager.getRepository(ContentTypeOrmEntity);

  // Serialize publications on the target resource, not on the private workspace.
  const source = await resources.findOne({
    where: { id: params.sourceResourceId },
    lock: { mode: 'pessimistic_write' },
  });
  if (!source) throw new NotFoundException('Processus source introuvable');

  const submittedContent = await contents.findOne({
    where: {
      id: params.submittedContentId,
      resourceId: params.workspaceResourceId,
      status: ContentStatusEnum.Draft,
    },
    lock: { mode: 'pessimistic_write' },
  });
  if (!submittedContent) {
    throw new ConflictException(
      'La version soumise n’est plus disponible comme brouillon',
    );
  }

  const currentPublished = await contents.findOne({
    where: {
      resourceId: params.sourceResourceId,
      status: ContentStatusEnum.Published,
    },
    order: { version: 'DESC' },
    lock: { mode: 'pessimistic_write' },
  });
  if (
    !currentPublished ||
    currentPublished.id !== params.expectedSourceContentId
  ) {
    throw new ConflictException(
      'Le processus source a changé depuis la soumission. La publication est bloquée.',
    );
  }

  const latestVersion = await contents
    .createQueryBuilder('content')
    .setLock('pessimistic_write')
    .where('content."resourceId" = :resourceId', {
      resourceId: params.sourceResourceId,
    })
    .andWhere('content.status IN (:...statuses)', {
      statuses: [ContentStatusEnum.Published, ContentStatusEnum.Obsolete],
    })
    .orderBy('content.version', 'DESC', 'NULLS LAST')
    .getOne();

  currentPublished.status = ContentStatusEnum.Obsolete;
  currentPublished.updatedBy = params.updatedBy;
  currentPublished.pngContent = null;
  await contents.save(currentPublished);

  const published = await contents.save(
    contents.create({
      resourceId: params.sourceResourceId,
      status: ContentStatusEnum.Published,
      version: Math.max(
        (latestVersion?.version ?? 0) + 1,
        submittedContent.version ?? 1,
      ),
      content: submittedContent.content,
      changeComment: params.changeComment,
      pngContent: Buffer.from(
        params.pngContent.replace(/^data:image\/png;base64,/, ''),
        'base64',
      ),
      updatedBy: params.updatedBy,
      createdBy: params.updatedBy,
    }),
  );

  if (!source.authToken) {
    source.authToken = randomBytes(32).toString('hex');
    await resources.save(source);
  }
  return published;
}
