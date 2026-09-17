import React, { useState } from 'react';
import {
  Shield,
  ShieldCheck,
  Activity,
  LogOut,
  ChevronRight,
  Menu,
  X,
  Database,
  ExternalLink,
} from 'lucide-react';
import { superAdminNavigation } from '../navigation/navigationRegistries';
import { Avatar } from '../components/ui/Avatar';
import { Badge } from '../components/shared/Badge';

export interface SuperAdminShellProps {
  children: React.ReactNode;
  activePath?: string;
  onNavigate?: (path: string) => void;
  adminName?: string;
  adminEmail?: string;
  onLogout?: () => void;
  environmentName?: string;
}

/**
 * SuperAdminShell provides a completely isolated platform governance shell.
 * It uses 5 authoritative platform governance navigation groups and has
 * zero merchant/tenant operational clutter.
 */
export const SuperAdminShell: React.FC<SuperAdminShellProps> = ({
  children,
  activePath = '/superadmin/tenants',
  onNavigate = (path) => {
    if (typeof window !== 'undefined') window.location.href = path;
  },
  adminName = 'Platform Super Admin',
  adminEmail = 'admin@mikithub.com',
  onLogout,
  environmentName = 'Production Core',
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans antialiased">
      {/* Super Admin Platform Control Bar */}
      <header className="sticky top-0 z-40 h-16 bg-slate-900 border-b border-rose-950/60 px-4 sm:px-6 flex items-center justify-between shadow-md">
        {/* Left: Security Identity & Environment */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-rose-600 flex items-center justify-center text-white font-black text-sm shadow-sm">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm tracking-tight text-white">
                  MikitHub Platform Admin
                </span>
                <Badge variant="danger" size="sm">
                  Super Admin
                </Badge>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                Environment: {environmentName}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Security Badge & Profile */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs text-slate-300">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>Systems Normal</span>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('/discover')}
            className="hidden md:inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            <span>Public Site</span>
            <ExternalLink className="w-3 h-3" />
          </button>

          <div className="flex items-center gap-2.5 pl-3 border-l border-slate-800">
            <Avatar name={adminName} size="sm" />
            <div className="hidden lg:block text-left">
              <p className="text-xs font-semibold text-white leading-tight">{adminName}</p>
              <p className="text-[10px] text-slate-400 leading-tight truncate max-w-[120px]">
                {adminEmail}
              </p>
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

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            aria-label="Toggle admin menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Main Container: Platform Sidebar + Viewport */}
      <div className="flex-1 flex overflow-hidden">
        {/* 5 Governance Groups Desktop Sidebar */}
        <aside className="hidden md:flex flex-col w-64 bg-slate-900 border-r border-slate-800 flex-shrink-0 py-4 px-3 overflow-y-auto no-scrollbar space-y-6">
          {superAdminNavigation.map((group) => (
            <div key={group.id} className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3 py-1">
                {group.title}
              </p>
              {group.items.map((item) => {
                const isActive = activePath === item.path || activePath.startsWith(item.path + '/');
                const Icon = item.icon as any;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onNavigate(item.path || '/superadmin')}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors text-left ${
                      isActive
                        ? 'bg-rose-600/20 text-rose-300 font-semibold border border-rose-500/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {Icon && <Icon className="w-4 h-4" />}
                      <span>{item.label}</span>
                    </div>
                    {isActive && <ChevronRight className="w-3.5 h-3.5 text-rose-400" />}
                  </button>
                );
              })}
            </div>
          ))}
        </aside>

        {/* Mobile Sidebar */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 md:hidden bg-slate-950/80 backdrop-blur-xs flex">
            <div className="w-72 bg-slate-900 h-full p-4 border-r border-slate-800 overflow-y-auto space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-400">
                  Platform Governance
                </span>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {superAdminNavigation.map((group) => (
                <div key={group.id} className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3 py-1">
                    {group.title}
                  </p>
                  {group.items.map((item) => {
                    const isActive = activePath === item.path;
                    const Icon = item.icon as any;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          onNavigate(item.path || '/superadmin');
                        }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-left ${
                          isActive
                            ? 'bg-rose-600/20 text-rose-300 font-semibold'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                      >
                        {Icon && <Icon className="w-4 h-4" />}
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
          </div>
        )}

        {/* Super Admin Content Viewport */}
        <main className="flex-1 overflow-y-auto min-w-0 bg-slate-950 p-6 sm:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default SuperAdminShell;
