import { UnauthorizedException } from '@nestjs/common';
import { createHmac } from 'node:crypto';
import { ThemePreferenceController } from './theme-preference.controller';

describe('ThemePreferenceController', () => {
  const secret = 'test-secret-with-at-least-thirty-two-bytes';
  const config = {
    get: jest.fn((key: string) =>
      key === 'authSessionSecret' ? secret : undefined,
    ),
  };
  const db = { query: jest.fn() };
  let controller: ThemePreferenceController;

  const sessionCookie = (sub = 'alice') => {
    const payload = Buffer.from(
      JSON.stringify({
        sub,
        groups: ['bpmn-tool-readwrite-demo'],
        role: 'modeler',
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    ).toString('base64url');
    const signature = createHmac('sha256', secret)
      .update(payload)
      .digest('base64url');
    return `bpmn_session=${payload}.${signature}`;
  };

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

  it('reads the stored preference for the authenticated account', async () => {
    db.query
      .mockResolvedValueOnce([{ id: 'user-1' }])
      .mockResolvedValueOnce([{ theme: 'dark' }]);

    const result = await controller.getPreferences({
      headers: { cookie: sessionCookie() },
    } as never);

    expect(result).toEqual({ theme: 'dark' });
    expect(db.query).toHaveBeenNthCalledWith(
      2,
      'SELECT theme FROM app_user_preferences WHERE user_id = $1',
      ['user-1'],
    );
  });

  it('stores the selected theme for the authenticated account', async () => {
    db.query
      .mockResolvedValueOnce([{ id: 'user-1' }])
      .mockResolvedValueOnce([]);

    const result = await controller.savePreferences(
      { headers: { cookie: sessionCookie() } } as never,
      { theme: 'dark' },
    );

    expect(result).toEqual({ theme: 'dark' });
    expect(db.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('INSERT INTO app_user_preferences'),
      ['user-1', 'dark'],
    );
  });

  it('rejects unsupported theme values', async () => {
    db.query.mockResolvedValueOnce([{ id: 'user-1' }]);

    await expect(
      controller.savePreferences(
        { headers: { cookie: sessionCookie() } } as never,
        { theme: 'system' },
      ),
    ).rejects.toThrow('Préférence de thème invalide.');
    expect(db.query).toHaveBeenCalledTimes(1);
  });
});