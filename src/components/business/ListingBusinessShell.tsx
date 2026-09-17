import React, { useState, useMemo } from 'react';
import { 
  Building2, MapPin, Phone, Mail, Globe, Clock, ShieldCheck, 
  Sparkles, ExternalLink, Plus, Trash2, Edit3, CheckCircle2, 
  BarChart3, Eye, MousePointerClick, MessageSquare, ArrowRight, 
  Store, AlertCircle, Save, Layers, Check
} from 'lucide-react';
import { Business, BusinessListing, BusinessLocation, ListingBusinessProfile } from '../../types';
import { Button, Badge, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, EmptyState } from '../shared';

interface ListingBusinessShellProps {
  businessId?: string;
  initialProfile?: ListingBusinessProfile;
  onNavigate: (path: string) => void;
  onUpgradeToTenant?: (locationId?: string) => void;
}

// Sample fallback mock business if none provided
const DEFAULT_LISTING_PROFILE: ListingBusinessProfile = {
  business: {
    id: 'biz-kallon-repair',
    legalName: 'Kallon Tech Repairs & Electronics Ltd',
    tradingName: 'Kallon Smart Fix',
    registrationNumber: 'SL-RC-2024-8849',
    taxId: 'TIN-99482910',
    ownerUid: 'usr-kallon-owner',
    country: 'Sierra Leone',
    currency: 'SLE',
    verificationStatus: 'verified',
    status: 'active',
    createdAt: '2024-01-15T09:00:00Z',
  },
  listing: {
    id: 'list-kallon-repair',
    businessId: 'biz-kallon-repair',
    slug: 'kallon-smart-fix',
    headline: 'Express Smartphone, Laptop & Tablet Hardware Specialists',
    description: 'Premier certified electronics repair center in central Freetown. Fast diagnostics, genuine OEM replacement screens, micro-soldering, battery replacements, and certified liquid damage recovery.',
    categories: ['Repairs & Tech Services', 'Electronics & Gadgets'],
    tags: ['iPhone Repair', 'Samsung Screen', 'MacBook Service', 'Battery Replacement'],
    logoUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=200&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1597740985671-2a8a3b80532e?auto=format&fit=crop&w=1200&q=80',
    ratingAverage: 4.9,
    reviewCount: 48,
    isPublished: true,
    isFeatured: true,
  },
  locations: [
    {
      id: 'loc-kallon-central',
      businessId: 'biz-kallon-repair',
      name: 'Central Freetown Workshop',
      addressLine1: '32 Siaka Stevens Street, Suite 4',
      city: 'Freetown',
      country: 'Sierra Leone',
      geo: { latitude: 8.484, longitude: -13.234 },
      phone: '+232 76 555 333',
      operatingHours: 'Mon - Sat: 8:30 AM - 6:30 PM',
      hasOperationalTenant: false,
      tenantId: null,
      isActive: true,
    },
    {
      id: 'loc-kallon-lumley',
      businessId: 'biz-kallon-repair',
      name: 'Lumley Service Drop-Off Desk',
      addressLine1: '14 Lumley Beach Road',
      city: 'Freetown',
      country: 'Sierra Leone',
      geo: { latitude: 8.468, longitude: -13.272 },
      phone: '+232 78 555 444',
      operatingHours: 'Mon - Sun: 9:00 AM - 8:00 PM',
      hasOperationalTenant: false,
      tenantId: null,
      isActive: true,
    },
  ],
  services: [
    {
      id: 'srv-1',
      name: 'Full Hardware Diagnostics & Bench Inspection',
      price: 150,
      durationMinutes: 30,
      description: 'Comprehensive electrical, motherboard and battery health scan with printed quote.',
    },
    {
      id: 'srv-2',
      name: 'Smartphone OLED / Retina Screen Replacement',
      price: 850,
      durationMinutes: 45,
      description: 'Precision display replacement including true-tone calibration and 90-day warranty.',
    },
    {
      id: 'srv-3',
      name: 'Certified Battery Replacement & Adhesive Reseal',
      price: 450,
      durationMinutes: 30,
      description: 'High-cycle OEM specification battery installation with complete waterproof gasket reseal.',
    },
    {
      id: 'srv-4',
      name: 'Board-Level Micro-Soldering & Water Damage Deoxidation',
      price: 1200,
      durationMinutes: 120,
      description: 'Ultrasonic cleaning bath, short-circuit trace repair and chip re-balling.',
    },
  ],
};

type ActiveSubView = 'overview' | 'profile' | 'locations' | 'services' | 'analytics';

export default function ListingBusinessShell({
  businessId = 'biz-kallon-repair',
  initialProfile = DEFAULT_LISTING_PROFILE,
  onNavigate,
  onUpgradeToTenant,
}: ListingBusinessShellProps) {
  const [profile, setProfile] = useState<ListingBusinessProfile>(initialProfile);
  const [activeTab, setActiveTab] = useState<ActiveSubView>('overview');
  const [isSaved, setIsSaved] = useState(false);

  // Form states for Profile tab
  const [headline, setHeadline] = useState(profile.listing.headline);
  const [description, setDescription] = useState(profile.listing.description);
  const [tradingName, setTradingName] = useState(profile.business.tradingName);
  const [isPublished, setIsPublished] = useState(profile.listing.isPublished);

  // Service creation modal / state
  const [isAddingService, setIsAddingService] = useState(false);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState<number>(200);
  const [newServiceDuration, setNewServiceDuration] = useState<number>(30);
  const [newServiceDesc, setNewServiceDesc] = useState('');

  // Location creation state
  const [isAddingLocation, setIsAddingLocation] = useState(false);
  const [newLocName, setNewLocName] = useState('');
  const [newLocAddress, setNewLocAddress] = useState('');
  const [newLocCity, setNewLocCity] = useState('Freetown');
  const [newLocPhone, setNewLocPhone] = useState('+232 ');
  const [newLocHours, setNewLocHours] = useState('Mon - Sat: 9:00 AM - 6:00 PM');

  const handleSaveProfile = () => {
    setProfile(prev => ({
      ...prev,
      business: { ...prev.business, tradingName },
      listing: { ...prev.listing, headline, description, isPublished },
    }));
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handleAddService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServiceName.trim()) return;
    const newService = {
      id: `srv-${Date.now()}`,
      name: newServiceName,
      price: newServicePrice,
      durationMinutes: newServiceDuration,
      description: newServiceDesc,
    };
    setProfile(prev => ({
      ...prev,
      services: [...prev.services, newService],
    }));
    setIsAddingService(false);
    setNewServiceName('');
    setNewServiceDesc('');
  };

  const handleDeleteService = (id: string) => {
    setProfile(prev => ({
      ...prev,
      services: prev.services.filter(s => s.id !== id),
    }));
  };

  const handleAddLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocName.trim() || !newLocAddress.trim()) return;
    const newLocation: BusinessLocation = {
      id: `loc-${Date.now()}`,
      businessId: profile.business.id,
      name: newLocName,
      addressLine1: newLocAddress,
      city: newLocCity,
      country: 'Sierra Leone',
      phone: newLocPhone,
      operatingHours: newLocHours,
      hasOperationalTenant: false,
      tenantId: null,
      isActive: true,
    };
    setProfile(prev => ({
      ...prev,
      locations: [...prev.locations, newLocation],
    }));
    setIsAddingLocation(false);
    setNewLocName('');
    setNewLocAddress('');
  };

  const handleDeleteLocation = (id: string) => {
    setProfile(prev => ({
      ...prev,
      locations: prev.locations.filter(l => l.id !== id),
    }));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Universal App Header */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => onNavigate('/')}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-medium"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold">
              M
            </div>
            <span className="font-semibold text-white hidden sm:inline">MikitHub</span>
          </button>
          <span className="text-slate-600">/</span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
              Business Directory
            </span>
            <span className="font-semibold text-sm sm:text-base text-white truncate max-w-[200px] sm:max-w-xs">
              {profile.business.tradingName}
            </span>
            <Badge variant="verified" size="sm">
              Verified
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate(`/business/${profile.listing.slug}`)}
            leftIcon={<ExternalLink className="w-3.5 h-3.5" />}
          >
            Public Listing
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => onUpgradeToTenant ? onUpgradeToTenant() : onNavigate('/onboarding')}
            leftIcon={<Store className="w-3.5 h-3.5" />}
          >
            Activate Store / POS
          </Button>
        </div>
      </header>

      {/* Upgrade Banner for Listing-Only Businesses */}
      <div className="bg-gradient-to-r from-indigo-950/80 via-slate-900 to-indigo-950/80 border-b border-indigo-800/40 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white flex items-center gap-2">
                Listing Business Tier Active
                <span className="text-[11px] font-normal text-indigo-300 bg-indigo-950/80 border border-indigo-700/50 px-2 py-0.5 rounded-full">
                  Zero POS / Inventory Clutter
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Your business is live in the MikitHub local directory. Want to sell online or run a barcode register in-store?
              </p>
            </div>
          </div>
          <Button
            variant="glass"
            size="sm"
            onClick={() => onUpgradeToTenant ? onUpgradeToTenant() : onNavigate('/onboarding')}
            rightIcon={<ArrowRight className="w-3.5 h-3.5 text-indigo-400" />}
          >
            Enable Storefront & POS
          </Button>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 flex-1 flex flex-col md:flex-row gap-6">
        {/* Left Navigation Sidebar */}
        <aside className="w-full md:w-64 shrink-0 flex flex-row md:flex-col gap-1 overflow-x-auto pb-2 md:pb-0">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all text-left whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Overview & Stats
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all text-left whitespace-nowrap ${
              activeTab === 'profile'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Edit3 className="w-4 h-4" />
            Profile & Branding
          </button>

          <button
            onClick={() => setActiveTab('locations')}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all text-left whitespace-nowrap ${
              activeTab === 'locations'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <MapPin className="w-4 h-4" />
            Locations & Hours ({profile.locations.length})
          </button>

          <button
            onClick={() => setActiveTab('services')}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all text-left whitespace-nowrap ${
              activeTab === 'services'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            Services Menu ({profile.services.length})
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all text-left whitespace-nowrap ${
              activeTab === 'analytics'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Discovery Analytics
          </button>

          <div className="pt-4 mt-4 border-t border-slate-800 hidden md:block">
            <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400">
              <span className="font-semibold text-white block mb-1">Commercial Identity</span>
              <p className="truncate">TIN: {profile.business.taxId}</p>
              <p className="truncate">Reg: {profile.business.registrationNumber}</p>
            </div>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 min-w-0">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Identity Header Card */}
              <Card elevation="level1">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      {profile.listing.logoUrl ? (
                        <img 
                          src={profile.listing.logoUrl} 
                          alt="Logo" 
                          className="w-16 h-16 rounded-2xl object-cover border border-slate-700 shadow-md"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 text-xl font-bold">
                          {profile.business.tradingName.charAt(0)}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-xl font-bold text-white">{profile.business.tradingName}</h2>
                          <Badge variant="verified" size="sm">Verified Business</Badge>
                          <Badge variant="status" statusValue="active" size="sm">Active</Badge>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          Legal: {profile.business.legalName} &bull; {profile.business.country}
                        </p>
                        <p className="text-xs text-indigo-400 mt-0.5 font-mono">
                          Slug: /business/{profile.listing.slug}
                        </p>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveTab('profile')}
                      leftIcon={<Edit3 className="w-3.5 h-3.5" />}
                    >
                      Edit Listing
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Discovery Metrics Overview */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card elevation="level0" className="p-4">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs font-medium uppercase tracking-wider">Search Views</span>
                    <Eye className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div className="text-2xl font-bold text-white">1,482</div>
                  <p className="text-[11px] text-emerald-400 mt-1">+18% past 30 days</p>
                </Card>

                <Card elevation="level0" className="p-4">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs font-medium uppercase tracking-wider">Phone / WhatsApp</span>
                    <MousePointerClick className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-2xl font-bold text-white">249</div>
                  <p className="text-[11px] text-slate-400 mt-1">Direct inquiries generated</p>
                </Card>

                <Card elevation="level0" className="p-4">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs font-medium uppercase tracking-wider">Customer Rating</span>
                    <ShieldCheck className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-2xl font-bold text-white flex items-center gap-1.5">
                    {profile.listing.ratingAverage}
                    <span className="text-xs text-slate-400 font-normal">({profile.listing.reviewCount} reviews)</span>
                  </div>
                  <p className="text-[11px] text-emerald-400 mt-1">Top 5% in category</p>
                </Card>

                <Card elevation="level0" className="p-4">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs font-medium uppercase tracking-wider">Active Branches</span>
                    <MapPin className="w-4 h-4 text-sky-400" />
                  </div>
                  <div className="text-2xl font-bold text-white">{profile.locations.length}</div>
                  <p className="text-[11px] text-slate-400 mt-1">Freetown Metropolitan Area</p>
                </Card>
              </div>

              {/* Branch Overview Table */}
              <Card elevation="level1">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Physical Branches</CardTitle>
                    <CardDescription>Locations visible on MikitHub discovery map</CardDescription>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setActiveTab('locations')}
                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                  >
                    Manage Locations
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-slate-800">
                    {profile.locations.map(loc => (
                      <div key={loc.id} className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-slate-900/40 transition-colors">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-sm text-white">{loc.name}</h4>
                            <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                              {loc.city}
                            </span>
                            {loc.hasOperationalTenant ? (
                              <Badge variant="tenant" size="sm">POS Connected</Badge>
                            ) : (
                              <Badge variant="neutral" size="sm">Listing Only</Badge>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            {loc.addressLine1}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            {String(loc.operatingHours)}
                          </p>
                        </div>

                        {!loc.hasOperationalTenant && (
                          <Button
                            variant="glass"
                            size="sm"
                            onClick={() => onUpgradeToTenant ? onUpgradeToTenant(loc.id) : onNavigate('/onboarding')}
                            leftIcon={<Store className="w-3.5 h-3.5 text-indigo-400" />}
                          >
                            Add Branch Storefront
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* TAB 2: PROFILE & BRANDING */}
          {activeTab === 'profile' && (
            <Card elevation="level1">
              <CardHeader>
                <CardTitle>Profile & Discovery Settings</CardTitle>
                <CardDescription>
                  Configure your public-facing business profile and searchable attributes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Trading Name (Brand Display)
                  </label>
                  <input
                    type="text"
                    value={tradingName}
                    onChange={(e) => setTradingName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Catchy Tagline / Headline
                  </label>
                  <input
                    type="text"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-indigo-500"
                    placeholder="e.g. Express Smartphone & Laptop Hardware Specialists"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    About & Description
                  </label>
                  <textarea
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-indigo-500 leading-relaxed"
                  />
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-slate-800">
                  <div>
                    <span className="text-sm font-semibold text-white block">Public Directory Visibility</span>
                    <span className="text-xs text-slate-400">
                      When published, customers nearby can discover your business on search and map views
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPublished(!isPublished)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      isPublished ? 'bg-indigo-600' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        isPublished ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </CardContent>
              <CardFooter className="justify-end">
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleSaveProfile}
                  leftIcon={isSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                >
                  {isSaved ? 'Saved Changes!' : 'Save Profile'}
                </Button>
              </CardFooter>
            </Card>
          )}

          {/* TAB 3: LOCATIONS */}
          {activeTab === 'locations' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">Branch Locations</h3>
                  <p className="text-xs text-slate-400">
                    Option A Multi-Location: One Business Legal Entity &rarr; Multiple Operational Locations
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsAddingLocation(true)}
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                >
                  Add Branch Location
                </Button>
              </div>

              {isAddingLocation && (
                <Card elevation="level2" className="border-indigo-500/40">
                  <CardHeader>
                    <CardTitle>Add New Branch Location</CardTitle>
                    <CardDescription>Provide address and contact info for this physical outlet</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleAddLocation} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">Branch Name</label>
                          <input
                            type="text"
                            required
                            value={newLocName}
                            onChange={(e) => setNewLocName(e.target.value)}
                            placeholder="e.g. Waterloo Express Outlet"
                            className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-indigo-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">City</label>
                          <input
                            type="text"
                            required
                            value={newLocCity}
                            onChange={(e) => setNewLocCity(e.target.value)}
                            className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-indigo-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Street Address</label>
                        <input
                          type="text"
                          required
                          value={newLocAddress}
                          onChange={(e) => setNewLocAddress(e.target.value)}
                          placeholder="e.g. 5 Main Motor Road"
                          className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-indigo-500 focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">Branch Phone</label>
                          <input
                            type="text"
                            value={newLocPhone}
                            onChange={(e) => setNewLocPhone(e.target.value)}
                            className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-indigo-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">Operating Hours</label>
                          <input
                            type="text"
                            value={newLocHours}
                            onChange={(e) => setNewLocHours(e.target.value)}
                            className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-indigo-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-3 pt-2">
                        <Button variant="ghost" size="sm" type="button" onClick={() => setIsAddingLocation(false)}>
                          Cancel
                        </Button>
                        <Button variant="primary" size="sm" type="submit">
                          Create Location
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}

              <div className="space-y-3">
                {profile.locations.map(loc => (
                  <Card key={loc.id} elevation="level1" className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-base text-white">{loc.name}</h4>
                        {loc.hasOperationalTenant ? (
                          <Badge variant="tenant" size="sm">Operational Tenant Active</Badge>
                        ) : (
                          <Badge variant="neutral" size="sm">Listing Branch Only</Badge>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        {loc.addressLine1}, {loc.city}, {loc.country}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        {loc.phone} &bull; {String(loc.operatingHours)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      {!loc.hasOperationalTenant && (
                        <Button
                          variant="glass"
                          size="sm"
                          onClick={() => onUpgradeToTenant ? onUpgradeToTenant(loc.id) : onNavigate('/onboarding')}
                          leftIcon={<Store className="w-3.5 h-3.5 text-indigo-400" />}
                        >
                          Provision Storefront / POS
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteLocation(loc.id)}
                        className="text-rose-400 hover:text-rose-300 hover:bg-rose-950/30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: SERVICES */}
          {activeTab === 'services' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">Services Menu</h3>
                  <p className="text-xs text-slate-400">
                    Listing-only businesses can publish non-inventory service offerings with prices and turnaround time
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsAddingService(true)}
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                >
                  Add Service
                </Button>
              </div>

              {isAddingService && (
                <Card elevation="level2" className="border-indigo-500/40">
                  <CardHeader>
                    <CardTitle>Add Service Offering</CardTitle>
                    <CardDescription>Service items will display on your public business page</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleAddService} className="space-y-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Service Title</label>
                        <input
                          type="text"
                          required
                          value={newServiceName}
                          onChange={(e) => setNewServiceName(e.target.value)}
                          placeholder="e.g. MacBook Pro Thermal Paste & Dust Cleanout"
                          className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-indigo-500 focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">Estimated Price (SLE)</label>
                          <input
                            type="number"
                            required
                            min="0"
                            value={newServicePrice}
                            onChange={(e) => setNewServicePrice(Number(e.target.value))}
                            className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-indigo-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">Estimated Duration (Minutes)</label>
                          <input
                            type="number"
                            min="5"
                            value={newServiceDuration}
                            onChange={(e) => setNewServiceDuration(Number(e.target.value))}
                            className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-indigo-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Description & Scope</label>
                        <textarea
                          rows={2}
                          value={newServiceDesc}
                          onChange={(e) => setNewServiceDesc(e.target.value)}
                          placeholder="Describe what is included in this service..."
                          className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-indigo-500 focus:outline-none"
                        />
                      </div>

                      <div className="flex justify-end gap-3 pt-2">
                        <Button variant="ghost" size="sm" type="button" onClick={() => setIsAddingService(false)}>
                          Cancel
                        </Button>
                        <Button variant="primary" size="sm" type="submit">
                          Add to Menu
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}

              {profile.services.length === 0 ? (
                <EmptyState
                  title="No services added yet"
                  description="Add repair, consultation, or custom services to help nearby customers request quotes."
                  action={{
                    label: "Add First Service",
                    onClick: () => setIsAddingService(true)
                  }}
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {profile.services.map(srv => (
                    <Card key={srv.id} elevation="level1" className="p-5 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <h4 className="font-semibold text-white text-sm sm:text-base leading-snug">{srv.name}</h4>
                          <span className="text-base font-bold text-emerald-400 shrink-0">
                            Le {srv.price.toLocaleString()}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                          {srv.description}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          ~{srv.durationMinutes || 30} mins
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteService(srv.id)}
                          className="text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: ANALYTICS */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <Card elevation="level1">
                <CardHeader>
                  <CardTitle>Discovery Performance</CardTitle>
                  <CardDescription>
                    Track how customers find and interact with your business in the MikitHub directory
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-xs text-slate-400 block mb-1">Directory Impressions</span>
                      <span className="text-2xl font-bold text-white">4,812</span>
                      <p className="text-[11px] text-emerald-400 mt-1">&uarr; 24% vs previous month</p>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-xs text-slate-400 block mb-1">Listing Profile Clicks</span>
                      <span className="text-2xl font-bold text-white">890</span>
                      <p className="text-[11px] text-emerald-400 mt-1">18.5% click-through rate</p>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-xs text-slate-400 block mb-1">Direction / Map Triggers</span>
                      <span className="text-2xl font-bold text-white">312</span>
                      <p className="text-[11px] text-emerald-400 mt-1">Physical footfall interest</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/30 flex items-center justify-between gap-4">
                    <div>
                      <h4 className="text-sm font-semibold text-white">Ready for full online checkout?</h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Upgrade this listing into an operational Tenant branch to accept digital payments via Monime, track stock, and run cash register shifts.
                      </p>
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => onUpgradeToTenant ? onUpgradeToTenant() : onNavigate('/onboarding')}
                    >
                      Provision Tenant
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
