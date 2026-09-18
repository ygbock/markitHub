import React, { useEffect, useState } from 'react';
import { ArrowLeft, Clock, Mail, MapPin, MessageSquare, Navigation, Phone, ShieldCheck, Star, Store, Wrench } from 'lucide-react';
import { discoveryRepository } from '../../discovery/discoveryRepository';
import type { DiscoveryBusiness, DiscoveryProduct, DiscoveryService } from '../../discovery/types';

interface PublicBusinessProfilePageProps {
  businessSlug?: string;
  onNavigate: (path: string) => void;
  onOpenLogin: () => void;
}

const locationLabel = (location: DiscoveryBusiness['locations'][number]) =>
  [location.addressLine1, location.city, location.country].filter(Boolean).join(', ');

export default function PublicBusinessProfilePage({ businessSlug, onNavigate, onOpenLogin }: PublicBusinessProfilePageProps) {
  const [business, setBusiness] = useState<DiscoveryBusiness | null>(null);
  const [services, setServices] = useState<DiscoveryService[]>([]);
  const [products, setProducts] = useState<DiscoveryProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<'not-found' | 'load-error' | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const slug = (businessSlug || '').trim().toLowerCase();
        if (!slug) {
          setError('not-found');
          return;
        }
        const result = await discoveryRepository.getBusinessBySlug(slug);
        if (!result) {
          setError('not-found');
          return;
        }
        const [serviceResult, productResult] = await Promise.all([
          discoveryRepository.listServices({ limit: 100, filters: { businessId: result.id } }),
          discoveryRepository.listProducts({ limit: 100, filters: { businessId: result.id } }),
        ]);
        if (cancelled) return;
        setBusiness(result);
        setServices(serviceResult.items);
        setProducts(productResult.items);
      } catch {
        if (!cancelled) setError('load-error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [businessSlug]);

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">Loading business profile…</div>;

  if (error || !business) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold text-slate-900">{error === 'load-error' ? 'Profile unavailable' : 'Business not found'}</h1>
          <p className="mt-2 text-sm text-slate-500">{error === 'load-error' ? 'We could not load this public profile. Please try again.' : 'This business may be unpublished, inactive, or the address may be incorrect.'}</p>
          <button onClick={() => onNavigate('/businesses')} className="mt-6 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold">Back to businesses</button>
        </div>
      </div>
    );
  }

  const primaryLocation = business.locations[0];
  const phone = business.phone || primaryLocation?.phone;
  const directions = primaryLocation?.geo
    ? `https://www.google.com/maps/search/?api=1&query=${primaryLocation.geo.latitude},${primaryLocation.geo.longitude}`
    : null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200 px-4 sm:px-8 py-3 flex items-center justify-between">
        <button onClick={() => onNavigate('/businesses')} className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"><ArrowLeft className="w-4 h-4" /> Business Directory</button>
        <div className="flex items-center gap-2">
          <button onClick={onOpenLogin} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold">Sign in</button>
          {business.isTenant && business.tenantSlug && <button onClick={() => onNavigate(`/store/${business.tenantSlug}`)} className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold flex items-center gap-2"><Store className="w-4 h-4" /> Visit Store</button>}
        </div>
      </header>

      <section className="bg-slate-900 text-white">
        {business.bannerUrl && <img src={business.bannerUrl} alt="" className="w-full h-48 sm:h-64 object-cover opacity-50" />}
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8 -mt-16 relative">
          <div className="flex flex-col sm:flex-row gap-5 items-start">
            {business.logoUrl ? <img src={business.logoUrl} alt="" className="w-24 h-24 rounded-2xl object-cover border-4 border-slate-900 shadow-xl bg-white" /> : <div className="w-24 h-24 rounded-2xl bg-indigo-600 flex items-center justify-center text-3xl font-black border-4 border-slate-900">{business.name.charAt(0)}</div>}
            <div className="pt-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-3xl sm:text-4xl font-black">{business.name}</h1>
                {business.isVerified && <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" /> Verified</span>}
              </div>
              <p className="mt-2 text-slate-300 max-w-3xl">{business.headline}</p>
              <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-300">
                <span className="flex items-center gap-1"><Star className="w-4 h-4 text-amber-400 fill-current" /> {business.ratingAverage.toFixed(1)} ({business.reviewCount} reviews)</span>
                {primaryLocation?.city && <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {primaryLocation.city}</span>}
                {business.isTenant && <span className="flex items-center gap-1 text-indigo-300"><Store className="w-4 h-4" /> Store enabled</span>}
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-8 grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8">
        <div className="space-y-8">
          <section className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="text-lg font-bold">About {business.name}</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">{business.description || 'No public description has been provided.'}</p>
            {business.categories.length > 0 && <div className="mt-5 flex flex-wrap gap-2">{business.categories.map(category => <span key={category} className="px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold">{category}</span>)}</div>}
            {business.badges.length > 0 && <div className="mt-5 flex flex-wrap gap-2">{business.badges.map(badge => <span key={badge} className="px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">{badge}</span>)}</div>}
          </section>

          {business.photos.length > 0 && <section><h2 className="text-lg font-bold mb-4">Photos</h2><div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{business.photos.map((photo, index) => <img key={photo} src={photo} alt={`${business.name} photo ${index + 1}`} className="w-full aspect-[4/3] object-cover rounded-2xl border border-slate-200" />)}</div></section>}

          {services.length > 0 && <section><h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Wrench className="w-5 h-5 text-indigo-600" /> Services</h2><div className="grid gap-3">{services.map(service => <article key={service.id} className="bg-white rounded-2xl border border-slate-200 p-5 flex justify-between gap-4"><div><h3 className="font-semibold">{service.name}</h3><p className="text-sm text-slate-500 mt-1">{service.description}</p>{service.durationMinutes && <p className="text-xs text-slate-400 mt-2 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {service.durationMinutes} min</p>}</div><div className="text-right shrink-0"><div className="font-bold">{service.price == null ? 'Contact for price' : `${service.price} ${service.currency || ''}`}</div>{service.bookingEnabled && <button onClick={() => onNavigate(`/service/${service.id}`)} className="mt-2 text-xs font-semibold text-indigo-600">View service</button>}</div></article>)}</div></section>}

          {products.length > 0 && <section><h2 className="text-lg font-bold mb-4">Products</h2><div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{products.map(product => <button key={product.id} onClick={() => onNavigate(`/product/${product.id}`)} className="text-left bg-white rounded-2xl border border-slate-200 p-4 hover:border-indigo-300"><h3 className="font-semibold">{product.name}</h3><p className="text-sm text-slate-500 mt-1">{product.price} {product.currency || ''}</p></button>)}</div></section>}
        </div>

        <aside className="space-y-4">
          <section className="bg-white rounded-2xl border border-slate-200 p-5"><h2 className="font-bold">Contact</h2><div className="mt-4 space-y-3 text-sm">
            {phone && <a href={`tel:${phone}`} className="flex items-center gap-3 text-slate-700"><Phone className="w-4 h-4 text-indigo-600" /> {phone}</a>}
            {business.email && <a href={`mailto:${business.email}`} className="flex items-center gap-3 text-slate-700"><Mail className="w-4 h-4 text-indigo-600" /> {business.email}</a>}
            {phone && <a href={`https://wa.me/${phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 text-slate-700"><MessageSquare className="w-4 h-4 text-emerald-600" /> WhatsApp</a>}
          </div></section>
          <section className="bg-white rounded-2xl border border-slate-200 p-5"><h2 className="font-bold">Locations & hours</h2><div className="mt-4 space-y-5">
            {business.locations.map(location => <div key={location.id}><h3 className="text-sm font-semibold">{location.name || 'Location'}</h3><p className="text-sm text-slate-500 mt-1">{locationLabel(location)}</p><p className="text-xs text-slate-400 mt-2 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {typeof location.isOpenNow === 'boolean' ? (location.isOpenNow ? 'Open now' : 'Closed') : 'Hours unavailable'}</p>{directions && location.id === primaryLocation?.id && <a href={directions} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 mt-3 text-xs font-semibold text-indigo-600"><Navigation className="w-3.5 h-3.5" /> Directions</a>}</div>)}
          </div></section>
        </aside>
      </main>
    </div>
  );
}
