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

    if (command.parentId !== undefined) {
      if (command.parentId === resource.id.value) {
        return fail(new Error('A resource cannot be moved inside itself'));
      }

      let parentDepth: number | undefined;

      if (command.parentId) {
        const parentResult = await this.resourceRepository.findOne(command.parentId);
        if (!parentResult.ok) {
          return fail(new CannotFindResourceError(command.parentId, parentResult.fail as Error));
        }

        parentDepth = parentResult.ok.depth;

        const allResourcesResult = await this.resourceRepository.find();
        if (allResourcesResult.ok) {
          const childrenByParent = new Map<string | null, Resource[]>();
          for (const candidate of allResourcesResult.ok) {
            const children = childrenByParent.get(candidate.parentId) ?? [];
            children.push(candidate);
            childrenByParent.set(candidate.parentId, children);
          }

          const descendants = new Set<string>();
          const visit = (parentId: string) => {
            for (const child of childrenByParent.get(parentId) ?? []) {
              if (descendants.has(child.id.value)) continue;
              descendants.add(child.id.value);
              visit(child.id.value);
            }
          };
          visit(resource.id.value);

          if (descendants.has(command.parentId)) {
            return fail(new Error('A folder cannot be moved inside one of its descendants'));
          }
        }
      }

      resource.move(command.parentId, parentDepth);
    }

    if (command.name) resource.rename(command.name);
    if (command.description !== undefined) resource.changeDescription(command.description);

    const result = await this.resourceRepository.save(resource);
    if (!result.ok) return fail(new CannotSaveResourceError(command.resourceId, result.fail));
    return ok(result.ok);
  }
}
