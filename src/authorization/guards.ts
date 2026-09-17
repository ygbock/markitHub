import { PermissionKey, StaffMember, isStaffSuspended, hasPermission } from '../utils/permissions';
import { TenantCapability } from '../routes/canonicalRoutes';

/**
 * ARCHITECTURAL INVARIANT: UI AUTHORIZATION != SERVER AUTHORIZATION
 *
 * Presentation-level UI gating infrastructure only.
 * Evaluates permissions, capabilities, and lifecycle states to conditionally
 * hide, show, or disable user interface elements for enhanced UX.
 *
 * IMPORTANT: This client-side evaluator is NOT the authoritative security boundary.
 * Authoritative enforcement MUST always be executed on the server, in Firebase
 * Security Rules, and in Express backend route middlewares:
 *
 * Authenticate
 *   → resolve identity
 *   → resolve tenant/business context
 *   → verify ownership/membership
 *   → verify role
 *   → verify permission
 *   → verify capability
 *   → verify resource status
 *   → authorize
 */

export interface CanRenderModuleParams {
  staff?: StaffMember | null;
  permission?: PermissionKey | PermissionKey[];
  requireAllPermissions?: boolean;
  capability?: TenantCapability | TenantCapability[] | string | string[];
  requireAllCapabilities?: boolean;
  tenantCapabilities?: string[];
  tenantStatus?: 'active' | 'suspended' | 'trial' | 'closed' | string;
  userStatus?: 'active' | 'suspended' | string;
}

export type DenyReason =
  | 'no_auth'
  | 'user_suspended'
  | 'tenant_suspended'
  | 'unauthorized'
  | 'capability_disabled';

export interface GuardEvaluationResult {
  allowed: boolean;
  reason?: DenyReason;
}

/**
 * Presentation-level module rendering gate evaluator.
 * Evaluates staff status, tenant lifecycle, permissions, and tenant capabilities.
 */
export function canRenderModule(params: CanRenderModuleParams): GuardEvaluationResult {
  const {
    staff,
    permission,
    requireAllPermissions = false,
    capability,
    requireAllCapabilities = false,
    tenantCapabilities = [],
    tenantStatus = 'active',
    userStatus = 'active',
  } = params;

  // 1. Check user suspension
  if (userStatus === 'suspended' || (staff && isStaffSuspended(staff))) {
    return { allowed: false, reason: 'user_suspended' };
  }

  // 2. Check tenant suspension
  if (tenantStatus === 'suspended') {
    return { allowed: false, reason: 'tenant_suspended' };
  }

  // 3. Check tenant capability
  if (capability) {
    const requiredCaps = Array.isArray(capability) ? capability : [capability];
    const hasCap = (cap: string) =>
      tenantCapabilities.some((c) => c.toLowerCase() === cap.toLowerCase());

    if (requiredCaps.length > 0) {
      const match = requireAllCapabilities
        ? requiredCaps.every(hasCap)
        : requiredCaps.some(hasCap);

      if (!match) {
        return { allowed: false, reason: 'capability_disabled' };
      }
    }
  }

  // 4. Check staff permissions
  if (permission) {
    if (!staff) {
      return { allowed: false, reason: 'no_auth' };
    }
    const permitted = hasPermission(staff, permission, requireAllPermissions);
    if (!permitted) {
      return { allowed: false, reason: 'unauthorized' };
    }
  }

  return { allowed: true };
}
