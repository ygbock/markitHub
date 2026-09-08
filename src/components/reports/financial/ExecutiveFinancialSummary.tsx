import React from 'react';
import { 
  PieChart as PieIcon, DollarSign, TrendingUp, 
  Percent, ArrowUpRight, ArrowDownRight, FileText, 
  Receipt, ShieldCheck, Landmark, Scale 
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, 
  YAxis, Tooltip, CartesianGrid, Legend, Cell 
} from 'recharts';
import { Order } from '../../../types';
import { useCurrency } from '../../../context/CurrencyContext';
import { calculateFinancialSummary } from '../../../utils/reportsCalculations';

interface ExecutiveFinancialSummaryProps {
  orders: Order[];
}

export default function ExecutiveFinancialSummary({ orders }: ExecutiveFinancialSummaryProps) {
  const { formatAmount } = useCurrency();
  const summary = calculateFinancialSummary(orders);

  // Income Statement Waterfall
  const pnlWaterfall = [
    { name: 'Gross Revenue', value: Math.round(summary.grossRevenue), fill: '#6366f1' },
    { name: 'Discounts', value: -Math.round(summary.discountsTotal), fill: '#f59e0b' },
    { name: 'Net Revenue', value: Math.round(summary.netRevenue), fill: '#3b82f6' },
    { name: 'COGS (Cost)', value: -Math.round(summary.cogsTotal), fill: '#94a3b8' },
    { name: 'Gross Profit', value: Math.round(summary.grossProfit), fill: '#10b981' },
    { name: 'Tax Collected', value: Math.round(summary.taxTotal), fill: '#8b5cf6' }
  ];

  return (
    <div className="space-y-6" id="executive-financial-summary">
      
      {/* 1. Executive P&L Snapshot Card Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-4">
        
        {/* Gross Revenue */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-slate-200/80 shadow-2xs space-y-1.5 sm:space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider truncate">Gross Sales</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-base sm:text-2xl font-black text-slate-900 font-mono truncate">
            {formatAmount(summary.grossRevenue)}
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">List price volume</p>
        </div>

        {/* Net Revenue */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-slate-200/80 shadow-2xs space-y-1.5 sm:space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider truncate">Net Revenue</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Scale className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-base sm:text-2xl font-black text-blue-700 font-mono truncate">
            {formatAmount(summary.netRevenue)}
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">Less discounts</p>
        </div>

        {/* Gross Profit */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-slate-200/80 shadow-2xs space-y-1.5 sm:space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider truncate">Gross Profit</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-base sm:text-2xl font-black text-emerald-600 font-mono truncate">
            {formatAmount(summary.grossProfit)}
          </div>
          <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-emerald-700 truncate">
            <span>{summary.grossMarginPercent.toFixed(1)}% Margin</span>
          </div>
        </div>

        {/* Outstanding Receivables */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border border-slate-200/80 shadow-2xs space-y-1.5 sm:space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider truncate">Receivables</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Landmark className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="text-base sm:text-2xl font-black text-amber-700 font-mono truncate">
            {formatAmount(summary.outstandingTotal)}
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">{summary.outstandingCount} open balances</p>
        </div>

      </div>

      {/* 2. Visual Waterfall Chart & P&L Statement breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Waterfall Bar Graph */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900">P&L Waterfall Structure</h3>
              <p className="text-xs text-slate-400">Step-by-step revenue to net gross profit bridge</p>
            </div>
            <BarChart className="w-4 h-4 text-slate-400" />
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pnlWaterfall} margin={{ top: 15, right: 15, left: 10, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} interval={0} angle={-15} textAnchor="end" />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(v) => `$${v}`} />
                <Tooltip 
                  formatter={(val: number) => [formatAmount(Math.abs(val)), 'Impact']}
                  contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', color: '#fff', border: 'none', fontSize: '12px' }}
                />
                <Bar dataKey="value" name="Amount" radius={[6, 6, 0, 0]}>
                  {pnlWaterfall.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Formatted Income Statement Ledger */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-black text-slate-900">Executive Income Statement</h3>
            <p className="text-xs text-slate-400">Statement of profit and loss for selected period</p>
          </div>

          <div className="space-y-2.5 text-xs">
            
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 font-bold text-slate-800">
              <span>Gross Sales (Topline)</span>
              <span className="font-mono">{formatAmount(summary.grossRevenue)}</span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-xl text-amber-700">
              <span className="pl-2">Less: Discounts & Promos</span>
              <span className="font-mono font-bold">-{formatAmount(summary.discountsTotal)}</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-blue-50/80 border border-blue-100 font-black text-blue-900">
              <span>Net Revenue</span>
              <span className="font-mono">{formatAmount(summary.netRevenue)}</span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-xl text-slate-600">
              <span className="pl-2">Less: Cost of Goods Sold (COGS)</span>
              <span className="font-mono font-bold text-rose-600">-{formatAmount(summary.cogsTotal)}</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50 border border-emerald-200 font-black text-emerald-900 text-sm">
              <span>Gross Profit (Pre-Tax)</span>
              <span className="font-mono text-emerald-700">{formatAmount(summary.grossProfit)}</span>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-slate-500">
              <span>Tax / VAT Collected (Liability)</span>
              <span className="font-mono font-bold text-slate-800">{formatAmount(summary.taxTotal)}</span>
            </div>

            <div className="flex items-center justify-between text-slate-500">
              <span>Refunds Issued</span>
              <span className="font-mono font-bold text-rose-600">-{formatAmount(summary.refundsTotal)}</span>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
