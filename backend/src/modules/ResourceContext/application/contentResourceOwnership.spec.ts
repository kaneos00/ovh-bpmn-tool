import { CloneContentCommandHandler } from './commands/Content/cloneContent/cloneContent.commandHandler';
import { DeleteContentCommandHandler } from './commands/Content/deleteContent/deleteContent.commandHandler';
import { PublishContentCommandHandler } from './commands/Content/publishContent/publishContent.commandHandler';
import { UpdateContentCommandHandler } from './commands/Content/updateContent/udpateContent.commandHandler';
import { GetContentQueryHandler } from './queries/Content/getContent/getContent.queryHandler';
import { GetXmlContentQueryHandler } from './queries/Content/getXmlContent/getXmlContent.queryHandler';
import { ContentStatusEnum } from '../shared/types/Content';
import { ResourceTypeEnum } from '../shared/types/Resource';

describe('content resource ownership', () => {
  const resourceRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };
  const contentRepository = {
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };

  const resource = {
    id: { value: 'resource-1' },
    type: ResourceTypeEnum.Process,
    authToken: 'token',
  };
  const foreignContent = {
    id: { value: 'content-1' },
    state: {
      resourceId: 'resource-2',
      status: ContentStatusEnum.Published,
      content: '<definitions />',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    resourceRepository.findOne.mockResolvedValue({ ok: resource, fail: null });
    contentRepository.findOne.mockResolvedValue({
      ok: foreignContent,
      fail: null,
    });
    contentRepository.findOneBy.mockResolvedValue({ ok: null, fail: null });
    contentRepository.save.mockResolvedValue({
      ok: foreignContent,
      fail: null,
    });
    contentRepository.delete.mockResolvedValue({ ok: true, fail: null });
  });

  it('rejects cloning content owned by another resource', async () => {
    const handler = new CloneContentCommandHandler(
      resourceRepository as never,
      contentRepository as never,
    );

    const result = await handler.execute('resource-1', 'content-1', {
      clonedBy: 'alice',
    } as never);

    expect(result.fail).toBeTruthy();
    expect(contentRepository.findOneBy).not.toHaveBeenCalled();
    expect(contentRepository.save).not.toHaveBeenCalled();
  });

  it('rejects publishing content owned by another resource', async () => {
    const handler = new PublishContentCommandHandler(
      resourceRepository as never,
      contentRepository as never,
    );

    const result = await handler.execute('resource-1', 'content-1', {
      updatedBy: 'alice',
      pngContent: '',
    } as never);

    expect(result.fail).toBeTruthy();
    expect(contentRepository.save).not.toHaveBeenCalled();
  });

  it('rejects updating content owned by another resource', async () => {
    const handler = new UpdateContentCommandHandler(
      resourceRepository as never,
      contentRepository as never,
    );

    const result = await handler.execute('resource-1', 'content-1', {
      content: '<definitions />',
      updatedBy: 'alice',
    } as never);

    expect(result.fail).toBeTruthy();
    expect(contentRepository.save).not.toHaveBeenCalled();
  });

  it('rejects deleting content owned by another resource', async () => {
    const handler = new DeleteContentCommandHandler(
      resourceRepository as never,
      contentRepository as never,
    );

    const result = await handler.execute({
      resourceId: 'resource-1',
      contentId: 'content-1',
    });

    expect(result.fail).toBeTruthy();
    expect(contentRepository.delete).not.toHaveBeenCalled();
  });

  it('rejects reading content owned by another resource', async () => {
    const handler = new GetContentQueryHandler(
      resourceRepository as never,
      contentRepository as never,
    );

    const result = await handler.execute('resource-1', 'content-1');

    expect(result.fail).toBeTruthy();
  });

  it('rejects reading XML owned by another resource', async () => {
    const handler = new GetXmlContentQueryHandler(
      resourceRepository as never,
      contentRepository as never,
    );

    const result = await handler.execute('resource-1', 'content-1');

    expect(result.fail).toBeTruthy();
  });
});
