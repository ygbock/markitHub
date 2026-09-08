import React, { useState } from 'react';
import { Customer } from '../../../types';
import { 
  Settings, Bell, ShieldCheck, Key, Globe, LogOut, 
  UserCheck, Check, Smartphone, Lock, Eye, EyeOff, Save
} from 'lucide-react';
import { useCurrency } from '../../../context/CurrencyContext';

interface AccountSettingsTabProps {
  customer: Customer | null;
  customers: Customer[];
  onSelectCustomer: (customer: Customer | null) => void;
  onLogout: () => void;
}

export const AccountSettingsTab: React.FC<AccountSettingsTabProps> = ({
  customer,
  customers,
  onSelectCustomer,
  onLogout
}) => {
  const { currentCurrency, setCurrencyCode, availableCurrencies } = useCurrency();

  // Notification Toggles
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsMilestones, setSmsMilestones] = useState(true);
  const [promoOffers, setPromoOffers] = useState(false);
  const [twoFactorAuth, setTwoFactorAuth] = useState(true);

  // Security password state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);

  const handleSavePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) return;
    setPasswordSaved(true);
    setTimeout(() => {
      setPasswordSaved(false);
      setOldPassword('');
      setNewPassword('');
    }, 2500);
  };

  return (
    <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-150" id="account-tab-settings">
      
      {/* 1. Header */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/90 shadow-2xs">
        <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
          <Settings className="w-5 h-5 text-slate-700" />
          <span>Account Preferences & Settings</span>
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure real-time delivery notifications, store currency, security, and profile switching.
        </p>
      </div>

      {/* 2. Notification Preferences */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
          <Bell className="w-4 h-4 text-indigo-600" />
          <h3 className="text-sm font-bold text-slate-900">Communication & Order Alerts</h3>
        </div>

        <div className="space-y-3 text-xs">
          <label className="flex items-start justify-between gap-4 p-3 bg-slate-50 rounded-2xl cursor-pointer hover:bg-slate-100/80 transition-colors">
            <div>
              <span className="font-bold text-slate-900 block">Instant Email Invoices & Dispatches</span>
              <span className="text-slate-500 text-[11px] block mt-0.5">
                Receive PDF receipts and carrier airway bill tracking codes immediately after placing an order.
              </span>
            </div>
            <input
              type="checkbox"
              checked={emailAlerts}
              onChange={(e) => setEmailAlerts(e.target.checked)}
              className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 mt-0.5"
            />
          </label>

          <label className="flex items-start justify-between gap-4 p-3 bg-slate-50 rounded-2xl cursor-pointer hover:bg-slate-100/80 transition-colors">
            <div>
              <span className="font-bold text-slate-900 block">SMS Milestone Updates</span>
              <span className="text-slate-500 text-[11px] block mt-0.5">
                Receive real-time SMS when your package status changes to "Packed", "Dispatched", or "Out for Delivery".
              </span>
            </div>
            <input
              type="checkbox"
              checked={smsMilestones}
              onChange={(e) => setSmsMilestones(e.target.checked)}
              className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 mt-0.5"
            />
          </label>

          <label className="flex items-start justify-between gap-4 p-3 bg-slate-50 rounded-2xl cursor-pointer hover:bg-slate-100/80 transition-colors">
            <div>
              <span className="font-bold text-slate-900 block">Promotional Discounts & Flash Deals</span>
              <span className="text-slate-500 text-[11px] block mt-0.5">
                Occasional early access codes for member-only weekend sales and loyalty multiplier events.
              </span>
            </div>
            <input
              type="checkbox"
              checked={promoOffers}
              onChange={(e) => setPromoOffers(e.target.checked)}
              className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 mt-0.5"
            />
          </label>
        </div>
      </div>

      {/* 3. Currency & Localization */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
          <Globe className="w-4 h-4 text-indigo-600" />
          <h3 className="text-sm font-bold text-slate-900">Currency & Regional Display</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Storefront Currency</label>
            <select
              value={currentCurrency?.code || 'SLE'}
              onChange={(e) => setCurrencyCode(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
            >
              {availableCurrencies.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} - {c.name} ({c.symbol})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Language</label>
            <select
              defaultValue="en"
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="en">English (UK / Sierra Leone)</option>
              <option value="kri">Krio (Standard)</option>
              <option value="fr">French (Français)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. Security & Password Form */}
      <form onSubmit={handleSavePassword} className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <Lock className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">Security & Credentials</h3>
          </div>

          {passwordSaved && (
            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold flex items-center gap-1.5 animate-in fade-in">
              <Check className="w-3.5 h-3.5" />
              <span>Password Updated</span>
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Current Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">New Secure Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 8 characters"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* 2FA Toggle */}
        <div className="pt-2 flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
          <div className="flex items-center gap-2.5">
            <Smartphone className="w-4 h-4 text-indigo-600" />
            <div>
              <span className="font-bold text-xs text-slate-900 block">Two-Factor Authentication (2FA)</span>
              <span className="text-[11px] text-slate-500 block">Secure login verification codes sent via SMS</span>
            </div>
          </div>
          <input
            type="checkbox"
            checked={twoFactorAuth}
            onChange={(e) => setTwoFactorAuth(e.target.checked)}
            className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
          />
        </div>

        <div className="pt-2 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            <span>Update Password</span>
          </button>
        </div>
      </form>

      {/* 5. Switch Profile / Logout */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
          <UserCheck className="w-4 h-4 text-indigo-600" />
          <h3 className="text-sm font-bold text-slate-900">Switch Customer Account Profile</h3>
        </div>

        <div className="space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {customers.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelectCustomer(c)}
                className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                  customer?.id === c.id
                    ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 bg-slate-50 hover:bg-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 font-black text-xs flex items-center justify-center">
                    {c.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <span className="font-bold text-xs text-slate-900 block">{c.name}</span>
                    <span className="text-[11px] text-slate-500 block">{c.email}</span>
                  </div>
                </div>
                {customer?.id === c.id && (
                  <Check className="w-4 h-4 text-indigo-600" />
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-500">Sign out of this session on this device</span>
          <button
            type="button"
            onClick={onLogout}
            className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out / Guest Mode</span>
          </button>
        </div>
      </div>

    </div>
  );
};
