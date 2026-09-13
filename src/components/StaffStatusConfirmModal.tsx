import React, { useState } from 'react';
import { ShieldAlert, ShieldCheck, AlertTriangle, Loader2, X } from 'lucide-react';
import { StaffMember } from '../types';

interface StaffStatusConfirmModalProps {
  isOpen: boolean;
  staff: StaffMember | null;
  action: 'suspend' | 'reactivate';
  onClose: () => void;
  onConfirm: (reason?: string) => Promise<void>;
  isLoading?: boolean;
}

export default function StaffStatusConfirmModal({
  isOpen,
  staff,
  action,
  onClose,
  onConfirm,
  isLoading = false,
}: StaffStatusConfirmModalProps) {
  const [reason, setReason] = useState('');

  if (!isOpen || !staff) return null;

  const isSuspend = action === 'suspend';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onConfirm(reason.trim());
    setReason('');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      id="staff-status-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="staff-status-modal-title"
    >
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
        onClick={!isLoading ? onClose : undefined}
      />

      <div
        className="relative bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md p-6 z-10 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        id="staff-status-modal-container"
      >
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all disabled:opacity-50"
          aria-label="Close dialog"
        >
          <X className="w-4 h-4" />
        </button>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-start gap-4">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${
                isSuspend
                  ? 'bg-rose-100 text-rose-600 shadow-rose-500/20'
                  : 'bg-emerald-100 text-emerald-600 shadow-emerald-500/20'
              }`}
            >
              {isSuspend ? (
                <ShieldAlert className="w-6 h-6" />
              ) : (
                <ShieldCheck className="w-6 h-6" />
              )}
            </div>

            <div className="space-y-1">
              <h2
                id="staff-status-modal-title"
                className="text-base font-bold text-slate-900"
              >
                {isSuspend ? 'Suspend Staff Account' : 'Reactivate Staff Account'}
              </h2>
              <p className="text-xs text-slate-500">
                Authoritative security state transition via <code className="font-mono text-indigo-600">/api/tenant/staff/:id/status</code>
              </p>
            </div>
          </div>

          <div
            className={`p-3.5 rounded-2xl border text-xs leading-relaxed ${
              isSuspend
                ? 'bg-rose-50/70 border-rose-200 text-rose-800'
                : 'bg-emerald-50/70 border-emerald-200 text-emerald-800'
            }`}
          >
            {isSuspend ? (
              <div className="space-y-2">
                <p className="font-semibold">
                  You are about to suspend <span className="font-black text-rose-950">{staff.name}</span> ({staff.role}).
                </p>
                <div className="text-[11px] text-rose-700 flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>
                    Suspended employees immediately lose POS terminal access, backoffice management rights, and will be blocked from API operations.
                  </span>
                </div>
              </div>
            ) : (
              <p>
                You are reactivating access for <span className="font-black text-emerald-950">{staff.name}</span> ({staff.role}). They will immediately regain operational permissions for their assigned role.
              </p>
            )}
          </div>

          {isSuspend && (
            <div className="space-y-1.5">
              <label
                htmlFor="suspension-reason-input"
                className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block"
              >
                Suspension Reason (Optional audit note)
              </label>
              <input
                id="suspension-reason-input"
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., Leave of absence, contract ended, security review"
                disabled={isLoading}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-rose-500 focus:outline-hidden font-medium"
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              id="btn-confirm-status-change"
              className={`px-4 py-2 text-xs font-bold rounded-xl text-white shadow-md transition-all flex items-center gap-2 ${
                isSuspend
                  ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/30'
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30'
              } disabled:opacity-50`}
            >
              {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {isSuspend ? 'Confirm Suspension' : 'Confirm Reactivation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
