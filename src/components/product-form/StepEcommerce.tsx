import React from 'react';
import { ProductEcommerce, SalesChannelsVisibility, StorefrontStatus, PublishTargets } from '../../types';
import { Globe, Search, RefreshCw, Star, MessageSquare, ExternalLink, Sparkles, AlertCircle, Store, Smartphone, Building2, CheckSquare, Square, FileEdit, Send, EyeOff, Calendar } from 'lucide-react';

interface StepEcommerceProps {
  productName: string;
  category: string;
  ecommerce: ProductEcommerce;
  setEcommerce: (val: ProductEcommerce) => void;
  salesChannels?: SalesChannelsVisibility;
  setSalesChannels?: (val: SalesChannelsVisibility) => void;
}

export default function StepEcommerce({
  productName,
  category,
  ecommerce,
  setEcommerce,
  salesChannels = { pos: true, ecommerce: true, mobileApp: false, wholesalePortal: false },
  setSalesChannels
}: StepEcommerceProps) {
  const storefrontStatus: StorefrontStatus = ecommerce.storefrontStatus || (ecommerce.published ? 'Published' : 'Draft');
  const publishTargets: PublishTargets = ecommerce.publishTargets || {
    website: salesChannels.ecommerce ?? true,
    mobileApp: salesChannels.mobileApp ?? false,
  };
  const scheduledPublishDate = ecommerce.scheduledPublishDate || '';

  const ecomCategory = ecommerce.category || category || 'General';
  const seoTitle = ecommerce.seoTitle || '';
  const seoDescription = ecommerce.seoDescription || '';
  const seoKeywords = ecommerce.seoKeywords || '';
  const slug = ecommerce.slug || '';
  const canonicalUrl = ecommerce.canonicalUrl || (slug ? `https://store.com/products/${slug}` : '');
  const featured = ecommerce.featured ?? false;
  const enableReviews = ecommerce.enableReviews ?? true;
  const summary = ecommerce.summary || '';

  const updateField = (field: keyof ProductEcommerce, value: any) => {
    setEcommerce({
      ...ecommerce,
      [field]: value
    });
  };

  const handleStatusChange = (newStatus: StorefrontStatus) => {
    const isPub = newStatus === 'Published';
    setEcommerce({
      ...ecommerce,
      storefrontStatus: newStatus,
      published: isPub,
    });

    if (setSalesChannels) {
      setSalesChannels({
        ...salesChannels,
        ecommerce: isPub ? publishTargets.website : false,
        mobileApp: isPub ? publishTargets.mobileApp : false,
      });
    }
  };

  const handleTargetToggle = (target: 'website' | 'mobileApp') => {
    const nextTargets = {
      ...publishTargets,
      [target]: !publishTargets[target]
    };
    setEcommerce({
      ...ecommerce,
      publishTargets: nextTargets
    });

    if (setSalesChannels) {
      if (target === 'website') {
        setSalesChannels({
          ...salesChannels,
          ecommerce: storefrontStatus === 'Published' ? nextTargets.website : salesChannels.ecommerce
        });
      } else if (target === 'mobileApp') {
        setSalesChannels({
          ...salesChannels,
          mobileApp: storefrontStatus === 'Published' ? nextTargets.mobileApp : salesChannels.mobileApp
        });
      }
    }
  };

  const toggleChannel = (channel: keyof SalesChannelsVisibility) => {
    if (!setSalesChannels) return;
    const nextVal = !salesChannels[channel];
    const updated = {
      ...salesChannels,
      [channel]: nextVal
    };
    setSalesChannels(updated);
    if (channel === 'ecommerce') {
      updateField('published', nextVal);
    }
  };

  const handleGenerateSlug = () => {
    const generated = (productName || 'product')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    setEcommerce({
      ...ecommerce,
      slug: generated,
      canonicalUrl: ecommerce.canonicalUrl || `https://store.com/products/${generated}`
    });
  };

  const handleAutoSeo = () => {
    const cleanName = productName || 'Samsung Galaxy Phone';
    const autoSlug = (productName || 'samsung-galaxy-phone-256gb')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const generatedCanonical = `https://store.com/products/${slug || autoSlug}`;
    const keywordsList = [cleanName, category || 'electronics', 'smartphone', 'mobile', 'buy online', 'free shipping'].filter(Boolean).join(', ');

    setEcommerce({
      ...ecommerce,
      seoTitle: `${cleanName} | Official Store`,
      seoDescription: `Buy ${cleanName} online. High performance, premium design, best price guarantee, and fast nationwide delivery.`,
      seoKeywords: keywordsList,
      slug: slug || autoSlug,
      canonicalUrl: canonicalUrl || generatedCanonical,
    });
  };

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs font-bold text-sm">
          7
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900">E-commerce & Web Channel Settings</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure online storefront publishing, search engine optimization (SEO), URL slug, and customer reviews.
          </p>
        </div>
      </div>

      {/* Sales Channels Selection (Requirement 22) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-2xs" id="sales-channels-selector-card">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Store className="w-4 h-4 text-indigo-600" />
              Sales Channels Visibility
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Select which sales channels can view and sell this product (e.g. POS store-only vs Online E-commerce).
            </p>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono">
            {Object.values(salesChannels).filter(Boolean).length} / 4 Channels
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* POS Channel */}
          <div 
            onClick={() => toggleChannel('pos')}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
              salesChannels.pos 
                ? 'bg-emerald-50/60 border-emerald-300 ring-1 ring-emerald-200' 
                : 'bg-slate-50 border-slate-200 opacity-70 hover:opacity-100'
            }`}
          >
            <input
              type="checkbox"
              checked={salesChannels.pos}
              onChange={() => toggleChannel('pos')}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                <Store className={`w-3.5 h-3.5 ${salesChannels.pos ? 'text-emerald-700' : 'text-slate-400'}`} />
                <span>POS (Point of Sale)</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                Physical in-store registers & cashier terminals
              </p>
            </div>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${salesChannels.pos ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
              {salesChannels.pos ? 'YES' : 'NO'}
            </span>
          </div>

          {/* Online Store Channel */}
          <div 
            onClick={() => toggleChannel('ecommerce')}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
              salesChannels.ecommerce 
                ? 'bg-indigo-50/60 border-indigo-300 ring-1 ring-indigo-200' 
                : 'bg-slate-50 border-slate-200 opacity-70 hover:opacity-100'
            }`}
          >
            <input
              type="checkbox"
              checked={salesChannels.ecommerce}
              onChange={() => toggleChannel('ecommerce')}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                <Globe className={`w-3.5 h-3.5 ${salesChannels.ecommerce ? 'text-indigo-700' : 'text-slate-400'}`} />
                <span>Online Store (E-commerce)</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                Web catalog & public storefront storefront
              </p>
            </div>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${salesChannels.ecommerce ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-200 text-slate-600'}`}>
              {salesChannels.ecommerce ? 'YES' : 'NO'}
            </span>
          </div>

          {/* Mobile App Channel */}
          <div 
            onClick={() => toggleChannel('mobileApp')}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
              salesChannels.mobileApp 
                ? 'bg-purple-50/60 border-purple-300 ring-1 ring-purple-200' 
                : 'bg-slate-50 border-slate-200 opacity-70 hover:opacity-100'
            }`}
          >
            <input
              type="checkbox"
              checked={salesChannels.mobileApp}
              onChange={() => toggleChannel('mobileApp')}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                <Smartphone className={`w-3.5 h-3.5 ${salesChannels.mobileApp ? 'text-purple-700' : 'text-slate-400'}`} />
                <span>Mobile App</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                iOS & Android customer ordering app
              </p>
            </div>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${salesChannels.mobileApp ? 'bg-purple-100 text-purple-800' : 'bg-slate-200 text-slate-600'}`}>
              {salesChannels.mobileApp ? 'YES' : 'NO'}
            </span>
          </div>

          {/* Wholesale Portal Channel */}
          <div 
            onClick={() => toggleChannel('wholesalePortal')}
            className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
              salesChannels.wholesalePortal 
                ? 'bg-amber-50/60 border-amber-300 ring-1 ring-amber-200' 
                : 'bg-slate-50 border-slate-200 opacity-70 hover:opacity-100'
            }`}
          >
            <input
              type="checkbox"
              checked={salesChannels.wholesalePortal}
              onChange={() => toggleChannel('wholesalePortal')}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                <Building2 className={`w-3.5 h-3.5 ${salesChannels.wholesalePortal ? 'text-amber-700' : 'text-slate-400'}`} />
                <span>Wholesale Portal</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                B2B wholesale buyers & distributor portal
              </p>
            </div>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${salesChannels.wholesalePortal ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-600'}`}>
              {salesChannels.wholesalePortal ? 'YES' : 'NO'}
            </span>
          </div>
        </div>
      </div>

      {/* Storefront Status & Publishing Workflow */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-2xs" id="storefront-status-panel">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Send className="w-4 h-4 text-indigo-600" />
              Storefront Publishing Status
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Allows the inventory team to create products in Draft mode before marketing publishes them.
            </p>
          </div>
          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full font-mono uppercase ${
            storefrontStatus === 'Published' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
            storefrontStatus === 'Scheduled' ? 'bg-indigo-100 text-indigo-800 border border-indigo-300' :
            storefrontStatus === 'Hidden' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
            'bg-slate-100 text-slate-700 border border-slate-300'
          }`}>
            Status: {storefrontStatus}
          </span>
        </div>

        {/* Status Radio Options Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* Draft */}
          <div
            onClick={() => handleStatusChange('Draft')}
            className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
              storefrontStatus === 'Draft'
                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <FileEdit className={`w-4 h-4 ${storefrontStatus === 'Draft' ? 'text-indigo-300' : 'text-slate-500'}`} />
              <input
                type="radio"
                name="storefrontStatusRadio"
                checked={storefrontStatus === 'Draft'}
                onChange={() => handleStatusChange('Draft')}
                className="h-3.5 w-3.5 text-indigo-600 cursor-pointer"
              />
            </div>
            <div>
              <div className="font-bold text-xs">Draft</div>
              <p className={`text-[10px] mt-0.5 leading-snug ${storefrontStatus === 'Draft' ? 'text-slate-300' : 'text-slate-500'}`}>
                Hidden from all storefronts
              </p>
            </div>
          </div>

          {/* Published */}
          <div
            onClick={() => handleStatusChange('Published')}
            className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
              storefrontStatus === 'Published'
                ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                : 'bg-emerald-50/60 border-emerald-200 text-emerald-950 hover:bg-emerald-100/80'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <Send className={`w-4 h-4 ${storefrontStatus === 'Published' ? 'text-emerald-200' : 'text-emerald-600'}`} />
              <input
                type="radio"
                name="storefrontStatusRadio"
                checked={storefrontStatus === 'Published'}
                onChange={() => handleStatusChange('Published')}
                className="h-3.5 w-3.5 text-emerald-600 cursor-pointer"
              />
            </div>
            <div>
              <div className="font-bold text-xs">Published</div>
              <p className={`text-[10px] mt-0.5 leading-snug ${storefrontStatus === 'Published' ? 'text-emerald-100' : 'text-emerald-800/80'}`}>
                Live on active channels
              </p>
            </div>
          </div>

          {/* Hidden */}
          <div
            onClick={() => handleStatusChange('Hidden')}
            className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
              storefrontStatus === 'Hidden'
                ? 'bg-amber-800 text-white border-amber-800 shadow-xs'
                : 'bg-amber-50/60 border-amber-200 text-amber-950 hover:bg-amber-100/80'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <EyeOff className={`w-4 h-4 ${storefrontStatus === 'Hidden' ? 'text-amber-200' : 'text-amber-600'}`} />
              <input
                type="radio"
                name="storefrontStatusRadio"
                checked={storefrontStatus === 'Hidden'}
                onChange={() => handleStatusChange('Hidden')}
                className="h-3.5 w-3.5 text-amber-600 cursor-pointer"
              />
            </div>
            <div>
              <div className="font-bold text-xs">Hidden</div>
              <p className={`text-[10px] mt-0.5 leading-snug ${storefrontStatus === 'Hidden' ? 'text-amber-100' : 'text-amber-800/80'}`}>
                Direct link only; unlisted
              </p>
            </div>
          </div>

          {/* Scheduled */}
          <div
            onClick={() => handleStatusChange('Scheduled')}
            className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
              storefrontStatus === 'Scheduled'
                ? 'bg-indigo-900 text-white border-indigo-900 shadow-xs'
                : 'bg-indigo-50/60 border-indigo-200 text-indigo-950 hover:bg-indigo-100/80'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <Calendar className={`w-4 h-4 ${storefrontStatus === 'Scheduled' ? 'text-indigo-200' : 'text-indigo-600'}`} />
              <input
                type="radio"
                name="storefrontStatusRadio"
                checked={storefrontStatus === 'Scheduled'}
                onChange={() => handleStatusChange('Scheduled')}
                className="h-3.5 w-3.5 text-indigo-600 cursor-pointer"
              />
            </div>
            <div>
              <div className="font-bold text-xs">Scheduled</div>
              <p className={`text-[10px] mt-0.5 leading-snug ${storefrontStatus === 'Scheduled' ? 'text-indigo-100' : 'text-indigo-800/80'}`}>
                Auto-publish on date
              </p>
            </div>
          </div>
        </div>

        {/* Scheduled Date Picker Input */}
        {storefrontStatus === 'Scheduled' && (
          <div className="p-3 bg-indigo-50/80 border border-indigo-200 rounded-xl space-y-1.5 animate-fadeIn">
            <label className="block text-[11px] font-bold text-indigo-900 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              Scheduled Publish Date & Time
            </label>
            <input
              type="datetime-local"
              value={scheduledPublishDate}
              onChange={(e) => updateField('scheduledPublishDate', e.target.value)}
              className="w-full px-3 py-2 bg-white border border-indigo-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
            <p className="text-[10px] text-indigo-700">
              This product will remain hidden until the designated timestamp.
            </p>
          </div>
        )}

        {/* Publish Targets Checkboxes (Website & Mobile App) */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-indigo-600" />
              Publish Channels:
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              Target Platforms
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Website Target */}
            <label 
              onClick={() => handleTargetToggle('website')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg border text-xs font-bold cursor-pointer transition-all select-none ${
                publishTargets.website
                  ? 'bg-white border-indigo-400 text-indigo-900 shadow-2xs'
                  : 'bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200/60'
              }`}
            >
              <input
                type="checkbox"
                checked={publishTargets.website}
                onChange={() => handleTargetToggle('website')}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <Globe className={`w-3.5 h-3.5 ${publishTargets.website ? 'text-indigo-600' : 'text-slate-400'}`} />
              <span>Website Storefront</span>
            </label>

            {/* Mobile App Target */}
            <label 
              onClick={() => handleTargetToggle('mobileApp')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg border text-xs font-bold cursor-pointer transition-all select-none ${
                publishTargets.mobileApp
                  ? 'bg-white border-purple-400 text-purple-900 shadow-2xs'
                  : 'bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200/60'
              }`}
            >
              <input
                type="checkbox"
                checked={publishTargets.mobileApp}
                onChange={() => handleTargetToggle('mobileApp')}
                className="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
              />
              <Smartphone className={`w-3.5 h-3.5 ${publishTargets.mobileApp ? 'text-purple-600' : 'text-slate-400'}`} />
              <span>Mobile App</span>
            </label>
          </div>
        </div>
      </div>

      {/* Featured & Review Toggles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Featured Product */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Star className="w-4 h-4 text-amber-500" />
              Featured Product
            </span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={featured}
                onChange={(e) => updateField('featured', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>
          <p className="text-[10px] text-slate-500">
            Promote on homepage hero banners & featured carousels
          </p>
        </div>

        {/* Enable Reviews */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-blue-600" />
              Customer Reviews
            </span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={enableReviews}
                onChange={(e) => updateField('enableReviews', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          <p className="text-[10px] text-slate-500">
            Allow verified buyers to submit ratings & feedback
          </p>
        </div>
      </div>

      {/* Search Engine Optimization (SEO) Metadata Panel */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-2xs">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Search className="w-4 h-4 text-indigo-600" />
              E-Commerce SEO Settings
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Customize search titles, descriptions, meta keywords, canonical links, and URL handles.
            </p>
          </div>
          <button
            type="button"
            onClick={handleAutoSeo}
            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" /> Auto-Generate SEO
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* SEO Title */}
          <div className="space-y-1 md:col-span-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                SEO Title
              </label>
              <span className="text-[10px] font-mono text-slate-400">{seoTitle.length}/60 chars</span>
            </div>
            <input
              type="text"
              value={seoTitle}
              onChange={(e) => updateField('seoTitle', e.target.value)}
              placeholder="e.g. Samsung Galaxy Phone - Official Store"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>

          {/* SEO Description */}
          <div className="space-y-1 md:col-span-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                SEO Description
              </label>
              <span className="text-[10px] font-mono text-slate-400">{seoDescription.length}/160 chars</span>
            </div>
            <textarea
              value={seoDescription}
              onChange={(e) => updateField('seoDescription', e.target.value)}
              rows={2}
              placeholder="e.g. Buy Samsung Galaxy Phone 256GB with AMOLED display, pro camera, and fast nationwide delivery."
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-200 resize-none"
            />
          </div>

          {/* SEO Keywords */}
          <div className="space-y-1 md:col-span-2">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
              SEO Keywords
            </label>
            <input
              type="text"
              value={seoKeywords}
              onChange={(e) => updateField('seoKeywords', e.target.value)}
              placeholder="e.g. samsung, galaxy, phone, 256gb, smartphone, 5g"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
            <p className="text-[10px] text-slate-400">Comma-separated meta keywords for search indexing and recommendations.</p>
          </div>

          {/* URL Slug */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                URL Slug
              </label>
              <button
                type="button"
                onClick={handleGenerateSlug}
                className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-2.5 h-2.5" /> Auto-Slug
              </button>
            </div>
            <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 overflow-hidden text-xs">
              <span className="px-2.5 text-slate-400 font-mono text-[10px] select-none">/products/</span>
              <input
                type="text"
                value={slug}
                onChange={(e) => {
                  const val = e.target.value;
                  updateField('slug', val);
                  if (!ecommerce.canonicalUrl || ecommerce.canonicalUrl.includes('/products/')) {
                    updateField('canonicalUrl', `https://store.com/products/${val}`);
                  }
                }}
                placeholder="e.g. samsung-galaxy-phone-256gb"
                className="flex-1 py-2 pr-3 bg-white border-l border-slate-200 font-mono text-indigo-950 font-bold focus:outline-none"
              />
            </div>
          </div>

          {/* Canonical URL */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                Canonical URL
              </label>
              <button
                type="button"
                onClick={() => updateField('canonicalUrl', `https://store.com/products/${slug || 'samsung-galaxy-phone-256gb'}`)}
                className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-2.5 h-2.5" /> Sync Canonical
              </button>
            </div>
            <input
              type="text"
              value={canonicalUrl}
              onChange={(e) => updateField('canonicalUrl', e.target.value)}
              placeholder="https://store.com/products/samsung-galaxy-phone-256gb"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
          </div>
        </div>

        {/* Short Summary */}
        <div className="space-y-1.5 pt-2 border-t border-slate-200/80">
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
            Short Storefront Tagline Summary
          </label>
          <textarea
            value={summary}
            onChange={(e) => updateField('summary', e.target.value)}
            rows={2}
            placeholder="Brief 1-2 sentence tagline shown below product title in web listings..."
            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-200 resize-none"
          />
        </div>

        {/* Live Search Engine Snippet Preview Card */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-indigo-600" />
              Google Search Result Snippet Preview:
            </span>
            {canonicalUrl && (
              <span className="text-[9px] font-mono text-slate-400 truncate max-w-[200px]">
                rel="canonical": {canonicalUrl}
              </span>
            )}
          </div>
          <div className="text-xs font-semibold text-blue-700 truncate hover:underline cursor-pointer">
            {seoTitle || productName || 'Samsung Galaxy Phone'}
          </div>
          <div className="text-[10px] text-emerald-800 font-mono truncate">
            {canonicalUrl || `https://store.com/products/${slug || 'samsung-galaxy-phone-256gb'}`}
          </div>
          <p className="text-[11px] text-slate-600 line-clamp-2">
            {seoDescription || 'Product description snippet will appear here in Google search engine results.'}
          </p>

          {seoKeywords && (
            <div className="pt-2 border-t border-slate-200/80 flex flex-wrap gap-1 items-center">
              <span className="text-[9px] font-bold uppercase text-slate-400 mr-1">Keywords:</span>
              {seoKeywords.split(',').map((kw, idx) => (
                <span key={idx} className="text-[9px] font-mono font-medium px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded">
                  {kw.trim()}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
