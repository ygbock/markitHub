import React from 'react';
import { 
  TrendingUp, DollarSign, Calendar, 
  ArrowUpRight, ShoppingCart, Percent, Layers 
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, 
  YAxis, Tooltip, CartesianGrid 
} from 'recharts';
import { Order } from '../../../types';
import { useCurrency } from '../../../context/CurrencyContext';

interface RevenueReportProps {
  orders: Order[];
}

export default function RevenueReport({ orders }: RevenueReportProps) {
  const { formatAmount } = useCurrency();

  const validOrders = orders.filter(o => o.status !== 'Refunded');
  const totalGross = validOrders.reduce((sum, o) => sum + (o.subtotal || 0) + (o.discount || 0), 0);
  const totalNet = validOrders.reduce((sum, o) => sum + (o.subtotal || 0), 0);
  const totalTax = validOrders.reduce((sum, o) => sum + (o.tax || 0), 0);
  const totalDiscounts = validOrders.reduce((sum, o) => sum + (o.discount || 0), 0);

  // Group by date for daily chart
  const dateMap: Record<string, { date: string; gross: number; net: number; tax: number }> = {};
  
  orders.forEach(o => {
    const dStr = new Date(o.date).toISOString().split('T')[0];
    if (!dateMap[dStr]) {
      dateMap[dStr] = { date: dStr, gross: 0, net: 0, tax: 0 };
    }
    if (o.status !== 'Refunded') {
      dateMap[dStr].gross += (o.subtotal || 0) + (o.discount || 0);
      dateMap[dStr].net += (o.subtotal || 0);
      dateMap[dStr].tax += (o.tax || 0);
    }
  });

  const chartData = Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="space-y-6" id="revenue-report">
      
      {/* 1. Metric Header Highlights */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4">
        
        <div className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-slate-200/80 shadow-2xs space-y-1.5 sm:space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider truncate">Gross Revenue</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-base sm:text-2xl font-black text-slate-900 font-mono truncate">
            {formatAmount(totalGross)}
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">Gross catalog sales</p>
        </div>

        <div className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-slate-200/80 shadow-2xs space-y-1.5 sm:space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider truncate">Net Realized</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-base sm:text-2xl font-black text-blue-700 font-mono truncate">
            {formatAmount(totalNet)}
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">After discounts</p>
        </div>

        <div className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-slate-200/80 shadow-2xs space-y-1.5 sm:space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider truncate">Collected Tax</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <Percent className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-base sm:text-2xl font-black text-purple-700 font-mono truncate">
            {formatAmount(totalTax)}
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">Remittable sales tax</p>
        </div>

        <div className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-slate-200/80 shadow-2xs space-y-1.5 sm:space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider truncate">Total Invoiced</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-base sm:text-2xl font-black text-emerald-600 font-mono truncate">
            {formatAmount(totalNet + totalTax)}
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">Total customer tender</p>
        </div>

      </div>

      {/* 2. Visual Daily Revenue Area Chart */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-900">Daily Revenue Timeline</h3>
            <p className="text-xs text-slate-400">Gross and net revenue pacing over time</p>
          </div>
          <TrendingUp className="w-4 h-4 text-slate-400" />
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
              <defs>
                <linearGradient id="netRevGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(v) => `$${v}`} />
              <Tooltip 
                formatter={(val: number) => [formatAmount(val), 'Revenue']}
                contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', color: '#fff', border: 'none', fontSize: '12px' }}
              />
              <Area type="monotone" dataKey="net" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#netRevGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}
