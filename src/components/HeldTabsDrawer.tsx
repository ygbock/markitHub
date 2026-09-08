import React, { useState } from 'react';
import { ParkedOrder, Product } from '../types';
import { useCurrency } from '../context/CurrencyContext';
import { 
  PauseCircle, PlayCircle, Trash2, Search, Clock, User, 
  ShoppingBag, Tag, FileText, X, AlertCircle, Edit3, Check, Plus
} from 'lucide-react';

interface HeldTabsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  parkedOrders: ParkedOrder[];
  onResumeOrder: (parkedId: string) => void;
  onDiscardOrder: (parkedId: string) => void;
  onUpdateNote: (parkedId: string, note: string) => void;
  onClearAll: () => void;
  currentCartCount: number;
  onParkCurrentCart: () => void;
}

export default function HeldTabsDrawer({
  isOpen,
  onClose,
  parkedOrders,
  onResumeOrder,
  onDiscardOrder,
  onUpdateNote,
  onClearAll,
  currentCartCount,
  onParkCurrentCart
}: HeldTabsDrawerProps) {
  const { formatAmount } = useCurrency();
  const [searchTerm, setSearchTerm] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [tempNoteText, setTempNoteText] = useState('');

  if (!isOpen) return null;

  const filteredTabs = parkedOrders.filter(tab => {
    const term = searchTerm.toLowerCase();
    const matchesId = tab.id.toLowerCase().includes(term);
    const matchesCust = tab.customerName.toLowerCase().includes(term);
    const matchesNotes = tab.notes?.toLowerCase().includes(term);
    const matchesItems = tab.items.some(i => i.product.name.toLowerCase().includes(term));
    return matchesId || matchesCust || matchesNotes || matchesItems;
  });

  const totalHeldValue = parkedOrders.reduce((sum, tab) => sum + tab.subtotal, 0);

  const startEditNote = (tab: ParkedOrder) => {
    setEditingNoteId(tab.id);
    setTempNoteText(tab.notes || '');
  };

  const saveEditNote = (tabId: string) => {
    onUpdateNote(tabId, tempNoteText.trim());
    setEditingNoteId(null);
  };

  return (
    <div 
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 z-50 animate-in fade-in duration-150"
      id="held-tabs-drawer-backdrop"
    >
      <div 
        className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] border border-gray-150 overflow-hidden"
        id="held-tabs-modal-container"
      >
        {/* Header Strip */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-500 to-amber-600 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center">
              <PauseCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight">Held Tabs & Parked Orders</h2>
                <span className="px-2 py-0.5 bg-white/25 rounded-full text-xs font-black">
                  {parkedOrders.length} {parkedOrders.length === 1 ? 'Tab' : 'Tabs'}
                </span>
              </div>
              <p className="text-xs text-amber-100 mt-0.5">
                Total Suspended Volume: <strong className="text-white font-bold">{formatAmount(totalHeldValue)}</strong> • Persisted Locally
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action & Filter Toolbar */}
        <div className="p-3 sm:p-4 bg-slate-50 border-b border-gray-200 flex flex-col sm:flex-row gap-2.5 justify-between items-stretch sm:items-center shrink-0">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by customer, Tab #, item name, or note..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-slate-700 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {currentCartCount > 0 && (
              <button
                type="button"
                onClick={onParkCurrentCart}
                className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-3xs transition-all"
                title="Hold Current Cart"
              >
                <PauseCircle className="w-3.5 h-3.5" />
                <span>Hold Active Basket</span>
                <span className="px-1.5 py-0.2 bg-white/20 rounded-md text-[10px]">{currentCartCount}</span>
              </button>
            )}

            {parkedOrders.length > 0 && (
              <button
                type="button"
                onClick={onClearAll}
                className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1 transition-all"
                title="Clear All Held Tabs"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span className="hidden sm:inline">Clear All</span>
              </button>
            )}
          </div>
        </div>

        {/* Tabs List */}
        <div className="p-4 overflow-y-auto flex-1 space-y-3" id="held-tabs-scroll-area">
          {filteredTabs.length > 0 ? (
            filteredTabs.map((tab) => {
              const totalItemsQty = tab.items.reduce((sum, item) => sum + item.quantity, 0);
              const isEditingThisNote = editingNoteId === tab.id;

              return (
                <div 
                  key={tab.id}
                  className="p-4 bg-white hover:bg-amber-50/20 rounded-2xl border border-gray-200 hover:border-amber-300 shadow-3xs transition-all space-y-3"
                  id={`tab-card-${tab.id}`}
                >
                  {/* Top row: Tab ID, Time, Customer & Actions */}
                  <div className="flex flex-wrap items-start justify-between gap-2 border-b border-gray-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 bg-amber-100 text-amber-900 rounded-lg font-mono font-bold text-xs">
                        {tab.id}
                      </span>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-gray-400" />
                        {tab.heldAt}
                      </span>
                      <span className="text-gray-300">•</span>
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400" />
                        {tab.customerName}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onResumeOrder(tab.id)}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-3xs transition-all"
                      >
                        <PlayCircle className="w-3.5 h-3.5" />
                        <span>Resume & Checkout</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onDiscardOrder(tab.id)}
                        className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                        title="Discard this tab"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Items List Breakdown */}
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-gray-150 space-y-1.5">
                    <div className="flex justify-between text-[11px] font-bold text-gray-500 uppercase tracking-wider px-1">
                      <span>Items ({totalItemsQty})</span>
                      <span>Amount</span>
                    </div>
                    <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                      {tab.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs text-slate-700 py-0.5 px-1 border-b border-gray-100 last:border-0">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 bg-white border border-gray-200 rounded-md font-mono text-[10px] font-bold text-slate-700 flex items-center justify-center shrink-0">
                              {item.quantity}x
                            </span>
                            <span className="font-medium truncate max-w-[220px] sm:max-w-[320px]">{item.product.name}</span>
                            {item.selectedVariantSku && (
                              <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded-sm font-mono">
                                {item.selectedVariantSku}
                              </span>
                            )}
                          </div>
                          <span className="font-mono font-semibold text-slate-900 shrink-0">
                            {formatAmount(item.product.price * item.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-between items-center pt-1.5 border-t border-gray-200 text-xs px-1 font-bold">
                      <span className="text-slate-600">Subtotal Value</span>
                      <span className="font-mono text-slate-900 font-black">{formatAmount(tab.subtotal)}</span>
                    </div>
                  </div>

                  {/* Tab Notes & Annotation */}
                  <div className="text-xs bg-amber-50/60 p-2.5 rounded-xl border border-amber-200/60 flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 text-amber-900 font-bold text-[11px] mb-1">
                        <FileText className="w-3.5 h-3.5 text-amber-600" />
                        <span>Tab Notes / Special Instructions</span>
                      </div>
                      {isEditingThisNote ? (
                        <div className="flex items-center gap-1.5 mt-1">
                          <input
                            type="text"
                            value={tempNoteText}
                            onChange={(e) => setTempNoteText(e.target.value)}
                            placeholder="e.g. Table 4, customer getting cash, hold until 2 PM..."
                            className="flex-1 px-2.5 py-1 bg-white border border-amber-300 rounded-lg text-xs focus:ring-1 focus:ring-amber-500 focus:outline-hidden"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => saveEditNote(tab.id)}
                            className="p-1 bg-emerald-600 text-white rounded-lg text-xs"
                            title="Save Note"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingNoteId(null)}
                            className="p-1 bg-gray-200 text-slate-700 rounded-lg text-xs"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <p className="text-slate-700 text-xs italic">
                          {tab.notes ? `"${tab.notes}"` : <span className="text-gray-400 not-italic">No special notes attached.</span>}
                        </p>
                      )}
                    </div>

                    {!isEditingThisNote && (
                      <button
                        type="button"
                        onClick={() => startEditNote(tab)}
                        className="text-amber-700 hover:text-amber-900 p-1 text-[11px] font-bold flex items-center gap-1 shrink-0"
                        title="Edit Note"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>{tab.notes ? 'Edit' : 'Add Note'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 px-4 bg-slate-50 rounded-2xl border border-dashed border-gray-200 space-y-2">
              <PauseCircle className="w-10 h-10 mx-auto text-amber-400 opacity-60" />
              <h3 className="font-bold text-slate-800 text-sm">
                {searchTerm ? 'No Matching Held Tabs' : 'No Held Tabs in Memory'}
              </h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                {searchTerm 
                  ? `No held orders match "${searchTerm}". Try another search term or clear the filter.`
                  : 'When a customer needs time to retrieve payment or step away, click "Hold Tab" in the active basket to park it safely.'}
              </p>
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="mt-2 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-bold"
                >
                  Clear Search
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer info & close */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-gray-200 flex justify-between items-center text-xs shrink-0">
          <span className="text-gray-500 text-[11px]">
            Held tabs are automatically saved in local browser storage across refreshes.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold shadow-xs transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
