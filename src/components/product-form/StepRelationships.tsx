import React, { useState, useMemo } from 'react';
import {
  Link2, Sparkles, Plus, Trash2, Search, ArrowUpRight,
  RefreshCcw, ShoppingBag, ArrowRightLeft, Layers, HelpCircle,
  BrainCircuit, CheckCircle2, Cpu
} from 'lucide-react';
import { Product, ProductRelationships, ProductRelationshipType } from '../../types';
import {
  runSmartMatchEngine,
  autoClassifyFullMatrixML
} from '../../services/smartMatchEngine';

interface StepRelationshipsProps {
  productName: string;
  category: string;
  brand?: string;
  currentProductId?: string;
  relationships?: ProductRelationships;
  setRelationships: (value: ProductRelationships) => void;
  allProducts: Product[];
}

const RELATIONSHIP_CONFIGS: {
  type: ProductRelationshipType;
  key: keyof ProductRelationships;
  title: string;
  example: string;
  icon: any;
  color: string;
  description: string;
}[] = [
  {
    type: 'related',
    key: 'relatedProductIds',
    title: 'Related Products',
    example: 'Phone → Phone Case',
    icon: Link2,
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    description: 'Products that naturally complement or belong to the same accessory collection.',
  },
  {
    type: 'recommended',
    key: 'recommendedProductIds',
    title: 'Recommended Products',
    example: 'Laptop → Wireless Mouse',
    icon: Sparkles,
    color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    description: 'Algorithmic or curated suggestions shown on product detail pages.',
  },
  {
    type: 'boughtTogether',
    key: 'boughtTogetherProductIds',
    title: 'Frequently Bought Together',
    example: 'Printer → Ink Cartridge',
    icon: ShoppingBag,
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    description: 'Products commonly purchased together in a single transaction (1-click bundle add).',
  },
  {
    type: 'replacement',
    key: 'replacementProductIds',
    title: 'Replacement Products',
    example: 'Old Model → New Model / Superseded SKU',
    icon: RefreshCcw,
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    description: 'Direct successor, upgraded version, or interchangeable spare part.',
  },
  {
    type: 'upsell',
    key: 'upsellProductIds',
    title: 'Upsell Products',
    example: 'Basic Laptop → Premium Laptop Pro',
    icon: ArrowUpRight,
    color: 'bg-purple-50 text-purple-700 border-purple-200',
    description: 'Higher-end, premium, or featured alternatives to increase order value.',
  },
  {
    type: 'crossSell',
    key: 'crossSellProductIds',
    title: 'Cross-Sell Products',
    example: 'Camera → High-Speed Memory Card',
    icon: ArrowRightLeft,
    color: 'bg-rose-50 text-rose-700 border-rose-200',
    description: 'Relevant add-ons, extended warranties, or essential peripheral accessories.',
  },
];

export default function StepRelationships({
  productName,
  category,
  brand,
  currentProductId,
  relationships = {},
  setRelationships,
  allProducts,
}: StepRelationshipsProps) {
  const [activeTab, setActiveTab] = useState<ProductRelationshipType>('related');
  const [searchTerm, setSearchTerm] = useState('');
  const [showMlInsights, setShowMlInsights] = useState(true);

  const currentConfig = RELATIONSHIP_CONFIGS.find(c => c.type === activeTab)!;
  const currentAssignedIds: string[] = relationships[currentConfig.key] || [];

  // Target product construct for ML Engine
  const targetProductConstruct: Partial<Product> = useMemo(() => {
    const found = allProducts.find(p => p.id === currentProductId);
    if (found) return found;
    return {
      id: currentProductId || 'temp-id',
      name: productName || 'New Product',
      category: category || 'General',
      brand: brand || '',
      price: 100,
    };
  }, [allProducts, currentProductId, productName, category, brand]);

  // Execute ML Smart-Match calculation for current active relationship tab
  const mlSmartMatchResult = useMemo(() => {
    return runSmartMatchEngine(
      targetProductConstruct,
      allProducts,
      activeTab,
      undefined, // uses default initial orders
      6
    );
  }, [targetProductConstruct, allProducts, activeTab]);

  // Filter candidates excluding current product and already assigned in active tab
  const availableCandidates = allProducts.filter(p => {
    if (p.id === currentProductId) return false;
    if (currentAssignedIds.includes(p.id)) return false;
    if (!searchTerm.trim()) return true;

    const query = searchTerm.toLowerCase();
    return (
      p.name.toLowerCase().includes(query) ||
      p.sku.toLowerCase().includes(query) ||
      p.category.toLowerCase().includes(query) ||
      (p.brand && p.brand.toLowerCase().includes(query))
    );
  });

  const assignedProductObjects = currentAssignedIds
    .map(id => allProducts.find(p => p.id === id))
    .filter((p): p is Product => Boolean(p));

  const handleAddProduct = (targetId: string) => {
    const updated = Array.from(new Set([...currentAssignedIds, targetId]));
    setRelationships({
      ...relationships,
      [currentConfig.key]: updated,
    });
  };

  const handleRemoveProduct = (targetId: string) => {
    const updated = currentAssignedIds.filter(id => id !== targetId);
    setRelationships({
      ...relationships,
      [currentConfig.key]: updated,
    });
  };

  // ML 1-Click Auto-Suggest for Active Category
  const handleAutoSuggestCurrentCategory = () => {
    const topMlCandidates = mlSmartMatchResult.matches
      .filter(m => !currentAssignedIds.includes(m.product.id))
      .slice(0, 3)
      .map(m => m.product.id);

    const updated = Array.from(new Set([...currentAssignedIds, ...topMlCandidates]));
    setRelationships({
      ...relationships,
      [currentConfig.key]: updated,
    });
  };

  // ML Full Matrix Auto-Classification
  const handleAutoClassifyAll = () => {
    const mlFullMatrix = autoClassifyFullMatrixML(
      targetProductConstruct,
      allProducts
    );

    // Merge ML matrix with existing relationships
    const merged: ProductRelationships = { ...relationships };
    (Object.keys(mlFullMatrix) as (keyof ProductRelationships)[]).forEach(k => {
      merged[k] = Array.from(new Set([...(relationships[k] || []), ...(mlFullMatrix[k] || [])]));
    });

    setRelationships(merged);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner with ML Smart-Match Indicator */}
      <div className="p-4.5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl shadow-md flex flex-col md:flex-row md:items-center justify-between gap-3 border border-indigo-500/20">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-500/20 border border-indigo-400/30 rounded-lg text-indigo-300">
              <BrainCircuit className="w-5 h-5 text-indigo-400 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-100 flex items-center gap-2">
                ML Smart-Match Relationship Matrix
                <span className="text-[10px] bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 px-2 py-0.5 rounded-full font-mono normal-case">
                  v3.2 ML Engine
                </span>
              </h3>
              <p className="text-xs text-slate-300">
                Multi-feature ML scoring based on category taxonomy, price similarity, and customer co-purchasing patterns.
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleAutoSuggestCurrentCategory}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-indigo-200 border border-indigo-500/40 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            title={`Suggest items specifically for ${currentConfig.title} using ML Smart-Match`}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>ML Suggest ({currentConfig.title})</span>
          </button>

          <button
            type="button"
            onClick={handleAutoClassifyAll}
            className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-md transition-all cursor-pointer border border-indigo-400/30"
            title="Auto-classify all 6 relationship categories based on category taxonomy, price ratios, and co-purchasing frequencies"
          >
            <BrainCircuit className="w-3.5 h-3.5 text-indigo-200" />
            <span>Run Full ML Matrix Classification</span>
          </button>
        </div>
      </div>

      {/* Relationship Type Selector Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {RELATIONSHIP_CONFIGS.map(cfg => {
          const Icon = cfg.icon;
          const assignedCount = (relationships[cfg.key] || []).length;
          const isActive = activeTab === cfg.type;

          return (
            <button
              key={cfg.type}
              type="button"
              onClick={() => setActiveTab(cfg.type)}
              className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                isActive
                  ? 'bg-indigo-600 text-white border-indigo-700 shadow-md ring-2 ring-indigo-300/50'
                  : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span
                  className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-indigo-800 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {assignedCount}
                </span>
              </div>
              <div className="mt-2">
                <span className="text-xs font-bold block leading-snug">{cfg.title}</span>
                <span className={`text-[9px] block truncate mt-0.5 ${isActive ? 'text-indigo-200' : 'text-slate-400'}`}>
                  {cfg.example}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* ML Smart-Match Service Suggestions & Insights Drawer */}
      <div className="bg-gradient-to-br from-indigo-900/5 via-slate-50 to-purple-900/5 border border-indigo-200 rounded-2xl p-4.5 space-y-3.5 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
              ML Smart-Match Service Recommendations ({mlSmartMatchResult.matches.length})
            </span>
            <span className="text-[10px] font-mono text-indigo-700 bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded-full font-bold">
              {mlSmartMatchResult.summary.highConfidenceMatches} High-Confidence
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowMlInsights(!showMlInsights)}
            className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
          >
            {showMlInsights ? 'Hide ML Analysis' : 'Show ML Analysis'}
          </button>
        </div>

        {showMlInsights && (
          <div className="space-y-3">
            <p className="text-xs text-slate-600">
              Algorithmic scoring combining <strong>Category Taxonomy</strong>, <strong>Price Similarity</strong>, and <strong>Customer Co-Purchasing History</strong>:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {mlSmartMatchResult.matches.map(cand => {
                const isAlreadyAdded = currentAssignedIds.includes(cand.product.id);

                return (
                  <div
                    key={cand.product.id}
                    className="p-3 bg-white border border-indigo-100 rounded-xl space-y-2 hover:border-indigo-300 transition-all shadow-2xs flex flex-col justify-between"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <img
                            src={cand.product.imageUrl || 'https://images.unsplash.com/photo-1560343090-f0409e92791a?w=120'}
                            alt={cand.product.name}
                            className="w-8 h-8 rounded-lg object-cover bg-slate-100 border border-slate-200 shrink-0"
                          />
                          <div className="min-w-0">
                            <h6 className="text-xs font-bold text-slate-900 truncate">{cand.product.name}</h6>
                            <p className="text-[10px] text-slate-500 font-mono">
                              ${cand.product.price.toFixed(2)} • {cand.product.category}
                            </p>
                          </div>
                        </div>

                        <span className={`text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-lg shrink-0 ${
                          cand.score >= 75
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                        }`}>
                          {cand.score}% Match
                        </span>
                      </div>

                      {/* ML Feature Breakdown Bar */}
                      <div className="grid grid-cols-4 gap-1 text-[9px] font-mono text-center pt-1 border-t border-slate-100">
                        <div className="bg-slate-50 p-0.5 rounded" title="Category Taxonomy Score">
                          <span className="text-slate-400 block text-[8px]">Taxon</span>
                          <span className="font-bold text-slate-700">{cand.categoryScore}%</span>
                        </div>
                        <div className="bg-slate-50 p-0.5 rounded" title="Price Strategy Score">
                          <span className="text-slate-400 block text-[8px]">Price</span>
                          <span className="font-bold text-slate-700">{cand.priceScore}%</span>
                        </div>
                        <div className="bg-slate-50 p-0.5 rounded" title="Co-Purchasing Frequency Score">
                          <span className="text-slate-400 block text-[8px]">Co-Buy</span>
                          <span className="font-bold text-slate-700">{cand.coPurchaseScore}%</span>
                        </div>
                        <div className="bg-slate-50 p-0.5 rounded" title="Text Semantic Score">
                          <span className="text-slate-400 block text-[8px]">Text</span>
                          <span className="font-bold text-slate-700">{cand.textScore}%</span>
                        </div>
                      </div>

                      {/* ML Reasoning Badges */}
                      <div className="flex flex-wrap gap-1">
                        {cand.reasons.map((r, i) => (
                          <span key={i} className="text-[9px] font-semibold bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-100">
                            {r}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2">
                      {isAlreadyAdded ? (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg block text-center">
                          <CheckCircle2 className="w-3 h-3 inline mr-1" /> Assigned in Matrix
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleAddProduct(cand.product.id)}
                          className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer shadow-2xs"
                        >
                          <Plus className="w-3.5 h-3.5" /> Link as {currentConfig.title}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Active Relationship Configuration Panel */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${currentConfig.color}`}>
              <currentConfig.icon className="w-3.5 h-3.5" />
              {currentConfig.title} ({assignedProductObjects.length})
            </span>
            <p className="text-xs text-slate-500 mt-1">{currentConfig.description}</p>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Example: <span className="font-semibold text-slate-700">{currentConfig.example}</span>
          </span>
        </div>

        {/* Currently Assigned List */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
            Assigned {currentConfig.title} ({assignedProductObjects.length})
          </label>

          {assignedProductObjects.length === 0 ? (
            <div className="p-6 border-2 border-dashed border-slate-200 rounded-xl text-center text-slate-400 space-y-1 bg-slate-50">
              <HelpCircle className="w-6 h-6 mx-auto text-slate-300" />
              <p className="text-xs font-semibold">No products assigned for {currentConfig.title} yet.</p>
              <p className="text-[11px] text-slate-400">Search or use ML Smart-Match recommendations above to link items.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {assignedProductObjects.map(item => (
                <div
                  key={item.id}
                  className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3 hover:border-indigo-200 transition-all"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={item.imageUrl || 'https://images.unsplash.com/photo-1560343090-f0409e92791a?w=120'}
                      alt={item.name}
                      className="w-10 h-10 rounded-lg object-cover bg-white border border-slate-200 shrink-0"
                    />
                    <div className="min-w-0">
                      <h5 className="text-xs font-bold text-slate-900 truncate">{item.name}</h5>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                        <span>SKU: {item.sku}</span>
                        <span>•</span>
                        <span className="text-emerald-700 font-bold">${item.price.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveProduct(item.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                    title="Remove relation"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Search & Add Available Products */}
        <div className="space-y-3 pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
              Search Full Catalog
            </label>
            <span className="text-[10px] text-slate-400 font-mono">
              {availableCandidates.length} products available
            </span>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search catalog by name, SKU, brand, or category..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>

          <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100 border border-slate-200 rounded-xl bg-white p-2">
            {availableCandidates.length === 0 ? (
              <p className="text-xs text-center text-slate-400 py-4">No matching products found.</p>
            ) : (
              availableCandidates.slice(0, 8).map(cand => (
                <div
                  key={cand.id}
                  className="py-1.5 px-2 hover:bg-slate-50 rounded-lg flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={cand.imageUrl || 'https://images.unsplash.com/photo-1560343090-f0409e92791a?w=120'}
                      alt={cand.name}
                      className="w-8 h-8 rounded object-cover bg-slate-100 border border-slate-200 shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">{cand.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {cand.category} • <span className="text-slate-600">${cand.price.toFixed(2)}</span>
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAddProduct(cand.id)}
                    className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-lg flex items-center gap-1 transition-all cursor-pointer shrink-0"
                  >
                    <Plus className="w-3 h-3" /> Add
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
