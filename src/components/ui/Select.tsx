import React from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options?: SelectOption[];
  error?: boolean | string;
  fullWidth?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      options = [],
      error,
      fullWidth = true,
      className = '',
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const hasError = Boolean(error);

    return (
      <div className={`relative flex items-center ${fullWidth ? 'w-full' : ''}`}>
        <select
          ref={ref}
          disabled={disabled}
          className={`h-10 pl-3.5 pr-10 rounded-lg border text-sm appearance-none transition-colors duration-150
            bg-white dark:bg-slate-900 
            text-slate-900 dark:text-slate-100
            ${fullWidth ? 'w-full' : ''}
            ${
              hasError
                ? 'border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                : 'border-slate-300 dark:border-slate-800 focus:border-indigo-500 dark:focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
            }
            ${disabled ? 'opacity-60 bg-slate-100 dark:bg-slate-800/50 cursor-not-allowed' : ''}
            mk-focus-ring outline-none
            ${className}
          `}
          {...props}
        >
          {options.length > 0
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>
        <div className="absolute right-3.5 pointer-events-none text-slate-400 dark:text-slate-500 flex items-center">
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>
    );
  }
);

Select.displayName = 'Select';
export default Select;
