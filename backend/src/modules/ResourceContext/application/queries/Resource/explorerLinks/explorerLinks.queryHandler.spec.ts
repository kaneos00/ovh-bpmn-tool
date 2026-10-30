import { ExplorerLinksQueryHandler } from './explorerLinks.queryHandler';
import { ContentRepository } from '../../../adapters/repositories/content.repository';
import { fail, ok } from '../../../../../../shared-kernel/utils/Result';

describe('ExplorerLinksQueryHandler', () => {
  const repository = {
    findExplorerProcessLinks: jest.fn(),
  } as unknown as jest.Mocked<ContentRepository>;

  let handler: ExplorerLinksQueryHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    handler = new ExplorerLinksQueryHandler(repository);
  });

  it('returns the process link metadata provided by the repository', async () => {
    const links = [
      { resourceId: 'resource-a', processIds: ['Process_A'], targets: ['resource-b'] },
    ];
    repository.findExplorerProcessLinks.mockResolvedValue(ok(links));

    await expect(handler.execute(['resource-a'])).resolves.toEqual(ok(links));
    expect(repository.findExplorerProcessLinks).toHaveBeenCalledTimes(1);
    expect(repository.findExplorerProcessLinks).toHaveBeenCalledWith(['resource-a']);
  });

  it('propagates repository failures without hiding the error', async () => {
    const error = new Error('database unavailable');
    repository.findExplorerProcessLinks.mockResolvedValue(fail(error));

    await expect(handler.execute(['resource-a'])).resolves.toEqual(fail(error));
  });
});
