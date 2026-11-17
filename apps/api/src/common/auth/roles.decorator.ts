import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/** Требует одну из перечисленных ролей (проверяется RolesGuard). */
export const Roles = (...roles: string[]): ReturnType<typeof SetMetadata> =>
  SetMetadata(ROLES_KEY, roles);
