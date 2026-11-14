import { ConflictException } from '@nestjs/common';
import { ContentStatusEnum } from '../../../ResourceContext/shared/types/Content';
import { ContentTypeOrmEntity } from '../../../ResourceContext/infrastructure/entities/content.ormEntity';
import { ResourceTypeOrmEntity } from '../../../ResourceContext/infrastructure/entities/resource.ormEntity';
import { ResourceName } from '../../../ResourceContext/domain/Resource/ResourceName';
import {
  createProposalWorkspace,
  publishProposalWorkspace,
} from './process-change-proposal-content.service';

describe('process change proposal content lifecycle', () => {
  it('creates a distinct private resource with a valid name and a draft copied from the published source', async () => {
    const source = {
      id: 'source-1',
      name: 'Processus commun',
      description: 'Description',
      depth: 0,
      parentId: null,
      type: 'process',
    };
    const publishedContent = {
      id: 'published-1',
      content: '<definitions />',
    };
    const resources = {
      create: jest.fn((value: unknown) => value),
      save: jest.fn(async (value: Record<string, unknown>) => ({
        ...value,
        id: 'workspace-1',
      })),
    };
    const contents = {
      create: jest.fn((value: unknown) => value),
      save: jest.fn(async (value: Record<string, unknown>) => ({
        ...value,
        id: 'draft-1',
      })),
    };
    const manager = {
      getRepository: jest.fn((entity: unknown) =>
        entity === ResourceTypeOrmEntity ? resources : contents,
      ),
    };

    const result = await createProposalWorkspace(manager as never, {
      source: source as ResourceTypeOrmEntity,
      publishedContent: publishedContent as ContentTypeOrmEntity,
      createdBy: 'project-manager',
    });

    expect(result.resource.id).toBe('workspace-1');
    expect(result.resource.sourceResourceId).toBe('source-1');
    expect(ResourceName.create(result.resource.name).ok).toBeTruthy();
    expect(result.content.resourceId).toBe('workspace-1');
    expect(result.content.status).toBe(ContentStatusEnum.Draft);
    expect(result.content.content).toBe('<definitions />');
    expect(result.resource.id).not.toBe(source.id);
  });

  it('promotes a submitted workspace draft as a new version of the source in the same transaction', async () => {
    const source = { id: 'source-1', authToken: null };
    const submitted = {
      id: 'draft-1',
      resourceId: 'workspace-1',
      status: ContentStatusEnum.Draft,
      version: 2,
      content: '<definitions id="updated" />',
    };
    const previous = {
      id: 'published-1',
      resourceId: 'source-1',
      status: ContentStatusEnum.Published,
      version: 4,
      content: '<definitions />',
      changeComment: null,
      createdBy: 'old-author',
      updatedBy: 'old-author',
      pngContent: Buffer.from('old'),
    };
    const queryBuilder = {
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({ version: 4 }),
    };
    const resources = {
      findOne: jest.fn().mockResolvedValue(source),
      save: jest.fn(async (value: unknown) => value),
    };
    const contents = {
      findOne: jest
        .fn()
        .mockResolvedValueOnce(submitted)
        .mockResolvedValueOnce(previous),
      createQueryBuilder: jest.fn(() => queryBuilder),
      create: jest.fn((value: unknown) => value),
      save: jest.fn(async (value: unknown) => value),
    };
    const manager = {
      getRepository: jest.fn((entity: unknown) =>
        entity === ResourceTypeOrmEntity ? resources : contents,
      ),
    };

    const result = await publishProposalWorkspace(manager as never, {
      sourceResourceId: 'source-1',
      workspaceResourceId: 'workspace-1',
      submittedContentId: 'draft-1',
      expectedSourceContentId: 'published-1',
      updatedBy: 'referentiel-admin',
      pngContent: 'data:image/png;base64,AA==',
      changeComment: 'Validation du référentiel',
    });

    expect(contents.save).toHaveBeenCalledTimes(2);
    expect(contents.save).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        id: 'published-1',
        status: ContentStatusEnum.Obsolete,
        updatedBy: 'referentiel-admin',
        pngContent: null,
      }),
    );
    expect(result).toMatchObject({
      resourceId: 'source-1',
      status: ContentStatusEnum.Published,
      version: 5,
      content: '<definitions id="updated" />',
      changeComment: 'Validation du référentiel',
    });
    expect(source.authToken).toBeTruthy();
    expect(resources.save).toHaveBeenCalledWith(source);
  });

  it('blocks promotion when the published source version has changed', async () => {
    const resources = {
      findOne: jest.fn().mockResolvedValue({
        id: 'source-1',
        authToken: 'token',
      }),
    };
    const contents = {
      findOne: jest
        .fn()
        .mockResolvedValueOnce({
          id: 'draft-1',
          resourceId: 'workspace-1',
          status: ContentStatusEnum.Draft,
          version: 2,
          content: '<definitions />',
        })
        .mockResolvedValueOnce({
          id: 'published-newer',
          resourceId: 'source-1',
          status: ContentStatusEnum.Published,
          version: 5,
        }),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    const manager = {
      getRepository: jest.fn((entity: unknown) =>
        entity === ResourceTypeOrmEntity ? resources : contents,
      ),
    };

    await expect(
      publishProposalWorkspace(manager as never, {
        sourceResourceId: 'source-1',
        workspaceResourceId: 'workspace-1',
        submittedContentId: 'draft-1',
        expectedSourceContentId: 'published-old',
        updatedBy: 'referentiel-admin',
        pngContent: 'AA==',
        changeComment: 'Publication',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(contents.save).not.toHaveBeenCalled();
    expect(contents.createQueryBuilder).not.toHaveBeenCalled();
  });
});
