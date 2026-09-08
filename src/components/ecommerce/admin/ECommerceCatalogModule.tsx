import React, { useState } from 'react';
import { Product } from '../../../types';
import { Search, Eye, EyeOff, Globe, Tag, Filter, CheckCircle2, PackagePlus } from 'lucide-react';
import BundleBuilder from './BundleBuilder';
import { useCurrency } from '../../../context/CurrencyContext';

interface ECommerceCatalogModuleProps {
  products: Product[];
}

export default function ECommerceCatalogModule({ products }: ECommerceCatalogModuleProps) {
  const { formatAmount } = useCurrency();
  const [searchTerm, setSearchTerm] = useState('');
  const [isBuildingBundle, setIsBuildingBundle] = useState(false);

  // This is a local mock of the e-commerce fields that would be joined from `ecommerce_products`
  // In a real database, POS cost/price is in `products`, while online status/price is in `ecommerce_products`
  const [ecomOverrides, setEcomOverrides] = useState<Record<string, { isPublished: boolean; onlinePrice: number | null }>>({});

  const filtered = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  
  const handleSaveBundle = (bundle: Partial<Product>) => {
    // In a real app this would save to database
    console.log('Saved bundle:', bundle);
    alert('Bundle "' + bundle.name + '" created successfully!');
    setIsBuildingBundle(false);
  };
  
  const handleTogglePublish = (productId: string) => {
    setEcomOverrides(prev => {
      const current = prev[productId] || { isPublished: true, onlinePrice: null };
      return { ...prev, [productId]: { ...current, isPublished: !current.isPublished } };
    });
  };

  return (
    <div className="space-y-6">

      {isBuildingBundle ? (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-5xl">
            <BundleBuilder 
              products={products} 
              onSaveBundle={handleSaveBundle} 
              onCancel={() => setIsBuildingBundle(false)} 
            />
          </div>
        </div>
      ) : null}
  
      <div>
        <h2 className="text-xl font-bold text-slate-900">E-Commerce Catalog</h2>
        <p className="text-sm text-slate-500">Manage which POS products are exposed to the storefront and set online-specific pricing overrides.</p>
      </div>

      <div className="flex items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Search POS inventory..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition-colors">
          <Filter className="w-4 h-4" />
          Filter
        </button>
        <button onClick={() => setIsBuildingBundle(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-colors shadow-sm">
          <PackagePlus className="w-4 h-4" />
          Create Bundle
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
              <tr>
                <th className="px-6 py-4">Product Name</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4 text-right">POS Price</th>
                <th className="px-6 py-4 text-right">Online Price</th>
                <th className="px-6 py-4 text-center">Visibility</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(product => {
                const override = ecomOverrides[product.id];
                const isPublished = override ? override.isPublished : true;
                const onlinePrice = override?.onlinePrice ?? product.price;

                return (
                  <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{product.name}</div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">{product.sku}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs">{product.category}</span>
                    </td>
                    <td className="px-6 py-4 text-right text-slate-500 line-through decoration-slate-300">
                      {formatAmount(product.price)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="font-bold text-slate-900">{formatAmount(onlinePrice)}</span>
                        <button className="text-indigo-600 hover:text-indigo-800 p-1" title="Override Online Price">
                          <Tag className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {isPublished ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
                          <Globe className="w-3 h-3" /> Published
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-medium border border-slate-200">
                          <EyeOff className="w-3 h-3" /> Hidden
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleTogglePublish(product.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          isPublished 
                            ? 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700'
                        }`}
                      >
                        {isPublished ? 'Unpublish' : 'Publish Online'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
