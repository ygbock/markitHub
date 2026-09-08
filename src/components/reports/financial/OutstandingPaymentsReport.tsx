import React, { useState } from 'react';
import { 
  Landmark, Clock, AlertTriangle, CheckCircle2, 
  Search, DollarSign, User, Calendar, ShieldAlert 
} from 'lucide-react';
import { Order } from '../../../types';
import { useCurrency } from '../../../context/CurrencyContext';

interface OutstandingPaymentsReportProps {
  orders: Order[];
  onUpdateOrderStatus?: (orderId: string, status: Order['status']) => void;
}

export default function OutstandingPaymentsReport({
  orders,
  onUpdateOrderStatus
}: OutstandingPaymentsReportProps) {
  const { formatAmount } = useCurrency();
  const [searchTerm, setSearchTerm] = useState('');
  const [clearedIds, setClearedIds] = useState<string[]>([]);

  const now = new Date('2026-08-17T12:00:00-07:00');

  // Filter orders with status === 'Outstanding' or having an outstandingBalance > 0
  const outstandingOrders = orders.filter(o => 
    (o.status === 'Outstanding' || (o.outstandingBalance && o.outstandingBalance > 0)) &&
    !clearedIds.includes(o.id)
  );

  const processedOrders = outstandingOrders.map(o => {
    const orderDate = new Date(o.date);
    const dueDate = o.dueDate ? new Date(o.dueDate) : new Date(orderDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    const daysOverdue = Math.max(0, Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));
    const balance = o.outstandingBalance || o.total || 0;

    let agingBracket: '0 - 30 Days' | '31 - 60 Days' | '60+ Days Overdue' = '0 - 30 Days';
    if (daysOverdue > 30) agingBracket = '60+ Days Overdue';
    else if (daysOverdue > 0) agingBracket = '31 - 60 Days';

    return {
      ...o,
      dueDate,
      daysOverdue,
      balance,
      agingBracket
    };
  });

  const filteredOrders = processedOrders.filter(o => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        o.id.toLowerCase().includes(term) ||
        (o.customerName && o.customerName.toLowerCase().includes(term))
      );
    }
    return true;
  }).sort((a, b) => b.daysOverdue - a.daysOverdue);

  const totalOutstanding = filteredOrders.reduce((sum, o) => sum + o.balance, 0);
  const overdueCount = filteredOrders.filter(o => o.daysOverdue > 0).length;

  const handleSettlePayment = (orderId: string) => {
    setClearedIds(prev => [...prev, orderId]);
    if (onUpdateOrderStatus) {
      onUpdateOrderStatus(orderId, 'Completed');
    }
  };

  return (
    <div className="space-y-6" id="outstanding-payments-report">
      
      {/* 1. Header Highlight KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-4">
        
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-3xl p-5 space-y-1">
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-xs font-bold uppercase tracking-wider">Total Accounts Receivable</span>
            <Landmark className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-amber-800 font-mono">
            {formatAmount(totalOutstanding)}
          </div>
          <p className="text-[11px] text-amber-700/80">Uncollected credit balance across {filteredOrders.length} accounts</p>
        </div>

        <div className="bg-rose-500/10 border border-rose-500/20 rounded-3xl p-5 space-y-1">
          <div className="flex items-center justify-between text-rose-700">
            <span className="text-xs font-bold uppercase tracking-wider">Past Due / Overdue</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-800 font-mono">
            {overdueCount} <span className="text-sm font-normal text-rose-600">Invoices Overdue</span>
          </div>
          <p className="text-[11px] text-rose-700/80">Exceeded 30-day net payment credit terms</p>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Collection Priority</span>
            <Clock className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {filteredOrders[0] ? `${filteredOrders[0].daysOverdue}d Overdue` : 'Current'}
          </div>
          <p className="text-[11px] text-slate-400">Oldest open invoice on ledger</p>
        </div>

      </div>

      {/* 2. Outstanding Invoices Ledger Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-slate-900">Accounts Receivable & Aging Debtors Register</h3>
            <p className="text-xs text-slate-400">Outstanding client invoices with payment settlement actions</p>
          </div>

          <div className="relative w-full sm:w-auto">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search customer, invoice #..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-500 w-full sm:w-60"
            />
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[700px]">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Issue Date</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4 text-right">Invoice Total</th>
                <th className="py-3 px-4 text-right">Balance Due</th>
                <th className="py-3 px-4 text-center">Aging Bracket</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                    <p className="font-bold text-slate-700">All Invoices Settled</p>
                    <p className="text-[11px]">No outstanding customer receivable balances remain on the ledger.</p>
                  </td>
                </tr>
              ) : (
                filteredOrders.map(o => {
                  const isOverdue = o.daysOverdue > 0;

                  return (
                    <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-700">{o.id}</td>
                      <td className="py-3 px-4 text-slate-500 text-[11px] font-mono">{new Date(o.date).toLocaleDateString()}</td>
                      <td className="py-3 px-4 font-mono font-semibold text-slate-700 text-[11px]">
                        {o.dueDate.toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">{o.customerName || 'Corporate Client'}</td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600">{formatAmount(o.total || 0)}</td>
                      <td className="py-3 px-4 text-right font-mono font-black text-rose-600">
                        {formatAmount(o.balance)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          o.agingBracket === '60+ Days Overdue' ? 'bg-rose-600 text-white' :
                          o.agingBracket === '31 - 60 Days' ? 'bg-rose-100 text-rose-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {isOverdue ? `${o.daysOverdue}d Overdue` : 'Current (0-30d)'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleSettlePayment(o.id)}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-bold shadow-xs cursor-pointer"
                        >
                          Record Payment
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile & Tablet Grid View */}
        <div className="block lg:hidden p-3.5 sm:p-4 bg-slate-50/50">
          {filteredOrders.length === 0 ? (
            <div className="py-8 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
              <p className="font-bold text-slate-700">All Invoices Settled</p>
              <p className="text-[11px]">No outstanding customer receivable balances remain on the ledger.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {filteredOrders.map(o => {
                const isOverdue = o.daysOverdue > 0;

                return (
                  <div key={o.id} className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-xs font-mono text-indigo-700">{o.id}</div>
                        <span className="text-[11px] font-bold text-slate-900">{o.customerName || 'Corporate Client'}</span>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                        o.agingBracket === '60+ Days Overdue' ? 'bg-rose-600 text-white' :
                        o.agingBracket === '31 - 60 Days' ? 'bg-rose-100 text-rose-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {isOverdue ? `${o.daysOverdue}d Overdue` : 'Current'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1.5 border-t border-slate-100">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Balance Due:</span>
                        <span className="font-mono font-black text-rose-600">{formatAmount(o.balance)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-400 block text-[10px]">Invoice Total:</span>
                        <span className="font-mono text-slate-700">{formatAmount(o.total || 0)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Due Date:</span>
                        <span className="font-mono text-slate-700">{o.dueDate.toLocaleDateString()}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-400 block text-[10px]">Issued:</span>
                        <span className="font-mono text-slate-500">{new Date(o.date).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSettlePayment(o.id)}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer text-center transition-all"
                    >
                      Record Payment Settlement
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
