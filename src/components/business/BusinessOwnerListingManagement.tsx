import React, { useEffect, useState } from 'react';
import { CheckCircle2, MapPin, Plus, Save, Trash2, ShieldCheck } from 'lucide-react';
import { auth } from '../../lib/firebase';

type Tab = 'overview'|'listing'|'locations'|'services'|'settings';
interface Props { businessId?: string; activeTab?: Tab; onNavigate:(path:string)=>void; }

interface Profile {
  id:string; legalName:string; tradingName:string; registrationNumber:string; taxId:string;
  country:string; currency:string; email:string; phone:string; status:string; verificationStatus:string;
  businessMode:string; onboardingStatus:string; listing:any; locations:any[]; services:any[]; tenantIds:string[];
}

async function api(path:string, init:RequestInit={}) {
  const token=auth.currentUser ? await auth.currentUser.getIdToken() : '';
  const headers:any={...(init.body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{})};
  const res=await fetch(path,{...init,headers});
  const json=await res.json().catch(()=>({}));
  if(!res.ok) throw new Error(json.error||'Request failed.');
  return json;
}

export default function BusinessOwnerListingManagement({businessId,onNavigate,activeTab='listing'}:Props) {
  const [profile,setProfile]=useState<Profile|null>(null);
  const [loading,setLoading]=useState(true); const [saving,setSaving]=useState(false); const [message,setMessage]=useState('');
  const [draft,setDraft]=useState<any>({});
  const [newLocation,setNewLocation]=useState<any>({name:'',addressLine1:'',city:'',phone:'',operatingHours:''});
  const [newService,setNewService]=useState<any>({name:'',description:'',price:'',durationMinutes:'30'});
  const [addingLocation,setAddingLocation]=useState(false); const [addingService,setAddingService]=useState(false);

  const load=async()=>{ if(!businessId)return; setLoading(true); try{const j=await api('/api/business/'+encodeURIComponent(businessId)+'/profile'); setProfile(j.profile); setDraft({tradingName:j.profile.tradingName,email:j.profile.email,phone:j.profile.phone,listing:{...j.profile.listing}}); }catch(e:any){setMessage(e.message)}finally{setLoading(false)}};
  useEffect(()=>{load()},[businessId]);

  const save=async()=>{if(!profile)return;setSaving(true);setMessage('');try{const j=await api('/api/business/'+encodeURIComponent(profile.id)+'/profile',{method:'PATCH',body:JSON.stringify(draft)});setProfile(j.profile);setDraft({tradingName:j.profile.tradingName,email:j.profile.email,phone:j.profile.phone,listing:{...j.profile.listing}});setMessage('Saved to the authoritative business record.');}catch(e:any){setMessage(e.message)}finally{setSaving(false)}};

  const addLocation=async(e:React.FormEvent)=>{e.preventDefault();if(!profile)return;try{const j=await api('/api/business/'+profile.id+'/locations',{method:'POST',body:JSON.stringify(newLocation)});setProfile({...profile,locations:j.locations});setNewLocation({name:'',addressLine1:'',city:'',phone:'',operatingHours:''});setAddingLocation(false);setMessage('Location saved.');}catch(e:any){setMessage(e.message)}};
  const deleteLocation=async(id:string)=>{if(!profile)return;try{const j=await api('/api/business/'+profile.id+'/locations/'+id,{method:'DELETE'});setProfile({...profile,locations:j.locations});setMessage('Location removed.');}catch(e:any){setMessage(e.message)}};
  const addService=async(e:React.FormEvent)=>{e.preventDefault();if(!profile)return;try{const j=await api('/api/business/'+profile.id+'/services',{method:'POST',body:JSON.stringify({...newService,price:Number(newService.price),durationMinutes:Number(newService.durationMinutes)})});setProfile({...profile,services:j.services});setNewService({name:'',description:'',price:'',durationMinutes:'30'});setAddingService(false);setMessage('Service saved.');}catch(e:any){setMessage(e.message)}};
  const deleteService=async(id:string)=>{if(!profile)return;try{const j=await api('/api/business/'+profile.id+'/services/'+id,{method:'DELETE'});setProfile({...profile,services:j.services});setMessage('Service removed.');}catch(e:any){setMessage(e.message)}};

  if(loading)return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">Loading business profile…</div>;
  if(!profile)return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6"><div className="text-center"><h1 className="text-xl font-black">Business profile unavailable</h1><p className="text-sm text-slate-400 mt-2">{message}</p><button onClick={()=>onNavigate('/business/'+businessId+'/dashboard')} className="mt-4 rounded-xl bg-indigo-600 px-4 py-2">Back to dashboard</button></div></div>;

  const updateListing=(key:string,value:any)=>setDraft((d:any)=>({...d,listing:{...(d.listing||{}),[key]:value}}));
  const tabs:[Tab,string][]=[['overview','Overview'],['listing','Public Listing'],['locations','Locations'],['services','Services'],['settings','Settings']];

  return <div className="min-h-screen bg-slate-950 text-white">
    <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/95 backdrop-blur px-4 sm:px-7 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div><button onClick={()=>onNavigate('/business/'+profile.id+'/dashboard')} className="text-xs text-indigo-300 font-bold">← Business command center</button><h1 className="text-xl font-black mt-1">{profile.tradingName}</h1><p className="text-xs text-slate-500">Authoritative Business Owner workspace</p></div>
        <div className="flex items-center gap-2"><span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs">{profile.status.replace(/_/g,' ')}</span><span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs">{profile.verificationStatus}</span></div>
      </div>
    </header>
    <main className="max-w-7xl mx-auto p-4 sm:p-7">
      <nav className="flex gap-2 overflow-x-auto pb-5">{tabs.map(([id,label])=><button key={id} onClick={()=>onNavigate('/business/'+profile.id+'/'+id)} className={'px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap '+(activeTab===id?'bg-indigo-600':'bg-white/5 text-slate-300')}>{label}</button>)}</nav>
      {message&&<div className="mb-5 rounded-xl border border-indigo-500/20 bg-indigo-950/30 px-4 py-3 text-sm text-indigo-200">{message}</div>}

      {activeTab==='overview'&&<section className="grid lg:grid-cols-3 gap-5">
        <Card title="Business identity"><Row k="Legal name" v={profile.legalName}/><Row k="Trading name" v={profile.tradingName}/><Row k="Mode" v={profile.businessMode.replace(/_/g,' ')}/><Row k="Owner" v="Authoritative owner"/></Card>
        <Card title="Publication state"><Row k="Verification" v={profile.verificationStatus}/><Row k="Onboarding" v={profile.onboardingStatus.replace(/_/g,' ')}/><Row k="Discovery" v={profile.listing?.isPublished?'Published':'Not published'}/><p className="text-xs text-slate-500 mt-3">Publication is controlled by the platform review process; owner edits cannot publish directly.</p></Card>
        <Card title="Workspace"><button onClick={()=>onNavigate('/business/'+profile.id+'/listing')} className="w-full rounded-xl bg-indigo-600 py-3 font-bold">Manage listing</button><button onClick={()=>onNavigate('/business/'+profile.id+'/locations')} className="w-full rounded-xl bg-white/5 py-3 font-bold mt-2">Manage locations</button></Card>
      </section>}

      {activeTab==='listing'&&<section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 max-w-4xl">
        <div className="flex items-center justify-between"><div><h2 className="text-lg font-black">Public Discovery listing</h2><p className="text-xs text-slate-500 mt-1">Edits persist to the canonical business record. Publication remains platform-controlled.</p></div><ShieldCheck className="text-indigo-300"/></div>
        <div className="grid sm:grid-cols-2 gap-4 mt-6">
          <Field label="Trading name" value={draft.tradingName||''} onChange={(v:string)=>setDraft((d:any)=>({...d,tradingName:v}))}/>
          <Field label="Email" value={draft.email||''} onChange={(v:string)=>setDraft((d:any)=>({...d,email:v}))}/>
          <Field label="Phone" value={draft.phone||''} onChange={(v:string)=>setDraft((d:any)=>({...d,phone:v}))}/>
          <Field label="Headline" value={draft.listing?.headline||''} onChange={(v:string)=>updateListing('headline',v)}/>
        </div>
        <label className="block text-xs font-bold text-slate-400 mt-4">Description<textarea rows={5} value={draft.listing?.description||''} onChange={e=>updateListing('description',e.target.value)} className="mt-1 w-full rounded-xl bg-slate-900 border border-white/10 p-3 text-sm outline-none focus:border-indigo-500"/></label>
        <Field label="Categories (comma separated)" value={(draft.listing?.categories||[]).join(', ')} onChange={(v:string)=>updateListing('categories',v.split(',').map((x:string)=>x.trim()).filter(Boolean))}/>
        <Field label="Tags (comma separated)" value={(draft.listing?.tags||[]).join(', ')} onChange={(v:string)=>updateListing('tags',v.split(',').map((x:string)=>x.trim()).filter(Boolean))}/>
        <div className="flex items-center justify-between mt-6 pt-5 border-t border-white/10"><div><div className="font-bold">Discovery publication</div><div className="text-xs text-slate-500">{profile.listing?.isPublished?'Published by platform':'Awaiting platform review/publication'}</div></div><button disabled className="rounded-full px-4 py-2 bg-slate-800 text-xs text-slate-500 cursor-not-allowed">{profile.listing?.isPublished?'Published':'Platform controlled'}</button></div>
        <button disabled={saving} onClick={save} className="mt-6 rounded-xl bg-indigo-600 disabled:opacity-50 px-5 py-3 font-bold"><Save className="w-4 h-4 inline mr-2"/>{saving?'Saving…':'Save listing'}</button>
      </section>}

      {activeTab==='locations'&&<section className="space-y-5"><div className="flex items-center justify-between"><div><h2 className="text-lg font-black">Locations & branches</h2><p className="text-xs text-slate-500">Canonical locations are synchronized to the business and location subcollection.</p></div><button onClick={()=>setAddingLocation(true)} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold"><Plus className="w-4 h-4 inline mr-1"/>Add location</button></div>
        {addingLocation&&<form onSubmit={addLocation} className="rounded-2xl border border-indigo-500/30 bg-indigo-950/20 p-5 grid sm:grid-cols-2 gap-3"><Field label="Name" value={newLocation.name} onChange={(v:string)=>setNewLocation((x:any)=>({...x,name:v}))}/><Field label="City" value={newLocation.city} onChange={(v:string)=>setNewLocation((x:any)=>({...x,city:v}))}/><Field label="Address" value={newLocation.addressLine1} onChange={(v:string)=>setNewLocation((x:any)=>({...x,addressLine1:v}))}/><Field label="Phone" value={newLocation.phone} onChange={(v:string)=>setNewLocation((x:any)=>({...x,phone:v}))}/><Field label="Hours" value={newLocation.operatingHours} onChange={(v:string)=>setNewLocation((x:any)=>({...x,operatingHours:v}))}/><div className="flex items-end gap-2"><button className="rounded-xl bg-indigo-600 px-4 py-2.5 font-bold">Create</button><button type="button" onClick={()=>setAddingLocation(false)} className="rounded-xl bg-white/5 px-4 py-2.5 font-bold">Cancel</button></div></form>}
        <div className="grid md:grid-cols-2 gap-4">{profile.locations.map(l=><div key={l.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"><div className="flex justify-between gap-3"><div><h3 className="font-bold">{l.name}</h3><p className="text-xs text-slate-400 mt-1"><MapPin className="w-3 h-3 inline mr-1"/>{l.addressLine1}, {l.city}, {l.country}</p><p className="text-xs text-slate-500 mt-1">{l.phone||'No phone'} · {String(l.operatingHours||'Hours not set')}</p></div>{l.hasOperationalTenant?<span className="text-[11px] text-emerald-300">Operational</span>:<button onClick={()=>deleteLocation(l.id)} className="text-rose-400"><Trash2 className="w-4 h-4"/></button>}</div></div>)}</div>
      </section>}

      {activeTab==='services'&&<section className="space-y-5"><div className="flex items-center justify-between"><div><h2 className="text-lg font-black">Services</h2><p className="text-xs text-slate-500">Service offerings are stored with the canonical business profile.</p></div><button onClick={()=>setAddingService(true)} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold"><Plus className="w-4 h-4 inline mr-1"/>Add service</button></div>
        {addingService&&<form onSubmit={addService} className="rounded-2xl border border-indigo-500/30 bg-indigo-950/20 p-5 grid sm:grid-cols-2 gap-3"><Field label="Name" value={newService.name} onChange={(v:string)=>setNewService((x:any)=>({...x,name:v}))}/><Field label="Price" value={newService.price} onChange={(v:string)=>setNewService((x:any)=>({...x,price:v}))}/><Field label="Duration (minutes)" value={newService.durationMinutes} onChange={(v:string)=>setNewService((x:any)=>({...x,durationMinutes:v}))}/><Field label="Description" value={newService.description} onChange={(v:string)=>setNewService((x:any)=>({...x,description:v}))}/><button className="rounded-xl bg-indigo-600 px-4 py-2.5 font-bold">Add service</button></form>}
        <div className="grid md:grid-cols-2 gap-4">{profile.services.map(s=><div key={s.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 flex justify-between gap-3"><div><h3 className="font-bold">{s.name}</h3><p className="text-sm text-emerald-300 mt-1">Le {Number(s.price).toLocaleString()}</p><p className="text-xs text-slate-500 mt-1">{s.description} · {s.durationMinutes} min</p></div><button onClick={()=>deleteService(s.id)} className="text-rose-400"><Trash2 className="w-4 h-4"/></button></div>)}</div>
      </section>}

      {activeTab==='settings'&&<section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 max-w-3xl"><h2 className="text-lg font-black">Business settings</h2><div className="mt-5 grid sm:grid-cols-2 gap-4"><Row k="Business ID" v={profile.id}/><Row k="Registration" v={profile.registrationNumber||'Not supplied'}/><Row k="Tax ID" v={profile.taxId||'Not supplied'}/><Row k="Currency" v={profile.currency}/></div><div className="mt-6 rounded-xl bg-slate-900 p-4 text-xs text-slate-400"><CheckCircle2 className="w-4 h-4 text-emerald-400 inline mr-2"/>Owner authorization is enforced server-side for every profile operation.</div></section>}
    </main>
  </div>;
}
function Field({label,value,onChange}:{label:string;value:string;onChange:(v:string)=>void}){return <label className="block text-xs font-bold text-slate-400"> {label}<input value={value} onChange={e=>onChange(e.target.value)} className="mt-1 w-full rounded-xl bg-slate-900 border border-white/10 p-3 text-sm text-white outline-none focus:border-indigo-500"/></label>}
function Row({k,v}:{k:string;v:string}){return <div className="flex items-center justify-between border-b border-white/5 py-2 text-sm"><span className="text-slate-500">{k}</span><span className="font-semibold text-right">{v}</span></div>}
function Card({title,children}:{title:string;children:React.ReactNode}){return <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6"><h2 className="font-black text-lg mb-4">{title}</h2>{children}</section>}
