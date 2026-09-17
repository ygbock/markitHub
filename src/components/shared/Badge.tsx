import React from 'react';
import { ShieldCheck, Store, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';

export type BadgeVariant = 
  | 'verified' 
  | 'tenant' 
  | 'category' 
  | 'status' 
  | 'primary' 
  | 'neutral' 
  | 'success' 
  | 'warning' 
  | 'danger';

export type BadgeSize = 'sm' | 'md';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: React.ReactNode;
  statusValue?: 'active' | 'pending' | 'suspended' | 'draft' | 'archived' | string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  icon,
  statusValue,
  className = '',
  ...props
}) => {
  const sizeClasses: Record<BadgeSize, string> = {
    sm: 'text-[11px] px-2 py-0.5 gap-1 rounded-md font-medium',
    md: 'text-xs px-2.5 py-1 gap-1.5 rounded-lg font-medium',
  };

  // Resolve dynamic classes based on variant
  let variantClasses = 'bg-slate-800/80 text-slate-300 border border-slate-700/60';
  let defaultIcon: React.ReactNode = null;

  if (variant === 'verified') {
    variantClasses = 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30';
    defaultIcon = <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-emerald-400" />;
  } else if (variant === 'tenant') {
    variantClasses = 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30';
    defaultIcon = <Store className="w-3.5 h-3.5 shrink-0 text-indigo-400" />;
  } else if (variant === 'category') {
    variantClasses = 'bg-slate-800 text-slate-300 border border-slate-700 hover:border-slate-600';
  } else if (variant === 'primary') {
    variantClasses = 'bg-indigo-600/15 text-indigo-300 border border-indigo-500/30';
  } else if (variant === 'success') {
    variantClasses = 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30';
    defaultIcon = <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />;
  } else if (variant === 'warning') {
    variantClasses = 'bg-amber-500/15 text-amber-300 border border-amber-500/30';
    defaultIcon = <Clock className="w-3.5 h-3.5 shrink-0 text-amber-400" />;
  } else if (variant === 'danger') {
    variantClasses = 'bg-rose-500/15 text-rose-300 border border-rose-500/30';
    defaultIcon = <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-400" />;
  } else if (variant === 'status') {
    const s = (statusValue || String(children || '')).toLowerCase();
    if (s === 'active' || s === 'completed' || s === 'verified' || s === 'published') {
      variantClasses = 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30';
      defaultIcon = <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />;
    } else if (s === 'pending' || s === 'in_progress' || s === 'pending_verification') {
      variantClasses = 'bg-amber-500/15 text-amber-400 border border-amber-500/30';
      defaultIcon = <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 animate-pulse" />;
    } else if (s === 'suspended' || s === 'cancelled' || s === 'rejected' || s === 'failed') {
      variantClasses = 'bg-rose-500/15 text-rose-400 border border-rose-500/30';
      defaultIcon = <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />;
    } else {
      variantClasses = 'bg-slate-800 text-slate-400 border border-slate-700';
      defaultIcon = <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />;
    }
  }

  const activeIcon = icon !== undefined ? icon : defaultIcon;

  return (
    <span
      className={`inline-flex items-center select-none tracking-wide transition-colors ${sizeClasses[size]} ${variantClasses} ${className}`}
      {...props}
    >
      {activeIcon}
      {children}
    </span>
  );
};

export default Badge;
