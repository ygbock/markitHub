import React, { useEffect, useState } from 'react';

interface Props { onNavigate: (path: string) => void; }

export default function TenantStorefrontManagement({ onNavigate }: Props) {
  const [form, setForm] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    const response = await fetch('/api/tenant/storefront');
    const json = await response.json();
    if (!response.ok || !json.success) throw new Error(json.error || 'Unable to load storefront.');
    setForm(json.storefront);
  }
  useEffect(() => { load().catch(err => setMessage(err.message)); }, []);

  if (!form) return <div className="p-8 text-slate-500">{message || 'Loading storefront CMS…'}</div>;

  async function save(publish = false) {
    setSaving(true); setMessage('');
    try {
      const response = await fetch(publish ? '/api/tenant/storefront/publish' : '/api/tenant/storefront', {
        method: publish ? 'POST' : 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(publish ? { published: true } : form),
      });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error || 'Unable to save storefront.');
      setForm(json.storefront);
      setMessage(publish ? 'Storefront published.' : 'Draft saved.');
    } catch (err: any) { setMessage(err.message); }
    finally { setSaving(false); }
  }

  return <div className="max-w-5xl mx-auto p-6 space-y-6">
    <div className="flex items-center justify-between gap-4">
      <div><h1 className="text-3xl font-black">Storefront CMS</h1><p className="text-sm text-slate-500">Authoritative tenant configuration. Changes are server-validated and audited.</p></div>
      <div className="flex gap-2"><button onClick={() => onNavigate('/tenant/' + form.tenantId + '/dashboard')} className="px-3 py-2 rounded-lg border">Back</button><button disabled={saving} onClick={() => save(false)} className="px-4 py-2 rounded-lg bg-slate-900 text-white">Save draft</button><button disabled={saving} onClick={() => save(true)} className="px-4 py-2 rounded-lg bg-indigo-600 text-white">Publish</button></div>
    </div>
    {message && <div className="p-3 rounded-lg bg-slate-100 text-sm">{message}</div>}
    <div className="bg-white rounded-2xl border p-6 grid md:grid-cols-2 gap-5">
      <label className="text-sm font-bold">Store name<input disabled value={form.name} className="mt-2 w-full rounded-lg border px-3 py-2 bg-slate-50" /></label>
      <label className="text-sm font-bold">Tagline<input value={form.tagline || ''} onChange={e => setForm({...form, tagline:e.target.value})} className="mt-2 w-full rounded-lg border px-3 py-2" /></label>
      <label className="text-sm font-bold">Logo URL<input value={form.logoUrl || ''} onChange={e => setForm({...form, logoUrl:e.target.value})} className="mt-2 w-full rounded-lg border px-3 py-2" /></label>
      <label className="text-sm font-bold">Primary color<input value={form.primaryColor || ''} onChange={e => setForm({...form, primaryColor:e.target.value})} className="mt-2 w-full rounded-lg border px-3 py-2" /></label>
      <label className="text-sm font-bold">Accent color<input value={form.accentColor || ''} onChange={e => setForm({...form, accentColor:e.target.value})} className="mt-2 w-full rounded-lg border px-3 py-2" /></label>
      <div className="md:col-span-2"><div className="font-bold text-sm">Sections</div><div className="mt-3 space-y-2">{form.sections.map((section:any, index:number) => <div key={section.id} className="flex items-center gap-3 p-3 rounded-xl border"><input className="flex-1 rounded border px-2 py-1" value={section.title} onChange={e => setForm({...form, sections:form.sections.map((s:any,i:number)=>i===index?{...s,title:e.target.value}:s)})} /><label className="text-xs"><input type="checkbox" checked={section.enabled !== false} onChange={e => setForm({...form, sections:form.sections.map((s:any,i:number)=>i===index?{...s,enabled:e.target.checked}:s)})} /> Enabled</label></div>)}</div></div>
    </div>
  </div>;
}
