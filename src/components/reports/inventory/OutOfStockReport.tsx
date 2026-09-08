import React, { useState } from 'react';
import { 
  XCircle, ShoppingBag, Clock, AlertOctagon, 
  Search, ArrowRight, DollarSign, CheckCircle2 
} from 'lucide-react';
import { Product } from '../../../types';
import { useCurrency } from '../../../context/CurrencyContext';

interface OutOfStockReportProps {
  products: Product[];
  onReorder?: (productId: string, amount?: number) => void;
}

export default function OutOfStockReport({ products, onReorder }: OutOfStockReportProps) {
  const { formatAmount } = useCurrency();
  const [searchTerm, setSearchTerm] = useState('');

  // Filter items with 0 stock
  const outOfStockProducts = products.filter(p => {
    const isZero = p.stock === 0;
    if (!isZero) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return p.name.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term) || p.category.toLowerCase().includes(term);
    }
    return true;
  });

  // Calculate estimated missed daily revenue (based on historical velocity / sales count)
  const totalMissedPotentialDaily = outOfStockProducts.reduce((sum, p) => {
    const estimatedDailyDemand = Math.max(1, Math.round((p.salesCount || 10) / 30));
    return sum + (estimatedDailyDemand * p.price);
  }, 0);

  return (
    <div className="space-y-6" id="out-of-stock-report">
      
      {/* 1. Header Highlight Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-4">
        
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-3xl p-5 space-y-1">
          <div className="flex items-center justify-between text-rose-700">
            <span className="text-xs font-bold uppercase tracking-wider">Out of Stock SKUs</span>
            <XCircle className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-rose-800 font-mono">
            {outOfStockProducts.length} <span className="text-sm font-normal text-rose-600">Stockouts</span>
          </div>
          <p className="text-[11px] text-rose-700/80">Completely depleted lines with 0 available units</p>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Missed Daily Revenue</span>
            <DollarSign className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            ~{formatAmount(totalMissedPotentialDaily)}<span className="text-xs text-slate-400 font-normal"> / day</span>
          </div>
          <p className="text-[11px] text-slate-400">Estimated lost sales based on trailing product velocity</p>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Average Lead Time</span>
            <Clock className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            4.5 <span className="text-sm font-normal text-slate-500">Days Lead</span>
          </div>
          <p className="text-[11px] text-slate-400">Supplier average transit & freight receiving cycle</p>
        </div>

      </div>

      {/* 2. Stockout Details Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-slate-900">Stockout Impact Register</h3>
            <p className="text-xs text-slate-400">Depleted products with lost opportunity analysis</p>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search stockout SKUs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-500 w-60"
            />
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Product / SKU</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4 text-center">Stock Level</th>
                <th className="py-3 px-4 text-right">Selling Price</th>
                <th className="py-3 px-4 text-right">Unit Cost</th>
                <th className="py-3 px-4 text-center">Historical Sales</th>
                <th className="py-3 px-4 text-right">Est. Daily Lost Rev</th>
                <th className="py-3 px-4 text-center">Priority</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {outOfStockProducts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                    <p className="font-bold text-slate-700">Zero Stockouts</p>
                    <p className="text-[11px]">All active catalog items currently maintain positive inventory.</p>
                  </td>
                </tr>
              ) : (
                outOfStockProducts.map(p => {
                  const estDailyDemand = Math.max(1, Math.round((p.salesCount || 10) / 30));
                  const lostDaily = estDailyDemand * p.price;
                  const isHighPriority = p.salesCount > 100 || lostDaily > 50;

                  return (
                    <tr key={p.id} className="hover:bg-rose-50/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{p.name}</div>
                        <div className="font-mono text-[10px] text-slate-400">{p.sku}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[10px]">
                          {p.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px] font-medium">{p.location}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-700 font-mono font-black text-[10px]">
                          0 Units (Depleted)
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">{formatAmount(p.price)}</td>
                      <td className="py-3 px-4 text-right font-mono text-slate-500">{formatAmount(p.cost || p.price * 0.5)}</td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-indigo-600">
                        {p.salesCount} units
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-rose-600">
                        -{formatAmount(lostDaily)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isHighPriority ? 'bg-rose-600 text-white' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {isHighPriority ? 'CRITICAL' : 'STANDARD'}
                        </span>
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
          {outOfStockProducts.length === 0 ? (
            <div className="py-8 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
              <p className="font-bold text-slate-700">Zero Stockouts</p>
              <p className="text-[11px]">All active catalog items currently maintain positive inventory.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {outOfStockProducts.map(p => {
                const estDailyDemand = Math.max(1, Math.round((p.salesCount || 10) / 30));
                const lostDaily = estDailyDemand * p.price;
                const isHighPriority = p.salesCount > 100 || lostDaily > 50;

                return (
                  <div key={p.id} className="bg-white p-3.5 rounded-2xl border border-rose-200 shadow-2xs space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-xs text-slate-900 line-clamp-1">{p.name}</div>
                        <span className="font-mono text-[10px] text-slate-400">{p.sku} • {p.category}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                        isHighPriority ? 'bg-rose-600 text-white' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {isHighPriority ? 'CRITICAL' : 'STANDARD'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1.5 border-t border-slate-100">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Stock Status:</span>
                        <span className="font-bold text-rose-600 text-[10px]">0 Units (Depleted)</span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-400 block text-[10px]">Est. Lost Rev:</span>
                        <span className="font-mono font-black text-rose-600">-{formatAmount(lostDaily)}/day</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Unit Price / Cost:</span>
                        <span className="font-mono text-slate-700">{formatAmount(p.price)} / {formatAmount(p.cost || p.price * 0.5)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-400 block text-[10px]">Historical Sales:</span>
                        <span className="font-mono font-bold text-indigo-600">{p.salesCount} units</span>
                      </div>
                    </div>
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
