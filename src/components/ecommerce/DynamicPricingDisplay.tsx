import React, { useState, useEffect } from 'react';
import { Product } from '../../types';
import { fetchDynamicPricingFromBackend } from '../../services/pricingService';
import { calculateDynamicPricing, DynamicPricingResponse } from '../../utils/pricingEngine';
import { useCurrency } from '../../context/CurrencyContext';
import { Tag, Sparkles } from 'lucide-react';

interface DynamicPricingDisplayProps {
  product?: Partial<Product> | null;
  variantSku?: string | null;
  quantity?: number;
  overridePrice?: number;
  overrideOriginalPrice?: number;
  priceListTier?: string;
  className?: string;
  layout?: 'detail' | 'compact' | 'card' | 'inline';
  showEngineBadge?: boolean;
}

export default function DynamicPricingDisplay({
  product,
  variantSku,
  quantity = 1,
  overridePrice,
  overrideOriginalPrice,
  priceListTier = 'Retail',
  className = '',
  layout = 'detail',
  showEngineBadge = true,
}: DynamicPricingDisplayProps) {
  const { currentCurrency } = useCurrency();
  const activeCurrencySymbol = currentCurrency?.symbol || 'Le';

  // Compute immediate local response first for fast render
  const [pricing, setPricing] = useState<DynamicPricingResponse>(() => {
    return calculateDynamicPricing({
      product: product as any,
      variantSku,
      quantity,
      currency: activeCurrencySymbol,
      priceListTier,
      overridePrice,
      overrideOriginalPrice,
    });
  });

  const [isLoading, setIsLoading] = useState(false);

  // Fetch verified backend response on dependency change
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    fetchDynamicPricingFromBackend({
      product: product as any,
      variantSku,
      quantity,
      currency: activeCurrencySymbol,
      priceListTier,
      overridePrice,
      overrideOriginalPrice,
    }).then((res) => {
      if (isMounted) {
        setPricing(res);
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [
    product?.id,
    product?.price,
    product?.originalPrice,
    product?.discountPercent,
    variantSku,
    quantity,
    overridePrice,
    overrideOriginalPrice,
    priceListTier,
    activeCurrencySymbol,
  ]);

  const currencySymbol = pricing.currency || activeCurrencySymbol || 'Le';

  const formatValue = (num: number) => {
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  };

  // Compact or Inline layout for cards
  if (layout === 'compact' || layout === 'inline') {
    return (
      <div className={`flex items-baseline gap-2 ${className}`}>
        <span className="font-black text-slate-900 font-mono">
          {currencySymbol} {formatValue(pricing.selling_price)}
        </span>
        {pricing.discount_amount > 0 && (
          <>
            <span className="text-xs text-slate-400 line-through font-mono">
              {currencySymbol} {formatValue(pricing.original_price)}
            </span>
            <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100">
              -{pricing.discount_percentage}%
            </span>
          </>
        )}
      </div>
    );
  }

  // Card layout
  if (layout === 'card') {
    return (
      <div className={`space-y-1 p-2 rounded-xl bg-slate-50/80 border border-slate-200/60 ${className}`}>
        <div className="flex justify-between items-center text-[11px] text-slate-500">
          <span>Normal price:</span>
          <span className="line-through font-mono">
            {currencySymbol} {formatValue(pricing.original_price)}
          </span>
        </div>
        {pricing.discount_amount > 0 && (
          <div className="flex justify-between items-center text-[11px] text-rose-600 font-semibold">
            <span>Discount:</span>
            <span className="font-mono">
              -{currencySymbol} {formatValue(pricing.discount_amount)} ({pricing.discount_percentage}%)
            </span>
          </div>
        )}
        <div className="flex justify-between items-center text-xs font-bold text-slate-900 pt-0.5 border-t border-slate-200/60">
          <span>Current price:</span>
          <span className="text-sm font-extrabold text-indigo-700 font-mono">
            {currencySymbol} {formatValue(pricing.selling_price)}
          </span>
        </div>
      </div>
    );
  }

  // Full Detail Layout (for Product Detail Modal & Workspace)
  return (
    <div className={`bg-gradient-to-br from-slate-50 to-indigo-50/30 rounded-2xl p-3.5 sm:p-4 border border-slate-200/90 shadow-2xs space-y-2.5 ${className}`}>
      {/* Header with Backend Pricing Engine Status */}
      <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200/60 pb-1.5">
        <span className="flex items-center gap-1 text-indigo-900">
          <Tag className="w-3.5 h-3.5 text-indigo-600" />
          <span>Dynamic Pricing Engine</span>
        </span>
        {showEngineBadge && (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/80">
            <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
            Backend Evaluated
          </span>
        )}
      </div>

      {/* Pricing Breakdown Grid */}
      <div className="space-y-1.5 text-xs sm:text-sm">
        {/* Normal price */}
        <div className="flex items-center justify-between py-1 border-b border-slate-100">
          <span className="font-medium text-slate-600">Normal price:</span>
          <span className={`font-mono font-bold ${pricing.discount_amount > 0 ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
            {currencySymbol} {formatValue(pricing.original_price)}
          </span>
        </div>

        {/* Discount */}
        <div className="flex items-center justify-between py-1 border-b border-slate-100">
          <span className="font-medium text-slate-600">Discount:</span>
          {pricing.discount_amount > 0 ? (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-rose-700 bg-rose-100/80 px-2 py-0.5 rounded-md">
                {pricing.discount_percentage}% OFF
              </span>
              <span className="font-mono font-bold text-rose-600">
                - {currencySymbol} {formatValue(pricing.discount_amount)}
              </span>
            </div>
          ) : (
            <span className="font-mono text-slate-400">
              {currencySymbol} 0
            </span>
          )}
        </div>

        {/* Current price */}
        <div className="flex items-center justify-between pt-1 text-sm sm:text-base font-extrabold text-slate-900">
          <span className="text-slate-900">Current price:</span>
          <span className="font-mono text-lg sm:text-2xl font-black text-indigo-700 tracking-tight">
            {currencySymbol} {formatValue(pricing.selling_price)}
          </span>
        </div>
      </div>
    </div>
  );
}
