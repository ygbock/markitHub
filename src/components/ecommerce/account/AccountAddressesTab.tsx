import React, { useState } from 'react';
import { Customer } from '../../../types';
import { 
  MapPin, Plus, Check, Edit2, Trash2, CheckCircle2, 
  Building2, Home, Navigation, X, ShieldCheck
} from 'lucide-react';

export interface SavedAddress {
  id: string;
  label: 'Home' | 'Office' | 'Commercial Hub' | 'Warehouse' | string;
  fullName: string;
  phone: string;
  street: string;
  city: string;
  state?: string;
  zip?: string;
  country: string;
  isDefault: boolean;
  notes?: string;
}

interface AccountAddressesTabProps {
  customer: Customer | null;
  addresses: SavedAddress[];
  onSaveAddress: (address: SavedAddress) => void;
  onDeleteAddress: (addressId: string) => void;
  onSetDefaultAddress: (addressId: string) => void;
}

export const AccountAddressesTab: React.FC<AccountAddressesTabProps> = ({
  customer,
  addresses,
  onSaveAddress,
  onDeleteAddress,
  onSetDefaultAddress
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editingAddress, setEditingAddress] = useState<SavedAddress | null>(null);

  // Form state
  const [formData, setFormData] = useState<Omit<SavedAddress, 'id'>>({
    label: 'Home',
    fullName: customer?.name || '',
    phone: customer?.phone || '',
    street: customer?.address || '',
    city: customer?.city || 'Freetown',
    state: customer?.state || 'Western Area',
    zip: customer?.zip || '00232',
    country: 'Sierra Leone',
    isDefault: addresses.length === 0,
    notes: ''
  });

  const handleOpenAdd = () => {
    setEditingAddress(null);
    setFormData({
      label: 'Home',
      fullName: customer?.name || '',
      phone: customer?.phone || '',
      street: '',
      city: 'Freetown',
      state: 'Western Area',
      zip: '00232',
      country: 'Sierra Leone',
      isDefault: addresses.length === 0,
      notes: ''
    });
    setIsEditing(true);
  };

  const handleOpenEdit = (addr: SavedAddress) => {
    setEditingAddress(addr);
    setFormData({
      label: addr.label,
      fullName: addr.fullName,
      phone: addr.phone,
      street: addr.street,
      city: addr.city,
      state: addr.state || '',
      zip: addr.zip || '',
      country: addr.country,
      isDefault: addr.isDefault,
      notes: addr.notes || ''
    });
    setIsEditing(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.street || !formData.fullName) return;

    const newAddr: SavedAddress = {
      id: editingAddress?.id || `addr-${Date.now()}`,
      ...formData
    };

    onSaveAddress(newAddr);
    setIsEditing(false);
    setEditingAddress(null);
  };

  const getLabelIcon = (label: string) => {
    switch (label.toLowerCase()) {
      case 'home':
        return Home;
      case 'office':
      case 'commercial hub':
        return Building2;
      default:
        return Navigation;
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-150" id="account-tab-addresses">
      
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-slate-200/90 shadow-2xs">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <MapPin className="w-5 h-5 text-emerald-600" />
            <span>Delivery & Billing Addresses</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your saved delivery destinations for fast, 1-click order fulfillment.
          </p>
        </div>

        {!isEditing && (
          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Address</span>
          </button>
        )}
      </div>

      {/* 2. Address Editor Form Modal / Inline Box */}
      {isEditing && (
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-indigo-500/30 shadow-md space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900">
              {editingAddress ? 'Edit Delivery Address' : 'Add New Delivery Address'}
            </h3>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Address Label</label>
              <select
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="Home">Home (Residential)</option>
                <option value="Office">Office (Corporate Hub)</option>
                <option value="Commercial Hub">Commercial Hub</option>
                <option value="Warehouse">Warehouse / Depot</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Recipient Full Name *</label>
              <input
                type="text"
                required
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="e.g. Sahr B Sesay"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Contact Phone Number *</label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="e.g. +232 76 123456"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 font-mono"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">City / Municipality *</label>
              <input
                type="text"
                required
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="e.g. Freetown"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="font-bold text-slate-700 block mb-1">Street Address / Landmark *</label>
              <input
                type="text"
                required
                value={formData.street}
                onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                placeholder="e.g. 232 Wilkinson Road, Lumley Roundabout, Freetown"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div className="sm:col-span-2 flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="isDefault"
                checked={formData.isDefault}
                onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
              />
              <label htmlFor="isDefault" className="text-xs font-bold text-slate-700 cursor-pointer">
                Set as default shipping address for all checkouts
              </label>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs"
            >
              {editingAddress ? 'Save Changes' : 'Save Address'}
            </button>
          </div>
        </form>
      )}

      {/* 3. Address Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {addresses.map((addr) => {
          const LabelIcon = getLabelIcon(addr.label);

          return (
            <div
              key={addr.id}
              className={`bg-white rounded-3xl p-4 sm:p-5 border transition-all flex flex-col justify-between gap-3 relative ${
                addr.isDefault ? 'border-emerald-400 ring-2 ring-emerald-500/20 shadow-xs' : 'border-slate-200/90 shadow-2xs'
              }`}
            >
              <div>
                {/* Header: Label & Default Badge */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <LabelIcon className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-xs text-slate-900">{addr.label}</span>
                  </div>

                  {addr.isDefault ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Default</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onSetDefaultAddress(addr.id)}
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer"
                    >
                      Set as default
                    </button>
                  )}
                </div>

                {/* Details */}
                <div className="pt-2 text-xs space-y-1">
                  <div className="font-bold text-slate-900">{addr.fullName}</div>
                  <div className="text-slate-600 leading-relaxed">{addr.street}</div>
                  <div className="text-slate-500 text-[11px]">
                    {addr.city}, {addr.state || 'Western Area'}, {addr.country}
                  </div>
                  <div className="text-slate-600 font-mono text-[11px] pt-1">
                    Phone: {addr.phone}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(addr)}
                  className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>Edit</span>
                </button>

                {addresses.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onDeleteAddress(addr.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="Delete address"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
