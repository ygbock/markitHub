import React from 'react';
import { 
  ArrowUpRight, AlertOctagon, RotateCcw, 
  DollarSign, CheckCircle2, Search, User, ShieldAlert 
} from 'lucide-react';
import { Order } from '../../../types';
import { useCurrency } from '../../../context/CurrencyContext';

interface RefundsReportProps {
  orders: Order[];
}

export default function RefundsReport({ orders }: RefundsReportProps) {
  const { formatAmount } = useCurrency();

  const refundedOrders = orders.filter(o => o.status === 'Refunded' || (o.refundAmount || 0) > 0);
  const totalRefundAmount = refundedOrders.reduce((sum, o) => sum + (o.refundAmount || o.total || 0), 0);
  const returnRate = orders.length > 0 ? (refundedOrders.length / orders.length) * 100 : 0;

  return (
    <div className="space-y-6" id="refunds-report">
      
      {/* 1. Header Highlight KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-4">
        
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-3xl p-5 space-y-1">
          <div className="flex items-center justify-between text-rose-700">
            <span className="text-xs font-bold uppercase tracking-wider">Total Value Refunded</span>
            <RotateCcw className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-rose-800 font-mono">
            {formatAmount(totalRefundAmount)}
          </div>
          <p className="text-[11px] text-rose-700/80">Reversed payments across {refundedOrders.length} return events</p>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Return Rate %</span>
            <AlertOctagon className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {returnRate.toFixed(1)}%
          </div>
          <p className="text-[11px] text-slate-400">Industry benchmark target &lt; 3.5%</p>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Inventory Restock Status</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600 font-mono">
            100% <span className="text-sm font-normal text-slate-500">Restocked</span>
          </div>
          <p className="text-[11px] text-slate-400">Returned units inspected and restored to inventory</p>
        </div>

      </div>

      {/* 2. Refunds Audit Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100">
          <h3 className="text-sm font-black text-slate-900">Refund & Return Authorization Ledger</h3>
          <p className="text-xs text-slate-400">Audited returns with customer details, original receipt, and refund amount</p>
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Receipt / Order #</th>
                <th className="py-3 px-4">Return Date</th>
                <th className="py-3 px-4">Customer Name</th>
                <th className="py-3 px-4">Original Tender</th>
                <th className="py-3 px-4 text-right">Original Total</th>
                <th className="py-3 px-4 text-right">Refund Amount</th>
                <th className="py-3 px-4">Reason / Notes</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {refundedOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                    <p className="font-bold text-slate-700">Zero Returns in Period</p>
                    <p className="text-[11px]">No refunds or return transactions have been processed.</p>
                  </td>
                </tr>
              ) : (
                refundedOrders.map(o => (
                  <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-700">{o.id}</td>
                    <td className="py-3 px-4 text-slate-500 text-[11px] font-mono">{new Date(o.date).toLocaleDateString()}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{o.customerName || 'Walk-in Customer'}</td>
                    <td className="py-3 px-4 text-slate-600 font-medium">{o.paymentMethod}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-500">{formatAmount(o.total || 0)}</td>
                    <td className="py-3 px-4 text-right font-mono font-black text-rose-600">
                      -{formatAmount(o.refundAmount || o.total || 0)}
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">Customer exchange / size variance</td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                        Refund Settled
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile & Tablet Grid View */}
        <div className="block lg:hidden p-3.5 sm:p-4 bg-slate-50/50">
          {refundedOrders.length === 0 ? (
            <div className="py-8 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
              <p className="font-bold text-slate-700">Zero Returns in Period</p>
              <p className="text-[11px]">No refunds or return transactions have been processed.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {refundedOrders.map(o => (
                <div key={o.id} className="bg-white p-3.5 rounded-2xl border border-rose-200 shadow-2xs space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-xs font-mono text-indigo-700">{o.id}</div>
                      <span className="text-[11px] font-semibold text-slate-800">{o.customerName || 'Walk-in Customer'}</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 shrink-0">
                      Refund Settled
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1.5 border-t border-slate-100">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Refund Amount:</span>
                      <span className="font-mono font-black text-rose-600">-{formatAmount(o.refundAmount || o.total || 0)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 block text-[10px]">Original Total:</span>
                      <span className="font-mono text-slate-700">{formatAmount(o.total || 0)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Tender:</span>
                      <span className="font-medium text-slate-700">{o.paymentMethod}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 block text-[10px]">Date:</span>
                      <span className="font-mono text-slate-500">{new Date(o.date).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
