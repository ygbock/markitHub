import React, { useState } from 'react';
import { Product } from '../types';
import { useCurrency } from '../context/CurrencyContext';
import { calculateWholesaleStockReceipt, SUPPORTED_UOMS, formatUomStockBreakdown } from '../utils/uomConverter';
import { recordStockReceiptCostUpdate, calculateProductValuationCost } from '../utils/pricingEngine';
import { Package, ArrowRight, Check, X, Layers, Scale, Sparkles, Building2, Truck, AlertCircle, DollarSign } from 'lucide-react';

interface WholesaleUOMStockReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onConfirmReceipt: (product: Product, addedBaseStock: number, reason: string) => Promise<void>;
}

export default function WholesaleUOMStockReceiptModal({
  isOpen,
  onClose,
  products,
  onConfirmReceipt
}: WholesaleUOMStockReceiptModalProps) {
  const { formatAmount } = useCurrency();

  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || '');
  const [supplierUnit, setSupplierUnit] = useState<string>('Carton');
  const [receivedQty, setReceivedQty] = useState<number>(10);
  const [conversionMultiplier, setConversionMultiplier] = useState<number>(24);
  const [supplierName, setSupplierName] = useState<string>('Global Wholesalers Ltd');
  const [invoiceRef, setInvoiceRef] = useState<string>(`INV-${Math.floor(100000 + Math.random() * 900000)}`);
  const [unitPurchaseCost, setUnitPurchaseCost] = useState<number>(10.00);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const targetProduct = products.find(p => p.id === selectedProductId) || products[0];
  const posBaseUnit = targetProduct?.unit || 'Piece';

  // Compute conversion
  const receiptCalculation = calculateWholesaleStockReceipt(
    receivedQty,
    supplierUnit,
    posBaseUnit,
    conversionMultiplier
  );

  const currentBaseStock = targetProduct?.stock || 0;
  const newBaseStock = currentBaseStock + receiptCalculation.baseStockToAdd;

  const handleProductSelect = (id: string) => {
    setSelectedProductId(id);
    const prod = products.find(p => p.id === id);
    if (prod) {
      setUnitPurchaseCost(prod.purchasePrice || prod.cost || 10.00);
    }
    if (prod?.bulkPackaging?.itemsPerPackage) {
      setConversionMultiplier(prod.bulkPackaging.itemsPerPackage);
      setSupplierUnit(prod.bulkPackaging.outerPackageType || 'Carton');
    } else if (prod?.packagingUnits?.multiplier) {
      setConversionMultiplier(prod.packagingUnits.multiplier);
      setSupplierUnit(prod.packagingUnits.outerPackageType || 'Carton');
    } else {
      setConversionMultiplier(24);
      setSupplierUnit('Carton');
    }
  };

  const handleApplyPresetRatio = (unit: string, defaultRatio: number) => {
    setSupplierUnit(unit);
    setConversionMultiplier(defaultRatio);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetProduct || receiptCalculation.baseStockToAdd <= 0) return;

    setIsSubmitting(true);
    try {
      const reason = `Supplier Intake (${receivedQty} ${supplierUnit}s @ ${conversionMultiplier} ${posBaseUnit}s/${supplierUnit}) - Invoice #${invoiceRef} (${supplierName})`;
      
      // Calculate unit cost per base POS unit
      const baseUnitPurchaseCost = Number((unitPurchaseCost / (conversionMultiplier || 1)).toFixed(2));
      const costUpdates = recordStockReceiptCostUpdate(
        targetProduct,
        receiptCalculation.baseStockToAdd,
        baseUnitPurchaseCost,
        invoiceRef
      );

      const updatedProduct: Product = {
        ...targetProduct,
        ...costUpdates,
      };

      await onConfirmReceipt(updatedProduct, receiptCalculation.baseStockToAdd, reason);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto max-h-[94vh] flex flex-col">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-4 sm:p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shrink-0">
              <Truck className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 rounded-md text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">
                  Wholesale Supplier UOM Converter
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-black text-white mt-0.5">Supplier Stock Intake & UOM Conversion</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto">
          {/* Info Banner */}
          <div className="bg-indigo-50/80 border border-indigo-200 rounded-2xl p-3 sm:p-3.5 flex items-start gap-2.5 sm:gap-3 text-xs text-indigo-950">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed text-[11px] sm:text-xs">
              <strong className="font-bold block text-indigo-900">Automatic Stock Unit Conversion:</strong>
              When suppliers sell in bulk containers like <strong>Cartons</strong> or <strong>Boxes</strong> while POS sells in <strong>Pieces</strong> or <strong>Grams</strong>, entering the received shipment automatically calculates and adds base units to your live inventory register.
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* Product Selection */}
            <div className="sm:col-span-2 space-y-1">
              <label className="text-[11px] sm:text-xs font-bold text-slate-800 uppercase tracking-wider block">
                Select Product to Receive
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => handleProductSelect(e.target.value)}
                className="w-full px-3 py-2 sm:py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku}) — Stock: {p.stock} {p.unit || 'pcs'}
                  </option>
                ))}
              </select>
            </div>

            {/* Supplier Unit */}
            <div className="space-y-1">
              <label className="text-[11px] sm:text-xs font-bold text-slate-800 uppercase tracking-wider block">
                Supplier Unit (Purchased As)
              </label>
              <select
                value={supplierUnit}
                onChange={(e) => setSupplierUnit(e.target.value)}
                className="w-full px-3 py-2 sm:py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="Carton">Carton (ctn)</option>
                <option value="Box">Box (bx)</option>
                <option value="Pack">Pack (pk)</option>
                <option value="Kilogram">Kilogram (kg)</option>
                <option value="Liter">Liter (L)</option>
                <option value="Meter">Meter (m)</option>
                <option value="Sack">Sack</option>
                <option value="Case">Case</option>
                <option value="Piece">Piece (pc)</option>
              </select>
              
              {/* Quick Presets */}
              <div className="flex flex-wrap gap-1 mt-1.5">
                <button
                  type="button"
                  onClick={() => handleApplyPresetRatio('Carton', 24)}
                  className={`text-[9px] sm:text-[10px] px-2 py-0.5 rounded-md border font-semibold transition-all ${
                    supplierUnit === 'Carton' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  Carton (24)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPresetRatio('Box', 12)}
                  className={`text-[9px] sm:text-[10px] px-2 py-0.5 rounded-md border font-semibold transition-all ${
                    supplierUnit === 'Box' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  Box (12)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPresetRatio('Pack', 6)}
                  className={`text-[9px] sm:text-[10px] px-2 py-0.5 rounded-md border font-semibold transition-all ${
                    supplierUnit === 'Pack' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  Pack (6)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPresetRatio('Kilogram', 1000)}
                  className={`text-[9px] sm:text-[10px] px-2 py-0.5 rounded-md border font-semibold transition-all ${
                    supplierUnit === 'Kilogram' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  kg (1000g)
                </button>
              </div>
            </div>

            {/* Quantity Received */}
            <div className="space-y-1">
              <label className="text-[11px] sm:text-xs font-bold text-slate-800 uppercase tracking-wider block">
                Quantity Received ({supplierUnit}s)
              </label>
              <input
                type="number"
                min="1"
                value={receivedQty}
                onChange={(e) => setReceivedQty(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-2 sm:py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <span className="text-[10px] text-slate-500 block">e.g. 10 {supplierUnit}s from supplier</span>
            </div>

            {/* Conversion Multiplier */}
            <div className="space-y-1">
              <label className="text-[11px] sm:text-xs font-bold text-slate-800 uppercase tracking-wider block">
                Conversion: {posBaseUnit}s per 1 {supplierUnit}
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 shrink-0">1 {supplierUnit} =</span>
                <input
                  type="number"
                  min="1"
                  value={conversionMultiplier}
                  onChange={(e) => setConversionMultiplier(Math.max(1, parseInt(e.target.value) || 1))}
                  className="flex-1 px-3 py-2 sm:py-2.5 bg-white border border-indigo-300 rounded-xl text-xs font-mono font-bold text-indigo-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <span className="text-xs font-bold text-slate-700 shrink-0">{posBaseUnit}s</span>
              </div>
            </div>

            {/* Supplier Cost per Container */}
            <div className="space-y-1">
              <label className="text-[11px] sm:text-xs font-bold text-slate-800 uppercase tracking-wider block">
                Purchase Cost per 1 {supplierUnit}
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={unitPurchaseCost}
                onChange={(e) => setUnitPurchaseCost(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full px-3 py-2 sm:py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-emerald-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <span className="text-[10px] text-slate-500 block">
                Base Unit Cost: {formatAmount(unitPurchaseCost / (conversionMultiplier || 1))} per {posBaseUnit}
              </span>
            </div>

            {/* Supplier / PO Ref */}
            <div className="sm:col-span-2 space-y-1">
              <label className="text-[11px] sm:text-xs font-bold text-slate-800 uppercase tracking-wider block">
                Invoice / Reference #
              </label>
              <input
                type="text"
                value={invoiceRef}
                onChange={(e) => setInvoiceRef(e.target.value)}
                placeholder="e.g. INV-88231"
                className="w-full px-3 py-2 sm:py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Conversion Result Summary Box */}
          <div className="p-3.5 sm:p-4 bg-slate-900 text-white rounded-2xl space-y-3 shadow-inner">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-[11px] sm:text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
                Live Stock Conversion Engine
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {receivedQty} {supplierUnit}s × {conversionMultiplier}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs sm:text-sm font-mono gap-2">
              <div className="text-slate-300">
                <span className="text-slate-500 block text-[9px] sm:text-[10px]">Supplier Shipment:</span>
                <span className="font-bold text-white text-sm sm:text-base">{receivedQty} {supplierUnit}s</span>
              </div>
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 shrink-0" />
              <div className="text-right">
                <span className="text-slate-500 block text-[9px] sm:text-[10px]">POS Stock Added:</span>
                <span className="font-bold text-emerald-400 text-base sm:text-lg">+{receiptCalculation.baseStockToAdd} {posBaseUnit}s</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between text-[10px] sm:text-[11px] text-slate-400 font-mono gap-1">
              <span>Current Stock: {currentBaseStock} {posBaseUnit}s</span>
              <span className="text-emerald-300 font-bold">New Stock: {newBaseStock} {posBaseUnit}s</span>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:flex-1 py-2.5 sm:py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl sm:rounded-2xl text-xs transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:flex-1 py-2.5 sm:py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl sm:rounded-2xl text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              Confirm Intake (+{receiptCalculation.baseStockToAdd} {posBaseUnit}s)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
