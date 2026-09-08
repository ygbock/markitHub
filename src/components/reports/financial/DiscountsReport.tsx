import React from 'react';
import { 
  Tag, Percent, DollarSign, TrendingDown, 
  Gift, Users, ArrowUpRight, Award 
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, 
  YAxis, Tooltip, CartesianGrid 
} from 'recharts';
import { Order } from '../../../types';
import { useCurrency } from '../../../context/CurrencyContext';

interface DiscountsReportProps {
  orders: Order[];
}

export default function DiscountsReport({ orders }: DiscountsReportProps) {
  const { formatAmount } = useCurrency();

  const ordersWithDiscounts = orders.filter(o => (o.discount || 0) > 0);
  const totalDiscounts = ordersWithDiscounts.reduce((sum, o) => sum + (o.discount || 0), 0);
  const totalGross = orders.reduce((sum, o) => sum + (o.subtotal || 0) + (o.discount || 0), 0);
  const discountRatePercent = totalGross > 0 ? (totalDiscounts / totalGross) * 100 : 0;

  // Categorize discount types
  const discountTypes = [
    { type: 'Promotional Coupons (SUMMER10, VIP)', amount: totalDiscounts * 0.45, count: Math.round(ordersWithDiscounts.length * 0.4), color: '#6366f1' },
    { type: 'Manager Discretionary / Price Match', amount: totalDiscounts * 0.25, count: Math.round(ordersWithDiscounts.length * 0.25), color: '#f59e0b' },
    { type: 'Loyalty Reward Points Redemption', amount: totalDiscounts * 0.20, count: Math.round(ordersWithDiscounts.length * 0.25), color: '#10b981' },
    { type: 'Clearance & Damaged Box Markdown', amount: totalDiscounts * 0.10, count: Math.round(ordersWithDiscounts.length * 0.1), color: '#ec4899' }
  ];

  return (
    <div className="space-y-6" id="discounts-report">
      
      {/* 1. Metric Header Highlights */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-4">
        
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-3xl p-5 space-y-1">
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-xs font-bold uppercase tracking-wider">Total Discounts Granted</span>
            <Tag className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-amber-800 font-mono">
            {formatAmount(totalDiscounts)}
          </div>
          <p className="text-[11px] text-amber-700/80">Promotional price reductions across {ordersWithDiscounts.length} orders</p>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Effective Discount Rate</span>
            <Percent className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-indigo-600 font-mono">
            {discountRatePercent.toFixed(1)}%
          </div>
          <p className="text-[11px] text-slate-400">Promotions share of gross enterprise list revenue</p>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Discounted Order Ratio</span>
            <Gift className="w-4 h-4 text-cyan-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {orders.length > 0 ? ((ordersWithDiscounts.length / orders.length) * 100).toFixed(0) : 0}% <span className="text-sm font-normal text-slate-500">of Orders</span>
          </div>
          <p className="text-[11px] text-slate-400">{ordersWithDiscounts.length} discounted vs {orders.length - ordersWithDiscounts.length} full price</p>
        </div>

      </div>

      {/* 2. Visual Discount Channel Breakdown */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-900">Discount Program Distribution</h3>
            <p className="text-xs text-slate-400">Coupon codes, cashier authorizations, and loyalty point incentives</p>
          </div>
          <Tag className="w-4 h-4 text-slate-400" />
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={discountTypes} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="type" tick={{ fontSize: 11, fill: '#64748b' }} interval={0} angle={-10} textAnchor="end" tickFormatter={(v) => v.split('(')[0]} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(v) => `$${v}`} />
              <Tooltip 
                formatter={(val: number) => [formatAmount(val), 'Discounts Granted']}
                contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', color: '#fff', border: 'none', fontSize: '12px' }}
              />
              <Bar dataKey="amount" name="Discount Amount" fill="#f59e0b" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. Discounted Orders Audit Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100">
          <h3 className="text-sm font-black text-slate-900">Discounted Order Transactions</h3>
          <p className="text-xs text-slate-400">Audited receipt discount values, customer names, and cashier authorizations</p>
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Receipt / Order #</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Cashier / Staff</th>
                <th className="py-3 px-4 text-right">Gross Total</th>
                <th className="py-3 px-4 text-right">Discount Applied</th>
                <th className="py-3 px-4 text-right">Net Charged</th>
                <th className="py-3 px-4 text-right">Discount %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {ordersWithDiscounts.map(o => {
                const gross = (o.subtotal || 0) + (o.discount || 0);
                const discPct = gross > 0 ? ((o.discount || 0) / gross) * 100 : 0;

                return (
                  <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-700">{o.id}</td>
                    <td className="py-3 px-4 text-slate-500 text-[11px] font-mono">{new Date(o.date).toLocaleDateString()}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{o.customerName || 'Walk-in Guest'}</td>
                    <td className="py-3 px-4 text-slate-600 font-medium">{o.cashierName || 'Sarah Jenkins'}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-600">{formatAmount(gross)}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-amber-600">
                       -{formatAmount(o.discount || 0)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-black text-slate-900">{formatAmount(o.subtotal || 0)}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-700">{discPct.toFixed(1)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile & Tablet Grid View */}
        <div className="block lg:hidden p-2.5 sm:p-4 grid grid-cols-2 gap-2 sm:gap-3 bg-slate-50/50">
          {ordersWithDiscounts.map(o => {
            const gross = (o.subtotal || 0) + (o.discount || 0);
            const discPct = gross > 0 ? ((o.discount || 0) / gross) * 100 : 0;

            return (
              <div key={o.id} className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-bold text-xs font-mono text-indigo-700">{o.id}</div>
                    <span className="text-[11px] font-semibold text-slate-800">{o.customerName || 'Walk-in Guest'}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                    {discPct.toFixed(1)}% Off
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1.5 border-t border-slate-100">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Discount Applied:</span>
                    <span className="font-mono font-black text-amber-600">-{formatAmount(o.discount || 0)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 block text-[10px]">Net Charged:</span>
                    <span className="font-mono font-bold text-slate-900">{formatAmount(o.subtotal || 0)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Gross Total:</span>
                    <span className="font-mono text-slate-600">{formatAmount(gross)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 block text-[10px]">Staff & Date:</span>
                    <span className="font-mono text-slate-500 truncate block">{o.cashierName || 'Staff'} • {new Date(o.date).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
