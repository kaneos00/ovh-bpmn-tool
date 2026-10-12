import { ResourceTypeOrmRepository } from './resource.repository';

describe('ResourceTypeOrmRepository.delete', () => {
  const resourceRepository = {
    query: jest.fn(),
    delete: jest.fn(),
    find: jest.fn(),
  };
  let repository: ResourceTypeOrmRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new ResourceTypeOrmRepository(resourceRepository as never);
  });

  it('deletes the complete resource descendant tree', async () => {
    resourceRepository.query.mockResolvedValue([
      { id: 'root' },
      { id: 'child' },
      { id: 'grandchild' },
    ]);
    resourceRepository.delete.mockResolvedValue({ affected: 3 });

    await expect(repository.delete('root')).resolves.toEqual({
      ok: true,
      fail: null,
    });
    expect(resourceRepository.query).toHaveBeenCalledWith(
      expect.stringContaining('WITH RECURSIVE resource_tree'),
      ['root'],
    );
    expect(resourceRepository.delete).toHaveBeenCalledWith([
      'root',
      'child',
      'grandchild',
    ]);
  });

  it('returns a failure when the requested resource does not exist', async () => {
    resourceRepository.query.mockResolvedValue([]);

    const result = await repository.delete('missing');

    expect(result.ok).toBeNull();
    expect(result.fail).toBeInstanceOf(Error);
    expect(resourceRepository.delete).not.toHaveBeenCalled();
  });

  it('returns a failure when the database does not delete any resource', async () => {
    resourceRepository.query.mockResolvedValue([{ id: 'root' }]);
    resourceRepository.delete.mockResolvedValue({ affected: 0 });

    const result = await repository.delete('root');

    expect(result.ok).toBeNull();
    expect(result.fail).toBeInstanceOf(Error);
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
    resourceRepository.find.mockRejectedValue(new Error('database unavailable'));

    const result = await repository.find({ parentId: 'root-id' });

    expect(result.ok).toBeNull();
    expect(result.fail).toBeInstanceOf(Error);
    expect((result.fail as Error).message).toContain('database unavailable');
  });
});
