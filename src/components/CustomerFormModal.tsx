import React, { useState, useEffect } from 'react';
import { Customer } from '../types';
import { 
  User, Mail, Phone, MapPin, Tag, Award, Calendar, 
  Check, X, Sparkles, Shield, HeartHandshake, AlertCircle, Layers
} from 'lucide-react';

interface CustomerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (customer: Customer) => void;
  initialCustomer?: Customer | null;
}

const COMMON_TAGS = [
  'Wholesale', 'VIP Client', 'Frequent Shopper', 'Early Adopter', 
  'Eco-Conscious', 'Tech Enthusiast', 'Local Retail', 'Corporate Account'
];

export default function CustomerFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialCustomer
}: CustomerFormModalProps) {
  const isEditing = Boolean(initialCustomer);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [segment, setSegment] = useState<'VIP' | 'Regular' | 'New' | 'Inactive'>('New');
  const [loyaltyTier, setLoyaltyTier] = useState<'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond'>('Bronze');
  const [loyaltyPoints, setLoyaltyPoints] = useState<number>(0);
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [birthday, setBirthday] = useState('');
  const [preferredChannel, setPreferredChannel] = useState<'In-Store POS' | 'Online Storefront' | 'Omnichannel'>('Omnichannel');
  const [marketingOptIn, setMarketingOptIn] = useState(true);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (!isOpen) return;
    if (initialCustomer) {
      setName(initialCustomer.name || '');
      setEmail(initialCustomer.email || '');
      setPhone(initialCustomer.phone || '');
      setSegment(initialCustomer.segment || 'Regular');
      setLoyaltyTier(initialCustomer.loyaltyTier || (initialCustomer.loyaltyPoints > 500 ? 'Gold' : initialCustomer.loyaltyPoints > 200 ? 'Silver' : 'Bronze'));
      setLoyaltyPoints(initialCustomer.loyaltyPoints || 0);
      setAddress(initialCustomer.address || '');
      setCity(initialCustomer.city || '');
      setState(initialCustomer.state || '');
      setZip(initialCustomer.zip || '');
      setBirthday(initialCustomer.birthday || '');
      setPreferredChannel(initialCustomer.preferredChannel || 'Omnichannel');
      setMarketingOptIn(initialCustomer.marketingOptIn ?? true);
      setSelectedTags(initialCustomer.tags || []);
      setNotes(initialCustomer.notes || '');
    } else {
      setName('');
      setEmail('');
      setPhone('');
      setSegment('New');
      setLoyaltyTier('Bronze');
      setLoyaltyPoints(0);
      setAddress('');
      setCity('');
      setState('');
      setZip('');
      setBirthday('');
      setPreferredChannel('Omnichannel');
      setMarketingOptIn(true);
      setSelectedTags([]);
      setNotes('');
    }
    setErrors({});
  }, [initialCustomer, isOpen]);

  if (!isOpen) return null;

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleAddCustomTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && customTagInput.trim()) {
      e.preventDefault();
      const cleanTag = customTagInput.trim();
      if (!selectedTags.includes(cleanTag)) {
        setSelectedTags([...selectedTags, cleanTag]);
      }
      setCustomTagInput('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { [key: string]: string } = {};

    if (!name.trim()) newErrors.name = 'Full name is required';
    if (!email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Valid email address is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const payload: Customer = {
      id: initialCustomer?.id || `cust-${Date.now()}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim() || '+1 (555) 000-0000',
      segment,
      loyaltyTier,
      loyaltyPoints: Number(loyaltyPoints) || 0,
      address: address.trim(),
      city: city.trim(),
      state: state.trim(),
      zip: zip.trim(),
      birthday: birthday || undefined,
      preferredChannel,
      marketingOptIn,
      tags: selectedTags,
      notes: notes.trim(),
      purchaseHistoryIds: initialCustomer?.purchaseHistoryIds || [],
      createdAt: initialCustomer?.createdAt || new Date().toISOString()
    };

    onSubmit(payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden my-auto"
        id="customer-form-modal"
      >
        {/* Modal Header */}
        <div className="px-6 py-4.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center text-indigo-400 font-bold">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                {isEditing ? 'Edit Customer Profile' : 'Register New CRM Client'}
                {isEditing && (
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    {initialCustomer?.id}
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                {isEditing 
                  ? 'Update contact info, loyalty ledger, and relationship preferences.' 
                  : 'Provision account into central unified POS-commerce directory.'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            id="close-customer-form-modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-6 flex-1 text-xs text-slate-700">
          {/* Primary Identity Section */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
              <User className="w-3.5 h-3.5 text-indigo-600" /> Identity & Contact Credentials
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Full Customer Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (errors.name) setErrors({ ...errors, name: '' });
                    }}
                    placeholder="e.g. Sarah Connor"
                    className={`w-full pl-9 pr-3 py-2 bg-slate-50 border rounded-xl text-xs focus:bg-white focus:outline-hidden transition-all ${
                      errors.name ? 'border-rose-400 focus:ring-2 focus:ring-rose-200' : 'border-slate-200 focus:ring-2 focus:ring-indigo-500'
                    }`}
                  />
                </div>
                {errors.name && <p className="text-[10px] text-rose-600 mt-1 font-medium">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) setErrors({ ...errors, email: '' });
                    }}
                    placeholder="sarah.c@domain.com"
                    className={`w-full pl-9 pr-3 py-2 bg-slate-50 border rounded-xl text-xs focus:bg-white focus:outline-hidden transition-all ${
                      errors.email ? 'border-rose-400 focus:ring-2 focus:ring-rose-200' : 'border-slate-200 focus:ring-2 focus:ring-indigo-500'
                    }`}
                  />
                </div>
                {errors.email && <p className="text-[10px] text-rose-600 mt-1 font-medium">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Phone Number (SMS Gateway)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 234-5678"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Date of Birth (Birthday Perks)
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="date"
                    value={birthday}
                    onChange={(e) => setBirthday(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Loyalty & Segmentation */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
              <Award className="w-3.5 h-3.5 text-indigo-600" /> Loyalty & Customer Tiering
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Customer Segment</label>
                <select
                  value={segment}
                  onChange={(e) => setSegment(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                >
                  <option value="New">✨ New Client</option>
                  <option value="Regular">👤 Regular Customer</option>
                  <option value="VIP">⭐ VIP Client</option>
                  <option value="Inactive">⏸️ Inactive (Churn Risk)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Loyalty Tier Status</label>
                <select
                  value={loyaltyTier}
                  onChange={(e) => setLoyaltyTier(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                >
                  <option value="Bronze">🥉 Bronze Tier</option>
                  <option value="Silver">🥈 Silver Tier</option>
                  <option value="Gold">🥇 Gold Tier</option>
                  <option value="Platinum">💎 Platinum Tier</option>
                  <option value="Diamond">👑 Diamond Elite</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Loyalty Points Balance</label>
                <div className="relative">
                  <Award className="w-4 h-4 text-indigo-600 absolute left-3 top-2.5" />
                  <input
                    type="number"
                    min="0"
                    value={loyaltyPoints}
                    onChange={(e) => setLoyaltyPoints(parseInt(e.target.value) || 0)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Address & Omnichannel Preferences */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
              <MapPin className="w-3.5 h-3.5 text-indigo-600" /> Physical Address & Fulfillment
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-3">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Street Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="1234 Technology Blvd, Suite 100"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="San Francisco"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">State / Province</label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="CA"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Postal / ZIP Code</label>
                <input
                  type="text"
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  placeholder="94107"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Primary Buying Channel</label>
                <select
                  value={preferredChannel}
                  onChange={(e) => setPreferredChannel(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                >
                  <option value="Omnichannel">🌐 Omnichannel (POS + Storefront)</option>
                  <option value="In-Store POS">🏪 In-Store POS Specialist</option>
                  <option value="Online Storefront">📦 Online Storefront Only</option>
                </select>
              </div>

              <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 mt-2 sm:mt-0">
                <input
                  type="checkbox"
                  id="opt-in-checkbox"
                  checked={marketingOptIn}
                  onChange={(e) => setMarketingOptIn(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded-md border-slate-300 focus:ring-indigo-500"
                />
                <label htmlFor="opt-in-checkbox" className="text-xs font-semibold text-slate-800 cursor-pointer select-none">
                  Marketing Communications Consent
                  <span className="block text-[10px] text-slate-500 font-normal">
                    Authorized to receive automated SMS updates & SendGrid promo digests.
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Tags & Custom Classification */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
              <Tag className="w-3.5 h-3.5 text-indigo-600" /> Account Tags & Special Audiences
            </h3>

            <div className="flex flex-wrap gap-1.5 mb-2">
              {COMMON_TAGS.map(tag => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    type="button"
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border ${
                      isSelected 
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' 
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 inline mr-1" />}
                    {tag}
                  </button>
                );
              })}
            </div>

            <div className="relative">
              <input
                type="text"
                value={customTagInput}
                onChange={(e) => setCustomTagInput(e.target.value)}
                onKeyDown={handleAddCustomTag}
                placeholder="Type custom tag and press Enter..."
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Internal Notes */}
          <div className="space-y-2">
            <label className="block text-[11px] font-bold text-slate-700">
              Internal Relationship & Operational Notes
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Record customer preferences, delivery requirements, negotiated discounts, corporate details..."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          {/* Footer Submit Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
              id="btn-save-customer-profile"
            >
              <Check className="w-4 h-4" /> {isEditing ? 'Update Profile' : 'Save Customer File'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
