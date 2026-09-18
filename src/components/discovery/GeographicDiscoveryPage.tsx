import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, LocateFixed, Loader2, MapPin, Navigation, Search, ShieldCheck, Star } from 'lucide-react';
import { discoveryRepository } from '../../discovery/discoveryRepository';
import type { DiscoveryBusiness } from '../../discovery/types';

interface GeographicDiscoveryPageProps {
  mode: 'nearby' | 'map';
  onNavigate: (path: string) => void;
}

interface Coordinates {
  latitude: number;
  longitude: number;
}

const DEFAULT_RADIUS = 25;

export default function GeographicDiscoveryPage({ mode, onNavigate }: GeographicDiscoveryPageProps) {
  const [origin, setOrigin] = useState<Coordinates | null>(null);
  const [radiusKm, setRadiusKm] = useState(DEFAULT_RADIUS);
  const [businesses, setBusinesses] = useState<DiscoveryBusiness[]>([]);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Location services are not available in this browser.');
      return;
    }
    setLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      position => {
        setOrigin({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        setLocating(false);
      },
      positionError => {
        setLocating(false);
        setLocationError(
          positionError.code === positionError.PERMISSION_DENIED
            ? 'Location permission was denied. Enable it in your browser to use nearby discovery.'
            : 'We could not determine your location. You can try again.'
        );
      },
      { enableHighAccuracy: false, maximumAge: 300000, timeout: 10000 }
    );
  };

  useEffect(() => {
    if (!origin) {
      setBusinesses([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void discoveryRepository.listBusinesses({
      limit: 100,
      sort: 'distance',
      filters: { latitude: origin.latitude, longitude: origin.longitude, radiusKm, text: query || undefined },
    }).then(response => {
      if (!cancelled) setBusinesses(response.items);
    }).catch(err => {
      if (!cancelled) setError(err instanceof Error ? err.message : 'Nearby discovery is temporarily unavailable.');
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [origin, radiusKm, query]);

  const located = useMemo(() => businesses.filter(business => business.locations.some(location => location.geo)), [businesses]);

  return (
    <div className='min-h-screen bg-slate-50 text-slate-900' id='geographic-discovery-root'>
      <header className='bg-slate-950 text-white px-4 sm:px-6 lg:px-10 py-5'>
        <div className='max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4'>
          <button onClick={() => onNavigate('/')} className='flex items-center gap-2 text-sm font-bold text-indigo-300 hover:text-white'><ArrowLeft className='w-4 h-4' /> MikitHub</button>
          <div className='text-right'><h1 className='text-xl sm:text-2xl font-black'>{mode === 'nearby' ? 'Nearby Businesses' : 'Map Discovery'}</h1><p className='text-xs text-slate-300'>Discover published businesses by real location.</p></div>
        </div>
      </header>

      <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-7'>
        <section className='bg-white rounded-3xl border border-slate-200 p-4 sm:p-5 mb-6'>
          <div className='flex flex-col lg:flex-row lg:items-end gap-4'>
            <label className='flex-1 space-y-1.5'>
              <span className='text-[11px] font-black uppercase tracking-wide text-slate-500'>Search nearby</span>
              <div className='relative'><Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400' /><input value={query} onChange={e => setQuery(e.target.value)} placeholder='Business name, category, or service' className='w-full pl-10 pr-3 py-3 rounded-xl border border-slate-200 text-sm' /></div>
            </label>
            <label className='space-y-1.5'>
              <span className='text-[11px] font-black uppercase tracking-wide text-slate-500'>Radius</span>
              <select value={radiusKm} onChange={e => setRadiusKm(Number(e.target.value))} className='rounded-xl border border-slate-200 px-3 py-3 text-sm font-bold'>
                {[5, 10, 25, 50, 100].map(value => <option key={value} value={value}>{value} km</option>)}
              </select>
            </label>
            <button onClick={requestLocation} disabled={locating} className='flex items-center justify-center gap-2 rounded-xl bg-indigo-600 text-white px-4 py-3 text-sm font-bold disabled:opacity-60'>
              {locating ? <Loader2 className='w-4 h-4 animate-spin' /> : <LocateFixed className='w-4 h-4' />} Use my location
            </button>
          </div>
          {locationError && <div className='mt-4 rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800'>{locationError}</div>}
          {!origin && !locationError && <div className='mt-4 text-sm text-slate-500'>Use your location to find nearby businesses.</div>}
          {origin && <div className='mt-4 flex items-center gap-2 text-xs text-emerald-700 font-bold'><LocateFixed className='w-4 h-4' /> Location ready · {origin.latitude.toFixed(4)}, {origin.longitude.toFixed(4)}</div>}
        </section>

        {error && <div className='mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800'>{error}</div>}
        {loading && <div className='py-16 flex justify-center items-center gap-2 text-slate-500'><Loader2 className='w-5 h-5 animate-spin' /> Finding businesses…</div>}
        {!loading && origin && businesses.length === 0 && <div className='py-16 text-center bg-white rounded-3xl border border-slate-200'><MapPin className='w-9 h-9 mx-auto text-slate-300 mb-3' /><h2 className='font-bold text-lg'>No businesses found in this radius</h2><p className='text-sm text-slate-500 mt-1'>Try a larger radius or a different search.</p></div>}

        {!loading && businesses.length > 0 && mode === 'nearby' && (
          <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5'>
            {businesses.map(business => {
              const distances = business.locations.filter(l => l.geo && origin).map(l => {
                const lat1 = origin!.latitude * Math.PI / 180, lat2 = l.geo!.latitude * Math.PI / 180;
                const dLat = lat2 - lat1, dLon = (l.geo!.longitude - origin!.longitude) * Math.PI / 180;
                const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
                return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
              });
              const distance = distances.length ? Math.min(...distances) : null;
              return (
                <button key={business.id} onClick={() => onNavigate('/business/' + business.slug)} className='text-left bg-white rounded-3xl border border-slate-200 p-5 hover:border-indigo-300 hover:shadow-lg transition-all'>
                  <div className='flex justify-between gap-3'><div><h2 className='font-black'>{business.name}</h2><p className='text-xs text-slate-500 mt-1'>{business.locations[0]?.city || 'Local business'}</p></div>{business.isVerified && <ShieldCheck className='w-5 h-5 text-emerald-600' />}</div>
                  <p className='text-sm text-slate-500 mt-3 line-clamp-2'>{business.headline || business.description}</p>
                  <div className='flex items-center gap-3 mt-4 text-xs text-slate-500'><span className='flex items-center gap-1'><Star className='w-3.5 h-3.5 text-amber-500' /> {business.ratingAverage.toFixed(1)}</span>{distance != null && <span className='flex items-center gap-1'><Navigation className='w-3.5 h-3.5' /> {distance.toFixed(1)} km</span>}</div>
                </button>
              );
            })}
          </div>
        )}

        {!loading && businesses.length > 0 && mode === 'map' && (
          <div className='grid grid-cols-1 lg:grid-cols-[1.4fr_.8fr] gap-6'>
            <section className='min-h-[520px] rounded-3xl border border-slate-200 bg-white overflow-hidden relative'>
              <div className='absolute inset-0 bg-[linear-gradient(0deg,rgba(148,163,184,.14)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,.14)_1px,transparent_1px)] bg-[size:44px_44px]' />
              <div className='absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-950 ring-8 ring-slate-950/10' title='Your location' />
              {located.map((business, index) => {
                const point = business.locations.find(l => l.geo);
                if (!point?.geo || !origin) return null;
                const x = Math.max(5, Math.min(95, 50 + (point.geo.longitude - origin.longitude) * 700));
                const y = Math.max(5, Math.min(95, 50 - (point.geo.latitude - origin.latitude) * 700));
                return <button key={business.id} title={business.name} onClick={() => onNavigate('/business/' + business.slug)} style={{ left: x + '%', top: y + '%' }} className='absolute -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-indigo-600 text-white text-xs font-black shadow-lg border-2 border-white'>{index + 1}</button>;
              })}
              <div className='absolute left-4 bottom-4 rounded-xl bg-white/95 border border-slate-200 px-3 py-2 text-xs text-slate-600 shadow'>Map preview · {located.length} located businesses</div>
            </section>
            <section className='space-y-3'>
              {businesses.map((business, index) => <button key={business.id} onClick={() => onNavigate('/business/' + business.slug)} className='w-full text-left bg-white rounded-2xl border border-slate-200 p-4 hover:border-indigo-300'><div className='flex items-center gap-3'><span className='w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-black'>{index + 1}</span><div><h2 className='font-bold text-sm'>{business.name}</h2><p className='text-xs text-slate-500'>{business.locations.find(l => l.geo)?.city || 'Location available'}</p></div></div></button>)}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
