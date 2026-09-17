import React, { useState } from 'react';
import {
  Store,
  ChevronDown,
  Menu,
  X,
  Wifi,
  WifiOff,
  Sun,
  Moon,
  Clock,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { tenantNavigation } from '../navigation/navigationRegistries';
import { useTenant } from '../context/TenantContext';
import { useTheme } from '../design-system/ThemeContext';
import { StaffMember, hasPermission, StaffRole } from '../utils/permissions';
import { Avatar } from '../components/ui/Avatar';
import { SuspendedState } from '../components/ui/SuspendedState';

export interface TenantShellProps {
  children: React.ReactNode;
  activePath?: string;
  onNavigate?: (path: string) => void;
  staff?: StaffMember | null;
  onLogout?: () => void;
  isOnline?: boolean;
  shiftStatus?: 'open' | 'closed';
  onToggleShift?: () => void;
}

export const TenantShell: React.FC<TenantShellProps> = ({
  children,
  activePath = '/tenant/pos',
  onNavigate = (path) => {
    if (typeof window !== 'undefined') window.location.href = path;
  },
  staff,
  onLogout,
  isOnline = true,
  shiftStatus = 'open',
  onToggleShift,
}) => {
  const { tenantSlug, availableTenants, switchBranch, capabilities, hasCapability } = useTenant();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);

  // Check if tenant is suspended
  const isSuspended = (capabilities as any)?.includes?.('suspended') || false;
  if (isSuspended) {
    return (
      <SuspendedState
        entityType="tenant"
        reason="This tenant workspace has been suspended by platform administration."
        onLogout={onLogout}
      />
    );
  }

  const currentTenantInfo = availableTenants.find((t) => t.slug === tenantSlug) || {
    name: tenantSlug,
    slug: tenantSlug,
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* Top Operational Bar */}
      <header className="sticky top-0 z-30 h-16 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 sm:px-6 flex items-center justify-between">
        {/* Left: Brand & Operational Branch Switcher */}
        <div className="flex items-center gap-3 sm:gap-6">
          <button
            type="button"
            onClick={() => onNavigate('/tenant/dashboard')}
            className="flex items-center gap-2.5 focus:outline-none"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black text-sm">
              M
            </div>
            <div className="hidden sm:block text-left">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 block leading-none">
                Tenant Portal
              </span>
              <span className="text-sm font-semibold text-white leading-tight">
                {currentTenantInfo.name}
              </span>
            </div>
          </button>

          {/* Operational Branch Switcher */}
          <div className="relative">
            <button
              type="button"
              aria-label="Operational Branch Switcher"
              onClick={() => setBranchDropdownOpen(!branchDropdownOpen)}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-xs font-medium text-slate-200 transition-colors"
            >
              <Store className="w-3.5 h-3.5 text-indigo-400" />
              <span className="max-w-[120px] sm:max-w-[160px] truncate">{currentTenantInfo.name}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {branchDropdownOpen && (
              <div className="absolute left-0 mt-2 w-64 rounded-xl bg-slate-900 border border-slate-700 shadow-xl py-1.5 z-50">
                <p className="text-[10px] uppercase font-bold text-slate-400 px-3 py-1 tracking-wider">
                  Switch Operational Branch
                </p>
                {availableTenants.map((tenant) => (
                  <button
                    key={tenant.slug}
                    type="button"
                    onClick={() => {
                      switchBranch(tenant.slug);
                      setBranchDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs transition-colors flex flex-col ${
                      tenant.slug === tenantSlug
                        ? 'bg-indigo-600/20 text-indigo-400 font-semibold'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span>{tenant.name}</span>
                    <span className="text-[10px] text-slate-500">{tenant.currencyCode} · {tenant.slug}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Operational Status & Controls */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Shift status pill */}
          <button
            type="button"
            onClick={onToggleShift}
            className={`hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
              shiftStatus === 'open'
                ? 'bg-emerald-950/60 border-emerald-800/80 text-emerald-300'
                : 'bg-amber-950/60 border-amber-800/80 text-amber-300'
            }`}
          >
            <Clock className="w-3 h-3" />
            <span>Shift: {shiftStatus === 'open' ? 'Active' : 'Closed'}</span>
          </button>

          {/* Offline/Online indicator */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
              isOnline
                ? 'bg-slate-800/80 border-slate-700 text-slate-300'
                : 'bg-rose-950/60 border-rose-800/80 text-rose-300'
            }`}
          >
            {isOnline ? (
              <Wifi className="w-3 h-3 text-emerald-400" />
            ) : (
              <WifiOff className="w-3 h-3 text-rose-400 animate-pulse" />
            )}
            <span className="hidden sm:inline">{isOnline ? 'Online' : 'Offline Mode'}</span>
          </div>

          {/* Theme Mode Switcher */}
          <button
            type="button"
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            aria-label="Toggle theme"
          >
            {resolvedTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Active staff avatar */}
          <div className="flex items-center gap-2.5 pl-2 border-l border-slate-800">
            <Avatar name={staff?.name || 'Staff User'} size="sm" />
            <div className="hidden lg:block text-left">
              <p className="text-xs font-semibold text-slate-200 leading-tight">
                {staff?.name || 'Staff User'}
              </p>
              <span className="text-[10px] text-indigo-400 font-mono">
                {staff?.role || 'Cashier'}
              </span>
            </div>
          </div>

          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
              title="Sign Out"
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            aria-label="Toggle mobile menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Main Container: Sidebar + Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Persistent Desktop Sidebar */}
        <aside
          id="desktop-fixed-sidebar"
          className="hidden md:flex flex-col w-60 bg-slate-900 border-r border-slate-800 flex-shrink-0 py-4 px-3 overflow-y-auto no-scrollbar space-y-6"
        >
          {tenantNavigation.map((group) => {
            // Filter items by capability & permission
            const visibleItems = group.items.filter((item) => {
              if (item.capability && !hasCapability(item.capability)) {
                return false;
              }
              if (item.permission && staff && !hasPermission(staff, item.permission)) {
                return false;
              }
              return true;
            });

            if (visibleItems.length === 0) return null;

            return (
              <div key={group.id} className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3 py-1">
                  {group.title}
                </p>
                {visibleItems.map((item) => {
                  const isActive = activePath === item.path || activePath.startsWith(item.path + '/');
                  const Icon = item.icon as any;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onNavigate(item.path || '/tenant')}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors text-left ${
                        isActive
                          ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                          : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/70'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        {Icon && <Icon className="w-4 h-4" />}
                        <span>{item.label}</span>
                      </div>
                      {item.badge !== undefined && (
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-indigo-500 text-white">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </aside>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 md:hidden bg-slate-950/80 backdrop-blur-xs flex">
            <div className="w-72 bg-slate-900 h-full p-4 border-r border-slate-800 overflow-y-auto space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                  Operations Menu
                </span>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {tenantNavigation.map((group) => {
                const visibleItems = group.items.filter((item) => {
                  if (item.capability && !hasCapability(item.capability)) return false;
                  if (item.permission && staff && !hasPermission(staff, item.permission)) return false;
                  return true;
                });
                if (visibleItems.length === 0) return null;

                return (
                  <div key={group.id} className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3 py-1">
                      {group.title}
                    </p>
                    {visibleItems.map((item) => {
                      const isActive = activePath === item.path;
                      const Icon = item.icon as any;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setMobileMenuOpen(false);
                            onNavigate(item.path || '/tenant');
                          }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-left ${
                            isActive
                              ? 'bg-indigo-600 text-white font-semibold'
                              : 'text-slate-400 hover:text-white hover:bg-slate-800'
                          }`}
                        >
                          {Icon && <Icon className="w-4 h-4" />}
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
            <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
          </div>
        )}

        {/* Operational Viewport */}
        <main className="flex-1 overflow-y-auto min-w-0 bg-slate-950">
          {children}
        </main>
      </div>
    </div>
  );
};

export default TenantShell;
