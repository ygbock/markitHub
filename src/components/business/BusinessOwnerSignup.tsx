import React, { useState } from 'react';
import { ArrowRight, Building2, CheckCircle2, Eye, EyeOff, Store, UserPlus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

type BusinessMode = 'listing_only' | 'listing_and_store';
interface Props { onNavigate: (path: string) => void; }

export default function BusinessOwnerSignup({ onNavigate }: Props) {
  const { status, firebaseUser, signUpWithEmail, reloadUserStatus } = useAuth();
  const [mode, setMode] = useState<BusinessMode>('listing_only');
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [category, setCategory] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Freetown');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (password !== confirm) return setError('Passwords do not match.');
    if (password.length < 8) return setError('Password must contain at least 8 characters.');
    if (!accepted) return setError('Please accept the business terms to continue.');
    setBusy(true);
    try {
      await signUpWithEmail(email.trim(), password, name.trim());
      const current = firebaseUser;
      const token = current ? await current.getIdToken(true) : null;
      if (!token) throw new Error('Authentication session was not established.');
      const response = await fetch('/api/business/register', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json',
          'Idempotency-Key': 'business-owner-' + crypto.randomUUID(),
        },
        body: JSON.stringify({
          businessName: businessName.trim(),
          category: category.trim(),
          address: address.trim(),
          city: city.trim(),
          phone: phone.trim(),
          email: email.trim(),
          businessMode: mode,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.business?.id) throw new Error(payload.error || 'Business registration failed.');
      await reloadUserStatus();
      onNavigate('/business/' + payload.business.id + '/dashboard');
    } catch (err: any) {
      setError(err?.message || 'Unable to create the business owner account.');
    } finally {
      setBusy(false);
    }
  };

  if (status === 'authenticated') {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="max-w-lg w-full rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
          <Building2 className="w-10 h-10 text-indigo-400 mx-auto mb-4" />
          <h1 className="text-2xl font-black">You are already signed in</h1>
          <p className="text-sm text-slate-400 mt-2">Open your business workspace or register another business from your account.</p>
          <button onClick={() => onNavigate('/business/onboarding')} className="mt-6 w-full rounded-2xl bg-indigo-600 py-3 font-bold">Continue to Business Setup</button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 py-8 sm:px-6">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-[0.85fr_1.15fr] gap-8 items-start">
        <section className="lg:sticky lg:top-8 rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-indigo-950/80 to-slate-900 p-7 sm:p-9">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-500/10 px-3 py-1.5 text-xs font-bold text-indigo-200"><UserPlus className="w-3.5 h-3.5" /> Business Owner</div>
          <h1 className="mt-6 text-3xl sm:text-4xl font-black tracking-tight">Put your business on MikitHub.</h1>
          <p className="mt-4 text-sm leading-6 text-slate-300">Create your owner identity, establish your business, and continue into a dedicated workspace for discovery and commerce.</p>
          <div className="mt-7 space-y-4">
            {['Owner account and business identity are linked authoritatively','Your listing starts in verification review rather than publishing immediately','Store operations can be enabled without creating a second owner account'].map(item => (
              <div key={item} className="flex gap-3 text-sm text-slate-200"><CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" /><span>{item}</span></div>
            ))}
          </div>
        </section>

        <form onSubmit={submit} className="rounded-3xl border border-white/10 bg-slate-900/80 p-5 sm:p-8 shadow-2xl">
          <div className="mb-7"><h2 className="text-2xl font-black">Create your business owner account</h2><p className="text-sm text-slate-400 mt-1">Your account will own the business you create.</p></div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Full name"><input value={name} onChange={e=>setName(e.target.value)} required placeholder="Jane Doe" /></Field>
            <Field label="Email"><input type="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="owner@example.com" /></Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-4 mt-4">
            <Field label="Password"><div className="relative"><input type={showPassword ? 'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} required minLength={8} className="pr-11" placeholder="At least 8 characters" /><button type="button" onClick={()=>setShowPassword(v=>!v)} className="absolute right-3 top-2.5 text-slate-400">{showPassword?<EyeOff className="w-4 h-4"/>:<Eye className="w-4 h-4"/>}</button></div></Field>
            <Field label="Confirm password"><input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} required minLength={8} placeholder="Repeat password" /></Field>
          </div>
          <div className="mt-7"><label className="text-xs font-bold uppercase tracking-wider text-slate-300">Business model</label>
            <div className="grid sm:grid-cols-2 gap-3 mt-2">
              <ModeCard active={mode==='listing_only'} icon={<Building2/>} title="Discovery only" text="Public listing, profile, locations and services." onClick={()=>setMode('listing_only')} />
              <ModeCard active={mode==='listing_and_store'} icon={<Store/>} title="Discovery + Store" text="Listing now, with operational store provisioning." onClick={()=>setMode('listing_and_store')} />
            </div>
          </div>
          <div className="mt-7 grid sm:grid-cols-2 gap-4">
            <Field label="Business name"><input value={businessName} onChange={e=>setBusinessName(e.target.value)} required placeholder="Apex Supermarket" /></Field>
            <Field label="Category"><input value={category} onChange={e=>setCategory(e.target.value)} required placeholder="Groceries" /></Field>
            <Field label="Address"><input value={address} onChange={e=>setAddress(e.target.value)} required placeholder="1 Main Street" /></Field>
            <Field label="City"><input value={city} onChange={e=>setCity(e.target.value)} required placeholder="Freetown" /></Field>
            <Field label="Phone"><input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+232 ..." /></Field>
          </div>
          <label className="mt-6 flex gap-3 items-start text-xs text-slate-400"><input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)} className="mt-0.5" /><span>I confirm that I am authorized to represent this business and accept the business onboarding terms.</span></label>
          {error && <div className="mt-5 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div>}
          <button disabled={busy} className="mt-6 w-full rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 py-3.5 font-black flex items-center justify-center gap-2">{busy ? 'Creating owner account…' : 'Create Business Owner Account'} <ArrowRight className="w-4 h-4" /></button>
          <p className="text-center text-xs text-slate-500 mt-4">Already have an account? <button type="button" onClick={()=>onNavigate('/login')} className="text-indigo-300 font-bold">Sign in</button></p>
        </form>
      </div>
    </main>
  );
}
function Field({label, children}:{label:string;children:React.ReactNode}) {
  return <label className="block"><span className="block text-xs font-bold text-slate-300 mb-1.5">{label}</span>{React.cloneElement(children as React.ReactElement<any>, { className: 'w-full rounded-xl bg-slate-950 border border-white/10 px-3.5 py-2.5 text-sm text-white outline-none focus:border-indigo-500 '+((children as React.ReactElement<any>).props.className||'') })}</label>;
}
function ModeCard({active,icon,title,text,onClick}:{active:boolean;icon:React.ReactNode;title:string;text:string;onClick:()=>void}) {
  return <button type="button" onClick={onClick} className={'text-left rounded-2xl border p-4 transition-all '+(active?'border-indigo-400 bg-indigo-500/10':'border-white/10 bg-white/[0.02] hover:bg-white/5')}><div className="flex items-center gap-2 text-sm font-bold"><span className="text-indigo-300">{icon}</span>{title}</div><p className="text-xs text-slate-400 mt-1.5">{text}</p></button>;
}
