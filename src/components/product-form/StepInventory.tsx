import React, { useState, useMemo } from 'react';
import { 
  Barcode, ScanLine, RefreshCw, MapPin, AlertCircle, ShieldAlert, 
  CalendarClock, QrCode, Tag, Check, HelpCircle, Cpu, Gift, Layers, Sparkles, Package,
  Camera, Zap, Box, CheckCircle2, ShieldCheck, Eye, Sliders, AlertTriangle, Plus, Trash2, ListChecks
} from 'lucide-react';
import { CompositeComponentItem, BundleKitItem, BulkPackagingConfig, PackagingUnitsConfig, Product, SerialNumberUnit } from '../../types';
import { useCurrency } from '../../context/CurrencyContext';
import MultiUOMManager from './MultiUOMManager';
import SerialBatchVisionScannerModal from '../SerialBatchVisionScannerModal';
import { validateSerialNumber, validateBatchNumber } from '../../hooks/useComputerVisionScanner';
import { createSerialUnit, parseBatchSerialNumbers } from '../../utils/serialNumberManager';
import {
  generateUniqueSku,
  generateSkuFromTemplate,
  isSkuUnique,
  SKU_TEMPLATE_PRESETS
} from '../../utils/skuGenerator';

interface StepInventoryProps {
  sku: string;
  setSku: (val: string) => void;
  barcode: string;
  setBarcode: (val: string) => void;
  qrCode: string;
  setQrCode: (val: string) => void;
  stock: number;
  setStock: (val: number) => void;
  reorderPoint: number;
  setReorderPoint: (val: number) => void;
  location: 'Warehouse' | 'Store Shelf' | 'Fulfillment Center';
  setLocation: (val: 'Warehouse' | 'Store Shelf' | 'Fulfillment Center') => void;
  unit: string;
  setUnit: (val: string) => void;
  trackStock: boolean;
  setTrackStock: (val: boolean) => void;
  trackSerial: boolean;
  setTrackSerial: (val: boolean) => void;
  serialNumber: string;
  setSerialNumber: (val: string) => void;
  serialUnits?: SerialNumberUnit[];
  setSerialUnits?: (units: SerialNumberUnit[]) => void;
  trackBatch: boolean;
  setTrackBatch: (val: boolean) => void;
  batchNumber: string;
  setBatchNumber: (val: string) => void;
  trackExpiry: boolean;
  setTrackExpiry: (val: boolean) => void;
  expiryDate: string;
  setExpiryDate: (val: string) => void;
  onOpenLaserScanner: (target: 'barcode' | 'sku' | 'qr' | 'serial' | 'batch') => void;
  productType?: string;
  hasMultiUOM?: boolean;
  setHasMultiUOM?: (val: boolean) => void;
  packagingUnits?: PackagingUnitsConfig;
  setPackagingUnits?: React.Dispatch<React.SetStateAction<PackagingUnitsConfig>>;
  compositeComponents?: CompositeComponentItem[];
  bundleKitItems?: BundleKitItem[];
  bulkPackaging?: BulkPackagingConfig;
  setBulkPackaging?: (val: BulkPackagingConfig) => void;
  cost?: number;
  setCost?: (val: number) => void;
  price?: number;
  setPrice?: (val: number) => void;
  brand?: string;
  productName?: string;
  category?: string;
  allProducts?: Product[];
  currentProductId?: string;
  errors: Record<string, string>;
}

const COMMON_UNITS = [
  'pcs (Pieces)', 'tea bag (Tea Bag)', 'box (Box)', 'kg (Kilograms)', 'g (Grams)', 
  'm (Meters)', 'liters (Liters)', 'pack (Pack)', 'tablet (Tablet)', 'sachet (Sachet)'
];

export default function StepInventory({
  sku,
  setSku,
  barcode,
  setBarcode,
  qrCode,
  setQrCode,
  stock,
  setStock,
  reorderPoint,
  setReorderPoint,
  location,
  setLocation,
  unit,
  setUnit,
  trackStock,
  setTrackStock,
  trackSerial,
  setTrackSerial,
  serialNumber,
  setSerialNumber,
  serialUnits = [],
  setSerialUnits = () => {},
  trackBatch,
  setTrackBatch,
  batchNumber,
  setBatchNumber,
  trackExpiry,
  setTrackExpiry,
  expiryDate,
  setExpiryDate,
  onOpenLaserScanner,
  productType = 'Standard',
  hasMultiUOM = false,
  setHasMultiUOM = () => {},
  packagingUnits = { base_unit: 'piece', units: [] },
  setPackagingUnits = () => {},
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
  cost = 0,
  setCost = () => {},
  price = 0,
  setPrice = () => {},
  brand = '',
  productName = '',
  category = '',
  allProducts = [],
  currentProductId,
  errors
}: StepInventoryProps) {
  const { formatAmount } = useCurrency();

  // State for Computer Vision Serial & Batch Scanner Modal
  const [isVisionScannerOpen, setIsVisionScannerOpen] = useState(false);
  const [visionTargetMode, setVisionTargetMode] = useState<'auto' | 'serial' | 'batch'>('auto');
  const [recentlyScannedToast, setRecentlyScannedToast] = useState<string | null>(null);
  const [selectedSkuTemplate, setSelectedSkuTemplate] = useState<string>('{BRAND}-{PRODUCT}-{COLOR}-{SIZE}');
  const [customSkuTemplate, setCustomSkuTemplate] = useState<string>('');
  const [batchSerialInput, setBatchSerialInput] = useState<string>('');

  const handleAddBatchSerialUnits = () => {
    const parsed = parseBatchSerialNumbers(batchSerialInput);
    if (parsed.length === 0) return;

    const existingSerials = new Set(serialUnits.map(u => u.serialNumber.toUpperCase()));
    const newUnits: SerialNumberUnit[] = [];

    parsed.forEach(sn => {
      if (!existingSerials.has(sn)) {
        newUnits.push(createSerialUnit(currentProductId || 'temp-prod', sn));
        existingSerials.add(sn);
      }
    });

    if (newUnits.length > 0) {
      setSerialUnits([...serialUnits, ...newUnits]);
      setBatchSerialInput('');
      if (!serialNumber) {
        setSerialNumber(newUnits[0].serialNumber);
      }
    }
  };

  const handleRemoveSerialUnit = (id: string) => {
    setSerialUnits(serialUnits.filter(u => u.id !== id));
  };

  const safeCompositeComponents = Array.isArray(compositeComponents) ? compositeComponents : [];
  const safeBundleKitItems = Array.isArray(bundleKitItems) ? bundleKitItems : [];
  const safeErrors = errors || {};

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

  const activeTemplate = selectedSkuTemplate === 'custom' ? customSkuTemplate : selectedSkuTemplate;

  const handleAutoGenerateSku = () => {
    const generated = generateUniqueSku(
      activeTemplate || '{BRAND}-{PRODUCT}-{SEQ}',
      {
        brand: brand || 'NIKE',
        productName: productName || 'AIR MAX 270',
        category: category || 'Apparel',
        sequence: Math.floor(100 + Math.random() * 900)
      },
      allProducts || [],
      { currentProductId }
    );
    setSku(generated);
  };

  // Real-time global uniqueness check across products & variants
  const uniquenessStatus = useMemo(() => {
    if (!sku || !sku.trim()) return null;
    return isSkuUnique(sku, allProducts || [], { currentProductId });
  }, [sku, allProducts, currentProductId]);

  const handleAutoGenerateBarcode = () => {
    const random = Math.floor(100000000000 + Math.random() * 900000000000);
    setBarcode(`${random}`);
  };

  const handleAutoGenerateQr = () => {
    const code = sku || barcode || `ITEM-${Math.floor(1000 + Math.random() * 9000)}`;
    setQrCode(`QR-${code}`);
  };

  const openVisionScanner = (mode: 'auto' | 'serial' | 'batch' = 'auto') => {
    setVisionTargetMode(mode);
    setIsVisionScannerOpen(true);
  };

  const handleApplyVisionData = (data: {
    serialNumber?: string;
    batchNumber?: string;
    expiryDate?: string;
    enableSerialTracking?: boolean;
    enableBatchTracking?: boolean;
    enableExpiryTracking?: boolean;
  }) => {
    let message = '';
    if (data.serialNumber) {
      setSerialNumber(data.serialNumber);
      setTrackSerial(true);
      message += `Serial: ${data.serialNumber} `;
    }
    if (data.batchNumber) {
      setBatchNumber(data.batchNumber);
      setTrackBatch(true);
      message += `Batch: ${data.batchNumber} `;
    }
    if (data.expiryDate) {
      setExpiryDate(data.expiryDate);
      setTrackExpiry(true);
    }
    if (message) {
      setRecentlyScannedToast(message.trim());
      setTimeout(() => setRecentlyScannedToast(null), 4000);
    }
  };

  const serialValidation = serialNumber ? validateSerialNumber(serialNumber) : null;
  const batchValidation = batchNumber ? validateBatchNumber(batchNumber) : null;

  return (
    <div className="space-y-6">
      {/* Computer Vision Serial/Batch Scanner Modal */}
      <SerialBatchVisionScannerModal
        isOpen={isVisionScannerOpen}
        onClose={() => setIsVisionScannerOpen(false)}
        initialTargetMode={visionTargetMode}
        currentSerial={serialNumber}
        currentBatch={batchNumber}
        currentExpiry={expiryDate}
        onApplyData={handleApplyVisionData}
      />

      {/* Section Header with 'Scan Serial/Batch' Action */}
      <div className="bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border border-indigo-500/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 border border-indigo-400/40 text-white flex items-center justify-center shrink-0 shadow-sm font-bold text-sm">
            2
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-white">Inventory Identity & Tracking Rules</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/30 text-indigo-300 border border-indigo-400/30 flex items-center gap-1">
                <Cpu className="w-3 h-3 text-indigo-400" /> Vision Vision AI Enabled
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Configure Unique Identifiers (SKU, Barcode, QR), batching, serial numbers, and reorder controls.
            </p>
          </div>
        </div>

        {/* Primary 'Scan Serial/Batch' Device Camera Button */}
        <button
          type="button"
          onClick={() => openVisionScanner('auto')}
          className="w-full sm:w-auto px-4 py-2.5 bg-linear-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white text-xs font-bold rounded-xl shadow-lg border border-indigo-300/30 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 shrink-0"
        >
          <Camera className="w-4 h-4 text-indigo-100 animate-pulse" />
          <span>Scan Serial/Batch</span>
        </button>
      </div>

      {/* Scanned Confirmation Toast */}
      {recentlyScannedToast && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3 flex items-center justify-between text-xs text-emerald-800 font-semibold shadow-xs animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Captured & Validated directly into record: <strong>{recentlyScannedToast}</strong></span>
          </div>
          <button
            type="button"
            onClick={() => setRecentlyScannedToast(null)}
            className="text-emerald-600 hover:text-emerald-900"
          >
            ✕
          </button>
        </div>
      )}

      {/* Symbology & Identity Cards */}
      <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">SKU Generator Template Rule</span>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selectedSkuTemplate}
              onChange={(e) => setSelectedSkuTemplate(e.target.value)}
              className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            >
              {SKU_TEMPLATE_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.template}>
                  {preset.label} (e.g. {preset.example})
                </option>
              ))}
              <option value="custom">Custom Template...</option>
            </select>
            {selectedSkuTemplate === 'custom' && (
              <input
                type="text"
                value={customSkuTemplate}
                onChange={(e) => setCustomSkuTemplate(e.target.value)}
                placeholder="{BRAND}-{PRODUCT}-{SEQ}"
                className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono w-40"
              />
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* SKU */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Primary SKU <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={handleAutoGenerateSku}
                className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded-md transition-colors"
              >
                <RefreshCw className="w-2.5 h-2.5" /> Auto SKU ({activeTemplate.replace(/\{|\}/g, '')})
              </button>
            </div>
            <div className="relative">
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="e.g. NK-AM270-BLK-42"
                className={`w-full pl-9 pr-8 py-2.5 bg-white border ${
                  safeErrors.sku || (uniquenessStatus && !uniquenessStatus.isUnique)
                    ? 'border-rose-500 focus:ring-rose-200'
                    : 'border-slate-200 focus:ring-indigo-200'
                } rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:border-indigo-500 transition-all`}
              />
              <Tag className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              <button
                type="button"
                onClick={() => onOpenLaserScanner('sku')}
                title="Scan with Camera Laser"
                className="absolute right-2.5 top-2.5 text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                <ScanLine className="w-4 h-4" />
              </button>
            </div>

            {/* Live Uniqueness Indicator Badge */}
            {uniquenessStatus && (
              <div className="mt-1">
                {uniquenessStatus.isUnique ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold font-mono">
                    <Check className="w-3 h-3 text-emerald-600" />
                    Globally Unique SKU
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold font-mono">
                    <AlertTriangle className="w-3 h-3 text-rose-600" />
                    Duplicate SKU! Conflicts with "{uniquenessStatus.conflictingProduct?.name}"
                  </span>
                )}
              </div>
            )}

            {safeErrors.sku && <p className="text-[11px] text-rose-500 font-medium">{safeErrors.sku}</p>}
          </div>

        {/* Barcode */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Barcode / EAN-13
            </label>
            <button
              type="button"
              onClick={handleAutoGenerateBarcode}
              className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-2.5 h-2.5" /> Auto EAN
            </button>
          </div>
          <div className="relative">
            <input
              type="text"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="e.g. 7891234567890"
              className="w-full pl-9 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 transition-all"
            />
            <Barcode className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
            <button
              type="button"
              onClick={() => onOpenLaserScanner('barcode')}
              title="Scan with Camera Laser"
              className="absolute right-2.5 top-2.5 text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              <ScanLine className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* QR Code */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              QR Symbology Code
            </label>
            <button
              type="button"
              onClick={handleAutoGenerateQr}
              className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-2.5 h-2.5" /> Auto QR
            </button>
          </div>
          <div className="relative">
            <input
              type="text"
              value={qrCode}
              onChange={(e) => setQrCode(e.target.value)}
              placeholder="e.g. QR-88421"
              className="w-full pl-9 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 transition-all"
            />
            <QrCode className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
          </div>
        </div>
      </div>
    </div>

      {/* Composite BOM Inventory Assembly Control Banner */}
      {productType === 'Composite' && (
        <div className="bg-indigo-900 text-white rounded-2xl p-5 space-y-4 shadow-md">
          <div className="flex items-start justify-between gap-3 border-b border-indigo-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-700/80 border border-indigo-500/50 flex items-center justify-center text-white shrink-0">
                <Cpu className="w-4 h-4 text-indigo-200" />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                  Composite Product — Assembly Inventory Model
                </h4>
                <p className="text-[11px] text-indigo-200 mt-0.5">
                  Stock is calculated dynamically from underlying BOM sub-components ({safeCompositeComponents.length} items configured).
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-indigo-800/80 border border-indigo-600 text-[10px] font-mono font-bold text-indigo-100 shrink-0">
              Auto-Deduct BOM
            </span>
          </div>

          {safeCompositeComponents.length > 0 ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {safeCompositeComponents.map((comp, idx) => (
                  <div key={idx} className="bg-indigo-950/60 border border-indigo-800/60 rounded-xl p-2.5">
                    <span className="text-[10px] text-indigo-300 font-medium block truncate">{comp.name || 'Component'}</span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs font-mono font-bold text-white">{comp.quantity || 1}x / assembly</span>
                      <span className="text-[10px] font-mono text-indigo-400">{formatAmount(comp.unitCost || 0)}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-indigo-800/60 text-xs">
                <p className="text-[11px] text-indigo-200">
                  ⚡ Selling 1 Composite unit will deduct component quantities automatically at checkout.
                </p>
                <button
                  type="button"
                  onClick={() => setStock(25)}
                  className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Set Initial Stock to 25 Units
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-indigo-950/60 border border-indigo-800/60 rounded-xl p-3 text-xs text-indigo-200">
              ⚠️ No BOM sub-components defined yet. Return to Step 2 (Variants & Architecture) to add component items.
            </div>
          )}
        </div>
      )}

      {/* Bundle / Kit Pack Inventory Control Banner */}
      {productType === 'Bundle' && (
        <div className="bg-emerald-900 text-white rounded-2xl p-5 space-y-4 shadow-md">
          <div className="flex items-start justify-between gap-3 border-b border-emerald-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-700/80 border border-emerald-500/50 flex items-center justify-center text-white shrink-0">
                <Gift className="w-4 h-4 text-emerald-200" />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                  Bundle / Kit Pack — Inventory Deduction Rules
                </h4>
                <p className="text-[11px] text-emerald-200 mt-0.5">
                  Pack contains {safeBundleKitItems.length} bundled item types sold as a single unified SKU.
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-800/80 border border-emerald-600 text-[10px] font-mono font-bold text-emerald-100 shrink-0">
              Kit Pack Rules
            </span>
          </div>

          {safeBundleKitItems.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {safeBundleKitItems.map((item, idx) => (
                <div key={idx} className="bg-emerald-950/60 border border-emerald-800/60 rounded-xl p-2.5">
                  <span className="text-[10px] text-emerald-300 font-medium block truncate">{item.name || 'Item'}</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs font-mono font-bold text-white">{item.quantity || 1}x in kit</span>
                    <span className="text-[10px] font-mono text-emerald-400">{formatAmount(item.unitPrice || 0)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Multiple Units of Measure (Multi-UOM) & Pack Breakdown Configurator */}
      <MultiUOMManager
        hasMultiUOM={hasMultiUOM}
        setHasMultiUOM={setHasMultiUOM}
        packagingUnits={packagingUnits}
        setPackagingUnits={setPackagingUnits}
        bulkPackaging={bulkPackaging}
        setBulkPackaging={setBulkPackaging}
        baseUnit={unit}
        setBaseUnit={setUnit}
        baseCost={cost}
        setBaseCost={setCost}
        basePrice={price}
        setBasePrice={setPrice}
        stock={stock}
        setStock={setStock}
      />

      {/* Physical Stock & Reorder Levels */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-4">
        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
          <MapPin className="w-4 h-4 text-indigo-600" />
          Stock Levels & Fulfillment Location
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Stock Qty */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              On-Hand Quantity
            </label>
            <input
              type="number"
              value={stock}
              onChange={(e) => setStock(Math.max(0, Number(e.target.value)))}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500"
            />
          </div>

          {/* Reorder Threshold */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Reorder Point (Safety)
            </label>
            <input
              type="number"
              value={reorderPoint}
              onChange={(e) => setReorderPoint(Math.max(0, Number(e.target.value)))}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-amber-700 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500"
            />
          </div>

          {/* Unit of Measure */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Unit of Measure
            </label>
            <input
              type="text"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              list="units_preset_list"
              placeholder="e.g. pcs, box, kg"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500"
            />
            <datalist id="units_preset_list">
              {COMMON_UNITS.map((u) => (
                <option key={u} value={u.split(' ')[0]} />
              ))}
            </datalist>
          </div>

          {/* Storage Location */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Default Location
            </label>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-200 cursor-pointer"
            >
              <option value="Store Shelf">Store Shelf (Retail Floor)</option>
              <option value="Warehouse">Main Warehouse</option>
              <option value="Fulfillment Center">Fulfillment Center</option>
            </select>
          </div>
        </div>
      </div>

      {/* Advanced Tracking Rules & Presets */}
      <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-3">
          <div>
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-indigo-600" />
              Inventory Tracking Configuration
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">Configure tracking behavior per product / variant lifecycle</p>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Presets:</span>
            <button
              type="button"
              onClick={() => { setTrackStock(true); setTrackBatch(false); setTrackExpiry(false); setTrackSerial(true); }}
              className="px-2 py-1 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-lg text-[10px] font-bold text-slate-700 hover:text-indigo-700 transition-colors cursor-pointer"
            >
              💻 Laptop / Electronics
            </button>
            <button
              type="button"
              onClick={() => { setTrackStock(true); setTrackBatch(true); setTrackExpiry(true); setTrackSerial(false); }}
              className="px-2 py-1 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-lg text-[10px] font-bold text-slate-700 hover:text-emerald-700 transition-colors cursor-pointer"
            >
              🍏 Food & Grocery
            </button>
            <button
              type="button"
              onClick={() => { setTrackStock(true); setTrackBatch(false); setTrackExpiry(false); setTrackSerial(false); }}
              className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 transition-colors cursor-pointer"
            >
              👕 Apparel
            </button>
          </div>
        </div>

        {/* 4 Checkbox Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* ☑ Track Inventory */}
          <label className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start justify-between ${
            trackStock ? 'bg-indigo-50/50 border-indigo-300 shadow-2xs' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-start gap-2.5">
              <input
                type="checkbox"
                checked={trackStock}
                onChange={(e) => setTrackStock(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <div>
                <span className="text-xs font-bold text-slate-900 block">Track inventory</span>
                <p className="text-[10px] text-slate-500">Monitor stock levels & auto-decrement on sales</p>
              </div>
            </div>
            <Box className={`w-4 h-4 shrink-0 ${trackStock ? 'text-indigo-600' : 'text-slate-400'}`} />
          </label>

          {/* ☑ Track Batches */}
          <label className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start justify-between ${
            trackBatch ? 'bg-amber-50/50 border-amber-300 shadow-2xs' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-start gap-2.5">
              <input
                type="checkbox"
                checked={trackBatch}
                onChange={(e) => setTrackBatch(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
              />
              <div>
                <span className="text-xs font-bold text-slate-900 block">Track batches / lots</span>
                <p className="text-[10px] text-slate-500">Group physical stock by manufacturer lot codes</p>
              </div>
            </div>
            <Layers className={`w-4 h-4 shrink-0 ${trackBatch ? 'text-amber-600' : 'text-slate-400'}`} />
          </label>

          {/* ☑ Track Expiry */}
          <label className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start justify-between ${
            trackExpiry ? 'bg-rose-50/50 border-rose-300 shadow-2xs' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-start gap-2.5">
              <input
                type="checkbox"
                checked={trackExpiry}
                onChange={(e) => setTrackExpiry(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
              />
              <div>
                <span className="text-xs font-bold text-slate-900 block">Track expiry dates</span>
                <p className="text-[10px] text-slate-500">Enable perishable FEFO rotation & expiration alerts</p>
              </div>
            </div>
            <CalendarClock className={`w-4 h-4 shrink-0 ${trackExpiry ? 'text-rose-600' : 'text-slate-400'}`} />
          </label>

          {/* ☑ Track Serial Numbers */}
          <label className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start justify-between ${
            trackSerial ? 'bg-emerald-50/50 border-emerald-300 shadow-2xs' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-start gap-2.5">
              <input
                type="checkbox"
                checked={trackSerial}
                onChange={(e) => setTrackSerial(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
              <div>
                <span className="text-xs font-bold text-slate-900 block">Track serial numbers</span>
                <p className="text-[10px] text-slate-500">Track individual unit lifecycles & warranty records</p>
              </div>
            </div>
            <Tag className={`w-4 h-4 shrink-0 ${trackSerial ? 'text-emerald-600' : 'text-slate-400'}`} />
          </label>
        </div>

        {/* Dynamic Inputs when flags are checked */}
        <div className="space-y-3 pt-1">
          {/* Batch Code Input */}
          {trackBatch && (
            <div className="bg-white p-3 border border-amber-200 rounded-xl space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                Active Batch / Lot Code
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  placeholder="e.g. LOT-2026-A1"
                  className="w-full pl-3 pr-16 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono"
                />
                <button
                  type="button"
                  onClick={() => openVisionScanner('batch')}
                  className="absolute right-1.5 top-1 px-1.5 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Camera className="w-3 h-3 text-amber-600" />
                  <span>OCR</span>
                </button>
              </div>
            </div>
          )}

          {/* Expiry Date Input */}
          {trackExpiry && (
            <div className="bg-white p-3 border border-rose-200 rounded-xl space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                Expiration / Shelf-Life Date
              </label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono"
              />
            </div>
          )}

          {/* Individual Serial Number Units Manager */}
          {trackSerial && (
            <div className="bg-emerald-950/5 border border-emerald-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-900">Individual Serial Number Units</span>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-mono text-[10px] font-extrabold rounded-full">
                    {serialUnits.length} Registered
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => openVisionScanner('serial')}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Camera className="w-3 h-3" />
                  <span>Scan Vision OCR</span>
                </button>
              </div>

              {/* Batch Entry Textarea */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                  Quick Batch Serial Input (comma, newline, or space separated)
                </label>
                <div className="flex gap-2">
                  <textarea
                    rows={2}
                    value={batchSerialInput}
                    onChange={(e) => setBatchSerialInput(e.target.value)}
                    placeholder="Enter serial numbers, e.g.:&#10;ABC123, ABC124, ABC125"
                    className="flex-1 p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={handleAddBatchSerialUnits}
                    disabled={!batchSerialInput.trim()}
                    className="px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1 shadow-sm transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Units</span>
                  </button>
                </div>
              </div>

              {/* Individual Units List */}
              {serialUnits.length > 0 ? (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {serialUnits.map((u, idx) => (
                    <div
                      key={u.id || idx}
                      className="bg-white border border-slate-200 rounded-xl p-2.5 flex items-center justify-between text-xs hover:border-emerald-300 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 font-mono">
                        <span className="text-[10px] font-bold text-slate-400">#{idx + 1}</span>
                        <span className="font-extrabold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                          SN: {u.serialNumber}
                        </span>
                        <span className="px-2 py-0.5 text-[9px] font-bold uppercase rounded-md bg-emerald-100 text-emerald-800">
                          {u.status}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveSerialUnit(u.id)}
                        className="text-gray-400 hover:text-rose-600 p-1 rounded-md transition-colors"
                        title="Remove Serial Unit"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 bg-white/60 border border-dashed border-slate-300 rounded-xl text-center text-xs text-slate-500">
                  No individual serial units registered yet. Enter serial numbers above or scan with camera.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
