import React from 'react';
import { ECommerceOrderStatus } from '../../../types';
import { 
  Clock, CheckCircle2, RefreshCw, Building2, Package, 
  Truck, Navigation, XCircle, RotateCcw, DollarSign, 
  Eye, Navigation2, ChevronRight, CreditCard, AlertCircle
} from 'lucide-react';
import { useCurrency } from '../../../context/CurrencyContext';

export interface OrderItemSummary {
  productId?: string;
  productName: string;
  quantity: number;
  price: number;
  variantSku?: string;
  variantName?: string;
  imageUrl?: string;
}

export interface CustomerAccountOrder {
  id: string;
  orderNumber: string;
  date: string;
  formattedDate?: string;
  status: ECommerceOrderStatus | string;
  items: OrderItemSummary[];
  itemCount?: number;
  total: number;
  grandTotal?: number;
  subtotal?: number;
  tax?: number;
  shippingCost?: number;
  discount?: number;
  trackingNumber?: string;
  carrierName?: string;
  deliveryAddress?: string;
  paymentMethod?: string;
  estimatedDelivery?: string;
  receiptConfirmed?: boolean;
}

interface AccountOrderCardProps {
  order: CustomerAccountOrder;
  onTrackOrder: (order: CustomerAccountOrder) => void;
  onViewDetails: (order: CustomerAccountOrder) => void;
  onPayOrder?: (order: CustomerAccountOrder) => void;
  onConfirmReceipt?: (order: CustomerAccountOrder) => void;
  onWriteReview?: (order: CustomerAccountOrder, item: OrderItemSummary) => void;
  onReturnItem?: (order: CustomerAccountOrder, item: OrderItemSummary) => void;
}

export function getStatusBadgeConfig(status: string) {
  const norm = status?.toLowerCase() || '';
  
  if (norm.includes('pending payment') || norm === 'unpaid') {
    return {
      label: 'Pending Payment',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
      icon: Clock,
      dotClass: 'bg-amber-500'
    };
  }
  if (norm === 'paid') {
    return {
      label: 'Paid',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: CheckCircle2,
      dotClass: 'bg-emerald-500'
    };
  }
  if (norm.includes('processing')) {
    return {
      label: 'Processing',
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
      icon: RefreshCw,
      dotClass: 'bg-blue-500'
    };
  }
  if (norm.includes('ready for pickup')) {
    return {
      label: 'Ready for Pickup',
      badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
      icon: Building2,
      dotClass: 'bg-purple-500'
    };
  }
  if (norm.includes('packed')) {
    return {
      label: 'Packed',
      badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      icon: Package,
      dotClass: 'bg-indigo-500'
    };
  }
  if (norm.includes('dispatched') || norm === 'shipped') {
    return {
      label: 'Dispatched',
      badgeClass: 'bg-cyan-50 text-cyan-700 border-cyan-200',
      icon: Truck,
      dotClass: 'bg-cyan-500'
    };
  }
  if (norm.includes('out for delivery')) {
    return {
      label: 'Out for Delivery',
      badgeClass: 'bg-amber-500 text-white border-amber-600 shadow-xs',
      icon: Navigation,
      dotClass: 'bg-white'
    };
  }
  if (norm.includes('delivered') || norm === 'completed') {
    return {
      label: 'Delivered',
      badgeClass: 'bg-emerald-600 text-white border-emerald-700 shadow-xs',
      icon: CheckCircle2,
      dotClass: 'bg-white'
    };
  }
  if (norm.includes('cancelled') || norm === 'rejected') {
    return {
      label: 'Cancelled',
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
      icon: XCircle,
      dotClass: 'bg-rose-500'
    };
  }
  if (norm.includes('returned')) {
    return {
      label: 'Returned',
      badgeClass: 'bg-violet-50 text-violet-700 border-violet-200',
      icon: RotateCcw,
      dotClass: 'bg-violet-500'
    };
  }
  if (norm.includes('refunded')) {
    return {
      label: 'Refunded',
      badgeClass: 'bg-slate-100 text-slate-700 border-slate-300',
      icon: DollarSign,
      dotClass: 'bg-slate-500'
    };
  }

  // fallback
  return {
    label: status || 'Processing',
    badgeClass: 'bg-slate-50 text-slate-700 border-slate-200',
    icon: Package,
    dotClass: 'bg-slate-400'
  };
}

export const AccountOrderCard: React.FC<AccountOrderCardProps> = ({
  order,
  onTrackOrder,
  onViewDetails,
  onPayOrder,
  onConfirmReceipt,
  onWriteReview,
  onReturnItem
}) => {
  const { formatAmount } = useCurrency();
  const badgeConfig = getStatusBadgeConfig(order.status);
  const StatusIcon = badgeConfig.icon;

  const isPendingPayment = (order.status?.toLowerCase() || '').includes('pending payment') || order.status === 'unpaid';
  const totalItemCount = order.items?.reduce((acc, it) => acc + (it.quantity || 1), 0) || order.itemCount || 1;
  const orderAmount = order.grandTotal || order.total || 0;

  return (
    <div 
      className={`bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border transition-all flex flex-col justify-between gap-3.5 ${
        isPendingPayment 
          ? 'border-amber-300 ring-2 ring-amber-500/10 shadow-xs' 
          : 'border-slate-200/90 shadow-2xs hover:shadow-xs'
      }`}
      id={`order-card-${order.orderNumber.replace(/[^a-zA-Z0-9_-]/g, '')}`}
    >
      {/* 1. Header: Order #ORD-10234 & Date */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="min-w-0">
          <span className="font-mono font-black text-sm sm:text-base text-slate-900 tracking-tight block">
            Order #{order.orderNumber}
          </span>
          <span className="text-xs text-slate-500 mt-0.5 block">
            {order.formattedDate || order.date}
          </span>
        </div>

        {/* Status Badge: Out for Delivery, Delivered, Pending Payment, etc. */}
        <div className="shrink-0">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-colors ${badgeConfig.badgeClass}`}>
            <StatusIcon className="w-3.5 h-3.5 shrink-0" />
            <span>Status: {badgeConfig.label}</span>
          </span>
        </div>
      </div>

      {/* Pending Payment Notice Callout if Unpaid */}
      {isPendingPayment && (
        <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-2.5 flex items-center justify-between gap-2 text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="font-medium text-[11px] sm:text-xs">
              Awaiting payment authorization to begin fulfillment.
            </span>
          </div>
          {onPayOrder && (
            <button
              type="button"
              onClick={() => onPayOrder(order)}
              className="text-amber-800 font-black text-[11px] underline underline-offset-2 hover:text-amber-950 shrink-0 cursor-pointer"
            >
              Pay Now →
            </button>
          )}
        </div>
      )}

      {/* 2. Items Preview & Summary */}
      <div className="space-y-2">
        {order.items && order.items.length > 0 ? (
          <div className="space-y-1.5">
            {order.items.slice(0, 2).map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs bg-slate-50/80 p-2 rounded-xl border border-slate-100">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.productName} className="w-8 h-8 rounded-lg object-cover border border-slate-200 shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center text-slate-400 font-bold text-[10px] shrink-0">
                      PKG
                    </div>
                  )}
                  <div className="truncate">
                    <span className="font-bold text-slate-800 truncate block">
                      {item.quantity}x {item.productName}
                    </span>
                    {item.variantSku && (
                      <span className="text-[10px] font-mono text-slate-400">SKU: {item.variantSku}</span>
                    )}
                  </div>
                </div>
                <span className="font-mono font-bold text-slate-700 shrink-0 ml-2">
                  {formatAmount(item.price * item.quantity)}
                </span>
              </div>
            ))}
            {order.items.length > 2 && (
              <div className="text-[11px] text-slate-500 font-medium pl-1">
                + {order.items.length - 2} more item{order.items.length - 2 > 1 ? 's' : ''} in this package
              </div>
            )}
          </div>
        ) : null}

        {/* 3. Items Count & Total Line */}
        <div className="flex items-center justify-between pt-1">
          <div className="text-xs text-slate-600 font-medium">
            <span className="font-bold text-slate-900 font-mono">{totalItemCount}</span> Item{totalItemCount !== 1 ? 's' : ''}
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-500 mr-1.5">Total:</span>
            <span className="text-sm sm:text-base font-black font-mono text-slate-900">
              {formatAmount(orderAmount)}
            </span>
          </div>
        </div>
      </div>

      {/* 4. Action Buttons: [Proceed with Payment] OR [Track Order] + [View Details] */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
        {isPendingPayment && onPayOrder ? (
          <button
            type="button"
            onClick={() => onPayOrder(order)}
            className="flex-1 py-2.5 px-3.5 bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-slate-950 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            id={`btn-pay-${order.orderNumber}`}
          >
            <CreditCard className="w-3.5 h-3.5 text-slate-950" />
            <span>Proceed with Payment</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onTrackOrder(order)}
            className="flex-1 py-2.5 px-3.5 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
            id={`btn-track-${order.orderNumber}`}
          >
            <Navigation2 className="w-3.5 h-3.5 text-indigo-200" />
            <span>Track Order</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => onViewDetails(order)}
          className="flex-1 py-2.5 px-3.5 bg-slate-100 hover:bg-slate-200 active:scale-[0.98] text-slate-800 border border-slate-200/80 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          id={`btn-details-${order.orderNumber}`}
        >
          <Eye className="w-3.5 h-3.5 text-slate-500" />
          <span>View Details</span>
        </button>
      </div>
    </div>
  );
};

