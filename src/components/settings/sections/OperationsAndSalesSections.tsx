import React, { useState } from 'react';
import { 
  Smartphone, Package, AlertTriangle, ShoppingCart, Truck, 
  ToggleLeft, ToggleRight, ArrowRight, ArrowLeft, Plus, Trash2, X
} from 'lucide-react';
import { SystemSettings, StaffMember, DeliveryZone } from '../../../types';
import { SettingsSection } from '../SettingsNav';

interface OperationsAndSalesSectionsProps {
  activeSection: SettingsSection;
  formData: SystemSettings;
  updateSection: <K extends keyof SystemSettings>(section: K, values: Partial<SystemSettings[K]>) => void;
  onNavigateSection: (nextSection: SettingsSection) => void;
  activeStaff: StaffMember;
}

export default function OperationsAndSalesSections({
  activeSection,
  formData,
  updateSection,
  onNavigateSection,
  activeStaff
}: OperationsAndSalesSectionsProps) {
  const [newZoneName, setNewZoneName] = useState('');
  const [newZoneFee, setNewZoneFee] = useState(15);
  const [newZoneZips, setNewZoneZips] = useState('');
  const [quickCashInput, setQuickCashInput] = useState('');

  // Quick cash presets helper
  const handleAddQuickCashPreset = () => {
    const val = parseFloat(quickCashInput);
    if (!isNaN(val) && val > 0 && !formData.pos.quickCashPresets.includes(val)) {
      const updated = [...formData.pos.quickCashPresets, val].sort((a, b) => a - b);
      updateSection('pos', { quickCashPresets: updated });
      setQuickCashInput('');
    }
  };

  const handleRemoveQuickCashPreset = (val: number) => {
    const updated = formData.pos.quickCashPresets.filter(p => p !== val);
    updateSection('pos', { quickCashPresets: updated });
  };

  // Add delivery zone helper
  const handleAddDeliveryZone = () => {
    if (!newZoneName.trim()) return;
    const newZone: DeliveryZone = {
      id: `zone-${Date.now()}`,
      name: newZoneName.trim(),
      fee: Number(newZoneFee) || 0,
      zipCodes: newZoneZips.trim() || 'All Area'
    };
    const updatedZones = [...(formData.delivery.deliveryZones || []), newZone];
    updateSection('delivery', { deliveryZones: updatedZones });
    setNewZoneName('');
    setNewZoneFee(15);
    setNewZoneZips('');
  };

  const handleRemoveDeliveryZone = (zoneId: string) => {
    const updatedZones = (formData.delivery.deliveryZones || []).filter(z => z.id !== zoneId);
    updateSection('delivery', { deliveryZones: updatedZones });
  };

  // ====================================================
  // 6. POS SETTINGS
  // ====================================================
  if (activeSection === 'pos') {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-7 shadow-xs space-y-6" id="settings-section-pos">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-indigo-600 shrink-0" />
              <span>POS Terminal & Register Controls</span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">Hardware chime effects, quick cash denominations and supervisor approvals.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Terminal Station Identifier</label>
            <input
              type="text"
              value={formData.pos.terminalName}
              onChange={(e) => updateSection('pos', { terminalName: e.target.value })}
              placeholder="Register #01 - Main Floor"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-bold focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Default Walk-In Customer Label</label>
            <input
              type="text"
              value={formData.pos.defaultCustomerName}
              onChange={(e) => updateSection('pos', { defaultCustomerName: e.target.value })}
              placeholder="Walk-in Guest"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Max Discount % Without Supervisor PIN</label>
            <div className="relative">
              <input
                type="number"
                min="0"
                max="100"
                value={formData.pos.maxDiscountWithoutPin}
                onChange={(e) => updateSection('pos', { maxDiscountWithoutPin: parseInt(e.target.value) || 0 })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-bold focus:ring-2 focus:ring-slate-900 focus:outline-hidden pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">%</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Max Held / Parked Carts Capacity</label>
            <input
              type="number"
              min="1"
              max="50"
              value={formData.pos.maxParkedCarts}
              onChange={(e) => updateSection('pos', { maxParkedCarts: parseInt(e.target.value) || 12 })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-bold focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Quick Cash Presets */}
        <div className="space-y-3 pt-4 border-t border-gray-100">
          <label className="block text-xs font-bold text-slate-800">Quick Cash Tender Preset Chips</label>
          <div className="flex items-center gap-2 flex-wrap">
            {formData.pos.quickCashPresets.map((val) => (
              <span
                key={val}
                className="px-3 py-1.5 bg-slate-100 border border-gray-200 text-slate-800 rounded-xl text-xs font-black font-mono flex items-center gap-2 shadow-3xs"
              >
                {formData.currencyConfig.primaryCurrency} {val}
                <button
                  type="button"
                  onClick={() => handleRemoveQuickCashPreset(val)}
                  className="text-gray-400 hover:text-rose-600 font-bold text-xs cursor-pointer p-0.5"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>

          <div className="flex items-center gap-2 max-w-sm pt-1">
            <input
              type="number"
              placeholder="Add amount (e.g. 200)"
              value={quickCashInput}
              onChange={(e) => setQuickCashInput(e.target.value)}
              className="flex-1 px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-mono focus:outline-hidden"
            />
            <button
              type="button"
              onClick={handleAddQuickCashPreset}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shrink-0 cursor-pointer"
            >
              Add Chip
            </button>
          </div>
        </div>

        {/* Toggles */}
        <div className="space-y-3 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-gray-200 gap-3">
            <div>
              <span className="text-xs font-bold text-slate-800">Web Audio Synthesizer Sound Effects</span>
              <p className="text-[11px] text-gray-500">Play crisp hardware beeps on barcode scans, tender completion and error alerts.</p>
            </div>
            <button
              type="button"
              onClick={() => updateSection('pos', { enableSoundEffects: !formData.pos.enableSoundEffects })}
              className="p-1 text-slate-800 hover:text-indigo-600 transition-colors shrink-0 cursor-pointer"
            >
              {formData.pos.enableSoundEffects ? (
                <ToggleRight className="w-8 h-8 text-indigo-600" />
              ) : (
                <ToggleLeft className="w-8 h-8 text-gray-300" />
              )}
            </button>
          </div>

          <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-gray-200 gap-3">
            <div>
              <span className="text-xs font-bold text-slate-800">Require Supervisor PIN for Order Refunds</span>
              <p className="text-[11px] text-gray-500">Cashiers must request manager PIN approval before issuing merchandise refunds.</p>
            </div>
            <button
              type="button"
              onClick={() => updateSection('pos', { requireManagerPinForRefund: !formData.pos.requireManagerPinForRefund })}
              className="p-1 text-slate-800 hover:text-indigo-600 transition-colors shrink-0 cursor-pointer"
            >
              {formData.pos.requireManagerPinForRefund ? (
                <ToggleRight className="w-8 h-8 text-indigo-600" />
              ) : (
                <ToggleLeft className="w-8 h-8 text-gray-300" />
              )}
            </button>
          </div>

          <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-gray-200 gap-3">
            <div>
              <span className="text-xs font-bold text-slate-800">Fast Barcode Instant Auto-Add</span>
              <p className="text-[11px] text-gray-500">Add scanned barcodes immediately to cart without prompting variant modals.</p>
            </div>
            <button
              type="button"
              onClick={() => updateSection('pos', { fastBarcodeAdd: !formData.pos.fastBarcodeAdd })}
              className="p-1 text-slate-800 hover:text-indigo-600 transition-colors shrink-0 cursor-pointer"
            >
              {formData.pos.fastBarcodeAdd ? (
                <ToggleRight className="w-8 h-8 text-indigo-600" />
              ) : (
                <ToggleLeft className="w-8 h-8 text-gray-300" />
              )}
            </button>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
          <button
            type="button"
            onClick={() => onNavigateSection('invoice')}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Previous</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigateSection('inventory')}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <span>Next: Inventory Rules</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // ====================================================
  // 7. INVENTORY RULES
  // ====================================================
  if (activeSection === 'inventory') {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-7 shadow-xs space-y-6" id="settings-section-inventory">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-indigo-600 shrink-0" />
              <span>Inventory Control Rules & Accounting</span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">Stock deduction lifecycles, negative balance protection and asset valuation.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Stock Deduction Timing</label>
            <select
              value={formData.inventoryRules.stockDeductionTiming}
              onChange={(e) => updateSection('inventoryRules', { stockDeductionTiming: e.target.value as any })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-bold focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
            >
              <option value="on_checkout">Instant (Deduct immediately upon checkout)</option>
              <option value="on_fulfillment">On Fulfillment (Deduct when dispatched)</option>
              <option value="on_invoice">On Invoicing (Deduct when invoice generated)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Inventory Valuation Accounting</label>
            <select
              value={formData.inventoryRules.valuationMethod}
              onChange={(e) => updateSection('inventoryRules', { valuationMethod: e.target.value as any })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-bold focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
            >
              <option value="FIFO">FIFO (First-In, First-Out)</option>
              <option value="LIFO">LIFO (Last-In, First-Out)</option>
              <option value="Weighted Average">Weighted Average Cost (AVCO)</option>
            </select>
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-gray-200 gap-3">
            <div>
              <span className="text-xs font-bold text-slate-800">Prevent Negative Stock (Strict Out-of-Stock Lock)</span>
              <p className="text-[11px] text-gray-500">Block POS register sales if product stock is 0 units.</p>
            </div>
            <button
              type="button"
              onClick={() => updateSection('inventoryRules', { preventNegativeStock: !formData.inventoryRules.preventNegativeStock })}
              className="p-1 text-slate-800 hover:text-indigo-600 transition-colors shrink-0 cursor-pointer"
            >
              {formData.inventoryRules.preventNegativeStock ? (
                <ToggleRight className="w-8 h-8 text-indigo-600" />
              ) : (
                <ToggleLeft className="w-8 h-8 text-gray-300" />
              )}
            </button>
          </div>

          <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-gray-200 gap-3">
            <div>
              <span className="text-xs font-bold text-slate-800">Track Item Matrix Variants</span>
              <p className="text-[11px] text-gray-500">Enable size, color, material and SKU variants on product records.</p>
            </div>
            <button
              type="button"
              onClick={() => updateSection('inventoryRules', { trackVariants: !formData.inventoryRules.trackVariants })}
              className="p-1 text-slate-800 hover:text-indigo-600 transition-colors shrink-0 cursor-pointer"
            >
              {formData.inventoryRules.trackVariants ? (
                <ToggleRight className="w-8 h-8 text-indigo-600" />
              ) : (
                <ToggleLeft className="w-8 h-8 text-gray-300" />
              )}
            </button>
          </div>

          <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-gray-200 gap-3">
            <div>
              <span className="text-xs font-bold text-slate-800">Enforce Mandatory Stock Audit Logging</span>
              <p className="text-[11px] text-gray-500">Every manual stock edit or replenishment creates an immutable audit trail entry.</p>
            </div>
            <button
              type="button"
              onClick={() => updateSection('inventoryRules', { enforceStockAudit: !formData.inventoryRules.enforceStockAudit })}
              className="p-1 text-slate-800 hover:text-indigo-600 transition-colors shrink-0 cursor-pointer"
            >
              {formData.inventoryRules.enforceStockAudit ? (
                <ToggleRight className="w-8 h-8 text-indigo-600" />
              ) : (
                <ToggleLeft className="w-8 h-8 text-gray-300" />
              )}
            </button>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
          <button
            type="button"
            onClick={() => onNavigateSection('pos')}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Previous</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigateSection('lowstock')}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <span>Next: Low Stock</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // ====================================================
  // 8. LOW-STOCK THRESHOLDS
  // ====================================================
  if (activeSection === 'lowstock') {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-7 shadow-xs space-y-6" id="settings-section-lowstock">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
              <span>Low-Stock Thresholds & Automated Reordering</span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">Global buffer levels, emergency replenishment triggers and purchase orders.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Global Low-Stock Warning (Units)</label>
            <input
              type="number"
              min="1"
              value={formData.lowStock.globalLowStockThreshold}
              onChange={(e) => updateSection('lowStock', { globalLowStockThreshold: parseInt(e.target.value) || 10 })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-bold font-mono focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
            />
            <p className="text-[10px] text-gray-400 mt-1">Triggers warning badge on catalog.</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Critical Stock Danger Level</label>
            <input
              type="number"
              min="0"
              value={formData.lowStock.criticalStockThreshold}
              onChange={(e) => updateSection('lowStock', { criticalStockThreshold: parseInt(e.target.value) || 3 })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-bold font-mono focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
            />
            <p className="text-[10px] text-gray-400 mt-1">Triggers red pulse alert on dashboard.</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Default Reorder Multiplier</label>
            <select
              value={formData.lowStock.defaultReorderMultiplier}
              onChange={(e) => updateSection('lowStock', { defaultReorderMultiplier: parseFloat(e.target.value) })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-bold focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
            >
              <option value={2.0}>2.0x Reorder Point</option>
              <option value={2.5}>2.5x Reorder Point</option>
              <option value={3.0}>3.0x Reorder Point</option>
              <option value={5.0}>5.0x Bulk Pallet</option>
            </select>
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-gray-200 gap-3">
            <div>
              <span className="text-xs font-bold text-slate-800">Auto-Generate Purchase Order Drafts</span>
              <p className="text-[11px] text-gray-500">Automatically stage restock drafts when inventory falls below critical threshold.</p>
            </div>
            <button
              type="button"
              onClick={() => updateSection('lowStock', { autoGenerateReorderDrafts: !formData.lowStock.autoGenerateReorderDrafts })}
              className="p-1 text-slate-800 hover:text-indigo-600 transition-colors shrink-0 cursor-pointer"
            >
              {formData.lowStock.autoGenerateReorderDrafts ? (
                <ToggleRight className="w-8 h-8 text-indigo-600" />
              ) : (
                <ToggleLeft className="w-8 h-8 text-gray-300" />
              )}
            </button>
          </div>

          <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-gray-200 gap-3">
            <div>
              <span className="text-xs font-bold text-slate-800">Broadcast Inventory Low-Stock Banners</span>
              <p className="text-[11px] text-gray-500">Display persistent telemetry banner at top of Command Center overview.</p>
            </div>
            <button
              type="button"
              onClick={() => updateSection('lowStock', { notifyOnLowStock: !formData.lowStock.notifyOnLowStock })}
              className="p-1 text-slate-800 hover:text-indigo-600 transition-colors shrink-0 cursor-pointer"
            >
              {formData.lowStock.notifyOnLowStock ? (
                <ToggleRight className="w-8 h-8 text-indigo-600" />
              ) : (
                <ToggleLeft className="w-8 h-8 text-gray-300" />
              )}
            </button>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
          <button
            type="button"
            onClick={() => onNavigateSection('inventory')}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Previous</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigateSection('order')}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <span>Next: Orders</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // ====================================================
  // 9. ORDER SETTINGS
  // ====================================================
  if (activeSection === 'order') {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-7 shadow-xs space-y-6" id="settings-section-order">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-indigo-600 shrink-0" />
              <span>Omnichannel Order Parameters</span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">Order identification, channel permissions and archival policies.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Order Prefix</label>
            <input
              type="text"
              value={formData.order.orderPrefix}
              onChange={(e) => updateSection('order', { orderPrefix: e.target.value })}
              placeholder="ORD-"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-mono font-bold focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Minimum Order Value</label>
            <input
              type="number"
              min="0"
              value={formData.order.minOrderValue}
              onChange={(e) => updateSection('order', { minOrderValue: parseFloat(e.target.value) || 0 })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-bold focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Auto-Archive Completed Orders</label>
            <select
              value={formData.order.autoArchiveDays}
              onChange={(e) => updateSection('order', { autoArchiveDays: parseInt(e.target.value) })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-bold focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
            >
              <option value={30}>After 30 Days</option>
              <option value={90}>After 90 Days</option>
              <option value={180}>After 180 Days</option>
              <option value={365}>After 1 Year</option>
            </select>
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t border-gray-100">
          <label className="block text-xs font-bold text-slate-800">Allowed Commerce Channels</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[
              { key: 'pos', label: 'In-Store POS Register' },
              { key: 'ecom', label: 'Online Storefront' },
              { key: 'mobile', label: 'Mobile App' },
              { key: 'phone', label: 'Phone Orders' },
            ].map((ch) => {
              const checked = (formData.order.enabledChannels as any)[ch.key] ?? true;
              return (
                <label 
                  key={ch.key}
                  className="flex items-center gap-2.5 p-3 bg-slate-50 rounded-xl border border-gray-200 hover:bg-slate-100 cursor-pointer text-xs font-semibold text-slate-700 min-h-[44px]"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      const updated = { ...formData.order.enabledChannels, [ch.key]: e.target.checked };
                      updateSection('order', { enabledChannels: updated });
                    }}
                    className="w-4 h-4 rounded text-indigo-600 shrink-0"
                  />
                  <span>{ch.label}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
          <button
            type="button"
            onClick={() => onNavigateSection('lowstock')}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Previous</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigateSection('delivery')}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <span>Next: Delivery</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // ====================================================
  // 10. DELIVERY & PICKUP
  // ====================================================
  if (activeSection === 'delivery') {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-7 shadow-xs space-y-6" id="settings-section-delivery">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <Truck className="w-5 h-5 text-indigo-600 shrink-0" />
              <span>Delivery Logistics & Store Pickup</span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">Shipping rates, dispatch zones, carrier selection and click-and-collect.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Standard Delivery Fee</label>
            <input
              type="number"
              min="0"
              value={formData.delivery.defaultDeliveryFee}
              onChange={(e) => updateSection('delivery', { defaultDeliveryFee: parseFloat(e.target.value) || 0 })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-bold focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Free Delivery Threshold</label>
            <input
              type="number"
              min="0"
              value={formData.delivery.freeDeliveryThreshold}
              onChange={(e) => updateSection('delivery', { freeDeliveryThreshold: parseFloat(e.target.value) || 0 })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-bold focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Turnaround Estimate</label>
            <input
              type="text"
              value={formData.delivery.estimatedDeliveryDays}
              onChange={(e) => updateSection('delivery', { estimatedDeliveryDays: e.target.value })}
              placeholder="1-2 Business Days"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
            />
          </div>

          <div className="sm:col-span-3">
            <label className="block text-xs font-bold text-slate-700 mb-1">Default Courier Partner</label>
            <select
              value={formData.delivery.selectedCarrier}
              onChange={(e) => updateSection('delivery', { selectedCarrier: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-bold focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
            >
              <option value="In-House Express Dispatch">In-House Fleet / Express Motorbike Courier</option>
              <option value="DHL Express">DHL Express Global Logistics</option>
              <option value="FedEx Express">FedEx Ground / Priority</option>
              <option value="Local Postal Service">Local Postal / National Parcel System</option>
            </select>
          </div>
        </div>

        {/* Custom Zones List */}
        <div className="space-y-3 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-800">Custom Geographic Delivery Zones</label>
            <span className="text-[11px] text-gray-400 font-mono">{formData.delivery.deliveryZones?.length || 0} active</span>
          </div>

          <div className="space-y-2">
            {(formData.delivery.deliveryZones || []).map((zone) => (
              <div key={zone.id} className="p-3 bg-slate-50 rounded-xl border border-gray-200 flex items-center justify-between gap-3 text-xs">
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-slate-900 truncate">{zone.name}</div>
                  <div className="text-[11px] text-gray-500 truncate">Zip: <span className="font-mono">{zone.zipCodes}</span></div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-mono font-bold text-slate-900">
                    {formData.currencyConfig.primaryCurrency} {zone.fee.toFixed(2)}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveDeliveryZone(zone.id)}
                    className="text-gray-400 hover:text-rose-600 p-1 cursor-pointer"
                    title="Remove Zone"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add Zone Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-2">
            <input
              type="text"
              placeholder="Zone Name (e.g. West End)"
              value={newZoneName}
              onChange={(e) => setNewZoneName(e.target.value)}
              className="sm:col-span-2 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm focus:outline-hidden"
            />
            <input
              type="number"
              placeholder="Fee"
              value={newZoneFee}
              onChange={(e) => setNewZoneFee(parseFloat(e.target.value) || 0)}
              className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm font-mono focus:outline-hidden"
            />
            <button
              type="button"
              onClick={handleAddDeliveryZone}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              + Add Zone
            </button>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
          <button
            type="button"
            onClick={() => onNavigateSection('order')}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Previous</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigateSection('payments')}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <span>Next: Payments</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return null;
}
