import { StreamableFile, UnauthorizedException } from '@nestjs/common';
import { ExportController } from './export.controller';

describe('ExportController', () => {
  const getPublishedContentQueryHandler = {
    execute: jest.fn(),
  };
  const getResourceQueryHandler = {
    execute: jest.fn(),
  };
  let controller: ExportController;

  beforeEach(() => {
    jest.clearAllMocks();
    getPublishedContentQueryHandler.execute.mockResolvedValue({
      ok: {
        state: {
          resourceId: 'resource-1',
          pngContent: Buffer.from('png-content'),
        },
      },
    });
    getResourceQueryHandler.execute.mockResolvedValue({
      ok: { authToken: 'valid-token' },
    });
    controller = new ExportController(
      getPublishedContentQueryHandler as never,
      getResourceQueryHandler as never,
    );
  });

  it('accepts a bearer token from the Authorization header', async () => {
    const result = await controller.exportPng(
      { resourceId: 'resource-1' },
      undefined,
      'Bearer valid-token',
    );

    expect(result).toBeInstanceOf(StreamableFile);
    expect(getResourceQueryHandler.execute).toHaveBeenCalledWith({
      resourceId: 'resource-1',
    });
  });

  it('keeps supporting legacy authToken query parameters', async () => {
    const result = await controller.exportPng(
      { resourceId: 'resource-1' },
      'valid-token',
    );

    expect(result).toBeInstanceOf(StreamableFile);
  });

  it('does not fall back to a query token when an Authorization header is present but invalid', async () => {
    await expect(
      controller.exportPng(
        { resourceId: 'resource-1' },
        'valid-token',
        'Basic invalid',
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(getPublishedContentQueryHandler.execute).not.toHaveBeenCalled();
  });

  it('rejects an invalid token', async () => {
    await expect(
      controller.exportPng(
        { resourceId: 'resource-1' },
        undefined,
        'Bearer invalid-token',
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects requests without a token', async () => {
    await expect(
      controller.exportPng({ resourceId: 'resource-1' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(
      getPublishedContentQueryHandler.execute,
    ).not.toHaveBeenCalled();
  });
});
