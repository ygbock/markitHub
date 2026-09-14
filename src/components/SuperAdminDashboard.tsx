import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BadgeDollarSign,
  Ban,
  Building2,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Gauge,
  Layers3,
  Loader2,
  Plus,
  RefreshCw,
  Settings2,
  ShieldCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { getAuth } from 'firebase/auth';

type Tab = 'overview' | 'plans' | 'tenants' | 'billing' | 'usage';

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
  lifecycleStatus: 'provisioning' | 'trialing' | 'active' | 'suspended' | 'cancelled';
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
  const normalized = value.replace('_', ' ');
  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-600">
      {normalized}
    </span>
  );
}

export default function SuperAdminDashboard() {
  const [tab, setTab] = useState<Tab>('overview');
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [usage, setUsage] = useState<UsageRow[]>([]);
  const [billing, setBilling] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);

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
      const [dashboardRes, plansRes, tenantsRes, usageRes, billingRes] = await Promise.all([
        apiFetch<DashboardData>('/api/platform/dashboard'),
        apiFetch<{ plans: Plan[] }>('/api/platform/plans'),
        apiFetch<{ tenants: Tenant[] }>('/api/platform/tenants?limit=100'),
        apiFetch<{ usage: UsageRow[] }>('/api/platform/usage'),
        apiFetch<BillingData>('/api/platform/billing'),
      ]);
      setDashboard(dashboardRes);
      setPlans(plansRes.plans || []);
      setTenants(tenantsRes.tenants || []);
      setUsage(usageRes.usage || []);
      setBilling(billingRes);
      if (!provisionForm.planId && plansRes.plans?.[0]) {
        setProvisionForm(prev => ({ ...prev, planId: plansRes.plans[0].id }));
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to load platform control plane.');
    } finally {
      setLoading(false);
    }
  }, [provisionForm.planId]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const activePlans = useMemo(() => plans.filter(plan => plan.status === 'active'), [plans]);

  const provisionTenant = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!provisionForm.name.trim() || !provisionForm.ownerUid.trim()) return;
    setBusy('provision');
    setNotice(null);
    try {
      await apiFetch('/api/platform/tenants', {
        method: 'POST',
        body: JSON.stringify(provisionForm),
      });
      setProvisionForm(prev => ({ ...prev, name: '', ownerUid: '', ownerEmail: '' }));
      setNotice('Tenant provisioned successfully with owner membership and subscription.');
      await loadAll();
      setTab('tenants');
    } catch (err: any) {
      setError(err?.message || 'Tenant provisioning failed.');
    } finally {
      setBusy(null);
    }
  };

  const changeSubscription = async (tenant: Tenant, planId: string, interval: 'monthly' | 'annual') => {
    setBusy(`subscription:${tenant.id}`);
    setError(null);
    try {
      await apiFetch(`/api/platform/tenants/${encodeURIComponent(tenant.id)}/subscription`, {
        method: 'PATCH',
        body: JSON.stringify({ planId, billingInterval: interval }),
      });
      setNotice(`${tenant.name} subscription updated.`);
      await loadAll();
    } catch (err: any) {
      setError(err?.message || 'Subscription update failed.');
    } finally {
      setBusy(null);
    }
  };

  const changeLifecycle = async (tenant: Tenant, lifecycleStatus: Tenant['lifecycleStatus']) => {
    const reason = window.prompt(`Reason for changing ${tenant.name} to ${lifecycleStatus}:`);
    if (!reason?.trim()) return;
    setBusy(`lifecycle:${tenant.id}`);
    setError(null);
    try {
      await apiFetch(`/api/platform/tenants/${encodeURIComponent(tenant.id)}/lifecycle`, {
        method: 'PATCH',
        body: JSON.stringify({ lifecycleStatus, reason: reason.trim() }),
      });
      setNotice(`${tenant.name} lifecycle changed to ${lifecycleStatus}.`);
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
    ['plans', 'Subscriptions / Plans', Layers3],
    ['tenants', 'Tenant Provisioning', UserPlus],
    ['billing', 'Billing', CreditCard],
    ['usage', 'Usage', Activity],
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
              <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">Super Admin Operations</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-400">
                Govern plans, provision tenants, manage lifecycle state, and monitor platform billing and operational usage.
              </p>
            </div>
            <button onClick={loadAll} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-2.5 text-sm font-bold hover:bg-white/15 disabled:opacity-60">
              <RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} /> Refresh control plane
            </button>
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
          {tab === 'overview' && dashboard && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
                {cards.map(({ label, value, icon: Icon }) => (
                  <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <Icon className="h-5 w-5 text-indigo-600" />
                    <div className="mt-4 text-2xl font-black text-slate-900">{value.toLocaleString()}</div>
                    <div className="mt-1 text-xs font-semibold text-slate-500">{label}</div>
                  </div>
                ))}
              </div>

              <div className="grid gap-6 xl:grid-cols-[1.3fr_.7fr]">
                <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-100 p-5">
                    <h2 className="font-black text-slate-900">Tenant portfolio</h2>
                    <p className="mt-1 text-xs text-slate-500">Operational state and current subscription posture.</p>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {tenants.slice(0, 8).map(tenant => (
                      <button key={tenant.id} onClick={() => { setSelectedTenant(tenant); setTab('tenants'); }} className="flex w-full items-center justify-between gap-4 p-4 text-left hover:bg-slate-50">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-black text-slate-800">{tenant.name}</div>
                          <div className="mt-1 text-xs text-slate-500">{tenant.subscription.planName} · {tenant.subscription.status}</div>
                        </div>
                        <div className="flex items-center gap-2"><StatusPill value={tenant.lifecycleStatus} /><ChevronRight className="h-4 w-4 text-slate-400" /></div>
                      </button>
                    ))}
                    {!tenants.length && <div className="p-8 text-center text-sm text-slate-500">No tenants provisioned yet.</div>}
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-100 p-5">
                    <h2 className="font-black text-slate-900">Platform billing pulse</h2>
                    <p className="mt-1 text-xs text-slate-500">Subscription-derived run rate; payment collection is intentionally separate.</p>
                  </div>
                  <div className="space-y-4 p-5">
                    <div className="rounded-2xl bg-slate-950 p-5 text-white">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Estimated MRR</div>
                      <div className="mt-2 text-3xl font-black">{money(billing?.summary.estimatedMonthlyRunRate || 0, billing?.summary.currency || 'USD')}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        ['Active', billing?.summary.activeSubscriptions || 0],
                        ['Trials', billing?.summary.trialSubscriptions || 0],
                        ['Past due', billing?.summary.pastDueSubscriptions || 0],
                        ['Suspended', billing?.summary.suspendedSubscriptions || 0],
                      ].map(([label, value]) => <div key={String(label)} className="rounded-2xl border border-slate-200 p-4"><div className="text-[10px] font-bold uppercase text-slate-400">{label}</div><div className="mt-1 text-xl font-black text-slate-900">{value}</div></div>)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 p-5"><h2 className="font-black text-slate-900">Recent platform audit</h2></div>
                <div className="divide-y divide-slate-100">
                  {dashboard.recentAuditEvents.map(event => <div key={event.id} className="flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="text-sm font-bold text-slate-800">{event.action}</div><div className="text-xs text-slate-500">{event.tenantId} · {event.severity}</div></div><div className="text-xs text-slate-500">{event.result} · {dateLabel(event.timestamp)}</div></div>)}
                  {!dashboard.recentAuditEvents.length && <div className="p-8 text-center text-sm text-slate-500">No recent platform events.</div>}
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
                        <td className="px-5 py-4 text-right"><select value="" onChange={e => { if (e.target.value) changeLifecycle(tenant, e.target.value as Tenant['lifecycleStatus']); e.currentTarget.value = ''; }} className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-bold"><option value="">Change state…</option><option value="active">Activate</option><option value="suspended">Suspend</option><option value="cancelled">Cancel</option></select></td>
                      </tr>)}
                    </tbody>
                  </table>
                  {!tenants.length && <div className="p-10 text-center text-sm text-slate-500">No tenants found.</div>}
                </div>
              </div>

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
                <strong>Usage basis:</strong> current Firestore record counts for staff, products, orders, and audit events. This is an operational usage view; true billable usage metering should later consume immutable usage events.
              </div>
              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 p-5"><h2 className="font-black text-slate-900">Tenant usage</h2><p className="mt-1 text-xs text-slate-500">Bounded to the first 100 platform tenants.</p></div>
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
