import crypto from 'node:crypto';
import type { TenantRecord, TenantMembership, OwnershipTransferAuditLog, TenantStatus } from '../types';
import type { AuthenticatedUserContext } from './tenantStaffAuth';
import { extractAuthenticatedTenantId } from './tenantStaffAuth';

export interface TenantSecurityContext {
  user: AuthenticatedUserContext;
  tenantId: string;
  tenant: TenantRecord;
  ownerUid: string;
  isOwner: boolean;
  staffRecord: (TenantMembership & Record<string, unknown>) | null;
  role: string;
  permissions: string[];
}

/**
 * Establishes the authoritative 7-point server-side tenant security context:
 * 1. Authenticated user
 * 2. Authenticated tenant
 * 3. Tenant record
 * 4. Tenant owner
 * 5. Membership/staff record
 * 6. Role
 * 7. Permissions
 *
 * All inputs are strictly server-derived. Client-supplied body/header claims are ignored.
 */
export function establishTenantSecurityContext(params: {
  user: AuthenticatedUserContext | undefined;
  tenantRecord: TenantRecord | null | undefined;
  staffRecord?: (TenantMembership & Record<string, unknown>) | null;
}): TenantSecurityContext {
  const { user, tenantRecord, staffRecord } = params;

  // 1. Authenticated user
  if (!user || !user.uid) {
    const error = new Error('Authentication required: valid user identity missing.');
    (error as any).statusCode = 401;
    throw error;
  }

  // 2. Authenticated tenant
  const tenantId = extractAuthenticatedTenantId(user);
  if (!tenantId) {
    const error = new Error('Access denied: user token missing trusted tenant claim.');
    (error as any).statusCode = 403;
    throw error;
  }

  // 3. Tenant record
  if (!tenantRecord) {
    const error = new Error(`Tenant record not found for tenant '${tenantId}'.`);
    (error as any).statusCode = 404;
    throw error;
  }

  // Enforce tenant boundary: tenant record must match the authenticated token tenantId
  if (tenantRecord.id !== tenantId) {
    const error = new Error('Tenant isolation violation: authenticated tenant does not match record.');
    (error as any).statusCode = 403;
    throw error;
  }

  // 4. Tenant owner
  const ownerUid = String(tenantRecord.ownerUid || '').trim();
  if (!ownerUid) {
    const error = new Error('Tenant record is invalid: missing authoritative ownerUid.');
    (error as any).statusCode = 500;
    throw error;
  }

  // Authority check: owner identity strictly comes from tenantRecord.ownerUid, NOT role string
  const isOwner = user.uid === ownerUid;

  // 5. Membership / Staff record
  const membership: (TenantMembership & Record<string, unknown>) | null = staffRecord || null;

  // 6. Role: derived from membership or claims (cannot forge ownership)
  const role = String(membership?.role || user.claims?.role || 'Staff').trim();

  // 7. Permissions: derived from token claims / staff record (never untrusted browser body)
  const permissions: string[] = Array.isArray(user.permissions)
    ? user.permissions
    : Array.isArray(user.claims?.permissions)
    ? (user.claims.permissions as string[])
    : [];

  return {
    user,
    tenantId,
    tenant: tenantRecord,
    ownerUid,
    isOwner,
    staffRecord: membership,
    role,
    permissions,
  };
}

/**
 * Validates cross-tenant boundaries between caller tenant and target resource tenant.
 */
export function assertTenantIsolation(callerTenantId: string, targetTenantId: string): void {
  if (!callerTenantId || !targetTenantId || callerTenantId !== targetTenantId) {
    const error = new Error('Cross-tenant operation is strictly prohibited.');
    (error as any).statusCode = 403;
    throw error;
  }
}

/**
 * Ensures that only the genuine tenant owner (based on tenants/{tenantId}.ownerUid)
 * can perform owner-authoritative operations.
 * Having the "Business Owner" or "Admin" role alone is insufficient.
 */
export function assertCallerIsOwner(context: TenantSecurityContext): void {
  if (!context.isOwner) {
    const error = new Error('Forbidden: only the authoritative tenant owner may perform this action.');
    (error as any).statusCode = 403;
    throw error;
  }

  // Caller membership cannot be inactive/suspended
  if (context.staffRecord) {
    const status = String(context.staffRecord.status || 'active').toLowerCase();
    if (status !== 'active') {
      const error = new Error('Forbidden: inactive or suspended accounts cannot perform owner operations.');
      (error as any).statusCode = 403;
      throw error;
    }
  }

  // Tenant itself must be active
  if (context.tenant.status !== 'active') {
    const error = new Error('Forbidden: operations on suspended tenants are prohibited.');
    (error as any).statusCode = 403;
    throw error;
  }
}

/**
 * Enforces all ownership transfer security rules:
 * - Current caller must be ownerUid
 * - Caller must be active
 * - Target must belong to the same tenant
 * - Target must be active
 * - Target cannot be the current owner already
 * - Target UID cannot be empty
 */
export function assertOwnershipTransferAllowed(params: {
  callerContext: TenantSecurityContext;
  targetMember: {
    uid?: string;
    id?: string;
    tenantId?: string;
    status?: string;
  } | null | undefined;
}): string {
  const { callerContext, targetMember } = params;

  // 1. Caller must be authoritative owner
  assertCallerIsOwner(callerContext);

  // 2. Target must exist
  if (!targetMember) {
    const error = new Error('Target user not found or does not belong to this tenant.');
    (error as any).statusCode = 404;
    throw error;
  }

  // 3. Target must belong to the same tenant
  const targetTenantId = String(targetMember.tenantId || '').trim();
  if (!targetTenantId || targetTenantId !== callerContext.tenantId) {
    const error = new Error('Cross-tenant ownership transfer is strictly prohibited.');
    (error as any).statusCode = 403;
    throw error;
  }

  // 4. Target must be active
  const targetStatus = String(targetMember.status || 'active').toLowerCase();
  if (targetStatus !== 'active') {
    const error = new Error('Ownership cannot be transferred to an inactive, suspended, or deactivated member.');
    (error as any).statusCode = 400;
    throw error;
  }

  // 5. Target UID must be valid and distinct from current owner
  const targetUid = String(targetMember.uid || targetMember.id || '').trim();
  if (!targetUid) {
    const error = new Error('Invalid target member identity.');
    (error as any).statusCode = 400;
    throw error;
  }

  if (targetUid === callerContext.ownerUid) {
    const error = new Error('Target user is already the current tenant owner.');
    (error as any).statusCode = 400;
    throw error;
  }

  return targetUid;
}

/**
 * Prevents the tenant owner from being deleted by ordinary staff or admins.
 */
export function assertNotTenantOwnerDeletion(
  targetStaff: { uid?: string; id?: string; email?: string | null; tenantId?: string } | null | undefined,
  tenant: TenantRecord
): void {
  if (!targetStaff) return;
  const ownerUid = String(tenant.ownerUid || '').trim();
  if (!ownerUid) return;

  const targetUid = String(targetStaff.uid || '').trim();
  const targetId = String(targetStaff.id || '').trim();

  if (targetUid === ownerUid || targetId === ownerUid) {
    const error = new Error('The tenant owner account cannot be deleted.');
    (error as any).statusCode = 403;
    throw error;
  }
}

/**
 * Prevents the tenant owner from being demoted or modified by staff administrators.
 */
export function assertNotTenantOwnerDemotion(
  targetStaff: { uid?: string; id?: string; email?: string | null; role?: string } | null | undefined,
  tenant: TenantRecord,
  requestedRole?: unknown
): void {
  if (!targetStaff || requestedRole === undefined) return;
  const ownerUid = String(tenant.ownerUid || '').trim();
  if (!ownerUid) return;

  const targetUid = String(targetStaff.uid || '').trim();
  const targetId = String(targetStaff.id || '').trim();

  if (targetUid === ownerUid || targetId === ownerUid) {
    const currentRole = String(targetStaff.role || '').trim();
    if (String(requestedRole).trim() !== currentRole) {
      const error = new Error('The tenant owner cannot be demoted by staff administrators.');
      (error as any).statusCode = 403;
      throw error;
    }
  }
}

/**
 * Sanitizes general tenant update payloads (e.g. PATCH /api/tenant).
 * Forbids tampering with ownerUid or tenantId.
 */
export function sanitizeTenantUpdatePayload(
  body: any,
  authenticatedTenantId: string
): Record<string, unknown> {
  if (body && typeof body === 'object') {
    if ('ownerUid' in body || 'owner_uid' in body) {
      const error = new Error('Direct modification of ownerUid is forbidden. Ownership must be transferred via /api/tenant/ownership/transfer.');
      (error as any).statusCode = 403;
      throw error;
    }
    if ('id' in body && String(body.id) !== authenticatedTenantId) {
      const error = new Error('Cannot change tenantId.');
      (error as any).statusCode = 403;
      throw error;
    }
    if ('tenantId' in body && String(body.tenantId) !== authenticatedTenantId) {
      const error = new Error('Cannot change tenantId.');
      (error as any).statusCode = 403;
      throw error;
    }
  }

  // Whitelist safe editable settings
  const safeFields: Record<string, unknown> = {};
  if (body?.name !== undefined) safeFields.name = String(body.name).trim();
  if (body?.currency !== undefined) safeFields.currency = String(body.currency).trim();
  if (body?.slug !== undefined) safeFields.slug = String(body.slug).trim();
  if (body?.status !== undefined) {
    const status = String(body.status).toLowerCase();
    if (status === 'active' || status === 'suspended') {
      safeFields.status = status as TenantStatus;
    }
  }

  safeFields.updatedAt = new Date().toISOString();
  return safeFields;
}

/**
 * Generates an audit record for ownership transfer events.
 */
export function createOwnershipTransferAuditRecord(params: {
  tenantId: string;
  actorUid: string;
  targetUid: string;
  previousOwner: string;
  newOwner: string;
  metadata?: Record<string, unknown>;
}): OwnershipTransferAuditLog {
  return {
    id: crypto.randomUUID(),
    tenantId: params.tenantId,
    actorUid: params.actorUid,
    targetUid: params.targetUid,
    action: 'TENANT_OWNERSHIP_TRANSFERRED',
    timestamp: new Date().toISOString(),
    previousOwner: params.previousOwner,
    newOwner: params.newOwner,
    metadata: params.metadata || {},
  };
}
