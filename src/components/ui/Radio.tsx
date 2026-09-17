import React from 'react';

export interface RadioProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  description?: string;
}

export const Radio = React.forwardRef<HTMLInputElement, RadioProps>(
  ({ label, description, className = '', id, disabled, checked, ...props }, ref) => {
    return (
      <label
        htmlFor={id}
        className={`inline-flex items-start gap-2.5 cursor-pointer select-none ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        } ${className}`}
      >
        <div className="relative flex items-center mt-0.5">
          <input
            ref={ref}
            id={id}
            type="radio"
            checked={checked}
            disabled={disabled}
            className="peer sr-only"
            {...props}
          />
          <div
            className={`w-4 h-4 rounded-full border transition-colors flex items-center justify-center
              border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900
              peer-checked:border-indigo-600 dark:peer-checked:border-indigo-500
              peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-500 peer-focus-visible:ring-offset-1
            `}
          >
            <div className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-500 opacity-0 peer-checked:opacity-100 transition-opacity" />
          </div>
        </div>
        {(label || description) && (
          <div className="flex flex-col">
            {label && (
              <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                {label}
              </span>
            )}
            {description && (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {description}
              </span>
            )}
          </div>
        )}
      </label>
    );
  }
);

Radio.displayName = 'Radio';
export default Radio;
