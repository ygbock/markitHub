import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ChevronRight, FolderTree, Loader2, Search, Tag } from 'lucide-react';
import { discoveryRepository } from '../../discovery/discoveryRepository';
import type { DiscoveryCategory, DiscoveryBusiness, DiscoveryProduct, DiscoveryService } from '../../discovery/types';

interface CategoryDiscoveryPageProps {
  mode: 'index' | 'detail';
  categorySlug?: string;
  onNavigate: (path: string) => void;
}

function CategoryCard({ category, onNavigate }: { category: DiscoveryCategory; onNavigate: (path: string) => void }) {
  return (
    <button
      onClick={() => onNavigate('/category/' + category.slug)}
      className='text-left bg-white rounded-3xl border border-slate-200 p-5 hover:border-indigo-300 hover:shadow-lg transition-all'
    >
      <div className='w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center mb-4'>
        <Tag className='w-5 h-5' />
      </div>
      <h2 className='font-black text-slate-900'>{category.name}</h2>
      {category.description && <p className='text-sm text-slate-500 mt-2 line-clamp-2'>{category.description}</p>}
      <div className='mt-4 flex items-center gap-1 text-xs font-bold text-indigo-600'>Explore category <ChevronRight className='w-3.5 h-3.5' /></div>
    </button>
  );
}

export default function CategoryDiscoveryPage({ mode, categorySlug, onNavigate }: CategoryDiscoveryPageProps) {
  const [categories, setCategories] = useState<DiscoveryCategory[]>([]);
  const [category, setCategory] = useState<DiscoveryCategory | null>(null);
  const [businesses, setBusinesses] = useState<DiscoveryBusiness[]>([]);
  const [products, setProducts] = useState<DiscoveryProduct[]>([]);
  const [services, setServices] = useState<DiscoveryService[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    if (mode === 'index') {
      void discoveryRepository.listCategories({ limit: 100, sort: 'name' })
        .then(result => { if (!cancelled) setCategories(result.items); })
        .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : 'Categories are temporarily unavailable.'); })
        .finally(() => { if (!cancelled) setLoading(false); });
      return () => { cancelled = true; };
    }

    const slug = categorySlug?.trim().toLowerCase();
    if (!slug) {
      setError('Category not found.');
      setLoading(false);
      return () => { cancelled = true; };
    }

    void Promise.all([
      discoveryRepository.getCategoryBySlug(slug),
      discoveryRepository.listCategories({ limit: 100 }),
      discoveryRepository.listBusinesses({ limit: 100, filters: { categorySlug: slug } }),
      discoveryRepository.listProducts({ limit: 100, filters: { categorySlug: slug } }),
      discoveryRepository.listServices({ limit: 100, filters: { categorySlug: slug } }),
    ])
      .then(([found, allCategories, businessResult, productResult, serviceResult]) => {
        if (cancelled) return;
        setCategory(found);
        setCategories(allCategories.items);
        setBusinesses(businessResult.items);
        setProducts(productResult.items);
        setServices(serviceResult.items);
        if (!found) setError('Category not found.');
      })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : 'Category discovery is temporarily unavailable.'); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [mode, categorySlug]);

  const children = useMemo(() => {
    if (!category) return [];
    return categories.filter(item => item.parentId === category.id).sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  }, [categories, category]);

  const filteredCategories = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return categories.filter(item =>
      !needle || item.name.toLowerCase().includes(needle) || item.slug.toLowerCase().includes(needle)
    ).sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  }, [categories, query]);

  return (
    <div className='min-h-screen bg-slate-50 text-slate-900' id='category-discovery-root'>
      <header className='bg-slate-950 text-white px-4 sm:px-6 lg:px-10 py-6'>
        <div className='max-w-7xl mx-auto'>
          <button onClick={() => onNavigate('/')} className='flex items-center gap-2 text-sm font-bold text-indigo-300 hover:text-white mb-5'>
            <ArrowLeft className='w-4 h-4' /> MikitHub
          </button>
          <h1 className='text-2xl sm:text-3xl font-black'>{mode === 'index' ? 'Browse Categories' : category?.name || 'Category'}</h1>
          <p className='text-sm text-slate-300 mt-1'>{mode === 'index' ? 'Explore the platform taxonomy across businesses, products, and services.' : category?.description || 'Discover businesses, products, and services in this category.'}</p>
        </div>
      </header>

      <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-7'>
        {mode === 'index' && (
          <div className='mb-6 relative'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400' />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder='Search categories' className='w-full bg-white border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-sm' />
          </div>
        )}

        {error && <div className='mb-6 rounded-2xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-800'>{error}</div>}
        {loading && <div className='py-16 flex justify-center items-center gap-2 text-slate-500'><Loader2 className='w-5 h-5 animate-spin' /> Loading categories…</div>}

        {!loading && mode === 'index' && (
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5'>
            {filteredCategories.map(item => <CategoryCard key={item.id} category={item} onNavigate={onNavigate} />)}
          </div>
        )}

        {!loading && mode === 'detail' && category && (
          <>
            {children.length > 0 && (
              <section className='mb-8'>
                <div className='flex items-center gap-2 mb-4'><FolderTree className='w-5 h-5 text-indigo-600' /><h2 className='text-lg font-black'>Subcategories</h2></div>
                <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
                  {children.map(item => <CategoryCard key={item.id} category={item} onNavigate={onNavigate} />)}
                </div>
              </section>
            )}

            <section className='grid grid-cols-1 md:grid-cols-3 gap-4 mb-8'>
              <div className='bg-white border border-slate-200 rounded-2xl p-5'><div className='text-2xl font-black'>{businesses.length}</div><div className='text-xs text-slate-500 mt-1'>Businesses</div></div>
              <div className='bg-white border border-slate-200 rounded-2xl p-5'><div className='text-2xl font-black'>{products.length}</div><div className='text-xs text-slate-500 mt-1'>Products</div></div>
              <div className='bg-white border border-slate-200 rounded-2xl p-5'><div className='text-2xl font-black'>{services.length}</div><div className='text-xs text-slate-500 mt-1'>Services</div></div>
            </section>

            <section className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
              <div className='bg-white rounded-3xl border border-slate-200 p-5'>
                <h2 className='font-black mb-4'>Businesses</h2>
                <div className='space-y-3'>{businesses.map(item => <button key={item.id} onClick={() => onNavigate('/business/' + item.slug)} className='w-full text-left p-3 rounded-xl hover:bg-slate-50'><div className='font-bold text-sm'>{item.name}</div><div className='text-xs text-slate-500 mt-1'>{item.headline || item.description}</div></button>)}</div>
              </div>
              <div className='bg-white rounded-3xl border border-slate-200 p-5'>
                <h2 className='font-black mb-4'>Products</h2>
                <div className='space-y-3'>{products.map(item => <button key={item.id} onClick={() => onNavigate('/product/' + item.id)} className='w-full text-left p-3 rounded-xl hover:bg-slate-50'><div className='font-bold text-sm'>{item.name}</div><div className='text-xs text-slate-500 mt-1'>{item.price.toLocaleString()} {item.currency || ''}</div></button>)}</div>
              </div>
              <div className='bg-white rounded-3xl border border-slate-200 p-5'>
                <h2 className='font-black mb-4'>Services</h2>
                <div className='space-y-3'>{services.map(item => <button key={item.id} onClick={() => onNavigate('/service/' + item.id)} className='w-full text-left p-3 rounded-xl hover:bg-slate-50'><div className='font-bold text-sm'>{item.name}</div><div className='text-xs text-slate-500 mt-1'>{item.price == null ? 'Contact provider' : item.price.toLocaleString()}</div></button>)}</div>
              </div>
            </section>
          </>
        )}

        {!loading && mode === 'detail' && !category && <div className='py-16 text-center text-slate-500'>This category is not available.</div>}
      </main>
    </div>
  );
}
