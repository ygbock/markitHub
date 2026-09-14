import React, { useEffect, useState } from 'react';
import { Activity, Building2, ShieldCheck, Users, AlertTriangle, RefreshCw } from 'lucide-react';
import { getAuth } from 'firebase/auth';

interface PlatformTenant {
  id: string;
  name: string;
  status: string;
  ownerUid?: string;
  updatedAt?: string;
}

interface PlatformDashboardResponse {
  success: boolean;
  metrics: {
    tenantCount: number;
    activeTenantCount: number;
    suspendedTenantCount: number;
    staffCount: number;
    recentAuditCount: number;
  };
  tenants: PlatformTenant[];
  recentAuditEvents: Array<{
    id: string;
    action: string;
    tenantId: string;
    result: string;
    severity: string;
    timestamp: string;
  }>;
}

async function fetchPlatformDashboard(): Promise<PlatformDashboardResponse> {
  const auth = getAuth();
  const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
  const response = await fetch('/api/platform/dashboard', {
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error || `Platform dashboard failed (HTTP ${response.status})`);
  return body;
}

export default function SuperAdminDashboard() {
  const [data, setData] = useState<PlatformDashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchPlatformDashboard());
    } catch (err: any) {
      setError(err?.message || 'Unable to load platform dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const cards = data ? [
    { label: 'Total Tenants', value: data.metrics.tenantCount, icon: Building2 },
    { label: 'Active Tenants', value: data.metrics.activeTenantCount, icon: ShieldCheck },
    { label: 'Suspended Tenants', value: data.metrics.suspendedTenantCount, icon: AlertTriangle },
    { label: 'Platform Staff', value: data.metrics.staffCount, icon: Users },
    { label: 'Recent Audit Events', value: data.metrics.recentAuditCount, icon: Activity },
  ] : [];

  return (
    <section className="space-y-6" id="super-admin-dashboard">
      <div className="rounded-3xl bg-slate-950 text-white p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-400/20 text-indigo-300 text-[10px] font-bold uppercase tracking-widest">
              Platform Control Plane
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl font-black tracking-tight">Super Admin Dashboard</h1>
            <p className="mt-1 text-sm text-slate-400">Cross-tenant platform health and governance. Tenant administrators cannot access this view.</p>
          </div>
          <button onClick={load} disabled={loading} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-sm font-bold">
            <RefreshCw className={loading ? 'w-4 h-4 animate-spin' : 'w-4 h-4'} /> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <strong>Platform access unavailable:</strong> {error}
        </div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {cards.map(({ label, value, icon: Icon }) => (
              <div key={label} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <Icon className="w-5 h-5 text-indigo-600" />
                <div className="mt-4 text-2xl font-black text-slate-900">{value.toLocaleString()}</div>
                <div className="mt-1 text-xs font-semibold text-slate-500">{label}</div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <h2 className="font-black text-slate-900">Tenant Portfolio</h2>
              <p className="text-xs text-slate-500 mt-1">First 100 tenants shown; platform metrics are authoritative server-side.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr><th className="text-left px-5 py-3">Tenant</th><th className="text-left px-5 py-3">Status</th><th className="text-left px-5 py-3">Owner</th><th className="text-left px-5 py-3">Updated</th></tr>
                </thead>
                <tbody>
                  {data.tenants.map(tenant => (
                    <tr key={tenant.id} className="border-t border-slate-100">
                      <td className="px-5 py-3 font-bold text-slate-800">{tenant.name || tenant.id}</td>
                      <td className="px-5 py-3"><span className="px-2 py-1 rounded-full bg-slate-100 text-xs font-bold">{tenant.status || 'active'}</span></td>
                      <td className="px-5 py-3 font-mono text-xs text-slate-500">{tenant.ownerUid || '—'}</td>
                      <td className="px-5 py-3 text-xs text-slate-500">{tenant.updatedAt ? new Date(tenant.updatedAt).toLocaleString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!data.tenants.length && <div className="p-8 text-center text-sm text-slate-500">No tenants found.</div>}
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <h2 className="font-black text-slate-900">Recent Platform Audit</h2>
              <p className="text-xs text-slate-500 mt-1">Cross-tenant events visible only to platform administrators.</p>
            </div>
            <div className="divide-y divide-slate-100">
              {data.recentAuditEvents.map(event => (
                <div key={event.id} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div><div className="font-bold text-slate-800">{event.action}</div><div className="text-xs text-slate-500">{event.tenantId} · {event.severity}</div></div>
                  <div className="text-xs text-slate-500">{event.result} · {new Date(event.timestamp).toLocaleString()}</div>
                </div>
              ))}
              {!data.recentAuditEvents.length && <div className="p-8 text-center text-sm text-slate-500">No recent platform audit events.</div>}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
