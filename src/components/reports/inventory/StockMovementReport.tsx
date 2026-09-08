import React, { useState } from 'react';
import { 
  RefreshCw, ArrowDownLeft, ArrowUpRight, ArrowRightLeft, 
  Search, Filter, Calendar, Building2, User, PlusCircle, CheckCircle2 
} from 'lucide-react';
import { StockMovementRecord } from '../../../types';
import { useCurrency } from '../../../context/CurrencyContext';

interface StockMovementReportProps {
  movements: StockMovementRecord[];
  selectedLocation: string;
}

export default function StockMovementReport({ movements, selectedLocation }: StockMovementReportProps) {
  const { formatAmount } = useCurrency();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const filteredMovements = movements.filter(m => {
    if (selectedLocation !== 'all' && !m.location.includes(selectedLocation)) return false;
    if (typeFilter !== 'all' && m.type !== typeFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        m.productName.toLowerCase().includes(term) ||
        m.sku.toLowerCase().includes(term) ||
        m.performedBy.toLowerCase().includes(term) ||
        (m.referenceDoc && m.referenceDoc.toLowerCase().includes(term))
      );
    }
    return true;
  });

  const totalInflowUnits = filteredMovements
    .filter(m => m.quantityChange > 0)
    .reduce((sum, m) => sum + m.quantityChange, 0);

  const totalOutflowUnits = filteredMovements
    .filter(m => m.quantityChange < 0)
    .reduce((sum, m) => sum + Math.abs(m.quantityChange), 0);

  const netUnitDelta = totalInflowUnits - totalOutflowUnits;

  const movementTypes = [
    'PO Received',
    'POS Sale',
    'Online Sale',
    'Inter-Branch Transfer',
    'Damage Write-Off',
    'Return to Inventory',
    'Audit Adjustment'
  ];

  return (
    <div className="space-y-6" id="stock-movement-report">
      
      {/* 1. Inflow vs Outflow Metric Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-4">
        
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-3xl p-5 space-y-1">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-xs font-bold uppercase tracking-wider">Total Stock Inflow</span>
            <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-800 font-mono">
            +{totalInflowUnits} <span className="text-sm font-normal text-emerald-600">Units In</span>
          </div>
          <p className="text-[11px] text-emerald-700/80">From PO receiving, returns & positive adjustments</p>
        </div>

        <div className="bg-rose-500/10 border border-rose-500/20 rounded-3xl p-5 space-y-1">
          <div className="flex items-center justify-between text-rose-700">
            <span className="text-xs font-bold uppercase tracking-wider">Total Stock Outflow</span>
            <ArrowUpRight className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-800 font-mono">
            -{totalOutflowUnits} <span className="text-sm font-normal text-rose-600">Units Out</span>
          </div>
          <p className="text-[11px] text-rose-700/80">Via POS checkouts, e-commerce orders & scrap write-offs</p>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Net Inventory Delta</span>
            <RefreshCw className="w-4 h-4 text-indigo-600" />
          </div>
          <div className={`text-2xl font-black font-mono ${netUnitDelta >= 0 ? 'text-indigo-600' : 'text-amber-600'}`}>
            {netUnitDelta >= 0 ? `+${netUnitDelta}` : netUnitDelta} <span className="text-sm font-normal text-slate-500">Net Flow</span>
          </div>
          <p className="text-[11px] text-slate-400">Total movement events: {filteredMovements.length}</p>
        </div>

      </div>

      {/* 2. Stock Movement Ledger Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        
        {/* Table Filter Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-slate-900">Stock Movement Audit Trail</h3>
            <p className="text-xs text-slate-400">Chronological ledger of every inventory mutation</p>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search SKU, product, ref doc..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-500 w-full sm:w-56"
              />
            </div>

            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-700 shrink-0">
              <span className="text-slate-400 text-[10px] uppercase font-bold mr-1 hidden xs:inline">Type:</span>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
              >
                <option value="all">All Movement Types</option>
                {movementTypes.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Desktop Table Records */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Product / SKU</th>
                <th className="py-3 px-4">Movement Type</th>
                <th className="py-3 px-4 text-center">Qty Change</th>
                <th className="py-3 px-4 text-center">Stock (Before &rarr; After)</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Ref Document</th>
                <th className="py-3 px-4">Staff</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredMovements.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    <p className="font-bold text-slate-700">No Movement Records Found</p>
                    <p className="text-[11px]">No transactions match the selected filters.</p>
                  </td>
                </tr>
              ) : (
                filteredMovements.map(m => {
                  const isPositive = m.quantityChange > 0;

                  return (
                    <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 text-slate-500 text-[11px] font-mono whitespace-nowrap">
                        {new Date(m.date).toLocaleDateString()} {new Date(m.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{m.productName}</div>
                        <div className="font-mono text-[10px] text-slate-400">{m.sku}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          m.type.includes('Inflow') || m.type === 'PO Received' || m.type === 'Return to Inventory'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : m.type === 'Damage Write-Off'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : m.type === 'Inter-Branch Transfer'
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {m.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-black">
                        <span className={isPositive ? 'text-emerald-600' : 'text-rose-600'}>
                          {isPositive ? `+${m.quantityChange}` : m.quantityChange}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-slate-500 text-[11px]">
                        {m.quantityBefore} &rarr; <span className="font-bold text-slate-800">{m.quantityAfter}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 text-[11px] font-medium">{m.location}</td>
                      <td className="py-3 px-4 font-mono text-[10px] text-indigo-600 font-bold">{m.referenceDoc || '—'}</td>
                      <td className="py-3 px-4 text-slate-700 font-bold text-[11px]">{m.performedBy}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile & Tablet Grid View */}
        <div className="block lg:hidden p-2.5 sm:p-4 bg-slate-50/50">
          {filteredMovements.length === 0 ? (
            <div className="py-8 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
              <p className="font-bold text-slate-700">No Movement Records Found</p>
              <p className="text-[11px]">No transactions match the selected filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {filteredMovements.map(m => {
                const isPositive = m.quantityChange > 0;

                return (
                  <div key={m.id} className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-xs text-slate-900 line-clamp-1">{m.productName}</div>
                        <span className="font-mono text-[10px] text-slate-400">{m.sku}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                        m.type.includes('Inflow') || m.type === 'PO Received' || m.type === 'Return to Inventory'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : m.type === 'Damage Write-Off'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : m.type === 'Inter-Branch Transfer'
                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {m.type}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1.5 border-t border-slate-100">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Quantity Change:</span>
                        <span className={`font-mono font-black ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {isPositive ? `+${m.quantityChange}` : m.quantityChange}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-400 block text-[10px]">Stock Shift:</span>
                        <span className="font-mono text-slate-700">{m.quantityBefore} &rarr; <strong className="text-slate-900">{m.quantityAfter}</strong></span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Location & Staff:</span>
                        <span className="font-medium text-slate-700 truncate block">{m.location} • {m.performedBy}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-400 block text-[10px]">Reference:</span>
                        <span className="font-mono font-bold text-indigo-600 truncate block">{m.referenceDoc || '—'}</span>
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
