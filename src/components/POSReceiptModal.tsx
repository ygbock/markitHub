import React, { useState, useEffect } from 'react';
import { Order } from '../types';
import { useCurrency } from '../context/CurrencyContext';
import { 
  Receipt, Printer, Download, Share2, Mail, CheckCircle2, 
  Copy, Check, Send, Sparkles, ExternalLink, RefreshCw, X,
  Smartphone, MessageSquare, AlertCircle, FileText, Globe
} from 'lucide-react';
import { 
  printReceiptViaIframe, 
  downloadReceiptHtml, 
  downloadReceiptText, 
  copyReceiptToClipboard, 
  shareReceipt, 
  dispatchReceiptEmail,
  DEFAULT_BUSINESS_INFO
} from '../utils/receiptUtils';

interface POSReceiptModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  activeStaffName: string;
  autoEmailDispatched?: boolean;
}

export default function POSReceiptModal({
  order,
  isOpen,
  onClose,
  activeStaffName,
  autoEmailDispatched = false
}: POSReceiptModalProps) {
  const { formatAmount } = useCurrency();
  const [copied, setCopied] = useState(false);
  const [downloadFormat, setDownloadFormat] = useState<'html' | 'txt'>('html');
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailDeliveryStatus, setEmailDeliveryStatus] = useState<{
    sent: boolean;
    recipient: string;
    timestamp: string;
    autoSent?: boolean;
  } | null>(null);
  const [previewEmailModal, setPreviewEmailModal] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Initialize email state when order opens
  useEffect(() => {
    if (!isOpen) return;
    if (order) {
      setEmailInput(order.customerEmail || '');
      if (order.receiptSentToEmail || (autoEmailDispatched && order.customerEmail)) {
        setEmailDeliveryStatus({
          sent: true,
          recipient: order.receiptSentToEmail || order.customerEmail || '',
          timestamp: order.receiptSentAt || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          autoSent: true
        });
      } else {
        setEmailDeliveryStatus(null);
      }
    }
  }, [order, autoEmailDispatched]);

  if (!isOpen || !order) return null;

  const handlePrint = () => {
    printReceiptViaIframe(order, formatAmount, activeStaffName, DEFAULT_BUSINESS_INFO);
    showNotice('Sending receipt to thermal / desktop printer...');
  };

  const handleDownload = () => {
    if (downloadFormat === 'html') {
      downloadReceiptHtml(order, formatAmount, activeStaffName, DEFAULT_BUSINESS_INFO);
      showNotice(`Downloaded styled HTML receipt for ${order.id}`);
    } else {
      downloadReceiptText(order, formatAmount, activeStaffName, DEFAULT_BUSINESS_INFO);
      showNotice(`Downloaded text receipt for ${order.id}`);
    }
  };

  const handleCopyClipboard = async () => {
    const success = await copyReceiptToClipboard(order, formatAmount, activeStaffName, DEFAULT_BUSINESS_INFO);
    if (success) {
      setCopied(true);
      showNotice('Receipt copied to clipboard!');
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleNativeShare = async () => {
    const res = await shareReceipt(order, formatAmount, activeStaffName, DEFAULT_BUSINESS_INFO);
    if (res.method === 'fallback' && res.success) {
      setCopied(true);
      showNotice('Sharing copied receipt to clipboard!');
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleSendEmail = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const recipient = emailInput.trim();
    if (!recipient || !recipient.includes('@')) {
      alert('Please enter a valid customer email address.');
      return;
    }

    setIsSendingEmail(true);
    try {
      const res = await dispatchReceiptEmail(order, recipient, formatAmount, activeStaffName);
      if (res.success) {
        setEmailDeliveryStatus({
          sent: true,
          recipient: res.recipient,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          autoSent: false
        });
        showNotice(`Receipt successfully sent to ${res.recipient}`);
      }
    } catch {
      alert('Failed to send email receipt. Please try again.');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const showNotice = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 3500);
  };

  // WhatsApp share link
  const orderSummaryText = `Receipt for ${DEFAULT_BUSINESS_INFO.name}\nOrder #: ${order.id}\nTotal: ${formatAmount(order.total)}\nDate: ${new Date(order.date).toLocaleDateString()}\nItems: ${order.items.length}\nThank you!`;
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(orderSummaryText)}`;
  const smsUrl = `sms:?body=${encodeURIComponent(orderSummaryText)}`;
  const mailtoUrl = `mailto:${emailInput || ''}?subject=${encodeURIComponent(`Receipt for Order ${order.id} - ${DEFAULT_BUSINESS_INFO.name}`)}&body=${encodeURIComponent(orderSummaryText)}`;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-70 overflow-y-auto animate-in fade-in duration-150" id="pos-receipt-modal-root">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col md:flex-row my-auto max-h-[92vh]" id="pos-receipt-modal-container">
        
        {/* Left Side: Realistic Thermal Slip Preview */}
        <div className="md:w-1/2 bg-slate-100/80 p-4 sm:p-6 overflow-y-auto flex flex-col items-center justify-start border-b md:border-b-0 md:border-r border-gray-200" id="receipt-paper-wrapper">
          
          <div className="w-full max-w-[320px] bg-white rounded-2xl p-5 shadow-md border border-slate-200/90 text-slate-900 relative space-y-3" id="thermal-slip-view">
            
            {/* Thermal Top Perforation Effect */}
            <div className="absolute -top-1.5 left-0 right-0 h-3 flex justify-between overflow-hidden px-2">
              {Array.from({ length: 18 }).map((_, i) => (
                <div key={i} className="w-2.5 h-2.5 bg-slate-100/80 rounded-full -mt-1" />
              ))}
            </div>

            {/* Store Header */}
            <div className="text-center border-b-2 border-dashed border-gray-200 pb-3 space-y-1">
              <div className="w-10 h-10 bg-slate-900 text-white rounded-full flex items-center justify-center mx-auto font-black text-sm mb-1 shadow-xs">
                N
              </div>
              <h2 className="text-sm font-black tracking-tight text-slate-900 uppercase">
                {DEFAULT_BUSINESS_INFO.name}
              </h2>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">{DEFAULT_BUSINESS_INFO.tagline}</p>
              <p className="text-[10px] text-gray-400 font-mono">{DEFAULT_BUSINESS_INFO.address}</p>
              <p className="text-[10px] text-gray-400 font-mono">Tel: {DEFAULT_BUSINESS_INFO.phone} | {DEFAULT_BUSINESS_INFO.taxId}</p>
            </div>

            {/* Order Meta */}
            <div className="text-[11px] text-gray-600 border-b border-dashed border-gray-200 pb-2.5 space-y-1 font-mono">
              <div className="flex justify-between">
                <span className="text-gray-400">Order ID:</span>
                <span className="font-bold text-slate-900">{order.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Date:</span>
                <span className="text-slate-800">{new Date(order.date).toLocaleDateString()} {new Date(order.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Cashier:</span>
                <span className="text-slate-800 font-semibold">{activeStaffName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Customer:</span>
                <span className="font-bold text-indigo-700">{order.customerName || 'Walk-in Guest'}</span>
              </div>
              {order.customerEmail && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Email:</span>
                  <span className="text-slate-700 truncate max-w-[170px]">{order.customerEmail}</span>
                </div>
              )}
            </div>

            {/* Line items list */}
            <div className="space-y-2 text-xs border-b border-dashed border-gray-200 pb-3" id="thermal-items-list">
              <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                <span>Item</span>
                <span className="text-right">Qty & Total</span>
              </div>
              {order.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-start text-slate-800" id={`thermal-item-${idx}`}>
                  <div className="pr-2">
                    <span className="font-semibold block leading-tight">{item.productName}</span>
                    <span className="text-[10px] text-gray-400 font-mono">
                      {item.variantSku ? `SKU: ${item.variantSku.split('-').pop()} • ` : ''}
                      {item.quantity} × {formatAmount(item.price)}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-slate-900 shrink-0">
                    {formatAmount(item.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            {/* Financial summary */}
            <div className="space-y-1 text-xs border-b-2 border-dashed border-gray-200 pb-3" id="thermal-totals">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal</span>
                <span className="font-mono font-semibold text-slate-800">{formatAmount(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Sales Tax {order.taxExempt ? '(Exempt 0%)' : '(8.5%)'}</span>
                <span className="font-mono font-semibold text-slate-800">{formatAmount(order.tax)}</span>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Discount</span>
                  <span className="font-mono font-bold">-{formatAmount(order.discount)}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-sm font-black text-slate-900 pt-1.5 border-t border-gray-100">
                <span>TOTAL PAID</span>
                <span className="font-mono text-base text-indigo-900">{formatAmount(order.total)}</span>
              </div>
            </div>

            {/* Payment & Cash Return */}
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-[11px] space-y-1 font-mono">
              <div className="flex justify-between">
                <span className="text-gray-500">Tender:</span>
                <span className="font-bold text-slate-800">{order.paymentMethod}</span>
              </div>
              {order.paymentMethod === 'Cash' && typeof order.cashTendered === 'number' && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Cash Tendered:</span>
                    <span className="font-semibold">{formatAmount(order.cashTendered)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>Change Returned:</span>
                    <span>{formatAmount(order.cashChange || 0)}</span>
                  </div>
                </>
              )}
              {order.loyaltyPointsEarned ? (
                <div className="flex justify-between text-indigo-600 font-bold border-t border-slate-200/60 pt-1 mt-1">
                  <span>Points Earned:</span>
                  <span>+{order.loyaltyPointsEarned} pts</span>
                </div>
              ) : null}
            </div>

            {/* Simulated Barcode */}
            <div className="text-center pt-1" id="thermal-barcode-area">
              <div className="inline-block px-3 py-1 bg-white border border-gray-200 rounded-md">
                <div className="flex items-center justify-center gap-0.5 h-6">
                  {[2, 1, 3, 1, 4, 2, 1, 3, 2, 4, 1, 3, 1, 2, 4, 2, 1, 3, 1].map((w, i) => (
                    <div key={i} className={`h-full bg-slate-900`} style={{ width: `${w}px` }} />
                  ))}
                </div>
                <span className="text-[9px] font-mono text-gray-500 tracking-widest block mt-0.5">*{order.id.toUpperCase()}*</span>
              </div>
            </div>

            {/* Footer Policy */}
            <div className="text-center text-[9px] text-gray-400 leading-tight pt-1">
              <p>{DEFAULT_BUSINESS_INFO.returnPolicy}</p>
              <p className="font-bold text-slate-700 mt-1">Thank you for your visit!</p>
            </div>
          </div>
        </div>

        {/* Right Side: Interactive Controls (Print, Download, Share, Automated Email) */}
        <div className="md:w-1/2 p-5 sm:p-6 flex flex-col justify-between space-y-5 overflow-y-auto" id="receipt-controls-panel">
          
          {/* Header & Status */}
          <div className="space-y-3">
            <div className="flex justify-between items-start">
              <div>
                {order.status === 'Refunded' ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-full text-xs font-bold">
                    <AlertCircle className="w-3.5 h-3.5" /> Refunded / Void
                  </span>
                ) : autoEmailDispatched ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Sale Completed & E-Receipt Dispatched
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-xs font-bold">
                    <Receipt className="w-3.5 h-3.5" /> POS Sales Slip
                  </span>
                )}
                <h3 className="text-lg font-bold text-slate-900 mt-1.5">POS Sales Receipt</h3>
                <p className="text-xs text-gray-500">Order Ref: <span className="font-mono font-semibold text-slate-700">{order.id}</span></p>
              </div>
              <button 
                onClick={onClose}
                className="p-1.5 text-gray-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
                id="btn-close-receipt-modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Action Feedback Banner */}
            {actionNotice && (
              <div className="p-3 bg-indigo-50 border border-indigo-100 text-indigo-800 rounded-2xl text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150">
                <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>{actionNotice}</span>
              </div>
            )}

            {/* Section 1: Automated Email Receipt Status & Sender */}
            <div className="bg-slate-50 border border-gray-150 rounded-2xl p-4 space-y-3" id="email-receipt-section">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-indigo-600" /> Customer Email Receipt
                </span>
                {emailDeliveryStatus?.sent && (
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Auto-Dispatched
                  </span>
                )}
              </div>

              {emailDeliveryStatus?.sent ? (
                <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-1.5 text-xs">
                  <div className="flex items-center gap-2 text-emerald-900 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Receipt automatically delivered!</span>
                  </div>
                  <p className="text-[11px] text-emerald-800">
                    Sent to: <strong className="font-mono">{emailDeliveryStatus.recipient}</strong> at {emailDeliveryStatus.timestamp}
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => setPreviewEmailModal(true)}
                      className="text-[11px] text-emerald-700 hover:text-emerald-950 font-bold underline flex items-center gap-1"
                      id="btn-preview-email-receipt"
                    >
                      <FileText className="w-3 h-3" /> View HTML Email
                    </button>
                    <span className="text-emerald-300">•</span>
                    <button
                      onClick={() => handleSendEmail()}
                      disabled={isSendingEmail}
                      className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1"
                      id="btn-resend-email"
                    >
                      <RefreshCw className={`w-3 h-3 ${isSendingEmail ? 'animate-spin' : ''}`} /> Resend Email
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-gray-500">
                  Enter the customer's email below to dispatch their itemized e-receipt instantly.
                </p>
              )}

              {/* Email Input Form */}
              <form onSubmit={handleSendEmail} className="flex gap-2" id="form-send-receipt-email">
                <div className="relative flex-1">
                  <Mail className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="email"
                    placeholder="customer@example.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="w-full pl-8.5 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-slate-900 focus:outline-hidden"
                    id="input-receipt-email"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSendingEmail || !emailInput}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all shrink-0"
                  id="btn-send-email-submit"
                >
                  {isSendingEmail ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>{emailDeliveryStatus?.sent ? 'Send Copy' : 'Send Receipt'}</span>
                </button>
              </form>
            </div>

            {/* Section 2: Print & Download Quick Actions */}
            <div className="grid grid-cols-2 gap-3" id="print-download-buttons-grid">
              
              {/* Print Receipt Button */}
              <button
                onClick={handlePrint}
                className="p-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl flex flex-col items-center justify-center gap-1.5 shadow-xs transition-all group"
                id="btn-print-thermal-receipt"
              >
                <Printer className="w-5 h-5 text-indigo-400 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold">Print Receipt</span>
                <span className="text-[10px] text-gray-400">Thermal Slip / A4</span>
              </button>

              {/* Download Receipt Button */}
              <div className="flex flex-col gap-1.5">
                <button
                  onClick={handleDownload}
                  className="w-full p-3.5 bg-white border border-gray-200 hover:bg-slate-50 text-slate-800 rounded-2xl flex flex-col items-center justify-center gap-1.5 shadow-3xs transition-all group"
                  id="btn-download-receipt"
                >
                  <Download className="w-5 h-5 text-emerald-600 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold">Download File</span>
                  <span className="text-[10px] text-gray-500 font-mono uppercase">.{downloadFormat} file</span>
                </button>
                <div className="flex justify-center gap-2 text-[10px] font-bold text-gray-500">
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input 
                      type="radio" 
                      name="dlformat" 
                      checked={downloadFormat === 'html'} 
                      onChange={() => setDownloadFormat('html')}
                      className="accent-indigo-600" 
                    /> HTML
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input 
                      type="radio" 
                      name="dlformat" 
                      checked={downloadFormat === 'txt'} 
                      onChange={() => setDownloadFormat('txt')}
                      className="accent-indigo-600" 
                    /> Text (.txt)
                  </label>
                </div>
              </div>
            </div>

            {/* Section 3: Share Receipt Options (Web Share, WhatsApp, SMS, Copy) */}
            <div className="bg-white border border-gray-150 rounded-2xl p-4 space-y-3" id="share-receipt-section">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Share2 className="w-4 h-4 text-emerald-600" /> Share & Messaging
                </span>
                <button
                  onClick={() => setShowShareOptions(!showShareOptions)}
                  className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
                >
                  {showShareOptions ? 'Hide Channels' : 'Show All Channels'}
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" id="share-channels-grid">
                
                {/* Copy to Clipboard */}
                <button
                  onClick={handleCopyClipboard}
                  className="p-2 bg-slate-50 hover:bg-slate-100 border border-gray-150 rounded-xl text-slate-700 text-xs font-semibold flex flex-col items-center gap-1 transition-all"
                  id="btn-copy-receipt"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-gray-500" />}
                  <span className="text-[10px]">{copied ? 'Copied!' : 'Copy Text'}</span>
                </button>

                {/* WhatsApp */}
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-emerald-50/70 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex flex-col items-center gap-1 transition-all text-center"
                  id="btn-share-whatsapp"
                >
                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                  <span className="text-[10px]">WhatsApp</span>
                </a>

                {/* SMS */}
                <a
                  href={smsUrl}
                  className="p-2 bg-amber-50/70 hover:bg-amber-100 border border-amber-200 rounded-xl text-amber-800 text-xs font-semibold flex flex-col items-center gap-1 transition-all text-center"
                  id="btn-share-sms"
                >
                  <Smartphone className="w-4 h-4 text-amber-600" />
                  <span className="text-[10px]">SMS / Text</span>
                </a>

                {/* Native Web Share */}
                <button
                  onClick={handleNativeShare}
                  className="p-2 bg-indigo-50/70 hover:bg-indigo-100 border border-indigo-200 rounded-xl text-indigo-800 text-xs font-semibold flex flex-col items-center gap-1 transition-all text-center"
                  id="btn-share-native"
                >
                  <ExternalLink className="w-4 h-4 text-indigo-600" />
                  <span className="text-[10px]">Share Dialog</span>
                </button>
              </div>

              {showShareOptions && (
                <div className="p-3 bg-slate-50 rounded-xl border border-gray-150 text-xs space-y-2 animate-in fade-in duration-150">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-bold text-slate-700">Direct Mailto Link:</span>
                    <a
                      href={mailtoUrl}
                      className="text-[11px] font-bold text-indigo-600 hover:underline flex items-center gap-1"
                    >
                      <Mail className="w-3 h-3" /> Open Email Client
                    </a>
                  </div>
                  <div className="text-[10px] text-gray-500 font-mono bg-white p-2 rounded-lg border border-gray-200 truncate">
                    {orderSummaryText.replace(/\n/g, ' • ')}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="pt-3 border-t border-gray-100 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold shadow-md transition-all text-center flex items-center justify-center gap-2"
              id="btn-finish-and-new-sale"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Start Next Sale (POS Ready)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Embedded HTML Email Preview Modal */}
      {previewEmailModal && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 z-60 animate-in fade-in duration-150" id="preview-email-backdrop">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto border border-gray-100">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-indigo-600" />
                <h4 className="text-sm font-bold text-slate-900">E-Receipt Email Preview</h4>
              </div>
              <button onClick={() => setPreviewEmailModal(false)} className="text-gray-400 hover:text-slate-800 p-1 rounded-lg">✕</button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-gray-150 text-xs space-y-1 font-mono text-gray-600">
              <div><strong>To:</strong> {emailDeliveryStatus?.recipient || order.customerEmail || 'customer@example.com'}</div>
              <div><strong>From:</strong> orders@nexuspos.io (Nexus Enterprise POS)</div>
              <div><strong>Subject:</strong> Your Receipt from Nexus Enterprise [Order #{order.id}]</div>
            </div>

            <div className="border border-gray-200 rounded-2xl p-5 bg-white space-y-4 text-xs text-slate-800">
              <div className="text-center space-y-1 pb-3 border-b border-gray-100">
                <h3 className="font-extrabold text-base text-slate-900">{DEFAULT_BUSINESS_INFO.name}</h3>
                <p className="text-[11px] text-gray-500">Thank you for your purchase!</p>
                <p className="text-[10px] text-gray-400 font-mono">Order ID: {order.id} | {new Date(order.date).toLocaleString()}</p>
              </div>

              <div className="space-y-2">
                {order.items.map((item, i) => (
                  <div key={i} className="flex justify-between py-1 border-b border-gray-50">
                    <div>
                      <span className="font-semibold">{item.productName}</span>
                      <span className="text-[10px] text-gray-400 block">{item.quantity} × {formatAmount(item.price)}</span>
                    </div>
                    <span className="font-mono font-bold">{formatAmount(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-1 pt-2 border-t border-gray-100 text-right font-mono">
                <div>Subtotal: <strong>{formatAmount(order.subtotal)}</strong></div>
                <div>Tax: <strong>{formatAmount(order.tax)}</strong></div>
                {order.discount > 0 && <div className="text-emerald-600">Discount: -{formatAmount(order.discount)}</div>}
                <div className="text-sm font-extrabold text-slate-900 pt-1">Total Paid: {formatAmount(order.total)}</div>
              </div>

              <div className="bg-indigo-50 text-indigo-800 p-3 rounded-xl text-center text-[11px]">
                Payment processed via <strong>{order.paymentMethod}</strong>. Need help or returns? Contact {DEFAULT_BUSINESS_INFO.phone}.
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setPreviewEmailModal(false)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
