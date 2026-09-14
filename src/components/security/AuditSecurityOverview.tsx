import React from 'react';
import { 
  Activity, Calendar, UserX, KeyRound, Crown, 
  AlertTriangle, ShieldCheck, TrendingUp, Lock 
} from 'lucide-react';
import type { AuditSecurityMetrics } from '../../types';

interface AuditSecurityOverviewProps {
  metrics: AuditSecurityMetrics;
  onFilterPreset?: (preset: 'suspensions' | 'roles' | 'ownership' | 'failed' | 'all') => void;
  activePreset?: string;
}

export default function AuditSecurityOverview({
  metrics,
  onFilterPreset,
  activePreset
}: AuditSecurityOverviewProps) {
  const cards = [
    {
      id: 'today',
      label: "Today's Events",
      value: metrics.eventsToday,
      description: 'Audit telemetry captured since 00:00 UTC',
      icon: Activity,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
      border: 'border-indigo-100',
      preset: 'all',
    },
    {
      id: 'week',
      label: '7-Day Volume',
      value: metrics.eventsThisWeek,
      description: 'Trailing 7-day governance velocity',
      icon: Calendar,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-100',
      preset: 'all',
    },
    {
      id: 'suspensions',
      label: 'Staff Suspensions',
      value: metrics.staffSuspensions,
      description: 'Account deactivations & lockouts',
      icon: UserX,
      color: 'text-rose-600',
      bg: 'bg-rose-50',
      border: 'border-rose-100',
      preset: 'suspensions',
      badge: metrics.staffSuspensions > 0 ? 'Action Required' : undefined,
    },
    {
      id: 'roles',
      label: 'Role / Privilege Changes',
      value: metrics.rolePermissionChanges,
      description: 'Staff promotions & permission overrides',
      icon: KeyRound,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'border-amber-100',
      preset: 'roles',
    },
    {
      id: 'ownership',
      label: 'Ownership Transfers',
      value: metrics.ownershipEvents,
      description: 'Root tenant governance transitions',
      icon: Crown,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      border: 'border-purple-100',
      preset: 'ownership',
    },
    {
      id: 'failed',
      label: 'Denied / Failed Actions',
      value: metrics.failedDeniedOperations,
      description: 'Blocked access attempts & anomalies',
      icon: AlertTriangle,
      color: 'text-rose-700',
      bg: 'bg-rose-50',
      border: 'border-rose-200',
      preset: 'failed',
      badge: metrics.failedDeniedOperations > 0 ? 'Security Flag' : undefined,
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black uppercase tracking-wider text-slate-500 font-mono flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-indigo-600" /> Authoritative Security Telemetry Metrics
          </span>
        </div>
        <span className="text-[11px] font-mono text-slate-400">
          Source: Verified Tenant Ledger
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {cards.map((card) => {
          const Icon = card.icon;
          const isSelected = activePreset === card.preset && card.preset !== 'all';

          return (
            <button
              key={card.id}
              type="button"
              onClick={() => onFilterPreset?.(card.preset as any)}
              className={`text-left p-3.5 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between min-h-[110px] ${
                isSelected
                  ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-indigo-500'
                  : `${card.bg} ${card.border} hover:shadow-xs hover:border-slate-300`
              }`}
            >
              <div className="flex items-start justify-between gap-1 w-full">
                <span className={`text-[11px] font-bold truncate ${isSelected ? 'text-slate-200' : 'text-slate-600'}`}>
                  {card.label}
                </span>
                <div className={`p-1.5 rounded-lg shrink-0 ${isSelected ? 'bg-white/20 text-white' : `${card.bg} ${card.color}`}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
              </div>

              <div className="space-y-0.5 mt-2">
                <div className={`text-xl sm:text-2xl font-black font-mono tracking-tight ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                  {card.value}
                </div>
                <p className={`text-[10px] truncate leading-tight ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                  {card.description}
                </p>
              </div>

              {card.badge && (
                <span className={`absolute top-2 right-2 text-[9px] px-1.5 py-0.2 rounded-full font-bold uppercase tracking-wider ${
                  isSelected ? 'bg-rose-500 text-white' : 'bg-rose-100 text-rose-800'
                }`}>
                  {card.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
