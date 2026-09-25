import { ok, fail } from '../../../../../../shared-kernel/utils/Result';
import { ResourceRepository } from '../../../adapters/repositories/resource.repository';
import { UpdateResourceCommand } from './updateResource.command';
import { Resource } from '../../../../../../modules/ResourceContext/domain/Resource/Resource';
import {
  CannotFindResourceError,
  CannotSaveResourceError,
} from './updateResource.error';
import { UseCaseResult } from '../../../../../../shared-kernel/application/usecases/useCase';
import { ResourceNameExistError } from '../resource.error';

export class UpdateResourceCommandHandler {
  constructor(private readonly resourceRepository: ResourceRepository) {}

  public async execute(command: UpdateResourceCommand): Promise<UseCaseResult<Resource>> {
    const findResourceResult = await this.resourceRepository.findOne(command.resourceId);

    if (!findResourceResult.ok) {
      return fail(new CannotFindResourceError(command.resourceId, findResourceResult.fail as Error));
    }

    const resource = findResourceResult.ok;

    if (command.name && command.name !== resource.name) {
      const resourceNameResult = resource.parentId
        ? await this.resourceRepository.find({ parentId: resource.parentId })
        : await this.resourceRepository.findByDepth(0);

      if (!resourceNameResult.ok) {
        // toto: error
      }

      if (resourceNameResult.ok && resourceNameResult.ok.some(({ name }) => name === command.name)) {
        return fail(new ResourceNameExistError({ name: command.name }));
      }
    }

    let descendants: Resource[] = [];

    if (command.parentId !== undefined) {
      if (command.parentId === resource.id.value) {
        return fail(new Error('A resource cannot be moved inside itself'));
      }

      const allResourcesResult = await this.resourceRepository.find();
      if (!allResourcesResult.ok) {
        return fail(new Error('Cannot load resources to validate the move'));
      }

      const allResources = allResourcesResult.ok;
      const childrenByParent = new Map<string | null, Resource[]>();

      for (const candidate of allResources) {
        const children = childrenByParent.get(candidate.parentId) ?? [];
        children.push(candidate);
        childrenByParent.set(candidate.parentId, children);
      }

      let parentDepth: number | undefined;

      if (command.parentId) {
        const parentResult = allResources.find(candidate => candidate.id.value === command.parentId);
        if (!parentResult) {
          return fail(new CannotFindResourceError(command.parentId, new Error('Parent resource not found')));
        }

        parentDepth = parentResult.depth;

        const descendantIds = new Set<string>();
        const collectDescendants = (parentId: string) => {
          for (const child of childrenByParent.get(parentId) ?? []) {
            if (descendantIds.has(child.id.value)) continue;
            descendantIds.add(child.id.value);
            collectDescendants(child.id.value);
          }
        };

        collectDescendants(resource.id.value);

        if (descendantIds.has(command.parentId)) {
          return fail(new Error('A folder cannot be moved inside one of its descendants'));
        }
      }

      resource.move(command.parentId, parentDepth);

      const collectDescendants = (parentId: string) => {
        for (const child of childrenByParent.get(parentId) ?? []) {
          descendants.push(child);
          collectDescendants(child.id.value);
        }
      };

      collectDescendants(resource.id.value);

      const updateDepths = (parentId: string, parentDepthValue: number) => {
        for (const child of childrenByParent.get(parentId) ?? []) {
          child.move(child.parentId, parentDepthValue);
          updateDepths(child.id.value, child.depth);
        }
      };

      updateDepths(resource.id.value, resource.depth);
    }

    if (command.name) resource.rename(command.name);
    if (command.description !== undefined) resource.changeDescription(command.description);

    const result = await this.resourceRepository.save(resource);
    if (!result.ok) return fail(new CannotSaveResourceError(command.resourceId, result.fail));

    for (const descendant of descendants) {
      const descendantResult = await this.resourceRepository.save(descendant);
      if (!descendantResult.ok) {
        return fail(new CannotSaveResourceError(descendant.id.value, descendantResult.fail));
      }
    }

    return ok(result.ok);
  }
}
