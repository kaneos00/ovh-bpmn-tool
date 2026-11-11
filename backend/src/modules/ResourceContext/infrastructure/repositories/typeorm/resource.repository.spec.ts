import { ResourceTypeOrmRepository } from './resource.repository';

describe('ResourceTypeOrmRepository.delete', () => {
  const manager = {
    query: jest.fn(),
  };
  const resourceRepository = {
    manager: {
      transaction: jest.fn(async (work: (tx: typeof manager) => Promise<void>) => work(manager)),
    },
    find: jest.fn(),
  };
  let repository: ResourceTypeOrmRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    manager.query.mockReset();
    resourceRepository.manager.transaction.mockImplementation(
      async (work: (tx: typeof manager) => Promise<void>) => work(manager),
    );
    repository = new ResourceTypeOrmRepository(resourceRepository as never);
  });

  it('deletes project links and the complete resource descendant tree atomically', async () => {
    manager.query
      .mockResolvedValueOnce([
        { id: 'root' },
        { id: 'child' },
        { id: 'grandchild' },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { id: 'root' },
        { id: 'child' },
        { id: 'grandchild' },
      ]);

    await expect(repository.delete('root')).resolves.toEqual({
      ok: true,
      fail: null,
    });
    expect(resourceRepository.manager.transaction).toHaveBeenCalledTimes(1);
    expect(manager.query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('WITH RECURSIVE resource_tree'),
      ['root'],
    );
    expect(manager.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('DELETE FROM project_processes'),
      [['root', 'child', 'grandchild']],
    );
    expect(manager.query).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('DELETE FROM resources'),
      [['root', 'child', 'grandchild']],
    );
  });

  it('does not remove project links when the requested resource does not exist', async () => {
    manager.query.mockResolvedValueOnce([]);

    const result = await repository.delete('missing');

    expect(result.ok).toBeNull();
    expect(result.fail).toBeInstanceOf(Error);
    expect(manager.query).toHaveBeenCalledTimes(1);
  });

  it('rolls back the transaction when resource deletion fails', async () => {
    manager.query
      .mockResolvedValueOnce([{ id: 'root' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const result = await repository.delete('root');

    expect(result.ok).toBeNull();
    expect(result.fail).toBeInstanceOf(Error);
    expect(resourceRepository.manager.transaction).toHaveBeenCalledTimes(1);
    expect(manager.query).toHaveBeenCalledTimes(3);
  });
});

describe('ResourceTypeOrmRepository.find', () => {
  const resourceRepository = {
    find: jest.fn(),
  };
  let repository: ResourceTypeOrmRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new ResourceTypeOrmRepository(resourceRepository as never);
  });

  it('omits undefined optional filters from the TypeORM where clause', async () => {
    resourceRepository.find.mockResolvedValue([]);

    const result = await repository.find({
      type: undefined,
      depth: undefined,
      parentId: 'root-id',
    });

    expect(result).toEqual({ ok: [], fail: null });
    expect(resourceRepository.find).toHaveBeenCalledWith({
      where: { parentId: 'root-id' },
    });
  });

  it('includes the original database error in the returned failure', async () => {
    resourceRepository.find.mockRejectedValue(
      new Error('database unavailable'),
    );

    const result = await repository.find({ parentId: 'root-id' });

    expect(result.ok).toBeNull();
    expect(result.fail).toBeInstanceOf(Error);
    expect((result.fail as Error).message).toContain('database unavailable');
  });
});
