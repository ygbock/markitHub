import React from 'react';
import { ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
  active?: boolean;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items, className = '' }) => {
  return (
    <nav className={`flex items-center text-xs sm:text-sm text-slate-500 dark:text-slate-400 ${className}`} aria-label="Breadcrumb">
      <ol className="flex items-center flex-wrap gap-1.5 sm:gap-2">
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          const isActive = item.active || isLast;

          return (
            <li key={idx} className="inline-flex items-center gap-1.5 sm:gap-2">
              {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />}
              {isActive ? (
                <span
                  className="font-medium text-slate-800 dark:text-slate-200"
                  aria-current="page"
                >
                  {item.label}
                </span>
              ) : item.onClick ? (
                <button
                  type="button"
                  onClick={item.onClick}
                  className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
                >
                  {item.label}
                </button>
              ) : item.href ? (
                <a
                  href={item.href}
                  className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
                >
                  {item.label}
                </a>
              ) : (
                <span>{item.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumbs;
