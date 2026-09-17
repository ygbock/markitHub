import React from 'react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean | string;
  fullWidth?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      error,
      fullWidth = true,
      className = '',
      disabled,
      rows = 3,
      ...props
    },
    ref
  ) => {
    const hasError = Boolean(error);

    return (
      <textarea
        ref={ref}
        rows={rows}
        disabled={disabled}
        className={`p-3 rounded-lg border text-sm transition-colors duration-150
          bg-white dark:bg-slate-900 
          text-slate-900 dark:text-slate-100
          placeholder:text-slate-400 dark:placeholder:text-slate-500
          ${fullWidth ? 'w-full' : ''}
          ${
            hasError
              ? 'border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
              : 'border-slate-300 dark:border-slate-800 focus:border-indigo-500 dark:focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
          }
          ${disabled ? 'opacity-60 bg-slate-100 dark:bg-slate-800/50 cursor-not-allowed' : ''}
          mk-focus-ring outline-none resize-y
          ${className}
        `}
        {...props}
      />
    );
  }
);

Textarea.displayName = 'Textarea';
export default Textarea;
