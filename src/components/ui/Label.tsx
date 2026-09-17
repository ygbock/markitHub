import React from 'react';

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  children: React.ReactNode;
  required?: boolean;
  className?: string;
}

export const Label: React.FC<LabelProps> = ({
  children,
  required = false,
  className = '',
  ...props
}) => {
  return (
    <label
      className={`block text-xs font-semibold tracking-wide uppercase text-slate-700 dark:text-slate-300 mb-1.5 ${className}`}
      {...props}
    >
      {children}
      {required && <span className="text-rose-500 ml-1" aria-hidden="true">*</span>}
    </label>
  );
};

export default Label;
