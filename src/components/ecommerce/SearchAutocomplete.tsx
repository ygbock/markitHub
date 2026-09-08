import React, { useState, useEffect, useRef } from 'react';
import { Product, Customer } from '../../types';
import { SearchResult, getSearchSuggestions } from '../../utils/searchEngine';
import { useCurrency } from '../../context/CurrencyContext';
import { 
  Search, X, Sparkles, Tag, ArrowRight, CornerDownLeft, 
  Layers, Package, CheckCircle2, History, TrendingUp, UserCheck, Clock
} from 'lucide-react';

interface SearchAutocompleteProps {
  products: Product[];
  searchTerm: string;
  activeCustomer?: Customer | null;
  onSearchChange: (query: string) => void;
  onSelectProduct: (product: Product) => void;
  onSelectCategory: (category: string) => void;
  onSelectBrand: (brand: string) => void;
  onClose: () => void;
}

const RECENT_SEARCHES_KEY_GUEST = 'pos_ecom_recent_searches_guest_v2';
const DEFAULT_TRENDING = ['Samsung 256GB', 'Nike Air Max', 'Sony Headphones', '4K Action Cam', 'Mechanical Keyboard'];

export default function SearchAutocomplete({
  products,
  searchTerm,
  activeCustomer,
  onSearchChange,
  onSelectProduct,
  onSelectCategory,
  onSelectBrand,
  onClose
}: SearchAutocompleteProps) {
  const { formatPrice } = useCurrency();
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Key for customer specific history vs guest history
  const historyKey = activeCustomer 
    ? `pos_ecom_recent_searches_user_${activeCustomer.id}` 
    : RECENT_SEARCHES_KEY_GUEST;

  // Load recent searches on mount / customer change
  useEffect(() => {
    try {
      const saved = localStorage.getItem(historyKey);
      if (saved) {
        setRecentSearches(JSON.parse(saved));
      } else if (activeCustomer) {
        // Pre-populate some default customer searches if first time logged in
        const sampleCustomerHistory = ['Samsung Galaxy S25', 'Samsung TV', '4K Action Cam'];
        setRecentSearches(sampleCustomerHistory);
        localStorage.setItem(historyKey, JSON.stringify(sampleCustomerHistory));
      } else {
        setRecentSearches([]);
      }
    } catch {
      // Ignore storage errors
    }
  }, [historyKey, activeCustomer]);

  const saveRecentSearch = (query: string) => {
    if (!query || query.trim().length < 2) return;
    const clean = query.trim();
    const updated = [clean, ...recentSearches.filter(s => s.toLowerCase() !== clean.toLowerCase())].slice(0, 6);
    setRecentSearches(updated);
    try {
      localStorage.setItem(historyKey, JSON.stringify(updated));
    } catch {
      // Ignore storage errors
    }
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    try {
      localStorage.removeItem(historyKey);
    } catch {
      // Ignore storage errors
    }
  };

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const suggestions = getSearchSuggestions(products, searchTerm);

  const handleProductClick = (res: SearchResult) => {
    saveRecentSearch(searchTerm || res.product.name);
    onSelectProduct(res.product);
    onClose();
  };

  const handleQueryClick = (query: string) => {
    onSearchChange(query);
    saveRecentSearch(query);
  };

  return (
    <div 
      ref={containerRef}
      className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150 max-h-[82vh] flex flex-col"
      id="search-autocomplete-dropdown"
    >
      {/* TOP STATUS / LOGGED-IN CUSTOMER INDICATOR */}
      <div className="bg-slate-900 text-white px-4 py-2 flex items-center justify-between text-xs border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-bold tracking-tight">Enterprise Search</span>
          {searchTerm && (
            <span className="bg-indigo-600/70 text-indigo-200 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium">
              {suggestions.totalMatches} {suggestions.totalMatches === 1 ? 'match' : 'matches'}
            </span>
          )}
        </div>

        {activeCustomer ? (
          <div className="flex items-center gap-1.5 bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 px-2 py-0.5 rounded-full text-[10px] font-medium">
            <UserCheck className="w-3 h-3 text-emerald-400" />
            <span className="truncate max-w-[120px]">{activeCustomer.name}</span>
          </div>
        ) : (
          <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
            <CornerDownLeft className="w-3 h-3 text-slate-500" /> ESC to close
          </span>
        )}
      </div>

      <div className="overflow-y-auto p-3.5 space-y-4">

        {/* 1. INITIAL EMPTY QUERY STATE */}
        {!searchTerm.trim() && (
          <div className="space-y-4">
            {/* Recent Searches (for logged-in customer or guest) */}
            {recentSearches.length > 0 && (
              <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-500" />
                    {activeCustomer ? `Recent searches for ${activeCustomer.name}` : 'Recent Searches'}
                  </span>
                  <button 
                    onClick={clearRecentSearches}
                    className="text-[10px] text-slate-400 hover:text-slate-600 font-medium cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {recentSearches.map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => handleQueryClick(s)}
                      className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-indigo-500 hover:text-indigo-600 text-slate-700 text-xs font-medium flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                    >
                      <History className="w-3 h-3 text-slate-400" />
                      <span>{s}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Trending Products & Queries */}
            <div>
              <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5 mb-2 px-1">
                <TrendingUp className="w-3.5 h-3.5 text-indigo-500" /> Trending Suggestions
              </span>
              <div className="flex flex-wrap gap-1.5">
                {DEFAULT_TRENDING.map(q => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => handleQueryClick(q)}
                    className="px-3 py-1.5 rounded-xl bg-indigo-50/70 hover:bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-indigo-100"
                  >
                    <Search className="w-3 h-3 text-indigo-500" />
                    <span>{q}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 2. ACTIVE QUERY RESULTS FORMATTED IN SPECIFIED SECTIONS */}
        {searchTerm.trim() && (
          <div className="space-y-4">

            {/* SECTION 1: Search suggestions */}
            <div>
              <div className="text-xs font-black text-slate-800 uppercase tracking-wider mb-2 px-1 flex items-center justify-between">
                <span>Search suggestions</span>
                <span className="text-[10px] text-slate-400 font-normal">Products matching "{searchTerm}"</span>
              </div>

              {suggestions.topProducts.length > 0 ? (
                <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-xl overflow-hidden bg-white shadow-2xs">
                  {suggestions.topProducts.map(res => {
                    const p = res.product;
                    return (
                      <div
                        key={p.id}
                        onClick={() => handleProductClick(res)}
                        className="p-2.5 hover:bg-indigo-50/50 transition-colors cursor-pointer flex items-center justify-between group"
                        id={`search-suggestion-item-${p.id}`}
                      >
                        <div className="flex items-center gap-3 min-w-0 pr-2">
                          <Search className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors shrink-0" />
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors block truncate">
                              {p.name}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono block truncate">
                              {p.brand} • SKU: {p.sku}
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-xs font-black text-slate-900 block">
                            {formatPrice(p.price)}
                          </span>
                          <span className="text-[10px] font-bold text-emerald-600">
                            {p.stock > 0 ? `${p.stock} in stock` : 'Out of stock'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 text-center bg-slate-50 rounded-xl border border-slate-200/60 text-xs text-slate-500">
                  No direct product matches found for "{searchTerm}".
                </div>
              )}
            </div>

            {/* SECTION 2: Categories */}
            <div>
              <div className="text-xs font-black text-slate-800 uppercase tracking-wider mb-2 px-1">
                Categories
              </div>

              <div className="flex flex-wrap gap-2">
                {suggestions.matchingCategories.length > 0 ? (
                  suggestions.matchingCategories.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        saveRecentSearch(searchTerm);
                        onSelectCategory(cat);
                        onClose();
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-indigo-600 hover:text-white text-slate-800 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border border-slate-200/80 shadow-2xs"
                    >
                      <Layers className="w-3.5 h-3.5 opacity-70" />
                      <span>{cat}</span>
                    </button>
                  ))
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      saveRecentSearch(searchTerm);
                      onSelectCategory('All');
                      onClose();
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-indigo-600 hover:text-white text-slate-800 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border border-slate-200/80"
                  >
                    <Layers className="w-3.5 h-3.5 opacity-70" />
                    <span>All Categories</span>
                  </button>
                )}
              </div>
            </div>

            {/* SECTION 3: Brands */}
            <div>
              <div className="text-xs font-black text-slate-800 uppercase tracking-wider mb-2 px-1">
                Brands
              </div>

              <div className="flex flex-wrap gap-2">
                {suggestions.matchingBrands.length > 0 ? (
                  suggestions.matchingBrands.map(b => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => {
                        saveRecentSearch(searchTerm);
                        onSelectBrand(b);
                        onClose();
                      }}
                      className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200/80 hover:bg-emerald-600 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                    >
                      <Tag className="w-3.5 h-3.5 opacity-70" />
                      <span>{b}</span>
                    </button>
                  ))
                ) : (
                  <div className="text-xs text-slate-400 italic px-1">
                    No matching brand tags found.
                  </div>
                )}
              </div>
            </div>

            {/* SECTION 4: Recent searches for logged-in customers */}
            {recentSearches.length > 0 && (
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-500" />
                    {activeCustomer ? `Recent searches for ${activeCustomer.name}` : 'Recent searches'}
                  </span>
                  <button 
                    onClick={clearRecentSearches}
                    className="text-[10px] text-slate-400 hover:text-slate-600 font-medium cursor-pointer"
                  >
                    Clear History
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {recentSearches.map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => handleQueryClick(s)}
                      className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200 text-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <History className="w-3 h-3 text-slate-400" />
                      <span>{s}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}
      </div>

      {/* FOOTER BAR */}
      {searchTerm.trim() && (
        <div className="bg-slate-50 p-2.5 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
          <span className="text-[11px] font-medium">
            Press <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-300 font-mono text-[10px] font-bold text-slate-700">Enter</kbd> to view full catalog
          </span>
          <button
            onClick={() => {
              saveRecentSearch(searchTerm);
              onClose();
            }}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
          >
            <span>View All Results ({suggestions.totalMatches})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
