import React, { useState } from 'react';
import { 
  StaffMember, AuditLog, StaffRole, PermissionKey 
} from '../types';
import { 
  Lock, Key, Shield, Eye, EyeOff, ShieldAlert, CheckCircle2, 
  Activity, Users, Search, Filter, RotateCcw, HelpCircle,
  Plus, Edit, Trash2, Phone, Mail, Building, Check, X,
  AlertTriangle, RefreshCw, Smartphone, Package, Truck,
  Receipt, ShoppingBag, Settings, Sparkles, ChevronRight,
  ShieldCheck, UserCheck, UserX, Clock
} from 'lucide-react';
import { 
  OFFICIAL_ROLES, ALL_PERMISSIONS, PERMISSION_CATEGORIES, 
  DEFAULT_ROLE_PERMISSIONS, getRoleConfig, getEffectivePermissions, hasPermission 
} from '../utils/permissions';
import StaffFormModal from './StaffFormModal';

interface UserManagementModuleProps {
  staffMembers: StaffMember[];
  auditLogs: AuditLog[];
  activeStaff: StaffMember;
  onSwitchStaff: (staffId: string) => void;
  onAddStaff?: (staff: StaffMember) => void;
  onUpdateStaff?: (staff: StaffMember) => void;
  onDeleteStaff?: (staffId: string) => void;
}

export type UserModuleSubTab = 'roster' | 'matrix' | 'roles' | 'terminal' | 'audit';

export default function UserManagementModule({
  staffMembers,
  auditLogs,
  activeStaff,
  onSwitchStaff,
  onAddStaff,
  onUpdateStaff,
  onDeleteStaff
}: UserManagementModuleProps) {
  // Navigation tabs inside User Management
  const [activeTab, setActiveTab] = useState<UserModuleSubTab>('roster');

  // Staff Form Modal State
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);

  // Roster Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [revealedPins, setRevealedPins] = useState<{ [staffId: string]: boolean }>({});

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

  // Role Inspector test state
  const [inspectRole, setInspectRole] = useState<StaffRole>('Cashier');

  // Helpers
  const togglePinReveal = (staffId: string) => {
    setRevealedPins(prev => ({ ...prev, [staffId]: !prev[staffId] }));
  };

  const handleOpenAddStaff = () => {
    setEditingStaff(null);
    setIsStaffModalOpen(true);
  };

  const handleOpenEditStaff = (staff: StaffMember) => {
    setEditingStaff(staff);
    setIsStaffModalOpen(true);
  };

  const handleSaveStaff = (staff: StaffMember) => {
    if (editingStaff && onUpdateStaff) {
      onUpdateStaff(staff);
    } else if (onAddStaff) {
      onAddStaff(staff);
    }
  };

  const handleDeleteStaffClick = (staff: StaffMember) => {
    if (staff.id === activeStaff.id) {
      alert('Cannot delete the currently logged in operator session.');
      return;
    }
    if (confirm(`Are you sure you want to remove staff member "${staff.name}" (${staff.role}) from the system?`)) {
      if (onDeleteStaff) {
        onDeleteStaff(staff.id);
      }
    }
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffToLogin) return;

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

  // Filtered staff members
  const filteredStaff = staffMembers.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (s.department && s.department.toLowerCase().includes(searchTerm.toLowerCase())) ||
                          (s.phone && s.phone.includes(searchTerm));
    const matchesRole = roleFilter === 'All' || s.role === roleFilter;
    const matchesStatus = statusFilter === 'All' || s.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

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
    const matchesSearch = log.details.toLowerCase().includes(auditSearchTerm.toLowerCase()) || 
                          log.action.toLowerCase().includes(auditSearchTerm.toLowerCase());
    return matchesOperator && matchesModule && matchesSearch;
  });

  const operators = ['All', ...Array.from(new Set(auditLogs.map(l => l.staffName)))];
  const modules = ['All', 'Inventory', 'POS', 'CRM', 'User Management', 'Billing'];

  // Metrics
  const activeStaffCount = staffMembers.filter(s => s.status === 'Active').length;
  const customOverrideCount = staffMembers.filter(s => s.permissionsOverride && s.permissionsOverride.length > 0).length;

  return (
    <div className="space-y-6" id="user-management-root">
      
      {/* Top Header & Overview */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4" id="user-mgmt-header">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-600 text-white rounded-2xl shadow-md shadow-indigo-600/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                User & Staff Management Module
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                10 Granular Functional Roles, Custom Permission Overrides, and Active Terminal Operator Controls.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <button
            onClick={handleOpenAddStaff}
            className="w-full md:w-auto px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold rounded-2xl shadow-md shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all"
            id="btn-add-staff-top"
          >
            <Plus className="w-4 h-4" /> Add Staff Member
          </button>
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
          <p className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {activeStaffCount} active on duty
          </p>
        </div>

        <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Official Roles</span>
            <Shield className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-2xl font-black text-slate-900">10 Roles</p>
          <p className="text-[10px] text-purple-600 font-semibold">Pre-configured granular profiles</p>
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
          <Users className="w-4 h-4" /> Staff Directory & Roster ({staffMembers.length})
        </button>

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
      </div>

      {/* TAB 1: STAFF DIRECTORY & ROSTER */}
      {activeTab === 'roster' && (
        <div className="space-y-4" id="view-staff-roster">
          
          {/* Search and Filters Bar */}
          <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between" id="roster-filters-bar">
            <div className="relative w-full sm:w-80">
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

            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto no-scrollbar">
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

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                id="filter-staff-status"
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active</option>
                <option value="On Leave">On Leave</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Staff Roster Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" id="staff-roster-cards-grid">
            {filteredStaff.map((staff) => {
              const roleConfig = getRoleConfig(staff.role);
              const effectivePerms = getEffectivePermissions(staff);
              const isCurrent = activeStaff.id === staff.id;
              const isPinRevealed = revealedPins[staff.id];

              return (
                <div
                  key={staff.id}
                  className={`bg-white rounded-3xl border transition-all p-5 flex flex-col justify-between space-y-4 shadow-xs relative group ${
                    isCurrent 
                      ? 'border-indigo-600 ring-2 ring-indigo-500/20 shadow-md shadow-indigo-600/10' 
                      : 'border-slate-200/80 hover:border-slate-300 hover:shadow-md'
                  }`}
                  id={`staff-card-${staff.id}`}
                >
                  {/* Top Bar: Role badge + Status badge */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border ${roleConfig.badgeBg} ${roleConfig.badgeBorder} ${roleConfig.badgeText}`}>
                        {staff.role}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          staff.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          staff.status === 'On Leave' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {staff.status}
                        </span>
                        {isCurrent && (
                          <span className="px-2 py-0.5 bg-indigo-600 text-white rounded-full text-[9px] font-extrabold uppercase tracking-wider">
                            Active Operator
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Profile row */}
                    <div className="flex items-start gap-3.5">
                      <img
                        src={staff.avatar}
                        alt={staff.name}
                        className="w-13 h-13 rounded-2xl object-cover ring-2 ring-slate-100 shrink-0 shadow-xs"
                      />
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-bold text-slate-900 truncate">{staff.name}</h3>
                        <p className="text-xs text-slate-500 flex items-center gap-1.5 truncate mt-0.5">
                          <Mail className="w-3 h-3 text-slate-400 shrink-0" /> {staff.email}
                        </p>
                        {staff.phone && (
                          <p className="text-xs text-slate-400 flex items-center gap-1.5 truncate mt-0.5">
                            <Phone className="w-3 h-3 text-slate-400 shrink-0" /> {staff.phone}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Department & Notes */}
                    {staff.department && (
                      <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-600 flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-semibold">{staff.department}</span>
                      </div>
                    )}

                    {/* Granular Permissions Indicator */}
                    <div className="mt-3 p-2.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block">
                          Granted Rights
                        </span>
                        <span className="font-bold text-slate-800 text-xs">
                          {staff.permissionsOverride && staff.permissionsOverride.length > 0 ? (
                            <span className="text-amber-600 font-extrabold flex items-center gap-1">
                              <Sparkles className="w-3 h-3" /> Custom ({staff.permissionsOverride.length} perms)
                            </span>
                          ) : (
                            <span>Inherits {effectivePerms.length} Role Rights</span>
                          )}
                        </span>
                      </div>

                      {/* Passcode preview */}
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block">
                          Terminal PIN
                        </span>
                        <button
                          onClick={() => togglePinReveal(staff.id)}
                          className="font-mono text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 ml-auto"
                        >
                          {isPinRevealed ? staff.pin : '••••'}
                          {isPinRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => onSwitchStaff(staff.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                        isCurrent 
                          ? 'bg-slate-100 text-slate-500 cursor-default' 
                          : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white'
                      }`}
                      id={`btn-switch-operator-${staff.id}`}
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      {isCurrent ? 'Current Operator' : 'Switch Terminal'}
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditStaff(staff)}
                        className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
                        title="Edit Staff Member & Permissions"
                        id={`btn-edit-staff-${staff.id}`}
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDeleteStaffClick(staff)}
                        disabled={isCurrent}
                        className={`p-2 rounded-xl transition-all ${
                          isCurrent 
                            ? 'text-slate-300 cursor-not-allowed' 
                            : 'text-rose-400 hover:text-rose-600 hover:bg-rose-50'
                        }`}
                        title="Delete Staff Member"
                        id={`btn-delete-staff-${staff.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

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
                  Granular control ensuring employees only access their authorized capabilities rather than whole modules.
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

      {/* TAB 3: 10 ROLE DEFINITIONS & ACCESS PROFILES */}
      {activeTab === 'roles' && (
        <div className="space-y-4" id="view-role-definitions">
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs space-y-1">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Key className="w-4 h-4 text-indigo-600" />
              10 Official Role Access Profiles
            </h2>
            <p className="text-xs text-slate-500">
              Each role encapsulates a predefined set of granular permissions tailored to operational job responsibilities.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="roles-definitions-grid">
            {OFFICIAL_ROLES.map(role => {
              const conf = getRoleConfig(role);
              const perms = DEFAULT_ROLE_PERMISSIONS[role] || [];
              const assignedMembers = staffMembers.filter(s => s.role === role);

              return (
                <div 
                  key={role}
                  className="bg-white rounded-3xl border border-slate-200 p-5 space-y-4 shadow-xs hover:border-indigo-200 transition-all flex flex-col justify-between"
                  id={`role-def-card-${role.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className={`px-3 py-1 rounded-xl text-xs font-bold border ${conf.badgeBg} ${conf.badgeBorder} ${conf.badgeText}`}>
                          {role}
                        </span>
                      </div>

                      <span className="text-[11px] font-mono font-bold text-slate-400">
                        {assignedMembers.length} staff assigned
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                      {conf.description}
                    </p>

                    {/* Assigned Employees Mini Avatars */}
                    {assignedMembers.length > 0 && (
                      <div className="flex items-center gap-2 pt-1">
                        <div className="flex -space-x-2 overflow-hidden">
                          {assignedMembers.slice(0, 4).map(m => (
                            <img
                              key={m.id}
                              src={m.avatar}
                              alt={m.name}
                              title={`${m.name} (${m.email})`}
                              className="inline-block h-6 w-6 rounded-full ring-2 ring-white object-cover"
                            />
                          ))}
                        </div>
                        <span className="text-[10px] text-slate-500">
                          {assignedMembers.map(m => m.name.split(' ')[0]).join(', ')}
                        </span>
                      </div>
                    )}

                    {/* Included Granular Permissions Tag List */}
                    <div className="pt-2 border-t border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                        Default Capabilities ({role === 'Super Admin' ? 'All (31)' : perms.length})
                      </span>
                      <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto pr-1">
                        {role === 'Super Admin' ? (
                          <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-[10px] font-bold">
                            ★ Full Wildcard Access (All 31 Granular Permissions)
                          </span>
                        ) : (
                          perms.map(p => (
                            <span 
                              key={p} 
                              className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-lg text-[10px] font-mono font-semibold"
                            >
                              {p}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <button
                      onClick={() => {
                        setRoleFilter(role);
                        setActiveTab('roster');
                      }}
                      className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1"
                    >
                      View Staff with this Role <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: TERMINAL OPERATOR SWITCHER & PIN GATE */}
      {activeTab === 'terminal' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="view-terminal-switcher">
          
          {/* Active Operator Card & PIN Screen (7 cols) */}
          <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-100 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-indigo-600" /> Active Register Terminal Operator
                </h2>
                <p className="text-xs text-slate-500">
                  Switch the active logged-in employee to test runtime permission gating across all POS & Inventory subsystems.
                </p>
              </div>

              <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Authenticated
              </span>
            </div>

            {terminalUnlocked ? (
              <div className="space-y-6">
                {/* Active Operator Info */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <img
                      src={activeStaff.avatar}
                      alt={activeStaff.name}
                      className="w-16 h-16 rounded-2xl object-cover ring-4 ring-indigo-500/20 shadow-md"
                    />
                    <div className="space-y-1 text-center sm:text-left">
                      <h3 className="text-base font-bold text-slate-900">{activeStaff.name}</h3>
                      <div className="flex items-center gap-2 justify-center sm:justify-start">
                        <span className="px-2.5 py-0.5 bg-indigo-600 text-white rounded-lg text-xs font-bold">
                          {activeStaff.role}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">{activeStaff.email}</span>
                      </div>
                      <p className="text-[11px] text-slate-500">{activeStaff.department || 'General Staff'}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedStaffToLogin(activeStaff);
                      setTerminalUnlocked(false);
                    }}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-xs"
                    id="btn-lock-register-now"
                  >
                    Lock Terminal
                  </button>
                </div>

                {/* Quick Switch Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 block">
                    Switch Active Session to Another Employee
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {staffMembers.filter(s => s.id !== activeStaff.id).map(s => (
                      <button
                        key={s.id}
                        onClick={() => {
                          setSelectedStaffToLogin(s);
                          setTerminalUnlocked(false);
                        }}
                        className="p-3 bg-white hover:bg-slate-50 border border-slate-200 hover:border-indigo-300 rounded-2xl text-left transition-all flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img src={s.avatar} alt={s.name} className="w-8 h-8 rounded-xl object-cover" />
                          <div className="min-w-0">
                            <span className="font-bold text-xs text-slate-900 block truncate group-hover:text-indigo-600">
                              {s.name}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono block truncate">
                              {s.role}
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg shrink-0">
                          Select
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* PIN Lock Screen */
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 flex flex-col items-center text-center space-y-4 animate-in fade-in">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30">
                  <Key className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Operator Authentication Required</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Entering terminal for: <strong>{selectedStaffToLogin?.name}</strong> ({selectedStaffToLogin?.role})
                  </p>
                  <p className="text-xs text-indigo-600 font-mono font-bold mt-1">
                    Demo PIN: {selectedStaffToLogin?.pin}
                  </p>
                </div>

                <form onSubmit={handlePinSubmit} className="flex gap-2 w-full max-w-xs">
                  <input
                    type="password"
                    maxLength={4}
                    required
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value)}
                    placeholder="Enter 4-digit PIN..."
                    className="flex-1 px-4 py-2.5 text-center bg-white border border-slate-300 rounded-xl font-mono tracking-widest text-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-bold"
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md shadow-indigo-600/30"
                  >
                    Unlock
                  </button>
                </form>

                <button
                  onClick={() => {
                    setTerminalUnlocked(true);
                    setSelectedStaffToLogin(null);
                  }}
                  className="text-xs text-slate-400 hover:text-slate-700"
                >
                  Cancel Switch
                </button>
              </div>
            )}
          </div>

          {/* Active Operator Effective Permissions Summary (5 cols) */}
          <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-100 shadow-xs space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> Active Session Rights Telemetry
              </h2>
              <p className="text-xs text-slate-500">
                Live evaluation of capabilities granted to <strong>{activeStaff.name}</strong>
              </p>
            </div>

            <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
              {ALL_PERMISSIONS.map(perm => {
                const isPermitted = hasPermission(activeStaff, perm.key);
                return (
                  <div
                    key={perm.key}
                    className={`p-2.5 rounded-2xl border flex items-center justify-between text-xs transition-all ${
                      isPermitted
                        ? 'bg-emerald-50/50 border-emerald-200/80 text-emerald-900'
                        : 'bg-slate-50/50 border-slate-100 text-slate-400 opacity-60'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <span className="font-bold block truncate">{perm.label}</span>
                      <span className="font-mono text-[10px] text-slate-400 block">{perm.key}</span>
                    </div>

                    {isPermitted ? (
                      <span className="px-2 py-0.5 bg-emerald-600 text-white rounded-md text-[10px] font-extrabold shrink-0">
                        ALLOWED
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-slate-200 text-slate-600 rounded-md text-[10px] font-bold shrink-0">
                        DENIED
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* TAB 5: SECURITY AUDIT LEDGER */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-xs p-6 space-y-4" id="view-security-audit">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-600" /> Security & Access Audit Ledger
              </h2>
              <p className="text-xs text-slate-500">
                Immutable record of all authenticated transactions, role switches, and inventory operations.
              </p>
            </div>

            <button
              onClick={() => {
                setOperatorFilter('All');
                setModuleFilter('All');
                setAuditSearchTerm('');
              }}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset Filters
            </button>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Filter by Operator
              </label>
              <select
                value={operatorFilter}
                onChange={(e) => setOperatorFilter(e.target.value)}
                className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
              >
                {operators.map(op => <option key={op} value={op}>{op}</option>)}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Filter by Subsystem
              </label>
              <select
                value={moduleFilter}
                onChange={(e) => setModuleFilter(e.target.value)}
                className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
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
      />

    </div>
  );
}
