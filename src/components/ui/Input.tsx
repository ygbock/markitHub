import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  error?: boolean | string;
  fullWidth?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      leftIcon,
      rightIcon,
      error,
      fullWidth = true,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const hasError = Boolean(error);

    return (
      <div className={`relative flex items-center ${fullWidth ? 'w-full' : ''}`}>
        {leftIcon && (
          <div className="absolute left-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          disabled={disabled}
          className={`h-10 px-3.5 rounded-lg border text-sm transition-colors duration-150
            bg-white dark:bg-slate-900 
            text-slate-900 dark:text-slate-100
            placeholder:text-slate-400 dark:placeholder:text-slate-500
            ${leftIcon ? 'pl-10' : ''}
            ${rightIcon ? 'pr-10' : ''}
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
        />
        {rightIcon && (
          <div className="absolute right-3.5 flex items-center text-slate-400 dark:text-slate-500">
            {rightIcon}
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
