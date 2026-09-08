import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Order } from '../types';
import { useCurrency } from '../context/CurrencyContext';

interface CustomerLifetimeValueChartProps {
  orders: Order[];
}

export default function CustomerLifetimeValueChart({ orders }: CustomerLifetimeValueChartProps) {
  const { formatAmount } = useCurrency();

  const chartData = useMemo(() => {
    // Sort orders by date
    const sortedOrders = [...orders].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    let cumulativeSpend = 0;
    
    const data = sortedOrders.map(order => {
      cumulativeSpend += (order.total || order.grandTotal || 0);
      const d = new Date(order.date);
      return {
        date: d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' }),
        rawDate: d.getTime(),
        spend: (order.total || order.grandTotal || 0),
        clv: cumulativeSpend
      };
    });

    // If we only have 1 order, duplicate it to show a line, or if 0, return empty
    if (data.length === 1) {
      const single = data[0];
      data.unshift({
        ...single,
        date: 'Acquisition',
        spend: 0,
        clv: 0
      });
    }

    return data;
  }, [orders]);

  if (orders.length === 0) {
    return null;
  }

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 border-b border-slate-100 pb-2">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
        Customer Lifetime Value (CLV) Trajectory
      </h3>
      
      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{
              top: 10,
              right: 10,
              left: 0,
              bottom: 0,
            }}
          >
            <defs>
              <linearGradient id="colorClv" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="date" 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: '#64748b' }}
              minTickGap={20}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: '#64748b' }}
              tickFormatter={(value) => `${value >= 1000 ? (value / 1000).toFixed(1) + 'k' : value}`}
            />
            <Tooltip 
              contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
              labelStyle={{ fontSize: '10px', color: '#64748b', marginBottom: '4px' }}
              formatter={(value: number) => [formatAmount(value), 'Cumulative CLV']}
            />
            <Area 
              type="monotone" 
              dataKey="clv" 
              stroke="#10b981" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorClv)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
