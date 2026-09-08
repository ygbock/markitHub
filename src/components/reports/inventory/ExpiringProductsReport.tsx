import React, { useState } from 'react';
import { 
  CalendarClock, Clock, AlertTriangle, ShieldAlert, 
  Search, CheckCircle2, DollarSign, Tag, RefreshCw 
} from 'lucide-react';
import { InventoryBatch } from '../../../types';
import { useCurrency } from '../../../context/CurrencyContext';

interface ExpiringProductsReportProps {
  batches: InventoryBatch[];
}

export default function ExpiringProductsReport({ batches }: ExpiringProductsReportProps) {
  const { formatAmount } = useCurrency();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const now = new Date('2026-08-17T12:00:00-07:00'); // Consistent reference point

  const processedBatches = batches.map(b => {
    const expDate = new Date(b.expiryDate);
    const diffTime = expDate.getTime() - now.getTime();
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    let dynamicStatus: 'Expired' | 'Critical (< 15d)' | 'Soon (< 45d)' | 'Good' = 'Good';
    if (daysRemaining < 0) dynamicStatus = 'Expired';
    else if (daysRemaining <= 15) dynamicStatus = 'Critical (< 15d)';
    else if (daysRemaining <= 45) dynamicStatus = 'Soon (< 45d)';

    const remQty = b.remainingQuantity ?? b.quantity ?? 0;
    const unitC = b.costPerUnit ?? b.unitCost ?? 0;
    const initQty = b.initialQuantity ?? remQty ?? 0;
    const supp = b.supplierName || 'Primary Certified Supplier';
    const costAtRisk = remQty * unitC;

    return {
      ...b,
      remainingQuantity: remQty,
      initialQuantity: initQty,
      supplierName: supp,
      daysRemaining,
      dynamicStatus,
      costAtRisk
    };
  });

  const filteredBatches = processedBatches.filter(b => {
    if (statusFilter !== 'all' && b.dynamicStatus !== statusFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        b.productName.toLowerCase().includes(term) ||
        b.sku.toLowerCase().includes(term) ||
        b.batchNumber.toLowerCase().includes(term) ||
        b.supplierName.toLowerCase().includes(term)
      );
    }
    return true;
  }).sort((a, b) => a.daysRemaining - b.daysRemaining);

  const expiredBatches = processedBatches.filter(b => b.daysRemaining < 0);
  const criticalBatches = processedBatches.filter(b => b.daysRemaining >= 0 && b.daysRemaining <= 45);
  const totalValueAtRisk = criticalBatches.reduce((sum, b) => sum + b.costAtRisk, 0);

  return (
    <div className="space-y-6" id="expiring-products-report">
      
      {/* 1. Header Highlight Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-4">
        
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-3xl p-5 space-y-1">
          <div className="flex items-center justify-between text-rose-700">
            <span className="text-xs font-bold uppercase tracking-wider">Already Expired</span>
            <CalendarClock className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-rose-800 font-mono">
            {expiredBatches.length} <span className="text-sm font-normal text-rose-600">Batches</span>
          </div>
          <p className="text-[11px] text-rose-700/80">Immediate quarantine & write-off required</p>
        </div>

        <div className="bg-amber-500/10 border border-amber-500/20 rounded-3xl p-5 space-y-1">
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-xs font-bold uppercase tracking-wider">Expiring in &lt; 45 Days</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-amber-800 font-mono">
            {criticalBatches.length} <span className="text-sm font-normal text-amber-600">Lots Near Expiry</span>
          </div>
          <p className="text-[11px] text-amber-700/80">Priority FIFO / FEFO clearance candidates</p>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Capital Value at Risk</span>
            <DollarSign className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {formatAmount(totalValueAtRisk)}
          </div>
          <p className="text-[11px] text-slate-400">Total cost basis of near-expiry lot inventory</p>
        </div>

      </div>

      {/* 2. Expiring Lots Ledger Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-slate-900">Batch Expiry & Lot Tracking Matrix</h3>
            <p className="text-xs text-slate-400">First-Expired-First-Out (FEFO) schedule and shelf life monitoring</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search lot, SKU, supplier..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-500 w-56"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none cursor-pointer"
            >
              <option value="all">All Expiry Statuses</option>
              <option value="Critical (< 15d)">Critical (&lt; 15 Days)</option>
              <option value="Soon (< 45d)">Soon (&lt; 45 Days)</option>
              <option value="Expired">Already Expired</option>
              <option value="Good">Healthy (&gt; 45 Days)</option>
            </select>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Product / SKU</th>
                <th className="py-3 px-4">Batch / Lot #</th>
                <th className="py-3 px-4">Supplier</th>
                <th className="py-3 px-4 text-center">Remaining Stock</th>
                <th className="py-3 px-4">Expiry Date</th>
                <th className="py-3 px-4 text-center">Days Left</th>
                <th className="py-3 px-4 text-right">Value at Risk</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredBatches.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                    <p className="font-bold text-slate-700">No Batches Matching Filter</p>
                    <p className="text-[11px]">All batches are within standard operating freshness windows.</p>
                  </td>
                </tr>
              ) : (
                filteredBatches.map(b => {
                  const isExpired = b.daysRemaining < 0;
                  const isCritical = b.daysRemaining >= 0 && b.daysRemaining <= 15;
                  const isSoon = b.daysRemaining > 15 && b.daysRemaining <= 45;

                  return (
                    <tr key={b.id} className={`transition-colors ${
                      isExpired ? 'bg-rose-50/50' : isCritical ? 'bg-amber-50/40' : 'hover:bg-slate-50'
                    }`}>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{b.productName}</div>
                        <div className="font-mono text-[10px] text-slate-400">{b.sku}</div>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-indigo-700">{b.batchNumber}</td>
                      <td className="py-3 px-4 text-slate-600 text-[11px] font-medium">{b.supplierName}</td>
                      <td className="py-3 px-4 text-center font-mono font-black text-slate-900">
                        {b.remainingQuantity} / {b.initialQuantity} units
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600 text-[11px]">
                        {new Date(b.expiryDate).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-black">
                        <span className={
                          isExpired ? 'text-rose-600' :
                          isCritical ? 'text-rose-600' :
                          isSoon ? 'text-amber-600' : 'text-emerald-600'
                        }>
                          {isExpired ? `${Math.abs(b.daysRemaining)}d OVERDUE` : `${b.daysRemaining} days`}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {formatAmount(b.costAtRisk)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isExpired ? 'bg-rose-600 text-white' :
                          isCritical ? 'bg-rose-100 text-rose-800' :
                          isSoon ? 'bg-amber-100 text-amber-800' :
                          'bg-emerald-100 text-emerald-800'
                        }`}>
                          {b.dynamicStatus}
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
          {filteredBatches.length === 0 ? (
            <div className="py-8 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
              <p className="font-bold text-slate-700">No Batches Matching Filter</p>
              <p className="text-[11px]">All batches are within standard operating freshness windows.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {filteredBatches.map(b => {
                const isExpired = b.daysRemaining < 0;
                const isCritical = b.daysRemaining >= 0 && b.daysRemaining <= 15;
                const isSoon = b.daysRemaining > 15 && b.daysRemaining <= 45;

                return (
                  <div key={b.id} className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-xs text-slate-900 line-clamp-1">{b.productName}</div>
                        <span className="font-mono text-[10px] text-slate-400">Lot: {b.batchNumber}</span>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                        isExpired ? 'bg-rose-600 text-white' :
                        isCritical ? 'bg-rose-100 text-rose-800' :
                        isSoon ? 'bg-amber-100 text-amber-800' :
                        'bg-emerald-100 text-emerald-800'
                      }`}>
                        {b.dynamicStatus}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1.5 border-t border-slate-100">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Expiry Timeline:</span>
                        <span className={`font-bold font-mono ${isExpired || isCritical ? 'text-rose-600' : isSoon ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {isExpired ? `${Math.abs(b.daysRemaining)}d OVERDUE` : `${b.daysRemaining} days left`}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-400 block text-[10px]">Cost at Risk:</span>
                        <span className="font-black font-mono text-slate-900">{formatAmount(b.costAtRisk)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Remaining Stock:</span>
                        <span className="font-mono font-bold text-slate-700">{b.remainingQuantity} / {b.initialQuantity} units</span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-400 block text-[10px]">Expiry Date:</span>
                        <span className="font-mono text-slate-600">{new Date(b.expiryDate).toLocaleDateString()}</span>
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
