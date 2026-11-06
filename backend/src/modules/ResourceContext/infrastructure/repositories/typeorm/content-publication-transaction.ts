import { randomBytes } from 'crypto';
import {
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Content } from '../../../../ResourceContext/domain/Content/Content';
import { ContentStatusEnum } from '../../../../ResourceContext/shared/types/Content';
import { ResourceTypeEnum } from '../../../../ResourceContext/shared/types/Resource';
import { ContentTypeOrmEntity } from '../../entities/content.ormEntity';
import { ResourceTypeOrmEntity } from '../../entities/resource.ormEntity';
import { ContentMapper } from '../../mappers/content.mapper';

export async function publishDraftContentWithinTransaction(
  manager: EntityManager,
  params: {
    targetResourceId: string;
    draftResourceId: string;
    draftContentId: string;
    updatedBy: string;
    pngContent: string;
    authToken: string;
    expectedPublishedContentId?: string;
    changeComment?: string | null;
  },
  lockedResource?: ResourceTypeOrmEntity,
): Promise<ContentTypeOrmEntity> {
  const resources = manager.getRepository(ResourceTypeOrmEntity);
  const contents = manager.getRepository(ContentTypeOrmEntity);
  const resource =
    lockedResource ??
    (await resources.findOne({
      where: { id: params.targetResourceId },
      lock: { mode: 'pessimistic_write' },
    }));
  if (!resource) throw new NotFoundException('Processus source introuvable');
  if (resource.type === ResourceTypeEnum.Folder) {
    throw new ConflictException('Un dossier ne peut pas recevoir de version publiée');
  }

  const draft = await contents.findOne({
    where: {
      id: params.draftContentId,
      resourceId: params.draftResourceId,
    },
    lock: { mode: 'pessimistic_write' },
  });
  if (!draft || draft.status !== ContentStatusEnum.Draft) {
    throw new ConflictException('Le brouillon à publier est introuvable ou n’est plus modifiable');
  }

  const latestVersion = await contents
    .createQueryBuilder('content')
    .setLock('pessimistic_write')
    .where('content."resourceId" = :resourceId', {
      resourceId: params.targetResourceId,
    })
    .andWhere('content.status IN (:...statuses)', {
      statuses: [ContentStatusEnum.Published, ContentStatusEnum.Obsolete],
    })
    .orderBy('content.version', 'DESC', 'NULLS LAST')
    .getOne();

  const previousPublished = await contents.findOne({
    where: {
      resourceId: params.targetResourceId,
      status: ContentStatusEnum.Published,
    },
    order: { version: 'DESC' },
    lock: { mode: 'pessimistic_write' },
  });
  if (
    params.expectedPublishedContentId &&
    previousPublished?.id !== params.expectedPublishedContentId
  ) {
    throw new ConflictException(
      'Le processus source a changé depuis la soumission. La publication est bloquée.',
    );
  }

  if (previousPublished && previousPublished.id !== draft.id) {
    const previous = ContentMapper.fromPersistence(previousPublished);
    if (previous.fail) throw previous.fail;
    previous.ok.makeObsolete(params.updatedBy);
    await contents.save(ContentMapper.toPersistence(previous.ok));
  }

  const nextVersion = Math.max(
    (latestVersion?.version ?? 0) + 1,
    draft.version ?? 1,
  );
  let contentToPublish: Content;
  if (params.draftResourceId === params.targetResourceId) {
    const currentDraft = ContentMapper.fromPersistence(draft);
    if (currentDraft.fail) throw currentDraft.fail;
    currentDraft.ok.state.version = nextVersion;
    contentToPublish = currentDraft.ok;
  } else {
    contentToPublish = Content.apply({
      resourceId: params.targetResourceId,
      content: draft.content,
      changeComment: params.changeComment ?? draft.changeComment,
      version: nextVersion,
      status: ContentStatusEnum.Draft,
      createdBy: params.updatedBy,
      updatedBy: params.updatedBy,
    });
  }
  contentToPublish.publish(params.updatedBy, params.pngContent);
  const published = await contents.save(
    ContentMapper.toPersistence(contentToPublish),
  );

  if (!resource.authToken) {
    resource.authToken = params.authToken || randomBytes(32).toString('hex');
    await resources.save(resource);
  }
  return published;
}
