import React from 'react';
import { Award, ChevronRight } from 'lucide-react';

interface ECommerceBrandsProps {
  brands: string[];
  selectedBrand: string;
  onSelectBrand: (brand: string) => void;
}

const BRAND_LOGOS: Record<string, { desc: string; tag: string }> = {
  'Sony': { desc: 'Studio Audio & Sensors', tag: 'Official Partner' },
  'Apple': { desc: 'Wearables & Mobile Hardware', tag: 'Authorized Reseller' },
  'Nike': { desc: 'Apparel & Performance Wear', tag: 'Top Rated' },
  'Herman Miller': { desc: 'Ergonomic Workspace Architecture', tag: 'Luxury Tier' },
  'Bose': { desc: 'Acoustics & Hydration Tech', tag: 'Certified' },
  'Logitech': { desc: 'Mechanical Keyboards & Desks', tag: 'Pro Gaming & Office' }
};

export default function ECommerceBrands({
  brands,
  selectedBrand,
  onSelectBrand
}: ECommerceBrandsProps) {
  return (
    <section className="space-y-4" id="ecom-brands-section">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-indigo-600">
            <Award className="w-4 h-4" />
            <span className="text-[11px] font-black uppercase tracking-widest">Authorized Partners</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">
            Featured Brands
          </h2>
        </div>

        {selectedBrand && (
          <button
            onClick={() => onSelectBrand('')}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
          >
            Clear Brand Filter
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {brands.map((brand) => {
          const isSelected = selectedBrand === brand;
          const info = BRAND_LOGOS[brand] || { desc: 'Premium Manufacturer', tag: 'Partner' };

          return (
            <div
              key={brand}
              onClick={() => onSelectBrand(isSelected ? '' : brand)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between select-none ${
                isSelected
                  ? 'bg-slate-900 text-white border-slate-900 shadow-md scale-102 ring-2 ring-indigo-500/20'
                  : 'bg-white hover:bg-slate-50 text-slate-900 border-slate-200/80 hover:border-slate-300 shadow-2xs'
              }`}
            >
              <div>
                <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full inline-block mb-2 ${
                  isSelected ? 'bg-indigo-500/30 text-indigo-300' : 'bg-slate-100 text-slate-500'
                }`}>
                  {info.tag}
                </span>
                <h4 className="text-base font-black tracking-tight">{brand}</h4>
                <p className={`text-[10px] mt-1 line-clamp-1 ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                  {info.desc}
                </p>
              </div>

              <div className="pt-3 flex items-center justify-between text-[11px] font-bold">
                <span className={isSelected ? 'text-indigo-300' : 'text-indigo-600'}>
                  {isSelected ? 'Filtering' : 'Shop Brand'}
                </span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
