import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../domain/userRole';

export const ROLES_KEY = 'multiuser_roles';

export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
