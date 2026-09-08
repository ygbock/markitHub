import React from 'react';
import { CustomerAccountOrder, getStatusBadgeConfig } from './AccountOrderCard';
import { 
  X, FileText, Download, Printer, RotateCcw, Package, 
  MapPin, CreditCard, ShieldCheck, CheckCircle2, ChevronRight,
  ExternalLink, ShoppingBag, AlertCircle
} from 'lucide-react';
import { useCurrency } from '../../../context/CurrencyContext';

interface AccountOrderDetailModalProps {
  order: CustomerAccountOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onTrackOrder?: (order: CustomerAccountOrder) => void;
  onPayOrder?: (order: CustomerAccountOrder) => void;
  onReorder?: (order: CustomerAccountOrder) => void;
}

export const AccountOrderDetailModal: React.FC<AccountOrderDetailModalProps> = ({
  order,
  isOpen,
  onClose,
  onTrackOrder,
  onPayOrder,
  onReorder
}) => {
  const { formatAmount } = useCurrency();

  if (!isOpen || !order) return null;

  const badgeConfig = getStatusBadgeConfig(order.status);
  const StatusIcon = badgeConfig.icon;
  const isPendingPayment = (order.status?.toLowerCase() || '').includes('pending payment') || order.status === 'unpaid';

  const subtotal = order.subtotal || order.total || order.grandTotal || 0;
  const tax = order.tax || 0;
  const shippingCost = order.shippingCost || 0;
  const discount = order.discount || 0;
  const grandTotal = order.grandTotal || order.total || 0;

  return (
    <div 
      className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="bg-white rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto no-scrollbar relative"
        onClick={(e) => e.stopPropagation()}
        id="order-detail-modal"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Order Details</h3>
              <span className="text-xs text-slate-500 font-mono">#{order.orderNumber} • {order.formattedDate || order.date}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Card */}
        <div className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
          isPendingPayment ? 'bg-amber-50/80 border-amber-300' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${badgeConfig.badgeClass}`}>
              <StatusIcon className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Current Status</span>
              <span className="text-sm font-bold text-slate-900">{badgeConfig.label}</span>
            </div>
          </div>

          {isPendingPayment && onPayOrder ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onPayOrder(order);
              }}
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-slate-950 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <CreditCard className="w-3.5 h-3.5 text-slate-950" />
              <span>Pay {formatAmount(grandTotal)}</span>
            </button>
          ) : onTrackOrder ? (
            <button
              type="button"
              onClick={() => onTrackOrder(order)}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
            >
              <span>Track Live</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : null}
        </div>

        {/* Pending Payment Warning if unpaid */}
        {isPendingPayment && (
          <div className="p-3 bg-amber-500/10 border border-amber-300/80 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold block">Payment Awaiting Settlement</span>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Stock is reserved temporarily for this order. Please complete payment using Orange Money, Afrimoney, Card, or Bank Wire to begin packing and delivery.
              </p>
            </div>
          </div>
        )}

        {/* Line Items List */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Ordered Items ({order.items?.length || 0})
          </h4>

          <div className="space-y-2 max-h-56 overflow-y-auto no-scrollbar">
            {order.items && order.items.map((item, idx) => (
              <div key={idx} className="p-3 bg-white rounded-2xl border border-slate-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.productName} className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-xs shrink-0">
                      PKG
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h5 className="font-bold text-xs text-slate-900 truncate">{item.productName}</h5>
                    <div className="text-slate-500 text-[11px] mt-0.5 flex items-center gap-2">
                      <span className="font-mono">{item.quantity} × {formatAmount(item.price)}</span>
                      {item.variantSku && (
                        <>
                          <span>•</span>
                          <span className="font-mono text-slate-400">SKU: {item.variantSku}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="font-mono font-black text-xs text-slate-900">
                    {formatAmount(item.price * item.quantity)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Financial Breakdown */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal</span>
            <span className="font-mono font-medium text-slate-900">{formatAmount(subtotal)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-emerald-600 font-medium">
              <span>Discounts Applied</span>
              <span className="font-mono">- {formatAmount(discount)}</span>
            </div>
          )}
          <div className="flex justify-between text-slate-600">
            <span>Estimated Shipping</span>
            <span className="font-mono font-medium text-slate-900">
              {shippingCost > 0 ? formatAmount(shippingCost) : 'Free Delivery'}
            </span>
          </div>
          {tax > 0 && (
            <div className="flex justify-between text-slate-600">
              <span>Estimated GST / Tax (15%)</span>
              <span className="font-mono font-medium text-slate-900">{formatAmount(tax)}</span>
            </div>
          )}
          <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm">
            <span className="font-bold text-slate-900">Total</span>
            <span className="font-mono font-black text-base text-slate-900">{formatAmount(grandTotal)}</span>
          </div>
        </div>

        {/* Shipping & Payment Meta */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-white rounded-2xl border border-slate-200 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <MapPin className="w-3.5 h-3.5 text-indigo-600" />
              <span>Shipping Address</span>
            </div>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              {order.deliveryAddress || '232 Wilkinson Road, Suite 4B, Freetown, Sierra Leone'}
            </p>
          </div>

          <div className="p-3 bg-white rounded-2xl border border-slate-200 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
              <span>Payment Method</span>
            </div>
            <p className="text-slate-600 text-[11px]">
              {order.paymentMethod || 'Orange Money / Mobile Wallet'} {isPendingPayment ? '(Pending Payment)' : '(Settled)'}
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Invoice</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>PDF</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {isPendingPayment && onPayOrder ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onPayOrder(order);
                }}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-slate-950 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
              >
                <CreditCard className="w-3.5 h-3.5 text-slate-950" />
                <span>Proceed with Payment</span>
              </button>
            ) : onReorder ? (
              <button
                type="button"
                onClick={() => onReorder(order)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Reorder Items</span>
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
