import React, { useState } from 'react';
import { useTenant } from '../../context/TenantContext';
import { Building2, Check, ChevronDown, Store, Globe, ArrowRight, ShieldCheck } from 'lucide-react';

interface TenantSwitcherProps {
  variant?: 'compact' | 'full' | 'pill';
}

export const TenantSwitcher: React.FC<TenantSwitcherProps> = ({ variant = 'compact' }) => {
  const { tenantConfig, tenantSlug, availableTenants, setTenantSlug, isLoading } = useTenant();
  const [isOpen, setIsOpen] = useState(false);

  const activeTenant = availableTenants.find((t) => t.slug === tenantSlug) || availableTenants[0];

  return (
    <div className="relative inline-block text-left" id="tenant-switcher-root">
      {/* Trigger Button */}
      {variant === 'pill' ? (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium border border-slate-700/80 transition-all cursor-pointer shadow-xs"
          id="btn-tenant-switcher-pill"
          aria-expanded={isOpen}
          aria-haspopup="true"
        >
          <Building2 className="w-3.5 h-3.5 text-indigo-400" />
          <span className="font-bold truncate max-w-[130px] sm:max-w-[160px]">{tenantConfig?.tenant?.name || activeTenant.name}</span>
          <span className="px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-mono text-[10px] font-bold">
            {tenantConfig?.currency?.symbol || activeTenant.currencySymbol}
          </span>
          <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 active:scale-98 text-slate-800 text-xs font-semibold transition-all border border-slate-200 cursor-pointer"
          id="btn-tenant-switcher-compact"
          aria-expanded={isOpen}
          aria-haspopup="true"
        >
          <Store className="w-4 h-4 text-indigo-600 shrink-0" />
          <div className="text-left hidden sm:block">
            <span className="block text-[10px] text-slate-400 font-medium leading-none">Selected Tenant Store</span>
            <span className="block text-xs font-bold text-slate-900 truncate max-w-[140px] leading-tight">
              {tenantConfig?.tenant?.name || activeTenant.name}
            </span>
          </div>
          <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ml-1 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      )}

      {/* Tenant Selection Dropdown / Overlay */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-slate-900/20 backdrop-blur-xs"
            onClick={() => setIsOpen(false)}
          />

          <div
            className="absolute right-0 sm:right-auto sm:left-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white shadow-2xl border border-slate-200 z-50 p-3 space-y-2 animate-in fade-in zoom-in-95 duration-150"
            id="tenant-switcher-dropdown"
          >
            <div className="px-3 py-2 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                  Multi-Tenant Storefront Switcher
                </h4>
                <p className="text-[11px] text-slate-500">Switch merchant tenant context in real-time</p>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                Server Isolated
              </span>
            </div>

            <div className="space-y-1.5 max-h-[360px] overflow-y-auto pr-0.5">
              {availableTenants.map((tenant) => {
                const isSelected = tenant.slug === tenantSlug;
                return (
                  <button
                    key={tenant.slug}
                    type="button"
                    onClick={() => {
                      setTenantSlug(tenant.slug);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-start justify-between gap-3 cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50/80 border-indigo-500/50 ring-1 ring-indigo-500/20 shadow-xs'
                        : 'bg-white border-slate-200/80 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900 truncate">{tenant.name}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                          {tenant.currencySymbol} ({tenant.currencyCode})
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-2 leading-snug">{tenant.description}</p>
                    </div>

                    <div className="shrink-0 flex items-center pt-0.5">
                      {isSelected ? (
                        <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center hover:bg-indigo-100 hover:text-indigo-600">
                          <ArrowRight className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {tenantConfig && (
              <div className="pt-2 border-t border-slate-100 px-2 flex items-center justify-between text-[11px] text-slate-500">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Store Code: <strong className="font-mono text-slate-800">{tenantConfig.store.code}</strong>
                </span>
                <span className="flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5 text-indigo-600" />
                  Locale: <strong className="text-slate-800">{tenantConfig.locale}</strong>
                </span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
