import React from 'react';
import { AdminNotification } from '../types';
import { 
  Bell, AlertTriangle, CheckCircle2, Clock, 
  X, ArrowRight, RotateCcw, Package, Sparkles, CheckCheck
} from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';

interface AdminNotificationCenterProps {
  notifications: AdminNotification[];
  isOpen: boolean;
  onClose: () => void;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onActionClick: (notif: AdminNotification) => void;
}

export default function AdminNotificationCenter({
  notifications,
  isOpen,
  onClose,
  onMarkAsRead,
  onMarkAllAsRead,
  onActionClick
}: AdminNotificationCenterProps) {
  const { formatAmount } = useCurrency();

  if (!isOpen) return null;

  const unreadCount = notifications.filter(n => !n.read).length;
  const refundRequestsCount = notifications.filter(n => n.type === 'refund_request' && !n.read).length;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-250"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-8 h-8 rounded-xl bg-indigo-600/40 border border-indigo-400/40 flex items-center justify-center text-indigo-300">
                <Bell className="w-4 h-4" />
              </div>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center animate-pulse">
                  {unreadCount}
                </span>
              )}
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                Admin Notification Center
                {refundRequestsCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/30 text-rose-300 border border-rose-500/40">
                    {refundRequestsCount} RMA Urgent
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-slate-400">Real-time alerts for customer returns, disputes & deliveries</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={onMarkAllAsRead}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 text-[11px] font-medium flex items-center gap-1 cursor-pointer transition-colors"
                title="Mark all as read"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Read all</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer transition-colors"
              aria-label="Close notification center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Action Required Banner if active refund request */}
        {refundRequestsCount > 0 && (
          <div className="p-3 bg-rose-50 border-b border-rose-200 flex items-center gap-2 text-rose-900 text-xs font-semibold">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 animate-bounce" />
            <span>
              <strong>{refundRequestsCount} Customer Refund Request(s)</strong> awaiting management decision.
            </span>
          </div>
        )}

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {notifications.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Bell className="w-6 h-6" />
              </div>
              <div className="text-xs font-semibold text-slate-600">No active notifications</div>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                Customer refund requests, RMA filings, and 48-hour delivery status updates will appear here in real-time.
              </p>
            </div>
          ) : (
            notifications.map((notif) => {
              const isRma = notif.type === 'refund_request';
              const isDelivered = notif.type === 'order_delivered';
              const isReceiptConfirmed = notif.type === 'receipt_confirmed';

              return (
                <div
                  key={notif.id}
                  onClick={() => {
                    if (!notif.read) onMarkAsRead(notif.id);
                    onActionClick(notif);
                  }}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden text-xs space-y-2 ${
                    isRma 
                      ? notif.read 
                        ? 'bg-white border-slate-200 hover:border-rose-300' 
                        : 'bg-rose-50/60 border-rose-300 shadow-sm hover:bg-rose-50'
                      : notif.read 
                        ? 'bg-white border-slate-200 hover:border-indigo-200' 
                        : 'bg-indigo-50/50 border-indigo-200 shadow-sm hover:bg-indigo-50'
                  }`}
                >
                  {/* Unread indicator bar */}
                  {!notif.read && (
                    <span className={`absolute left-0 top-0 bottom-0 w-1.5 ${isRma ? 'bg-rose-500' : 'bg-indigo-600'}`} />
                  )}

                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                        isRma 
                          ? 'bg-rose-100 text-rose-700' 
                          : isDelivered 
                            ? 'bg-amber-100 text-amber-700' 
                            : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {isRma ? <RotateCcw className="w-3.5 h-3.5" /> : isDelivered ? <Package className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      </div>
                      <span className="font-bold text-slate-900 leading-tight">{notif.title}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 text-[10px] text-slate-400 font-mono">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>

                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    {notif.message}
                  </p>

                  {/* RMA Dispute Details Box if applicable */}
                  {isRma && notif.reason && (
                    <div className="p-2.5 bg-white/80 rounded-xl border border-rose-200 text-[11px] space-y-1">
                      <div className="flex justify-between text-slate-700">
                        <span className="text-slate-500 font-medium">Reason:</span>
                        <strong className="text-rose-700">{notif.reason}</strong>
                      </div>
                      {notif.resolution && (
                        <div className="flex justify-between text-slate-700">
                          <span className="text-slate-500 font-medium">Desired:</span>
                          <strong className="text-indigo-700">{notif.resolution}</strong>
                        </div>
                      )}
                      {notif.amount && (
                        <div className="flex justify-between text-slate-700 font-mono">
                          <span className="text-slate-500 font-medium font-sans">Dispute Amount:</span>
                          <strong className="text-slate-900">{formatAmount(notif.amount)}</strong>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action Footer */}
                  <div className="flex items-center justify-between pt-1 text-[11px]">
                    <span className="font-mono text-slate-400">
                      {notif.orderNumber || notif.orderId}
                    </span>
                    <span className={`font-bold flex items-center gap-1 ${isRma ? 'text-rose-600' : 'text-indigo-600'}`}>
                      {isRma ? 'Review & Settle' : 'Inspect Order'} <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 text-center">
          <p className="text-[11px] text-slate-500">
            Orders delivered are automatically monitored under the <strong>48-hour customer receipt confirmation protocol</strong>.
          </p>
        </div>
      </div>
    </div>
  );
}
