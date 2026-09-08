import React, { useState } from 'react';
import { useCurrency, SUPPORTED_CURRENCIES } from '../context/CurrencyContext';
import { Coins, Search, Check, Globe, RefreshCw, X, ArrowRight, TrendingUp } from 'lucide-react';

interface CurrencySelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CurrencySelectorModal({ isOpen, onClose }: CurrencySelectorModalProps) {
  const { currentCurrency, setCurrencyByCode, conversionEnabled, setConversionEnabled } = useCurrency();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const filteredCurrencies = SUPPORTED_CURRENCIES.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.symbol.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = async (code: string) => {
    setIsSaving(true);
    await setCurrencyByCode(code);
    setIsSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150" id="currency-modal-backdrop">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]" id="currency-modal-panel">
        
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Currency Settings
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono px-2 py-0.5 rounded-full font-bold">
                  Default: SLE (Le)
                </span>
              </h2>
              <p className="text-xs text-gray-400">Select store & terminal currency preference</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-gray-300 hover:text-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current Active Currency Banner */}
        <div className="p-4 bg-indigo-50/70 border-b border-indigo-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{currentCurrency.flag}</span>
            <div>
              <span className="text-xs text-indigo-600 font-semibold block">Active Display Currency</span>
              <span className="text-sm font-bold text-slate-900">
                {currentCurrency.name} ({currentCurrency.code}) — <span className="font-mono text-indigo-700">{currentCurrency.symbol}</span>
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-slate-500 uppercase font-bold block">Base Rate</span>
            <span className="text-xs font-mono font-bold text-slate-700">
              1 SLE = {currentCurrency.exchangeRate} {currentCurrency.code}
            </span>
          </div>
        </div>

        {/* Search & Conversion Mode toggle */}
        <div className="p-4 border-b border-gray-100 space-y-3 bg-slate-50/50">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search currency by country, name (e.g. Sierra Leone, Naira, Dollar)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
              autoFocus
            />
          </div>

          <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-gray-200/80">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              <div>
                <span className="text-xs font-bold text-slate-900 block">Apply FX Conversion Rate</span>
                <span className="text-[10px] text-gray-500 block">Calculate dynamic prices using live exchange rates vs base SLE</span>
              </div>
            </div>
            <button
              onClick={() => setConversionEnabled(!conversionEnabled)}
              className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${conversionEnabled ? 'bg-indigo-600' : 'bg-gray-200'}`}
            >
              <div className={`w-5 h-5 rounded-full bg-white transition-transform ${conversionEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>

        {/* Currencies Grid List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 max-h-[380px]" id="currencies-list-grid">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block px-1">
            Available Global Currencies ({filteredCurrencies.length})
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {filteredCurrencies.map((c) => {
              const isSelected = currentCurrency.code === c.code;
              return (
                <button
                  key={c.code}
                  onClick={() => handleSelect(c.code)}
                  disabled={isSaving}
                  className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all ${
                    isSelected 
                      ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-600/20 shadow-xs' 
                      : 'border-gray-200 hover:border-gray-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl shrink-0">{c.flag}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900 truncate">{c.code}</span>
                        <span className="text-xs font-mono font-extrabold text-indigo-700 bg-white px-1.5 py-0.5 rounded border border-gray-200">
                          {c.symbol}
                        </span>
                        {c.code === 'SLE' && (
                          <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-1 py-0.2 rounded">
                            DEFAULT
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-gray-500 truncate block mt-0.5">{c.name}</span>
                    </div>
                  </div>

                  {isSelected ? (
                    <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  ) : (
                    <span className="text-[10px] text-gray-400 font-mono">1 SLE = {c.exchangeRate}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer info */}
        <div className="p-3.5 bg-slate-50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <span>Synced with Firestore cloud database</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-850 text-white rounded-xl font-bold text-xs shadow-xs"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
}
