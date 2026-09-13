import React from 'react';
import { 
  X, Key, BookOpen, RefreshCw, CheckCircle2, AlertCircle, 
  Eye, EyeOff, Sliders, Star, Check 
} from 'lucide-react';
import { PaymentGatewayConfig } from '../../../types';
import { STANDARD_CHART_OF_ACCOUNTS } from '../../../services/ledgerService';
import MonimeGatewaySettings from '../MonimeGatewaySettings';

interface PaymentGatewayConfigDialogProps {
  isOpen: boolean;
  gateway: PaymentGatewayConfig | null;
  allGateways: PaymentGatewayConfig[];
  onClose: () => void;
  onSelectGateway: (id: string) => void;
  onUpdateGateway: (id: string, updates: Partial<PaymentGatewayConfig>) => void;
  onToggleGateway: (id: string, enabled: boolean) => void;
  onToggleStorefront: (id: string, enabled: boolean) => void;
  onTogglePOS: (id: string, enabled: boolean) => void;
  onSetDefaultGateway: (id: string) => void;
  onTestConnection: (gateway: PaymentGatewayConfig) => void;
  testingGatewayId: string | null;
  testResults: Record<string, { 
    success: boolean; 
    message: string; 
    timestamp: string; 
    latencyMs?: number; 
    diagnostics?: any; 
  }>;
  showSecretKeys: Record<string, boolean>;
  onToggleShowSecretKeys: (id: string) => void;
  onOpenMonimeDoc: () => void;
  onSaveDirect: () => Promise<void>;
  isDirectSaving: boolean;
  directSaveSuccess: boolean;
}

export const PaymentGatewayConfigDialog: React.FC<PaymentGatewayConfigDialogProps> = ({
  isOpen,
  gateway,
  allGateways,
  onClose,
  onSelectGateway,
  onUpdateGateway,
  onToggleGateway,
  onToggleStorefront,
  onTogglePOS,
  onSetDefaultGateway,
  onTestConnection,
  testingGatewayId,
  testResults,
  showSecretKeys,
  onToggleShowSecretKeys,
  onOpenMonimeDoc,
  onSaveDirect,
  isDirectSaving,
  directSaveSuccess,
}) => {
  if (!isOpen || !gateway) return null;

  return (
    <div 
      className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="gateway-config-dialog-title"
      id="payment-gateway-config-dialog"
    >
      <div 
        className="bg-white rounded-3xl max-w-4xl w-full p-5 sm:p-7 shadow-2xl border border-slate-200 space-y-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Dialog Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-base shrink-0 shadow-xs ${
              gateway.provider === 'monime' 
                ? 'bg-indigo-600 text-white' 
                : gateway.provider === 'orange_money' 
                ? 'bg-orange-500 text-white' 
                : gateway.provider === 'afrimoney' 
                ? 'bg-rose-600 text-white' 
                : gateway.provider === 'stripe' 
                ? 'bg-purple-600 text-white' 
                : gateway.provider === 'bank_wire' 
                ? 'bg-blue-600 text-white' 
                : gateway.provider === 'cash'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-700 text-white'
            }`}>
              {gateway.provider === 'monime' ? 'M' : 
               gateway.provider === 'orange_money' ? 'OM' : 
               gateway.provider === 'afrimoney' ? 'AF' : 
               gateway.provider === 'stripe' ? 'ST' : 
               gateway.provider === 'bank_wire' ? 'BW' : 
               gateway.provider === 'cash' ? '💵' : '💳'}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 id="gateway-config-dialog-title" className="text-base sm:text-lg font-black text-slate-900">
                  Configure {gateway.name}
                </h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  gateway.enabled 
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  {gateway.enabled ? 'Enabled in Storefront' : 'Disabled'}
                </span>
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase ${
                  gateway.environment === 'production' 
                    ? 'bg-emerald-500/20 text-emerald-700 border border-emerald-500/30' 
                    : 'bg-amber-500/20 text-amber-700 border border-amber-500/30'
                }`}>
                  {gateway.environment === 'production' ? 'Live' : 'Sandbox'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{gateway.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
              title="Close Dialog"
              id="btn-close-gateway-dialog"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Switcher between installed gateways */}
        {allGateways.length > 1 && (
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Switch Gateway Rail</span>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              {allGateways.map((gw) => (
                <button
                  key={gw.id}
                  type="button"
                  onClick={() => onSelectGateway(gw.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer border ${
                    gateway.id === gw.id
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full ${gw.enabled ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                  <span>{gw.name}</span>
                  {gw.isDefault && (
                    <span className="text-[9px] px-1 py-0.2 rounded bg-amber-400/30 text-amber-600 font-bold">DEFAULT</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Actions Bar & Test Connection */}
        <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex-wrap">
          <div className="text-xs text-slate-600 font-medium">
            Verify upstream provider connection and manage activation status.
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {gateway.provider === 'monime' && (
              <button
                type="button"
                onClick={onOpenMonimeDoc}
                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                <span>Documentation Guide</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onTestConnection(gateway)}
              disabled={testingGatewayId === gateway.id}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testingGatewayId === gateway.id ? 'animate-spin text-indigo-600' : ''}`} />
              <span>{testingGatewayId === gateway.id ? 'Verifying Probe...' : 'Test Connection'}</span>
            </button>

            <button
              type="button"
              onClick={() => onToggleGateway(gateway.id, !gateway.enabled)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                gateway.enabled
                  ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
              }`}
            >
              {gateway.enabled ? 'Disable Gateway' : 'Enable Gateway'}
            </button>
          </div>
        </div>

        {/* Test Connection Output Alert */}
        {testResults[gateway.id] && (
          <div className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-start justify-between gap-3 text-xs animate-in fade-in ${
            testResults[gateway.id].success 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-950' 
              : 'bg-amber-50 border-amber-200 text-amber-950'
          }`}>
            <div className="flex items-start gap-2.5">
              {testResults[gateway.id].success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-black text-slate-900">
                    {testResults[gateway.id].success ? 'Handshake Successful' : 'API Diagnostic Notice'} ({testResults[gateway.id].timestamp})
                  </span>
                  {testResults[gateway.id].latencyMs !== undefined && (
                    <span className="px-2 py-0.5 bg-white rounded-md text-[10px] font-mono font-bold border border-slate-200 shadow-2xs">
                      {testResults[gateway.id].latencyMs}ms Latency
                    </span>
                  )}
                  {testResults[gateway.id].diagnostics?.statusCode && (
                    <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-800 rounded text-[9px] font-mono font-bold">
                      HTTP {testResults[gateway.id].diagnostics.statusCode}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-700">{testResults[gateway.id].message}</p>
              </div>
            </div>

            {gateway.provider === 'monime' && (
              <button
                type="button"
                onClick={onOpenMonimeDoc}
                className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-lg text-[11px] flex items-center gap-1 shrink-0 self-start cursor-pointer"
              >
                <BookOpen className="w-3 h-3 text-indigo-600" />
                <span>View Docs</span>
              </button>
            )}
          </div>
        )}

        {/* Channel Availability & Checkout Experience */}
        <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-indigo-600" />
              <span>Channel Availability & Checkout Experience</span>
            </span>
            {gateway.isDefault && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                <span>Storefront Default</span>
              </span>
            )}
          </div>

          {/* Toggles & Options */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Storefront toggle */}
            <div className="p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800 block">Online Storefront</span>
                <span className="text-[10px] text-slate-500">Show to customers during checkout</span>
              </div>
              <button
                type="button"
                onClick={() => onToggleStorefront(gateway.id, !(gateway.enabled && gateway.availableInStorefront !== false))}
                className={`w-10 h-5.5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                  gateway.enabled && gateway.availableInStorefront !== false ? 'bg-emerald-600 justify-end' : 'bg-slate-300 justify-start'
                }`}
              >
                <div className="w-4.5 h-4.5 rounded-full bg-white shadow-xs" />
              </button>
            </div>

            {/* POS toggle */}
            <div className="p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800 block">POS Terminal</span>
                <span className="text-[10px] text-slate-500">Available at physical cashier</span>
              </div>
              <button
                type="button"
                onClick={() => onTogglePOS(gateway.id, !(gateway.availableInPOS !== false))}
                className={`w-10 h-5.5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                  gateway.availableInPOS !== false ? 'bg-indigo-600 justify-end' : 'bg-slate-300 justify-start'
                }`}
              >
                <div className="w-4.5 h-4.5 rounded-full bg-white shadow-xs" />
              </button>
            </div>

            {/* Default radio */}
            <div className="p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800 block">Preselect as Default</span>
                <span className="text-[10px] text-slate-500">Preselected method in checkout</span>
              </div>
              <button
                type="button"
                onClick={() => onSetDefaultGateway(gateway.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  gateway.isDefault 
                    ? 'bg-amber-100 text-amber-800 border border-amber-300' 
                    : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                <Star className={`w-3 h-3 ${gateway.isDefault ? 'fill-amber-500 text-amber-500' : 'text-slate-400'}`} />
                <span>{gateway.isDefault ? 'Default' : 'Set Default'}</span>
              </button>
            </div>
          </div>

          {/* Customer Instruction Field */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Customer Guidance Prompt / Instructions (shown under payment method name at checkout)
            </label>
            <input
              type="text"
              value={gateway.customerInstruction || ''}
              onChange={(e) => onUpdateGateway(gateway.id, { customerInstruction: e.target.value })}
              placeholder="e.g. Enter your phone number to receive instant USSD authorization"
              className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
            />
          </div>

          {/* General Technical Parameters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Environment Mode</label>
              <select
                value={gateway.environment}
                onChange={(e) => onUpdateGateway(gateway.id, { environment: e.target.value as any })}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
              >
                <option value="sandbox">Sandbox / Test Simulated Mode</option>
                <option value="production">Production (Live Gateway Rail)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Surcharge Fee % (Optional)</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="15"
                  step="0.1"
                  value={gateway.surchargePercent}
                  onChange={(e) => onUpdateGateway(gateway.id, { surchargePercent: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-slate-900 focus:outline-hidden pr-7"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">%</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Settlement Ledger Account</label>
              <select
                value={gateway.settlementLedgerAccount}
                onChange={(e) => onUpdateGateway(gateway.id, { settlementLedgerAccount: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-slate-900 focus:outline-hidden font-mono"
              >
                {STANDARD_CHART_OF_ACCOUNTS.filter(a => a.type === 'Asset').map(acc => (
                  <option key={acc.code} value={`${acc.code} - ${acc.name}`}>
                    {acc.code} - {acc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Provider-Specific Credentials */}
        <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
              <Key className="w-3.5 h-3.5 text-indigo-600" />
              <span>API Credentials & Provider Parameters</span>
            </span>
            {gateway.provider !== 'monime' && (
              <button
                type="button"
                onClick={() => onToggleShowSecretKeys(gateway.id)}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
              >
                {showSecretKeys[gateway.id] ? (
                  <>
                    <EyeOff className="w-3 h-3" />
                    <span>Mask Secrets</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3 h-3" />
                    <span>Reveal Keys</span>
                  </>
                )}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Monime API Infrastructure Fields & Configuration Experience */}
            {gateway.provider === 'monime' && (
              <div className="sm:col-span-2">
                <MonimeGatewaySettings />
              </div>
            )}

            {/* Orange / Afrimoney Mobile Money Fields */}
            {(gateway.provider === 'orange_money' || gateway.provider === 'afrimoney') && (
              <>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Merchant Shortcode / ID</label>
                  <input
                    type="text"
                    value={gateway.credentials?.merchantId || ''}
                    onChange={(e) => onUpdateGateway(gateway.id, { credentials: { ...gateway.credentials, merchantId: e.target.value } })}
                    placeholder="e.g. OM-NEXUS-884920"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Carrier USSD Trigger Code</label>
                  <input
                    type="text"
                    value={gateway.credentials?.ussdCode || ''}
                    onChange={(e) => onUpdateGateway(gateway.id, { credentials: { ...gateway.credentials, ussdCode: e.target.value } })}
                    placeholder="*144*4*4# or *161#"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Webhook Callback Signing Secret</label>
                  <input
                    type={showSecretKeys[gateway.id] ? 'text' : 'password'}
                    value={gateway.credentials?.webhookSecret || ''}
                    onChange={(e) => onUpdateGateway(gateway.id, { credentials: { ...gateway.credentials, webhookSecret: e.target.value } })}
                    placeholder="whsec_..."
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                  />
                </div>
              </>
            )}

            {/* Stripe / Card Gateway Fields */}
            {(gateway.provider === 'stripe' || gateway.provider === 'card_terminal') && (
              <>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Publishable Key</label>
                  <input
                    type="text"
                    value={gateway.credentials?.publishableKey || ''}
                    onChange={(e) => onUpdateGateway(gateway.id, { credentials: { ...gateway.credentials, publishableKey: e.target.value } })}
                    placeholder="pk_test_..."
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Secret Key</label>
                  <input
                    type={showSecretKeys[gateway.id] ? 'text' : 'password'}
                    value={gateway.credentials?.secretKey || ''}
                    onChange={(e) => onUpdateGateway(gateway.id, { credentials: { ...gateway.credentials, secretKey: e.target.value } })}
                    placeholder="sk_test_..."
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Stripe Webhook Secret</label>
                  <input
                    type={showSecretKeys[gateway.id] ? 'text' : 'password'}
                    value={gateway.credentials?.webhookSecret || ''}
                    onChange={(e) => onUpdateGateway(gateway.id, { credentials: { ...gateway.credentials, webhookSecret: e.target.value } })}
                    placeholder="whsec_..."
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                  />
                </div>
              </>
            )}

            {/* Direct Bank Wire Fields */}
            {gateway.provider === 'bank_wire' && (
              <>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Beneficiary Bank Name</label>
                  <input
                    type="text"
                    value={gateway.credentials?.bankName || ''}
                    onChange={(e) => onUpdateGateway(gateway.id, { credentials: { ...gateway.credentials, bankName: e.target.value } })}
                    placeholder="Sierra Leone Commercial Bank (SLCB)"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Account Number / IBAN</label>
                  <input
                    type="text"
                    value={gateway.credentials?.accountNumber || ''}
                    onChange={(e) => onUpdateGateway(gateway.id, { credentials: { ...gateway.credentials, accountNumber: e.target.value } })}
                    placeholder="00300188920194"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Account Entity Name</label>
                  <input
                    type="text"
                    value={gateway.credentials?.accountName || ''}
                    onChange={(e) => onUpdateGateway(gateway.id, { credentials: { ...gateway.credentials, accountName: e.target.value } })}
                    placeholder="Nexus Retail & POS Global LLC"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">SWIFT / BIC Code</label>
                  <input
                    type="text"
                    value={gateway.credentials?.swiftBic || ''}
                    onChange={(e) => onUpdateGateway(gateway.id, { credentials: { ...gateway.credentials, swiftBic: e.target.value } })}
                    placeholder="SLCBSLFR"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Checkbox Inclusions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer text-xs font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={gateway.autoCapture}
              onChange={(e) => onUpdateGateway(gateway.id, { autoCapture: e.target.checked })}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 shrink-0"
            />
            <div>
              <span className="font-bold block">Instant Auto-Capture</span>
              <span className="text-[10px] text-slate-500">Capture funds immediately upon checkout approval</span>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer text-xs font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={gateway.allowGuestCheckout}
              onChange={(e) => onUpdateGateway(gateway.id, { allowGuestCheckout: e.target.checked })}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 shrink-0"
            />
            <div>
              <span className="font-bold block">Allow for Guest Shoppers</span>
              <span className="text-[10px] text-slate-500">Permit non-authenticated checkout through this rail</span>
            </div>
          </label>
        </div>

        {/* Dialog Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onSaveDirect}
              disabled={isDirectSaving}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>{isDirectSaving ? 'Saving...' : directSaveSuccess ? '✓ Synced to Firestore' : 'Save Payment Settings'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
