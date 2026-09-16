import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Edit3,
  ExternalLink,
  Eye,
  FileText,
  Filter,
  Flame,
  Info,
  Key,
  Layers,
  Loader2,
  Lock,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Timer,
  Trash2,
  Unlock,
  UserCheck,
  UserPlus,
  Users,
  UserX,
  X,
} from 'lucide-react';
import { getAuth } from 'firebase/auth';

export type PlatformRole =
  | 'SUPER_ADMIN'
  | 'PLATFORM_OPERATIONS'
  | 'PLATFORM_BILLING'
  | 'PLATFORM_SUPPORT'
  | 'PLATFORM_SECURITY';

export type PlatformAdminStatus = 'active' | 'suspended';

export interface BreakGlassAccess {
  id: string;
  elevatedRole: PlatformRole;
  elevatedPermissions: string[];
  reason: string;
  grantedByUid: string;
  grantedByEmail: string;
  grantedByName?: string;
  createdAt: string;
  expiresAt: string;
  status: 'active' | 'expired' | 'revoked';
  revokedAt?: string;
  revokedByUid?: string;
  revokedReason?: string;
}

export interface PlatformAdministrator {
  id: string;
  uid: string;
  email: string;
  name: string;
  phoneNumber?: string;
  department?: string;
  title?: string;
  avatarUrl?: string;
  notes?: string;
  status: PlatformAdminStatus;
  role: PlatformRole;
  delegatedPermissions: string[];
  revokedPermissions?: string[];
  breakGlass?: BreakGlassAccess | null;
  version: number;
  lastLoginAt?: string;
  lastActiveAt?: string;
  lastAction?: string;
  sessionRevokedAt?: string;
  createdAt: string;
  createdByUid: string;
  createdByEmail: string;
  updatedAt: string;
  updatedByUid: string;
  updatedByEmail: string;
  effectivePermissions?: string[];
}

export interface PermissionDef {
  key: string;
  domain: string;
  label: string;
  description: string;
}

export interface RolePermissionMatrix {
  domains: string[];
  permissions: PermissionDef[];
  roles: PlatformRole[];
  roleDefaults: Record<PlatformRole, string[]>;
}

const ROLE_BADGE_STYLES: Record<PlatformRole, { bg: string; text: string; border: string; label: string }> = {
  SUPER_ADMIN: {
    bg: 'bg-rose-500/10 dark:bg-rose-500/20',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-200 dark:border-rose-800/60',
    label: 'Super Admin',
  },
  PLATFORM_OPERATIONS: {
    bg: 'bg-blue-500/10 dark:bg-blue-500/20',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800/60',
    label: 'Platform Operations',
  },
  PLATFORM_BILLING: {
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800/60',
    label: 'Platform Billing',
  },
  PLATFORM_SUPPORT: {
    bg: 'bg-amber-500/10 dark:bg-amber-500/20',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800/60',
    label: 'Platform Support',
  },
  PLATFORM_SECURITY: {
    bg: 'bg-purple-500/10 dark:bg-purple-500/20',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-200 dark:border-purple-800/60',
    label: 'Platform Security',
  },
};

const DOMAIN_LABELS: Record<string, string> = {
  tenants: 'Tenants & Lifecycle',
  billing: 'Billing & Plans',
  usage: 'Usage & Quotas',
  alerts: 'Alerts & Incidents',
  notifications: 'Notifications & Escalations',
  governance: 'Governance & Policy',
  security: 'Security & Access Control',
};

export default function PlatformAccessControlSection() {
  const [administrators, setAdministrators] = useState<PlatformAdministrator[]>([]);
  const [matrix, setMatrix] = useState<RolePermissionMatrix | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended' | 'break_glass'>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | PlatformRole>('all');
  const [activeSubTab, setActiveSubTab] = useState<'directory' | 'matrix' | 'audit'>('directory');

  // Selected admin for detail drawer
  const [selectedAdmin, setSelectedAdmin] = useState<PlatformAdministrator | null>(null);
  const [activityHistory, setActivityHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Modals state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showBreakGlassModal, setShowBreakGlassModal] = useState(false);
  const [showRevokeBreakGlassModal, setShowRevokeBreakGlassModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);

  // Form states
  const [justification, setJustification] = useState('');
  const [actionPending, setActionPending] = useState(false);

  // Invite Form
  const [inviteForm, setInviteForm] = useState({
    email: '',
    name: '',
    role: 'PLATFORM_OPERATIONS' as PlatformRole,
    department: '',
    title: '',
    phoneNumber: '',
    notes: '',
    delegatedPermissions: [] as string[],
    justification: '',
  });

  // Break-Glass Form
  const [breakGlassForm, setBreakGlassForm] = useState({
    elevatedRole: 'SUPER_ADMIN' as PlatformRole,
    durationMinutes: 120,
    justification: '',
  });

  // Role Form
  const [targetRole, setTargetRole] = useState<PlatformRole>('PLATFORM_OPERATIONS');

  // Permissions Form
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  // Current user UID from Firebase
  const auth = getAuth();
  const currentUid = auth.currentUser?.uid || '';

  // Flash message helper
  const flashSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  // Auth fetch helper
  const authFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    const user = auth.currentUser;
    let token = '';
    if (user) {
      token = await user.getIdToken();
    }
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    };
    return fetch(url, { ...options, headers });
  }, [auth]);

  // Load data
  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const [adminsRes, matrixRes] = await Promise.all([
        authFetch('/api/platform/administrators'),
        authFetch('/api/platform/administrators/roles/matrix'),
      ]);

      if (!adminsRes.ok) {
        const errData = await adminsRes.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${adminsRes.status}`);
      }

      const adminsData = await adminsRes.json();
      setAdministrators(adminsData.administrators || []);

      if (matrixRes.ok) {
        const mData = await matrixRes.json();
        setMatrix(mData.matrix || null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load platform administrators.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [authFetch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load history when selected admin changes
  const loadAdminHistory = useCallback(async (adminId: string) => {
    setLoadingHistory(true);
    try {
      const res = await authFetch(`/api/platform/administrators/${adminId}/history?limit=30`);
      if (res.ok) {
        const data = await res.json();
        setActivityHistory(data.history || []);
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoadingHistory(false);
    }
  }, [authFetch]);

  useEffect(() => {
    if (selectedAdmin) {
      loadAdminHistory(selectedAdmin.id);
    } else {
      setActivityHistory([]);
    }
  }, [selectedAdmin, loadAdminHistory]);

  // Filtered admins
  const filteredAdmins = useMemo(() => {
    return administrators.filter(admin => {
      // Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        const matches =
          admin.name.toLowerCase().includes(q) ||
          admin.email.toLowerCase().includes(q) ||
          (admin.department && admin.department.toLowerCase().includes(q)) ||
          (admin.title && admin.title.toLowerCase().includes(q));
        if (!matches) return false;
      }

      // Status
      if (statusFilter === 'active' && admin.status !== 'active') return false;
      if (statusFilter === 'suspended' && admin.status !== 'suspended') return false;
      if (statusFilter === 'break_glass') {
        const bgActive = admin.breakGlass?.status === 'active' &&
          new Date(admin.breakGlass.expiresAt).getTime() > Date.now();
        if (!bgActive) return false;
      }

      // Role
      if (roleFilter !== 'all' && admin.role !== roleFilter) return false;

      return true;
    });
  }, [administrators, searchQuery, statusFilter, roleFilter]);

  // Summary counts
  const counts = useMemo(() => {
    let active = 0;
    let suspended = 0;
    let breakGlass = 0;
    let superAdmins = 0;
    const now = Date.now();

    for (const a of administrators) {
      if (a.status === 'active') active++;
      if (a.status === 'suspended') suspended++;
      if (a.role === 'SUPER_ADMIN') superAdmins++;
      if (a.breakGlass?.status === 'active' && new Date(a.breakGlass.expiresAt).getTime() > now) {
        breakGlass++;
      }
    }

    return { total: administrators.length, active, suspended, breakGlass, superAdmins };
  }, [administrators]);

  // Grouped permissions by domain
  const permissionsByDomain = useMemo<Record<string, PermissionDef[]>>(() => {
    if (!matrix?.permissions) return {};
    const map: Record<string, PermissionDef[]> = {};
    for (const p of matrix.permissions) {
      if (!map[p.domain]) map[p.domain] = [];
      map[p.domain].push(p);
    }
    return map;
  }, [matrix]);

  // Handler: Invite Admin
  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteForm.justification || inviteForm.justification.trim().length < 3) {
      setError('A valid justification is required to create a platform administrator.');
      return;
    }
    setActionPending(true);
    setError(null);
    try {
      const res = await authFetch('/api/platform/administrators', {
        method: 'POST',
        body: JSON.stringify(inviteForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create platform administrator.');

      flashSuccess(`Platform administrator ${data.administrator.name} created successfully.`);
      setShowInviteModal(false);
      setInviteForm({
        email: '',
        name: '',
        role: 'PLATFORM_OPERATIONS',
        department: '',
        title: '',
        phoneNumber: '',
        notes: '',
        delegatedPermissions: [],
        justification: '',
      });
      await loadData(true);
    } catch (err: any) {
      setError(err.message || 'Creation failed.');
    } finally {
      setActionPending(false);
    }
  };

  // Handler: Update Role
  const handleAssignRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdmin) return;
    if (!justification || justification.trim().length < 3) {
      setError('A valid justification is required to modify platform role.');
      return;
    }
    setActionPending(true);
    setError(null);
    try {
      const res = await authFetch(`/api/platform/administrators/${selectedAdmin.id}/role`, {
        method: 'PATCH',
        body: JSON.stringify({
          role: targetRole,
          justification,
          expectedVersion: selectedAdmin.version,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update platform role.');

      flashSuccess(`Role updated to ${targetRole} for ${selectedAdmin.name}.`);
      setSelectedAdmin(data.administrator);
      setShowRoleModal(false);
      setJustification('');
      await loadData(true);
    } catch (err: any) {
      setError(err.message || 'Role assignment failed.');
    } finally {
      setActionPending(false);
    }
  };

  // Handler: Update Permissions
  const handleUpdatePermissions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdmin) return;
    if (!justification || justification.trim().length < 3) {
      setError('A valid justification is required to update permissions.');
      return;
    }
    setActionPending(true);
    setError(null);
    try {
      const res = await authFetch(`/api/platform/administrators/${selectedAdmin.id}/permissions`, {
        method: 'PATCH',
        body: JSON.stringify({
          delegatedPermissions: selectedPermissions,
          justification,
          expectedVersion: selectedAdmin.version,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update permissions.');

      flashSuccess(`Delegated permissions updated for ${selectedAdmin.name}.`);
      setSelectedAdmin(data.administrator);
      setShowPermissionsModal(false);
      setJustification('');
      await loadData(true);
    } catch (err: any) {
      setError(err.message || 'Permissions update failed.');
    } finally {
      setActionPending(false);
    }
  };

  // Handler: Toggle Status
  const handleToggleStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdmin) return;
    if (!justification || justification.trim().length < 3) {
      setError('A valid justification is required to change administrator status.');
      return;
    }
    const newStatus: PlatformAdminStatus = selectedAdmin.status === 'active' ? 'suspended' : 'active';
    setActionPending(true);
    setError(null);
    try {
      const res = await authFetch(`/api/platform/administrators/${selectedAdmin.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: newStatus,
          justification,
          expectedVersion: selectedAdmin.version,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update administrator status.');

      flashSuccess(`Administrator ${selectedAdmin.name} is now ${newStatus}.`);
      setSelectedAdmin(data.administrator);
      setShowStatusModal(false);
      setJustification('');
      await loadData(true);
    } catch (err: any) {
      setError(err.message || 'Status update failed.');
    } finally {
      setActionPending(false);
    }
  };

  // Handler: Grant Break Glass
  const handleGrantBreakGlass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdmin) return;
    if (!breakGlassForm.justification || breakGlassForm.justification.trim().length < 3) {
      setError('A valid emergency justification is mandatory for break-glass elevation.');
      return;
    }
    setActionPending(true);
    setError(null);
    try {
      const res = await authFetch(`/api/platform/administrators/${selectedAdmin.id}/break-glass`, {
        method: 'POST',
        body: JSON.stringify({
          elevatedRole: breakGlassForm.elevatedRole,
          durationMinutes: breakGlassForm.durationMinutes,
          justification: breakGlassForm.justification,
          expectedVersion: selectedAdmin.version,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to grant break-glass elevation.');

      flashSuccess(`Emergency break-glass elevation granted to ${selectedAdmin.name}.`);
      setSelectedAdmin(data.administrator);
      setShowBreakGlassModal(false);
      setBreakGlassForm({
        elevatedRole: 'SUPER_ADMIN',
        durationMinutes: 120,
        justification: '',
      });
      await loadData(true);
    } catch (err: any) {
      setError(err.message || 'Break-glass elevation failed.');
    } finally {
      setActionPending(false);
    }
  };

  // Handler: Revoke Break Glass
  const handleRevokeBreakGlass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdmin) return;
    if (!justification || justification.trim().length < 3) {
      setError('A valid revocation justification is required.');
      return;
    }
    setActionPending(true);
    setError(null);
    try {
      const res = await authFetch(`/api/platform/administrators/${selectedAdmin.id}/break-glass/revoke`, {
        method: 'POST',
        body: JSON.stringify({
          justification,
          expectedVersion: selectedAdmin.version,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to revoke break-glass elevation.');

      flashSuccess(`Break-glass elevation revoked for ${selectedAdmin.name}.`);
      setSelectedAdmin(data.administrator);
      setShowRevokeBreakGlassModal(false);
      setJustification('');
      await loadData(true);
    } catch (err: any) {
      setError(err.message || 'Break-glass revocation failed.');
    } finally {
      setActionPending(false);
    }
  };

  // Handler: Delete Admin
  const handleDeleteAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdmin) return;
    if (!justification || justification.trim().length < 3) {
      setError('A valid justification is required to delete an administrator.');
      return;
    }
    setActionPending(true);
    setError(null);
    try {
      const res = await authFetch(`/api/platform/administrators/${selectedAdmin.id}`, {
        method: 'DELETE',
        body: JSON.stringify({
          justification,
          expectedVersion: selectedAdmin.version,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete administrator.');

      flashSuccess(`Platform administrator ${selectedAdmin.name} deleted.`);
      setSelectedAdmin(null);
      setShowDeleteModal(false);
      setJustification('');
      await loadData(true);
    } catch (err: any) {
      setError(err.message || 'Deletion failed.');
    } finally {
      setActionPending(false);
    }
  };

  // Helper for break-glass countdown string
  const formatTimeRemaining = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return 'Expired';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}h ${minutes}m remaining`;
    return `${minutes}m remaining`;
  };

  return (
    <div id="platform-access-control-section" className="space-y-6">
      {/* Header with Title & Stats */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-rose-600 dark:text-rose-400" />
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
              Platform Identity & Delegated Administration
            </h1>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 max-w-2xl">
            Centralized platform-level access directory, fine-grained role delegation, temporary break-glass elevation, and immutable security audit trails.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            id="refresh-admins-btn"
            onClick={() => loadData(true)}
            disabled={loading || refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-rose-500' : ''}`} />
            Refresh
          </button>
          <button
            id="invite-admin-btn"
            onClick={() => {
              setInviteForm({
                email: '',
                name: '',
                role: 'PLATFORM_OPERATIONS',
                department: '',
                title: '',
                phoneNumber: '',
                notes: '',
                delegatedPermissions: [],
                justification: '',
              });
              setShowInviteModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Add Administrator
          </button>
        </div>
      </div>

      {/* Metric Cards Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">Total Admins</span>
            <Users className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{counts.total}</div>
          <div className="text-[11px] text-zinc-500 mt-0.5">{counts.active} active platform members</div>
        </div>

        <div className="p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/40 dark:bg-rose-950/20 shadow-xs">
          <div className="flex items-center justify-between text-rose-700 dark:text-rose-400 mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">Super Admins</span>
            <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-900 dark:text-rose-200">{counts.superAdmins}</div>
          <div className="text-[11px] text-rose-600 dark:text-rose-400 mt-0.5">Last-admin protection enforced</div>
        </div>

        <div className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20 shadow-xs">
          <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">Break-Glass Active</span>
            <Flame className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-900 dark:text-amber-200">{counts.breakGlass}</div>
          <div className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">Auto-expiring temporary elevations</div>
        </div>

        <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">Suspended</span>
            <UserX className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{counts.suspended}</div>
          <div className="text-[11px] text-zinc-500 mt-0.5">Zero platform access granted</div>
        </div>
      </div>

      {/* Notifications / Alerts */}
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-500 hover:text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Sub-Tabs: Directory vs Role Matrix */}
      <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
        <button
          id="tab-directory"
          onClick={() => setActiveSubTab('directory')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
            activeSubTab === 'directory'
              ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          Administrator Directory ({filteredAdmins.length})
        </button>
        <button
          id="tab-matrix"
          onClick={() => setActiveSubTab('matrix')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
            activeSubTab === 'matrix'
              ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          Role & Permission Matrix
        </button>
      </div>

      {/* DIRECTORY VIEW */}
      {activeSubTab === 'directory' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                id="search-admins-input"
                type="text"
                placeholder="Search administrators by name, email, department..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Status Filter */}
              <select
                id="filter-status-select"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-rose-500"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="suspended">Suspended Only</option>
                <option value="break_glass">Break-Glass Active</option>
              </select>

              {/* Role Filter */}
              <select
                id="filter-role-select"
                value={roleFilter}
                onChange={e => setRoleFilter(e.target.value as any)}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-rose-500"
              >
                <option value="all">All Roles</option>
                <option value="SUPER_ADMIN">Super Admin</option>
                <option value="PLATFORM_OPERATIONS">Operations</option>
                <option value="PLATFORM_BILLING">Billing</option>
                <option value="PLATFORM_SUPPORT">Support</option>
                <option value="PLATFORM_SECURITY">Security</option>
              </select>
            </div>
          </div>

          {/* Administrators Table */}
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-xs">
            {loading ? (
              <div className="p-12 text-center text-zinc-400 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
                <span className="text-xs">Loading platform administrators...</span>
              </div>
            ) : filteredAdmins.length === 0 ? (
              <div className="p-12 text-center text-zinc-400">
                <ShieldAlert className="w-8 h-8 mx-auto mb-2 text-zinc-300 dark:text-zinc-600" />
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">No platform administrators match your filter.</p>
                <p className="text-xs text-zinc-500 mt-1">Adjust your search query or clear active filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800 font-medium">
                    <tr>
                      <th className="py-3 px-4">Administrator</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Permissions</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Break-Glass</th>
                      <th className="py-3 px-4">Last Activity</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                    {filteredAdmins.map(admin => {
                      const roleStyle = ROLE_BADGE_STYLES[admin.role] || ROLE_BADGE_STYLES.PLATFORM_SUPPORT;
                      const isBgActive = admin.breakGlass?.status === 'active' &&
                        new Date(admin.breakGlass.expiresAt).getTime() > Date.now();
                      const isSelf = admin.uid === currentUid;

                      return (
                        <tr
                          key={admin.id}
                          className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition group cursor-pointer"
                          onClick={() => setSelectedAdmin(admin)}
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-800 flex items-center justify-center font-bold text-zinc-700 dark:text-zinc-200 text-xs shrink-0">
                                {admin.name.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                                  <span>{admin.name}</span>
                                  {isSelf && (
                                    <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                                      You
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                                  {admin.email}
                                  {admin.department ? ` • ${admin.department}` : ''}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${roleStyle.bg} ${roleStyle.text} ${roleStyle.border}`}>
                              {roleStyle.label}
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            <div className="text-[11px] text-zinc-600 dark:text-zinc-300 flex items-center gap-1">
                              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                                {admin.role === 'SUPER_ADMIN' ? 'All (Wildcard)' : `${admin.effectivePermissions?.length || 0} active`}
                              </span>
                              {admin.delegatedPermissions?.length > 0 && admin.role !== 'SUPER_ADMIN' && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60">
                                  +{admin.delegatedPermissions.length} delegated
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            {admin.status === 'active' ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-zinc-400"></span>
                                Suspended
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            {isBgActive ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60 animate-pulse">
                                <Flame className="w-3 h-3 text-amber-600" />
                                {formatTimeRemaining(admin.breakGlass!.expiresAt)}
                              </span>
                            ) : (
                              <span className="text-[11px] text-zinc-400">—</span>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            <div className="text-[11px] text-zinc-600 dark:text-zinc-400">
                              {admin.lastActiveAt ? new Date(admin.lastActiveAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Never'}
                            </div>
                            <div className="text-[10px] text-zinc-400 truncate max-w-[120px]">
                              {admin.lastAction || 'No recorded action'}
                            </div>
                          </td>

                          <td className="py-3 px-4 text-right" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => setSelectedAdmin(admin)}
                                title="View Details & Permissions"
                                className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                              >
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MATRIX VIEW */}
      {activeSubTab === 'matrix' && matrix && (
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 text-xs">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1 flex items-center gap-1.5">
              <Key className="w-4 h-4 text-rose-500" />
              Platform Role & Scoped Domain Hierarchy
            </h3>
            <p className="text-zinc-500 dark:text-zinc-400">
              MarkitHub enforces strict separation between platform administrators and tenant-level RBAC. Administrators have default permissions scoped to their functional roles, which can be augmented with granular delegated permissions.
            </p>
          </div>

          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-300 font-semibold border-b border-zinc-200 dark:border-zinc-800">
                  <tr>
                    <th className="py-3 px-4 min-w-[240px]">Platform Permission</th>
                    <th className="py-3 px-3 text-center">Super Admin</th>
                    <th className="py-3 px-3 text-center">Operations</th>
                    <th className="py-3 px-3 text-center">Billing</th>
                    <th className="py-3 px-3 text-center">Support</th>
                    <th className="py-3 px-3 text-center">Security</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                  {(Object.entries(permissionsByDomain) as [string, PermissionDef[]][]).map(([domain, perms]) => (
                    <React.Fragment key={domain}>
                      <tr className="bg-zinc-100/70 dark:bg-zinc-800/40 text-[11px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
                        <td colSpan={6} className="py-2 px-4">
                          {DOMAIN_LABELS[domain] || domain}
                        </td>
                      </tr>
                      {perms.map(p => {
                        const hasSuper = true;
                        const hasOps = matrix.roleDefaults.PLATFORM_OPERATIONS.includes(p.key);
                        const hasBilling = matrix.roleDefaults.PLATFORM_BILLING.includes(p.key);
                        const hasSupport = matrix.roleDefaults.PLATFORM_SUPPORT.includes(p.key);
                        const hasSecurity = matrix.roleDefaults.PLATFORM_SECURITY.includes(p.key);

                        return (
                          <tr key={p.key} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition">
                            <td className="py-2 px-4">
                              <div className="font-medium text-zinc-900 dark:text-zinc-100">{p.label}</div>
                              <div className="text-[10px] text-zinc-400 font-mono">{p.key}</div>
                            </td>

                            <td className="py-2 px-3 text-center">
                              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mx-auto" />
                            </td>

                            <td className="py-2 px-3 text-center">
                              {hasOps ? (
                                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mx-auto" />
                              ) : (
                                <span className="text-zinc-300 dark:text-zinc-700">—</span>
                              )}
                            </td>

                            <td className="py-2 px-3 text-center">
                              {hasBilling ? (
                                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mx-auto" />
                              ) : (
                                <span className="text-zinc-300 dark:text-zinc-700">—</span>
                              )}
                            </td>

                            <td className="py-2 px-3 text-center">
                              {hasSupport ? (
                                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mx-auto" />
                              ) : (
                                <span className="text-zinc-300 dark:text-zinc-700">—</span>
                              )}
                            </td>

                            <td className="py-2 px-3 text-center">
                              {hasSecurity ? (
                                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mx-auto" />
                              ) : (
                                <span className="text-zinc-300 dark:text-zinc-700">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL DRAWER / MODAL */}
      {selectedAdmin && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-end backdrop-blur-xs transition-opacity animate-in fade-in">
          <div className="w-full max-w-xl bg-white dark:bg-zinc-900 h-full shadow-2xl overflow-y-auto flex flex-col border-l border-zinc-200 dark:border-zinc-800">
            {/* Drawer Header */}
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between sticky top-0 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xs z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-bold flex items-center justify-center text-sm">
                  {selectedAdmin.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                    {selectedAdmin.name}
                    {selectedAdmin.uid === currentUid && (
                      <span className="text-[10px] font-normal px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600">
                        Current User
                      </span>
                    )}
                  </h2>
                  <p className="text-xs text-zinc-500">{selectedAdmin.email}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAdmin(null)}
                className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Break-Glass Active Banner */}
            {selectedAdmin.breakGlass?.status === 'active' &&
              new Date(selectedAdmin.breakGlass.expiresAt).getTime() > Date.now() && (
                <div className="p-3.5 bg-amber-500/10 border-b border-amber-300 dark:border-amber-700/60 text-amber-800 dark:text-amber-200 flex items-start gap-2.5 text-xs">
                  <Flame className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
                  <div className="flex-1">
                    <div className="font-bold flex items-center justify-between">
                      <span>Active Break-Glass Elevation ({selectedAdmin.breakGlass.elevatedRole})</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 font-mono">
                        {formatTimeRemaining(selectedAdmin.breakGlass.expiresAt)}
                      </span>
                    </div>
                    <div className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
                      Granted by {selectedAdmin.breakGlass.grantedByName || selectedAdmin.breakGlass.grantedByEmail}.
                    </div>
                    <div className="text-[11px] text-amber-600 dark:text-amber-400 italic mt-0.5">
                      &quot;{selectedAdmin.breakGlass.reason}&quot;
                    </div>
                    <button
                      onClick={() => {
                        setJustification('');
                        setShowRevokeBreakGlassModal(true);
                      }}
                      className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 dark:text-rose-400 hover:underline"
                    >
                      <Lock className="w-3 h-3" />
                      Revoke Elevation Now
                    </button>
                  </div>
                </div>
              )}

            {/* Drawer Body */}
            <div className="p-5 space-y-6 flex-1 text-xs">
              {/* Profile & Metadata Card */}
              <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-zinc-500" />
                    Identity & Metadata
                  </span>
                  <span className="text-[10px] text-zinc-400 font-mono">v{selectedAdmin.version}</span>
                </div>

                <div className="grid grid-cols-2 gap-2.5 text-[11px]">
                  <div>
                    <span className="text-zinc-400 block">UID</span>
                    <span className="font-mono text-zinc-700 dark:text-zinc-300 truncate block">
                      {selectedAdmin.uid}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-400 block">Department</span>
                    <span className="text-zinc-700 dark:text-zinc-300 font-medium">
                      {selectedAdmin.department || 'Unassigned'}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-400 block">Title</span>
                    <span className="text-zinc-700 dark:text-zinc-300 font-medium">
                      {selectedAdmin.title || 'Platform Member'}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-400 block">Created At</span>
                    <span className="text-zinc-700 dark:text-zinc-300">
                      {new Date(selectedAdmin.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Roles & Status Actions */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-zinc-500" />
                    Role & Status Controls
                  </h3>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    disabled={selectedAdmin.uid === currentUid}
                    onClick={() => {
                      setTargetRole(selectedAdmin.role);
                      setJustification('');
                      setShowRoleModal(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-xs font-medium disabled:opacity-50 transition"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-zinc-400" />
                    Change Role ({selectedAdmin.role})
                  </button>

                  <button
                    disabled={selectedAdmin.uid === currentUid}
                    onClick={() => {
                      setJustification('');
                      setShowStatusModal(true);
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition disabled:opacity-50 ${
                      selectedAdmin.status === 'active'
                        ? 'border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/20'
                        : 'border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/20'
                    }`}
                  >
                    {selectedAdmin.status === 'active' ? (
                      <>
                        <UserX className="w-3.5 h-3.5" />
                        Suspend Administrator
                      </>
                    ) : (
                      <>
                        <UserCheck className="w-3.5 h-3.5" />
                        Reactivate Administrator
                      </>
                    )}
                  </button>

                  <button
                    disabled={selectedAdmin.uid === currentUid || selectedAdmin.status === 'suspended'}
                    onClick={() => {
                      setBreakGlassForm({
                        elevatedRole: 'SUPER_ADMIN',
                        durationMinutes: 120,
                        justification: '',
                      });
                      setShowBreakGlassModal(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-800/80 bg-rose-50/50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 hover:bg-rose-100 text-xs font-semibold disabled:opacity-50 transition"
                  >
                    <Flame className="w-3.5 h-3.5 text-rose-500" />
                    Grant Break-Glass
                  </button>
                </div>

                {selectedAdmin.uid === currentUid && (
                  <p className="text-[11px] text-zinc-400 italic">
                    Self-protection invariant: you cannot modify your own role, status, or grant break-glass elevation to your own account.
                  </p>
                )}
              </div>

              {/* Fine-Grained Delegated Permissions */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-zinc-500" />
                      Delegated Granular Permissions
                    </h3>
                    <p className="text-[11px] text-zinc-500">
                      Scope permissions beyond the default role entitlements.
                    </p>
                  </div>
                  {selectedAdmin.role !== 'SUPER_ADMIN' && (
                    <button
                      disabled={selectedAdmin.uid === currentUid}
                      onClick={() => {
                        setSelectedPermissions([...selectedAdmin.delegatedPermissions]);
                        setJustification('');
                        setShowPermissionsModal(true);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-md bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 font-medium text-zinc-700 dark:text-zinc-300 transition"
                    >
                      <Edit3 className="w-3 h-3" />
                      Edit Permissions
                    </button>
                  )}
                </div>

                {selectedAdmin.role === 'SUPER_ADMIN' ? (
                  <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300 text-[11px]">
                    Super Admin role possesses unrestricted full platform wildcard privileges across all functional domains.
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-1.5">
                      {selectedAdmin.effectivePermissions?.map(perm => {
                        const isDelegated = selectedAdmin.delegatedPermissions.includes(perm);
                        return (
                          <span
                            key={perm}
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono border ${
                              isDelegated
                                ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700'
                            }`}
                          >
                            {perm}
                            {isDelegated && <span className="ml-1 text-[9px] font-sans font-bold">★</span>}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Activity & Access History */}
              <div className="space-y-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-zinc-500" />
                    Access & Audit Trail
                  </h3>
                  <span className="text-[10px] text-zinc-400">{activityHistory.length} events</span>
                </div>

                {loadingHistory ? (
                  <div className="p-6 text-center text-zinc-400">
                    <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1" />
                    Loading audit trail...
                  </div>
                ) : activityHistory.length === 0 ? (
                  <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-800/30 text-zinc-400 text-center text-xs">
                    No recent security events recorded for this administrator.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {activityHistory.map(item => (
                      <div
                        key={item.id}
                        className="p-2.5 rounded-lg border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-800/30 text-[11px]"
                      >
                        <div className="flex items-center justify-between font-semibold text-zinc-800 dark:text-zinc-200">
                          <span>{item.action}</span>
                          <span className="text-[10px] text-zinc-400 font-normal">
                            {item.timestamp ? new Date(item.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : ''}
                          </span>
                        </div>
                        <div className="text-zinc-500 dark:text-zinc-400 text-[10px] mt-0.5">
                          {item.details || 'Administrative mutation'}
                        </div>
                        <div className="text-zinc-400 text-[9px] mt-0.5">
                          Actor: {item.actorName || item.actorEmail || item.actorUid}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Danger Zone */}
              <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <div className="p-3.5 rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50/30 dark:bg-red-950/20 flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-red-900 dark:text-red-200 text-xs">Delete Administrator</h4>
                    <p className="text-[11px] text-red-700 dark:text-red-400">
                      Permanently revoke administrative credentials and remove directory listing.
                    </p>
                  </div>
                  <button
                    disabled={selectedAdmin.uid === currentUid}
                    onClick={() => {
                      setJustification('');
                      setShowDeleteModal(true);
                    }}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white transition disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Invite / Add Admin */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <h3 className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2 text-sm">
                <UserPlus className="w-4 h-4 text-rose-500" />
                Add Platform Administrator
              </h3>
              <button onClick={() => setShowInviteModal(false)} className="text-zinc-400 hover:text-zinc-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAdmin} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={inviteForm.email}
                    onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })}
                    placeholder="admin@markithub.internal"
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-1 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={inviteForm.name}
                    onChange={e => setInviteForm({ ...inviteForm, name: e.target.value })}
                    placeholder="Jane Doe"
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-1 focus:ring-rose-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">Platform Role *</label>
                  <select
                    value={inviteForm.role}
                    onChange={e => setInviteForm({ ...inviteForm, role: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                  >
                    <option value="PLATFORM_OPERATIONS">Platform Operations</option>
                    <option value="PLATFORM_BILLING">Platform Billing</option>
                    <option value="PLATFORM_SUPPORT">Platform Support</option>
                    <option value="PLATFORM_SECURITY">Platform Security</option>
                    <option value="SUPER_ADMIN">Super Administrator (Unrestricted)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">Department</label>
                  <input
                    type="text"
                    value={inviteForm.department}
                    onChange={e => setInviteForm({ ...inviteForm, department: e.target.value })}
                    placeholder="Infrastructure & Security"
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">Job Title</label>
                <input
                  type="text"
                  value={inviteForm.title}
                  onChange={e => setInviteForm({ ...inviteForm, title: e.target.value })}
                  placeholder="Senior Platform Engineer"
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Administrative Justification * (Immutable Audit Requirement)
                </label>
                <textarea
                  required
                  rows={2}
                  value={inviteForm.justification}
                  onChange={e => setInviteForm({ ...inviteForm, justification: e.target.value })}
                  placeholder="Specify ticket ID, business approval, or provisioning reasoning..."
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs hover:bg-zinc-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionPending}
                  className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {actionPending && <Loader2 className="w-3 h-3 animate-spin" />}
                  Create Administrator
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Break-Glass Elevation */}
      {showBreakGlassModal && selectedAdmin && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-200 dark:border-rose-900/60 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <h3 className="font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2 text-sm">
                <Flame className="w-4 h-4 text-rose-500 animate-pulse" />
                Emergency Break-Glass Elevation
              </h3>
              <button onClick={() => setShowBreakGlassModal(false)} className="text-zinc-400 hover:text-zinc-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              You are granting temporary elevated privileges to <strong className="text-zinc-900 dark:text-zinc-100">{selectedAdmin.name}</strong>. This event triggers high-severity audit alerts and automatically expires after the selected duration.
            </p>

            <form onSubmit={handleGrantBreakGlass} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">Elevated Target Role</label>
                <select
                  value={breakGlassForm.elevatedRole}
                  onChange={e => setBreakGlassForm({ ...breakGlassForm, elevatedRole: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                >
                  <option value="SUPER_ADMIN">Super Admin (All privileges)</option>
                  <option value="PLATFORM_SECURITY">Platform Security</option>
                  <option value="PLATFORM_OPERATIONS">Platform Operations</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">Elevation Duration</label>
                <select
                  value={breakGlassForm.durationMinutes}
                  onChange={e => setBreakGlassForm({ ...breakGlassForm, durationMinutes: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                >
                  <option value={30}>30 Minutes</option>
                  <option value={60}>1 Hour</option>
                  <option value={120}>2 Hours (Recommended standard)</option>
                  <option value={240}>4 Hours</option>
                  <option value={480}>8 Hours</option>
                  <option value={1440}>24 Hours (Maximum allowable)</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Emergency Justification * (Mandatory for Compliance)
                </label>
                <textarea
                  required
                  rows={3}
                  value={breakGlassForm.justification}
                  onChange={e => setBreakGlassForm({ ...breakGlassForm, justification: e.target.value })}
                  placeholder="Detail active incident ID, on-call paging reason, or emergency remediation justification..."
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowBreakGlassModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs hover:bg-zinc-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionPending}
                  className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {actionPending && <Loader2 className="w-3 h-3 animate-spin" />}
                  Authorize Break-Glass
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Revoke Break Glass */}
      {showRevokeBreakGlassModal && selectedAdmin && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-4">
            <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm flex items-center gap-2">
              <Lock className="w-4 h-4 text-rose-500" />
              Revoke Break-Glass Elevation
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Immediately revoke elevated emergency access for <strong className="text-zinc-900 dark:text-zinc-100">{selectedAdmin.name}</strong> and restore base role permissions.
            </p>

            <form onSubmit={handleRevokeBreakGlass} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">Revocation Reason *</label>
                <textarea
                  required
                  rows={2}
                  value={justification}
                  onChange={e => setJustification(e.target.value)}
                  placeholder="Incident resolved, emergency access no longer required..."
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowRevokeBreakGlassModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionPending}
                  className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {actionPending && <Loader2 className="w-3 h-3 animate-spin" />}
                  Revoke Elevation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Change Role */}
      {showRoleModal && selectedAdmin && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-4">
            <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm flex items-center gap-2">
              <Shield className="w-4 h-4 text-rose-500" />
              Change Platform Role for {selectedAdmin.name}
            </h3>

            <form onSubmit={handleAssignRole} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">New Role</label>
                <select
                  value={targetRole}
                  onChange={e => setTargetRole(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                >
                  <option value="PLATFORM_OPERATIONS">Platform Operations</option>
                  <option value="PLATFORM_BILLING">Platform Billing</option>
                  <option value="PLATFORM_SUPPORT">Platform Support</option>
                  <option value="PLATFORM_SECURITY">Platform Security</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">Reason for Role Change *</label>
                <textarea
                  required
                  rows={2}
                  value={justification}
                  onChange={e => setJustification(e.target.value)}
                  placeholder="Specify governance approval or internal role transition..."
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowRoleModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionPending}
                  className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {actionPending && <Loader2 className="w-3 h-3 animate-spin" />}
                  Confirm Role Change
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Edit Granular Permissions */}
      {showPermissionsModal && selectedAdmin && matrix && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-500" />
                Delegated Permissions for {selectedAdmin.name}
              </h3>
              <button onClick={() => setShowPermissionsModal(false)} className="text-zinc-400 hover:text-zinc-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdatePermissions} className="space-y-4 text-xs flex-1 overflow-hidden flex flex-col">
              <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                {(Object.entries(permissionsByDomain) as [string, PermissionDef[]][]).map(([domain, perms]) => (
                  <div key={domain} className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-850">
                    <h4 className="font-bold text-zinc-800 dark:text-zinc-200 text-xs uppercase tracking-wider mb-2">
                      {DOMAIN_LABELS[domain] || domain}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {perms.map(p => {
                        const isDefault = matrix.roleDefaults[selectedAdmin.role]?.includes(p.key);
                        const isChecked = selectedPermissions.includes(p.key);

                        return (
                          <label
                            key={p.key}
                            className={`flex items-start gap-2 p-2 rounded-lg border text-left cursor-pointer transition ${
                              isDefault
                                ? 'bg-zinc-100/70 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700 opacity-60'
                                : isChecked
                                ? 'bg-indigo-50/60 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-700'
                                : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700'
                            }`}
                          >
                            <input
                              type="checkbox"
                              disabled={isDefault}
                              checked={isDefault || isChecked}
                              onChange={e => {
                                if (e.target.checked) {
                                  setSelectedPermissions([...selectedPermissions, p.key]);
                                } else {
                                  setSelectedPermissions(selectedPermissions.filter(k => k !== p.key));
                                }
                              }}
                              className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                            />
                            <div>
                              <div className="font-semibold text-zinc-900 dark:text-zinc-100 text-[11px] flex items-center gap-1">
                                {p.label}
                                {isDefault && <span className="text-[9px] text-zinc-400 font-normal">(Default)</span>}
                              </div>
                              <div className="text-[10px] text-zinc-500">{p.description}</div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">Administrative Justification *</label>
                <textarea
                  required
                  rows={2}
                  value={justification}
                  onChange={e => setJustification(e.target.value)}
                  placeholder="Delegation approval ticket or business need..."
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowPermissionsModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionPending}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {actionPending && <Loader2 className="w-3 h-3 animate-spin" />}
                  Save Delegated Permissions
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Suspend / Reactivate */}
      {showStatusModal && selectedAdmin && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 space-y-4">
            <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm flex items-center gap-2">
              {selectedAdmin.status === 'active' ? (
                <>
                  <UserX className="w-4 h-4 text-amber-500" />
                  Suspend Administrator {selectedAdmin.name}
                </>
              ) : (
                <>
                  <UserCheck className="w-4 h-4 text-emerald-500" />
                  Reactivate Administrator {selectedAdmin.name}
                </>
              )}
            </h3>

            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              {selectedAdmin.status === 'active'
                ? 'Suspension immediately terminates active sessions and blocks all platform access.'
                : 'Reactivation restores the administrator’s role and assigned permissions immediately.'}
            </p>

            <form onSubmit={handleToggleStatus} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">Administrative Justification *</label>
                <textarea
                  required
                  rows={2}
                  value={justification}
                  onChange={e => setJustification(e.target.value)}
                  placeholder="Security hold, offboarding, leave of absence, or reinstatement..."
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowStatusModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionPending}
                  className={`px-4 py-1.5 rounded-lg text-white font-semibold text-xs transition disabled:opacity-50 inline-flex items-center gap-1.5 ${
                    selectedAdmin.status === 'active' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  {actionPending && <Loader2 className="w-3 h-3 animate-spin" />}
                  Confirm {selectedAdmin.status === 'active' ? 'Suspension' : 'Reactivation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Delete Admin */}
      {showDeleteModal && selectedAdmin && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-red-200 dark:border-red-900/60 space-y-4">
            <h3 className="font-bold text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-red-500" />
              Delete Platform Administrator
            </h3>

            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Are you sure you want to permanently delete <strong className="text-zinc-900 dark:text-zinc-100">{selectedAdmin.name}</strong> ({selectedAdmin.email})? This action cannot be undone. Last-super-admin protection prevents removal if this is the final active Super Admin.
            </p>

            <form onSubmit={handleDeleteAdmin} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-zinc-700 dark:text-zinc-300 mb-1">Reason for Deletion *</label>
                <textarea
                  required
                  rows={2}
                  value={justification}
                  onChange={e => setJustification(e.target.value)}
                  placeholder="Offboarding or credential revocation confirmation..."
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionPending}
                  className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-xs transition disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {actionPending && <Loader2 className="w-3 h-3 animate-spin" />}
                  Permanently Delete
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
