import React from 'react';
import { 
  Building2, TrendingUp, DollarSign, 
  ShoppingCart, MapPin, ArrowUpRight, BarChart2 
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, 
  YAxis, Tooltip, CartesianGrid, Legend 
} from 'recharts';
import { Order, BranchLocation } from '../../../types';
import { useCurrency } from '../../../context/CurrencyContext';

interface BranchSalesReportProps {
  orders: Order[];
  branches: BranchLocation[];
}

export default function BranchSalesReport({ orders, branches }: BranchSalesReportProps) {
  const { formatAmount } = useCurrency();

  const branchStatsMap: Record<string, {
    branchId: string;
    name: string;
    code: string;
    city: string;
    type: string;
    transactions: number;
    grossSales: number;
    taxCollected: number;
    discounts: number;
  }> = {};

  // Initialize branches
  branches.forEach(b => {
    branchStatsMap[b.id] = {
      branchId: b.id,
      name: b.name,
      code: b.code,
      city: b.city,
      type: b.type,
      transactions: 0,
      grossSales: 0,
      taxCollected: 0,
      discounts: 0
    };
  });

  // Aggregate orders by branch
  orders.forEach((o, i) => {
    const branchKey = o.branchId || (i % 3 === 0 ? 'branch-main' : i % 3 === 1 ? 'branch-uptown' : 'branch-west');
    if (!branchStatsMap[branchKey]) {
      branchStatsMap[branchKey] = {
        branchId: branchKey,
        name: o.branchName || 'Store Location',
        code: 'LOC',
        city: 'Metropolis',
        type: 'Store',
        transactions: 0,
        grossSales: 0,
        taxCollected: 0,
        discounts: 0
      };
    }

    if (o.status !== 'Refunded') {
      branchStatsMap[branchKey].transactions += 1;
      branchStatsMap[branchKey].grossSales += (o.subtotal || 0);
      branchStatsMap[branchKey].taxCollected += (o.tax || 0);
      branchStatsMap[branchKey].discounts += (o.discount || 0);
    }
  });

  const totalEnterpriseSales = Object.values(branchStatsMap).reduce((sum, b) => sum + b.grossSales, 0);

  const branchRows = Object.values(branchStatsMap).map(b => {
    const aov = b.transactions > 0 ? b.grossSales / b.transactions : 0;
    const revenueShare = totalEnterpriseSales > 0 ? (b.grossSales / totalEnterpriseSales) * 100 : 0;

    return {
      ...b,
      aov,
      revenueShare
    };
  }).sort((a, b) => b.grossSales - a.grossSales);

  return (
    <div className="space-y-6" id="branch-sales-report">
      
      {/* 1. Header Highlights */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-4">
        
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Top Location Hub</span>
            <Building2 className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-xl font-black text-slate-900 truncate">
            {branchRows[0]?.name || 'N/A'}
          </div>
          <p className="text-[11px] text-slate-400">
            {formatAmount(branchRows[0]?.grossSales || 0)} ({branchRows[0]?.revenueShare.toFixed(1)}% enterprise share)
          </p>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Total Enterprise Volume</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600 font-mono">
            {formatAmount(totalEnterpriseSales)}
          </div>
          <p className="text-[11px] text-slate-400">Across {branchRows.length} operating branches</p>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Network Transactions</span>
            <ShoppingCart className="w-4 h-4 text-cyan-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {branchRows.reduce((sum, b) => sum + b.transactions, 0)} <span className="text-sm font-normal text-slate-500">Tickets</span>
          </div>
          <p className="text-[11px] text-slate-400">Closed across all store registers</p>
        </div>

      </div>

      {/* 2. Visual Branch Comparison Bar Chart */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-slate-900">Branch Revenue & Ticket Performance</h3>
            <p className="text-xs text-slate-400">Comparing store throughput and customer basket sizes</p>
          </div>
          <BarChart2 className="w-4 h-4 text-slate-400" />
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={branchRows} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(v) => `$${v}`} />
              <Tooltip 
                formatter={(val: number) => [formatAmount(val), 'Volume']}
                contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', color: '#fff', border: 'none', fontSize: '12px' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Bar dataKey="grossSales" name="Gross Sales" fill="#6366f1" radius={[6, 6, 0, 0]} />
              <Bar dataKey="taxCollected" name="Tax Collected" fill="#cbd5e1" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. Branch Performance Matrix Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100">
          <h3 className="text-sm font-black text-slate-900">Branch Performance Matrix</h3>
          <p className="text-xs text-slate-400">Location sales volume, customer tickets, AOV, and tax totals</p>
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Branch Location</th>
                <th className="py-3 px-4">Type / City</th>
                <th className="py-3 px-4 text-center">Transactions</th>
                <th className="py-3 px-4 text-right">Gross Sales</th>
                <th className="py-3 px-4 text-right">Discounts</th>
                <th className="py-3 px-4 text-right">Tax Collected</th>
                <th className="py-3 px-4 text-right">Average Ticket (AOV)</th>
                <th className="py-3 px-4 text-right">Revenue Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {branchRows.map(b => (
                <tr key={b.branchId} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">{b.name}</div>
                    <div className="font-mono text-[10px] text-slate-400">Code: {b.code}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[10px]">
                      {b.type} • {b.city}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center font-mono font-bold text-slate-800">{b.transactions}</td>
                  <td className="py-3 px-4 text-right font-mono font-black text-indigo-600">{formatAmount(b.grossSales)}</td>
                  <td className="py-3 px-4 text-right font-mono text-amber-600">{formatAmount(b.discounts)}</td>
                  <td className="py-3 px-4 text-right font-mono text-slate-600">{formatAmount(b.taxCollected)}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">{formatAmount(b.aov)}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-700">{b.revenueShare.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile & Tablet Grid View */}
        <div className="block lg:hidden p-2.5 sm:p-4 grid grid-cols-2 gap-2 sm:gap-3 bg-slate-50/50">
          {branchRows.map(b => (
            <div key={b.branchId} className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-bold text-xs text-slate-900">{b.name}</div>
                  <div className="text-[10px] text-slate-400 font-mono">{b.type} • {b.city}</div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {b.revenueShare.toFixed(1)}% Share
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1.5 border-t border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[10px]">Gross Sales:</span>
                  <span className="font-black font-mono text-indigo-600">{formatAmount(b.grossSales)}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px]">AOV:</span>
                  <span className="font-mono font-bold text-slate-900">{formatAmount(b.aov)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Transactions:</span>
                  <span className="font-mono font-bold text-slate-700">{b.transactions}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px]">Tax Collected:</span>
                  <span className="font-mono text-slate-600">{formatAmount(b.taxCollected)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
