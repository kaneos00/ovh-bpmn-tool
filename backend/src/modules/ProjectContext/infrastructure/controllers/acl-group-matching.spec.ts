import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AclGuard } from '../../../../shared-kernel/modules/acl/infrastructure/acl.guard';
import { UserGroup } from '../../../../shared-kernel/utils/UserGroup';

describe('AclGuard group matching', () => {
  const makeGuard = (
    handlerAllowedGroups: UserGroup[],
    classAllowedGroups?: UserGroup[],
  ) => {
    const handler = {};
    const controller = {};
    const reflector = {
      getAllAndOverride: jest.fn((_key, targets: unknown[]) => {
        // Mirrors Nest Reflector.getAllAndOverride: first defined metadata wins.
        if (targets[0] === handler && handlerAllowedGroups?.length) {
          return { allowedGroups: handlerAllowedGroups };
        }
        if (targets[1] === controller && classAllowedGroups?.length) {
          return { allowedGroups: classAllowedGroups };
        }
        return undefined;
      }),
    } as unknown as Reflector;
    const configService = {
      getOrThrow: jest.fn((key: string) =>
        key === 'userHeader' ? 'remote-user' : 'remote-user-groups',
      ),
    } as unknown as ConfigService;
    const guard = new AclGuard(reflector, configService);

    const activate = (groups: string) =>
      guard.canActivate({
        getHandler: () => handler,
        getClass: () => controller,
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

  it('accepts alphanumeric identity suffixes for the exact admin group', async () => {
    const { activate } = makeGuard([UserGroup.Admin]);

    await expect(activate('bpmn-tool-admin-admin01')).resolves.toBe(true);
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

  it('gives handler ACL metadata precedence over controller defaults', async () => {
    const { activate, reflector } = makeGuard(
      [UserGroup.ReadWrite],
      [UserGroup.Admin],
    );

    await expect(activate('bpmn-tool-admin-demo')).resolves.toBe(false);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining([expect.any(Object)]),
    );
  });

  it('uses controller ACL metadata when the handler has no ACL metadata', async () => {
    const { activate } = makeGuard([], [UserGroup.Admin]);

    await expect(activate('bpmn-tool-admin-demo')).resolves.toBe(true);
  });
});
