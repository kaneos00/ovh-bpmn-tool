import { NotFoundException } from '@nestjs/common';
import { ResourceContentGovernanceService } from './resource-content-governance.service';

describe('ResourceContentGovernanceService', () => {
  const access = { assertCanReadResource: jest.fn() };
  const contents = { findOne: jest.fn() };
  const headers = { 'x-user': 'alice' };
  let service: ResourceContentGovernanceService;

  beforeEach(() => {
    jest.clearAllMocks();
    access.assertCanReadResource.mockResolvedValue(undefined);
    contents.findOne.mockResolvedValue({
      id: 'content-1',
      resourceId: 'resource-1',
      status: 'published',
      version: 4,
      content: '<bpmn:definitions />',
      changeComment: 'Approved',
      updatedAt: new Date('2026-11-07T10:00:00.000Z'),
    });
    service = new ResourceContentGovernanceService(
      access as never,
      contents as never,
    );
  });

  it('applies the existing resource read policy before loading XML', async () => {
    await service.readContentSnapshot('resource-1', 'content-1', headers);

    expect(access.assertCanReadResource).toHaveBeenCalledWith(
      'resource-1',
      headers,
    );
  });

  it('loads a content row using both resource and content identifiers', async () => {
    const snapshot = await service.readContentSnapshot(
      'resource-1',
      'content-1',
      headers,
    );

    expect(contents.findOne).toHaveBeenCalledWith({
      where: { id: 'content-1', resourceId: 'resource-1' },
      select: {
        id: true,
        resourceId: true,
        status: true,
        version: true,
        content: true,
        changeComment: true,
        updatedAt: true,
      },
    });
    expect(snapshot).toEqual({
      resourceId: 'resource-1',
      contentId: 'content-1',
      status: 'published',
      version: 4,
      content: '<bpmn:definitions />',
      changeComment: 'Approved',
      updatedAt: new Date('2026-11-07T10:00:00.000Z'),
    });
  });

  it('rejects a content identifier belonging to another resource', async () => {
    contents.findOne.mockResolvedValue(null);

    await expect(
      service.readContentSnapshot('resource-1', 'content-from-resource-2', headers),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('does not query content when resource access is denied', async () => {
    access.assertCanReadResource.mockRejectedValue(new Error('forbidden'));

    await expect(
      service.readContentSnapshot('resource-1', 'content-1', headers),
    ).rejects.toThrow('forbidden');

    expect(contents.findOne).not.toHaveBeenCalled();
  });
});
