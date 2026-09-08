import React, { useState } from 'react';
import { Tag, Sparkles, Copy, Check, Zap, Gift } from 'lucide-react';
import { VALID_COUPONS } from './ECommerceCartDrawer';
import { HomepagePromoBannerConfig } from '../../types';

interface ECommercePromotionsProps {
  onApplyCoupon: (code: string) => boolean;
  onOpenDealDay?: () => void;
  title?: string;
  subtitle?: string;
  customBannerConfig?: HomepagePromoBannerConfig;
}

export default function ECommercePromotions({
  onApplyCoupon,
  onOpenDealDay,
  title = 'Coupons & Seasonal Discounts',
  subtitle = 'Active Vouchers',
  customBannerConfig
}: ECommercePromotionsProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopy = (code: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopiedCode(code);
      onApplyCoupon(code);
      setTimeout(() => setCopiedCode(null), 2500);
    }
  };

  return (
    <section className="space-y-4" id="ecom-promotions-section">
      
      {/* Featured Banner Callout if custom banner configured */}
      {customBannerConfig && (
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-indigo-500/30 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
          <div className="space-y-2 z-10 max-w-xl text-center md:text-left">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 font-extrabold text-xs uppercase tracking-wider border border-amber-400/30">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              {customBannerConfig.discountText || 'LIMITED OFFER'}
            </span>
            <h3 className="text-xl sm:text-3xl font-black text-white tracking-tight">
              {customBannerConfig.headline}
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {customBannerConfig.subtext}
            </p>
          </div>

          <div className="flex items-center gap-3 z-10 bg-slate-800/80 p-3 rounded-2xl border border-slate-700/80 backdrop-blur-md">
            <span className="px-3 py-1.5 bg-slate-900 rounded-xl font-mono font-black text-amber-300 text-sm tracking-wider border border-slate-700">
              {customBannerConfig.couponCode}
            </span>
            <button
              type="button"
              onClick={() => handleCopy(customBannerConfig.couponCode)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copiedCode === customBannerConfig.couponCode ? 'Applied!' : customBannerConfig.buttonText || 'Claim Voucher'}</span>
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-amber-600">
            <Zap className="w-4 h-4" />
            <span className="text-[11px] font-black uppercase tracking-widest">{subtitle}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">
            {title}
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {VALID_COUPONS.map((cp) => {
          const isCopied = copiedCode === cp.code;

          return (
            <div 
              key={cp.code}
              className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all relative overflow-hidden flex flex-col justify-between space-y-3 group"
            >
              {/* Dashed voucher outline */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                    <Tag className="w-3 h-3 text-amber-600" />
                    <span>{cp.discountType === 'percentage' ? `${cp.value}% OFF` : cp.discountType === 'fixed' ? `$${cp.value} OFF` : 'FREE SHIPPING'}</span>
                  </span>

                  <span className="text-[10px] text-slate-400 font-mono">Instant Voucher</span>
                </div>

                <h4 className="text-xs font-bold text-slate-900 leading-snug">
                  {cp.description}
                </h4>
              </div>

              {/* Coupon Code Pill & Copy Button */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                <div className="px-2.5 py-1 bg-slate-100 rounded-xl border border-dashed border-slate-300 font-mono font-black text-xs text-slate-800 tracking-wider">
                  {cp.code}
                </div>

                <button
                  type="button"
                  onClick={() => handleCopy(cp.code)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    isCopied
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}
                  title="Copy code and apply to cart"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3 h-3" />
                      <span>Applied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
