import React, { useState } from 'react';
import { ProductVariant, CompositeComponentItem, BundleKitItem, Product, PriceListItem } from '../../types';
import { 
  Layers, Plus, Trash2, RefreshCw, Check, Sparkles, Tag, DollarSign, 
  Barcode, Cpu, Gift, Image as ImageIcon, Copy, Upload, Wand2, X, 
  SlidersHorizontal, ArrowUpDown, ChevronRight, CheckCircle2, Box, ScanLine, Sliders, AlertTriangle,
  Receipt, Users, Building
} from 'lucide-react';
import { useCurrency } from '../../context/CurrencyContext';
import {
  generateUniqueSku,
  isSkuUnique,
  SKU_TEMPLATE_PRESETS
} from '../../utils/skuGenerator';
import {
  SYSTEM_PRICE_LISTS,
  generateVariantPriceListMatrix,
  getPriceListBadgeStyle,
  getVariantPriceForPriceList,
  updateVariantPriceListTier,
  normalizePriceListMap,
  priceListMapToItems
} from '../../utils/pricingEngine';

interface AttributeGroup {
  name: string; // e.g., 'Size', 'Color', 'Storage', 'RAM'
  values: string[]; // e.g., ['128GB', '256GB', '512GB']
  inputValue: string;
}

interface StepVariantsProps {
  hasVariants: boolean;
  setHasVariants: (val: boolean) => void;
  variants: ProductVariant[];
  setVariants: (val: ProductVariant[]) => void;
  parentSku: string;
  basePrice: number;
  baseCost: number;
  productType?: string;
  compositeComponents?: CompositeComponentItem[];
  setCompositeComponents?: (items: CompositeComponentItem[]) => void;
  bundleKitItems?: BundleKitItem[];
  setBundleKitItems?: (items: BundleKitItem[]) => void;
  setCost?: (val: number) => void;
  setPrice?: (val: number) => void;
  setWholesalePrice?: (val: number) => void;
  setMinimumPrice?: (val: number) => void;
  setOriginalPrice?: (val: number) => void;
  brand?: string;
  productName?: string;
  category?: string;
  allProducts?: Product[];
  currentProductId?: string;
}

// Preset attribute suggestion chips
const PRESET_ATTRIBUTES = [
  { name: 'Size', defaultValues: ['S', 'M', 'L', 'XL'] },
  { name: 'Color', defaultValues: ['Black', 'White', 'Blue', 'Silver'] },
  { name: 'Storage', defaultValues: ['128GB', '256GB', '512GB', '1TB'] },
  { name: 'RAM', defaultValues: ['8GB', '16GB', '32GB', '64GB'] },
  { name: 'Material', defaultValues: ['Leather', 'Cotton', 'Titanium', 'Aluminum'] },
  { name: 'Style', defaultValues: ['Standard', 'Pro', 'Ultra', 'Slim'] },
  { name: 'Processor', defaultValues: ['Intel i7', 'Intel i9', 'Apple M2', 'Apple M3'] },
  { name: 'Screen Size', defaultValues: ['13-inch', '14-inch', '16-inch'] }
];

// Sample gallery images for quick assignment
const SAMPLE_GALLERY_IMAGES = [
  { name: 'Tech / Black', url: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&q=80&w=400' },
  { name: 'Tech / Silver', url: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&q=80&w=400' },
  { name: 'Tech / Blue', url: 'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?auto=format&fit=crop&q=80&w=400' },
  { name: 'Apparel / Dark', url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&q=80&w=400' },
  { name: 'Apparel / Light', url: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&q=80&w=400' },
  { name: 'Footwear / Red', url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=400' },
  { name: 'Footwear / White', url: 'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&q=80&w=400' },
  { name: 'Beverage / Can', url: 'https://images.unsplash.com/photo-1622484210800-8851a02931a2?auto=format&fit=crop&q=80&w=400' }
];

export default function StepVariants({
  hasVariants,
  setHasVariants,
  variants,
  setVariants,
  parentSku,
  basePrice,
  baseCost,
  productType = 'Standard',
  compositeComponents = [],
  setCompositeComponents = () => {},
  bundleKitItems = [],
  setBundleKitItems = () => {},
  setCost = () => {},
  setPrice = () => {},
  setWholesalePrice = () => {},
  setMinimumPrice = () => {},
  setOriginalPrice = () => {},
  brand,
  productName,
  category,
  allProducts,
  currentProductId
}: StepVariantsProps) {
  const { currencySymbol, formatAmount } = useCurrency();

  // Variant SKU template state
  const [variantSkuTemplate, setVariantSkuTemplate] = useState<string>('{BRAND}-{PRODUCT}-{COLOR}-{SIZE}');

  // Composite & Bundle state
  const [compName, setCompName] = useState('');
  const [compSku, setCompSku] = useState('');
  const [compQty, setCompQty] = useState<number>(1);
  const [compCost, setCompCost] = useState<number>(10);

  const [bundleName, setBundleName] = useState('');
  const [bundleSku, setBundleSku] = useState('');
  const [bundleQty, setBundleQty] = useState<number>(1);
  const [bundleUnitPrice, setBundleUnitPrice] = useState<number>(5);

  // Custom attribute groups for variant generation
  const [attributeGroups, setAttributeGroups] = useState<AttributeGroup[]>([
    { name: 'Color', values: ['Space Gray', 'Silver', 'Midnight'], inputValue: '' },
    { name: 'Storage', values: ['256GB', '512GB', '1TB'], inputValue: '' }
  ]);

  const [newCustomAttributeName, setNewCustomAttributeName] = useState('');

  // Bulk Edit Bar States
  const [bulkPriceInput, setBulkPriceInput] = useState<string>('');
  const [bulkCostInput, setBulkCostInput] = useState<string>('');
  const [bulkStockInput, setBulkStockInput] = useState<string>('');

  // Image Selection Modal State
  const [activeImageModalVariantIdx, setActiveImageModalVariantIdx] = useState<number | null>(null);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [applyImageToMatchingAttr, setApplyImageToMatchingAttr] = useState(false);
  const [selectedMatchingAttrKey, setSelectedMatchingAttrKey] = useState<string>('');
  const [selectedMatchingAttrVal, setSelectedMatchingAttrVal] = useState<string>('');

  // Variant Price Lists Modal State (Retail, Wholesale, Dealer)
  const [activePriceListModalVariantIdx, setActivePriceListModalVariantIdx] = useState<number | null>(null);
  const [tempPriceLists, setTempPriceLists] = useState<PriceListItem[]>([]);

  const handleOpenPriceListModal = (idx: number) => {
    const targetVariant = variants[idx];
    if (!targetVariant) return;
    const vPrice = targetVariant.price ?? basePrice ?? 0;
    const matrix = targetVariant.priceLists
      ? priceListMapToItems(normalizePriceListMap(targetVariant.priceLists, vPrice))
      : generateVariantPriceListMatrix(vPrice, basePrice, targetVariant.cost ?? baseCost);
    setTempPriceLists(matrix);
    setActivePriceListModalVariantIdx(idx);
  };

  const handleSavePriceListModal = () => {
    if (activePriceListModalVariantIdx === null) return;
    const targetVariant = variants[activePriceListModalVariantIdx];
    if (!targetVariant) return;

    // Find retail price to update variant.price
    const retailItem = tempPriceLists.find(
      (pl) => pl.priceListName.toLowerCase() === 'retail' || pl.priceListId.toLowerCase() === 'pl-retail'
    );
    const newRetail = retailItem && retailItem.price > 0 ? retailItem.price : targetVariant.price;

    const updatedVariant: ProductVariant = {
      ...targetVariant,
      price: newRetail,
      priceLists: tempPriceLists
    };

    const updatedVariants = [...variants];
    updatedVariants[activePriceListModalVariantIdx] = updatedVariant;
    setVariants(updatedVariants);
    setActivePriceListModalVariantIdx(null);
  };

  const handleBulkAutoGeneratePriceLists = () => {
    if (variants.length === 0) return;
    const updated = variants.map((v) => {
      const vPrice = v.price && v.price > 0 ? v.price : basePrice || 0;
      const vCost = v.cost !== undefined ? v.cost : baseCost || 0;
      const matrix = generateVariantPriceListMatrix(vPrice, basePrice, vCost);
      return {
        ...v,
        priceLists: matrix
      };
    });
    setVariants(updated);
  };

  // Composite Price Sync
  const syncCompositePriceTiers = (cogsCost: number) => {
    setCost(Number(cogsCost.toFixed(2)));
    if (cogsCost > 0) {
      const calculatedRetail = Number((cogsCost / 0.60).toFixed(2));
      const calculatedWholesale = Number((cogsCost * 1.25).toFixed(2));
      const calculatedMinimum = Number((cogsCost * 1.10).toFixed(2));
      const calculatedOriginal = Number((calculatedRetail * 1.20).toFixed(2));
      setPrice(calculatedRetail);
      setWholesalePrice(calculatedWholesale);
      setMinimumPrice(calculatedMinimum);
      setOriginalPrice(calculatedOriginal);
    }
  };

  // Bundle Price Sync
  const syncBundlePriceTiers = (totalPrice: number) => {
    setPrice(Number(totalPrice.toFixed(2)));
    if (totalPrice > 0) {
      setWholesalePrice(Number((totalPrice * 0.80).toFixed(2)));
      setMinimumPrice(Number((totalPrice * 0.70).toFixed(2)));
      setOriginalPrice(Number((totalPrice * 1.15).toFixed(2)));
    }
  };

  const handleAddCompositeComponent = () => {
    if (!compName.trim()) return;
    const newItem: CompositeComponentItem = {
      name: compName.trim(),
      sku: compSku.trim() || `COMP-${Math.floor(1000 + Math.random() * 9000)}`,
      quantity: Math.max(1, compQty),
      unitCost: Math.max(0, compCost)
    };
    const updated = [...compositeComponents, newItem];
    setCompositeComponents(updated);
    const totalRollupCost = updated.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);
    syncCompositePriceTiers(totalRollupCost);
    setCompName('');
    setCompSku('');
    setCompQty(1);
    setCompCost(10);
  };

  const handleRemoveCompositeComponent = (idx: number) => {
    const updated = compositeComponents.filter((_, i) => i !== idx);
    setCompositeComponents(updated);
    const totalRollupCost = updated.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);
    syncCompositePriceTiers(totalRollupCost);
  };

  const handleAddBundleItem = () => {
    if (!bundleName.trim()) return;
    const newItem: BundleKitItem = {
      name: bundleName.trim(),
      sku: bundleSku.trim() || `KIT-${Math.floor(1000 + Math.random() * 9000)}`,
      quantity: Math.max(1, bundleQty),
      unitPrice: Math.max(0, bundleUnitPrice)
    };
    const updated = [...bundleKitItems, newItem];
    setBundleKitItems(updated);
    const totalStandalonePrice = updated.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    syncBundlePriceTiers(totalStandalonePrice);
    setBundleName('');
    setBundleSku('');
    setBundleQty(1);
    setBundleUnitPrice(5);
  };

  const handleRemoveBundleItem = (idx: number) => {
    const updated = bundleKitItems.filter((_, i) => i !== idx);
    setBundleKitItems(updated);
    const totalStandalonePrice = updated.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    syncBundlePriceTiers(totalStandalonePrice);
  };

  // --- ATTRIBUTE MANAGEMENT ---
  // Add new attribute group (from custom input or preset chip)
  const handleAddAttributeGroup = (groupName: string, defaultVals: string[] = []) => {
    const trimmed = groupName.trim();
    if (!trimmed) return;
    if (attributeGroups.some((g) => g.name.toLowerCase() === trimmed.toLowerCase())) {
      alert(`Attribute "${trimmed}" is already added.`);
      return;
    }
    setAttributeGroups([
      ...attributeGroups,
      { name: trimmed, values: defaultVals, inputValue: '' }
    ]);
    setNewCustomAttributeName('');
  };

  const handleRemoveAttributeGroup = (index: number) => {
    setAttributeGroups(attributeGroups.filter((_, i) => i !== index));
  };

  // Add value to attribute group (supports comma-separated tags e.g. "128GB, 256GB, 512GB")
  const handleAddAttributeValue = (groupIndex: number) => {
    const group = attributeGroups[groupIndex];
    const rawVal = group.inputValue.trim();
    if (!rawVal) return;

    // Split by commas to allow multi-add
    const newItems = rawVal
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !group.values.includes(s));

    if (newItems.length === 0) return;

    const updated = [...attributeGroups];
    updated[groupIndex] = {
      ...group,
      values: [...group.values, ...newItems],
      inputValue: ''
    };
    setAttributeGroups(updated);
  };

  const handleRemoveAttributeValue = (groupIndex: number, valToRemove: string) => {
    const updated = [...attributeGroups];
    updated[groupIndex] = {
      ...updated[groupIndex],
      values: updated[groupIndex].values.filter((v) => v !== valToRemove)
    };
    setAttributeGroups(updated);
  };

  // Regenerate all variant SKUs using template rules
  const handleRegenerateAllVariantSkus = () => {
    const updated = variants.map((v, idx) => {
      const newSku = generateUniqueSku(
        variantSkuTemplate || '{BRAND}-{PRODUCT}-{COLOR}-{SIZE}',
        {
          brand: brand || 'NIKE',
          productName: productName || 'AIR MAX 270',
          size: v.size || v.options?.Size || v.options?.size,
          color: v.color || v.options?.Color || v.options?.color,
          model: v.model || v.options?.Model || v.options?.model,
          category: category || 'Apparel',
          sequence: idx + 1
        },
        allProducts || [],
        { currentProductId }
      );
      return { ...v, sku: newSku };
    });
    setVariants(updated);
  };

  // --- CARTESIAN MATRIX VARIANT GENERATION ---
  const handleGenerateMatrix = () => {
    const activeGroups = attributeGroups.filter((g) => g.values.length > 0);
    if (activeGroups.length === 0) {
      alert('Please add at least one attribute group with option values.');
      return;
    }

    // Helper for Cartesian product
    const cartesian = (args: string[][]): string[][] => {
      const r: string[][] = [];
      const max = args.length - 1;
      function helper(arr: string[], i: number) {
        for (let j = 0, l = args[i].length; j < l; j++) {
          const a = [...arr, args[i][j]];
          if (i === max) r.push(a);
          else helper(a, i + 1);
        }
      }
      helper([], 0);
      return r;
    };

    const valueArrays = activeGroups.map((g) => g.values);
    const combinations = cartesian(valueArrays);

    const generated: ProductVariant[] = combinations.map((combo, idx) => {
      const variantOptions: Record<string, string> = {};
      let sizeVal = '';
      let colorVal = '';
      let modelVal = '';

      activeGroups.forEach((group, gIdx) => {
        const val = combo[gIdx];
        variantOptions[group.name] = val;
        if (group.name.toLowerCase() === 'size') sizeVal = val;
        if (group.name.toLowerCase() === 'color') colorVal = val;
        if (group.name.toLowerCase() === 'model' || group.name.toLowerCase() === 'style') modelVal = val;
      });

      // Construct unique template-based SKU code e.g. NK-AM270-BLK-42
      const vSku = generateUniqueSku(
        variantSkuTemplate || '{BRAND}-{PRODUCT}-{COLOR}-{SIZE}',
        {
          brand: brand || 'NIKE',
          productName: productName || 'AIR MAX 270',
          size: sizeVal,
          color: colorVal,
          model: modelVal,
          category: category || 'Apparel',
          sequence: idx + 1
        },
        allProducts || [],
        { currentProductId }
      );
      
      // Generate EAN-13 valid optical barcode string
      const randomDigits = Math.floor(10000000000 + Math.random() * 90000000000).toString();
      const vBarcode = `88${randomDigits}`;

      return {
        sku: vSku,
        size: sizeVal || undefined,
        color: colorVal || undefined,
        model: modelVal || undefined,
        stock: 10,
        price: basePrice || 0,
        cost: baseCost || 0,
        barcode: vBarcode,
        options: variantOptions
      };
    });

    setVariants(generated);
  };

  // --- VARIANT ROW FIELD UPDATES ---
  const handleUpdateVariantField = (idx: number, field: keyof ProductVariant, value: any) => {
    const updated = [...variants];
    updated[idx] = { ...updated[idx], [field]: value };
    setVariants(updated);
  };

  const handleUpdateVariantOption = (idx: number, attrKey: string, attrVal: string) => {
    const updated = [...variants];
    const currentOptions = { ...(updated[idx].options || {}) };
    currentOptions[attrKey] = attrVal;
    
    // Also sync standard size/color/model fields if applicable
    let sizeVal = updated[idx].size;
    let colorVal = updated[idx].color;
    let modelVal = updated[idx].model;
    if (attrKey.toLowerCase() === 'size') sizeVal = attrVal;
    if (attrKey.toLowerCase() === 'color') colorVal = attrVal;
    if (attrKey.toLowerCase() === 'model' || attrKey.toLowerCase() === 'style') modelVal = attrVal;

    updated[idx] = {
      ...updated[idx],
      size: sizeVal,
      color: colorVal,
      model: modelVal,
      options: currentOptions
    };
    setVariants(updated);
  };

  const handleRemoveVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  const handleDuplicateVariant = (idx: number) => {
    const source = variants[idx];
    const newSku = `${source.sku}-COPY`;
    const randomDigits = Math.floor(10000000000 + Math.random() * 90000000000).toString();
    const newBarcode = `88${randomDigits}`;

    const duplicated: ProductVariant = {
      ...source,
      sku: newSku,
      barcode: newBarcode,
      options: source.options ? { ...source.options } : undefined
    };
    const updated = [...variants];
    updated.splice(idx + 1, 0, duplicated);
    setVariants(updated);
  };

  // --- BULK TOOLBAR ACTIONS ---
  const handleBulkApplyPrice = () => {
    if (!bulkPriceInput || isNaN(Number(bulkPriceInput))) return;
    const targetPrice = Number(bulkPriceInput);
    setVariants(variants.map((v) => ({ ...v, price: targetPrice })));
  };

  const handleBulkApplyCost = () => {
    if (!bulkCostInput || isNaN(Number(bulkCostInput))) return;
    const targetCost = Number(bulkCostInput);
    setVariants(variants.map((v) => ({ ...v, cost: targetCost })));
  };

  const handleBulkApplyStock = () => {
    if (!bulkStockInput || isNaN(Number(bulkStockInput))) return;
    const targetStock = Number(bulkStockInput);
    setVariants(variants.map((v) => ({ ...v, stock: targetStock })));
  };

  const handleBulkGenerateBarcodes = () => {
    setVariants(
      variants.map((v) => {
        const randomDigits = Math.floor(10000000000 + Math.random() * 90000000000).toString();
        return { ...v, barcode: `88${randomDigits}` };
      })
    );
  };

  // --- IMAGE SELECTION & ASSIGNMENT ---
  const handleOpenImageModal = (idx: number) => {
    setActiveImageModalVariantIdx(idx);
    const targetV = variants[idx];
    setImageUrlInput(targetV.imageUrl || '');
    
    // Pick first option key/val if available for attribute matching preset
    if (targetV.options && Object.keys(targetV.options).length > 0) {
      const firstKey = Object.keys(targetV.options)[0];
      setSelectedMatchingAttrKey(firstKey);
      setSelectedMatchingAttrVal(targetV.options[firstKey]);
    } else if (targetV.color) {
      setSelectedMatchingAttrKey('Color');
      setSelectedMatchingAttrVal(targetV.color);
    } else {
      setSelectedMatchingAttrKey('');
      setSelectedMatchingAttrVal('');
    }
  };

  const handleApplyImageModal = () => {
    if (activeImageModalVariantIdx === null) return;

    if (applyImageToMatchingAttr && selectedMatchingAttrKey && selectedMatchingAttrVal) {
      // Apply to all variants that match this attribute key/value
      setVariants(
        variants.map((v) => {
          const matchVal = v.options?.[selectedMatchingAttrKey] || (selectedMatchingAttrKey.toLowerCase() === 'color' ? v.color : undefined);
          if (matchVal === selectedMatchingAttrVal) {
            return { ...v, imageUrl: imageUrlInput };
          }
          return v;
        })
      );
    } else {
      // Apply strictly to this variant
      handleUpdateVariantField(activeImageModalVariantIdx, 'imageUrl', imageUrlInput);
    }

    setActiveImageModalVariantIdx(null);
    setImageUrlInput('');
    setApplyImageToMatchingAttr(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setImageUrlInput(result);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs font-bold text-sm">
          3
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            {productType === 'Composite' ? 'Composite Bill of Materials (BOM)' : productType === 'Bundle' ? 'Bundle / Kit Contents' : 'Product Variants & Custom Attributes'}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {productType === 'Composite' 
              ? 'Configure underlying sub-components with cost rollup.'
              : productType === 'Bundle'
              ? 'Configure bundled items sold together as a kit.'
              : 'Define custom attribute types (e.g. Size, Color, Storage, RAM), generate combinations, and assign individual images, SKUs, and barcodes.'}
          </p>
        </div>
      </div>

      {/* COMPOSITE BOM BUILDER */}
      {productType === 'Composite' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-indigo-600" />
                Composite Product — Bill of Materials (BOM)
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Define sub-components required to assemble 1 unit.
              </p>
            </div>
            <div className="bg-indigo-50 text-indigo-900 px-3 py-1.5 rounded-xl border border-indigo-200 text-xs font-bold font-mono">
              Total BOM Cost: {formatAmount(compositeComponents.reduce((s, i) => s + i.quantity * i.unitCost, 0))}
            </div>
          </div>

          {compositeComponents.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200">
                    <th className="p-2.5">Sub-Component Item</th>
                    <th className="p-2.5">SKU</th>
                    <th className="p-2.5">Qty Req.</th>
                    <th className="p-2.5">Unit Cost</th>
                    <th className="p-2.5">Extended Total</th>
                    <th className="p-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {compositeComponents.map((comp, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80">
                      <td className="p-2.5 font-bold text-slate-900">{comp.name}</td>
                      <td className="p-2.5 font-mono text-slate-500">{comp.sku}</td>
                      <td className="p-2.5 font-mono font-bold text-indigo-900">{comp.quantity}x</td>
                      <td className="p-2.5 font-mono text-slate-700">{formatAmount(comp.unitCost)}</td>
                      <td className="p-2.5 font-mono font-bold text-emerald-700">{formatAmount(comp.quantity * comp.unitCost)}</td>
                      <td className="p-2.5 text-right">
                        <button type="button" onClick={() => handleRemoveCompositeComponent(idx)} className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
            <input type="text" placeholder="Component Name (e.g. Monitor 27&quot;)" value={compName} onChange={(e) => setCompName(e.target.value)} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold flex-1 min-w-[140px]" />
            <input type="text" placeholder="SKU Code" value={compSku} onChange={(e) => setCompSku(e.target.value)} className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono w-28" />
            <input type="number" min="1" placeholder="Qty" value={compQty} onChange={(e) => setCompQty(Number(e.target.value))} className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono w-16" />
            <input type="number" step="0.01" min="0" placeholder="Unit Cost" value={compCost} onChange={(e) => setCompCost(Number(e.target.value))} className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono w-24" />
            <button type="button" onClick={handleAddCompositeComponent} className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer">
              <Plus className="w-3.5 h-3.5" /> Add Component
            </button>
          </div>
        </div>
      )}

      {/* BUNDLE / KIT BUILDER */}
      {productType === 'Bundle' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Gift className="w-4 h-4 text-indigo-600" />
                Bundle / Kit Contents & Standalone Pricing
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Group standalone items into a single commercial kit.
              </p>
            </div>
            <div className="bg-emerald-50 text-emerald-950 px-3 py-1.5 rounded-xl border border-emerald-200 text-xs font-bold font-mono">
              Combined Value: {formatAmount(bundleKitItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0))}
            </div>
          </div>

          {bundleKitItems.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] border-b border-slate-200">
                    <th className="p-2.5">Bundled Item</th>
                    <th className="p-2.5">SKU</th>
                    <th className="p-2.5">Pack Qty</th>
                    <th className="p-2.5">Unit Price</th>
                    <th className="p-2.5">Standalone Value</th>
                    <th className="p-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bundleKitItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80">
                      <td className="p-2.5 font-bold text-slate-900">{item.name}</td>
                      <td className="p-2.5 font-mono text-slate-500">{item.sku}</td>
                      <td className="p-2.5 font-mono font-bold text-indigo-900">{item.quantity}x</td>
                      <td className="p-2.5 font-mono text-slate-700">{formatAmount(item.unitPrice)}</td>
                      <td className="p-2.5 font-mono font-bold text-emerald-700">{formatAmount(item.quantity * item.unitPrice)}</td>
                      <td className="p-2.5 text-right">
                        <button type="button" onClick={() => handleRemoveBundleItem(idx)} className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
            <input type="text" placeholder="Item Name (e.g. Notebook A5)" value={bundleName} onChange={(e) => setBundleName(e.target.value)} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold flex-1 min-w-[140px]" />
            <input type="text" placeholder="SKU Code" value={bundleSku} onChange={(e) => setBundleSku(e.target.value)} className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono w-28" />
            <input type="number" min="1" placeholder="Qty" value={bundleQty} onChange={(e) => setBundleQty(Number(e.target.value))} className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono w-16" />
            <input type="number" step="0.01" min="0" placeholder="Unit Price" value={bundleUnitPrice} onChange={(e) => setBundleUnitPrice(Number(e.target.value))} className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono w-24" />
            <button type="button" onClick={handleAddBundleItem} className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer">
              <Plus className="w-3.5 h-3.5" /> Add Pack Item
            </button>
          </div>
        </div>
      )}

      {/* VARIANT ENABLE TOGGLE */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-slate-900">Does this product have variants?</h4>
            <p className="text-xs text-slate-500">
              Enable multi-SKU generation if item has customizable options (Size, Color, Storage, RAM, Style, etc.).
            </p>
          </div>
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setHasVariants(false);
                setVariants([]);
              }}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                !hasVariants ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              No (Single Item)
            </button>
            <button
              type="button"
              onClick={() => setHasVariants(true)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                hasVariants ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Yes (Has Variants)
            </button>
          </div>
        </div>
      </div>

      {hasVariants && (
        <div className="space-y-6">
          
          {/* 1. CUSTOM ATTRIBUTE TYPE DEFINITION PANEL */}
          <div className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
              <div>
                <span className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
                  Define Custom Attribute Types & Options
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Create option groups like Size, Color, Storage, RAM, Material, or type any custom attribute name.
                </p>
              </div>
              <span className="text-[10px] font-mono text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg font-bold">
                {attributeGroups.length} Attribute Groups Active
              </span>
            </div>

            {/* Quick Preset Chips */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Quick Add Popular Attribute Presets:
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {PRESET_ATTRIBUTES.map((preset) => {
                  const isAdded = attributeGroups.some((g) => g.name.toLowerCase() === preset.name.toLowerCase());
                  return (
                    <button
                      key={preset.name}
                      type="button"
                      disabled={isAdded}
                      onClick={() => handleAddAttributeGroup(preset.name, preset.defaultValues)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        isAdded
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 opacity-60 cursor-not-allowed'
                          : 'bg-white hover:bg-indigo-50 border border-slate-200 text-slate-700 hover:border-indigo-300'
                      }`}
                    >
                      {isAdded ? <Check className="w-3 h-3 text-emerald-600" /> : <Plus className="w-3 h-3 text-indigo-600" />}
                      {preset.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active Attribute Group Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              {attributeGroups.map((group, gIdx) => (
                <div key={group.name} className="bg-white border border-slate-200/90 rounded-2xl p-3.5 space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-indigo-600" />
                      {group.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAttributeGroup(gIdx)}
                      className="text-slate-400 hover:text-rose-600 transition-colors text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" /> Remove Group
                    </button>
                  </div>

                  {/* Option Tag Chips */}
                  <div className="flex flex-wrap items-center gap-1.5 min-h-[32px]">
                    {group.values.length === 0 ? (
                      <span className="text-[11px] text-slate-400 italic">No values added yet (e.g. type 256GB, 512GB)...</span>
                    ) : (
                      group.values.map((val) => (
                        <span
                          key={val}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 border border-indigo-200 rounded-lg text-xs font-bold text-indigo-900 shadow-2xs"
                        >
                          {val}
                          <button
                            type="button"
                            onClick={() => handleRemoveAttributeValue(gIdx, val)}
                            className="hover:text-rose-600 text-indigo-400 hover:bg-rose-50 rounded p-0.5 transition-colors cursor-pointer ml-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))
                    )}
                  </div>

                  {/* Option Value Input */}
                  <div className="flex gap-2 pt-1">
                    <input
                      type="text"
                      value={group.inputValue}
                      onChange={(e) => {
                        const updated = [...attributeGroups];
                        updated[gIdx].inputValue = e.target.value;
                        setAttributeGroups(updated);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddAttributeValue(gIdx);
                        }
                      }}
                      placeholder={`Add values (comma-separated, e.g. Red, Blue, Green)...`}
                      className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddAttributeValue(gIdx)}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shrink-0"
                    >
                      + Add
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Custom Attribute Addition & Generation Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-200/80">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  type="text"
                  value={newCustomAttributeName}
                  onChange={(e) => setNewCustomAttributeName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddAttributeGroup(newCustomAttributeName);
                    }
                  }}
                  placeholder="Type custom attribute (e.g. RAM, Voltage, Flavor)..."
                  className="flex-1 sm:flex-initial px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-200 sm:w-64"
                />
                <button
                  type="button"
                  onClick={() => handleAddAttributeGroup(newCustomAttributeName)}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 active:scale-98"
                >
                  <Plus className="w-3.5 h-3.5" /> <span className="hidden xs:inline">Create</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleGenerateMatrix}
                className="w-full sm:w-auto px-4 sm:px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl text-xs font-black shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <Sparkles className="w-4 h-4 text-emerald-200" />
                Generate Combination Matrix ({attributeGroups.reduce((acc, g) => acc * (g.values.length || 1), 1)} SKUs)
              </button>
            </div>
          </div>

          {/* 2. DYNAMIC VARIANT MATRIX TABLE */}
          <div className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-4 space-y-4 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  Generated Variant SKUs ({variants.length})
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Assign custom images, edit individual SKUs, barcodes, cost, price, and stock quantities per variant.
                </p>
              </div>

              {variants.length > 0 && (
                <button
                  type="button"
                  onClick={handleBulkGenerateBarcodes}
                  className="self-start sm:self-auto px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                >
                  <Barcode className="w-3.5 h-3.5" /> Auto-Fill EAN Barcodes
                </button>
              )}
            </div>

            {/* BULK EDIT TOOLBAR */}
            {variants.length > 0 && (
              <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl flex flex-wrap items-center gap-2 sm:gap-3">
                <span className="text-[11px] font-extrabold text-indigo-950 uppercase tracking-wider flex items-center gap-1 w-full sm:w-auto">
                  <Wand2 className="w-3.5 h-3.5 text-indigo-600" /> Bulk Apply:
                </span>

                {/* Price Bulk */}
                <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-indigo-200/80">
                  <span className="text-[10px] font-bold text-slate-500">Price:</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder={`${basePrice || 0}`}
                    value={bulkPriceInput}
                    onChange={(e) => setBulkPriceInput(e.target.value)}
                    className="w-14 sm:w-16 text-xs font-mono font-bold text-slate-800 outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleBulkApplyPrice}
                    className="px-2 py-0.5 bg-indigo-600 text-white rounded text-[10px] font-bold cursor-pointer hover:bg-indigo-700"
                  >
                    Apply
                  </button>
                </div>

                {/* Cost Bulk */}
                <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-indigo-200/80">
                  <span className="text-[10px] font-bold text-slate-500">Cost:</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder={`${baseCost || 0}`}
                    value={bulkCostInput}
                    onChange={(e) => setBulkCostInput(e.target.value)}
                    className="w-14 sm:w-16 text-xs font-mono font-bold text-slate-800 outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleBulkApplyCost}
                    className="px-2 py-0.5 bg-indigo-600 text-white rounded text-[10px] font-bold cursor-pointer hover:bg-indigo-700"
                  >
                    Apply
                  </button>
                </div>

                {/* Stock Bulk */}
                <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-indigo-200/80">
                  <span className="text-[10px] font-bold text-slate-500">Stock:</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="10"
                    value={bulkStockInput}
                    onChange={(e) => setBulkStockInput(e.target.value)}
                    className="w-12 sm:w-14 text-xs font-mono font-bold text-slate-800 outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleBulkApplyStock}
                    className="px-2 py-0.5 bg-indigo-600 text-white rounded text-[10px] font-bold cursor-pointer hover:bg-indigo-700"
                  >
                    Apply
                  </button>
                </div>

                {/* Bulk Auto-Fill Price Lists */}
                <button
                  type="button"
                  onClick={handleBulkAutoGeneratePriceLists}
                  className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold font-mono flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all ml-auto"
                  title="Auto-calculate Retail, Wholesale, Dealer, Member, and Promotional price list tiers for all variants"
                >
                  <Tag className="w-3.5 h-3.5" /> Auto-Fill All Variant Price Lists
                </button>
              </div>
            )}

            {/* Variant SKU Template Generator Bar */}
            {variants.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-indigo-50/50 border border-indigo-100 rounded-xl p-3">
                <div className="flex items-center gap-2">
                  <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="text-xs font-bold text-slate-800">Variant SKU Rule Template:</span>
                  <select
                    value={variantSkuTemplate}
                    onChange={(e) => setVariantSkuTemplate(e.target.value)}
                    className="px-2 py-1 bg-white border border-indigo-200 rounded-lg text-xs font-mono font-bold text-indigo-900"
                  >
                    {SKU_TEMPLATE_PRESETS.map((p) => (
                      <option key={p.id} value={p.template}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={handleRegenerateAllVariantSkus}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold font-mono transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Regenerate All Variant SKUs
                </button>
              </div>
            )}

            {variants.length === 0 ? (
              <div className="text-center py-10 text-slate-400 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 space-y-1">
                <Box className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-xs font-bold text-slate-600">No variants generated yet.</p>
                <p className="text-[11px]">Add option values above and click 'Generate Combination Matrix'.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-black uppercase text-[10px] tracking-wider">
                      <th className="p-3 w-20">Variant Shot</th>
                      <th className="p-3 min-w-[180px]">Custom Attributes & Options</th>
                      <th className="p-3">Variant SKU & Status</th>
                      <th className="p-3">Barcode (EAN-13)</th>
                      <th className="p-3 w-20">Stock</th>
                      <th className="p-3 w-24">Unit Cost</th>
                      <th className="p-3 w-28">Selling Price</th>
                      <th className="p-3 min-w-[210px]">Price Lists (Retail / Wholesale / Dealer)</th>
                      <th className="p-3 text-right w-24">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {variants.map((v, idx) => {
                      const optionEntries = v.options ? Object.entries(v.options) : [];
                      const legacyParts = [v.color, v.size, v.model].filter(Boolean);

                      // Check uniqueness across products/variants and within current form
                      const uniqueness = isSkuUnique(v.sku || '', allProducts || [], {
                        currentProductId,
                        currentVariantSku: v.sku,
                        excludeCurrentVariantIdx: idx
                      });
                      const isDuplicateInCurrentForm = variants.some(
                        (otherV, oIdx) => oIdx !== idx && otherV.sku && otherV.sku.trim().toLowerCase() === (v.sku || '').trim().toLowerCase()
                      );
                      const isSkuValid = uniqueness.isUnique && !isDuplicateInCurrentForm;

                      // Price Lists values for quick preview
                      const vPrice = v.price ?? basePrice ?? 0;
                      const vWholesale = getVariantPriceForPriceList(v, 'Wholesale', vPrice);
                      const vDealer = getVariantPriceForPriceList(v, 'Dealer', vPrice);
                      const hasCustomPriceLists = Boolean(v.priceLists && v.priceLists.length > 0);

                      return (
                        <tr key={v.sku || idx} className="hover:bg-slate-50/80 transition-colors">
                          {/* Variant Image */}
                          <td className="p-3">
                            <div className="flex flex-col items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleOpenImageModal(idx)}
                                className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center relative group hover:border-indigo-500 cursor-pointer transition-all shadow-2xs"
                              >
                                {v.imageUrl ? (
                                  <img src={v.imageUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-all" />
                                ) : (
                                  <ImageIcon className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
                                )}
                                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[9px] font-bold">
                                  Edit
                                </div>
                              </button>
                              <span className="text-[9px] font-mono font-bold text-indigo-600 cursor-pointer hover:underline" onClick={() => handleOpenImageModal(idx)}>
                                {v.imageUrl ? 'Change' : '+ Image'}
                              </span>
                            </div>
                          </td>

                          {/* Custom Options Badges */}
                          <td className="p-3">
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-1">
                                {optionEntries.length > 0 ? (
                                  optionEntries.map(([k, val]) => (
                                    <span
                                      key={k}
                                      className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-950 font-mono text-[10px] font-bold flex items-center gap-1"
                                    >
                                      <span className="text-indigo-400 font-sans font-normal">{k}:</span> {val}
                                    </span>
                                  ))
                                ) : legacyParts.length > 0 ? (
                                  <span className="font-bold text-slate-900 text-xs">{legacyParts.join(' / ')}</span>
                                ) : (
                                  <span className="text-slate-400 italic text-[11px]">Standard Variant</span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Variant SKU */}
                          <td className="p-3">
                            <div className="space-y-1">
                              <input
                                type="text"
                                value={v.sku}
                                onChange={(e) => handleUpdateVariantField(idx, 'sku', e.target.value)}
                                className={`px-2.5 py-1.5 bg-slate-50 border ${
                                  isSkuValid ? 'border-slate-200' : 'border-rose-500 bg-rose-50/50'
                                } rounded-xl text-xs font-mono font-bold text-slate-900 w-36 focus:bg-white focus:ring-2 focus:ring-indigo-200`}
                              />
                              <div className="text-[9px] font-mono font-bold">
                                {isSkuValid ? (
                                  <span className="text-emerald-700 inline-flex items-center gap-0.5">
                                    <Check className="w-2.5 h-2.5 text-emerald-600" /> Globally Unique
                                  </span>
                                ) : (
                                  <span className="text-rose-600 inline-flex items-center gap-0.5" title="SKU must be globally unique">
                                    <AlertTriangle className="w-2.5 h-2.5 text-rose-500" /> Duplicate SKU!
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Barcode */}
                          <td className="p-3">
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={v.barcode || ''}
                                onChange={(e) => handleUpdateVariantField(idx, 'barcode', e.target.value)}
                                placeholder="EAN-13 Barcode..."
                                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-700 w-32 focus:bg-white focus:ring-2 focus:ring-indigo-200"
                              />
                              <button
                                type="button"
                                title="Auto-Generate Barcode"
                                onClick={() => {
                                  const randomDigits = Math.floor(10000000000 + Math.random() * 90000000000).toString();
                                  handleUpdateVariantField(idx, 'barcode', `88${randomDigits}`);
                                }}
                                className="p-1.5 bg-slate-100 hover:bg-indigo-100 text-slate-600 hover:text-indigo-700 rounded-lg cursor-pointer transition-colors"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>

                          {/* Stock Quantity */}
                          <td className="p-3">
                            <input
                              type="number"
                              min="0"
                              value={v.stock}
                              onChange={(e) => handleUpdateVariantField(idx, 'stock', Number(e.target.value))}
                              className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 w-16 text-center focus:bg-white focus:ring-2 focus:ring-indigo-200"
                            />
                          </td>

                          {/* Unit Cost */}
                          <td className="p-3">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={v.cost ?? baseCost}
                              onChange={(e) => {
                                const newCost = Number(e.target.value);
                                handleUpdateVariantField(idx, 'cost', newCost);
                              }}
                              className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 w-20 focus:bg-white focus:ring-2 focus:ring-indigo-200"
                            />
                          </td>

                          {/* Selling Price (Retail) */}
                          <td className="p-3">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={v.price ?? basePrice}
                              onChange={(e) => {
                                const newPrice = Number(e.target.value);
                                handleUpdateVariantField(idx, 'price', newPrice);
                                // If variant has custom priceLists, sync Retail tier as well
                                if (v.priceLists) {
                                  const updatedVariant = updateVariantPriceListTier(v, 'Retail', newPrice);
                                  handleUpdateVariantField(idx, 'priceLists', updatedVariant.priceLists);
                                }
                              }}
                              className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-extrabold text-emerald-700 w-24 focus:bg-white focus:ring-2 focus:ring-indigo-200"
                            />
                          </td>

                          {/* Price Lists (Retail / Wholesale / Dealer) */}
                          <td className="p-3">
                            <div className="space-y-1.5">
                              <div className="flex flex-wrap items-center gap-1">
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] font-mono font-bold text-slate-800" title="Retail Price">
                                  <span className="text-[8px] uppercase text-slate-500 font-sans">Ret:</span> {formatAmount(vPrice)}
                                </span>
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-[10px] font-mono font-bold text-amber-900" title="Wholesale Price List">
                                  <span className="text-[8px] uppercase text-amber-600 font-sans">Whs:</span> {formatAmount(vWholesale)}
                                </span>
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-[10px] font-mono font-bold text-indigo-900" title="Dealer Price List">
                                  <span className="text-[8px] uppercase text-indigo-600 font-sans">Dlr:</span> {formatAmount(vDealer)}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleOpenPriceListModal(idx)}
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                                  hasCustomPriceLists 
                                    ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300' 
                                    : 'bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 border-slate-200'
                                }`}
                              >
                                <Tag className="w-3 h-3 text-indigo-600" />
                                {hasCustomPriceLists ? 'Custom Price Lists ✓' : 'Edit Price Lists'}
                              </button>
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                title="Duplicate Variant"
                                onClick={() => handleDuplicateVariant(idx)}
                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                title="Remove Variant"
                                onClick={() => handleRemoveVariant(idx)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VARIANT IMAGE SELECTION MODAL */}
      {activeImageModalVariantIdx !== null && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-extrabold text-slate-900">
                  Assign Variant Image ({variants[activeImageModalVariantIdx]?.sku})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveImageModalVariantIdx(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Preview Thumbnail */}
              <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
                <div className="w-16 h-16 rounded-xl bg-white border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                  {imageUrlInput ? (
                    <img src={imageUrlInput} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-slate-300" />
                  )}
                </div>
                <div className="space-y-1 flex-1">
                  <span className="text-xs font-bold text-slate-900 block">Current Image Source</span>
                  <p className="text-[10px] text-slate-500 truncate">{imageUrlInput || 'No image assigned'}</p>
                </div>
              </div>

              {/* Upload or URL input */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Image URL or Direct Upload
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={imageUrlInput}
                    onChange={(e) => setImageUrlInput(e.target.value)}
                    placeholder="https://images.unsplash.com/photo..."
                    className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  />
                  <label className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1 shrink-0">
                    <Upload className="w-3.5 h-3.5" /> File
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="sr-only" />
                  </label>
                </div>
              </div>

              {/* Sample Gallery Presets */}
              <div className="space-y-1.5">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Select from Sample Stock Product Shots:
                </span>
                <div className="grid grid-cols-4 gap-2">
                  {SAMPLE_GALLERY_IMAGES.map((img) => (
                    <button
                      key={img.name}
                      type="button"
                      onClick={() => setImageUrlInput(img.url)}
                      className="aspect-square rounded-xl bg-slate-100 border border-slate-200 overflow-hidden hover:border-indigo-600 transition-all relative group cursor-pointer"
                    >
                      <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                      <span className="absolute bottom-0 inset-x-0 bg-slate-900/70 text-white text-[8px] font-bold p-0.5 text-center truncate">
                        {img.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Attribute Matching Option */}
              {selectedMatchingAttrKey && selectedMatchingAttrVal && (
                <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-200/80 space-y-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={applyImageToMatchingAttr}
                      onChange={(e) => setApplyImageToMatchingAttr(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                    />
                    <span className="text-xs font-bold text-indigo-950">
                      Apply this image to ALL variants matching {selectedMatchingAttrKey} = "{selectedMatchingAttrVal}"
                    </span>
                  </label>
                  <p className="text-[10px] text-indigo-700 pl-6">
                    Saves time by auto-assigning this image to every variant with the same color/style.
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveImageModalVariantIdx(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyImageModal}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center gap-1"
              >
                <Check className="w-4 h-4" /> Save Image Assignment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VARIANT PRICE LISTS (RETAIL / WHOLESALE / DEALER) MODAL */}
      {activePriceListModalVariantIdx !== null && variants[activePriceListModalVariantIdx] && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    Variant Price Lists Tier Matrix
                    <span className="text-xs px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 font-mono text-indigo-700 font-bold">
                      {variants[activePriceListModalVariantIdx]?.sku || `Variant #${activePriceListModalVariantIdx + 1}`}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Define custom pricing tiers (Retail, Wholesale, Dealer, Member, Promotional) for this specific variant.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActivePriceListModalVariantIdx(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Context Summary */}
            <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200/80 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Base Selling Price</span>
                <span className="font-mono font-black text-slate-900 text-sm">
                  {formatAmount(variants[activePriceListModalVariantIdx]?.price ?? basePrice ?? 0)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Unit Cost (COGS)</span>
                <span className="font-mono font-bold text-slate-700 text-sm">
                  {formatAmount(variants[activePriceListModalVariantIdx]?.cost ?? baseCost ?? 0)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Attributes</span>
                <span className="font-bold text-indigo-700 text-xs truncate block">
                  {variants[activePriceListModalVariantIdx]?.options 
                    ? Object.entries(variants[activePriceListModalVariantIdx].options || {}).map(([k, v]) => `${k}: ${v}`).join(', ')
                    : 'Standard Variant'}
                </span>
              </div>
            </div>

            {/* Quick Presets Bar */}
            <div className="flex items-center justify-between p-3 bg-amber-50/60 border border-amber-200/70 rounded-2xl">
              <div className="flex items-center gap-1.5 text-xs text-amber-900 font-bold">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>Auto-Calculate Standard Tiers:</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const vPrice = variants[activePriceListModalVariantIdx]?.price ?? basePrice ?? 0;
                    const vCost = variants[activePriceListModalVariantIdx]?.cost ?? baseCost ?? 0;
                    setTempPriceLists(generateVariantPriceListMatrix(vPrice, basePrice, vCost));
                  }}
                  className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                >
                  Standard Matrix (10% Whs / 15% Dlr)
                </button>
              </div>
            </div>

            {/* Price Lists Table */}
            <div className="space-y-2">
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 font-black uppercase text-[10px] tracking-wider">
                      <th className="p-2.5">Price List Tier</th>
                      <th className="p-2.5 w-32">Price ({currencySymbol})</th>
                      <th className="p-2.5 w-24">Discount</th>
                      <th className="p-2.5 w-24">Gross Margin</th>
                      <th className="p-2.5 w-24">Unit Profit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {tempPriceLists.map((item, pIdx) => {
                      const baseVPrice = variants[activePriceListModalVariantIdx]?.price ?? basePrice ?? 0;
                      const vCost = variants[activePriceListModalVariantIdx]?.cost ?? baseCost ?? 0;
                      const tierPrice = item.price || 0;
                      const discountPct = baseVPrice > 0 ? ((baseVPrice - tierPrice) / baseVPrice) * 100 : 0;
                      const grossProfit = tierPrice - vCost;
                      const marginPct = tierPrice > 0 ? (grossProfit / tierPrice) * 100 : 0;
                      const badgeStyle = getPriceListBadgeStyle(item.priceListName);

                      return (
                        <tr key={item.priceListId || item.priceListName} className="hover:bg-slate-50/80">
                          <td className="p-2.5">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded-md font-bold text-xs border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}>
                                {item.priceListName}
                              </span>
                              {item.minQuantity && item.minQuantity > 1 && (
                                <span className="text-[10px] text-slate-400 font-mono">
                                  (Min {item.minQuantity} units)
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-2.5">
                            <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">
                                {currencySymbol}
                              </span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.price}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  const updated = [...tempPriceLists];
                                  updated[pIdx] = { ...updated[pIdx], price: val };
                                  setTempPriceLists(updated);
                                }}
                                className="w-full pl-6 pr-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-extrabold text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none"
                              />
                            </div>
                          </td>
                          <td className="p-2.5">
                            <span className={`text-xs font-mono font-bold ${discountPct > 0 ? 'text-amber-700' : 'text-slate-500'}`}>
                              {discountPct > 0 ? `-${discountPct.toFixed(1)}%` : '0%'}
                            </span>
                          </td>
                          <td className="p-2.5">
                            <span className={`text-xs font-mono font-bold ${marginPct >= 20 ? 'text-emerald-700' : marginPct > 0 ? 'text-amber-700' : 'text-rose-600'}`}>
                              {marginPct.toFixed(1)}%
                            </span>
                          </td>
                          <td className="p-2.5">
                            <span className={`text-xs font-mono font-bold ${grossProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                              {formatAmount(grossProfit)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  // Reset to default matrix
                  const vPrice = variants[activePriceListModalVariantIdx]?.price ?? basePrice ?? 0;
                  const vCost = variants[activePriceListModalVariantIdx]?.cost ?? baseCost ?? 0;
                  setTempPriceLists(generateVariantPriceListMatrix(vPrice, basePrice, vCost));
                }}
                className="text-xs font-bold text-slate-500 hover:text-slate-700 cursor-pointer"
              >
                Reset to Standard Defaults
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActivePriceListModalVariantIdx(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSavePriceListModal}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" /> Save Variant Price Lists
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
