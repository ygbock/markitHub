import React from 'react';
import { 
  CreditCard, DollarSign, Smartphone, Landmark, 
  Wallet, PieChart as PieIcon, Percent, TrendingUp 
} from 'lucide-react';
import { 
  ResponsiveContainer, PieChart, Pie, Cell, 
  Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend 
} from 'recharts';
import { Order } from '../../../types';
import { useCurrency } from '../../../context/CurrencyContext';

interface PaymentMethodSalesReportProps {
  orders: Order[];
}

const PAYMENT_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#06b6d4', '#8b5cf6', '#ec4899'];

export default function PaymentMethodSalesReport({ orders }: PaymentMethodSalesReportProps) {
  const { formatAmount } = useCurrency();

  const methodMap: Record<string, {
    method: string;
    transactions: number;
    grossAmount: number;
    feeRatePct: number;
    feeAmount: number;
  }> = {
    'Credit Card': { method: 'Credit Card (Visa/Mastercard)', transactions: 0, grossAmount: 0, feeRatePct: 2.2, feeAmount: 0 },
    'Cash': { method: 'Physical Cash', transactions: 0, grossAmount: 0, feeRatePct: 0.0, feeAmount: 0 },
    'Mobile Money': { method: 'Mobile Money / Apple Pay / Google Pay', transactions: 0, grossAmount: 0, feeRatePct: 1.8, feeAmount: 0 },
    'Bank Transfer': { method: 'Bank Wire / EFT', transactions: 0, grossAmount: 0, feeRatePct: 0.5, feeAmount: 0 },
    'Store Credit': { method: 'Store Gift Card / Loyalty Credit', transactions: 0, grossAmount: 0, feeRatePct: 0.0, feeAmount: 0 }
  };

  // Group orders
  orders.forEach((o, i) => {
    let methodKey = 'Cash';
    if (o.paymentMethod.includes('Card')) methodKey = 'Credit Card';
    else if (o.paymentMethod.includes('Mobile') || o.paymentMethod.includes('Apple') || o.paymentMethod.includes('NFC')) methodKey = 'Mobile Money';
    else if (o.paymentMethod.includes('Transfer') || o.paymentMethod.includes('Wire')) methodKey = 'Bank Transfer';
    else if (o.paymentMethod.includes('Credit') || o.paymentMethod.includes('Gift')) methodKey = 'Store Credit';
    else methodKey = 'Cash';

    if (o.status !== 'Refunded') {
      const amount = (o.total || 0);
      methodMap[methodKey].transactions += 1;
      methodMap[methodKey].grossAmount += amount;
      methodMap[methodKey].feeAmount += (amount * (methodMap[methodKey].feeRatePct / 100));
    }
  });

  const totalCollected = Object.values(methodMap).reduce((sum, m) => sum + m.grossAmount, 0);
  const totalFees = Object.values(methodMap).reduce((sum, m) => sum + m.feeAmount, 0);

  const methodRows = Object.values(methodMap).map(m => {
    const share = totalCollected > 0 ? (m.grossAmount / totalCollected) * 100 : 0;
    const netReceived = m.grossAmount - m.feeAmount;
    const aov = m.transactions > 0 ? m.grossAmount / m.transactions : 0;

    return {
      ...m,
      share,
      netReceived,
      aov
    };
  }).sort((a, b) => b.grossAmount - a.grossAmount);

  const pieData = methodRows.map(m => ({
    name: m.method.split(' ')[0],
    value: Math.round(m.grossAmount)
  }));

  return (
    <div className="space-y-6" id="payment-method-sales-report">
      
      {/* 1. Header Highlights */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-4">
        
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Top Payment Rail</span>
            <CreditCard className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-xl font-black text-slate-900 truncate">
            {methodRows[0]?.method.split('(')[0] || 'Credit Card'}
          </div>
          <p className="text-[11px] text-slate-400">
            {formatAmount(methodRows[0]?.grossAmount || 0)} ({methodRows[0]?.share.toFixed(1)}% volume share)
          </p>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Total Gross Tendered</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600 font-mono">
            {formatAmount(totalCollected)}
          </div>
          <p className="text-[11px] text-slate-400">Net after merchant gateway fees: {formatAmount(totalCollected - totalFees)}</p>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Est. Merchant Processing Fees</span>
            <Percent className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-600 font-mono">
            {formatAmount(totalFees)}
          </div>
          <p className="text-[11px] text-slate-400">
            Effective interchange blend: {totalCollected > 0 ? ((totalFees / totalCollected) * 100).toFixed(2) : '0.00'}%
          </p>
        </div>

      </div>

      {/* 2. Visual Charts: Payment Share Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        <div className="lg:col-span-6 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900">Tender Share Distribution</h3>
              <p className="text-xs text-slate-400">Gross transaction volume by payment type</p>
            </div>
            <PieIcon className="w-4 h-4 text-slate-400" />
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PAYMENT_COLORS[index % PAYMENT_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(val: number) => [formatAmount(val), 'Volume']}
                  contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', color: '#fff', border: 'none', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-6 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900">Tender Volume & Net Settlements</h3>
              <p className="text-xs text-slate-400">Gross collection vs net after interchange deductions</p>
            </div>
            <TrendingUp className="w-4 h-4 text-slate-400" />
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={methodRows} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="method" tick={{ fontSize: 10, fill: '#64748b' }} interval={0} angle={-15} textAnchor="end" tickFormatter={(v) => v.split(' ')[0]} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(v) => `$${v}`} />
                <Tooltip 
                  formatter={(val: number) => [formatAmount(val), 'Amount']}
                  contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', color: '#fff', border: 'none', fontSize: '12px' }}
                />
                <Bar dataKey="grossAmount" name="Gross Tender" fill="#6366f1" radius={[6, 6, 0, 0]} />
                <Bar dataKey="netReceived" name="Net Settled" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* 3. Payment Methods Matrix Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100">
          <h3 className="text-sm font-black text-slate-900">Payment Tender Settlement Matrix</h3>
          <p className="text-xs text-slate-400">Interchange fee rates, gross tender volume, and net bank deposits</p>
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Payment Method</th>
                <th className="py-3 px-4 text-center">Transactions</th>
                <th className="py-3 px-4 text-right">Gross Tendered</th>
                <th className="py-3 px-4 text-right">Volume Share</th>
                <th className="py-3 px-4 text-right">Est. Gateway Fee Rate</th>
                <th className="py-3 px-4 text-right">Interchange Fees</th>
                <th className="py-3 px-4 text-right">Net Bank Deposit</th>
                <th className="py-3 px-4 text-right">Average Ticket (AOV)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {methodRows.map(m => (
                <tr key={m.method} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 font-bold text-slate-900">{m.method}</td>
                  <td className="py-3 px-4 text-center font-mono font-bold text-slate-800">{m.transactions}</td>
                  <td className="py-3 px-4 text-right font-mono font-black text-indigo-600">{formatAmount(m.grossAmount)}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-700">{m.share.toFixed(1)}%</td>
                  <td className="py-3 px-4 text-right font-mono text-slate-500">{m.feeRatePct.toFixed(1)}%</td>
                  <td className="py-3 px-4 text-right font-mono text-rose-600 font-bold">{formatAmount(m.feeAmount)}</td>
                  <td className="py-3 px-4 text-right font-mono font-black text-emerald-600">{formatAmount(m.netReceived)}</td>
                  <td className="py-3 px-4 text-right font-mono text-slate-900 font-bold">{formatAmount(m.aov)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile & Tablet Grid View */}
        <div className="block lg:hidden p-2.5 sm:p-4 grid grid-cols-2 gap-2 sm:gap-3 bg-slate-50/50">
          {methodRows.map(m => (
            <div key={m.method} className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-900">{m.method}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {m.share.toFixed(1)}% Share
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1.5 border-t border-slate-100">
                <div>
                  <span className="text-slate-400 block text-[10px]">Gross Tendered:</span>
                  <span className="font-black font-mono text-indigo-600">{formatAmount(m.grossAmount)}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px]">Net Settled:</span>
                  <span className="font-black font-mono text-emerald-600">{formatAmount(m.netReceived)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Transactions:</span>
                  <span className="font-mono font-bold text-slate-700">{m.transactions}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px]">Interchange Fees:</span>
                  <span className="font-mono text-rose-600 font-semibold">{formatAmount(m.feeAmount)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
