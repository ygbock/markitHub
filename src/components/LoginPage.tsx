import React, { useState, useEffect } from 'react';
import { StaffMember, Customer } from '../types';
import { 
  ShieldCheck, User, Lock, ArrowLeft, LogIn, 
  CheckCircle2, AlertTriangle, KeyRound, Sparkles, Mail, UserPlus, RefreshCw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export interface LoginPageProps {
  staffMembers: StaffMember[];
  customers: Customer[];
  onStaffLogin: (staff: StaffMember) => void;
  onCustomerLogin: (customer: Customer) => void;
  onBackToStore: () => void;
  onBackToDiscovery?: () => void;
  onNavigate?: (path: string) => void;
  returnUrl?: string;
  currentPath?: string;
}

export type IdentityViewMode = 'login' | 'register' | 'forgot_password' | 'reset_password' | 'verify_email';

export default function LoginPage({
  staffMembers,
  customers,
  onStaffLogin,
  onCustomerLogin,
  onBackToStore,
  onBackToDiscovery,
  onNavigate,
  returnUrl,
  currentPath = '/login',
}: LoginPageProps) {
  // Determine initial view mode based on currentPath
  const getInitialMode = (path: string): IdentityViewMode => {
    if (path.includes('/register')) return 'register';
    if (path.includes('/forgot-password')) return 'forgot_password';
    if (path.includes('/reset-password')) return 'reset_password';
    if (path.includes('/verify-email')) return 'verify_email';
    return 'login';
  };

  const [viewMode, setViewMode] = useState<IdentityViewMode>(() => getInitialMode(currentPath));
  // Public Discovery sign-in is a customer identity flow by default. Staff/platform
  // authentication is selected when the preserved destination is an operational route.
  const defaultLoginMode: 'staff' | 'customer' =
    returnUrl?.startsWith('/tenant/') || returnUrl?.startsWith('/superadmin/') ? 'staff' : 'customer';
  const [loginMode, setLoginMode] = useState<'staff' | 'customer'>(defaultLoginMode);
  const loginTab = loginMode;
  const setLoginTab = setLoginMode;

  // Safely consume AuthContext (with fallback for isolated component renders)
  let authContext: ReturnType<typeof useAuth> | null = null;
  try {
    authContext = useAuth();
  } catch {
    authContext = null;
  }

  // Real Auth Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Demo Operator Switcher State
  const [selectedStaffId, setSelectedStaffId] = useState<string>(staffMembers[0]?.id || '');
  const [staffPin, setStaffPin] = useState<string>('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(customers[0]?.id || '');

  const selectedStaff = staffMembers.find(s => s.id === selectedStaffId) || staffMembers[0];
  const selectedCustomer = customers.find(c => c.id === selectedCustomerId) || customers[0];

  useEffect(() => {
    setViewMode(getInitialMode(currentPath));
    setError(null);
    setSuccessMsg(null);
  }, [currentPath]);

  const navigateTo = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else if (typeof window !== 'undefined') {
      window.location.pathname = path;
    }
  };

  // Handlers for real Firebase Auth actions
  const handleRealSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (authContext) {
        await authContext.signInWithEmail(email, password);
        setSuccessMsg('Successfully authenticated with Firebase Auth!');
        // Route the authenticated identity to its authoritative domain. Public
        // Discovery return URLs remain public; they must never fall through to
        // the default tenant workspace.
        const accountRole = authContext.user?.accountRole;
        const isPlatformAdmin = authContext.isPlatformAdmin || authContext.isSuperAdmin;
        const ownedBusiness = authContext.businessRelationships.find(
          relationship => relationship.relationshipType === 'owner' && relationship.status === 'active'
        );

        if (returnUrl && !returnUrl.startsWith('/tenant/') && !returnUrl.startsWith('/superadmin/')) {
          navigateTo(returnUrl);
        } else if (isPlatformAdmin) {
          navigateTo('/superadmin/dashboard');
        } else if (accountRole === 'BUSINESS_OWNER' && ownedBusiness) {
          navigateTo('/business/' + encodeURIComponent(ownedBusiness.businessId) + '/dashboard');
        } else {
          navigateTo('/account/profile');
        }
      } else {
        // Fallback for demo mode
        if (loginTab === 'staff' && selectedStaff) {
          onStaffLogin(selectedStaff);
        } else if (selectedCustomer) {
          onCustomerLogin(selectedCustomer);
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Invalid email or password credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    try {
      if (authContext) {
        await authContext.signUpWithEmail(email, password, displayName);
        setSuccessMsg('Account created successfully! Verification email dispatched.');
        setTimeout(() => {
          navigateTo('/verify-email');
        }, 1200);
      } else {
        setSuccessMsg('Demo registration complete!');
        setTimeout(() => navigateTo('/login'), 1000);
      }
    } catch (err: any) {
      setError(err?.message || 'Registration failed. Email may already be registered.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!email) {
      setError('Please enter your email address.');
      return;
    }

    setLoading(true);

    try {
      if (authContext) {
        await authContext.sendPasswordReset(email);
        setSuccessMsg(`Password reset instructions sent to ${email}. Check your inbox.`);
      } else {
        setSuccessMsg(`Password reset email dispatched to ${email} (Demo).`);
      }
    } catch (err: any) {
      setError(err?.message || 'Password reset request failed. Verify email address.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (!resetCode.trim()) {
      setError('Action code / reset code from email link is required.');
      return;
    }

    setLoading(true);

    try {
      if (!authContext) {
        throw new Error('Authentication context unavailable.');
      }
      await authContext.confirmPasswordResetCode(resetCode.trim(), password);
      setSuccessMsg('Your password has been successfully reset. Please sign in with your new password.');
      setTimeout(() => navigateTo('/login'), 1500);
    } catch (err: any) {
      setError(err?.message || 'Failed to update password. Action code may be invalid or expired.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (authContext) {
        await authContext.resendEmailVerification();
        setSuccessMsg('Verification email re-dispatched.');
      } else {
        setSuccessMsg('Verification email re-dispatched (Demo).');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to send verification email.');
    } finally {
      setLoading(false);
    }
  };

  // Staff PIN submission handler (Demo & local PIN verification)
  const handleStaffPinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedStaff) {
      setError('Please select an operator profile.');
      return;
    }

    if (selectedStaff.status?.toLowerCase() === 'suspended') {
      setError('This staff account is suspended. POS and Admin access are disabled.');
      return;
    }

    if (!staffPin.trim()) {
      setError('Please enter your security PIN.');
      return;
    }

    if (selectedStaff.pin !== staffPin.trim()) {
      setError('Invalid PIN code. Please try again.');
      return;
    }

    onStaffLogin(selectedStaff);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden font-sans select-none" id="login-page-root">
      {/* Background ambient lighting */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-40 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Header bar */}
      <header className="px-4 sm:px-8 py-5 flex items-center justify-between border-b border-white/10 backdrop-blur-md relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 via-indigo-600 to-indigo-700 rounded-xl text-white font-black text-sm flex items-center justify-center shadow-lg shadow-indigo-900/50">
            M
          </div>
          <div>
            <div className="text-sm font-black tracking-wider text-white uppercase flex items-center gap-2">
              MikitHub <span className="text-[10px] font-mono px-2 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full">Canonical Identity</span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">Global Firebase Auth & Platform Control Plane</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onBackToDiscovery && (
            <button
              type="button"
              onClick={onBackToDiscovery}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300 hover:text-white transition-all cursor-pointer border border-white/10"
              id="btn-back-to-discovery"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Discovery</span>
            </button>
          )}

          <button
            type="button"
            onClick={onBackToStore}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 active:scale-95 text-xs font-bold text-slate-200 hover:text-white transition-all cursor-pointer border border-white/10 shadow-sm"
            id="btn-back-to-storefront"
          >
            <span>Storefront</span>
          </button>
        </div>
      </header>

      {/* Main Card Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8 relative z-10">
        <div className="w-full max-w-lg bg-slate-900/85 backdrop-blur-2xl rounded-3xl border border-white/15 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">

          {/* Top Auth Navigation Tabs */}
          <div className="grid grid-cols-5 p-1.5 bg-slate-950/60 border-b border-white/10 gap-1 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => navigateTo('/login')}
              className={`py-2 px-1.5 rounded-xl transition-all text-center cursor-pointer ${
                viewMode === 'login' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
              id="tab-view-login"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => navigateTo('/register')}
              className={`py-2 px-1.5 rounded-xl transition-all text-center cursor-pointer ${
                viewMode === 'register' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
              id="tab-view-register"
            >
              Register
            </button>
            <button
              type="button"
              onClick={() => navigateTo('/forgot-password')}
              className={`py-2 px-1.5 rounded-xl transition-all text-center cursor-pointer ${
                viewMode === 'forgot_password' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
              id="tab-view-forgot"
            >
              Forgot
            </button>
            <button
              type="button"
              onClick={() => navigateTo('/reset-password')}
              className={`py-2 px-1.5 rounded-xl transition-all text-center cursor-pointer ${
                viewMode === 'reset_password' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
              id="tab-view-reset"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => navigateTo('/verify-email')}
              className={`py-2 px-1.5 rounded-xl transition-all text-center cursor-pointer ${
                viewMode === 'verify_email' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
              id="tab-view-verify"
            >
              Verify
            </button>
          </div>

          <div className="p-6 sm:p-8">
            {error && (
              <div className="mb-5 p-3.5 bg-rose-500/15 border border-rose-500/30 rounded-2xl flex items-center gap-2.5 text-xs text-rose-300 animate-in shake duration-150" id="auth-error-banner">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="mb-5 p-3.5 bg-emerald-500/15 border border-emerald-500/30 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-300 animate-in fade-in duration-150" id="auth-success-banner">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* 1. SIGN IN VIEW (/login) */}
            {viewMode === 'login' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div>
                    <h2 className="text-xl font-black text-white tracking-tight">Sign In to MikitHub</h2>
                    <p className="text-xs text-slate-400 mt-0.5">Authoritative platform identity & session restoration</p>
                  </div>

                  <div className="flex bg-slate-950 p-1 rounded-xl border border-white/10 text-xs">
                    <button
                      type="button"
                      id="tab-login-staff"
                      onClick={() => setLoginTab('staff')}
                      className={`px-3 py-1 rounded-lg font-bold transition-all ${
                        loginTab === 'staff' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Staff
                    </button>
                    <button
                      type="button"
                      id="tab-login-customer"
                      onClick={() => setLoginTab('customer')}
                      className={`px-3 py-1 rounded-lg font-bold transition-all ${
                        loginTab === 'customer' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Shopper
                    </button>
                  </div>
                </div>

                {loginTab === 'staff' ? (
                  <form onSubmit={handleStaffPinSubmit} className="space-y-4" id="form-staff-login">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                          Select Staff Operator Profile
                        </label>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          Demo PIN Mode
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                        {staffMembers.map((staff) => {
                          const isSelected = staff.id === selectedStaffId;
                          const isSuspended = staff.status?.toLowerCase() === 'suspended';

                          return (
                            <div
                              key={staff.id}
                              onClick={() => {
                                if (!isSuspended) {
                                  setSelectedStaffId(staff.id);
                                  setError(null);
                                }
                              }}
                              className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex items-center gap-2.5 ${
                                isSuspended
                                  ? 'bg-rose-950/20 border-rose-900/30 opacity-50 cursor-not-allowed'
                                  : isSelected
                                  ? 'bg-indigo-600/25 border-indigo-500 ring-2 ring-indigo-500/30 text-white'
                                  : 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-300'
                              }`}
                              id={`staff-card-${staff.id}`}
                            >
                              <div className="w-8 h-8 rounded-xl overflow-hidden bg-slate-800 shrink-0 border border-white/10">
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
                                  {isSelected && <CheckCircle2 className="w-3 h-3 text-indigo-400 shrink-0" />}
                                </div>
                                <div className="text-[10px] text-slate-400 truncate">
                                  {staff.role} {isSuspended && '• Suspended'}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                          Security PIN Code
                        </label>
                        <button
                          type="button"
                          onClick={() => setStaffPin(selectedStaff?.pin || '1234')}
                          className="text-[11px] text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer font-semibold"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Use PIN ({selectedStaff?.pin || '1234'})</span>
                        </button>
                      </div>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <Lock className="w-4 h-4" />
                        </div>
                        <input
                          type="password"
                          value={staffPin}
                          onChange={(e) => setStaffPin(e.target.value)}
                          placeholder="Enter PIN"
                          className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white font-mono text-sm tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                          id="input-staff-pin"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-xl flex items-center justify-center gap-2 cursor-pointer transition-all"
                      id="btn-submit-staff-login"
                    >
                      <LogIn className="w-4 h-4" />
                      <span>Authenticate Staff Session</span>
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleRealSignIn} className="space-y-4" id="form-customer-login">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="user@example.com"
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                        id="input-login-email"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                          Password
                        </label>
                        <button
                          type="button"
                          onClick={() => navigateTo('/forgot-password')}
                          className="text-[11px] text-indigo-400 hover:underline"
                        >
                          Forgot password?
                        </button>
                      </div>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                        id="input-login-password"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-xl flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                      id="btn-submit-real-signin"
                    >
                      <LogIn className="w-4 h-4" />
                      <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* 2. REGISTER VIEW (/register) */}
            {viewMode === 'register' && (
              <form onSubmit={handleRegisterSubmit} className="space-y-4" id="form-register">
                <div>
                  <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-indigo-400" />
                    <span>Create MikitHub Account</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">Establishes global platform user identity under <code className="font-mono text-indigo-300">users/&#123;uid&#125;</code></p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                    Full Name / Display Name
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Jane Doe"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    id="input-register-name"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    id="input-register-email"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                      Password
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      id="input-register-password"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      id="input-register-confirm"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-xl flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                  id="btn-submit-register"
                >
                  <span>{loading ? 'Creating Account...' : 'Register Account'}</span>
                </button>

                <p className="text-[11px] text-slate-400 text-center">
                  Already have an account?{' '}
                  <button type="button" onClick={() => navigateTo('/login')} className="text-indigo-400 hover:underline font-bold">
                    Sign in here
                  </button>
                </p>
              </form>
            )}

            {/* 3. FORGOT PASSWORD VIEW (/forgot-password) */}
            {viewMode === 'forgot_password' && (
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-4" id="form-forgot-password">
                <div>
                  <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                    <Mail className="w-5 h-5 text-indigo-400" />
                    <span>Reset Password Request</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">Enter your registered email to receive a password reset link.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                    Registered Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    id="input-forgot-email"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-xl flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                  id="btn-submit-forgot"
                >
                  <span>{loading ? 'Dispatching...' : 'Send Reset Link'}</span>
                </button>

                <p className="text-[11px] text-slate-400 text-center">
                  Remembered password?{' '}
                  <button type="button" onClick={() => navigateTo('/login')} className="text-indigo-400 hover:underline font-bold">
                    Back to Sign In
                  </button>
                </p>
              </form>
            )}

            {/* 4. RESET PASSWORD VIEW (/reset-password) */}
            {viewMode === 'reset_password' && (
              <form onSubmit={handleResetPasswordSubmit} className="space-y-4" id="form-reset-password">
                <div>
                  <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                    <KeyRound className="w-5 h-5 text-indigo-400" />
                    <span>Set New Password</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">Provide your new security password.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                    Reset Code / Action Code
                  </label>
                  <input
                    type="text"
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value)}
                    placeholder="Optional code from email link"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    id="input-reset-code"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    id="input-new-password"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    id="input-confirm-new-password"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-xl flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                  id="btn-submit-reset-password"
                >
                  <span>{loading ? 'Updating Password...' : 'Save New Password'}</span>
                </button>
              </form>
            )}

            {/* 5. VERIFY EMAIL VIEW (/verify-email) */}
            {viewMode === 'verify_email' && (
              <div className="space-y-5 text-center" id="view-verify-email">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 mx-auto flex items-center justify-center">
                  <Mail className="w-6 h-6" />
                </div>

                <div>
                  <h2 className="text-xl font-black text-white tracking-tight">Verify Your Email Address</h2>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    A verification link was dispatched to your registered email address. Please check your inbox and verify your identity before accessing protected operations.
                  </p>
                </div>

                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl text-xs text-slate-300 space-y-2">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Account Status:</span>
                    <span className="font-mono text-amber-400 uppercase font-bold">Pending Verification</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Firebase Identity:</span>
                    <span className="font-mono text-indigo-300">{authContext?.firebaseUid?.slice(0, 12) || 'Active'}...</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2.5">
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={loading}
                    className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                    id="btn-resend-verification"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>{loading ? 'Sending...' : 'Resend Verification Email'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigateTo('/login')}
                    className="w-full py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-bold text-xs transition-all cursor-pointer"
                  >
                    Return to Sign In
                  </button>
                </div>
              </div>
            )}

            {/* Footer security badge */}
            <div className="mt-6 pt-5 border-t border-white/10 flex items-center justify-center gap-2 text-[11px] text-slate-400 font-medium">
              <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
              <span>Multi-Tenant Enterprise Security • Firebase Auth & Platform Control Plane</span>
            </div>
          </div>
        </div>
      </main>

      <footer className="px-4 py-4 text-center text-xs text-slate-500 border-t border-white/5 relative z-10">
        MarkitHub Commerce Suite • Authoritative Tenant Workspace & Storefront
      </footer>
    </div>
  );
}
