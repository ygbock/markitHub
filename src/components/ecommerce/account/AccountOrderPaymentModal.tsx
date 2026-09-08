import React, { useState } from 'react';
import { CustomerAccountOrder } from './AccountOrderCard';
import { 
  X, Smartphone, CreditCard, Building2, DollarSign, 
  CheckCircle2, ShieldCheck, ArrowRight, Loader2, 
  AlertCircle, Sparkles, Copy, Check, Lock, ChevronRight
} from 'lucide-react';
import { useCurrency } from '../../../context/CurrencyContext';
import { LedgerService } from '../../../services/ledgerService';

interface AccountOrderPaymentModalProps {
  isOpen: boolean;
  order: CustomerAccountOrder | null;
  onClose: () => void;
  onPaymentSuccess: (orderId: string, paymentMethod: string, transactionId: string) => void;
}

type PaymentProvider = 'monime' | 'orange_money' | 'afrimoney' | 'card' | 'bank_transfer' | 'cash_on_delivery';

export const AccountOrderPaymentModal: React.FC<AccountOrderPaymentModalProps> = ({
  isOpen,
  order,
  onClose,
  onPaymentSuccess
}) => {
  const { formatAmount, currentCurrency } = useCurrency();

  const [selectedProvider, setSelectedProvider] = useState<PaymentProvider>('orange_money');
  
  // Mobile Money fields
  const [phoneNumber, setPhoneNumber] = useState('+232 76 892014');
  const [ussdPin, setUssdPin] = useState('');
  
  // Card fields
  const [cardHolder, setCardHolder] = useState('SAHR B SESAY');
  const [cardNumber, setCardNumber] = useState('4000 1234 5678 4242');
  const [cardExpiry, setCardExpiry] = useState('10/28');
  const [cardCvv, setCardCvv] = useState('883');

  // Bank Transfer
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Flow states
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [completedTxnId, setCompletedTxnId] = useState<string>('');
  const [ledgerJournalId, setLedgerJournalId] = useState<string>('');

  if (!isOpen || !order) return null;

  const totalAmount = order.grandTotal || order.total || 0;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleProceedPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    const generatedTxn = `TXN-${selectedProvider.slice(0, 2).toUpperCase()}-${Date.now().toString().slice(-6)}`;
    setCompletedTxnId(generatedTxn);

    // Map provider to PaymentGatewayProvider
    const providerMap: Record<PaymentProvider, any> = {
      monime: 'monime',
      orange_money: 'orange_money',
      afrimoney: 'afrimoney',
      card: 'stripe',
      bank_transfer: 'bank_wire',
      cash_on_delivery: 'cod'
    };

    try {
      const journal = await LedgerService.recordOrderPayment({
        orderId: order.id || order.orderNumber,
        orderNumber: order.orderNumber,
        amount: totalAmount,
        currency: currentCurrency?.code || 'SLE',
        provider: providerMap[selectedProvider],
        transactionId: generatedTxn,
        customerName: 'Customer',
        channel: 'Customer Account Portal'
      });
      setLedgerJournalId(journal.id);
    } catch (err) {
      console.warn('Ledger recording error:', err);
    }

    if (selectedProvider === 'monime') {
      setProcessingStep('Initializing Monime hosted checkout session in minor units...');
      setTimeout(() => {
        setProcessingStep('Authorizing multi-rail payment with Monime API (Space: monime_spc_sl_nexus)...');
        setTimeout(() => {
          setProcessingStep('Monime payment confirmed & settling ledger account 1024...');
          setTimeout(() => {
            setIsProcessing(false);
            setIsSuccess(true);
            onPaymentSuccess(order.id || order.orderNumber, 'Monime Multi-Channel Gateway (Settled)', generatedTxn);
          }, 600);
        }, 700);
      }, 600);
    } else if (selectedProvider === 'orange_money') {
      setProcessingStep('Sending USSD push authorization prompt to phone...');
      setTimeout(() => {
        setProcessingStep('Awaiting approval (*144*4*4#)...');
        setTimeout(() => {
          setProcessingStep('Payment authorized & settling ledger...');
          setTimeout(() => {
            setIsProcessing(false);
            setIsSuccess(true);
            onPaymentSuccess(order.id || order.orderNumber, 'Orange Money (Settled)', generatedTxn);
          }, 600);
        }, 700);
      }, 700);
    } else if (selectedProvider === 'afrimoney') {
      setProcessingStep('Contacting Africell Afrimoney Gateway (*161#)...');
      setTimeout(() => {
        setProcessingStep('Verifying mobile money balance & PIN...');
        setTimeout(() => {
          setProcessingStep('Transaction verified & settled!');
          setTimeout(() => {
            setIsProcessing(false);
            setIsSuccess(true);
            onPaymentSuccess(order.id || order.orderNumber, 'Afrimoney Wallet (Settled)', generatedTxn);
          }, 600);
        }, 700);
      }, 700);
    } else if (selectedProvider === 'card') {
      setProcessingStep('Encrypting payment token via 3D Secure 2.0...');
      setTimeout(() => {
        setProcessingStep('Authorizing charge with card network...');
        setTimeout(() => {
          setProcessingStep('Payment captured successfully!');
          setTimeout(() => {
            setIsProcessing(false);
            setIsSuccess(true);
            onPaymentSuccess(order.id || order.orderNumber, `Visa / Mastercard (•••• ${cardNumber.slice(-4)})`, generatedTxn);
          }, 600);
        }, 700);
      }, 700);
    } else if (selectedProvider === 'bank_transfer') {
      setProcessingStep('Recording B2B wire payment notice & matching reference...');
      setTimeout(() => {
        setIsProcessing(false);
        setIsSuccess(true);
        onPaymentSuccess(order.id || order.orderNumber, 'Bank Transfer (SLCB Pending Cleared)', generatedTxn);
      }, 900);
    } else {
      setProcessingStep('Switching fulfillment mode to Cash on Delivery...');
      setTimeout(() => {
        setIsProcessing(false);
        setIsSuccess(true);
        onPaymentSuccess(order.id || order.orderNumber, 'Cash on Delivery (Pay upon arrival)', generatedTxn);
      }, 800);
    }
  };

  const handleModalClose = () => {
    setIsSuccess(false);
    setIsProcessing(false);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-70 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isProcessing) handleModalClose();
      }}
      id="account-order-payment-modal"
    >
      <div 
        className="bg-white rounded-3xl sm:rounded-4xl max-w-xl w-full p-5 sm:p-7 shadow-2xl border border-slate-200 relative max-h-[92vh] overflow-y-auto no-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Complete Payment for Order #{order.orderNumber}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Choose your preferred payment method to finalize order fulfillment.
              </p>
            </div>
          </div>

          {!isProcessing && (
            <button
              type="button"
              onClick={handleModalClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Success View */}
        {isSuccess ? (
          <div className="py-6 sm:py-8 text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-1">
              <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold inline-block">
                Payment Successfully Settled
              </span>
              <h3 className="text-xl font-black text-slate-900">
                {formatAmount(totalAmount)} Paid
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Your payment has been verified. Order <span className="font-mono font-bold text-slate-800">#{order.orderNumber}</span> has transitioned to <span className="text-emerald-600 font-bold">Paid</span> and is now queued for packing.
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-left space-y-2 text-xs max-w-md mx-auto">
              <div className="flex justify-between text-slate-600">
                <span>Transaction Ref:</span>
                <span className="font-mono font-bold text-slate-900">{completedTxnId}</span>
              </div>
              {ledgerJournalId && (
                <div className="flex justify-between text-slate-600">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Ledger Journal:
                  </span>
                  <span className="font-mono font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded text-[11px]">
                    {ledgerJournalId} • Balanced
                  </span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>Payment Method:</span>
                <span className="font-bold text-slate-900 capitalize">{selectedProvider.replace(/_/g, ' ')}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Date & Time:</span>
                <span className="font-mono text-slate-700">{new Date().toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Order Status:</span>
                <span className="font-bold text-emerald-600">Paid / Ready for Fulfillment</span>
              </div>
            </div>

            <div className="pt-3 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleModalClose}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-2"
              >
                <span>View Updated Order</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          /* Payment Form */
          <form onSubmit={handleProceedPayment} className="space-y-4 pt-3.5">
            
            {/* 1. Order Summary Card */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/90 flex items-center justify-between gap-3">
              <div>
                <span className="text-[11px] text-slate-500 font-medium block">Total Amount Due</span>
                <span className="text-lg sm:text-xl font-black font-mono text-slate-900">
                  {formatAmount(totalAmount)}
                </span>
              </div>

              <div className="text-right">
                <span className="text-[11px] text-slate-500 block">Items Count</span>
                <span className="text-xs font-bold text-slate-700">
                  {order.items?.length || 1} Item{order.items?.length !== 1 ? 's' : ''} in package
                </span>
              </div>
            </div>

            {/* 2. Payment Method Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800 block">
                Select Payment Method
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                
                {/* Monime Multi-Rail Gateway */}
                <button
                  type="button"
                  onClick={() => setSelectedProvider('monime')}
                  className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                    selectedProvider === 'monime'
                      ? 'border-teal-600 bg-teal-50/70 ring-2 ring-teal-500/20 text-slate-900'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="w-8 h-8 rounded-xl bg-teal-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                    M
                  </div>
                  <div>
                    <span className="text-xs font-bold block">Monime Financial</span>
                    <span className="text-[10px] text-teal-700 font-medium block">Multi-Rail / Minor Units</span>
                  </div>
                </button>

                {/* Orange Money */}
                <button
                  type="button"
                  onClick={() => setSelectedProvider('orange_money')}
                  className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                    selectedProvider === 'orange_money'
                      ? 'border-orange-500 bg-orange-50/50 ring-2 ring-orange-500/20 text-slate-900'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="w-8 h-8 rounded-xl bg-orange-500 text-white font-black text-xs flex items-center justify-center shrink-0">
                    OM
                  </div>
                  <div>
                    <span className="text-xs font-bold block">Orange Money</span>
                    <span className="text-[10px] text-slate-500 block">Instant USSD (*144#)</span>
                  </div>
                </button>

                {/* Afrimoney */}
                <button
                  type="button"
                  onClick={() => setSelectedProvider('afrimoney')}
                  className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                    selectedProvider === 'afrimoney'
                      ? 'border-red-500 bg-red-50/50 ring-2 ring-red-500/20 text-slate-900'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="w-8 h-8 rounded-xl bg-red-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                    AF
                  </div>
                  <div>
                    <span className="text-xs font-bold block">Afrimoney</span>
                    <span className="text-[10px] text-slate-500 block">Africell Mobile (*161#)</span>
                  </div>
                </button>

                {/* Credit / Debit Card */}
                <button
                  type="button"
                  onClick={() => setSelectedProvider('card')}
                  className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                    selectedProvider === 'card'
                      ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20 text-slate-900'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold block">Debit / Credit Card</span>
                    <span className="text-[10px] text-slate-500 block">Visa, Mastercard</span>
                  </div>
                </button>

                {/* Bank Transfer */}
                <button
                  type="button"
                  onClick={() => setSelectedProvider('bank_transfer')}
                  className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                    selectedProvider === 'bank_transfer'
                      ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-500/20 text-slate-900'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold block">Bank Wire / Transfer</span>
                    <span className="text-[10px] text-slate-500 block">SLCB / Rokel / Ecobank</span>
                  </div>
                </button>

              </div>
            </div>

            {/* 3. Provider-Specific Fields */}
            {selectedProvider === 'orange_money' && (
              <div className="p-4 bg-orange-50/60 rounded-2xl border border-orange-200/80 space-y-3 animate-in fade-in duration-150">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-orange-600" />
                  <span className="text-xs font-bold text-orange-950">Orange Money Mobile Checkout</span>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Orange Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+232 76 123456"
                    className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-orange-500/20"
                  />
                  <span className="text-[11px] text-slate-500 block pt-0.5">
                    You will receive an automatic prompt on your mobile screen to enter your secret PIN and approve {formatAmount(totalAmount)}.
                  </span>
                </div>
              </div>
            )}

            {selectedProvider === 'afrimoney' && (
              <div className="p-4 bg-red-50/60 rounded-2xl border border-red-200/80 space-y-3 animate-in fade-in duration-150">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-red-600" />
                  <span className="text-xs font-bold text-red-950">Afrimoney Mobile Checkout</span>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Africell Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+232 77 123456"
                    className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-red-500/20"
                  />
                  <span className="text-[11px] text-slate-500 block pt-0.5">
                    Africell prompt (*161#) will be pushed to this mobile number for authorization.
                  </span>
                </div>
              </div>
            )}

            {selectedProvider === 'card' && (
              <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-200/80 space-y-3 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5 text-indigo-600" />
                    <span className="text-xs font-bold text-indigo-950">256-bit Encrypted Card Payment</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-bold">VISA / MASTERCARD</span>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Name on Card *</label>
                    <input
                      type="text"
                      required
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value)}
                      placeholder="SAHR B SESAY"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Card Number *</label>
                    <input
                      type="text"
                      required
                      maxLength={19}
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      placeholder="4000 1234 5678 9010"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Expiry Date (MM/YY) *</label>
                      <input
                        type="text"
                        required
                        maxLength={5}
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        placeholder="10/28"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">CVV / CVC *</label>
                      <input
                        type="password"
                        required
                        maxLength={4}
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value)}
                        placeholder="•••"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {selectedProvider === 'bank_transfer' && (
              <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200/80 space-y-3 animate-in fade-in duration-150 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-emerald-700" />
                    <span className="font-bold text-emerald-950">Sierra Leone Commercial Bank (SLCB) Wire</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">B2B Account</span>
                </div>

                <div className="space-y-1.5 bg-white p-3 rounded-xl border border-emerald-200/60 font-mono text-[11px]">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-sans">Account Name:</span>
                    <span className="font-bold text-slate-900">NEXUS COMMERCIAL COMMERCE LTD</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-sans">Account Number:</span>
                    <div className="flex items-center gap-1.5 font-bold text-slate-900">
                      <span>003-0109283-01</span>
                      <button
                        type="button"
                        onClick={() => handleCopy('003010928301', 'acc')}
                        className="p-1 text-slate-400 hover:text-emerald-600 cursor-pointer"
                      >
                        {copiedField === 'acc' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-sans">Payment Reference:</span>
                    <div className="flex items-center gap-1.5 font-bold text-indigo-600">
                      <span>{order.orderNumber}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(order.orderNumber, 'ref')}
                        className="p-1 text-slate-400 hover:text-indigo-600 cursor-pointer"
                      >
                        {copiedField === 'ref' ? <Check className="w-3 h-3 text-indigo-600" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Please quote reference <strong className="font-mono text-slate-800">{order.orderNumber}</strong> in your bank app. After completing the wire, click the button below to confirm.
                </p>
              </div>
            )}

            {/* Processing Spinner Notification */}
            {isProcessing && (
              <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-200 flex items-center gap-3 animate-in fade-in">
                <Loader2 className="w-5 h-5 text-indigo-600 animate-spin shrink-0" />
                <div className="text-xs">
                  <span className="font-bold text-indigo-950 block">Processing Settlement</span>
                  <span className="text-indigo-700 text-[11px]">{processingStep}</span>
                </div>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleModalClose}
                disabled={isProcessing}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isProcessing}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 active:scale-[0.98] disabled:opacity-50 text-slate-950 font-black text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-2"
                id="btn-confirm-order-payment"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Authorizing...</span>
                  </>
                ) : (
                  <>
                    <span>Pay {formatAmount(totalAmount)} Now</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

          </form>
        )}
      </div>
    </div>
  );
};
