import React, { useEffect, useRef } from 'react';
import { 
  X, Shield, ShieldAlert, CheckCircle2, AlertTriangle, 
  Clock, User, Tag, Layers, FileText, ArrowRight, 
  Lock, Copy, Check, Server
} from 'lucide-react';
import type { AuditLog } from '../../types';

interface AuditEventDetailsDrawerProps {
  isOpen: boolean;
  event: AuditLog | null;
  onClose: () => void;
}

export default function AuditEventDetailsDrawer({
  isOpen,
  event,
  onClose
}: AuditEventDetailsDrawerProps) {
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Focus trap, Escape listener, and body scroll lock
  useEffect(() => {
    if (!isOpen) return;

    // Lock background scrolling
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus close button on open
    const timer = setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab' && drawerRef.current) {
        const focusableElements = drawerRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !event) return null;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const severity = event.severity || 'info';
  const result = event.result || 'success';

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden"
      id="audit-event-details-drawer-root"
      role="dialog"
      aria-modal="true"
      aria-labelledby="audit-drawer-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
        <div 
          ref={drawerRef}
          className="w-screen max-w-2xl bg-white shadow-2xl border-l border-slate-200 flex flex-col justify-between animate-in slide-in-from-right duration-200"
        >
          {/* Header */}
          <div className="p-5 border-b border-slate-200 bg-slate-900 text-white flex items-start justify-between gap-4 shrink-0">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-mono text-indigo-300 font-bold uppercase tracking-wider flex items-center gap-1">
                  <Server className="w-3.5 h-3.5" /> Immutable Telemetry Record
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                  severity === 'critical'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                    : severity === 'warning'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                }`}>
                  {severity}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase flex items-center gap-1 border ${
                  result === 'success'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : result === 'denied'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                }`}>
                  {result === 'success' ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                  {result}
                </span>
              </div>

              <h2 id="audit-drawer-title" className="text-base sm:text-lg font-black tracking-tight text-white truncate">
                {event.action}
              </h2>

              <div className="flex items-center gap-2 text-slate-400 font-mono text-xs">
                <span className="truncate">ID: {event.id}</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(event.id, 'id')}
                  className="hover:text-white transition-colors cursor-pointer"
                  title="Copy Event ID"
                >
                  {copiedKey === 'id' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer shrink-0"
              aria-label="Close event drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
            
            {/* Timestamp & Tenant Scope */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                  Server Timestamp (UTC)
                </span>
                <div className="font-mono font-bold text-slate-800 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>{new Date(event.timestamp).toISOString()}</span>
                </div>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  {new Date(event.timestamp).toLocaleString([], { dateStyle: 'full', timeStyle: 'medium' })}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                  Tenant Isolation Scope
                </span>
                <span className="font-mono font-bold text-slate-800 block">
                  {event.tenantId || 'Primary Tenant'}
                </span>
                <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
                  <Lock className="w-3 h-3" /> Authoritative Boundary
                </span>
              </div>
            </div>

            {/* Actor Identity Card */}
            <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-3 shadow-2xs">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-indigo-600" /> Operator & Actor Context
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Operator Name</span>
                  <span className="font-bold text-slate-900 text-sm">{event.actorName || event.staffName}</span>
                  <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-bold rounded-md text-[10px] inline-block mt-1">
                    Role: {event.actorRole || event.role}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Actor UID</span>
                  <span className="font-mono text-slate-700 text-[11px] break-all block">
                    {event.actorUid || 'System Engine'}
                  </span>
                  {event.actorEmail && (
                    <span className="text-slate-500 text-[11px] block mt-0.5 truncate">
                      {event.actorEmail}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Event Action & Target Context */}
            <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-3 shadow-2xs">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-indigo-600" /> Action & Target Information
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Subsystem Module</span>
                  <span className="font-bold text-slate-900">{event.module}</span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Target Type</span>
                  <span className="font-bold text-slate-900 capitalize">{event.targetType || 'entity'}</span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Target Identifier</span>
                  <span className="font-mono font-bold text-slate-800 text-[11px] truncate block">
                    {event.targetName || event.targetStaffName || event.targetId || event.targetStaffId || 'N/A'}
                  </span>
                </div>
              </div>

              {event.details && (
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Telemetry Summary Details</span>
                  <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    {event.details}
                  </p>
                </div>
              )}

              {event.reason && (
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Administrative Reason</span>
                  <p className="text-xs font-semibold text-slate-900 bg-amber-50/70 p-2.5 rounded-xl border border-amber-200/60 text-amber-950">
                    "{event.reason}"
                  </p>
                </div>
              )}
            </div>

            {/* State Transition Delta (Before vs After) */}
            {(event.previousState || event.newState || event.previousStatus || event.newStatus) && (
              <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-3 shadow-2xs">
                <span className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-600" /> State Transition Delta
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* Previous State */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">
                      Previous State
                    </span>
                    {event.previousStatus && (
                      <div className="text-xs font-bold text-slate-800">
                        Status: <span className="capitalize">{event.previousStatus}</span>
                      </div>
                    )}
                    {event.previousState ? (
                      <pre className="text-[10px] font-mono bg-white p-2 rounded-lg border border-slate-200 overflow-x-auto text-slate-700">
                        {typeof event.previousState === 'string'
                          ? event.previousState
                          : JSON.stringify(event.previousState, null, 2)}
                      </pre>
                    ) : !event.previousStatus ? (
                      <span className="text-slate-400 italic text-[11px]">No previous record</span>
                    ) : null}
                  </div>

                  {/* New State */}
                  <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-1.5">
                    <span className="text-[10px] font-bold uppercase text-indigo-700 flex items-center gap-1">
                      New State <ArrowRight className="w-3 h-3" />
                    </span>
                    {event.newStatus && (
                      <div className="text-xs font-bold text-indigo-950">
                        Status: <span className="capitalize">{event.newStatus}</span>
                      </div>
                    )}
                    {event.newState ? (
                      <pre className="text-[10px] font-mono bg-white p-2 rounded-lg border border-indigo-200 overflow-x-auto text-slate-800">
                        {typeof event.newState === 'string'
                          ? event.newState
                          : JSON.stringify(event.newState, null, 2)}
                      </pre>
                    ) : !event.newStatus ? (
                      <span className="text-slate-400 italic text-[11px]">Unchanged</span>
                    ) : null}
                  </div>
                </div>
              </div>
            )}

            {/* Sanitized Metadata Viewer */}
            {event.metadata && Object.keys(event.metadata).length > 0 && (
              <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-2 shadow-2xs">
                <span className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-600" /> Sanitized Execution Metadata
                </span>
                <p className="text-[11px] text-slate-500">
                  Guaranteed sanitized server properties. Secrets, PINs, and authentication keys are permanently redacted.
                </p>

                <pre className="text-[11px] font-mono bg-slate-900 text-slate-200 p-3.5 rounded-xl overflow-x-auto max-h-48">
                  {JSON.stringify(event.metadata, null, 2)}
                </pre>
              </div>
            )}

          </div>

          {/* Footer Bar */}
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
              <Shield className="w-4 h-4 text-emerald-600" />
              <span>Cryptographically verified tenant audit trail</span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-bold rounded-xl text-xs transition-all cursor-pointer"
            >
              Close
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
