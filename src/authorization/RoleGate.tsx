import React from 'react';
import { StaffRole, StaffMember, isStaffSuspended } from '../utils/permissions';

/**
 * ARCHITECTURAL INVARIANT: UI AUTHORIZATION != SERVER AUTHORIZATION
 *
 * Presentation-level UI gating only. Conditionally hides, shows, or disables UI.
 * Authoritative security enforcement resides on the server / Firebase Security Rules.
 */
export interface RoleGateProps {
  role: StaffRole | StaffRole[];
  staff?: StaffMember | null;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const RoleGate: React.FC<RoleGateProps> = ({
  role,
  staff,
  fallback = null,
  children,
}) => {
  if (!staff || isStaffSuspended(staff)) {
    return <>{fallback}</>;
  }

  const allowedRoles = Array.isArray(role) ? role : [role];

  // Super Admin can bypass role restrictions
  if (staff.role === 'Super Admin') {
    return <>{children}</>;
  }

  const matches = allowedRoles.includes(staff.role as StaffRole);
  if (!matches) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default RoleGate;
