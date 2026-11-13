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
      // Project-process links use ON DELETE RESTRICT in the shared-process
      // schema. Remove links for the complete descendant tree in the same
      // transaction as the resources, so a failed delete cannot orphan the
      // project workspace or leave a resource half-deleted.
      await this.resourceRepository.manager.transaction(async (manager) => {
        const resourceTree: Array<{ id: string }> = await manager.query(
          `WITH RECURSIVE resource_tree AS (
             SELECT id
             FROM resources
             WHERE id = $1
             UNION
             SELECT child.id
             FROM resources AS child
             INNER JOIN resource_tree AS parent
               ON child."parentId" = parent.id::text
           )
           SELECT id FROM resource_tree`,
          [resourceId],
        );

        if (!resourceTree?.length) {
          throw new Error('Resource not found');
        }

        const resourceIds = resourceTree.map(({ id }) => id);
        // Proposal rows hold RESTRICT references to both source and cloned
        // resources, and to published contents. Remove the workflow records
        // first; their event and remark history is deleted through ON DELETE CASCADE.
        await manager.query(
          'DELETE FROM process_change_proposals WHERE "sourceResourceId" = ANY($1::uuid[]) OR "cloneResourceId" = ANY($1::uuid[])',
          [resourceIds],
        );
        // A deleted source may also be referenced by a variant association
        // outside this folder. Remove that association so it cannot block the
        // explicit resource deletion; the external resource itself is retained.
        await manager.query(
          'DELETE FROM project_processes WHERE "resourceId" = ANY($1::uuid[]) OR "sourceResourceId" = ANY($1::uuid[])',
          [resourceIds],
        );
        const deletedResources: Array<{ id: string }> = await manager.query(
          'DELETE FROM resources WHERE id = ANY($1::uuid[]) RETURNING id',
          [resourceIds],
        );

        if (!deletedResources?.length) {
          throw new Error('Error while deleting resource');
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
