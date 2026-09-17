import React, { useState } from 'react';
import { 
  Building2, Store, Check, ArrowRight, ArrowLeft, 
  MapPin, Phone, Mail, FileText, Sparkles, ShieldCheck, CheckCircle2 
} from 'lucide-react';
import { DISCOVERY_CATEGORIES } from '../../data/discoveryData';

interface BusinessOnboardingShellProps {
  onNavigate: (path: string) => void;
  onComplete: (businessData: any, choice: 'LISTING_ONLY' | 'LISTING_AND_STORE') => void;
}

export default function BusinessOnboardingShell({
  onNavigate,
  onComplete,
}: BusinessOnboardingShellProps) {
  const [step, setStep] = useState<number>(1);
  const [businessName, setBusinessName] = useState('');
  const [category, setCategory] = useState('repairs');
  const [tagline, setTagline] = useState('');
  const [about, setAbout] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Freetown');
  const [phone, setPhone] = useState('+232 ');
  const [email, setEmail] = useState('');
  const [openingHours, setOpeningHours] = useState('Mon - Sat: 8:30 AM - 6:30 PM');
  const [selectedPlanChoice, setSelectedPlanChoice] = useState<'LISTING_ONLY' | 'LISTING_AND_STORE'>('LISTING_AND_STORE');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedRecord, setCompletedRecord] = useState<any | null>(null);

  const handleNext = () => {
    if (step === 1 && !businessName.trim()) return;
    if (step === 2 && !address.trim()) return;
    setStep(prev => prev + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(prev => prev - 1);
  };

  const handleFinalSubmit = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      const generatedSlug = businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const record = {
        id: `biz-${Date.now()}`,
        businessSlug: generatedSlug,
        name: businessName,
        category,
        tagline: tagline || `${businessName} in ${city}`,
        about: about || 'Verified registered local business on MikitHub.',
        address,
        city,
        phone,
        email,
        openingHours,
        choice: selectedPlanChoice,
        isTenant: selectedPlanChoice === 'LISTING_AND_STORE',
        tenantId: selectedPlanChoice === 'LISTING_AND_STORE' ? generatedSlug : undefined,
      };

      setCompletedRecord(record);
      setIsSubmitting(false);
      onComplete(record, selectedPlanChoice);
    }, 600);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between font-sans relative overflow-hidden" id="business-onboarding-root">
      {/* Background accents */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-32 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <header className="px-6 py-4 border-b border-white/10 backdrop-blur-md flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-xl text-white font-black text-xs flex items-center justify-center">
            M
          </div>
          <div>
            <div className="text-xs font-black uppercase text-white tracking-wider">
              MikitHub <span className="text-[10px] font-mono px-2 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full ml-1">Business Setup</span>
            </div>
            <p className="text-[10px] text-slate-400">Canonical Business Identity Registration</p>
          </div>
        </div>

        <button
          onClick={() => onNavigate('/')}
          className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Exit to Discovery</span>
        </button>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-2xl bg-slate-800/90 backdrop-blur-2xl rounded-3xl border border-white/10 p-8 shadow-2xl">
          
          {/* Completed State */}
          {completedRecord ? (
            <div className="text-center py-8 space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 mx-auto flex items-center justify-center shadow-lg">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <h2 className="text-2xl font-black text-white">Business Successfully Registered!</h2>
                <p className="text-sm text-slate-400 mt-2 max-w-md mx-auto">
                  {completedRecord.isTenant
                    ? `"${completedRecord.name}" is now provisioned with an active MikitHub tenant workspace and storefront.`
                    : `"${completedRecord.name}" public listing is now active in MikitHub discovery.`}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-left max-w-md mx-auto text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Business Identity:</span>
                  <span className="font-bold text-white">{completedRecord.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Canonical Slug:</span>
                  <span className="font-mono text-indigo-300">{completedRecord.businessSlug}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Model:</span>
                  <span className="font-bold text-emerald-300">
                    {completedRecord.isTenant ? 'Listing + Tenant Storefront' : 'Discovery Listing Only'}
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
                {completedRecord.isTenant ? (
                  <button
                    onClick={() => onNavigate(`/tenant/${completedRecord.tenantId}/dashboard`)}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Store className="w-4 h-4" />
                    <span>Open Tenant Workspace</span>
                  </button>
                ) : (
                  <button
                    onClick={() => onNavigate(`/business/${completedRecord.businessSlug}`)}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Building2 className="w-4 h-4" />
                    <span>View Public Listing</span>
                  </button>
                )}

                <button
                  onClick={() => onNavigate('/')}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 font-bold text-xs transition-all cursor-pointer"
                >
                  Return to Discovery
                </button>
              </div>
            </div>
          ) : (
            /* Multi-step Form */
            <div className="space-y-6">
              
              {/* Stepper Progress */}
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-indigo-400 font-bold">Step {step} of 3</span>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs font-bold text-white">
                    {step === 1 && 'Business Information'}
                    {step === 2 && 'Location & Contact'}
                    {step === 3 && 'Choose Capability Model'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3].map(s => (
                    <div
                      key={s}
                      className={`h-1.5 rounded-full transition-all ${
                        s === step ? 'w-6 bg-indigo-500' : s < step ? 'w-4 bg-emerald-500' : 'w-2 bg-slate-700'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* STEP 1: BUSINESS INFO */}
              {step === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Business Legal or Trading Name *
                    </label>
                    <input
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="e.g. Sierra Tailoring & Alterations, Tech Fix Freetown"
                      className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-white/15 text-white text-sm focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Primary Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-white/15 text-white text-sm focus:outline-none focus:border-indigo-500"
                    >
                      {DISCOVERY_CATEGORIES.filter(c => c.id !== 'all').map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Tagline / Short Summary
                    </label>
                    <input
                      type="text"
                      value={tagline}
                      onChange={(e) => setTagline(e.target.value)}
                      placeholder="e.g. Fast phone screen repairs and genuine accessories"
                      className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-white/15 text-white text-sm focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      About the Business
                    </label>
                    <textarea
                      value={about}
                      onChange={(e) => setAbout(e.target.value)}
                      rows={3}
                      placeholder="Describe your craft, years in business, and specialties..."
                      className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-white/15 text-white text-sm focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              )}

              {/* STEP 2: LOCATION & CONTACT */}
              {step === 2 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Physical Street Address *
                    </label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="e.g. 24 Siaka Stevens Street"
                      className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-white/15 text-white text-sm focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                        City / Town
                      </label>
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-white/15 text-white text-sm focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                        Phone (Call & SMS)
                      </label>
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-white/15 text-white text-sm focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Business Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="contact@mybusiness.sl"
                      className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-white/15 text-white text-sm focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                      Opening Hours
                    </label>
                    <input
                      type="text"
                      value={openingHours}
                      onChange={(e) => setOpeningHours(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-white/15 text-white text-sm focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              )}

              {/* STEP 3: NON-NEGOTIABLE CHOICE: OPTION 1 VS OPTION 2 */}
              {step === 3 && (
                <div className="space-y-5">
                  <div className="text-center space-y-1">
                    <h3 className="text-lg font-black text-white">Select Your Business Model</h3>
                    <p className="text-xs text-slate-400">
                      You can start with a listing and upgrade to full tenant tools at any time.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* OPTION 1: LIST MY BUSINESS */}
                    <div
                      onClick={() => setSelectedPlanChoice('LISTING_ONLY')}
                      className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-4 ${
                        selectedPlanChoice === 'LISTING_ONLY'
                          ? 'border-indigo-500 bg-indigo-950/40 shadow-lg shadow-indigo-500/20'
                          : 'border-white/10 bg-white/5 hover:border-white/20'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="w-10 h-10 rounded-xl bg-slate-800 text-slate-200 flex items-center justify-center">
                            <Building2 className="w-5 h-5" />
                          </div>
                          {selectedPlanChoice === 'LISTING_ONLY' && (
                            <span className="w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[10px]">
                              <Check className="w-3 h-3" />
                            </span>
                          )}
                        </div>

                        <h4 className="text-sm font-black text-white">OPTION 1: LIST MY BUSINESS</h4>
                        <p className="text-xs text-slate-300">
                          For businesses that primarily need local discovery, contact calls, and walk-in foot traffic.
                        </p>

                        <div className="pt-2 text-[11px] space-y-1 text-slate-400">
                          <div className="flex items-center gap-1.5 text-slate-300">
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span>Public Discovery & Search Listing</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-300">
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span>Call, WhatsApp & Driving Directions</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-300">
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span>List Services & Opening Hours</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 text-xs font-mono text-slate-400">
                        No POS / No Storefront required
                      </div>
                    </div>

                    {/* OPTION 2: LIST + CREATE STORE (FULL TENANT) */}
                    <div
                      onClick={() => setSelectedPlanChoice('LISTING_AND_STORE')}
                      className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-4 ${
                        selectedPlanChoice === 'LISTING_AND_STORE'
                          ? 'border-indigo-500 bg-indigo-950/40 shadow-lg shadow-indigo-500/20'
                          : 'border-white/10 bg-white/5 hover:border-white/20'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
                            <Store className="w-5 h-5" />
                          </div>
                          {selectedPlanChoice === 'LISTING_AND_STORE' && (
                            <span className="w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[10px]">
                              <Check className="w-3 h-3" />
                            </span>
                          )}
                        </div>

                        <h4 className="text-sm font-black text-white">OPTION 2: LIST + CREATE STORE</h4>
                        <p className="text-xs text-slate-300">
                          For businesses wanting online checkout, product catalog, omnichannel POS, inventory, and order dispatch.
                        </p>

                        <div className="pt-2 text-[11px] space-y-1 text-slate-400">
                          <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span>All Listing & Discovery Features</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-indigo-300">
                            <Check className="w-3 h-3 text-indigo-400" />
                            <span>Tenant E-Commerce Storefront CMS</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-indigo-300">
                            <Check className="w-3 h-3 text-indigo-400" />
                            <span>Retail Point of Sale (POS) Terminal</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-indigo-300">
                            <Check className="w-3 h-3 text-indigo-400" />
                            <span>Inventory & Multi-Location Stock</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 text-xs font-mono text-indigo-300 font-bold">
                        Full Tenant Operating Workspace
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Controls */}
              <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                {step > 1 ? (
                  <button
                    onClick={handleBack}
                    className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 font-bold text-xs transition-all cursor-pointer flex items-center gap-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>
                ) : <div />}

                {step < 3 ? (
                  <button
                    onClick={handleNext}
                    disabled={step === 1 && !businessName.trim()}
                    className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <span>Continue</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    onClick={handleFinalSubmit}
                    disabled={isSubmitting}
                    className="px-7 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all cursor-pointer flex items-center gap-2"
                  >
                    {isSubmitting ? (
                      <span>Registering Business...</span>
                    ) : (
                      <>
                        <span>Complete Registration</span>
                        <Check className="w-4 h-4" />
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 text-center text-xs text-slate-500 border-t border-white/5 relative z-10">
        MikitHub Business & Listing Engine • Preserve Business Identity Across Upgrades
      </footer>
    </div>
  );
}
