import React, { useState } from 'react';
import { 
  StorefrontHomepageConfig, 
  HomepageSectionConfig, 
  HomepageSectionType, 
  HomepageHeroSlideConfig, 
  HomepagePromoBannerConfig,
  Product
} from '../../types';
import { 
  X, MoveUp, MoveDown, Eye, EyeOff, Settings, Sparkles, 
  Plus, RotateCcw, Save, Layout, Tag, Flame, ShoppingBag, 
  Check, Edit2, Layers, Sliders, AlertCircle, Trash2, Calendar,
  Image, Link, Search, CheckSquare, Square, ArrowUpRight
} from 'lucide-react';
import { DEFAULT_HOMEPAGE_CONFIG } from '../../data/homepageConfig';

interface ECommerceCMSModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: StorefrontHomepageConfig;
  onSaveConfig: (newConfig: StorefrontHomepageConfig) => void;
  categories: string[];
  products?: Product[];
}

export default function ECommerceCMSModal({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  categories,
  products = []
}: ECommerceCMSModalProps) {
  const [localConfig, setLocalConfig] = useState<StorefrontHomepageConfig>(config);
  const [activeEditingId, setActiveEditingId] = useState<string | null>(null);
  const [isSavedAlert, setIsSavedAlert] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);

  // New section form state
  const [newSectionTitle, setNewSectionTitle] = useState('Back to School');
  const [newSectionType, setNewSectionType] = useState<HomepageSectionType>('custom_campaign');
  const [newSectionSubtitle, setNewSectionSubtitle] = useState('Essential gear & supplies for the new term');
  const [newBannerUrl, setNewBannerUrl] = useState('https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&q=80&w=1200');
  const [newButtonText, setNewButtonText] = useState('Shop Back to School');
  const [newButtonUrl, setNewButtonUrl] = useState('Electronics');

  if (!isOpen) return null;

  // Move section up in order
  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const newSections = [...localConfig.sections];
    const temp = newSections[index - 1];
    newSections[index - 1] = newSections[index];
    newSections[index] = temp;
    // Update display orders
    const reordered = newSections.map((sec, i) => ({ ...sec, displayOrder: i + 1 }));
    setLocalConfig(prev => ({ ...prev, sections: reordered }));
  };

  // Move section down in order
  const handleMoveDown = (index: number) => {
    if (index >= localConfig.sections.length - 1) return;
    const newSections = [...localConfig.sections];
    const temp = newSections[index + 1];
    newSections[index + 1] = newSections[index];
    newSections[index] = temp;
    // Update display orders
    const reordered = newSections.map((sec, i) => ({ ...sec, displayOrder: i + 1 }));
    setLocalConfig(prev => ({ ...prev, sections: reordered }));
  };

  // Toggle section visibility
  const handleToggleEnable = (id: string) => {
    setLocalConfig(prev => ({
      ...prev,
      sections: prev.sections.map(sec => 
        sec.id === id ? { ...sec, enabled: !sec.enabled } : sec
      )
    }));
  };

  // Update section properties
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
    if (confirm('Are you sure you want to delete this homepage section?')) {
      setLocalConfig(prev => ({
        ...prev,
        sections: prev.sections.filter(sec => sec.id !== id)
      }));
      if (activeEditingId === id) setActiveEditingId(null);
    }
  };

  // Toggle selected product in section
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
      selectedProductIds: products.slice(0, 4).map(p => p.id),
      maxItems: 4
    };

    setLocalConfig(prev => ({
      ...prev,
      sections: [...prev.sections, newSec]
    }));

    setIsAddingNew(false);
    setActiveEditingId(newSec.id);
  };

  // Update hero slide properties
  const handleUpdateHeroSlide = (sectionId: string, slideId: string, slideUpdates: Partial<HomepageHeroSlideConfig>) => {
    setLocalConfig(prev => ({
      ...prev,
      sections: prev.sections.map(sec => {
        if (sec.id !== sectionId || !sec.heroSlides) return sec;
        return {
          ...sec,
          heroSlides: sec.heroSlides.map(slide => 
            slide.id === slideId ? { ...slide, ...slideUpdates } : slide
          )
        };
      })
    }));
  };

  // Update promo banner properties
  const handleUpdatePromoBanner = (sectionId: string, bannerUpdates: Partial<HomepagePromoBannerConfig>) => {
    setLocalConfig(prev => ({
      ...prev,
      sections: prev.sections.map(sec => {
        if (sec.id !== sectionId) return sec;
        return {
          ...sec,
          promoBannerConfig: {
            ...sec.promoBannerConfig,
            ...bannerUpdates
          } as HomepagePromoBannerConfig
        };
      })
    }));
  };

  // Reset to factory defaults
  const handleResetDefaults = () => {
    if (confirm('Reset homepage layout to factory default sections?')) {
      setLocalConfig(DEFAULT_HOMEPAGE_CONFIG);
    }
  };

  // Save changes
  const handleSave = () => {
    const updated = {
      ...localConfig,
      lastUpdated: new Date().toISOString()
    };
    onSaveConfig(updated);
    setIsSavedAlert(true);
    setTimeout(() => {
      setIsSavedAlert(false);
      onClose();
    }, 1000);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200" id="homepage-cms-modal">
      <div className="bg-white dark:bg-slate-900 w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Header */}
        <div className="p-5 sm:p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight text-white">Homepage Content Management</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                  Marketing CMS
                </span>
              </div>
              <p className="text-xs text-slate-400">Create custom sections (e.g. Back to School), manage banner graphics, products & scheduling without developer intervention.</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Saved Alert Banner */}
        {isSavedAlert && (
          <div className="bg-emerald-500 text-white px-4 py-2.5 text-xs font-bold text-center flex items-center justify-center gap-2 animate-in slide-in-from-top">
            <Check className="w-4 h-4" />
            Homepage sections updated successfully!
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 bg-slate-50 dark:bg-slate-950">
          
          {/* Top Announcement Bar */}
          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 shadow-xs">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Header Announcement Banner Text
            </label>
            <input
              type="text"
              value={localConfig.heroAnnouncementText || ''}
              onChange={(e) => setLocalConfig(prev => ({ ...prev, heroAnnouncementText: e.target.value }))}
              placeholder="e.g. Use coupon COUPON_15 for 15% off cart orders!"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Section Stack Manager & Creator */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  Homepage Section Stack ({localConfig.sections.length} Sections)
                </h3>
                <p className="text-xs text-slate-500">Add marketing campaign sections, change display order, status, start/end dates and product selections.</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingNew(true)}
                  className="px-3.5 py-2 text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 rounded-xl flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
                  id="btn-add-homepage-section"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Homepage Section</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetDefaults}
                  className="px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-200/80 dark:bg-slate-800 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Defaults</span>
                </button>
              </div>
            </div>

            {/* Create New Section Form Drawer */}
            {isAddingNew && (
              <div className="p-5 bg-gradient-to-r from-indigo-900 to-slate-900 text-white rounded-2xl border border-indigo-700/50 shadow-xl space-y-4 animate-in slide-in-from-top duration-200">
                <div className="flex items-center justify-between border-b border-indigo-800/80 pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <h4 className="text-sm font-extrabold">Create New Marketing Section (e.g. Back to School)</h4>
                  </div>
                  <button 
                    onClick={() => setIsAddingNew(false)}
                    className="p-1 text-slate-400 hover:text-white rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-[11px] font-bold text-indigo-200">Section Name / Title</label>
                    <input
                      type="text"
                      value={newSectionTitle}
                      onChange={(e) => setNewSectionTitle(e.target.value)}
                      placeholder="e.g. Back to School, Summer Deals"
                      className="w-full mt-1 px-3 py-2 text-xs rounded-xl bg-slate-800/90 border border-indigo-700 text-white focus:outline-hidden focus:ring-2 focus:ring-amber-400"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-indigo-200">Section Type</label>
                    <select
                      value={newSectionType}
                      onChange={(e) => setNewSectionType(e.target.value as HomepageSectionType)}
                      className="w-full mt-1 px-3 py-2 text-xs rounded-xl bg-slate-800/90 border border-indigo-700 text-white focus:outline-hidden focus:ring-2 focus:ring-amber-400"
                    >
                      <option value="custom_campaign">Custom Campaign / Promo (e.g. Back to School)</option>
                      <option value="hero_banner">Hero Banner</option>
                      <option value="categories">Categories</option>
                      <option value="featured_products">Featured Products</option>
                      <option value="promotional_banner">Promotional Banner</option>
                      <option value="new_arrivals">New Arrivals</option>
                      <option value="best_sellers">Best Sellers</option>
                      <option value="brands">Brand Showcase</option>
                      <option value="recommended">Recommended Products</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-bold text-indigo-200">Subtitle / Tagline</label>
                    <input
                      type="text"
                      value={newSectionSubtitle}
                      onChange={(e) => setNewSectionSubtitle(e.target.value)}
                      placeholder="e.g. Gear up with school bags, notebooks, pens & shoes"
                      className="w-full mt-1 px-3 py-2 text-xs rounded-xl bg-slate-800/90 border border-indigo-700 text-white focus:outline-hidden focus:ring-2 focus:ring-amber-400"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-indigo-200">Banner Graphic Image URL</label>
                    <input
                      type="text"
                      value={newBannerUrl}
                      onChange={(e) => setNewBannerUrl(e.target.value)}
                      placeholder="e.g. back-to-school.jpg or https://..."
                      className="w-full mt-1 px-3 py-2 text-xs rounded-xl bg-slate-800/90 border border-indigo-700 text-white font-mono focus:outline-hidden focus:ring-2 focus:ring-amber-400"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-indigo-200">Button Text</label>
                    <input
                      type="text"
                      value={newButtonText}
                      onChange={(e) => setNewButtonText(e.target.value)}
                      placeholder="e.g. Shop Back to School"
                      className="w-full mt-1 px-3 py-2 text-xs rounded-xl bg-slate-800/90 border border-indigo-700 text-white focus:outline-hidden focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-indigo-800/60">
                  <button
                    type="button"
                    onClick={() => setIsAddingNew(false)}
                    className="px-3.5 py-1.5 text-xs text-indigo-200 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateSection}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Section to Homepage</span>
                  </button>
                </div>
              </div>
            )}

            {/* List of Sections */}
            <div className="space-y-3">
              {localConfig.sections.map((sec, idx) => {
                const isEditing = activeEditingId === sec.id;
                const typeMeta = SECTION_TYPE_LABELS[sec.type] || { label: sec.type, bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-800 dark:text-slate-200' };

                return (
                  <div 
                    key={sec.id}
                    className={`bg-white dark:bg-slate-900 rounded-2xl border transition-all shadow-xs overflow-hidden ${
                      sec.enabled ? 'border-slate-200 dark:border-slate-800' : 'border-slate-200/60 dark:border-slate-800/60 opacity-60'
                    }`}
                  >
                    {/* Section Header Row */}
                    <div className="p-3.5 sm:p-4 flex items-center justify-between gap-3">
                      
                      {/* Controls Left: Up/Down + Toggle */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleMoveUp(idx)}
                          disabled={idx === 0}
                          className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 disabled:hover:text-slate-400 rounded-lg cursor-pointer"
                          title="Move section up"
                        >
                          <MoveUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveDown(idx)}
                          disabled={idx === localConfig.sections.length - 1}
                          className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 disabled:hover:text-slate-400 rounded-lg cursor-pointer"
                          title="Move section down"
                        >
                          <MoveDown className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleEnable(sec.id)}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            sec.enabled ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50' : 'text-slate-400 bg-slate-100 dark:bg-slate-800'
                          }`}
                          title={sec.enabled ? 'Disable section' : 'Enable section'}
                        >
                          {sec.enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                      </div>

                      {/* Section Title & Type Badge */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-black text-slate-600 dark:text-slate-400 flex items-center justify-center shrink-0">
                            #{idx + 1}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${typeMeta.bg} ${typeMeta.text}`}>
                            {typeMeta.label}
                          </span>
                          <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {sec.title}
                          </span>
                          {sec.status && (
                            <span className={`px-2 py-0.2 rounded-md text-[9px] font-extrabold uppercase ${
                              sec.status === 'active' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300' :
                              sec.status === 'scheduled' ? 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300' :
                              'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                            }`}>
                              {sec.status}
                            </span>
                          )}
                        </div>
                        {sec.subtitle && (
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">{sec.subtitle}</p>
                        )}
                      </div>

                      {/* Actions Right: Delete + Configure */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleDeleteSection(sec.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
                          title="Delete section"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setActiveEditingId(isEditing ? null : sec.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                            isEditing ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                          }`}
                        >
                          <Settings className="w-3.5 h-3.5" />
                          <span>{isEditing ? 'Close Settings' : 'Configure'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Section Detail Editing Drawer */}
                    {isEditing && (
                      <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 space-y-4 animate-in slide-in-from-top duration-200">
                        
                        {/* Section Name & Type */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Section Name</label>
                            <input
                              type="text"
                              value={sec.title}
                              onChange={(e) => handleUpdateSection(sec.id, { title: e.target.value })}
                              className="w-full mt-1 px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Section Type</label>
                            <select
                              value={sec.type}
                              onChange={(e) => handleUpdateSection(sec.id, { type: e.target.value as HomepageSectionType })}
                              className="w-full mt-1 px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500"
                            >
                              <option value="custom_campaign">Custom Campaign / Promo (e.g. Back to School)</option>
                              <option value="hero_banner">Hero Banner</option>
                              <option value="categories">Categories</option>
                              <option value="featured_products">Featured Products</option>
                              <option value="promotional_banner">Promotional Banner</option>
                              <option value="new_arrivals">New Arrivals</option>
                              <option value="best_sellers">Best Sellers</option>
                              <option value="brands">Brand Showcase</option>
                              <option value="recommended">Recommended Products</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Status</label>
                            <select
                              value={sec.status || 'active'}
                              onChange={(e) => handleUpdateSection(sec.id, { status: e.target.value as any })}
                              className="w-full mt-1 px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500"
                            >
                              <option value="active">Active (Live on Homepage)</option>
                              <option value="draft">Draft / Hidden</option>
                              <option value="scheduled">Scheduled (Date Window)</option>
                            </select>
                          </div>
                        </div>

                        {/* Subtitle & Category */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Subtitle / Tagline</label>
                            <input
                              type="text"
                              value={sec.subtitle || ''}
                              onChange={(e) => handleUpdateSection(sec.id, { subtitle: e.target.value })}
                              placeholder="e.g. Gear up for the new semester"
                              className="w-full mt-1 px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Target Category Filter</label>
                            <select
                              value={sec.category || ''}
                              onChange={(e) => handleUpdateSection(sec.id, { category: e.target.value })}
                              className="w-full mt-1 px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500"
                            >
                              <option value="">All Categories</option>
                              {categories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Start Date & End Date Scheduling */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                          <div>
                            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                              Start Date
                            </label>
                            <input
                              type="date"
                              value={sec.startDate || ''}
                              onChange={(e) => handleUpdateSection(sec.id, { startDate: e.target.value })}
                              className="w-full mt-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-rose-500" />
                              End Date
                            </label>
                            <input
                              type="date"
                              value={sec.endDate || ''}
                              onChange={(e) => handleUpdateSection(sec.id, { endDate: e.target.value })}
                              className="w-full mt-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                            />
                          </div>
                        </div>

                        {/* Banner & CTA Buttons Settings */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                              <Image className="w-3.5 h-3.5 text-indigo-500" />
                              Banner Graphic Image URL
                            </label>
                            <input
                              type="text"
                              value={sec.bannerUrl || ''}
                              onChange={(e) => handleUpdateSection(sec.id, { bannerUrl: e.target.value })}
                              placeholder="e.g. back-to-school.jpg"
                              className="w-full mt-1 px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-mono"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Button Text</label>
                            <input
                              type="text"
                              value={sec.buttonText || ''}
                              onChange={(e) => handleUpdateSection(sec.id, { buttonText: e.target.value })}
                              placeholder="e.g. Shop Back to School"
                              className="w-full mt-1 px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                              <Link className="w-3.5 h-3.5 text-indigo-500" />
                              Button Target URL / Category
                            </label>
                            <input
                              type="text"
                              value={sec.buttonUrl || ''}
                              onChange={(e) => handleUpdateSection(sec.id, { buttonUrl: e.target.value })}
                              placeholder="e.g. Electronics or /catalog"
                              className="w-full mt-1 px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium"
                            />
                          </div>
                        </div>

                        {/* Selected Products Picker */}
                        <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">
                                Selected Campaign Products ({ (sec.selectedProductIds || []).length } Selected)
                              </span>
                              <p className="text-[11px] text-slate-500">Pick specific items to display in this section (e.g. School Bag, Notebook, Pens, Shoes).</p>
                            </div>

                            {/* Product Search Box */}
                            <div className="relative min-w-[200px]">
                              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                              <input
                                type="text"
                                value={productSearch}
                                onChange={(e) => setProductSearch(e.target.value)}
                                placeholder="Search products..."
                                className="w-full pl-8 pr-3 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                              />
                            </div>
                          </div>

                          {/* Product Grid Checklist */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
                            {filteredProducts.map(prod => {
                              const isSelected = (sec.selectedProductIds || []).includes(prod.id);
                              return (
                                <button
                                  type="button"
                                  key={prod.id}
                                  onClick={() => handleToggleProductSelection(sec.id, prod.id)}
                                  className={`p-2 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                                    isSelected 
                                      ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-400 dark:border-indigo-600 text-slate-900 dark:text-white' 
                                      : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                                  }`}
                                >
                                  {isSelected ? (
                                    <CheckSquare className="w-4 h-4 text-indigo-600 shrink-0" />
                                  ) : (
                                    <Square className="w-4 h-4 text-slate-400 shrink-0" />
                                  )}

                                  <div className="min-w-0 flex-1">
                                    <span className="text-xs font-bold block truncate">{prod.name}</span>
                                    <span className="text-[10px] text-slate-400 block">${prod.price.toFixed(2)} · {prod.category}</span>
                                  </div>
                                </button>
                              );
                            })}
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

        {/* Footer */}
        <div className="p-4 sm:p-5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <p className="text-xs text-slate-500 hidden sm:block">
            Changes apply immediately to the customer-facing storefront homepage.
          </p>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save & Apply Homepage Layout</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

