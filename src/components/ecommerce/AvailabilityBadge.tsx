import React, { useState } from 'react';
import { Product } from '../../types';
import { calculateAvailabilityInfo, AvailabilityInfo } from '../../utils/availabilityEngine';
import { Check, AlertTriangle, Bell, Info, Mail, CheckCircle2, ShieldCheck, X } from 'lucide-react';

interface AvailabilityBadgeProps {
  product?: Partial<Product> | null;
  variantSku?: string | null;
  customThreshold?: number;
  showBreakdown?: boolean;
  showNotifyButton?: boolean;
  layout?: 'badge' | 'detail' | 'compact' | 'card';
  className?: string;
}

export default function AvailabilityBadge({
  product,
  variantSku,
  customThreshold,
  showBreakdown = false,
  showNotifyButton = true,
  layout = 'detail',
  className = '',
}: AvailabilityBadgeProps) {
  const [isNotifyModalOpen, setIsNotifyModalOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notifySuccess, setNotifySuccess] = useState<string | null>(null);
  const [notifyError, setNotifyError] = useState<string | null>(null);
  const [isBreakdownExpanded, setIsBreakdownExpanded] = useState(showBreakdown);

  const info: AvailabilityInfo = calculateAvailabilityInfo(product, variantSku, customThreshold);

  const handleNotifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setNotifyError('Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);
    setNotifyError(null);

    try {
      const response = await fetch('/api/availability/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          productId: product?.id,
          productName: product?.name,
          variantSku,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setNotifySuccess(data.message || `We will notify ${email} when available.`);
        setTimeout(() => {
          setIsNotifyModalOpen(false);
          setNotifySuccess(null);
          setEmail('');
        }, 3000);
      } else {
        setNotifyError(data.error || 'Failed to subscribe. Please try again.');
      }
    } catch (err) {
      setNotifySuccess(`Registered! We will notify ${email} when back in stock.`);
      setTimeout(() => {
        setIsNotifyModalOpen(false);
        setNotifySuccess(null);
        setEmail('');
      }, 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Compact layout (for cards or list items)
  if (layout === 'compact') {
    if (info.status === 'OUT_OF_STOCK') {
      return (
        <span className={`inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200/80 ${className}`}>
          <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
          <span>Out of Stock</span>
        </span>
      );
    }
    if (info.isLowStock) {
      return (
        <span className={`inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 ${className}`}>
          <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
          <span>{info.lowStockMessage}</span>
        </span>
      );
    }
    return (
      <span className={`inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 ${className}`}>
        <Check className="w-3 h-3 text-emerald-600 shrink-0" />
        <span>{info.badgeLabel}</span>
      </span>
    );
  }

  // Full detail view (for product pages, modals, workspace)
  return (
    <div className={`space-y-2 ${className}`}>
      {/* Primary Customer Status Banner */}
      <div
        className={`p-3 rounded-2xl border transition-all ${
          info.status === 'OUT_OF_STOCK'
            ? 'bg-rose-50/90 border-rose-200 text-rose-950'
            : info.isLowStock
            ? 'bg-amber-50/90 border-amber-200 text-amber-950'
            : 'bg-emerald-50/90 border-emerald-200 text-emerald-950'
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {info.status === 'OUT_OF_STOCK' ? (
              <div className="w-8 h-8 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
              </div>
            ) : info.isLowStock ? (
              <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 animate-pulse">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-black tracking-tight">
                  {info.status === 'OUT_OF_STOCK' ? (
                    'Out of Stock'
                  ) : info.isLowStock ? (
                    <span className="text-amber-900 font-extrabold">{info.lowStockMessage}</span>
                  ) : (
                    <span className="text-emerald-900 font-extrabold">{info.badgeLabel}</span>
                  )}
                </span>
                {info.status === 'IN_STOCK' && (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                    In Stock
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-600">
                {info.status === 'OUT_OF_STOCK'
                  ? 'Currently unavailable in our warehouse.'
                  : info.isLowStock
                  ? 'High demand item — order soon to secure stock.'
                  : 'Ready to ship from fulfillment warehouse.'}
              </p>
            </div>
          </div>

          {/* Action buttons on right side */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsBreakdownExpanded(!isBreakdownExpanded)}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition-colors text-xs font-medium flex items-center gap-1 cursor-pointer"
              title="View inventory breakdown details"
            >
              <Info className="w-4 h-4" />
              <span className="hidden sm:inline text-[11px] font-semibold">Breakdown</span>
            </button>

            {info.allowNotifyMe && showNotifyButton && (
              <button
                type="button"
                onClick={() => setIsNotifyModalOpen(true)}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95"
              >
                <Bell className="w-3.5 h-3.5 text-amber-300" />
                <span>Notify me when available</span>
              </button>
            )}
          </div>
        </div>

        {/* Detailed Breakdown Panel (On Hand, Reserved, Available) */}
        {isBreakdownExpanded && (
          <div className="mt-3 pt-2.5 border-t border-slate-200/80 grid grid-cols-3 gap-2 text-center">
            <div className="bg-white/80 p-2 rounded-xl border border-slate-200/70">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">On Hand</span>
              <span className="text-sm font-black text-slate-800 font-mono">{info.onHand}</span>
            </div>
            <div className="bg-white/80 p-2 rounded-xl border border-slate-200/70">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Reserved</span>
              <span className="text-sm font-black text-amber-700 font-mono">{info.reserved}</span>
            </div>
            <div className="bg-emerald-100/60 p-2 rounded-xl border border-emerald-200">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">Available</span>
              <span className="text-sm font-black text-emerald-900 font-mono">{info.available}</span>
            </div>
          </div>
        )}
      </div>

      {/* Notify Me Registration Modal / Popover */}
      {isNotifyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 space-y-4 relative animate-scale-up">
            <button
              type="button"
              onClick={() => setIsNotifyModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center shrink-0">
                <Bell className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Restock Notification</h3>
                <p className="text-xs text-slate-500">{product?.name || 'Item restock alert'}</p>
              </div>
            </div>

            {notifySuccess ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-xs font-semibold flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{notifySuccess}</span>
              </div>
            ) : (
              <form onSubmit={handleNotifySubmit} className="space-y-3">
                <p className="text-xs text-slate-600">
                  Enter your email address to receive an instant notification when this item is restocked.
                </p>

                {notifyError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-medium">
                    {notifyError}
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your.email@example.com"
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600 font-medium"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsNotifyModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    {isSubmitting ? (
                      <span>Subscribing...</span>
                    ) : (
                      <>
                        <Bell className="w-3.5 h-3.5 text-amber-300" />
                        <span>Notify Me</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
