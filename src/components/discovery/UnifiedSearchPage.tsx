import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Building2, Check, Filter, FolderTree, Loader2, MapPin, Navigation, Package, RotateCcw, Search, ShieldCheck, Star, Wrench } from 'lucide-react';
import { discoveryRepository } from '../../discovery/discoveryRepository';
import type { DiscoveryEntityType, DiscoveryFilters, DiscoverySearchItem, DiscoverySort, UnifiedDiscoveryResults } from '../../discovery/types';

interface UnifiedSearchPageProps {
  initialQuery?: string;
  onNavigate: (path: string) => void;
}

const ENTITY_LABELS: Record<DiscoveryEntityType, string> = {
  business: 'Businesses',
  product: 'Products',
  service: 'Services',
  category: 'Categories',
};

const DEFAULT_FILTERS: DiscoveryFilters = {};

function resultPath(result: DiscoverySearchItem): string {
  switch (result.type) {
    case 'business': return '/business/' + (result.item as { slug?: string }).slug;
    case 'product': return '/product/' + result.item.id;
    case 'service': return '/service/' + result.item.id;
    case 'category': return '/category/' + (result.item as { slug?: string }).slug;
  }
}

function resultDescription(result: DiscoverySearchItem): string {
  switch (result.type) {
    case 'business': {
      const b = result.item as { headline?: string; description?: string };
      return b.headline || b.description || '';
    }
    case 'product': {
      const p = result.item as { description?: string };
      return p.description || 'Product available from a MikitHub business.';
    }
    case 'service': {
      const s = result.item as { description?: string };
      return s.description || 'Service offered by a MikitHub provider.';
    }
    case 'category': {
      const c = result.item as { description?: string };
      return c.description || 'Browse businesses and offerings in this category.';
    }
  }
}

function activeFilterCount(filters: DiscoveryFilters): number {
  const values = Object.entries(filters).filter(([key, value]) =>
    !['latitude', 'longitude'].includes(key) && value !== undefined && value !== '' && value !== false,
  );
  const hasLocation = filters.latitude != null && filters.longitude != null;
  return values.length + (hasLocation ? 1 : 0);
}

export default function UnifiedSearchPage({ initialQuery = '', onNavigate }: UnifiedSearchPageProps) {
  const [queryText, setQueryText] = useState(initialQuery);
  const [submittedQuery, setSubmittedQuery] = useState(initialQuery.trim());
  const [results, setResults] = useState<UnifiedDiscoveryResults | null>(null);
  const [categories, setCategories] = useState<Array<{ id: string; name: string; slug: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<DiscoveryEntityType | 'all'>('all');
  const [filters, setFilters] = useState<DiscoveryFilters>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<DiscoverySort>('relevance');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'denied' | 'error'>('idle');

  useEffect(() => {
    setQueryText(initialQuery);
    setSubmittedQuery(initialQuery.trim());
  }, [initialQuery]);

  useEffect(() => {
    let cancelled = false;
    setCategoryLoading(true);
    void discoveryRepository.listCategories({ limit: 100, sort: 'name' })
      .then(response => {
        if (!cancelled) setCategories(response.items.map(category => ({ id: category.id, name: category.name, slug: category.slug })));
      })
      .catch(() => {
        if (!cancelled) setCategories([]);
      })
      .finally(() => {
        if (!cancelled) setCategoryLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await discoveryRepository.search({
          filters: { ...filters, text: submittedQuery || undefined },
          limit: 24,
          types: activeType === 'all' ? undefined : [activeType],
          sort,
        });
        if (!cancelled) setResults(response);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Search is temporarily unavailable.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => { cancelled = true; };
  }, [submittedQuery, activeType, filters, sort]);

  const rankedResults = useMemo(() => results?.rankedResults ?? [], [results]);
  const counts = results ? {
    all: results.businesses.total + results.products.total + results.services.total + results.categories.total,
    business: results.businesses.total,
    product: results.products.total,
    service: results.services.total,
    category: results.categories.total,
  } : { all: 0, business: 0, product: 0, service: 0, category: 0 };

  const setFilter = <K extends keyof DiscoveryFilters>(key: K, value: DiscoveryFilters[K]) => {
    setFilters(current => ({ ...current, [key]: value === '' ? undefined : value }));
  };

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setSort('relevance');
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setSubmittedQuery(queryText.trim());
  };

  const filterCount = activeFilterCount(filters);

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('error');
      return;
    }
    setLocationStatus('loading');
    navigator.geolocation.getCurrentPosition(
      position => {
        setFilters(current => ({
          ...current,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          radiusKm: current.radiusKm ?? 10,
        }));
        setLocationStatus('idle');
      },
      error => setLocationStatus(error.code === error.PERMISSION_DENIED ? 'denied' : 'error'),
      { enableHighAccuracy: false, maximumAge: 300000, timeout: 10000 },
    );
  };

  return (
    <div className='min-h-screen bg-slate-50 text-slate-900' id='unified-search-root'>
      <header className='bg-slate-950 text-white px-4 sm:px-6 lg:px-10 py-6'>
        <div className='max-w-7xl mx-auto space-y-4'>
          <button onClick={() => onNavigate('/')} className='text-sm font-bold text-indigo-300 hover:text-white'>MikitHub</button>
          <div><h1 className='text-2xl sm:text-3xl font-black tracking-tight'>Search MikitHub</h1><p className='text-sm text-slate-300 mt-1'>Find businesses, products, services, and categories in one search.</p></div>
          <form onSubmit={submit} className='grid grid-cols-1 md:grid-cols-[1fr_220px_auto_auto] gap-2 max-w-6xl'>
            <div className='flex-1 relative'><Search className='absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400' /><input value={queryText} onChange={e => setQueryText(e.target.value)} placeholder='What are you looking for?' aria-label='Search MikitHub' className='w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white text-slate-900 outline-none focus:ring-2 focus:ring-indigo-400' /></div>
          <div className='relative'>
              <MapPin className='absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400' />
              <input
                value={filters.latitude != null && filters.longitude != null ? 'Using your location' : ''}
                readOnly
                placeholder='Where?'
                aria-label='Discovery location'
                className='w-full pl-12 pr-3 py-3.5 rounded-2xl bg-white text-slate-900'
              />
            </div>
            <button
              type='button'
              onClick={() => {
                if (!navigator.geolocation) {
                  setLocationStatus('error');
                  return;
                }
                setLocationStatus('loading');
                navigator.geolocation.getCurrentPosition(
                  position => {
                    setFilters(current => ({
                      ...current,
                      latitude: position.coords.latitude,
                      longitude: position.coords.longitude,
                      radiusKm: current.radiusKm ?? 10,
                    }));
                    setLocationStatus('idle');
                  },
                  error => setLocationStatus(error.code === error.PERMISSION_DENIED ? 'denied' : 'error'),
                  { enableHighAccuracy: false, maximumAge: 300000, timeout: 10000 },
                );
              }}
              disabled={locationStatus === 'loading'}
              className='px-4 py-3.5 rounded-2xl bg-white/10 border border-white/20 hover:bg-white/15 font-bold text-sm flex items-center justify-center gap-2'>
              <Navigation className='w-4 h-4' /> {locationStatus === 'loading' ? 'Locating…' : 'Use my location'}
            </button>
            <button type='submit' className='px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 font-bold'>Search</button>
          </form>
          {locationStatus === 'denied' && <p className='text-xs text-amber-300'>Location access was denied. You can still search without location.</p>}
          {locationStatus === 'error' && <p className='text-xs text-amber-300'>Location is unavailable. You can still search without location.</p>}
        </div>
      </header>

      <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-8'>
        <div className='flex flex-wrap gap-2 mb-4'>
          {(['all', 'business', 'product', 'service', 'category'] as const).map(type => (
            <button key={type} onClick={() => setActiveType(type)} className={'px-4 py-2 rounded-full text-xs font-bold border ' + (activeType === type ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700 border-slate-200')}>
              {type === 'all' ? 'All' : ENTITY_LABELS[type]} ({counts[type]})
            </button>
          ))}
        </div>

        <section className='bg-white rounded-3xl border border-slate-200 mb-7'>
          <div className='flex items-center justify-between gap-3 p-4'>
            <button onClick={() => setFiltersOpen(open => !open)} className='flex items-center gap-2 text-sm font-black text-slate-800'>
              <Filter className='w-4 h-4 text-indigo-600' /> Filters{filterCount > 0 && <span className='rounded-full bg-indigo-100 text-indigo-700 px-2 py-0.5 text-[10px]'>{filterCount}</span>}
            </button>
            <div className='flex items-center gap-2'>
              <label htmlFor='discovery-sort' className='text-xs font-bold text-slate-500'>Sort</label>
              <select id='discovery-sort' value={sort} onChange={e => setSort(e.target.value as DiscoverySort)} className='rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold'>
                <option value='relevance'>Relevance</option>
                <option value='rating'>Rating</option>
                <option value='distance'>Distance</option>
                <option value='name'>Name</option>
              </select>
              {filterCount > 0 && <button onClick={resetFilters} aria-label='Reset discovery filters' className='p-2 rounded-xl border border-slate-200 hover:bg-slate-50'><RotateCcw className='w-4 h-4' /></button>}
            </div>
          </div>

          {filtersOpen && (
            <div className='border-t border-slate-100 p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
              <label className='space-y-1.5'>
                <span className='text-[11px] font-black uppercase tracking-wide text-slate-500'>Category</span>
                <select value={filters.categorySlug ?? ''} onChange={e => setFilter('categorySlug', e.target.value)} className='w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm'>
                  <option value=''>All categories</option>
                  {categories.map(category => <option key={category.id} value={category.slug}>{category.name}</option>)}
                </select>
                {categoryLoading && <span className='text-[10px] text-slate-400'>Loading categories…</span>}
              </label>

              <label className='space-y-1.5'>
                <span className='text-[11px] font-black uppercase tracking-wide text-slate-500'>Minimum price</span>
                <input type='number' min='0' step='0.01' value={filters.minPrice ?? ''} onChange={e => setFilter('minPrice', e.target.value === '' ? undefined : Number(e.target.value))} className='w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm' />
              </label>

              <label className='space-y-1.5'>
                <span className='text-[11px] font-black uppercase tracking-wide text-slate-500'>Maximum price</span>
                <input type='number' min='0' step='0.01' value={filters.maxPrice ?? ''} onChange={e => setFilter('maxPrice', e.target.value === '' ? undefined : Number(e.target.value))} className='w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm' />
              </label>

              <label className='space-y-1.5'>
                <span className='text-[11px] font-black uppercase tracking-wide text-slate-500'>Radius (km)</span>
                <input type='number' min='1' max='100' step='1' value={filters.radiusKm ?? ''} onChange={e => setFilter('radiusKm', e.target.value === '' ? undefined : Number(e.target.value))} placeholder='Requires coordinates' className='w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm' />
              </label>

              <div className='sm:col-span-2 lg:col-span-4 flex flex-wrap gap-2'>
                {[
                  ['verifiedOnly', 'Verified businesses'],
                  ['featuredOnly', 'Featured'],
                  ['openNow', 'Open now'],
                  ['availableOnly', 'Available now'],
                ].map(([key, label]) => (
                  <button key={key} type='button' onClick={() => setFilter(key as keyof DiscoveryFilters, !filters[key as keyof DiscoveryFilters] as never)} className={'flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold ' + (filters[key as keyof DiscoveryFilters] ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-white border-slate-200 text-slate-600')}>
                    {filters[key as keyof DiscoveryFilters] ? <Check className='w-3.5 h-3.5' /> : <span className='w-3.5 h-3.5 rounded border border-slate-300' />}
                    {label}
                  </button>
                ))}
              </div>

              <div className='sm:col-span-2 lg:col-span-4 text-[11px] text-slate-400'>
                Distance and “open now” are applied from authoritative business location data. Location filtering applies to business results; products and services retain their business linkage for entity navigation. A radius without a latitude/longitude origin is intentionally ignored.
              </div>
            </div>
          )}
        </section>

        {loading && <div className='py-16 flex items-center justify-center gap-2 text-slate-500'><Loader2 className='w-5 h-5 animate-spin' /> Searching MikitHub…</div>}
        {!loading && error && <div className='p-5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800'>{error}</div>}
        {!loading && !error && submittedQuery && rankedResults.length === 0 && <div className='p-10 rounded-3xl bg-white border border-slate-200 text-center'><Search className='w-8 h-8 mx-auto text-slate-300 mb-3' /><h2 className='font-bold text-lg'>No results found</h2><p className='text-sm text-slate-500 mt-1'>Try changing the search or filters.</p></div>}
        {!loading && !error && !submittedQuery && <div className='p-10 rounded-3xl bg-white border border-slate-200 text-center'><Search className='w-8 h-8 mx-auto text-slate-300 mb-3' /><h2 className='font-bold text-lg'>Start with what you need</h2><p className='text-sm text-slate-500 mt-1'>Search across the MikitHub discovery graph.</p></div>}
        {!loading && !error && rankedResults.length > 0 && <div className='grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6'>
          <aside className='hidden lg:block bg-white rounded-3xl border border-slate-200 p-5 h-fit sticky top-5'>
            <div className='flex items-center gap-2 font-black'><Filter className='w-4 h-4 text-indigo-600' /> Refine results</div>
            <p className='text-xs text-slate-500 mt-2'>{counts.all} results across businesses, products, services, and categories.</p>
            <button onClick={() => setFiltersOpen(true)} className='mt-4 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold hover:bg-slate-50'>Open filters</button>
          </aside>
          <div className='space-y-4'>
            {activeType !== 'all' && (
              <div className='text-sm font-black text-slate-700'>{ENTITY_LABELS[activeType]} results</div>
            )}
            {rankedResults.map(result => <button key={result.type + '-' + result.item.id} onClick={() => onNavigate(resultPath(result))} className='w-full text-left bg-white rounded-3xl border border-slate-200 p-5 hover:border-indigo-300 hover:shadow-lg transition-all group'>
            <div className='flex items-start justify-between gap-3'><div className='w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0'>{result.type === 'business' && <Building2 className='w-5 h-5' />}{result.type === 'product' && <Package className='w-5 h-5' />}{result.type === 'service' && <Wrench className='w-5 h-5' />}{result.type === 'category' && <FolderTree className='w-5 h-5' />}</div><span className='text-[10px] uppercase tracking-wider font-black text-slate-400'>{ENTITY_LABELS[result.type]}</span></div>
            <h2 className='font-bold text-base mt-4 group-hover:text-indigo-600'>{result.item.name}</h2><p className='text-sm text-slate-500 mt-1 line-clamp-2'>{resultDescription(result)}</p>
            {result.type === 'business' && (() => {
              const b = result.item as import('../../discovery/types').DiscoveryBusiness;
              return (
                <div className='flex items-center gap-2 mt-4 text-xs text-slate-500'>
                  {b.isVerified && <span className='flex items-center gap-1 text-emerald-700 font-bold'><ShieldCheck className='w-3.5 h-3.5' /> Verified</span>}
                  <span className='flex items-center gap-1'><Star className='w-3.5 h-3.5 text-amber-500' /> {b.ratingAverage.toFixed(1)} ({b.reviewCount})</span>
                </div>
              );
            })()}
            <div className='mt-4 flex items-center gap-1 text-xs font-bold text-indigo-600'>View result <ArrowRight className='w-3.5 h-3.5' /></div>
          </button>)}
          </div>
        </div>}
      </main>
    </div>
  );
}