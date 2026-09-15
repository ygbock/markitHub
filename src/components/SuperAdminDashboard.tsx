import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BadgeDollarSign,
  Ban,
  Bell,
  BellOff,
  BellRing,
  Building2,
  Check,
  CheckCheck,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  DollarSign,
  Filter,
  Gauge,
  HeartPulse,
  Layers3,
  Loader2,
  PieChart as PieChartIcon,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  TrendingUp,
  UserPlus,
  Users,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { getAuth } from 'firebase/auth';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

type Tab = 'overview' | 'operations' | 'alerts' | 'notifications' | 'analytics_revenue' | 'analytics_usage' | 'analytics_health' | 'tenants' | 'plans' | 'billing';
type TimeframeOption = 'today' | '7d' | '30d' | '90d' | '12m';

interface Plan {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  currency: string;
  includedSeats: number;
  limits: { products: number; ordersMonthly: number; storageGb: number };
  features: string[];
  status: 'active' | 'archived';
}

interface Subscription {
  planId: string;
  planName: string;
  status: 'trialing' | 'active' | 'past_due' | 'suspended' | 'cancelled';
  interval: 'monthly' | 'annual';
  price: number;
  currency: string;
  seatsLimit: number;
  currentPeriodEnd?: string;
}

interface Tenant {
  id: string;
  name: string;
  status: string;
  lifecycleStatus: 'provisioning' | 'trialing' | 'active' | 'suspended' | 'archived' | 'cancelled';
  ownerUid?: string;
  ownerEmail?: string;
  slug?: string;
  createdAt?: string;
  updatedAt?: string;
  subscription: Subscription;
}

interface UsageRow extends Tenant {
  staff: number;
  products: number;
  orders: number;
  auditEvents: number;
  measuredAt: string;
}
interface MeteredUsageRow {
  id: string;
  name: string;
  lifecycleStatus?: 'provisioning' | 'trialing' | 'active' | 'suspended' | 'cancelled';
  subscriptionStatus?: 'trialing' | 'active' | 'past_due' | 'suspended' | 'cancelled';
  planId: string;
  planName: string;
  period: string;
  ordersMonthly: {
    used: number;
    limit: number;
    percent: number;
    state: 'healthy' | 'warning' | 'exceeded';
    allowed?: boolean;
    remaining?: number;
    overrideActive?: boolean;
  };
  measuredAt: string;
}

interface DashboardData {
  metrics: {
    tenantCount: number;
    activeTenantCount: number;
    suspendedTenantCount: number;
    staffCount: number;
    recentAuditCount: number;
  };
  recentAuditEvents: Array<{
    id: string;
    action: string;
    tenantId: string;
    result: string;
    severity: string;
    timestamp: string;
  }>;
}

interface BillingData {
  summary: {
    currency: string;
    activeSubscriptions: number;
    trialSubscriptions: number;
    pastDueSubscriptions: number;
    suspendedSubscriptions: number;
    monthlyRecurringRevenue: number;
    annualRecurringRevenue: number;
    estimatedMonthlyRunRate: number;
  };
  recentEvents: Array<Record<string, any>>;
}

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const token = getAuth().currentUser ? await getAuth().currentUser!.getIdToken() : null;
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error || `Request failed (HTTP ${response.status})`);
  return body as T;
}

const money = (amount: number, currency = 'USD') =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount || 0);

const dateLabel = (value?: string) => value ? new Date(value).toLocaleDateString() : '—';

function StatusPill({ value }: { value: string }) {
  const norm = String(value || '').toLowerCase().replace('_', ' ');
  let color = 'border-slate-200 bg-slate-50 text-slate-600';
  if (norm === 'active') color = 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (norm === 'suspended') color = 'border-amber-200 bg-amber-50 text-amber-700';
  if (norm === 'archived') color = 'border-purple-200 bg-purple-50 text-purple-700';
  if (norm === 'cancelled') color = 'border-rose-200 bg-rose-50 text-rose-700';
  if (norm === 'trialing') color = 'border-indigo-200 bg-indigo-50 text-indigo-700';
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${color}`}>
      {norm}
    </span>
  );
}

function HealthStatusPill({ status, score }: { status: 'HEALTHY' | 'AT_RISK' | 'CRITICAL'; score?: number }) {
  let style = 'border-emerald-200 bg-emerald-50 text-emerald-800';
  let IconComponent = CheckCircle2;
  if (status === 'AT_RISK') {
    style = 'border-amber-200 bg-amber-50 text-amber-800';
    IconComponent = AlertTriangle;
  } else if (status === 'CRITICAL') {
    style = 'border-rose-200 bg-rose-50 text-rose-800';
    IconComponent = ShieldAlert;
  }
  return (
    <div className="inline-flex items-center gap-1.5">
      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${style}`}>
        <IconComponent className="h-3 w-3" />
        {status.replace('_', ' ')}
      </span>
      {score !== undefined && (
        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-bold text-slate-700">
          {score}/100
        </span>
      )}
    </div>
  );
}

export default function SuperAdminDashboard() {
  const [tab, setTab] = useState<Tab>('overview');
  const [timeframe, setTimeframe] = useState<TimeframeOption>('30d');
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [usage, setUsage] = useState<UsageRow[]>([]);
  const [meteredUsage, setMeteredUsage] = useState<MeteredUsageRow[]>([]);
  const [billing, setBilling] = useState<BillingData | null>(null);
  const [operations, setOperations] = useState<any | null>(null);

  const [analyticsOverview, setAnalyticsOverview] = useState<any | null>(null);
  const [analyticsTenants, setAnalyticsTenants] = useState<any[]>([]);
  const [analyticsRevenue, setAnalyticsRevenue] = useState<any | null>(null);
  const [analyticsUsage, setAnalyticsUsage] = useState<any | null>(null);
  const [analyticsGrowth, setAnalyticsGrowth] = useState<any | null>(null);

  const [alerts, setAlerts] = useState<any[]>([]);
  const [alertSummary, setAlertSummary] = useState<any | null>(null);
  const [alertSearch, setAlertSearch] = useState('');
  const [alertSeverityFilter, setAlertSeverityFilter] = useState<'ALL' | 'CRITICAL' | 'WARNING' | 'INFO'>('ALL');
  const [alertStatusFilter, setAlertStatusFilter] = useState<'ALL' | 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED' | 'DISMISSED'>('ALL');

  const [notifications, setNotifications] = useState<any[]>([]);
  const [notificationSummary, setNotificationSummary] = useState<any | null>(null);
  const [notificationPreferences, setNotificationPreferences] = useState<any | null>(null);
  const [escalationPolicies, setEscalationPolicies] = useState<any[]>([]);
  const [notificationSubTab, setNotificationSubTab] = useState<'feed' | 'preferences' | 'escalation'>('feed');
  const [notificationSearch, setNotificationSearch] = useState('');
  const [notificationUnreadFilter, setNotificationUnreadFilter] = useState(false);
  const [notificationSeverityFilter, setNotificationSeverityFilter] = useState<string>('ALL');
  const [notificationEscalationFilter, setNotificationEscalationFilter] = useState<string>('ALL');
  
  const [prefFormReason, setPrefFormReason] = useState('');
  const [editingPolicyModal, setEditingPolicyModal] = useState<{
    policy: any;
    thresholdMinutes: number;
    enabled: boolean;
    reason: string;
  } | null>(null);

  const [selectedAlert, setSelectedAlert] = useState<any | null>(null);
  const [selectedAlertDetail, setSelectedAlertDetail] = useState<any | null>(null);
  const [loadingAlertDetail, setLoadingAlertDetail] = useState(false);

  const [alertActionModal, setAlertActionModal] = useState<{
    alert: any;
    action: 'acknowledge' | 'resolve' | 'dismiss';
    reason: string;
  } | null>(null);

  const [healthSearch, setHealthSearch] = useState('');
  const [healthFilter, setHealthFilter] = useState<'ALL' | 'HEALTHY' | 'AT_RISK' | 'CRITICAL'>('ALL');
  const [lifecycleFilter, setLifecycleFilter] = useState<string>('ALL');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [lifecycleModal, setLifecycleModal] = useState<{
    tenant: Tenant;
    targetStatus: 'active' | 'suspended' | 'archived';
    reason: string;
  } | null>(null);

  const [usageSearch, setUsageSearch] = useState('');
  const [usageStateFilter, setUsageStateFilter] = useState<'all' | 'healthy' | 'warning' | 'exceeded'>('all');
  const [usageOverrideFilter, setUsageOverrideFilter] = useState<'all' | 'override_only' | 'standard'>('all');

  const filteredMeteredUsage = useMemo(() => {
    return meteredUsage.filter(row => {
      if (usageSearch) {
        const q = usageSearch.toLowerCase();
        const match = row.name.toLowerCase().includes(q) || row.id.toLowerCase().includes(q) || row.planName.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (usageStateFilter !== 'all' && row.ordersMonthly.state !== usageStateFilter) return false;
      if (usageOverrideFilter === 'override_only' && !row.ordersMonthly.overrideActive) return false;
      if (usageOverrideFilter === 'standard' && row.ordersMonthly.overrideActive) return false;
      return true;
    });
  }, [meteredUsage, usageSearch, usageStateFilter, usageOverrideFilter]);

  const toggleUsageOverride = async (row: MeteredUsageRow) => {
    const nextState = !row.ordersMonthly.overrideActive;
    const defaultReason = nextState
      ? `Super Admin temporary order limit override enabled for ${row.name}`
      : `Super Admin order limit override removed for ${row.name}`;
    const reason = window.prompt(
      `Reason for ${nextState ? 'ENABLING' : 'DISABLING'} usage limit override for ${row.name}:`,
      defaultReason,
    );
    if (!reason || !reason.trim()) return;

    try {
      setBusy(`override:${row.id}`);
      setError(null);
      await apiFetch<{ success: boolean }>(`/api/platform/tenants/${row.id}/usage-override`, {
        method: 'PATCH',
        body: JSON.stringify({
          overrideMonthlyOrders: nextState,
          reason: reason.trim(),
        }),
      });
      setNotice(`Usage limit override ${nextState ? 'enabled' : 'disabled'} for ${row.name}.`);
      await loadAll();
    } catch (err: any) {
      setError(err?.message || 'Failed to update usage limit override.');
    } finally {
      setBusy(null);
    }
  };

  const filteredAlerts = useMemo(() => {
    return alerts.filter(a => {
      if (alertSeverityFilter !== 'ALL' && a.severity !== alertSeverityFilter) return false;
      if (alertStatusFilter !== 'ALL' && a.status !== alertStatusFilter) return false;
      if (alertSearch) {
        const q = alertSearch.toLowerCase();
        const match =
          a.title?.toLowerCase().includes(q) ||
          a.description?.toLowerCase().includes(q) ||
          a.tenantId?.toLowerCase().includes(q) ||
          a.tenantName?.toLowerCase().includes(q) ||
          a.type?.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [alerts, alertSeverityFilter, alertStatusFilter, alertSearch]);

  const handleSelectAlert = async (alert: any) => {
    setSelectedAlert(alert);
    setLoadingAlertDetail(true);
    try {
      const detailRes = await apiFetch<any>(`/api/platform/alerts/${alert.alertId}`);
      setSelectedAlertDetail(detailRes);
    } catch (err: any) {
      setError(err?.message || 'Unable to load alert details.');
    } finally {
      setLoadingAlertDetail(false);
    }
  };

  const executeAlertAction = async () => {
    if (!alertActionModal) return;
    const { alert, action, reason } = alertActionModal;
    if (!reason.trim()) {
      setError('A mandatory administrative reason is required.');
      return;
    }
    setBusy(`alert:${alert.alertId}:${action}`);
    setError(null);
    try {
      await apiFetch(`/api/platform/alerts/${encodeURIComponent(alert.alertId)}/${action}`, {
        method: 'PATCH',
        body: JSON.stringify({ reason: reason.trim() }),
      });
      setNotice(`Alert '${alert.title}' successfully ${action}d.`);
      setAlertActionModal(null);
      await loadAll();
      if (selectedAlert?.alertId === alert.alertId) {
        const updatedDetail = await apiFetch<any>(`/api/platform/alerts/${alert.alertId}`);
        setSelectedAlertDetail(updatedDetail);
      }
    } catch (err: any) {
      setError(err?.message || `Failed to ${action} alert.`);
    } finally {
      setBusy(null);
    }
  };

  const openAlertActionModal = (alert: any, action: 'acknowledge' | 'resolve' | 'dismiss') => {
    setAlertActionModal({ alert, action, reason: '' });
  };

  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => {
      if (notificationUnreadFilter && n.read) return false;
      if (notificationSeverityFilter !== 'ALL' && n.severity !== notificationSeverityFilter) return false;
      if (notificationEscalationFilter === 'ESCALATED' && n.escalationState !== 'ESCALATED') return false;
      if (notificationEscalationFilter === 'STANDARD' && n.escalationState === 'ESCALATED') return false;
      if (notificationSearch) {
        const q = notificationSearch.toLowerCase();
        const match =
          n.title?.toLowerCase().includes(q) ||
          n.message?.toLowerCase().includes(q) ||
          n.tenantId?.toLowerCase().includes(q) ||
          n.type?.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [notifications, notificationUnreadFilter, notificationSeverityFilter, notificationEscalationFilter, notificationSearch]);

  const handleMarkNotificationRead = async (notificationId: string) => {
    setBusy(`ntf:read:${notificationId}`);
    setError(null);
    try {
      await apiFetch(`/api/platform/notifications/${notificationId}/read`, { method: 'PATCH' });
      setNotice('Notification marked as read.');
      await loadAll();
    } catch (err: any) {
      setError(err?.message || 'Failed to mark notification as read.');
    } finally {
      setBusy(null);
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    setBusy('ntf:read_all');
    setError(null);
    try {
      const res = await apiFetch<{ count: number }>('/api/platform/notifications/read-all', { method: 'PATCH' });
      setNotice(`Marked ${res.count} notifications as read.`);
      await loadAll();
    } catch (err: any) {
      setError(err?.message || 'Failed to mark all notifications as read.');
    } finally {
      setBusy(null);
    }
  };

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prefFormReason.trim()) {
      setError('A mandatory administrative reason is required to update notification preferences.');
      return;
    }
    if (!notificationPreferences) return;

    setBusy('ntf:save_prefs');
    setError(null);
    try {
      await apiFetch('/api/platform/notification-preferences', {
        method: 'PATCH',
        body: JSON.stringify({
          enabledChannels: notificationPreferences.enabledChannels,
          severityPreferences: notificationPreferences.severityPreferences,
          typePreferences: notificationPreferences.typePreferences,
          reason: prefFormReason.trim(),
        }),
      });
      setNotice('Notification preferences successfully updated.');
      setPrefFormReason('');
      await loadAll();
    } catch (err: any) {
      setError(err?.message || 'Failed to update notification preferences.');
    } finally {
      setBusy(null);
    }
  };

  const handleSaveEscalationPolicy = async () => {
    if (!editingPolicyModal) return;
    const { policy, thresholdMinutes, enabled, reason } = editingPolicyModal;
    if (!reason.trim()) {
      setError('A mandatory administrative reason is required to update escalation SLA policies.');
      return;
    }

    setBusy(`policy:save:${policy.policyId}`);
    setError(null);
    try {
      await apiFetch(`/api/platform/escalation-policies/${policy.policyId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          thresholdMinutes,
          enabled,
          reason: reason.trim(),
        }),
      });
      setNotice(`Escalation policy '${policy.name}' updated.`);
      setEditingPolicyModal(null);
      await loadAll();
    } catch (err: any) {
      setError(err?.message || 'Failed to update escalation policy.');
    } finally {
      setBusy(null);
    }
  };

  const [provisionForm, setProvisionForm] = useState({
    name: '',
    ownerUid: '',
    ownerEmail: '',
    planId: 'starter',
    billingInterval: 'monthly',
    trialDays: 14,
    currency: 'USD',
    timezone: 'UTC',
  });

  const [newPlan, setNewPlan] = useState({
    id: '',
    name: '',
    description: '',
    monthlyPrice: 49,
    annualPrice: 490,
    includedSeats: 5,
    products: 5000,
    ordersMonthly: 10000,
    storageGb: 10,
  });

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [
        operationsRes,
        dashboardRes,
        plansRes,
        tenantsRes,
        usageRes,
        meteredRes,
        billingRes,
        overviewRes,
        analyticsTenantsRes,
        revenueRes,
        usageAnalyticsRes,
        growthRes,
        alertsRes,
        alertSummaryRes,
        notificationsRes,
        notificationSummaryRes,
        notificationPreferencesRes,
        escalationsRes,
      ] = await Promise.all([
        apiFetch<any>('/api/platform/operations/overview'),
        apiFetch<DashboardData>('/api/platform/dashboard'),
        apiFetch<{ plans: Plan[] }>('/api/platform/plans'),
        apiFetch<{ tenants: Tenant[] }>('/api/platform/tenants?limit=100'),
        apiFetch<{ usage: UsageRow[] }>('/api/platform/usage'),
        apiFetch<{ usage: MeteredUsageRow[] }>('/api/platform/usage/metered'),
        apiFetch<BillingData>('/api/platform/billing'),
        apiFetch<any>(`/api/platform/analytics/overview?timeframe=${timeframe}`),
        apiFetch<any>(`/api/platform/analytics/tenants?timeframe=${timeframe}&limit=100`),
        apiFetch<any>(`/api/platform/analytics/revenue?timeframe=${timeframe}`),
        apiFetch<any>(`/api/platform/analytics/usage?timeframe=${timeframe}&limit=100`),
        apiFetch<any>(`/api/platform/analytics/growth?timeframe=${timeframe}`),
        apiFetch<{ alerts: any[] }>('/api/platform/alerts?limit=100'),
        apiFetch<{ summary: any }>('/api/platform/alerts/summary'),
        apiFetch<{ notifications: any[] }>('/api/platform/notifications?limit=100'),
        apiFetch<any>('/api/platform/notifications/summary'),
        apiFetch<{ preferences: any }>('/api/platform/notification-preferences'),
        apiFetch<{ policies: any[] }>('/api/platform/escalation-policies'),
      ]);
      setOperations(operationsRes);
      setDashboard(dashboardRes);
      setPlans(plansRes.plans || []);
      setTenants(tenantsRes.tenants || []);
      setUsage(usageRes.usage || []);
      setMeteredUsage(meteredRes.usage || []);
      setBilling(billingRes);

      setAnalyticsOverview(overviewRes);
      setAnalyticsTenants(analyticsTenantsRes.tenants || []);
      setAnalyticsRevenue(revenueRes);
      setAnalyticsUsage(usageAnalyticsRes);
      setAnalyticsGrowth(growthRes);

      setAlerts(alertsRes.alerts || []);
      setAlertSummary(alertSummaryRes.summary || null);

      setNotifications(notificationsRes.notifications || []);
      setNotificationSummary(notificationSummaryRes || null);
      setNotificationPreferences(notificationPreferencesRes.preferences || null);
      setEscalationPolicies(escalationsRes.policies || []);

      if (!provisionForm.planId && plansRes.plans?.[0]) {
        setProvisionForm(prev => ({ ...prev, planId: plansRes.plans[0].id }));
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to load platform control plane.');
    } finally {
      setLoading(false);
    }
  }, [provisionForm.planId, timeframe]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const activePlans = useMemo(() => plans.filter(plan => plan.status === 'active'), [plans]);

  const provisionTenant = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!provisionForm.name.trim() || !provisionForm.ownerUid.trim()) return;
    setBusy('provision');
    setNotice(null);
    try {
      const idempotencyKey = `prov_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const res = await apiFetch<{ success: boolean; replayed?: boolean }>('/api/platform/tenants', {
        method: 'POST',
        headers: {
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(provisionForm),
      });
      setProvisionForm(prev => ({ ...prev, name: '', ownerUid: '', ownerEmail: '' }));
      setNotice(
        res.replayed
          ? 'Tenant provisioning replayed (idempotent request).'
          : 'Tenant provisioned successfully with owner membership and subscription.'
      );
      await loadAll();
      setTab('tenants');
    } catch (err: any) {
      setError(err?.message || 'Tenant provisioning failed.');
    } finally {
      setBusy(null);
    }
  };

  const changeSubscription = async (tenant: Tenant, planId: string, interval: 'monthly' | 'annual') => {
    const defaultReason = `Super Admin updated subscription plan for ${tenant.name} to ${planId} (${interval})`;
    const reason = window.prompt(`Reason for updating subscription for ${tenant.name}:`, defaultReason);
    if (!reason || !reason.trim()) return;

    setBusy(`subscription:${tenant.id}`);
    setError(null);
    try {
      await apiFetch(`/api/platform/tenants/${encodeURIComponent(tenant.id)}/subscription/plan`, {
        method: 'PATCH',
        body: JSON.stringify({ planId, billingInterval: interval, reason: reason.trim() }),
      });
      setNotice(`${tenant.name} subscription updated.`);
      await loadAll();
    } catch (err: any) {
      setError(err?.message || 'Subscription update failed.');
    } finally {
      setBusy(null);
    }
  };

  const executeLifecycleChange = async () => {
    if (!lifecycleModal) return;
    const { tenant, targetStatus, reason } = lifecycleModal;
    if (!reason.trim()) return;
    setBusy(`lifecycle:${tenant.id}`);
    setError(null);
    try {
      await apiFetch(`/api/platform/tenants/${encodeURIComponent(tenant.id)}/lifecycle`, {
        method: 'PATCH',
        body: JSON.stringify({ status: targetStatus, reason: reason.trim() }),
      });
      setNotice(`${tenant.name} lifecycle updated to ${targetStatus}.`);
      setLifecycleModal(null);
      await loadAll();
    } catch (err: any) {
      setError(err?.message || 'Tenant lifecycle update failed.');
    } finally {
      setBusy(null);
    }
  };

  const createPlan = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy('plan');
    setError(null);
    try {
      await apiFetch('/api/platform/plans', {
        method: 'POST',
        body: JSON.stringify({
          ...newPlan,
          limits: {
            products: newPlan.products,
            ordersMonthly: newPlan.ordersMonthly,
            storageGb: newPlan.storageGb,
          },
          currency: 'USD',
          features: ['POS & inventory', 'E-commerce storefront', 'Platform support'],
        }),
      });
      setNewPlan(prev => ({ ...prev, id: '', name: '' }));
      setNotice('Platform plan created.');
      await loadAll();
    } catch (err: any) {
      setError(err?.message || 'Plan creation failed.');
    } finally {
      setBusy(null);
    }
  };

  const cards = dashboard ? [
    { label: 'Tenants', value: dashboard.metrics.tenantCount, icon: Building2 },
    { label: 'Active', value: dashboard.metrics.activeTenantCount, icon: CheckCircle2 },
    { label: 'Suspended', value: dashboard.metrics.suspendedTenantCount, icon: Ban },
    { label: 'Platform Staff', value: dashboard.metrics.staffCount, icon: Users },
    { label: 'Audit Events', value: dashboard.metrics.recentAuditCount, icon: ShieldCheck },
  ] : [];

  const tabs: Array<[Tab, string, React.ElementType]> = [
    ['overview', 'Overview', Gauge],
    ['operations', 'Operations Center', ShieldCheck],
    ['alerts', 'Alerts & Incidents', ShieldAlert],
    ['notifications', 'Notifications & Escalations', Bell],
    ['analytics_revenue', 'Revenue Analytics', BadgeDollarSign],
    ['analytics_usage', 'Usage Analytics', Activity],
    ['analytics_health', 'Tenant Health', HeartPulse],
    ['tenants', 'Tenant Provisioning', UserPlus],
    ['plans', 'Plans & Pricing', Layers3],
    ['billing', 'Billing Events', CreditCard],
  ];

  return (
    <section id="super-admin-dashboard" className="space-y-6 pb-12">
      <div className="overflow-hidden rounded-[2rem] bg-slate-950 text-white shadow-xl">
        <div className="p-6 sm:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-indigo-300">
                <ShieldCheck className="h-3.5 w-3.5" /> Platform Control Plane
              </div>
              <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">Super Admin Operations & Analytics</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-400">
                Server-authoritative platform analytics, MRR/revenue tracking, operational usage meters, tenant health scores, and lifecycle controls.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center rounded-xl border border-white/10 bg-white/5 p-1">
                {[
                  ['today', 'Today'],
                  ['7d', '7 Days'],
                  ['30d', '30 Days'],
                  ['90d', '90 Days'],
                  ['12m', '12 Months'],
                ].map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => setTimeframe(val as TimeframeOption)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-black transition ${
                      timeframe === val ? 'bg-indigo-600 text-white shadow' : 'text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button onClick={loadAll} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-2.5 text-sm font-bold hover:bg-white/15 disabled:opacity-60">
                <RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} /> Refresh
              </button>
            </div>
          </div>

          <div className="mt-7 flex gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-white/5 p-1.5">
            {tabs.map(([id, label, Icon]) => (
              <button key={id} onClick={() => setTab(id)} className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${tab === id ? 'bg-white text-slate-950 shadow' : 'text-slate-300 hover:bg-white/10'}`}>
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {notice && (
        <div className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <span><strong>Success:</strong> {notice}</span>
          <button onClick={() => setNotice(null)} aria-label="Dismiss"><X className="h-4 w-4" /></button>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <span><strong>Platform operation failed:</strong> {error}</span>
          <button onClick={() => setError(null)} aria-label="Dismiss"><X className="h-4 w-4" /></button>
        </div>
      )}

      {loading && !dashboard ? (
        <div className="flex min-h-64 items-center justify-center rounded-3xl border border-slate-200 bg-white">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
        </div>
      ) : (
        <>
          {tab === 'operations' && (
            <div className="space-y-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="flex items-center gap-2 text-xl font-black text-slate-900">
                    <ShieldCheck className="h-6 w-6 text-indigo-600" /> Platform Operations Center
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Unified operational view across tenant lifecycle, provisioning, billing, usage, alerts, notifications, and SLA escalation.
                  </p>
                </div>
                <button onClick={loadAll} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60">
                  <RefreshCw className={loading ? 'h-3.5 w-3.5 animate-spin' : 'h-3.5 w-3.5'} /> Refresh Operations
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
                {[
                  ['Tenants', operations?.kpis?.tenants ?? 0, Building2],
                  ['Provisioning', operations?.kpis?.provisioning ?? 0, UserPlus],
                  ['Suspended', operations?.kpis?.suspended ?? 0, Ban],
                  ['Past Due', operations?.kpis?.pastDue ?? 0, CreditCard],
                  ['Usage Risk', operations?.kpis?.usageRisk ?? 0, Activity],
                  ['Open Alerts', operations?.kpis?.openAlerts ?? 0, ShieldAlert],
                  ['Unread', operations?.kpis?.unreadNotifications ?? 0, Bell],
                  ['Escalated', operations?.kpis?.escalatedIncidents ?? 0, BellRing],
                ].map(([label, value, Icon]) => (
                  <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between text-slate-500">
                      {React.createElement(Icon as React.ElementType, { className: 'h-4 w-4 text-indigo-600' })}
                      <span className="text-[9px] font-black uppercase tracking-wider">{label}</span>
                    </div>
                    <div className="mt-2 text-2xl font-black text-slate-900">{String(value)}</div>
                  </div>
                ))}
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-black text-slate-900">Operational Exceptions</h3>
                      <p className="text-xs text-slate-500">Queues requiring administrative attention.</p>
                    </div>
                    <Activity className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div className="space-y-2">
                    {(operations?.exceptions || []).map((item: any) => (
                      <button key={item.key} onClick={() => item.tab && setTab(item.tab as Tab)} className="flex w-full items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-3 text-left hover:bg-slate-100">
                        <span>
                          <span className="block text-xs font-black text-slate-800">{item.label}</span>
                          <span className="block text-[11px] text-slate-500">{item.description}</span>
                        </span>
                        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-slate-700 shadow-sm">{item.count}</span>
                      </button>
                    ))}
                    {!operations?.exceptions?.length && <div className="rounded-xl bg-emerald-50 p-4 text-xs font-bold text-emerald-700">No operational exceptions reported.</div>}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-black text-slate-900">Recent Operational Activity</h3>
                      <p className="text-xs text-slate-500">Correlated platform events from the authoritative audit stream.</p>
                    </div>
                    <Clock className="h-5 w-5 text-slate-500" />
                  </div>
                  <div className="space-y-2">
                    {(operations?.recentActivity || []).map((event: any) => (
                      <div key={event.id} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-3">
                        <div className="min-w-0">
                          <div className="truncate text-xs font-black text-slate-800">{event.action}</div>
                          <div className="truncate text-[11px] text-slate-500">{event.tenantName || event.tenantId || 'Platform'} · {event.module || 'Platform'}</div>
                        </div>
                        <div className="ml-3 shrink-0 text-[10px] font-semibold text-slate-400">{dateLabel(event.timestamp)}</div>
                      </div>
                    ))}
                    {!operations?.recentActivity?.length && <div className="rounded-xl bg-slate-50 p-4 text-xs text-slate-500">No recent operational activity.</div>}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-5">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" />
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Control-plane correlation</h3>
                    <p className="mt-1 text-xs leading-5 text-slate-600">
                      Use the existing tenant, billing, usage, alert, and notification views to execute authorized actions. Mutations remain server-authoritative and continue to require the existing lifecycle guards, audit justification, and atomicity controls.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'alerts' && (
            <div className="space-y-6">
              {/* Header & Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                    <ShieldAlert className="h-6 w-6 text-rose-600" />
                    Alert & Incident Control Plane
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Server-authoritative platform alerts across Tenant Provisioning, Billing, Lifecycle, Usage, and Security.
                  </p>
                </div>
                <button
                  onClick={loadAll}
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-sm"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                  Sync Alerts
                </button>
              </div>

              {/* KPI Summary Grid */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-rose-700">Critical Alerts</span>
                    <AlertTriangle className="h-4 w-4 text-rose-600" />
                  </div>
                  <div className="mt-2 text-2xl font-black text-rose-950">{alertSummary?.criticalCount ?? 0}</div>
                  <div className="mt-1 text-[11px] font-semibold text-rose-700">Requires immediate intervention</div>
                </div>

                <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-700">Warning Alerts</span>
                    <Clock className="h-4 w-4 text-amber-600" />
                  </div>
                  <div className="mt-2 text-2xl font-black text-amber-950">{alertSummary?.warningCount ?? 0}</div>
                  <div className="mt-1 text-[11px] font-semibold text-amber-700">Approaching limits or degraded</div>
                </div>

                <div className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700">Open Incidents</span>
                    <Activity className="h-4 w-4 text-indigo-600" />
                  </div>
                  <div className="mt-2 text-2xl font-black text-indigo-950">{alertSummary?.openCount ?? 0}</div>
                  <div className="mt-1 text-[11px] font-semibold text-indigo-700">Unacknowledged open events</div>
                </div>

                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Resolved Today</span>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div className="mt-2 text-2xl font-black text-emerald-950">{alertSummary?.resolvedTodayCount ?? 0}</div>
                  <div className="mt-1 text-[11px] font-semibold text-emerald-700">Mitigated in last 24h</div>
                </div>
              </div>

              {/* Filters & Table Card */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-400 mr-1">Severity:</span>
                    {(['ALL', 'CRITICAL', 'WARNING', 'INFO'] as const).map(s => (
                      <button
                        key={s}
                        onClick={() => setAlertSeverityFilter(s)}
                        className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                          alertSeverityFilter === s
                            ? 'bg-slate-900 text-white shadow-sm'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-400 mr-1">Status:</span>
                    {(['ALL', 'OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED'] as const).map(st => (
                      <button
                        key={st}
                        onClick={() => setAlertStatusFilter(st)}
                        className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                          alertStatusFilter === st
                            ? 'bg-slate-900 text-white shadow-sm'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>

                  <div className="relative min-w-[220px]">
                    <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search alerts or tenant..."
                      value={alertSearch}
                      onChange={e => setAlertSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100">
                      <tr>
                        <th className="px-4 py-3">Tenant</th>
                        <th className="px-4 py-3">Alert Title & Detail</th>
                        <th className="px-4 py-3">Source</th>
                        <th className="px-4 py-3">Severity</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Created</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredAlerts.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-10 text-center text-slate-400 font-medium">
                            No operational alerts matching specified filters.
                          </td>
                        </tr>
                      ) : (
                        filteredAlerts.map(a => (
                          <tr
                            key={a.alertId}
                            onClick={() => handleSelectAlert(a)}
                            className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                          >
                            <td className="px-4 py-3 font-bold text-slate-900">
                              <div>{a.tenantName || a.tenantId}</div>
                              <div className="text-[10px] font-mono text-slate-400 font-normal">{a.tenantId}</div>
                            </td>
                            <td className="px-4 py-3 max-w-xs">
                              <div className="font-bold text-slate-900 truncate">{a.title}</div>
                              <div className="text-[11px] text-slate-500 truncate">{a.description}</div>
                            </td>
                            <td className="px-4 py-3 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                              {a.source}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                  a.severity === 'CRITICAL'
                                    ? 'bg-rose-100 text-rose-800'
                                    : a.severity === 'WARNING'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-blue-100 text-blue-800'
                                }`}
                              >
                                {a.severity}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                  a.status === 'OPEN'
                                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                    : a.status === 'ACKNOWLEDGED'
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                    : a.status === 'RESOLVED'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {a.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-500 text-[11px]">
                              {new Date(a.createdAt).toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-right space-x-1.5" onClick={e => e.stopPropagation()}>
                              {a.status === 'OPEN' && (
                                <button
                                  onClick={() => setAlertActionModal({ alert: a, action: 'acknowledge', reason: '' })}
                                  className="px-2.5 py-1 text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-200 transition-colors"
                                >
                                  Acknowledge
                                </button>
                              )}
                              {(a.status === 'OPEN' || a.status === 'ACKNOWLEDGED') && (
                                <button
                                  onClick={() => setAlertActionModal({ alert: a, action: 'resolve', reason: '' })}
                                  className="px-2.5 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors"
                                >
                                  Resolve
                                </button>
                              )}
                              {a.status !== 'DISMISSED' && a.status !== 'RESOLVED' && (
                                <button
                                  onClick={() => setAlertActionModal({ alert: a, action: 'dismiss', reason: '' })}
                                  className="px-2.5 py-1 text-[11px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                                >
                                  Dismiss
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {tab === 'notifications' && (
            <div className="space-y-6">
              {/* Notification KPI Summary Cards */}
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between text-slate-500">
                    <Bell className="h-5 w-5 text-indigo-600" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Unread Feed</span>
                  </div>
                  <div className="mt-3 text-2xl font-black text-slate-900">
                    {notificationSummary?.unreadCount ?? 0}
                  </div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">
                    out of {notificationSummary?.totalCount ?? notifications.length} total notifications
                  </div>
                </div>

                <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-5 shadow-sm">
                  <div className="flex items-center justify-between text-rose-700">
                    <ShieldAlert className="h-5 w-5 text-rose-600" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-rose-600">Critical Unread</span>
                  </div>
                  <div className="mt-3 text-2xl font-black text-rose-900">
                    {notificationSummary?.criticalUnreadCount ?? 0}
                  </div>
                  <div className="mt-1 text-xs font-semibold text-rose-700">
                    Requires immediate operator response
                  </div>
                </div>

                <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 shadow-sm">
                  <div className="flex items-center justify-between text-amber-700">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-600">Warning Unread</span>
                  </div>
                  <div className="mt-3 text-2xl font-black text-amber-900">
                    {notificationSummary?.warningUnreadCount ?? 0}
                  </div>
                  <div className="mt-1 text-xs font-semibold text-amber-700">
                    Approaching SLA / limits
                  </div>
                </div>

                <div className="rounded-2xl border border-purple-200 bg-purple-50/50 p-5 shadow-sm">
                  <div className="flex items-center justify-between text-purple-700">
                    <BellRing className="h-5 w-5 text-purple-600" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-purple-600">SLA Escalated</span>
                  </div>
                  <div className="mt-3 text-2xl font-black text-purple-900">
                    {notificationSummary?.escalatedCount ?? 0}
                  </div>
                  <div className="mt-1 text-xs font-semibold text-purple-700">
                    Exceeded acknowledgement window
                  </div>
                </div>
              </div>

              {/* Sub-Navigation Tabs */}
              <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
                <button
                  onClick={() => setNotificationSubTab('feed')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                    notificationSubTab === 'feed'
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <Bell className="h-3.5 w-3.5" />
                  Notification Inbox
                  {Boolean(notificationSummary?.unreadCount) && (
                    <span className="ml-1 rounded-full bg-indigo-500 px-2 py-0.5 text-[10px] font-bold text-white">
                      {notificationSummary?.unreadCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setNotificationSubTab('preferences')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                    notificationSubTab === 'preferences'
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <Sliders className="h-3.5 w-3.5" />
                  Channel Preferences
                </button>

                <button
                  onClick={() => setNotificationSubTab('escalation')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                    notificationSubTab === 'escalation'
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <Clock className="h-3.5 w-3.5" />
                  Escalation SLA Policies
                </button>
              </div>

              {/* Sub-Tab 1: Inbox Feed */}
              {notificationSubTab === 'feed' && (
                <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-6 space-y-4">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => setNotificationUnreadFilter(!notificationUnreadFilter)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                          notificationUnreadFilter
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {notificationUnreadFilter ? 'Showing Unread Only' : 'All Read & Unread'}
                      </button>

                      <select
                        value={notificationSeverityFilter}
                        onChange={e => setNotificationSeverityFilter(e.target.value)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-50 border border-slate-200 text-slate-700"
                      >
                        <option value="ALL">All Severities</option>
                        <option value="CRITICAL">Critical Only</option>
                        <option value="WARNING">Warning Only</option>
                        <option value="INFO">Informational Only</option>
                      </select>

                      <select
                        value={notificationEscalationFilter}
                        onChange={e => setNotificationEscalationFilter(e.target.value)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-50 border border-slate-200 text-slate-700"
                      >
                        <option value="ALL">All States</option>
                        <option value="ESCALATED">Escalated Only</option>
                        <option value="STANDARD">Standard Only</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="relative min-w-[220px]">
                        <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search notifications..."
                          value={notificationSearch}
                          onChange={e => setNotificationSearch(e.target.value)}
                          className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                        />
                      </div>

                      <button
                        disabled={busy === 'ntf:read_all' || !notificationSummary?.unreadCount}
                        onClick={handleMarkAllNotificationsRead}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50 transition"
                      >
                        {busy === 'ntf:read_all' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />}
                        Mark All Read
                      </button>
                    </div>
                  </div>

                  {/* Notification List */}
                  <div className="divide-y divide-slate-100">
                    {filteredNotifications.length === 0 ? (
                      <div className="py-12 text-center text-slate-400 font-medium text-xs">
                        No notifications match the selected criteria.
                      </div>
                    ) : (
                      filteredNotifications.map(n => (
                        <div
                          key={n.notificationId}
                          className={`p-4 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl ${
                            !n.read ? 'bg-indigo-50/30 font-medium' : 'hover:bg-slate-50/60'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`p-2.5 rounded-2xl mt-0.5 ${
                                n.severity === 'CRITICAL'
                                  ? 'bg-rose-100 text-rose-700'
                                  : n.severity === 'WARNING'
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-blue-100 text-blue-700'
                              }`}
                            >
                              {n.severity === 'CRITICAL' ? (
                                <ShieldAlert className="h-5 w-5" />
                              ) : n.severity === 'WARNING' ? (
                                <AlertTriangle className="h-5 w-5" />
                              ) : (
                                <Bell className="h-5 w-5" />
                              )}
                            </div>

                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-sm font-bold text-slate-900">{n.title}</h3>
                                {!n.read && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-indigo-600 text-white">
                                    New
                                  </span>
                                )}
                                {n.escalationState === 'ESCALATED' && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-purple-600 text-white">
                                    Escalated
                                  </span>
                                )}
                                <span className="text-[10px] font-mono text-slate-400">
                                  {n.tenantId ? `Tenant: ${n.tenantId}` : 'Platform'}
                                </span>
                              </div>
                              <p className="mt-1 text-xs text-slate-600 leading-relaxed">{n.message}</p>
                              <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] text-slate-400">
                                <span>{dateLabel(n.createdAt)}</span>
                                <span>•</span>
                                <span>Status: <strong className="text-slate-600">{n.deliveryStatus}</strong></span>
                                <span>•</span>
                                <span>Type: <strong className="text-slate-600">{n.type}</strong></span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end md:self-center">
                            {n.alertId && (
                              <button
                                onClick={() => {
                                  setTab('alerts');
                                  setAlertSearch(n.alertId);
                                }}
                                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                              >
                                View Alert
                              </button>
                            )}

                            {!n.read && (
                              <button
                                disabled={busy === `ntf:read:${n.notificationId}`}
                                onClick={() => handleMarkNotificationRead(n.notificationId)}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition"
                              >
                                {busy === `ntf:read:${n.notificationId}` ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Check className="h-3.5 w-3.5" />
                                )}
                                Mark Read
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Sub-Tab 2: Notification Preferences */}
              {notificationSubTab === 'preferences' && notificationPreferences && (
                <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-6 max-w-3xl space-y-6">
                  <div>
                    <h2 className="text-lg font-black text-slate-900">Super Admin Notification Preferences</h2>
                    <p className="mt-1 text-xs text-slate-500">
                      Configure server-authoritative dispatch channels and severity filtering rules for platform operational events.
                    </p>
                  </div>

                  <form onSubmit={handleSavePreferences} className="space-y-6">
                    {/* Delivery Channels */}
                    <div className="space-y-3">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Delivery Channels</h3>
                      
                      <label className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                        <div className="flex items-center gap-3">
                          <Bell className="h-5 w-5 text-indigo-600" />
                          <div>
                            <div className="text-xs font-bold text-slate-900">In-App Control Plane Notifications</div>
                            <div className="text-[11px] text-slate-500">Display alerts in the Super Admin dashboard inbox.</div>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={notificationPreferences.enabledChannels?.inApp ?? true}
                          onChange={e => setNotificationPreferences((prev: any) => ({
                            ...prev,
                            enabledChannels: { ...prev.enabledChannels, inApp: e.target.checked }
                          }))}
                          className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
                        />
                      </label>

                      <label className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                        <div className="flex items-center gap-3">
                          <Send className="h-5 w-5 text-indigo-600" />
                          <div>
                            <div className="text-xs font-bold text-slate-900">Email Dispatches</div>
                            <div className="text-[11px] text-slate-500">Send high-priority notification emails to administrator address.</div>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={notificationPreferences.enabledChannels?.email ?? true}
                          onChange={e => setNotificationPreferences((prev: any) => ({
                            ...prev,
                            enabledChannels: { ...prev.enabledChannels, email: e.target.checked }
                          }))}
                          className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
                        />
                      </label>

                      <label className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                        <div className="flex items-center gap-3">
                          <Activity className="h-5 w-5 text-indigo-600" />
                          <div>
                            <div className="text-xs font-bold text-slate-900">Webhook Event Dispatches</div>
                            <div className="text-[11px] text-slate-500">Dispatch event payloads to configured external operator webhooks.</div>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={notificationPreferences.enabledChannels?.webhook ?? false}
                          onChange={e => setNotificationPreferences((prev: any) => ({
                            ...prev,
                            enabledChannels: { ...prev.enabledChannels, webhook: e.target.checked }
                          }))}
                          className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
                        />
                      </label>
                    </div>

                    {/* Severity Filters */}
                    <div className="space-y-3">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Severity Thresholds</h3>
                      
                      <label className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                        <div>
                          <div className="text-xs font-bold text-rose-700 uppercase">🔴 Critical Severity Alerts</div>
                          <div className="text-[11px] text-slate-500">Provisioning failures, payment failures, security anomalies, unexpected suspensions.</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={notificationPreferences.severityPreferences?.CRITICAL ?? true}
                          onChange={e => setNotificationPreferences((prev: any) => ({
                            ...prev,
                            severityPreferences: { ...prev.severityPreferences, CRITICAL: e.target.checked }
                          }))}
                          className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
                        />
                      </label>

                      <label className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                        <div>
                          <div className="text-xs font-bold text-amber-700 uppercase">🟠 Warning Severity Alerts</div>
                          <div className="text-[11px] text-slate-500">Usage limits approaching 90%, trials nearing expiration, past due billing.</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={notificationPreferences.severityPreferences?.WARNING ?? true}
                          onChange={e => setNotificationPreferences((prev: any) => ({
                            ...prev,
                            severityPreferences: { ...prev.severityPreferences, WARNING: e.target.checked }
                          }))}
                          className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
                        />
                      </label>

                      <label className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
                        <div>
                          <div className="text-xs font-bold text-blue-700 uppercase">🔵 Informational Severity Alerts</div>
                          <div className="text-[11px] text-slate-500">New tenant activations, plan tier upgrades, usage limit override toggles.</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={notificationPreferences.severityPreferences?.INFO ?? true}
                          onChange={e => setNotificationPreferences((prev: any) => ({
                            ...prev,
                            severityPreferences: { ...prev.severityPreferences, INFO: e.target.checked }
                          }))}
                          className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
                        />
                      </label>
                    </div>

                    {/* Mandatory Reason Input */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700">
                        Mandatory Audit Reason <span className="text-rose-500">*</span>
                      </label>
                      <textarea
                        rows={2}
                        required
                        value={prefFormReason}
                        onChange={e => setPrefFormReason(e.target.value)}
                        placeholder="Provide justification for updating channel notification preferences..."
                        className="w-full rounded-xl border border-slate-200 p-3 text-xs outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={!prefFormReason.trim() || busy === 'ntf:save_prefs'}
                        className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-black text-white hover:bg-indigo-700 disabled:opacity-50 transition"
                      >
                        {busy === 'ntf:save_prefs' && <Loader2 className="h-4 w-4 animate-spin" />}
                        Save Notification Preferences
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Sub-Tab 3: Escalation Policies */}
              {notificationSubTab === 'escalation' && (
                <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-6 space-y-6">
                  <div>
                    <h2 className="text-lg font-black text-slate-900">Incident Escalation SLA Policies</h2>
                    <p className="mt-1 text-xs text-slate-500">
                      Configure server-authoritative response windows for unacknowledged incidents before triggering escalations.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {escalationPolicies.map(p => (
                      <div key={p.policyId} className="rounded-2xl border border-slate-200 p-5 space-y-3">
                        <div className="flex items-center justify-between">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              p.severity === 'CRITICAL' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {p.severity} SLA
                          </span>
                          <span className={`text-xs font-bold ${p.enabled ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {p.enabled ? 'Active SLA' : 'Disabled'}
                          </span>
                        </div>

                        <h3 className="text-sm font-bold text-slate-900">{p.name}</h3>
                        <p className="text-xs text-slate-500">
                          Unresolved alerts trigger automated escalation after <strong>{p.thresholdMinutes} minutes</strong>.
                        </p>

                        <div className="pt-2 flex justify-end">
                          <button
                            onClick={() => setEditingPolicyModal({
                              policy: p,
                              thresholdMinutes: p.thresholdMinutes,
                              enabled: p.enabled,
                              reason: '',
                            })}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                          >
                            Configure SLA Threshold
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'overview' && (
            <div className="space-y-6">
              {/* Analytics KPI Cards */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between text-slate-500">
                    <Building2 className="h-4 w-4 text-indigo-600" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Tenants</span>
                  </div>
                  <div className="mt-3 text-2xl font-black text-slate-900">
                    {analyticsOverview?.kpis?.totalTenants ?? tenants.length}
                  </div>
                  <div className="mt-1 flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                    <TrendingUp className="h-3 w-3" />
                    +{analyticsOverview?.kpis?.tenantGrowthRatePercent ?? 0}%
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between text-slate-500">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Active</span>
                  </div>
                  <div className="mt-3 text-2xl font-black text-slate-900">
                    {analyticsOverview?.kpis?.activeTenants ?? 0}
                  </div>
                  <div className="mt-1 text-[11px] font-medium text-slate-500">
                    {analyticsOverview?.kpis?.trialingTenants ?? 0} trialing
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between text-slate-500">
                    <BadgeDollarSign className="h-4 w-4 text-indigo-600" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">MRR</span>
                  </div>
                  <div className="mt-3 text-2xl font-black text-slate-900">
                    {money(analyticsOverview?.kpis?.mrr || 0)}
                  </div>
                  <div className="mt-1 text-[11px] font-medium text-slate-500">
                    {money(analyticsOverview?.kpis?.arr || 0)} ARR
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between text-slate-500">
                    <ArrowUpRight className="h-4 w-4 text-indigo-600" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Trial Conv.</span>
                  </div>
                  <div className="mt-3 text-2xl font-black text-slate-900">
                    {analyticsOverview?.kpis?.trialToPaidConversionRatePercent ?? 0}%
                  </div>
                  <div className="mt-1 text-[11px] font-medium text-slate-500">
                    Churn: {analyticsOverview?.kpis?.churnRatePercent ?? 0}%
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between text-slate-500">
                    <Activity className="h-4 w-4 text-indigo-600" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Orders</span>
                  </div>
                  <div className="mt-3 text-2xl font-black text-slate-900">
                    {(analyticsOverview?.kpis?.platformOrderVolume || 0).toLocaleString()}
                  </div>
                  <div className="mt-1 text-[11px] font-medium text-amber-600">
                    {analyticsOverview?.kpis?.usageWarnings || 0} near limit
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between text-slate-500">
                    <HeartPulse className="h-4 w-4 text-emerald-600" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Healthy</span>
                  </div>
                  <div className="mt-3 text-2xl font-black text-slate-900">
                    {analyticsOverview?.healthSummary?.healthyPercent ?? 100}%
                  </div>
                  <div className="mt-1 text-[11px] font-medium text-rose-600">
                    {analyticsOverview?.healthSummary?.critical || 0} critical
                  </div>
                </div>
              </div>

              {/* Time Series Charts Grid */}
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div>
                      <h2 className="font-black text-slate-900">Tenant Growth Trend</h2>
                      <p className="mt-0.5 text-xs text-slate-500">Cumulative & new tenant provisioning over time</p>
                    </div>
                    <span className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-black text-indigo-700">
                      {analyticsOverview?.timeframe?.label || timeframe}
                    </span>
                  </div>
                  <div className="mt-4 h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={analyticsOverview?.timeSeries || []}>
                        <defs>
                          <linearGradient id="tenantGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                        <Tooltip />
                        <Area type="monotone" dataKey="cumulativeTenants" name="Total Tenants" stroke="#4f46e5" strokeWidth={2} fillOpacity={1} fill="url(#tenantGrad)" />
                        <Area type="monotone" dataKey="newTenants" name="New Tenants" stroke="#10b981" strokeWidth={2} fill="#10b981" fillOpacity={0.2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div>
                      <h2 className="font-black text-slate-900">MRR Revenue Curve</h2>
                      <p className="mt-0.5 text-xs text-slate-500">Monthly recurring revenue trend across active subscriptions</p>
                    </div>
                    <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700">
                      MRR
                    </span>
                  </div>
                  <div className="mt-4 h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={analyticsOverview?.timeSeries || []}>
                        <defs>
                          <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#059669" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                        <Tooltip formatter={(val: any) => [`$${val}`, 'MRR']} />
                        <Area type="monotone" dataKey="mrr" name="MRR ($)" stroke="#059669" strokeWidth={2} fillOpacity={1} fill="url(#mrrGrad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Portfolio and Billing Pulse */}
              <div className="grid gap-6 xl:grid-cols-[1.3fr_.7fr]">
                <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-100 p-5">
                    <h2 className="font-black text-slate-900">Tenant portfolio & Health</h2>
                    <p className="mt-1 text-xs text-slate-500">Operational state and server-derived health posture.</p>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {(analyticsTenants.length ? analyticsTenants : tenants).slice(0, 8).map((tenant: any) => (
                      <div key={tenant.id} className="flex items-center justify-between gap-4 p-4 hover:bg-slate-50">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-black text-slate-800">{tenant.name}</div>
                          <div className="mt-1 text-xs text-slate-500">
                            {tenant.subscription?.planName || 'Plan'} · {tenant.ownerEmail || tenant.slug || tenant.id}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <HealthStatusPill
                            status={tenant.health?.status || 'HEALTHY'}
                            score={tenant.health?.healthScore}
                          />
                          <StatusPill value={tenant.lifecycleStatus} />
                        </div>
                      </div>
                    ))}
                    {!tenants.length && <div className="p-8 text-center text-sm text-slate-500">No tenants provisioned yet.</div>}
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-100 p-5">
                    <h2 className="font-black text-slate-900">Platform billing pulse</h2>
                    <p className="mt-1 text-xs text-slate-500">Subscription-derived run rate; payment collection is separate.</p>
                  </div>
                  <div className="space-y-4 p-5">
                    <div className="rounded-2xl bg-slate-950 p-5 text-white">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Estimated MRR</div>
                      <div className="mt-2 text-3xl font-black">{money(analyticsOverview?.kpis?.mrr || billing?.summary.estimatedMonthlyRunRate || 0)}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        ['Active', analyticsOverview?.kpis?.activeTenants || 0],
                        ['Trials', analyticsOverview?.kpis?.trialingTenants || 0],
                        ['Suspended', analyticsOverview?.kpis?.suspendedTenants || 0],
                        ['Cancelled', analyticsOverview?.kpis?.cancelledTenants || 0],
                      ].map(([label, value]) => (
                        <div key={String(label)} className="rounded-2xl border border-slate-200 p-4">
                          <div className="text-[10px] font-bold uppercase text-slate-400">{label}</div>
                          <div className="mt-1 text-xl font-black text-slate-900">{value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'analytics_revenue' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <span className="text-[10px] font-black uppercase text-slate-400">Monthly Recurring Revenue</span>
                  <div className="mt-2 text-3xl font-black text-slate-900">
                    {money(analyticsRevenue?.revenueSummary?.mrr || 0)}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {money(analyticsRevenue?.revenueSummary?.arr || 0)} Annual Contract Value
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <span className="text-[10px] font-black uppercase text-slate-400">Trial → Paid Conversion Rate</span>
                  <div className="mt-2 text-3xl font-black text-slate-900">
                    {analyticsRevenue?.conversionMetrics?.trialToPaidConversionRatePercent ?? 0}%
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {analyticsRevenue?.conversionMetrics?.trialSubscriptions || 0} currently trialing
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <span className="text-[10px] font-black uppercase text-slate-400">Platform Churn Rate</span>
                  <div className="mt-2 text-3xl font-black text-rose-600">
                    {analyticsRevenue?.conversionMetrics?.churnRatePercent ?? 0}%
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {analyticsRevenue?.conversionMetrics?.cancelledSubscriptions || 0} total cancellations
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <span className="text-[10px] font-black uppercase text-slate-400">Active Paid Subscriptions</span>
                  <div className="mt-2 text-3xl font-black text-emerald-600">
                    {analyticsRevenue?.conversionMetrics?.activeSubscriptions || 0}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {analyticsRevenue?.conversionMetrics?.failedSubscriptions || 0} failed / past due
                  </div>
                </div>
              </div>

              {/* Revenue Breakdown by Plan */}
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="border-b border-slate-100 pb-4">
                  <h2 className="font-black text-slate-900">Revenue Contribution by Plan</h2>
                  <p className="mt-0.5 text-xs text-slate-500">MRR distribution across active platform tiers</p>
                </div>

                <div className="mt-5 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-left text-[10px] font-black uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-5 py-3">Plan Name</th>
                        <th className="px-5 py-3">Monthly Price</th>
                        <th className="px-5 py-3">Annual Price</th>
                        <th className="px-5 py-3">Active Paid</th>
                        <th className="px-5 py-3">Trialing</th>
                        <th className="px-5 py-3">Plan MRR</th>
                        <th className="px-5 py-3 text-right">Revenue Share</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(analyticsRevenue?.revenueSummary?.revenueByPlan || []).map((plan: any) => {
                        const totalMRR = analyticsRevenue?.revenueSummary?.mrr || 1;
                        const share = Math.round(((plan.mrr || 0) / totalMRR) * 100);
                        return (
                          <tr key={plan.planId} className="border-t border-slate-100">
                            <td className="px-5 py-4 font-black text-slate-800">{plan.planName}</td>
                            <td className="px-5 py-4 font-bold">{money(plan.monthlyPrice)}</td>
                            <td className="px-5 py-4 font-bold">{money(plan.annualPrice)}</td>
                            <td className="px-5 py-4 font-bold text-emerald-600">{plan.activeCount}</td>
                            <td className="px-5 py-4 font-bold text-indigo-600">{plan.trialCount}</td>
                            <td className="px-5 py-4 font-black text-slate-900">{money(plan.mrr)}</td>
                            <td className="px-5 py-4 text-right font-bold text-slate-700">{share}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {tab === 'analytics_usage' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <span className="text-[10px] font-black uppercase text-slate-400">Total Order Volume</span>
                  <div className="mt-2 text-2xl font-black text-slate-900">
                    {(analyticsUsage?.usageSummary?.platformOrderVolume || 0).toLocaleString()}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <span className="text-[10px] font-black uppercase text-slate-400">Average Utilization</span>
                  <div className="mt-2 text-2xl font-black text-slate-900">
                    {analyticsUsage?.usageSummary?.averageUtilizationPercent ?? 0}%
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <span className="text-[10px] font-black uppercase text-amber-600">Near-Limit Warnings</span>
                  <div className="mt-2 text-2xl font-black text-amber-600">
                    {analyticsUsage?.usageSummary?.usageWarnings || 0}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <span className="text-[10px] font-black uppercase text-rose-600">Limit Violations</span>
                  <div className="mt-2 text-2xl font-black text-rose-600">
                    {analyticsUsage?.usageSummary?.usageViolations || 0}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <span className="text-[10px] font-black uppercase text-indigo-600">Active Overrides</span>
                  <div className="mt-2 text-2xl font-black text-indigo-600">
                    {analyticsUsage?.usageSummary?.activeOverrides || 0}
                  </div>
                </div>
              </div>

              {/* High Usage Tenants Table */}
              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 p-5">
                  <h2 className="font-black text-slate-900">High Usage & Warning Tenants</h2>
                  <p className="mt-1 text-xs text-slate-500">Tenants approaching or exceeding monthly order limits.</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-left text-[10px] font-black uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-5 py-3">Tenant</th>
                        <th className="px-5 py-3">Plan</th>
                        <th className="px-5 py-3">Monthly Orders</th>
                        <th className="px-5 py-3">Limit</th>
                        <th className="px-5 py-3">Utilization</th>
                        <th className="px-5 py-3">Override Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(analyticsUsage?.highUsageTenants || []).map((t: any) => (
                        <tr key={t.id} className="border-t border-slate-100">
                          <td className="px-5 py-4">
                            <div className="font-black text-slate-800">{t.name}</div>
                            <div className="text-[10px] text-slate-400">{t.slug || t.id}</div>
                          </td>
                          <td className="px-5 py-4 text-xs font-bold text-slate-600">{t.planName}</td>
                          <td className="px-5 py-4 font-bold">{t.ordersMonthly.used.toLocaleString()}</td>
                          <td className="px-5 py-4 font-bold">{t.ordersMonthly.limit ? t.ordersMonthly.limit.toLocaleString() : 'Unlimited'}</td>
                          <td className="px-5 py-4">
                            <span className={`rounded-full px-2.5 py-1 text-xs font-black ${
                              t.ordersMonthly.state === 'exceeded'
                                ? 'bg-rose-100 text-rose-700'
                                : t.ordersMonthly.state === 'warning'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-emerald-100 text-emerald-700'
                            }`}>
                              {Math.round(t.ordersMonthly.percent)}% ({t.ordersMonthly.state})
                            </span>
                          </td>
                          <td className="px-5 py-4 text-xs font-bold text-slate-600">
                            {t.ordersMonthly.overrideActive ? (
                              <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-[10px] font-black uppercase text-indigo-700">
                                Active Override
                              </span>
                            ) : (
                              'Standard Limit'
                            )}
                          </td>
                        </tr>
                      ))}
                      {!analyticsUsage?.highUsageTenants?.length && (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-sm text-slate-500">
                            No high usage or limit warning tenants detected.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {tab === 'analytics_health' && (
            <div className="space-y-6">
              {/* Health Summary Cards */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-emerald-800">Healthy Tenants</span>
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div className="mt-3 text-3xl font-black text-emerald-900">
                    {analyticsOverview?.healthSummary?.healthy || 0}
                  </div>
                  <div className="mt-1 text-xs font-bold text-emerald-700">
                    {analyticsOverview?.healthSummary?.healthyPercent ?? 100}% of platform portfolio
                  </div>
                </div>

                <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-amber-800">At Risk Tenants</span>
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                  </div>
                  <div className="mt-3 text-3xl font-black text-amber-900">
                    {analyticsOverview?.healthSummary?.atRisk || 0}
                  </div>
                  <div className="mt-1 text-xs font-bold text-amber-700">
                    {analyticsOverview?.healthSummary?.atRiskPercent ?? 0}% near limits or past due
                  </div>
                </div>

                <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-rose-800">Critical Tenants</span>
                    <ShieldAlert className="h-5 w-5 text-rose-600" />
                  </div>
                  <div className="mt-3 text-3xl font-black text-rose-900">
                    {analyticsOverview?.healthSummary?.critical || 0}
                  </div>
                  <div className="mt-1 text-xs font-bold text-rose-700">
                    {analyticsOverview?.healthSummary?.criticalPercent ?? 0}% suspended or provisioning failed
                  </div>
                </div>
              </div>

              {/* Searchable Tenant Health Table */}
              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="font-black text-slate-900">Server-Authoritative Tenant Health Registry</h2>
                    <p className="mt-1 text-xs text-slate-500">Calculated on backend from subscription, usage, and lifecycle metrics.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      placeholder="Search tenant or email…"
                      value={healthSearch}
                      onChange={e => setHealthSearch(e.target.value)}
                      className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold outline-none focus:border-indigo-500"
                    />
                    <select
                      value={healthFilter}
                      onChange={e => setHealthFilter(e.target.value as any)}
                      className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700"
                    >
                      <option value="ALL">All Health States</option>
                      <option value="HEALTHY">HEALTHY</option>
                      <option value="AT_RISK">AT RISK</option>
                      <option value="CRITICAL">CRITICAL</option>
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] text-sm">
                    <thead className="bg-slate-50 text-left text-[10px] font-black uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-5 py-3">Tenant & Owner</th>
                        <th className="px-5 py-3">Health Status</th>
                        <th className="px-5 py-3">Health Reasons</th>
                        <th className="px-5 py-3">Lifecycle</th>
                        <th className="px-5 py-3">Subscription</th>
                        <th className="px-5 py-3">Usage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analyticsTenants
                        .filter((t: any) => {
                          if (healthFilter !== 'ALL' && t.health?.status !== healthFilter) return false;
                          if (healthSearch) {
                            const q = healthSearch.toLowerCase();
                            const match = (t.name || '').toLowerCase().includes(q) || (t.ownerEmail || '').toLowerCase().includes(q) || (t.id || '').toLowerCase().includes(q);
                            if (!match) return false;
                          }
                          return true;
                        })
                        .map((t: any) => (
                          <tr key={t.id} className="border-t border-slate-100">
                            <td className="px-5 py-4">
                              <div className="font-black text-slate-800">{t.name}</div>
                              <div className="text-xs text-slate-500">{t.ownerEmail || t.slug}</div>
                            </td>
                            <td className="px-5 py-4">
                              <HealthStatusPill status={t.health?.status || 'HEALTHY'} score={t.health?.healthScore} />
                            </td>
                            <td className="px-5 py-4 text-xs text-slate-600 max-w-xs">
                              {t.health?.reasons?.length ? (
                                <ul className="list-disc pl-4 space-y-0.5">
                                  {t.health.reasons.map((r: string, idx: number) => (
                                    <li key={idx}>{r}</li>
                                  ))}
                                </ul>
                              ) : (
                                <span className="text-slate-400">All metrics normal</span>
                              )}
                            </td>
                            <td className="px-5 py-4">
                              <StatusPill value={t.lifecycleStatus} />
                            </td>
                            <td className="px-5 py-4 text-xs font-bold text-slate-700">
                              {t.subscription?.planName || 'Plan'} ({t.subscription?.status || 'active'})
                            </td>
                            <td className="px-5 py-4 text-xs font-bold">
                              {t.usage?.ordersMonthly ?? 0} orders ({Math.round(t.usage?.usagePercent || 0)}%)
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {tab === 'plans' && (
            <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
              <div className="space-y-4">
                {activePlans.map(plan => (
                  <div key={plan.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex items-center gap-2"><h2 className="text-lg font-black text-slate-900">{plan.name}</h2><StatusPill value={plan.status} /></div>
                        <p className="mt-1 text-sm text-slate-500">{plan.description}</p>
                      </div>
                      <div className="text-left sm:text-right"><div className="text-2xl font-black text-slate-900">{money(plan.monthlyPrice, plan.currency)}</div><div className="text-xs text-slate-500">per month · {money(plan.annualPrice, plan.currency)} annual</div></div>
                    </div>
                    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {[
                        ['Seats', plan.includedSeats],
                        ['Products', plan.limits.products.toLocaleString()],
                        ['Orders / mo', plan.limits.ordersMonthly.toLocaleString()],
                        ['Storage', `${plan.limits.storageGb} GB`],
                      ].map(([label, value]) => <div key={String(label)} className="rounded-2xl bg-slate-50 p-3"><div className="text-[10px] font-bold uppercase text-slate-400">{label}</div><div className="mt-1 text-sm font-black text-slate-800">{value}</div></div>)}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">{plan.features.map(feature => <span key={feature} className="rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-indigo-700">{feature}</span>)}</div>
                  </div>
                ))}
                {!activePlans.length && <div className="rounded-3xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">No active plans.</div>}
              </div>

              <form onSubmit={createPlan} className="h-fit rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2"><Settings2 className="h-5 w-5 text-indigo-600" /><h2 className="font-black text-slate-900">Create plan</h2></div>
                <div className="mt-5 space-y-3">
                  {[
                    ['Plan ID', 'id', 'starter-plus'],
                    ['Name', 'name', 'Starter Plus'],
                    ['Description', 'description', 'For growing merchants'],
                  ].map(([label, key, placeholder]) => <label key={key} className="block"><span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</span><input required={key !== 'description'} value={(newPlan as any)[key]} onChange={e => setNewPlan(prev => ({ ...prev, [key]: e.target.value }))} placeholder={placeholder} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500" /></label>)}
                  <div className="grid grid-cols-2 gap-3">
                    {[['Monthly', 'monthlyPrice'], ['Annual', 'annualPrice'], ['Seats', 'includedSeats'], ['Products', 'products'], ['Orders / mo', 'ordersMonthly'], ['Storage GB', 'storageGb']].map(([label, key]) => <label key={key} className="block"><span className="text-[10px] font-black uppercase text-slate-400">{label}</span><input type="number" min="0" value={(newPlan as any)[key]} onChange={e => setNewPlan(prev => ({ ...prev, [key]: Number(e.target.value) }))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" /></label>)}
                  </div>
                  <button disabled={busy === 'plan'} className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white disabled:opacity-60">{busy === 'plan' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Create platform plan</button>
                </div>
              </form>
            </div>
          )}

          {tab === 'tenants' && (
            <div className="space-y-6">
              <form onSubmit={provisionTenant} className="rounded-3xl border border-indigo-100 bg-indigo-50/50 p-5 shadow-sm">
                <div className="flex items-start gap-3"><div className="rounded-2xl bg-white p-3 text-indigo-600 shadow-sm"><UserPlus className="h-5 w-5" /></div><div><h2 className="font-black text-slate-900">Provision a new tenant</h2><p className="mt-1 text-xs text-slate-500">Creates the tenant, owner membership, security metrics document, subscription, billing event, and immutable audit event in one transaction.</p></div></div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    ['Business name', 'name', 'Nexus Retail'],
                    ['Owner Firebase UID', 'ownerUid', 'Existing Auth UID'],
                    ['Owner email', 'ownerEmail', 'owner@example.com'],
                    ['Currency', 'currency', 'USD'],
                    ['Timezone', 'timezone', 'UTC'],
                  ].map(([label, key, placeholder]) => <label key={key} className="block"><span className="text-[10px] font-black uppercase tracking-wider text-slate-500">{label}</span><input required={key === 'name' || key === 'ownerUid'} value={(provisionForm as any)[key]} onChange={e => setProvisionForm(prev => ({ ...prev, [key]: e.target.value }))} placeholder={placeholder} className="mt-1 w-full rounded-xl border border-white bg-white px-3 py-2.5 text-sm" /></label>)}
                  <label><span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Plan</span><select value={provisionForm.planId} onChange={e => setProvisionForm(prev => ({ ...prev, planId: e.target.value }))} className="mt-1 w-full rounded-xl border border-white bg-white px-3 py-2.5 text-sm">{activePlans.map(plan => <option key={plan.id} value={plan.id}>{plan.name}</option>)}</select></label>
                  <label><span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Billing interval</span><select value={provisionForm.billingInterval} onChange={e => setProvisionForm(prev => ({ ...prev, billingInterval: e.target.value }))} className="mt-1 w-full rounded-xl border border-white bg-white px-3 py-2.5 text-sm"><option value="monthly">Monthly</option><option value="annual">Annual</option></select></label>
                  <label><span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Trial days</span><input type="number" min="0" max="30" value={provisionForm.trialDays} onChange={e => setProvisionForm(prev => ({ ...prev, trialDays: Number(e.target.value) }))} className="mt-1 w-full rounded-xl border border-white bg-white px-3 py-2.5 text-sm" /></label>
                  <div className="flex items-end"><button disabled={busy === 'provision'} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-black text-white hover:bg-indigo-700 disabled:opacity-60">{busy === 'provision' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Provision tenant</button></div>
                </div>
              </form>

              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-black text-slate-900">Tenant lifecycle</h2><p className="mt-1 text-xs text-slate-500">Plan and operational lifecycle are controlled independently.</p></div><div className="text-xs font-bold text-slate-500">{tenants.length} tenants</div></div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[980px] text-sm">
                    <thead className="bg-slate-50 text-left text-[10px] font-black uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3">Tenant</th><th className="px-5 py-3">Lifecycle</th><th className="px-5 py-3">Plan</th><th className="px-5 py-3">Billing</th><th className="px-5 py-3">Period end</th><th className="px-5 py-3 text-right">Actions</th></tr></thead>
                    <tbody>
                      {tenants.map(tenant => <tr key={tenant.id} className="border-t border-slate-100">
                        <td className="px-5 py-4"><button onClick={() => setSelectedTenant(tenant)} className="text-left"><div className="font-black text-slate-800 hover:underline">{tenant.name}</div><div className="mt-1 font-mono text-[10px] text-slate-400">{tenant.id}</div></button></td>
                        <td className="px-5 py-4"><StatusPill value={tenant.lifecycleStatus} /></td>
                        <td className="px-5 py-4"><select value={tenant.subscription.planId} disabled={busy === `subscription:${tenant.id}`} onChange={e => changeSubscription(tenant, e.target.value, tenant.subscription.interval)} className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-bold">{activePlans.map(plan => <option key={plan.id} value={plan.id}>{plan.name}</option>)}</select></td>
                        <td className="px-5 py-4"><select value={tenant.subscription.interval} onChange={e => changeSubscription(tenant, tenant.subscription.planId, e.target.value as 'monthly' | 'annual')} className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-bold"><option value="monthly">Monthly</option><option value="annual">Annual</option></select><div className="mt-1 text-[10px] text-slate-500">{tenant.subscription.status} · {money(tenant.subscription.price, tenant.subscription.currency)}</div></td>
                        <td className="px-5 py-4 text-xs text-slate-500">{dateLabel(tenant.subscription.currentPeriodEnd)}</td>
                        <td className="px-5 py-4 text-right">
                          <select
                            value=""
                            disabled={tenant.lifecycleStatus === 'cancelled' || busy === `lifecycle:${tenant.id}`}
                            onChange={e => {
                              if (e.target.value) {
                                setLifecycleModal({
                                  tenant,
                                  targetStatus: e.target.value as 'active' | 'suspended' | 'archived',
                                  reason: '',
                                });
                              }
                              e.currentTarget.value = '';
                            }}
                            className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-bold disabled:opacity-50"
                          >
                            <option value="">Actions…</option>
                            {tenant.lifecycleStatus !== 'active' && tenant.lifecycleStatus !== 'cancelled' && (
                              <option value="active">Reactivate</option>
                            )}
                            {tenant.lifecycleStatus === 'active' && (
                              <option value="suspended">Suspend</option>
                            )}
                            {tenant.lifecycleStatus !== 'archived' && tenant.lifecycleStatus !== 'cancelled' && (
                              <option value="archived">Archive</option>
                            )}
                          </select>
                        </td>
                      </tr>)}
                    </tbody>
                  </table>
                  {!tenants.length && <div className="p-10 text-center text-sm text-slate-500">No tenants found.</div>}
                </div>
              </div>

              {lifecycleModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true" aria-label="Confirm lifecycle transition">
                  <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Tenant Lifecycle Action</span>
                        <h3 className="text-lg font-black text-slate-900">
                          {lifecycleModal.targetStatus === 'suspended'
                            ? 'Suspend Tenant'
                            : lifecycleModal.targetStatus === 'archived'
                            ? 'Archive Tenant'
                            : 'Reactivate Tenant'}
                        </h3>
                      </div>
                      <button onClick={() => setLifecycleModal(null)} className="rounded-xl p-1.5 hover:bg-slate-100"><X className="h-5 w-5" /></button>
                    </div>
                    <div className="mt-4 space-y-3">
                      <div className="rounded-2xl bg-slate-50 p-3 text-xs">
                        <div><strong>Target Tenant:</strong> {lifecycleModal.tenant.name}</div>
                        <div className="font-mono text-[10px] text-slate-500">{lifecycleModal.tenant.id}</div>
                        <div className="mt-1 text-slate-600">Current status: <span className="font-bold">{lifecycleModal.tenant.lifecycleStatus}</span></div>
                      </div>

                      {lifecycleModal.targetStatus === 'archived' && (
                        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                          <strong>Warning:</strong> Archiving permanently disables normal tenant operations and storefront checkout. Tenant data will be retained in Firestore.
                        </div>
                      )}

                      {lifecycleModal.targetStatus === 'suspended' && (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                          <strong>Notice:</strong> Suspending blocks all order processing and staff operations until reactivated.
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-bold text-slate-700">
                          Mandatory Audit Reason <span className="text-rose-500">*</span>
                        </label>
                        <textarea
                          rows={3}
                          required
                          value={lifecycleModal.reason}
                          onChange={e => setLifecycleModal(prev => prev ? { ...prev, reason: e.target.value } : null)}
                          placeholder="Provide an administrative reason for this transition (e.g., Non-payment overdue 60 days, Account retired, Verification completed)"
                          className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-xs outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setLifecycleModal(null)}
                          className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={!lifecycleModal.reason.trim() || busy === `lifecycle:${lifecycleModal.tenant.id}`}
                          onClick={executeLifecycleChange}
                          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black text-white ${
                            lifecycleModal.targetStatus === 'archived'
                              ? 'bg-rose-600 hover:bg-rose-700'
                              : lifecycleModal.targetStatus === 'suspended'
                              ? 'bg-amber-600 hover:bg-amber-700'
                              : 'bg-emerald-600 hover:bg-emerald-700'
                          } disabled:opacity-50`}
                        >
                          {busy === `lifecycle:${lifecycleModal.tenant.id}` && <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />}
                          Confirm {lifecycleModal.targetStatus}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {selectedTenant && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-label="Tenant details">
                <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
                  <div className="flex items-start justify-between border-b border-slate-100 p-6"><div><div className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Tenant 360</div><h2 className="mt-1 text-2xl font-black text-slate-900">{selectedTenant.name}</h2><div className="mt-1 font-mono text-xs text-slate-400">{selectedTenant.id}</div></div><button onClick={() => setSelectedTenant(null)} aria-label="Close tenant details" className="rounded-xl p-2 hover:bg-slate-100"><X className="h-5 w-5" /></button></div>
                  <div className="grid grid-cols-2 gap-3 p-6 sm:grid-cols-3">
                    {[
                      ['Lifecycle', selectedTenant.lifecycleStatus],
                      ['Plan', selectedTenant.subscription.planName],
                      ['Billing', selectedTenant.subscription.status],
                      ['Interval', selectedTenant.subscription.interval],
                      ['Owner', selectedTenant.ownerEmail || selectedTenant.ownerUid || '—'],
                      ['Created', dateLabel(selectedTenant.createdAt)],
                    ].map(([label, value]) => <div key={String(label)} className="rounded-2xl border border-slate-200 p-4"><div className="text-[10px] font-bold uppercase text-slate-400">{label}</div><div className="mt-2 break-words text-sm font-black text-slate-800">{value}</div></div>)}
                  </div>
                </div>
              </div>}
            </div>
          )}

          {tab === 'billing' && billing && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
                {[
                  ['Estimated MRR', money(billing.summary.estimatedMonthlyRunRate, billing.summary.currency)],
                  ['Monthly MRR', money(billing.summary.monthlyRecurringRevenue, billing.summary.currency)],
                  ['Annual contract value', money(billing.summary.annualRecurringRevenue, billing.summary.currency)],
                  ['Active subscriptions', billing.summary.activeSubscriptions],
                  ['Past due', billing.summary.pastDueSubscriptions],
                ].map(([label, value]) => <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><BadgeDollarSign className="h-5 w-5 text-indigo-600" /><div className="mt-4 text-xl font-black text-slate-900">{value}</div><div className="mt-1 text-xs font-semibold text-slate-500">{label}</div></div>)}
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 p-5"><h2 className="font-black text-slate-900">Recent billing events</h2><p className="mt-1 text-xs text-slate-500">Platform subscription ledger events. This is not a payment processor settlement ledger.</p></div>
                <div className="divide-y divide-slate-100">{billing.recentEvents.map(event => <div key={event.id} className="flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="text-sm font-bold text-slate-800">{event.type || 'billing_event'}</div><div className="text-xs text-slate-500">{event.tenantId} · {event.planName || event.planId || '—'}</div></div><div className="text-right text-xs text-slate-500">{money(Number(event.amount || 0), event.currency || 'USD')} · {dateLabel(event.occurredAt)}</div></div>)}{!billing.recentEvents.length && <div className="p-8 text-center text-sm text-slate-500">No billing events recorded.</div>}</div>
              </div>
            </div>
          )}

          {tab === 'usage' && (
            <div className="space-y-6">
              <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
                <strong>Billable usage:</strong> monthly completed orders are recorded as immutable usage events and increment tenant meters atomically with payment settlement. Operational counts remain available for capacity planning.
              </div>
              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="font-black text-slate-900">Monthly billable order usage</h2>
                    <p className="mt-1 text-xs text-slate-500">Current UTC billing month · authoritative tenant meters.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      placeholder="Search tenant or plan…"
                      value={usageSearch}
                      onChange={e => setUsageSearch(e.target.value)}
                      className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold outline-none focus:border-indigo-500"
                    />
                    <select
                      value={usageStateFilter}
                      onChange={e => setUsageStateFilter(e.target.value as any)}
                      className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700"
                    >
                      <option value="all">All Usage States</option>
                      <option value="healthy">Healthy (&lt;80%)</option>
                      <option value="warning">Warning (80-99%)</option>
                      <option value="exceeded">Exceeded (100%+)</option>
                    </select>
                    <select
                      value={usageOverrideFilter}
                      onChange={e => setUsageOverrideFilter(e.target.value as any)}
                      className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700"
                    >
                      <option value="all">All Overrides</option>
                      <option value="override_only">Override Active Only</option>
                      <option value="standard">Standard (No Override)</option>
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[920px] text-sm">
                    <thead className="bg-slate-50 text-left text-[10px] font-black uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-5 py-3">Tenant</th>
                        <th className="px-5 py-3">Plan</th>
                        <th className="px-5 py-3">Status</th>
                        <th className="px-5 py-3">Orders</th>
                        <th className="px-5 py-3">Limit</th>
                        <th className="px-5 py-3">Utilization</th>
                        <th className="px-5 py-3">Meter State</th>
                        <th className="px-5 py-3 text-right">Super Admin Override</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMeteredUsage.map(row => (
                        <tr key={row.id} className="border-t border-slate-100">
                          <td className="px-5 py-4">
                            <div className="font-black text-slate-800">{row.name}</div>
                            <div className="mt-0.5 font-mono text-[10px] text-slate-400">{row.id}</div>
                          </td>
                          <td className="px-5 py-4 text-xs font-bold text-slate-600">{row.planName}</td>
                          <td className="px-5 py-4">
                            <div className="flex flex-wrap items-center gap-1">
                              {row.lifecycleStatus && <StatusPill value={row.lifecycleStatus} />}
                              {row.subscriptionStatus && row.subscriptionStatus !== row.lifecycleStatus && (
                                <StatusPill value={row.subscriptionStatus} />
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-4 font-bold">{row.ordersMonthly.used.toLocaleString()}</td>
                          <td className="px-5 py-4 font-bold">{row.ordersMonthly.limit ? row.ordersMonthly.limit.toLocaleString() : 'Unlimited'}</td>
                          <td className="px-5 py-4 min-w-44">
                            <div className="flex items-center gap-2">
                              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                                <div
                                  className={`h-full rounded-full ${
                                    row.ordersMonthly.state === 'exceeded'
                                      ? 'bg-rose-500'
                                      : row.ordersMonthly.state === 'warning'
                                      ? 'bg-amber-500'
                                      : 'bg-emerald-500'
                                  }`}
                                  style={{ width: `${Math.min(100, row.ordersMonthly.percent)}%` }}
                                />
                              </div>
                              <span className="w-10 text-right text-xs font-bold">{Math.round(row.ordersMonthly.percent)}%</span>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span
                                className={
                                  row.ordersMonthly.state === 'exceeded'
                                    ? 'rounded-full bg-rose-100 px-2.5 py-1 text-[10px] font-black uppercase text-rose-700'
                                    : row.ordersMonthly.state === 'warning'
                                    ? 'rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-black uppercase text-amber-700'
                                    : 'rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black uppercase text-emerald-700'
                                }
                              >
                                {row.ordersMonthly.state}
                              </span>
                              {row.ordersMonthly.overrideActive && (
                                <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-indigo-700">
                                  Override Active
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <button
                              disabled={busy === `override:${row.id}`}
                              onClick={() => toggleUsageOverride(row)}
                              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black transition-colors ${
                                row.ordersMonthly.overrideActive
                                  ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                                  : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                              } disabled:opacity-50`}
                            >
                              {busy === `override:${row.id}` ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : row.ordersMonthly.overrideActive ? (
                                'Disable Override'
                              ) : (
                                'Enable Override'
                              )}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!filteredMeteredUsage.length && (
                    <div className="p-10 text-center text-sm text-slate-500">
                      No metered usage records matching filters.
                    </div>
                  )}
                </div>
                <div className="border-t border-slate-100 p-5"><h2 className="font-black text-slate-900">Operational usage</h2><p className="mt-1 text-xs text-slate-500">Bounded to the first 100 platform tenants.</p></div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[920px] text-sm">
                    <thead className="bg-slate-50 text-left text-[10px] font-black uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3">Tenant</th><th className="px-5 py-3">Plan</th><th className="px-5 py-3">Staff</th><th className="px-5 py-3">Products</th><th className="px-5 py-3">Orders</th><th className="px-5 py-3">Audit events</th><th className="px-5 py-3">Measured</th></tr></thead>
                    <tbody>{usage.map(row => <tr key={row.id} className="border-t border-slate-100"><td className="px-5 py-4 font-black text-slate-800">{row.name}</td><td className="px-5 py-4 text-xs text-slate-500">{row.planName}</td><td className="px-5 py-4 font-bold">{row.staff}</td><td className="px-5 py-4 font-bold">{row.products.toLocaleString()}</td><td className="px-5 py-4 font-bold">{row.orders.toLocaleString()}</td><td className="px-5 py-4 font-bold">{row.auditEvents.toLocaleString()}</td><td className="px-5 py-4 text-xs text-slate-500">{dateLabel(row.measuredAt)}</td></tr>)}</tbody>
                  </table>
                  {!usage.length && <div className="p-10 text-center text-sm text-slate-500">No usage records available.</div>}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ALERT DETAIL DRAWER / MODAL */}
      {selectedAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 space-y-6">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      selectedAlert.severity === 'CRITICAL'
                        ? 'bg-rose-100 text-rose-800'
                        : selectedAlert.severity === 'WARNING'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {selectedAlert.severity}
                  </span>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      selectedAlert.status === 'OPEN'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : selectedAlert.status === 'ACKNOWLEDGED'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : selectedAlert.status === 'RESOLVED'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {selectedAlert.status}
                  </span>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {selectedAlert.source}
                  </span>
                </div>
                <h3 className="mt-2 text-lg font-black text-slate-900">{selectedAlert.title}</h3>
                <p className="text-xs text-slate-500">{selectedAlert.description}</p>
              </div>
              <button
                onClick={() => {
                  setSelectedAlert(null);
                  setSelectedAlertDetail(null);
                }}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {loadingAlertDetail ? (
              <div className="flex py-12 justify-center items-center">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
              </div>
            ) : selectedAlertDetail ? (
              <div className="space-y-6 text-xs text-slate-700">
                {/* Tenant & Subscription Bundle */}
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Tenant Identity</div>
                    <div className="font-bold text-slate-900 text-sm mt-0.5">
                      {selectedAlertDetail.tenant?.name || selectedAlert.tenantName || selectedAlert.tenantId}
                    </div>
                    <div className="font-mono text-[10px] text-slate-400">{selectedAlert.tenantId}</div>
                    <div className="mt-2 flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-500">Lifecycle:</span>
                      <StatusPill value={selectedAlertDetail.tenant?.lifecycleStatus || 'active'} />
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Subscription & Plan</div>
                    <div className="font-bold text-slate-900 text-sm mt-0.5">
                      {selectedAlertDetail.subscription?.planName || 'Starter Plan'}
                    </div>
                    <div className="text-slate-500 text-[11px] mt-0.5">
                      Status: <span className="font-bold text-slate-800">{selectedAlertDetail.subscription?.status || 'Active'}</span>
                    </div>
                    <div className="mt-2 text-slate-500 text-[11px]">
                      Monthly Orders Used: <span className="font-bold text-slate-900">{selectedAlertDetail.usageMetrics?.ordersUsed ?? 0}</span> / {selectedAlertDetail.usageMetrics?.planLimit ?? 2500} ({selectedAlertDetail.usageMetrics?.usagePercent ?? 0}%)
                    </div>
                  </div>
                </div>

                {/* Resolution & Timeline */}
                <div className="space-y-2">
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Resolution History & Timeline</div>
                  <div className="space-y-1.5 bg-slate-50/70 p-3 rounded-xl border border-slate-100 font-mono text-[11px]">
                    <div>Created At: <span className="text-slate-900">{new Date(selectedAlert.createdAt).toLocaleString()}</span></div>
                    {selectedAlert.acknowledgedAt && (
                      <div>Acknowledged At: <span className="text-slate-900">{new Date(selectedAlert.acknowledgedAt).toLocaleString()}</span> by {selectedAlert.acknowledgedBy}</div>
                    )}
                    {selectedAlert.resolvedAt && (
                      <div>Resolved At: <span className="text-slate-900">{new Date(selectedAlert.resolvedAt).toLocaleString()}</span> by {selectedAlert.resolvedBy}</div>
                    )}
                    {selectedAlert.dismissedAt && (
                      <div>Dismissed At: <span className="text-slate-900">{new Date(selectedAlert.dismissedAt).toLocaleString()}</span> by {selectedAlert.dismissedBy}</div>
                    )}
                    {selectedAlert.resolutionReason && (
                      <div className="mt-1 pt-1 border-t border-slate-200 text-slate-800 font-sans">
                        <strong>Reason:</strong> {selectedAlert.resolutionReason}
                      </div>
                    )}
                  </div>
                </div>

                {/* Recent Audit Events */}
                {selectedAlertDetail.recentAuditEvents && selectedAlertDetail.recentAuditEvents.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Correlated Audit Events</div>
                    <div className="max-h-36 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50 p-2 space-y-1">
                      {selectedAlertDetail.recentAuditEvents.map((e: any) => (
                        <div key={e.id} className="flex items-center justify-between text-[11px] py-1 px-2 hover:bg-white rounded">
                          <div>
                            <span className="font-bold text-slate-900">{e.action}</span>
                            <span className="text-slate-500 ml-2">{e.details}</span>
                          </div>
                          <span className="text-slate-400 font-mono text-[10px]">{new Date(e.timestamp).toLocaleTimeString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
              {selectedAlert.status === 'OPEN' && (
                <button
                  onClick={() => openAlertActionModal(selectedAlert, 'acknowledge')}
                  className="px-4 py-2 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-xl border border-amber-200 shadow-sm"
                >
                  Acknowledge Alert
                </button>
              )}
              {(selectedAlert.status === 'OPEN' || selectedAlert.status === 'ACKNOWLEDGED') && (
                <button
                  onClick={() => openAlertActionModal(selectedAlert, 'resolve')}
                  className="px-4 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl border border-emerald-200 shadow-sm"
                >
                  Resolve Alert
                </button>
              )}
              {selectedAlert.status !== 'DISMISSED' && selectedAlert.status !== 'RESOLVED' && (
                <button
                  onClick={() => openAlertActionModal(selectedAlert, 'dismiss')}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
                >
                  Dismiss Alert
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MANDATORY REASON ACTION MODAL */}
      {alertActionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 capitalize">
                {alertActionModal.action} Platform Alert
              </h3>
              <button
                onClick={() => setAlertActionModal(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div>
              <div className="text-xs font-bold text-slate-800">{alertActionModal.alert.title}</div>
              <div className="text-[11px] text-slate-500">{alertActionModal.alert.description}</div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                Mandatory Administrative Justification Reason <span className="text-rose-600">*</span>
              </label>
              <textarea
                rows={3}
                placeholder={`Provide mandatory reason for ${alertActionModal.action}ing this alert...`}
                value={alertActionModal.reason}
                onChange={e => setAlertActionModal({ ...alertActionModal, reason: e.target.value })}
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              />
              <p className="text-[10px] text-slate-400">
                This reason will be atomically committed to the immutable audit trail.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                onClick={() => setAlertActionModal(null)}
                className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                disabled={!alertActionModal.reason.trim() || Boolean(busy?.startsWith('alert:'))}
                onClick={executeAlertAction}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-sm"
              >
                {busy?.startsWith('alert:') && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Confirm {alertActionModal.action}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Escalation SLA Policy Modal */}
      {editingPolicyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900">
                Configure {editingPolicyModal.policy.name}
              </h3>
              <button
                onClick={() => setEditingPolicyModal(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Escalation Threshold (Minutes)
                </label>
                <input
                  type="number"
                  min={1}
                  value={editingPolicyModal.thresholdMinutes}
                  onChange={e => setEditingPolicyModal({
                    ...editingPolicyModal,
                    thresholdMinutes: Math.max(1, parseInt(e.target.value) || 1)
                  })}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Unresolved alerts exceeding this duration will automatically trigger escalation notifications.
                </p>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingPolicyModal.enabled}
                  onChange={e => setEditingPolicyModal({
                    ...editingPolicyModal,
                    enabled: e.target.checked
                  })}
                  className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-xs font-bold text-slate-800">Enable Automated Escalation Policy</span>
              </label>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Mandatory Administrative Justification <span className="text-rose-600">*</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Provide justification for modifying SLA policy settings..."
                  value={editingPolicyModal.reason}
                  onChange={e => setEditingPolicyModal({ ...editingPolicyModal, reason: e.target.value })}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                onClick={() => setEditingPolicyModal(null)}
                className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                disabled={!editingPolicyModal.reason.trim() || Boolean(busy?.startsWith('policy:'))}
                onClick={handleSaveEscalationPolicy}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-sm"
              >
                {busy?.startsWith('policy:') && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Save SLA Policy
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
