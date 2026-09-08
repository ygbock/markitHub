import React, { useState } from 'react';
import { 
  ClipboardCheck, AlertTriangle, Plus, Search, 
  CheckCircle2, DollarSign, User, ShieldCheck, X
} from 'lucide-react';
import { StockAdjustmentRecord, Product, StaffMember } from '../../../types';
import { useCurrency } from '../../../context/CurrencyContext';

interface StockAdjustmentsReportProps {
  adjustments: StockAdjustmentRecord[];
  products: Product[];
  activeStaff: StaffMember;
  onAddAdjustment?: (adj: StockAdjustmentRecord) => void;
}

export default function StockAdjustmentsReport({
  adjustments,
  products,
  activeStaff,
  onAddAdjustment
}: StockAdjustmentsReportProps) {
  const { formatAmount } = useCurrency();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New adjustment form state
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '');
  const [physicalQty, setPhysicalQty] = useState<number>(0);
  const [reason, setReason] = useState<StockAdjustmentRecord['reason']>('Physical Count Discrepancy');
  const [notes, setNotes] = useState('');

  const selectedProduct = products.find(p => p.id === selectedProductId) || products[0];

  const filteredAdjustments = adjustments.filter(a => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        a.productName.toLowerCase().includes(term) ||
        a.sku.toLowerCase().includes(term) ||
        a.adjustedBy.toLowerCase().includes(term) ||
        a.reason.toLowerCase().includes(term)
      );
    }
    return true;
  });

  const totalVarianceCost = filteredAdjustments.reduce((sum, a) => sum + a.varianceCost, 0);
  const netVarianceUnits = filteredAdjustments.reduce((sum, a) => sum + a.varianceQuantity, 0);

  const handleCreateAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    const varianceQty = physicalQty - selectedProduct.stock;
    const unitCost = selectedProduct.cost || selectedProduct.price * 0.5;
    const varianceCost = varianceQty * unitCost;

    const newRecord: StockAdjustmentRecord = {
      id: `adj-${Date.now().toString().slice(-4)}`,
      date: new Date().toISOString(),
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      sku: selectedProduct.sku,
      location: selectedProduct.location,
      systemQuantity: selectedProduct.stock,
      physicalQuantity: physicalQty,
      varianceQuantity: varianceQty,
      unitCost,
      varianceCost,
      reason,
      adjustedBy: activeStaff.name,
      status: 'Approved',
      notes: notes || 'Manual audit cycle adjustment.'
    };

    if (onAddAdjustment) {
      onAddAdjustment(newRecord);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6" id="stock-adjustments-report">
      
      {/* 1. Header Highlight Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-4">
        
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Adjustment Audits</span>
            <ClipboardCheck className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {filteredAdjustments.length} <span className="text-sm font-normal text-slate-500">Reconciliations</span>
          </div>
          <p className="text-[11px] text-slate-400">Total physical inventory variance audits</p>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Net Unit Variance</span>
            <span className={`text-xs font-bold font-mono ${netVarianceUnits >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {netVarianceUnits > 0 ? `+${netVarianceUnits}` : netVarianceUnits} Units
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {netVarianceUnits > 0 ? `+${netVarianceUnits}` : netVarianceUnits}
          </div>
          <p className="text-[11px] text-slate-400">Overall physical count vs system book delta</p>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Net Cost Variance Impact</span>
            <DollarSign className="w-4 h-4 text-slate-400" />
          </div>
          <div className={`text-2xl font-black font-mono ${totalVarianceCost >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {totalVarianceCost >= 0 ? `+${formatAmount(totalVarianceCost)}` : `-${formatAmount(Math.abs(totalVarianceCost))}`}
          </div>
          <p className="text-[11px] text-slate-400">Cumulative financial gain/loss from discrepancies</p>
        </div>

      </div>

      {/* 2. Adjustments Ledger Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-slate-900">Physical Stock Audit & Shrinkage Register</h3>
            <p className="text-xs text-slate-400">Audited manual adjustments with reason codes and cost variance</p>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search audit adjustments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-500 w-full sm:w-56"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                if (selectedProduct) setPhysicalQty(selectedProduct.stock);
                setIsModalOpen(true);
              }}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer w-full sm:w-auto shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record Audit</span>
            </button>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[760px]">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Product / SKU</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4 text-center">System Qty</th>
                <th className="py-3 px-4 text-center">Physical Qty</th>
                <th className="py-3 px-4 text-center">Variance Qty</th>
                <th className="py-3 px-4 text-right">Cost Variance</th>
                <th className="py-3 px-4">Reason / Notes</th>
                <th className="py-3 px-4">Auditor</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredAdjustments.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">
                    <p className="font-bold text-slate-700">No Adjustment Records</p>
                    <p className="text-[11px]">All physical stock counts match registered ledger balances.</p>
                  </td>
                </tr>
              ) : (
                filteredAdjustments.map(a => {
                  const isPositive = a.varianceQuantity > 0;
                  const isZero = a.varianceQuantity === 0;

                  return (
                    <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 text-slate-500 text-[11px] font-mono whitespace-nowrap">
                        {new Date(a.date).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{a.productName}</div>
                        <div className="font-mono text-[10px] text-slate-400">{a.sku}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px]">{a.location}</td>
                      <td className="py-3 px-4 text-center font-mono text-slate-600 font-bold">{a.systemQuantity}</td>
                      <td className="py-3 px-4 text-center font-mono font-black text-slate-900">{a.physicalQuantity}</td>
                      <td className="py-3 px-4 text-center font-mono font-black">
                        <span className={`px-2 py-0.5 rounded-md ${
                          isZero ? 'bg-slate-100 text-slate-600' :
                          isPositive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {isPositive ? `+${a.varianceQuantity}` : a.varianceQuantity}
                        </span>
                      </td>
                      <td className={`py-3 px-4 text-right font-mono font-bold ${
                        a.varianceCost >= 0 ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        {a.varianceCost >= 0 ? `+${formatAmount(a.varianceCost)}` : `-${formatAmount(Math.abs(a.varianceCost))}`}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{a.reason}</div>
                        {a.notes && <div className="text-[10px] text-slate-400 truncate max-w-xs">{a.notes}</div>}
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-bold text-[11px]">{a.adjustedBy}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {a.status}
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
        <div className="block lg:hidden p-2.5 sm:p-4 bg-slate-50/50">
          {filteredAdjustments.length === 0 ? (
            <div className="py-8 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
              <p className="font-bold text-slate-700">No Adjustment Records</p>
              <p className="text-[11px]">All physical stock counts match registered ledger balances.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {filteredAdjustments.map(a => {
                const isPositive = a.varianceQuantity > 0;
                const isZero = a.varianceQuantity === 0;

                return (
                  <div key={a.id} className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-xs text-slate-900 line-clamp-1">{a.productName}</div>
                        <span className="font-mono text-[10px] text-slate-400">{a.sku} • {a.location}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold shrink-0 ${
                        isZero ? 'bg-slate-100 text-slate-600' :
                        isPositive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {isPositive ? `+${a.varianceQuantity}` : a.varianceQuantity} var
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1.5 border-t border-slate-100">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Counts (Sys &rarr; Phys):</span>
                        <span className="font-mono font-bold text-slate-700">{a.systemQuantity} &rarr; <strong className="text-slate-900">{a.physicalQuantity}</strong></span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-400 block text-[10px]">Cost Variance:</span>
                        <span className={`font-mono font-black ${a.varianceCost >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {a.varianceCost >= 0 ? `+${formatAmount(a.varianceCost)}` : `-${formatAmount(Math.abs(a.varianceCost))}`}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Reason:</span>
                        <span className="font-medium text-slate-800 text-[10px] line-clamp-1">{a.reason}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-400 block text-[10px]">Auditor & Date:</span>
                        <span className="font-medium text-slate-600 text-[10px] truncate block">{a.adjustedBy} • {new Date(a.date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Modal: Record New Stock Adjustment */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-black text-slate-900">Record Stock Adjustment</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAdjustment} className="space-y-4 text-xs">
              
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Select Product / SKU</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => {
                    setSelectedProductId(e.target.value);
                    const prod = products.find(p => p.id === e.target.value);
                    if (prod) setPhysicalQty(prod.stock);
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none"
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.sku}) — System: {p.stock} in stock</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">System Recorded Stock</label>
                  <input
                    type="text"
                    disabled
                    value={`${selectedProduct?.stock || 0} units`}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl font-mono text-slate-500 font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Physical Counted Stock</label>
                  <input
                    type="number"
                    min="0"
                    value={physicalQty}
                    onChange={(e) => setPhysicalQty(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 border border-indigo-300 focus:border-indigo-600 rounded-xl font-mono font-bold text-slate-900 outline-none"
                  />
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex items-center justify-between">
                <span className="font-bold text-indigo-900">Calculated Variance:</span>
                <span className="font-mono font-black text-indigo-700 text-sm">
                  {physicalQty - (selectedProduct?.stock || 0) >= 0 
                    ? `+${physicalQty - (selectedProduct?.stock || 0)}` 
                    : physicalQty - (selectedProduct?.stock || 0)} Units
                </span>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Reason for Adjustment</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none"
                >
                  <option value="Physical Count Discrepancy">Physical Count Discrepancy</option>
                  <option value="Damaged Stock">Damaged Stock</option>
                  <option value="Shrinkage/Theft">Shrinkage / Theft Loss</option>
                  <option value="Expired Goods">Expired Goods Write-Off</option>
                  <option value="Vendor Packing Error">Vendor Packing Error</option>
                  <option value="System Calibration">System Calibration</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Audit Notes & Reference</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Cycle count location, shelf bin, or incident details..."
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
                >
                  Confirm & Post Adjustment
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
