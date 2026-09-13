import React, { useState } from 'react';
import { 
  X, User, Mail, Phone, Building, Shield, ShieldCheck, ShieldAlert,
  Key, Lock, Check, Sparkles, Clock, AlertTriangle, UserCheck,
  Edit, Trash2, Crown, Activity, ChevronRight, Search
} from 'lucide-react';
import { StaffMember, AuditLog, PermissionKey } from '../types';
import { 
  getRoleConfig, getEffectivePermissions, isStaffSuspended,
  isTenantOwner, ALL_PERMISSIONS, PERMISSION_CATEGORIES 
} from '../utils/permissions';

interface StaffDetailsDrawerProps {
  isOpen: boolean;
  staff: StaffMember | null;
  activeStaff: StaffMember;
  auditLogs: AuditLog[];
  tenantOwnerUid?: string;
  canManageUsers: boolean;
  canManageRoles: boolean;
  onClose: () => void;
  onEditStaff: (staff: StaffMember) => void;
  onRequestStatusChange: (staff: StaffMember, action: 'suspend' | 'reactivate') => void;
  onSwitchOperator: (staffId: string) => void;
  onDeleteStaff: (staff: StaffMember) => void;
  isStatusChanging?: boolean;
}

export default function StaffDetailsDrawer({
  isOpen,
  staff,
  activeStaff,
  auditLogs,
  tenantOwnerUid,
  canManageUsers,
  canManageRoles,
  onClose,
  onEditStaff,
  onRequestStatusChange,
  onSwitchOperator,
  onDeleteStaff,
  isStatusChanging = false,
}: StaffDetailsDrawerProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'permissions' | 'audit'>('overview');
  const [permSearch, setPermSearch] = useState('');

  if (!isOpen || !staff) return null;

  const roleConfig = getRoleConfig(staff.role);
  const effectivePerms = getEffectivePermissions(staff);
  const isSuspended = isStaffSuspended(staff);
  const isOwner = isTenantOwner(staff, tenantOwnerUid);
  const isSelf = staff.id === activeStaff.id;

  // Recent audit logs for this staff member
  const staffAuditLogs = auditLogs.filter(
    (log) => log.staffName === staff.name || log.details.includes(staff.name) || log.details.includes(staff.id)
  );

  // Search permissions
  const filteredPerms = ALL_PERMISSIONS.filter((p) => {
    const isGranted = effectivePerms.includes(p.key) || staff.role === 'Super Admin';
    if (!isGranted) return false;
    if (!permSearch) return true;
    const term = permSearch.toLowerCase();
    return (
      p.label.toLowerCase().includes(term) ||
      p.key.toLowerCase().includes(term) ||
      p.description.toLowerCase().includes(term)
    );
  });

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden"
      id="staff-details-drawer-root"
      role="dialog"
      aria-modal="true"
      aria-labelledby="staff-details-drawer-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-xl bg-white shadow-2xl border-l border-slate-200 flex flex-col justify-between animate-in slide-in-from-right duration-200">
          
          {/* Header */}
          <div className="p-6 border-b border-slate-100 bg-slate-50/70 flex items-start justify-between shrink-0">
            <div className="flex items-start gap-4 min-w-0">
              <div className="relative shrink-0">
                <img
                  src={staff.avatar}
                  alt={staff.name}
                  className={`w-16 h-16 rounded-2xl object-cover ring-2 shadow-sm ${
                    isSuspended ? 'ring-rose-200 opacity-80' : 'ring-slate-100'
                  }`}
                />
                {isOwner && (
                  <span
                    title="Tenant Owner (Protected)"
                    className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-md ring-2 ring-white"
                  >
                    <Crown className="w-3.5 h-3.5" />
                  </span>
                )}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2
                    id="staff-details-drawer-title"
                    className="text-lg font-bold text-slate-900 truncate"
                  >
                    {staff.name}
                  </h2>
                  {isSelf && (
                    <span className="px-2 py-0.5 bg-indigo-600 text-white rounded-full text-[9px] font-extrabold uppercase tracking-wider">
                      You (Active Session)
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span
                    className={`px-2.5 py-0.5 rounded-xl text-xs font-bold border ${roleConfig.badgeBg} ${roleConfig.badgeBorder} ${roleConfig.badgeText}`}
                  >
                    {staff.role}
                  </span>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold border flex items-center gap-1 ${
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

                  {isOwner && (
                    <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-[10px] font-extrabold flex items-center gap-1">
                      <Crown className="w-3 h-3 text-amber-600" /> Owner (Protected)
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
              id="btn-close-staff-drawer"
              aria-label="Close drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Subtabs bar inside drawer */}
          <div className="px-6 py-2 border-b border-slate-100 bg-white flex items-center gap-2 text-xs font-bold shrink-0">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                activeTab === 'overview'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Overview & Status
            </button>
            <button
              onClick={() => setActiveTab('permissions')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                activeTab === 'permissions'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Effective Rights ({effectivePerms.length})
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                activeTab === 'audit'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Audit Trail ({staffAuditLogs.length})
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                
                {/* Authoritative Status Card */}
                <div
                  className={`p-4 rounded-3xl border transition-all space-y-3 ${
                    isSuspended
                      ? 'bg-rose-50/50 border-rose-200'
                      : 'bg-emerald-50/40 border-emerald-200'
                  }`}
                  id="drawer-status-card"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={`p-2 rounded-xl text-white ${
                          isSuspended ? 'bg-rose-600' : 'bg-emerald-600'
                        }`}
                      >
                        {isSuspended ? (
                          <ShieldAlert className="w-4 h-4" />
                        ) : (
                          <ShieldCheck className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                          Security Authorization State
                        </span>
                        <h4 className="text-sm font-black text-slate-900 capitalize">
                          Account {isSuspended ? 'Suspended' : 'Active'}
                        </h4>
                      </div>
                    </div>

                    {/* Status Action Button */}
                    {canManageUsers && (
                      <div>
                        {isOwner ? (
                          <span
                            className="text-[11px] font-bold text-amber-800 bg-amber-100/80 px-3 py-1.5 rounded-xl inline-block"
                            title="Owner account is protected and cannot be suspended."
                          >
                            Protected Owner
                          </span>
                        ) : isSelf ? (
                          <span
                            className="text-[11px] font-bold text-slate-500 bg-slate-200/80 px-3 py-1.5 rounded-xl inline-block"
                            title="You cannot suspend your own staff account."
                          >
                            Self Protection
                          </span>
                        ) : (
                          <button
                            onClick={() =>
                              onRequestStatusChange(
                                staff,
                                isSuspended ? 'reactivate' : 'suspend'
                              )
                            }
                            disabled={isStatusChanging}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 ${
                              isSuspended
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                : 'bg-rose-600 hover:bg-rose-700 text-white'
                            } disabled:opacity-50`}
                            id="btn-drawer-toggle-status"
                          >
                            {isSuspended ? (
                              <>
                                <ShieldCheck className="w-3.5 h-3.5" /> Reactivate Account
                              </>
                            ) : (
                              <>
                                <ShieldAlert className="w-3.5 h-3.5" /> Suspend Account
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    {isSuspended ? (
                      <span className="text-rose-700 font-semibold">
                        This employee account is suspended. POS terminals, register logins, and management actions are completely blocked on the backend.
                      </span>
                    ) : (
                      <span className="text-emerald-800">
                        This staff account is active and authorized for operational terminal access and permissions assigned under the <strong className="font-bold">{staff.role}</strong> role.
                      </span>
                    )}
                  </p>
                </div>

                {/* Contact & Department Details */}
                <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Contact & Department Information
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                      <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                        <Mail className="w-3 h-3 text-slate-400" /> Email Address
                      </span>
                      <p className="font-semibold text-slate-800 truncate">{staff.email}</p>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                      <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" /> Phone Number
                      </span>
                      <p className="font-semibold text-slate-800 truncate">
                        {staff.phone || 'Not specified'}
                      </p>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                      <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                        <Building className="w-3 h-3 text-slate-400" /> Assigned Department
                      </span>
                      <p className="font-semibold text-slate-800 truncate">
                        {staff.department || 'Retail Operations'}
                      </p>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                      <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" /> Last Active
                      </span>
                      <p className="font-semibold text-slate-800 truncate">
                        {staff.lastActive || 'Recently'}
                      </p>
                    </div>
                  </div>

                  {staff.notes && (
                    <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">
                        Internal Administrative Notes
                      </span>
                      <p className="text-slate-600 italic leading-relaxed">{staff.notes}</p>
                    </div>
                  )}
                </div>

                {/* Role Governance & Overrides Summary */}
                <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Role & Governance Profile
                    </h3>
                    <span className="text-xs font-bold text-indigo-600">{staff.role}</span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed font-medium">
                    {roleConfig.description}
                  </p>

                  <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">
                        Permissions Strategy
                      </span>
                      <span className="font-bold text-slate-800">
                        {staff.permissionsOverride && staff.permissionsOverride.length > 0 ? (
                          <span className="text-amber-600 font-extrabold flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5" /> Custom Overrides Active ({staff.permissionsOverride.length} rights)
                          </span>
                        ) : (
                          <span className="text-slate-700">
                            Standard Role Inheritance ({effectivePerms.length} rights)
                          </span>
                        )}
                      </span>
                    </div>

                    <button
                      onClick={() => setActiveTab('permissions')}
                      className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-0.5 text-xs"
                    >
                      View All <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Terminal Operator Access Summary */}
                <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Register Terminal Access
                  </h3>

                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl text-xs">
                    <div>
                      <span className="font-bold text-slate-800 block">Terminal Authentication PIN</span>
                      <span className="text-[11px] text-slate-500">
                        4-digit passcode required for rapid operator switching
                      </span>
                    </div>
                    <span className="px-2.5 py-1 bg-slate-200 text-slate-700 font-mono rounded-lg text-xs font-bold">
                      Protected PIN
                    </span>
                  </div>

                  <button
                    onClick={() => onSwitchOperator(staff.id)}
                    className="w-full py-2.5 bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-700 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2"
                    id="btn-drawer-switch-operator"
                  >
                    <UserCheck className="w-4 h-4" /> Set as Active Terminal Operator
                  </button>
                </div>

              </div>
            )}

            {/* PERMISSIONS TAB */}
            {activeTab === 'permissions' && (
              <div className="space-y-4">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search granted permissions..."
                    value={permSearch}
                    onChange={(e) => setPermSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div className="space-y-2">
                  {filteredPerms.map((perm) => (
                    <div
                      key={perm.key}
                      className="p-3 bg-white border border-slate-200/80 rounded-2xl space-y-1 hover:border-slate-300 transition-all text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{perm.label}</span>
                          {perm.isDestructive && (
                            <span className="px-1.5 py-0.2 bg-rose-100 text-rose-700 rounded text-[9px] font-bold">
                              High Risk
                            </span>
                          )}
                        </div>
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-[10px] font-bold">
                          Granted
                        </span>
                      </div>
                      <span className="font-mono text-[10px] text-indigo-600 block">{perm.key}</span>
                      <p className="text-[11px] text-slate-500 leading-normal">{perm.description}</p>
                    </div>
                  ))}

                  {filteredPerms.length === 0 && (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      No matching permissions found.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* AUDIT TRAIL TAB */}
            {activeTab === 'audit' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-500">
                  Audit events initiated by or mentioning {staff.name}.
                </p>

                {staffAuditLogs.length > 0 ? (
                  <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                    {staffAuditLogs.map((log) => (
                      <div
                        key={log.id}
                        className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1 text-xs"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-slate-800">{log.action}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-normal">{log.details}</p>
                        <div className="flex items-center gap-2 pt-1 text-[10px] text-slate-400 font-mono">
                          <span>[{log.module}]</span>
                          <span>By: {log.staffName}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl border border-slate-100">
                    No recorded audit events for this staff member.
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-slate-200 bg-slate-50/90 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2">
              {canManageUsers && (
                <button
                  onClick={() => onDeleteStaff(staff)}
                  disabled={isOwner || isSelf}
                  className={`px-3 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                    isOwner || isSelf
                      ? 'text-slate-300 bg-slate-100 cursor-not-allowed'
                      : 'text-rose-600 hover:bg-rose-50 hover:text-rose-700'
                  }`}
                  title={
                    isOwner
                      ? 'Tenant Owner account cannot be deleted'
                      : isSelf
                      ? 'You cannot delete your own account'
                      : 'Delete staff member'
                  }
                  id="btn-drawer-delete-staff"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {canManageUsers && (
                <button
                  onClick={() => onEditStaff(staff)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5"
                  id="btn-drawer-edit-staff"
                >
                  <Edit className="w-3.5 h-3.5" /> Edit Profile & Rights
                </button>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
