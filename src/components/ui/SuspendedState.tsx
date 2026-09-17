import React from 'react';
import { ShieldAlert, Mail, ExternalLink, HelpCircle } from 'lucide-react';
import { Button } from '../shared/Button';

export interface SuspendedStateProps {
  entityType?: 'business' | 'tenant' | 'account';
  reason?: string;
  supportEmail?: string;
  appealUrl?: string;
  onLogout?: () => void;
  className?: string;
}

export const SuspendedState: React.FC<SuspendedStateProps> = ({
  entityType = 'tenant',
  reason = 'This workspace has been suspended by platform administration.',
  supportEmail = 'support@mikithub.com',
  appealUrl,
  onLogout,
  className = '',
}) => {
  return (
    <div
      role="alert"
      className={`min-h-[60vh] flex flex-col items-center justify-center p-6 sm:p-12 text-center ${className}`}
    >
      <div className="max-w-md w-full p-8 rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-white dark:bg-slate-900 shadow-xl">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 flex items-center justify-center text-rose-600 dark:text-rose-400 mx-auto mb-5">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          {entityType === 'tenant'
            ? 'Tenant Workspace Suspended'
            : entityType === 'business'
            ? 'Business Account Suspended'
            : 'Access Suspended'}
        </h2>

        <p className="text-sm text-slate-600 dark:text-slate-400 mb-5 leading-relaxed">
          Access to this workspace has been temporarily locked by platform administration.
        </p>

        {reason && (
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 text-left mb-6">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Administrative Reason:
            </span>
            <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
              {reason}
            </p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {supportEmail && (
            <a
              href={`mailto:${supportEmail}?subject=Suspension%20Inquiry%20-%20${entityType}`}
              className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-colors shadow-sm"
            >
              <Mail className="w-4 h-4" />
              <span>Contact Platform Support</span>
            </a>
          )}

          {appealUrl && (
            <a
              href={appealUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-sm transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Submit Appeal Request</span>
            </a>
          )}

          {onLogout && (
            <Button
              variant="outline"
              size="md"
              onClick={onLogout}
              className="w-full mt-2"
            >
              Sign Out
            </Button>
          )}
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-1 text-xs text-slate-400">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Need help? Visit the MikitHub Help Center</span>
        </div>
      </div>
    </div>
  );
};

export default SuspendedState;
