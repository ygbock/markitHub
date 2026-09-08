import React, { useState } from 'react';
import { Customer, CampaignLog } from '../types';
import { 
  Send, Mail, Smartphone, MessageSquare, Bell, 
  Sparkles, Tag, Users, Award, CheckCircle2, 
  X, HelpCircle, Layers, Check, ShieldCheck
} from 'lucide-react';

interface CampaignBroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  selectedCustomerIds?: string[];
  onDispatchCampaign: (campaign: CampaignLog) => void;
}

export default function CampaignBroadcastModal({
  isOpen,
  onClose,
  customers,
  selectedCustomerIds = [],
  onDispatchCampaign
}: CampaignBroadcastModalProps) {
  const [channel, setChannel] = useState<'email' | 'sms' | 'whatsapp' | 'push'>('email');
  const [targetScope, setTargetScope] = useState<'all' | 'segment' | 'selected'>(
    selectedCustomerIds.length > 0 ? 'selected' : 'all'
  );
  const [targetSegment, setTargetSegment] = useState<'VIP' | 'Regular' | 'New' | 'Inactive'>('VIP');
  
  const [subject, setSubject] = useState('Exclusive VIP Rewards & Weekend Catalog Drop');
  const [message, setMessage] = useState(
    'Hi {{customer_name}},\nAs a valued {{tier}} member at Nexus, we are excited to offer you 50 bonus loyalty points on all purchases this weekend! Use code {{discount_code}} at checkout.'
  );
  const [attachedPromoCode, setAttachedPromoCode] = useState('NEXUSVIP');
  const [isDispatching, setIsDispatching] = useState(false);
  const [isDispatchedSuccess, setIsDispatchedSuccess] = useState(false);

  if (!isOpen) return null;

  // Compute recipient list based on target scope
  const recipients = customers.filter(c => {
    if (targetScope === 'selected' && selectedCustomerIds.length > 0) {
      return selectedCustomerIds.includes(c.id);
    }
    if (targetScope === 'segment') {
      return c.segment === targetSegment;
    }
    return true; // 'all'
  });

  const insertVariable = (varName: string) => {
    setMessage(prev => `${prev} {{${varName}}}`);
  };

  // Preview replacement using first customer sample
  const sampleCustomer = recipients[0] || customers[0] || { name: 'Sarah Connor', loyaltyPoints: 340, loyaltyTier: 'Gold' };
  const previewText = message
    .replace(/{{customer_name}}/g, sampleCustomer.name)
    .replace(/{{points}}/g, String(sampleCustomer.loyaltyPoints || 0))
    .replace(/{{tier}}/g, sampleCustomer.loyaltyTier || 'VIP')
    .replace(/{{discount_code}}/g, attachedPromoCode || 'SAVE10')
    .replace(/{{store_name}}/g, 'Nexus Enterprise');

  const handleDispatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || recipients.length === 0) return;

    setIsDispatching(true);

    const log: CampaignLog = {
      id: `cmp-${Date.now()}`,
      channel,
      targetType: targetScope,
      targetLabel: targetScope === 'selected' 
        ? `${selectedCustomerIds.length} Selected Contacts` 
        : targetScope === 'segment' 
        ? `${targetSegment} Segment Audience` 
        : 'Complete Customer Directory',
      subject: channel === 'email' || channel === 'push' ? subject : undefined,
      message,
      recipientCount: recipients.length,
      timestamp: new Date().toISOString(),
      status: 'Delivered'
    };

    setTimeout(() => {
      onDispatchCampaign(log);
      setIsDispatching(false);
      setIsDispatchedSuccess(true);
      setTimeout(() => {
        setIsDispatchedSuccess(false);
        onClose();
      }, 1200);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden my-auto"
        id="campaign-broadcast-modal"
      >
        {/* Modal Header */}
        <div className="px-6 py-4.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center text-indigo-400 font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Omnichannel Campaign Studio</h2>
              <p className="text-xs text-slate-400">Broadcast personalized SMS, Email, and Push campaigns across customer segments</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: 2-Column Studio */}
        <div className="overflow-y-auto p-6 flex-1 text-xs text-slate-700 bg-slate-50/40">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left: Campaign Configuration Form (7 Cols) */}
            <form onSubmit={handleDispatch} className="lg:col-span-7 space-y-4" id="campaign-compose-form">
              
              {/* Channel Selector */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-700">Dispatch Gateway Channel</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'email', label: 'Email (SendGrid)', icon: Mail },
                    { id: 'sms', label: 'SMS (Twilio)', icon: Smartphone },
                    { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
                    { id: 'push', label: 'In-App Push', icon: Bell }
                  ].map(ch => {
                    const Icon = ch.icon;
                    const isSelected = channel === ch.id;
                    return (
                      <button
                        type="button"
                        key={ch.id}
                        onClick={() => setChannel(ch.id as any)}
                        className={`p-2.5 rounded-xl border text-center font-bold flex flex-col items-center gap-1 transition-all ${
                          isSelected
                            ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                            : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-[10px] truncate max-w-full">{ch.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Target Audience Scope */}
              <div className="space-y-2 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                <label className="block text-[11px] font-bold text-slate-700">Audience Segmentation</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setTargetScope('all')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                      targetScope === 'all'
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    All Contacts ({customers.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setTargetScope('segment')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                      targetScope === 'segment'
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    Target Segment
                  </button>

                  <button
                    type="button"
                    disabled={selectedCustomerIds.length === 0}
                    onClick={() => setTargetScope('selected')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all disabled:opacity-40 ${
                      targetScope === 'selected'
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    Selected ({selectedCustomerIds.length})
                  </button>
                </div>

                {targetScope === 'segment' && (
                  <div className="pt-2 flex gap-1.5 flex-wrap">
                    {['VIP', 'Regular', 'New', 'Inactive'].map(seg => (
                      <button
                        type="button"
                        key={seg}
                        onClick={() => setTargetSegment(seg as any)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                          targetSegment === seg
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {seg} ({customers.filter(c => c.segment === seg).length})
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                  <span>Targeted Recipients:</span>
                  <strong className="text-slate-900 font-mono text-xs">{recipients.length} customer profiles</strong>
                </div>
              </div>

              {/* Subject (for email or push) */}
              {(channel === 'email' || channel === 'push') && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Campaign Subject Line</label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Special VIP Invitation for this weekend"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              )}

              {/* Message Composer & Variable Chips */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-700">Message Body</label>
                  <span className="text-[10px] text-slate-400 font-mono">{message.length} characters</span>
                </div>

                {/* Variable Injector Chips */}
                <div className="flex items-center gap-1.5 flex-wrap pb-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Insert Token:</span>
                  {[
                    { label: 'Name', token: 'customer_name' },
                    { label: 'Points', token: 'points' },
                    { label: 'Tier', token: 'tier' },
                    { label: 'Promo Code', token: 'discount_code' },
                    { label: 'Store', token: 'store_name' }
                  ].map(item => (
                    <button
                      type="button"
                      key={item.token}
                      onClick={() => insertVariable(item.token)}
                      className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded text-[10px] font-mono font-bold transition-all"
                    >
                      +{item.label}
                    </button>
                  ))}
                </div>

                <textarea
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs leading-relaxed focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              {/* Promo Code & Campaign Preset */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Attached Coupon Code</label>
                  <input
                    type="text"
                    value={attachedPromoCode}
                    onChange={(e) => setAttachedPromoCode(e.target.value.toUpperCase())}
                    placeholder="e.g. VIP20"
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Quick Campaign Presets</label>
                  <select
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'vip') {
                        setSubject('VIP Exclusive: Double Points & Early Access');
                        setMessage('Hi {{customer_name}},\nAs one of our top VIP guests, enjoy double loyalty points on all orders this weekend! Redeem code {{discount_code}} in store or online.');
                        setAttachedPromoCode('VIPDOUBLE');
                      } else if (val === 'winback') {
                        setSubject('We Miss You at Nexus - $15 Gift Inside');
                        setMessage('Hi {{customer_name}},\nIt has been a while! We added 50 loyalty points to your account. Use code {{discount_code}} on your next order over $50.');
                        setAttachedPromoCode('COMEBACK15');
                      } else if (val === 'drop') {
                        setSubject('Just Arrived: New Inventory In Stock');
                        setMessage('Hi {{customer_name}},\nFresh new catalog gear has just arrived in our inventory showroom. Check out new styles and claim your member bonus with {{discount_code}}.');
                        setAttachedPromoCode('NEWDROP10');
                      }
                    }}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold"
                  >
                    <option value="">-- Load Preset Template --</option>
                    <option value="vip">⭐ VIP Double Points Promo</option>
                    <option value="winback">🔄 Inactive Customer Win-Back</option>
                    <option value="drop">📦 New Product Line Arrival</option>
                  </select>
                </div>
              </div>

              {/* Submit Dispatch */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isDispatching || recipients.length === 0}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-2xl font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2"
                  id="btn-confirm-campaign-dispatch"
                >
                  {isDispatchedSuccess ? (
                    <span className="flex items-center gap-1.5 text-white animate-in zoom-in">
                      <CheckCircle2 className="w-4 h-4 text-emerald-300" /> Dispatched to {recipients.length} Recipients!
                    </span>
                  ) : isDispatching ? (
                    'Transmitting Telemetry Payload...'
                  ) : (
                    <>
                      <Send className="w-4 h-4" /> Broadcast Campaign ({recipients.length} Recipients)
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Right: Live Preview Device Simulator (5 Cols) */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center bg-slate-900/5 p-4 rounded-3xl border border-slate-200">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1">
                <Smartphone className="w-3.5 h-3.5" /> Live Recipient Device Simulator
              </span>

              {/* Smartphone Shell Mockup */}
              <div className="w-[270px] bg-slate-950 p-3 rounded-[36px] shadow-2xl border-4 border-slate-800 text-white space-y-3">
                {/* Speaker Notch */}
                <div className="w-20 h-3.5 bg-slate-800 rounded-full mx-auto" />

                {/* Simulated Screen */}
                <div className="bg-slate-900 rounded-[24px] p-3.5 min-h-[340px] flex flex-col justify-between text-xs space-y-3 border border-slate-800">
                  {/* Top Bar */}
                  <div className="flex items-center justify-between text-[10px] text-slate-400 border-b border-slate-800 pb-2">
                    <span className="font-bold flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-indigo-400" /> Nexus POS
                    </span>
                    <span>Just now</span>
                  </div>

                  {/* Message Bubble */}
                  <div className="bg-indigo-600/25 border border-indigo-500/40 p-3.5 rounded-2xl space-y-2 text-slate-100 text-[11px] leading-relaxed">
                    {channel === 'email' && (
                      <p className="font-bold text-white text-xs border-b border-indigo-400/30 pb-1">
                        {subject}
                      </p>
                    )}
                    <p className="whitespace-pre-wrap font-sans text-slate-200">
                      {previewText}
                    </p>
                    {attachedPromoCode && (
                      <div className="mt-2 p-2 bg-slate-950/60 rounded-xl border border-indigo-400/30 text-center font-mono font-bold text-amber-300 text-xs">
                        PROMO: {attachedPromoCode}
                      </div>
                    )}
                  </div>

                  {/* Customer context pill */}
                  <div className="bg-slate-800/80 p-2 rounded-xl text-[9px] text-slate-400 flex items-center justify-between">
                    <span>Sample: {sampleCustomer.name}</span>
                    <span className="text-indigo-300 font-bold">{channel.toUpperCase()}</span>
                  </div>
                </div>

                {/* Bottom Home Indicator */}
                <div className="w-24 h-1 bg-slate-700 rounded-full mx-auto mt-1" />
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
