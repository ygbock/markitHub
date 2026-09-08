import React, { useState } from 'react';
import { 
  SlidersHorizontal, ArrowUpDown, X, Star
} from 'lucide-react';
import { useCurrency } from '../../context/CurrencyContext';
import { Product } from '../../types';
import { extractCategoryFacets, isPhoneCategory, isShoeCategory } from '../../utils/dynamicFilterUtils';

export type SortOption = 'relevance' | 'popularity' | 'newest' | 'price-asc' | 'price-desc' | 'rating' | 'bestsellers' | 'discount';

export interface FilterState {
  category: string;
  brand: string;
  brands: string[];
  minPrice: number;
  maxPrice: number;
  storage: string[];
  ram: string[];
  sizes: string[];
  colors: string[];
  genders: string[];
  attributes: Record<string, string[]>;
  inStockOnly: boolean;
  onSaleOnly: boolean;
  minRating: number;
}

interface ECommerceFilterSectionProps {
  filters: FilterState;
  onFilterChange: (newFilters: FilterState) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  categories: string[];
  brands: string[];
  products?: Product[];
  totalResults: number;
  onResetFilters: () => void;
}

export default function ECommerceFilterSection({
  filters = {
    category: 'All',
    brand: '',
    brands: [],
    minPrice: 0,
    maxPrice: 1000,
    storage: [],
    ram: [],
    sizes: [],
    colors: [],
    genders: [],
    attributes: {},
    inStockOnly: false,
    onSaleOnly: false,
    minRating: 0
  },
  onFilterChange,
  sortBy = 'relevance',
  onSortChange,
  categories = [],
  brands: rawBrands = [],
  products = [],
  totalResults = 0,
  onResetFilters
}: ECommerceFilterSectionProps) {
  const { formatAmount } = useCurrency();
  const [isFilterOpen, setIsFilterOpen] = useState(true);

  const currentCategory = filters?.category || 'All';

  const facets = React.useMemo(() => {
    return extractCategoryFacets(currentCategory, products);
  }, [currentCategory, products]);

  const hasActiveFilters = 
    Boolean(currentCategory && currentCategory !== 'All') || 
    Boolean(filters?.brand) || 
    Boolean(filters?.brands && filters.brands.length > 0) ||
    Boolean(filters?.storage && filters.storage.length > 0) ||
    Boolean(filters?.ram && filters.ram.length > 0) ||
    Boolean(filters?.sizes && filters.sizes.length > 0) ||
    Boolean(filters?.colors && filters.colors.length > 0) ||
    Boolean(filters?.genders && filters.genders.length > 0) ||
    (typeof filters?.minPrice === 'number' && filters.minPrice > 0) || 
    (typeof filters?.maxPrice === 'number' && filters.maxPrice < 1000) || 
    Boolean(filters?.inStockOnly) || 
    Boolean(filters?.onSaleOnly) || 
    (typeof filters?.minRating === 'number' && filters.minRating > 0);

  const isPhone = facets.isPhones || isPhoneCategory(currentCategory);
  const isShoe = facets.isShoes || isShoeCategory(currentCategory);
  const brandList = facets.brands.length > 0 ? facets.brands : (isPhone ? ['Samsung', 'Apple', 'Xiaomi'] : isShoe ? ['Nike', 'Adidas', 'Puma', 'Reebok'] : rawBrands);

  return (
    <div className="space-y-4 w-full" id="ecom-filter-sorting-bar">
      {/* 1. TOP BAR */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-3 bg-white rounded-2xl border border-slate-200/80 shadow-sm w-full">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-colors shadow-sm cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Filters</span>
            {hasActiveFilters && (
              <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse ml-1"></span>
            )}
          </button>
          <span className="text-sm text-slate-500 font-medium">
            Showing <strong className="text-slate-900">{totalResults}</strong> products
          </span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <span className="text-xs text-slate-400 font-bold flex items-center gap-1">
            <ArrowUpDown className="w-3.5 h-3.5" /> Sort:
          </span>
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
            className="px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:ring-2 focus:ring-indigo-600 outline-none cursor-pointer"
          >
            <option value="relevance">Featured & Recommended</option>
            <option value="popularity">Popularity</option>
            <option value="bestsellers">Best Selling</option>
            <option value="newest">Newest Arrivals</option>
            <option value="rating">Top Rated</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="discount">Highest Discount</option>
          </select>
        </div>
      </div>

      {/* 2. FILTER PANEL */}
      {isFilterOpen && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6 animate-in slide-in-from-top-2">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">
              Filter Product Catalog
            </h3>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={onResetFilters}
                className="text-sm font-bold text-rose-600 hover:text-rose-800 transition-colors cursor-pointer"
              >
                Reset All Filters
              </button>
            )}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            
            {/* COLUMN 1: CATEGORY */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-900 uppercase tracking-wider block">Category</label>
              <select
                value={currentCategory}
                onChange={(e) => onFilterChange({ ...filters, category: e.target.value })}
                className="w-full px-3 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-indigo-600 outline-none cursor-pointer"
              >
                <option value="All">All Categories</option>
                {categories.filter(c => c !== 'All').map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* COLUMN 2: BRAND */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-900 uppercase tracking-wider block">Brand</label>
              <select
                value={filters?.brand || (filters?.brands && filters.brands[0]) || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  onFilterChange({ ...filters, brand: val, brands: val ? [val] : [] });
                }}
                className="w-full px-3 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:ring-2 focus:ring-indigo-600 outline-none cursor-pointer"
              >
                <option value="">All Brands</option>
                {brandList.map(brand => (
                  <option key={brand} value={brand}>{brand}</option>
                ))}
              </select>
            </div>

            {/* COLUMN 3: MAX PRICE */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-900 uppercase tracking-wider block">Max Price</label>
                <span className="text-sm font-mono font-bold text-indigo-600">
                  {formatAmount(filters.maxPrice)}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={1000}
                step={10}
                value={filters.maxPrice}
                onChange={(e) => onFilterChange({ ...filters, maxPrice: Number(e.target.value) })}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 font-medium">
                <span>{formatAmount(0)}</span>
                <span>{formatAmount(1000)}</span>
              </div>
            </div>

            {/* COLUMN 4: SPECIAL ATTRIBUTES */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-900 uppercase tracking-wider block">Special Attributes</label>
              <div className="space-y-2.5">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={filters.inStockOnly}
                    onChange={(e) => onFilterChange({ ...filters, inStockOnly: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 cursor-pointer"
                  />
                  <span className="text-sm text-slate-600 group-hover:text-slate-900 transition-colors">In Stock Only</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={filters.onSaleOnly}
                    onChange={(e) => onFilterChange({ ...filters, onSaleOnly: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 cursor-pointer"
                  />
                  <span className="text-sm text-slate-600 group-hover:text-slate-900 transition-colors">Discounted / On Sale Only</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={filters.minRating >= 4.8}
                    onChange={(e) => onFilterChange({ ...filters, minRating: e.target.checked ? 4.8 : 0 })}
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 cursor-pointer"
                  />
                  <span className="text-sm text-slate-600 group-hover:text-slate-900 transition-colors flex items-center gap-1">
                    Top Rated (4.8+ <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 inline" />)
                  </span>
                </label>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 3. ACTIVE FILTERS */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 pt-2 px-2 flex-wrap">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2">ACTIVE:</span>
          
          {currentCategory !== 'All' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-800 rounded-full text-xs font-medium border border-slate-200">
              <span>Category: {currentCategory}</span>
              <button type="button" onClick={() => onFilterChange({ ...filters, category: 'All' })} className="hover:text-rose-600 cursor-pointer focus:outline-none">
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          )}

          {filters?.brand && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-800 rounded-full text-xs font-medium border border-slate-200">
              <span>Brand: {filters.brand}</span>
              <button type="button" onClick={() => onFilterChange({ ...filters, brand: '', brands: [] })} className="hover:text-rose-600 cursor-pointer focus:outline-none">
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          )}

          {filters.inStockOnly && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-800 rounded-full text-xs font-medium border border-slate-200">
              <span>In Stock Only</span>
              <button type="button" onClick={() => onFilterChange({ ...filters, inStockOnly: false })} className="hover:text-rose-600 cursor-pointer focus:outline-none">
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          )}

          {filters.onSaleOnly && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-800 rounded-full text-xs font-medium border border-slate-200">
              <span>On Sale Only</span>
              <button type="button" onClick={() => onFilterChange({ ...filters, onSaleOnly: false })} className="hover:text-rose-600 cursor-pointer focus:outline-none">
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          )}

          {filters.minRating > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-800 rounded-full text-xs font-medium border border-slate-200">
              <span>Top Rated</span>
              <button type="button" onClick={() => onFilterChange({ ...filters, minRating: 0 })} className="hover:text-rose-600 cursor-pointer focus:outline-none">
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          )}
        </div>
      )}

    </div>
  );
}
