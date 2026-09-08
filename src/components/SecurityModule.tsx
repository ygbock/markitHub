import React from 'react';
import { StaffMember, AuditLog } from '../types';
import UserManagementModule from './UserManagementModule';

interface SecurityModuleProps {
  staffMembers: StaffMember[];
  auditLogs: AuditLog[];
  activeStaff: StaffMember;
  onSwitchStaff: (staffId: string) => void;
  onAddStaff?: (staff: StaffMember) => void;
  onUpdateStaff?: (staff: StaffMember) => void;
  onDeleteStaff?: (staffId: string) => void;
}

export default function SecurityModule(props: SecurityModuleProps) {
  return <UserManagementModule {...props} />;
}
