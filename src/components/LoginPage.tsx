import React, { useState } from 'react';
import { StaffMember, Customer } from '../types';
import { 
  ShieldCheck, User, Lock, ArrowLeft, LogIn, 
  CheckCircle2, AlertTriangle, KeyRound, Sparkles, Building2
} from 'lucide-react';

interface LoginPageProps {
  staffMembers: StaffMember[];
  customers: Customer[];
  onStaffLogin: (staff: StaffMember) => void;
  onCustomerLogin: (customer: Customer) => void;
  onBackToStore: () => void;
}

export default function LoginPage({
  staffMembers,
  customers,
  onStaffLogin,
  onCustomerLogin,
  onBackToStore,
}: LoginPageProps) {
  const [loginMode, setLoginMode] = useState<'staff' | 'customer'>('staff');

  // Staff Login State
  const [selectedStaffId, setSelectedStaffId] = useState<string>(staffMembers[0]?.id || '');
  const [staffPin, setStaffPin] = useState<string>('');
  const [staffError, setStaffError] = useState<string | null>(null);
  const [showPin, setShowPin] = useState<boolean>(false);

  // Customer Login State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(customers[0]?.id || '');
  const [customerEmail, setCustomerEmail] = useState<string>(customers[0]?.email || '');
  const [customerPassword, setCustomerPassword] = useState<string>('••••••••');
  const [customerError, setCustomerError] = useState<string | null>(null);

  const selectedStaff = staffMembers.find(s => s.id === selectedStaffId) || staffMembers[0];
  const selectedCustomer = customers.find(c => c.id === selectedCustomerId) || customers[0];

  const handleStaffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStaffError(null);

    if (!selectedStaff) {
      setStaffError('Please select a staff member.');
      return;
    }

    const isSuspended = selectedStaff.status?.toLowerCase() === 'suspended';
    if (isSuspended) {
      setStaffError('This account is suspended. POS and Admin access are disabled.');
      return;
    }

    if (!staffPin.trim()) {
      setStaffError('Please enter your access PIN.');
      return;
    }

    if (selectedStaff.pin !== staffPin.trim()) {
      setStaffError('Invalid PIN code. Please try again.');
      return;
    }

    // Success
    onStaffLogin(selectedStaff);
  };

  const handleCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCustomerError(null);

    if (!selectedCustomer) {
      setCustomerError('Please select or specify a customer account.');
      return;
    }

    onCustomerLogin(selectedCustomer);
  };

  const handleQuickDemoPin = () => {
    if (selectedStaff) {
      setStaffPin(selectedStaff.pin);
      setStaffError(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden font-sans select-none" id="login-page-root">
      {/* Ambient background glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-40 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top Bar with Brand & Back to Store Navigation */}
      <header className="px-4 sm:px-8 py-5 flex items-center justify-between border-b border-white/10 backdrop-blur-md relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 via-indigo-600 to-indigo-700 rounded-xl text-white font-black text-sm flex items-center justify-center shadow-lg shadow-indigo-900/50">
            M
          </div>
          <div>
            <div className="text-sm font-black tracking-wider text-white uppercase flex items-center gap-2">
              MarkitHub <span className="text-[10px] font-mono px-2 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full">Secure Auth</span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">Enterprise POS & Commerce Suite</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onBackToStore}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 active:scale-95 text-xs font-bold text-slate-200 hover:text-white transition-all cursor-pointer border border-white/10 shadow-sm"
          id="btn-back-to-storefront"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Storefront</span>
        </button>
      </header>

      {/* Main Login Card Stage */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8 relative z-10">
        <div className="w-full max-w-lg bg-slate-900/85 backdrop-blur-2xl rounded-3xl border border-white/15 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          
          {/* Dual Portal Tabs (Staff Admin vs Customer) */}
          <div className="grid grid-cols-2 p-1.5 bg-slate-950/60 border-b border-white/10 gap-1.5">
            <button
              type="button"
              onClick={() => { setLoginMode('staff'); setStaffError(null); }}
              className={`py-3 px-4 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                loginMode === 'staff'
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-900/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
              id="tab-login-staff"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Staff & Admin</span>
            </button>

            <button
              type="button"
              onClick={() => { setLoginMode('customer'); setCustomerError(null); }}
              className={`py-3 px-4 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                loginMode === 'customer'
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-900/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
              id="tab-login-customer"
            >
              <User className="w-4 h-4" />
              <span>Customer Account</span>
            </button>
          </div>

          <div className="p-6 sm:p-8">
            {loginMode === 'staff' ? (
              /* Staff & Admin Login Form */
              <form onSubmit={handleStaffSubmit} className="space-y-6" id="form-staff-login">
                <div>
                  <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                    <span>Staff & Terminal Login</span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      RBAC Active
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Select your operator profile and authenticate with your security PIN.
                  </p>
                </div>

                {staffError && (
                  <div className="p-3.5 bg-rose-500/15 border border-rose-500/30 rounded-2xl flex items-center gap-2.5 text-xs text-rose-300 animate-in shake duration-150">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{staffError}</span>
                  </div>
                )}

                {/* Staff Selection Dropdown / Cards */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                    Select Operator Profile
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
                    {staffMembers.map((staff) => {
                      const isSelected = staff.id === selectedStaffId;
                      const isSuspended = staff.status?.toLowerCase() === 'suspended';

                      return (
                        <div
                          key={staff.id}
                          onClick={() => {
                            if (!isSuspended) {
                              setSelectedStaffId(staff.id);
                              setStaffError(null);
                            }
                          }}
                          className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${
                            isSuspended
                              ? 'bg-rose-950/20 border-rose-900/30 opacity-50 cursor-not-allowed'
                              : isSelected
                              ? 'bg-indigo-600/25 border-indigo-500 ring-2 ring-indigo-500/30 text-white'
                              : 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-300'
                          }`}
                          id={`staff-card-${staff.id}`}
                        >
                          <div className="w-9 h-9 rounded-xl overflow-hidden bg-slate-800 shrink-0 border border-white/10">
                            {staff.avatar ? (
                              <img src={staff.avatar} alt={staff.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center font-bold text-xs text-indigo-300">
                                {staff.name.charAt(0)}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold truncate flex items-center justify-between">
                              <span>{staff.name}</span>
                              {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate flex items-center gap-1.5">
                              <span>{staff.role}</span>
                              {isSuspended && (
                                <span className="text-[9px] font-mono text-rose-400 uppercase">Suspended</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* PIN Code Entry */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Security PIN Code
                    </label>
                    <button
                      type="button"
                      onClick={handleQuickDemoPin}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Use Demo PIN ({selectedStaff?.pin || '1234'})</span>
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPin ? 'text' : 'password'}
                      maxLength={6}
                      value={staffPin}
                      onChange={(e) => {
                        setStaffPin(e.target.value);
                        setStaffError(null);
                      }}
                      placeholder="Enter 4-digit PIN"
                      className="w-full pl-10 pr-20 py-3 bg-white/5 border border-white/10 rounded-2xl text-white font-mono text-sm tracking-widest placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
                      id="input-staff-pin"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
                    >
                      {showPin ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 active:scale-[0.99] text-white font-bold text-sm shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all"
                  id="btn-submit-staff-login"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Enter Admin Workspace</span>
                </button>
              </form>
            ) : (
              /* Customer Account Login Form */
              <form onSubmit={handleCustomerSubmit} className="space-y-6" id="form-customer-login">
                <div>
                  <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                    <span>Shopper Account Sign In</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Log in to track orders, manage your wishlist, and claim rewards.
                  </p>
                </div>

                {customerError && (
                  <div className="p-3.5 bg-rose-500/15 border border-rose-500/30 rounded-2xl flex items-center gap-2.5 text-xs text-rose-300">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{customerError}</span>
                  </div>
                )}

                {/* Quick Customer Switcher */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                    Quick Select Account (Demo)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {customers.slice(0, 4).map((cust) => {
                      const isSelected = cust.id === selectedCustomerId;
                      return (
                        <div
                          key={cust.id}
                          onClick={() => {
                            setSelectedCustomerId(cust.id);
                            setCustomerEmail(cust.email);
                          }}
                          className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${
                            isSelected
                              ? 'bg-indigo-600/25 border-indigo-500 ring-2 ring-indigo-500/30 text-white'
                              : 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-300'
                          }`}
                          id={`customer-card-${cust.id}`}
                        >
                          <div className="w-8 h-8 rounded-xl bg-indigo-600/40 border border-indigo-400/30 text-indigo-200 font-bold text-xs flex items-center justify-center shrink-0">
                            {cust.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold truncate">{cust.name}</div>
                            <div className="text-[10px] text-slate-400 truncate">{cust.email}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white text-xs placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      placeholder="customer@example.com"
                      id="input-customer-email"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                      Password
                    </label>
                    <input
                      type="password"
                      value={customerPassword}
                      onChange={(e) => setCustomerPassword(e.target.value)}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white text-xs placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      placeholder="••••••••"
                      id="input-customer-password"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 active:scale-[0.99] text-white font-bold text-sm shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all"
                  id="btn-submit-customer-login"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In to Storefront</span>
                </button>
              </form>
            )}

            {/* Security Guarantee Notice */}
            <div className="mt-6 pt-5 border-t border-white/10 flex items-center justify-center gap-2 text-[11px] text-slate-400 font-medium">
              <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
              <span>Multi-Tenant Enterprise Security • Server Authoritative RBAC</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Branding */}
      <footer className="px-4 py-4 text-center text-xs text-slate-500 border-t border-white/5 relative z-10">
        MarkitHub Commerce Suite • Authoritative Tenant Workspace & Storefront
      </footer>
    </div>
  );
}
