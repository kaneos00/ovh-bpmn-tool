import { DataSource, Repository } from 'typeorm';
import { ContentTypeOrmRepository } from './content.repository';
import { ContentTypeOrmEntity } from '../../entities/content.ormEntity';
import { ResourceTypeOrmEntity } from '../../entities/resource.ormEntity';
import { ContentStatusEnum } from '../../../../modules/ResourceContext/shared/types/Content';
import { ResourceTypeEnum } from '../../../../modules/ResourceContext/shared/types/Resource';

describe('ContentTypeOrmRepository.publishAtomically', () => {
  const resource = {
    id: 'resource-1',
    type: ResourceTypeEnum.Process,
    authToken: null,
  } as ResourceTypeOrmEntity;
  const draft = {
    id: 'content-2',
    resourceId: 'resource-1',
    content: '<definitions />',
    status: ContentStatusEnum.Draft,
    version: 2,
    createdBy: 'author',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedBy: 'author',
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    pngContent: null,
    changeComment: null,
  } as ContentTypeOrmEntity;

  const resources = {
    findOne: jest.fn(),
    save: jest.fn(),
  };
  const contents = {
    findOne: jest.fn(),
    save: jest.fn(),
  };
  const manager = {
    getRepository: jest.fn((entity) =>
      entity === ResourceTypeOrmEntity ? resources : contents,
    ),
  };
  const dataSource = {
    transaction: jest.fn((callback) => callback(manager)),
  };

  let repository: ContentTypeOrmRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    resources.findOne.mockResolvedValue({ ...resource });
    resources.save.mockImplementation(async (entity) => entity);
    contents.findOne
      .mockResolvedValueOnce({ ...draft })
      .mockResolvedValueOnce(null);
    contents.save.mockImplementation(async (entity) => entity);
    repository = new ContentTypeOrmRepository(
      {} as Repository<ContentTypeOrmEntity>,
      dataSource as unknown as DataSource,
    );
  });

  it('publishes the draft and creates its access token in one transaction', async () => {
    const result = await repository.publishAtomically({
      resourceId: 'resource-1',
      contentId: 'content-2',
      updatedBy: 'publisher',
      pngContent: 'data:image/png;base64,cG5n',
      authToken: 'generated-token',
    });

    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(resources.findOne).toHaveBeenCalledWith({
      where: { id: 'resource-1' },
      lock: { mode: 'pessimistic_write' },
    });
    expect(contents.findOne).toHaveBeenNthCalledWith(1, {
      where: { id: 'content-2', resourceId: 'resource-1' },
      lock: { mode: 'pessimistic_write' },
    });
    expect(contents.findOne).toHaveBeenNthCalledWith(2, {
      where: { resourceId: 'resource-1', status: ContentStatusEnum.Published },
      order: { version: 'DESC' },
      lock: { mode: 'pessimistic_write' },
    });
    expect(contents.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: ContentStatusEnum.Published,
        updatedBy: 'publisher',
      }),
    );
    expect(resources.save).toHaveBeenCalledWith(
      expect.objectContaining({ authToken: 'generated-token' }),
    );
    expect(result.fail).toBeNull();
    expect(result.ok?.state.status).toBe(ContentStatusEnum.Published);
  });

  it('returns a failure and lets the transaction roll back when a write fails', async () => {
    resources.save.mockRejectedValueOnce(new Error('token write failed'));

    const result = await repository.publishAtomically({
      resourceId: 'resource-1',
      contentId: 'content-2',
      updatedBy: 'publisher',
      pngContent: 'data:image/png;base64,cG5n',
      authToken: 'generated-token',
    });

    expect(result.ok).toBeNull();
    expect(result.fail?.message).toContain('token write failed');
    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
  });
});
