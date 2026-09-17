import React from 'react';
import { PermissionKey, StaffRole, StaffMember } from '../utils/permissions';
import { canRenderModule, CanRenderModuleParams } from './guards';
import { PermissionDeniedState } from '../components/shared/StateFeedback';
import { SuspendedState } from '../components/ui/SuspendedState';

export interface CanProps {
  permission?: PermissionKey | PermissionKey[];
  requireAllPermissions?: boolean;
  capability?: string | string[];
  requireAllCapabilities?: boolean;
  role?: StaffRole | StaffRole[];
  staff?: StaffMember | null;
  tenantCapabilities?: string[];
  tenantStatus?: 'active' | 'suspended' | 'trial' | 'closed' | string;
  userStatus?: 'active' | 'suspended' | string;
  fallback?: React.ReactNode;
  showExplicitFeedback?: boolean;
  children: React.ReactNode;
}

/**
 * Compound authorization gate evaluating permissions, capabilities, roles, and suspension states.
 */
export const Can: React.FC<CanProps> = ({
  permission,
  requireAllPermissions,
  capability,
  requireAllCapabilities,
  role,
  staff,
  tenantCapabilities,
  tenantStatus = 'active',
  userStatus = 'active',
  fallback,
  showExplicitFeedback = false,
  children,
}) => {
  const result = canRenderModule({
    staff,
    permission,
    requireAllPermissions,
    capability,
    requireAllCapabilities,
    tenantCapabilities,
    tenantStatus,
    userStatus,
  });

  if (result.allowed) {
    // Also check role if specified
    if (role && staff) {
      const allowedRoles = Array.isArray(role) ? role : [role];
      if (staff.role !== 'Super Admin' && !allowedRoles.includes(staff.role as StaffRole)) {
        if (fallback !== undefined) return <>{fallback}</>;
        if (showExplicitFeedback) {
          return <PermissionDeniedState title="Role Required" description={`Requires ${allowedRoles.join(' or ')}`} />;
        }
        return null;
      }
    }
    return <>{children}</>;
  }

  if (fallback !== undefined) {
    return <>{fallback}</>;
  }

  if (showExplicitFeedback) {
    if (result.reason === 'tenant_suspended' || result.reason === 'user_suspended') {
      return (
        <SuspendedState
          entityType={result.reason === 'tenant_suspended' ? 'tenant' : 'account'}
          reason="Access has been locked due to suspension status."
        />
      );
    }
    if (result.reason === 'capability_disabled') {
      return (
        <PermissionDeniedState
          title="Feature Unavailable"
          description="This capability is not enabled for your tenant plan."
        />
      );
    }
    return (
      <PermissionDeniedState
        requiredPermission={Array.isArray(permission) ? permission.join(', ') : permission}
      />
    );
  }

  return null;
};

export default Can;
