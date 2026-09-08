import React, { useState } from 'react';
import { Product, PackagingUnitOption } from '../types';
import { getPackagingUnitOptions, calculateInventoryReduction } from '../utils/inventoryUtils';
import { useCurrency } from '../context/CurrencyContext';
import { Package, Check, X, ShieldAlert, ShoppingBag, Layers, Layers2, Sparkles, AlertCircle } from 'lucide-react';

interface PackagingUnitModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (
    product: Product, 
    unitOption: PackagingUnitOption, 
    quantity: number, 
    variantSku?: string
  ) => void;
}

export default function PackagingUnitModal({
  product,
  isOpen,
  onClose,
  onAddToCart
}: PackagingUnitModalProps) {
  const { formatAmount } = useCurrency();
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(1);

  if (!isOpen || !product) return null;

  const unitOptions = getPackagingUnitOptions(product);
  const selectedOption = unitOptions[selectedOptionIndex] || unitOptions[0];

  const variantSku = product.variants && product.variants.length > 0 ? product.variants[0].sku : undefined;
  
  // Total reduction in base stock units (pieces/bars)
  const totalBaseUnitsReduced = calculateInventoryReduction(quantity, selectedOption.multiplier);
  const isStockSufficient = totalBaseUnitsReduced <= product.stock;

  const handleConfirm = () => {
    if (!isStockSufficient) {
      alert(`Insufficient stock! Selling ${quantity} ${selectedOption.unitName} requires ${totalBaseUnitsReduced} base units, but only ${product.stock} base units are available.`);
      return;
    }
    onAddToCart(product, selectedOption, quantity, variantSku);
    setQuantity(1);
    setSelectedOptionIndex(0);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 overflow-hidden space-y-0">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-900 via-amber-800 to-indigo-950 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-amber-500/30 text-amber-200 border border-amber-400/30 rounded-md text-[10px] font-bold uppercase tracking-wider">
                  Pack Breakdown Mode
                </span>
                <span className="text-[11px] font-mono text-amber-200">{product.sku}</span>
              </div>
              <h3 className="text-base font-black text-white mt-0.5 truncate">{product.name}</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-amber-200 hover:text-white hover:bg-white/10 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Stock Status Banner */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex items-center justify-between text-xs">
            <div className="space-y-0.5">
              <span className="text-gray-500 font-medium block">Current Stock on Hand:</span>
              <span className="font-mono font-bold text-slate-900 text-sm">
                {product.stock} {product.unit || 'pieces'}
              </span>
            </div>
            <div className="text-right space-y-0.5">
              <span className="text-gray-500 font-medium block">Full Master Packs:</span>
              <span className="font-mono font-bold text-amber-700">
                {Math.floor(product.stock / (selectedOption.multiplier || 1))} packs available
              </span>
            </div>
          </div>

          {/* Unit Selection Options */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
              Select Selling Unit & Multiplier Tier
            </label>
            <div className="space-y-2.5">
              {unitOptions.map((opt, idx) => {
                const isSelected = selectedOptionIndex === idx;
                const unitReductionPerItem = opt.multiplier;

                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedOptionIndex(idx)}
                    className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-amber-50/70 border-amber-600 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        isSelected ? 'border-amber-600 bg-amber-600 text-white' : 'border-slate-300'
                      }`}>
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-xs sm:text-sm">{opt.unitName}</span>
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-mono font-bold">
                            {opt.multiplier}x base stock
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          1 {opt.unitName} reduces <strong className="text-amber-800 font-semibold">{unitReductionPerItem} {opt.base_unit}s</strong> from inventory.
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-mono font-black text-slate-900 text-sm block">
                        {formatAmount(opt.price)}
                      </span>
                      <span className="text-[10px] text-emerald-700 font-semibold">
                        {opt.multiplier > 1 ? `${formatAmount(opt.price / opt.multiplier)}/pc equiv` : 'Retail unit price'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quantity Selector */}
          <div className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-200">
            <div>
              <span className="text-xs font-bold text-slate-800 block">Number of Units to Sell</span>
              <span className="text-[11px] text-slate-500">
                Quantity of {selectedOption.unitName}
              </span>
            </div>
            <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-300 shadow-3xs">
              <button
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-sm flex items-center justify-center"
              >
                -
              </button>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-12 text-center font-mono font-black text-slate-900 text-sm focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setQuantity(quantity + 1)}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-sm flex items-center justify-center"
              >
                +
              </button>
            </div>
          </div>

          {/* Real-time Inventory Stock Reconciliation Summary */}
          <div className={`p-3.5 rounded-2xl border flex items-center gap-3 text-xs ${
            isStockSufficient 
              ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900' 
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}>
            {isStockSufficient ? (
              <Sparkles className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="font-bold flex justify-between items-center">
                <span>Inventory Reconciliation:</span>
                <span className="font-mono font-black text-sm">
                  -{totalBaseUnitsReduced} {selectedOption.base_unit}s
                </span>
              </div>
              <p className="text-[11px] opacity-90 mt-0.5">
                {isStockSufficient
                  ? `Selling ${quantity} x ${selectedOption.unitName} will reduce stock from ${product.stock} to ${product.stock - totalBaseUnitsReduced} ${selectedOption.base_unit}s.`
                  : `Insufficient inventory! Need ${totalBaseUnitsReduced} ${selectedOption.base_unit}s but only have ${product.stock}.`
                }
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!isStockSufficient}
              onClick={handleConfirm}
              className={`flex-1 py-3 text-white font-bold rounded-2xl text-xs transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer ${
                isStockSufficient
                  ? 'bg-amber-600 hover:bg-amber-700 active:scale-98'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              Add to Basket ({formatAmount(selectedOption.price * quantity)})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
