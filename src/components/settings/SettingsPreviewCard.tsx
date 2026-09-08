import React, { useState } from 'react';
import { Eye, ChevronDown, ChevronUp, Printer, FileText, Sparkles, X } from 'lucide-react';
import { SystemSettings, StaffMember } from '../../types';

interface SettingsPreviewCardProps {
  formData: SystemSettings;
  activeStaff: StaffMember;
  isModal?: boolean;
  onCloseModal?: () => void;
}

export default function SettingsPreviewCard({
  formData,
  activeStaff,
  isModal = false,
  onCloseModal
}: SettingsPreviewCardProps) {
  const [previewTab, setPreviewTab] = useState<'receipt' | 'invoice'>('receipt');
  const [isExpanded, setIsExpanded] = useState(!isModal);

  const content = (
    <div className="space-y-4">
      {/* Tab Switcher */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          <span className="text-xs font-bold text-slate-700">Select Template Simulation:</span>
        </div>
        <div className="flex bg-slate-100 p-0.5 rounded-xl text-xs font-bold w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setPreviewTab('receipt')}
            className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              previewTab === 'receipt' ? 'bg-white text-slate-900 shadow-3xs font-black' : 'text-gray-500 hover:text-slate-700'
            }`}
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Thermal Receipt</span>
          </button>
          <button
            type="button"
            onClick={() => setPreviewTab('invoice')}
            className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              previewTab === 'invoice' ? 'bg-white text-slate-900 shadow-3xs font-black' : 'text-gray-500 hover:text-slate-700'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Fiscal Invoice</span>
          </button>
        </div>
      </div>

      {/* Preview Output */}
      {previewTab === 'receipt' ? (
        <div className="bg-slate-100 p-3 sm:p-5 rounded-2xl flex justify-center overflow-x-auto">
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-gray-300 shadow-xs max-w-[280px] sm:max-w-[320px] w-full text-center space-y-2 text-[11px] font-mono text-slate-800">
            {formData.receipt.showLogo && (
              <div className="font-black text-sm tracking-wider uppercase text-slate-900 pb-1.5 border-b border-dashed border-gray-300">
                {formData.business.companyName || 'NEXUS ENTERPRISE'}
              </div>
            )}
            <div className="text-[10px] text-gray-500 leading-tight">
              {formData.business.address || '450 Rawdon Street'}
              <br />
              {formData.business.city}, {formData.business.country}
              <br />
              Tel: {formData.business.phone}
            </div>
            <div className="font-bold text-gray-700 py-1 border-y border-dashed border-gray-300 text-[10px]">
              {formData.receipt.headerText || 'THANK YOU FOR VISITING'}
            </div>
            
            <div className="text-left space-y-1 py-1 text-[10px]">
              <div className="flex justify-between">
                <span>Sample Item (x2)</span>
                <span>{formData.currencyConfig.primaryCurrency} 40.00</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>{formData.tax.taxName} ({formData.tax.defaultTaxRate}%)</span>
                <span>{formData.currencyConfig.primaryCurrency} {(40 * formData.tax.defaultTaxRate / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-black text-xs pt-1 border-t border-gray-200 text-slate-900">
                <span>TOTAL DUE</span>
                <span>{formData.currencyConfig.primaryCurrency} {(40 * (1 + formData.tax.defaultTaxRate / 100)).toFixed(2)}</span>
              </div>
            </div>

            {formData.receipt.showCashierName && (
              <div className="text-[10px] text-gray-400 text-left pt-0.5">
                Cashier: {activeStaff.name} ({activeStaff.role})
              </div>
            )}

            <div className="text-[10px] text-gray-500 pt-1 border-t border-dashed border-gray-300">
              {formData.receipt.footerText || 'Please retain slip for returns within 30 days.'}
            </div>

            {formData.receipt.showBarcode && (
              <div className="pt-1 text-[9px] text-gray-400 tracking-widest font-bold">
                ||| | ||||| || |||| |||| |||
              </div>
            )}

            {formData.receipt.showQrCode && (
              <div className="pt-1 text-[9px] text-indigo-600 font-bold">
                [QR E-Receipt Verified]
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-slate-100 p-3 sm:p-5 rounded-2xl overflow-x-auto">
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-gray-300 shadow-xs space-y-3 text-xs min-w-[280px]">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-gray-200 pb-3">
              <div>
                <div className="font-black text-base text-slate-900">{formData.business.companyName || 'Nexus Enterprise'}</div>
                <div className="text-[11px] text-gray-500">{formData.business.tagline || 'Omnichannel Retail & POS'}</div>
                <div className="text-[10px] text-gray-400 font-mono mt-0.5">Tax Reg: {formData.business.taxId}</div>
              </div>
              <div className="sm:text-right">
                <div className="inline-block text-xs font-black font-mono text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200">
                  {formData.invoiceNumbering.invoicePrefix}
                  {formData.invoiceNumbering.includeYearMonth ? `${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-` : ''}
                  {String(formData.invoiceNumbering.nextInvoiceNumber).padStart(formData.invoiceNumbering.digitPadding, '0')}
                </div>
                <div className="text-[10px] text-gray-400 mt-1">Issue Date: {new Date().toLocaleDateString()}</div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-gray-600 pt-1">
              <div>Currency: <strong className="text-slate-900">{formData.currencyConfig.primaryCurrency}</strong></div>
              <div>Valuation: <strong className="text-slate-900">{formData.inventoryRules.valuationMethod}</strong></div>
              <div>Fiscal Rate: <strong className="text-slate-900">{formData.tax.defaultTaxRate}% {formData.tax.taxName}</strong></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // If rendered as a standalone modal for Mobile
  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
        <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-indigo-600" />
              <h3 className="font-black text-slate-900 text-base">Live Template Preview</h3>
            </div>
            <button
              type="button"
              onClick={onCloseModal}
              className="p-2 text-gray-400 hover:text-gray-700 rounded-xl hover:bg-gray-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          {content}
          <div className="pt-2">
            <button
              type="button"
              onClick={onCloseModal}
              className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              Done Previewing
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Inline Collapsible Card for Desktop / In-flow
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6 shadow-xs space-y-4">
      <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
            <Eye className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-black text-slate-900">Live Dynamic Template Preview</h4>
            <p className="text-[11px] text-gray-500 hidden sm:block">Simulates printed thermal receipts and fiscal invoice headers in real time</p>
          </div>
        </div>
        <button
          type="button"
          className="p-1.5 text-gray-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {isExpanded && content}
    </div>
  );
}
