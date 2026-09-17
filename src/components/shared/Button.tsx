import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'destructive'
  | 'glass';

export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  disabled,
  className = '',
  ...props
}, ref) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none select-none';

  const sizeClasses: Record<ButtonSize, string> = {
    sm: 'text-xs px-3 py-1.5 min-h-[36px] gap-1.5 rounded-lg',
    md: 'text-sm px-4 py-2.5 min-h-[44px] gap-2 rounded-xl',
    lg: 'text-base px-6 py-3 min-h-[50px] gap-2.5 rounded-xl font-semibold',
  };

  const variantClasses: Record<ButtonVariant, string> = {
    primary: 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/25 active:scale-[0.98]',
    secondary: 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 active:scale-[0.98]',
    outline: 'bg-transparent hover:bg-slate-800/60 text-slate-300 border border-slate-700 hover:border-slate-600 active:scale-[0.98]',
    ghost: 'bg-transparent hover:bg-slate-800/60 text-slate-400 hover:text-slate-200 active:scale-[0.98]',
    destructive: 'bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/25 active:scale-[0.98]',
    glass: 'bg-slate-900/80 hover:bg-slate-800/90 text-white border border-slate-700/70 backdrop-blur-md shadow-lg shadow-black/30 active:scale-[0.98]',
  };

  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${widthClass} ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0 text-current" />
      ) : (
        leftIcon && <span className="shrink-0">{leftIcon}</span>
      )}
      {children}
      {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;
