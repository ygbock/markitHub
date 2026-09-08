import React, { useState } from 'react';
import { 
  Box, CalendarClock, ShieldAlert, AlertTriangle, Plus, CheckCircle2, 
  Search, Users, FileText, RefreshCw, Layers, ArrowRight, Tag, ShieldCheck, Check
} from 'lucide-react';
import { Product, BatchLotRecord, BatchSaleRecord } from '../types';
import { createBatchLot, triggerBatchRecall } from '../utils/batchLotManager';
import { useCurrency } from '../context/CurrencyContext';

interface BatchLotSectionProps {
  product: Product;
  onUpdateProduct?: (updatedProduct: Product) => void;
}

export default function BatchLotSection({ product, onUpdateProduct }: BatchLotSectionProps) {
  const { formatAmount } = useCurrency();

  const [batches, setBatches] = useState<BatchLotRecord[]>(product.fifoBatches || []);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedTraceBatch, setSelectedTraceBatch] = useState<BatchLotRecord | null>(null);
  const [selectedRecallBatch, setSelectedRecallBatch] = useState<BatchLotRecord | null>(null);
  const [recallReason, setRecallReason] = useState('');
  const [recallSuccess, setRecallSuccess] = useState<string | null>(null);

  // New Batch Form State
  const [newBatchNo, setNewBatchNo] = useState(`MLK-${new Date().toISOString().slice(0, 10)}`);
  const [newMfgDate, setNewMfgDate] = useState(new Date().toISOString().slice(0, 10));
  const [newExpDate, setNewExpDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 6);
    return d.toISOString().slice(0, 10);
  });
  const [newQty, setNewQty] = useState<number>(500);
  const [newCost, setNewCost] = useState<number>(product.purchasePrice || product.cost || 2.50);
  const [newSupplier, setNewSupplier] = useState(product.supplierName || 'Dairy Supply Co.');

  const handleAddBatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBatchNo.trim() || newQty <= 0) return;

    const newBatch = createBatchLot(newBatchNo, newQty, newCost, {
      manufactureDate: newMfgDate,
      expiryDate: newExpDate,
      supplierName: newSupplier,
    });

    const updatedBatches = [newBatch, ...(product.fifoBatches || [])];
    const updatedProduct: Product = {
      ...product,
      fifoBatches: updatedBatches,
      stock: (product.stock || 0) + newQty,
      trackBatch: true,
      trackExpiry: true,
    };

    setBatches(updatedBatches);
    if (onUpdateProduct) {
      onUpdateProduct(updatedProduct);
    }

    setShowAddModal(false);
    setNewBatchNo(`LOT-${Date.now().toString().slice(-4)}`);
  };

  const handleExecuteRecall = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecallBatch || !recallReason.trim()) return;

    const result = triggerBatchRecall(product, selectedRecallBatch.id, recallReason);
    
    setBatches(result.updatedProduct.fifoBatches || []);
    if (onUpdateProduct) {
      onUpdateProduct(result.updatedProduct);
    }

    setRecallSuccess(`Batch ${selectedRecallBatch.batchNumber} has been successfully RECALLED & Quarantined. ${result.affectedSales.length} customer sales identified for notification.`);
    setSelectedRecallBatch(null);
    setRecallReason('');
  };

  const activeBatchesCount = batches.filter(b => (b.status === 'Active' || !b.status) && b.quantity > 0).length;
  const totalBatchStock = batches.reduce((sum, b) => sum + (b.quantity || 0), 0);

  return (
    <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 space-y-4 shadow-2xs">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Box className="w-4 h-4 text-amber-600" />
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Batch & Lot Traceability Engine
            </h4>
            <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-mono font-extrabold rounded-md">
              {product.stockRotationMethod || 'FEFO'} Strategy
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Individual batch manufacturing dates, expiration FEFO rotation, and sales recall logs.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Intake Batch</span>
        </button>
      </div>

      {recallSuccess && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{recallSuccess}</span>
          </div>
          <button type="button" onClick={() => setRecallSuccess(null)} className="text-rose-600 font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Summary Chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
        <div className="bg-white p-2.5 rounded-xl border border-slate-200">
          <span className="text-[10px] font-bold text-gray-400 uppercase block">Active Batches</span>
          <span className="text-sm font-extrabold text-slate-900">{activeBatchesCount} Batches</span>
        </div>
        <div className="bg-white p-2.5 rounded-xl border border-slate-200">
          <span className="text-[10px] font-bold text-gray-400 uppercase block">Tracked Batch Stock</span>
          <span className="text-sm font-extrabold text-amber-700">{totalBatchStock} Units</span>
        </div>
        <div className="bg-white p-2.5 rounded-xl border border-slate-200">
          <span className="text-[10px] font-bold text-gray-400 uppercase block">Rotation Policy</span>
          <span className="text-sm font-extrabold text-indigo-700">{product.stockRotationMethod || 'FEFO'}</span>
        </div>
        <div className="bg-white p-2.5 rounded-xl border border-slate-200">
          <span className="text-[10px] font-bold text-gray-400 uppercase block">Perishable Expiry</span>
          <span className="text-sm font-extrabold text-emerald-700">
            {product.trackExpiry ? 'Enabled' : 'Disabled'}
          </span>
        </div>
      </div>

      {/* Batches Table */}
      {batches.length > 0 ? (
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  <th className="px-3 py-2.5">Batch / Lot Code</th>
                  <th className="px-3 py-2.5">Manufactured</th>
                  <th className="px-3 py-2.5">Expiration (FEFO)</th>
                  <th className="px-3 py-2.5 text-right">Quantity (Rem / Init)</th>
                  <th className="px-3 py-2.5 text-right">Unit Cost</th>
                  <th className="px-3 py-2.5 text-center">Status</th>
                  <th className="px-3 py-2.5 text-center">Traceability & Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-slate-700">
                {batches.map((b) => {
                  const isRecalled = b.status === 'Recalled';
                  const isDepleted = b.quantity <= 0;
                  const daysToExpiry = b.expiryDate ? Math.ceil((new Date(b.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;

                  return (
                    <tr key={b.id} className={`hover:bg-slate-50/60 ${isRecalled ? 'bg-rose-50/50' : ''}`}>
                      <td className="px-3 py-2.5 font-bold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <Box className="w-3.5 h-3.5 text-amber-600" />
                          <span>{b.batchNumber}</span>
                        </div>
                        {b.supplierName && (
                          <span className="text-[9px] font-normal text-gray-400 block font-sans">{b.supplierName}</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-slate-600">
                        {b.manufactureDate || b.receivedDate?.slice(0, 10) || 'N/A'}
                      </td>
                      <td className="px-3 py-2.5">
                        {b.expiryDate ? (
                          <div>
                            <span className="font-bold text-slate-800">{b.expiryDate}</span>
                            {daysToExpiry !== null && (
                              <span className={`block text-[9px] font-semibold ${
                                daysToExpiry <= 0 ? 'text-rose-600 font-bold' : daysToExpiry < 30 ? 'text-amber-600' : 'text-emerald-600'
                              }`}>
                                {daysToExpiry <= 0 ? 'EXPIRED' : `${daysToExpiry} days remaining`}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">Non-perishable</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right font-extrabold text-slate-900">
                        {b.quantity} / {b.initialQuantity || b.quantity}
                      </td>
                      <td className="px-3 py-2.5 text-right text-slate-700">
                        {formatAmount(b.unitCost)}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full uppercase tracking-wider ${
                          isRecalled ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                          isDepleted ? 'bg-slate-100 text-slate-500' :
                          'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        }`}>
                          {b.status || (isDepleted ? 'Depleted' : 'Active')}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedTraceBatch(b)}
                            className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <FileText className="w-3 h-3" />
                            <span>Sales Trace ({b.salesHistory?.length || 0})</span>
                          </button>
                          {!isRecalled && (
                            <button
                              type="button"
                              onClick={() => setSelectedRecallBatch(b)}
                              className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <AlertTriangle className="w-3 h-3" />
                              <span>Recall</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-white border border-dashed border-slate-300 rounded-xl text-center text-xs text-slate-500 space-y-1">
          <p className="font-bold text-slate-700">No active batches recorded yet for {product.name}</p>
          <p className="text-[11px] text-slate-400">Click "New Intake Batch" above to log a manufacturing/intake lot with expiry date and stock quantity.</p>
        </div>
      )}

      {/* Modal: New Intake Batch */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-amber-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Box className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-black text-slate-900">New Intake Batch Record</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-slate-700 text-sm font-bold p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddBatch} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-1">
                  Batch / Lot Code *
                </label>
                <input
                  type="text"
                  required
                  value={newBatchNo}
                  onChange={(e) => setNewBatchNo(e.target.value)}
                  placeholder="e.g. MLK-2026-08-01"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-1">
                    Manufactured Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={newMfgDate}
                    onChange={(e) => setNewMfgDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-1">
                    Expiration Date (FEFO) *
                  </label>
                  <input
                    type="date"
                    required
                    value={newExpDate}
                    onChange={(e) => setNewExpDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-1">
                    Initial Batch Quantity *
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={newQty}
                    onChange={(e) => setNewQty(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-1">
                    Unit Purchase Cost *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    required
                    value={newCost}
                    onChange={(e) => setNewCost(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-1">
                  Supplier / Vendor Name
                </label>
                <input
                  type="text"
                  value={newSupplier}
                  onChange={(e) => setNewSupplier(e.target.value)}
                  placeholder="e.g. Dairy Supply Co."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer"
                >
                  Create Batch Record
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Sales Traceability Audit */}
      {selectedTraceBatch && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-indigo-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  <span>Batch Sales Traceability Audit</span>
                </h3>
                <p className="text-[11px] font-mono text-slate-500">
                  Batch Code: <strong className="text-slate-900">{selectedTraceBatch.batchNumber}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTraceBatch(null)}
                className="text-gray-400 hover:text-slate-700 text-sm font-bold p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs space-y-1 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500">Manufactured:</span>
                <span className="font-bold text-slate-900">{selectedTraceBatch.manufactureDate || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Expires (FEFO):</span>
                <span className="font-bold text-slate-900">{selectedTraceBatch.expiryDate || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Quantity Sold / Total:</span>
                <span className="font-bold text-indigo-700">
                  {(selectedTraceBatch.initialQuantity || selectedTraceBatch.quantity) - selectedTraceBatch.quantity} / {selectedTraceBatch.initialQuantity || selectedTraceBatch.quantity}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Sales Transaction Trace Log
              </h4>

              {selectedTraceBatch.salesHistory && selectedTraceBatch.salesHistory.length > 0 ? (
                <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                  {selectedTraceBatch.salesHistory.map((s) => (
                    <div key={s.id} className="p-3 bg-white border border-slate-200 rounded-xl text-xs space-y-1">
                      <div className="flex justify-between items-center font-mono">
                        <span className="font-bold text-indigo-700">{s.invoiceRef || s.orderId || 'POS Sale'}</span>
                        <span className="font-extrabold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                          {s.quantitySold} units
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[11px] text-gray-500">
                        <span>Customer: <strong className="text-slate-800">{s.customerName || 'Walk-in Retail'}</strong></span>
                        <span className="text-[10px]">{new Date(s.soldAt).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-500">
                  No sales recorded from this batch yet.
                </div>
              )}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setSelectedTraceBatch(null)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs"
              >
                Close Audit View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Safety Recall Confirmation */}
      {selectedRecallBatch && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-rose-300">
            <div className="flex items-center justify-between border-b border-rose-100 pb-3">
              <div className="flex items-center gap-2 text-rose-700">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <h3 className="text-base font-black text-slate-900">Initiate Batch Recall</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRecallBatch(null)}
                className="text-gray-400 hover:text-slate-700 text-sm font-bold p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs space-y-1 text-rose-900">
              <p className="font-bold">Warning: Safety Recall Protocol</p>
              <p className="text-[11px]">
                Recalling batch <strong>{selectedRecallBatch.batchNumber}</strong> will immediately flag the batch as RECALLED, quarantine remaining stock from POS sales, and generate a customer recall notification list.
              </p>
            </div>

            <form onSubmit={handleExecuteRecall} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-1">
                  Reason for Recall *
                </label>
                <textarea
                  required
                  rows={3}
                  value={recallReason}
                  onChange={(e) => setRecallReason(e.target.value)}
                  placeholder="e.g. Quality defect, packaging seal flaw, or supplier safety notice..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer"
                >
                  Confirm Batch Recall
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRecallBatch(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
