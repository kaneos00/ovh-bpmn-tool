import { ContentRepository } from '../../../../../../modules/ResourceContext/application/adapters/repositories/content.repository';
import { ResourceRepository } from '../../../../../../modules/ResourceContext/application/adapters/repositories/resource.repository';

import {
  BadResourceTypeError,
  CannotFindResourceError,
} from '../../../../../../modules/ResourceContext/application/shared/Resource/resource.error';
import { ResourceTypeEnum } from '../../../../../../modules/ResourceContext/shared/types/Resource';
import { Result, ok, fail } from '../../../../../../shared-kernel/utils/Result';
import { Content } from '../../../../../../modules/ResourceContext/domain/Content/Content';
import {
  BadContentStatusForPublishError,
  CannotPublishContentError,
} from './publishContent.error';
import { ContentStatusEnum } from '../../../../../../modules/ResourceContext/shared/types/Content';
import { CannotFindContentError } from '../content.error';
import { PublishContentCommand } from './publishContent.command';
import { randomBytes } from 'crypto';

export class PublishContentCommandHandler {
  constructor(
    private readonly resourceRepository: ResourceRepository,
    private readonly contentRepository: ContentRepository,
  ) {}

  public async execute(
    resourceId: string,
    contentId: string,
    command: PublishContentCommand,
  ): Promise<Result<Content, Error>> {
    const resourceResult = await this.resourceRepository.findOne(resourceId);
    if (resourceResult.fail) {
      return fail(new CannotFindResourceError(resourceId, resourceResult.fail));
    }

    const resource = resourceResult.ok;
    if (resource?.type === ResourceTypeEnum.Folder) {
      return fail(new BadResourceTypeError(resourceId));
    }

    const contentResult = await this.contentRepository.findOne(contentId);
    if (contentResult.fail) {
      return fail(new CannotFindContentError(contentId, contentResult.fail));
    }
    if (contentResult.ok.state.resourceId !== resourceId) {
      return fail(
        new CannotFindContentError(
          contentId,
          new Error('Content does not belong to the requested resource'),
        ),
      );
    }

    if (
      contentResult.ok.state.status &&
      contentResult.ok.state.status !== ContentStatusEnum.Draft
    ) {
      return fail(
        new BadContentStatusForPublishError(
          contentId,
          contentResult.ok.state.status,
        ),
      );
    }

    // The repository re-reads and locks all affected rows inside one database
    // transaction, so a concurrent publication cannot invalidate this check.
    const publicationResult = await this.contentRepository.publishAtomically({
      resourceId,
      contentId,
      updatedBy: command.updatedBy,
      pngContent: command.pngContent,
      authToken: randomBytes(32).toString('hex'),
    });

    if (publicationResult.fail) {
      return fail(
        new CannotPublishContentError(contentId, publicationResult.fail),
      );
    }
    return ok(publicationResult.ok);
  }
}
