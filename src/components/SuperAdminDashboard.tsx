import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BadgeDollarSign,
  Ban,
  Building2,
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
  Settings2,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  UserPlus,
  Users,
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

type Tab = 'overview' | 'analytics_revenue' | 'analytics_usage' | 'analytics_health' | 'tenants' | 'plans' | 'billing';
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

  const [analyticsOverview, setAnalyticsOverview] = useState<any | null>(null);
  const [analyticsTenants, setAnalyticsTenants] = useState<any[]>([]);
  const [analyticsRevenue, setAnalyticsRevenue] = useState<any | null>(null);
  const [analyticsUsage, setAnalyticsUsage] = useState<any | null>(null);
  const [analyticsGrowth, setAnalyticsGrowth] = useState<any | null>(null);

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
      ] = await Promise.all([
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
      ]);
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
    </section>
  );
}
