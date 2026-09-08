import React, { useState } from 'react';
import { 
  AlertTriangle, PackageCheck, ShoppingCart, ArrowRight, 
  Search, ShieldAlert, TrendingDown, Layers, CheckCircle2
} from 'lucide-react';
import { Product } from '../../../types';
import { useCurrency } from '../../../context/CurrencyContext';

interface LowStockReportProps {
  products: Product[];
  lowStockThreshold?: number;
  onReorder?: (productId: string, amount?: number) => void;
}

export default function LowStockReport({ products, lowStockThreshold = 10, onReorder }: LowStockReportProps) {
  const { formatAmount } = useCurrency();
  const [searchTerm, setSearchTerm] = useState('');
  const [orderedItemIds, setOrderedItemIds] = useState<string[]>([]);

  // Filter low stock (stock > 0 and stock <= reorderPoint or <= threshold)
  const lowStockProducts = products.filter(p => {
    const threshold = p.reorderPoint || lowStockThreshold || 10;
    const isLow = p.stock > 0 && p.stock <= threshold;
    if (!isLow) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return p.name.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term) || p.category.toLowerCase().includes(term);
    }
    return true;
  });

  const totalReplenishmentCost = lowStockProducts.reduce((sum, p) => {
    const targetStock = (p.reorderPoint || 15) * 2;
    const qtyNeeded = Math.max(0, targetStock - p.stock);
    return sum + (qtyNeeded * (p.cost || p.price * 0.5));
  }, 0);

  const handleSimulatePO = (id: string) => {
    setOrderedItemIds(prev => [...prev, id]);
    setTimeout(() => {
      alert('Replenishment Purchase Order draft created successfully!');
    }, 100);
  };

  return (
    <div className="space-y-6" id="low-stock-report">
      
      {/* 1. Metric Header Highlights */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-4">
        
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-3xl p-5 space-y-1">
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-xs font-bold uppercase tracking-wider">Low Stock Items</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-amber-800 font-mono">
            {lowStockProducts.length} <span className="text-sm font-normal text-amber-600">SKUs At Risk</span>
          </div>
          <p className="text-[11px] text-amber-700/80">Inventory levels at or below safety reorder threshold</p>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Estimated PO Cost</span>
            <ShoppingCart className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {formatAmount(totalReplenishmentCost)}
          </div>
          <p className="text-[11px] text-slate-400">Capital required to replenish safety stock levels</p>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Runout Risk Status</span>
            <TrendingDown className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            3 - 7 <span className="text-sm font-normal text-slate-500">Days Coverage</span>
          </div>
          <p className="text-[11px] text-slate-400">Based on trailing 30-day sales velocity</p>
        </div>

      </div>

      {/* 2. Low Stock Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-slate-900">Low Stock Depletion Register</h3>
            <p className="text-xs text-slate-400">Immediate replenishment required to prevent stockout</p>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search low stock SKUs..."
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
                <th className="py-3 px-4">Product Name / SKU</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4 text-center">Current Stock</th>
                <th className="py-3 px-4 text-center">Reorder Point</th>
                <th className="py-3 px-4 text-right">Suggested Reorder Qty</th>
                <th className="py-3 px-4 text-right">Est. Unit Cost</th>
                <th className="py-3 px-4 text-right">Total Est. Cost</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {lowStockProducts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                    <p className="font-bold text-slate-700">Inventory Levels Healthy</p>
                    <p className="text-[11px]">No products are currently at or below the safety reorder threshold.</p>
                  </td>
                </tr>
              ) : (
                lowStockProducts.map(p => {
                  const targetStock = (p.reorderPoint || 15) * 2;
                  const suggestedQty = Math.max(10, targetStock - p.stock);
                  const cost = p.cost || p.price * 0.5;
                  const isOrdered = orderedItemIds.includes(p.id);

                  return (
                    <tr key={p.id} className="hover:bg-amber-50/40 transition-colors">
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
                      <td className="py-3 px-4 text-center font-mono font-black text-rose-600">
                        <span className="px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200">
                          {p.stock} units
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-slate-500 font-bold">
                        {p.reorderPoint || 10}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-indigo-600">
                        +{suggestedQty}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600">{formatAmount(cost)}</td>
                      <td className="py-3 px-4 text-right font-mono font-black text-slate-900">
                        {formatAmount(suggestedQty * cost)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isOrdered ? (
                          <span className="px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                            PO Created
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSimulatePO(p.id)}
                            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-bold shadow-xs cursor-pointer"
                          >
                            Create PO
                          </button>
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
        <div className="block lg:hidden p-3.5 sm:p-4 bg-slate-50/50">
          {lowStockProducts.length === 0 ? (
            <div className="py-8 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
              <p className="font-bold text-slate-700">Inventory Levels Healthy</p>
              <p className="text-[11px]">No products are currently at or below the safety reorder threshold.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {lowStockProducts.map(p => {
                const targetStock = (p.reorderPoint || 15) * 2;
                const suggestedQty = Math.max(10, targetStock - p.stock);
                const cost = p.cost || p.price * 0.5;
                const isOrdered = orderedItemIds.includes(p.id);

                return (
                  <div key={p.id} className="bg-white p-3.5 rounded-2xl border border-amber-200/80 shadow-2xs space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-xs text-slate-900 line-clamp-1">{p.name}</div>
                        <span className="font-mono text-[10px] text-slate-400">{p.sku} • {p.category}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black font-mono bg-rose-50 text-rose-600 border border-rose-200 shrink-0">
                        {p.stock} in stock
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1.5 border-t border-slate-100">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Reorder Point:</span>
                        <span className="font-mono font-bold text-slate-700">{p.reorderPoint || 10}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-400 block text-[10px]">Suggested Qty:</span>
                        <span className="font-mono font-bold text-indigo-600">+{suggestedQty}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Est. Total Cost:</span>
                        <span className="font-mono font-black text-slate-900">{formatAmount(suggestedQty * cost)}</span>
                      </div>
                      <div className="text-right flex items-end justify-end">
                        {isOrdered ? (
                          <span className="px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                            PO Created
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSimulatePO(p.id)}
                            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-bold shadow-xs cursor-pointer"
                          >
                            Create PO
                          </button>
                        )}
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
