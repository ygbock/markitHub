import crypto from 'node:crypto';
import { ALL_PERMISSION_KEYS, DEFAULT_ROLE_PERMISSIONS } from '../utils/permissions';
import type { AuditLog } from '../types';

export interface AuthenticatedUserContext {
  uid?: string;
  email?: string | null;
  claims?: {
    tenantId?: string;
    tenant_id?: string;
    staffId?: string;
    role?: string;
    permissions?: string[];
    [key: string]: unknown;
  };
  permissions?: string[];
}

/**
 * Extracts and strictly normalizes the authenticated tenant ID from verified claims.
 * Client-supplied headers or body fields cannot forge this value.
 */
export function extractAuthenticatedTenantId(user?: AuthenticatedUserContext): string {
  return String(user?.claims?.tenantId || user?.claims?.tenant_id || '').trim();
}

/**
 * Enforces cross-tenant isolation on staff documents.
 * Throws 404 if not found, 403 if document belongs to a different tenant.
 */
export function assertTenantStaffAccess(
  existingStaff: { tenantId?: string } | null | undefined,
  authenticatedTenantId: string
): void {
  if (!existingStaff) {
    const error = new Error('Staff member not found.');
    (error as any).statusCode = 404;
    throw error;
  }
  const staffTenant = String(existingStaff.tenantId || '').trim();
  if (!staffTenant || staffTenant !== authenticatedTenantId) {
    const error = new Error('Access denied: cross-tenant operation is prohibited.');
    (error as any).statusCode = 403;
    throw error;
  }
}

/**
 * Determines whether an operation targets the caller's own staff account.
 */
export function isSelfStaffOperation(
  user: AuthenticatedUserContext | undefined,
  targetStaffId: string,
  existingStaff?: { uid?: string; id?: string; email?: string | null }
): boolean {
  if (!user) return false;
  const userUid = user.uid ? String(user.uid) : '';
  const userStaffId = user.claims?.staffId ? String(user.claims.staffId) : '';
  const userEmail = user.email ? String(user.email).toLowerCase().trim() : '';

  if (userUid && (targetStaffId === userUid || existingStaff?.id === userUid || existingStaff?.uid === userUid)) {
    return true;
  }
  if (userStaffId && (targetStaffId === userStaffId || existingStaff?.id === userStaffId)) {
    return true;
  }
  if (userEmail && existingStaff?.email && String(existingStaff.email).toLowerCase().trim() === userEmail) {
    return true;
  }
  return false;
}

/**
 * Prevents operators from changing their own role, even if they have role-management permissions.
 */
export function assertNotSelfRoleChange(
  user: AuthenticatedUserContext | undefined,
  targetStaffId: string,
  requestedRole: unknown,
  existingStaff?: { uid?: string; id?: string; email?: string | null; role?: string }
): void {
  if (requestedRole === undefined) return;
  const isSelf = isSelfStaffOperation(user, targetStaffId, existingStaff);
  if (isSelf && String(requestedRole).trim() !== String(existingStaff?.role || '').trim()) {
    const error = new Error('You cannot change your own role.');
    (error as any).statusCode = 400;
    throw error;
  }
}

/**
 * Enforces that altering user roles or custom permission overrides strictly requires `users.roles`.
 * `users.manage` alone is insufficient to change roles or modify customPermissions.
 */
export function assertStaffRoleManagementAllowed(
  userPermissions: string[] | undefined,
  body: { role?: unknown; customPermissions?: unknown },
  existing?: { role?: string; customPermissions?: string[] }
): void {
  const permissions = userPermissions || [];
  const requestedRole = body?.role;
  const requestedOverrides = body?.customPermissions;

  const roleChanged = requestedRole !== undefined && String(requestedRole).trim() !== String(existing?.role || '').trim();

  const normalizePerms = (perms: unknown) => (Array.isArray(perms) ? [...perms].sort() : []);
  const overridesChanged =
    requestedOverrides !== undefined &&
    JSON.stringify(normalizePerms(requestedOverrides)) !== JSON.stringify(normalizePerms(existing?.customPermissions));

  if ((roleChanged || overridesChanged) && !permissions.includes('users.roles')) {
    const error = new Error('Role or permission changes require users.roles.');
    (error as any).statusCode = 403;
    throw error;
  }
}

/**
 * Normalizes staff payloads, preventing privilege injection and parameter tampering.
 * - Client-supplied tenantId is discarded; authenticated tenantId is enforced.
 * - Role must belong to the valid registered system roles.
 * - customPermissions cannot contain arbitrary strings.
 */
export function normalizeStaffPayload(
  body: any,
  authenticatedTenantId: string,
  existing?: any
) {
  if (!authenticatedTenantId) {
    const error = new Error('Authenticated tenant context is required.');
    (error as any).statusCode = 401;
    throw error;
  }

  // 0. Forbid ownerUid injection through staff payload
  if (body && (body.ownerUid !== undefined || body.owner_uid !== undefined)) {
    const error = new Error('Direct assignment or modification of ownerUid via staff payload is strictly prohibited.');
    (error as any).statusCode = 403;
    throw error;
  }

  // 1. Enforce valid role
  const role = String(body?.role || existing?.role || 'Cashier').trim();
  const allowedRoles = Object.keys(DEFAULT_ROLE_PERMISSIONS);
  if (!allowedRoles.includes(role)) {
    const error = new Error(`Invalid staff role: ${role}`);
    (error as any).statusCode = 400;
    throw error;
  }

  // 2. Validate custom permissions: reject arbitrary or unknown permission strings
  let customPermissions: string[] | undefined = existing?.customPermissions;
  if (body?.customPermissions !== undefined) {
    if (!Array.isArray(body.customPermissions)) {
      const error = new Error('customPermissions must be an array of strings.');
      (error as any).statusCode = 400;
      throw error;
    }
    const invalid = body.customPermissions.filter(
      (p: unknown) => typeof p !== 'string' || !(ALL_PERMISSION_KEYS as readonly string[]).includes(p)
    );
    if (invalid.length > 0) {
      const error = new Error(`Arbitrary permission strings cannot be injected: ${invalid.join(', ')}`);
      (error as any).statusCode = 400;
      throw error;
    }
    customPermissions = [...body.customPermissions];
  }

  // 3. Construct clean record with server-authoritative tenantId
  return {
    ...(existing || {}),
    id: String(body?.id || existing?.id || crypto.randomUUID()),
    tenantId: authenticatedTenantId, // strictly overrides any client-supplied body.tenantId
    name: String(body?.name ?? existing?.name ?? '').trim(),
    email: String(body?.email ?? existing?.email ?? '').trim() || null,
    role,
    status: String(body?.status ?? existing?.status ?? 'active'),
    ...(customPermissions ? { customPermissions } : {}),
    updatedAt: new Date().toISOString(),
  };
}

export interface StaffStatusAuditRecordParams {
  tenantId: string;
  actorUid: string;
  actorName?: string;
  actorRole?: string;
  targetStaffId: string;
  targetStaffName?: string;
  previousStatus: string;
  newStatus: 'active' | 'suspended';
  reason?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Creates an immutable audit record for staff suspension or reactivation.
 * Strictly excludes any secrets (PINs, passwords, tokens).
 */
export function createStaffStatusAuditRecord(params: StaffStatusAuditRecordParams): AuditLog {
  const isSuspension = params.newStatus === 'suspended';
  const action = isSuspension ? 'Staff Suspended' : 'Staff Reactivated';
  const targetStaffName = params.targetStaffName || params.targetStaffId;
  const rawReason = typeof params.reason === 'string' ? params.reason.trim() : '';
  const reason = rawReason || (isSuspension ? 'Administrative suspension' : 'Administrative reactivation');
  const now = new Date().toISOString();

  // Sanitize metadata to guarantee no secrets/credentials/PINs are leaked
  const sanitizedMetadata: Record<string, unknown> = {};
  if (params.metadata) {
    for (const [key, value] of Object.entries(params.metadata)) {
      const lowerKey = key.toLowerCase();
      if (
        !lowerKey.includes('pin') &&
        !lowerKey.includes('password') &&
        !lowerKey.includes('token') &&
        !lowerKey.includes('secret') &&
        !lowerKey.includes('credential')
      ) {
        sanitizedMetadata[key] = value;
      }
    }
  }

  return {
    id: `audit_staff_${crypto.randomUUID()}`,
    timestamp: now,
    staffName: params.actorName || params.actorUid,
    role: params.actorRole || 'Staff Manager',
    action,
    module: 'User Management',
    details: `Staff member ${targetStaffName} (${params.targetStaffId}) status changed from ${params.previousStatus} to ${params.newStatus}. Reason: ${reason}`,
    tenantId: params.tenantId,
    actorUid: params.actorUid,
    actorName: params.actorName || params.actorUid,
    actorEmail: (params.metadata?.actorEmail as string) || null,
    actorRole: params.actorRole || 'Staff Manager',
    targetType: 'staff',
    targetId: params.targetStaffId,
    targetName: targetStaffName,
    previousState: { status: params.previousStatus },
    newState: { status: params.newStatus },
    targetStaffId: params.targetStaffId,
    targetStaffName,
    previousStatus: params.previousStatus,
    newStatus: params.newStatus,
    reason,
    result: 'success',
    severity: isSuspension ? 'critical' : 'warning',
    metadata: {
      tenantId: params.tenantId,
      actorUid: params.actorUid,
      targetStaffId: params.targetStaffId,
      targetStaffName,
      previousStatus: params.previousStatus,
      newStatus: params.newStatus,
      reason,
      ...sanitizedMetadata,
    },
  };
}
