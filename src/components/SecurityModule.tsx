import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { StaffMember, AuditLog, StaffStatus, AuditFilterParams, AuditSecurityMetrics } from '../types';
import UserManagementModule from './UserManagementModule';
import AuditSecurityOverview from './security/AuditSecurityOverview';
import AuditEventTable from './security/AuditEventTable';
import AuditEventDetailsDrawer from './security/AuditEventDetailsDrawer';
import { fetchTenantAuditLogs } from '../services/auditApiService';
import { hasPermission, isTenantOwner } from '../utils/permissions';
import { 
  Shield, Activity, Users, ShieldAlert, RefreshCw, 
  CheckCircle2, Lock, AlertTriangle, ChevronRight,
  Database
} from 'lucide-react';

export interface SecurityModuleProps {
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

export type SecurityMainTab = 'telemetry' | 'staff';

/**
 * Client-side fallback metric calculator when running in mock / offline environment
 */
function computeFallbackMetrics(logs: AuditLog[]): AuditSecurityMetrics {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const weekStart = todayStart - 6 * 24 * 60 * 60 * 1000;

  let eventsToday = 0;
  let eventsThisWeek = 0;
  let staffSuspensions = 0;
  let rolePermissionChanges = 0;
  let ownershipEvents = 0;
  let failedDeniedOperations = 0;

  for (const log of logs) {
    const ts = new Date(log.timestamp).getTime();
    if (!isNaN(ts)) {
      if (ts >= todayStart) eventsToday++;
      if (ts >= weekStart) eventsThisWeek++;
    }

    const action = (log.action || '').toUpperCase();
    const result = log.result || '';

    if (action.includes('SUSPEND') || action.includes('LOCK')) {
      staffSuspensions++;
    }
    if (action.includes('ROLE') || action.includes('PERMISSION')) {
      rolePermissionChanges++;
    }
    if (action.includes('OWNER')) {
      ownershipEvents++;
    }
    if (result === 'failed' || result === 'denied' || action.includes('DENIED') || action.includes('FAILED')) {
      failedDeniedOperations++;
    }
  }

  return {
    eventsToday,
    eventsThisWeek,
    staffSuspensions,
    rolePermissionChanges,
    ownershipEvents,
    failedDeniedOperations,
  };
}

export default function SecurityModule(props: SecurityModuleProps) {
  const {
    staffMembers,
    auditLogs: initialAuditLogs,
    activeStaff,
    tenantOwnerUid,
    tenantOwnerId
  } = props;

  const effectiveOwnerUid = tenantOwnerUid || tenantOwnerId;
  const canViewAudit = hasPermission(activeStaff, 'users.audit') || isTenantOwner(activeStaff, effectiveOwnerUid);

  // Tab mode
  const [activeTab, setActiveTab] = useState<SecurityMainTab>('telemetry');

  // Audit Logs state
  const [logs, setLogs] = useState<AuditLog[]>(initialAuditLogs || []);
  const [totalCount, setTotalCount] = useState<number>((initialAuditLogs || []).length);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLiveBackend, setIsLiveBackend] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Drawer detail selection
  const [selectedEvent, setSelectedEvent] = useState<AuditLog | null>(null);

  // Filter state
  const [filters, setFilters] = useState<AuditFilterParams>({
    page: 1,
    pageSize: 25,
  });
  const [activePreset, setActivePreset] = useState<'suspensions' | 'roles' | 'ownership' | 'failed' | 'all' | undefined>(undefined);

  // Authoritative Security Metrics
  const [metrics, setMetrics] = useState<AuditSecurityMetrics>(() => computeFallbackMetrics(initialAuditLogs || []));

  // Sync with props if initialAuditLogs changes and not yet live
  useEffect(() => {
    if (!isLiveBackend && initialAuditLogs) {
      setLogs(initialAuditLogs);
      setTotalCount(initialAuditLogs.length);
      setMetrics(computeFallbackMetrics(initialAuditLogs));
    }
  }, [initialAuditLogs, isLiveBackend]);

  // Load authoritative audit logs from backend
  const loadAuditLogs = useCallback(async (currentFilters: AuditFilterParams, page: number, size: number) => {
    if (!canViewAudit) return;
    setIsLoading(true);
    setLoadError(null);

    try {
      const res = await fetchTenantAuditLogs({
        ...currentFilters,
        page,
        pageSize: size,
      });

      if (res && res.success) {
        setLogs(res.events);
        setTotalCount(res.totalCount);
        setTotalPages(res.totalPages);
        setMetrics(res.metrics);
        setIsLiveBackend(true);
      } else {
        throw new Error('Could not retrieve audit telemetry');
      }
    } catch (err: any) {
      // Fallback to client-side filtering over initialAuditLogs
      setIsLiveBackend(false);
      setLoadError(err?.message || 'Running in local sandbox mode');

      let filtered = [...(initialAuditLogs || [])];
      if (currentFilters.module && currentFilters.module !== 'All') {
        filtered = filtered.filter(l => l.module === currentFilters.module);
      }
        if (currentFilters.action) {
          filtered = filtered.filter(l => l.action.toLowerCase().includes(currentFilters.action!.toLowerCase()));
        }
        if (currentFilters.result && currentFilters.result !== 'All') {
          filtered = filtered.filter(l => (l.result || 'success') === currentFilters.result);
        }
        if (currentFilters.severity && currentFilters.severity !== 'All') {
          filtered = filtered.filter(l => l.severity === currentFilters.severity);
        }
        if (currentFilters.search) {
          const q = currentFilters.search.toLowerCase();
          filtered = filtered.filter(l => 
            l.action.toLowerCase().includes(q) ||
            (l.actorName && l.actorName.toLowerCase().includes(q)) ||
            (l.actorEmail && l.actorEmail.toLowerCase().includes(q)) ||
            (l.targetName && l.targetName.toLowerCase().includes(q)) ||
            (l.details && l.details.toLowerCase().includes(q))
          );
        }

        const computed = computeFallbackMetrics(initialAuditLogs || []);
        setMetrics(computed);
        setTotalCount(filtered.length);
        setTotalPages(Math.ceil(filtered.length / size) || 1);

      const startIndex = (page - 1) * size;
      setLogs(filtered.slice(startIndex, startIndex + size));
    } finally {
      setIsLoading(false);
    }
  }, [canViewAudit, initialAuditLogs]);

  // Initial load
  useEffect(() => {
    if (canViewAudit) {
      loadAuditLogs(filters, currentPage, pageSize);
    }
  }, [canViewAudit, filters, currentPage, pageSize, loadAuditLogs]);

  // Handle Preset Click from KPI cards
  const handleFilterPreset = (preset: 'suspensions' | 'roles' | 'ownership' | 'failed' | 'all') => {
    setActivePreset(preset);
    setCurrentPage(1);

    if (preset === 'suspensions') {
      setFilters(prev => ({ ...prev, module: 'User Management', search: 'SUSPEND' }));
    } else if (preset === 'roles') {
      setFilters(prev => ({ ...prev, module: 'User Management', search: 'ROLE' }));
    } else if (preset === 'ownership') {
      setFilters(prev => ({ ...prev, module: undefined, search: 'OWNER' }));
    } else if (preset === 'failed') {
      setFilters(prev => ({ ...prev, result: 'denied', search: undefined }));
    } else {
      setFilters({ page: 1, pageSize });
    }
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  const handleFiltersChange = (newFilters: AuditFilterParams) => {
    setFilters(newFilters);
    setCurrentPage(1);
    setActivePreset(undefined);
  };

  const handleRefresh = () => {
    loadAuditLogs(filters, currentPage, pageSize);
  };

  return (
    <div className="space-y-6 pb-12" id="security-admin-module">
      {/* Top Banner & Tab Navigation */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-slate-900 to-indigo-900 text-white flex items-center justify-center shadow-md shadow-indigo-950/20 shrink-0">
              <Shield className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Security & Audit Administration
                </h1>
                <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200/60 rounded-full text-[11px] font-bold tracking-wide">
                  Tenant Governance
                </span>
                {isLiveBackend && (
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Server Stream
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Authoritative multi-tenant audit telemetry, immutable security logs, and role-based staff identity management.
              </p>
            </div>
          </div>

          {/* Module Mode Switcher */}
          <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shrink-0 self-start lg:self-auto">
            <button
              onClick={() => setActiveTab('telemetry')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                activeTab === 'telemetry'
                  ? 'bg-white text-slate-900 shadow-xs shadow-slate-300'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
              id="tab-security-telemetry"
            >
              <Activity className="w-4 h-4 text-indigo-600" />
              <span>Audit & Telemetry</span>
              <span className="ml-1 px-1.5 py-0.2 bg-indigo-50 text-indigo-700 rounded-full text-[10px] font-extrabold">
                {totalCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('staff')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                activeTab === 'staff'
                  ? 'bg-white text-slate-900 shadow-xs shadow-slate-300'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
              id="tab-staff-governance"
            >
              <Users className="w-4 h-4 text-slate-600" />
              <span>Staff Identity & Roster</span>
              <span className="ml-1 px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded-full text-[10px] font-extrabold">
                {staffMembers.length}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'telemetry' ? (
        <div className="space-y-6">
          {/* Authorization Check */}
          {!canViewAudit ? (
            <div className="bg-rose-50 border border-rose-200 rounded-3xl p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-rose-900">Privileged Security Telemetry Restricted</h3>
              <p className="text-xs text-rose-700 max-w-md mx-auto">
                Your current role <span className="font-bold">({activeStaff.role})</span> lacks the <code className="bg-rose-100 px-1 py-0.5 rounded font-mono text-[11px]">users.audit</code> permission. Only authorized administrators and tenant owners can access authoritative audit trails.
              </p>
              <button
                onClick={() => setActiveTab('staff')}
                className="mt-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all"
              >
                Go to Staff Roster
              </button>
            </div>
          ) : (
            <>
              {/* Telemetry Overview KPI Cards */}
              <AuditSecurityOverview
                metrics={metrics}
                onFilterPreset={handleFilterPreset}
                activePreset={activePreset}
              />

              {/* Server connection fallback banner if offline */}
              {!isLiveBackend && loadError && (
                <div className="flex items-center justify-between p-3.5 bg-amber-50/80 border border-amber-200 rounded-2xl text-xs text-amber-800">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      <strong>Local Telemetry View:</strong> Using memory audit records. Authenticated live endpoint:{' '}
                      <code className="bg-amber-100 px-1.5 py-0.5 rounded text-[11px]">GET /api/tenant/audit</code>.
                    </span>
                  </div>
                  <button
                    onClick={handleRefresh}
                    disabled={isLoading}
                    className="flex items-center gap-1.5 px-3 py-1 bg-amber-200/80 hover:bg-amber-300 text-amber-900 rounded-xl font-bold transition-all shrink-0 text-[11px]"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                    Retry Server Connection
                  </button>
                </div>
              )}

              {/* Audit Event Table */}
              <AuditEventTable
                events={logs}
                totalCount={totalCount}
                currentPage={currentPage}
                pageSize={pageSize}
                totalPages={totalPages}
                isLoading={isLoading}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
                filters={filters}
                onFiltersChange={handleFiltersChange}
                onRefresh={handleRefresh}
                onSelectEvent={setSelectedEvent}
              />

              {/* Event Details Drawer */}
              <AuditEventDetailsDrawer
                isOpen={Boolean(selectedEvent)}
                event={selectedEvent}
                onClose={() => setSelectedEvent(null)}
              />
            </>
          )}
        </div>
      ) : (
        /* Staff Governance & Roster (Full UserManagementModule embedded) */
        <UserManagementModule {...props} />
      )}
    </div>
  );
}
