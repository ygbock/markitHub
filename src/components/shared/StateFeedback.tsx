import React from 'react';
import { AlertCircle, Inbox, Lock, RefreshCw, Loader2 } from 'lucide-react';
import Button from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'outline';
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 ${className}`}>
      <div className="w-14 h-14 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-400 mb-4 shadow-inner">
        {icon || <Inbox className="w-7 h-7 text-slate-400" />}
      </div>
      <h3 className="text-base sm:text-lg font-semibold text-white mb-1.5">{title}</h3>
      {description && (
        <p className="text-xs sm:text-sm text-slate-400 max-w-sm mb-6 leading-relaxed">
          {description}
        </p>
      )}
      {action && (
        <Button
          variant={action.variant || 'primary'}
          size="md"
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
};

export interface LoadingStateProps {
  message?: string;
  submessage?: string;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading data...',
  submessage,
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-12 text-center ${className}`}>
      <div className="relative mb-4">
        <div className="w-12 h-12 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
        <Loader2 className="w-5 h-5 text-indigo-400 absolute inset-0 m-auto animate-pulse" />
      </div>
      <p className="text-sm font-medium text-slate-200">{message}</p>
      {submessage && <p className="text-xs text-slate-500 mt-1">{submessage}</p>}
    </div>
  );
};

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message = 'An unexpected error occurred while loading this content.',
  onRetry,
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border border-rose-900/30 bg-rose-950/10 ${className}`}>
      <div className="w-14 h-14 rounded-2xl bg-rose-900/20 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4">
        <AlertCircle className="w-7 h-7" />
      </div>
      <h3 className="text-base sm:text-lg font-semibold text-white mb-1.5">{title}</h3>
      <p className="text-xs sm:text-sm text-slate-400 max-w-sm mb-6 leading-relaxed">{message}</p>
      {onRetry && (
        <Button
          variant="outline"
          size="md"
          onClick={onRetry}
          leftIcon={<RefreshCw className="w-4 h-4" />}
        >
          Try Again
        </Button>
      )}
    </div>
  );
};

export interface PermissionDeniedStateProps {
  title?: string;
  description?: string;
  requiredPermission?: string;
  onBack?: () => void;
  className?: string;
}

export const PermissionDeniedState: React.FC<PermissionDeniedStateProps> = ({
  title = 'Access Restricted',
  description = 'You do not have permission to view or manage this resource.',
  requiredPermission,
  onBack,
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border border-amber-900/30 bg-amber-950/10 ${className}`}>
      <div className="w-14 h-14 rounded-2xl bg-amber-900/20 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4">
        <Lock className="w-7 h-7" />
      </div>
      <h3 className="text-base sm:text-lg font-semibold text-white mb-1.5">{title}</h3>
      <p className="text-xs sm:text-sm text-slate-400 max-w-md mb-3 leading-relaxed">{description}</p>
      {requiredPermission && (
        <div className="inline-block px-3 py-1 rounded-md bg-slate-900 border border-slate-800 text-[11px] font-mono text-amber-300 mb-6">
          Required: {requiredPermission}
        </div>
      )}
      {onBack && (
        <Button variant="secondary" size="md" onClick={onBack}>
          Return to Dashboard
        </Button>
      )}
    </div>
  );
};
