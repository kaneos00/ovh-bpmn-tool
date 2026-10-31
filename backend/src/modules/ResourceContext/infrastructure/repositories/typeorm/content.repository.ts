import { DataSource, Repository } from 'typeorm';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { Injectable, Logger, Optional } from '@nestjs/common';

import {
  ContentFilters,
  ContentRepository,
  ExplorerProcessLinks,
} from '../../../../../modules/ResourceContext/application/adapters/repositories/content.repository';
import { Content } from '../../../../../modules/ResourceContext/domain/Content/Content';
import {
  Result,
  combineResults,
  fail,
  ok,
} from '../../../../../shared-kernel/utils/Result';
import { ContentMapper } from '../../mappers/content.mapper';
import { ContentTypeOrmEntity } from '../../entities/content.ormEntity';
import { ResourceTypeOrmEntity } from '../../entities/resource.ormEntity';
import { ContentStatusEnum } from '../../../../../modules/ResourceContext/shared/types/Content';
import { ResourceTypeEnum } from '../../../../../modules/ResourceContext/shared/types/Resource';

import type { Maybe } from '../../../../../shared-kernel/utils/Maybe';
import { SortCommand } from '../../../../../shared-kernel/utils/SortCommand';

@Injectable()
export class ContentTypeOrmRepository implements ContentRepository {
  private readonly logger = new Logger(ContentTypeOrmRepository.name);

  constructor(
    @InjectRepository(ContentTypeOrmEntity)
    private readonly contentRepository: Repository<ContentTypeOrmEntity>,
    @Optional()
    @InjectDataSource()
    private readonly dataSource?: DataSource,
  ) {}

  async publishAtomically(params: {
    resourceId: string;
    contentId: string;
    updatedBy: string;
    pngContent: string;
    authToken: string;
  }): Promise<Result<Content, Error>> {
    if (!this.dataSource) {
      return fail(
        new Error('Publication transaction requires a TypeORM data source'),
      );
    }

    try {
      return await this.dataSource.transaction(async (manager) => {
        const resources = manager.getRepository(ResourceTypeOrmEntity);
        const contents = manager.getRepository(ContentTypeOrmEntity);

        // Lock the resource first: concurrent publications for the same
        // resource are serialized, including the lookup of the prior version.
        const resource = await resources.findOne({
          where: { id: params.resourceId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!resource) throw new Error('Resource no longer exists');
        if (resource.type === ResourceTypeEnum.Folder) {
          throw new Error('A folder cannot receive published content');
        }

        const contentEntity = await contents.findOne({
          where: { id: params.contentId, resourceId: params.resourceId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!contentEntity) throw new Error('Draft content no longer exists');
        if (
          contentEntity.status &&
          contentEntity.status !== ContentStatusEnum.Draft
        ) {
          throw new Error('Content is no longer a draft');
        }

        // Drafts can be created concurrently and may initially receive the
        // same next version. Recalculate the published sequence while holding
        // the resource lock so each successful publication gets a new version.
        const latestVersion = await contents
          .createQueryBuilder('content')
          .setLock('pessimistic_write')
          .where('content."resourceId" = :resourceId', {
            resourceId: params.resourceId,
          })
          .andWhere('content.status IN (:...statuses)', {
            statuses: [ContentStatusEnum.Published, ContentStatusEnum.Obsolete],
          })
          .orderBy('content.version', 'DESC', 'NULLS LAST')
          .getOne();
        contentEntity.version = Math.max(
          contentEntity.version ?? 1,
          (latestVersion?.version ?? 0) + 1,
        );

        const previousPublished = await contents.findOne({
          where: {
            resourceId: params.resourceId,
            status: ContentStatusEnum.Published,
          },
          order: { version: 'DESC' },
          lock: { mode: 'pessimistic_write' },
        });

        if (previousPublished && previousPublished.id !== contentEntity.id) {
          const previous = ContentMapper.fromPersistence(previousPublished);
          if (previous.fail) throw previous.fail;
          previous.ok.makeObsolete(params.updatedBy);
          await contents.save(ContentMapper.toPersistence(previous.ok));
        }

        const contentResult = ContentMapper.fromPersistence(contentEntity);
        if (contentResult.fail) throw contentResult.fail;
        contentResult.ok.publish(params.updatedBy, params.pngContent);
        const savedContent = await contents.save(
          ContentMapper.toPersistence(contentResult.ok),
        );

        if (!resource.authToken) {
          resource.authToken = params.authToken;
          await resources.save(resource);
        }

        const mapped = ContentMapper.fromPersistence(savedContent);
        if (mapped.fail) throw mapped.fail;
        return ok(mapped.ok);
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      const errorMsg = `Atomic content publication failed: ${detail}`;
      this.logger.error(
        errorMsg,
        error instanceof Error ? error.stack : detail,
      );
      return fail(new Error(errorMsg));
    }
  }

  async save(content: Content): Promise<Result<Content, Error>> {
    try {
      const contentEntity = ContentMapper.toPersistence(content);
      const savedContent = await this.contentRepository.save(contentEntity);
      return ContentMapper.fromPersistence(savedContent);
    } catch (error) {
      const errorMsg = 'Error while saving content';
      this.logger.error(`${errorMsg}:`, error);
      return fail(new Error(errorMsg));
    }
  }

  async updateEditableFields(params: {
    resourceId: string;
    contentId: string;
    content?: string;
    changeComment?: string | null;
    updatedBy: string;
  }): Promise<Result<Content, Error>> {
    try {
      const fields: Partial<ContentTypeOrmEntity> = {
        updatedBy: params.updatedBy,
      };
      if (params.content !== undefined) fields.content = params.content;
      if (params.changeComment !== undefined) {
        fields.changeComment = params.changeComment;
      }

      // Update only editable columns. In particular, never write a potentially
      // stale status/version/png snapshot over a concurrent publication.
      const result = await this.contentRepository.update(
        { id: params.contentId, resourceId: params.resourceId },
        fields,
      );
      if (!result.affected) {
        return fail(new Error('Content not found for the requested resource'));
      }

      return this.findOne(params.contentId);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Error while updating editable content fields: ${detail}`,
      );
      return fail(new Error('Error while updating content'));
    }
  }

  async delete(contentId: string): Promise<Result<boolean, Error>> {
    try {
      const deletedResource = await this.contentRepository.delete({
        id: contentId,
      });

      if (!deletedResource?.affected || deletedResource.affected < 1) {
        return fail(new Error('Error while deleting content'));
      }

      return ok(true);
    } catch (error) {
      const errorMsg = 'Error while deleting content';
      this.logger.error(`${errorMsg}:`, error);
      return fail(new Error(errorMsg));
    }
  }

  async findOne(contentId: string): Promise<Result<Content, Error>> {
    try {
      const queryResult = await this.contentRepository.findOneBy({
        id: contentId,
      });

      if (!queryResult) {
        return fail(new Error(`Can't find content with id ${contentId}`));
      }

      return ContentMapper.fromPersistence(queryResult);
    } catch (error) {
      const errorMsg = `Error while getting content id ${contentId}`;
      this.logger.error(`${errorMsg}:`, error);
      return fail(new Error(errorMsg));
    }
  }

  async findOneBy(filters: {
    resourceId: string;
    status: ContentStatusEnum;
  }): Promise<Result<Maybe<Content>, Error>> {
    try {
      const queryResult = await this.contentRepository.findOneBy({
        resourceId: filters.resourceId,
        status: filters.status,
      });

      if (!queryResult) {
        return ok(null);
      }

      return ContentMapper.fromPersistence(queryResult);
    } catch (error) {
      const errorMsg = `Error while getting content by`;
      this.logger.error(`${errorMsg}:`, error);
      return fail(new Error(errorMsg));
    }
  }

  async findExplorerProcessLinks(
    resourceIds: string[],
  ): Promise<Result<ExplorerProcessLinks[], Error>> {
    if (!resourceIds.length) return ok([]);

    try {
      // Only link identifiers are returned to the explorer; BPMN XML stays
      // inside PostgreSQL and is not transferred to the browser.
      const rows: Array<{
        resourceId: string;
        processIds: string[];
        callTargets: string[];
        collapsedTargets: string[];
      }> = await this.contentRepository.query(
        `WITH latest_published AS (
           SELECT DISTINCT ON ("resourceId")
             "resourceId", content
           FROM contents
           WHERE "resourceId" = ANY($1::uuid[])
             AND status = $2
           ORDER BY "resourceId", version DESC NULLS LAST, "createdAt" DESC
         )
         SELECT
           "resourceId",
           ARRAY(
             SELECT regexp_replace(node::text, '^.*="([^"]*)".*$', '\\1')
             FROM unnest(xpath('//*[local-name()="process"]/@id', content::xml)) AS extracted(node)
           ) AS "processIds",
           ARRAY(
             SELECT regexp_replace(node::text, '^.*="([^"]*)".*$', '\\1')
             FROM unnest(xpath('//*[local-name()="callActivity"]/@calledElement', content::xml)) AS extracted(node)
           ) AS "callTargets",
           ARRAY(
             SELECT regexp_replace(node::text, '^.*="([^"]*)".*$', '\\1')
             FROM unnest(xpath('//*[local-name()="subProcess" and @id = //*[local-name()="BPMNShape" and @isExpanded="false"]/@bpmnElement]/@id', content::xml)) AS extracted(node)
           ) AS "collapsedTargets"
         FROM latest_published`,
        [resourceIds, 'published'],
      );

      return ok(
        rows.map((row) => ({
          resourceId: row.resourceId,
          processIds: row.processIds ?? [],
          targets: [
            ...(row.callTargets ?? []),
            ...(row.collapsedTargets ?? []),
          ].filter(Boolean),
        })),
      );
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      const errorMsg = `Error while building explorer BPMN links: ${detail}`;
      this.logger.error(
        errorMsg,
        error instanceof Error ? error.stack : detail,
      );
      return fail(new Error(errorMsg));
    }
  }

  async find(
    resourceId: string,
    filters?: ContentFilters,
    sort?: SortCommand,
  ): Promise<Result<Content[], Error | Error[]>> {
    try {
      const whereFilters = filters?.status
        ? {
            status: filters.status,
          }
        : {};

      const queryResult = await this.contentRepository.find({
        where: {
          resourceId,
          ...whereFilters,
        },
        order: { [sort?.by || 'version']: sort?.order || 'DESC' },
      });

      return combineResults(queryResult.map(ContentMapper.fromPersistence));
    } catch (error) {
      const errorMsg = `Error while finding contents for resourceId '${resourceId}'`;
      this.logger.error(`${errorMsg}:`, error);
      return fail(new Error(errorMsg));
    }
  }
}
