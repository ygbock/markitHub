import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Info,
  Layers,
  Percent,
  RefreshCw,
  Save,
  ShieldAlert,
  Sparkles,
  Tag,
  TrendingUp,
  X,
} from 'lucide-react';
import { Product, ProductVariant, PriceListItem, PriceListMap } from '../types';
import { 
  SYSTEM_PRICE_LISTS,
  normalizePriceListMap,
  priceListMapToItems,
  validatePriceListHierarchy,
  getPriceListBadgeStyle,
  PriceListValidationResult
} from '../utils/pricingEngine';
import { useCurrency } from '../context/CurrencyContext';

interface VariantPriceListsModalProps {
  open: boolean;
  product: Product | null;
  initialVariantIndex?: number;
  onClose: () => void;
  onSave: (updatedProduct: Product) => void | Promise<void>;
  canEdit?: boolean;
}

export default function VariantPriceListsModal({
  open,
  product,
  initialVariantIndex = 0,
  onClose,
  onSave,
  canEdit = true,
}: VariantPriceListsModalProps) {
  const { formatAmount } = useCurrency();
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(initialVariantIndex);
  const [editablePrices, setEditablePrices] = useState<PriceListMap>({});
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync selected variant index when initialVariantIndex changes
  useEffect(() => {
    if (initialVariantIndex !== undefined) {
      setSelectedVariantIndex(initialVariantIndex);
    }
  }, [initialVariantIndex, open]);

  // Current variant reference
  const currentVariant: ProductVariant | null = useMemo(() => {
    if (!product) return null;
    if (product.variants && product.variants.length > 0) {
      const idx = Math.min(Math.max(0, selectedVariantIndex), product.variants.length - 1);
      return product.variants[idx];
    }
    // Fallback pseudo-variant if product has no variants
    return {
      sku: product.sku,
      title: product.name,
      stock: product.stock,
      price: product.price,
      cost: product.cost,
      priceLists: product.priceLists,
    };
  }, [product, selectedVariantIndex]);

  // Load variant's price lists into state
  useEffect(() => {
    if (!currentVariant || !product) return;
    const basePrice = currentVariant.price && currentVariant.price > 0 ? currentVariant.price : product.price || 0;
    const map = normalizePriceListMap(currentVariant.priceLists, basePrice);
    setEditablePrices(map);
    setSaveSuccess(false);
  }, [currentVariant, product]);

  const variantCost = currentVariant?.cost && currentVariant.cost > 0 ? currentVariant.cost : product?.cost || 0;
  const retailPrice = Number(editablePrices['Retail'] ?? currentVariant?.price ?? product?.price ?? 0);

  // Live validation
  const validation: PriceListValidationResult = useMemo(() => {
    return validatePriceListHierarchy(editablePrices, retailPrice, variantCost);
  }, [editablePrices, retailPrice, variantCost]);

  if (!open || !product || !currentVariant) return null;

  const handlePriceChange = (tierName: string, value: string) => {
    const num = parseFloat(value);
    const safeNum = isNaN(num) ? 0 : Math.max(0, num);
    setEditablePrices(prev => ({
      ...prev,
      [tierName]: safeNum,
    }));
    setSaveSuccess(false);
  };

  const handleAutoFillStandard = () => {
    const base = retailPrice > 0 ? retailPrice : (currentVariant.price || product.price || 100);
    setEditablePrices({
      Retail: base,
      Wholesale: Number((base * 0.90).toFixed(2)),
      Dealer: Number((base * 0.85).toFixed(2)),
      Member: Number((base * 0.95).toFixed(2)),
      Promotional: Number((base * 0.80).toFixed(2)),
    });
    setSaveSuccess(false);
  };

  const handleApplyMarkup = (markupPercent: number) => {
    const baseCost = variantCost > 0 ? variantCost : 10;
    const newRetail = Number((baseCost * (1 + markupPercent / 100)).toFixed(2));
    setEditablePrices({
      Retail: newRetail,
      Wholesale: Number((newRetail * 0.90).toFixed(2)),
      Dealer: Number((newRetail * 0.85).toFixed(2)),
      Member: Number((newRetail * 0.95).toFixed(2)),
      Promotional: Number((newRetail * 0.80).toFixed(2)),
    });
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    if (!canEdit || saving) return;
    setSaving(true);

    try {
      const items = priceListMapToItems(editablePrices);
      const newRetail = editablePrices['Retail'] ?? currentVariant.price ?? product.price;

      let updatedProduct: Product;

      if (product.variants && product.variants.length > 0) {
        const updatedVariants = [...product.variants];
        const vIdx = Math.min(Math.max(0, selectedVariantIndex), updatedVariants.length - 1);
        
        updatedVariants[vIdx] = {
          ...updatedVariants[vIdx],
          price: newRetail,
          priceLists: items,
        };

        updatedProduct = {
          ...product,
          variants: updatedVariants,
        };
      } else {
        // Update product level
        updatedProduct = {
          ...product,
          price: newRetail,
          priceLists: items,
        };
      }

      await onSave(updatedProduct);
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
    } catch (err) {
      console.error('Failed to save variant price lists:', err);
    } finally {
      setSaving(false);
    }
  };

  const variantTitle = currentVariant.title || 
    [currentVariant.size, currentVariant.color, currentVariant.model].filter(Boolean).join(' / ') || 
    `Variant #${selectedVariantIndex + 1}`;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-2 sm:p-4 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-3xl rounded-2xl sm:rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-auto max-h-[94vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-900 px-4 py-3 sm:px-6 sm:py-4 text-white shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
              <Tag className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold flex items-center gap-2 truncate">
                Variant Price Lists Matrix
                <span className="hidden xs:inline-block text-[10px] font-mono font-normal px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  Multi-Tier
                </span>
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                Retail, wholesale, dealer, member & promo tiers per variant.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 sm:p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Modal Content */}
        <div className="overflow-y-auto flex-1 space-y-4 p-3.5 sm:p-6">
          
          {/* Product & Variant Selector Bar */}
          <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="min-w-0">
              <div className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-500">Product</div>
              <div className="text-xs sm:text-sm font-bold text-slate-900 truncate">{product.name}</div>
            </div>

            {/* Variant Switcher Pills */}
            {product.variants && product.variants.length > 1 && (
              <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 sm:pb-0">
                <span className="text-[11px] font-semibold text-slate-500 mr-0.5 shrink-0">Variant:</span>
                {product.variants.map((v, idx) => {
                  const label = v.title || [v.size, v.color].filter(Boolean).join(' ') || v.sku;
                  const isSelected = idx === selectedVariantIndex;
                  return (
                    <button
                      key={v.id || v.sku || idx}
                      type="button"
                      onClick={() => setSelectedVariantIndex(idx)}
                      className={`px-2.5 py-1 text-[11px] sm:text-xs font-bold font-mono rounded-lg transition-all shrink-0 cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Variant Info Metadata Card */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 p-3 sm:p-3.5 bg-indigo-50/50 rounded-2xl border border-indigo-100/80">
            <div>
              <span className="text-[9px] sm:text-[10px] font-bold uppercase text-indigo-900/60 block">Variant SKU</span>
              <span className="font-mono text-xs font-bold text-indigo-950 truncate block">{currentVariant.sku}</span>
            </div>
            <div>
              <span className="text-[9px] sm:text-[10px] font-bold uppercase text-indigo-900/60 block">Attributes</span>
              <span className="text-xs font-bold text-slate-800 truncate block">{variantTitle}</span>
            </div>
            <div>
              <span className="text-[9px] sm:text-[10px] font-bold uppercase text-indigo-900/60 block">Unit Cost (COGS)</span>
              <span className="font-mono text-xs font-bold text-slate-700">{formatAmount(variantCost)}</span>
            </div>
            <div>
              <span className="text-[9px] sm:text-[10px] font-bold uppercase text-indigo-900/60 block">Available Stock</span>
              <span className="font-mono text-xs font-bold text-emerald-700">{currentVariant.stock} units</span>
            </div>
          </div>

          {/* Validation Warnings & Margin Protection Banner */}
          <div>
            {!validation.isValid ? (
              <div className="rounded-2xl border-2 border-rose-300 bg-rose-50 p-3.5 sm:p-4 space-y-2 text-rose-900 shadow-xs animate-in fade-in">
                <div className="flex items-center gap-2 text-xs font-bold text-rose-950">
                  <ShieldAlert className="h-4 w-4 text-rose-600 shrink-0" />
                  <span>Price List Hierarchy & Margin Loss Violation</span>
                </div>
                <ul className="text-[11px] sm:text-xs text-rose-800 space-y-1 pl-5 list-disc">
                  {validation.warnings.map((warn, i) => (
                    <li key={i} className="font-medium">{warn}</li>
                  ))}
                </ul>
                <div className="pt-1 text-[10px] sm:text-[11px] text-rose-700 flex items-center gap-1 font-semibold">
                  <AlertTriangle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                  <span>Rule: Retail price must exceed Wholesale and Dealer price tiers to ensure commercial profitability.</span>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-900">
                <div className="flex items-center gap-2 font-medium">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Hierarchy Validated: <strong>Retail &gt; Wholesale &gt; Dealer &gt; Promo</strong> tiers protect profit margins.</span>
                </div>
                <span className="text-[10px] font-bold font-mono px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded">
                  Margin Guard Active
                </span>
              </div>
            )}
          </div>

          {/* Quick Calculation Presets Toolbar */}
          {canEdit && (
            <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 border border-slate-200/80 p-2.5 sm:p-3 rounded-xl">
              <div className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold">
                <Sparkles className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                <span className="text-[11px] uppercase font-bold text-slate-500">Presets:</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleAutoFillStandard}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-[11px] font-bold transition-all cursor-pointer shadow-2xs"
                >
                  Standard (10% Whs / 15% Dlr)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyMarkup(50)}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-[11px] font-bold transition-all cursor-pointer shadow-2xs"
                >
                  Cost + 50% Markup
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyMarkup(100)}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-[11px] font-bold transition-all cursor-pointer shadow-2xs"
                >
                  Cost + 100% Keystone
                </button>
              </div>
            </div>
          )}

          {/* Mobile & Tablet Card Layout (< md) */}
          <div className="block md:hidden space-y-2.5">
            {SYSTEM_PRICE_LISTS.map((pl) => {
              const currentVal = editablePrices[pl.name] ?? 0;
              const isRetailTier = pl.name.toLowerCase() === 'retail';
              const badgeStyle = getPriceListBadgeStyle(pl.name);
              
              const discountVsRetail = retailPrice > 0 
                ? ((retailPrice - currentVal) / retailPrice) * 100 
                : 0;

              const marginPercent = currentVal > 0 
                ? ((currentVal - variantCost) / currentVal) * 100 
                : 0;
              const unitProfit = currentVal - variantCost;

              const isViolatingRetail = !isRetailTier && currentVal >= retailPrice && retailPrice > 0;
              const isBelowCost = currentVal < variantCost && variantCost > 0 && currentVal > 0;

              return (
                <div 
                  key={pl.id}
                  className={`p-3 rounded-2xl border transition-all ${
                    isViolatingRetail 
                      ? 'border-rose-300 bg-rose-50/60' 
                      : isBelowCost 
                        ? 'border-amber-300 bg-amber-50/40' 
                        : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}>
                        {pl.name}
                      </span>
                      {isRetailTier && (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded">
                          BASE
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">{pl.code}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 items-center">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                        Tier Selling Price
                      </label>
                      <div className="relative flex items-center">
                        <span className="absolute left-2.5 text-slate-400 font-bold text-xs">$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          disabled={!canEdit}
                          value={currentVal === 0 ? '' : currentVal}
                          placeholder="0.00"
                          onChange={(e) => handlePriceChange(pl.name, e.target.value)}
                          className={`w-full rounded-xl pl-6 pr-2.5 py-1.5 font-mono text-xs sm:text-sm font-bold text-slate-900 outline-none transition-all ${
                            isViolatingRetail 
                              ? 'border-2 border-rose-500 bg-rose-50/50' 
                              : isBelowCost 
                                ? 'border border-amber-400 bg-amber-50/40' 
                                : 'border border-slate-200 bg-white focus:border-indigo-500'
                          }`}
                        />
                      </div>
                    </div>

                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 space-y-0.5 text-right">
                      <div className="text-[9px] font-bold uppercase text-slate-400">Profit / Margin</div>
                      <div className={`font-mono text-xs font-black ${unitProfit < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                        {formatAmount(unitProfit)}
                      </div>
                      <div className="text-[10px] font-mono font-bold">
                        <span className={marginPercent < 0 ? 'text-rose-600' : marginPercent < 15 ? 'text-amber-600' : 'text-emerald-700'}>
                          {marginPercent.toFixed(1)}% margin
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View (>= md) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-200 rounded-2xl overflow-hidden min-w-[580px]">
              <thead className="bg-slate-100/80 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Price List Tier</th>
                  <th className="px-3 py-3">Code</th>
                  <th className="px-4 py-3 w-40">Tier Price</th>
                  <th className="px-3 py-3 text-right">vs Retail</th>
                  <th className="px-3 py-3 text-right">Margin %</th>
                  <th className="px-4 py-3 text-right">Unit Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {SYSTEM_PRICE_LISTS.map((pl) => {
                  const currentVal = editablePrices[pl.name] ?? 0;
                  const isRetailTier = pl.name.toLowerCase() === 'retail';
                  const badgeStyle = getPriceListBadgeStyle(pl.name);
                  
                  // Discount relative to retail
                  const discountVsRetail = retailPrice > 0 
                    ? ((retailPrice - currentVal) / retailPrice) * 100 
                    : 0;

                  // Margin & Profit based on unit cost
                  const marginPercent = currentVal > 0 
                    ? ((currentVal - variantCost) / currentVal) * 100 
                    : 0;
                  const unitProfit = currentVal - variantCost;

                  const isViolatingRetail = !isRetailTier && currentVal >= retailPrice && retailPrice > 0;
                  const isBelowCost = currentVal < variantCost && variantCost > 0 && currentVal > 0;

                  return (
                    <tr 
                      key={pl.id} 
                      className={`hover:bg-slate-50/60 transition-colors ${
                        isViolatingRetail ? 'bg-rose-50/40' : isBelowCost ? 'bg-amber-50/30' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}>
                            {pl.name}
                          </span>
                          {isRetailTier && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded">
                              BASE
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-3 py-3 text-slate-500 font-mono text-[11px]">
                        {pl.code}
                      </td>

                      <td className="px-4 py-3">
                        <div className="relative flex items-center">
                          <span className="absolute left-2.5 text-slate-400 font-bold">$</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            disabled={!canEdit}
                            value={currentVal === 0 ? '' : currentVal}
                            placeholder="0.00"
                            onChange={(e) => handlePriceChange(pl.name, e.target.value)}
                            className={`w-full rounded-xl pl-6 pr-3 py-1.5 font-mono text-sm font-bold text-slate-900 outline-none transition-all ${
                              isViolatingRetail 
                                ? 'border-2 border-rose-500 bg-rose-50/50 focus:ring-2 focus:ring-rose-500' 
                                : isBelowCost 
                                  ? 'border border-amber-400 bg-amber-50/40 focus:ring-2 focus:ring-amber-500'
                                  : 'border border-slate-200 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'
                            }`}
                          />
                        </div>
                      </td>

                      <td className="px-3 py-3 text-right font-mono">
                        {isRetailTier ? (
                          <span className="text-slate-400">—</span>
                        ) : (
                          <span className={`font-semibold ${
                            discountVsRetail < 0 
                              ? 'text-rose-600 font-bold' 
                              : discountVsRetail === 0 
                                ? 'text-amber-600' 
                                : 'text-emerald-700'
                          }`}>
                            {discountVsRetail > 0 ? `-${discountVsRetail.toFixed(1)}%` : discountVsRetail < 0 ? `+${Math.abs(discountVsRetail).toFixed(1)}%` : '0%'}
                          </span>
                        )}
                      </td>

                      <td className="px-3 py-3 text-right font-mono">
                        <span className={`font-bold ${
                          marginPercent < 0 
                            ? 'text-rose-600' 
                            : marginPercent < 15 
                              ? 'text-amber-600' 
                              : 'text-emerald-700'
                        }`}>
                          {marginPercent.toFixed(1)}%
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right font-mono font-bold">
                        <span className={unitProfit < 0 ? 'text-rose-600' : 'text-slate-900'}>
                          {formatAmount(unitProfit)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-100 bg-slate-50 px-4 py-3 sm:px-6 sm:py-4 gap-2.5 shrink-0">
          <div className="text-[11px] sm:text-xs text-slate-500 w-full sm:w-auto text-center sm:text-left">
            {saveSuccess ? (
              <span className="text-emerald-700 font-bold flex items-center justify-center sm:justify-start gap-1.5 animate-in fade-in">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Price lists updated successfully for {currentVariant.sku}!
              </span>
            ) : (
              <span>Individual tier pricing applies during POS checkout & B2B invoicing.</span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Close
            </button>

            {canEdit && (
              <button
                type="button"
                disabled={saving}
                onClick={handleSave}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-5 py-2 text-xs font-bold text-white shadow-md transition-all disabled:opacity-50 cursor-pointer"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : 'Save Price Lists'}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
