import React from 'react';
import { 
  Cpu, Shirt, Home, Activity, Briefcase, Sparkles, LayoutGrid, Smartphone, Footprints
} from 'lucide-react';

interface ECommerceCategoriesProps {
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  productCounts: Record<string, number>;
}

const CATEGORY_ICONS: Record<string, any> = {
  'Electronics': Cpu,
  'Phones': Smartphone,
  'Samsung Phones': Smartphone,
  'Shoes': Footprints,
  'Apparel & Fashion': Shirt,
  'Home & Living': Home,
  'Fitness & Outdoors': Activity,
  'Office Supplies': Briefcase,
  'All': LayoutGrid
};

const CATEGORY_IMAGES: Record<string, string> = {
  'Electronics': 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=300',
  'Phones': 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&q=80&w=300',
  'Samsung Phones': 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&q=80&w=300',
  'Shoes': 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=300',
  'Apparel & Fashion': 'https://images.unsplash.com/photo-1582966772680-860e372bb558?auto=format&fit=crop&q=80&w=300',
  'Home & Living': 'https://images.unsplash.com/photo-1505797149-43b0069ec26b?auto=format&fit=crop&q=80&w=300',
  'Fitness & Outdoors': 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&q=80&w=300',
  'Office Supplies': 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&q=80&w=300',
};

export default function ECommerceCategories({
  categories,
  selectedCategory,
  onSelectCategory,
  productCounts
}: ECommerceCategoriesProps) {
  const displayCategories = categories.filter(c => c !== 'All');

  return (
    <section className="space-y-4" id="ecom-categories-section">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-indigo-600">
            <Sparkles className="w-4 h-4" />
            <span className="text-[11px] font-black uppercase tracking-widest">Collections</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">
            Shop by Category
          </h2>
        </div>

        <button
          onClick={() => onSelectCategory('All')}
          className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
            selectedCategory === 'All'
              ? 'bg-slate-900 text-white border-slate-900'
              : 'text-slate-600 hover:text-slate-900 border-slate-200 hover:bg-slate-50'
          }`}
          id="btn-view-all-categories"
        >
          View All ({productCounts['All'] || 0})
        </button>
      </div>

      {/* Visual Category Cards Carousel/Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-4" id="category-cards-grid">
        {displayCategories.map((cat) => {
          const isSelected = selectedCategory === cat;
          const Icon = CATEGORY_ICONS[cat] || LayoutGrid;
          const count = productCounts[cat] || 0;
          const imgUrl = CATEGORY_IMAGES[cat];

          return (
            <div
              key={cat}
              onClick={() => onSelectCategory(isSelected ? 'All' : cat)}
              className={`group cursor-pointer rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 border transition-all duration-200 relative overflow-hidden flex flex-col justify-between min-h-[120px] sm:min-h-[160px] select-none active:scale-[0.98] ${
                isSelected
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20 ring-2 ring-indigo-600/30'
                  : 'bg-white hover:bg-slate-50/90 text-slate-900 border-slate-200/80 hover:border-slate-300 shadow-2xs hover:shadow-xs'
              }`}
              id={`cat-card-${cat.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
            >
              {/* Background preview thumbnail on hover */}
              {imgUrl && (
                <div className="absolute right-0 bottom-0 top-0 w-1/2 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none overflow-hidden">
                  <img src={imgUrl} alt={cat} className="w-full h-full object-cover" />
                </div>
              )}

              {/* Icon & Count Badge */}
              <div className="flex items-center justify-between z-10">
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center transition-colors ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100'
                }`}>
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <span className={`text-[9px] sm:text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                  isSelected ? 'bg-indigo-700/80 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  {count} items
                </span>
              </div>

              {/* Category Name */}
              <div className="z-10 pt-2 sm:pt-4">
                <h3 className={`text-xs sm:text-sm font-bold tracking-tight line-clamp-1 ${
                  isSelected ? 'text-white' : 'text-slate-900 group-hover:text-indigo-600'
                }`}>
                  {cat}
                </h3>
                <span className={`text-[10px] sm:text-[11px] font-medium block mt-0.5 ${
                  isSelected ? 'text-indigo-200' : 'text-slate-400'
                }`}>
                  Explore catalog &rarr;
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
