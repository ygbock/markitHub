import React from 'react';
import { 
  Percent, TrendingUp, DollarSign, 
  BarChart2, ArrowUpRight, Scale, Award 
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, 
  YAxis, Tooltip, CartesianGrid, Legend 
} from 'recharts';
import { Order, Product } from '../../../types';
import { useCurrency } from '../../../context/CurrencyContext';

interface GrossProfitReportProps {
  orders: Order[];
  products: Product[];
}

export default function GrossProfitReport({ orders, products }: GrossProfitReportProps) {
  const { formatAmount } = useCurrency();

  let totalSales = 0;
  let totalCogs = 0;

  orders.forEach(o => {
    if (o.status !== 'Refunded') {
      const rev = o.subtotal || 0;
      totalSales += rev;
      const cogs = o.cogs || (rev * 0.45);
      totalCogs += cogs;
    }
  });

  const totalProfit = totalSales - totalCogs;
  const marginPercent = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;
  const markupPercent = totalCogs > 0 ? (totalProfit / totalCogs) * 100 : 0;

  // Category profitability breakdown
  const categoryProfitMap: Record<string, { category: string; revenue: number; cogs: number; profit: number; margin: number }> = {};

  products.forEach(p => {
    const cat = p.category || 'General';
    if (!categoryProfitMap[cat]) {
      categoryProfitMap[cat] = { category: cat, revenue: 0, cogs: 0, profit: 0, margin: 0 };
    }
    const units = p.salesCount || 0;
    const catRev = units * p.price;
    const catCost = units * (p.cost || p.price * 0.45);
    categoryProfitMap[cat].revenue += catRev;
    categoryProfitMap[cat].cogs += catCost;
  });

  const categoryProfitRows = Object.values(categoryProfitMap).map(c => {
    const profit = c.revenue - c.cogs;
    const margin = c.revenue > 0 ? (profit / c.revenue) * 100 : 0;
    return {
      ...c,
      profit,
      margin
    };
  }).sort((a, b) => b.profit - a.profit);

  return (
    <div className="space-y-6" id="gross-profit-report">
      
      {/* 1. Header Highlight KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-4">
        
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-3xl p-5 space-y-1">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-xs font-bold uppercase tracking-wider">Gross Profit Generated</span>
            <TrendingUp className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-emerald-800 font-mono">
            {formatAmount(totalProfit)}
          </div>
          <p className="text-[11px] text-emerald-700/80">Net Sales less direct product procurement cost</p>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Gross Margin %</span>
            <Percent className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-indigo-600 font-mono">
            {marginPercent.toFixed(1)}%
          </div>
          <p className="text-[11px] text-slate-400">Profit as a share of realized net revenue</p>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Average Product Markup</span>
            <Scale className="w-4 h-4 text-cyan-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {markupPercent.toFixed(1)}%
          </div>
          <p className="text-[11px] text-slate-400">Average price multiplier over cost basis</p>
        </div>

      </div>

      {/* 2. Visual Profit Comparison by Category */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-900">Profit Contribution & Margins by Category</h3>
            <p className="text-xs text-slate-400">Comparing gross revenue vs direct COGS to isolate net profit generators</p>
          </div>
          <BarChart2 className="w-4 h-4 text-slate-400" />
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={categoryProfitRows} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="category" tick={{ fontSize: 11, fill: '#64748b' }} interval={0} angle={-15} textAnchor="end" />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(v) => `$${v}`} />
              <Tooltip 
                formatter={(val: number) => [formatAmount(val), 'Amount']}
                contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', color: '#fff', border: 'none', fontSize: '12px' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Bar dataKey="profit" name="Gross Profit" fill="#10b981" radius={[6, 6, 0, 0]} />
              <Bar dataKey="cogs" name="COGS (Cost)" fill="#cbd5e1" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. Category Profitability Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100">
          <h3 className="text-sm font-black text-slate-900">Department Profitability Matrix</h3>
          <p className="text-xs text-slate-400">Category gross revenue, COGS, gross profit dollars, and margin percentages</p>
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Department / Category</th>
                <th className="py-3 px-4 text-right">Gross Revenue</th>
                <th className="py-3 px-4 text-right">Cost of Goods (COGS)</th>
                <th className="py-3 px-4 text-right">Gross Profit ($)</th>
                <th className="py-3 px-4 text-right">Margin %</th>
                <th className="py-3 px-4 text-right">Markup %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {categoryProfitRows.map(c => {
                const catMarkup = c.cogs > 0 ? (c.profit / c.cogs) * 100 : 0;
                return (
                  <tr key={c.category} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">{c.category}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-700">{formatAmount(c.revenue)}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-500">{formatAmount(c.cogs)}</td>
                    <td className="py-3 px-4 text-right font-mono font-black text-emerald-600">{formatAmount(c.profit)}</td>
                    <td className="py-3 px-4 text-right">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {c.margin.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-600 font-bold">{catMarkup.toFixed(1)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile & Tablet Grid View */}
        <div className="block lg:hidden p-2.5 sm:p-4 grid grid-cols-2 gap-2 sm:gap-3 bg-slate-50/50">
          {categoryProfitRows.map(c => {
            const catMarkup = c.cogs > 0 ? (c.profit / c.cogs) * 100 : 0;
            return (
              <div key={c.category} className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-bold text-xs text-slate-900">{c.category}</div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                    {c.margin.toFixed(1)}% margin
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1.5 border-t border-slate-100">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Gross Profit:</span>
                    <span className="font-mono font-black text-emerald-600">{formatAmount(c.profit)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 block text-[10px]">Markup:</span>
                    <span className="font-mono font-bold text-slate-700">{catMarkup.toFixed(1)}%</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Revenue:</span>
                    <span className="font-mono font-bold text-slate-900">{formatAmount(c.revenue)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 block text-[10px]">COGS (Cost):</span>
                    <span className="font-mono text-slate-500">{formatAmount(c.cogs)}</span>
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
