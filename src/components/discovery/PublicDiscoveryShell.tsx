import React, { useState, useMemo } from 'react';
import { 
  Search, MapPin, Phone, MessageSquare, ExternalLink, 
  ShieldCheck, Star, Clock, Navigation, Sparkles, 
  Filter, Grid, Map, Layers, Store, ArrowRight, ArrowLeft,
  Wrench, CheckCircle2, ChevronRight, ChevronDown, User, ShoppingBag
} from 'lucide-react';
import { DISCOVERY_BUSINESSES, DISCOVERY_CATEGORIES, CanonicalBusinessListing } from '../../data/discoveryData';
import { Product } from '../../types';

interface PublicDiscoveryShellProps {
  initialTab?: 'discover' | 'businesses' | 'products' | 'services' | 'nearby' | 'map' | 'categories';
  businessSlug?: string;
  products: Product[];
  onNavigate: (path: string) => void;
  onOpenLogin: () => void;
}

export default function PublicDiscoveryShell({
  initialTab = 'discover',
  businessSlug,
  products,
  onNavigate,
  onOpenLogin,
}: PublicDiscoveryShellProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [selectedListingForModal, setSelectedListingForModal] = useState<CanonicalBusinessListing | null>(null);

  const currentCategoryObj = useMemo(() => {
    return DISCOVERY_CATEGORIES.find(c => c.id === selectedCategory) || DISCOVERY_CATEGORIES[0];
  }, [selectedCategory]);

  // If a businessSlug is present in URL, resolve that specific business profile
  const activeBusinessProfile = useMemo(() => {
    if (!businessSlug) return null;
    return DISCOVERY_BUSINESSES.find(b => b.businessSlug === businessSlug) || null;
  }, [businessSlug]);

  // Filtered businesses
  const filteredBusinesses = useMemo(() => {
    return DISCOVERY_BUSINESSES.filter(biz => {
      const matchesCategory = selectedCategory === 'all' || 
        biz.category.toLowerCase().includes(selectedCategory.toLowerCase()) ||
        biz.subcategory?.toLowerCase().includes(selectedCategory.toLowerCase());
      
      const term = searchTerm.toLowerCase().trim();
      if (!term) return matchesCategory;

      const inName = biz.name.toLowerCase().includes(term);
      const inTagline = biz.tagline.toLowerCase().includes(term);
      const inAbout = biz.about.toLowerCase().includes(term);
      const inCategory = biz.category.toLowerCase().includes(term);
      const inSubcategory = biz.subcategory?.toLowerCase().includes(term) || false;
      const inServices = biz.servicesOffered.some(s => s.name.toLowerCase().includes(term) || s.description.toLowerCase().includes(term));

      return matchesCategory && (inName || inTagline || inAbout || inCategory || inSubcategory || inServices);
    });
  }, [searchTerm, selectedCategory]);

  // Flat list of services across all businesses
  const allServices = useMemo(() => {
    const list: Array<{
      business: CanonicalBusinessListing;
      service: CanonicalBusinessListing['servicesOffered'][0];
    }> = [];

    DISCOVERY_BUSINESSES.forEach(b => {
      b.servicesOffered.forEach(s => {
        list.push({ business: b, service: s });
      });
    });

    return list.filter(item => {
      const term = searchTerm.toLowerCase().trim();
      if (!term) return true;
      return (
        item.service.name.toLowerCase().includes(term) ||
        item.service.description.toLowerCase().includes(term) ||
        item.business.name.toLowerCase().includes(term)
      );
    });
  }, [searchTerm]);

  // If viewing an individual business profile (/business/:slug)
  if (activeBusinessProfile) {
    const b = activeBusinessProfile;
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900" id="business-profile-view">
        {/* Top Navbar */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-4">
            <button
              onClick={() => onNavigate('/businesses')}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors flex items-center gap-1 text-xs font-bold cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back to Directory</span>
            </button>
            <div className="h-5 w-px bg-slate-200" />
            <span className="text-xs font-mono uppercase text-slate-500">Public Business Profile</span>
          </div>

          <div className="flex items-center gap-2">
            {b.isTenant && b.tenantSlug && (
              <button
                onClick={() => onNavigate(`/store/${b.tenantSlug}`)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
              >
                <Store className="w-3.5 h-3.5" />
                <span>Visit Store</span>
              </button>
            )}
            <button
              onClick={onOpenLogin}
              className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all cursor-pointer"
            >
              Sign In
            </button>
          </div>
        </header>

        {/* Profile Hero Header */}
        <div className="bg-slate-900 text-white py-12 px-4 sm:px-8 relative overflow-hidden">
          <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
            <div className="flex items-start gap-4">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-indigo-800 text-white font-black text-2xl flex items-center justify-center shrink-0 shadow-xl border border-white/20">
                {b.name.charAt(0)}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{b.name}</h1>
                  {b.isVerified && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Verified
                    </span>
                  )}
                  {b.isTenant ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[11px] font-bold">
                      <Store className="w-3 h-3" />
                      MikitHub Tenant
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 text-[11px] font-bold">
                      Public Listing
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-300 mt-1 max-w-xl">{b.tagline}</p>
                <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1 text-amber-400 font-bold">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    {b.rating} ({b.reviewCount} reviews)
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-rose-400" />
                    {b.address}, {b.city} ({b.distanceKm} km)
                  </span>
                  <span className="flex items-center gap-1 text-emerald-400">
                    <Clock className="w-3.5 h-3.5" />
                    {b.isOpenNow ? 'Open Now' : 'Closed'}
                  </span>
                </div>
              </div>
            </div>

            {/* Profile Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
              <a
                href={`tel:${b.phone}`}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-all border border-white/10"
              >
                <Phone className="w-3.5 h-3.5 text-indigo-400" />
                <span>Call ({b.phone})</span>
              </a>

              {b.whatsapp && (
                <a
                  href={`https://wa.me/${b.whatsapp.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>
              )}

              {/* Tenant only actions */}
              {b.isTenant && b.tenantSlug && (
                <button
                  onClick={() => onNavigate(`/store/${b.tenantSlug}`)}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/40 transition-all cursor-pointer"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Shop Storefront</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Profile Content Body */}
        <div className="max-w-5xl mx-auto py-8 px-4 sm:px-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-8">
            {/* About */}
            <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <h2 className="text-base font-bold text-slate-900">About the Business</h2>
              <p className="text-sm text-slate-600 leading-relaxed">{b.about}</p>
              <div className="flex flex-wrap gap-2 pt-2">
                {b.badges.map(badge => (
                  <span key={badge} className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium">
                    {badge}
                  </span>
                ))}
              </div>
            </section>

            {/* Services Offered */}
            <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center justify-between">
                <span>Services & Offerings</span>
                <span className="text-xs font-normal text-slate-500">{b.servicesOffered.length} available</span>
              </h2>
              <div className="divide-y divide-slate-100">
                {b.servicesOffered.map(srv => (
                  <div key={srv.id} className="py-3.5 flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{srv.name}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{srv.description}</p>
                      {srv.durationMinutes && (
                        <div className="text-[11px] text-indigo-600 font-medium mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>Est. duration: {srv.durationMinutes} mins</span>
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-black text-slate-900">
                        {srv.price === 0 ? 'Free' : `$${srv.price.toFixed(2)}`}
                      </div>
                      <button
                        onClick={() => onNavigate(b.isTenant && b.tenantSlug ? `/store/${b.tenantSlug}` : `/business/${b.businessSlug}`)}
                        className="mt-1 px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors"
                      >
                        {b.isTenant ? 'Book / Order' : 'Inquire'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Photos */}
            {b.photos && b.photos.length > 0 && (
              <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <h2 className="text-base font-bold text-slate-900">Premises & Catalog Photos</h2>
                <div className="grid grid-cols-2 gap-3">
                  {b.photos.map((photo, i) => (
                    <div key={i} className="rounded-xl overflow-hidden h-44 bg-slate-100 border border-slate-200">
                      <img src={photo} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar Location & Contact details */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Business Location</h2>
              <div className="space-y-3 text-xs text-slate-600">
                <div className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-slate-900">{b.address}</div>
                    <div>{b.city}, Sierra Leone</div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">Approx. {b.distanceKm} km from current location</div>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Clock className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-slate-900">Opening Hours</div>
                    <div className="text-slate-500 leading-relaxed">{b.openingHours}</div>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <Phone className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-slate-900">Direct Contact</div>
                    <a href={`tel:${b.phone}`} className="text-indigo-600 hover:underline">{b.phone}</a>
                    <div className="text-[11px] text-slate-500">{b.email}</div>
                  </div>
                </div>
              </div>

              {/* Simulated Directions Button */}
              <a
                href={`https://maps.google.com/?q=${b.coordinates.lat},${b.coordinates.lng}`}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Navigation className="w-3.5 h-3.5 text-indigo-600" />
                <span>Get Driving Directions</span>
              </a>
            </div>

            {/* Storefront teaser if tenant */}
            {b.isTenant && b.tenantSlug && (
              <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-6 rounded-2xl shadow-md space-y-3">
                <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold">
                  <Store className="w-4 h-4" />
                  <span>Online Storefront Active</span>
                </div>
                <h3 className="text-base font-bold text-white">Shop Directly from {b.name}</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Browse real-time inventory, place orders with delivery or pickup, and earn loyalty rewards.
                </p>
                <button
                  onClick={() => onNavigate(`/store/${b.tenantSlug}`)}
                  className="w-full py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                >
                  Enter Online Store
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Universal Discovery Homepage / Directory View
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between" id="public-discovery-root">
      
      {/* Hero Section: "What are you looking for?" */}
      <section className="bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 text-white py-14 px-4 sm:px-8 relative overflow-hidden">
        {/* Background glow accents */}
        <div className="absolute -top-24 -left-24 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-3xl mx-auto text-center relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-indigo-200 text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Unified Business & Service Discovery</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            What are you looking for?
          </h1>

          <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto">
            Discover verified local businesses, skilled technicians, emergency services, and order from storefronts near you.
          </p>

          {/* Omni Search Box */}
          <div className="pt-3 max-w-2xl mx-auto">
            <div className="relative flex items-center bg-white rounded-2xl shadow-2xl p-1.5 border border-white/20">
              <div className="pl-3.5 pr-2 text-slate-400">
                <Search className="w-5 h-5" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search phone repair, plumber, laptops, fashion, tailoring..."
                className="w-full py-2.5 text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none"
                id="input-public-discovery-search"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="px-2 text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  Clear
                </button>
              )}
              <button
                onClick={() => onNavigate('/search')}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-bold shadow-md transition-all cursor-pointer shrink-0"
              >
                Search
              </button>
            </div>

            {/* Quick Keyword Pills */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-3 text-xs text-slate-300">
              <span className="text-slate-400 text-[11px]">Popular:</span>
              {['phone repair', 'laptop', 'plumber', 'tailor', 'school uniforms', 'printing services'].map(k => (
                <button
                  key={k}
                  onClick={() => setSearchTerm(k)}
                  className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 text-[11px] font-medium transition-colors cursor-pointer"
                >
                  {k}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Main Discovery Body */}
      <main className="max-w-6xl mx-auto w-full py-8 px-4 sm:px-8 flex-1 space-y-8">
        
        {/* View Switcher Tabs & Categories Dropdown Menu */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Businesses Tab */}
            <button
              onClick={() => setActiveTab('businesses')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'businesses' || activeTab === 'discover'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 bg-white border border-slate-200'
              }`}
            >
              Businesses ({filteredBusinesses.length})
            </button>

            {/* Services & Skills Tab */}
            <button
              onClick={() => setActiveTab('services')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'services'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 bg-white border border-slate-200'
              }`}
            >
              Services & Skills ({allServices.length})
            </button>

            {/* Categories Dropdown Menu */}
            <div className="relative inline-block text-left" id="categories-dropdown-container">
              <button
                type="button"
                onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                  selectedCategory !== 'all'
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
                id="btn-categories-dropdown"
              >
                <Filter className="w-3.5 h-3.5 text-indigo-600" />
                <span>Category: <strong className="font-extrabold">{currentCategoryObj.name}</strong></span>
                {selectedCategory !== 'all' && (
                  <span className="bg-indigo-600 text-white text-[10px] px-1.5 py-0.2 rounded-full font-extrabold">
                    {currentCategoryObj.count}
                  </span>
                )}
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${categoryDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {categoryDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setCategoryDropdownOpen(false)}
                  />

                  <div
                    className="absolute left-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150"
                    id="menu-categories-dropdown"
                  >
                    <div className="px-3.5 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 flex items-center justify-between">
                      <span>Filter by Category</span>
                      {selectedCategory !== 'all' && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCategory('all');
                            setCategoryDropdownOpen(false);
                          }}
                          className="text-indigo-600 hover:underline cursor-pointer lowercase text-[10px] font-semibold"
                        >
                          Clear filter
                        </button>
                      )}
                    </div>

                    <div className="max-h-64 overflow-y-auto py-1">
                      {DISCOVERY_CATEGORIES.map((cat) => {
                        const isSelected = selectedCategory === cat.id;
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => {
                              setSelectedCategory(cat.id);
                              setCategoryDropdownOpen(false);
                            }}
                            className={`w-full px-3.5 py-2 text-left text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-50 text-indigo-700 font-bold'
                                : 'text-slate-700 hover:bg-slate-50'
                            }`}
                            id={`cat-option-${cat.id}`}
                          >
                            <span className="flex items-center gap-2">
                              {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                              <span>{cat.name}</span>
                            </span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                                isSelected
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {cat.count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                viewMode === 'list' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="List View"
            >
              <Grid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`p-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                viewMode === 'map' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Map View"
            >
              <Map className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* MAP VIEW RENDERING */}
        {viewMode === 'map' ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Local Map Discovery (Freetown Central)</h3>
                <p className="text-xs text-slate-500">Interactive map plotting registered local businesses and proximity radius.</p>
              </div>
              <span className="text-xs font-mono text-indigo-600 font-bold bg-indigo-50 px-3 py-1 rounded-full">
                {filteredBusinesses.length} Pins Placed
              </span>
            </div>

            {/* Visual simulated SVG Map */}
            <div className="relative h-96 w-full rounded-2xl bg-slate-100 border border-slate-300 overflow-hidden flex items-center justify-center">
              {/* Grid Lines */}
              <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px] opacity-70" />

              {/* Central Map Label */}
              <div className="text-slate-400 text-xs font-mono select-none pointer-events-none">
                MikitHub Geo Proximity Engine • Sierra Leone / Freetown
              </div>

              {/* Pins */}
              {filteredBusinesses.map((biz, idx) => {
                // Generate a distributed coordinate based on index
                const topPercent = 25 + (idx * 16) % 60;
                const leftPercent = 20 + (idx * 23) % 70;

                return (
                  <div
                    key={biz.id}
                    style={{ top: `${topPercent}%`, left: `${leftPercent}%` }}
                    onClick={() => onNavigate(`/business/${biz.businessSlug}`)}
                    className="absolute -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 text-white text-xs font-bold shadow-xl border border-white/20 group-hover:scale-110 group-hover:bg-indigo-600 transition-all">
                      <MapPin className="w-3 h-3 text-rose-400 shrink-0" />
                      <span className="truncate max-w-[120px]">{biz.name}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* LIST VIEW RENDERING */
          activeTab === 'services' ? (
            /* Services Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {allServices.map(({ business, service }) => (
                <div
                  key={`${business.id}-${service.id}`}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-mono text-indigo-600 font-bold uppercase tracking-wider">
                          {business.category}
                        </span>
                        <h3 className="text-base font-bold text-slate-900">{service.name}</h3>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-base font-black text-slate-900">
                          {service.price === 0 ? 'Free' : `$${service.price.toFixed(2)}`}
                        </div>
                        {service.durationMinutes && (
                          <div className="text-[10px] text-slate-400">~{service.durationMinutes} mins</div>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{service.description}</p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div
                      onClick={() => onNavigate(`/business/${business.businessSlug}`)}
                      className="flex items-center gap-2 cursor-pointer group"
                    >
                      <div className="w-6 h-6 rounded-lg bg-indigo-600/10 text-indigo-700 font-bold text-xs flex items-center justify-center">
                        {business.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                          {business.name}
                        </div>
                        <div className="text-[10px] text-slate-400">{business.address} ({business.distanceKm} km)</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={`tel:${business.phone}`}
                        className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                        title="Call Business"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                      <button
                        onClick={() => onNavigate(`/business/${business.businessSlug}`)}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer transition-colors"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Businesses Cards Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredBusinesses.map((biz) => (
                <div
                  key={biz.id}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                  id={`discovery-card-${biz.id}`}
                >
                  {/* Photo or Header Banner */}
                  <div className="h-36 bg-slate-100 relative overflow-hidden">
                    {biz.photos && biz.photos[0] ? (
                      <img src={biz.photos[0]} alt={biz.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-slate-800 to-indigo-950 flex items-center justify-center text-white/40 text-sm font-bold">
                        {biz.category}
                      </div>
                    )}

                    {/* Status Pill on Photo */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      {biz.isVerified && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-bold shadow-xs flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" />
                          Verified
                        </span>
                      )}
                      {biz.isTenant && (
                        <span className="px-2 py-0.5 rounded-md bg-indigo-600 text-white text-[10px] font-bold shadow-xs flex items-center gap-1">
                          <Store className="w-3 h-3" />
                          Storefront
                        </span>
                      )}
                    </div>

                    <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded-md bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-bold flex items-center gap-1">
                      <Star className="w-3 h-3 text-amber-400 fill-current" />
                      <span>{biz.rating} ({biz.reviewCount})</span>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="text-[10px] font-mono text-indigo-600 uppercase font-bold tracking-wider">
                        {biz.category}
                      </div>
                      <h3
                        onClick={() => onNavigate(`/business/${biz.businessSlug}`)}
                        className="text-base font-bold text-slate-900 hover:text-indigo-600 transition-colors cursor-pointer mt-0.5 line-clamp-1"
                      >
                        {biz.name}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                        {biz.tagline}
                      </p>
                    </div>

                    {/* Services Pill count */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-rose-500" />
                        {biz.city} ({biz.distanceKm} km)
                      </span>
                      <span className="text-indigo-600 font-medium">
                        {biz.servicesOffered.length} services listed
                      </span>
                    </div>
                  </div>

                  {/* Action Footer */}
                  <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center gap-2">
                    <button
                      onClick={() => onNavigate(`/business/${biz.businessSlug}`)}
                      className="flex-1 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 text-xs font-bold transition-all cursor-pointer"
                    >
                      View Profile
                    </button>

                    {/* If tenant: "Shop Storefront". If listing only: "Call" */}
                    {biz.isTenant && biz.tenantSlug ? (
                      <button
                        onClick={() => onNavigate(`/store/${biz.tenantSlug}`)}
                        className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xs shadow-indigo-600/30 transition-all cursor-pointer flex items-center justify-center gap-1"
                      >
                        <Store className="w-3.5 h-3.5" />
                        <span>Visit Store</span>
                      </button>
                    ) : (
                      <a
                        href={`tel:${biz.phone}`}
                        className="flex-1 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all text-center flex items-center justify-center gap-1"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Call</span>
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 px-4 sm:px-8 text-center text-xs text-slate-500 space-y-2">
        <p className="font-bold text-slate-700">MikitHub Universal Discovery Engine</p>
        <p>Empowering local commerce, trade, and business discovery across West Africa.</p>
      </footer>
    </div>
  );
}
