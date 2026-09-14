import { ALL_PERMISSION_KEYS, DEFAULT_ROLE_PERMISSIONS } from '../utils/permissions';

export interface PlatformClaims {
  role?: unknown;
  platformAdmin?: unknown;
  permissions?: unknown;
}

export function isPlatformAdminClaims(claims: PlatformClaims | null | undefined): boolean {
  if (!claims || claims.platformAdmin !== true) return false;
  if (claims.role !== 'Super Admin') return false;

  const permissions = Array.isArray(claims.permissions)
    ? claims.permissions.filter((p): p is string => typeof p === 'string')
    : DEFAULT_ROLE_PERMISSIONS['Super Admin'];

  return permissions.length >= ALL_PERMISSION_KEYS.length &&
    ALL_PERMISSION_KEYS.every(permission => permissions.includes(permission));
}

export function assertPlatformAdmin(claims: PlatformClaims | null | undefined): void {
  if (!isPlatformAdminClaims(claims)) {
    const error = new Error('Platform Super Admin access is required.');
    (error as any).statusCode = 403;
    throw error;
  }
}
