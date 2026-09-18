import React, { useState, useMemo } from 'react';
import { 
  Search, MapPin, Phone, MessageSquare, ExternalLink, 
  ShieldCheck, Star, Clock, Navigation, Sparkles, 
  Filter, Grid, Map, Layers, Store, ArrowRight, ArrowLeft,
  Wrench, CheckCircle2, ChevronRight, ChevronDown, User, ShoppingBag,
  SlidersHorizontal, X, Tag, Compass, Award, Check
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
  const [categoryFilterSearch, setCategoryFilterSearch] = useState('');
  const [sortBy, setSortBy] = useState<'rating' | 'distance' | 'name'>('rating');
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);

  const currentCategoryObj = useMemo(() => {
    return DISCOVERY_CATEGORIES.find(c => c.id === selectedCategory) || DISCOVERY_CATEGORIES[0];
  }, [selectedCategory]);

  // If a businessSlug is present in URL, resolve that specific business profile
  const activeBusinessProfile = useMemo(() => {
    if (!businessSlug) return null;
    return DISCOVERY_BUSINESSES.find(b => b.businessSlug === businessSlug) || null;
  }, [businessSlug]);

  // Filtered & sorted businesses
  const filteredBusinesses = useMemo(() => {
    let list = DISCOVERY_BUSINESSES.filter(biz => {
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

    return list.sort((a, b) => {
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'distance') return a.distanceKm - b.distanceKm;
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return 0;
    });
  }, [searchTerm, selectedCategory, sortBy]);

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
      const matchesCategory = selectedCategory === 'all' || 
        item.business.category.toLowerCase().includes(selectedCategory.toLowerCase());
      
      const term = searchTerm.toLowerCase().trim();
      if (!term) return matchesCategory;
      return matchesCategory && (
        item.service.name.toLowerCase().includes(term) ||
        item.service.description.toLowerCase().includes(term) ||
        item.business.name.toLowerCase().includes(term)
      );
    });
  }, [searchTerm, selectedCategory]);

  // Filter categories for inside the dropdown search
  const filteredCategoryOptions = useMemo(() => {
    if (!categoryFilterSearch.trim()) return DISCOVERY_CATEGORIES;
    const q = categoryFilterSearch.toLowerCase();
    return DISCOVERY_CATEGORIES.filter(c => c.name.toLowerCase().includes(q));
  }, [categoryFilterSearch]);

  // If viewing an individual business profile (/business/:slug)
  if (activeBusinessProfile) {
    const b = activeBusinessProfile;
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 w-full" id="business-profile-view">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 lg:px-8 xl:px-12 py-3.5 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-4">
            <button
              onClick={() => onNavigate('/businesses')}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-indigo-600" />
              <span>Back to Directory</span>
            </button>
            <div className="h-5 w-px bg-slate-200" />
            <span className="text-xs font-mono uppercase tracking-wider text-slate-500 hidden sm:inline">
              Public Business Profile
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {b.isTenant && b.tenantSlug && (
              <button
                onClick={() => onNavigate(`/store/${b.tenantSlug}`)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
              >
                <Store className="w-4 h-4" />
                <span>Visit Store</span>
              </button>
            )}
            <button
              onClick={onOpenLogin}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all cursor-pointer"
            >
              Sign In
            </button>
          </div>
        </header>

        {/* Profile Hero Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white py-12 px-4 sm:px-6 lg:px-8 xl:px-12 relative overflow-hidden">
          <div className="w-full max-w-[1920px] mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
            <div className="flex items-start gap-4 sm:gap-6">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-indigo-800 text-white font-black text-3xl flex items-center justify-center shrink-0 shadow-2xl border border-white/20">
                {b.name.charAt(0)}
              </div>
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl sm:text-4xl font-black tracking-tight">{b.name}</h1>
                  {b.isVerified && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Verified
                    </span>
                  )}
                  {b.isTenant ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold">
                      <Store className="w-3.5 h-3.5" />
                      MikitHub Tenant
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-bold">
                      Public Listing
                    </span>
                  )}
                </div>
                <p className="text-sm sm:text-base text-slate-300 max-w-2xl">{b.tagline}</p>
                <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-slate-300">
                  <span className="flex items-center gap-1 text-amber-400 font-bold">
                    <Star className="w-4 h-4 fill-current" />
                    {b.rating} ({b.reviewCount} reviews)
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4 text-rose-400" />
                    {b.address}, {b.city} ({b.distanceKm} km away)
                  </span>
                  <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                    <Clock className="w-4 h-4" />
                    {b.isOpenNow ? 'Open Now' : 'Closed'}
                  </span>
                </div>
              </div>
            </div>

            {/* Profile Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto shrink-0">
              <a
                href={`tel:${b.phone}`}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all border border-white/15 shadow-sm"
              >
                <Phone className="w-4 h-4 text-indigo-400" />
                <span>Call ({b.phone})</span>
              </a>

              {b.whatsapp && (
                <a
                  href={`https://wa.me/${b.whatsapp.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/30"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>WhatsApp</span>
                </a>
              )}

              {b.isTenant && b.tenantSlug && (
                <button
                  onClick={() => onNavigate(`/store/${b.tenantSlug}`)}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xl shadow-indigo-600/40 transition-all cursor-pointer"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Shop Storefront</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Profile Content Body - Full Width Spanning Layout */}
        <div className="w-full max-w-[1920px] mx-auto py-8 px-4 sm:px-6 lg:px-8 xl:px-12 grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {/* Main Info Columns */}
          <div className="lg:col-span-2 xl:col-span-3 space-y-8">
            {/* About */}
            <section className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <span>About {b.name}</span>
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">{b.about}</p>
              <div className="flex flex-wrap gap-2 pt-2">
                {b.badges.map(badge => (
                  <span key={badge} className="px-3 py-1 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-100 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                    {badge}
                  </span>
                ))}
              </div>
            </section>

            {/* Services Offered */}
            <section className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-indigo-600" />
                  <span>Services & Offerings</span>
                </h2>
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-700">
                  {b.servicesOffered.length} services available
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {b.servicesOffered.map(srv => (
                  <div key={srv.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between space-y-3 hover:border-indigo-300 transition-colors">
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-sm font-bold text-slate-900">{srv.name}</h3>
                        <div className="text-sm font-black text-indigo-600 shrink-0">
                          {srv.price === 0 ? 'Free' : `$${srv.price.toFixed(2)}`}
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{srv.description}</p>
                      {srv.durationMinutes && (
                        <div className="text-[11px] text-indigo-600 font-semibold mt-2 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Est. duration: {srv.durationMinutes} mins</span>
                        </div>
                      )}
                    </div>
                    
                    <button
                      onClick={() => onNavigate(b.isTenant && b.tenantSlug ? `/store/${b.tenantSlug}` : `/business/${b.businessSlug}`)}
                      className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors text-center"
                    >
                      {b.isTenant ? 'Book / Order Online' : 'Inquire Directly'}
                    </button>
                  </div>
                ))}
              </div>
            </section>

            {/* Photos Gallery */}
            {b.photos && b.photos.length > 0 && (
              <section className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                <h2 className="text-lg font-bold text-slate-900">Premises & Catalog Photos</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {b.photos.map((photo, i) => (
                    <div key={i} className="rounded-2xl overflow-hidden h-48 bg-slate-100 border border-slate-200 shadow-xs hover:opacity-95 transition-opacity">
                      <img src={photo} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar Info Card */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-5">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-3">
                Location & Information
              </h2>
              
              <div className="space-y-4 text-xs text-slate-600">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-rose-50 text-rose-500 shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">{b.address}</div>
                    <div className="text-slate-500">{b.city}, Sierra Leone</div>
                    <div className="text-[11px] text-indigo-600 font-mono mt-0.5">Approx. {b.distanceKm} km away</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-emerald-50 text-emerald-500 shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">Opening Hours</div>
                    <div className="text-slate-500 leading-relaxed">{b.openingHours}</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-indigo-50 text-indigo-500 shrink-0">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">Direct Contact</div>
                    <a href={`tel:${b.phone}`} className="text-indigo-600 font-bold hover:underline block">{b.phone}</a>
                    <div className="text-[11px] text-slate-400">{b.email}</div>
                  </div>
                </div>
              </div>

              <a
                href={`https://maps.google.com/?q=${b.coordinates.lat},${b.coordinates.lng}`}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 text-xs font-bold flex items-center justify-center gap-2 transition-colors border border-slate-200"
              >
                <Navigation className="w-4 h-4 text-indigo-600" />
                <span>Get Directions (Google Maps)</span>
              </a>
            </div>

            {/* Storefront teaser if tenant */}
            {b.isTenant && b.tenantSlug && (
              <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 text-white p-6 rounded-3xl shadow-xl space-y-4 border border-indigo-500/20">
                <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold">
                  <Store className="w-4 h-4" />
                  <span>Online Storefront Active</span>
                </div>
                <h3 className="text-lg font-bold text-white">Shop Directly from {b.name}</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Browse real-time inventory, place orders with delivery or pickup, and earn loyalty rewards.
                </p>
                <button
                  onClick={() => onNavigate(`/store/${b.tenantSlug}`)}
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/40 transition-all cursor-pointer"
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
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between w-full" id="public-discovery-root">
      
      {/* Hero Header Section: "What are you looking for?" */}
      <section className="bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 text-white py-12 sm:py-16 px-4 sm:px-6 lg:px-8 xl:px-12 relative overflow-hidden">
        {/* Background glow accents */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-[1920px] mx-auto text-center relative z-10 space-y-5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-indigo-200 text-xs font-semibold backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>MikitHub Universal Discovery Engine</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight">
            What are you looking for?
          </h1>

          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Discover verified local businesses, skilled technicians, emergency services, and order from storefronts near you.
          </p>

          {/* Omni Search Box Header Module */}
          <div className="pt-2 max-w-3xl mx-auto">
            <div className="relative flex flex-col sm:flex-row items-center bg-white rounded-2xl shadow-2xl p-2 sm:p-2 border border-white/20 gap-2">
              <div className="flex items-center w-full px-3 py-1 sm:py-0">
                <Search className="w-5 h-5 text-indigo-600 shrink-0 mr-3" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search phone repair, plumber, laptops, fashion, tailoring..."
                  className="w-full py-2.5 text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none bg-transparent"
                  id="input-public-discovery-search"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer shrink-0"
                    title="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
                <button
                  onClick={() => onNavigate('/search')}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition-all cursor-pointer text-center"
                >
                  Search
                </button>
              </div>
            </div>

            {/* Quick Popular Keywords & Active Filter Status */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-4 text-xs">
              <span className="text-slate-400 text-[11px] font-medium">Popular Searches:</span>
              {['phone repair', 'laptop', 'plumber', 'tailor', 'school uniforms', 'printing services'].map(k => (
                <button
                  key={k}
                  onClick={() => setSearchTerm(k)}
                  className={`px-3 py-1 rounded-xl text-[11px] font-semibold transition-all cursor-pointer ${
                    searchTerm.toLowerCase() === k.toLowerCase()
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white/10 hover:bg-white/20 text-slate-200 border border-white/10'
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>

            {(searchTerm || selectedCategory !== 'all') && (
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-200 border border-indigo-500/30 text-xs">
                <span>Filters Active:</span>
                {searchTerm && <strong className="font-bold">"{searchTerm}"</strong>}
                {selectedCategory !== 'all' && <strong className="font-bold">[{currentCategoryObj.name}]</strong>}
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedCategory('all');
                  }}
                  className="ml-1 underline font-bold hover:text-white cursor-pointer"
                >
                  Clear All
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Main Content Area - FULL WIDTH Layout */}
      <main className="w-full max-w-[1920px] mx-auto py-8 px-4 sm:px-6 lg:px-8 xl:px-12 flex-1 space-y-8">
        
        {/* View Switcher Tabs & Category Filter Header Module */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
          {/* Left Controls: Tabs & Dropdown Menu */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Businesses Tab */}
            <button
              onClick={() => setActiveTab('businesses')}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'businesses' || activeTab === 'discover'
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-100 bg-slate-50 border border-slate-200'
              }`}
            >
              <Store className="w-4 h-4 text-indigo-400" />
              <span>Businesses</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                activeTab === 'businesses' || activeTab === 'discover' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {filteredBusinesses.length}
              </span>
            </button>

            {/* Services & Skills Tab */}
            <button
              onClick={() => setActiveTab('services')}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'services'
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-100 bg-slate-50 border border-slate-200'
              }`}
            >
              <Wrench className="w-4 h-4 text-indigo-400" />
              <span>Services & Skills</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                activeTab === 'services' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {allServices.length}
              </span>
            </button>

            {/* Categories Dropdown Menu */}
            <div className="relative inline-block text-left" id="categories-dropdown-container">
              <button
                type="button"
                onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
                className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border ${
                  selectedCategory !== 'all'
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
                id="btn-categories-dropdown"
              >
                <Filter className="w-4 h-4 text-indigo-600" />
                <span>Category: <strong className="font-extrabold">{currentCategoryObj.name}</strong></span>
                {selectedCategory !== 'all' && (
                  <span className="bg-indigo-600 text-white text-[10px] px-2 py-0.5 rounded-full font-extrabold">
                    {currentCategoryObj.count}
                  </span>
                )}
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${categoryDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {categoryDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => {
                      setCategoryDropdownOpen(false);
                      setCategoryFilterSearch('');
                    }}
                  />

                  <div
                    className="absolute left-0 mt-2 w-72 bg-white rounded-3xl shadow-2xl border border-slate-200 p-3 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-2"
                    id="menu-categories-dropdown"
                  >
                    <div className="px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                      <span>Filter Categories</span>
                      {selectedCategory !== 'all' && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCategory('all');
                            setCategoryDropdownOpen(false);
                          }}
                          className="text-indigo-600 hover:underline cursor-pointer text-[11px] font-semibold"
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    {/* Filter search input inside dropdown */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={categoryFilterSearch}
                        onChange={(e) => setCategoryFilterSearch(e.target.value)}
                        placeholder="Search category..."
                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
                      {filteredCategoryOptions.map((cat) => {
                        const isSelected = selectedCategory === cat.id;
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => {
                              setSelectedCategory(cat.id);
                              setCategoryDropdownOpen(false);
                              setCategoryFilterSearch('');
                            }}
                            className={`w-full px-3 py-2 rounded-xl text-left text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-50 text-indigo-700 font-bold'
                                : 'text-slate-700 hover:bg-slate-50'
                            }`}
                            id={`cat-option-${cat.id}`}
                          >
                            <span className="flex items-center gap-2">
                              {isSelected ? (
                                <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                              ) : (
                                <Tag className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              )}
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

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
              <span>Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-slate-900 font-bold focus:outline-none cursor-pointer"
              >
                <option value="rating">Highest Rated</option>
                <option value="distance">Nearest First</option>
                <option value="name">Alphabetical</option>
              </select>
            </div>
          </div>

          {/* Right Controls: View Switcher */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 font-medium hidden md:inline">
              Showing {activeTab === 'services' ? allServices.length : filteredBusinesses.length} items
            </span>

            <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                  viewMode === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Grid View"
              >
                <Grid className="w-4 h-4" />
                <span className="hidden sm:inline">Grid</span>
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                  viewMode === 'map' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Map View"
              >
                <Map className="w-4 h-4" />
                <span className="hidden sm:inline">Map</span>
              </button>
            </div>
          </div>
        </div>

        {/* MAP VIEW MODULE */}
        {viewMode === 'map' ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-rose-500" />
                  <span>Interactive Map Discovery (Freetown Central)</span>
                </h3>
                <p className="text-xs text-slate-500">Proximity-based map displaying registered businesses and services.</p>
              </div>
              <span className="text-xs font-mono text-indigo-700 font-bold bg-indigo-50 border border-indigo-200 px-4 py-1.5 rounded-full">
                {filteredBusinesses.length} Pins Placed
              </span>
            </div>

            {/* Visual Interactive SVG Map Canvas */}
            <div className="relative h-[500px] w-full rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden flex flex-col md:flex-row">
              {/* Left Pin Detail Panel on Hover/Select */}
              <div className="w-full md:w-80 bg-slate-950/90 backdrop-blur-md p-5 border-r border-white/10 z-10 flex flex-col justify-between overflow-y-auto">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 font-bold mb-2">
                    Pin Inspector
                  </div>
                  {selectedPinId ? (
                    (() => {
                      const pinBiz = filteredBusinesses.find(b => b.id === selectedPinId) || filteredBusinesses[0];
                      return (
                        <div className="space-y-3">
                          <h4 className="text-base font-bold text-white">{pinBiz.name}</h4>
                          <p className="text-xs text-slate-300 leading-relaxed">{pinBiz.tagline}</p>
                          <div className="text-xs text-slate-400 space-y-1">
                            <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                              <Star className="w-3.5 h-3.5 fill-current" />
                              <span>{pinBiz.rating} ({pinBiz.reviewCount} reviews)</span>
                            </div>
                            <div>{pinBiz.address} ({pinBiz.distanceKm} km away)</div>
                          </div>
                          <button
                            onClick={() => onNavigate(`/business/${pinBiz.businessSlug}`)}
                            className="w-full mt-2 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all cursor-pointer"
                          >
                            View Business Profile
                          </button>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="text-xs text-slate-400 space-y-2 py-8 text-center">
                      <Compass className="w-8 h-8 text-slate-600 mx-auto" />
                      <p>Click any map pin on the right to inspect business details, address, and ratings.</p>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-white/10 text-[11px] text-slate-500 font-mono">
                  Coordinates: Freetown 8.4844° N, 13.2344° W
                </div>
              </div>

              {/* Map Canvas */}
              <div className="relative flex-1 h-full bg-slate-900 overflow-hidden flex items-center justify-center">
                <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:24px_24px] opacity-60" />

                {/* Road Line Accents */}
                <svg className="absolute inset-0 w-full h-full stroke-slate-800/80" strokeWidth="2" fill="none">
                  <path d="M 0 100 Q 250 150 500 120 T 1000 300" />
                  <path d="M 100 0 Q 200 300 400 600" />
                  <path d="M 300 0 Q 400 200 800 500" />
                </svg>

                {/* Map Pins */}
                {filteredBusinesses.map((biz, idx) => {
                  const topPercent = 20 + (idx * 17) % 65;
                  const leftPercent = 15 + (idx * 21) % 70;
                  const isSelected = selectedPinId === biz.id;

                  return (
                    <div
                      key={biz.id}
                      style={{ top: `${topPercent}%`, left: `${leftPercent}%` }}
                      onClick={() => setSelectedPinId(biz.id)}
                      className="absolute -translate-x-1/2 -translate-y-1/2 group cursor-pointer z-20"
                    >
                      <div className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-bold shadow-2xl border transition-all ${
                        isSelected 
                          ? 'bg-indigo-600 text-white border-white scale-110 z-30'
                          : 'bg-slate-900 text-white border-white/20 hover:bg-indigo-600 hover:scale-105'
                      }`}>
                        <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        <span className="truncate max-w-[130px]">{biz.name}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* LIST / GRID VIEW RENDERING */
          activeTab === 'services' ? (
            /* Services Grid - FULL WIDTH RESPONSIVE */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {allServices.map(({ business, service }) => (
                <div
                  key={`${business.id}-${service.id}`}
                  className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs hover:shadow-xl hover:border-indigo-300 transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-mono text-indigo-600 font-bold uppercase tracking-wider">
                          {business.category}
                        </span>
                        <h3 className="text-base font-bold text-slate-900 leading-snug">{service.name}</h3>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-base font-black text-slate-900">
                          {service.price === 0 ? 'Free' : `$${service.price.toFixed(2)}`}
                        </div>
                        {service.durationMinutes && (
                          <div className="text-[10px] text-slate-400 font-medium">~{service.durationMinutes} mins</div>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">{service.description}</p>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                    <div
                      onClick={() => onNavigate(`/business/${business.businessSlug}`)}
                      className="flex items-center gap-2 cursor-pointer group truncate"
                    >
                      <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 font-black text-xs flex items-center justify-center shrink-0 border border-indigo-100">
                        {business.name.charAt(0)}
                      </div>
                      <div className="truncate">
                        <div className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors truncate">
                          {business.name}
                        </div>
                        <div className="text-[10px] text-slate-400">{business.distanceKm} km away</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <a
                        href={`tel:${business.phone}`}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                        title="Call Business"
                      >
                        <Phone className="w-4 h-4" />
                      </a>
                      <button
                        onClick={() => onNavigate(`/business/${business.businessSlug}`)}
                        className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer transition-colors shadow-xs"
                      >
                        Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Businesses Cards Grid - FULL WIDTH RESPONSIVE GRID */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-6">
              {filteredBusinesses.map((biz) => (
                <div
                  key={biz.id}
                  className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-xl hover:border-indigo-300 transition-all flex flex-col justify-between group"
                  id={`discovery-card-${biz.id}`}
                >
                  {/* Photo or Header Banner */}
                  <div className="h-44 bg-slate-100 relative overflow-hidden">
                    {biz.photos && biz.photos[0] ? (
                      <img 
                        src={biz.photos[0]} 
                        alt={biz.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-slate-800 via-indigo-950 to-slate-900 flex items-center justify-center text-white/40 text-sm font-bold p-4 text-center">
                        {biz.category}
                      </div>
                    )}

                    {/* Status Badges on Photo */}
                    <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5">
                      {biz.isVerified && (
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[10px] font-bold shadow-md flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" />
                          Verified
                        </span>
                      )}
                      {biz.isTenant && (
                        <span className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-[10px] font-bold shadow-md flex items-center gap-1">
                          <Store className="w-3 h-3" />
                          Storefront
                        </span>
                      )}
                    </div>

                    <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-lg bg-slate-900/85 backdrop-blur-xs text-white text-[11px] font-bold flex items-center gap-1 shadow-sm">
                      <Star className="w-3.5 h-3.5 text-amber-400 fill-current" />
                      <span>{biz.rating} ({biz.reviewCount})</span>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-[10px] font-mono text-indigo-600 font-bold uppercase tracking-wider">
                        <span>{biz.category}</span>
                        <span className="text-slate-400 font-normal">{biz.distanceKm} km</span>
                      </div>

                      <h3
                        onClick={() => onNavigate(`/business/${biz.businessSlug}`)}
                        className="text-base font-bold text-slate-900 hover:text-indigo-600 transition-colors cursor-pointer mt-1 line-clamp-1"
                      >
                        {biz.name}
                      </h3>

                      <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                        {biz.tagline}
                      </p>
                    </div>

                    {/* Services Pill count & City */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span className="truncate">{biz.city}</span>
                      </span>
                      <span className="text-indigo-600 font-semibold shrink-0">
                        {biz.servicesOffered.length} services
                      </span>
                    </div>
                  </div>

                  {/* Action Footer */}
                  <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center gap-2">
                    <button
                      onClick={() => onNavigate(`/business/${biz.businessSlug}`)}
                      className="flex-1 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 text-xs font-bold transition-all cursor-pointer text-center"
                    >
                      View Profile
                    </button>

                    {biz.isTenant && biz.tenantSlug ? (
                      <button
                        onClick={() => onNavigate(`/store/${biz.tenantSlug}`)}
                        className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xs shadow-indigo-600/30 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Store className="w-3.5 h-3.5" />
                        <span>Visit Store</span>
                      </button>
                    ) : (
                      <a
                        href={`tel:${biz.phone}`}
                        className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5"
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

      {/* Discovery Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 px-4 sm:px-6 lg:px-8 xl:px-12 text-center text-xs text-slate-500 space-y-2">
        <p className="font-bold text-slate-700">MikitHub Universal Discovery Engine</p>
        <p>Empowering local commerce, trade, and business discovery across West Africa.</p>
      </footer>
    </div>
  );
}
