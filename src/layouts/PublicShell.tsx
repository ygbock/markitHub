import React from 'react';
import {
  Compass,
  MapPin,
  Search,
  ShoppingBag,
  Store,
  Menu,
  X,
  User,
  ExternalLink,
  ChevronDown,
} from 'lucide-react';
import { Button } from '../components/shared/Button';
import { publicNavigation } from '../navigation/navigationRegistries';

export interface PublicShellProps {
  children: React.ReactNode;
  activePath?: string;
  onNavigate?: (path: string) => void;
  cartCount?: number;
  onOpenCart?: () => void;
  onOpenAuth?: () => void;
  selectedLocation?: string;
  onSelectLocation?: (location: string) => void;
}

export const PublicShell: React.FC<PublicShellProps> = ({
  children,
  activePath = '/discover',
  onNavigate = (path) => {
    if (typeof window !== 'undefined') window.location.href = path;
  },
  cartCount = 0,
  onOpenCart,
  onOpenAuth,
  selectedLocation = 'Freetown, Sierra Leone',
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onNavigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased">
      {/* Universal Discovery Header */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            {/* Logo & Location */}
            <div className="flex items-center gap-6">
              <button
                type="button"
                onClick={() => onNavigate('/')}
                className="flex items-center gap-2.5 text-left group"
              >
                <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-sm group-hover:bg-indigo-700 transition-colors">
                  M
                </div>
                <div>
                  <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    MikitHub
                  </span>
                  <span className="hidden sm:block text-[10px] uppercase font-semibold tracking-wider text-slate-500 dark:text-slate-400">
                    Discovery & Local Commerce
                  </span>
                </div>
              </button>

              {/* Location Selector */}
              <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300">
                <MapPin className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>{selectedLocation}</span>
                <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />
              </div>
            </div>

            {/* Global Search Bar */}
            <form
              onSubmit={handleSearchSubmit}
              className="hidden lg:flex flex-1 max-w-md relative items-center"
            >
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Search businesses, products, services..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 pr-4 rounded-full border border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-800/70 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 focus:outline-none transition-colors"
              />
            </form>

            {/* Navigation & CTAs */}
            <div className="flex items-center gap-2 sm:gap-3">
              <nav className="hidden md:flex items-center space-x-1">
                {publicNavigation.map((item) => {
                  const isActive = activePath.startsWith(item.path || '');
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onNavigate(item.path || '/')}
                      className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                        isActive
                          ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </nav>

              {/* List Business CTA */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigate('/business/register')}
                className="hidden sm:inline-flex"
                leftIcon={<Store className="w-3.5 h-3.5" />}
              >
                List Business
              </Button>

              {/* Cart button */}
              {onOpenCart && (
                <button
                  type="button"
                  onClick={onOpenCart}
                  className="relative p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  aria-label="Shopping Cart"
                >
                  <ShoppingBag className="w-5 h-5" />
                  {cartCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center">
                      {cartCount}
                    </span>
                  )}
                </button>
              )}

              {/* Sign In CTA */}
              <Button
                variant="primary"
                size="sm"
                onClick={onOpenAuth || (() => onNavigate('/account'))}
                leftIcon={<User className="w-3.5 h-3.5" />}
              >
                Sign In
              </Button>

              {/* Mobile menu toggle */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Mobile Search & Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
              <form onSubmit={handleSearchSubmit} className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search businesses, products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-xs"
                />
              </form>

              <div className="flex flex-col space-y-1">
                {publicNavigation.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onNavigate(item.path || '/');
                    }}
                    className="flex items-center px-3 py-2 text-sm font-medium rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-left"
                  >
                    {item.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onNavigate('/business/register');
                  }}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-left"
                >
                  <Store className="w-4 h-4" />
                  <span>List Your Business</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Shell Body */}
      <main className="flex-1 w-full">{children}</main>

      {/* Universal Discovery Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                  M
                </div>
                <span className="font-extrabold text-slate-900 dark:text-white">MikitHub</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Empowering African businesses with discovery, e-commerce, cloud POS, and seamless multi-branch management.
              </p>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-slate-100 mb-3">
                Discover
              </h4>
              <ul className="space-y-2 text-xs text-slate-500 dark:text-slate-400">
                <li>
                  <button type="button" onClick={() => onNavigate('/discover')} className="hover:text-indigo-600">
                    Explore Local Businesses
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => onNavigate('/nearby')} className="hover:text-indigo-600">
                    Businesses Near Me
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => onNavigate('/categories')} className="hover:text-indigo-600">
                    Browse Categories
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-slate-100 mb-3">
                For Businesses
              </h4>
              <ul className="space-y-2 text-xs text-slate-500 dark:text-slate-400">
                <li>
                  <button type="button" onClick={() => onNavigate('/business/register')} className="hover:text-indigo-600 font-medium text-indigo-600 dark:text-indigo-400">
                    List Your Business Free
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => onNavigate('/business/upgrade')} className="hover:text-indigo-600">
                    Become a Tenant
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => onNavigate('/tenant/pos')} className="hover:text-indigo-600">
                    MikitHub POS Software
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-slate-100 mb-3">
                Trust & Support
              </h4>
              <ul className="space-y-2 text-xs text-slate-500 dark:text-slate-400">
                <li>
                  <a href="/terms" className="hover:text-indigo-600">Terms of Service</a>
                </li>
                <li>
                  <a href="/privacy" className="hover:text-indigo-600">Privacy Policy</a>
                </li>
                <li>
                  <a href="/trust" className="hover:text-indigo-600">Trust & Safety</a>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-100 dark:border-slate-800 text-center text-xs text-slate-400">
            © {new Date().getFullYear()} MikitHub Technologies. All rights reserved. Zero merchant clutter on discovery pages.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicShell;
