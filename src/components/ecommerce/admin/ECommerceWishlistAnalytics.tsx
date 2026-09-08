import ECommerceAbandonedCartAnalytics from "./ECommerceAbandonedCartAnalytics";
import React, { useMemo } from 'react';
import { Product, Order } from '../../../types';
import { BarChart, TrendingUp, AlertCircle, Heart, ShoppingBag } from 'lucide-react';
import { useCurrency } from '../../../context/CurrencyContext';

interface ECommerceWishlistAnalyticsProps {
  products: Product[];
  orders: Order[];
}

export default function ECommerceWishlistAnalytics({ products, orders }: ECommerceWishlistAnalyticsProps) {
  const { formatAmount } = useCurrency();

  // Generate mock wishlist numbers based on salesCount for demonstration
  // In a real database, this would be `wishlist_items` count
  const analyticsData = useMemo(() => {
    return products.map(p => {
      // Create a deterministic but realistic-looking mock data spread
      const wishlisted = Math.floor((p.salesCount * 3.5) + (p.price % 500) + 50);
      const purchases = p.salesCount;
      const conversion = wishlisted > 0 ? (purchases / wishlisted) * 100 : 0;
      
      let insight = '';
      let insightType: 'opportunity' | 'warning' | 'success' = 'opportunity';

      if (wishlisted > 500 && conversion < 5) {
        insight = 'High interest, low conversion. Price may be too high or awaiting discount.';
        insightType = 'warning';
      } else if (conversion > 15) {
        insight = 'Excellent conversion rate. Consider featuring on homepage.';
        insightType = 'success';
      } else {
        insight = 'Steady interest. Monitor stock levels closely.';
        insightType = 'opportunity';
      }

      return {
        product: p,
        wishlisted,
        purchases,
        conversion,
        insight,
        insightType,
        potentialRevenue: (wishlisted - purchases) * p.price
      };
    }).sort((a, b) => b.wishlisted - a.wishlisted).slice(0, 10);
  }, [products]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Wishlist & Conversion Analytics</h2>
        <p className="text-sm text-slate-500">Identify high-interest products with low sales to adjust pricing and promotional strategies.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-start gap-4">
          <div className="p-3 bg-pink-50 text-pink-600 rounded-xl">
            <Heart className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total Wishlist Adds</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">
              {analyticsData.reduce((acc, curr) => acc + curr.wishlisted, 0).toLocaleString()}
            </p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-start gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total Conversions</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">
              {analyticsData.reduce((acc, curr) => acc + curr.purchases, 0).toLocaleString()}
            </p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-start gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Avg. Conversion Rate</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">
              {(analyticsData.reduce((acc, curr) => acc + curr.conversion, 0) / analyticsData.length).toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
          <BarChart className="w-5 h-5 text-indigo-600" />
          <h3 className="font-bold text-slate-800">Missed Opportunities & Insights</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-white border-b border-slate-100 text-slate-500 font-medium">
              <tr>
                <th className="px-6 py-4">Product</th>
                <th className="px-6 py-4 text-right">Wishlisted</th>
                <th className="px-6 py-4 text-right">Purchases</th>
                <th className="px-6 py-4 text-right">Conversion</th>
                <th className="px-6 py-4">AI Insight</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {analyticsData.map(data => (
                <tr key={data.product.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {data.product.imageUrl ? (
                        <img src={data.product.imageUrl} alt={data.product.name} className="w-10 h-10 rounded-lg object-cover border border-slate-200" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center">
                          <ShoppingBag className="w-5 h-5 text-slate-400" />
                        </div>
                      )}
                      <div>
                        <div className="font-semibold text-slate-900">{data.product.name}</div>
                        <div className="text-xs text-slate-500">{formatAmount(data.product.price)}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-pink-600">
                    {data.wishlisted.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right font-semibold text-slate-700">
                    {data.purchases.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                      data.conversion < 5 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {data.conversion.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {data.insightType === 'warning' && <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />}
                      <span className="text-xs text-slate-600 whitespace-normal min-w-[200px]">{data.insight}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ABANDONED CART TRACKING MODULE */}
      <ECommerceAbandonedCartAnalytics />
    </div>
  );
}
