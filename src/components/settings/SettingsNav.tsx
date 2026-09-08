import React, { useState } from 'react';
import { 
  Building2, Coins, Receipt, FileText, Smartphone, 
  Package, AlertTriangle, ShoppingCart, Truck, CreditCard, 
  Bell, Shield, Cpu, Percent, Search, ArrowRight, Lock, 
  ChevronDown, Filter, X, Check, Layout
} from 'lucide-react';
import { StaffMember } from '../../types';

export type SettingsSection = 
  | 'business'
  | 'currency'
  | 'tax'
  | 'receipt'
  | 'invoice'
  | 'pos'
  | 'inventory'
  | 'lowstock'
  | 'order'
  | 'delivery'
  | 'payments'
  | 'notifications'
  | 'security'
  | 'integrations'
  | 'homepage';

export interface SectionItem {
  id: SettingsSection;
  label: string;
  category: 'General' | 'Finance' | 'Sales' | 'Operations' | 'System';
  icon: React.ElementType;
  description: string;
}

export const SECTIONS: SectionItem[] = [
  { id: 'business', label: 'Business Info', category: 'General', icon: Building2, description: 'Store identity, address, tax ID and contacts' },
  { id: 'currency', label: 'Currency & Format', category: 'General', icon: Coins, description: 'Primary currency and decimal formatting' },
  { id: 'homepage', label: 'Storefront Homepage CMS', category: 'Sales', icon: Layout, description: 'Content-driven layout, hero banners and promo offers' },
  { id: 'tax', label: 'Tax & Fiscal Rates', category: 'Finance', icon: Percent, description: 'VAT/GST sales tax and exemption rules' },
  { id: 'receipt', label: 'Receipt & Printing', category: 'Sales', icon: Receipt, description: 'Thermal slip design and auto-print triggers' },
  { id: 'invoice', label: 'Invoice Series', category: 'Finance', icon: FileText, description: 'Sequential prefixes and padding rules' },
  { id: 'pos', label: 'POS Terminal', category: 'Sales', icon: Smartphone, description: 'Audio chimes, cash presets and overrides' },
  { id: 'inventory', label: 'Inventory Rules', category: 'Operations', icon: Package, description: 'Negative stock lock and valuation model' },
  { id: 'lowstock', label: 'Low-Stock Alerts', category: 'Operations', icon: AlertTriangle, description: 'Global reorder points and danger limits' },
  { id: 'order', label: 'Order Settings', category: 'Sales', icon: ShoppingCart, description: 'Prefixes, channels and auto-archival' },
  { id: 'delivery', label: 'Delivery & Pickup', category: 'Operations', icon: Truck, description: 'Dispatch zones, rates and couriers' },
  { id: 'payments', label: 'Payment Gateways', category: 'Finance', icon: CreditCard, description: 'Tender options, contactless and mobile money' },
  { id: 'notifications', label: 'Alerts & Email', category: 'System', icon: Bell, description: 'Supervisor emails, SMS and daily digests' },
  { id: 'security', label: 'Roles & Security', category: 'System', icon: Shield, description: 'Supervisor PIN, session timeout and 2FA' },
  { id: 'integrations', label: 'Integrations & APIs', category: 'System', icon: Cpu, description: 'Barcode scanner, webhooks and AI Engine' },
];

const CATEGORIES = ['All', 'General', 'Finance', 'Sales', 'Operations', 'System'] as const;
type CategoryFilter = typeof CATEGORIES[number];

interface SettingsNavProps {
  activeSection: SettingsSection;
  onSelectSection: (section: SettingsSection) => void;
  activeStaff: StaffMember;
  terminalName: string;
}

export default function SettingsNav({
  activeSection,
  onSelectSection,
  activeStaff,
  terminalName
}: SettingsNavProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('All');
  const [isMobileSelectorOpen, setIsMobileSelectorOpen] = useState(false);

  const activeItem = SECTIONS.find(s => s.id === activeSection) || SECTIONS[0];
  const ActiveIcon = activeItem.icon;

  // Filter sections by search and category
  const filteredSections = SECTIONS.filter(s => {
    const matchesCategory = selectedCategory === 'All' || s.category === selectedCategory;
    const matchesSearch = 
      s.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-4">
      
      {/* ========================================================================= */}
      {/* MOBILE & TABLET NAVIGATION DOCK (< lg) */}
      {/* ========================================================================= */}
      <div className="lg:hidden space-y-3">
        
        {/* Category Horizontal Filter Carousel */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar -mx-1 px-1">
          {CATEGORIES.map((cat) => {
            const count = cat === 'All' ? SECTIONS.length : SECTIONS.filter(s => s.category === cat).length;
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white border border-gray-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>{cat}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Active Section Bar with Jump Button */}
        <div className="bg-white rounded-2xl border border-gray-200 p-3 shadow-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-700 shrink-0">
              <ActiveIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-slate-900 truncate">{activeItem.label}</span>
                <span className="px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded text-[10px] font-bold">
                  {activeItem.category}
                </span>
              </div>
              <p className="text-[11px] text-gray-500 truncate">{activeItem.description}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsMobileSelectorOpen(true)}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer"
          >
            <span>Switch</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-600" />
          </button>
        </div>

        {/* Horizontal Fast Scrollable Tabs Ribbon */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar -mx-1 px-1">
          {filteredSections.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectSection(item.id)}
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shrink-0 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white border border-gray-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-300' : 'text-slate-500'}`} />
                <span className="whitespace-nowrap">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DESKTOP SIDEBAR (>= lg) */}
      {/* ========================================================================= */}
      <div className="hidden lg:block space-y-4">
        
        {/* Search Settings Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search 14 setting modules..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 focus:outline-hidden shadow-2xs"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-bold cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* Category Pill Filters */}
        <div className="flex items-center gap-1 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Section Navigation List */}
        <div className="bg-white rounded-2xl border border-gray-200 p-2 shadow-2xs space-y-1 max-h-[calc(100vh-280px)] overflow-y-auto">
          {filteredSections.length === 0 ? (
            <div className="p-4 text-center text-xs text-gray-400 font-medium">
              No matching settings sections found.
            </div>
          ) : (
            filteredSections.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectSection(item.id)}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between group cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                  id={`settings-tab-btn-${item.id}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-1.5 rounded-lg shrink-0 ${
                      isActive ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <div className="truncate">{item.label}</div>
                      <div className={`text-[10px] font-normal truncate ${isActive ? 'text-gray-300' : 'text-gray-400'}`}>
                        {item.category}
                      </div>
                    </div>
                  </div>
                  <ArrowRight className={`w-3.5 h-3.5 shrink-0 transition-transform ${
                    isActive ? 'text-indigo-300 translate-x-0.5' : 'text-gray-300 group-hover:text-gray-400'
                  }`} />
                </button>
              );
            })
          )}
        </div>

        {/* Security Policy Card */}
        <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-4 rounded-2xl border border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider font-mono text-indigo-300 font-bold flex items-center gap-1.5">
              <Lock className="w-3 h-3" /> Security Policy
            </span>
            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-md text-[10px] font-mono font-bold">
              Admin Locked
            </span>
          </div>
          <p className="text-xs text-gray-300 leading-relaxed">
            Logged in as <strong className="text-white">{activeStaff.name}</strong> ({activeStaff.role}). Changes trigger telemetry audit records.
          </p>
          <div className="pt-1 text-[11px] font-mono text-gray-400 flex items-center justify-between border-t border-white/10">
            <span>Terminal:</span>
            <span className="text-white font-bold truncate max-w-[120px]">{terminalName}</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MOBILE SECTION SELECTOR MODAL / BOTTOM SHEET */}
      {/* ========================================================================= */}
      {isMobileSelectorOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom-5 sm:zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-black text-slate-900 text-base">Select Settings Domain</h3>
                <p className="text-xs text-gray-500">Jump directly to any of the 14 configuration sections</p>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileSelectorOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-700 rounded-xl hover:bg-gray-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Category Filter Inside Modal */}
            <div className="px-4 py-2 bg-slate-50 border-b border-gray-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-slate-900 text-white'
                      : 'bg-white border border-gray-200 text-slate-600'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* List */}
            <div className="p-3 overflow-y-auto space-y-1.5 flex-1">
              {filteredSections.map((item) => {
                const Icon = item.icon;
                const isSelected = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onSelectSection(item.id);
                      setIsMobileSelectorOpen(false);
                    }}
                    className={`w-full text-left p-3 rounded-xl flex items-center justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`p-2 rounded-xl shrink-0 ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-white text-slate-700 shadow-3xs'
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-bold truncate">{item.label}</div>
                        <div className={`text-[10px] truncate ${isSelected ? 'text-gray-300' : 'text-gray-500'}`}>
                          {item.description}
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 ml-2" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-gray-100 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setIsMobileSelectorOpen(false)}
                className="w-full sm:w-auto px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
