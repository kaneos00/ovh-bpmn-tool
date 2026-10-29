import { UnauthorizedException } from '@nestjs/common';
import { ThemePreferenceController } from './theme-preference.controller';

describe('ThemePreferenceController', () => {
  const config = {
    get: jest.fn((key: string) =>
      key === 'authSessionSecret'
        ? 'test-secret-with-at-least-thirty-two-bytes'
        : undefined,
    ),
  };
  const db = { query: jest.fn() };
  let controller: ThemePreferenceController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new ThemePreferenceController(config as never, db as never);
  });

  it('requires an authenticated session to read preferences', async () => {
    await expect(
      controller.getPreferences({ headers: {} } as never),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(db.query).not.toHaveBeenCalled();
  });

  it('rejects a malformed or tampered session before accessing the database', async () => {
    await expect(
      controller.getPreferences({
        headers: { cookie: 'bpmn_session=not-a-valid-token' },
      } as never),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(db.query).not.toHaveBeenCalled();
  });
});
