import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, Eye, EyeOff, LockKeyhole, RefreshCw, Save, ShieldCheck } from 'lucide-react';

type MonimeConfig = {
  configured: boolean;
  provider: 'monime';
  environment?: 'sandbox' | 'production';
  spaceId?: string | null;
  webhookConfigured?: boolean;
  preferredChannel?: string;
  version?: string;
};

export default function MonimeGatewaySettings() {
  const [config, setConfig] = useState<MonimeConfig | null>(null);
  const [spaceId, setSpaceId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [mode, setMode] = useState<'test' | 'live'>('test');
  const [channel, setChannel] = useState('all');
  const [showToken, setShowToken] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState('');
  const [showRequirements, setShowRequirements] = useState(false);

  const load = async () => {
    const res = await fetch('/api/monime/config', { credentials: 'include' });
    if (!res.ok) throw new Error('Unable to load Monime configuration.');
    const data = await res.json();
    setConfig(data);
    if (data.spaceId) setSpaceId(data.spaceId);
    if (data.environment) setMode(data.environment === 'production' ? 'live' : 'test');
    if (data.preferredChannel) setChannel(data.preferredChannel);
  };

  useEffect(() => { load().catch(e => setMessage(e.message)); }, []);

  const save = async () => {
    setBusy(true); setMessage('');
    try {
      const res = await fetch('/api/monime/config', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monimeSpaceId: spaceId, monimeAccessToken: accessToken, webhookSecret, monimeMode: mode, monimePreferredChannel: channel })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to save Monime configuration.');
      setMessage('Monime configuration saved securely.');
      setAccessToken('');
      setWebhookSecret('');
      await load();
    } catch (e: any) { setMessage(e.message || 'Unable to save configuration.'); }
    finally { setBusy(false); }
  };

  const test = async () => {
    setTesting(true); setMessage('');
    try {
      const res = await fetch('/api/monime/test-connection', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const data = await res.json();
      if (!res.ok || data.success === false) throw new Error(data.message || data.error || 'Monime connection test failed.');
      setMessage(data.message || 'Monime connection verified.');
    } catch (e: any) { setMessage(e.message || 'Monime connection test failed.'); }
    finally { setTesting(false); }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-7 shadow-xs space-y-6" id="settings-section-monime">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b border-gray-100 pb-5">
        <div>
          <h3 className="text-lg font-black text-slate-900 flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-indigo-600" />Monime Payment Gateway</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-2xl">Connect this merchant tenant directly to its own Monime Space. Credentials are sent to the server and are never displayed back in full.</p>
        </div>
        {config?.configured ? <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase">Configured</span> : <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-black uppercase">Setup required</span>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="text-xs font-bold text-slate-700">Monime Space ID
          <input value={spaceId} onChange={e=>setSpaceId(e.target.value)} className="mt-1 w-full px-3 py-2.5 bg-slate-50 border border-gray-200 rounded-xl font-mono" placeholder="Your Monime Space ID" autoComplete="off" />
        </label>
        <label className="text-xs font-bold text-slate-700">Environment
          <select value={mode} onChange={e=>setMode(e.target.value as 'test'|'live')} className="mt-1 w-full px-3 py-2.5 bg-slate-50 border border-gray-200 rounded-xl font-bold">
            <option value="test">Sandbox / Test</option><option value="live">Production / Live</option>
          </select>
        </label>
        <label className="text-xs font-bold text-slate-700">Monime API Access Token
          <div className="mt-1 flex gap-2"><input type={showToken?'text':'password'} value={accessToken} onChange={e=>setAccessToken(e.target.value)} className="w-full px-3 py-2.5 bg-slate-50 border border-gray-200 rounded-xl font-mono" placeholder={config?.configured ? 'Leave blank to keep current token' : 'Paste server-side API token'} autoComplete="new-password" /><button type="button" onClick={()=>setShowToken(v=>!v)} className="px-3 border rounded-xl">{showToken?<EyeOff/>:<Eye/>}</button></div>
        </label>
        <label className="text-xs font-bold text-slate-700">Webhook Verification Secret
          <div className="mt-1 flex gap-2"><input type={showSecret?'text':'password'} value={webhookSecret} onChange={e=>setWebhookSecret(e.target.value)} className="w-full px-3 py-2.5 bg-slate-50 border border-gray-200 rounded-xl font-mono" placeholder={config?.webhookConfigured ? 'Leave blank to keep current secret' : 'Minimum 32 characters'} autoComplete="new-password" /><button type="button" onClick={()=>setShowSecret(v=>!v)} className="px-3 border rounded-xl">{showSecret?<EyeOff/>:<Eye/>}</button></div>
        </label>
        <label className="text-xs font-bold text-slate-700">Preferred Channel
          <select value={channel} onChange={e=>setChannel(e.target.value)} className="mt-1 w-full px-3 py-2.5 bg-slate-50 border border-gray-200 rounded-xl font-bold">
            <option value="all">All supported channels</option><option value="mobile_money">Mobile Money</option><option value="card">Cards</option><option value="bank_transfer">Bank Transfer</option><option value="payment_code">Payment Code</option>
          </select>
        </label>
      </div>

      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
        <div className="flex gap-2"><LockKeyhole className="w-4 h-4 text-slate-600 mt-0.5" /><p className="text-xs text-slate-700 font-semibold">Security boundary</p></div>
        <p className="text-[11px] text-slate-500">The API token and webhook secret are stored encrypted server-side per tenant. They are not written to localStorage and are never returned by the configuration API.</p>
        <button type="button" onClick={()=>setShowRequirements(v=>!v)} className="text-[11px] font-bold text-indigo-700 hover:text-indigo-800">{showRequirements ? 'Hide setup requirements' : 'Show setup requirements'}</button>
        {showRequirements && <ul className="text-[11px] text-slate-600 list-disc pl-5 space-y-1"><li>Monime Space ID in the <code>spc-...</code> format.</li><li>Monime Personal Access Token for this Space.</li><li>Webhook verification secret, 32–256+ characters; keep it identical to the secret configured for your Monime webhook.</li><li>Use a test/sandbox token for testing and a live token only for production.</li></ul>}
        <p className="text-[11px] text-slate-500">Configure Monime to send webhooks to this tenant's dedicated endpoint: <code>/api/monime/webhook/&lt;tenantId&gt;</code>.</p>
      </div>

      {message && <div className="p-3 rounded-xl bg-slate-50 border text-xs font-semibold flex items-center gap-2">{message.includes('saved')||message.includes('verified')?<CheckCircle2 className="w-4 h-4 text-emerald-600"/>:<AlertTriangle className="w-4 h-4 text-amber-600"/>}{message}</div>}

      <div className="flex flex-wrap gap-2 justify-end">
        <button type="button" onClick={()=>test()} disabled={testing||!config?.configured} className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold flex items-center gap-2 disabled:opacity-50"><RefreshCw className={`w-4 h-4 ${testing?'animate-spin':''}`}/>Test Connection</button>
        <button type="button" onClick={()=>save()} disabled={busy||!spaceId||(!config?.configured && (!accessToken||!webhookSecret))} className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold flex items-center gap-2 disabled:opacity-50"><Save className="w-4 h-4"/>{busy?'Saving…':'Save Monime Configuration'}</button>
      </div>
    </div>
  );
}
