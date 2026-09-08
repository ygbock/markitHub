import React, { useState } from 'react';
import { Product, BundleKitItem } from '../../../types';
import { Package, Plus, Trash2, X, Save, ArrowRight } from 'lucide-react';
import { useCurrency } from '../../../context/CurrencyContext';

interface BundleBuilderProps {
  products: Product[];
  onSaveBundle: (bundle: Partial<Product>) => void;
  onCancel: () => void;
}

export default function BundleBuilder({ products, onSaveBundle, onCancel }: BundleBuilderProps) {
  const { formatAmount } = useCurrency();
  const [bundleName, setBundleName] = useState('');
  const [bundleSku, setBundleSku] = useState('');
  const [bundlePrice, setBundlePrice] = useState<number>(0);
  const [bundleItems, setBundleItems] = useState<BundleKitItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  
  const baseProducts = products.filter(p => p.productType !== 'Bundle');

  const handleAddItem = () => {
    if (!selectedProductId) return;
    const product = products.find(p => p.id === selectedProductId);
    if (!product) return;

    const existing = bundleItems.find(i => i.productId === selectedProductId);
    if (existing) {
      setBundleItems(bundleItems.map(i => 
        i.productId === selectedProductId ? { ...i, quantity: i.quantity + 1 } : i
      ));
    } else {
      setBundleItems([...bundleItems, {
        productId: product.id,
        sku: product.sku,
        name: product.name,
        quantity: 1,
        unitPrice: product.price
      }]);
    }
    setSelectedProductId('');
  };

  const handleRemoveItem = (productId?: string) => {
    if (!productId) return;
    setBundleItems(bundleItems.filter(i => i.productId !== productId));
  };

  const handleUpdateQuantity = (productId: string | undefined, delta: number) => {
    if (!productId) return;
    setBundleItems(bundleItems.map(i => {
      if (i.productId === productId) {
        const newQ = Math.max(1, i.quantity + delta);
        return { ...i, quantity: newQ };
      }
      return i;
    }));
  };

  const calculateComponentTotal = () => {
    return bundleItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  };

  const handleSave = () => {
    if (!bundleName || !bundleSku || bundleItems.length === 0) return;
    
    onSaveBundle({
      name: bundleName,
      sku: bundleSku,
      price: bundlePrice,
      productType: 'Bundle',
      bundleKitItems: bundleItems,
      stock: 999, // Bundles derive stock from components dynamically in a real app
      category: 'Bundles',
      location: 'Storefront',
      reorderPoint: 0,
      barcode: bundleSku,
      qrCode: bundleSku,
      variants: [],
      salesCount: 0
    });
  };

  const componentTotal = calculateComponentTotal();
  const savings = componentTotal > 0 ? componentTotal - bundlePrice : 0;
  const savingsPercent = componentTotal > 0 ? ((savings / componentTotal) * 100).toFixed(1) : '0.0';

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full max-h-[80vh]">
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Create Product Bundle</h3>
            <p className="text-xs text-slate-500">Link multiple SKUs into a single purchasable bundle</p>
          </div>
        </div>
        <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 p-2">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Bundle Name</label>
            <input 
              type="text" 
              value={bundleName}
              onChange={e => setBundleName(e.target.value)}
              placeholder="e.g. Summer Essentials Kit"
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Bundle SKU</label>
              <input 
                type="text" 
                value={bundleSku}
                onChange={e => setBundleSku(e.target.value)}
                placeholder="BNDL-SUMMER"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Final Bundle Price</label>
              <input 
                type="number" 
                value={bundlePrice}
                onChange={e => setBundlePrice(Number(e.target.value))}
                min="0"
                step="0.01"
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <label className="block text-sm font-bold text-slate-700 mb-3">Add Component Products</label>
            <div className="flex gap-2">
              <select 
                value={selectedProductId}
                onChange={e => setSelectedProductId(e.target.value)}
                className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select a product to add...</option>
                {baseProducts.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.sku}) - {formatAmount(p.price)}</option>
                ))}
              </select>
              <button 
                onClick={handleAddItem}
                disabled={!selectedProductId}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl flex items-center justify-center transition-colors shadow-sm"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 flex flex-col">
          <h4 className="font-bold text-slate-900 mb-4 flex items-center justify-between">
            <span>Bundle Composition</span>
            <span className="text-xs bg-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded-full">{bundleItems.length} items</span>
          </h4>
          
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 min-h-[200px]">
            {bundleItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 py-10">
                <Package className="w-12 h-12 mb-3 opacity-20" />
                <p className="text-sm font-medium">No items in bundle yet</p>
                <p className="text-xs mt-1">Select products from the left to build your bundle.</p>
              </div>
            ) : (
              bundleItems.map((item, idx) => (
                <div key={idx} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between group">
                  <div className="flex-1">
                    <p className="font-bold text-sm text-slate-900">{item.name}</p>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">{item.sku} • {formatAmount(item.unitPrice)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-1 border border-slate-200">
                      <button 
                        onClick={() => handleUpdateQuantity(item.productId, -1)}
                        className="w-6 h-6 flex items-center justify-center bg-white border border-slate-200 rounded text-slate-500 hover:bg-slate-100 font-bold"
                      >-</button>
                      <span className="w-6 text-center text-sm font-bold text-slate-700">{item.quantity}</span>
                      <button 
                        onClick={() => handleUpdateQuantity(item.productId, 1)}
                        className="w-6 h-6 flex items-center justify-center bg-white border border-slate-200 rounded text-slate-500 hover:bg-slate-100 font-bold"
                      >+</button>
                    </div>
                    <button 
                      onClick={() => handleRemoveItem(item.productId)}
                      className="text-slate-300 hover:text-rose-500 transition-colors p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-200 space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500 font-medium">Component Value:</span>
              <span className="font-bold text-slate-700">{formatAmount(componentTotal)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500 font-medium">Bundle Price:</span>
              <span className="font-bold text-indigo-600">{formatAmount(bundlePrice)}</span>
            </div>
            {savings > 0 && (
              <div className="flex justify-between items-center text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-100 mt-2">
                <span>Customer Savings:</span>
                <span>{formatAmount(savings)} ({savingsPercent}%)</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 shrink-0">
        <button onClick={onCancel} className="px-5 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-bold rounded-xl transition-colors shadow-sm">
          Cancel
        </button>
        <button 
          onClick={handleSave}
          disabled={!bundleName || !bundleSku || bundleItems.length === 0}
          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl flex items-center gap-2 transition-colors shadow-sm"
        >
          <Save className="w-4 h-4" />
          Create Bundle SKU
        </button>
      </div>
    </div>
  );
}
