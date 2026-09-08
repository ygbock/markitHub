import React from 'react';
import { CustomerAccountOrder, getStatusBadgeConfig } from './AccountOrderCard';
import { 
  X, Truck, Navigation2, CheckCircle2, Clock, MapPin, 
  Phone, ShieldCheck, Copy, Check, ExternalLink, Package,
  AlertCircle, ChevronRight
} from 'lucide-react';
import { useCurrency } from '../../../context/CurrencyContext';

interface AccountOrderTrackingModalProps {
  order: CustomerAccountOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmReceipt?: (orderId: string) => void;
}

export const AccountOrderTrackingModal: React.FC<AccountOrderTrackingModalProps> = ({
  order,
  isOpen,
  onClose,
  onConfirmReceipt
}) => {
  const { formatAmount } = useCurrency();
  const [copied, setCopied] = React.useState(false);

  if (!isOpen || !order) return null;

  const trackingCode = order.trackingNumber || `TRK-SL-${order.orderNumber.replace(/[^0-9]/g, '') || '98231'}`;
  const carrierName = order.carrierName || 'Sierra Express Courier Services (Freetown Hub)';
  const badgeConfig = getStatusBadgeConfig(order.status);
  const StatusIcon = badgeConfig.icon;

  const handleCopyTracking = () => {
    navigator.clipboard.writeText(trackingCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 6 Milestones
  const steps = [
    { title: 'Order Placed', desc: 'Order received and verified', done: true, time: `${order.date} 09:14 AM` },
    { title: 'Payment Confirmed', desc: 'Settlement cleared via secure gateway', done: order.status !== 'Pending Payment', time: `${order.date} 09:15 AM` },
    { title: 'Processing & Packed', desc: 'Items picked & quality inspected at Waterloo Depot', done: !['Pending Payment', 'Paid'].includes(order.status), time: `${order.date} 11:30 AM` },
    { title: 'Dispatched from Hub', desc: 'Handed over to local delivery partner', done: !['Pending Payment', 'Paid', 'Processing', 'Packed', 'Ready for Pickup'].includes(order.status), time: `${order.date} 02:45 PM` },
    { title: 'Out for Delivery', desc: 'Courier is en route to your shipping address', done: ['Out for Delivery', 'Delivered'].includes(order.status), current: order.status === 'Out for Delivery', time: 'Today 08:30 AM' },
    { title: 'Delivered', desc: 'Package handed over and signed for', done: order.status === 'Delivered', time: order.status === 'Delivered' ? 'Today 11:15 AM' : 'Estimated Today' }
  ];

  return (
    <div 
      className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto no-scrollbar relative"
        onClick={(e) => e.stopPropagation()}
        id="order-tracking-modal"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Track Order #{order.orderNumber}</h3>
              <span className="text-xs text-slate-500 font-medium">Live Delivery Status & Milestones</span>
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

        {/* Live Status Hero Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-4 shadow-md space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider">Current Status</span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${badgeConfig.badgeClass}`}>
              {badgeConfig.label}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-amber-400 shrink-0">
              <StatusIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">
                {order.status === 'Out for Delivery' 
                  ? 'Your package is on the way!' 
                  : order.status === 'Delivered' 
                  ? 'Delivered to your destination.' 
                  : `Order is currently in ${badgeConfig.label}`}
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Estimated Delivery: <strong className="text-amber-300">{order.estimatedDelivery || 'Today by 5:00 PM'}</strong>
              </p>
            </div>
          </div>

          {/* Tracking Number Bar */}
          <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 font-mono text-slate-300">
              <span>AWB:</span>
              <strong className="text-white select-all">{trackingCode}</strong>
            </div>
            <button
              type="button"
              onClick={handleCopyTracking}
              className="px-2.5 py-1 bg-white/15 hover:bg-white/25 text-white rounded-lg font-bold flex items-center gap-1 transition-colors cursor-pointer text-[11px]"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Carrier and Courier Dispatch Details */}
        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2">
          <div className="flex items-center justify-between font-bold text-slate-800">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>Carrier & Dispatch Rider</span>
            </span>
            <span className="text-[11px] font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              Verified Dispatch
            </span>
          </div>
          <div className="text-slate-600 space-y-1">
            <p><strong>Carrier:</strong> {carrierName}</p>
            <p><strong>Courier:</strong> Mohamed Kargbo (Rider ID: #232-RD91)</p>
            <p className="flex items-center gap-1 text-slate-700">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              <span>Contact Courier: +232 76 892014</span>
            </p>
          </div>
        </div>

        {/* Delivery Address Pin */}
        <div className="p-3.5 bg-white rounded-2xl border border-slate-200 text-xs flex items-start gap-2.5">
          <MapPin className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <div className="font-bold text-slate-900">Destination Address</div>
            <div className="text-slate-600 text-[11px] mt-0.5">
              {order.deliveryAddress || '232 Wilkinson Road, Suite 4B, Freetown, Sierra Leone'}
            </div>
          </div>
        </div>

        {/* Timeline of Milestones */}
        <div className="space-y-3 pt-2">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Tracking Milestones
          </h4>

          <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {steps.map((step, idx) => (
              <div key={idx} className="relative text-xs">
                {/* Milestone Node */}
                <div 
                  className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center border-2 ${
                    step.done
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : step.current
                      ? 'bg-amber-500 border-amber-500 text-white ring-4 ring-amber-100 animate-pulse'
                      : 'bg-white border-slate-300 text-slate-300'
                  }`}
                >
                  {step.done ? <CheckCircle2 className="w-3.5 h-3.5" /> : <div className="w-1.5 h-1.5 rounded-full bg-current" />}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`font-bold ${step.done || step.current ? 'text-slate-900' : 'text-slate-400'}`}>
                      {step.title}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">{step.time}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            Close Tracking
          </button>
        </div>
      </div>
    </div>
  );
};
