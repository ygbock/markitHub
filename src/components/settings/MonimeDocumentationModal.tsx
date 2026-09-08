import React, { useState } from 'react';
import { 
  X, 
  BookOpen, 
  Key, 
  Globe, 
  Webhook, 
  Activity, 
  CheckCircle2, 
  XCircle, 
  Copy, 
  Check, 
  ExternalLink, 
  Terminal, 
  AlertCircle, 
  ShieldCheck, 
  RefreshCw, 
  Layers,
  ArrowRight,
  Code2
} from 'lucide-react';

interface MonimeDocumentationModalProps {
  isOpen: boolean;
  onClose: () => void;
  spaceId?: string;
  apiToken?: string;
  onRunTestConnection?: () => Promise<any>;
}

export const MonimeDocumentationModal: React.FC<MonimeDocumentationModalProps> = ({
  isOpen,
  onClose,
  spaceId = 'monime_spc_sl_nexus',
  apiToken = 'monime_live_sec_...',
  onRunTestConnection
}) => {
  const [activeTab, setActiveTab] = useState<'quickstart' | 'api_ref' | 'webhooks' | 'diagnostics'>('quickstart');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    latencyMs?: number;
    diagnostics?: any;
  } | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, keyName: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleTestPing = async () => {
    setIsTesting(true);
    try {
      if (onRunTestConnection) {
        const res = await onRunTestConnection();
        setTestResult(res);
      } else {
        const res = await fetch('/api/monime/test-connection', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ spaceId, token: apiToken })
        });
        const json = await res.json();
        setTestResult(json);
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `Connection test error: ${err?.message || 'Network unreachable'}`
      });
    } finally {
      setIsTesting(false);
    }
  };

  const originUrl = typeof window !== 'undefined' ? window.location.origin : 'https://your-storefront.com';
  const webhookUrl = `${originUrl}/api/monime/webhook`;

  return (
    <div 
      className="fixed inset-0 z-70 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 bg-slate-900 text-slate-100 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-400 flex items-center justify-center font-black">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white">Monime Financial Gateway</h3>
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-[10px] font-bold">
                  API caph.2025-08-23
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Developer integration guide, credentials reference, and API status diagnostics
              </p>
            </div>
          </div>

          <button 
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-200 bg-slate-50 px-5 sm:px-6 overflow-x-auto gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('quickstart')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors shrink-0 cursor-pointer ${
              activeTab === 'quickstart' 
                ? 'border-indigo-600 text-indigo-600 bg-white' 
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>Setup & Credentials</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('api_ref')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors shrink-0 cursor-pointer ${
              activeTab === 'api_ref' 
                ? 'border-indigo-600 text-indigo-600 bg-white' 
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>API & Headers</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('webhooks')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors shrink-0 cursor-pointer ${
              activeTab === 'webhooks' 
                ? 'border-indigo-600 text-indigo-600 bg-white' 
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Webhook className="w-3.5 h-3.5" />
            <span>Webhooks & Events</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('diagnostics')}
            className={`py-3 px-3.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors shrink-0 cursor-pointer ${
              activeTab === 'diagnostics' 
                ? 'border-indigo-600 text-indigo-600 bg-white' 
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Live Status & Diagnostics</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-5 sm:p-7 overflow-y-auto flex-1 space-y-6 text-slate-700 text-xs leading-relaxed">
          
          {/* TAB 1: QUICKSTART & CREDENTIALS */}
          {activeTab === 'quickstart' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="p-4 bg-indigo-50/80 border border-indigo-200 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-indigo-950 font-bold text-sm">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  <span>Monime Financial Architecture</span>
                </div>
                <p className="text-indigo-900">
                  Monime operates as a unified payment orchestration layer for Sierra Leone and West Africa, supporting Orange Money, Africell Afrimoney, and Visa/Mastercard cards. In this application, checkout sessions are initiated on the backend and customers are routed to the hosted Monime checkout interface.
                </p>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">1</span>
                  <span>Required Environment & System Variables</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-indigo-600 text-[11px]">MONIME_SPACE_ID</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(spaceId, 'space_id')}
                        className="text-[10px] text-slate-500 hover:text-indigo-600 flex items-center gap-1 font-semibold cursor-pointer"
                      >
                        {copiedKey === 'space_id' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedKey === 'space_id' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Your tenant space identifier assigned by Monime. Passed in the <code className="font-mono bg-white px-1 py-0.5 rounded border border-slate-200 text-[10px]">Monime-Space-Id</code> header.
                    </p>
                    <div className="p-2 bg-white rounded-xl border border-slate-200 font-mono text-[10px] text-slate-800 break-all font-bold">
                      {spaceId || 'monime_spc_sl_nexus'}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-indigo-600 text-[11px]">MONIME_API_TOKEN</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(apiToken, 'api_token')}
                        className="text-[10px] text-slate-500 hover:text-indigo-600 flex items-center gap-1 font-semibold cursor-pointer"
                      >
                        {copiedKey === 'api_token' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedKey === 'api_token' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Secret API Bearer token for server-side authorization. Never exposed to the browser client.
                    </p>
                    <div className="p-2 bg-white rounded-xl border border-slate-200 font-mono text-[10px] text-slate-800 break-all font-bold">
                      {apiToken ? `${apiToken.slice(0, 12)}••••••••••••` : 'monime_sec_••••••••'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">2</span>
                  <span>Currency & Minor Unit Precision Rules</span>
                </h4>
                <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2 text-amber-950">
                  <div className="flex items-center gap-2 font-bold text-xs text-amber-900">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Minor Units (Scale x100) for SLE and USD</span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    Monime checkout sessions require line item prices to be expressed in integer minor units (e.g. <strong>SLE 150.00</strong> must be formatted as <code className="font-mono bg-white px-1 py-0.5 rounded border border-amber-300 font-bold">value: 15000</code>). The Nexus Payment Gateway adapter handles this scaling automatically.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: API REFERENCE */}
          {activeTab === 'api_ref' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="space-y-3">
                <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-indigo-600" />
                  <span>Monime Session Creation Endpoint</span>
                </h4>
                <p className="text-slate-600">
                  To initiate a checkout session, perform an authenticated POST request to Monime API:
                </p>

                <div className="relative rounded-2xl bg-slate-900 p-4 font-mono text-[11px] text-slate-200 space-y-3 overflow-x-auto">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-slate-400 text-[10px]">
                    <span>cURL Request Example</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(`curl -X POST https://api.monime.io/v1/checkout-sessions \\
  -H "Authorization: Bearer ${apiToken || 'MONIME_API_TOKEN'}" \\
  -H "Monime-Space-Id: ${spaceId || 'MONIME_SPACE_ID'}" \\
  -H "Monime-Version: caph.2025-08-23" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Order ORD-10029",
    "reference": "ORD-10029",
    "successUrl": "${originUrl}/?monime_success=true&order_id=ORD-10029",
    "cancelUrl": "${originUrl}/?monime_cancel=true",
    "lineItems": [
      {
        "name": "Premium Wireless Headphones",
        "quantity": 1,
        "price": { "currency": "SLE", "value": 45000 }
      }
    ]
  }'`, 'curl_sample')}
                      className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === 'curl_sample' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedKey === 'curl_sample' ? 'Copied cURL' : 'Copy cURL'}</span>
                    </button>
                  </div>

                  <pre className="text-slate-300 font-mono text-[10px] leading-relaxed">
{`curl -X POST https://api.monime.io/v1/checkout-sessions \\
  -H "Authorization: Bearer ${apiToken || 'MONIME_API_TOKEN'}" \\
  -H "Monime-Space-Id: ${spaceId || 'MONIME_SPACE_ID'}" \\
  -H "Monime-Version: caph.2025-08-23" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Storefront Order ORD-10029",
    "reference": "ORD-10029",
    "successUrl": "${originUrl}/?monime_success=true&order_id=ORD-10029",
    "cancelUrl": "${originUrl}/?monime_cancel=true",
    "lineItems": [
      {
        "name": "Product SKU-101",
        "quantity": 1,
        "price": { "currency": "SLE", "value": 15000 }
      }
    ]
  }'`}
                  </pre>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-black text-slate-900">HTTP Status Code Reference</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                    <span className="font-mono font-bold text-emerald-800 text-xs">200 / 201 Created</span>
                    <p className="text-[11px] text-emerald-700 mt-1">
                      Checkout session provisioned. Response includes <code className="font-mono font-bold">redirectUrl</code>.
                    </p>
                  </div>

                  <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
                    <span className="font-mono font-bold text-rose-800 text-xs">401 Unauthorized</span>
                    <p className="text-[11px] text-rose-700 mt-1">
                      Invalid or missing Bearer token in <code className="font-mono font-bold">Authorization</code> header.
                    </p>
                  </div>

                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                    <span className="font-mono font-bold text-amber-800 text-xs">403 Forbidden</span>
                    <p className="text-[11px] text-amber-700 mt-1">
                      The space ID is invalid or not accessible with the provided API token.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-100 rounded-xl border border-slate-200">
                    <span className="font-mono font-bold text-slate-800 text-xs">422 Unprocessable</span>
                    <p className="text-[11px] text-slate-600 mt-1">
                      Validation error in line items, price integer format, or currency code.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: WEBHOOKS & EVENTS */}
          {activeTab === 'webhooks' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="p-4 bg-slate-900 rounded-2xl text-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Your Live Webhook URL</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(webhookUrl, 'webhook_url')}
                    className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    {copiedKey === 'webhook_url' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'webhook_url' ? 'Copied' : 'Copy Endpoint URL'}</span>
                  </button>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl font-mono text-xs text-emerald-400 border border-slate-800 break-all font-bold">
                  {webhookUrl}
                </div>
                <p className="text-[11px] text-slate-400">
                  Register this URL in your Monime Developer Dashboard under Webhooks to receive real-time payment settlement notifications.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-black text-slate-900">Supported Webhook Event Types</h4>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white">
                  <div className="p-3.5 flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-mono font-bold text-xs text-slate-900">checkout_session.completed</span>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        Fired when the customer approves payment on Orange Money, Afrimoney, or Card. Automatically updates the order status to <strong>Completed</strong> and registers the transaction in the General Ledger.
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 flex items-start gap-3">
                    <Activity className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-mono font-bold text-xs text-slate-900">payment.completed</span>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        Direct payment settlement confirmation with carrier reference codes.
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 flex items-start gap-3">
                    <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-mono font-bold text-xs text-slate-900">checkout_session.cancelled / expired</span>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        Fired when the shopper abandons checkout or the carrier prompt times out.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: LIVE DIAGNOSTICS & STATUS */}
          {activeTab === 'diagnostics' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-black text-slate-900">Monime Gateway API Diagnostics</h4>
                    <p className="text-[11px] text-slate-500">Run a verification probe against the live Monime API service to test credentials and latency.</p>
                  </div>

                  <button
                    type="button"
                    onClick={handleTestPing}
                    disabled={isTesting}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-xs disabled:opacity-50 cursor-pointer shrink-0"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                    <span>{isTesting ? 'Running Probe...' : 'Execute Test Probe'}</span>
                  </button>
                </div>

                {/* Test Result Display */}
                {testResult && (
                  <div className={`p-4 rounded-2xl border space-y-3 animate-in fade-in ${
                    testResult.success 
                      ? 'bg-emerald-50/90 border-emerald-200 text-emerald-950' 
                      : 'bg-rose-50/90 border-rose-200 text-rose-950'
                  }`}>
                    <div className="flex items-center gap-2">
                      {testResult.success ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      ) : (
                        <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                      )}
                      <span className="font-bold text-xs">
                        {testResult.success ? 'Monime API Handshake Successful' : 'Connection Check Notice'}
                      </span>
                      {testResult.latencyMs !== undefined && (
                        <span className="ml-auto px-2 py-0.5 bg-white/80 rounded-md text-[10px] font-mono font-bold">
                          {testResult.latencyMs}ms Latency
                        </span>
                      )}
                    </div>

                    <p className="text-xs">{testResult.message}</p>

                    {testResult.diagnostics && (
                      <div className="pt-2 border-t border-emerald-200/60 grid grid-cols-2 sm:grid-cols-3 gap-2 text-[10px] font-mono">
                        <div className="p-2 bg-white/70 rounded-lg">
                          <span className="text-slate-500 block">HTTP Status</span>
                          <span className="font-bold">{testResult.diagnostics.statusCode || 200}</span>
                        </div>
                        <div className="p-2 bg-white/70 rounded-lg">
                          <span className="text-slate-500 block">API Version</span>
                          <span className="font-bold">{testResult.diagnostics.apiVersion || 'caph.2025-08-23'}</span>
                        </div>
                        <div className="p-2 bg-white/70 rounded-lg col-span-2 sm:col-span-1">
                          <span className="text-slate-500 block">Currency Precision</span>
                          <span className="font-bold">Minor Scale x100</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Status Verification Checklist */}
              <div className="space-y-3">
                <h4 className="text-sm font-black text-slate-900">System Integration Health Checklist</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 bg-white rounded-2xl border border-slate-200 flex items-center gap-3">
                    <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <Check className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 block text-xs">Space ID Loaded</span>
                      <span className="text-[10px] text-slate-500 font-mono">{spaceId || 'monime_spc_sl_nexus'}</span>
                    </div>
                  </div>

                  <div className="p-3.5 bg-white rounded-2xl border border-slate-200 flex items-center gap-3">
                    <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <Check className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 block text-xs">Bearer Token Provisioned</span>
                      <span className="text-[10px] text-slate-500 font-mono">Authorization Header Active</span>
                    </div>
                  </div>

                  <div className="p-3.5 bg-white rounded-2xl border border-slate-200 flex items-center gap-3">
                    <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <Check className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 block text-xs">Hosted Redirect Pipeline</span>
                      <span className="text-[10px] text-slate-500">Auto-Return & Settlement Synced</span>
                    </div>
                  </div>

                  <div className="p-3.5 bg-white rounded-2xl border border-slate-200 flex items-center gap-3">
                    <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <Check className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 block text-xs">Firestore Session Sync</span>
                      <span className="text-[10px] text-slate-500 font-mono">monime_sessions collection</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <a
            href="https://docs.monime.io"
            target="_blank"
            rel="noreferrer"
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 cursor-pointer"
          >
            <span>Official Monime Docs</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
