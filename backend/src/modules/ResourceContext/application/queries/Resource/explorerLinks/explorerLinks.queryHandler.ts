import { ContentRepository, ExplorerProcessLinks } from '../../../adapters/repositories/content.repository';
import { UseCaseResult } from '../../../../../../shared-kernel/application/usecases/useCase';
import { fail, ok } from '../../../../../../shared-kernel/utils/Result';

export class ExplorerLinksQueryHandler {
  constructor(private readonly contentRepository: ContentRepository) {}

  async execute(resourceIds: string[]): Promise<UseCaseResult<ExplorerProcessLinks[]>> {
    const result = await this.contentRepository.findExplorerProcessLinks(resourceIds);
    return result.fail ? fail(result.fail) : ok(result.ok);
  }
}
