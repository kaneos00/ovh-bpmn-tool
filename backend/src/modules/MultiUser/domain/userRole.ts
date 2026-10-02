export enum UserRole {
  CONSULTATION = 'consultation',
  EDITOR = 'editor',
  ADMIN = 'admin',
}

export const canRead = (_role: UserRole): boolean => true;

export const canModify = (role: UserRole): boolean =>
  role === UserRole.EDITOR || role === UserRole.ADMIN;

export const canAdministerUsers = (role: UserRole): boolean =>
  role === UserRole.ADMIN;
