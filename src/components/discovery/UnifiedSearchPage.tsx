import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Building2, FolderTree, Loader2, Package, Search, ShieldCheck, Star, Wrench } from 'lucide-react';
import { discoveryRepository } from '../../discovery/discoveryRepository';
import type { DiscoveryEntityType, DiscoverySearchItem, UnifiedDiscoveryResults } from '../../discovery/types';

interface UnifiedSearchPageProps {
  initialQuery?: string;
  onNavigate: (path: string) => void;
}

const ENTITY_LABELS: Record<DiscoveryEntityType, string> = { business: 'Businesses', product: 'Products', service: 'Services', category: 'Categories' };

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

export default function UnifiedSearchPage({ initialQuery = '', onNavigate }: UnifiedSearchPageProps) {
  const [queryText, setQueryText] = useState(initialQuery);
  const [submittedQuery, setSubmittedQuery] = useState(initialQuery.trim());
  const [results, setResults] = useState<UnifiedDiscoveryResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<DiscoveryEntityType | 'all'>('all');

  useEffect(() => {
    setQueryText(initialQuery);
    setSubmittedQuery(initialQuery.trim());
  }, [initialQuery]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await discoveryRepository.search({
          filters: { text: submittedQuery || undefined },
          limit: 24,
          types: activeType === 'all' ? undefined : [activeType],
          sort: 'relevance',
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
  }, [submittedQuery, activeType]);

  const rankedResults = useMemo(() => {
    if (!results) return [];
    return results.rankedResults;
  }, [results]);

  const submit = (event: React.FormEvent) => { event.preventDefault(); setSubmittedQuery(queryText.trim()); };
  const counts = results ? {
    all: results.businesses.total + results.products.total + results.services.total + results.categories.total,
    business: results.businesses.total, product: results.products.total, service: results.services.total, category: results.categories.total,
  } : { all: 0, business: 0, product: 0, service: 0, category: 0 };

  return (
    <div className='min-h-screen bg-slate-50 text-slate-900' id='unified-search-root'>
      <header className='bg-slate-950 text-white px-4 sm:px-6 lg:px-10 py-6'>
        <div className='max-w-7xl mx-auto space-y-4'>
          <button onClick={() => onNavigate('/')} className='text-sm font-bold text-indigo-300 hover:text-white'>MikitHub</button>
          <div><h1 className='text-2xl sm:text-3xl font-black tracking-tight'>Search MikitHub</h1><p className='text-sm text-slate-300 mt-1'>Find businesses, products, services, and categories in one search.</p></div>
          <form onSubmit={submit} className='flex gap-2 max-w-3xl'>
            <div className='flex-1 relative'><Search className='absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400' /><input value={queryText} onChange={e => setQueryText(e.target.value)} placeholder='What are you looking for?' aria-label='Search MikitHub' className='w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white text-slate-900 outline-none focus:ring-2 focus:ring-indigo-400' /></div>
            <button type='submit' className='px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 font-bold'>Search</button>
          </form>
        </div>
      </header>
      <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-8'>
        <div className='flex flex-wrap gap-2 mb-6'>
          {(['all', 'business', 'product', 'service', 'category'] as const).map(type => <button key={type} onClick={() => setActiveType(type)} className={'px-4 py-2 rounded-full text-xs font-bold border ' + (activeType === type ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700 border-slate-200')}>{type === 'all' ? 'All' : ENTITY_LABELS[type]} ({counts[type]})</button>)}
        </div>
        {loading && <div className='py-16 flex items-center justify-center gap-2 text-slate-500'><Loader2 className='w-5 h-5 animate-spin' /> Searching MikitHub…</div>}
        {!loading && error && <div className='p-5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800'>{error}</div>}
        {!loading && !error && submittedQuery && rankedResults.length === 0 && <div className='p-10 rounded-3xl bg-white border border-slate-200 text-center'><Search className='w-8 h-8 mx-auto text-slate-300 mb-3' /><h2 className='font-bold text-lg'>No results found</h2><p className='text-sm text-slate-500 mt-1'>Try a product, business, service, or category name.</p></div>}
        {!loading && !error && !submittedQuery && <div className='p-10 rounded-3xl bg-white border border-slate-200 text-center'><Search className='w-8 h-8 mx-auto text-slate-300 mb-3' /><h2 className='font-bold text-lg'>Start with what you need</h2><p className='text-sm text-slate-500 mt-1'>Search across the MikitHub discovery graph.</p></div>}
        {!loading && !error && rankedResults.length > 0 && <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5'>
          {rankedResults.map(result => <button key={result.type + '-' + result.item.id} onClick={() => onNavigate(resultPath(result))} className='text-left bg-white rounded-3xl border border-slate-200 p-5 hover:border-indigo-300 hover:shadow-lg transition-all group'>
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
        </div>}
      </main>
    </div>
  );
}