import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Injectable, Logger } from '@nestjs/common';

import {
  Result,
  combineResults,
  ok,
  fail,
} from '../../../../../shared-kernel/utils/Result';
import { Maybe } from '../../../../../shared-kernel/utils/Maybe';
import { ResourceTypeOrmEntity } from '../../../../../modules/ResourceContext/infrastructure/entities/resource.ormEntity';
import {
  ResourceFilters,
  ResourceRepository,
} from '../../../../../modules/ResourceContext/application/adapters/repositories/resource.repository';
import { Resource } from '../../../../../modules/ResourceContext/domain/Resource/Resource';
import { ResourceMapper } from '../../mappers/resource.mapper';

@Injectable()
export class ResourceTypeOrmRepository implements ResourceRepository {
  private readonly logger = new Logger(ResourceTypeOrmRepository.name);

  constructor(
    @InjectRepository(ResourceTypeOrmEntity)
    private readonly resourceRepository: Repository<ResourceTypeOrmEntity>,
  ) {}

  async save(resource: Resource): Promise<Result<Resource, Error>> {
    try {
      const resourceEntity = ResourceMapper.toPersistence(resource);
      const savedResource = await this.resourceRepository.save(resourceEntity);
      return ResourceMapper.fromPersistence(savedResource);
    } catch (error) {
      const errorMsg = 'Error while saving resource';
      this.logger.error(`${errorMsg}:`, error);
      return fail(new Error(errorMsg));
    }
  }

  async delete(resourceId: string): Promise<Result<boolean, Error>> {
    try {
      await this.resourceRepository.manager.transaction(async (manager) => {
        const resourceTree: Array<{ id: string }> = await manager.query(
          `WITH RECURSIVE resource_tree AS (
             SELECT id, "parentId"
             FROM resources
             WHERE id = $1
             UNION
             SELECT child.id, child."parentId"
             FROM resources AS child
             INNER JOIN resource_tree AS parent
               ON child."parentId" = parent.id::text
           )
           SELECT id, "parentId" FROM resource_tree`,
          [resourceId],
        );

        if (!resourceTree?.length) {
          throw new Error('Resource not found');
        }

        const resourceIds = resourceTree.map(({ id }) => id);
        // Preserve processes attached to more than one project. If their
        // containing folder is deleted, move them to the shared root first.
        const sharedResources: Array<{ id: string }> = await manager.query(
          `SELECT "resourceId" AS id
           FROM project_processes
           WHERE "resourceId" = ANY($1::uuid[])
           GROUP BY "resourceId"
           HAVING COUNT(DISTINCT "projectId") > 1`,
          [resourceIds],
        );
        const sharedIds = sharedResources.map(({ id }) => id);
        const sharedIdSet = new Set(sharedIds);
        const deletableIds = resourceIds.filter((id) => !sharedIdSet.has(id));

        if (!deletableIds.length) {
          throw new Error(
            'This resource is still shared by multiple projects. Remove its project associations before deleting it.',
          );
        }

        if (sharedIds.length) {
          await manager.query(
            `UPDATE resources
             SET "parentId" = NULL
             WHERE id = ANY($1::uuid[])
               AND "parentId" = ANY($2::uuid[])`,
            [sharedIds, resourceIds],
          );
        }

        // Delete change requests only when their source or cloned resource is
        // actually deleted; proposal comments/events are removed by cascades.
        await manager.query(
          'DELETE FROM process_change_proposals WHERE "sourceResourceId" = ANY($1::uuid[]) OR "cloneResourceId" = ANY($1::uuid[])',
          [deletableIds],
        );

        // Keep variants outside the deleted subtree, but detach their source
        // pointer in both the resource record and project association.
        await manager.query(
          'UPDATE resources SET "sourceResourceId" = NULL WHERE "sourceResourceId" = ANY($1::uuid[]) AND NOT (id = ANY($1::uuid[]))',
          [deletableIds],
        );
        await manager.query(
          'UPDATE project_processes SET "sourceResourceId" = NULL WHERE "sourceResourceId" = ANY($1::uuid[]) AND NOT ("resourceId" = ANY($1::uuid[]))',
          [deletableIds],
        );
        await manager.query(
          'DELETE FROM project_processes WHERE "resourceId" = ANY($1::uuid[])',
          [deletableIds],
        );

        const deletedResources: Array<{ id: string }> = await manager.query(
          'DELETE FROM resources WHERE id = ANY($1::uuid[]) RETURNING id',
          [deletableIds],
        );

        if (deletedResources?.length !== deletableIds.length) {
          throw new Error(
            'Error while deleting the complete resource hierarchy',
          );
        }
      });

      return ok(true);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      const errorMsg = 'Error while deleting resource';
      this.logger.error(`${errorMsg}: ${detail}`, error);
      return fail(new Error(`${errorMsg}: ${detail}`));
    }
  }

  async findOne(resourceId: string): Promise<Result<Maybe<Resource>, Error>> {
    try {
      const queryResult = await this.resourceRepository.findOneBy({
        id: resourceId,
      });

      if (!queryResult) {
        return fail(new Error(`Can't find resource with id ${resourceId}`));
      }

      return ResourceMapper.fromPersistence(queryResult);
    } catch (error) {
      const errorMsg = `Error while getting resource id ${resourceId}`;
      this.logger.error(`${errorMsg}:`, error);
      return fail(new Error(errorMsg));
    }
  }

  async find(
    filters?: ResourceFilters,
  ): Promise<Result<Resource[], Error | Error[]>> {
    try {
      // Do not pass undefined query parameters to TypeORM's WHERE clause.
      // The controller always constructs the filter object, even when some
      // optional query parameters are absent.
      const where = Object.fromEntries(
        Object.entries(filters ?? {}).filter(
          ([, value]) => value !== undefined,
        ),
      ) as ResourceFilters;

      const result = await this.resourceRepository.find(
        Object.keys(where).length ? { where } : {},
      );

      return combineResults(result.map(ResourceMapper.fromPersistence));
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      const errorMsg = detail
        ? `Error while finding resources: ${detail}`
        : 'Error while finding resources';
      this.logger.error(
        errorMsg,
        error instanceof Error ? error.stack : detail,
      );
      return fail(new Error(errorMsg));
    }
  }

  async findByDepth(
    depth: number,
  ): Promise<Result<Resource[], Error | Error[]>> {
    try {
      const queryResult = await this.resourceRepository.findBy({
        depth,
      });

      return combineResults(queryResult.map(ResourceMapper.fromPersistence));
    } catch (error) {
      const errorMsg = `Error while getting resources with depth '${depth}'`;
      this.logger.error(`${errorMsg}:`, error);
      return fail(new Error(errorMsg));
    }
  }
}
