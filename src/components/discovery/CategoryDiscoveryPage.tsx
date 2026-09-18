import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  ChevronRight,
  FolderTree,
  Grid,
  Layers,
  Loader2,
  Package,
  Search,
  ShieldCheck,
  Star,
  Wrench,
} from 'lucide-react';
import { discoveryRepository } from '../../discovery/discoveryRepository';
import type {
  DiscoveryBusiness,
  DiscoveryCategory,
  DiscoveryProduct,
  DiscoveryService,
} from '../../discovery/types';

function CategoryTree({
  categories,
  parentId,
  onNavigate,
}: {
  categories: DiscoveryCategory[];
  parentId: string | null;
  onNavigate: (path: string) => void;
}) {
  const roots = categories.filter(
    (item) => item.parentId == null,
  );
  const category = parentId == null
    ? null
    : categories.find((item) => item.id === parentId);
  const childCategories = category
    ? categories.filter(
        (item) => item.parentId === category.id,
      )
    : roots;

  return (
    <div className='space-y-4'>
      {childCategories.map((category) => (
        <div key={category.id} className='bg-white rounded-3xl border border-slate-200 p-6'>
          <div className='flex items-center justify-between gap-4'>
            <div>
              <h2 className='font-black text-lg text-slate-900'>{category.name}</h2>
              <p className='text-sm text-slate-500 mt-1'>
                {category.description || `Explore top businesses and offerings in ${category.name}.`}
              </p>
            </div>
            <button
              onClick={() => onNavigate('/category/' + category.slug)}
              className='py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-indigo-600 hover:text-white text-slate-800 text-xs font-black'
            >
              Explore category <ArrowRight className='w-3.5 h-3.5 inline ml-1' />
            </button>
          </div>
          {categories.some((item) => item.parentId === category.id) && (
            <div className='mt-4 pl-4 border-l-2 border-slate-100 space-y-2'>
              <span className='text-[10px] font-black uppercase tracking-wider text-slate-400'>
                Subcategories
              </span>
              <CategoryTree
                categories={categories}
                parentId={category.id}
                onNavigate={onNavigate}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

interface CategoryDiscoveryPageProps {
  categorySlug?: string;
  onNavigate: (path: string) => void;
}

export default function CategoryDiscoveryPage({ categorySlug, onNavigate }: CategoryDiscoveryPageProps) {
  const isIndexMode = !categorySlug;

  // Index state
  const [categories, setCategories] = useState<DiscoveryCategory[]>([]);
  const [indexLoading, setIndexLoading] = useState(false);
  const [indexError, setIndexError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Detail state
  const [currentCategory, setCurrentCategory] = useState<DiscoveryCategory | null>(null);
  const [parentCategory, setParentCategory] = useState<DiscoveryCategory | null>(null);
  const [subcategories, setSubcategories] = useState<DiscoveryCategory[]>([]);
  const [businesses, setBusinesses] = useState<DiscoveryBusiness[]>([]);
  const [products, setProducts] = useState<DiscoveryProduct[]>([]);
  const [services, setServices] = useState<DiscoveryService[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'businesses' | 'products' | 'services'>('all');

  // Load categories for index or subcategory relationships
  useEffect(() => {
    let cancelled = false;
    setIndexLoading(true);
    setIndexError(null);

    void discoveryRepository
      .listCategories({ limit: 100, sort: 'name' })
      .then(response => {
        if (!cancelled) {
          setCategories(response.items);
        }
      })
      .catch(err => {
        if (!cancelled) {
          setIndexError(err instanceof Error ? err.message : 'Failed to load categories.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIndexLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Load detail category and connected entities
  useEffect(() => {
    if (!categorySlug) {
      setCurrentCategory(null);
      setParentCategory(null);
      setSubcategories([]);
      setBusinesses([]);
      setProducts([]);
      setServices([]);
      return;
    }

    let cancelled = false;
    setDetailLoading(true);
    setDetailError(null);

    const loadDetail = async () => {
      try {
        const cat = await discoveryRepository.getCategoryBySlug(categorySlug);
        if (cancelled) return;

        if (!cat) {
          setCurrentCategory(null);
          setDetailLoading(false);
          return;
        }

        setCurrentCategory(cat);

        // Fetch parent if applicable
        if (cat.parentId) {
          const parent = await discoveryRepository.getCategoryById(cat.parentId);
          if (!cancelled) setParentCategory(parent);
        } else {
          setParentCategory(null);
        }

        // Load all category-linked result types with the canonical discovery filters.
        const slug = cat.slug;
        const [businesses, products, services] = await Promise.all([
          discoveryRepository.listBusinesses({ limit: 100, filters: { categorySlug: slug } }),
          discoveryRepository.listProducts({ limit: 100, filters: { categorySlug: slug } }),
          discoveryRepository.listServices({ limit: 100, filters: { categorySlug: slug } }),
        ]);

        const allCategories = await discoveryRepository.listCategories({ limit: 100 });
        if (cancelled) return;

        const childCategories = allCategories.items.filter(
          (item) => item.parentId === cat.id,
        );
        const rootCategories = allCategories.items.filter(
          (item) => item.parentId == null,
        );

        setSubcategories(childCategories);
        setBusinesses(businesses.items);
        setProducts(products.items);
        setServices(services.items);

        // Keep the hierarchy explicitly available for the detail navigation model.
        void rootCategories;
      } catch (err) {
        if (!cancelled) {
          setDetailError(err instanceof Error ? err.message : 'Failed to load category details.');
        }
      } finally {
        if (!cancelled) {
          setDetailLoading(false);
        }
      }
    };

    void loadDetail();

    return () => {
      cancelled = true;
    };
  }, [categorySlug]);

  // Filtered categories for index mode
  const filteredIndexCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const q = searchQuery.toLowerCase().trim();
    return categories.filter(
      c => c.name.toLowerCase().includes(q) || (c.description && c.description.toLowerCase().includes(q)) || c.slug.toLowerCase().includes(q)
    );
  }, [categories, searchQuery]);

  // Root categories vs subcategories map for index
  const { rootCategories, subcategoryMap } = useMemo(() => {
    const roots: DiscoveryCategory[] = [];
    const map = new Map<string, DiscoveryCategory[]>();

    for (const c of filteredIndexCategories) {
      if (!c.parentId) {
        roots.push(c);
      } else {
        const list = map.get(c.parentId) || [];
        list.push(c);
        map.set(c.parentId, list);
      }
    }

    return { rootCategories: roots.length > 0 ? roots : filteredIndexCategories, subcategoryMap: map };
  }, [filteredIndexCategories]);

  // DETAIL VIEW
  if (!isIndexMode) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900" id="category-detail-root">
        <header className="bg-slate-950 text-white px-4 sm:px-6 lg:px-10 py-6 border-b border-slate-800">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => onNavigate(parentCategory ? `/category/${parentCategory.slug}` : '/categories')}
                className="flex items-center gap-1.5 text-xs font-bold text-indigo-300 hover:text-white px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
              <nav className="flex items-center gap-1.5 text-xs text-slate-400">
                <button onClick={() => onNavigate('/categories')} className="hover:text-white">
                  Categories
                </button>
                {parentCategory && (
                  <>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                    <button onClick={() => onNavigate(`/category/${parentCategory.slug}`)} className="hover:text-white">
                      {parentCategory.name}
                    </button>
                  </>
                )}
                {currentCategory && (
                  <>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                    <span className="text-white font-bold">{currentCategory.name}</span>
                  </>
                )}
              </nav>
            </div>
            <button
              onClick={() => onNavigate('/')}
              className="text-xs font-bold text-slate-400 hover:text-white"
            >
              MikitHub Home
            </button>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-8">
          {detailLoading && (
            <div className="py-24 flex items-center justify-center gap-2 text-slate-500">
              <Loader2 className="w-5 h-5 animate-spin" /> Loading category…
            </div>
          )}

          {!detailLoading && detailError && (
            <div className="p-6 rounded-3xl bg-rose-50 border border-rose-200 text-rose-800 text-center">
              <p className="font-bold">{detailError}</p>
              <button
                onClick={() => onNavigate('/categories')}
                className="mt-4 px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold"
              >
                Return to Categories
              </button>
            </div>
          )}

          {!detailLoading && !detailError && !currentCategory && (
            <div className="p-12 rounded-3xl bg-white border border-slate-200 text-center max-w-lg mx-auto">
              <FolderTree className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <h2 className="font-black text-xl text-slate-900">Category Not Found</h2>
              <p className="text-sm text-slate-500 mt-2">
                The requested category “{categorySlug}” is unavailable or inactive.
              </p>
              <button
                onClick={() => onNavigate('/categories')}
                className="mt-6 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700"
              >
                Browse All Categories
              </button>
            </div>
          )}

          {!detailLoading && !detailError && currentCategory && (
            <div className="space-y-8">
              {/* Category Header Card */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-xl">
                      <FolderTree className="w-7 h-7" />
                    </div>
                    <div>
                      <h1 className="text-2xl sm:text-3xl font-black text-slate-900">{currentCategory.name}</h1>
                      <p className="text-sm text-slate-500 mt-1">{currentCategory.description || 'Explore offerings in this category.'}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => onNavigate(`/search?q=${encodeURIComponent(currentCategory.name)}`)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800"
                  >
                    <Search className="w-3.5 h-3.5" /> Search “{currentCategory.name}”
                  </button>
                </div>

                {/* Subcategories pill list */}
                {subcategories.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-slate-100">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-3">
                      Subcategories
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {subcategories.map(sub => (
                        <button
                          key={sub.id}
                          onClick={() => onNavigate(`/category/${sub.slug}`)}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 text-xs font-bold text-slate-700 transition-colors"
                        >
                          {sub.name} <ChevronRight className="w-3 h-3 text-slate-400" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Entity Tabs */}
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'all', label: 'All Offerings', count: businesses.length + products.length + services.length },
                  { id: 'businesses', label: 'Businesses', count: businesses.length },
                  { id: 'products', label: 'Products', count: products.length },
                  { id: 'services', label: 'Services', count: services.length },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as never)}
                    className={`px-4 py-2 rounded-full text-xs font-bold border transition-all ${
                      activeTab === tab.id
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {tab.label} ({tab.count})
                  </button>
                ))}
              </div>

              {/* Empty state */}
              {businesses.length === 0 && products.length === 0 && services.length === 0 && (
                <div className="p-12 rounded-3xl bg-white border border-slate-200 text-center">
                  <Package className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                  <h3 className="font-bold text-base text-slate-800">No offerings listed yet</h3>
                  <p className="text-xs text-slate-500 mt-1">There are currently no active businesses, products, or services in this category.</p>
                </div>
              )}

              {/* Businesses Section */}
              {(activeTab === 'all' || activeTab === 'businesses') && businesses.length > 0 && (
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-indigo-600" /> Businesses ({businesses.length})
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {businesses.map(biz => (
                      <button
                        key={biz.id}
                        onClick={() => onNavigate('/business/' + biz.slug)}
                        className="text-left bg-white rounded-3xl border border-slate-200 p-5 hover:border-indigo-300 hover:shadow-lg transition-all group"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-bold text-base text-slate-900 group-hover:text-indigo-600 transition-colors">
                              {biz.name}
                            </h3>
                            <p className="text-xs text-slate-500 mt-1">{biz.locations[0]?.city || 'Local business'}</p>
                          </div>
                          {biz.isVerified && <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />}
                        </div>
                        <p className="text-sm text-slate-500 mt-3 line-clamp-2">{biz.headline || biz.description}</p>
                        <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500">
                          <span className="flex items-center gap-1 font-bold text-slate-700">
                            <Star className="w-3.5 h-3.5 text-amber-500" /> {biz.ratingAverage.toFixed(1)} ({biz.reviewCount})
                          </span>
                          <span className="flex items-center gap-1 text-indigo-600 font-bold">
                            View Profile <ArrowRight className="w-3 h-3" />
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {/* Products Section */}
              {(activeTab === 'all' || activeTab === 'products') && products.length > 0 && (
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                      <Package className="w-5 h-5 text-indigo-600" /> Products ({products.length})
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {productucts.map(product => (
                      <button
                        key={product.id}
                        onClick={() => onNavigate(product.slug ? '/productuct/' + product.slug : `/productucts`)}
                        className="text-left bg-white rounded-3xl border border-slate-200 p-5 hover:border-indigo-300 hover:shadow-lg transition-all group"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                            <Package className="w-5 h-5" />
                          </div>
                          <span className="text-sm font-black text-indigo-600">
                            {product.currency || '$'}{product.price.toFixed(2)}
                          </span>
                        </div>
                        <h3 className="font-bold text-base text-slate-900 mt-3 group-hover:text-indigo-600 transition-colors">
                          {product.name}
                        </h3>
                        <p className="text-sm text-slate-500 mt-1 line-clamp-2">{product.description || 'Quality productuct offering.'}</p>
                        <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500">
                          <span>{product.brand || 'Available in stock'}</span>
                          <span className="flex items-center gap-1 text-indigo-600 font-bold">
                            View Product <ArrowRight className="w-3 h-3" />
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {/* Services Section */}
              {(activeTab === 'all' || activeTab === 'services') && services.length > 0 && (
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                      <Wrench className="w-5 h-5 text-indigo-600" /> Services ({services.length})
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {serviceices.map(service => (
                      <button
                        key={service.id}
                        onClick={() => onNavigate(service.slug ? '/serviceice/' + service.slug : `/serviceices`)}
                        className="text-left bg-white rounded-3xl border border-slate-200 p-5 hover:border-indigo-300 hover:shadow-lg transition-all group"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                            <Wrench className="w-5 h-5" />
                          </div>
                          {service.price != null && (
                            <span className="text-sm font-black text-indigo-600">
                              {service.currency || '$'}{service.price.toFixed(2)}
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-base text-slate-900 mt-3 group-hover:text-indigo-600 transition-colors">
                          {service.name}
                        </h3>
                        <p className="text-sm text-slate-500 mt-1 line-clamp-2">{service.description || 'Professional serviceice.'}</p>
                        <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500">
                          <span>{service.durationMinutes ? `${service.durationMinutes} mins` : 'Available for booking'}</span>
                          <span className="flex items-center gap-1 text-indigo-600 font-bold">
                            View Service <ArrowRight className="w-3 h-3" />
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </main>
      </div>
    );
  }

  // INDEX VIEW (/categories)
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900" id="categories-index-root">
      <header className="bg-slate-950 text-white px-4 sm:px-6 lg:px-10 py-6 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <button
            onClick={() => onNavigate('/')}
            className="flex items-center gap-2 text-sm font-bold text-indigo-300 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" /> MikitHub
          </button>
          <div className="text-right">
            <h1 className="text-xl sm:text-2xl font-black">All Categories</h1>
            <p className="text-xs text-slate-300">Browse businesses, products, and serviceices by industry.</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-8">
        {/* Search Bar */}
        <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-5 mb-8">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Filter categories by name or keyword…"
              className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
        </div>

        {indexLoading && (
          <div className="py-24 flex items-center justify-center gap-2 text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading categories…
          </div>
        )}

        {!indexLoading && indexError && (
          <div className="p-6 rounded-3xl bg-rose-50 border border-rose-200 text-rose-800 text-center">
            {indexError}
          </div>
        )}

        {!indexLoading && !indexError && filteredIndexCategories.length === 0 && (
          <div className="p-12 rounded-3xl bg-white border border-slate-200 text-center">
            <FolderTree className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <h3 className="font-bold text-base text-slate-800">No categories found</h3>
            <p className="text-xs text-slate-500 mt-1">Try adjusting your search query.</p>
          </div>
        )}

        {!indexLoading && !indexError && filteredIndexCategories.length > 0 && (
          <CategoryTree
            categories={filteredIndexCategories}
            parentId={null}
            onNavigate={onNavigate}
          />
        )}
      </main>
    </div>
  );
}
