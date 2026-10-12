import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AclGuard } from './acl.guard';
import { UserGroup } from '../../../utils/UserGroup';

describe('AclGuard group matching', () => {
  const makeGuard = (allowedGroups: UserGroup[]) => {
    const reflector = {
      get: jest.fn().mockReturnValue({ allowedGroups }),
    } as unknown as Reflector;
    const configService = {
      getOrThrow: jest.fn((key: string) =>
        key === 'userHeader' ? 'remote-user' : 'remote-user-groups',
      ),
    } as unknown as ConfigService;
    const guard = new AclGuard(reflector, configService);

    const activate = (groups: string) =>
      guard.canActivate({
        getHandler: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({
            headers: {
              'remote-user': 'demo-user',
              'remote-user-groups': groups,
            },
          }),
        }),
      } as never);

    return { guard, activate, reflector };
  };

  it('accepts the exact organization administrator group', async () => {
    const { activate } = makeGuard([UserGroup.Admin]);

    await expect(activate('bpmn-tool-admin-demo')).resolves.toBe(true);
  });

  it('does not grant organization administration to a read-write user', async () => {
    const { activate } = makeGuard([UserGroup.Admin]);

    await expect(activate('bpmn-tool-readwrite-demo')).resolves.toBe(false);
  });

  it('does not match an administrator group name embedded in another group', async () => {
    const { activate } = makeGuard([UserGroup.Admin]);

    await expect(activate('not-bpmn-tool-admin-demo')).resolves.toBe(false);
  });

  it('trims whitespace around individual trusted group values', async () => {
    const { activate } = makeGuard([UserGroup.Admin]);

    await expect(
      activate('bpmn-tool-readonly-demo, bpmn-tool-admin-demo '),
    ).resolves.toBe(true);
  });
});
