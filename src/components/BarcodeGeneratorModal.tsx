import React, { useState, useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { Product, ProductVariant } from '../types';
import { 
  Barcode, Printer, Download, Copy, Check, X, RefreshCw, 
  Settings2, Layers, Tag, MapPin, DollarSign, Sliders, 
  AlertCircle, Sparkles, FileText, Grid, HelpCircle
} from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';

interface BarcodeGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  initialProduct?: Product | null;
  initialSku?: string;
}

type BarcodeFormat = 'CODE128' | 'CODE39' | 'EAN13' | 'UPC';
type LabelPreset = 'standard' | 'shelf' | 'warehouse' | 'minimal';

export default function BarcodeGeneratorModal({
  isOpen,
  onClose,
  products,
  initialProduct,
  initialSku
}: BarcodeGeneratorModalProps) {
  const { formatAmount } = useCurrency();
  // Selection state
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [customSkuInput, setCustomSkuInput] = useState<string>('');
  const [useCustomSku, setUseCustomSku] = useState<boolean>(false);
  const [selectedVariantSku, setSelectedVariantSku] = useState<string>('');

  // Barcode configuration
  const [barcodeFormat, setBarcodeFormat] = useState<BarcodeFormat>('CODE128');
  const [barWidth, setBarWidth] = useState<number>(2);
  const [barHeight, setBarHeight] = useState<number>(55);
  const [showHumanReadableText, setShowHumanReadableText] = useState<boolean>(true);
  const [showProductName, setShowProductName] = useState<boolean>(true);
  const [showPrice, setShowPrice] = useState<boolean>(true);
  const [showCategory, setShowCategory] = useState<boolean>(true);
  const [showLocation, setShowLocation] = useState<boolean>(true);
  const [showBrandHeader, setShowBrandHeader] = useState<boolean>(true);
  const [brandTitle, setBrandTitle] = useState<string>('NEXUS COMMERCE');

  // Print settings
  const [labelPreset, setLabelPreset] = useState<LabelPreset>('standard');
  const [copiesCount, setCopiesCount] = useState<number>(1);
  const [printLayout, setPrintLayout] = useState<'single' | 'sheet'>('single');

  // Feedback states
  const [copied, setCopied] = useState<boolean>(false);
  const [formatError, setFormatError] = useState<string | null>(null);

  // SVG ref for live barcode render
  const previewSvgRef = useRef<SVGSVGElement | null>(null);

  // Initialize selected product when modal opens or initialProduct/initialSku changes
  useEffect(() => {
    if (!isOpen) return;
    if (initialProduct) {
      setSelectedProductId(initialProduct.id);
      setUseCustomSku(false);
      if (initialSku && initialSku !== initialProduct.sku) {
        setSelectedVariantSku(initialSku);
      } else {
        setSelectedVariantSku('');
      }
    } else if (products.length > 0 && !selectedProductId) {
      setSelectedProductId(products[0].id);
    }
    if (initialSku && !initialProduct) {
      setCustomSkuInput(initialSku);
      setUseCustomSku(true);
    }
  }, [isOpen, initialProduct, initialSku, products]);

  // Current active product
  const activeProduct = products.find(p => p.id === selectedProductId) || products[0];

  // Active SKU to encode
  const activeSku = useCustomSku 
    ? (customSkuInput.trim() || 'SKU-SAMPLE-001')
    : (selectedVariantSku || (activeProduct ? activeProduct.sku : 'SKU-001'));

  // Active value to feed to JsBarcode
  const activeEncodeValue = (() => {
    if (barcodeFormat === 'EAN13') {
      // EAN-13 requires 12 or 13 digits
      const digitsOnly = activeSku.replace(/\D/g, '');
      if (digitsOnly.length >= 12) {
        return digitsOnly.slice(0, 13);
      }
      // If product has numeric barcode, fallback to that
      if (activeProduct?.barcode && activeProduct.barcode.replace(/\D/g, '').length >= 12) {
        return activeProduct.barcode.replace(/\D/g, '').slice(0, 13);
      }
      return '880192837401'; // Valid 12-digit base for EAN13
    }
    if (barcodeFormat === 'UPC') {
      const digitsOnly = activeSku.replace(/\D/g, '');
      if (digitsOnly.length >= 11) {
        return digitsOnly.slice(0, 12);
      }
      return '012345678905';
    }
    return activeSku;
  })();

  // Apply Label Presets
  const applyPreset = (preset: LabelPreset) => {
    setLabelPreset(preset);
    switch (preset) {
      case 'standard':
        setBarWidth(2);
        setBarHeight(50);
        setShowProductName(true);
        setShowPrice(true);
        setShowCategory(true);
        setShowLocation(false);
        setShowBrandHeader(true);
        setShowHumanReadableText(true);
        break;
      case 'shelf':
        setBarWidth(2.2);
        setBarHeight(45);
        setShowProductName(true);
        setShowPrice(true);
        setShowCategory(false);
        setShowLocation(true);
        setShowBrandHeader(false);
        setShowHumanReadableText(true);
        break;
      case 'warehouse':
        setBarWidth(2.5);
        setBarHeight(65);
        setShowProductName(true);
        setShowPrice(false);
        setShowCategory(true);
        setShowLocation(true);
        setShowBrandHeader(true);
        setShowHumanReadableText(true);
        break;
      case 'minimal':
        setBarWidth(2);
        setBarHeight(55);
        setShowProductName(false);
        setShowPrice(false);
        setShowCategory(false);
        setShowLocation(false);
        setShowBrandHeader(false);
        setShowHumanReadableText(true);
        break;
    }
  };

  // Render barcode whenever config changes
  useEffect(() => {
    if (!isOpen || !previewSvgRef.current) return;

    try {
      setFormatError(null);
      JsBarcode(previewSvgRef.current, activeEncodeValue, {
        format: barcodeFormat,
        lineColor: '#0f172a',
        width: barWidth,
        height: barHeight,
        displayValue: showHumanReadableText,
        font: 'monospace',
        fontSize: 13,
        textMargin: 5,
        margin: 8,
        background: '#ffffff'
      });
    } catch (err: any) {
      console.warn('JsBarcode rendering warning:', err);
      setFormatError(err?.message || 'Invalid characters or length for selected format.');
      // Attempt fallback render with CODE128
      try {
        JsBarcode(previewSvgRef.current, activeSku, {
          format: 'CODE128',
          lineColor: '#0f172a',
          width: barWidth,
          height: barHeight,
          displayValue: showHumanReadableText,
          font: 'monospace',
          fontSize: 13,
          textMargin: 5,
          margin: 8,
          background: '#ffffff'
        });
      } catch (fallbackErr) {
        // Silent fallback fail
      }
    }
  }, [
    isOpen,
    activeEncodeValue,
    activeSku,
    barcodeFormat,
    barWidth,
    barHeight,
    showHumanReadableText
  ]);

  // Handle Copy SKU
  const handleCopySku = () => {
    navigator.clipboard.writeText(activeSku);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Handle Download as SVG
  const handleDownloadSvg = () => {
    if (!previewSvgRef.current) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(previewSvgRef.current);
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `barcode-${activeSku.replace(/[^a-zA-Z0-9-_]/g, '_')}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Handle Download as PNG
  const handleDownloadPng = () => {
    if (!previewSvgRef.current) return;
    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(previewSvgRef.current);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Add padding for high-DPI label export
      canvas.width = img.width * 2;
      canvas.height = img.height * 2;
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.scale(2, 2);
        ctx.drawImage(img, 0, 0);
        
        const pngUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = pngUrl;
        link.download = `barcode-${activeSku.replace(/[^a-zA-Z0-9-_]/g, '_')}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgStr)));
  };

  // Handle Print Action
  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  // Compute number of labels to display in print sheet
  const labelsToPrint = Array.from({ length: printLayout === 'sheet' ? copiesCount : 1 });

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. PRINTABLE SHEET DOM (ONLY VISIBLE DURING window.print())               */}
      {/* ========================================================================= */}
      <div id="printable-barcode-sheet" className="hidden">
        <div className="p-4 bg-white">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4" style={{ display: 'grid', gridTemplateColumns: printLayout === 'sheet' ? 'repeat(3, 1fr)' : '1fr', gap: '16px' }}>
            {labelsToPrint.map((_, index) => (
              <div 
                key={index}
                className="border border-slate-300 rounded-lg p-3 flex flex-col items-center justify-between text-center bg-white"
                style={{ breakInside: 'avoid', minHeight: '140px' }}
              >
                {showBrandHeader && (
                  <div className="text-[10px] font-bold text-slate-800 tracking-wider uppercase border-b border-slate-200 pb-1 w-full mb-1">
                    {brandTitle}
                  </div>
                )}
                {showProductName && (
                  <div className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[220px]">
                    {useCustomSku ? 'Custom Inventory SKU' : activeProduct?.name}
                  </div>
                )}
                <div className="flex items-center justify-center gap-2 text-[10px] text-slate-600 mt-0.5">
                  {showCategory && activeProduct && <span>{activeProduct.category}</span>}
                  {showLocation && activeProduct && <span>• {activeProduct.location}</span>}
                </div>

                {/* SVG Barcode clone for print */}
                <div className="my-1.5 flex justify-center">
                  <svg 
                    dangerouslySetInnerHTML={{ 
                      __html: previewSvgRef.current ? previewSvgRef.current.innerHTML : '' 
                    }}
                    width={previewSvgRef.current ? previewSvgRef.current.getAttribute('width') || '100%' : '100%'}
                    height={previewSvgRef.current ? previewSvgRef.current.getAttribute('height') || '100%' : '100%'}
                    viewBox={previewSvgRef.current ? previewSvgRef.current.getAttribute('viewBox') || '0 0 200 80' : '0 0 200 80'}
                  />
                </div>

                {showPrice && activeProduct && (
                  <div className="text-sm font-extrabold text-slate-950 mt-1">
                    {formatAmount(activeProduct.price)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. INTERACTIVE MODAL DIALOG                                              */}
      {/* ========================================================================= */}
      <div 
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 z-50 overflow-y-auto no-print"
        id="barcode-modal-backdrop"
      >
        <div 
          className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]"
          id="barcode-modal-panel"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-150 flex justify-between items-center bg-slate-50/80">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-slate-900 text-white rounded-xl shadow-xs">
                <Barcode className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight" id="barcode-modal-title">
                  Barcode Label Studio
                </h2>
                <p className="text-xs text-gray-500">
                  Generate, preview, customize, and print high-density barcodes for any catalog SKU.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition-all"
              id="btn-close-barcode-modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Split: Controls (Left 5 cols) & Live Print Preview (Right 7 cols) */}
          <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-y-auto flex-1">
            
            {/* LEFT COLUMN: Controls & SKU Selection */}
            <div className="lg:col-span-6 space-y-5">
              
              {/* Product / SKU Selector */}
              <div className="space-y-3 bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-indigo-600" />
                    Target Item / SKU
                  </label>
                  <button
                    type="button"
                    onClick={() => setUseCustomSku(!useCustomSku)}
                    className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 underline transition-all"
                    id="btn-toggle-custom-sku"
                  >
                    {useCustomSku ? 'Choose from Catalog' : 'Custom SKU Entry'}
                  </button>
                </div>

                {!useCustomSku ? (
                  <div className="space-y-2.5">
                    {/* Catalog Product Dropdown */}
                    <select
                      value={selectedProductId}
                      onChange={(e) => {
                        setSelectedProductId(e.target.value);
                        setSelectedVariantSku('');
                      }}
                      className="w-full px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-slate-950 focus:outline-hidden"
                      id="select-barcode-product"
                    >
                      {products.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} — ({p.sku}) [${p.price.toFixed(2)}]
                        </option>
                      ))}
                    </select>

                    {/* Variant Selector (if product has variants) */}
                    {activeProduct?.variants && activeProduct.variants.length > 0 && (
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                          Product Variant SKU
                        </label>
                        <select
                          value={selectedVariantSku}
                          onChange={(e) => setSelectedVariantSku(e.target.value)}
                          className="w-full px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-xs font-mono text-slate-800 focus:ring-2 focus:ring-slate-950 focus:outline-hidden"
                          id="select-barcode-variant"
                        >
                          <option value="">Base Product SKU ({activeProduct.sku})</option>
                          {activeProduct.variants.map((v, i) => (
                            <option key={i} value={v.sku}>
                              Variant: {v.sku} {v.size ? `• Sz ${v.size}` : ''} {v.color ? `• ${v.color}` : ''} (Stock: {v.stock})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <input
                      type="text"
                      value={customSkuInput}
                      onChange={(e) => setCustomSkuInput(e.target.value)}
                      placeholder="e.g. PROD-EL-990-BLK or 880192837401"
                      className="w-full px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-slate-950 focus:outline-hidden"
                      id="input-custom-sku"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">
                      Enter any alphanumeric code or standard EAN/UPC digit sequence.
                    </p>
                  </div>
                )}

                {/* SKU quick details display */}
                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60 font-mono text-slate-600">
                  <span className="text-[11px] font-semibold text-slate-800">Active Value: {activeSku}</span>
                  <button
                    type="button"
                    onClick={handleCopySku}
                    className="flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-800 font-sans font-semibold"
                    id="btn-copy-active-sku"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-600">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy SKU</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Label Preset Templates */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-600" />
                  Label Presets
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" id="label-presets-grid">
                  <button
                    type="button"
                    onClick={() => applyPreset('standard')}
                    className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                      labelPreset === 'standard'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-white text-slate-700 border-gray-200 hover:border-slate-300'
                    }`}
                    id="preset-standard"
                  >
                    <span className="font-bold block text-[11px]">Retail Tag</span>
                    <span className={`text-[9px] block mt-0.5 ${labelPreset === 'standard' ? 'text-slate-300' : 'text-gray-400'}`}>
                      Name + Price
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => applyPreset('shelf')}
                    className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                      labelPreset === 'shelf'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-white text-slate-700 border-gray-200 hover:border-slate-300'
                    }`}
                    id="preset-shelf"
                  >
                    <span className="font-bold block text-[11px]">Shelf Label</span>
                    <span className={`text-[9px] block mt-0.5 ${labelPreset === 'shelf' ? 'text-slate-300' : 'text-gray-400'}`}>
                      Loc + Price
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => applyPreset('warehouse')}
                    className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                      labelPreset === 'warehouse'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-white text-slate-700 border-gray-200 hover:border-slate-300'
                    }`}
                    id="preset-warehouse"
                  >
                    <span className="font-bold block text-[11px]">Warehouse</span>
                    <span className={`text-[9px] block mt-0.5 ${labelPreset === 'warehouse' ? 'text-slate-300' : 'text-gray-400'}`}>
                      Large Bin Tag
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => applyPreset('minimal')}
                    className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                      labelPreset === 'minimal'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-white text-slate-700 border-gray-200 hover:border-slate-300'
                    }`}
                    id="preset-minimal"
                  >
                    <span className="font-bold block text-[11px]">Barcode Only</span>
                    <span className={`text-[9px] block mt-0.5 ${labelPreset === 'minimal' ? 'text-slate-300' : 'text-gray-400'}`}>
                      Pure Barcode
                    </span>
                  </button>
                </div>
              </div>

              {/* Barcode Encoding & Dimension Settings */}
              <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                    Encoding & Sizing Parameters
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                      Symbology Format
                    </label>
                    <select
                      value={barcodeFormat}
                      onChange={(e) => setBarcodeFormat(e.target.value as BarcodeFormat)}
                      className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold focus:outline-hidden"
                      id="select-barcode-format"
                    >
                      <option value="CODE128">CODE128 (Universal Alphanumeric)</option>
                      <option value="CODE39">CODE39 (Industrial)</option>
                      <option value="EAN13">EAN-13 (Standard Retail)</option>
                      <option value="UPC">UPC-A (12-Digit Retail)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                      Bar Density / Width ({barWidth}px)
                    </label>
                    <input
                      type="range"
                      min="1.5"
                      max="3.5"
                      step="0.2"
                      value={barWidth}
                      onChange={(e) => setBarWidth(Number(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-slate-900 mt-2"
                      id="range-bar-width"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                      Barcode Height ({barHeight}px)
                    </label>
                    <input
                      type="range"
                      min="30"
                      max="100"
                      step="5"
                      value={barHeight}
                      onChange={(e) => setBarHeight(Number(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-slate-900 mt-2"
                      id="range-bar-height"
                    />
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showHumanReadableText}
                        onChange={(e) => setShowHumanReadableText(e.target.checked)}
                        className="rounded text-slate-900 focus:ring-slate-950 w-3.5 h-3.5"
                        id="check-human-text"
                      />
                      <span>Human-Readable Text</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showPrice}
                        onChange={(e) => setShowPrice(e.target.checked)}
                        className="rounded text-slate-900 focus:ring-slate-950 w-3.5 h-3.5"
                        id="check-show-price"
                      />
                      <span>Show MSRP Price Tag</span>
                    </label>
                  </div>
                </div>

                {/* Additional Metadata Toggles */}
                <div className="pt-2 border-t border-slate-200/80 grid grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-2 font-medium text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showProductName}
                      onChange={(e) => setShowProductName(e.target.checked)}
                      className="rounded text-slate-900 focus:ring-slate-950 w-3.5 h-3.5"
                      id="check-show-name"
                    />
                    <span>Product Title</span>
                  </label>
                  <label className="flex items-center gap-2 font-medium text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showBrandHeader}
                      onChange={(e) => setShowBrandHeader(e.target.checked)}
                      className="rounded text-slate-900 focus:ring-slate-950 w-3.5 h-3.5"
                      id="check-show-brand"
                    />
                    <span>Brand Banner</span>
                  </label>
                  <label className="flex items-center gap-2 font-medium text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showLocation}
                      onChange={(e) => setShowLocation(e.target.checked)}
                      className="rounded text-slate-900 focus:ring-slate-950 w-3.5 h-3.5"
                      id="check-show-location"
                    />
                    <span>Shelf Location</span>
                  </label>
                  <label className="flex items-center gap-2 font-medium text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showCategory}
                      onChange={(e) => setShowCategory(e.target.checked)}
                      className="rounded text-slate-900 focus:ring-slate-950 w-3.5 h-3.5"
                      id="check-show-category"
                    />
                    <span>Category Label</span>
                  </label>
                </div>
              </div>

              {/* Print Quantity & Layout Mode */}
              <div className="flex items-center justify-between bg-slate-50/80 p-3 rounded-2xl border border-slate-200/80">
                <div className="flex items-center gap-2">
                  <Printer className="w-4 h-4 text-slate-700" />
                  <span className="text-xs font-bold text-slate-900">Print Layout:</span>
                  <div className="flex bg-white rounded-lg border border-gray-200 p-0.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setPrintLayout('single')}
                      className={`px-2 py-1 rounded-md font-semibold transition-all ${
                        printLayout === 'single' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600'
                      }`}
                      id="btn-layout-single"
                    >
                      Single Tag
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrintLayout('sheet')}
                      className={`px-2 py-1 rounded-md font-semibold transition-all ${
                        printLayout === 'sheet' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600'
                      }`}
                      id="btn-layout-sheet"
                    >
                      Sheet (Multi-up)
                    </button>
                  </div>
                </div>

                {printLayout === 'sheet' && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-gray-500 font-medium">Copies:</span>
                    <input
                      type="number"
                      min="1"
                      max="60"
                      value={copiesCount}
                      onChange={(e) => setCopiesCount(Math.max(1, Math.min(60, Number(e.target.value))))}
                      className="w-14 px-2 py-1 bg-white border border-gray-200 rounded-lg text-center font-bold text-xs"
                      id="input-copies-count"
                    />
                  </div>
                )}
              </div>

            </div>

            {/* RIGHT COLUMN: Real-Time High-Fidelity Printable Label Preview & Actions */}
            <div className="lg:col-span-6 flex flex-col justify-between space-y-4">
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    Printable Label Preview
                  </span>
                  <span className="text-[10px] font-mono bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold border border-emerald-200">
                    High Resolution 300 DPI
                  </span>
                </div>

                {/* Format Alert / Validation info */}
                {formatError && (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-600 mt-0.5" />
                    <div>
                      <span className="font-bold">Format Constraint: </span>
                      {formatError} (Auto-adapted fallback rendering).
                    </div>
                  </div>
                )}

                {/* The Physical Label Canvas Display */}
                <div className="bg-slate-100 p-6 rounded-2xl border border-slate-200 flex items-center justify-center min-h-[300px]">
                  <div 
                    className="bg-white rounded-xl shadow-md p-5 border border-slate-300 flex flex-col items-center justify-between text-center transition-all max-w-[340px] w-full"
                    id="barcode-label-card"
                  >
                    {/* Brand Banner */}
                    {showBrandHeader && (
                      <div className="text-[10px] font-bold text-slate-800 tracking-wider uppercase border-b border-slate-200 pb-1 w-full mb-1.5">
                        {brandTitle}
                      </div>
                    )}

                    {/* Product Name */}
                    {showProductName && (
                      <div className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[280px]" title={activeProduct?.name}>
                        {useCustomSku ? 'Custom Inventory SKU' : activeProduct?.name}
                      </div>
                    )}

                    {/* Subtitle location & category */}
                    <div className="flex items-center justify-center gap-2 text-[10px] text-slate-500 mt-0.5">
                      {showCategory && activeProduct && <span>{activeProduct.category}</span>}
                      {showLocation && activeProduct && <span>• {activeProduct.location}</span>}
                    </div>

                    {/* The Live SVG Barcode element */}
                    <div className="my-2.5 flex justify-center w-full overflow-x-auto">
                      <svg 
                        ref={previewSvgRef} 
                        id="live-barcode-svg"
                        className="max-w-full"
                      />
                    </div>

                    {/* Price Tag Highlight */}
                    {showPrice && activeProduct && (
                      <div className="text-base font-extrabold text-slate-950 mt-1">
                        {formatAmount(activeProduct.price)}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Export & Print Action Buttons */}
              <div className="space-y-2 pt-2 border-t border-gray-150">
                {/* Print Button Primary */}
                <button
                  type="button"
                  onClick={handlePrint}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-850 active:scale-99 text-white rounded-2xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
                  id="btn-execute-print-barcode"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print {printLayout === 'sheet' ? `${copiesCount} Barcode Labels` : 'Barcode Label'}</span>
                </button>

                {/* Secondary Download Actions */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadPng}
                    className="py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-slate-700 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-1.5 shadow-2xs"
                    id="btn-download-barcode-png"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PNG</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadSvg}
                    className="py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-slate-700 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-1.5 shadow-2xs"
                    id="btn-download-barcode-svg"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Download SVG</span>
                  </button>
                </div>
              </div>

            </div>

          </div>
        </div>
      </div>
    </>
  );
}
