import React from 'react';
import {
  ShoppingBag,
  Calendar,
  Heart,
  MapPinned,
  MessageSquare,
  User,
  LogOut,
  ArrowLeft,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react';
import { customerNavigation } from '../navigation/navigationRegistries';
import { Avatar } from '../components/ui/Avatar';

export interface CustomerShellProps {
  children: React.ReactNode;
  activePath?: string;
  onNavigate?: (path: string) => void;
  userName?: string;
  userEmail?: string;
  userAvatar?: string;
  onLogout?: () => void;
}

export const CustomerShell: React.FC<CustomerShellProps> = ({
  children,
  activePath = '/account/orders',
  onNavigate = (path) => {
    if (typeof window !== 'undefined') window.location.href = path;
  },
  userName = 'Customer User',
  userEmail = 'shopper@example.com',
  userAvatar,
  onLogout,
}) => {
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Customer Header */}
      <header className="sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => onNavigate('/discover')}
                className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Discovery</span>
              </button>

              <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />

              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                  M
                </div>
                <span className="font-bold text-sm tracking-tight">Customer Portal</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2.5">
                <Avatar src={userAvatar} name={userName} size="sm" />
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-semibold leading-tight">{userName}</p>
                  <p className="text-[10px] text-slate-400 leading-tight truncate max-w-[140px]">{userEmail}</p>
                </div>
              </div>

              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition-colors ml-2"
                  title="Sign out"
                  aria-label="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}

              <button
                type="button"
                onClick={() => setMobileNavOpen(!mobileNavOpen)}
                className="md:hidden p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                aria-label="Toggle navigation"
              >
                {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container with Sidebar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 flex flex-col md:flex-row gap-8">
        {/* Desktop Sidebar */}
        <aside className="hidden md:block w-64 flex-shrink-0">
          <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-3 py-2">
              My Account
            </p>
            {customerNavigation.map((item) => {
              const isActive = activePath === item.path || activePath.startsWith(item.path + '/');
              const Icon = item.icon as any;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.path || '/account')}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-colors text-left ${
                    isActive
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {Icon && <Icon className="w-4 h-4" />}
                    <span>{item.label}</span>
                  </div>
                  <ChevronRight className={`w-3.5 h-3.5 opacity-60 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                </button>
              );
            })}
          </div>
        </aside>

        {/* Mobile Navigation Drawer */}
        {mobileNavOpen && (
          <div className="md:hidden p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 mb-4 space-y-1">
            {customerNavigation.map((item) => {
              const isActive = activePath === item.path;
              const Icon = item.icon as any;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setMobileNavOpen(false);
                    onNavigate(item.path || '/account');
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium text-left ${
                    isActive
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {Icon && <Icon className="w-4 h-4" />}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Account Content Workspace */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
};

export default CustomerShell;
