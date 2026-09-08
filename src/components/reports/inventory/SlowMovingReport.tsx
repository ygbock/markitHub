import React from 'react';
import { 
  ArrowDownRight, Clock, AlertTriangle, 
  HelpCircle, Tag, TrendingDown, CheckCircle2 
} from 'lucide-react';
import { Product } from '../../../types';
import { useCurrency } from '../../../context/CurrencyContext';

interface SlowMovingReportProps {
  products: Product[];
}

export default function SlowMovingReport({ products }: SlowMovingReportProps) {
  const { formatAmount } = useCurrency();

  // Slow moving: Products with stock > 10, but salesCount between 1 and 20 (low turnover relative to stock)
  const slowMovingProducts = products
    .filter(p => p.stock > 10 && (p.salesCount || 0) <= 25)
    .sort((a, b) => (a.salesCount || 0) - (b.salesCount || 0));

  const totalSlowStock = slowMovingProducts.reduce((sum, p) => sum + p.stock, 0);
  const totalSlowCost = slowMovingProducts.reduce((sum, p) => sum + (p.stock * (p.cost || p.price * 0.45)), 0);

  return (
    <div className="space-y-6" id="slow-moving-report">
      
      {/* 1. Metric Header Highlights */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-4">
        
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Slow-Moving SKUs</span>
            <ArrowDownRight className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {slowMovingProducts.length} <span className="text-sm font-normal text-slate-500">Product Lines</span>
          </div>
          <p className="text-[11px] text-slate-400">High inventory holding with low sales velocity</p>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Total Stagnant Units</span>
            <Clock className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {totalSlowStock} <span className="text-sm font-normal text-slate-500">Units in Stock</span>
          </div>
          <p className="text-[11px] text-slate-400">Estimated Days of Supply &gt; 120 Days</p>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Carrying Cost Value</span>
            <TrendingDown className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {formatAmount(totalSlowCost)}
          </div>
          <p className="text-[11px] text-slate-400">Capital tied up in sluggish merchandise</p>
        </div>

      </div>

      {/* 2. Slow Moving Inventory Matrix Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100">
          <h3 className="text-sm font-black text-slate-900">Slow Turnover Inventory Ledger</h3>
          <p className="text-xs text-slate-400">Products with disproportionate inventory levels relative to monthly demand</p>
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Product / SKU</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">In Stock</th>
                <th className="py-3 px-4 text-right">Unit Cost</th>
                <th className="py-3 px-4 text-right">Tied-Up Capital</th>
                <th className="py-3 px-4 text-center">Past 30-Day Sales</th>
                <th className="py-3 px-4 text-center">Days of Supply (DOS)</th>
                <th className="py-3 px-4 text-center">Recommended Strategy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {slowMovingProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                    <p className="font-bold text-slate-700">Optimal Inventory Turnover</p>
                    <p className="text-[11px]">No products currently exhibit sluggish turnover patterns.</p>
                  </td>
                </tr>
              ) : (
                slowMovingProducts.map(p => {
                  const cost = p.cost || p.price * 0.45;
                  const tiedUp = p.stock * cost;
                  const estimatedMonthlySales = Math.max(1, p.salesCount || 1);
                  const daysOfSupply = Math.round((p.stock / estimatedMonthlySales) * 30);

                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{p.name}</div>
                        <div className="font-mono text-[10px] text-slate-400">{p.sku}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[10px]">
                          {p.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {p.stock} units
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600">{formatAmount(cost)}</td>
                      <td className="py-3 px-4 text-right font-mono font-black text-slate-800">
                        {formatAmount(tiedUp)}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-amber-700 font-bold">
                        {p.salesCount} sold
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-rose-600">
                        {daysOfSupply} Days
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2.5 py-1 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-bold">
                          {p.stock > 50 ? 'Bundle & Save 15%' : 'Featured Shelf Display'}
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
          {slowMovingProducts.length === 0 ? (
            <div className="py-8 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
              <p className="font-bold text-slate-700">Optimal Inventory Turnover</p>
              <p className="text-[11px]">No products currently exhibit sluggish turnover patterns.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {slowMovingProducts.map(p => {
                const cost = p.cost || p.price * 0.45;
                const tiedUp = p.stock * cost;
                const estimatedMonthlySales = Math.max(1, p.salesCount || 1);
                const daysOfSupply = Math.round((p.stock / estimatedMonthlySales) * 30);

                return (
                  <div key={p.id} className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-xs text-slate-900 line-clamp-1">{p.name}</div>
                        <span className="font-mono text-[10px] text-slate-400">{p.sku} • {p.category}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black font-mono bg-slate-100 text-slate-800 shrink-0">
                        {p.stock} units
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1.5 border-t border-slate-100">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Tied-Up Capital:</span>
                        <span className="font-mono font-black text-slate-800">{formatAmount(tiedUp)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-400 block text-[10px]">Days of Supply:</span>
                        <span className="font-mono font-bold text-rose-600">{daysOfSupply} Days</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">30-Day Sales:</span>
                        <span className="font-mono font-bold text-amber-700">{p.salesCount} sold</span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-400 block text-[10px]">Unit Cost:</span>
                        <span className="font-mono text-slate-600">{formatAmount(cost)}</span>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                      <span className="text-[10px] text-slate-400 font-medium">Strategy:</span>
                      <span className="px-2 py-0.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-bold">
                        {p.stock > 50 ? 'Bundle & Save 15%' : 'Featured Display'}
                      </span>
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
