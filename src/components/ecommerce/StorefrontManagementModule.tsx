import React, { useState } from 'react';
import { 
  StorefrontHomepageConfig, 
  HomepageSectionConfig, 
  HomepageSectionType, 
  Product,
  HomepageHeroSlideConfig,
  HomepagePromoBannerConfig
} from '../../types';
import { 
  Layers, Plus, MoveUp, MoveDown, Eye, EyeOff, Settings, 
  Sparkles, Calendar, Image, Link, Search, CheckSquare, Square, 
  Trash2, RotateCcw, Save, Check, ArrowLeft, Layout, Sliders, 
  AlertCircle, ExternalLink, Copy, Tag, X
} from 'lucide-react';
import { DEFAULT_HOMEPAGE_CONFIG } from '../../data/homepageConfig';

interface StorefrontManagementModuleProps {
  config: StorefrontHomepageConfig;
  onSaveConfig: (newConfig: StorefrontHomepageConfig) => void;
  categories: string[];
  products: Product[];
  onBackToHome?: () => void;
}

export default function StorefrontManagementModule({
  config,
  onSaveConfig,
  categories,
  products,
  onBackToHome
}: StorefrontManagementModuleProps) {
  const [localConfig, setLocalConfig] = useState<StorefrontHomepageConfig>(config);
  const [activeEditingId, setActiveEditingId] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState('');
  const [isSavedSuccess, setIsSavedSuccess] = useState(false);
  const [activeViewMode, setActiveViewMode] = useState<'editor' | 'preview'>('editor');

  // New section modal / drawer form state
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState('Back to School');
  const [newSectionType, setNewSectionType] = useState<HomepageSectionType>('custom_campaign');
  const [newSectionSubtitle, setNewSectionSubtitle] = useState('Gear up for the new term with essential gear');
  const [newBannerUrl, setNewBannerUrl] = useState('https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&q=80&w=1200');
  const [newButtonText, setNewButtonText] = useState('Shop Back to School');
  const [newButtonUrl, setNewButtonUrl] = useState('Electronics');
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');

  // Move section up
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newSections = [...localConfig.sections];
    const temp = newSections[index - 1];
    newSections[index - 1] = newSections[index];
    newSections[index] = temp;
    const reordered = newSections.map((sec, i) => ({ ...sec, displayOrder: i + 1 }));
    setLocalConfig(prev => ({ ...prev, sections: reordered }));
  };

  // Move section down
  const handleMoveDown = (index: number) => {
    if (index === localConfig.sections.length - 1) return;
    const newSections = [...localConfig.sections];
    const temp = newSections[index + 1];
    newSections[index + 1] = newSections[index];
    newSections[index] = temp;
    const reordered = newSections.map((sec, i) => ({ ...sec, displayOrder: i + 1 }));
    setLocalConfig(prev => ({ ...prev, sections: reordered }));
  };

  // Toggle section enabled status
  const handleToggleSection = (id: string) => {
    setLocalConfig(prev => ({
      ...prev,
      sections: prev.sections.map(sec => 
        sec.id === id ? { ...sec, enabled: !sec.enabled } : sec
      )
    }));
  };

  // Update specific section property
  const handleUpdateSection = (id: string, updates: Partial<HomepageSectionConfig>) => {
    setLocalConfig(prev => ({
      ...prev,
      sections: prev.sections.map(sec => 
        sec.id === id ? { ...sec, ...updates } : sec
      )
    }));
  };

  // Delete section
  const handleDeleteSection = (id: string) => {
    if (confirm('Are you sure you want to delete this storefront section?')) {
      setLocalConfig(prev => ({
        ...prev,
        sections: prev.sections.filter(sec => sec.id !== id)
      }));
      if (activeEditingId === id) setActiveEditingId(null);
    }
  };

  // Duplicate section
  const handleDuplicateSection = (sec: HomepageSectionConfig) => {
    const duplicated: HomepageSectionConfig = {
      ...sec,
      id: `section-${Date.now()}`,
      title: `${sec.title} (Copy)`,
      displayOrder: localConfig.sections.length + 1
    };
    setLocalConfig(prev => ({
      ...prev,
      sections: [...prev.sections, duplicated]
    }));
    setActiveEditingId(duplicated.id);
  };

  // Toggle product selection mapping
  const handleToggleProductSelection = (sectionId: string, productId: string) => {
    setLocalConfig(prev => ({
      ...prev,
      sections: prev.sections.map(sec => {
        if (sec.id !== sectionId) return sec;
        const current = sec.selectedProductIds || [];
        const exists = current.includes(productId);
        const updated = exists 
          ? current.filter(pId => pId !== productId)
          : [...current, productId];
        return { ...sec, selectedProductIds: updated };
      })
    }));
  };

  // Create brand new custom section
  const handleCreateSection = () => {
    if (!newSectionTitle.trim()) return;

    const newSec: HomepageSectionConfig = {
      id: `section-${Date.now()}`,
      type: newSectionType,
      enabled: true,
      status: 'active',
      displayOrder: localConfig.sections.length + 1,
      title: newSectionTitle,
      subtitle: newSectionSubtitle,
      bannerUrl: newBannerUrl,
      buttonText: newButtonText,
      buttonUrl: newButtonUrl,
      startDate: newStartDate || undefined,
      endDate: newEndDate || undefined,
      selectedProductIds: products.slice(0, 4).map(p => p.id),
      maxItems: 4
    };

    setLocalConfig(prev => ({
      ...prev,
      sections: [...prev.sections, newSec]
    }));

    setIsCreatingNew(false);
    setActiveEditingId(newSec.id);
  };

  // Reset to factory defaults
  const handleResetDefaults = () => {
    if (confirm('Reset storefront homepage layout to factory default sections?')) {
      setLocalConfig(DEFAULT_HOMEPAGE_CONFIG);
    }
  };

  // Save changes
  const handleSaveChanges = () => {
    onSaveConfig(localConfig);
    setIsSavedSuccess(true);
    setTimeout(() => setIsSavedSuccess(false), 3000);
  };

  const SECTION_TYPE_LABELS: Record<HomepageSectionType, { label: string; bg: string; text: string }> = {
    hero_banner: { label: 'Hero Banner', bg: 'bg-indigo-100 dark:bg-indigo-950', text: 'text-indigo-800 dark:text-indigo-300' },
    categories: { label: 'Categories', bg: 'bg-blue-100 dark:bg-blue-950', text: 'text-blue-800 dark:text-blue-300' },
    featured_products: { label: 'Featured Products', bg: 'bg-purple-100 dark:bg-purple-950', text: 'text-purple-800 dark:text-purple-300' },
    promotional_banner: { label: 'Promotional Banner', bg: 'bg-amber-100 dark:bg-amber-950', text: 'text-amber-800 dark:text-amber-300' },
    new_arrivals: { label: 'New Arrivals', bg: 'bg-emerald-100 dark:bg-emerald-950', text: 'text-emerald-800 dark:text-emerald-300' },
    best_sellers: { label: 'Best Sellers', bg: 'bg-rose-100 dark:bg-rose-950', text: 'text-rose-800 dark:text-rose-300' },
    brands: { label: 'Brand Showcase', bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-800 dark:text-slate-200' },
    recommended: { label: 'Recommended Products', bg: 'bg-teal-100 dark:bg-teal-950', text: 'text-teal-800 dark:text-teal-300' },
    custom_campaign: { label: 'Custom Campaign / Promo', bg: 'bg-orange-100 dark:bg-orange-950', text: 'text-orange-800 dark:text-orange-300' }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
    p.category.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.id.toLowerCase().includes(productSearch.toLowerCase())
  );

  const activeSectionCount = localConfig.sections.filter(s => s.enabled && s.status !== 'draft').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300" id="storefront-management-module">
      
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
              <Layout className="w-5 h-5" />
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/30">
              Admin Module
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Storefront Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Define, reorder, and configure homepage sections (Hero Banner, Categories, Featured Products, Promotions) with start/end date scheduling and product content mapping.
          </p>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          {onBackToHome && (
            <button
              type="button"
              onClick={onBackToHome}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-extrabold rounded-2xl flex items-center gap-2 transition-all cursor-pointer border border-slate-700"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>View Live Storefront</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleSaveChanges}
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs rounded-2xl shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all cursor-pointer active:scale-95"
            id="btn-save-storefront-cms"
          >
            <Save className="w-4 h-4" />
            <span>Save Storefront Changes</span>
          </button>
        </div>
      </div>

      {/* Save Alert Notification */}
      {isSavedSuccess && (
        <div className="p-4 bg-emerald-500 text-white text-xs font-extrabold rounded-2xl shadow-md flex items-center justify-between animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5 bg-white/20 rounded-full p-1" />
            <span>Storefront configuration saved successfully! Your live homepage has been updated.</span>
          </div>
          <button onClick={() => setIsSavedSuccess(false)} className="text-white/80 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Top Stats & Mode Selector Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Total Sections</span>
            <span className="text-lg font-black text-slate-900 dark:text-white">{localConfig.sections.length} Defined</span>
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black">
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Live Active Sections</span>
            <span className="text-lg font-black text-slate-900 dark:text-white">{activeSectionCount} Displayed</span>
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Scheduled Campaigns</span>
            <span className="text-lg font-black text-slate-900 dark:text-white">
              {localConfig.sections.filter(s => s.status === 'scheduled' || s.startDate).length} Active
            </span>
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">View Mode</span>
            <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400">
              {activeViewMode === 'editor' ? 'Interactive Editor' : 'Live Preview'}
            </span>
          </div>
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveViewMode('editor')}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                activeViewMode === 'editor' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs' : 'text-slate-500'
              }`}
            >
              Editor
            </button>
            <button
              type="button"
              onClick={() => setActiveViewMode('preview')}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                activeViewMode === 'preview' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs' : 'text-slate-500'
              }`}
            >
              Preview
            </button>
          </div>
        </div>
      </div>

      {/* 3. Global Header Announcement Text Bar Settings */}
      <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            Top Announcement Ribbon Promo Bar
          </label>
          <span className="text-[10px] text-slate-400 font-bold uppercase">Global Site Header</span>
        </div>
        <input
          type="text"
          value={localConfig.heroAnnouncementText || ''}
          onChange={(e) => setLocalConfig(prev => ({ ...prev, heroAnnouncementText: e.target.value }))}
          placeholder="e.g. Use coupon COUPON_15 for 15% off cart orders!"
          className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* 4. Section List Manager & Actions Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 sm:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-indigo-600" />
              Homepage Section Sequence & Content Mapping
            </h2>
            <p className="text-xs text-slate-500">Create, sort, and configure Hero Banners, Categories, Featured Lists, and custom campaigns.</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCreatingNew(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-extrabold text-xs rounded-2xl shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
              id="btn-create-section-cms"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Section</span>
            </button>

            <button
              type="button"
              onClick={handleResetDefaults}
              className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-2xl flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Defaults</span>
            </button>
          </div>
        </div>

        {/* Create New Section Form Drawer */}
        {isCreatingNew && (
          <div className="p-5 sm:p-6 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 text-white rounded-3xl border border-indigo-700/50 shadow-2xl space-y-4 animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between border-b border-indigo-800/80 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-extrabold text-white">Create New Storefront Section</h3>
              </div>
              <button onClick={() => setIsCreatingNew(false)} className="p-1 text-slate-400 hover:text-white rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="text-[11px] font-bold text-indigo-200">Section Name / Title</label>
                <input
                  type="text"
                  value={newSectionTitle}
                  onChange={(e) => setNewSectionTitle(e.target.value)}
                  placeholder="e.g. Back to School, Summer Special"
                  className="w-full mt-1 px-3.5 py-2 text-xs rounded-xl bg-slate-800/90 border border-indigo-700 text-white focus:outline-hidden focus:ring-2 focus:ring-amber-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-indigo-200">Section Archetype / Type</label>
                <select
                  value={newSectionType}
                  onChange={(e) => setNewSectionType(e.target.value as HomepageSectionType)}
                  className="w-full mt-1 px-3.5 py-2 text-xs rounded-xl bg-slate-800/90 border border-indigo-700 text-white focus:outline-hidden focus:ring-2 focus:ring-amber-400"
                >
                  <option value="custom_campaign">Custom Campaign / Promo (e.g. Back to School)</option>
                  <option value="hero_banner">Hero Banner</option>
                  <option value="categories">Categories Grid</option>
                  <option value="featured_products">Featured Products</option>
                  <option value="promotional_banner">Promotional Offer Banner</option>
                  <option value="new_arrivals">New Arrivals</option>
                  <option value="best_sellers">Best Sellers</option>
                  <option value="brands">Brand Showcase</option>
                  <option value="recommended">Recommended Products</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-indigo-200">Target Category Filter</label>
                <select
                  value={newButtonUrl}
                  onChange={(e) => setNewButtonUrl(e.target.value)}
                  className="w-full mt-1 px-3.5 py-2 text-xs rounded-xl bg-slate-800/90 border border-indigo-700 text-white focus:outline-hidden focus:ring-2 focus:ring-amber-400"
                >
                  <option value="All">All Categories</option>
                  {categories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2 md:col-span-3">
                <label className="text-[11px] font-bold text-indigo-200">Subtitle / Tagline Description</label>
                <input
                  type="text"
                  value={newSectionSubtitle}
                  onChange={(e) => setNewSectionSubtitle(e.target.value)}
                  placeholder="e.g. Gear up with essential school bags, notebooks, pens & shoes"
                  className="w-full mt-1 px-3.5 py-2 text-xs rounded-xl bg-slate-800/90 border border-indigo-700 text-white focus:outline-hidden focus:ring-2 focus:ring-amber-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-indigo-200">Banner Graphic Image URL</label>
                <input
                  type="text"
                  value={newBannerUrl}
                  onChange={(e) => setNewBannerUrl(e.target.value)}
                  placeholder="e.g. back-to-school.jpg or https://..."
                  className="w-full mt-1 px-3.5 py-2 text-xs rounded-xl bg-slate-800/90 border border-indigo-700 text-white font-mono focus:outline-hidden focus:ring-2 focus:ring-amber-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-indigo-200">CTA Button Text</label>
                <input
                  type="text"
                  value={newButtonText}
                  onChange={(e) => setNewButtonText(e.target.value)}
                  placeholder="e.g. Shop Back to School"
                  className="w-full mt-1 px-3.5 py-2 text-xs rounded-xl bg-slate-800/90 border border-indigo-700 text-white focus:outline-hidden focus:ring-2 focus:ring-amber-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-indigo-200">Start / End Dates (Optional Scheduling)</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <input
                    type="date"
                    value={newStartDate}
                    onChange={(e) => setNewStartDate(e.target.value)}
                    className="px-2.5 py-1.5 text-xs rounded-xl bg-slate-800 border border-indigo-700 text-white"
                  />
                  <input
                    type="date"
                    value={newEndDate}
                    onChange={(e) => setNewEndDate(e.target.value)}
                    className="px-2.5 py-1.5 text-xs rounded-xl bg-slate-800 border border-indigo-700 text-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-indigo-800/60">
              <button
                type="button"
                onClick={() => setIsCreatingNew(false)}
                className="px-4 py-2 text-xs text-indigo-200 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateSection}
                className="px-5 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl shadow-lg flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Section to Storefront</span>
              </button>
            </div>
          </div>
        )}

        {/* Section Cards Stack */}
        <div className="space-y-4">
          {localConfig.sections.map((sec, idx) => {
            const isEditing = activeEditingId === sec.id;
            const typeMeta = SECTION_TYPE_LABELS[sec.type] || { label: sec.type, bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-800 dark:text-slate-200' };

            // Check if active according to current date
            const todayStr = new Date().toISOString().slice(0, 10);
            const isFuture = sec.startDate && todayStr < sec.startDate;
            const isExpired = sec.endDate && todayStr > sec.endDate;

            return (
              <div 
                key={sec.id}
                className={`rounded-2xl border transition-all overflow-hidden ${
                  !sec.enabled 
                    ? 'opacity-60 bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800' 
                    : isEditing 
                      ? 'bg-white dark:bg-slate-900 border-indigo-500 dark:border-indigo-500 ring-2 ring-indigo-500/20 shadow-lg' 
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                {/* Main Section Header Card */}
                <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  
                  {/* Left: Move & Position Controls */}
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-black text-slate-600 dark:text-slate-400 flex items-center justify-center shrink-0">
                      #{idx + 1}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleMoveUp(idx)}
                        disabled={idx === 0}
                        className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950 disabled:opacity-30 transition-colors cursor-pointer"
                        title="Move Section Up"
                      >
                        <MoveUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveDown(idx)}
                        disabled={idx === localConfig.sections.length - 1}
                        className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950 disabled:opacity-30 transition-colors cursor-pointer"
                        title="Move Section Down"
                      >
                        <MoveDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleSection(sec.id)}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        sec.enabled 
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' 
                          : 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                      title={sec.enabled ? 'Section Enabled (Visible)' : 'Section Disabled (Hidden)'}
                    >
                      {sec.enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Center: Title, Type Badge, Status, Content Mapping Tag */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${typeMeta.bg} ${typeMeta.text}`}>
                        {typeMeta.label}
                      </span>

                      <h3 className="text-sm font-black text-slate-900 dark:text-white truncate">
                        {sec.title}
                      </h3>

                      {/* Status Badge */}
                      <span className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase ${
                        !sec.enabled || sec.status === 'draft' ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300' :
                        isFuture ? 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300' :
                        isExpired ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300' :
                        'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                      }`}>
                        {!sec.enabled ? 'Disabled' : sec.status === 'draft' ? 'Draft' : isFuture ? 'Scheduled' : isExpired ? 'Expired' : 'Live Active'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                      {sec.subtitle && <span className="truncate max-w-xs">{sec.subtitle}</span>}
                      
                      {/* Product Content Mapping tag */}
                      {sec.selectedProductIds && sec.selectedProductIds.length > 0 && (
                        <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md">
                          {sec.selectedProductIds.length} Products Mapped
                        </span>
                      )}

                      {/* Date Schedule tag */}
                      {(sec.startDate || sec.endDate) && (
                        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {sec.startDate || 'Any'} → {sec.endDate || 'Forever'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right Actions: Duplicate, Delete, Configure */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleDuplicateSection(sec)}
                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950 rounded-xl transition-colors cursor-pointer"
                      title="Duplicate Section"
                    >
                      <Copy className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteSection(sec.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-xl transition-colors cursor-pointer"
                      title="Delete Section"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveEditingId(isEditing ? null : sec.id)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                        isEditing ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      <Settings className="w-3.5 h-3.5" />
                      <span>{isEditing ? 'Close Settings' : 'Configure Section'}</span>
                    </button>
                  </div>
                </div>

                {/* Detailed Configuration Drawer */}
                {isEditing && (
                  <div className="p-5 sm:p-6 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 space-y-6 animate-in slide-in-from-top duration-200">
                    
                    {/* Basic Info & Archetype */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Section Name / Title</label>
                        <input
                          type="text"
                          value={sec.title}
                          onChange={(e) => handleUpdateSection(sec.id, { title: e.target.value })}
                          className="w-full mt-1 px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Section Archetype / Type</label>
                        <select
                          value={sec.type}
                          onChange={(e) => handleUpdateSection(sec.id, { type: e.target.value as HomepageSectionType })}
                          className="w-full mt-1 px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="custom_campaign">Custom Campaign / Promo (e.g. Back to School)</option>
                          <option value="hero_banner">Hero Banner</option>
                          <option value="categories">Categories Grid</option>
                          <option value="featured_products">Featured Products</option>
                          <option value="promotional_banner">Promotional Offer Banner</option>
                          <option value="new_arrivals">New Arrivals</option>
                          <option value="best_sellers">Best Sellers</option>
                          <option value="brands">Brand Showcase</option>
                          <option value="recommended">Recommended Products</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Status</label>
                        <select
                          value={sec.status || 'active'}
                          onChange={(e) => handleUpdateSection(sec.id, { status: e.target.value as any })}
                          className="w-full mt-1 px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="active">Active (Live on Homepage)</option>
                          <option value="draft">Draft / Hidden</option>
                          <option value="scheduled">Scheduled (Date Window)</option>
                        </select>
                      </div>
                    </div>

                    {/* Subtitle & Category Mapping */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Subtitle / Tagline</label>
                        <input
                          type="text"
                          value={sec.subtitle || ''}
                          onChange={(e) => handleUpdateSection(sec.id, { subtitle: e.target.value })}
                          placeholder="e.g. Essential gear for the new semester"
                          className="w-full mt-1 px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Target Category Filter</label>
                        <select
                          value={sec.category || ''}
                          onChange={(e) => handleUpdateSection(sec.id, { category: e.target.value })}
                          className="w-full mt-1 px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">All Categories</option>
                          {categories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Scheduling & Date Window Controls */}
                    <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Calendar className="w-4 h-4" />
                          Start / End Date Campaign Window
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Automated Schedule</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Campaign Start Date</label>
                          <input
                            type="date"
                            value={sec.startDate || ''}
                            onChange={(e) => handleUpdateSection(sec.id, { startDate: e.target.value })}
                            className="w-full mt-1 px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Campaign End Date</label>
                          <input
                            type="date"
                            value={sec.endDate || ''}
                            onChange={(e) => handleUpdateSection(sec.id, { endDate: e.target.value })}
                            className="w-full mt-1 px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Banner Graphic & CTA Button Settings */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                          <Image className="w-3.5 h-3.5 text-indigo-500" />
                          Banner Graphic Image URL
                        </label>
                        <input
                          type="text"
                          value={sec.bannerUrl || ''}
                          onChange={(e) => handleUpdateSection(sec.id, { bannerUrl: e.target.value })}
                          placeholder="e.g. back-to-school.jpg or https://..."
                          className="w-full mt-1 px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Button Text</label>
                        <input
                          type="text"
                          value={sec.buttonText || ''}
                          onChange={(e) => handleUpdateSection(sec.id, { buttonText: e.target.value })}
                          placeholder="e.g. Shop Back to School"
                          className="w-full mt-1 px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                          <Link className="w-3.5 h-3.5 text-indigo-500" />
                          Button Target URL / Category
                        </label>
                        <input
                          type="text"
                          value={sec.buttonUrl || ''}
                          onChange={(e) => handleUpdateSection(sec.id, { buttonUrl: e.target.value })}
                          placeholder="e.g. Electronics or /catalog"
                          className="w-full mt-1 px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium"
                        />
                      </div>
                    </div>

                    {/* Content Mapping: Product Picker */}
                    <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">
                            Mapped Content Products ({ (sec.selectedProductIds || []).length } Selected)
                          </span>
                          <p className="text-[11px] text-slate-500">Pick specific products to display inside this section (e.g. School Bag, Notebook, Pens, Shoes).</p>
                        </div>

                        {/* Search product filter */}
                        <div className="relative min-w-[220px]">
                          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                          <input
                            type="text"
                            value={productSearch}
                            onChange={(e) => setProductSearch(e.target.value)}
                            placeholder="Filter items by name, SKU..."
                            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                          />
                        </div>
                      </div>

                      {/* Product Checklist Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto p-1">
                        {filteredProducts.map(prod => {
                          const isSelected = (sec.selectedProductIds || []).includes(prod.id);
                          return (
                            <button
                              type="button"
                              key={prod.id}
                              onClick={() => handleToggleProductSelection(sec.id, prod.id)}
                              className={`p-2.5 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                                isSelected 
                                  ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-400 dark:border-indigo-600 text-slate-900 dark:text-white shadow-xs' 
                                  : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                              }`}
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-300 shrink-0" />
                              )}

                              <img 
                                src={prod.imageUrl || prod.images?.[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=150'} 
                                alt={prod.name} 
                                className="w-9 h-9 rounded-xl object-cover shrink-0 border border-slate-200 dark:border-slate-700" 
                              />

                              <div className="flex-1 min-w-0">
                                <span className="text-xs font-bold truncate block">{prod.name}</span>
                                <span className="text-[10px] text-slate-400 block">${prod.price.toFixed(2)} • {prod.category}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Section Card Mini Live Preview */}
                    <div className="p-4 bg-gradient-to-r from-slate-900 to-indigo-950 rounded-2xl text-white space-y-3">
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-300 block">
                        Live Render Preview
                      </span>

                      <div className="p-4 bg-slate-900/80 rounded-xl border border-indigo-800/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="space-y-1 text-center sm:text-left">
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-indigo-500/30 text-indigo-200">
                            {sec.title}
                          </span>
                          <h4 className="text-lg font-black text-white">{sec.title}</h4>
                          {sec.subtitle && <p className="text-xs text-indigo-200">{sec.subtitle}</p>}
                        </div>

                        {sec.buttonText && (
                          <span className="px-4 py-2 bg-amber-400 text-slate-950 font-black text-xs rounded-xl shrink-0 shadow-md">
                            {sec.buttonText}
                          </span>
                        )}
                      </div>
                    </div>

                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
