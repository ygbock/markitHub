import React, { useState, useEffect } from 'react';
import { RotateCcw, AlertTriangle, Sliders, Layout, Sparkles, Check, Layers } from 'lucide-react';
import { SystemSettings, StaffMember, StorefrontHomepageConfig } from '../types';
import { useCurrency } from '../context/CurrencyContext';
import { DEFAULT_SETTINGS, saveSettingsToDB } from '../services/dbService';
import { DEFAULT_HOMEPAGE_CONFIG } from '../data/homepageConfig';
import { INITIAL_PRODUCTS } from '../data/mockData';

// Subcomponents
import SettingsHeader from './settings/SettingsHeader';
import SettingsNav, { SettingsSection, SECTIONS } from './settings/SettingsNav';
import SettingsFloatingDock from './settings/SettingsFloatingDock';
import SettingsPreviewCard from './settings/SettingsPreviewCard';
import GeneralAndFinanceSections from './settings/sections/GeneralAndFinanceSections';
import OperationsAndSalesSections from './settings/sections/OperationsAndSalesSections';
import SystemAndSecuritySections from './settings/sections/SystemAndSecuritySections';
import ECommerceCMSModal from './ecommerce/ECommerceCMSModal';

interface SettingsModuleProps {
  settings: SystemSettings;
  onUpdateSettings: (newSettings: SystemSettings) => void;
  activeStaff: StaffMember;
  onAuditLog?: (action: string, module: string, details: string) => void;
}

export default function SettingsModule({
  settings,
  onUpdateSettings,
  activeStaff,
  onAuditLog
}: SettingsModuleProps) {
  // Local form state cloned from props
  const [formData, setFormData] = useState<SystemSettings>(settings);
  const [activeSection, setActiveSection] = useState<SettingsSection>('business');
  const [isSavedAlert, setIsSavedAlert] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isSectionPickerOpen, setIsSectionPickerOpen] = useState(false);
  const [isCmsModalOpen, setIsCmsModalOpen] = useState(false);

  const { currentCurrency, setCurrencyByCode } = useCurrency();

  // Sync with incoming props if changed externally
  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  // Update specific deep state
  const updateSection = <K extends keyof SystemSettings>(section: K, values: Partial<SystemSettings[K]>) => {
    setFormData(prev => {
      const current = prev[section];
      if (typeof current === 'object' && current !== null && !Array.isArray(current)) {
        return {
          ...prev,
          [section]: {
            ...current,
            ...values
          }
        };
      }
      return {
        ...prev,
        ...values
      };
    });
  };

  const handleSave = async () => {
    const updated: SystemSettings = {
      ...formData,
      businessName: formData.business.companyName || formData.businessName,
      currency: formData.currencyConfig.primaryCurrency || formData.currency,
      taxRate: (formData.tax.defaultTaxRate || 8.5) / 100,
      enableSoundEffects: formData.pos.enableSoundEffects,
      lowStockThreshold: formData.lowStock.globalLowStockThreshold || 10,
      lastUpdated: new Date().toISOString()
    };

    onUpdateSettings(updated);
    await saveSettingsToDB(updated);

    // If primary currency changed, update context
    if (updated.currencyConfig.primaryCurrency !== currentCurrency.code) {
      await setCurrencyByCode(updated.currencyConfig.primaryCurrency);
    }

    if (onAuditLog) {
      onAuditLog(
        'Updated System Configuration',
        'Billing',
        `Supervisor ${activeStaff.name} saved central system configuration updates.`
      );
    }

    setIsSavedAlert(true);
    setTimeout(() => setIsSavedAlert(false), 3500);
  };

  const handleResetToDefaults = async () => {
    setFormData(DEFAULT_SETTINGS);
    onUpdateSettings(DEFAULT_SETTINGS);
    await saveSettingsToDB(DEFAULT_SETTINGS);
    await setCurrencyByCode(DEFAULT_SETTINGS.currencyConfig.primaryCurrency);
    setIsResetConfirmOpen(false);

    if (onAuditLog) {
      onAuditLog(
        'Reset System Configuration',
        'Billing',
        `Supervisor ${activeStaff.name} reverted all system parameters to factory defaults.`
      );
    }

    setIsSavedAlert(true);
    setTimeout(() => setIsSavedAlert(false), 3500);
  };

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(formData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `nexus-system-settings-${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed && typeof parsed === 'object') {
            const merged = { ...DEFAULT_SETTINGS, ...parsed };
            setFormData(merged);
            alert('Settings configuration file loaded successfully! Click "Save Changes" to apply.');
          }
        } catch {
          alert('Invalid JSON file format.');
        }
      };
    }
  };

  const activeSectionItem = SECTIONS.find(s => s.id === activeSection) || SECTIONS[0];

  return (
    <div className="space-y-4 sm:space-y-6 pb-20 lg:pb-6" id="system-settings-module-root">
      
      {/* 1. Header Toolbar (Static & Sticky for desktop view) */}
      <div className="lg:sticky lg:top-0 lg:z-20 bg-slate-50/95 lg:backdrop-blur-md pt-1 pb-1 transition-all">
        <SettingsHeader
          onSave={handleSave}
          onExport={handleExportJSON}
          onImport={handleImportJSON}
          onResetPrompt={() => setIsResetConfirmOpen(true)}
          isSavedAlert={isSavedAlert}
          onCloseAlert={() => setIsSavedAlert(false)}
          activeStaff={activeStaff}
          activeSectionTitle={activeSectionItem.label}
        />
      </div>

      {/* 2. Main 12-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
        
        {/* Left Sidebar (Static & Sticky for Desktop view: col-span-4 / Mobile & Tablet: full width horizontal dock) */}
        <aside className="lg:col-span-4 lg:sticky lg:top-[92px] lg:self-start lg:max-h-[calc(100vh-110px)] flex flex-col space-y-4 z-10" id="settings-static-sidebar">
          <SettingsNav
            activeSection={activeSection}
            onSelectSection={setActiveSection}
            activeStaff={activeStaff}
            terminalName={formData.pos.terminalName || 'Register #01'}
          />
        </aside>

        {/* Right Content Area (Desktop: col-span-8 / Mobile & Tablet: full width active form) */}
        <div className="lg:col-span-8 space-y-4 sm:space-y-6">
          
          {/* General & Finance Domains (1-5) */}
          <GeneralAndFinanceSections
            activeSection={activeSection}
            formData={formData}
            updateSection={updateSection}
            onNavigateSection={setActiveSection}
            activeStaff={activeStaff}
          />

          {/* Operations & Sales Domains (6-10) */}
          <OperationsAndSalesSections
            activeSection={activeSection}
            formData={formData}
            updateSection={updateSection}
            onNavigateSection={setActiveSection}
            activeStaff={activeStaff}
          />

          {/* System & Security Domains (11-14) */}
          <SystemAndSecuritySections
            activeSection={activeSection}
            formData={formData}
            updateSection={updateSection}
            onNavigateSection={setActiveSection}
            activeStaff={activeStaff}
          />

          {/* Storefront Homepage CMS Section */}
          {activeSection === 'homepage' && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-black text-slate-900 dark:text-white">Storefront Homepage CMS</h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                      Content-Driven Architecture
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Control homepage section stack, display sequence, hero slides, promo banners, and category visibility without changing frontend code.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsCmsModalOpen(true)}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold rounded-2xl shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all cursor-pointer shrink-0"
                >
                  <Sliders className="w-4 h-4 text-indigo-200" />
                  <span>Open Homepage CMS Customizer</span>
                </button>
              </div>

              {/* Active Layout Section Summary Grid */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-indigo-500" />
                  Current Homepage Stack Sequence ({ (formData.homepageConfig?.sections || DEFAULT_HOMEPAGE_CONFIG.sections).filter(s => s.enabled).length } Active Sections)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(formData.homepageConfig?.sections || DEFAULT_HOMEPAGE_CONFIG.sections).map((sec, idx) => (
                    <div 
                      key={sec.id}
                      className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                        sec.enabled ? 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80' : 'bg-slate-100/50 dark:bg-slate-900/50 border-slate-200/50 dark:border-slate-800/50 opacity-50'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-6 h-6 rounded-xl bg-indigo-600 text-white text-[11px] font-black flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div className="truncate">
                          <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">
                            {sec.title}
                          </span>
                          <span className="text-[10px] text-slate-400 capitalize font-mono">
                            {String(sec.type || '').replace('_', ' ')}
                          </span>
                        </div>
                      </div>

                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                        sec.enabled ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                      }`}>
                        {sec.enabled ? 'Enabled' : 'Hidden'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Live Simulated Thermal Receipt / Invoice Preview (Inline collapsible on Desktop/Tablet) */}
          <SettingsPreviewCard
            formData={formData}
            activeStaff={activeStaff}
          />

        </div>
      </div>

      {/* Storefront Homepage CMS Modal */}
      <ECommerceCMSModal
        isOpen={isCmsModalOpen}
        onClose={() => setIsCmsModalOpen(false)}
        config={formData.homepageConfig || DEFAULT_HOMEPAGE_CONFIG}
        onSaveConfig={(newCmsConfig) => {
          setFormData(prev => ({
            ...prev,
            homepageConfig: newCmsConfig
          }));
          try {
            localStorage.setItem('nexus_homepage_config', JSON.stringify(newCmsConfig));
          } catch (e) {
            console.warn('Failed to save homepage config', e);
          }
        }}
        categories={['Electronics', 'Apparel & Fashion', 'Home & Living', 'Food & Beverages', 'Beauty & Personal Care', 'Sports & Outdoors']}
        products={INITIAL_PRODUCTS}
      />

      {/* 3. Floating Quick-Action Dock on Mobile & Tablet (< lg) */}
      <SettingsFloatingDock
        activeSection={activeSection}
        onOpenSectionPicker={() => {
          // Trigger section switch by scrolling or opening selector
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenPreview={() => setIsPreviewModalOpen(true)}
        onSave={handleSave}
      />

      {/* 4. Mobile Standalone Live Preview Modal */}
      {isPreviewModalOpen && (
        <SettingsPreviewCard
          formData={formData}
          activeStaff={activeStaff}
          isModal={true}
          onCloseModal={() => setIsPreviewModalOpen(false)}
        />
      )}

      {/* 5. Reset Factory Defaults Confirmation Modal */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 border border-gray-100">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">Reset System Parameters?</h3>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                This will overwrite all 14 configuration sections back to initial out-of-the-box defaults. Unsaved custom settings will be replaced.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetToDefaults}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Confirm Reset</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
