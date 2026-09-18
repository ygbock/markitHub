/**
 * MIKITHUB AUTHORITATIVE ROUTE GUARDS & ACCESS CONTROL
 *
 * Implements Section 13, 14, 15 of MikitHub Canonical Route Ownership:
 * - Explicit guard evaluation: Public, Customer, Business, Tenant, SuperAdmin
 * - Multi-level authorization pipeline
 * - Tenant status enforcement (Active, Suspended, Pending, Archived)
 * - Capability checks & RBAC permissions
 * - Deep-link preservation (avoids blind dashboard redirects)
 */

import { 
  CanonicalRouteMatch, 
  TenantCapability, 
  TenantOperationalStatus 
} from './canonicalRoutes';
import { StaffMember, Customer, User, PlatformIdentity, TenantMembership, BusinessRelationship } from '../types';
import { getEffectivePermissions } from '../utils/permissions';

export interface TenantContextRecord {
  id: string;
  slug: string;
  name: string;
  status: TenantOperationalStatus;
  capabilities: TenantCapability[];
  planId?: string;
  ownerUid?: string;
  suspendedReason?: string;
}

export interface RouteAuthContext {
  activeCustomer: Customer | null;
  activeStaff: StaffMember | null;
  tenantLookup: (tenantIdOrSlug: string) => TenantContextRecord | null;
  isStaffMemberOfTenant: (staffId: string, tenantId: string) => boolean;
  platformUser?: User | null;
  platformIdentity?: PlatformIdentity | null;
  tenantMemberships?: TenantMembership[];
  businessRelationships?: BusinessRelationship[];
  isBusinessOwner?: (businessId?: string) => boolean;
}

export type GuardDecisionType = 
  | 'ALLOW'
  | 'REDIRECT_LOGIN'
  | 'SUPER_ADMIN_REQUIRED'
  | 'TENANT_NOT_FOUND'
  | 'TENANT_MEMBERSHIP_REQUIRED'
  | 'TENANT_SUSPENDED'
  | 'TENANT_PENDING'
  | 'TENANT_ARCHIVED'
  | 'CAPABILITY_DISABLED'
  | 'PERMISSION_DENIED';

export interface RouteGuardDecision {
  type: GuardDecisionType;
  allowed: boolean;
  message?: string;
  redirectUrl?: string;
  tenant?: TenantContextRecord;
  requiredCapability?: TenantCapability;
  requiredPermission?: string;
}

export function evaluateCanonicalRouteGuard(
  routeMatch: CanonicalRouteMatch,
  authContext: RouteAuthContext
): RouteGuardDecision {
  const { definition, params, pathname } = routeMatch;
  const { domain, auth, requiredCapability, requiredPermission } = definition;

  if (authContext.platformUser?.status === 'suspended') {
    return {
      type: 'PERMISSION_DENIED',
      allowed: false,
      message: 'Your platform user account has been suspended by an administrator.',
    };
  }

  if (auth === 'NONE') {
    if (domain === 'STOREFRONT' && params.tenantSlug) {
      const tenant = authContext.tenantLookup(params.tenantSlug);
      if (tenant) {
        if (tenant.status === 'suspended') {
          return { type: 'TENANT_SUSPENDED', allowed: false, message: 'This store is currently unavailable due to an active administrative suspension.', tenant };
        }
        if (requiredCapability && !tenant.capabilities.includes(requiredCapability)) {
          return { type: 'CAPABILITY_DISABLED', allowed: false, message: 'The storefront capability is not currently activated for this business.', tenant, requiredCapability };
        }
      }
    }
    return { type: 'ALLOW', allowed: true };
  }

  if (auth === 'CUSTOMER') {
    if (!authContext.activeCustomer && !authContext.platformUser) {
      return { type: 'REDIRECT_LOGIN', allowed: false, message: 'Please sign in to access your customer account.', redirectUrl: `/login?returnUrl=${encodeURIComponent(pathname)}` };
    }
    if (authContext.platformUser && authContext.platformUser.status !== 'active') {
      return { type: 'PERMISSION_DENIED', allowed: false, message: 'Your account status is not active.' };
    }
    return { type: 'ALLOW', allowed: true };
  }

  if (domain === 'SUPER_ADMIN' || auth === 'PLATFORM_ADMIN') {
    const isPlatformAdmin = authContext.platformIdentity?.isSuperAdmin === true || authContext.platformIdentity?.isPlatformAdmin === true;
    if (!authContext.platformUser) {
      return { type: 'REDIRECT_LOGIN', allowed: false, message: 'Super Admin authentication required to access the Platform Control Plane.', redirectUrl: `/login?returnUrl=${encodeURIComponent(pathname)}` };
    }
    if (!isPlatformAdmin) {
      return { type: 'SUPER_ADMIN_REQUIRED', allowed: false, message: 'Access denied: The Super Admin Platform Control Plane is restricted to platform administrators.', redirectUrl: '/login' };
    }
    return { type: 'ALLOW', allowed: true };
  }

  if (auth === 'BUSINESS_OWNER') {
    const isBizOwner = authContext.isBusinessOwner?.(params.businessId) === true || !!authContext.businessRelationships?.some(r =>
      (!params.businessId || r.businessId === params.businessId) && r.relationshipType === 'owner' && r.status === 'active'
    );
    if (!isBizOwner) {
      return { type: 'REDIRECT_LOGIN', allowed: false, message: 'Business Owner authentication is required to access business setup and controls.', redirectUrl: `/login?returnUrl=${encodeURIComponent(pathname)}` };
    }
    return { type: 'ALLOW', allowed: true };
  }

  if (domain === 'TENANT_OPERATIONS' || auth === 'TENANT_STAFF') {
    if (!authContext.platformUser) {
      return { type: 'REDIRECT_LOGIN', allowed: false, message: 'Staff authentication is required to access the tenant operational workspace.', redirectUrl: `/login?returnUrl=${encodeURIComponent(pathname)}` };
    }
    if (authContext.platformUser.status !== 'active' || authContext.activeStaff?.status?.toLowerCase() === 'suspended') {
      return { type: 'PERMISSION_DENIED', allowed: false, message: 'Your account status is not active.' };
    }

    if (!params.tenantId) {
      return { type: 'TENANT_NOT_FOUND', allowed: false, message: 'A canonical tenant ID is required for tenant operational routes.' };
    }
    const targetTenantId = params.tenantId;
    const tenant = authContext.tenantLookup(targetTenantId);
    if (!tenant) {
      return { type: 'TENANT_NOT_FOUND', allowed: false, message: `Tenant "${targetTenantId}" does not exist on the platform.` };
    }

    const isSuperAdmin = authContext.platformIdentity?.isSuperAdmin === true;
    const hasAuthoritativeMembership = !!authContext.tenantMemberships?.some(m =>
      (m.tenantId === tenant.id || m.tenantId === tenant.slug || m.tenantId === `tenant-${tenant.id}`) && m.status === 'active'
    );
    const hasLegacyMembership = authContext.tenantMemberships === undefined && authContext.activeStaff
      ? (authContext.isStaffMemberOfTenant(authContext.activeStaff.id, tenant.id) || authContext.isStaffMemberOfTenant(authContext.activeStaff.id, tenant.slug))
      : false;
    const isMember = isSuperAdmin || hasAuthoritativeMembership || hasLegacyMembership;

    if (!isMember) {
      return { type: 'TENANT_MEMBERSHIP_REQUIRED', allowed: false, message: `You do not have active staff membership in tenant "${tenant.name}".`, tenant };
    }
    if (tenant.status === 'suspended') {
      return { type: 'TENANT_SUSPENDED', allowed: false, message: `Tenant "${tenant.name}" has been suspended. Operational capabilities are paused.`, tenant };
    }
    if (tenant.status === 'pending') {
      return { type: 'TENANT_PENDING', allowed: false, message: `Tenant "${tenant.name}" registration is pending administrative review.`, tenant };
    }
    if (tenant.status === 'archived' && (definition.id.includes('pos') || definition.id.includes('sales'))) {
      return { type: 'TENANT_ARCHIVED', allowed: false, message: `Tenant "${tenant.name}" is archived. Commerce and POS transactions are disabled.`, tenant };
    }
    if (requiredCapability && !tenant.capabilities.includes(requiredCapability)) {
      return { type: 'CAPABILITY_DISABLED', allowed: false, message: `Capability "${requiredCapability}" is not activated for tenant "${tenant.name}".`, tenant, requiredCapability };
    }
    if (requiredPermission && !isSuperAdmin) {
      if (!authContext.activeStaff) {
        return { type: 'PERMISSION_DENIED', allowed: false, message: 'An active staff authorization context is required for this tenant permission.' , requiredPermission, tenant };
      }
      const staffPerms = getEffectivePermissions(authContext.activeStaff);
      if (!staffPerms.includes(requiredPermission as any)) {
        return { type: 'PERMISSION_DENIED', allowed: false, message: `Access denied: Required permission "${requiredPermission}" is missing from your role.`, requiredPermission, tenant };
      }
    }
    return { type: 'ALLOW', allowed: true, tenant };
  }

  return { type: 'ALLOW', allowed: true };
}
