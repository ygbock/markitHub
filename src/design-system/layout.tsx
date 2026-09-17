import React from 'react';

export interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

export const PageContainer: React.FC<PageContainerProps> = ({
  size = 'xl',
  className = '',
  children,
  ...props
}) => {
  const maxSizes = {
    sm: 'max-w-3xl',
    md: 'max-w-5xl',
    lg: 'max-w-6xl',
    xl: 'max-w-7xl',
    full: 'max-w-full',
  };

  return (
    <div className={`mx-auto w-full px-4 sm:px-6 lg:px-8 ${maxSizes[size]} ${className}`} {...props}>
      {children}
    </div>
  );
};

export interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  spacing?: 'sm' | 'md' | 'lg';
}

export const Section: React.FC<SectionProps> = ({
  spacing = 'md',
  className = '',
  children,
  ...props
}) => {
  const spacingClasses = {
    sm: 'py-4 sm:py-6',
    md: 'py-6 sm:py-8',
    lg: 'py-8 sm:py-12',
  };

  return (
    <section className={`${spacingClasses[spacing]} ${className}`} {...props}>
      {children}
    </section>
  );
};

export interface StackProps extends React.HTMLAttributes<HTMLDivElement> {
  gap?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  align?: 'start' | 'center' | 'end' | 'stretch';
}

export const Stack: React.FC<StackProps> = ({
  gap = 'md',
  align = 'stretch',
  className = '',
  children,
  ...props
}) => {
  const gapClasses = {
    xs: 'gap-1.5',
    sm: 'gap-3',
    md: 'gap-4',
    lg: 'gap-6',
    xl: 'gap-8',
  };

  const alignClasses = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    stretch: 'items-stretch',
  };

  return (
    <div className={`flex flex-col ${gapClasses[gap]} ${alignClasses[align]} ${className}`} {...props}>
      {children}
    </div>
  );
};

export interface InlineProps extends React.HTMLAttributes<HTMLDivElement> {
  gap?: 'xs' | 'sm' | 'md' | 'lg';
  align?: 'start' | 'center' | 'end' | 'baseline';
  justify?: 'start' | 'center' | 'end' | 'between';
  wrap?: boolean;
}

export const Inline: React.FC<InlineProps> = ({
  gap = 'sm',
  align = 'center',
  justify = 'start',
  wrap = true,
  className = '',
  children,
  ...props
}) => {
  const gapClasses = {
    xs: 'gap-1.5',
    sm: 'gap-2.5',
    md: 'gap-4',
    lg: 'gap-6',
  };

  const alignClasses = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    baseline: 'items-baseline',
  };

  const justifyClasses = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
  };

  return (
    <div
      className={`flex ${wrap ? 'flex-wrap' : 'flex-nowrap'} ${gapClasses[gap]} ${alignClasses[align]} ${justifyClasses[justify]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export interface CardGridProps extends React.HTMLAttributes<HTMLDivElement> {
  columns?: 2 | 3 | 4;
}

export const CardGrid: React.FC<CardGridProps> = ({
  columns = 3,
  className = '',
  children,
  ...props
}) => {
  const colClasses = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={`grid gap-4 sm:gap-6 ${colClasses[columns]} ${className}`} {...props}>
      {children}
    </div>
  );
};
