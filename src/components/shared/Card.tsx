import React, { forwardRef } from 'react';

export type CardElevation = 'level0' | 'level1' | 'level2';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevation?: CardElevation;
  interactive?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(({
  children,
  elevation = 'level1',
  interactive = false,
  className = '',
  ...props
}, ref) => {
  const elevationClasses: Record<CardElevation, string> = {
    level0: 'bg-slate-900/50 border border-slate-800/80',
    level1: 'bg-slate-900/90 border border-slate-800 backdrop-blur-md shadow-lg shadow-black/20',
    level2: 'bg-slate-900/95 border border-slate-700/80 backdrop-blur-xl shadow-2xl shadow-black/40',
  };

  const interactiveClass = interactive 
    ? 'hover:border-indigo-500/50 hover:shadow-indigo-500/10 hover:-translate-y-0.5 cursor-pointer transition-all duration-200' 
    : 'transition-colors';

  return (
    <div
      ref={ref}
      className={`rounded-2xl overflow-hidden ${elevationClasses[elevation]} ${interactiveClass} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
});

Card.displayName = 'Card';

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <div className={`p-5 sm:p-6 border-b border-slate-800/60 ${className}`} {...props}>
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <h3 className={`text-base sm:text-lg font-semibold text-white tracking-tight ${className}`} {...props}>
    {children}
  </h3>
);

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <p className={`text-xs sm:text-sm text-slate-400 mt-1 ${className}`} {...props}>
    {children}
  </p>
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <div className={`p-5 sm:p-6 ${className}`} {...props}>
    {children}
  </div>
);

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <div className={`p-4 sm:p-5 border-t border-slate-800/60 bg-slate-950/40 flex items-center justify-between gap-3 ${className}`} {...props}>
    {children}
  </div>
);

export default Card;
