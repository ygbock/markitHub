import React, { useState, useRef, useEffect } from 'react';
import { Category } from '../../types';
import { 
  Package, Tag, Building2, Layers, ShieldCheck, Sparkles, AlertCircle, 
  CheckCircle2, SlidersHorizontal, ArrowUpDown, Box, Plus, Search, Check, 
  X, ChevronDown, Wand2, FileText, FolderTree
} from 'lucide-react';

interface StepBasicInfoProps {
  name: string;
  setName: (val: string) => void;
  description: string;
  setDescription: (val: string) => void;
  brand: string;
  setBrand: (val: string) => void;
  category: string;
  setCategory: (val: string) => void;
  existingCategories: string[];
  categoriesList?: Category[];
  existingBrands?: string[];
  productType: 'Standard' | 'Composite' | 'Bundle' | 'Service' | 'Digital' | 'Rental' | string;
  setProductType: (val: string) => void;
  hasVariants: boolean;
  setHasVariants: (val: boolean) => void;
  inventoryTracking: 'QUANTITY' | 'SERIAL' | 'BATCH' | 'NONE';
  setInventoryTracking: (val: 'QUANTITY' | 'SERIAL' | 'BATCH' | 'NONE') => void;
  trackExpiry: boolean;
  setTrackExpiry: (val: boolean) => void;
  stockRotationMethod: 'FIFO' | 'FEFO' | 'LIFO' | 'MANUAL';
  setStockRotationMethod: (val: 'FIFO' | 'FEFO' | 'LIFO' | 'MANUAL') => void;
  hasMultiUOM: boolean;
  setHasMultiUOM: (val: boolean) => void;
  returnable: boolean;
  setReturnable: (val: boolean) => void;
  status: 'Active' | 'Draft' | 'Archived';
  setStatus: (val: 'Active' | 'Draft' | 'Archived') => void;
  errors: Record<string, string>;
}

// Comprehensive list of popular global brands and manufacturers categorized by industry
const POPULAR_BRANDS_BY_CATEGORY: { category: string; brands: string[] }[] = [
  {
    category: 'Electronics & Tech',
    brands: [
      'Apple', 'Sony', 'Samsung', 'Dell', 'HP', 'Lenovo', 'ASUS', 'Logitech',
      'Bose', 'JBL', 'Canon', 'Anker', 'Google', 'Microsoft', 'LG', 'Xiaomi',
      'Panasonic', 'Philips', 'Garmin', 'Nintendo', 'Sennheiser', 'Razer'
    ]
  },
  {
    category: 'Apparel & Footwear',
    brands: [
      'Nike', 'Adidas', 'Puma', 'Zara', 'H&M', 'Under Armour', "Levi's",
      'Uniqlo', 'Gucci', 'Ralph Lauren', 'The North Face', 'Patagonia',
      'New Balance', 'Lululemon', 'Vans', 'Converse', 'Tommy Hilfiger'
    ]
  },
  {
    category: 'Home & Appliances',
    brands: [
      'Dyson', 'Bosch', 'KitchenAid', 'De\'Longhi', 'Nespresso', 'Whirlpool',
      'IKEA', 'Cuisinart', 'Braun', 'Shark', 'iRobot', 'Breville', 'Instant Pot'
    ]
  },
  {
    category: 'Food, Beverage & Pantry',
    brands: [
      'Coca-Cola', 'PepsiCo', 'Nestlé', 'Starbucks', 'Red Bull', 'Kellogg\'s',
      'Unilever', 'Kraft Heinz', 'Danone', 'Monster Energy', 'Hershey\'s', 'Ferrero'
    ]
  },
  {
    category: 'Beauty & Personal Care',
    brands: [
      'L\'Oréal', 'Estée Lauder', 'Nivea', 'Sephora', 'Dove', 'Gillette',
      'Colgate', 'Neutrogena', 'Johnson & Johnson', 'Olay', 'CeraVe'
    ]
  },
  {
    category: 'Office, Toys & General',
    brands: [
      'Generic / Unbranded', '3M', 'Moleskine', 'Pilot', 'Lego', 'Hasbro',
      'Mattel', 'Sharpie', 'Stanley', 'BIC', 'Paper Mate'
    ]
  }
];

// Upgraded Primary Category Catalog with standard Retail/POS taxonomy
interface CategoryGroup {
  name: string;
  icon: string;
  categories: string[];
}

const PRIMARY_CATEGORY_TAXONOMY: CategoryGroup[] = [
  {
    name: 'Electronics & Gadgets',
    icon: '💻',
    categories: [
      'Electronics',
      'Smartphones & Accessories',
      'Computers, Laptops & Tablets',
      'Audio, Headphones & Speakers',
      'Cameras, Photography & Drones',
      'Wearables & Smartwatches',
      'Gaming, Consoles & VR',
      'Cables, Chargers & Adapters',
      'Smart Home & Security'
    ]
  },
  {
    name: 'Apparel, Footwear & Fashion',
    icon: '👔',
    categories: [
      'Apparel & Fashion',
      "Men's Clothing",
      "Women's Clothing",
      'Footwear & Sneakers',
      'Athletic & Activewear',
      'Watches & Fine Jewelry',
      'Bags, Backpacks & Luggage',
      'Eyewear & Sunglasses',
      "Kids & Baby Apparel"
    ]
  },
  {
    name: 'Food, Grocery & Beverages',
    icon: '☕',
    categories: [
      'Food & Beverages',
      'Fresh Produce & Bakery',
      'Specialty Coffee & Gourmet Tea',
      'Beverages, Juices & Sodas',
      'Snacks, Candy & Confectionery',
      'Packaged Goods & Pantry Staples',
      'Dairy, Eggs & Plant Milk',
      'Frozen Goods & Ice Cream',
      'Wine, Craft Beer & Spirits'
    ]
  },
  {
    name: 'Health, Beauty & Personal Care',
    icon: '✨',
    categories: [
      'Beauty & Personal Care',
      'Skincare & Sun Care',
      'Hair Care & Styling',
      'Cosmetics & Makeup',
      'Fragrances & Perfumes',
      'Vitamins & Dietary Supplements',
      'Personal Hygiene & Bath',
      'First Aid & Over-The-Counter'
    ]
  },
  {
    name: 'Home, Kitchen & Living',
    icon: '🏠',
    categories: [
      'Home & Living',
      'Small Kitchen Appliances',
      'Cookware, Bakeware & Cutlery',
      'Furniture & Interior Decor',
      'Bedding, Linen & Bath',
      'Cleaning & Household Supplies',
      'Storage & Home Organization',
      'Patio, Lawn & Garden'
    ]
  },
  {
    name: 'Sports, Fitness & Outdoors',
    icon: '⚽',
    categories: [
      'Sports & Outdoors',
      'Fitness & Gym Equipment',
      'Yoga, Pilates & Recovery',
      'Outdoor Camping & Hiking',
      'Bicycles & Urban Mobility',
      'Water Sports & Marine',
      'Team Sports & Games'
    ]
  },
  {
    name: 'Office Supplies, Books & Stationery',
    icon: '📚',
    categories: [
      'Office Supplies & Books',
      'Notebooks, Journals & Planners',
      'Pens, Markers & Writing',
      'Desk Accessories & Organizers',
      'Art Supplies & Crafting',
      'Books & Literature'
    ]
  },
  {
    name: 'Automotive, Tools & Hardware',
    icon: '🔧',
    categories: [
      'Automotive & Hardware',
      'Hand & Power Tools',
      'Car Accessories & Electronics',
      'Hardware, Fasteners & Safety',
      'Motor Oils, Fluids & Cleaning'
    ]
  },
  {
    name: 'Hospitality, Dining & Services',
    icon: '🍽️',
    categories: [
      'Services & Digital',
      'Restaurant & Cafe Menu',
      'Bar & Cocktails',
      'Repair & Maintenance Services',
      'Rental & Equipment Hire',
      'Digital Software & Licenses',
      'Gift Cards & Memberships'
    ]
  },
  {
    name: 'General Merchandise & Supplies',
    icon: '🛍️',
    categories: [
      'General Merchandise',
      'Seasonal & Holiday Items',
      'Raw Materials & Packaging',
      'Clearance & Overstock'
    ]
  }
];

export default function StepBasicInfo({
  name,
  setName,
  description,
  setDescription,
  brand,
  setBrand,
  category,
  setCategory,
  existingCategories,
  categoriesList = [],
  existingBrands = [],
  productType,
  setProductType,
  hasVariants,
  setHasVariants,
  inventoryTracking,
  setInventoryTracking,
  trackExpiry,
  setTrackExpiry,
  stockRotationMethod,
  setStockRotationMethod,
  hasMultiUOM,
  setHasMultiUOM,
  returnable,
  setReturnable,
  status,
  setStatus,
  errors
}: StepBasicInfoProps) {
  // Brand dropdown & custom brand inline state
  const [isBrandDropdownOpen, setIsBrandDropdownOpen] = useState(false);
  const [brandSearchQuery, setBrandSearchQuery] = useState('');
  const [isAddingCustomBrand, setIsAddingCustomBrand] = useState(false);
  const [customBrandInput, setCustomBrandInput] = useState('');
  const [customBrandsList, setCustomBrandsList] = useState<string[]>([]);
  const brandDropdownRef = useRef<HTMLDivElement>(null);
  const customBrandInputRef = useRef<HTMLInputElement>(null);

  // Category dropdown & custom category inline state
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [isAddingCustomCategory, setIsAddingCustomCategory] = useState(false);
  const [customCategoryInput, setCustomCategoryInput] = useState('');
  const [customCategoriesList, setCustomCategoriesList] = useState<string[]>([]);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const customCategoryInputRef = useRef<HTMLInputElement>(null);

  // Close brand dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (brandDropdownRef.current && !brandDropdownRef.current.contains(event.target as Node)) {
        setIsBrandDropdownOpen(false);
      }
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setIsCategoryDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus custom brand input when opened
  useEffect(() => {
    if (isAddingCustomBrand && customBrandInputRef.current) {
      customBrandInputRef.current.focus();
    }
  }, [isAddingCustomBrand]);

  // Focus custom category input when opened
  useEffect(() => {
    if (isAddingCustomCategory && customCategoryInputRef.current) {
      customCategoryInputRef.current.focus();
    }
  }, [isAddingCustomCategory]);

  // Primary Decoupled Product Types
  const PRIMARY_PRODUCT_TYPES = [
    { id: 'Standard', label: 'Standard Product', desc: 'Normal standalone item or merchandise (e.g. Coca-Cola, Nike Shoes)', icon: '📦' },
    { id: 'Composite', label: 'Composite Product', desc: 'Assembled item built from components / BOM (e.g. Assembled Desktop PC)', icon: '🖥️', badge: 'BOM' },
    { id: 'Bundle', label: 'Bundle / Kit', desc: 'Collection of distinct products sold as a single package (e.g. School Starter Kit)', icon: '🎁', badge: 'Kit' },
    { id: 'Service', label: 'Service (Non-Inventory)', desc: 'Billable labor, repairs, or professional consultations without stock', icon: '🛠️', badge: 'Service' },
    { id: 'Digital', label: 'Digital Asset', desc: 'Digitally delivered files, software keys, or licenses', icon: '💻', badge: 'Digital' },
    { id: 'Rental', label: 'Rental Equipment', desc: 'Equipment temporarily loaned to clients on rental schedules', icon: '⏱️', badge: 'Rental' },
  ];

  // Handle saving a new custom brand
  const handleSaveCustomBrand = () => {
    const trimmed = customBrandInput.trim();
    if (trimmed) {
      if (!customBrandsList.includes(trimmed)) {
        setCustomBrandsList((prev) => [trimmed, ...prev]);
      }
      setBrand(trimmed);
      setCustomBrandInput('');
      setIsAddingCustomBrand(false);
      setIsBrandDropdownOpen(false);
    }
  };

  // Handle saving a new custom category
  const handleSaveCustomCategory = () => {
    const trimmed = customCategoryInput.trim();
    if (trimmed) {
      if (!customCategoriesList.includes(trimmed)) {
        setCustomCategoriesList((prev) => [trimmed, ...prev]);
      }
      setCategory(trimmed);
      setCustomCategoryInput('');
      setIsAddingCustomCategory(false);
      setIsCategoryDropdownOpen(false);
    }
  };

  // Filtered brands based on search query
  const brandQuery = brandSearchQuery.toLowerCase().trim();
  const allCustomBrands = Array.from(new Set([...customBrandsList, ...existingBrands, ...(brand && !POPULAR_BRANDS_BY_CATEGORY.some(g => g.brands.includes(brand)) ? [brand] : [])]));

  // Cleaned existing categories (without 'All')
  const cleanExistingCategories = existingCategories.filter(c => c && c !== 'All');
  const catQuery = categorySearchQuery.toLowerCase().trim();
  const allCustomCategories = Array.from(new Set([
    ...customCategoriesList,
    ...cleanExistingCategories,
    ...(category && !PRIMARY_CATEGORY_TAXONOMY.some(g => g.categories.includes(category)) ? [category] : [])
  ]));

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs font-bold text-sm">
          1
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900">Basic Product Identity & Coexisting Behaviors</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure the primary product classification, brand, category, and combine independent inventory behaviors.
          </p>
        </div>
      </div>

      {/* Main Form Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Product Name */}
        <div className="md:col-span-2 space-y-1.5">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Product Name <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sony WH-1000XM5 Wireless Headphones"
              className={`w-full pl-10 pr-4 py-2.5 bg-white border ${
                errors.name ? 'border-rose-500 focus:ring-rose-200' : 'border-slate-200 focus:ring-indigo-200'
              } rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:border-indigo-500 transition-all`}
            />
            <Package className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          </div>
          {errors.name && (
            <p className="text-xs text-rose-500 flex items-center gap-1 mt-1 font-medium">
              <AlertCircle className="w-3.5 h-3.5" />
              {errors.name}
            </p>
          )}
        </div>

        {/* Brand / Manufacturer Dropdown with Populated Popular Brands */}
        <div className="space-y-1.5 relative" ref={brandDropdownRef}>
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Brand / Manufacturer
            </label>
            <button
              type="button"
              onClick={() => {
                setIsAddingCustomBrand(true);
                setIsBrandDropdownOpen(true);
              }}
              className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer hover:underline"
            >
              <Plus className="w-3 h-3" /> Add Custom Brand
            </button>
          </div>

          {/* Brand Selector Button / Trigger */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setIsBrandDropdownOpen((prev) => !prev);
                setIsCategoryDropdownOpen(false);
              }}
              className="w-full pl-10 pr-9 py-2.5 bg-white border border-slate-200 hover:border-indigo-300 rounded-xl text-sm font-medium text-slate-900 text-left focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 transition-all flex items-center justify-between cursor-pointer"
            >
              <span className={brand ? 'text-slate-900 font-semibold truncate' : 'text-slate-400'}>
                {brand || 'Select Brand or Manufacturer...'}
              </span>
              <ChevronDown className={`w-4 h-4 text-slate-400 absolute right-3 top-3 transition-transform ${isBrandDropdownOpen ? 'rotate-180 text-indigo-600' : ''}`} />
            </button>
            <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
          </div>

          {/* Brand Selection Dropdown Popover */}
          {isBrandDropdownOpen && (
            <div className="absolute z-40 left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl p-2.5 space-y-2 max-h-80 flex flex-col animate-in fade-in-50 zoom-in-95">
              
              {/* Search */}
              <div className="relative shrink-0">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={brandSearchQuery}
                  onChange={(e) => setBrandSearchQuery(e.target.value)}
                  placeholder="Search popular brands or type custom..."
                  className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
                {brandSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setBrandSearchQuery('')}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Inline Custom Brand Creation Box */}
              {isAddingCustomBrand ? (
                <div className="p-2.5 bg-indigo-50/80 border border-indigo-200 rounded-xl space-y-2 shrink-0">
                  <div className="flex items-center justify-between text-[11px] font-bold text-indigo-900">
                    <span>Add New Brand / Manufacturer:</span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingCustomBrand(false);
                        setCustomBrandInput('');
                      }}
                      className="text-slate-400 hover:text-rose-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex gap-1.5">
                    <input
                      ref={customBrandInputRef}
                      type="text"
                      value={customBrandInput}
                      onChange={(e) => setCustomBrandInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSaveCustomBrand();
                        }
                      }}
                      placeholder="e.g. Acme Labs, Bose, NorthPeak..."
                      className="flex-1 px-2.5 py-1.5 bg-white border border-indigo-300 rounded-lg text-xs font-semibold text-indigo-950 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    />
                    <button
                      type="button"
                      onClick={handleSaveCustomBrand}
                      disabled={!customBrandInput.trim()}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAddingCustomBrand(true)}
                  className="w-full py-1.5 px-2 bg-indigo-50/70 hover:bg-indigo-100/90 text-indigo-700 border border-indigo-200/80 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" /> Create & Add Custom Brand
                </button>
              )}

              {/* Scrollable Brands List */}
              <div className="overflow-y-auto flex-1 space-y-3 pr-1 divide-y divide-slate-100 text-xs">
                {/* Custom / Existing User Brands */}
                {allCustomBrands.length > 0 && (
                  <div className="pt-1">
                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-900 mb-1 px-2">
                      Custom & Store Brands
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      {allCustomBrands
                        .filter((b) => !brandQuery || b.toLowerCase().includes(brandQuery))
                        .map((bName) => (
                          <button
                            key={bName}
                            type="button"
                            onClick={() => {
                              setBrand(bName);
                              setIsBrandDropdownOpen(false);
                            }}
                            className={`px-2.5 py-1.5 rounded-lg text-left font-medium transition-all flex items-center justify-between cursor-pointer ${
                              brand === bName
                                ? 'bg-indigo-600 text-white font-bold'
                                : 'bg-slate-50 hover:bg-indigo-50 hover:text-indigo-900 text-slate-800'
                            }`}
                          >
                            <span className="truncate">{bName}</span>
                            {brand === bName && <Check className="w-3.5 h-3.5 shrink-0 ml-1" />}
                          </button>
                        ))}
                    </div>
                  </div>
                )}

                {/* Popular Brands Grouped by Industry */}
                {POPULAR_BRANDS_BY_CATEGORY.map((grp) => {
                  const filteredBrands = grp.brands.filter((b) => !brandQuery || b.toLowerCase().includes(brandQuery));
                  if (filteredBrands.length === 0) return null;

                  return (
                    <div key={grp.category} className="pt-2 first:pt-0">
                      <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 px-2">
                        {grp.category}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                        {filteredBrands.map((bName) => {
                          const isSelected = brand === bName;
                          return (
                            <button
                              key={bName}
                              type="button"
                              onClick={() => {
                                setBrand(bName);
                                setIsBrandDropdownOpen(false);
                              }}
                              className={`px-2.5 py-1.5 rounded-lg text-left text-xs font-medium transition-all flex items-center justify-between cursor-pointer ${
                                isSelected
                                  ? 'bg-indigo-600 text-white font-bold shadow-2xs'
                                  : 'hover:bg-slate-100 text-slate-700'
                              }`}
                            >
                              <span className="truncate">{bName}</span>
                              {isSelected && <Check className="w-3 h-3 shrink-0 ml-1" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Clear / Unbranded option */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setBrand('Generic / Unbranded');
                    setIsBrandDropdownOpen(false);
                  }}
                  className="text-[11px] font-bold text-slate-600 hover:text-indigo-600 cursor-pointer"
                >
                  Set as Generic / Unbranded
                </button>
                {brand && (
                  <button
                    type="button"
                    onClick={() => {
                      setBrand('');
                      setIsBrandDropdownOpen(false);
                    }}
                    className="text-[11px] font-bold text-rose-500 hover:text-rose-700 cursor-pointer"
                  >
                    Clear Brand
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Primary Category Dropdown with Hierarchical Support */}
        <div className="space-y-1.5 relative">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Primary Category <span className="text-rose-500">*</span>
            </label>
            <button
              type="button"
              onClick={() => {
                setIsAddingCustomCategory(true);
                setIsCategoryDropdownOpen(true);
              }}
              className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer hover:underline"
            >
              <Plus className="w-3 h-3" /> Add Custom Category
            </button>
          </div>

          /* Category Trigger Button */
          <div className="relative" ref={categoryDropdownRef}>
            <button
              type="button"
              onClick={() => {
                setIsCategoryDropdownOpen((prev) => !prev);
                setIsBrandDropdownOpen(false);
              }}
              className="w-full pl-10 pr-9 py-2.5 bg-white border border-slate-200 hover:border-indigo-300 rounded-xl text-sm font-medium text-slate-900 text-left focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 transition-all flex items-center justify-between cursor-pointer"
            >
              <span className={category ? 'text-slate-900 font-semibold truncate' : 'text-slate-400'}>
                {category || 'Select Primary Category...'}
              </span>
              <ChevronDown className={`w-4 h-4 text-slate-400 absolute right-3 top-3 transition-transform ${isCategoryDropdownOpen ? 'rotate-180 text-indigo-600' : ''}`} />
            </button>
            <Tag className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
          </div>

          {/* Category Selection Dropdown Popover */}
          {isCategoryDropdownOpen && (
            <div className="absolute z-40 left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl p-2.5 space-y-2 max-h-80 flex flex-col animate-in fade-in-50 zoom-in-95">
              
              {/* Category Search Input */}
              <div className="relative shrink-0">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={categorySearchQuery}
                  onChange={(e) => setCategorySearchQuery(e.target.value)}
                  placeholder="Search categories (e.g. coffee, shoes, audio)..."
                  className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
                {categorySearchQuery && (
                  <button
                    type="button"
                    onClick={() => setCategorySearchQuery('')}
                    className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Inline Custom Category Creator */}
              {isAddingCustomCategory ? (
                <div className="p-2.5 bg-indigo-50/80 border border-indigo-200 rounded-xl space-y-2 shrink-0">
                  <div className="flex items-center justify-between text-[11px] font-bold text-indigo-900">
                    <span>Create Custom Category:</span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingCustomCategory(false);
                        setCustomCategoryInput('');
                      }}
                      className="text-slate-400 hover:text-rose-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex gap-1.5">
                    <input
                      ref={customCategoryInputRef}
                      type="text"
                      value={customCategoryInput}
                      onChange={(e) => setCustomCategoryInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSaveCustomCategory();
                        }
                      }}
                      placeholder="e.g. Organic Produce, Gaming Chairs, Spa..."
                      className="flex-1 px-2.5 py-1.5 bg-white border border-indigo-300 rounded-lg text-xs font-semibold text-indigo-950 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    />
                    <button
                      type="button"
                      onClick={handleSaveCustomCategory}
                      disabled={!customCategoryInput.trim()}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAddingCustomCategory(true)}
                  className="w-full py-1.5 px-2 bg-indigo-50/70 hover:bg-indigo-100/90 text-indigo-700 border border-indigo-200/80 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" /> Create & Add Custom Category
                </button>
              )}

              {/* Scrollable Taxonomy Groups */}
              <div className="overflow-y-auto flex-1 space-y-3 pr-1 divide-y divide-slate-100 text-xs">
                
                {/* Custom / Store-specific Categories */}
                {allCustomCategories.length > 0 && (
                  <div className="pt-1">
                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-900 mb-1 px-2 flex items-center gap-1">
                      <FolderTree className="w-3 h-3 text-indigo-600" />
                      Custom & Store Categories
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      {allCustomCategories
                        .filter((c) => !catQuery || c.toLowerCase().includes(catQuery))
                        .map((cName) => (
                          <button
                            key={cName}
                            type="button"
                            onClick={() => {
                              setCategory(cName);
                              setIsCategoryDropdownOpen(false);
                            }}
                            className={`px-2.5 py-1.5 rounded-lg text-left font-medium transition-all flex items-center justify-between cursor-pointer ${
                              category === cName
                                ? 'bg-indigo-600 text-white font-bold'
                                : 'bg-slate-50 hover:bg-indigo-50 hover:text-indigo-900 text-slate-800'
                            }`}
                          >
                            <span className="truncate">{cName}</span>
                            {category === cName && <Check className="w-3.5 h-3.5 shrink-0 ml-1" />}
                          </button>
                        ))}
                    </div>
                  </div>
                )}

                {/* Primary Categorized Industry Taxonomy */}
                {PRIMARY_CATEGORY_TAXONOMY.map((group) => {
                  const filteredCategories = group.categories.filter((c) => 
                    !catQuery || 
                    c.toLowerCase().includes(catQuery) || 
                    group.name.toLowerCase().includes(catQuery)
                  );
                  if (filteredCategories.length === 0) return null;

                  return (
                    <div key={group.name} className="pt-2 first:pt-0">
                      <div className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5 px-2 flex items-center gap-1.5">
                        <span>{group.icon}</span>
                        <span>{group.name}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                        {filteredCategories.map((cName) => {
                          const isSelected = category === cName;
                          return (
                            <button
                              key={cName}
                              type="button"
                              onClick={() => {
                                setCategory(cName);
                                setIsCategoryDropdownOpen(false);
                              }}
                              className={`px-2.5 py-1.5 rounded-lg text-left text-xs font-medium transition-all flex items-center justify-between cursor-pointer ${
                                isSelected
                                  ? 'bg-indigo-600 text-white font-bold shadow-2xs'
                                  : 'hover:bg-slate-100 text-slate-700'
                              }`}
                            >
                              <span className="truncate">{cName}</span>
                              {isSelected && <Check className="w-3 h-3 shrink-0 ml-1" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Clear / Quick Default option */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setCategory('General Merchandise');
                    setIsCategoryDropdownOpen(false);
                  }}
                  className="text-[11px] font-bold text-slate-600 hover:text-indigo-600 cursor-pointer"
                >
                  Set as General Merchandise
                </button>
                {category && (
                  <button
                    type="button"
                    onClick={() => {
                      setCategory('');
                      setIsCategoryDropdownOpen(false);
                    }}
                    className="text-[11px] font-bold text-rose-500 hover:text-rose-700 cursor-pointer"
                  >
                    Clear Category
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* A. PRIMARY PRODUCT TYPE SELECTION */}
        <div className="md:col-span-2 space-y-2 pt-3 border-t border-slate-200/80">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Box className="w-4 h-4 text-indigo-600" />
              1. What type of product is this? (Primary Classification)
            </label>
            <span className="text-[10px] font-mono text-slate-500">Determines core BOM / assembly logic</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {PRIMARY_PRODUCT_TYPES.map((type) => {
              const isSelected = productType === type.id;
              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setProductType(type.id)}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative ${
                    isSelected
                      ? 'bg-indigo-50/90 border-indigo-600 ring-2 ring-indigo-200 shadow-2xs'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{type.icon}</span>
                      <span className={`text-xs font-extrabold ${isSelected ? 'text-indigo-950' : 'text-slate-800'}`}>
                        {type.label}
                      </span>
                    </div>
                    {type.badge && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-indigo-100 text-indigo-800">
                        {type.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{type.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* B. PRODUCT CAPABILITIES & BEHAVIORS CONFIGURATION */}
        <div className="md:col-span-2 space-y-3 pt-4 border-t border-slate-200/80 bg-slate-50/60 p-4 rounded-2xl border border-slate-200">
          <div>
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
                2. Product Capabilities & Inventory Behaviors (Coexisting Features)
              </h4>
              <span className="text-[10px] font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md font-bold">
                Decoupled Multi-Behavior Architecture
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Select any combination of inventory and selling behaviors that apply to this product.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            
            {/* 1. Has Variants */}
            <div className={`p-3.5 rounded-xl border transition-all ${hasVariants ? 'bg-indigo-50/80 border-indigo-400' : 'bg-white border-slate-200'}`}>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-slate-900 block">Product Variations (Multi-SKU)</span>
                  <span className="text-[10px] text-slate-500 block">Item has options like Size, Color, Capacity, or Model</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasVariants}
                    onChange={(e) => setHasVariants(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>
            </div>

            {/* 2. Inventory Tracking Mode */}
            <div className="p-3.5 rounded-xl border bg-white border-slate-200 space-y-2 md:col-span-1">
              <span className="text-xs font-bold text-slate-900 block">Inventory Tracking Method</span>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'QUANTITY', label: 'Quantity Stock', desc: 'Standard unit count' },
                  { id: 'SERIAL', label: 'Serialized', desc: 'Unique SN/IMEI per unit' },
                  { id: 'BATCH', label: 'Batch / Lot', desc: 'Lot code tracking' },
                  { id: 'NONE', label: 'No Tracking', desc: 'Services & digital' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setInventoryTracking(opt.id as any)}
                    className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                      inventoryTracking === opt.id
                        ? 'bg-indigo-600 text-white border-indigo-700 shadow-2xs font-bold'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 font-medium'
                    }`}
                  >
                    <div className="text-[11px] leading-tight">{opt.label}</div>
                    <div className={`text-[9px] ${inventoryTracking === opt.id ? 'text-indigo-100' : 'text-slate-400'}`}>
                      {opt.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Expiry Date & Shelf Life */}
            <div className={`p-3.5 rounded-xl border transition-all ${trackExpiry ? 'bg-amber-50/80 border-amber-300' : 'bg-white border-slate-200'}`}>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-slate-900 block">Expiry Date Tracking</span>
                  <span className="text-[10px] text-slate-500 block">Perishable product with shelf life & expiry dates</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={trackExpiry}
                    onChange={(e) => {
                      setTrackExpiry(e.target.checked);
                      if (e.target.checked && stockRotationMethod === 'FIFO') {
                        setStockRotationMethod('FEFO');
                      }
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
                </label>
              </div>

              {trackExpiry && (
                <div className="mt-2.5 pt-2 border-t border-amber-200/80 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-amber-900 flex items-center gap-1">
                    <ArrowUpDown className="w-3 h-3 text-amber-700" /> Stock Rotation Strategy
                  </span>
                  <select
                    value={stockRotationMethod}
                    onChange={(e) => setStockRotationMethod(e.target.value as any)}
                    className="px-2 py-1 bg-white border border-amber-300 text-amber-900 text-[10px] font-bold rounded-lg focus:outline-none cursor-pointer"
                  >
                    <option value="FEFO">FEFO (First Expired, First Out)</option>
                    <option value="FIFO">FIFO (First In, First Out)</option>
                    <option value="LIFO">LIFO (Last In, First Out)</option>
                    <option value="MANUAL">MANUAL Selection</option>
                  </select>
                </div>
              )}
            </div>

            {/* 4. Multi-UOM / Pack Breakdown */}
            <div className={`p-3.5 rounded-xl border transition-all ${hasMultiUOM ? 'bg-indigo-50/80 border-indigo-400' : 'bg-white border-slate-200'}`}>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-slate-900 block">Multiple Units of Measure (Multi-UOM)</span>
                  <span className="text-[10px] text-slate-500 block">Buy in Master Boxes/Cartons, sell in Pieces or Dozens</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasMultiUOM}
                    onChange={(e) => setHasMultiUOM(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>
            </div>

            {/* 5. Returnable Items */}
            <div className={`p-3.5 rounded-xl border transition-all ${returnable ? 'bg-emerald-50/60 border-emerald-300' : 'bg-white border-slate-200'} md:col-span-2`}>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-slate-900 block">Customer Returnable Item</span>
                  <span className="text-[10px] text-slate-500 block">Allow customers to return or exchange this product at POS and online store</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={returnable}
                    onChange={(e) => setReturnable(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>
            </div>

          </div>
        </div>

        {/* PRODUCT DESCRIPTION FIELD - Positioned directly below custom returnable items */}
        <div className="md:col-span-2 space-y-2 pt-2 border-t border-slate-200/80">
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-indigo-600" />
                Product Description & Marketing Copy
              </label>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Detailed customer-facing highlights, key specifications, and warranty notes.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const pName = name || 'Product';
                  const pBrand = brand ? `by ${brand}` : '';
                  const pCat = category ? `in ${category}` : '';
                  const genDesc = `High-performance ${pName} ${pBrand} ${pCat}. Engineered with premium materials, industry-leading durability, and sleek modern design. Perfect for everyday professional and personal use.\n\nKey Highlights:\n- Premium build quality & ergonomic comfort\n- Universal compatibility & effortless setup\n- Includes 1-year manufacturer warranty & dedicated support.`;
                  setDescription(genDesc);
                }}
                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Auto-Generate AI Description
              </button>
            </div>
          </div>

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Detailed features, materials, specifications overview, warranty details, and usage guidelines..."
            className="w-full p-3.5 bg-white border border-slate-200 rounded-2xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500 transition-all resize-none shadow-2xs font-normal leading-relaxed"
          />
        </div>

        {/* Product Commercial Lifecycle Status */}
        <div className="md:col-span-2 space-y-2 pt-2 border-t border-slate-100">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Lifecycle Commercial Status
          </label>
          <div className="flex flex-wrap items-center gap-3">
            {[
              { id: 'Active', label: 'Active', color: 'bg-emerald-500 text-white border-emerald-600', desc: 'Live in POS and available for customer orders' },
              { id: 'Draft', label: 'Draft', color: 'bg-amber-500 text-white border-amber-600', desc: 'Under review; hidden from cashier registers' },
              { id: 'Archived', label: 'Archived', color: 'bg-slate-600 text-white border-slate-700', desc: 'Discontinued product line; historical records retained' }
            ].map((st) => {
              const isSelected = status === st.id;
              return (
                <label
                  key={st.id}
                  onClick={() => setStatus(st.id as any)}
                  className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl border cursor-pointer text-xs font-bold transition-all ${
                    isSelected
                      ? `${st.color} shadow-xs`
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="product_status"
                    checked={isSelected}
                    onChange={() => {}}
                    className="sr-only"
                  />
                  <span>{st.label}</span>
                </label>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
