import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { metadataKey } from './acl.decorator';
import { UserGroup } from '../../../utils/UserGroup';
import { UserRole } from '../../../../modules/MultiUser/domain/userRole';

// ANCIEN CODE — conservé pour comparaison / retour arrière.
// L'ancienne implémentation lisait userHeader/userGroupsHeader depuis le proxy.

@Injectable()
export class AclGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException();
    }

    const metadata = this.reflector.get(metadataKey, context.getHandler());
    const allowedGroups: UserGroup[] | undefined = metadata?.allowedGroups;

    if (!allowedGroups?.length) {
      return true;
    }

    const isReadWrite =
      user.role === UserRole.EDITOR || user.role === UserRole.ADMIN;
    const effectiveGroup = isReadWrite ? UserGroup.RW : UserGroup.RO;

    if (!allowedGroups.includes(effectiveGroup)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }

  // ANCIEN CODE — conservé pour comparaison / retour arrière.
  // L'ancien contrôle par en-têtes userHeader/userGroupsHeader est remplacé
  // par le rôle authentifié porté par request.user.
}
