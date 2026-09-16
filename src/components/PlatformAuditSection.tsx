import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  AlertOctagon,
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Code,
  Download,
  ExternalLink,
  Eye,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Filter,
  Flame,
  Hash,
  HelpCircle,
  Info,
  Key,
  Layers,
  Link as LinkIcon,
  Loader2,
  Lock,
  RefreshCw,
  Search,
  Server,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Tag,
  Terminal,
  User,
  X,
} from 'lucide-react';
import { getAuth } from 'firebase/auth';

export type AuditSeverity = 'info' | 'warning' | 'critical';
export type AuditResult = 'success' | 'denied' | 'failed';
export type AuditCategory = 'ADMIN_ACTION' | 'SECURITY_EVENT' | 'SYSTEM_ACTION' | 'AUTOMATED_ACTION';
export type AuditIntegrityStatus = 'VALID' | 'INVALID' | 'UNVERIFIED';

export interface PlatformAuditEvent {
  id: string;
  auditId: string;
  timestamp: string;
  actorUid: string;
  actorEmail: string | null;
  actorName: string;
  actorRole: string;
  tenantId?: string | null;
  tenantName?: string | null;
  module: string;
  action: string;
  targetType?: string;
  targetId?: string;
  targetName?: string;
  severity: AuditSeverity;
  result: AuditResult;
  category: AuditCategory;
  reason?: string;
  details: string;
  previousState?: Record<string, unknown> | string | null;
  newState?: Record<string, unknown> | string | null;
  metadata?: Record<string, unknown>;
  correlationId?: string;
  requestId?: string;
  source?: string;
  integrityHash?: string;
  integrityStatus?: AuditIntegrityStatus;
  verifiedAt?: string;
}

export interface PlatformAuditSummary {
  eventsToday: number;
  eventsThisWeek: number;
  eventsThisMonth: number;
  administrativeActions: number;
  securityEvents: number;
  automatedActions: number;
  failedActions: number;
  deniedActions: number;
  lifecycleChanges: number;
  billingChanges: number;
  planChanges: number;
  permissionChanges: number;
  platformAdminChanges: number;
  breakGlassEvents: number;
  governanceChanges: number;
  alertActions: number;
  integrityFailures: number;
}

export interface ComplianceReport {
  generatedAt: string;
  reportingPeriod: {
    start: string;
    end: string;
  };
  totalAdministrativeEvents: number;
  privilegedActions: number;
  failedDeniedOperations: number;
  breakGlassActivity: number;
  platformAdminLifecycleChanges: number;
  permissionChanges: number;
  governanceConfigurationChanges: number;
  tenantLifecycleChanges: number;
  billingChanges: number;
  integrityVerificationResults: {
    verifiedCount: number;
    validCount: number;
    invalidCount: number;
    unverifiedCount: number;
  };
  unresolvedSecurityEvents: number;
  eventCategorization: {
    systemFactsCount: number;
    adminActionsCount: number;
    automatedActionsCount: number;
    securityEventsCount: number;
  };
  retentionPolicy: {
    auditRetentionDays: number;
    auditExportEnabled: boolean;
    integrityVerificationEnabled: boolean;
    immutableLedgerEnforced: boolean;
  };
}

const SEVERITY_BADGES: Record<AuditSeverity, { bg: string; text: string; border: string; label: string }> = {
  info: {
    bg: 'bg-slate-100 dark:bg-slate-800',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-200 dark:border-slate-700',
    label: 'Info',
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800',
    label: 'Warning',
  },
  critical: {
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-200 dark:border-rose-800',
    label: 'Critical',
  },
};

const RESULT_BADGES: Record<AuditResult, { bg: string; text: string; label: string }> = {
  success: {
    bg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    text: 'text-emerald-600',
    label: 'Success',
  },
  denied: {
    bg: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    text: 'text-amber-600',
    label: 'Denied',
  },
  failed: {
    bg: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    text: 'text-rose-600',
    label: 'Failed',
  },
};

const CATEGORY_STYLES: Record<AuditCategory, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  ADMIN_ACTION: {
    label: 'Admin Mutation',
    color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800',
    icon: User,
  },
  SECURITY_EVENT: {
    label: 'Security Event',
    color: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800',
    icon: ShieldAlert,
  },
  SYSTEM_ACTION: {
    label: 'System Action',
    color: 'text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800',
    icon: Server,
  },
  AUTOMATED_ACTION: {
    label: 'Automated Job',
    color: 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800',
    icon: Terminal,
  },
};

export default function PlatformAuditSection() {
  const [activeTab, setActiveTab] = useState<'timeline' | 'search' | 'integrity' | 'compliance'>('timeline');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Authoritative Summary
  const [summary, setSummary] = useState<PlatformAuditSummary | null>(null);

  // Events list & pagination
  const [events, setEvents] = useState<PlatformAuditEvent[]>([]);
  const [totalEvents, setTotalEvents] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalPages, setTotalPages] = useState(1);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'all' | AuditSeverity>('all');
  const [resultFilter, setResultFilter] = useState<'all' | AuditResult>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | AuditCategory>('all');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [actorQuery, setActorQuery] = useState('');
  const [tenantFilter, setTenantFilter] = useState('');

  // Drawers & Modals
  const [selectedEvent, setSelectedEvent] = useState<PlatformAuditEvent | null>(null);
  const [correlatedEvents, setCorrelatedEvents] = useState<PlatformAuditEvent[]>([]);
  const [correlatedId, setCorrelatedId] = useState<string | null>(null);
  const [loadingCorrelated, setLoadingCorrelated] = useState(false);

  // Integrity Check state
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [integrityResults, setIntegrityResults] = useState<Record<string, { valid: boolean; status: AuditIntegrityStatus; calculatedHash: string; storedHash?: string | null; details?: string }>>({});

  // Export modal state
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportReason, setExportReason] = useState('Quarterly compliance and SOC-2 audit review');
  const [exporting, setExporting] = useState(false);

  // Compliance Report state
  const [complianceReport, setComplianceReport] = useState<ComplianceReport | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);

  const auth = getAuth();

  const flashSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  const authFetch = useCallback(
    async (url: string, options: RequestInit = {}) => {
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
    },
    [auth]
  );

  // Fetch Summary
  const fetchSummary = useCallback(async () => {
    try {
      const res = await authFetch('/api/platform/audit/summary');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.summary) {
          setSummary(data.summary);
        }
      }
    } catch {
      // Non-blocking summary fetch
    }
  }, [authFetch]);

  // Fetch Events with current filters
  const fetchEvents = useCallback(
    async (pageToLoad = currentPage, isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          page: String(pageToLoad),
          pageSize: String(pageSize),
        });

        if (searchQuery.trim()) params.append('search', searchQuery.trim());
        if (severityFilter !== 'all') params.append('severity', severityFilter);
        if (resultFilter !== 'all') params.append('result', resultFilter);
        if (categoryFilter !== 'all') params.append('category', categoryFilter);
        if (moduleFilter !== 'all') params.append('module', moduleFilter);
        if (startDate) params.append('startDate', new Date(startDate).toISOString());
        if (endDate) params.append('endDate', new Date(endDate).toISOString());
        if (actorQuery.trim()) params.append('actorEmail', actorQuery.trim());
        if (tenantFilter.trim()) params.append('tenantId', tenantFilter.trim());

        const res = await authFetch(`/api/platform/audit?${params.toString()}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Failed to fetch audit events.');
        }

        if (data.success) {
          setEvents(data.events || []);
          setTotalEvents(data.total || 0);
          setTotalPages(data.totalPages || 1);
          setCurrentPage(data.page || 1);
        }
      } catch (err: any) {
        setError(err.message || 'An error occurred while loading audit events.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      authFetch,
      currentPage,
      pageSize,
      searchQuery,
      severityFilter,
      resultFilter,
      categoryFilter,
      moduleFilter,
      startDate,
      endDate,
      actorQuery,
      tenantFilter,
    ]
  );

  // Fetch Compliance Report
  const fetchComplianceReport = useCallback(async () => {
    setLoadingReport(true);
    try {
      const res = await authFetch('/api/platform/audit/compliance-report');
      const data = await res.json();
      if (res.ok && data.success) {
        setComplianceReport(data.report);
      } else {
        throw new Error(data.error || 'Failed to generate compliance report.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingReport(false);
    }
  }, [authFetch]);

  // Initial load
  useEffect(() => {
    fetchSummary();
    fetchEvents(1);
  }, [fetchSummary, fetchEvents]);

  // Handle Tab Switch
  useEffect(() => {
    if (activeTab === 'compliance' && !complianceReport && !loadingReport) {
      fetchComplianceReport();
    }
  }, [activeTab, complianceReport, loadingReport, fetchComplianceReport]);

  // Verify single audit integrity
  const handleVerifyIntegrity = async (auditId: string) => {
    setVerifyingId(auditId);
    try {
      const res = await authFetch(`/api/platform/audit/${auditId}/verify-integrity`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to verify audit record.');
      }

      setIntegrityResults((prev) => ({
        ...prev,
        [auditId]: {
          valid: data.valid,
          status: data.status,
          calculatedHash: data.calculatedHash,
          storedHash: data.storedHash,
          details: data.details,
        },
      }));

      // Update in local state
      setEvents((prev) =>
        prev.map((ev) => (ev.id === auditId ? { ...ev, integrityStatus: data.status, verifiedAt: data.verifiedAt } : ev))
      );
      if (selectedEvent && selectedEvent.id === auditId) {
        setSelectedEvent((prev) => (prev ? { ...prev, integrityStatus: data.status, verifiedAt: data.verifiedAt } : null));
      }

      if (data.valid) {
        flashSuccess(`Integrity signature valid for record ${auditId.slice(0, 12)}...`);
      } else {
        setError(`Tamper detected on record ${auditId}! Platform alert generated.`);
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed.');
    } finally {
      setVerifyingId(null);
    }
  };

  // Open Correlated Drawer
  const handleOpenCorrelated = async (event: PlatformAuditEvent) => {
    const correlationKey = event.correlationId || event.requestId || event.id;
    setCorrelatedId(correlationKey);
    setLoadingCorrelated(true);
    try {
      const res = await authFetch('/api/platform/audit/correlate', {
        method: 'POST',
        body: JSON.stringify({
          correlationId: event.correlationId,
          requestId: event.requestId,
          auditId: event.id,
          targetId: event.targetId,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCorrelatedEvents(data.relatedEvents || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load correlated events.');
    } finally {
      setLoadingCorrelated(false);
    }
  };

  // Handle CSV Export
  const handleExportCsv = async () => {
    if (!exportReason || exportReason.trim().length < 5) {
      setError('A valid audit export justification reason is mandatory (min 5 chars).');
      return;
    }

    setExporting(true);
    try {
      const filters = {
        search: searchQuery.trim() || undefined,
        severity: severityFilter !== 'all' ? severityFilter : undefined,
        result: resultFilter !== 'all' ? resultFilter : undefined,
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
        module: moduleFilter !== 'all' ? moduleFilter : undefined,
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        endDate: endDate ? new Date(endDate).toISOString() : undefined,
        actorEmail: actorQuery.trim() || undefined,
        tenantId: tenantFilter.trim() || undefined,
      };

      const res = await authFetch('/api/platform/audit/export', {
        method: 'POST',
        body: JSON.stringify({
          filters,
          format: 'csv',
          reason: exportReason.trim(),
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Export failed.');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `platform-audit-export-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setShowExportModal(false);
      flashSuccess('Authoritative audit dataset exported and PLATFORM_AUDIT_EXPORTED log recorded.');
      fetchSummary();
    } catch (err: any) {
      setError(err.message || 'Failed to export audit dataset.');
    } finally {
      setExporting(false);
    }
  };

  // Unique modules in current events for filter dropdown
  const availableModules = useMemo(() => {
    const set = new Set<string>();
    for (const e of events) {
      if (e.module) set.add(e.module);
    }
    return Array.from(set).sort();
  }, [events]);

  return (
    <div className="space-y-6">
      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                Audit, Compliance & Governance Center
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Server-authoritative, tamper-evident audit ledger and regulatory compliance stream
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            id="audit-export-trigger-btn"
            type="button"
            onClick={() => setShowExportModal(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <Download className="h-4 w-4 text-slate-500" />
            Export Compliance CSV
          </button>
          <button
            id="audit-refresh-btn"
            type="button"
            onClick={() => {
              fetchSummary();
              fetchEvents(currentPage, true);
            }}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh Feed'}
          </button>
        </div>
      </div>

      {/* FEEDBACK ALERTS */}
      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
          <div className="flex-1 font-medium">{error}</div>
          <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <div className="flex-1 font-medium">{successMessage}</div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-500 hover:text-emerald-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* AUTHORITATIVE SUMMARY METRICS */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Events Today</div>
            <div className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {summary.eventsToday.toLocaleString()}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              {summary.eventsThisMonth.toLocaleString()} this month
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Admin Mutations</div>
            <div className="mt-1 text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400">
              {summary.administrativeActions.toLocaleString()}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              {summary.platformAdminChanges} admin identity ops
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Security Events</div>
            <div className="mt-1 text-2xl font-bold tracking-tight text-purple-600 dark:text-purple-400">
              {summary.securityEvents.toLocaleString()}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              {summary.breakGlassEvents} break-glass elevations
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Denied / Failed</div>
            <div className="mt-1 text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
              {(summary.deniedActions + summary.failedActions).toLocaleString()}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              {summary.deniedActions} denied &bull; {summary.failedActions} failed
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Automated Jobs</div>
            <div className="mt-1 text-2xl font-bold tracking-tight text-teal-600 dark:text-teal-400">
              {summary.automatedActions.toLocaleString()}
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              {summary.alertActions} operational sweeps
            </div>
          </div>

          <div
            className={`rounded-2xl border p-4 shadow-sm transition ${
              summary.integrityFailures > 0
                ? 'border-rose-300 bg-rose-50/70 text-rose-900 dark:border-rose-800 dark:bg-rose-950/40'
                : 'border-emerald-200 bg-emerald-50/50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/20'
            }`}
          >
            <div className="text-[11px] font-medium uppercase tracking-wider opacity-80">Tamper Status</div>
            <div className="mt-1 flex items-center gap-1.5 text-2xl font-bold tracking-tight">
              {summary.integrityFailures > 0 ? (
                <>
                  <AlertOctagon className="h-6 w-6 text-rose-600 animate-pulse" />
                  <span>{summary.integrityFailures} Failures</span>
                </>
              ) : (
                <>
                  <CheckCircle className="h-6 w-6 text-emerald-600" />
                  <span>Ledger Clean</span>
                </>
              )}
            </div>
            <div className="mt-1 text-[11px] opacity-75">SHA-256 tamper-evident check</div>
          </div>
        </div>
      )}

      {/* SUB-TABS NAVIGATION */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          id="audit-tab-timeline"
          type="button"
          onClick={() => setActiveTab('timeline')}
          className={`inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition ${
            activeTab === 'timeline'
              ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Activity className="h-4 w-4" />
          Live Audit Stream
        </button>

        <button
          id="audit-tab-search"
          type="button"
          onClick={() => setActiveTab('search')}
          className={`inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition ${
            activeTab === 'search'
              ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Filter className="h-4 w-4" />
          Advanced Search & Filter
        </button>

        <button
          id="audit-tab-integrity"
          type="button"
          onClick={() => setActiveTab('integrity')}
          className={`inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition ${
            activeTab === 'integrity'
              ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Lock className="h-4 w-4" />
          Cryptographic Integrity
        </button>

        <button
          id="audit-tab-compliance"
          type="button"
          onClick={() => setActiveTab('compliance')}
          className={`inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition ${
            activeTab === 'compliance'
              ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <FileCheck className="h-4 w-4" />
          Compliance & SOC-2 Report
        </button>
      </div>

      {/* FILTER CONTROLS BAR (Shown in Timeline & Search tabs) */}
      {(activeTab === 'timeline' || activeTab === 'search') && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-3">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                id="audit-search-input"
                type="text"
                placeholder="Search by action, actor, reason, correlation ID, target..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') fetchEvents(1);
                }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-xs text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500 dark:focus:border-slate-400"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                id="audit-filter-severity"
                value={severityFilter}
                onChange={(e) => {
                  setSeverityFilter(e.target.value as any);
                }}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                <option value="all">All Severities</option>
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
              </select>

              <select
                id="audit-filter-result"
                value={resultFilter}
                onChange={(e) => {
                  setResultFilter(e.target.value as any);
                }}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                <option value="all">All Results</option>
                <option value="success">Success</option>
                <option value="denied">Denied</option>
                <option value="failed">Failed</option>
              </select>

              <select
                id="audit-filter-category"
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value as any);
                }}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                <option value="all">All Categories</option>
                <option value="ADMIN_ACTION">Admin Actions</option>
                <option value="SECURITY_EVENT">Security Events</option>
                <option value="SYSTEM_ACTION">System Facts</option>
                <option value="AUTOMATED_ACTION">Automated Actions</option>
              </select>

              {availableModules.length > 0 && (
                <select
                  id="audit-filter-module"
                  value={moduleFilter}
                  onChange={(e) => setModuleFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  <option value="all">All Modules</option>
                  {availableModules.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              )}

              <button
                id="audit-filter-apply-btn"
                type="button"
                onClick={() => fetchEvents(1)}
                className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
              >
                Filter
              </button>

              {(searchQuery || severityFilter !== 'all' || resultFilter !== 'all' || categoryFilter !== 'all' || moduleFilter !== 'all' || startDate || endDate || actorQuery || tenantFilter) && (
                <button
                  id="audit-filter-reset-btn"
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSeverityFilter('all');
                    setResultFilter('all');
                    setCategoryFilter('all');
                    setModuleFilter('all');
                    setStartDate('');
                    setEndDate('');
                    setActorQuery('');
                    setTenantFilter('');
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Advanced Multi-Dimensional Panel (visible if in search tab) */}
          {activeTab === 'search' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Start Date (UTC)</label>
                <input
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">End Date (UTC)</label>
                <input
                  type="datetime-local"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Actor Email / UID</label>
                <input
                  type="text"
                  placeholder="e.g. security@markithub.internal"
                  value={actorQuery}
                  onChange={(e) => setActorQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">Tenant ID Scope</label>
                <input
                  type="text"
                  placeholder="e.g. tenant_12345"
                  value={tenantFilter}
                  onChange={(e) => setTenantFilter(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW: AUDIT STREAM / TIMELINE */}
      {(activeTab === 'timeline' || activeTab === 'search') && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin text-slate-600 mb-3" />
              <p className="text-xs font-medium">Querying authoritative audit ledger...</p>
            </div>
          ) : events.length === 0 ? (
            <div className="p-12 text-center">
              <ShieldCheck className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600 mb-3" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">No Audit Events Found</h3>
              <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                No ledger records matched the current filter criteria or date range.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/75 dark:border-slate-800 dark:bg-slate-800/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Timestamp & ID</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Action & Module</th>
                    <th className="py-3 px-4">Actor</th>
                    <th className="py-3 px-4">Scope / Target</th>
                    <th className="py-3 px-4">Result</th>
                    <th className="py-3 px-4 text-right">Integrity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {events.map((event) => {
                    const sevBadge = SEVERITY_BADGES[event.severity] || SEVERITY_BADGES.info;
                    const resBadge = RESULT_BADGES[event.result] || RESULT_BADGES.success;
                    const catStyle = CATEGORY_STYLES[event.category] || CATEGORY_STYLES.ADMIN_ACTION;
                    const CatIcon = catStyle.icon;

                    return (
                      <tr
                        key={event.id}
                        id={`audit-row-${event.id}`}
                        onClick={() => setSelectedEvent(event)}
                        className="cursor-pointer transition hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                      >
                        {/* Timestamp & ID */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-mono text-[11px] font-semibold text-slate-900 dark:text-slate-100">
                            {new Date(event.timestamp).toLocaleString()}
                          </div>
                          <div className="font-mono text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <span className="truncate max-w-[110px]">{event.id}</span>
                            {event.correlationId && (
                              <span
                                title={`Correlation ID: ${event.correlationId}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenCorrelated(event);
                                }}
                                className="inline-flex items-center px-1 rounded bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 text-[9px]"
                              >
                                <LinkIcon className="h-2.5 w-2.5 mr-0.5" />
                                Corr
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${catStyle.color}`}
                          >
                            <CatIcon className="h-3 w-3" />
                            {catStyle.label}
                          </span>
                        </td>

                        {/* Action & Module */}
                        <td className="py-3 px-4">
                          <div className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                            {event.action}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                            <span className="font-medium text-slate-700 dark:text-slate-300">{event.module}:</span>{' '}
                            {event.details}
                          </div>
                          {event.reason && (
                            <div className="text-[10px] italic text-slate-500 mt-0.5 line-clamp-1">
                              "{event.reason}"
                            </div>
                          )}
                        </td>

                        {/* Actor */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-medium text-slate-900 dark:text-white">
                            {event.actorName || event.actorEmail || event.actorUid}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {event.actorRole} &bull; <span className="font-mono">{event.actorUid.slice(0, 10)}</span>
                          </div>
                        </td>

                        {/* Target */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          {event.targetType ? (
                            <div>
                              <span className="font-semibold text-slate-700 dark:text-slate-300">
                                {event.targetType}:
                              </span>{' '}
                              <span className="text-slate-500">{event.targetName || event.targetId || '-'}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400">System</span>
                          )}
                          {event.tenantId && (
                            <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                              Tenant: {event.tenantId.slice(0, 12)}
                            </div>
                          )}
                        </td>

                        {/* Result & Severity */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${resBadge.bg}`}>
                              {resBadge.label}
                            </span>
                            <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold border ${sevBadge.bg} ${sevBadge.text} ${sevBadge.border}`}>
                              {sevBadge.label}
                            </span>
                          </div>
                        </td>

                        {/* Integrity Status */}
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            {event.integrityStatus === 'VALID' ? (
                              <span
                                title="Cryptographic integrity signature verified"
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800"
                              >
                                <Check className="h-3 w-3" />
                                Valid
                              </span>
                            ) : event.integrityStatus === 'INVALID' ? (
                              <span
                                title="Tamper detected! Hash mismatch."
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-800 animate-pulse"
                              >
                                <AlertOctagon className="h-3 w-3" />
                                Tampered
                              </span>
                            ) : (
                              <span
                                title="Legacy record without integrity hash"
                                className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700"
                              >
                                Unverified
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* PAGINATION FOOTER */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-slate-200 bg-slate-50/75 p-4 dark:border-slate-800 dark:bg-slate-800/40 text-xs text-slate-500">
            <div>
              Showing <span className="font-semibold text-slate-900 dark:text-white">{(currentPage - 1) * pageSize + 1}</span> to{' '}
              <span className="font-semibold text-slate-900 dark:text-white">
                {Math.min(currentPage * pageSize, totalEvents)}
              </span>{' '}
              of <span className="font-semibold text-slate-900 dark:text-white">{totalEvents}</span> events
            </div>

            <div className="flex items-center gap-2">
              <button
                id="audit-prev-page-btn"
                type="button"
                onClick={() => fetchEvents(Math.max(1, currentPage - 1))}
                disabled={currentPage <= 1 || loading}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-medium text-slate-700 shadow-sm disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Previous
              </button>

              <span className="px-2 font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                Page {currentPage} / {Math.max(1, totalPages)}
              </span>

              <button
                id="audit-next-page-btn"
                type="button"
                onClick={() => fetchEvents(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage >= totalPages || loading}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-medium text-slate-700 shadow-sm disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: CRYPTOGRAPHIC INTEGRITY ENGINE */}
      {activeTab === 'integrity' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Lock className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  Cryptographic Integrity & Tamper-Evident Verification
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-2xl">
                  Each authoritative platform audit record is stamped with a deterministic SHA-256 integrity hash
                  derived from invariant event metadata. This engine recomputes hashes on-demand to guarantee no unauthorized
                  modifications or silent edits have occurred in the Firestore backend.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                  <ShieldCheck className="h-4 w-4" />
                  SHA-256 Engine Active
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <div className="font-semibold text-slate-900 dark:text-white">Canonical Formula</div>
                <div className="mt-1 font-mono text-[10px] text-slate-600 dark:text-slate-400 break-all">
                  SHA-256(id || timestamp || actorUid || action || module || result || severity || reason || ...)
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <div className="font-semibold text-slate-900 dark:text-white">Tamper Reaction Policy</div>
                <div className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">
                  Instantly triggers a Critical Platform Alert, logs an AUDIT_INTEGRITY_MISMATCH violation, and preserves the original payload.
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <div className="font-semibold text-slate-900 dark:text-white">Database Rules Level</div>
                <div className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">
                  Client-side writes strictly blocked via <code className="font-mono">allow read, write: if false;</code> in Firestore rules.
                </div>
              </div>
            </div>
          </div>

          {/* Quick Verification Table for Loaded Events */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Active Batch Verification (Last {events.length} Loaded Events)
              </h4>
              <button
                type="button"
                onClick={async () => {
                  for (const e of events) {
                    await handleVerifyIntegrity(e.id);
                  }
                }}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 dark:text-blue-400"
              >
                Verify Entire Page Batch
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/75 dark:border-slate-800 dark:bg-slate-800/50 text-[11px] font-bold text-slate-500 uppercase">
                    <th className="py-2.5 px-4">Event</th>
                    <th className="py-2.5 px-4">Action</th>
                    <th className="py-2.5 px-4">Stored Integrity Hash</th>
                    <th className="py-2.5 px-4">Verification Result</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {events.map((e) => {
                    const verified = integrityResults[e.id];
                    return (
                      <tr key={e.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                        <td className="py-2.5 px-4 whitespace-nowrap font-mono text-[11px]">
                          {e.id.slice(0, 16)}...
                        </td>
                        <td className="py-2.5 px-4 whitespace-nowrap font-medium text-slate-900 dark:text-white">
                          {e.action}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-[10px] text-slate-500 max-w-[200px] truncate">
                          {e.integrityHash || <span className="text-slate-400 italic">No signature (legacy)</span>}
                        </td>
                        <td className="py-2.5 px-4 whitespace-nowrap">
                          {verified ? (
                            verified.valid ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                                <CheckCircle className="h-3.5 w-3.5" />
                                Valid Signature
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 animate-pulse">
                                <AlertOctagon className="h-3.5 w-3.5" />
                                Tampered Mismatch!
                              </span>
                            )
                          ) : e.integrityStatus === 'VALID' ? (
                            <span className="text-emerald-600 font-semibold">Valid</span>
                          ) : (
                            <span className="text-slate-400 italic">Not checked in session</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleVerifyIntegrity(e.id)}
                            disabled={verifyingId === e.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                          >
                            {verifyingId === e.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Lock className="h-3 w-3" />
                            )}
                            Verify
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: COMPLIANCE & SOC-2 REPORT */}
      {activeTab === 'compliance' && (
        <div className="space-y-6">
          {loadingReport ? (
            <div className="flex flex-col items-center justify-center p-12 text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin text-slate-600 mb-3" />
              <p className="text-xs font-medium">Synthesizing compliance & governance report...</p>
            </div>
          ) : !complianceReport ? (
            <div className="p-12 text-center">
              <FileCheck className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600 mb-3" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Compliance Report Unavailable</h3>
              <button
                type="button"
                onClick={fetchComplianceReport}
                className="mt-3 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white dark:bg-white dark:text-slate-900"
              >
                Generate Report
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                    SOC-2 Type II & Regulatory Governance Report
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                    MarkitHub Platform Administrative & Access Review
                  </h3>
                  <p className="text-xs text-slate-500">
                    Reporting Window: {new Date(complianceReport.reportingPeriod.start).toLocaleDateString()} &ndash;{' '}
                    {new Date(complianceReport.reportingPeriod.end).toLocaleDateString()} &bull; Generated:{' '}
                    {new Date(complianceReport.generatedAt).toLocaleString()}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowExportModal(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Download Full Audit Evidence
                </button>
              </div>

              {/* REPORT METRICS BREAKDOWN */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <div className="text-slate-500 font-medium">Privileged Operations</div>
                  <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                    {complianceReport.privilegedActions}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400">High-privilege role/policy mutations</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <div className="text-slate-500 font-medium">Failed / Denied Ops</div>
                  <div className="mt-1 text-2xl font-bold text-amber-600 dark:text-amber-400">
                    {complianceReport.failedDeniedOperations}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400">Security boundary rejections</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <div className="text-slate-500 font-medium">Break-Glass Emergencies</div>
                  <div className="mt-1 text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {complianceReport.breakGlassActivity}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400">Temporary elevated access sessions</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <div className="text-slate-500 font-medium">Unresolved Incidents</div>
                  <div className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    {complianceReport.unresolvedSecurityEvents}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400">Critical open threats</div>
                </div>
              </div>

              {/* DETAILED CATEGORIZATION */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Administrative Lifecycle Summary
                  </h4>
                  <ul className="space-y-2 text-xs">
                    <li className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                      <span className="text-slate-600 dark:text-slate-300">Platform Admin Directory Changes</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {complianceReport.platformAdminLifecycleChanges}
                      </span>
                    </li>
                    <li className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                      <span className="text-slate-600 dark:text-slate-300">Fine-Grained Permission Modifications</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {complianceReport.permissionChanges}
                      </span>
                    </li>
                    <li className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                      <span className="text-slate-600 dark:text-slate-300">Governance Policy Drafts & Releases</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {complianceReport.governanceConfigurationChanges}
                      </span>
                    </li>
                    <li className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                      <span className="text-slate-600 dark:text-slate-300">Tenant Lifecycle Transitions</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {complianceReport.tenantLifecycleChanges}
                      </span>
                    </li>
                    <li className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                      <span className="text-slate-600 dark:text-slate-300">Billing, Plan & Invoice Changes</span>
                      <span className="font-bold text-slate-900 dark:text-white">{complianceReport.billingChanges}</span>
                    </li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Governance & Retention Policy
                  </h4>
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Audit Ledger Retention Window</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {complianceReport.retentionPolicy.auditRetentionDays} Days (1 Year)
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Immutable Ledger Mode</span>
                      <span className="font-bold text-emerald-600">Enforced (No Deletes)</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Tamper-Evident SHA-256 Hashing</span>
                      <span className="font-bold text-emerald-600">Active</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Formula Injection Neutralization</span>
                      <span className="font-bold text-emerald-600">Enabled</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL: EXPORT COMPLIANCE CSV */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 dark:border-slate-800 dark:bg-slate-900 space-y-5">
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Download className="h-5 w-5 text-indigo-600" />
                  Export Authoritative Audit Dataset
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Generates an immutable CSV with sanitized formula-injection protection.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3.5 border border-slate-200 dark:border-slate-700 space-y-1.5">
                <div className="font-semibold text-slate-900 dark:text-white">Active Filter Scope:</div>
                <div className="text-slate-600 dark:text-slate-400">
                  {searchQuery ? `Search: "${searchQuery}" • ` : ''}
                  Severity: {severityFilter} &bull; Result: {resultFilter} &bull; Category: {categoryFilter}
                  {startDate ? ` • From: ${startDate}` : ''}
                  {endDate ? ` • To: ${endDate}` : ''}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Justification / Purpose of Export <span className="text-rose-500">*</span>
                </label>
                <textarea
                  id="audit-export-reason-input"
                  rows={3}
                  value={exportReason}
                  onChange={(e) => setExportReason(e.target.value)}
                  placeholder="Mandatory regulatory reason for export (recorded in immutable audit trail)..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-900 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  A <code className="font-mono">PLATFORM_AUDIT_EXPORTED</code> audit record will be created authoritatively.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                id="audit-export-confirm-btn"
                type="button"
                onClick={handleExportCsv}
                disabled={exporting || !exportReason.trim()}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50 dark:bg-white dark:text-slate-900"
              >
                {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {exporting ? 'Generating...' : 'Export & Download'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DRAWER: AUDIT EVENT DETAIL */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 dark:border-slate-800 dark:bg-slate-900 space-y-6">
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${RESULT_BADGES[selectedEvent.result]?.bg}`}>
                    {selectedEvent.result.toUpperCase()}
                  </span>
                  <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold border ${SEVERITY_BADGES[selectedEvent.severity]?.bg} ${SEVERITY_BADGES[selectedEvent.severity]?.text}`}>
                    {selectedEvent.severity.toUpperCase()}
                  </span>
                  <span className="font-mono text-xs text-slate-400">ID: {selectedEvent.id}</span>
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1.5">
                  {selectedEvent.action}
                </h3>
                <p className="text-xs text-slate-500">
                  {new Date(selectedEvent.timestamp).toLocaleString()} &bull; Module: {selectedEvent.module}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* ACTOR & TARGET INFO */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-800/50">
                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mb-2">
                  <User className="h-4 w-4 text-slate-500" />
                  Actor Context
                </div>
                <div className="space-y-1 text-slate-600 dark:text-slate-300">
                  <div>Name: <span className="font-semibold text-slate-900 dark:text-white">{selectedEvent.actorName}</span></div>
                  <div>Email: <span className="font-mono">{selectedEvent.actorEmail || 'N/A'}</span></div>
                  <div>Role: <span className="font-semibold">{selectedEvent.actorRole}</span></div>
                  <div>UID: <span className="font-mono text-[10px]">{selectedEvent.actorUid}</span></div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-800/50">
                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mb-2">
                  <Tag className="h-4 w-4 text-slate-500" />
                  Target & Scope
                </div>
                <div className="space-y-1 text-slate-600 dark:text-slate-300">
                  <div>Target Type: <span className="font-semibold">{selectedEvent.targetType || 'System'}</span></div>
                  <div>Target ID: <span className="font-mono">{selectedEvent.targetId || 'N/A'}</span></div>
                  {selectedEvent.tenantId && <div>Tenant ID: <span className="font-mono">{selectedEvent.tenantId}</span></div>}
                  {selectedEvent.correlationId && (
                    <div>Correlation: <span className="font-mono text-[10px]">{selectedEvent.correlationId}</span></div>
                  )}
                </div>
              </div>
            </div>

            {/* DETAILS & REASON */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Event Details</label>
                <div className="rounded-xl bg-slate-50 p-3 text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                  {selectedEvent.details}
                </div>
              </div>

              {selectedEvent.reason && (
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Administrative Justification Reason</label>
                  <div className="rounded-xl bg-amber-50/70 p-3 text-amber-900 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-200 dark:border-amber-800">
                    "{selectedEvent.reason}"
                  </div>
                </div>
              )}
            </div>

            {/* DIFF / STATE COMPARISON */}
            {(selectedEvent.previousState || selectedEvent.newState) && (
              <div className="space-y-2 text-xs">
                <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Code className="h-4 w-4 text-slate-500" />
                  State Transition Diff
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
                    <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Previous State</div>
                    <pre className="font-mono text-[10px] text-slate-700 dark:text-slate-300 overflow-x-auto max-h-40">
                      {JSON.stringify(selectedEvent.previousState, null, 2) || 'None'}
                    </pre>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
                    <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">New State</div>
                    <pre className="font-mono text-[10px] text-slate-700 dark:text-slate-300 overflow-x-auto max-h-40">
                      {JSON.stringify(selectedEvent.newState, null, 2) || 'None'}
                    </pre>
                  </div>
                </div>
              </div>
            )}

            {/* INTEGRITY STATUS FOOTER */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
              <div>
                <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-indigo-600" />
                  Cryptographic Integrity Signature
                </div>
                <div className="font-mono text-[10px] text-slate-500 truncate max-w-md mt-0.5">
                  {selectedEvent.integrityHash || 'No cryptographic signature (legacy event)'}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {selectedEvent.correlationId && (
                  <button
                    type="button"
                    onClick={() => handleOpenCorrelated(selectedEvent)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <LinkIcon className="h-3 w-3" />
                    Correlate Flow
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleVerifyIntegrity(selectedEvent.id)}
                  disabled={verifyingId === selectedEvent.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900"
                >
                  {verifyingId === selectedEvent.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                  Verify Signature
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DRAWER: CORRELATED EVENTS STREAM */}
      {correlatedId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 dark:border-slate-800 dark:bg-slate-900 space-y-5">
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <LinkIcon className="h-5 w-5 text-indigo-600" />
                  Correlated Event Stream
                </h3>
                <p className="font-mono text-xs text-slate-500 mt-0.5">
                  Correlation Key: {correlatedId} &bull; ({correlatedEvents.length} related records)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCorrelatedId(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {loadingCorrelated ? (
              <div className="flex items-center justify-center p-8 text-slate-400">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span className="text-xs">Linking correlated events...</span>
              </div>
            ) : correlatedEvents.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No other events linked to this correlation ID.
              </div>
            ) : (
              <div className="space-y-3">
                {correlatedEvents.map((ev, idx) => (
                  <div
                    key={ev.id}
                    onClick={() => setSelectedEvent(ev)}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800/40 dark:hover:bg-slate-800/80 cursor-pointer transition flex items-start gap-3"
                  >
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200 text-[11px] font-bold shrink-0">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          {ev.action}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {new Date(ev.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="text-slate-600 dark:text-slate-300 mt-0.5 truncate">
                        {ev.details}
                      </div>
                      {ev.reason && (
                        <div className="text-[11px] italic text-slate-500 mt-0.5 truncate">
                          "{ev.reason}"
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
