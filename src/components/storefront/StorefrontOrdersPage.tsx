import React, { useEffect, useState } from 'react';
import { Package, RefreshCw } from 'lucide-react';

interface Props {
  tenantSlug: string;
  authUser?: { getIdToken: () => Promise<string> } | null;
  onNavigate: (path: string) => void;
}

export default function StorefrontOrdersPage({ tenantSlug, authUser, onNavigate }: Props) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    if (!authUser) { setLoading(false); setError('Sign in to view your orders.'); return; }
    setLoading(true); setError('');
    try {
      const token = await authUser.getIdToken();
      const response = await fetch('/api/storefront/' + encodeURIComponent(tenantSlug) + '/orders', { headers: { Authorization: 'Bearer ' + token } });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error || 'Unable to load orders.');
      setOrders(Array.isArray(json.orders) ? json.orders : []);
    } catch (err: any) { setError(err?.message || 'Unable to load orders.'); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, [tenantSlug, authUser]);

  return <div className="min-h-screen bg-slate-50 p-5 md:p-8">
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between"><div><h1 className="text-3xl font-black">Your orders</h1><p className="text-sm text-slate-500 mt-1">Orders placed with this storefront.</p></div><button onClick={() => void load()} className="p-2 border rounded-xl bg-white"><RefreshCw className="w-4 h-4" /></button></div>
      {loading ? <div className="mt-8 bg-white border rounded-2xl p-8 text-center">Loading orders…</div> : error ? <div className="mt-8 bg-white border rounded-2xl p-8 text-center"><p className="text-red-600">{error}</p><button onClick={() => onNavigate('/login?returnUrl=' + encodeURIComponent('/store/' + tenantSlug + '/orders'))} className="mt-4 px-5 py-2 rounded-xl bg-slate-900 text-white font-bold">Sign in</button></div> : orders.length === 0 ? <div className="mt-8 bg-white border rounded-2xl p-10 text-center"><Package className="w-10 h-10 mx-auto text-slate-400" /><p className="mt-3 font-bold">No orders yet.</p></div> : <div className="mt-6 space-y-3">{orders.map(order => <article key={order.id} className="bg-white border rounded-2xl p-5 flex items-center justify-between gap-4"><div><div className="font-black">{order.orderNumber || order.id}</div><div className="text-sm text-slate-500 mt-1">{order.status} · {order.paymentStatus}</div></div><div className="font-black">{order.currency} {Number(order.grandTotal ?? order.totalAmount ?? 0).toFixed(2)}</div></article>)}</div>}
      <button onClick={() => onNavigate('/store/' + tenantSlug)} className="mt-6 underline text-sm">Back to storefront</button>
    </div>
  </div>;
}
