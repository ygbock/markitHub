import React, { useState } from 'react';
import { 
  StaffMember, AuditLog, StaffRole, PermissionKey, StaffStatus 
} from '../types';
import { 
  Lock, Key, Shield, Eye, EyeOff, ShieldAlert, CheckCircle2, 
  Activity, Users, Search, Filter, RotateCcw, HelpCircle,
  Plus, Edit, Trash2, Phone, Mail, Building, Check, X,
  AlertTriangle, RefreshCw, Smartphone, Package, Truck,
  Receipt, ShoppingBag, Settings, Sparkles, ChevronRight,
  ShieldCheck, UserCheck, UserX, Clock, Crown, LayoutGrid,
  Table as TableIcon
} from 'lucide-react';
import { 
  OFFICIAL_ROLES, ALL_PERMISSIONS, PERMISSION_CATEGORIES, 
  DEFAULT_ROLE_PERMISSIONS, getRoleConfig, getEffectivePermissions, 
  hasPermission, isStaffSuspended, isTenantOwner, getNormalizedStatus 
} from '../utils/permissions';
import StaffFormModal from './StaffFormModal';
import StaffDetailsDrawer from './StaffDetailsDrawer';
import StaffStatusConfirmModal from './StaffStatusConfirmModal';

export interface UserManagementModuleProps {
  staffMembers: StaffMember[];
  auditLogs: AuditLog[];
  activeStaff: StaffMember;
  onSwitchStaff: (staffId: string) => void;
  onAddStaff?: (staff: StaffMember) => void;
  onUpdateStaff?: (staff: StaffMember) => void;
  onDeleteStaff?: (staffId: string) => void;
  onUpdateStaffStatus?: (staffId: string, status: StaffStatus) => Promise<{ success: boolean; error?: string }>;
  tenantOwnerUid?: string;
  tenantOwnerId?: string;
}

export type UserModuleSubTab = 'roster' | 'matrix' | 'roles' | 'terminal' | 'audit';

export default function UserManagementModule({
  staffMembers,
  auditLogs,
  activeStaff,
  onSwitchStaff,
  onAddStaff,
  onUpdateStaff,
  onDeleteStaff,
  onUpdateStaffStatus,
  tenantOwnerUid,
  tenantOwnerId
}: UserManagementModuleProps) {
  // Navigation tabs inside User Management
  const [activeTab, setActiveTab] = useState<UserModuleSubTab>('roster');

  // Directory View Mode: 'table' or 'grid'
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Staff Form Modal State
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);

  // Staff Details Drawer State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedStaffForDrawer, setSelectedStaffForDrawer] = useState<StaffMember | null>(null);

  // Staff Status Confirmation Modal State
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [statusTargetStaff, setStatusTargetStaff] = useState<StaffMember | null>(null);
  const [statusAction, setStatusAction] = useState<'suspend' | 'reactivate'>('suspend');
  const [isStatusChanging, setIsStatusChanging] = useState(false);

  // Roster Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');

  // Permission Checks
  const canViewUsers = hasPermission(activeStaff, 'users.view');
  const canManageUsers = hasPermission(activeStaff, 'users.manage');
  const canManageRoles = hasPermission(activeStaff, 'users.roles');
  const canAuditUsers = hasPermission(activeStaff, 'users.audit');
  const canUnlockUsers = hasPermission(activeStaff, 'users.unlock');

  // Matrix Filters
  const [matrixCategoryFilter, setMatrixCategoryFilter] = useState<string>('all');
  const [matrixSearch, setMatrixSearch] = useState('');

  // Terminal Pin state
  const [pinInput, setPinInput] = useState('');
  const [selectedStaffToLogin, setSelectedStaffToLogin] = useState<StaffMember | null>(null);
  const [terminalUnlocked, setTerminalUnlocked] = useState(true);

  // Audit filters
  const [operatorFilter, setOperatorFilter] = useState('All');
  const [moduleFilter, setModuleFilter] = useState('All');
  const [auditSearchTerm, setAuditSearchTerm] = useState('');

  // Effective Owner UID / ID determination
  const effectiveOwnerUid = tenantOwnerUid || tenantOwnerId;

  // Filtered staff members based on search, role, and authoritative status
  const filteredStaff = staffMembers.filter((s) => {
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch = !term || 
      s.name.toLowerCase().includes(term) ||
      s.email.toLowerCase().includes(term) ||
      (s.department && s.department.toLowerCase().includes(term)) ||
      (s.phone && s.phone.includes(term)) ||
      s.role.toLowerCase().includes(term);

    const matchesRole = roleFilter === 'All' || s.role === roleFilter;

    const isSuspended = isStaffSuspended(s);
    let matchesStatus = true;
    if (statusFilter === 'active') matchesStatus = !isSuspended;
    if (statusFilter === 'suspended') matchesStatus = isSuspended;

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Metrics
  const activeStaffCount = staffMembers.filter(s => !isStaffSuspended(s)).length;
  const suspendedStaffCount = staffMembers.filter(s => isStaffSuspended(s)).length;
  const customOverrideCount = staffMembers.filter(s => s.permissionsOverride && s.permissionsOverride.length > 0).length;

  // Drawer Opener
  const handleOpenDrawer = (staff: StaffMember) => {
    setSelectedStaffForDrawer(staff);
    setIsDrawerOpen(true);
  };

  // Status Change Initiator (opens confirmation dialog)
  const handleRequestStatusChange = (staff: StaffMember, action: 'suspend' | 'reactivate') => {
    if (!canManageUsers) return;

    if (action === 'suspend') {
      if (isTenantOwner(staff, effectiveOwnerUid)) {
        alert('Tenant Owner account is protected and cannot be suspended.');
        return;
      }
      if (staff.id === activeStaff.id) {
        alert('You cannot suspend your own staff session.');
        return;
      }
    }

    setStatusTargetStaff(staff);
    setStatusAction(action);
    setIsStatusModalOpen(true);
  };

  // Status Confirmation Submission (calls authoritative API)
  const handleConfirmStatusChange = async (reason?: string) => {
    if (!statusTargetStaff) return;
    const target = statusTargetStaff;
    const nextStatus: StaffStatus = statusAction === 'suspend' ? 'suspended' : 'active';

    setIsStatusChanging(true);
    try {
      if (onUpdateStaffStatus) {
        const res = await onUpdateStaffStatus(target.id, nextStatus);
        if (res && !res.success) {
          throw new Error(res.error || `Unable to set staff account status to ${nextStatus}.`);
        }
      } else {
        // Authoritative fallback via backend API
        const res = await fetch(`/api/tenant/staff/${encodeURIComponent(target.id)}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: nextStatus, reason })
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.success) {
          throw new Error(json.error || `Unable to set status to ${nextStatus}.`);
        }
        if (onUpdateStaff) {
          onUpdateStaff({ ...target, status: nextStatus });
        }
      }

      // Update selected drawer staff if currently viewed
      if (selectedStaffForDrawer && selectedStaffForDrawer.id === target.id) {
        setSelectedStaffForDrawer({ ...selectedStaffForDrawer, status: nextStatus });
      }

      setIsStatusModalOpen(false);
      setStatusTargetStaff(null);
    } catch (err: any) {
      alert(err?.message || `Unable to update account status.`);
    } finally {
      setIsStatusChanging(false);
    }
  };

  // Modal handlers
  const handleOpenAddStaff = () => {
    if (!canManageUsers) return;
    setEditingStaff(null);
    setIsStaffModalOpen(true);
  };

  const handleOpenEditStaff = (staff: StaffMember) => {
    if (!canManageUsers) return;
    setEditingStaff(staff);
    setIsStaffModalOpen(true);
  };

  const handleSaveStaff = (staff: StaffMember) => {
    if (editingStaff && onUpdateStaff) {
      onUpdateStaff(staff);
    } else if (onAddStaff) {
      onAddStaff(staff);
    }
    setIsStaffModalOpen(false);
    setEditingStaff(null);
    if (selectedStaffForDrawer && selectedStaffForDrawer.id === staff.id) {
      setSelectedStaffForDrawer(staff);
    }
  };

  const handleDeleteStaffClick = (staff: StaffMember) => {
    if (!canManageUsers) return;

    if (isTenantOwner(staff, effectiveOwnerUid)) {
      alert('Tenant Owner account is protected and cannot be deleted.');
      return;
    }

    if (staff.id === activeStaff.id) {
      alert('You cannot delete your own logged in operator session.');
      return;
    }

    if (confirm(`Are you sure you want to permanently decommission staff account "${staff.name}" (${staff.role})?`)) {
      if (onDeleteStaff) {
        onDeleteStaff(staff.id);
      }
      if (selectedStaffForDrawer && selectedStaffForDrawer.id === staff.id) {
        setIsDrawerOpen(false);
        setSelectedStaffForDrawer(null);
      }
    }
  };

  // Terminal Pin authentication
  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffToLogin) return;

    if (isStaffSuspended(selectedStaffToLogin)) {
      alert('ACCESS DENIED: Suspended staff accounts cannot log in to POS terminals.');
      setPinInput('');
      return;
    }

    if (selectedStaffToLogin.pin === pinInput) {
      onSwitchStaff(selectedStaffToLogin.id);
      setTerminalUnlocked(true);
      setPinInput('');
      setSelectedStaffToLogin(null);
    } else {
      alert('SECURITY ALERT: Invalid terminal authentication PIN. Please retry.');
      setPinInput('');
    }
  };

  // Filtered Matrix permissions
  const filteredMatrixPermissions = ALL_PERMISSIONS.filter(p => {
    const matchesCategory = matrixCategoryFilter === 'all' || p.category === matrixCategoryFilter;
    const matchesSearch = matrixSearch === '' || 
      p.label.toLowerCase().includes(matrixSearch.toLowerCase()) || 
      p.key.toLowerCase().includes(matrixSearch.toLowerCase()) ||
      p.description.toLowerCase().includes(matrixSearch.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Filtered Audit logs
  const filteredAuditLogs = auditLogs.filter(log => {
    const matchesOperator = operatorFilter === 'All' || log.staffName === operatorFilter;
    const matchesModule = moduleFilter === 'All' || log.module === moduleFilter;
    const matchesSearch = !auditSearchTerm || 
      log.details.toLowerCase().includes(auditSearchTerm.toLowerCase()) || 
      log.action.toLowerCase().includes(auditSearchTerm.toLowerCase());
    return matchesOperator && matchesModule && matchesSearch;
  });

  const operators = ['All', ...Array.from(new Set(auditLogs.map(l => l.staffName)))];
  const modules = ['All', 'Inventory', 'POS', 'CRM', 'User Management', 'Billing'];

  return (
    <div className="space-y-6" id="user-management-root">
      
      {/* Top Header & Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4" id="user-mgmt-header">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-600 text-white rounded-2xl shadow-md shadow-indigo-600/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Staff & Governance Management
                </h1>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-md text-[10px] font-black uppercase tracking-wider">
                  Authoritative Security
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500">
                Tenant isolation, authoritative active/suspended status, 10 official functional roles, and operator terminal switching.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          {canManageUsers && (
            <button
              onClick={handleOpenAddStaff}
              className="w-full md:w-auto px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold rounded-2xl shadow-md shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all"
              id="btn-add-staff-top"
            >
              <Plus className="w-4 h-4" /> Add Staff Member
            </button>
          )}
        </div>
      </div>

      {/* KPI Metric Summary Banners */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5" id="user-mgmt-kpis">
        <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Staff</span>
            <Users className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-black text-slate-900">{staffMembers.length}</p>
          <div className="flex items-center gap-2 text-[10px] font-semibold">
            <span className="text-emerald-600 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {activeStaffCount} active
            </span>
            {suspendedStaffCount > 0 && (
              <span className="text-rose-600 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> {suspendedStaffCount} suspended
              </span>
            )}
          </div>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Security State</span>
            <Shield className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-2xl font-black text-slate-900">{suspendedStaffCount} Suspended</p>
          <p className="text-[10px] text-slate-500 font-semibold">Server-enforced terminal isolation</p>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Granular Perms</span>
            <Key className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-slate-900">{ALL_PERMISSIONS.length}</p>
          <p className="text-[10px] text-amber-600 font-semibold">Across 8 system domains</p>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Custom Overrides</span>
            <Sparkles className="w-4 h-4 text-teal-500" />
          </div>
          <p className="text-2xl font-black text-slate-900">{customOverrideCount}</p>
          <p className="text-[10px] text-teal-600 font-semibold">Fine-tuned individual accounts</p>
        </div>
      </div>

      {/* Sub-Tabs Navigation Bar */}
      <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-1 overflow-x-auto no-scrollbar" id="user-mgmt-subtabs">
        <button
          onClick={() => setActiveTab('roster')}
          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-2 transition-all ${
            activeTab === 'roster'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
          id="tab-btn-roster"
        >
          <Users className="w-4 h-4" /> Staff Directory ({staffMembers.length})
        </button>

        {canManageRoles && (
          <button
            onClick={() => setActiveTab('matrix')}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-2 transition-all ${
              activeTab === 'matrix'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
            id="tab-btn-matrix"
          >
            <Shield className="w-4 h-4" /> Granular Permissions Matrix
          </button>
        )}

        {canManageRoles && (
          <button
            onClick={() => setActiveTab('roles')}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-2 transition-all ${
              activeTab === 'roles'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
            id="tab-btn-roles"
          >
            <Key className="w-4 h-4" /> 10 Role Definitions & Presets
          </button>
        )}

        {canUnlockUsers && (
          <button
            onClick={() => setActiveTab('terminal')}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-2 transition-all ${
              activeTab === 'terminal'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
            id="tab-btn-terminal"
          >
            <Lock className="w-4 h-4" /> Terminal Operator Switcher
          </button>
        )}

        {canAuditUsers && (
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-2 transition-all ${
              activeTab === 'audit'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
            id="tab-btn-audit"
          >
            <Activity className="w-4 h-4" /> Security Audit Ledger
          </button>
        )}
      </div>

      {/* TAB 1: STAFF DIRECTORY & ROSTER */}
      {activeTab === 'roster' && (
        <div className="space-y-4" id="view-staff-roster">
          
          {/* Search, Filters, and View Toggle Bar */}
          <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between" id="roster-filters-bar">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search staff by name, email, department..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-medium"
                id="search-staff-input"
              />
            </div>

            <div className="flex items-center gap-2.5 w-full md:w-auto justify-between md:justify-end flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 shrink-0">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Role:</span>
                </div>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  id="filter-staff-role"
                >
                  <option value="All">All Roles (10)</option>
                  {OFFICIAL_ROLES.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>

                <div className="flex items-center gap-1.5 shrink-0 ml-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Status:</span>
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'suspended')}
                  className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                  id="filter-staff-status"
                >
                  <option value="all">All Statuses ({staffMembers.length})</option>
                  <option value="active">Active ({activeStaffCount})</option>
                  <option value="suspended">Suspended ({suspendedStaffCount})</option>
                </select>
              </div>

              {/* Table / Grid Mode Toggle */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200" id="view-mode-toggle">
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-lg transition-all ${
                    viewMode === 'table'
                      ? 'bg-white text-indigo-600 shadow-xs font-bold'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                  title="Dense Table View"
                  id="btn-view-table"
                >
                  <TableIcon className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg transition-all ${
                    viewMode === 'grid'
                      ? 'bg-white text-indigo-600 shadow-xs font-bold'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                  title="Card Grid View"
                  id="btn-view-grid"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* DENSE TABLE VIEW */}
          {viewMode === 'table' && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden" id="staff-roster-table-container">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs" id="staff-roster-table">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                      <th className="py-3.5 px-4">Staff Member</th>
                      <th className="py-3.5 px-3">Role</th>
                      <th className="py-3.5 px-3">Security Status</th>
                      <th className="py-3.5 px-3">Department</th>
                      <th className="py-3.5 px-3">Granted Rights</th>
                      <th className="py-3.5 px-3">Terminal PIN</th>
                      <th className="py-3.5 px-3 text-right">Quick Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredStaff.map((staff) => {
                      const roleConfig = getRoleConfig(staff.role);
                      const effectivePerms = getEffectivePermissions(staff);
                      const isCurrent = activeStaff.id === staff.id;
                      const isSuspended = isStaffSuspended(staff);
                      const isOwner = isTenantOwner(staff, effectiveOwnerUid);

                      return (
                        <tr 
                          key={staff.id} 
                          className={`hover:bg-indigo-50/20 transition-colors ${
                            isSuspended ? 'bg-slate-50/50 opacity-90' : ''
                          }`}
                          id={`staff-row-${staff.id}`}
                        >
                          {/* Staff Member Info */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="relative shrink-0">
                                <img
                                  src={staff.avatar}
                                  alt={staff.name}
                                  className={`w-9 h-9 rounded-xl object-cover ring-2 ${
                                    isSuspended ? 'ring-rose-200 opacity-75' : 'ring-slate-100'
                                  }`}
                                />
                                {isOwner && (
                                  <span
                                    title="Tenant Owner (Protected)"
                                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-xs"
                                  >
                                    <Crown className="w-2.5 h-2.5" />
                                  </span>
                                )}
                              </div>

                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <button
                                    onClick={() => handleOpenDrawer(staff)}
                                    className="font-bold text-slate-900 hover:text-indigo-600 transition-colors truncate text-left"
                                  >
                                    {staff.name}
                                  </button>
                                  {isCurrent && (
                                    <span className="px-1.5 py-0.2 bg-indigo-600 text-white rounded-md text-[9px] font-extrabold uppercase">
                                      Active Operator
                                    </span>
                                  )}
                                  {isOwner && (
                                    <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 border border-amber-200 rounded-md text-[9px] font-bold">
                                      Owner
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-400 truncate">
                                  {staff.email}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Role */}
                          <td className="py-3 px-3">
                            <span className={`px-2.5 py-0.5 rounded-xl text-[11px] font-bold border inline-block ${roleConfig.badgeBg} ${roleConfig.badgeBorder} ${roleConfig.badgeText}`}>
                              {staff.role}
                            </span>
                          </td>

                          {/* Authoritative Security Status */}
                          <td className="py-3 px-3">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border inline-flex items-center gap-1 ${
                                !isSuspended
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-rose-50 text-rose-700 border-rose-200'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  !isSuspended ? 'bg-emerald-500' : 'bg-rose-500'
                                }`}
                              />
                              {isSuspended ? 'Suspended' : 'Active'}
                            </span>
                          </td>

                          {/* Department */}
                          <td className="py-3 px-3 text-slate-600 text-[11px] font-medium">
                            {staff.department || 'Retail Operations'}
                          </td>

                          {/* Granted Rights */}
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1">
                              <span className="font-bold text-slate-800">
                                {effectivePerms.length} rights
                              </span>
                              {staff.permissionsOverride && staff.permissionsOverride.length > 0 && (
                                <span className="px-1.5 py-0.2 bg-amber-100 text-amber-700 rounded text-[9px] font-bold" title="Custom override applied">
                                  Override
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Terminal PIN status */}
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-lg font-mono text-[10px] font-semibold">
                              Protected PIN
                            </span>
                          </td>

                          {/* Quick Actions */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {/* View Details Drawer */}
                              <button
                                onClick={() => handleOpenDrawer(staff)}
                                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                title="Inspect Staff Profile & Effective Permissions"
                                id={`btn-view-details-${staff.id}`}
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              {/* Switch Terminal Operator */}
                              <button
                                onClick={() => onSwitchStaff(staff.id)}
                                disabled={isCurrent || isSuspended}
                                className={`p-1.5 rounded-xl transition-all ${
                                  isCurrent
                                    ? 'text-indigo-600 bg-indigo-50 cursor-default'
                                    : isSuspended
                                    ? 'text-slate-300 cursor-not-allowed'
                                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                                }`}
                                title={
                                  isCurrent
                                    ? 'Current Operator Session'
                                    : isSuspended
                                    ? 'Cannot switch to suspended account'
                                    : 'Switch Terminal to this Staff'
                                }
                                id={`btn-switch-operator-${staff.id}`}
                              >
                                <UserCheck className="w-4 h-4" />
                              </button>

                              {/* Authoritative Status Toggle (Suspend / Reactivate) */}
                              {canManageUsers && (
                                <button
                                  onClick={() =>
                                    handleRequestStatusChange(
                                      staff,
                                      isSuspended ? 'reactivate' : 'suspend'
                                    )
                                  }
                                  disabled={isOwner || isCurrent}
                                  className={`p-1.5 rounded-xl transition-all ${
                                    isOwner || isCurrent
                                      ? 'text-slate-300 cursor-not-allowed'
                                      : isSuspended
                                      ? 'text-emerald-600 hover:bg-emerald-50'
                                      : 'text-rose-500 hover:bg-rose-50 hover:text-rose-700'
                                  }`}
                                  title={
                                    isOwner
                                      ? 'Tenant Owner is protected from suspension'
                                      : isCurrent
                                      ? 'You cannot suspend your own account'
                                      : isSuspended
                                      ? 'Reactivate Account'
                                      : 'Suspend Account'
                                  }
                                  id={`btn-toggle-status-${staff.id}`}
                                >
                                  {isSuspended ? (
                                    <ShieldCheck className="w-4 h-4" />
                                  ) : (
                                    <ShieldAlert className="w-4 h-4" />
                                  )}
                                </button>
                              )}

                              {/* Edit Profile & Rights */}
                              {canManageUsers && (
                                <button
                                  onClick={() => handleOpenEditStaff(staff)}
                                  className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
                                  title="Edit Profile & Rights"
                                  id={`btn-edit-staff-${staff.id}`}
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                              )}

                              {/* Delete Staff */}
                              {canManageUsers && (
                                <button
                                  onClick={() => handleDeleteStaffClick(staff)}
                                  disabled={isOwner || isCurrent}
                                  className={`p-1.5 rounded-xl transition-all ${
                                    isOwner || isCurrent
                                      ? 'text-slate-300 cursor-not-allowed'
                                      : 'text-rose-400 hover:text-rose-600 hover:bg-rose-50'
                                  }`}
                                  title={
                                    isOwner
                                      ? 'Tenant Owner cannot be deleted'
                                      : isCurrent
                                      ? 'You cannot delete your own account'
                                      : 'Decommission Staff Member'
                                  }
                                  id={`btn-delete-staff-${staff.id}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* CARD GRID VIEW */}
          {viewMode === 'grid' && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" id="staff-roster-cards-grid">
              {filteredStaff.map((staff) => {
                const roleConfig = getRoleConfig(staff.role);
                const effectivePerms = getEffectivePermissions(staff);
                const isCurrent = activeStaff.id === staff.id;
                const isSuspended = isStaffSuspended(staff);
                const isOwner = isTenantOwner(staff, effectiveOwnerUid);

                return (
                  <div
                    key={staff.id}
                    className={`bg-white rounded-3xl border transition-all hover:shadow-md flex flex-col justify-between p-5 space-y-4 relative ${
                      isCurrent 
                        ? 'border-indigo-600 ring-2 ring-indigo-500/20 shadow-xs' 
                        : isSuspended
                        ? 'border-rose-200 bg-rose-50/10'
                        : 'border-slate-150 hover:border-slate-300'
                    }`}
                    id={`staff-card-${staff.id}`}
                  >
                    {/* Card Top: Avatar, Badges, Name */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <img
                            src={staff.avatar}
                            alt={staff.name}
                            className={`w-12 h-12 rounded-2xl object-cover ring-2 ${
                              isSuspended ? 'ring-rose-200 opacity-80' : 'ring-slate-100'
                            }`}
                          />
                          {isOwner && (
                            <span
                              title="Tenant Owner (Protected)"
                              className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-xs"
                            >
                              <Crown className="w-3 h-3" />
                            </span>
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                              onClick={() => handleOpenDrawer(staff)}
                              className="font-bold text-sm text-slate-900 hover:text-indigo-600 transition-colors text-left"
                            >
                              {staff.name}
                            </button>
                            {isOwner && (
                              <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 border border-amber-200 rounded-md text-[9px] font-bold">
                                Owner
                              </span>
                            )}
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border inline-block mt-0.5 ${roleConfig.badgeBg} ${roleConfig.badgeBorder} ${roleConfig.badgeText}`}
                          >
                            {staff.role}
                          </span>
                        </div>
                      </div>

                      {/* Status badge */}
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${
                          !isSuspended
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            !isSuspended ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}
                        />
                        {isSuspended ? 'Suspended' : 'Active'}
                      </span>
                    </div>

                    {/* Contact details */}
                    <div className="space-y-1.5 text-xs text-slate-500 border-y border-slate-100 py-3">
                      <div className="flex items-center gap-2 truncate">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{staff.email}</span>
                      </div>
                      {staff.phone && (
                        <div className="flex items-center gap-2 truncate">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{staff.phone}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 truncate">
                        <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{staff.department || 'Retail Operations'}</span>
                      </div>
                    </div>

                    {/* Permissions summary */}
                    <div className="flex items-center justify-between text-xs pt-1">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Granted Rights
                        </span>
                        <span className="font-bold text-slate-800 text-xs">
                          {effectivePerms.length} Capabilities
                        </span>
                      </div>

                      {staff.permissionsOverride && staff.permissionsOverride.length > 0 ? (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-200 rounded-md text-[10px] font-bold">
                          Custom Overrides
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-medium">
                          Role Default
                        </span>
                      )}
                    </div>

                    {/* Card Actions Footer */}
                    <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100">
                      <button
                        onClick={() => handleOpenDrawer(staff)}
                        className="px-3 py-1.5 text-xs font-bold text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" /> Details
                      </button>

                      <div className="flex items-center gap-1">
                        {canManageUsers && (
                          <button
                            onClick={() =>
                              handleRequestStatusChange(
                                staff,
                                isSuspended ? 'reactivate' : 'suspend'
                              )
                            }
                            disabled={isOwner || isCurrent}
                            className={`p-1.5 rounded-xl transition-all ${
                              isOwner || isCurrent
                                ? 'text-slate-300 cursor-not-allowed'
                                : isSuspended
                                ? 'text-emerald-600 hover:bg-emerald-50'
                                : 'text-rose-500 hover:bg-rose-50'
                            }`}
                            title={
                              isOwner
                                ? 'Tenant Owner cannot be suspended'
                                : isCurrent
                                ? 'You cannot suspend your own account'
                                : isSuspended
                                ? 'Reactivate Account'
                                : 'Suspend Account'
                            }
                          >
                            {isSuspended ? (
                              <ShieldCheck className="w-4 h-4" />
                            ) : (
                              <ShieldAlert className="w-4 h-4" />
                            )}
                          </button>
                        )}

                        <button
                          onClick={() => onSwitchStaff(staff.id)}
                          disabled={isCurrent || isSuspended}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                            isCurrent
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : isSuspended
                              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          {isCurrent ? 'Current' : 'Switch'}
                        </button>

                        {canManageUsers && (
                          <button
                            onClick={() => handleOpenEditStaff(staff)}
                            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
                            title="Edit Staff Member & Permissions"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {canManageUsers && (
                          <button
                            onClick={() => handleDeleteStaffClick(staff)}
                            disabled={isOwner || isCurrent}
                            className={`p-1.5 rounded-xl transition-all ${
                              isOwner || isCurrent
                                ? 'text-slate-300 cursor-not-allowed'
                                : 'text-rose-400 hover:text-rose-600 hover:bg-rose-50'
                            }`}
                            title="Delete Staff Member"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {filteredStaff.length === 0 && (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 space-y-3">
              <Users className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-700">No staff members found</h3>
              <p className="text-xs text-slate-400">Try modifying your search query or role filter.</p>
            </div>
          )}

        </div>
      )}

      {/* TAB 2: GRANULAR PERMISSIONS MATRIX */}
      {activeTab === 'matrix' && (
        <div className="space-y-4" id="view-permissions-matrix">
          
          {/* Header Description & Search Bar */}
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-indigo-600" />
                  Granular Permissions by Role Matrix
                </h2>
                <p className="text-xs text-slate-500">
                  Authoritative security matrix: Employees only receive rights assigned by their role or custom overrides.
                </p>
              </div>

              {/* Search input for matrix */}
              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter permissions (e.g. refund, transfer)..."
                  value={matrixSearch}
                  onChange={(e) => setMatrixSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
              <button
                onClick={() => setMatrixCategoryFilter('all')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                  matrixCategoryFilter === 'all'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                All Categories ({ALL_PERMISSIONS.length})
              </button>
              {PERMISSION_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setMatrixCategoryFilter(cat.id)}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
                    matrixCategoryFilter === cat.id
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Matrix Table with sticky headers and horizontally scrolling roles */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden" id="matrix-table-container">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white text-[11px] font-extrabold uppercase tracking-wider border-b border-slate-800">
                    <th className="px-5 py-3.5 sticky left-0 bg-slate-900 z-10 min-w-[260px] shadow-sm">
                      Granular Permission
                    </th>
                    {OFFICIAL_ROLES.map(role => (
                      <th key={role} className="px-3 py-3.5 text-center min-w-[120px] font-bold text-[10px]">
                        <span className="block truncate">{role}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredMatrixPermissions.map((perm) => (
                    <tr key={perm.key} className="hover:bg-indigo-50/30 transition-colors">
                      {/* Permission column */}
                      <td className="px-5 py-3 sticky left-0 bg-white hover:bg-indigo-50/30 z-10 shadow-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{perm.label}</span>
                          {perm.isDestructive && (
                            <span className="px-1.5 py-0.5 bg-rose-100 text-rose-700 rounded-md text-[9px] font-black">
                              High Risk
                            </span>
                          )}
                        </div>
                        <span className="font-mono text-[10px] text-indigo-600 block">{perm.key}</span>
                        <p className="text-[10px] text-slate-500 leading-tight mt-0.5">{perm.description}</p>
                      </td>

                      {/* Role Checkmarks across all 10 Roles */}
                      {OFFICIAL_ROLES.map(role => {
                        const defaultPerms = DEFAULT_ROLE_PERMISSIONS[role] || [];
                        const isSuperAdmin = role === 'Super Admin';
                        const isGranted = isSuperAdmin || defaultPerms.includes(perm.key);

                        return (
                          <td key={role} className="px-3 py-3 text-center">
                            {isGranted ? (
                              <div className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/80 shadow-2xs font-black">
                                <Check className="w-4 h-4" />
                              </div>
                            ) : (
                              <div className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-slate-50 text-slate-300 font-bold">
                                <X className="w-3.5 h-3.5" />
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: 10 ROLE DEFINITIONS & PRESETS */}
      {activeTab === 'roles' && (
        <div className="space-y-4" id="view-roles-definitions">
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs space-y-1">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Key className="w-4 h-4 text-indigo-600" />
              10 Official Role Architectures
            </h2>
            <p className="text-xs text-slate-500">
              Each staff member is bound to an official role profile. Role assignments and custom overrides require the <code className="font-bold text-indigo-600">users.roles</code> privilege.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {OFFICIAL_ROLES.map(role => {
              const conf = getRoleConfig(role);
              const perms = DEFAULT_ROLE_PERMISSIONS[role] || [];
              const staffWithThisRole = staffMembers.filter(s => s.role === role);

              return (
                <div 
                  key={role}
                  className="bg-white rounded-3xl border border-slate-150 p-5 space-y-3.5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
                  id={`role-card-${role.replace(/\s+/g, '-').toLowerCase()}`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <span className={`px-3 py-1 rounded-xl text-xs font-bold border ${conf.badgeBg} ${conf.badgeBorder} ${conf.badgeText}`}>
                        {role}
                      </span>
                      <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" /> {staffWithThisRole.length} Assigned
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                      {conf.description}
                    </p>
                  </div>

                  {/* Included Permissions Pills */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                      <span>Included Capabilities</span>
                      <span>{role === 'Super Admin' ? 'All (31)' : `${perms.length} Permissions`}</span>
                    </div>

                    <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
                      {role === 'Super Admin' ? (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-[10px] font-extrabold">
                          All 31 Permissions (Unrestricted Root Access)
                        </span>
                      ) : (
                        perms.map(pk => (
                          <span key={pk} className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-mono">
                            {pk}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: TERMINAL OPERATOR SWITCHER */}
      {activeTab === 'terminal' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-150 shadow-xs space-y-6" id="view-terminal-switcher">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="p-2.5 bg-indigo-600 text-white rounded-2xl shadow-md">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Register Terminal Operator Switcher
              </h2>
              <p className="text-xs text-slate-500">
                Switch active operator terminal sessions using staff PIN authentication. Suspended staff accounts are blocked.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: Current Active Operator Profile */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Active Terminal Operator
              </span>

              <div className="flex items-center gap-3">
                <img
                  src={activeStaff.avatar}
                  alt={activeStaff.name}
                  className="w-14 h-14 rounded-2xl object-cover ring-2 ring-indigo-500/20"
                />
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{activeStaff.name}</h3>
                  <span className="text-xs font-semibold text-indigo-600">{activeStaff.role}</span>
                  <p className="text-[11px] text-slate-400">{activeStaff.department || 'Retail Operations'}</p>
                </div>
              </div>

              <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs space-y-1">
                <span className="font-bold text-slate-700 block">Current Operator Rights</span>
                <p className="text-[11px] text-slate-500">
                  {activeStaff.role === 'Super Admin' ? 'All capabilities unlocked' : `${getEffectivePermissions(activeStaff).length} granular permissions`}
                </p>
              </div>
            </div>

            {/* Right: Quick Switch Selector */}
            <div className="space-y-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Select Staff to Switch Terminal
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                {staffMembers.map(staff => {
                  const isCurrent = staff.id === activeStaff.id;
                  const isSuspended = isStaffSuspended(staff);
                  return (
                    <button
                      key={staff.id}
                      onClick={() => !isSuspended && setSelectedStaffToLogin(staff)}
                      disabled={isCurrent || isSuspended}
                      className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-2.5 ${
                        selectedStaffToLogin?.id === staff.id
                          ? 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-500/20'
                          : isSuspended
                          ? 'bg-slate-50 border-slate-200 opacity-50 cursor-not-allowed'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <img src={staff.avatar} alt="" className="w-8 h-8 rounded-lg object-cover" />
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-xs text-slate-900 block truncate">{staff.name}</span>
                        <span className="text-[10px] text-slate-400 block truncate">
                          {isSuspended ? 'Suspended' : staff.role}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {selectedStaffToLogin && (
                <form onSubmit={handlePinSubmit} className="p-4 bg-indigo-50/60 rounded-2xl border border-indigo-200 space-y-3">
                  <span className="text-xs font-bold text-slate-800 block">
                    Enter PIN for {selectedStaffToLogin.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="password"
                      maxLength={4}
                      value={pinInput}
                      onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="4-digit PIN"
                      className="px-3 py-2 text-sm font-mono tracking-widest text-center bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden w-36"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                    >
                      Authenticate
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: SECURITY AUDIT LEDGER */}
      {activeTab === 'audit' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-150 shadow-xs space-y-5" id="view-audit-ledger">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-600 text-white rounded-xl">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Immutable Security Audit Trail
                </h2>
                <p className="text-xs text-slate-500">
                  Recorded telemetry on staff authorization changes, terminal logins, and governance operations.
                </p>
              </div>
            </div>

            <span className="text-xs font-bold text-slate-500 font-mono">
              {filteredAuditLogs.length} Records Logged
            </span>
          </div>

          {/* Audit Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Filter by Operator
              </label>
              <select
                value={operatorFilter}
                onChange={(e) => setOperatorFilter(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
              >
                {operators.map(op => <option key={op} value={op}>{op}</option>)}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Filter by Module
              </label>
              <select
                value={moduleFilter}
                onChange={(e) => setModuleFilter(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
              >
                {modules.map(mod => <option key={mod} value={mod}>{mod}</option>)}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Search Audit Trail Details
              </label>
              <input
                type="text"
                placeholder="Search log messages..."
                value={auditSearchTerm}
                onChange={(e) => setAuditSearchTerm(e.target.value)}
                className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-medium"
              />
            </div>
          </div>

          {/* Audit Logs Scroller */}
          <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
            {filteredAuditLogs.length > 0 ? (
              filteredAuditLogs.map(log => (
                <div
                  key={log.id}
                  className="p-3.5 bg-slate-50/70 hover:bg-slate-50 border border-slate-100 rounded-2xl text-xs space-y-1.5 transition-all"
                  id={`audit-log-${log.id}`}
                >
                  <div className="flex justify-between items-start flex-wrap gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900">{log.staffName}</span>
                      <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-md text-[10px] font-bold uppercase">
                        [{log.module}]
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">Role: {log.role}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(log.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </div>
                  <p className="font-bold text-slate-800">{log.action}</p>
                  <p className="text-slate-600 text-[11px] leading-relaxed font-normal">{log.details}</p>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-slate-400 text-xs">
                No matching audit ledger records registered for this filter.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Staff Create & Edit Form Modal */}
      <StaffFormModal
        isOpen={isStaffModalOpen}
        onClose={() => {
          setIsStaffModalOpen(false);
          setEditingStaff(null);
        }}
        onSave={handleSaveStaff}
        editingStaff={editingStaff}
        activeStaff={activeStaff}
        tenantOwnerUid={effectiveOwnerUid}
        canManageRoles={canManageRoles}
      />

      {/* Staff Details Drawer */}
      <StaffDetailsDrawer
        isOpen={isDrawerOpen}
        staff={selectedStaffForDrawer}
        activeStaff={activeStaff}
        auditLogs={auditLogs}
        tenantOwnerUid={effectiveOwnerUid}
        canManageUsers={canManageUsers}
        canManageRoles={canManageRoles}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedStaffForDrawer(null);
        }}
        onEditStaff={(staff) => {
          setIsDrawerOpen(false);
          handleOpenEditStaff(staff);
        }}
        onRequestStatusChange={(staff, action) => {
          handleRequestStatusChange(staff, action);
        }}
        onSwitchOperator={(staffId) => {
          onSwitchStaff(staffId);
          setIsDrawerOpen(false);
        }}
        onDeleteStaff={(staff) => {
          handleDeleteStaffClick(staff);
        }}
        isStatusChanging={isStatusChanging}
      />

      {/* Staff Status Confirmation Modal */}
      <StaffStatusConfirmModal
        isOpen={isStatusModalOpen}
        staff={statusTargetStaff}
        action={statusAction}
        onClose={() => {
          if (!isStatusChanging) {
            setIsStatusModalOpen(false);
            setStatusTargetStaff(null);
          }
        }}
        onConfirm={handleConfirmStatusChange}
        isLoading={isStatusChanging}
      />

    </div>
  );
}
