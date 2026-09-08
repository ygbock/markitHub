import React, { useState, useEffect } from 'react';
import { Product } from '../../types';
import { useCurrency } from '../../context/CurrencyContext';
import { ShoppingBag, Check, Plus, Tag, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';
import { getFrequentlyBoughtTogetherItems, calculateBundlePricing } from '../../utils/recommendationEngine';
import OptimizedImage from './OptimizedImage';

interface FrequentlyBoughtTogetherProps {
  mainProduct: Product;
  currentMainPrice: number;
  selectedVariantSku?: string;
  allProducts: Product[];
  onAddToCart: (product: Product, quantity: number, variantSku?: string) => void;
  onOpenProduct: (product: Product) => void;
}

export default function FrequentlyBoughtTogether({
  mainProduct,
  currentMainPrice,
  selectedVariantSku,
  allProducts,
  onAddToCart,
  onOpenProduct
}: FrequentlyBoughtTogetherProps) {
  const { formatAmount } = useCurrency();

  // Resolve bundled accessories
  const bundleItems = getFrequentlyBoughtTogetherItems(mainProduct, allProducts);

  // Maintain checked state for each bundle accessory (default all checked)
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);
  const [addedSuccess, setAddedSuccess] = useState(false);

  // Initialize selected accessories on product change
  useEffect(() => {
    if (bundleItems.length > 0) {
      setSelectedAddonIds(bundleItems.map(item => item.id));
    } else {
      setSelectedAddonIds([]);
    }
    setAddedSuccess(false);
  }, [mainProduct.id]);

  if (bundleItems.length === 0) {
    return null;
  }

  const toggleAddon = (id: string) => {
    setSelectedAddonIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const pricing = calculateBundlePricing(
    mainProduct,
    currentMainPrice,
    bundleItems,
    selectedAddonIds,
    10 // 10% bundle discount
  );

  const handleAddBundleToCart = () => {
    // 1. Add main product
    onAddToCart(mainProduct, 1, selectedVariantSku || undefined);

    // 2. Add selected add-ons
    bundleItems.forEach(item => {
      if (selectedAddonIds.includes(item.id)) {
        onAddToCart(item, 1);
      }
    });

    setAddedSuccess(true);
    setTimeout(() => {
      setAddedSuccess(false);
    }, 2800);
  };

  return (
    <section 
      className="p-5 sm:p-6 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 text-white rounded-3xl border border-slate-800 shadow-xl space-y-5"
      id="frequently-bought-together-section"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-extrabold uppercase tracking-wide text-white flex items-center gap-2">
              Frequently Bought Together
            </h3>
            <p className="text-xs text-slate-400 font-medium">
              Customers commonly purchase these items together
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/15 border border-emerald-500/30 rounded-full text-emerald-300 text-xs font-bold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Save 10% on Bundle</span>
        </div>
      </div>

      {/* Visual Product Thumbnails Chain */}
      <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto no-scrollbar py-2">
        {/* Main Product Card */}
        <div className="relative group shrink-0">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-2 border-emerald-400 bg-white p-1 shadow-md shadow-emerald-500/10">
            <OptimizedImage 
              src={mainProduct.imageUrl} 
              alt={mainProduct.name} 
              width={96}
              height={96}
              className="w-full h-full object-cover rounded-xl"
            />
          </div>
          <span className="absolute -top-2 left-2 px-1.5 py-0.5 bg-emerald-600 text-white text-[9px] font-black uppercase rounded-md shadow-xs">
            This Item
          </span>
        </div>

        {/* Plus & Addon Accessories */}
        {bundleItems.map(item => {
          const isSelected = selectedAddonIds.includes(item.id);
          return (
            <React.Fragment key={item.id}>
              <span className="text-emerald-400 font-black text-xl shrink-0 select-none">
                +
              </span>

              <div 
                onClick={() => toggleAddon(item.id)}
                className={`relative group shrink-0 cursor-pointer transition-all duration-200 ${
                  isSelected ? 'scale-100' : 'opacity-40 grayscale hover:opacity-75'
                }`}
                title={isSelected ? 'Click to remove from bundle' : 'Click to add to bundle'}
              >
                <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-2 transition-all bg-white p-1 shadow-md ${
                  isSelected 
                    ? 'border-emerald-400 ring-2 ring-emerald-400/20' 
                    : 'border-slate-700'
                }`}>
                  <OptimizedImage 
                    src={item.imageUrl} 
                    alt={item.name} 
                    width={96}
                    height={96}
                    className="w-full h-full object-cover rounded-xl"
                  />
                </div>

                <div className={`absolute top-1 right-1 w-5 h-5 rounded-md flex items-center justify-center transition-all ${
                  isSelected ? 'bg-emerald-500 text-slate-950 font-black shadow-xs' : 'bg-slate-800/80 border border-slate-600 text-transparent'
                }`}>
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* Itemized Checkbox List */}
      <div className="space-y-2 pt-1 border-t border-slate-800/80">
        {/* Main Item row */}
        <div className="flex items-center gap-2.5 text-xs text-slate-300">
          <input 
            type="checkbox" 
            checked 
            disabled 
            className="w-4 h-4 rounded-md accent-emerald-500 cursor-not-allowed opacity-80"
          />
          <span className="font-bold text-white">This item:</span>
          <span className="truncate max-w-[280px] sm:max-w-md">{mainProduct.name}</span>
          <span className="font-mono font-bold text-emerald-400 ml-auto shrink-0">
            {formatAmount(currentMainPrice)}
          </span>
        </div>

        {/* Add-on items checkboxes */}
        {bundleItems.map(item => {
          const isChecked = selectedAddonIds.includes(item.id);
          return (
            <label 
              key={item.id} 
              className="flex items-center gap-2.5 text-xs text-slate-300 hover:text-white cursor-pointer transition-colors group"
            >
              <input 
                type="checkbox" 
                checked={isChecked} 
                onChange={() => toggleAddon(item.id)}
                className="w-4 h-4 rounded-md accent-emerald-500 cursor-pointer"
              />
              <span className="group-hover:underline truncate max-w-[240px] sm:max-w-md">
                {item.name}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onOpenProduct(item);
                }}
                className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold uppercase tracking-wider underline cursor-pointer shrink-0 ml-1"
              >
                View
              </button>
              <span className="font-mono font-bold text-slate-300 group-hover:text-emerald-400 ml-auto shrink-0 transition-colors">
                {formatAmount(item.price)}
              </span>
            </label>
          );
        })}
      </div>

      {/* Bundle Pricing Bar & Action Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
              Total Bundle Price:
            </span>
            {pricing.bundleDiscountPercent > 0 && (
              <span className="text-xs text-slate-500 line-through font-mono">
                {formatAmount(pricing.originalTotal)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xl sm:text-2xl font-black font-mono text-emerald-400 tracking-tight">
              {formatAmount(pricing.finalBundlePrice)}
            </span>

            {pricing.totalSavings > 0 && (
              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-black">
                Save {formatAmount(pricing.totalSavings)}
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={handleAddBundleToCart}
          disabled={pricing.selectedCount === 0}
          className={`px-5 py-3 rounded-2xl font-black text-xs sm:text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-lg cursor-pointer active:scale-95 shrink-0 ${
            addedSuccess
              ? 'bg-emerald-600 text-white shadow-emerald-600/30'
              : 'bg-emerald-400 hover:bg-emerald-300 text-slate-950 shadow-emerald-500/20'
          }`}
          id="btn-add-bundle-to-cart"
        >
          {addedSuccess ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>Bundle Added to Cart!</span>
            </>
          ) : (
            <>
              <ShoppingBag className="w-4 h-4" />
              <span>Add All {pricing.selectedCount} to Cart</span>
              <ArrowRight className="w-4 h-4 ml-0.5" />
            </>
          )}
        </button>
      </div>
    </section>
  );
}
