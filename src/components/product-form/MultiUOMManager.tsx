import React, { useState } from 'react';
import { 
  Package, Plus, Trash2, Check, Sparkles, Layers, DollarSign, 
  HelpCircle, ArrowRight, RefreshCw, Barcode, ShieldCheck, Tag, Info, Coffee, Scale, ArrowLeftRight
} from 'lucide-react';
import { PackagingUnitsConfig, PackagingUnitOption, BulkPackagingConfig } from '../../types';
import { useCurrency } from '../../context/CurrencyContext';
import { SUPPORTED_UOMS, calculateWholesaleStockReceipt, convertUOMQuantity, formatUomStockBreakdown } from '../../utils/uomConverter';

interface MultiUOMManagerProps {
  hasMultiUOM: boolean;
  setHasMultiUOM: (val: boolean) => void;
  packagingUnits?: PackagingUnitsConfig;
  setPackagingUnits: React.Dispatch<React.SetStateAction<PackagingUnitsConfig>>;
  bulkPackaging?: BulkPackagingConfig;
  setBulkPackaging: React.Dispatch<React.SetStateAction<BulkPackagingConfig>>;
  baseUnit: string;
  setBaseUnit: (val: string) => void;
  baseCost: number;
  setBaseCost: (val: number) => void;
  basePrice: number;
  setBasePrice: (val: number) => void;
  stock: number;
  setStock: (val: number) => void;
}

const COMMON_PACKAGE_TYPES = ['Carton', 'Box', 'Pack', 'Case', 'Sack', 'Bundle', 'Crate', 'Dozen', 'Packet'];
const COMMON_BASE_UNITS = ['Piece', 'Gram', 'Milliliter', 'Centimeter', 'tea bag', 'tablet', 'bottle', 'can'];

export default function MultiUOMManager({
  hasMultiUOM,
  setHasMultiUOM,
  packagingUnits,
  setPackagingUnits,
  bulkPackaging,
  setBulkPackaging,
  baseUnit,
  setBaseUnit,
  baseCost,
  setBaseCost,
  basePrice,
  setBasePrice,
  stock,
  setStock
}: MultiUOMManagerProps) {
  const { currencySymbol, formatAmount } = useCurrency();
  const [inboundBoxesReceived, setInboundBoxesReceived] = useState<number>(5);

  const safeUnitsConfig: PackagingUnitsConfig = packagingUnits || {
    base_unit: baseUnit || 'piece',
    multiplier: bulkPackaging?.itemsPerPackage || 100,
    outerPackageType: bulkPackaging?.outerPackageType || 'Box',
    outerPackageCost: bulkPackaging?.outerPackageCost || (baseCost ? baseCost * 100 : 25),
    units: []
  };

  const currentUnits: PackagingUnitOption[] = safeUnitsConfig.units && safeUnitsConfig.units.length > 0 
    ? safeUnitsConfig.units 
    : [
        {
          id: 'uom-base',
          unitName: `Single (1 ${baseUnit || 'piece'})`,
          unitType: 'retail_unit',
          multiplier: 1,
          base_unit: baseUnit || 'piece',
          price: basePrice || 0.60,
          cost: baseCost || 0.25,
          allowSale: true,
          isBaseUnit: true
        },
        {
          id: 'uom-pair',
          unitName: `2 ${baseUnit || 'tea bag'}s (Retail Pair)`,
          unitType: 'bundle',
          multiplier: 2,
          base_unit: baseUnit || 'piece',
          price: 1.00,
          cost: Number(((baseCost || 0.25) * 2).toFixed(2)),
          allowSale: true
        },
        {
          id: 'uom-pack10',
          unitName: `Pack of 10 ${baseUnit || 'piece'}s`,
          unitType: 'bundle',
          multiplier: 10,
          base_unit: baseUnit || 'piece',
          price: 4.50,
          cost: Number(((baseCost || 0.25) * 10).toFixed(2)),
          allowSale: true
        },
        {
          id: 'uom-box',
          unitName: `Master ${safeUnitsConfig.outerPackageType || 'Box'} (${safeUnitsConfig.multiplier || 100} ${baseUnit || 'piece'}s)`,
          unitType: 'master_pack',
          multiplier: safeUnitsConfig.multiplier || 100,
          base_unit: baseUnit || 'piece',
          price: 25.00,
          cost: safeUnitsConfig.outerPackageCost || (baseCost ? baseCost * 100 : 25),
          allowSale: true
        }
      ];

  const updateUnitsList = (newUnits: PackagingUnitOption[]) => {
    const updatedConfig: PackagingUnitsConfig = {
      ...safeUnitsConfig,
      base_unit: baseUnit,
      units: newUnits
    };
    setPackagingUnits(updatedConfig);

    // Sync back to bulk packaging for backward compatibility
    const masterPack = newUnits.find(u => u.unitType === 'master_pack' || u.multiplier >= 10);
    const dozenPack = newUnits.find(u => u.multiplier === 12);
    const basePack = newUnits.find(u => u.multiplier === 1) || newUnits[0];

    setBulkPackaging({
      outerPackageType: safeUnitsConfig.outerPackageType || 'Box',
      itemsPerPackage: masterPack ? masterPack.multiplier : (safeUnitsConfig.multiplier || 100),
      outerPackageCost: masterPack?.cost || safeUnitsConfig.outerPackageCost || 25,
      unitCost: basePack?.cost || baseCost || 0.25,
      unitRetailPrice: basePack?.price || basePrice || 0.60,
      dozenRetailPrice: dozenPack?.price,
      outerPackageRetailPrice: masterPack?.price,
      allowDozenSale: Boolean(dozenPack?.allowSale),
      allowPackageSale: Boolean(masterPack?.allowSale)
    });
  };

  const handleAddUnit = (
    name: string,
    multiplier: number,
    price: number,
    type: 'retail_unit' | 'dozen' | 'master_pack' | 'bundle' | 'custom' = 'custom'
  ) => {
    const cost = Number(((baseCost || 0.25) * multiplier).toFixed(2));
    const newUnit: PackagingUnitOption = {
      id: `uom-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      unitName: name,
      unitType: type,
      multiplier: Math.max(1, multiplier),
      base_unit: baseUnit || 'piece',
      price: Math.max(0, price),
      cost: cost,
      allowSale: true
    };
    updateUnitsList([...currentUnits, newUnit]);
  };

  const handleUpdateUnitField = (index: number, field: keyof PackagingUnitOption, value: any) => {
    const updated = currentUnits.map((item, idx) => {
      if (idx !== index) return item;
      const modified = { ...item, [field]: value };
      // If multiplier changed, auto-suggest unit cost based on baseCost
      if (field === 'multiplier' && baseCost > 0) {
        modified.cost = Number((baseCost * Number(value)).toFixed(2));
      }
      return modified;
    });
    updateUnitsList(updated);
  };

  const handleDeleteUnit = (index: number) => {
    const updated = currentUnits.filter((_, idx) => idx !== index);
    updateUnitsList(updated);
  };

  const handleApplyPreset = (type: 'carton' | 'box' | 'pack' | 'weight' | 'volume' | 'length') => {
    if (type === 'carton') {
      setBaseUnit('Piece');
      setBaseCost(0.80);
      setBasePrice(1.50);
      const cartonCost = 19.20;
      const cartonPrice = 30.00;
      const cartonUnits: PackagingUnitOption[] = [
        { id: 'uom-piece', unitName: 'Single Piece', unitType: 'retail_unit', multiplier: 1, base_unit: 'Piece', price: 1.50, cost: 0.80, allowSale: true, isBaseUnit: true },
        { id: 'uom-pack-6', unitName: 'Pack (6 Pieces)', unitType: 'bundle', multiplier: 6, base_unit: 'Piece', price: 8.00, cost: 4.80, allowSale: true },
        { id: 'uom-box-12', unitName: 'Box (12 Pieces)', unitType: 'bundle', multiplier: 12, base_unit: 'Piece', price: 15.00, cost: 9.60, allowSale: true },
        { id: 'uom-carton-24', unitName: 'Carton (24 Pieces)', unitType: 'master_pack', multiplier: 24, base_unit: 'Piece', price: cartonPrice, cost: cartonCost, allowSale: true }
      ];
      setPackagingUnits({ base_unit: 'Piece', multiplier: 24, outerPackageType: 'Carton', outerPackageCost: cartonCost, units: cartonUnits });
      setBulkPackaging({ outerPackageType: 'Carton', itemsPerPackage: 24, outerPackageCost: cartonCost, unitCost: 0.80, unitRetailPrice: 1.50, outerPackageRetailPrice: cartonPrice, allowPackageSale: true });
    } else if (type === 'box') {
      setBaseUnit('Piece');
      setBaseCost(1.20);
      setBasePrice(2.50);
      const boxCost = 14.40;
      const boxPrice = 25.00;
      const boxUnits: PackagingUnitOption[] = [
        { id: 'uom-piece-1', unitName: 'Single Piece', unitType: 'retail_unit', multiplier: 1, base_unit: 'Piece', price: 2.50, cost: 1.20, allowSale: true, isBaseUnit: true },
        { id: 'uom-box-12', unitName: 'Box (12 Pieces)', unitType: 'master_pack', multiplier: 12, base_unit: 'Piece', price: boxPrice, cost: boxCost, allowSale: true }
      ];
      setPackagingUnits({ base_unit: 'Piece', multiplier: 12, outerPackageType: 'Box', outerPackageCost: boxCost, units: boxUnits });
      setBulkPackaging({ outerPackageType: 'Box', itemsPerPackage: 12, outerPackageCost: boxCost, unitCost: 1.20, unitRetailPrice: 2.50, outerPackageRetailPrice: boxPrice, allowPackageSale: true });
    } else if (type === 'weight') {
      setBaseUnit('Gram');
      setBaseCost(0.01);
      setBasePrice(0.025);
      const kgUnits: PackagingUnitOption[] = [
        { id: 'uom-g-1', unitName: '1 Gram (g)', unitType: 'retail_unit', multiplier: 1, base_unit: 'Gram', price: 0.025, cost: 0.01, allowSale: true, isBaseUnit: true },
        { id: 'uom-g-250', unitName: 'Pack (250g)', unitType: 'bundle', multiplier: 250, base_unit: 'Gram', price: 5.50, cost: 2.50, allowSale: true },
        { id: 'uom-g-500', unitName: 'Half Kilogram (500g)', unitType: 'bundle', multiplier: 500, base_unit: 'Gram', price: 10.00, cost: 5.00, allowSale: true },
        { id: 'uom-kg-1', unitName: '1 Kilogram (1000g)', unitType: 'master_pack', multiplier: 1000, base_unit: 'Gram', price: 18.00, cost: 10.00, allowSale: true }
      ];
      setPackagingUnits({ base_unit: 'Gram', multiplier: 1000, outerPackageType: 'Sack', outerPackageCost: 10.00, units: kgUnits });
    } else if (type === 'volume') {
      setBaseUnit('Milliliter');
      setBaseCost(0.002);
      setBasePrice(0.005);
      const literUnits: PackagingUnitOption[] = [
        { id: 'uom-ml-1', unitName: '1 Milliliter (mL)', unitType: 'retail_unit', multiplier: 1, base_unit: 'Milliliter', price: 0.005, cost: 0.002, allowSale: true, isBaseUnit: true },
        { id: 'uom-ml-250', unitName: 'Bottle (250 mL)', unitType: 'bundle', multiplier: 250, base_unit: 'Milliliter', price: 1.25, cost: 0.50, allowSale: true },
        { id: 'uom-liter-1', unitName: '1 Liter (1000 mL)', unitType: 'master_pack', multiplier: 1000, base_unit: 'Milliliter', price: 4.50, cost: 2.00, allowSale: true }
      ];
      setPackagingUnits({ base_unit: 'Milliliter', multiplier: 1000, outerPackageType: 'Carton', outerPackageCost: 2.00, units: literUnits });
    } else if (type === 'length') {
      setBaseUnit('Centimeter');
      setBaseCost(0.05);
      setBasePrice(0.12);
      const lengthUnits: PackagingUnitOption[] = [
        { id: 'uom-cm-1', unitName: '1 Centimeter (cm)', unitType: 'retail_unit', multiplier: 1, base_unit: 'Centimeter', price: 0.12, cost: 0.05, allowSale: true, isBaseUnit: true },
        { id: 'uom-meter-1', unitName: '1 Meter (100 cm)', unitType: 'master_pack', multiplier: 100, base_unit: 'Centimeter', price: 10.00, cost: 5.00, allowSale: true }
      ];
      setPackagingUnits({ base_unit: 'Centimeter', multiplier: 100, outerPackageType: 'Bundle', outerPackageCost: 5.00, units: lengthUnits });
    }
  };

  const handleApplyOlindaTeaPreset = () => {
    setBaseUnit('tea bag');
    setBaseCost(0.18);
    setBasePrice(0.60);
    const boxMultiplier = 100;
    const boxCost = 18.00;
    const boxPrice = 25.00;

    const olindaUnits: PackagingUnitOption[] = [
      {
        id: 'olinda-single',
        unitName: 'Single (1 Tea Bag)',
        unitType: 'retail_unit',
        multiplier: 1,
        base_unit: 'tea bag',
        price: 0.60,
        cost: 0.18,
        allowSale: true,
        isBaseUnit: true
      },
      {
        id: 'olinda-pair',
        unitName: '2 Tea Bags (Retail Pair)',
        unitType: 'bundle',
        multiplier: 2,
        base_unit: 'tea bag',
        price: 1.00, // 2 tea bags for Le 1
        cost: 0.36,
        allowSale: true
      },
      {
        id: 'olinda-pack10',
        unitName: 'Pack of 10 Tea Bags',
        unitType: 'bundle',
        multiplier: 10,
        base_unit: 'tea bag',
        price: 4.50,
        cost: 1.80,
        allowSale: true
      },
      {
        id: 'olinda-halfbox',
        unitName: 'Half Box (50 Tea Bags)',
        unitType: 'bundle',
        multiplier: 50,
        base_unit: 'tea bag',
        price: 13.50,
        cost: 9.00,
        allowSale: true
      },
      {
        id: 'olinda-box',
        unitName: 'Box of 100 Tea Bags',
        unitType: 'master_pack',
        multiplier: 100,
        base_unit: 'tea bag',
        price: boxPrice, // Le 25.00 for full box
        cost: boxCost,
        allowSale: true
      }
    ];

    setPackagingUnits({
      base_unit: 'tea bag',
      multiplier: 100,
      outerPackageType: 'Box',
      outerPackageCost: boxCost,
      units: olindaUnits
    });

    setBulkPackaging({
      outerPackageType: 'Box',
      itemsPerPackage: 100,
      outerPackageCost: boxCost,
      unitCost: 0.18,
      unitRetailPrice: 0.60,
      outerPackageRetailPrice: boxPrice,
      allowPackageSale: true,
      allowDozenSale: false
    });
  };

  const handleApplyInboundStockConversion = () => {
    const multiplier = safeUnitsConfig.multiplier || 100;
    const totalBaseUnits = inboundBoxesReceived * multiplier;
    setStock(totalBaseUnits);
  };

  return (
    <div className="space-y-5">
      {/* Master Toggle Banner */}
      <div className={`p-4 sm:p-5 rounded-2xl border-2 transition-all ${
        hasMultiUOM 
          ? 'bg-amber-950/10 border-amber-500 shadow-sm' 
          : 'bg-white border-slate-200 hover:border-slate-300'
      }`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
              hasMultiUOM ? 'bg-amber-600 text-white shadow-xs' : 'bg-slate-100 text-slate-500'
            }`}>
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-black text-slate-900">
                  Multiple Units of Measure (Multi-UOM) & Pack Breakdown
                </h4>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                  hasMultiUOM ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                }`}>
                  {hasMultiUOM ? 'Enabled for this product' : 'Disabled (Single Standard Unit)'}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed max-w-2xl">
                Enable when a product is purchased in bulk packaging (e.g. Box of 100) and retailed in multiple custom unit quantities 
                (e.g., <strong>2 tea bags for {formatAmount(1.00)}</strong>, <strong>3 pieces for {formatAmount(1.50)}</strong>, or full boxes). 
                All sales seamlessly draw from a single shared stock pool.
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
            <input
              type="checkbox"
              checked={hasMultiUOM}
              onChange={(e) => setHasMultiUOM(e.target.checked)}
              className="sr-only peer"
              id="toggle-multi-uom"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
          </label>
        </div>

        {/* Preset demo quick action */}
        {hasMultiUOM && (
          <div className="mt-4 pt-3 border-t border-amber-200/60 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-[11px] text-amber-900 font-bold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Standard Wholesaler & Retail UOM Presets:</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => handleApplyPreset('carton')}
                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-xs"
              >
                <Package className="w-3.5 h-3.5" /> 1 Carton = 24 Pieces
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('box')}
                className="px-2.5 py-1 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-xs"
              >
                <Package className="w-3.5 h-3.5" /> 1 Box = 12 Pieces
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('weight')}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-xs"
              >
                <Scale className="w-3.5 h-3.5" /> 1 kg = 1000 Grams
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('volume')}
                className="px-2.5 py-1 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-xs"
              >
                1 Liter = 1000 mL
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('length')}
                className="px-2.5 py-1 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-xs"
              >
                1 Meter = 100 cm
              </button>
              <button
                type="button"
                onClick={handleApplyOlindaTeaPreset}
                className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-xs"
              >
                <Coffee className="w-3.5 h-3.5" /> Tea Bags (100/box)
              </button>
            </div>
          </div>
        )}
      </div>

      {hasMultiUOM && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Section 1: Inbound Purchasing & Base Stock Conversion */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                1. Base Unit Definition & Master Inbound Package
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                Central Inventory Count = Base Units
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              {/* Base Unit */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                  Base Inventory Unit
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={baseUnit}
                    onChange={(e) => setBaseUnit(e.target.value)}
                    placeholder="e.g. tea bag, piece, tablet"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {['Piece', 'Box', 'Carton', 'Pack', 'Kilogram', 'Gram', 'Liter', 'Milliliter', 'Meter', 'Centimeter'].map(u => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setBaseUnit(u)}
                      className={`text-[9px] px-1.5 py-0.5 rounded border transition-all ${
                        baseUnit.toLowerCase() === u.toLowerCase() ? 'bg-amber-600 text-white border-amber-600 font-bold' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>

              {/* Master Package Type */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                  Outer Inbound Package
                </label>
                <select
                  value={safeUnitsConfig.outerPackageType || 'Box'}
                  onChange={(e) => {
                    const type = e.target.value;
                    setPackagingUnits({ ...safeUnitsConfig, outerPackageType: type });
                    setBulkPackaging({ ...bulkPackaging, outerPackageType: type });
                  }}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  {COMMON_PACKAGE_TYPES.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-400 block">Supplier packaging container</span>
              </div>

              {/* Items per Outer Package */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                  Base Units per {safeUnitsConfig.outerPackageType || 'Box'}
                </label>
                <input
                  type="number"
                  min="2"
                  value={safeUnitsConfig.multiplier || 100}
                  onChange={(e) => {
                    const mult = Math.max(2, Number(e.target.value));
                    setPackagingUnits({ ...safeUnitsConfig, multiplier: mult });
                    setBulkPackaging({ ...bulkPackaging, itemsPerPackage: mult });
                  }}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-400 block">e.g. 100 tea bags in 1 box</span>
              </div>

              {/* Outer Package Purchase Cost */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                  Purchase Cost per {safeUnitsConfig.outerPackageType || 'Box'}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 font-mono text-slate-400 font-bold text-xs">{currencySymbol}</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={safeUnitsConfig.outerPackageCost || 25}
                    onChange={(e) => {
                      const c = Math.max(0, Number(e.target.value));
                      const mult = safeUnitsConfig.multiplier || 100;
                      const unitC = Number((c / mult).toFixed(3));
                      setPackagingUnits({ ...safeUnitsConfig, outerPackageCost: c });
                      setBaseCost(unitC);
                      setBulkPackaging({ ...bulkPackaging, outerPackageCost: c, unitCost: unitC });
                    }}
                    className="w-full pl-7 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                <span className="text-[10px] text-emerald-700 font-medium block">
                  = {formatAmount((safeUnitsConfig.outerPackageCost || 25) / (safeUnitsConfig.multiplier || 100))} per {baseUnit || 'piece'} base cost
                </span>
              </div>
            </div>

            {/* Quick Stock Receipt Converter */}
            <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-amber-700 shrink-0" />
                <div>
                  <span className="font-bold text-amber-950">Inbound Stock Converter:</span>
                  <span className="text-amber-800 ml-1">
                    Calculate total base units from received {safeUnitsConfig.outerPackageType || 'Box'}es.
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  value={inboundBoxesReceived}
                  onChange={(e) => setInboundBoxesReceived(Math.max(1, Number(e.target.value)))}
                  className="w-16 px-2 py-1 bg-white border border-amber-300 rounded-lg text-xs font-mono font-bold text-center"
                />
                <span className="text-amber-900 font-bold text-xs">
                  {safeUnitsConfig.outerPackageType || 'Box'}es = <strong className="text-amber-950 font-black">{inboundBoxesReceived * (safeUnitsConfig.multiplier || 100)} {baseUnit || 'piece'}s</strong>
                </span>
                <button
                  type="button"
                  onClick={handleApplyInboundStockConversion}
                  className="px-2.5 py-1 bg-amber-700 hover:bg-amber-800 text-white rounded-lg font-bold text-[11px] transition-all cursor-pointer shadow-2xs"
                >
                  Set Stock ({inboundBoxesReceived * (safeUnitsConfig.multiplier || 100)})
                </button>
              </div>
            </div>
          </div>

          {/* Section 2: Customizable Selling Units Matrix */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-amber-600" />
                  2. Custom Retail & Wholesale Selling Units
                </span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Configure custom pack sizes, pairs, or bundle pricing. Cashiers can sell any unit at POS; inventory automatically deducts in base units.
                </p>
              </div>

              {/* Quick Add Presets */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleAddUnit(`2 ${baseUnit || 'piece'}s (Retail Pair)`, 2, 1.00, 'bundle')}
                  className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3 h-3 text-amber-600" /> + Retail Pair (2 pcs for {currencySymbol}1)
                </button>

                <button
                  type="button"
                  onClick={() => handleAddUnit(`3 ${baseUnit || 'piece'}s Bundle`, 3, 1.50, 'bundle')}
                  className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3 h-3 text-amber-600" /> + 3-Piece Bundle
                </button>

                <button
                  type="button"
                  onClick={() => handleAddUnit(`Pack of 10 ${baseUnit || 'piece'}s`, 10, 4.50, 'bundle')}
                  className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3 h-3 text-amber-600" /> + Pack of 10
                </button>

                <button
                  type="button"
                  onClick={() => handleAddUnit(`Dozen (12 ${baseUnit || 'piece'}s)`, 12, Number(((basePrice || 0.60) * 10.5).toFixed(2)), 'dozen')}
                  className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> + Dozen (12)
                </button>

                <button
                  type="button"
                  onClick={() => handleAddUnit(`Custom Bundle (${baseUnit})`, 5, Number(((basePrice || 0.60) * 4.5).toFixed(2)), 'custom')}
                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Custom Unit
                </button>
              </div>
            </div>

            {/* Units Table / Grid */}
            <div className="space-y-2.5">
              {currentUnits.map((u, idx) => {
                const equivUnitPrice = u.multiplier > 0 ? u.price / u.multiplier : 0;
                const cogs = u.cost !== undefined ? u.cost : (baseCost * u.multiplier);
                const profit = u.price - cogs;
                const margin = u.price > 0 ? (profit / u.price) * 100 : 0;

                return (
                  <div
                    key={u.id || idx}
                    className={`p-3.5 rounded-xl border-2 transition-all ${
                      u.allowSale !== false 
                        ? 'bg-slate-50/80 border-slate-200 hover:border-amber-300' 
                        : 'bg-slate-100/60 border-slate-200 opacity-60'
                    }`}
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                      {/* Unit Name & Type */}
                      <div className="sm:col-span-4 space-y-1">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={u.unitName}
                            onChange={(e) => handleUpdateUnitField(idx, 'unitName', e.target.value)}
                            placeholder="Unit Name (e.g. 2 Tea Bags)"
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                          />
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500">
                          <span className="px-1.5 py-0.5 rounded bg-slate-200 font-mono font-bold text-slate-700 uppercase">
                            {u.unitType || 'unit'}
                          </span>
                          <span>Barcode:</span>
                          <input
                            type="text"
                            value={u.barcode || ''}
                            onChange={(e) => handleUpdateUnitField(idx, 'barcode', e.target.value)}
                            placeholder="Optional Barcode"
                            className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono w-28"
                          />
                        </div>
                      </div>

                      {/* Multiplier in Base Units */}
                      <div className="sm:col-span-2 space-y-1">
                        <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                          Conversion Multiplier
                        </label>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="1"
                            value={u.multiplier}
                            onChange={(e) => handleUpdateUnitField(idx, 'multiplier', Math.max(1, Number(e.target.value)))}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900"
                          />
                          <span className="text-[10px] text-slate-400 font-bold shrink-0">{baseUnit || 'pcs'}</span>
                        </div>
                      </div>

                      {/* Selling Price */}
                      <div className="sm:col-span-2 space-y-1">
                        <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                          Selling Price
                        </label>
                        <div className="relative">
                          <span className="absolute left-2 top-1.5 font-mono text-slate-400 font-bold text-xs">{currencySymbol}</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={u.price}
                            onChange={(e) => handleUpdateUnitField(idx, 'price', Math.max(0, Number(e.target.value)))}
                            className="w-full pl-5 pr-2 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-mono font-bold text-emerald-800"
                          />
                        </div>
                        <span className="text-[9px] text-slate-500 block">
                          {formatAmount(equivUnitPrice)} / {baseUnit || 'pc'}
                        </span>
                      </div>

                      {/* Profit & Margin Breakdown */}
                      <div className="sm:col-span-3 space-y-1">
                        <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                          Margin & Cost Valuation
                        </label>
                        <div className="flex items-center justify-between text-[11px] bg-white px-2 py-1.5 rounded-lg border border-slate-200">
                          <span className="text-slate-500 font-mono">Cost: {formatAmount(cogs)}</span>
                          <span className={`font-bold font-mono ${profit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                            {formatAmount(profit)} ({margin.toFixed(0)}%)
                          </span>
                        </div>
                      </div>

                      {/* Controls (Sale Toggle + Delete) */}
                      <div className="sm:col-span-1 flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleUpdateUnitField(idx, 'allowSale', u.allowSale === false ? true : false)}
                          title={u.allowSale !== false ? 'Active for POS Selling' : 'Disabled for POS'}
                          className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                            u.allowSale !== false 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' 
                              : 'bg-slate-200 text-slate-500 border-slate-300'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteUnit(idx)}
                          disabled={currentUnits.length <= 1}
                          title="Remove unit of measure"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 3: POS Cashier Stock Breakdown Preview */}
          <div className="bg-gradient-to-r from-slate-900 to-amber-950 rounded-2xl p-4 sm:p-5 text-white space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Live POS Cashier & Inventory Reduction Simulation
              </span>
              <span className="px-2 py-0.5 rounded bg-white/10 text-slate-200 text-[10px] font-mono">
                Current Stock: {stock} {baseUnit || 'pcs'}
              </span>
            </div>

            <div className="text-xs text-slate-300 leading-relaxed">
              With <strong>{stock} {baseUnit || 'pieces'}</strong> currently in inventory, the POS register can fulfill:
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {currentUnits.filter(u => u.allowSale !== false).map((u, i) => {
                const maxUnits = u.multiplier > 0 ? Math.floor(stock / u.multiplier) : 0;
                return (
                  <div key={i} className="p-2.5 bg-white/10 rounded-xl border border-white/10 space-y-1">
                    <span className="text-[11px] font-bold text-white block truncate">{u.unitName}</span>
                    <div className="flex justify-between items-center text-[10px] text-amber-200">
                      <span>{formatAmount(u.price)}</span>
                      <span className="font-bold text-emerald-400">{maxUnits} sellable</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
