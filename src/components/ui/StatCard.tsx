import React from 'react';
import { Card } from '../shared/Card';
import { TrendingUp, TrendingDown } from 'lucide-react';

export interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: string | number;
    isPositive?: boolean;
    label?: string;
  };
  subtext?: string;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon,
  trend,
  subtext,
  className = '',
}) => {
  return (
    <Card className={`p-5 flex flex-col justify-between ${className}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
            {label}
          </p>
          <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {value}
          </p>
        </div>
        {icon && (
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            {icon}
          </div>
        )}
      </div>

      {(trend || subtext) && (
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
          {trend && (
            <div
              className={`inline-flex items-center gap-1 font-semibold ${
                trend.isPositive !== false
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {trend.isPositive !== false ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" />
              )}
              <span>{trend.value}</span>
              {trend.label && (
                <span className="font-normal text-slate-400 ml-0.5">{trend.label}</span>
              )}
            </div>
          )}
          {subtext && (
            <span className="text-slate-400 dark:text-slate-500 truncate">{subtext}</span>
          )}
        </div>
      )}
    </Card>
  );
};

export default StatCard;
