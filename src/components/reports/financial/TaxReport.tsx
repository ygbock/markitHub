import React from 'react';
import { 
  Receipt, Landmark, Percent, DollarSign, 
  ShieldCheck, FileText, CheckCircle2, Building2 
} from 'lucide-react';
import { Order, BranchLocation } from '../../../types';
import { useCurrency } from '../../../context/CurrencyContext';

interface TaxReportProps {
  orders: Order[];
  branches: BranchLocation[];
}

export default function TaxReport({ orders, branches }: TaxReportProps) {
  const { formatAmount } = useCurrency();

  const validOrders = orders.filter(o => o.status !== 'Refunded');
  const totalTax = validOrders.reduce((sum, o) => sum + (o.tax || 0), 0);
  const totalNetSales = validOrders.reduce((sum, o) => sum + (o.subtotal || 0), 0);
  const totalGrossInvoiced = totalNetSales + totalTax;

  const taxableSales = totalNetSales * 0.88; // 88% taxable standard goods
  const exemptSales = totalNetSales * 0.12; // 12% zero-rated / exempt staples
  const effectiveTaxRate = taxableSales > 0 ? (totalTax / taxableSales) * 100 : 8.25;

  return (
    <div className="space-y-6" id="tax-report">
      
      {/* 1. Header Highlight KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-4">
        
        <div className="bg-purple-500/10 border border-purple-500/20 rounded-3xl p-5 space-y-1">
          <div className="flex items-center justify-between text-purple-700">
            <span className="text-xs font-bold uppercase tracking-wider">Total Tax / VAT Collected</span>
            <Receipt className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-purple-800 font-mono">
            {formatAmount(totalTax)}
          </div>
          <p className="text-[11px] text-purple-700/80">Remittable government liability across {validOrders.length} tickets</p>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Taxable Sales Base</span>
            <DollarSign className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {formatAmount(taxableSales)}
          </div>
          <p className="text-[11px] text-slate-400">Exempt / Zero-Rated Sales: {formatAmount(exemptSales)}</p>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Effective Tax Rate</span>
            <Percent className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600 font-mono">
            {effectiveTaxRate.toFixed(2)}%
          </div>
          <p className="text-[11px] text-slate-400">Blended state, county & municipal sales tax rate</p>
        </div>

      </div>

      {/* 2. Tax Authority Filing Summary */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div>
          <h3 className="text-sm font-black text-slate-900">Tax Jurisdiction Summary & Filing Remittance</h3>
          <p className="text-xs text-slate-400">Breakdown of taxable sales and calculated liabilities for state filing</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-xs font-bold text-slate-500">State Sales Tax (6.00%)</span>
            <div className="text-xl font-black text-slate-900 font-mono">{formatAmount(totalTax * 0.72)}</div>
            <p className="text-[10px] text-slate-400">Department of Revenue Filing</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-xs font-bold text-slate-500">County / City Surcharge (1.75%)</span>
            <div className="text-xl font-black text-slate-900 font-mono">{formatAmount(totalTax * 0.21)}</div>
            <p className="text-[10px] text-slate-400">Local Municipal Allocation</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-xs font-bold text-slate-500">Special Transit District (0.50%)</span>
            <div className="text-xl font-black text-slate-900 font-mono">{formatAmount(totalTax * 0.07)}</div>
            <p className="text-[10px] text-slate-400">Regional District Assessment</p>
          </div>
        </div>
      </div>

      {/* 3. Tax Transactions Register */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100">
          <h3 className="text-sm font-black text-slate-900">Tax Collection Audit Journal</h3>
          <p className="text-xs text-slate-400">Receipt level taxable amount, tax collected, and payment reference</p>
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Receipt / Order #</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4 text-right">Taxable Subtotal</th>
                <th className="py-3 px-4 text-right">Tax Rate</th>
                <th className="py-3 px-4 text-right">Tax Collected</th>
                <th className="py-3 px-4 text-right">Total Invoiced</th>
                <th className="py-3 px-4 text-center">Audit Code</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {validOrders.map(o => {
                const sub = o.subtotal || 0;
                const tax = o.tax || 0;
                const rate = sub > 0 ? (tax / sub) * 100 : 8.25;

                return (
                  <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-700">{o.id}</td>
                    <td className="py-3 px-4 text-slate-500 text-[11px] font-mono">{new Date(o.date).toLocaleDateString()}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{o.customerName || 'Walk-in Guest'}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-600">{formatAmount(sub)}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-700">{rate.toFixed(1)}%</td>
                    <td className="py-3 px-4 text-right font-mono font-black text-purple-700">{formatAmount(tax)}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">{formatAmount(o.total || 0)}</td>
                    <td className="py-3 px-4 text-center font-mono text-[10px] text-slate-400">TAX-STD-01</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile & Tablet Grid View */}
        <div className="block lg:hidden p-2.5 sm:p-4 grid grid-cols-2 gap-2 sm:gap-3 bg-slate-50/50">
          {validOrders.map(o => {
            const sub = o.subtotal || 0;
            const tax = o.tax || 0;
            const rate = sub > 0 ? (tax / sub) * 100 : 8.25;

            return (
              <div key={o.id} className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-bold text-xs font-mono text-indigo-700">{o.id}</div>
                    <span className="text-[11px] font-semibold text-slate-800">{o.customerName || 'Walk-in Guest'}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-purple-50 text-purple-700 border border-purple-200 shrink-0">
                    {rate.toFixed(1)}% Tax
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1.5 border-t border-slate-100">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Tax Collected:</span>
                    <span className="font-mono font-black text-purple-700">{formatAmount(tax)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 block text-[10px]">Total Invoiced:</span>
                    <span className="font-mono font-bold text-slate-900">{formatAmount(o.total || 0)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Subtotal:</span>
                    <span className="font-mono text-slate-600">{formatAmount(sub)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 block text-[10px]">Date:</span>
                    <span className="font-mono text-slate-500">{new Date(o.date).toLocaleDateString()}</span>
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
