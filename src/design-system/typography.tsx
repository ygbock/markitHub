import React from 'react';

export interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  level?: 1 | 2 | 3 | 4;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span';
}

export const Heading: React.FC<HeadingProps> = ({
  level = 2,
  as,
  className = '',
  children,
  ...props
}) => {
  const Component = as || (`h${level}` as React.ElementType);

  const levelStyles = {
    1: 'text-2xl sm:text-3xl font-bold tracking-tight text-white leading-tight',
    2: 'text-xl sm:text-2xl font-bold tracking-tight text-white leading-snug',
    3: 'text-lg sm:text-xl font-semibold tracking-tight text-white leading-normal',
    4: 'text-base sm:text-lg font-semibold text-white leading-normal',
  };

  return (
    <Component className={`${levelStyles[level]} ${className}`} {...props}>
      {children}
    </Component>
  );
};

export interface TextProps extends React.HTMLAttributes<HTMLParagraphElement> {
  size?: 'body' | 'bodySmall' | 'caption';
  muted?: boolean;
  as?: 'p' | 'span' | 'div';
}

export const Text: React.FC<TextProps> = ({
  size = 'body',
  muted = false,
  as: Component = 'p',
  className = '',
  children,
  ...props
}) => {
  const sizeStyles = {
    body: 'text-sm leading-relaxed',
    bodySmall: 'text-xs leading-normal',
    caption: 'text-[11px] leading-tight',
  };

  const colorStyle = muted ? 'text-slate-400' : 'text-slate-200';

  return (
    <Component className={`${sizeStyles[size]} ${colorStyle} ${className}`} {...props}>
      {children}
    </Component>
  );
};

export interface MetricProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string | number;
  label?: string;
  trend?: {
    value: string | number;
    isPositive: boolean;
  };
}

export const Metric: React.FC<MetricProps> = ({
  value,
  label,
  trend,
  className = '',
  ...props
}) => {
  return (
    <div className={`tabular-nums ${className}`} {...props}>
      {label && <span className="block text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">{label}</span>}
      <div className="flex items-baseline gap-2">
        <span className="text-2xl sm:text-3xl font-bold tracking-tight text-white">{value}</span>
        {trend && (
          <span className={`text-xs font-semibold ${trend.isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
            {trend.isPositive ? '+' : ''}{trend.value}
          </span>
        )}
      </div>
    </div>
  );
};
