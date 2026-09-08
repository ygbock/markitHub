import React, { useState } from 'react';
import { 
  LayoutDashboard, Package, Smartphone, ShieldCheck, 
  Users, FileText, ShoppingBag, Terminal, Network, WifiOff, 
  ChevronLeft, ChevronRight, Coins, Database, RefreshCw, 
  CheckCircle2, AlertCircle, Sparkles, X, Menu, Settings,
  BarChart3, Sliders, MessageSquare
} from 'lucide-react';
import { StaffMember } from '../types';
import { EcommerceAdminTab } from './ecommerce/admin/ECommerceAdminPortal';
import { useCurrency } from '../context/CurrencyContext';

export type AdminSubTab = 'Dashboard' | 'Inventory' | 'POS' | 'CRM' | 'Invoices' | 'Reports' | 'Security' | 'Settings' | 'StorefrontManagement' | 'Reviews';

interface EnhancedSidebarProps {
  currentView: 'Admin' | 'ECommerce';
  onSwitchView: (view: 'Admin' | 'ECommerce') => void;
  adminSubTab: AdminSubTab;
  onSelectSubTab: (tab: AdminSubTab) => void;
  eCommerceActiveTab: EcommerceAdminTab;
  onSelectECommerceTab: (tab: EcommerceAdminTab) => void;
  activeStaff: StaffMember;
  dbStatus: 'connected' | 'syncing' | 'offline' | 'error';
  lastSynced: string;
  onManualSync: () => void;
  lowStockCount: number;
  totalOrdersCount: number;
  totalCustomersCount: number;
  pendingReviewsCount?: number;
  refundRequestsCount?: number;
  awaitingConfirmationCount?: number;
  deviceOffline: boolean;
  onToggleOfflineSim: () => void;
  offlineOrderCount: number;
  onOpenCurrencyModal: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export default function EnhancedSidebar({
  currentView,
  onSwitchView,
  adminSubTab,
  onSelectSubTab,
  eCommerceActiveTab,
  onSelectECommerceTab,
  activeStaff,
  dbStatus,
  lastSynced,
  onManualSync,
  lowStockCount,
  totalOrdersCount,
  totalCustomersCount,
  pendingReviewsCount = 0,
  refundRequestsCount = 0,
  awaitingConfirmationCount = 0,
  deviceOffline,
  onToggleOfflineSim,
  offlineOrderCount,
  onOpenCurrencyModal,
  isMobileOpen,
  onCloseMobile,
  isCollapsed,
  onToggleCollapse,
}: EnhancedSidebarProps) {
  const { currentCurrency } = useCurrency();
  const [isSyncingSpin, setIsSyncingSpin] = useState(false);
  const [isEcommerceMenuOpen, setIsEcommerceMenuOpen] = useState(false);

  const ecommerceSubTabs: { id: EcommerceAdminTab; label: string; }[] = [
    { id: 'Dashboard', label: 'Overview' },
    { id: 'Storefront', label: 'Storefront CMS' },
    { id: 'Catalog', label: 'Online Catalog' },
    { id: 'Orders', label: 'Fulfillment' },
    { id: 'Customers', label: 'Customers' },
    { id: 'Promotions', label: 'Promotions' },
    { id: 'Reviews', label: 'Reviews & Moderation' },
    { id: 'Analytics', label: 'Wishlist Analytics' },
    { id: 'Settings', label: 'Store Settings' },
  ];

  const handleManualSyncClick = () => {
    setIsSyncingSpin(true);
    onManualSync();
    setTimeout(() => setIsSyncingSpin(false), 800);
  };

  // Determine Invoices badge
  const invoicesBadge = refundRequestsCount > 0
    ? `${refundRequestsCount} RMA`
    : awaitingConfirmationCount > 0
      ? `${awaitingConfirmationCount} 48h`
      : totalOrdersCount > 0 ? `${totalOrdersCount}` : null;

  const invoicesBadgeColor = refundRequestsCount > 0
    ? 'bg-rose-500/30 text-rose-300 border-rose-500/40 animate-pulse'
    : awaitingConfirmationCount > 0
      ? 'bg-amber-500/30 text-amber-300 border-amber-500/40'
      : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';

  const navItems = [
    {
      id: 'Dashboard' as AdminSubTab,
      label: 'Command Center',
      icon: LayoutDashboard,
      badge: null,
      badgeColor: '',
    },
    {
      id: 'Inventory' as AdminSubTab,
      label: 'Inventory Telemetry',
      icon: Package,
      badge: lowStockCount > 0 ? `${lowStockCount} low` : null,
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    },
    {
      id: 'POS' as AdminSubTab,
      label: 'POS Register Terminal',
      icon: Smartphone,
      badge: 'Live',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    },
    {
      id: 'CRM' as AdminSubTab,
      label: 'CRM Customer Directory',
      icon: Users,
      badge: totalCustomersCount > 0 ? `${totalCustomersCount}` : null,
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    },
    {
      id: 'Invoices' as AdminSubTab,
      label: 'Orders & Invoices',
      icon: FileText,
      badge: invoicesBadge,
      badgeColor: invoicesBadgeColor,
    },
    {
      id: 'Reports' as AdminSubTab,
      label: 'Reports & Analytics',
      icon: BarChart3,
      badge: '26 Reports',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    },
    {
      id: 'Security' as AdminSubTab,
      label: 'User & Staff Management',
      icon: ShieldCheck,
      badge: activeStaff.role,
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    },
    {
      id: 'Settings' as AdminSubTab,
      label: 'System Settings',
      icon: Settings,
      badge: 'Core',
      badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    },
    {
      id: 'StorefrontManagement' as AdminSubTab,
      label: 'E-Commerce Suite',
      icon: ShoppingBag,
      badge: 'Portal',
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full justify-between select-none overflow-y-auto overflow-x-hidden no-scrollbar pr-0.5 space-y-4">
      
            {/* Top Section: Brand & Database Sync Status */}
      <div className="space-y-4">
        
        {/* Brand Header */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-indigo-800 flex items-center justify-center text-white font-black text-lg shadow-md shadow-indigo-900/40 shrink-0">
              N
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h1 className="text-sm font-extrabold text-white tracking-tight truncate">NEXUS ENTERPRISE</h1>
                </div>
                <p className="text-[10px] text-gray-400 font-mono truncate">POS & Commerce Suite</p>
              </div>
            )}
          </div>
          {/* Mobile close button */}
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-2 text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Database Connectivity Status Widget */}
        {!isCollapsed && (
          <div className="px-1">
            <button
              onClick={handleManualSyncClick}
              disabled={isSyncingSpin || dbStatus === 'offline'}
              className="w-full flex items-center justify-between bg-black/40 border border-white/5 rounded-xl p-2.5 transition-colors hover:bg-black/60 group"
            >
              <div className="flex items-center gap-2.5">
                <div className="relative flex h-2.5 w-2.5">
                  {(dbStatus === 'connected' || dbStatus === 'syncing') && !deviceOffline ? (
                    <>
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </>
                  ) : (
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                  )}
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-300">
                    {deviceOffline ? 'Local Mode' : dbStatus === 'connected' ? 'DB Connected' : 'Sync Error'}
                  </span>
                  <span className="text-[9px] text-gray-500 font-mono">
                    {deviceOffline ? 'Offline Cache' : lastSynced}
                  </span>
                </div>
              </div>
              <RefreshCw className={`w-3.5 h-3.5 text-gray-500 group-hover:text-gray-300 ${isSyncingSpin ? 'animate-spin' : ''}`} />
            </button>
          </div>
        )}

        {/* Navigation Core */}
        <div className="space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === 'Admin' && adminSubTab === item.id;
            
            return (
              <React.Fragment key={item.id}>
                <button
                  onClick={() => {
                    if (item.id === 'StorefrontManagement') {
                       if (currentView !== 'Admin') onSwitchView('Admin');
                       onSelectSubTab(item.id);
                       setIsEcommerceMenuOpen(!isEcommerceMenuOpen);
                    } else {
                       if (currentView !== 'Admin') onSwitchView('Admin');
                       onSelectSubTab(item.id);
                       onCloseMobile();
                    }
                  }}
                  title={isCollapsed ? item.label : undefined}
                  className={`w-full flex items-center justify-between rounded-xl transition-all ${
                    isCollapsed ? 'p-2.5 justify-center' : 'px-3 py-2.5 text-xs font-semibold'
                  } ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/30'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                  id={`sidebar-tab-${item.id.toLowerCase()}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </div>
                  {!isCollapsed && (
                    <div className="flex items-center gap-1.5">
                      {item.badge && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${isActive ? 'bg-indigo-700/50 text-indigo-100 border-indigo-500' : item.badgeColor}`}>
                          {item.badge}
                        </span>
                      )}
                      {item.id === 'StorefrontManagement' && (
                        <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${isEcommerceMenuOpen ? 'rotate-90' : ''}`} />
                      )}
                    </div>
                  )}
                </button>
                
                {/* E-Commerce Sub-menu */}
                {item.id === 'StorefrontManagement' && isEcommerceMenuOpen && !isCollapsed && (
                  <div className="pl-9 pr-2 mt-1 space-y-1 animate-in slide-in-from-top-2 duration-150">
                    {ecommerceSubTabs.map(subTab => (
                      <button
                        key={subTab.id}
                        onClick={() => {
                          onSelectECommerceTab(subTab.id);
                          onCloseMobile();
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${
                          eCommerceActiveTab === subTab.id
                            ? 'bg-indigo-500/20 text-indigo-300 font-bold'
                            : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                        }`}
                      >
                        {subTab.label}
                      </button>
                    ))}
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
      
      {/* Bottom Section: Operator info, Offline Simulator, Collapse Toggle */}
      <div className="space-y-3 pt-4 border-t border-white/10">
        
        {/* Offline POS test toggle */}
        {!isCollapsed ? (
          <div className="bg-white/5 p-2.5 rounded-2xl border border-white/5 space-y-1.5" id="sidebar-offline-box">
            <div className="flex items-center justify-between text-[10px]">
              <span className="font-bold text-gray-400 uppercase tracking-wider">Offline Cache Sync</span>
              {deviceOffline && (
                <span className="text-rose-400 font-mono font-bold animate-pulse">OFFLINE</span>
              )}
            </div>
            <button
              onClick={onToggleOfflineSim}
              className={`w-full py-1.5 text-[10px] font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                deviceOffline 
                  ? 'bg-rose-600 text-white animate-pulse shadow-xs' 
                  : 'bg-white/10 text-gray-300 hover:bg-white/15'
              }`}
            >
              {deviceOffline ? (
                <>
                  <WifiOff className="w-3.5 h-3.5" /> RECONNECT & SYNC ({offlineOrderCount})
                </>
              ) : (
                <>
                  <Network className="w-3.5 h-3.5" /> TEST OFFLINE POS
                </>
              )}
            </button>
          </div>
        ) : (
          <button
            onClick={onToggleOfflineSim}
            title={deviceOffline ? 'Reconnect Offline POS' : 'Test Offline POS'}
            className={`w-10 h-10 mx-auto rounded-xl flex items-center justify-center ${
              deviceOffline ? 'bg-rose-600 text-white animate-pulse' : 'bg-white/5 hover:bg-white/10 text-gray-400'
            }`}
          >
            {deviceOffline ? <WifiOff className="w-4 h-4" /> : <Network className="w-4 h-4" />}
          </button>
        )}

        {/* Active Staff Operator Card */}
        {!isCollapsed ? (
          <div className="flex items-center justify-between p-2.5 bg-black/30 rounded-2xl border border-white/5 text-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={activeStaff.avatar}
                alt={activeStaff.name}
                className="w-8 h-8 rounded-xl object-cover ring-1 ring-white/20 shrink-0"
              />
              <div className="min-w-0">
                <span className="font-bold text-white block truncate leading-tight">{activeStaff.name}</span>
                <span className="text-[10px] text-indigo-400 block font-mono">{activeStaff.role}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <img
              src={activeStaff.avatar}
              alt={activeStaff.name}
              title={`${activeStaff.name} (${activeStaff.role})`}
              className="w-9 h-9 rounded-xl object-cover ring-2 ring-indigo-500/50"
            />
          </div>
        )}

        {/* Desktop Collapse / Expand Toggle Button */}
        <div className="hidden lg:flex justify-end pt-1">
          <button
            onClick={onToggleCollapse}
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            className="w-full py-1.5 flex items-center justify-center gap-2 text-xs font-semibold text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all"
            id="sidebar-collapse-toggle-btn"
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4" />
                <span className="text-[11px]">Collapse Rail</span>
              </>
            )}
          </button>
        </div>

      </div>

    </div>
  );

  return (
    <>
      {/* 1. Desktop Fixed / Sticky Sidebar */}
      <aside
        className={`hidden lg:flex fixed top-0 left-0 bottom-0 z-30 bg-slate-900 border-r border-white/5 p-4 text-white flex-col transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
        id="desktop-fixed-sidebar"
      >
        {sidebarContent}
      </aside>

      {/* 2. Mobile Drawer Sidebar (with backdrop overlay) */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex" id="mobile-sidebar-drawer">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200"
            onClick={onCloseMobile}
          />
          {/* Drawer content */}
          <div className="relative w-72 max-w-[85vw] bg-slate-900 border-r border-white/10 p-5 text-white flex flex-col h-full shadow-2xl animate-in slide-in-from-left duration-200 z-10">
            {sidebarContent}
          </div>
        </div>
      )}

      {/* 3. Mobile Sticky Bottom Navigation Bar for ultra-fast thumb navigation */}
      <div 
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-white/10 flex justify-around items-center py-2 px-2 shadow-2xl"
        id="mobile-bottom-nav"
      >
        <button
          onClick={() => {
            if (currentView !== 'Admin') onSwitchView('Admin');
            onSelectSubTab('Dashboard');
          }}
          className={`flex flex-col items-center gap-0.5 px-2.5 py-1 rounded-xl text-[10px] font-bold ${
            currentView === 'Admin' && adminSubTab === 'Dashboard'
              ? 'text-indigo-400'
              : 'text-gray-400'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Center</span>
        </button>

        <button
          onClick={() => {
            if (currentView !== 'Admin') onSwitchView('Admin');
            onSelectSubTab('Inventory');
          }}
          className={`flex flex-col items-center gap-0.5 px-2.5 py-1 rounded-xl text-[10px] font-bold relative ${
            currentView === 'Admin' && adminSubTab === 'Inventory'
              ? 'text-indigo-400'
              : 'text-gray-400'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Stock</span>
          {lowStockCount > 0 && (
            <span className="absolute top-0 right-1 w-2 h-2 rounded-full bg-rose-500" />
          )}
        </button>

        <button
          onClick={() => {
            if (currentView !== 'Admin') onSwitchView('Admin');
            onSelectSubTab('POS');
          }}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-[10px] font-bold ${
            currentView === 'Admin' && adminSubTab === 'POS'
              ? 'text-indigo-400 bg-indigo-500/10'
              : 'text-gray-400'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          <span>POS</span>
        </button>

        <button
          onClick={() => {
            if (currentView !== 'Admin') onSwitchView('Admin');
            onSelectSubTab('CRM');
          }}
          className={`flex flex-col items-center gap-0.5 px-2.5 py-1 rounded-xl text-[10px] font-bold ${
            currentView === 'Admin' && adminSubTab === 'CRM'
              ? 'text-indigo-400'
              : 'text-gray-400'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>CRM</span>
        </button>

        <button
          onClick={() => onSwitchView(currentView === 'Admin' ? 'ECommerce' : 'Admin')}
          className={`flex flex-col items-center gap-0.5 px-2.5 py-1 rounded-xl text-[10px] font-bold ${
            currentView === 'ECommerce' ? 'text-indigo-400' : 'text-gray-400'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Store</span>
        </button>
      </div>
    </>
  );
}
