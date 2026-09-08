import React, { useState } from 'react';
import { Customer } from '../../../types';
import { 
  User, Mail, Phone, MapPin, Calendar, Award, 
  ShieldCheck, Check, Sparkles, Bell, MessageSquare, 
  Save, RefreshCw
} from 'lucide-react';
import { useCurrency } from '../../../context/CurrencyContext';

interface AccountProfileTabProps {
  customer: Customer | null;
  onUpdateCustomer: (updated: Partial<Customer>) => void;
}

export const AccountProfileTab: React.FC<AccountProfileTabProps> = ({
  customer,
  onUpdateCustomer
}) => {
  const { formatAmount } = useCurrency();

  const [formData, setFormData] = useState({
    name: customer?.name || 'Sahr B Sesay',
    email: customer?.email || 'sahr.sesay@example.com',
    phone: customer?.phone || '+232 76 892014',
    address: customer?.address || '232 Wilkinson Road, Lumley',
    city: customer?.city || 'Freetown',
    birthday: customer?.birthday || '1992-05-18',
    marketingOptIn: customer?.marketingOptIn ?? true
  });

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateCustomer(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const loyaltyPoints = customer?.loyaltyPoints || 450;
  const loyaltyTier = customer?.loyaltyTier || (loyaltyPoints > 500 ? 'Platinum' : loyaltyPoints > 200 ? 'Gold' : 'Silver');

  return (
    <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-150" id="account-tab-profile">
      
      {/* 1. Header & Tier Card */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-800 text-white font-black text-xl flex items-center justify-center shadow-md">
            {formData.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-slate-900">{formData.name}</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-amber-500" />
                <span>{loyaltyTier}</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Member since {customer?.createdAt ? new Date(customer.createdAt).getFullYear() : '2024'} • Account Verified
            </p>
          </div>
        </div>

        <div className="bg-slate-50 px-4 py-3 rounded-2xl border border-slate-200 text-right w-full sm:w-auto">
          <span className="text-[11px] text-slate-500 font-medium block">Loyalty Balance</span>
          <div className="text-lg font-black font-mono text-indigo-600 flex items-center justify-end gap-1">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>{loyaltyPoints} Points</span>
          </div>
        </div>
      </div>

      {/* 2. Personal Information Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Personal Information</h3>
            <span className="text-xs text-slate-500">Update your contact profile and account credentials</span>
          </div>

          {savedSuccess && (
            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold flex items-center gap-1.5 animate-in fade-in">
              <Check className="w-3.5 h-3.5" />
              <span>Saved Successfully</span>
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Full Legal Name *</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Email Address *</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Phone Number (SMS / WhatsApp) *</label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Date of Birth</label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="date"
                value={formData.birthday}
                onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Primary Street Address</label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">City / Region</label>
            <input
              type="text"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>

        {/* Preferences */}
        <div className="pt-3 border-t border-slate-100 space-y-2">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
            <input
              type="checkbox"
              checked={formData.marketingOptIn}
              onChange={(e) => setFormData({ ...formData, marketingOptIn: e.target.checked })}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
            />
            <span>Receive automated SMS & WhatsApp order tracking milestones and flash promotion alerts</span>
          </label>
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
          <button
            type="submit"
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            <span>Save Profile Information</span>
          </button>
        </div>
      </form>

    </div>
  );
};
