import React, { useState } from 'react';
import { Product, ProductVariant, ProductEcommerce, PriceListItem, ProductPriceLists } from '../../types';
import { 
  Check, Eye, Monitor, Smartphone, ShoppingBag, ShieldCheck, 
  Layers, Tag, DollarSign, Package, Star, Clock, AlertTriangle, 
  ChevronRight, Sparkles, Send, FileText, Globe, Store, CheckSquare, Square,
  ShieldAlert
} from 'lucide-react';
import { useCurrency } from '../../context/CurrencyContext';
import { marginGuard, MarginGuardReport } from '../../utils/pricingEngine';

interface StepReviewProps {
  productData: {
    name: string;
    brand: string;
    category: string;
    description: string;
    productType: string;
    status: string;
    hasVariants: boolean;
    variants: ProductVariant[];
    compositeComponents?: any[];
    bundleKitItems?: any[];
    bulkPackaging?: any;
    sku: string;
    barcode: string;
    qrCode: string;
    stock: number;
    reorderPoint: number;
    unit: string;
    location: string;
    trackStock: boolean;
    trackSerial: boolean;
    serialNumber: string;
    trackBatch: boolean;
    batchNumber: string;
    trackExpiry: boolean;
    expiryDate: string;
    cost: number;
    price: number;
    wholesalePrice: number;
    minimumPrice: number;
    originalPrice: number;
    priceLists?: any;
    imageUrl: string;
    images: string[];
    specifications: Record<string, string>;
    ecommerce: ProductEcommerce;
  };
  onJumpToStep: (stepNumber: number) => void;
  publishToStore?: boolean;
  setPublishToStore?: (val: boolean) => void;
  onSave?: (status: 'Active' | 'Draft') => void;
}

export default function StepReview({
  productData,
  onJumpToStep,
  publishToStore = true,
  setPublishToStore = () => {},
  onSave
}: StepReviewProps) {
  const { currencySymbol, formatAmount } = useCurrency();
  const [activePreviewTab, setActivePreviewTab] = useState<'card' | 'pos' | 'ecom' | 'audit'>('card');

  const grossProfit = productData.price - productData.cost;
  const marginPercent = productData.price > 0 ? (grossProfit / productData.price) * 100 : 0;

  const marginReport: MarginGuardReport = marginGuard(
    productData.cost,
    productData.price,
    productData.wholesalePrice,
    productData.priceLists,
    productData.variants
  );

  return (
    <div className="space-y-6">
      {/* MarginGuard Warning Banner if negative margins exist */}
      {marginReport.hasNegativeMargin && (
        <div className="bg-rose-50 border-2 border-rose-400 rounded-2xl p-4 sm:p-5 space-y-3 shadow-md">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h4 className="text-sm font-black text-rose-950">
                  MarginGuard Alert: Negative Profit Margin Warning
                </h4>
                <button
                  type="button"
                  onClick={() => onJumpToStep(4)}
                  className="text-xs font-bold text-rose-700 hover:text-rose-900 underline flex items-center gap-1 cursor-pointer"
                >
                  Adjust in Step 4 (Pricing) <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-xs text-rose-800 mt-1">
                This product configuration contains prices set below unit cost of <strong>{formatAmount(productData.cost)}</strong>:
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                {marginReport.violatedTiers.map((v, i) => (
                  <span 
                    key={i} 
                    className="px-2.5 py-1 bg-white border border-rose-300 rounded-lg text-xs font-mono font-bold text-rose-800"
                  >
                    {v.tierName}: {formatAmount(v.price)} (-{formatAmount(v.lossAmount)} loss)
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Section Header */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs font-bold text-sm">
          8
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900">Review & Multi-Channel Channel Preview</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit configurations, inspect POS & E-commerce channel renders, then publish or save as draft.
          </p>
        </div>
      </div>

      {/* Preview Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        {[
          { id: 'card', label: 'Product Summary Card', icon: Package },
          { id: 'pos', label: 'POS Terminal Preview', icon: Monitor },
          { id: 'ecom', label: 'E-commerce Storefront', icon: ShoppingBag },
          { id: 'audit', label: 'Inventory Rules Audit', icon: ShieldCheck }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activePreviewTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActivePreviewTab(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                isActive
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Product Summary Card */}
      {activePreviewTab === 'card' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-5">
          <div className="flex flex-col md:flex-row gap-5">
            {/* Image Shot */}
            <div className="w-full md:w-48 aspect-square bg-slate-50 rounded-2xl overflow-hidden border border-slate-200 shrink-0 relative">
              <img
                src={productData.imageUrl || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=600'}
                alt={productData.name}
                className="w-full h-full object-cover"
              />
              <span className={`absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-bold text-white ${
                productData.status === 'Active' ? 'bg-emerald-600' : 'bg-amber-600'
              }`}>
                {productData.status}
              </span>
            </div>

            {/* Info Breakdown */}
            <div className="flex-1 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                    {productData.brand || 'Unbranded'} • {productData.category}
                  </div>
                  <h2 className="text-lg font-black text-slate-900 mt-0.5">{productData.name || 'Untitled Product'}</h2>
                  <p className="text-xs text-slate-500 line-clamp-2 mt-1">{productData.description || 'No description provided.'}</p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xl font-black font-mono text-emerald-700">
                    {formatAmount(productData.price)}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Cost: {formatAmount(productData.cost)} ({marginPercent.toFixed(1)}% margin)
                  </div>
                </div>
              </div>

              {/* Specs & Attributes Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-xs">
                <div className="bg-slate-50 p-2 rounded-xl">
                  <span className="text-slate-400 block text-[10px] font-bold">SKU</span>
                  <span className="font-mono font-bold text-slate-900">{productData.sku}</span>
                </div>
                <div className="bg-slate-50 p-2 rounded-xl">
                  <span className="text-slate-400 block text-[10px] font-bold">Stock Balance</span>
                  <span className="font-mono font-bold text-indigo-700">{productData.stock} {productData.unit}</span>
                </div>
                <div className="bg-slate-50 p-2 rounded-xl">
                  <span className="text-slate-400 block text-[10px] font-bold">Type</span>
                  <span className="font-bold text-slate-800">{productData.productType}</span>
                </div>
                <div className="bg-slate-50 p-2 rounded-xl">
                  <span className="text-slate-400 block text-[10px] font-bold">Location</span>
                  <span className="font-semibold text-slate-800">{productData.location}</span>
                </div>
              </div>

              {/* Composite BOM Breakdown */}
              {productData.productType === 'Composite' && productData.compositeComponents && productData.compositeComponents.length > 0 && (
                <div className="pt-2 border-t border-slate-100">
                  <div className="text-[11px] font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                    <span>🖥️ Composite Bill of Materials ({productData.compositeComponents.length} sub-components):</span>
                    <span className="font-mono text-indigo-700 font-extrabold">Rolled-Up Cost: {formatAmount(productData.compositeComponents.reduce((s, c) => s + (c.quantity * c.unitCost), 0))}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {productData.compositeComponents.map((comp, idx) => (
                      <span key={idx} className="px-2 py-1 bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-medium text-slate-700">
                        <strong className="text-slate-900">{comp.name}</strong> ({comp.quantity}x @ {formatAmount(comp.unitCost)})
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Bundle Kit Items Breakdown */}
              {productData.productType === 'Bundle' && productData.bundleKitItems && productData.bundleKitItems.length > 0 && (
                <div className="pt-2 border-t border-slate-100">
                  <div className="text-[11px] font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                    <span>🎁 Pack Kit Contents ({productData.bundleKitItems.length} items):</span>
                    <span className="font-mono text-emerald-700 font-extrabold">Standalone Value: {formatAmount(productData.bundleKitItems.reduce((s, c) => s + (c.quantity * c.unitPrice), 0))}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {productData.bundleKitItems.map((item, idx) => (
                      <span key={idx} className="px-2 py-1 bg-emerald-50 border border-emerald-200 rounded-lg text-[10px] font-medium text-emerald-900">
                        <strong className="text-slate-900">{item.name}</strong> ({item.quantity}x @ {formatAmount(item.unitPrice)})
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: POS Terminal Preview */}
      {activePreviewTab === 'pos' && (
        <div className="bg-slate-900 rounded-2xl p-6 text-white space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Monitor className="w-4 h-4 text-emerald-400" />
              Cashier POS Quick Grid Card Render
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
              Register Active
            </span>
          </div>

          <div className="max-w-xs mx-auto bg-slate-800 border border-slate-700 rounded-2xl p-3.5 space-y-3 shadow-xl">
            <div className="aspect-square bg-slate-900 rounded-xl overflow-hidden relative">
              <img
                src={productData.imageUrl || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=600'}
                alt=""
                className="w-full h-full object-cover"
              />
              <span className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-bold font-mono">
                {formatAmount(productData.price)}
              </span>
              <span className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-xs text-[9px] font-mono text-slate-300">
                SKU: {productData.sku}
              </span>
            </div>

            <div>
              <div className="font-bold text-xs line-clamp-1">{productData.name || 'Untitled Item'}</div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                <span>{productData.stock} in stock</span>
                <span className="text-indigo-400 font-bold">{productData.category}</span>
              </div>
            </div>

            <button
              type="button"
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-all"
            >
              + Add to POS Cart
            </button>
          </div>
        </div>
      )}

      {/* Tab 3: E-commerce Storefront Preview */}
      {activePreviewTab === 'ecom' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-indigo-600" />
              Online Web Storefront Product Page
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              /products/{productData.ecommerce?.slug || 'handle'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="aspect-square bg-slate-50 rounded-2xl overflow-hidden border border-slate-200">
              <img
                src={productData.imageUrl || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=600'}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">{productData.brand}</span>
                <h1 className="text-xl font-black text-slate-900 mt-0.5">{productData.name}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center text-amber-400">
                    {'★'.repeat(5)}
                  </div>
                  <span className="text-xs text-slate-500 font-semibold">5.0 (New Product)</span>
                </div>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900 font-mono">{formatAmount(productData.price)}</span>
                {productData.originalPrice > productData.price && (
                  <span className="text-sm font-mono text-slate-400 line-through">
                    {formatAmount(productData.originalPrice)}
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">{productData.ecommerce?.summary || productData.description}</p>

              {productData.hasVariants && productData.variants.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-slate-800">Select Variant:</span>
                  <div className="flex flex-wrap gap-2">
                    {productData.variants.slice(0, 4).map((v) => (
                      <span key={v.sku} className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800">
                        {v.size || v.color || v.sku}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="button"
                className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-slate-800 transition-all shadow-md"
              >
                Add to Cart • Free Shipping Available
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Inventory Rules Audit */}
      {activePreviewTab === 'audit' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            Inventory Identity & Control Audit
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Primary SKU</span>
              <p className="font-mono font-bold text-slate-900">{productData.sku}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Barcode</span>
              <p className="font-mono text-slate-900">{productData.barcode || 'N/A'}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Stock Tracking</span>
              <p className="font-bold text-indigo-700">{productData.trackStock ? 'Enabled' : 'Disabled'}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Serial Tracking</span>
              <p className="font-bold text-slate-800">{productData.trackSerial ? `Enabled (${productData.serialNumber || 'SN'})` : 'Disabled'}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Batch Tracking</span>
              <p className="font-bold text-slate-800">{productData.trackBatch ? `Enabled (${productData.batchNumber || 'LOT'})` : 'Disabled'}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Expiry Tracking</span>
              <p className="font-bold text-slate-800">{productData.trackExpiry ? `Enabled (${productData.expiryDate || 'Date'})` : 'Disabled'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Step Quick Jump Bar */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
          Need to make changes? Jump directly to step:
        </span>
        <div className="flex flex-wrap gap-2">
          {[
            { num: 1, name: '1. Basic Info' },
            { num: 2, name: '2. Variants' },
            { num: 3, name: '3. Inventory' },
            { num: 4, name: '4. Pricing' },
            { num: 5, name: '5. Media' },
            { num: 6, name: '6. Specifications' },
            { num: 7, name: '7. E-commerce' }
          ].map((st) => (
            <button
              key={st.num}
              type="button"
              onClick={() => onJumpToStep(st.num)}
              className="px-2.5 py-1 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-lg text-xs font-semibold text-slate-700 hover:text-indigo-900 transition-all cursor-pointer"
            >
              {st.name}
            </button>
          ))}
        </div>
      </div>

      {/* Publishing Destination Configuration Card */}
      <div className="bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-4 sm:p-5 border border-indigo-800 shadow-md space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-200">
                Publishing Destination & Channel Setup
              </h4>
            </div>
            <p className="text-xs text-indigo-300/90 leading-relaxed">
              Decide where this product will be visible once published.
            </p>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
            publishToStore 
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
              : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
          }`}>
            {publishToStore ? 'Storefront + POS' : 'Inventory Table Only'}
          </span>
        </div>

        {/* Checkbox selector */}
        <label className="flex items-start gap-3 p-3 bg-white/10 hover:bg-white/15 border border-white/15 rounded-xl cursor-pointer transition-all">
          <input
            type="checkbox"
            checked={publishToStore}
            onChange={(e) => setPublishToStore(e.target.checked)}
            className="mt-0.5 w-4 h-4 text-indigo-600 rounded-md border-slate-300 focus:ring-indigo-500 cursor-pointer"
          />
          <div className="space-y-0.5">
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-indigo-300" />
              Publish to Online Storefront (E-commerce)
            </div>
            <p className="text-[11px] text-indigo-200/80">
              {publishToStore 
                ? 'Product will be published to both the Online Storefront and the In-Store Inventory table.'
                : 'Product will only be added to the Inventory table & POS registers (hidden from public online store).'}
            </p>
          </div>
        </label>
      </div>
    </div>
  );
}
