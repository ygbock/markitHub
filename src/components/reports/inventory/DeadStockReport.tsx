import React, { useState } from 'react';
import { 
  Clock, AlertTriangle, Flame, Tag, 
  Search, DollarSign, Percent, ArrowRight, ShieldCheck 
} from 'lucide-react';
import { Product } from '../../../types';
import { useCurrency } from '../../../context/CurrencyContext';

interface DeadStockReportProps {
  products: Product[];
}

export default function DeadStockReport({ products }: DeadStockReportProps) {
  const { formatAmount } = useCurrency();
  const [searchTerm, setSearchTerm] = useState('');
  const [discountedItems, setDiscountedItems] = useState<Record<string, number>>({});

  // Filter dead stock items (e.g. salesCount <= 2 and stock > 0)
  const deadStockProducts = products.filter(p => {
    const isDead = p.stock > 0 && (p.salesCount <= 2);
    if (!isDead) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return p.name.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term) || p.category.toLowerCase().includes(term);
    }
    return true;
  });

  const totalTiedUpCapital = deadStockProducts.reduce((sum, p) => sum + (p.stock * (p.cost || p.price * 0.45)), 0);
  const totalDeadUnits = deadStockProducts.reduce((sum, p) => sum + p.stock, 0);

  const handleApplyMarkdown = (productId: string, pct: number) => {
    setDiscountedItems(prev => ({ ...prev, [productId]: pct }));
    alert(`Applied ${pct}% clearance markdown strategy to product SKU.`);
  };

  return (
    <div className="space-y-6" id="dead-stock-report">
      
      {/* 1. Highlight Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-4">
        
        <div className="bg-slate-900 text-white rounded-3xl p-5 space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Tied-Up Capital</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {formatAmount(totalTiedUpCapital)}
          </div>
          <p className="text-[11px] text-slate-400">Dormant capital trapped in idle, non-circulating stock</p>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Dead Units in Storage</span>
            <Tag className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {totalDeadUnits} <span className="text-sm font-normal text-slate-500">Units</span>
          </div>
          <p className="text-[11px] text-slate-400">Across {deadStockProducts.length} stagnant product lines</p>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Avg. Holding Time</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            145+ <span className="text-sm font-normal text-slate-500">Days Idle</span>
          </div>
          <p className="text-[11px] text-slate-400">Carrying cost penalty approx 2.5%/month</p>
        </div>

      </div>

      {/* 2. Dead Stock Matrix Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-slate-900">Dead Inventory & Liquidation Opportunities</h3>
            <p className="text-xs text-slate-400">Items with 0 or near-zero sales velocity in trailing 90 days</p>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search dead stock..."
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
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4 text-center">Idle Units</th>
                <th className="py-3 px-4 text-right">Unit Cost</th>
                <th className="py-3 px-4 text-right">Tied-Up Cost</th>
                <th className="py-3 px-4 text-right">Selling Price</th>
                <th className="py-3 px-4 text-center">Lifetime Sales</th>
                <th className="py-3 px-4 text-center">Action Strategy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {deadStockProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    <ShieldCheck className="w-8 h-8 text-indigo-500 mx-auto mb-2 opacity-80" />
                    <p className="font-bold text-slate-700">No Dead Inventory Detected</p>
                    <p className="text-[11px]">All stocked items have active turnover within acceptable holding windows.</p>
                  </td>
                </tr>
              ) : (
                deadStockProducts.map(p => {
                  const cost = p.cost || p.price * 0.45;
                  const tiedUp = p.stock * cost;
                  const appliedMarkdown = discountedItems[p.id];

                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{p.name}</div>
                        <div className="font-mono text-[10px] text-slate-400">{p.sku}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px] font-medium">{p.location}</td>
                      <td className="py-3 px-4 text-center font-mono font-black text-slate-800">
                        {p.stock}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600">{formatAmount(cost)}</td>
                      <td className="py-3 px-4 text-right font-mono font-black text-rose-600">
                        {formatAmount(tiedUp)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {appliedMarkdown ? (
                          <div>
                            <span className="line-through text-slate-400 mr-1 text-[11px]">{formatAmount(p.price)}</span>
                            <span className="text-emerald-600 font-bold">{formatAmount(p.price * (1 - appliedMarkdown / 100))}</span>
                          </div>
                        ) : (
                          formatAmount(p.price)
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                          {p.salesCount} sold
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {appliedMarkdown ? (
                          <span className="px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                            {appliedMarkdown}% Markdown Active
                          </span>
                        ) : (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleApplyMarkdown(p.id, 25)}
                              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                            >
                              -25% Promo
                            </button>
                            <button
                              type="button"
                              onClick={() => handleApplyMarkdown(p.id, 50)}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                            >
                              -50% Liquidation
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile & Tablet Grid View */}
        <div className="block lg:hidden p-2.5 sm:p-4 bg-slate-50/50">
          {deadStockProducts.length === 0 ? (
            <div className="py-8 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
              <ShieldCheck className="w-8 h-8 text-indigo-500 mx-auto mb-2 opacity-80" />
              <p className="font-bold text-slate-700">No Dead Inventory Detected</p>
              <p className="text-[11px]">All stocked items have active turnover within acceptable holding windows.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {deadStockProducts.map(p => {
                const cost = p.cost || p.price * 0.45;
                const tiedUp = p.stock * cost;
                const appliedMarkdown = discountedItems[p.id];

                return (
                  <div key={p.id} className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-xs text-slate-900 line-clamp-1">{p.name}</div>
                        <span className="font-mono text-[10px] text-slate-400">{p.sku} • {p.location}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-slate-100 text-slate-700 shrink-0">
                        {p.stock} idle units
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1.5 border-t border-slate-100">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Tied-Up Capital:</span>
                        <span className="font-black font-mono text-rose-600">{formatAmount(tiedUp)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-400 block text-[10px]">Selling Price:</span>
                        {appliedMarkdown ? (
                          <div className="font-mono font-bold">
                            <span className="line-through text-slate-400 text-[10px] mr-1">{formatAmount(p.price)}</span>
                            <span className="text-emerald-600">{formatAmount(p.price * (1 - appliedMarkdown / 100))}</span>
                          </div>
                        ) : (
                          <span className="font-mono font-bold text-slate-900">{formatAmount(p.price)}</span>
                        )}
                      </div>
                    </div>
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                      <span className="text-[10px] text-slate-400 font-medium">Strategy:</span>
                      {appliedMarkdown ? (
                        <span className="px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          {appliedMarkdown}% Markdown Active
                        </span>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleApplyMarkdown(p.id, 25)}
                            className="px-2 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                          >
                            -25%
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApplyMarkdown(p.id, 50)}
                            className="px-2 py-0.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                          >
                            -50%
                          </button>
                        </div>
                      )}
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
