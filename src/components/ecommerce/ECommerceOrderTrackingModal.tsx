import React, { useState, useEffect, useMemo } from 'react';
import { Order, Customer } from '../../types';
import { 
  X, Search, Truck, Navigation2, CheckCircle2, Clock, MapPin, 
  Phone, ShieldCheck, Copy, Check, ExternalLink, Package,
  AlertCircle, ChevronRight, ArrowRight, Printer, Sparkles,
  ShoppingBag, RefreshCw, HelpCircle, User, Calendar
} from 'lucide-react';
import { useCurrency } from '../../context/CurrencyContext';
import { getOrderDeliveryTelemetry } from '../../utils/orderManagementUtils';
import OrderLifecycle30StagesModal from './OrderLifecycle30StagesModal';
import { Layers } from 'lucide-react';

interface ECommerceOrderTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  activeCustomer?: Customer | null;
  initialOrderId?: string;
  onConfirmReceipt?: (orderId: string) => void;
  onOpenReceiptPrint?: (order: Order) => void;
}

export const ECommerceOrderTrackingModal: React.FC<ECommerceOrderTrackingModalProps> = ({
  isOpen,
  onClose,
  orders,
  activeCustomer,
  initialOrderId,
  onConfirmReceipt,
  onOpenReceiptPrint
}) => {
  const { formatAmount } = useCurrency();
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [receiptConfirmed, setReceiptConfirmed] = useState(false);
  const [is30StagesOpen, setIs30StagesOpen] = useState(false);

  // Sync initial search query when modal opens or initialOrderId changes
  useEffect(() => {
    if (initialOrderId) {
      setSearchQuery(initialOrderId);
    } else if (activeCustomer) {
      const custOrders = orders.filter(o => 
        o.customerId === activeCustomer.id || 
        (o.customerName && activeCustomer.name && o.customerName.toLowerCase() === activeCustomer.name.toLowerCase())
      );
      if (custOrders.length > 0) {
        // Default to the most recent order
        setSearchQuery(custOrders[0].id);
      }
    }
  }, [isOpen, initialOrderId, activeCustomer, orders]);

  // Find matching order based on ID, order number, tracking code, or email
  const matchedOrder = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      // If user has orders and no search query entered, pick first order
      if (activeCustomer) {
        const custOrders = orders.filter(o => 
          o.customerId === activeCustomer.id || 
          (o.customerName && activeCustomer.name && o.customerName.toLowerCase() === activeCustomer.name.toLowerCase())
        );
        return custOrders[0] || orders[0] || null;
      }
      return orders[0] || null;
    }

    const cleanQ = String(q || '').replace(/^#/, '');

    const found = orders.find(o => 
      String(o.id || '').toLowerCase() === cleanQ ||
      String(o.id || '').toLowerCase().includes(cleanQ) ||
      (o.trackingNumber && String(o.trackingNumber).toLowerCase().includes(cleanQ)) ||
      (o.customerEmail && String(o.customerEmail).toLowerCase() === q)
    );

    return found || null;
  }, [searchQuery, orders, activeCustomer]);

  // Customer's available recent orders for quick pills
  const recentOrdersList = useMemo(() => {
    if (activeCustomer) {
      return orders.filter(o => 
        o.customerId === activeCustomer.id || 
        (o.customerName && activeCustomer.name && o.customerName.toLowerCase() === activeCustomer.name.toLowerCase())
      ).slice(0, 5);
    }
    return orders.slice(0, 4);
  }, [orders, activeCustomer]);

  if (!isOpen) return null;

  const currentOrder = matchedOrder;

  // Resolve telemetry
  const telemetry = currentOrder ? getOrderDeliveryTelemetry(currentOrder) : null;
  const status = telemetry?.effectiveStatus || currentOrder?.deliveryStatus || currentOrder?.status || 'Processing';
  const trackingNumber = currentOrder?.trackingNumber || (currentOrder ? `TRK-SL-${String(currentOrder.id || '').replace(/[^0-9]/g, '') || '98231'}` : '');
  const carrierName = currentOrder?.carrierName || 'Sierra Express Courier Services (Freetown Hub)';
  const etaText = currentOrder?.estimatedDelivery || 'Today by 5:00 PM';

  const handleCopy = () => {
    if (!trackingNumber) return;
    navigator.clipboard.writeText(trackingNumber);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchError('Please enter a valid Order ID or Tracking Number.');
      return;
    }
    if (!matchedOrder) {
      setSearchError(`No order found matching "${searchQuery}". Please check your order confirmation email.`);
    } else {
      setSearchError(null);
    }
  };

  const handleConfirmDelivery = () => {
    if (currentOrder && onConfirmReceipt) {
      onConfirmReceipt(currentOrder.id);
      setReceiptConfirmed(true);
      setTimeout(() => setReceiptConfirmed(false), 3500);
    }
  };

  // Status mapping
  const isPaid = status !== 'Pending Payment';
  const isPacked = ['Processing', 'Packed', 'Dispatched', 'Out for Delivery', 'Delivered', 'Completed'].includes(status);
  const isDispatched = ['Dispatched', 'Out for Delivery', 'Delivered', 'Completed'].includes(status);
  const isOutForDelivery = ['Out for Delivery', 'Delivered', 'Completed'].includes(status);
  const isDelivered = ['Delivered', 'Completed'].includes(status);

  // 6 Milestones Stepper
  const milestones = [
    { 
      id: 1,
      title: 'Order Placed & Authorized', 
      desc: 'Order confirmed and recorded in catalog system', 
      time: currentOrder ? `${new Date(currentOrder.date).toLocaleDateString()} 09:15 AM` : '',
      isDone: true,
      isCurrent: status === 'Pending Payment'
    },
    { 
      id: 2,
      title: 'Payment Cleared', 
      desc: currentOrder ? `Settled via ${currentOrder.paymentMethod}` : 'Payment authorized', 
      time: currentOrder ? `${new Date(currentOrder.date).toLocaleDateString()} 09:16 AM` : '',
      isDone: isPaid,
      isCurrent: status === 'Paid'
    },
    { 
      id: 3,
      title: 'Picking & Packed', 
      desc: 'Items picked and verified at Waterloo Fulfillment Center', 
      time: currentOrder ? `${new Date(currentOrder.date).toLocaleDateString()} 11:30 AM` : '',
      isDone: isPacked,
      isCurrent: status === 'Processing' || status === 'Packed'
    },
    { 
      id: 4,
      title: 'Dispatched from Hub', 
      desc: `Handed over to ${carrierName}`, 
      time: currentOrder ? `${new Date(currentOrder.date).toLocaleDateString()} 02:45 PM` : '',
      isDone: isDispatched,
      isCurrent: status === 'Dispatched'
    },
    { 
      id: 5,
      title: 'Out for Delivery', 
      desc: 'Courier Alpha is en-route with your shipment', 
      time: 'Today 08:30 AM',
      isDone: isOutForDelivery,
      isCurrent: status === 'Out for Delivery'
    },
    { 
      id: 6,
      title: 'Delivered & Confirmed', 
      desc: 'Package handed over and customer signature verified', 
      time: isDelivered ? 'Today 11:20 AM' : `ETA: ${etaText}`,
      isDone: isDelivered,
      isCurrent: isDelivered
    }
  ];

  // Calculate progress percentage
  const completedStepsCount = milestones.filter(m => m.isDone).length;
  const progressPercent = Math.round((completedStepsCount / milestones.length) * 100);

  return (
    <div 
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      id="ecom-order-tracking-modal"
    >
      <div 
        className="bg-white rounded-3xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[92vh] overflow-y-auto no-scrollbar relative animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>Real-Time Order Tracking</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-700 uppercase tracking-wide">
                  Live Dispatch
                </span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Track fulfillment milestones, delivery ETA, courier telemetry, and order details.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            id="btn-close-order-tracking"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Lookup Bar */}
        <div className="bg-slate-50 p-3.5 sm:p-4 rounded-2xl border border-slate-200 space-y-2.5">
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchError(null);
                }}
                placeholder="Enter Order ID (e.g. ORD-101, #ORD-98231) or Tracking #..."
                className="w-full pl-9.5 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-mono placeholder:font-sans focus:outline-hidden focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 shadow-2xs"
                id="input-tracking-order-id"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSearchError(null);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              type="submit"
              className="px-4 sm:px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
              id="btn-submit-order-tracking"
            >
              <Search className="w-4 h-4" />
              <span>Track</span>
            </button>
          </form>

          {/* Quick select pills */}
          {recentOrdersList.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap pt-1 text-xs">
              <span className="text-[11px] font-bold text-slate-400">Quick Select:</span>
              {recentOrdersList.map(ord => (
                <button
                  key={ord.id}
                  type="button"
                  onClick={() => {
                    setSearchQuery(ord.id);
                    setSearchError(null);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer ${
                    currentOrder?.id === ord.id
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  #{ord.id}
                </button>
              ))}
            </div>
          )}

          {searchError && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{searchError}</span>
            </div>
          )}
        </div>

        {/* Order Content */}
        {currentOrder ? (
          <div className="space-y-4">
            
            {/* Status Hero Card */}
            <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-4 sm:p-5 shadow-lg space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm sm:text-base font-bold text-white tracking-wide">
                    Order #{currentOrder.id}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-400 text-slate-950">
                    {status}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Placed: {new Date(currentOrder.date).toLocaleDateString()}</span>
                </div>
              </div>

              {/* ETA and Progress */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider block">
                    Estimated Delivery Arrival
                  </span>
                  <div className="text-lg sm:text-xl font-black text-amber-300 font-sans flex items-center gap-2">
                    <Clock className="w-5 h-5 text-amber-400 shrink-0" />
                    <span>{etaText}</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Carrier: <strong className="text-white">{carrierName}</strong>
                  </p>
                </div>

                {/* Progress Bar Gauge */}
                <div className="bg-white/10 p-3 rounded-2xl border border-white/10 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-300">Fulfillment Progress</span>
                    <span className="text-amber-300 font-mono">{progressPercent}%</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-amber-400 to-emerald-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Ordered</span>
                    <span>Dispatched</span>
                    <span>Delivered</span>
                  </div>
                </div>
              </div>

              {/* AWB Code Bar */}
              <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 font-mono text-slate-300">
                  <Navigation2 className="w-4 h-4 text-indigo-400" />
                  <span>Tracking AWB:</span>
                  <strong className="text-white select-all bg-white/10 px-2 py-0.5 rounded font-mono">
                    {trackingNumber}
                  </strong>
                </div>

                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-3 py-1 bg-white/15 hover:bg-white/25 text-white rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer text-xs"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
                </button>
              </div>
            </div>

            {/* Stepper Milestones Timeline */}
            <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-3">
              <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-600" />
                <span>Fulfillment Milestones Timeline</span>
              </h3>

              <div className="space-y-4 pt-1 relative before:absolute before:left-3 sm:before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
                {milestones.map((m) => {
                  return (
                    <div key={m.id} className="relative flex items-start gap-3.5 pl-0.5 group">
                      {/* Checkpoint Dot */}
                      <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 z-10 transition-all ${
                        m.isDone 
                          ? 'bg-emerald-500 text-white shadow-xs ring-4 ring-emerald-50' 
                          : m.isCurrent 
                            ? 'bg-indigo-600 text-white animate-pulse ring-4 ring-indigo-100' 
                            : 'bg-slate-200 text-slate-500'
                      }`}>
                        {m.isDone ? <Check className="w-3.5 h-3.5" /> : m.id}
                      </div>

                      {/* Details */}
                      <div className="flex-1 bg-slate-50 hover:bg-slate-100/80 p-3 rounded-2xl border border-slate-100 transition-colors">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <h4 className={`text-xs sm:text-sm font-bold ${m.isDone ? 'text-slate-900' : 'text-slate-600'}`}>
                            {m.title}
                          </h4>
                          {m.time && (
                            <span className="text-[11px] font-mono text-slate-400 font-medium shrink-0">
                              {m.time}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {m.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Delivery Destination & Courier Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-indigo-600" /> Shipping Destination
                </span>
                <p className="font-bold text-slate-900 text-xs">
                  {currentOrder.customerName || 'Direct Customer'}
                </p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {currentOrder.shippingAddress?.address || 'Waterloo Highway / Wilkinson Road'}
                  <br />
                  {[currentOrder.shippingAddress?.city, currentOrder.shippingAddress?.state, currentOrder.shippingAddress?.postalCode || 'Western Area, Sierra Leone'].filter(Boolean).join(', ')}
                </p>
                {currentOrder.customerPhone && (
                  <p className="text-xs text-indigo-600 font-medium pt-1 flex items-center gap-1">
                    <Phone className="w-3 h-3" /> {currentOrder.customerPhone}
                  </p>
                )}
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Dispatch & Security
                </span>
                <p className="text-xs text-slate-700">
                  Assigned Driver: <strong>Courier Alpha-4 (Freetown Express)</strong>
                </p>
                <p className="text-xs text-slate-700">
                  Payment Method: <strong>{currentOrder.paymentMethod}</strong>
                </p>
                <p className="text-xs text-slate-700">
                  Total Paid: <strong className="font-mono text-slate-900">{formatAmount(currentOrder.total)}</strong>
                </p>
                <div className="pt-1 flex items-center gap-1.5 text-[11px] text-emerald-700 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> 100% Insured & Contactless Delivery
                </div>
              </div>
            </div>

            {/* Itemized Products in this Order */}
            <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-3">
              <h3 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Package className="w-4 h-4 text-indigo-600" />
                <span>Package Items ({currentOrder.items.reduce((s, i) => s + i.quantity, 0)})</span>
              </h3>

              <div className="divide-y divide-slate-100">
                {currentOrder.items.map((item, idx) => (
                  <div key={`${item.productId}-${idx}`} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 font-bold flex items-center justify-center shrink-0 text-xs border border-slate-200">
                        {item.quantity}x
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 truncate">{item.productName}</p>
                        {item.variantSku && (
                          <span className="text-[10px] font-mono text-slate-400">SKU: {item.variantSku}</span>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-mono font-bold text-slate-900">{formatAmount(item.price * item.quantity)}</span>
                      <div className="text-[10px] text-slate-400 font-mono">@{formatAmount(item.price)} ea</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Subtotal & Total summary */}
              <div className="pt-3 border-t border-slate-100 flex flex-wrap justify-between items-center text-xs">
                <div className="text-slate-500">
                  Subtotal: <span className="font-mono font-bold text-slate-700">{formatAmount(currentOrder.subtotal)}</span> | Tax: <span className="font-mono font-bold text-slate-700">{formatAmount(currentOrder.tax)}</span>
                </div>
                <div className="text-sm font-black text-slate-900">
                  Total: <span className="font-mono text-indigo-600">{formatAmount(currentOrder.total)}</span>
                </div>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setIs30StagesOpen(true)}
                  className="px-3.5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-indigo-200"
                  id="btn-open-30-stages-tracking"
                >
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <span>30-Stage Lifecycle (Domain View)</span>
                </button>

                {onOpenReceiptPrint && (
                  <button
                    type="button"
                    onClick={() => onOpenReceiptPrint(currentOrder)}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    id="btn-print-order-tracking-receipt"
                  >
                    <Printer className="w-4 h-4 text-slate-600" />
                    <span>Print Order Receipt</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 ml-auto">
                {!isDelivered && (
                  <button
                    type="button"
                    onClick={handleConfirmDelivery}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                    id="btn-confirm-delivery-receipt"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm Receipt</span>
                  </button>
                )}
                {receiptConfirmed && (
                  <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 animate-in fade-in">
                    <Check className="w-4 h-4" /> Receipt Confirmed!
                  </span>
                )}
              </div>
            </div>

          </div>
        ) : (
          /* Empty / No Order Found State */
          <div className="bg-slate-50 rounded-3xl p-8 sm:p-12 text-center border border-dashed border-slate-200 space-y-3">
            <div className="w-14 h-14 rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
              <Search className="w-7 h-7" />
            </div>
            <div className="max-w-sm mx-auto">
              <h3 className="text-base font-bold text-slate-900">Enter your Order ID</h3>
              <p className="text-xs text-slate-500 mt-1">
                Please enter your order reference ID (e.g. <strong>ORD-101</strong>) or tracking code above to view real-time fulfillment and driver milestones.
              </p>
            </div>
          </div>
        )}

      </div>

      {/* 30-Stage Lifecycle Deep Dive Modal */}
      {currentOrder && (
        <OrderLifecycle30StagesModal
          isOpen={is30StagesOpen}
          onClose={() => setIs30StagesOpen(false)}
          order={currentOrder}
        />
      )}
    </div>
  );
};
