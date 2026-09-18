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

  // Phase 2 Canonical Identity Context additions
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

/**
 * Evaluates route guard against the resolved route and authorization context.
 */
export function evaluateCanonicalRouteGuard(
  routeMatch: CanonicalRouteMatch,
  authContext: RouteAuthContext
): RouteGuardDecision {
  const { definition, params, pathname } = routeMatch;
  const { domain, auth, requiredCapability, requiredPermission } = definition;

  // 0. FAIL CLOSED ON PLATFORM USER SUSPENSION (Invariant B)
  if (authContext.platformUser?.status === 'suspended') {
    return {
      type: 'PERMISSION_DENIED',
      allowed: false,
      message: 'Your platform user account has been suspended by an administrator.',
    };
  }

  // 1. PUBLIC DISCOVERY & STOREFRONT (Open access by default)
  if (auth === 'NONE') {
    // If storefront requires specific capability check
    if (domain === 'STOREFRONT' && params.tenantSlug) {
      const tenant = authContext.tenantLookup(params.tenantSlug);
      if (tenant) {
        if (tenant.status === 'suspended') {
          return {
            type: 'TENANT_SUSPENDED',
            allowed: false,
            message: `This store is currently unavailable due to an active administrative suspension.`,
            tenant,
          };
        }
        if (requiredCapability && !tenant.capabilities.includes(requiredCapability)) {
          return {
            type: 'CAPABILITY_DISABLED',
            allowed: false,
            message: `The storefront capability is not currently activated for this business.`,
            tenant,
            requiredCapability,
          };
        }
      }
    }

    return { type: 'ALLOW', allowed: true };
  }

  // 2. CUSTOMER AUTHENTICATION REQUIRED (/account/*)
  if (auth === 'CUSTOMER') {
    if (!authContext.activeCustomer && !authContext.platformUser) {
      return {
        type: 'REDIRECT_LOGIN',
        allowed: false,
        message: 'Please sign in to access your customer account.',
        redirectUrl: `/login?returnUrl=${encodeURIComponent(pathname)}`,
      };
    }
    return { type: 'ALLOW', allowed: true };
  }

  // 3. SUPER ADMIN PLATFORM REQUIRED (/superadmin/*)
  if (domain === 'SUPER_ADMIN' || auth === 'PLATFORM_ADMIN') {
    const isPlatformAdmin = 
      authContext.platformIdentity?.isSuperAdmin === true ||
      authContext.platformIdentity?.isPlatformAdmin === true;

    if (!authContext.activeStaff && !authContext.platformUser) {
      return {
        type: 'REDIRECT_LOGIN',
        allowed: false,
        message: 'Super Admin authentication required to access the Platform Control Plane.',
        redirectUrl: `/login?returnUrl=${encodeURIComponent(pathname)}`,
      };
    }

    if (!isPlatformAdmin) {
      return {
        type: 'SUPER_ADMIN_REQUIRED',
        allowed: false,
        message: 'Access denied: The Super Admin Platform Control Plane is restricted to platform administrators.',
        redirectUrl: '/tenant/nexus-retail/dashboard',
      };
    }

    return { type: 'ALLOW', allowed: true };
  }

  // 4. BUSINESS OWNER ONBOARDING (/business/:businessId/*)
  if (auth === 'BUSINESS_OWNER') {
    // Hard Rule: A customer or regular staff identity ALONE must NOT satisfy BUSINESS_OWNER authorization!
    // Requires explicit business owner relationship or verified owner staff profile.
    const isBizOwner = 
      authContext.isBusinessOwner?.(params.businessId) ||
      authContext.businessRelationships?.some(r => 
        (!params.businessId || r.businessId === params.businessId) && 
        r.relationshipType === 'owner' && 
        r.status === 'active'
      ) ||
      authContext.activeStaff?.isOwner === true ||
      (authContext.activeStaff as any)?.role === 'Owner';

    if (!isBizOwner) {
      return {
        type: 'REDIRECT_LOGIN',
        allowed: false,
        message: 'Business Owner authentication is required to access business setup and controls.',
        redirectUrl: `/login?returnUrl=${encodeURIComponent(pathname)}`,
      };
    }
    return { type: 'ALLOW', allowed: true };
  }

  // 5. TENANT OPERATIONAL ROUTES (/tenant/:tenantId/*)
  if (domain === 'TENANT_OPERATIONS' || auth === 'TENANT_STAFF') {
    // A. Authenticate user
    if (!authContext.activeStaff && !authContext.platformUser) {
      return {
        type: 'REDIRECT_LOGIN',
        allowed: false,
        message: 'Staff authentication is required to access the tenant operational workspace.',
        redirectUrl: `/login?returnUrl=${encodeURIComponent(pathname)}`,
      };
    }

    // Check platform user / staff status
    if ((authContext.platformUser?.status as string) === 'suspended' || authContext.activeStaff?.status?.toLowerCase() === 'suspended') {
      return {
        type: 'PERMISSION_DENIED',
        allowed: false,
        message: 'Your account has been suspended by an administrator.',
      };
    }

    // B. Resolve tenant from URL
    const targetTenantId = params.tenantId || 'nexus-retail';
    const tenant = authContext.tenantLookup(targetTenantId);

    if (!tenant) {
      return {
        type: 'TENANT_NOT_FOUND',
        allowed: false,
        message: `Tenant "${targetTenantId}" does not exist on the platform.`,
      };
    }

    // C. Verify tenant membership authoritatively
    const isSuperAdmin = authContext.platformIdentity?.isSuperAdmin === true;
    const isMember = 
      isSuperAdmin || // Emergency audit access for Super Admin
      (authContext.tenantMemberships && authContext.tenantMemberships.some(m => 
        (m.tenantId === tenant.id || m.tenantId === tenant.slug || m.tenantId === `tenant-${tenant.id}`) && m.status === 'active'
      )) ||
      (authContext.activeStaff && authContext.isStaffMemberOfTenant(authContext.activeStaff.id, tenant.id)) ||
      (authContext.activeStaff && authContext.isStaffMemberOfTenant(authContext.activeStaff.id, tenant.slug));

    if (!isMember) {
      return {
        type: 'TENANT_MEMBERSHIP_REQUIRED',
        allowed: false,
        message: `You do not have active staff membership in tenant "${tenant.name}".`,
        tenant,
      };
    }

    // D. Verify tenant operational status
    if (tenant.status === 'suspended') {
      return {
        type: 'TENANT_SUSPENDED',
        allowed: false,
        message: `Tenant "${tenant.name}" has been suspended. Operational capabilities are paused.`,
        tenant,
      };
    }

    if (tenant.status === 'pending') {
      return {
        type: 'TENANT_PENDING',
        allowed: false,
        message: `Tenant "${tenant.name}" registration is pending administrative review.`,
        tenant,
      };
    }

    if (tenant.status === 'archived') {
      // Archived allows read-only for settings/reports but restricts mutations
      if (definition.id.includes('pos') || definition.id.includes('sales')) {
        return {
          type: 'TENANT_ARCHIVED',
          allowed: false,
          message: `Tenant "${tenant.name}" is archived. Commerce and POS transactions are disabled.`,
          tenant,
        };
      }
    }

    // E. Verify required capability
    if (requiredCapability && !tenant.capabilities.includes(requiredCapability)) {
      return {
        type: 'CAPABILITY_DISABLED',
        allowed: false,
        message: `Capability "${requiredCapability}" is not activated for tenant "${tenant.name}".`,
        tenant,
        requiredCapability,
      };
    }

    // F. Verify required RBAC permission
    if (requiredPermission && authContext.activeStaff.role !== 'Super Admin') {
      const staffPerms = getEffectivePermissions(authContext.activeStaff);
      const hasPerm = staffPerms.includes(requiredPermission as any);

      if (!hasPerm) {
        return {
          type: 'PERMISSION_DENIED',
          allowed: false,
          message: `Access denied: Required permission "${requiredPermission}" is missing from your role.`,
          requiredPermission,
          tenant,
        };
      }
    }

    // Passed all 6 checks!
    return {
      type: 'ALLOW',
      allowed: true,
      tenant,
    };
  }

  // Default fallback
  return { type: 'ALLOW', allowed: true };
}
