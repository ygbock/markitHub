import React from 'react';

export interface AvatarProps {
  src?: string;
  alt?: string;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  status?: 'online' | 'offline' | 'busy' | 'away';
  className?: string;
}

const sizeClasses: Record<NonNullable<AvatarProps['size']>, { container: string; text: string; dot: string }> = {
  xs: { container: 'w-6 h-6', text: 'text-[10px]', dot: 'w-1.5 h-1.5' },
  sm: { container: 'w-8 h-8', text: 'text-xs', dot: 'w-2 h-2' },
  md: { container: 'w-10 h-10', text: 'text-sm', dot: 'w-2.5 h-2.5' },
  lg: { container: 'w-12 h-12', text: 'text-base', dot: 'w-3 h-3' },
  xl: { container: 'w-16 h-16', text: 'text-lg', dot: 'w-3.5 h-3.5' },
};

const statusColors: Record<NonNullable<AvatarProps['status']>, string> = {
  online: 'bg-emerald-500',
  offline: 'bg-slate-400',
  busy: 'bg-rose-500',
  away: 'bg-amber-500',
};

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt = 'Avatar',
  name,
  size = 'md',
  status,
  className = '',
}) => {
  const [imageError, setImageError] = React.useState(false);
  const sz = sizeClasses[size];

  const getInitials = (n?: string): string => {
    if (!n) return '';
    const parts = n.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const showImage = src && !imageError;

  return (
    <div className={`relative inline-flex items-center justify-center flex-shrink-0 ${sz.container} ${className}`}>
      {showImage ? (
        <img
          src={src}
          alt={alt}
          onError={() => setImageError(true)}
          className="w-full h-full object-cover rounded-full border border-slate-200 dark:border-slate-700"
        />
      ) : (
        <div className={`w-full h-full rounded-full bg-indigo-100 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-semibold flex items-center justify-center ${sz.text}`}>
          {name ? getInitials(name) : alt?.slice(0, 2).toUpperCase() || 'MK'}
        </div>
      )}
      {status && (
        <span
          className={`absolute bottom-0 right-0 rounded-full ring-2 ring-white dark:ring-slate-900 ${statusColors[status]} ${sz.dot}`}
          aria-label={`Status: ${status}`}
        />
      )}
    </div>
  );
};

export default Avatar;
