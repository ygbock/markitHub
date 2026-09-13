import React, { useState, useEffect } from 'react';
import { 
  X, User, Mail, Phone, Shield, Key, Building, 
  Check, AlertCircle, Sparkles, RefreshCw, Eye, EyeOff, Lock, HelpCircle,
  ShieldAlert, ShieldCheck, Crown
} from 'lucide-react';
import { StaffMember, StaffRole, PermissionKey, StaffStatus } from '../types';
import { 
  OFFICIAL_ROLES, ALL_PERMISSIONS, PERMISSION_CATEGORIES, 
  DEFAULT_ROLE_PERMISSIONS, getRoleConfig, getEffectivePermissions,
  isTenantOwner, isStaffSuspended
} from '../utils/permissions';

interface StaffFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (staff: StaffMember) => void;
  editingStaff?: StaffMember | null;
  activeStaff?: StaffMember;
  tenantOwnerUid?: string;
  canManageRoles?: boolean;
}

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=150',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=150',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=150',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=150',
  'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=150',
  'https://images.unsplash.com/photo-1534751516642-a171edd2521d?auto=format&fit=crop&q=80&w=150',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=150',
];

export default function StaffFormModal({
  isOpen,
  onClose,
  onSave,
  editingStaff,
  activeStaff,
  tenantOwnerUid,
  canManageRoles = true
}: StaffFormModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('');
  const [role, setRole] = useState<StaffRole>('Cashier');
  const [avatar, setAvatar] = useState(AVATAR_PRESETS[0]);
  const [pin, setPin] = useState('1234');
  const [status, setStatus] = useState<StaffStatus>('active');
  const [notes, setNotes] = useState('');
  const [showPin, setShowPin] = useState(false);

  // Custom Granular Permissions Overrides state
  const [enableCustomOverrides, setEnableCustomOverrides] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState<PermissionKey[]>([]);
  const [activeCategoryTab, setActiveCategoryTab] = useState<string>('all');

  // Security checks
  const isEditingSelf = Boolean(editingStaff && activeStaff && editingStaff.id === activeStaff.id);
  const isEditingOwner = Boolean(editingStaff && isTenantOwner(editingStaff, tenantOwnerUid));
  const roleChangeBlocked = !canManageRoles || isEditingSelf || isEditingOwner;

  useEffect(() => {
    if (!isOpen) return;
    if (editingStaff) {
      setName(editingStaff.name);
      setEmail(editingStaff.email);
      setPhone(editingStaff.phone || '');
      setDepartment(editingStaff.department || '');
      setRole(editingStaff.role);
      setAvatar(editingStaff.avatar);
      setPin(editingStaff.pin);
      setStatus(isStaffSuspended(editingStaff) ? 'suspended' : 'active');
      setNotes(editingStaff.notes || '');

      if (editingStaff.permissionsOverride && editingStaff.permissionsOverride.length > 0) {
        setEnableCustomOverrides(true);
        setSelectedPermissions(editingStaff.permissionsOverride);
      } else {
        setEnableCustomOverrides(false);
        setSelectedPermissions(DEFAULT_ROLE_PERMISSIONS[editingStaff.role] || []);
      }
    } else {
      // Defaults for new staff
      setName('');
      setEmail('');
      setPhone('');
      setDepartment('Retail Operations');
      setRole('Cashier');
      setAvatar(AVATAR_PRESETS[Math.floor(Math.random() * AVATAR_PRESETS.length)]);
      setPin(String(Math.floor(1000 + Math.random() * 9000)));
      setStatus('active');
      setNotes('');
      setEnableCustomOverrides(false);
      setSelectedPermissions(DEFAULT_ROLE_PERMISSIONS['Cashier']);
    }
  }, [editingStaff, isOpen]);

  // When role changes, if not using custom overrides, update selected permissions to role defaults
  const handleRoleChange = (newRole: StaffRole) => {
    if (roleChangeBlocked) return;
    setRole(newRole);
    if (!enableCustomOverrides) {
      setSelectedPermissions(DEFAULT_ROLE_PERMISSIONS[newRole] || []);
    }
  };

  const handleToggleCustomOverrides = (checked: boolean) => {
    if (!canManageRoles) return;
    setEnableCustomOverrides(checked);
    if (checked) {
      setSelectedPermissions(selectedPermissions.length > 0 ? selectedPermissions : (DEFAULT_ROLE_PERMISSIONS[role] || []));
    }
  };

  const handleTogglePermission = (key: PermissionKey) => {
    if (!canManageRoles) return;
    if (selectedPermissions.includes(key)) {
      setSelectedPermissions(selectedPermissions.filter(k => k !== key));
    } else {
      setSelectedPermissions([...selectedPermissions, key]);
    }
  };

  const handleSelectAllCategory = (catId: string) => {
    if (!canManageRoles) return;
    const catKeys = ALL_PERMISSIONS.filter(p => p.category === catId).map(p => p.key);
    const allPresent = catKeys.every(k => selectedPermissions.includes(k));
    if (allPresent) {
      setSelectedPermissions(selectedPermissions.filter(k => !catKeys.includes(k)));
    } else {
      const merged = Array.from(new Set([...selectedPermissions, ...catKeys]));
      setSelectedPermissions(merged);
    }
  };

  const handleResetToRoleDefaults = () => {
    if (!canManageRoles) return;
    setSelectedPermissions(DEFAULT_ROLE_PERMISSIONS[role] || []);
  };

  const handleGeneratePin = () => {
    const randomPin = String(Math.floor(1000 + Math.random() * 9000));
    setPin(randomPin);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      alert('Please provide staff member name and email address.');
      return;
    }

    if (!pin || pin.length < 4) {
      alert('Please enter a valid 4-digit numeric PIN for terminal authorization.');
      return;
    }

    const payload: StaffMember = {
      id: editingStaff ? editingStaff.id : `staff-${Date.now()}`,
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      department: department.trim(),
      role: isEditingOwner ? 'Business Owner' : role,
      avatar,
      pin,
      status: (isEditingOwner || isEditingSelf) ? (editingStaff?.status ? (isStaffSuspended(editingStaff) ? 'suspended' : 'active') : 'active') : status,
      notes: notes.trim(),
      lastActive: editingStaff?.lastActive || 'Just created',
      permissionsOverride: (enableCustomOverrides && canManageRoles) ? selectedPermissions : undefined
    };

    onSave(payload);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      id="staff-form-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="staff-modal-title"
    >
      <div 
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity" 
        onClick={onClose} 
      />

      <div 
        className="relative bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl z-10 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200"
        id="staff-form-modal-container"
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/30">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 id="staff-modal-title" className="text-base font-bold text-slate-900">
                {editingStaff ? 'Edit Staff Profile & Governance' : 'Register New Staff Member'}
              </h2>
              <p className="text-xs text-slate-500">
                {editingStaff ? `Updating configuration for ${editingStaff.name}` : 'Provision access credentials, role, and operational capabilities.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
            id="btn-close-staff-modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6" id="staff-form">
          
          {/* Top Section: Avatar & Primary Identity */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-start">
            
            {/* Avatar & Status Selector */}
            <div className="sm:col-span-4 flex flex-col items-center text-center space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="relative">
                <img 
                  src={avatar} 
                  alt="Avatar preview" 
                  className="w-20 h-20 rounded-2xl object-cover ring-4 ring-indigo-500/20 shadow-md"
                />
                {isEditingOwner && (
                  <span className="absolute -top-2 -right-2 bg-amber-500 text-white p-1 rounded-full shadow-md">
                    <Crown className="w-3.5 h-3.5" />
                  </span>
                )}
              </div>

              <div className="w-full">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Choose Photo Preset
                </label>
                <div className="grid grid-cols-5 gap-1.5 justify-center">
                  {AVATAR_PRESETS.slice(0, 10).map((presetUrl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setAvatar(presetUrl)}
                      className={`w-7 h-7 rounded-lg overflow-hidden border transition-all ${
                        avatar === presetUrl ? 'ring-2 ring-indigo-600 scale-105 border-indigo-600' : 'opacity-60 hover:opacity-100 border-transparent'
                      }`}
                    >
                      <img src={presetUrl} alt={`Avatar ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Authoritative Security Status Selector */}
              <div className="w-full pt-3 border-t border-slate-200">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block text-left">
                    Security Status
                  </label>
                  {(isEditingOwner || isEditingSelf) && (
                    <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                      Protected
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-1.5 text-xs font-bold">
                  <button
                    type="button"
                    disabled={isEditingOwner || isEditingSelf}
                    onClick={() => setStatus('active')}
                    className={`py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                      status === 'active'
                        ? 'bg-emerald-600 text-white shadow-xs font-extrabold'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    } disabled:opacity-60 disabled:cursor-not-allowed`}
                    id="btn-status-active"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" /> Active
                  </button>

                  <button
                    type="button"
                    disabled={isEditingOwner || isEditingSelf}
                    onClick={() => setStatus('suspended')}
                    className={`py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                      status === 'suspended'
                        ? 'bg-rose-600 text-white shadow-xs font-extrabold'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    } disabled:opacity-60 disabled:cursor-not-allowed`}
                    id="btn-status-suspended"
                    title={
                      isEditingOwner
                        ? 'Tenant Owner cannot be suspended'
                        : isEditingSelf
                        ? 'You cannot suspend your own account'
                        : undefined
                    }
                  >
                    <ShieldAlert className="w-3.5 h-3.5" /> Suspended
                  </button>
                </div>

                {isEditingOwner && (
                  <p className="text-[10px] text-amber-800 text-left mt-1.5 font-medium leading-tight">
                    Tenant Owner account is protected and cannot be suspended.
                  </p>
                )}
                {isEditingSelf && !isEditingOwner && (
                  <p className="text-[10px] text-slate-500 text-left mt-1.5 font-medium leading-tight">
                    You cannot suspend your own active account session.
                  </p>
                )}
              </div>
            </div>

            {/* Basic Info Inputs (8 cols) */}
            <div className="sm:col-span-8 space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Jessie Quick"
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                      id="input-staff-name"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Work Email <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. jessie.q@enterprise.com"
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                      id="input-staff-email"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Contact Phone
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. +1 (555) 011-8844"
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                      id="input-staff-phone"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Department / Division
                  </label>
                  <div className="relative">
                    <Building className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      placeholder="e.g. Retail Store Operations"
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                      id="input-staff-department"
                    />
                  </div>
                </div>
              </div>

              {/* PIN Code Setup */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-indigo-600" /> Terminal Passcode (4-Digit PIN) <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleGeneratePin}
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" /> Generate Random
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showPin ? 'text' : 'password'}
                      maxLength={4}
                      required
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="4 digits"
                      className="w-full px-3 py-2 text-sm font-mono tracking-widest text-center bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                      id="input-staff-pin"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <span className="text-[11px] text-slate-400">Used for quick POS register unlocking</span>
                </div>
              </div>
            </div>

          </div>

          {/* Role Selection Matrix (All 10 Official Roles) */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-indigo-600" /> Assigned Functional Role (10 Roles) <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-slate-400 font-mono">
                {DEFAULT_ROLE_PERMISSIONS[role]?.length || 0} permissions included
              </span>
            </div>

            {/* Role protection alerts */}
            {isEditingSelf && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>Self-role change protection is active: You cannot change your own functional role.</span>
              </div>
            )}
            {isEditingOwner && !isEditingSelf && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2 font-medium">
                <Crown className="w-4 h-4 shrink-0 text-amber-600" />
                <span>Tenant Owner protection: The Business Owner role is protected and cannot be changed or demoted.</span>
              </div>
            )}
            {!canManageRoles && !isEditingSelf && !isEditingOwner && (
              <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-700 flex items-center gap-2 font-medium">
                <Lock className="w-4 h-4 shrink-0 text-slate-500" />
                <span>Requires <code className="font-bold text-indigo-600">users.roles</code> permission to modify staff roles or grant permissions.</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2" id="role-selector-grid">
              {OFFICIAL_ROLES.map((r) => {
                const conf = getRoleConfig(r);
                const isSelected = role === r;
                return (
                  <button
                    key={r}
                    type="button"
                    disabled={roleChangeBlocked}
                    onClick={() => handleRoleChange(r)}
                    className={`p-3 rounded-2xl border text-left transition-all relative ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20 shadow-xs'
                        : 'border-slate-200 bg-slate-50/40 hover:bg-slate-50 hover:border-slate-300'
                    } ${roleChangeBlocked ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-slate-900">{r}</span>
                      {isSelected && (
                        <span className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">
                          <Check className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed">{conf.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Granular Permissions Customization & Overrides Accordion */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-4" id="custom-permissions-section">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-slate-200">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-slate-900">Custom Granular Permission Overrides</span>
                  {enableCustomOverrides && (
                    <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-700 rounded-full text-[10px] font-bold">
                      Custom Active ({selectedPermissions.length})
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">
                  Selectively grant or revoke specific granular capabilities beyond default role boundaries.
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer select-none shrink-0">
                <input
                  type="checkbox"
                  disabled={!canManageRoles}
                  checked={enableCustomOverrides}
                  onChange={(e) => handleToggleCustomOverrides(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600 peer-disabled:opacity-50"></div>
                <span className="ml-2 text-xs font-semibold text-slate-700">Override</span>
              </label>
            </div>

            {enableCustomOverrides ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full text-[11px]">
                    <button
                      type="button"
                      onClick={() => setActiveCategoryTab('all')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                        activeCategoryTab === 'all'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                      }`}
                    >
                      All Categories
                    </button>
                    {PERMISSION_CATEGORIES.map(cat => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setActiveCategoryTab(cat.id)}
                        className={`px-2.5 py-1 rounded-lg font-medium transition-all whitespace-nowrap ${
                          activeCategoryTab === cat.id
                            ? 'bg-indigo-600 text-white font-bold'
                            : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    disabled={!canManageRoles}
                    onClick={handleResetToRoleDefaults}
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold"
                  >
                    Reset to {role} Defaults
                  </button>
                </div>

                {/* Permissions Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
                  {ALL_PERMISSIONS
                    .filter(p => activeCategoryTab === 'all' || p.category === activeCategoryTab)
                    .map((perm) => {
                      const isChecked = selectedPermissions.includes(perm.key);
                      return (
                        <div
                          key={perm.key}
                          onClick={() => handleTogglePermission(perm.key)}
                          className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-start gap-2.5 ${
                            isChecked
                              ? 'bg-indigo-50/60 border-indigo-300'
                              : 'bg-white border-slate-200 hover:border-slate-300 opacity-75'
                          } ${!canManageRoles ? 'pointer-events-none opacity-60' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            disabled={!canManageRoles}
                            className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-900">{perm.label}</span>
                              {perm.isDestructive && (
                                <span className="text-[9px] px-1 bg-rose-100 text-rose-700 rounded font-bold">
                                  Destructive
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-500 line-clamp-1">{perm.description}</p>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            ) : (
              <div className="text-center py-3 text-slate-500 text-xs flex items-center justify-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                <span>Inheriting standard default permissions profile for <strong>{role}</strong>.</span>
              </div>
            )}
          </div>

          {/* Optional Administrative Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Internal Administrative Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Schedule preferences, security credentials, employee background notes..."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              id="input-staff-notes"
            />
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/30 transition-all flex items-center gap-2"
              id="btn-save-staff"
            >
              <Check className="w-4 h-4" />
              {editingStaff ? 'Save Changes' : 'Register Staff Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
