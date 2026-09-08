import React, { useState } from 'react';
import { Order } from '../../../types';
import { useCurrency } from '../../../context/CurrencyContext';
import { 
  Package, Truck, CheckCircle2, Clock, 
  ArrowRight, Search, FileText
} from 'lucide-react';

interface ECommerceOrderPipelineProps {
  orders: Order[];
}

type PipelineStage = 'Pending' | 'Reserved' | 'Picked' | 'Packed' | 'Dispatched' | 'Delivered';

export default function ECommerceOrderPipeline({ orders }: ECommerceOrderPipelineProps) {
  const { formatAmount } = useCurrency();
  const [searchTerm, setSearchTerm] = useState('');

  // Map our simple status to pipeline stages
  const getPipelineStage = (order: Order): PipelineStage => {
    if (order.status === 'Completed') return 'Delivered';
    if (order.status === 'Processing') return 'Picked';
    if (order.status === 'Refunded') return 'Pending'; // Or separate column
    return 'Pending';
  };

  const columns: { id: PipelineStage; title: string; icon: any; color: string }[] = [
    { id: 'Pending', title: 'Pending Payment', icon: Clock, color: 'border-amber-500 bg-amber-50' },
    { id: 'Reserved', title: 'Inventory Reserved', icon: Package, color: 'border-blue-500 bg-blue-50' },
    { id: 'Picked', title: 'Picked & Packed', icon: FileText, color: 'border-indigo-500 bg-indigo-50' },
    { id: 'Dispatched', title: 'Dispatched', icon: Truck, color: 'border-purple-500 bg-purple-50' },
    { id: 'Delivered', title: 'Delivered', icon: CheckCircle2, color: 'border-emerald-500 bg-emerald-50' },
  ];

  const filteredOrders = orders.filter(o => 
    o.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (o.customerName && o.customerName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="shrink-0">
        <h2 className="text-xl font-bold text-slate-900">Fulfillment Pipeline</h2>
        <p className="text-sm text-slate-500">Connected operational workflow from online order to physical delivery.</p>
      </div>

      <div className="shrink-0 relative max-w-md">
        <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input 
          type="text" 
          placeholder="Search by order ID or customer..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm shadow-sm focus:outline-hidden focus:border-indigo-500"
        />
      </div>

      <div className="flex-1 overflow-x-auto pb-4">
        <div className="flex gap-4 h-full min-w-max">
          {columns.map(col => {
            const stageOrders = filteredOrders.filter(o => getPipelineStage(o) === col.id);
            return (
              <div key={col.id} className="w-80 flex flex-col h-full bg-slate-100 rounded-2xl border border-slate-200/60 shrink-0">
                <div className={`p-3 border-b-2 ${col.color} rounded-t-2xl flex items-center justify-between`}>
                  <div className="flex items-center gap-2">
                    <col.icon className="w-4 h-4 text-slate-700" />
                    <h3 className="font-bold text-slate-800 text-sm">{col.title}</h3>
                  </div>
                  <span className="bg-white px-2 py-0.5 rounded-md text-xs font-bold text-slate-600 shadow-xs">
                    {stageOrders.length}
                  </span>
                </div>

                <div className="p-3 flex-1 overflow-y-auto space-y-3">
                  {stageOrders.map(order => (
                    <div key={order.id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-grab">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-mono font-bold text-indigo-600">#{order.id.slice(0,8).toUpperCase()}</span>
                        <span className="text-xs font-semibold text-slate-700">{formatAmount(order.total)}</span>
                      </div>
                      <div className="text-sm font-medium text-slate-900 line-clamp-1 mb-1">
                        {order.customerName || 'Guest Customer'}
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 mt-3 pt-3 border-t border-slate-100">
                        <span>{order.items.length} items</span>
                        <span>{new Date(order.date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                  {stageOrders.length === 0 && (
                    <div className="h-24 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-xs font-medium">
                      No orders in this stage
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
