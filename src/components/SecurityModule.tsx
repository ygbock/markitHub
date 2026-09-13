import React from 'react';
import { StaffMember, AuditLog, StaffStatus } from '../types';
import UserManagementModule from './UserManagementModule';

interface SecurityModuleProps {
  staffMembers: StaffMember[];
  auditLogs: AuditLog[];
  activeStaff: StaffMember;
  onSwitchStaff: (staffId: string) => void;
  onAddStaff?: (staff: StaffMember) => void;
  onUpdateStaff?: (staff: StaffMember) => void;
  onDeleteStaff?: (staffId: string) => void;
  onUpdateStaffStatus?: (staffId: string, status: StaffStatus, reason?: string) => Promise<{ success: boolean; error?: string; audit?: AuditLog }>;
  tenantOwnerUid?: string;
  tenantOwnerId?: string;
}

export default function SecurityModule(props: SecurityModuleProps) {
  return <UserManagementModule {...props} />;
}
