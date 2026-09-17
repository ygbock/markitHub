import React from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

export interface ToastProps {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}

const toastTypeStyles: Record<ToastType, { icon: React.ReactNode; border: string; bg: string; text: string }> = {
  success: {
    icon: <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />,
    border: 'border-emerald-500/30',
    bg: 'bg-white dark:bg-slate-900',
    text: 'text-slate-800 dark:text-slate-100',
  },
  error: {
    icon: <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />,
    border: 'border-rose-500/30',
    bg: 'bg-white dark:bg-slate-900',
    text: 'text-slate-800 dark:text-slate-100',
  },
  warning: {
    icon: <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />,
    border: 'border-amber-500/30',
    bg: 'bg-white dark:bg-slate-900',
    text: 'text-slate-800 dark:text-slate-100',
  },
  info: {
    icon: <Info className="w-5 h-5 text-sky-500 flex-shrink-0" />,
    border: 'border-sky-500/30',
    bg: 'bg-white dark:bg-slate-900',
    text: 'text-slate-800 dark:text-slate-100',
  },
};

export const Toast: React.FC<ToastProps> = ({ toast, onDismiss }) => {
  const styles = toastTypeStyles[toast.type];

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-start gap-3 p-4 rounded-xl border shadow-lg ${styles.bg} ${styles.border} ${styles.text} min-w-[280px] max-w-sm transition-all animate-in fade-in slide-in-from-top-2 duration-200`}
    >
      {styles.icon}
      <div className="flex-1 text-sm">
        {toast.title && <p className="font-semibold text-xs tracking-wide uppercase mb-0.5">{toast.title}</p>}
        <p className="text-slate-600 dark:text-slate-300 leading-snug">{toast.message}</p>
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-0.5 rounded-md"
        aria-label="Dismiss notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default Toast;
