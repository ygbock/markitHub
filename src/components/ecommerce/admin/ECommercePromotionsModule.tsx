import React, { useState } from 'react';
import { Product } from '../../../types';
import { PricingRule } from '../../../utils/pricingRulesEngine';
import { Gift, Percent, Calendar, Check, X, Plus, Zap, Settings2 } from 'lucide-react';
import { VALID_COUPONS } from '../ECommerceCartDrawer';

interface ECommercePromotionsModuleProps {
  products: Product[];
}

export default function ECommercePromotionsModule({ products }: ECommercePromotionsModuleProps) {
  const [coupons, setCoupons] = useState(VALID_COUPONS);
  
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([
    {
      id: 'rule_1',
      type: 'BOGO',
      title: 'Buy 2 Get 1 Free',
      description: 'Buy 2 of any item, get 1 of the same item free.',
      isActive: true,
      buyQty: 2,
      getQty: 1,
      discountMultiplier: 0
    },
    {
      id: 'rule_2',
      type: 'THRESHOLD_DISCOUNT',
      title: '10% off when total > $200',
      description: 'Get 10% off your entire order when you spend over $200.',
      isActive: true,
      thresholdAmount: 200,
      discountPercentage: 10
    }
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Promotions & Campaigns</h2>
          <p className="text-sm text-slate-500">Manage discount codes, automatic rules, and marketing campaigns.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-colors shadow-sm">
          <Plus className="w-4 h-4" />
          Create Coupon
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-800">Conditional Pricing Rules</h3>
          </div>
          <button className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" /> Add Rule
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-white border-b border-slate-100 text-slate-500 font-medium">
              <tr>
                <th className="px-6 py-4">Rule Name</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Condition & Reward</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pricingRules.map((rule) => (
                <tr key={rule.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <span className="font-bold text-slate-900 block">{rule.title}</span>
                    <span className="text-xs text-slate-500">{rule.description}</span>
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    <span className="px-2 py-1 bg-slate-100 rounded-md text-xs font-bold text-slate-700">
                      {rule.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-700 text-xs">
                    {rule.type === 'BOGO' ? `Buy ${rule.buyQty}, Get ${rule.getQty} (${rule.discountMultiplier === 0 ? 'Free' : `${(1 - (rule.discountMultiplier || 0))*100}% off`})` : `Spend > $${rule.thresholdAmount}, Get ${rule.discountPercentage ? rule.discountPercentage + '%' : '$' + rule.fixedDiscount} off`}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${rule.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                      {rule.isActive ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />} {rule.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button className="text-slate-400 hover:text-indigo-600 transition-colors p-1" title="Configure Rule">
                      <Settings2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
          <Gift className="w-5 h-5 text-indigo-600" />
          <h3 className="font-bold text-slate-800">Active Coupons</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-white border-b border-slate-100 text-slate-500 font-medium">
              <tr>
                <th className="px-6 py-4">Code</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Value</th>
                <th className="px-6 py-4">Min. Spend</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {coupons.map((coupon, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100">
                      {coupon.code}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600 capitalize">
                    {coupon.discountType}
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-900">
                    {coupon.discountType === 'percentage' ? `${coupon.value}% OFF` : `$${coupon.value} OFF`}
                  </td>
                  <td className="px-6 py-4 text-slate-500">
                    {coupon.minOrderAmount ? `$${coupon.minOrderAmount}` : 'No minimum'}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
                      <Check className="w-3 h-3" /> Active
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button className="text-slate-400 hover:text-rose-600 transition-colors">
                      <X className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-indigo-600" />
          <h3 className="font-bold text-slate-800">Scheduled Campaigns</h3>
        </div>
        <div className="p-6">
          <div className="flex flex-col md:flex-row items-center gap-6 p-5 border border-indigo-100 bg-indigo-50/50 rounded-xl">
            <div className="w-16 h-16 bg-white rounded-2xl border border-indigo-200 flex items-center justify-center shrink-0 shadow-xs">
              <Percent className="w-8 h-8 text-indigo-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h4 className="font-bold text-slate-900 text-lg">Black Friday Super Sale 2026</h4>
                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold uppercase rounded-md">Scheduled</span>
              </div>
              <p className="text-sm text-slate-600 mb-3">Automatic 20% discount on all electronics. Triggers homepage banner takeover.</p>
              <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
                <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> Starts: Nov 25, 2026</span>
                <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> Ends: Dec 2, 2026</span>
              </div>
            </div>
            <button className="px-4 py-2 bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 text-slate-700 text-sm font-bold rounded-xl transition-all shadow-sm shrink-0">
              Edit Campaign
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
