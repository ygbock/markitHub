import React from 'react';
import { PermissionKey, StaffMember, hasPermission } from '../utils/permissions';
import { PermissionDeniedState } from '../components/shared/StateFeedback';

export interface PermissionGateProps {
  permission: PermissionKey | PermissionKey[];
  staff?: StaffMember | null;
  requireAll?: boolean;
  fallback?: React.ReactNode;
  showDefaultDeniedState?: boolean;
  children: React.ReactNode;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  permission,
  staff,
  requireAll = false,
  fallback,
  showDefaultDeniedState = false,
  children,
}) => {
  const allowed = staff ? hasPermission(staff, permission, requireAll) : false;

  if (allowed) {
    return <>{children}</>;
  }

  if (fallback !== undefined) {
    return <>{fallback}</>;
  }

  if (showDefaultDeniedState) {
    const permString = Array.isArray(permission) ? permission.join(', ') : permission;
    return <PermissionDeniedState requiredPermission={permString} />;
  }

  return null;
};

export default PermissionGate;
