import { scryptSync } from 'node:crypto';
import { AuthController } from './auth.controller';

describe('AuthController local account authentication', () => {
  const config = {
    get: jest.fn((key: string) => {
      const values: Record<string, string> = {
        authSessionSecret: 'test-secret-with-at-least-thirty-two-bytes',
        demoAuthUser: 'demo-user',
        demoAuthPassword: 'a-long-demo-password',
      };
      return values[key];
    }),
  };
  const db = {
    query: jest.fn(),
    transaction: jest.fn(),
  };

  const makeResponse = () => {
    const headers: Record<string, string> = {};
    const result: {
      statusCode?: number;
      body?: unknown;
      ended?: boolean;
    } = {};
    const res = {} as any;
    res.setHeader = jest.fn((key: string, value: string) => {
      headers[key] = value;
    });
    res.status = jest.fn((statusCode: number) => {
      result.statusCode = statusCode;
      return res;
    });
    res.json = jest.fn((body: unknown) => {
      result.body = body;
      return result;
    });
    res.end = jest.fn(() => {
      result.ended = true;
      return result;
    });
    return { res, headers, result };
  };

  let controller: AuthController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new AuthController(config as never, db as never);
  });

  it('rejects missing session cookies on verify', () => {
    const { res, result } = makeResponse();
    controller.verify({ headers: {} } as never, res);
    expect(result.statusCode).toBe(401);
  });

  it('rejects tampered session cookies', () => {
    const { res, result } = makeResponse();
    controller.verify(
      { headers: { cookie: 'bpmn_session=not-a-valid-token' } } as never,
      res,
    );
    expect(result.statusCode).toBe(401);
  });

  it('rejects unknown credentials without issuing a session cookie', async () => {
    db.query.mockResolvedValueOnce([{ count: 1 }]).mockResolvedValueOnce([]);
    const { res, headers, result } = makeResponse();
    await controller.login(
      { username: 'nobody', password: 'wrong-password' },
      { headers: {} } as never,
      res,
    );
    expect(result.statusCode).toBe(401);
    expect(headers['Set-Cookie']).toBeUndefined();
  });

  it('authenticates a stored account and issues an HttpOnly session cookie', async () => {
    const salt = '00112233445566778899aabbccddeeff';
    const password = 'a-very-long-password';
    db.query
      .mockResolvedValueOnce([{ count: 1 }])
      .mockResolvedValueOnce([
        {
          id: '00000000-0000-4000-8000-000000000001',
          username: 'reader',
          email: 'reader@example.com',
          password_hash:
            'scrypt$' +
            salt +
            '$' +
            scryptSync(password, salt, 64, {
              N: 16384,
              r: 8,
              p: 1,
            }).toString('hex'),
          global_role: 'viewer',
          active: true,
        },
      ]);

    const { res, headers, result } = makeResponse();
    await controller.login(
      { username: 'READER@EXAMPLE.COM', password },
      { headers: { 'x-forwarded-proto': 'https' } } as never,
      res,
    );

    expect(result.statusCode).toBe(200);
    expect(result.body).toEqual({
      userId: 'reader',
      email: 'reader@example.com',
      role: 'viewer',
    });
    expect(headers['Set-Cookie']).toContain('HttpOnly');
    expect(headers['Set-Cookie']).toContain('Secure');
    expect(headers['Set-Cookie']).toContain('SameSite=Lax');
  });
});
