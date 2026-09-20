import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

export const ROLES_KEY = 'roles';

/**
 * Restricts an endpoint to one or more roles. Must be paired with
 * RolesGuard (and JwtAuthGuard so req.user is populated).
 *
 * @Roles(Role.ADMIN, Role.MANAGER)
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
