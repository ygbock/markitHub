import React, { useState, useEffect } from 'react';
import { ShoppingCart, RefreshCw, AlertTriangle, CheckCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { AbandonedCartSession } from '../../../utils/cartTracker';
import { useCurrency } from '../../../context/CurrencyContext';

export default function ECommerceAbandonedCartAnalytics() {
  const [carts, setCarts] = useState<AbandonedCartSession[]>([]);
  const [loading, setLoading] = useState(true);
  const { formatAmount } = useCurrency();

  useEffect(() => {
    fetchCarts();
  }, []);

  const fetchCarts = async () => {
    setLoading(true);
    try {
      const cartsObj = JSON.parse(localStorage.getItem('abandoned_carts') || '{}');
      const cartsArr = Object.values(cartsObj) as AbandonedCartSession[];
      // Sort by lastActive descending
      cartsArr.sort((a, b) => b.lastActive - a.lastActive);
      
      const now = Date.now();
      const updatedCarts = cartsArr.map(cart => {
         if (cart.status === 'active' && now - cart.lastActive > 3600000) {
             return { ...cart, status: 'abandoned' as const };
         }
         return cart;
      });
      setCarts(updatedCarts);
    } catch (error) {
      console.warn('Failed to fetch abandoned carts', error);
    } finally {
      setLoading(false);
    }
  };

  const totalCarts = carts.length;
  const recoveredCarts = carts.filter(c => c.status === 'completed').length;
  const conversionRate = totalCarts > 0 ? ((recoveredCarts / totalCarts) * 100).toFixed(1) : '0.0';
  const potentialLostRevenue = carts.filter(c => c.status !== 'completed').reduce((sum, cart) => sum + cart.subtotal, 0);

  return (
    <div className="space-y-6 mt-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Abandoned Cart Tracking</h2>
          <p className="text-sm text-slate-500">Monitor unfinished checkout sessions and conversion rates.</p>
        </div>
        <button onClick={fetchCarts} className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-semibold rounded-lg transition-colors">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-700">Total Tracked Carts</h3>
          </div>
          <p className="text-3xl font-black text-slate-900">{totalCarts}</p>
        </div>
        
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
              <CheckCircle className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-700">Conversion Rate</h3>
          </div>
          <div className="flex items-end gap-2">
            <p className="text-3xl font-black text-slate-900">{conversionRate}%</p>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1 mb-1">
              <TrendingUp className="w-3 h-3" /> +1.2%
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-700">Lost Revenue</h3>
          </div>
          <div className="flex items-end gap-2">
            <p className="text-3xl font-black text-slate-900 font-mono">{formatAmount(potentialLostRevenue)}</p>
            <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md flex items-center gap-1 mb-1">
              <TrendingDown className="w-3 h-3" /> Action req.
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
              <tr>
                <th className="px-6 py-4">Session ID</th>
                <th className="px-6 py-4">Customer Email</th>
                <th className="px-6 py-4">Items</th>
                <th className="px-6 py-4">Subtotal</th>
                <th className="px-6 py-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {carts.map((cart) => (
                <tr key={cart.sessionId} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-mono text-xs text-slate-500">{cart.sessionId.slice(0, 12)}...</td>
                  <td className="px-6 py-4 font-bold text-slate-800">{cart.customerEmail}</td>
                  <td className="px-6 py-4 text-slate-600">{cart.items.length} items</td>
                  <td className="px-6 py-4 font-mono font-bold text-slate-900">{formatAmount(cart.subtotal)}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold ${
                      cart.status === 'completed' 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                        : 'bg-orange-50 text-orange-700 border border-orange-200'
                    }`}>
                      {cart.status === 'completed' ? 'Recovered / Paid' : 'Abandoned'}
                    </span>
                  </td>
                </tr>
              ))}
              {carts.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    No abandoned cart sessions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
