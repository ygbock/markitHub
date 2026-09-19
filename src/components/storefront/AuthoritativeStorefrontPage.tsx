import React, { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, MapPin, ShoppingBag } from 'lucide-react';
import { discoveryRepository } from '../../discovery/discoveryRepository';
import type { DiscoveryProduct } from '../../discovery/types';
import type { StorefrontCartLine } from './StorefrontCartPage';

interface Props {
  tenantSlug: string;
  routeId: string;
  onNavigate: (path: string) => void;
  onOpenLogin: () => void;
  onAddToCart: (item: StorefrontCartLine) => void;
}

interface Storefront {
  tenantId: string;
  businessId: string;
  slug: string;
  name: string;
  publicationStatus: 'draft' | 'published';
  logoUrl: string;
  primaryColor: string;
  accentColor: string;
  tagline: string;
  sections: Array<{
    id: string; type: string; title: string; subtitle?: string; enabled: boolean; status: 'draft' | 'active';
    order: number; selectedProductIds?: string[]; category?: string; bannerUrl?: string; buttonText?: string; buttonUrl?: string;
  }>;
}

export default function AuthoritativeStorefrontPage({ tenantSlug, routeId, onNavigate, onOpenLogin, onAddToCart }: Props) {
  const [storefront, setStorefront] = useState<Storefront | null>(null);
  const [products, setProducts] = useState<DiscoveryProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const response = await fetch('/api/storefront/' + encodeURIComponent(tenantSlug) + '/config');
        const json = await response.json();
        if (!response.ok || !json.success) throw new Error(json.error || 'Storefront is unavailable.');
        const config = json.storefront as Storefront;
        const discovered = await discoveryRepository.listProducts({
          limit: 100,
          filters: { tenantId: config.tenantId, availableOnly: false },
        });
        if (mounted) {
          setStorefront(config);
          setProducts(discovered.items);
        }
      } catch (err: any) {
        if (mounted) setError(err?.message || 'Unable to load storefront.');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [tenantSlug]);

  if (loading) return <div className="min-h-screen grid place-items-center text-slate-500">Loading storefront…</div>;
  if (error || !storefront) return <div className="min-h-screen grid place-items-center p-6"><div className="max-w-md text-center"><h1 className="text-xl font-bold">Storefront unavailable</h1><p className="mt-2 text-sm text-slate-500">{error || 'This storefront could not be found.'}</p><button className="mt-5 px-4 py-2 rounded-lg bg-slate-900 text-white" onClick={() => onNavigate('/')}>Back to discovery</button></div></div>;

  const visibleSections = storefront.sections.filter(section => section.enabled && section.status === 'active').sort((a,b) => a.order-b.order);
  const featuredIds = new Set(visibleSections.flatMap(section => section.selectedProductIds || []));
  const routeProductId = routeId === 'storefront.product.detail' ? window.location.pathname.split('/').filter(Boolean).pop() : null;
  const visibleProducts = routeId === 'storefront.products'
    ? products
    : routeProductId
      ? products.filter(product => product.id === routeProductId)
      : products.filter(product => featuredIds.size === 0 || featuredIds.has(product.id)).slice(0, 12);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-30 border-b bg-white/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-5 py-4 flex items-center justify-between gap-4">
          <button className="flex items-center gap-3 text-left" onClick={() => onNavigate('/store/' + storefront.slug)}>
            {storefront.logoUrl ? <img src={storefront.logoUrl} alt="" className="h-10 w-10 rounded-xl object-cover" /> : <div className="h-10 w-10 rounded-xl grid place-items-center text-white font-black" style={{backgroundColor: storefront.primaryColor}}>M</div>}
            <div><div className="font-black">{storefront.name}</div><div className="text-xs text-slate-500">{storefront.tagline}</div></div>
          </button>
          <div className="flex items-center gap-2">
            <button className="px-3 py-2 rounded-lg text-sm hover:bg-slate-100" onClick={() => onNavigate('/store/' + storefront.slug + '/products')}>Products</button>
            <button className="px-3 py-2 rounded-lg text-sm hover:bg-slate-100" onClick={onOpenLogin}>Sign in</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-5 py-8 space-y-10">
        {routeId === 'storefront.home' && (
          <section className="rounded-3xl p-8 md:p-12 text-white overflow-hidden" style={{background: 'linear-gradient(135deg,' + storefront.primaryColor + ',' + storefront.accentColor + ')'}}>
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider opacity-90"><CheckCircle2 className="w-4 h-4" /> Published storefront</div>
              <h1 className="mt-4 text-4xl md:text-6xl font-black">{storefront.name}</h1>
              <p className="mt-4 text-lg opacity-90">{storefront.tagline}</p>
              <button className="mt-7 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white text-slate-900 font-bold" onClick={() => onNavigate('/store/' + storefront.slug + '/products')}>Explore products <ArrowRight className="w-4 h-4" /></button>
            </div>
          </section>
        )}

        {routeId === 'storefront.categories' && (
          <section><h1 className="text-3xl font-black">Categories</h1><p className="mt-2 text-slate-500">Browse products published by this storefront.</p></section>
        )}

        {routeId === 'storefront.product.detail' && visibleProducts.length === 1 ? (
          <section className="bg-white rounded-3xl p-6 md:p-10 grid md:grid-cols-2 gap-8">
            <img src={visibleProducts[0].imageUrl || visibleProducts[0].images?.[0] || ''} alt={visibleProducts[0].name} className="w-full aspect-square object-cover rounded-2xl bg-slate-100" />
            <div><div className="text-xs uppercase font-bold text-slate-400">{visibleProducts[0].brand || 'Product'}</div><h1 className="mt-2 text-4xl font-black">{visibleProducts[0].name}</h1><p className="mt-4 text-slate-600">{visibleProducts[0].description}</p><div className="mt-6 text-2xl font-black">{visibleProducts[0].currency || ''} {visibleProducts[0].price.toFixed(2)}</div><button className="mt-6 px-5 py-3 rounded-xl text-white font-bold" style={{backgroundColor: storefront.primaryColor}} onClick={() => onAddToCart({ productId: visibleProducts[0].id, name: visibleProducts[0].name, price: visibleProducts[0].price, currency: visibleProducts[0].currency, imageUrl: visibleProducts[0].imageUrl || visibleProducts[0].images?.[0], quantity: 1 })}><ShoppingBag className="inline w-4 h-4 mr-2" />Add to cart</button></div>
          </section>
        ) : (
          <section>
            <div className="flex items-end justify-between gap-4"><div><h2 className="text-3xl font-black">{routeId === 'storefront.products' ? 'Products' : 'Featured products'}</h2><p className="mt-1 text-sm text-slate-500">{products.length} published products</p></div></div>
            <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {visibleProducts.map(product => (
                <button key={product.id} className="text-left bg-white rounded-2xl overflow-hidden border border-slate-200 hover:shadow-lg transition-shadow" onClick={() => onNavigate('/store/' + storefront.slug + '/product/' + product.id)}>
                  <img src={product.imageUrl || product.images?.[0] || ''} alt={product.name} className="w-full aspect-square object-cover bg-slate-100" />
                  <div className="p-4"><div className="font-bold line-clamp-2">{product.name}</div><div className="mt-2 font-black">{product.currency || ''} {product.price.toFixed(2)}</div></div>
                </button>
              ))}
            </div>
          </section>
        )}

        <footer className="pt-8 border-t text-sm text-slate-500 flex items-center gap-2"><MapPin className="w-4 h-4" /> Powered by MikitHub discovery and tenant storefront services.</footer>
      </main>
    </div>
  );
}
