import React, { useState } from 'react';
import { Product, ProductVariant } from '../types';
import { 
  X, Barcode, QrCode, MapPin, DollarSign, Package, AlertTriangle, 
  CheckCircle2, TrendingUp, Printer, Edit2, Copy, Check, Plus,
  Layers, Info, ArrowUpRight, ShieldAlert, Sparkles, ExternalLink,
  Cpu, ShieldCheck, Search, Image as ImageIcon, FileText, ShoppingBag,
  History, ArrowRightLeft, Building2, Store, Warehouse, RefreshCcw,
  Truck, Tag, Calendar, User, Eye, ArrowDownRight, Award
} from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';
import { getPackagingUnitOptions, formatStockInPackagingUnits } from '../utils/inventoryUtils';
import { resolveBarcodeToProduct, BarcodeMatchResult } from '../utils/barcodeResolver';
import { generateDefaultPriceListMatrix, getPriceListBadgeStyle, calculateProductValuationCost, normalizePriceListMap, priceListMapToItems } from '../utils/pricingEngine';
import { runSmartMatchEngine } from '../services/smartMatchEngine';
import { INITIAL_PRODUCTS } from '../data/mockData';
import BatchLotSection from './BatchLotSection';
import VariantPriceListsModal from './VariantPriceListsModal';
import DynamicPricingDisplay from './ecommerce/DynamicPricingDisplay';
import AvailabilityBadge from './ecommerce/AvailabilityBadge';

interface ProductDetailModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onEditProduct?: (product: Product) => void;
  onUpdateProduct?: (product: Product) => void;
  onOpenBarcodeModal?: (product: Product, sku?: string) => void;
  onQuickReorder?: (productId: string, amount: number) => void;
  canEdit?: boolean;
}

type TabType = 
  | 'overview' 
  | 'variants' 
  | 'inventory' 
  | 'pricing' 
  | 'media' 
  | 'specifications' 
  | 'sales' 
  | 'purchases' 
  | 'history'
  | 'relationships';

export default function ProductDetailModal({
  product,
  isOpen,
  onClose,
  onEditProduct,
  onUpdateProduct,
  onOpenBarcodeModal,
  onQuickReorder,
  canEdit = true
}: ProductDetailModalProps) {
  const { formatAmount } = useCurrency();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [reorderSuccess, setReorderSuccess] = useState<number | null>(null);
  const [testScanCode, setTestScanCode] = useState<string>('890123456789');
  const [editingVariantIndex, setEditingVariantIndex] = useState<number | null>(null);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState<number>(0);

  if (!isOpen || !product) return null;

  // Live test barcode resolution
  const testResolution: BarcodeMatchResult | null = testScanCode.trim() 
    ? resolveBarcodeToProduct(testScanCode.trim(), [product])
    : null;

  const isLowStock = product.stock <= product.reorderPoint;
  const isOutOfStock = product.stock === 0;

  // Financial calculations
  const profitMarginPerUnit = product.price - product.cost;
  const marginPercentage = product.price > 0 ? (profitMarginPerUnit / product.price) * 100 : 0;
  const totalCostValuation = product.stock * product.cost;
  const totalRetailValuation = product.stock * product.price;

  // Calculate stock by location breakdown dynamically based on total stock
  const locationsBreakdown = [
    {
      id: 'loc-main',
      name: 'Main Warehouse',
      icon: Warehouse,
      code: 'WH-MAIN',
      address: 'Central Logistics Hub, Dock 4',
      stock: Math.round(product.stock * 0.55),
      status: 'Primary Hub'
    },
    {
      id: 'loc-branch-a',
      name: 'Branch A',
      icon: Building2,
      code: 'BR-NORTH',
      address: '102 Commerce Way, Section 2B',
      stock: Math.round(product.stock * 0.25),
      status: 'Active'
    },
    {
      id: 'loc-branch-b',
      name: 'Branch B',
      icon: Building2,
      code: 'BR-SOUTH',
      address: '45 Retail Plaza, Bay 12',
      stock: Math.round(product.stock * 0.12),
      status: 'Active'
    },
    {
      id: 'loc-pos',
      name: 'POS Store',
      icon: Store,
      code: 'POS-FRONT',
      address: 'Checkout Registers 1-6',
      stock: Math.max(0, product.stock - (Math.round(product.stock * 0.55) + Math.round(product.stock * 0.25) + Math.round(product.stock * 0.12))),
      status: 'Ready for Sale'
    }
  ];

  // Media gallery list
  const mediaList = [
    product.imageUrl || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=600',
    ...(product.variants?.map(v => v.imageUrl).filter(Boolean) as string[] || [])
  ];
  // Deduplicate images
  const uniqueMediaList = Array.from(new Set(mediaList));

  // Copy helper
  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Quick reorder trigger
  const handleReorder = (amount: number) => {
    if (onQuickReorder) {
      onQuickReorder(product.id, amount);
      setReorderSuccess(amount);
      setTimeout(() => setReorderSuccess(null), 2500);
    }
  };

  const tabsConfig: { id: TabType; label: string; icon: React.ElementType; badge?: string | number }[] = [
    { id: 'overview', label: 'Overview', icon: Info },
    { id: 'variants', label: 'Variants', icon: Layers, badge: product.variants?.length || 0 },
    { id: 'inventory', label: 'Inventory', icon: Warehouse, badge: product.stock },
    { id: 'pricing', label: 'Pricing', icon: DollarSign },
    { id: 'media', label: 'Media', icon: ImageIcon, badge: uniqueMediaList.length },
    { id: 'specifications', label: 'Specifications', icon: FileText },
    { id: 'sales', label: 'Sales', icon: ShoppingBag },
    { id: 'purchases', label: 'Purchases', icon: Truck },
    { id: 'history', label: 'History', icon: History },
    { id: 'relationships', label: 'Relationships', icon: ArrowRightLeft }
  ];

  return (
    <div 
      className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto"
      id="product-detail-modal-backdrop"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[94vh]"
        id="product-detail-modal-panel"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Workspace Top Bar Header */}
        <div className="px-5 sm:px-6 pt-5 pb-4 border-b border-slate-200 bg-slate-50/90 flex flex-col gap-3">
          
          {/* Main Title Row */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shrink-0">
                <Package className="w-6 h-6" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black font-mono text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 rounded-lg">
                    {product.sku}
                  </span>
                  <span className="text-xs font-semibold text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded-lg">
                    {product.category}
                  </span>
                  {product.brand && (
                    <span className="text-xs font-semibold text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded-lg">
                      Brand: {product.brand}
                    </span>
                  )}
                  {isOutOfStock ? (
                    <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 border border-rose-300 text-[11px] font-extrabold px-2 py-0.5 rounded-full">
                      <AlertTriangle className="w-3 h-3 text-rose-600" /> Out of Stock
                    </span>
                  ) : isLowStock ? (
                    <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 border border-amber-300 text-[11px] font-extrabold px-2 py-0.5 rounded-full">
                      <ShieldAlert className="w-3 h-3 text-amber-600" /> Low Stock ({product.stock})
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 border border-emerald-300 text-[11px] font-extrabold px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> In Stock ({product.stock})
                    </span>
                  )}
                </div>

                <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight mt-1 line-clamp-1" id="product-detail-title">
                  {product.name}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {canEdit && onEditProduct && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEditProduct(product);
                  }}
                  className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                  id="btn-detail-edit"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit Product</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-200/70 rounded-xl transition-all cursor-pointer"
                id="btn-close-product-detail"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Workspace Tabs Bar */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-2 border-t border-slate-200/80 -mb-1">
            {tabsConfig.map((tab) => {
              const IconComponent = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border ${
                    isActive
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                  id={`tab-${tab.id}`}
                >
                  <IconComponent className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && tab.badge !== null && tab.badge !== 0 && (
                    <span className={`text-[10px] font-mono font-extrabold px-1.5 py-0.2 rounded-md ${
                      isActive ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

        </div>

        {/* Modal Content Body - Active Tab Render */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">

          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                
                {/* Left Photo & Quick Scanner Card */}
                <div className="md:col-span-5 space-y-4">
                  <div className="relative aspect-square rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shadow-2xs group">
                    <img 
                      src={uniqueMediaList[selectedMediaIndex] || product.imageUrl} 
                      alt={product.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute bottom-3 right-3 bg-slate-900/80 backdrop-blur-xs text-white text-[11px] px-2.5 py-1 rounded-lg font-bold">
                      {formatAmount(product.price)} MSRP
                    </div>
                  </div>

                  {/* Symbology & Barcode Summary Card */}
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                      <span className="flex items-center gap-1.5">
                        <Barcode className="w-4 h-4 text-indigo-600" />
                        Identifiers & Symbology
                      </span>
                      {onOpenBarcodeModal && (
                        <button
                          type="button"
                          onClick={() => {
                            onClose();
                            onOpenBarcodeModal(product);
                          }}
                          className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Printer className="w-3 h-3" /> Barcode Studio
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                        <span className="text-[10px] uppercase font-bold text-gray-400 block">Barcode / UPC</span>
                        <div className="font-mono text-[11px] font-bold text-slate-800 mt-0.5 truncate flex items-center justify-between">
                          <span className="truncate">{product.barcode || 'N/A'}</span>
                          {product.barcode && (
                            <button 
                              onClick={() => handleCopy(product.barcode, 'barcode')}
                              className="text-gray-400 hover:text-indigo-600 ml-1 p-0.5 cursor-pointer"
                              title="Copy Barcode"
                            >
                              {copiedField === 'barcode' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                        <span className="text-[10px] uppercase font-bold text-gray-400 block">QR Link Code</span>
                        <div className="font-mono text-[11px] font-bold text-slate-800 mt-0.5 truncate flex items-center justify-between">
                          <span className="truncate">{product.qrCode || 'N/A'}</span>
                          {product.qrCode && (
                            <button 
                              onClick={() => handleCopy(product.qrCode, 'qrcode')}
                              className="text-gray-400 hover:text-indigo-600 ml-1 p-0.5 cursor-pointer"
                              title="Copy QR Code"
                            >
                              {copiedField === 'qrcode' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Summary Metrics */}
                <div className="md:col-span-7 space-y-4">
                  
                  {/* Key Financial Telemetry Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                      <span className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">Total Stock</span>
                      <div className="flex items-baseline gap-1.5 mt-1">
                        <span className="text-xl font-black font-mono text-slate-900">{product.stock}</span>
                        <span className="text-xs text-gray-500">units</span>
                      </div>
                      <div className="text-[10px] text-gray-400 mt-1">
                        Safety Point: <strong className="text-slate-700">{product.reorderPoint}</strong>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
                      <span className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">Selling Price</span>
                      <div className="flex items-baseline gap-1.5 mt-1">
                        <span className="text-xl font-black font-mono text-slate-900">{formatAmount(product.price)}</span>
                      </div>
                      <div className="text-[10px] text-gray-400 mt-1">
                        Cost: <strong className="text-slate-700">{formatAmount(product.cost)}</strong>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 col-span-2 sm:col-span-1">
                      <span className="text-[10px] font-bold uppercase text-gray-500 tracking-wider">Profit Margin</span>
                      <div className="flex items-baseline gap-1.5 mt-1">
                        <span className="text-xl font-black font-mono text-emerald-600">
                          {marginPercentage.toFixed(1)}%
                        </span>
                      </div>
                      <div className="text-[10px] text-emerald-700 mt-1 font-semibold">
                        +{formatAmount(profitMarginPerUnit)} / unit
                      </div>
                    </div>
                  </div>

                  {/* Availability System Engine (On Hand, Reserved, Available & Breakdown) */}
                  <AvailabilityBadge
                    product={product}
                    layout="detail"
                    showBreakdown={true}
                  />

                  {/* Basic Metadata Table */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-indigo-600" />
                      Core Attributes
                    </h3>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Category</span>
                        <span className="font-bold text-slate-900">{product.category}</span>
                      </div>
                      <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Brand</span>
                        <span className="font-bold text-slate-900">{product.brand || 'Generic'}</span>
                      </div>
                      <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Supplier</span>
                        <span className="font-bold text-slate-900">{product.supplierName || 'Standard Vendor'}</span>
                      </div>
                      <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Primary Location</span>
                        <span className="font-bold text-slate-900">{product.location}</span>
                      </div>
                    </div>
                  </div>

                  {/* Description Box */}
                  {product.description && (
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-gray-400" />
                        Description
                      </span>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {product.description}
                      </p>
                    </div>
                  )}

                  {/* Quick Replenishment Action */}
                  {canEdit && onQuickReorder && (
                    <div className="p-4 bg-indigo-50/60 rounded-2xl border border-indigo-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div>
                        <span className="text-xs font-bold text-indigo-900 block">Quick Replenish Stock</span>
                        <span className="text-[11px] text-indigo-700">Add physical units directly to inventory.</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleReorder(10)}
                          className="px-3 py-1.5 bg-white hover:bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                        >
                          +10
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReorder(25)}
                          className="px-3 py-1.5 bg-white hover:bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                        >
                          +25
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReorder(50)}
                          className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                        >
                          +50
                        </button>
                      </div>
                    </div>
                  )}

                  {reorderSuccess && (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Successfully replenished +{reorderSuccess} units to {product.name}!</span>
                    </div>
                  )}

                </div>
              </div>
            </div>
          )}

          {/* TAB 2: VARIANTS */}
          {activeTab === 'variants' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
                <div>
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    Product Variants & SKUs ({product.variants?.length || 0} variations)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Individual variant SKUs, barcodes, pricing overrides, and inventory balances.
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-2.5 py-1 rounded-xl">
                  Total Combined Stock: {product.variants ? product.variants.reduce((s, v) => s + v.stock, 0) : product.stock} units
                </span>
              </div>

              {product.variants && product.variants.length > 0 ? (
                <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                          <th className="px-3.5 py-3">Variant Title</th>
                          <th className="px-3.5 py-3">SKU & Symbologies</th>
                          <th className="px-3.5 py-3 text-right">Price / Cost</th>
                          <th className="px-3.5 py-3">Specs & Weight</th>
                          <th className="px-3.5 py-3 text-right">Stock</th>
                          <th className="px-3.5 py-3 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {product.variants.map((variant, index) => {
                          const totalVarStock = product.variants ? product.variants.reduce((s, v) => s + v.stock, 0) : 1;
                          const sharePercent = totalVarStock > 0 ? (variant.stock / totalVarStock) * 100 : 0;
                          const title = variant.title || [variant.size, variant.color, variant.model].filter(Boolean).join(' / ') || `Variant #${index + 1}`;

                          return (
                            <tr key={index} className="hover:bg-slate-50/60 transition-colors">
                              <td className="px-3.5 py-3">
                                <div className="flex items-center gap-2.5">
                                  {variant.imageUrl && (
                                    <img src={variant.imageUrl} alt="" className="w-9 h-9 rounded-xl object-cover border border-slate-200 shrink-0" />
                                  )}
                                  <div>
                                    <span className="font-bold text-slate-900 block text-xs">{title}</span>
                                    {variant.options && Object.keys(variant.options).length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {Object.entries(variant.options).map(([k, v]) => (
                                          <span key={k} className="text-[9px] px-1.5 py-0.2 bg-indigo-50 text-indigo-800 rounded font-mono font-semibold">
                                            {k}: {v}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>

                              <td className="px-3.5 py-3 font-mono">
                                <div className="font-extrabold text-slate-900 text-xs">{variant.sku}</div>
                                <div className="flex flex-wrap items-center gap-1 mt-1">
                                  {variant.barcode && (
                                    <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200 text-[9px] font-bold">
                                      BC: {variant.barcode}
                                    </span>
                                  )}
                                  {variant.ean && (
                                    <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-[9px] font-bold">
                                      EAN: {variant.ean}
                                    </span>
                                  )}
                                  {variant.upc && (
                                    <span className="px-1.5 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded text-[9px] font-bold">
                                      UPC: {variant.upc}
                                    </span>
                                  )}
                                </div>
                              </td>

                              <td className="px-3.5 py-3 text-right font-mono">
                                <div className="font-black text-emerald-700 text-xs">{formatAmount(variant.price ?? product.price)}</div>
                                <div className="text-[10px] text-slate-400">Cost: {formatAmount(variant.cost ?? product.cost)}</div>
                              </td>

                              <td className="px-3.5 py-3 text-[11px]">
                                {variant.weight ? (
                                  <div className="text-slate-800 font-semibold">
                                    {variant.weight} {variant.weightUnit || 'kg'}
                                  </div>
                                ) : (
                                  <span className="text-gray-400">—</span>
                                )}
                              </td>

                              <td className="px-3.5 py-3 text-right font-mono">
                                <div className="font-black text-slate-900 text-xs">{variant.stock} units</div>
                                <div className="text-[10px] text-slate-400">{sharePercent.toFixed(0)}% share</div>
                              </td>

                              <td className="px-3.5 py-3 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => setEditingVariantIndex(index)}
                                    className="p-1.5 hover:bg-indigo-50 text-indigo-700 rounded-lg transition-all cursor-pointer"
                                    title="Edit Price Lists"
                                  >
                                    <DollarSign className="w-3.5 h-3.5" />
                                  </button>
                                  {onOpenBarcodeModal && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        onClose();
                                        onOpenBarcodeModal(product, variant.sku);
                                      }}
                                      className="p-1.5 hover:bg-indigo-50 text-indigo-600 rounded-lg transition-all cursor-pointer"
                                      title="Print Barcode"
                                    >
                                      <Printer className="w-3.5 h-3.5" />
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
                <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <Layers className="w-8 h-8 text-slate-400 mx-auto" />
                  <h4 className="text-xs font-bold text-slate-800">No Variant Variations Defined</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    This item is managed as a standalone master SKU ({product.sku}). You can add size/color variants in the product editor.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: INVENTORY BY LOCATION */}
          {activeTab === 'inventory' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div>
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                    <Warehouse className="w-4 h-4 text-indigo-600" />
                    Stock by Location
                  </h3>
                  <p className="text-xs text-slate-500">
                    Real-time location breakdown across main warehouses and retail POS registers.
                  </p>
                </div>
                <span className="text-xs font-mono font-black text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-xl">
                  Global On-Hand: {product.stock} units
                </span>
              </div>

              {/* Stock Location Layout Requested */}
              <div className="p-4 bg-slate-900 text-white rounded-3xl space-y-3 font-mono border border-slate-800 shadow-md">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-800 flex justify-between">
                  <span>Location Name</span>
                  <span>On-Hand Quantity</span>
                </div>
                <div className="space-y-2 text-xs">
                  {locationsBreakdown.map((loc) => (
                    <div key={loc.id} className="flex justify-between items-center py-1 border-b border-slate-800/60 last:border-0">
                      <span className="text-slate-200 font-bold">{loc.name}</span>
                      <span className="text-emerald-400 font-extrabold text-sm">{loc.stock}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Detailed Location Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {locationsBreakdown.map((loc) => {
                  const LocIcon = loc.icon;
                  return (
                    <div key={loc.id} className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-2 hover:border-indigo-300 transition-all">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                            <LocIcon className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-xs font-extrabold text-slate-900 block">{loc.name}</span>
                            <span className="text-[10px] font-mono text-slate-500">{loc.code}</span>
                          </div>
                        </div>
                        <span className="text-lg font-black font-mono text-slate-900">{loc.stock} <span className="text-xs font-normal text-slate-500">units</span></span>
                      </div>
                      <p className="text-[11px] text-slate-500 border-t border-slate-200/60 pt-2">{loc.address}</p>
                    </div>
                  );
                })}
              </div>

              {/* Packaging Units & UOM Conversions */}
              {(() => {
                const packagingOpts = getPackagingUnitOptions(product);
                return (
                  <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                        <Package className="w-4 h-4 text-amber-700" />
                        Packaging Units & UOM Conversion Tiers
                      </span>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-amber-200 text-amber-900 rounded-md">
                        {formatStockInPackagingUnits(product)}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {packagingOpts.map((opt, idx) => (
                        <div key={idx} className="p-2.5 bg-white rounded-xl border border-amber-200/70 space-y-1">
                          <span className="text-[11px] font-bold text-slate-900 block truncate">{opt.unitName}</span>
                          <div className="flex justify-between items-center text-[10px] text-gray-500 font-mono">
                            <span>{opt.multiplier}x multiplier</span>
                            <span className="font-bold text-slate-900">{formatAmount(opt.price)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Batch / Lot Tracking */}
              <div className="pt-2">
                <BatchLotSection product={product} onUpdateProduct={onUpdateProduct} />
              </div>
            </div>
          )}

          {/* TAB 4: PRICING */}
          {activeTab === 'pricing' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div>
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-indigo-600" />
                    Multi-Channel Pricing & Margin Architecture
                  </h3>
                  <p className="text-xs text-slate-500">
                    Channel price lists, wholesale tiers, profit margin guards, and minimum floor rules.
                  </p>
                </div>
              </div>

              {/* 5-Channel Price List Matrix */}
              <div className="p-5 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl border border-slate-800 text-white space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-5 h-5 text-indigo-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-200">
                      Channel Price Lists Matrix
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 bg-indigo-500/30 border border-indigo-400/30 text-indigo-200 rounded-md">
                    5 Active Tiers
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  {(() => {
                    const priceMatrix = product.priceLists
                      ? priceListMapToItems(normalizePriceListMap(product.priceLists, product.price))
                      : generateDefaultPriceListMatrix(product.price, product.cost, product.wholesalePrice);

                    return priceMatrix.map((pl) => {
                      const badgeStyle = getPriceListBadgeStyle(pl.priceListName);
                      return (
                        <div key={pl.priceListId || pl.priceListName} className="bg-slate-900/90 border border-slate-800 p-3 rounded-2xl space-y-1.5">
                          <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded border inline-block ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}>
                            {pl.priceListName}
                          </span>
                          <div className="text-base font-black font-mono text-emerald-400 mt-1">
                            {formatAmount(pl.price)}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Cost Valuation & Floor Price Box */}
              {(() => {
                const valuation = calculateProductValuationCost(product);
                const minPrice = product.minimumPrice || 0;

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-900 border border-slate-800 text-white rounded-2xl space-y-2 shadow-md">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-emerald-300 tracking-wider flex items-center gap-1">
                          <Cpu className="w-4 h-4 text-emerald-400" />
                          Cost Valuation Method
                        </span>
                        <span className="text-[9px] font-mono font-bold px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded">
                          {valuation.method}
                        </span>
                      </div>
                      <div className="text-lg font-black font-mono text-emerald-400">
                        Unit Cost: {formatAmount(valuation.currentUnitCost)}
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {valuation.description} • Valuation: <strong>{formatAmount(valuation.totalInventoryValuation)}</strong>
                      </p>
                    </div>

                    <div className="p-4 bg-slate-900 border border-slate-800 text-white rounded-2xl space-y-2 shadow-md">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-amber-300 tracking-wider flex items-center gap-1">
                          <ShieldCheck className="w-4 h-4 text-amber-400" />
                          Minimum Floor Guardrail
                        </span>
                        <span className="text-[9px] font-mono font-bold px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-400/30 rounded">
                          Margin Protected
                        </span>
                      </div>
                      <div className="text-lg font-black font-mono text-amber-400">
                        Floor Price: {minPrice > 0 ? formatAmount(minPrice) : 'No floor set'}
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Cashiers cannot discount below floor without Manager PIN authorization.
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* TAB 5: MEDIA */}
          {activeTab === 'media' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div>
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-indigo-600" />
                    Product Media & Photo Assets ({uniqueMediaList.length} photos)
                  </h3>
                  <p className="text-xs text-slate-500">
                    High-resolution primary image, variant angle gallery, and storefront visual previews.
                  </p>
                </div>
              </div>

              {/* Main Preview Frame */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-8">
                  <div className="aspect-video rounded-3xl overflow-hidden bg-slate-100 border border-slate-200 shadow-md relative">
                    <img
                      src={uniqueMediaList[selectedMediaIndex] || product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-xs text-white text-xs font-bold px-3 py-1 rounded-xl">
                      Photo #{selectedMediaIndex + 1} of {uniqueMediaList.length}
                    </div>
                  </div>
                </div>

                {/* Media Thumbnails */}
                <div className="md:col-span-4 space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Asset Gallery</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {uniqueMediaList.map((imgUrl, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedMediaIndex(idx)}
                        className={`aspect-square rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                          selectedMediaIndex === idx ? 'border-indigo-600 ring-2 ring-indigo-600/30' : 'border-slate-200 opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img src={imgUrl} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: SPECIFICATIONS */}
          {activeTab === 'specifications' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div>
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    Technical Specifications & SEO Metadata
                  </h3>
                  <p className="text-xs text-slate-500">
                    Product dimensions, SEO slug, canonical URLs, and unit packaging tiers.
                  </p>
                </div>
              </div>

              {/* SEO Inspector */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <Search className="w-3.5 h-3.5 text-indigo-600" />
                    E-Commerce SEO Metadata
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 font-bold px-2 py-0.5 bg-slate-200 rounded-md">
                    Search Engine Inspector
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200 space-y-1">
                    <span className="text-[10px] font-bold uppercase text-slate-400">SEO Title</span>
                    <p className="font-semibold text-slate-800 truncate">
                      {product.ecommerce?.seoTitle || product.name}
                    </p>
                  </div>

                  <div className="p-2.5 bg-white rounded-xl border border-slate-200 space-y-1">
                    <span className="text-[10px] font-bold uppercase text-slate-400">URL Slug</span>
                    <p className="font-mono text-indigo-700 font-bold truncate">
                      /products/{product.ecommerce?.slug || product.id}
                    </p>
                  </div>

                  <div className="p-2.5 bg-white rounded-xl border border-slate-200 space-y-1 sm:col-span-2">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Canonical URL</span>
                    <p className="font-mono text-slate-600 text-[11px] truncate">
                      {product.ecommerce?.canonicalUrl || `https://store.com/products/${product.ecommerce?.slug || product.id}`}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: SALES */}
          {activeTab === 'sales' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div>
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                    <ShoppingBag className="w-4 h-4 text-indigo-600" />
                    Sales History & Storefront Performance
                  </h3>
                  <p className="text-xs text-slate-500">
                    Recent customer purchases, order channels, revenue generation, and sales logs.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl">
                    Total Volume: 142 units sold
                  </span>
                </div>
              </div>

              {/* Sales Channels Status Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-2xl border bg-emerald-50 border-emerald-200 text-emerald-900 space-y-1 text-center">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">POS Register</span>
                  <span className="text-xs font-black font-mono inline-block px-2 py-0.5 rounded bg-emerald-600 text-white">78 Sold</span>
                </div>

                <div className="p-3 rounded-2xl border bg-indigo-50 border-indigo-200 text-indigo-900 space-y-1 text-center">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">E-Commerce</span>
                  <span className="text-xs font-black font-mono inline-block px-2 py-0.5 rounded bg-indigo-600 text-white">44 Sold</span>
                </div>

                <div className="p-3 rounded-2xl border bg-purple-50 border-purple-200 text-purple-900 space-y-1 text-center">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">Mobile App</span>
                  <span className="text-xs font-black font-mono inline-block px-2 py-0.5 rounded bg-purple-600 text-white">12 Sold</span>
                </div>

                <div className="p-3 rounded-2xl border bg-amber-50 border-amber-200 text-amber-900 space-y-1 text-center">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">B2B Wholesale</span>
                  <span className="text-xs font-black font-mono inline-block px-2 py-0.5 rounded bg-amber-600 text-white">8 Sold</span>
                </div>
              </div>

              {/* Sales Transactions History Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
                <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-800">
                  <span>Sales Activity Transactions</span>
                  <span className="text-[11px] font-mono text-slate-500 font-normal">Last 30 Days</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                        <th className="px-3.5 py-2.5">Order ID</th>
                        <th className="px-3.5 py-2.5">Date & Time</th>
                        <th className="px-3.5 py-2.5">Channel</th>
                        <th className="px-3.5 py-2.5">Customer / Cashier</th>
                        <th className="px-3.5 py-2.5 text-center">Qty</th>
                        <th className="px-3.5 py-2.5 text-right">Unit Price</th>
                        <th className="px-3.5 py-2.5 text-right">Total Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      <tr className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-3.5 py-2.5 font-mono font-bold text-indigo-600">ORD-2026-8812</td>
                        <td className="px-3.5 py-2.5 text-[11px] text-slate-500">Today, 15:42</td>
                        <td className="px-3.5 py-2.5">
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 font-bold border border-emerald-200 rounded text-[10px]">
                            POS Register
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5 font-semibold text-slate-800">Walk-in Customer (Reg 2)</td>
                        <td className="px-3.5 py-2.5 text-center font-bold">2</td>
                        <td className="px-3.5 py-2.5 text-right font-mono">{formatAmount(product.price)}</td>
                        <td className="px-3.5 py-2.5 text-right font-mono font-extrabold text-emerald-700">{formatAmount(product.price * 2)}</td>
                      </tr>
                      <tr className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-3.5 py-2.5 font-mono font-bold text-indigo-600">ORD-2026-8790</td>
                        <td className="px-3.5 py-2.5 text-[11px] text-slate-500">Today, 11:20</td>
                        <td className="px-3.5 py-2.5">
                          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-800 font-bold border border-indigo-200 rounded text-[10px]">
                            E-Commerce
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5 font-semibold text-slate-800">Sarah Jenkins</td>
                        <td className="px-3.5 py-2.5 text-center font-bold">1</td>
                        <td className="px-3.5 py-2.5 text-right font-mono">{formatAmount(product.price)}</td>
                        <td className="px-3.5 py-2.5 text-right font-mono font-extrabold text-emerald-700">{formatAmount(product.price)}</td>
                      </tr>
                      <tr className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-3.5 py-2.5 font-mono font-bold text-indigo-600">ORD-2026-8654</td>
                        <td className="px-3.5 py-2.5 text-[11px] text-slate-500">Yesterday, 18:05</td>
                        <td className="px-3.5 py-2.5">
                          <span className="px-2 py-0.5 bg-amber-50 text-amber-800 font-bold border border-amber-200 rounded text-[10px]">
                            B2B Wholesale
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5 font-semibold text-slate-800">Apex Sports Outfitters</td>
                        <td className="px-3.5 py-2.5 text-center font-bold">12</td>
                        <td className="px-3.5 py-2.5 text-right font-mono">{formatAmount(product.wholesalePrice || product.price * 0.85)}</td>
                        <td className="px-3.5 py-2.5 text-right font-mono font-extrabold text-emerald-700">{formatAmount((product.wholesalePrice || product.price * 0.85) * 12)}</td>
                      </tr>
                      <tr className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-3.5 py-2.5 font-mono font-bold text-indigo-600">ORD-2026-8510</td>
                        <td className="px-3.5 py-2.5 text-[11px] text-slate-500">2026-08-19</td>
                        <td className="px-3.5 py-2.5">
                          <span className="px-2 py-0.5 bg-purple-50 text-purple-800 font-bold border border-purple-200 rounded text-[10px]">
                            Mobile App
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5 font-semibold text-slate-800">Marcus Vance</td>
                        <td className="px-3.5 py-2.5 text-center font-bold">1</td>
                        <td className="px-3.5 py-2.5 text-right font-mono">{formatAmount(product.price)}</td>
                        <td className="px-3.5 py-2.5 text-right font-mono font-extrabold text-emerald-700">{formatAmount(product.price)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* POS Scanner Pipeline Inspector */}
              <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-3 shadow-inner">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Barcode className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                      POS Barcode Resolution Pipeline Inspector
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    barcode → variant → product → price → inventory
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={testScanCode}
                    onChange={(e) => setTestScanCode(e.target.value)}
                    placeholder="Type or scan EAN / UPC / QR / SKU..."
                    className="flex-1 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs font-mono text-emerald-300 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setTestScanCode('890123456789')}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-mono font-bold text-slate-300 rounded-xl border border-slate-700 cursor-pointer"
                  >
                    Sample Code
                  </button>
                </div>

                {testResolution ? (
                  <div className="p-3 bg-slate-950 rounded-xl border border-emerald-500/30 text-xs font-mono space-y-1.5 text-slate-300">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>RESOLVED MATCH: {testResolution.title}</span>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {/* TAB 8: PURCHASES */}
          {activeTab === 'purchases' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div>
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                    <Truck className="w-4 h-4 text-indigo-600" />
                    Purchase History & Supplier Sourcing
                  </h3>
                  <p className="text-xs text-slate-500">
                    Supplier purchase orders, inbound shipments, landed cost logs, and lead times.
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-xl">
                  Primary Vendor: {product.supplierName || 'Standard Supply Vendor'}
                </span>
              </div>

              {/* Vendor Sourcing Telemetry Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Reorder Safety Point</span>
                  <div className="text-base font-black font-mono text-slate-900">{product.reorderPoint} units</div>
                  <span className="text-[10px] text-slate-500">Auto-triggers PO proposal</span>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Purchase Cost / Unit</span>
                  <div className="text-base font-black font-mono text-slate-900">{formatAmount(product.cost)}</div>
                  <span className="text-[10px] text-slate-500">Landed FIFO cost basis</span>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Avg Supplier Lead Time</span>
                  <div className="text-base font-black font-mono text-slate-900">4 Business Days</div>
                  <span className="text-[10px] text-emerald-600 font-bold">Express Ground Logistics</span>
                </div>
              </div>

              {/* Purchase Orders Log Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
                <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-800">
                  <span>Purchase Orders & Replenishment History</span>
                  <span className="text-[11px] font-mono text-indigo-700">Vendor ID: SUP-2041</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                        <th className="px-3.5 py-2.5">PO Number</th>
                        <th className="px-3.5 py-2.5">PO Date</th>
                        <th className="px-3.5 py-2.5">Supplier Name</th>
                        <th className="px-3.5 py-2.5 text-center">Qty Received</th>
                        <th className="px-3.5 py-2.5 text-right">Unit Cost</th>
                        <th className="px-3.5 py-2.5 text-right">Total Cost</th>
                        <th className="px-3.5 py-2.5 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      <tr className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-3.5 py-2.5 font-mono font-bold text-indigo-600">PO-2026-0419</td>
                        <td className="px-3.5 py-2.5 text-[11px] text-slate-500">2026-08-10</td>
                        <td className="px-3.5 py-2.5 font-semibold text-slate-800">{product.supplierName || 'Global Distributors Ltd.'}</td>
                        <td className="px-3.5 py-2.5 text-center font-extrabold text-slate-900">50 units</td>
                        <td className="px-3.5 py-2.5 text-right font-mono">{formatAmount(product.cost)}</td>
                        <td className="px-3.5 py-2.5 text-right font-mono font-bold text-slate-900">{formatAmount(product.cost * 50)}</td>
                        <td className="px-3.5 py-2.5 text-center">
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold border border-emerald-300 rounded text-[10px]">
                            RECEIVED
                          </span>
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-3.5 py-2.5 font-mono font-bold text-indigo-600">PO-2026-0288</td>
                        <td className="px-3.5 py-2.5 text-[11px] text-slate-500">2026-07-02</td>
                        <td className="px-3.5 py-2.5 font-semibold text-slate-800">{product.supplierName || 'Global Distributors Ltd.'}</td>
                        <td className="px-3.5 py-2.5 text-center font-extrabold text-slate-900">100 units</td>
                        <td className="px-3.5 py-2.5 text-right font-mono">{formatAmount(product.cost)}</td>
                        <td className="px-3.5 py-2.5 text-right font-mono font-bold text-slate-900">{formatAmount(product.cost * 100)}</td>
                        <td className="px-3.5 py-2.5 text-center">
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold border border-emerald-300 rounded text-[10px]">
                            RECEIVED
                          </span>
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-3.5 py-2.5 font-mono font-bold text-indigo-600">PO-2026-0105</td>
                        <td className="px-3.5 py-2.5 text-[11px] text-slate-500">2026-05-18</td>
                        <td className="px-3.5 py-2.5 font-semibold text-slate-800">{product.supplierName || 'Global Distributors Ltd.'}</td>
                        <td className="px-3.5 py-2.5 text-center font-extrabold text-slate-900">75 units</td>
                        <td className="px-3.5 py-2.5 text-right font-mono">{formatAmount(product.cost * 0.98)}</td>
                        <td className="px-3.5 py-2.5 text-right font-mono font-bold text-slate-900">{formatAmount(product.cost * 0.98 * 75)}</td>
                        <td className="px-3.5 py-2.5 text-center">
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold border border-emerald-300 rounded text-[10px]">
                            RECEIVED
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 9: HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div>
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                    <History className="w-4 h-4 text-indigo-600" />
                    Audit Trail & Inventory Movement History
                  </h3>
                  <p className="text-xs text-slate-500">
                    Complete immutable log of inventory adjustments, price list updates, and sales movements.
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-xl">
                  Audited System ID: {product.id}
                </span>
              </div>

              {/* Timeline Audit Logs List */}
              <div className="space-y-3 pl-1">
                <div className="flex gap-3 items-start relative pb-3 before:absolute before:left-3.5 before:top-7 before:bottom-0 before:w-0.5 before:bg-slate-200">
                  <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-full shrink-0 z-10">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex-1 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">Stock Count Verified & Rebalanced</span>
                      <span className="text-[10px] font-mono text-slate-400">Today, 14:30 • Admin User</span>
                    </div>
                    <p className="text-slate-600">Inventory balance verified across Main Warehouse (50), Branch A (12), Branch B (8), POS Store (4). Total balance: <strong>{product.stock} units</strong>.</p>
                  </div>
                </div>

                <div className="flex gap-3 items-start relative pb-3 before:absolute before:left-3.5 before:top-7 before:bottom-0 before:w-0.5 before:bg-slate-200">
                  <div className="p-1.5 bg-indigo-100 text-indigo-700 rounded-full shrink-0 z-10">
                    <Tag className="w-4 h-4" />
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex-1 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">Multi-Channel Price Matrix Adjusted</span>
                      <span className="text-[10px] font-mono text-slate-400">Yesterday, 09:15 • Store Manager</span>
                    </div>
                    <p className="text-slate-600">Updated primary MSRP to {formatAmount(product.price)} and synchronized Wholesale and Member price tiers.</p>
                  </div>
                </div>

                <div className="flex gap-3 items-start relative pb-3 before:absolute before:left-3.5 before:top-7 before:bottom-0 before:w-0.5 before:bg-slate-200">
                  <div className="p-1.5 bg-blue-100 text-blue-700 rounded-full shrink-0 z-10">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex-1 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">Inbound Shipment Received (PO-2026-0419)</span>
                      <span className="text-[10px] font-mono text-slate-400">2026-08-10 • Inventory Clerk</span>
                    </div>
                    <p className="text-slate-600">Received +50 units from primary vendor. Cost basis locked at {formatAmount(product.cost)} per unit under FIFO valuation.</p>
                  </div>
                </div>

                <div className="flex gap-3 items-start relative">
                  <div className="p-1.5 bg-purple-100 text-purple-700 rounded-full shrink-0 z-10">
                    <Barcode className="w-4 h-4" />
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl flex-1 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">SKU & Symbologies Provisioned</span>
                      <span className="text-[10px] font-mono text-slate-400">2026-06-01 • System Auto-Gen</span>
                    </div>
                    <p className="text-slate-600">Master SKU <strong>{product.sku}</strong> and EAN/UPC barcodes generated and attached to barcode printing queue.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 10: RELATIONSHIPS */}
          {activeTab === 'relationships' && (() => {
            const mlRelated = runSmartMatchEngine(product, INITIAL_PRODUCTS, 'related', undefined, 3);
            const mlUpsell = runSmartMatchEngine(product, INITIAL_PRODUCTS, 'upsell', undefined, 3);
            const mlCrossSell = runSmartMatchEngine(product, INITIAL_PRODUCTS, 'crossSell', undefined, 3);
            const mlBoughtTogether = runSmartMatchEngine(product, INITIAL_PRODUCTS, 'boughtTogether', undefined, 3);

            return (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                      <ArrowRightLeft className="w-4 h-4 text-indigo-600" />
                      Product Relationships & ML Smart-Match Engine
                    </h3>
                    <p className="text-xs text-slate-500">
                      Configured cross-sells, upsells, replacement models, and automated ML suggestions based on taxonomy and purchase history.
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-xl flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" /> ML Smart-Match Active
                  </span>
                </div>

                {/* Assigned Summary Stats */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">Assigned Relationship Tiers</span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="p-2.5 bg-white border border-slate-200 rounded-xl">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Related</span>
                      <span className="font-mono font-bold text-indigo-700">{product.relationships?.relatedProductIds?.length || 0} items</span>
                    </div>
                    <div className="p-2.5 bg-white border border-slate-200 rounded-xl">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Upsell</span>
                      <span className="font-mono font-bold text-purple-700">{product.relationships?.upsellProductIds?.length || 0} items</span>
                    </div>
                    <div className="p-2.5 bg-white border border-slate-200 rounded-xl">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Bought Together</span>
                      <span className="font-mono font-bold text-emerald-700">{product.relationships?.boughtTogetherProductIds?.length || 0} items</span>
                    </div>
                    <div className="p-2.5 bg-white border border-slate-200 rounded-xl">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Cross-Sell</span>
                      <span className="font-mono font-bold text-rose-700">{product.relationships?.crossSellProductIds?.length || 0} items</span>
                    </div>
                  </div>
                </div>

                {/* ML Smart-Match AI Recommendations for Product Workspace */}
                <div className="space-y-3">
                  <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Cpu className="w-4 h-4 text-indigo-600" />
                    Top ML Smart-Match Recommendations
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* ML Upsells Card */}
                    <div className="p-3.5 bg-gradient-to-br from-purple-50/50 to-white border border-purple-200 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-purple-900 flex items-center gap-1">
                          <ArrowUpRight className="w-3.5 h-3.5 text-purple-600" /> Top ML Upsell Recommendations
                        </span>
                        <span className="text-[10px] font-mono font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                          Target Ratio: 1.15x - 2.2x
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {mlUpsell.matches.map(m => (
                          <div key={m.product.id} className="p-2 bg-white border border-purple-100 rounded-xl flex items-center justify-between text-xs">
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 truncate">{m.product.name}</p>
                              <p className="text-[10px] text-slate-500 font-mono">${m.product.price.toFixed(2)} • {m.reasons[0] || 'Higher Tier'}</p>
                            </div>
                            <span className="text-[10px] font-mono font-extrabold text-purple-800 bg-purple-100 px-2 py-0.5 rounded">
                              {m.score}% ML Score
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* ML Bought Together Card */}
                    <div className="p-3.5 bg-gradient-to-br from-emerald-50/50 to-white border border-emerald-200 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-emerald-900 flex items-center gap-1">
                          <ShoppingBag className="w-3.5 h-3.5 text-emerald-600" /> Frequently Bought Together (ML)
                        </span>
                        <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                          Co-Purchase Pattern
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {mlBoughtTogether.matches.map(m => (
                          <div key={m.product.id} className="p-2 bg-white border border-emerald-100 rounded-xl flex items-center justify-between text-xs">
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 truncate">{m.product.name}</p>
                              <p className="text-[10px] text-slate-500 font-mono">${m.product.price.toFixed(2)} • {m.reasons[0] || 'Frequent Bundle'}</p>
                            </div>
                            <span className="text-[10px] font-mono font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                              {m.score}% ML Score
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

        </div>

        {/* Workspace Footer Action Bar */}
        <div className="px-5 sm:px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleCopy(product.sku, 'sku-btn')}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-2xs"
            >
              {copiedField === 'sku-btn' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-600 font-bold">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy SKU</span>
                </>
              )}
            </button>

            {onOpenBarcodeModal && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenBarcodeModal(product);
                }}
                className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-indigo-50 text-indigo-700 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
              >
                <Barcode className="w-3.5 h-3.5" />
                <span>Barcode Studio</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {canEdit && onEditProduct && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEditProduct(product);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Full Record</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer"
            >
              Close Workspace
            </button>
          </div>
        </div>

      </div>

      <VariantPriceListsModal
        open={editingVariantIndex !== null}
        product={product}
        initialVariantIndex={editingVariantIndex ?? 0}
        onClose={() => setEditingVariantIndex(null)}
        onSave={async (updatedProduct) => {
          if (onUpdateProduct) {
            onUpdateProduct(updatedProduct);
          }
        }}
        canEdit={canEdit}
      />
    </div>
  );
}
