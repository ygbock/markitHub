import React from 'react';

export interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'card';
  width?: string | number;
  height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'rectangular',
  width,
  height,
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'circular':
        return 'rounded-full';
      case 'text':
        return 'rounded h-4 w-3/4';
      case 'card':
        return 'rounded-xl h-36 w-full';
      case 'rectangular':
      default:
        return 'rounded-lg';
    }
  };

  const inlineStyles: React.CSSProperties = {
    width: width !== undefined ? width : undefined,
    height: height !== undefined ? height : undefined,
  };

  return (
    <div
      style={inlineStyles}
      className={`animate-pulse bg-slate-200 dark:bg-slate-800 ${getVariantStyles()} ${className}`}
      aria-hidden="true"
    />
  );
};

export default Skeleton;
