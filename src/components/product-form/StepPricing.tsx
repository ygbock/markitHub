import React, { useState, useEffect } from 'react';
import { 
  DollarSign, TrendingUp, Percent, AlertCircle, Info, ShieldCheck, 
  Sparkles, Cpu, Gift, RefreshCw, Sliders, CheckCircle2, ArrowRight,
  Layers, Tag, Users, Building, ShoppingBag, ShieldAlert, AlertTriangle
} from 'lucide-react';
import { useCurrency } from '../../context/CurrencyContext';
import { CompositeComponentItem, BundleKitItem, BulkPackagingConfig, PriceListItem, CostCalculationMethod } from '../../types';
import { 
  generateDefaultPriceListMatrix, 
  getPriceListBadgeStyle, 
  calculateProductValuationCost,
  marginGuard,
  MarginGuardReport 
} from '../../utils/pricingEngine';

interface StepPricingProps {
  cost: number;
  setCost: (val: number) => void;
  price: number;
  setPrice: (val: number) => void;
  wholesalePrice: number;
  setWholesalePrice: (val: number) => void;
  minimumPrice: number;
  setMinimumPrice: (val: number) => void;
  originalPrice: number;
  setOriginalPrice: (val: number) => void;
  costCalculationMethod?: CostCalculationMethod;
  setCostCalculationMethod?: (val: CostCalculationMethod) => void;
  priceLists?: PriceListItem[];
  setPriceLists?: (val: PriceListItem[]) => void;
  productType?: string;
  compositeComponents?: CompositeComponentItem[];
  bundleKitItems?: BundleKitItem[];
  bulkPackaging?: BulkPackagingConfig;
  setBulkPackaging?: (val: BulkPackagingConfig) => void;
  errors: Record<string, string>;
}

export default function StepPricing({
  cost,
  setCost,
  price,
  setPrice,
  wholesalePrice,
  setWholesalePrice,
  minimumPrice,
  setMinimumPrice,
  originalPrice,
  setOriginalPrice,
  costCalculationMethod = 'WEIGHTED_AVERAGE',
  setCostCalculationMethod = () => {},
  priceLists,
  setPriceLists = () => {},
  productType = 'Standard',
  compositeComponents = [],
  bundleKitItems = [],
  bulkPackaging = {
    outerPackageType: 'Box',
    itemsPerPackage: 30,
    outerPackageCost: 75,
    unitCost: 2.50,
    unitRetailPrice: 4.00,
    dozenRetailPrice: 42.00,
    outerPackageRetailPrice: 100.00,
    allowDozenSale: true,
    allowPackageSale: true
  },
  setBulkPackaging = () => {},
  errors
}: StepPricingProps) {
  const { currencySymbol, formatAmount } = useCurrency();

  // Custom Profit Margin Configuration State
  const [customMargin, setCustomMargin] = useState<number>(() => {
    if (price > 0 && cost > 0 && price > cost) {
      return Number((((price - cost) / price) * 100).toFixed(1));
    }
    return 40;
  });
  const [autoCalculateRetail, setAutoCalculateRetail] = useState<boolean>(true);
  const [lastCalculatedRetail, setLastCalculatedRetail] = useState<number | null>(null);

  const safeBulkPackaging = bulkPackaging || {
    outerPackageType: 'Box',
    itemsPerPackage: 30,
    outerPackageCost: 75,
    unitCost: 2.50,
    unitRetailPrice: 4.00,
    dozenRetailPrice: 42.00,
    outerPackageRetailPrice: 100.00,
    allowDozenSale: true,
    allowPackageSale: true
  };

  // Financial calculations
  const grossProfit = price - cost;
  const currentMarginPercent = price > 0 ? (grossProfit / price) * 100 : 0;
  const currentMarkupPercent = cost > 0 ? (grossProfit / cost) * 100 : 0;

  // Suggested Retail Price calculated strictly from Cost and Custom Margin %
  // Formula: Retail = Cost / (1 - Margin% / 100)
  const suggestedRetailPrice = cost > 0 && customMargin < 100 && customMargin >= 0
    ? Number((cost / (1 - customMargin / 100)).toFixed(2))
    : 0;

  const suggestedGrossProfit = suggestedRetailPrice > cost ? suggestedRetailPrice - cost : 0;
  const suggestedMarkup = cost > 0 && suggestedGrossProfit > 0 ? (suggestedGrossProfit / cost) * 100 : 0;

  // Calculate Retail Price based on specific target margin %
  const calculateRetailFromMargin = (costVal: number, marginVal: number): number => {
    if (costVal <= 0 || marginVal >= 100 || marginVal < 0) return 0;
    return Number((costVal / (1 - marginVal / 100)).toFixed(2));
  };

  // Handle Cost changes with auto-calculation
  const handleCostChange = (newCost: number) => {
    setCost(newCost);
    if (autoCalculateRetail && newCost > 0 && customMargin > 0 && customMargin < 100) {
      const newRetail = calculateRetailFromMargin(newCost, customMargin);
      setPrice(newRetail);
      setLastCalculatedRetail(newRetail);

      // Auto update other tiers if empty or requested
      const calculatedWholesale = Number((newCost * 1.25).toFixed(2));
      const calculatedMinimum = Number((newCost * 1.10).toFixed(2));
      const calculatedOriginal = Number((newRetail * 1.20).toFixed(2));
      setWholesalePrice(calculatedWholesale);
      setMinimumPrice(calculatedMinimum);
      setOriginalPrice(calculatedOriginal);
    }
  };

  // Handle Custom Margin changes
  const handleCustomMarginChange = (newMargin: number) => {
    const clampedMargin = Math.min(Math.max(0, newMargin), 95);
    setCustomMargin(clampedMargin);
    if (cost > 0 && autoCalculateRetail) {
      const calculatedRetail = calculateRetailFromMargin(cost, clampedMargin);
      setPrice(calculatedRetail);
      setLastCalculatedRetail(calculatedRetail);

      const calculatedWholesale = Number((cost * 1.25).toFixed(2));
      const calculatedMinimum = Number((cost * 1.10).toFixed(2));
      const calculatedOriginal = Number((calculatedRetail * 1.20).toFixed(2));
      setWholesalePrice(calculatedWholesale);
      setMinimumPrice(calculatedMinimum);
      setOriginalPrice(calculatedOriginal);
    }
  };

  // Apply custom target margin across all 4 price tiers
  const applyTargetMargin = (pct: number) => {
    setCustomMargin(pct);
    if (cost > 0) {
      const calculatedRetail = calculateRetailFromMargin(cost, pct);
      const calculatedWholesale = Number((cost * 1.25).toFixed(2)); // 25% markup above cost
      const calculatedMinimum = Number((cost * 1.10).toFixed(2));   // 10% floor above cost
      const calculatedOriginal = Number((calculatedRetail * 1.20).toFixed(2)); // 20% MSRP list price

      setPrice(calculatedRetail);
      setWholesalePrice(calculatedWholesale);
      setMinimumPrice(calculatedMinimum);
      setOriginalPrice(calculatedOriginal);
      setLastCalculatedRetail(calculatedRetail);
    }
  };

  // Auto-fill Wholesale, Floor, and Original Prices derived from Retail Price
  const syncTierPricesFromRetail = () => {
    if (price > 0) {
      const calculatedWholesale = Number((price * 0.80).toFixed(2)); // 20% off for B2B
      const calculatedMinimum = Number((price * 0.70).toFixed(2));   // 30% max floor discount
      const calculatedOriginal = Number((price * 1.25).toFixed(2));  // 25% list MSRP
      setWholesalePrice(calculatedWholesale);
      setMinimumPrice(calculatedMinimum);
      setOriginalPrice(calculatedOriginal);
    }
  };

  // Run MarginGuard calculation across all pricing tiers & price lists
  const marginGuardReport: MarginGuardReport = marginGuard(
    cost,
    price,
    wholesalePrice,
    priceLists
  );

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs font-bold text-sm">
          4
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-sm font-bold text-slate-900">Pricing Architecture & Profit Margins</h3>
            {marginGuardReport.hasNegativeMargin ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                MarginGuard: Negative Margin Risk
              </span>
            ) : cost > 0 && price >= cost ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                MarginGuard: Protected ({currentMarginPercent.toFixed(1)}% Margin)
              </span>
            ) : null}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure custom profit margins, auto-calculate retail prices from cost, and validate multi-tier price lists against COGS.
          </p>
        </div>
      </div>

      {/* MarginGuard Negative Profit Margin Warning Banner */}
      {marginGuardReport.hasNegativeMargin && (
        <div 
          id="margin-guard-pricing-alert"
          className="bg-rose-50/95 border-2 border-rose-400/80 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-md animate-in fade-in duration-200"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-black text-rose-950">
                    MarginGuard Alert: Negative Profit Margin Detected
                  </h4>
                  <span className="px-2 py-0.5 bg-rose-200 text-rose-900 border border-rose-300 rounded text-[10px] font-black uppercase tracking-wider">
                    Loss-Making Pricing
                  </span>
                </div>
                <p className="text-xs text-rose-800 mt-0.5 font-medium">
                  One or more pricing tiers are set below the unit product cost of <strong>{formatAmount(cost)}</strong>. Selling at these price points will result in direct financial margin loss.
                </p>
              </div>
            </div>
          </div>

          {/* List of specific tier violations */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            {marginGuardReport.violatedTiers.map((violation, idx) => (
              <div 
                key={idx}
                className="bg-white/90 border border-rose-200 rounded-xl p-3 flex items-center justify-between text-xs shadow-2xs"
              >
                <div>
                  <span className="font-bold text-slate-900 block">{violation.tierName} Tier</span>
                  <span className="text-[11px] text-slate-500">
                    Price: <strong className="text-rose-700 font-mono">{formatAmount(violation.price)}</strong> vs Cost: <span className="font-mono">{formatAmount(violation.cost)}</span>
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-mono font-black text-rose-700 block">
                    -{formatAmount(violation.lossAmount)} loss
                  </span>
                  <span className="text-[10px] font-bold text-rose-600 font-mono">
                    {violation.marginPercent.toFixed(1)}% margin
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Auto-Fix Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-rose-200/80 text-xs">
            <span className="text-[11px] text-rose-900 font-medium">
              💡 Recommended action: Adjust the selling price or use automatic margin markup.
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (cost > 0) {
                    const safeRetail = Number((cost / 0.70).toFixed(2)); // 30% margin
                    setPrice(safeRetail);
                    setWholesalePrice(Number((cost * 1.20).toFixed(2))); // 20% above cost
                    setMinimumPrice(Number((cost * 1.05).toFixed(2)));   // 5% above cost
                    setCustomMargin(30);
                  }
                }}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Auto-Fix: Apply Safe 30% Margin
              </button>
              <button
                type="button"
                onClick={() => {
                  const generated = generateDefaultPriceListMatrix(price > cost ? price : Number((cost * 1.40).toFixed(2)), cost);
                  setPriceLists(generated);
                }}
                className="px-3 py-1.5 bg-white hover:bg-rose-50 border border-rose-300 text-rose-900 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Reset Safe Price Lists Matrix
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Real-time Profitability KPI Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Dollar Profit */}
        <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-4 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Gross Unit Profit</span>
          <div className="text-xl font-black font-mono text-emerald-950">
            {formatAmount(grossProfit)}
          </div>
          <p className="text-[10px] text-emerald-700 font-medium">Selling price minus purchasing cost</p>
        </div>

        {/* Profit Margin */}
        <div className="bg-indigo-50 border border-indigo-200/80 rounded-2xl p-4 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-800">Actual Profit Margin</span>
          <div className="text-xl font-black font-mono text-indigo-950">
            {currentMarginPercent.toFixed(1)}%
          </div>
          <p className="text-[10px] text-indigo-700 font-medium">Yield percentage of retail revenue</p>
        </div>

        {/* Markup % */}
        <div className="bg-slate-100 border border-slate-200 rounded-2xl p-4 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Cost Mark-up %</span>
          <div className="text-xl font-black font-mono text-slate-900">
            {currentMarkupPercent.toFixed(1)}%
          </div>
          <p className="text-[10px] text-slate-500 font-medium">Percentage mark-up over unit cost</p>
        </div>
      </div>

      {/* Composite BOM Special Cost Rollup Notice */}
      {productType === 'Composite' && (
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-4 sm:p-5 space-y-3 shadow-md border border-indigo-800">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-indigo-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-100">
                Composite Product BOM Cost Rollup
              </h4>
            </div>
            <span className="px-2.5 py-1 bg-indigo-800/80 border border-indigo-600 text-[10px] font-mono font-bold text-indigo-200 rounded-lg">
              Rolled-Up COGS: {formatAmount(cost)}
            </span>
          </div>

          <p className="text-xs text-indigo-200">
            Cost price is automatically aggregated from {compositeComponents.length} sub-component items. Setting the Custom Profit Margin below will instantly compute and suggest the Retail, Wholesale, and Floor prices.
          </p>

          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-indigo-800/60">
            <button
              type="button"
              onClick={() => applyTargetMargin(40)}
              className="px-3.5 py-1.5 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Apply 40% Composite Pricing Matrix
            </button>
            <button
              type="button"
              onClick={() => syncTierPricesFromRetail()}
              className="px-3 py-1.5 bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700 text-indigo-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              Sync Tiers from Retail
            </button>
          </div>
        </div>
      )}

      {/* Bulk Pack Breakdown & Multi-UOM Pricing Matrix Banner */}
      {productType === 'PackBreakdown' && (
        <div className="bg-amber-950/20 border border-amber-300/80 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between flex-wrap gap-2 border-b border-amber-200/80 pb-3">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-amber-700" />
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-950">
                  Packaging Unit & Dozen Multi-Tier Pricing Breakdown
                </h4>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  Set distinct selling prices for Single Unit, Dozen (12 pcs), and Full {safeBulkPackaging.outerPackageType || 'Box'} ({safeBulkPackaging.itemsPerPackage || 30} pcs).
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-amber-100 border border-amber-300 text-[10px] font-mono font-bold text-amber-900 rounded-lg">
              Multi-UOM Matrix
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Single Unit Price */}
            <div className="bg-white p-3 rounded-xl border border-amber-200 space-y-1">
              <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">
                Single Piece Retail Price
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-2 font-mono text-slate-400 font-bold text-xs">{currencySymbol}</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={(e) => {
                    const newPrice = Math.max(0, Number(e.target.value));
                    setPrice(newPrice);
                    setBulkPackaging({ ...safeBulkPackaging, unitRetailPrice: newPrice });
                  }}
                  placeholder="e.g. 4.00"
                  className="w-full pl-6 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-emerald-700 focus:outline-none"
                />
              </div>
              <p className="text-[10px] text-slate-500 font-medium">
                Unit Cost: {formatAmount(cost)} • Profit: <span className="font-bold text-emerald-600">{formatAmount(price - cost)}</span>
              </p>
            </div>

            {/* Dozen Price */}
            <div className="bg-white p-3 rounded-xl border border-amber-200 space-y-1">
              <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">
                Dozen Retail Price (12 Pcs)
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-2 font-mono text-slate-400 font-bold text-xs">{currencySymbol}</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={safeBulkPackaging.dozenRetailPrice || 0}
                  onChange={(e) => {
                    const dozPrice = Math.max(0, Number(e.target.value));
                    setBulkPackaging({ ...safeBulkPackaging, dozenRetailPrice: dozPrice });
                  }}
                  placeholder="e.g. 42.00"
                  className="w-full pl-6 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-indigo-900 focus:outline-none"
                />
              </div>
              <p className="text-[10px] text-slate-500 font-medium">
                Dozen Cost: {formatAmount(cost * 12)} • Profit: <span className="font-bold text-indigo-600">{formatAmount((safeBulkPackaging.dozenRetailPrice || 0) - cost * 12)}</span>
              </p>
            </div>

            {/* Full Outer Box Price */}
            <div className="bg-white p-3 rounded-xl border border-amber-200 space-y-1">
              <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">
                Full {safeBulkPackaging.outerPackageType || 'Box'} Price ({safeBulkPackaging.itemsPerPackage || 30} Pcs)
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-2 font-mono text-slate-400 font-bold text-xs">{currencySymbol}</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={safeBulkPackaging.outerPackageRetailPrice || 0}
                  onChange={(e) => {
                    const outerPrice = Math.max(0, Number(e.target.value));
                    setBulkPackaging({ ...safeBulkPackaging, outerPackageRetailPrice: outerPrice });
                  }}
                  placeholder="e.g. 100.00"
                  className="w-full pl-6 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-amber-900 focus:outline-none"
                />
              </div>
              <p className="text-[10px] text-slate-500 font-medium">
                Box Cost: {formatAmount(safeBulkPackaging.outerPackageCost || 75)} • Profit: <span className="font-bold text-amber-700">{formatAmount((safeBulkPackaging.outerPackageRetailPrice || 0) - (safeBulkPackaging.outerPackageCost || 75))}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-amber-200/80 text-xs">
            <span className="text-[11px] text-amber-900 font-medium">
              💡 POS & E-commerce customers will be able to select between purchasing Single Units, Dozens, or Full Packages!
            </span>
            <button
              type="button"
              onClick={() => {
                setWholesalePrice(safeBulkPackaging.dozenRetailPrice || Number((price * 10.5).toFixed(2)));
              }}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Set Dozen Price as B2B Wholesale Tier
            </button>
          </div>
        </div>
      )}

      {/* Target & Custom Profit Margin Configuration Section */}
      <div className="bg-linear-to-br from-indigo-50/90 via-purple-50/40 to-slate-50 border border-indigo-200/90 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xs">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h4 className="text-xs sm:text-sm font-black text-indigo-950 uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              Custom Profit Margin Configuration & Retail Price Suggester
            </h4>
            <p className="text-xs text-indigo-800 mt-0.5">
              Set your target custom profit margin percentage. When Cost Price is modified, Retail Price is automatically computed and suggested via <code className="font-mono font-bold bg-indigo-100/80 px-1 py-0.5 rounded text-indigo-900">Retail = Cost ÷ (1 - Margin%)</code>.
            </p>
          </div>

          {/* Auto-Calculate Sync Toggle */}
          <label className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-indigo-200 shadow-2xs cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoCalculateRetail}
              onChange={(e) => setAutoCalculateRetail(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
            />
            <span className="text-xs font-bold text-slate-800">
              Auto-Calculate Retail Price on Cost Change
            </span>
          </label>
        </div>

        {/* Custom Margin Percentage Input & Range Slider */}
        <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-indigo-100 shadow-2xs space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
            
            {/* Custom Margin Input with Stepper */}
            <div className="sm:col-span-4 space-y-1">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Custom Profit Margin %
              </label>
              <div className="relative flex items-center">
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="95"
                  value={customMargin}
                  onChange={(e) => handleCustomMarginChange(Number(e.target.value))}
                  className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 rounded-xl text-sm font-black font-mono text-indigo-900 outline-none transition-all"
                  placeholder="e.g. 42.5"
                />
                <span className="absolute right-3 font-mono font-black text-indigo-600 text-sm pointer-events-none">
                  %
                </span>
              </div>
            </div>

            {/* Range Slider for visual fine-tuning */}
            <div className="sm:col-span-8 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                <span>Margin Slider</span>
                <span className="font-mono text-indigo-700 font-black">{customMargin}% Margin ({(cost > 0 ? (suggestedMarkup).toFixed(1) : 0)}% Markup)</span>
              </div>
              <input
                type="range"
                min="0"
                max="90"
                step="1"
                value={customMargin}
                onChange={(e) => handleCustomMarginChange(Number(e.target.value))}
                className="w-full h-2 bg-indigo-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <div className="flex justify-between text-[9px] font-mono text-slate-400">
                <span>0% (At Cost)</span>
                <span>25%</span>
                <span>50%</span>
                <span>75%</span>
                <span>90% (High Margin)</span>
              </div>
            </div>

          </div>

          {/* Quick Margin Presets Pills */}
          <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-500 mr-1">
              Quick Margin Presets:
            </span>
            {[15, 25, 33.3, 40, 50, 60, 75, 80].map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => applyTargetMargin(pct)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  Math.abs(customMargin - pct) < 0.2
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-slate-100 hover:bg-indigo-100 hover:text-indigo-800 text-slate-700 border border-slate-200'
                }`}
              >
                {pct}%
              </button>
            ))}
          </div>
        </div>

        {/* Live Calculation Preview & Suggested Retail Price Box */}
        {cost > 0 && (
          <div className="bg-linear-to-r from-emerald-50 via-teal-50 to-indigo-50 border border-emerald-300/80 rounded-xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-xs font-black text-emerald-950 uppercase tracking-wide">
                  Suggested Retail Price: <strong className="font-mono text-emerald-700 text-sm sm:text-base">{formatAmount(suggestedRetailPrice)}</strong>
                </span>
              </div>
              <p className="text-xs text-slate-600">
                Based on <strong className="font-bold text-slate-800">{formatAmount(cost)}</strong> cost & <strong className="font-bold text-indigo-700">{customMargin}%</strong> profit margin • Unit Profit: <strong className="font-bold text-emerald-700">{formatAmount(suggestedGrossProfit)}</strong> (Markup: <strong className="font-bold text-slate-800">{suggestedMarkup.toFixed(1)}%</strong>).
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => applyTargetMargin(customMargin)}
                className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Apply Suggested Matrix</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Cost Price Valuation Method Architecture Selector */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-white space-y-3 shadow-lg">
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
              Inventory Cost Valuation Method Architecture
            </span>
          </div>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-md">
            Active: {costCalculationMethod === 'SIMPLE' ? 'Simple Purchase Cost' : costCalculationMethod === 'WEIGHTED_AVERAGE' ? 'Weighted Average Cost (WAC)' : 'FIFO Batch Valuation'}
          </span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Cost price is calculated separately from selling price to protect gross profit accounting margins. Select how inventory cost is valued across purchase intake batches:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* Simple Cost */}
          <button
            type="button"
            onClick={() => setCostCalculationMethod('SIMPLE')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer space-y-1 ${
              costCalculationMethod === 'SIMPLE'
                ? 'bg-indigo-900/60 border-indigo-400 text-white shadow-md'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase">1. Simple Cost</span>
              <span className="text-[10px] font-mono text-indigo-300">Purchase</span>
            </div>
            <p className="text-[11px] leading-tight text-slate-300">
              Direct vendor purchase price or baseline cost.
            </p>
          </button>

          {/* Weighted Average Cost */}
          <button
            type="button"
            onClick={() => setCostCalculationMethod('WEIGHTED_AVERAGE')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer space-y-1 ${
              costCalculationMethod === 'WEIGHTED_AVERAGE'
                ? 'bg-indigo-900/60 border-indigo-400 text-white shadow-md'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase">2. Weighted Average</span>
              <span className="text-[10px] font-mono text-emerald-300">WAC</span>
            </div>
            <p className="text-[11px] leading-tight text-slate-300">
              Total Inventory Value ÷ Total Quantity on hand.
            </p>
          </button>

          {/* FIFO */}
          <button
            type="button"
            onClick={() => setCostCalculationMethod('FIFO')}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer space-y-1 ${
              costCalculationMethod === 'FIFO'
                ? 'bg-indigo-900/60 border-indigo-400 text-white shadow-md'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase">3. FIFO</span>
              <span className="text-[10px] font-mono text-amber-300">Batch Layers</span>
            </div>
            <p className="text-[11px] leading-tight text-slate-300">
              First-In First-Out inventory batch lot tracking.
            </p>
          </button>
        </div>
      </div>

      {/* Pricing Inputs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Cost Price */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Cost Price (COGS) <span className="text-rose-500">*</span>
            </label>
            {autoCalculateRetail && customMargin > 0 && (
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                Auto-computes Retail @ {customMargin}%
              </span>
            )}
          </div>
          <div className="relative">
            <span className="absolute left-3.5 top-2.5 font-mono text-slate-400 font-bold text-sm">
              {currencySymbol}
            </span>
            <input
              type="number"
              step="0.01"
              value={cost}
              onChange={(e) => handleCostChange(Math.max(0, Number(e.target.value)))}
              placeholder="0.00"
              className={`w-full pl-8 pr-4 py-2.5 bg-white border ${
                errors.cost ? 'border-rose-500 focus:ring-rose-200' : 'border-slate-200 focus:ring-indigo-200'
              } rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:border-indigo-500 transition-all`}
            />
          </div>
          <p className="text-[10px] text-slate-400">Unit supplier purchase price or production cost</p>
        </div>

        {/* Retail Price */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Retail Selling Price (MSRP) <span className="text-rose-500">*</span>
            </label>
            {suggestedRetailPrice > 0 && Math.abs(price - suggestedRetailPrice) > 0.01 && (
              <button
                type="button"
                onClick={() => setPrice(suggestedRetailPrice)}
                className="text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-md cursor-pointer flex items-center gap-1"
                title={`Click to set suggested price of ${formatAmount(suggestedRetailPrice)}`}
              >
                Use suggested {formatAmount(suggestedRetailPrice)}
              </button>
            )}
          </div>
          <div className="relative">
            <span className="absolute left-3.5 top-2.5 font-mono text-emerald-600 font-bold text-sm">
              {currencySymbol}
            </span>
            <input
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => {
                const val = Math.max(0, Number(e.target.value));
                setPrice(val);
                if (val > cost && cost > 0) {
                  setCustomMargin(Number((((val - cost) / val) * 100).toFixed(1)));
                }
              }}
              placeholder="0.00"
              className={`w-full pl-8 pr-4 py-2.5 bg-white border ${
                errors.price ? 'border-rose-500 focus:ring-rose-200' : 'border-slate-200 focus:ring-indigo-200'
              } rounded-xl text-sm font-mono font-black text-emerald-700 focus:outline-none focus:ring-2 focus:border-indigo-500 transition-all`}
            />
          </div>
          {errors.price ? (
            <p className="text-[11px] text-rose-500 font-medium">{errors.price}</p>
          ) : (
            <p className="text-[10px] text-slate-400">Primary POS counter and web checkout price</p>
          )}
        </div>

        {/* Wholesale Price */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Wholesale Price (B2B)
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-2.5 font-mono text-indigo-600 font-bold text-sm">
              {currencySymbol}
            </span>
            <input
              type="number"
              step="0.01"
              value={wholesalePrice}
              onChange={(e) => setWholesalePrice(Math.max(0, Number(e.target.value)))}
              placeholder="0.00"
              className="w-full pl-8 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-mono font-bold text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 transition-all"
            />
          </div>
          <p className="text-[10px] text-slate-400">Discounted bulk rate for corporate or distributor orders</p>
        </div>

        {/* Minimum Floor Price */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Minimum Floor Price
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-2.5 font-mono text-amber-600 font-bold text-sm">
              {currencySymbol}
            </span>
            <input
              type="number"
              step="0.01"
              value={minimumPrice}
              onChange={(e) => setMinimumPrice(Math.max(0, Number(e.target.value)))}
              placeholder="0.00"
              className="w-full pl-8 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-mono font-bold text-amber-900 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 transition-all"
            />
          </div>
          <p className="text-[10px] text-slate-400">Absolute lowest price allowed for manual cashier discounts</p>
        </div>

        {/* Original / Compare-at Price */}
        <div className="space-y-1.5 sm:col-span-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Original / Strikethrough Price (Compare-At)
            </label>
            {price > 0 && (
              <button
                type="button"
                onClick={syncTierPricesFromRetail}
                className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                Sync All Tiers from Retail
              </button>
            )}
          </div>
          <div className="relative">
            <span className="absolute left-3.5 top-2.5 font-mono text-slate-400 font-bold text-sm">
              {currencySymbol}
            </span>
            <input
              type="number"
              step="0.01"
              value={originalPrice || ''}
              onChange={(e) => setOriginalPrice(Math.max(0, Number(e.target.value)))}
              placeholder="Optional original price to show discount badge (e.g., $120.00)"
              className="w-full pl-8 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 transition-all"
            />
          </div>
          {originalPrice > price && (
            <p className="text-[11px] text-emerald-600 font-bold flex items-center gap-1 mt-1">
              <Percent className="w-3.5 h-3.5" />
              Shows {Math.round(((originalPrice - price) / originalPrice) * 100)}% OFF promotional badge on storefront!
            </p>
          )}
        </div>
      </div>

      {/* Multi-Tier Price List Architecture Section */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 text-white space-y-4 shadow-xl">
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 rounded-md text-[10px] font-bold uppercase tracking-wider">
                  Price List Architecture
                </span>
              </div>
              <h4 className="text-xs sm:text-sm font-black text-white mt-0.5">
                Multi-Tier Price List Matrix (Retail, Wholesale, Dealer, Member, Promotional)
              </h4>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              const generated = generateDefaultPriceListMatrix(price, cost, wholesalePrice);
              setPriceLists(generated);
            }}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            Auto-Fill Standard Price List Matrix
          </button>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Product prices are mapped through target Price Lists (e.g. <strong className="text-indigo-200">Product Variant → Price List → Price</strong>). Cashiers at POS and customers on storefront receive instant tier-based pricing upon selecting their account tier or Price List channel.
        </p>

        {/* Matrix Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-1">
          {(() => {
            const currentMatrix = (priceLists && priceLists.length > 0) 
              ? priceLists 
              : generateDefaultPriceListMatrix(price, cost, wholesalePrice);

            return currentMatrix.map((item, index) => {
              const badgeStyle = getPriceListBadgeStyle(item.priceListName);

              return (
                <div 
                  key={item.priceListId || item.priceListName} 
                  className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-2 relative group hover:border-indigo-500/50 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}>
                      {item.priceListName}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {item.priceListName === 'Retail' ? 'Base' : `${Math.round((1 - item.price / (price || 1)) * 100)}% off`}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 block font-medium">
                      Tier Price ({currencySymbol})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.price}
                      onChange={(e) => {
                        const newVal = Math.max(0, Number(e.target.value));
                        const updated = [...currentMatrix];
                        updated[index] = { ...updated[index], price: newVal };
                        setPriceLists(updated);
                        if (item.priceListName === 'Wholesale') {
                          setWholesalePrice(newVal);
                        }
                      }}
                      className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono font-bold text-emerald-400 focus:outline-none focus:border-indigo-400"
                    />
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </div>
    </div>
  );
}
