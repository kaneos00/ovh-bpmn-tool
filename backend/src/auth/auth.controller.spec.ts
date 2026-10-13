import { AuthController } from './auth.controller';

describe('AuthController', () => {
  const config = {
    get: jest.fn((key: string) => {
      const values: Record<string, string> = {
        demoAuthUser: 'demo-user',
        demoAuthPassword: 'a-long-demo-password',
        demoAuthGroups: 'bpmn-tool-readwrite-demo,bpmn-tool-admin-demo',
        authSessionSecret: 'test-secret-with-at-least-thirty-two-bytes',
      };
      return values[key];
    }),
  };
  let controller: AuthController;

  const response = () => {
    const headers: Record<string, string> = {};
    const result: { statusCode?: number; body?: unknown; ended?: boolean } = {};
    const res = {} as {
      setHeader: jest.Mock;
      status: jest.Mock;
      json: jest.Mock;
      end: jest.Mock;
    };
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

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new AuthController(config as never);
  });

  it('rejects invalid credentials without issuing a session cookie', () => {
    const { res, headers, result } = response();
    controller.login(
      { username: 'demo-user', password: 'wrong-password' },
      { headers: {} } as never,
      res as never,
    );
    expect(result.statusCode).toBe(401);
    expect(headers['Set-Cookie']).toBeUndefined();
  });

  it('issues an HttpOnly signed session cookie for valid credentials', () => {
    const { res, headers, result } = response();
    controller.login(
      { username: 'demo-user', password: 'a-long-demo-password' },
      { headers: { 'x-forwarded-proto': 'https' } } as never,
      res as never,
    );
    expect(result.statusCode).toBe(200);
    expect(result.body).toEqual({ userId: 'demo-user' });
    expect(headers['Set-Cookie']).toContain('HttpOnly');
    expect(headers['Set-Cookie']).toContain('Secure');
    expect(headers['Set-Cookie']).toContain('SameSite=Lax');
  });

  it('accepts a valid session and exposes trusted identity headers to the proxy', () => {
    const loginResponse = response();
    controller.login(
      { username: 'demo-user', password: 'a-long-demo-password' },
      { headers: { 'x-forwarded-proto': 'https' } } as never,
      loginResponse.res as never,
    );
    const cookie = loginResponse.headers['Set-Cookie'].split(';')[0];
    const { res, headers, result } = response();
    controller.verify({ headers: { cookie } } as never, res as never);
    expect(result.statusCode).toBe(204);
    expect(headers['X-Auth-User']).toBe('demo-user');
    expect(headers['X-Auth-Groups']).toBe(
      'bpmn-tool-readwrite-demo,bpmn-tool-admin-demo',
    );
  });

  it('rejects a tampered session token', () => {
    const { res, result } = response();
    controller.verify(
      { headers: { cookie: 'bpmn_session=not-a-valid-token' } } as never,
      res as never,
    );
    expect(result.statusCode).toBe(401);
  });
});
