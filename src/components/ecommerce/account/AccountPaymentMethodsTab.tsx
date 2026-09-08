import React, { useState } from 'react';
import { 
  CreditCard, Smartphone, Building2, Plus, Trash2, 
  CheckCircle2, ShieldCheck, X, AlertCircle 
} from 'lucide-react';

export interface SavedPaymentMethod {
  id: string;
  type: 'card' | 'mobile_money' | 'bank_transfer';
  title: string;
  subtitle: string;
  lastFour?: string;
  expiry?: string;
  provider?: 'visa' | 'mastercard' | 'orange_money' | 'afrimoney' | 'slcb' | string;
  isDefault: boolean;
}

interface AccountPaymentMethodsTabProps {
  paymentMethods: SavedPaymentMethod[];
  onSavePaymentMethod: (method: SavedPaymentMethod) => void;
  onDeletePaymentMethod: (methodId: string) => void;
  onSetDefaultPaymentMethod: (methodId: string) => void;
}

export const AccountPaymentMethodsTab: React.FC<AccountPaymentMethodsTabProps> = ({
  paymentMethods,
  onSavePaymentMethod,
  onDeletePaymentMethod,
  onSetDefaultPaymentMethod
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [methodType, setMethodType] = useState<'card' | 'mobile_money'>('mobile_money');

  // Form states
  const [cardHolder, setCardHolder] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [mobileProvider, setMobileProvider] = useState<'orange_money' | 'afrimoney'>('orange_money');
  const [mobilePhone, setMobilePhone] = useState('');

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (methodType === 'card') {
      if (!cardNumber || !cardHolder) return;
      const cleanNum = cardNumber.replace(/\s+/g, '');
      const newMethod: SavedPaymentMethod = {
        id: `pm-${Date.now()}`,
        type: 'card',
        title: `Visa / Mastercard (•••• ${cleanNum.slice(-4)})`,
        subtitle: `Expires ${expiry || '12/28'} • ${cardHolder}`,
        lastFour: cleanNum.slice(-4),
        expiry: expiry || '12/28',
        provider: cleanNum.startsWith('4') ? 'visa' : 'mastercard',
        isDefault: paymentMethods.length === 0
      };
      onSavePaymentMethod(newMethod);
    } else {
      if (!mobilePhone) return;
      const providerLabel = mobileProvider === 'orange_money' ? 'Orange Money' : 'Afrimoney';
      const newMethod: SavedPaymentMethod = {
        id: `pm-${Date.now()}`,
        type: 'mobile_money',
        title: `${providerLabel} Wallet`,
        subtitle: `Phone: ${mobilePhone}`,
        provider: mobileProvider,
        isDefault: paymentMethods.length === 0
      };
      onSavePaymentMethod(newMethod);
    }

    setIsAdding(false);
    setCardHolder('');
    setCardNumber('');
    setExpiry('');
    setMobilePhone('');
  };

  return (
    <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-150" id="account-tab-payment-methods">
      
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-slate-200/90 shadow-2xs">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-indigo-600" />
            <span>Saved Payment Methods</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your cards, mobile money wallets, and B2B bank accounts for fast 1-click checkout.
          </p>
        </div>

        {!isAdding && (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add Payment Method</span>
          </button>
        )}
      </div>

      {/* 2. Add Form */}
      {isAdding && (
        <form onSubmit={handleAddSubmit} className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-indigo-500/30 shadow-md space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">Add New Payment Method</h3>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Type Picker */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMethodType('mobile_money')}
              className={`p-3 rounded-2xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                methodType === 'mobile_money'
                  ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 font-bold'
                  : 'border-slate-200 bg-white text-slate-600'
              }`}
            >
              <Smartphone className="w-5 h-5 text-indigo-600 shrink-0" />
              <div>
                <span className="text-xs block font-bold">Mobile Money Wallet</span>
                <span className="text-[10px] text-slate-500 block">Orange Money / Afrimoney</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setMethodType('card')}
              className={`p-3 rounded-2xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                methodType === 'card'
                  ? 'border-indigo-600 bg-indigo-50/50 text-indigo-900 font-bold'
                  : 'border-slate-200 bg-white text-slate-600'
              }`}
            >
              <CreditCard className="w-5 h-5 text-indigo-600 shrink-0" />
              <div>
                <span className="text-xs block font-bold">Debit / Credit Card</span>
                <span className="text-[10px] text-slate-500 block">Visa, Mastercard</span>
              </div>
            </button>
          </div>

          {/* Conditional Fields */}
          {methodType === 'mobile_money' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Select Network *</label>
                <select
                  value={mobileProvider}
                  onChange={(e) => setMobileProvider(e.target.value as any)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="orange_money">Orange Money (Sierra Leone)</option>
                  <option value="afrimoney">Afrimoney (Africell Sierra Leone)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Registered Phone Number *</label>
                <input
                  type="tel"
                  required
                  value={mobilePhone}
                  onChange={(e) => setMobilePhone(e.target.value)}
                  placeholder="e.g. +232 76 123456"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Name on Card *</label>
                <input
                  type="text"
                  required
                  value={cardHolder}
                  onChange={(e) => setCardHolder(e.target.value)}
                  placeholder="e.g. SAHR B SESAY"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Card Number *</label>
                <input
                  type="text"
                  required
                  maxLength={19}
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  placeholder="4000 1234 5678 9010"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Expiry Date (MM/YY) *</label>
                <input
                  type="text"
                  required
                  maxLength={5}
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                  placeholder="12/28"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono font-medium focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs"
            >
              Save Payment Method
            </button>
          </div>
        </form>
      )}

      {/* 3. Saved Cards / Wallets Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {paymentMethods.map((pm) => (
          <div
            key={pm.id}
            className={`bg-white rounded-3xl p-4 sm:p-5 border transition-all flex flex-col justify-between gap-3 ${
              pm.isDefault ? 'border-indigo-400 ring-2 ring-indigo-500/20 shadow-xs' : 'border-slate-200/90 shadow-2xs'
            }`}
          >
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    {pm.type === 'mobile_money' ? (
                      <Smartphone className="w-4 h-4" />
                    ) : pm.type === 'bank_transfer' ? (
                      <Building2 className="w-4 h-4" />
                    ) : (
                      <CreditCard className="w-4 h-4" />
                    )}
                  </div>
                  <span className="font-bold text-xs text-slate-900">{pm.title}</span>
                </div>

                {pm.isDefault ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-indigo-600" />
                    <span>Default</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onSetDefaultPaymentMethod(pm.id)}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer"
                  >
                    Set as default
                  </button>
                )}
              </div>

              <div className="pt-2 text-xs text-slate-600">
                <p className="font-medium">{pm.subtitle}</p>
                <div className="mt-1 flex items-center gap-1 text-[11px] text-emerald-600">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>256-bit Encrypted Token</span>
                </div>
              </div>
            </div>

            {paymentMethods.length > 1 && (
              <div className="pt-2 border-t border-slate-100 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => onDeletePaymentMethod(pm.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  title="Remove payment method"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

    </div>
  );
};
