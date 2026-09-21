import React, { useEffect, useState } from 'react';
import { BarChart3, Building2, CheckCircle2, Clock3, ExternalLink, Plus, Settings, Store, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { auth } from '../../lib/firebase';

interface BusinessRecord { id:string; tradingName?:string; legalName?:string; status?:string; verificationStatus?:string; businessMode?:string; onboardingStatus?:string; listing?:{slug?:string;isPublished?:boolean}; locations?:any[]; tenantIds?:string[]; }
interface ReadinessCheck { id:string; label:string; complete:boolean; required:boolean; detail:string; }
interface Readiness { readyForReview:boolean; readyForPublication:boolean; onboardingStatus:string; nextAction:'complete_setup'|'submit_review'|'await_review'|'published'; checks:ReadinessCheck[]; completedCount:number; requiredCount:number; }
interface Props { businessId?: string; onNavigate:(path:string)=>void; }

export default function BusinessOwnerPortal({ businessId, onNavigate }: Props) {
  const { user, businessRelationships } = useAuth();
  const [businesses,setBusinesses]=useState<BusinessRecord[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [readiness,setReadiness]=useState<Readiness|null>(null);
  const [submitting,setSubmitting]=useState(false);
  const [submitMessage,setSubmitMessage]=useState('');
  useEffect(()=>{ let active=true; (async()=>{ try { const token = auth.currentUser ? await auth.currentUser.getIdToken() : '';
    const res=await fetch('/api/business/owned', { headers: token ? { Authorization: 'Bearer ' + token } : {} }); const json=await res.json().catch(()=>({})); if(!res.ok) throw new Error(json.error||'Unable to load your businesses.'); if(active) setBusinesses(Array.isArray(json.businesses)?json.businesses:[]); } catch(e:any){ if(active)setError(e?.message||'Unable to load business workspace.'); } finally { if(active)setLoading(false); } })(); return ()=>{active=false}; },[]);
  const selected=businesses.find(b=>b.id===businessId)||businesses[0];

  useEffect(()=> {
    if(!selected) return;
    let active=true;
    (async()=> {
      try {
        const token = auth.currentUser ? await auth.currentUser.getIdToken() : '';
        const res = await fetch('/api/business/'+encodeURIComponent(selected.id)+'/readiness', { headers: token ? { Authorization: 'Bearer '+token } : {} });
        const json = await res.json().catch(()=>({}));
        if(res.ok && active) setReadiness(json.readiness || null);
      } catch {}
    })();
    return ()=>{active=false};
  },[selected?.id]);

  const submitForReview = async () => {
    if(!selected || !readiness?.readyForReview || submitting) return;
    setSubmitting(true); setSubmitMessage('');
    try {
      const token = auth.currentUser ? await auth.currentUser.getIdToken() : '';
      const res = await fetch('/api/business/'+encodeURIComponent(selected.id)+'/submit-review', {
        method:'POST',
        headers: token ? { Authorization:'Bearer '+token } : {}
      });
      const json = await res.json().catch(()=>({}));
      if(!res.ok) throw new Error(json.error || 'Unable to submit business for review.');
      setReadiness(json.readiness || null);
      setBusinesses(prev=>prev.map(b=>b.id===selected.id ? {...b,onboardingStatus:'submitted_for_review',status:b.status||'pending_verification'} : b));
      setSubmitMessage('Submitted for platform review.');
    } catch(e:any) {
      setSubmitMessage(e?.message || 'Unable to submit business for review.');
    } finally { setSubmitting(false); }
  };

  if(loading) return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">Loading business workspace…</div>;
  if(error) return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6"><div className="max-w-md text-center"><h1 className="text-xl font-black">Business workspace unavailable</h1><p className="text-sm text-slate-400 mt-2">{error}</p></div></div>;
  if(!selected) return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6"><div className="text-center"><Building2 className="w-10 h-10 text-indigo-400 mx-auto"/><h1 className="text-2xl font-black mt-4">No business found</h1><button onClick={()=>onNavigate('/business/signup')} className="mt-5 rounded-xl bg-indigo-600 px-5 py-3 font-bold">Create a business</button></div></div>;
  const ready = selected.verificationStatus === 'verified' && selected.status === 'active';
  const hasStore = Array.isArray(selected.tenantIds) && selected.tenantIds.length > 0;
  return <div className="min-h-screen bg-slate-950 text-white">
    <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/95 backdrop-blur px-4 sm:px-7 py-4"><div className="max-w-7xl mx-auto flex items-center justify-between gap-4"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center"><Building2 className="w-5 h-5"/></div><div><div className="font-black">{selected.tradingName||selected.legalName}</div><div className="text-xs text-slate-500">Business Owner Portal</div></div></div><div className="flex gap-2"><button onClick={()=>onNavigate('/')} className="px-3 py-2 rounded-xl bg-white/5 text-xs font-bold">Discovery</button><button onClick={()=>onNavigate('/business/signup')} className="px-3 py-2 rounded-xl bg-white/5 text-xs font-bold"><Plus className="w-3.5 h-3.5 inline mr-1"/>Business</button></div></div></header>
    <main className="max-w-7xl mx-auto p-4 sm:p-7 space-y-7">
      <section><p className="text-sm text-indigo-300 font-bold">Welcome back{user?.displayName ? ', '+user.displayName : ''}</p><h1 className="text-3xl font-black mt-1">Business command center</h1><p className="text-sm text-slate-400 mt-2">Manage discovery, verification, locations and your path into operational commerce.</p></section>
      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Metric icon={<Building2/>} label="Business status" value={selected.status||'draft'} /><Metric icon={<Clock3/>} label="Verification" value={selected.verificationStatus||'pending'} /><Metric icon={<Store/>} label="Store" value={hasStore?'Operational':'Not provisioned'} /><Metric icon={<Users/>} label="Ownership" value={businessRelationships.some(r=>r.businessId===selected.id&&r.relationshipType==='owner')?'Owner':'Member'} />
      </section>
      <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div><h2 className="font-black text-lg">Onboarding readiness</h2><p className="text-xs text-slate-500 mt-1">Your listing becomes discoverable only after platform review and publication.</p></div>
          {readiness && <div className="text-xs font-bold text-slate-400">{readiness.requiredCount}/4 required checks complete</div>}
        </div>
        {readiness && <div className="mt-5 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">{readiness.checks.filter(check=>check.required).map(check=><div key={check.id} className="rounded-xl bg-slate-900 px-4 py-3"><div className="flex items-center justify-between gap-2"><span className="text-sm font-semibold">{check.label}</span>{check.complete?<CheckCircle2 className="w-4 h-4 text-emerald-400"/>:<Clock3 className="w-4 h-4 text-amber-400"/>}</div><p className="text-[11px] text-slate-500 mt-1">{check.complete?'Complete':check.detail}</p></div>)}</div>}
        {readiness?.nextAction === 'submit_review' && <button disabled={submitting} onClick={submitForReview} className="mt-5 rounded-xl bg-indigo-600 disabled:opacity-50 px-5 py-3 text-sm font-bold">{submitting?'Submitting…':'Submit for platform review'}</button>}
        {readiness?.nextAction === 'await_review' && <div className="mt-5 rounded-xl border border-amber-500/20 bg-amber-950/20 px-4 py-3 text-sm text-amber-200">Your business is complete and awaiting platform review.</div>}
        {readiness?.nextAction === 'published' && <div className="mt-5 rounded-xl border border-emerald-500/20 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-200">Your public Discovery listing is live.</div>}
        {submitMessage && <p className="mt-3 text-xs text-slate-400">{submitMessage}</p>}
      </section>

      <section className="grid lg:grid-cols-[1.2fr_0.8fr] gap-5">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6"><div className="flex items-center justify-between"><div><h2 className="font-black text-lg">Setup progress</h2><p className="text-xs text-slate-500 mt-1">Complete the owner workspace before requesting publication.</p></div><BarChart3 className="w-5 h-5 text-indigo-400"/></div><div className="mt-6 space-y-3">{[['Business identity',!!selected.tradingName],['Primary location',Array.isArray(selected.locations)&&selected.locations.length>0],['Discovery listing',!!selected.listing],['Verification',selected.verificationStatus==='verified']].map(([label,done])=><div key={String(label)} className="flex items-center justify-between rounded-xl bg-slate-900 px-4 py-3"><span className="text-sm">{String(label)}</span>{done?<CheckCircle2 className="w-4 h-4 text-emerald-400"/>:<Clock3 className="w-4 h-4 text-amber-400"/>}</div>)}</div><button onClick={()=>onNavigate('/business/'+selected.id+'/listing')} className="mt-5 w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold">Manage Discovery Listing</button></div>
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6"><h2 className="font-black text-lg">Workspace</h2><div className="mt-4 space-y-2"><NavButton icon={<Building2/>} text="Business profile" onClick={()=>onNavigate('/business/'+selected.id+'/overview')}/><NavButton icon={<Store/>} text="Locations & branches" onClick={()=>onNavigate('/business/'+selected.id+'/locations')}/><NavButton icon={<Settings/>} text="Business settings" onClick={()=>onNavigate('/business/'+selected.id+'/settings')}/>{hasStore&&<NavButton icon={<Store/>} text="Open operational store" onClick={()=>onNavigate('/tenant/'+selected.tenantIds![0]+'/dashboard')}/>}</div></div>
      </section>
      <section className="rounded-3xl border border-indigo-500/20 bg-indigo-950/20 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"><div><h2 className="font-black">Discovery visibility</h2><p className="text-xs text-slate-400 mt-1">{selected.listing?.isPublished?'Listing is published.':'Listing is not published until verification/review is complete.'}</p></div><button onClick={()=>onNavigate('/business/'+selected.id+'/listing')} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-bold">{ready?'Review listing':'Complete review'} <ExternalLink className="w-4 h-4 inline ml-1"/></button></section>
    </main>
  </div>;
}
function Metric({icon,label,value}:{icon:React.ReactNode;label:string;value:string}){return <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><div className="text-indigo-300">{icon}</div><div className="text-[11px] uppercase tracking-wider text-slate-500 mt-3">{label}</div><div className="font-black mt-1 capitalize">{value.replace(/_/g,' ')}</div></div>}
function NavButton({icon,text,onClick}:{icon:React.ReactNode;text:string;onClick:()=>void}){return <button onClick={onClick} className="w-full flex items-center gap-3 rounded-xl bg-slate-900 hover:bg-slate-800 px-4 py-3 text-sm font-semibold text-left">{icon}<span>{text}</span></button>}
