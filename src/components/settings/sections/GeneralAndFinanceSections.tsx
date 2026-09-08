import React from 'react';
import { 
  Building2, Coins, Percent, Receipt, FileText, 
  ToggleLeft, ToggleRight, ArrowRight, ArrowLeft
} from 'lucide-react';
import { SystemSettings, StaffMember } from '../../../types';
import { SUPPORTED_CURRENCIES } from '../../../context/CurrencyContext';
import { SettingsSection } from '../SettingsNav';

interface GeneralAndFinanceSectionsProps {
  activeSection: SettingsSection;
  formData: SystemSettings;
  updateSection: <K extends keyof SystemSettings>(section: K, values: Partial<SystemSettings[K]>) => void;
  onNavigateSection: (nextSection: SettingsSection) => void;
  activeStaff: StaffMember;
}

export default function GeneralAndFinanceSections({
  activeSection,
  formData,
  updateSection,
  onNavigateSection,
  activeStaff
}: GeneralAndFinanceSectionsProps) {

  // ====================================================
  // 1. BUSINESS INFORMATION
  // ====================================================
  if (activeSection === 'business') {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-7 shadow-xs space-y-6" id="settings-section-business">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-600 shrink-0" />
              <span>Business & Company Information</span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">Physical store location, contact lines and official legal registration.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1">Trading Company / Brand Name</label>
            <input
              type="text"
              value={formData.business.companyName}
              onChange={(e) => updateSection('business', { companyName: e.target.value })}
              placeholder="e.g. Nexus Enterprise Commerce"
              className="w-full px-3.5 py-2.5 sm:py-3 bg-slate-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Legal Registered Entity Name</label>
            <input
              type="text"
              value={formData.business.legalName}
              onChange={(e) => updateSection('business', { legalName: e.target.value })}
              placeholder="e.g. Nexus Retail & POS Global LLC"
              className="w-full px-3.5 py-2.5 sm:py-3 bg-slate-50 border border-gray-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Marketing Tagline / Slogan</label>
            <input
              type="text"
              value={formData.business.tagline}
              onChange={(e) => updateSection('business', { tagline: e.target.value })}
              placeholder="e.g. Unified Omnichannel Commerce"
              className="w-full px-3.5 py-2.5 sm:py-3 bg-slate-50 border border-gray-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Tax ID / VAT Registration #</label>
            <input
              type="text"
              value={formData.business.taxId}
              onChange={(e) => updateSection('business', { taxId: e.target.value })}
              placeholder="e.g. VAT-SL-88492019-TX"
              className="w-full px-3.5 py-2.5 sm:py-3 bg-slate-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-mono focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Commercial Reg # / License</label>
            <input
              type="text"
              value={formData.business.registrationNumber}
              onChange={(e) => updateSection('business', { registrationNumber: e.target.value })}
              placeholder="e.g. REG-2026-994821"
              className="w-full px-3.5 py-2.5 sm:py-3 bg-slate-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-mono focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Support Phone Number</label>
            <input
              type="text"
              value={formData.business.phone}
              onChange={(e) => updateSection('business', { phone: e.target.value })}
              placeholder="+232 (76) 555-NEXUS"
              className="w-full px-3.5 py-2.5 sm:py-3 bg-slate-50 border border-gray-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Official Support Email</label>
            <input
              type="email"
              value={formData.business.email}
              onChange={(e) => updateSection('business', { email: e.target.value })}
              placeholder="support@nexuscommerce.io"
              className="w-full px-3.5 py-2.5 sm:py-3 bg-slate-50 border border-gray-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1">Store / Headquarter Street Address</label>
            <input
              type="text"
              value={formData.business.address}
              onChange={(e) => updateSection('business', { address: e.target.value })}
              placeholder="450 Rawdon Street, Suite 800"
              className="w-full px-3.5 py-2.5 sm:py-3 bg-slate-50 border border-gray-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:col-span-2 sm:grid-cols-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">City</label>
              <input
                type="text"
                value={formData.business.city}
                onChange={(e) => updateSection('business', { city: e.target.value })}
                placeholder="Freetown"
                className="w-full px-3 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs sm:text-sm focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">State</label>
              <input
                type="text"
                value={formData.business.state}
                onChange={(e) => updateSection('business', { state: e.target.value })}
                placeholder="Western"
                className="w-full px-3 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs sm:text-sm focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Zip Code</label>
              <input
                type="text"
                value={formData.business.postalCode}
                onChange={(e) => updateSection('business', { postalCode: e.target.value })}
                placeholder="00232"
                className="w-full px-3 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-mono focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Country</label>
              <input
                type="text"
                value={formData.business.country}
                onChange={(e) => updateSection('business', { country: e.target.value })}
                placeholder="Sierra Leone"
                className="w-full px-3 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs sm:text-sm focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Website URL</label>
            <input
              type="text"
              value={formData.business.website}
              onChange={(e) => updateSection('business', { website: e.target.value })}
              placeholder="https://nexuspos.io"
              className="w-full px-3.5 py-2.5 sm:py-3 bg-slate-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-mono focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Store Timezone</label>
            <select
              value={formData.business.timeZone}
              onChange={(e) => updateSection('business', { timeZone: e.target.value })}
              className="w-full px-3.5 py-2.5 sm:py-3 bg-slate-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-bold focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
            >
              <option value="GMT (UTC+0)">GMT (UTC+0) - Freetown / London / Accra</option>
              <option value="WAT (UTC+1)">WAT (UTC+1) - Lagos / Luanda</option>
              <option value="CAT (UTC+2)">CAT (UTC+2) - Johannesburg / Cairo</option>
              <option value="EAT (UTC+3)">EAT (UTC+3) - Nairobi / Addis Ababa</option>
              <option value="EST (UTC-5)">EST (UTC-5) - New York / Toronto</option>
              <option value="PST (UTC-8)">PST (UTC-8) - Los Angeles / San Francisco</option>
              <option value="CET (UTC+1)">CET (UTC+1) - Paris / Berlin</option>
              <option value="GST (UTC+4)">GST (UTC+4) - Dubai</option>
            </select>
          </div>
        </div>

        {/* Next step footer button */}
        <div className="pt-4 border-t border-gray-100 flex justify-end">
          <button
            type="button"
            onClick={() => onNavigateSection('currency')}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <span>Next: Currency & Formatting</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // ====================================================
  // 2. CURRENCY & FORMATTING
  // ====================================================
  if (activeSection === 'currency') {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-7 shadow-xs space-y-6" id="settings-section-currency">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <Coins className="w-5 h-5 text-amber-500 shrink-0" />
              <span>Currency & Financial Formatting</span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">Primary accounting currency, symbol position and multi-currency pricing.</p>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-2">Base Accounting & Register Currency</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
            {SUPPORTED_CURRENCIES.map((curr) => {
              const isSelected = formData.currencyConfig.primaryCurrency === curr.code;
              return (
                <button
                  key={curr.code}
                  type="button"
                  onClick={() => updateSection('currencyConfig', { primaryCurrency: curr.code })}
                  className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-400 text-amber-950 font-black shadow-xs'
                      : 'bg-slate-50 border-gray-200 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xl">{curr.flag}</span>
                    <span className="font-mono text-xs font-bold text-gray-500">{curr.symbol}</span>
                  </div>
                  <div className="mt-2">
                    <div className="text-xs font-bold">{curr.code}</div>
                    <div className="text-[10px] text-gray-500 truncate">{curr.name}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4 pt-4 border-t border-gray-100">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Symbol Position</label>
            <select
              value={formData.currencyConfig.symbolPosition}
              onChange={(e) => updateSection('currencyConfig', { symbolPosition: e.target.value as 'prefix' | 'suffix' })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
            >
              <option value="prefix">Prefix (e.g. Le 150.00)</option>
              <option value="suffix">Suffix (e.g. 150.00 Le)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Decimal Places</label>
            <select
              value={formData.currencyConfig.decimalPlaces}
              onChange={(e) => updateSection('currencyConfig', { decimalPlaces: parseInt(e.target.value) })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
            >
              <option value={2}>2 Decimals (Standard - 0.00)</option>
              <option value={0}>0 Decimals (Whole units - 0)</option>
              <option value={3}>3 Decimals (Precision - 0.000)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Space Between Symbol</label>
            <select
              value={formData.currencyConfig.spaceBetween ? 'yes' : 'no'}
              onChange={(e) => updateSection('currencyConfig', { spaceBetween: e.target.value === 'yes' })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
            >
              <option value="yes">Include Space (Le 50)</option>
              <option value="no">No Space ($50)</option>
            </select>
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-gray-200 gap-3">
            <div>
              <span className="text-xs font-bold text-slate-800">Multi-Currency E-Commerce Storefront</span>
              <p className="text-[11px] text-gray-500">Allow online customers to switch display currencies dynamically in real time.</p>
            </div>
            <button
              type="button"
              onClick={() => updateSection('currencyConfig', { multiCurrencyCheckout: !formData.currencyConfig.multiCurrencyCheckout })}
              className="p-1 text-slate-800 hover:text-indigo-600 transition-colors shrink-0 cursor-pointer"
            >
              {formData.currencyConfig.multiCurrencyCheckout ? (
                <ToggleRight className="w-8 h-8 text-indigo-600" />
              ) : (
                <ToggleLeft className="w-8 h-8 text-gray-300" />
              )}
            </button>
          </div>

          <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-gray-200 gap-3">
            <div>
              <span className="text-xs font-bold text-slate-800">Automatic Exchange Rates Refresh</span>
              <p className="text-[11px] text-gray-500">Synchronize daily foreign exchange benchmark rates automatically.</p>
            </div>
            <button
              type="button"
              onClick={() => updateSection('currencyConfig', { autoUpdateRates: !formData.currencyConfig.autoUpdateRates })}
              className="p-1 text-slate-800 hover:text-indigo-600 transition-colors shrink-0 cursor-pointer"
            >
              {formData.currencyConfig.autoUpdateRates ? (
                <ToggleRight className="w-8 h-8 text-indigo-600" />
              ) : (
                <ToggleLeft className="w-8 h-8 text-gray-300" />
              )}
            </button>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
          <button
            type="button"
            onClick={() => onNavigateSection('business')}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Previous</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigateSection('tax')}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <span>Next: Tax & Rates</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // ====================================================
  // 3. TAX & FISCAL RATES
  // ====================================================
  if (activeSection === 'tax') {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-7 shadow-xs space-y-6" id="settings-section-tax">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <Percent className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Tax Configuration & Fiscal Rates</span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">Value-Added Tax (VAT), sales tax calculation rules and exemptions.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Standard Sales Tax Rate (%)</label>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={formData.tax.defaultTaxRate}
                onChange={(e) => updateSection('tax', { defaultTaxRate: parseFloat(e.target.value) || 0 })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-bold focus:ring-2 focus:ring-slate-900 focus:outline-hidden pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">%</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Tax Display Label</label>
            <input
              type="text"
              value={formData.tax.taxName}
              onChange={(e) => updateSection('tax', { taxName: e.target.value })}
              placeholder="e.g. GST / Sales Tax or VAT"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Tax Calculation Method</label>
            <select
              value={formData.tax.taxCalculation}
              onChange={(e) => updateSection('tax', { taxCalculation: e.target.value as 'exclusive' | 'inclusive' })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-bold focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
            >
              <option value="exclusive">Tax Exclusive (Added on top at checkout)</option>
              <option value="inclusive">Tax Inclusive (Included inside sticker price)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Tax Authority Registration #</label>
            <input
              type="text"
              value={formData.tax.taxRegistrationNumber}
              onChange={(e) => updateSection('tax', { taxRegistrationNumber: e.target.value })}
              placeholder="VAT-SL-88492019-TX"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-mono focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
            />
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-gray-200 gap-3">
            <div>
              <span className="text-xs font-bold text-slate-800">Allow Tax Exemption Toggle on Register</span>
              <p className="text-[11px] text-gray-500">Cashiers can flag non-profit, wholesale or diplomatic orders as tax exempt.</p>
            </div>
            <button
              type="button"
              onClick={() => updateSection('tax', { allowTaxExemption: !formData.tax.allowTaxExemption })}
              className="p-1 text-slate-800 hover:text-indigo-600 transition-colors shrink-0 cursor-pointer"
            >
              {formData.tax.allowTaxExemption ? (
                <ToggleRight className="w-8 h-8 text-indigo-600" />
              ) : (
                <ToggleLeft className="w-8 h-8 text-gray-300" />
              )}
            </button>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-gray-200 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-slate-800">Secondary Regional Surcharge / City Tax</span>
                <p className="text-[11px] text-gray-500">Enable an additional municipality or regional environmental levy.</p>
              </div>
              <button
                type="button"
                onClick={() => updateSection('tax', { enableSecondaryTax: !formData.tax.enableSecondaryTax })}
                className="p-1 text-slate-800 hover:text-indigo-600 transition-colors shrink-0 cursor-pointer"
              >
                {formData.tax.enableSecondaryTax ? (
                  <ToggleRight className="w-8 h-8 text-indigo-600" />
                ) : (
                  <ToggleLeft className="w-8 h-8 text-gray-300" />
                )}
              </button>
            </div>

            {formData.tax.enableSecondaryTax && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Secondary Tax Name</label>
                  <input
                    type="text"
                    value={formData.tax.secondaryTaxName}
                    onChange={(e) => updateSection('tax', { secondaryTaxName: e.target.value })}
                    placeholder="e.g. Municipal Surcharge"
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Secondary Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.tax.secondaryTaxRate}
                    onChange={(e) => updateSection('tax', { secondaryTaxRate: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs focus:outline-hidden"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
          <button
            type="button"
            onClick={() => onNavigateSection('currency')}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Previous</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigateSection('receipt')}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <span>Next: Receipt & Printing</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // ====================================================
  // 4. RECEIPT SETTINGS
  // ====================================================
  if (activeSection === 'receipt') {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-7 shadow-xs space-y-6" id="settings-section-receipt">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-indigo-600 shrink-0" />
              <span>Receipt Template & Thermal Printing</span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">Customize customer receipt headers, return policy and printer formats.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Thermal Printer Paper Width</label>
            <select
              value={formData.receipt.printerType}
              onChange={(e) => updateSection('receipt', { printerType: e.target.value as any })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-bold focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
            >
              <option value="thermal-80mm">Standard Thermal (80mm / 3 inch)</option>
              <option value="thermal-58mm">Compact Thermal (58mm / 2 inch)</option>
              <option value="standard-a4">Standard Sheet Paper (A4 / Letter)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Header Custom Greeting</label>
            <input
              type="text"
              value={formData.receipt.headerText}
              onChange={(e) => updateSection('receipt', { headerText: e.target.value })}
              placeholder="THANK YOU FOR VISITING NEXUS"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1">Footer Thank You Note</label>
            <input
              type="text"
              value={formData.receipt.footerText}
              onChange={(e) => updateSection('receipt', { footerText: e.target.value })}
              placeholder="Please retain receipt for exchange within 30 days"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1">Official Return & Exchange Policy Text</label>
            <textarea
              rows={3}
              value={formData.receipt.returnPolicy}
              onChange={(e) => updateSection('receipt', { returnPolicy: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
            />
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t border-gray-100">
          <label className="block text-xs font-bold text-slate-800">Printable Receipt Inclusions</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {[
              { key: 'showLogo', label: 'Print Store Logo Graphic' },
              { key: 'showCashierName', label: 'Print Active Cashier Name' },
              { key: 'showCustomerInfo', label: 'Print Customer Name & Loyalty Pts' },
              { key: 'showBarcode', label: 'Print Code128 Order Barcode' },
              { key: 'showQrCode', label: 'Print E-Receipt Verification QR Code' },
              { key: 'autoPrintOnCheckout', label: 'Auto-Trigger Print Dialog on Tender' },
              { key: 'autoEmailReceipt', label: 'Prompt Digital Email Receipt' },
            ].map((elem) => {
              const checked = (formData.receipt as any)[elem.key] ?? true;
              return (
                <label 
                  key={elem.key}
                  className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-gray-200 hover:bg-slate-100 cursor-pointer text-xs font-semibold text-slate-700 min-h-[44px]"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => updateSection('receipt', { [elem.key]: e.target.checked })}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 shrink-0"
                  />
                  <span>{elem.label}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
          <button
            type="button"
            onClick={() => onNavigateSection('tax')}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Previous</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigateSection('invoice')}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <span>Next: Invoice Numbering</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // ====================================================
  // 5. INVOICE NUMBERING
  // ====================================================
  if (activeSection === 'invoice') {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-7 shadow-xs space-y-6" id="settings-section-invoice">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600 shrink-0" />
              <span>Invoice & Document Numbering Rules</span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">Sequential numbering formats, padding and credit note series.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Invoice Prefix</label>
            <input
              type="text"
              value={formData.invoiceNumbering.invoicePrefix}
              onChange={(e) => updateSection('invoiceNumbering', { invoicePrefix: e.target.value })}
              placeholder="INV-"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-mono font-bold focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Next Sequence Number</label>
            <input
              type="number"
              min="1"
              value={formData.invoiceNumbering.nextInvoiceNumber}
              onChange={(e) => updateSection('invoiceNumbering', { nextInvoiceNumber: parseInt(e.target.value) || 1 })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-mono font-bold focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Zero Digit Padding</label>
            <select
              value={formData.invoiceNumbering.digitPadding}
              onChange={(e) => updateSection('invoiceNumbering', { digitPadding: parseInt(e.target.value) })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-bold focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
            >
              <option value={4}>4 Digits (e.g. 0001)</option>
              <option value={5}>5 Digits (e.g. 00001)</option>
              <option value={6}>6 Digits (e.g. 000001)</option>
              <option value={8}>8 Digits (e.g. 00000001)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Credit Note Prefix</label>
            <input
              type="text"
              value={formData.invoiceNumbering.creditNotePrefix}
              onChange={(e) => updateSection('invoiceNumbering', { creditNotePrefix: e.target.value })}
              placeholder="CN-"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-mono font-bold focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Quotation Prefix</label>
            <input
              type="text"
              value={formData.invoiceNumbering.quotePrefix}
              onChange={(e) => updateSection('invoiceNumbering', { quotePrefix: e.target.value })}
              placeholder="QTE-"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-mono font-bold focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Annual / Monthly Reset</label>
            <select
              value={formData.invoiceNumbering.resetSequence}
              onChange={(e) => updateSection('invoiceNumbering', { resetSequence: e.target.value as any })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-bold focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
            >
              <option value="never">Continuous (Never reset counter)</option>
              <option value="yearly">Yearly Reset (Start at 1 each Jan)</option>
              <option value="monthly">Monthly Reset (Start at 1 each month)</option>
            </select>
          </div>
        </div>

        {/* Sample Output */}
        <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-900 font-mono">Live Invoice Output Format:</span>
            <div className="text-lg font-black text-indigo-950 font-mono mt-0.5">
              {formData.invoiceNumbering.invoicePrefix}
              {formData.invoiceNumbering.includeYearMonth ? `${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-` : ''}
              {String(formData.invoiceNumbering.nextInvoiceNumber).padStart(formData.invoiceNumbering.digitPadding, '0')}
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs font-bold text-indigo-900 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.invoiceNumbering.includeYearMonth}
              onChange={(e) => updateSection('invoiceNumbering', { includeYearMonth: e.target.checked })}
              className="w-4 h-4 rounded text-indigo-600"
            />
            <span>Inject YYYYMM timestamp</span>
          </label>
        </div>

        <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
          <button
            type="button"
            onClick={() => onNavigateSection('receipt')}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Previous</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigateSection('pos')}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <span>Next: POS Terminal</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return null;
}
