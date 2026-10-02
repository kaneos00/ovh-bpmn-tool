import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';

import { AclGuard } from './acl.guard';
import { UserGroup } from '../../../utils/UserGroup';
import { MultiUserAuthGuard } from '../../../../modules/MultiUser/infrastructure/multiUserAuth.guard';

// ANCIEN CODE — conservé pour comparaison / retour arrière.
// import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
// import { AclGuard } from './acl.guard';
// import { UserGroup } from '../../../utils/UserGroup';

export const metadataKey = 'ACL_CONTEXT';

export const UseAcl = (allowedGroups?: UserGroup[]) => {
  const decorators: Parameters<typeof applyDecorators> = [
    SetMetadata(metadataKey, { allowedGroups }),
    // L'authentification MultiUser précède le contrôle ACL existant.
    UseGuards(MultiUserAuthGuard, AclGuard),
  ];

  // ANCIEN CODE — conservé pour comparaison / retour arrière.
  // const decorators: Parameters<typeof applyDecorators> = [
  //   SetMetadata(metadataKey, { allowedGroups }),
  //   UseGuards(AclGuard),
  // ];

  return applyDecorators(...decorators);
};
