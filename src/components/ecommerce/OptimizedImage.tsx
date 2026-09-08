// ============================================================
// FILE: src/components/ecommerce/OptimizedImage.tsx
// PURPOSE:
//   High-Performance Responsive Image Component with:
//   - CDN parameter optimization (WebP/AVIF auto-format, quality 80)
//   - Native loading="lazy" + decoding="async"
//   - Priority loading for above-the-fold assets (fetchpriority="high")
//   - Responsive srcset & sizes attributes
//   - Blur-up Low Quality Placeholder / shimmer skeleton
//   - Graceful fallback placeholder on network failure with retry
//   - Telemetry tracking for bandwidth saved
// ============================================================

import React, { useState, useEffect, useRef } from 'react';
import { 
  buildOptimizedImageUrl, 
  buildResponsiveSrcSet, 
  CATALOG_GRID_SIZES, 
  imageTracker 
} from '../../utils/imageOptimization';
import { ImageOff, RefreshCw } from 'lucide-react';

export interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  style?: React.CSSProperties;
  src: string;
  alt: string;
  width?: number;
  height?: number;
  priority?: boolean; // If true, eager loads with fetchpriority="high"
  aspectRatio?: 'square' | 'video' | 'portrait' | 'auto';
  objectFit?: 'cover' | 'contain' | 'fill';
  sizes?: string;
  className?: string;
  fallbackIconSize?: number;
}

export default function OptimizedImage({
  src,
  alt,
  width = 600,
  height,
  priority = false,
  aspectRatio = 'square',
  objectFit = 'cover',
  sizes = CATALOG_GRID_SIZES,
  className = '',
  fallbackIconSize = 24,
  ...rest
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Generate CDN URL with width & WebP/AVIF auto-formatting
  const optimizedSrc = buildOptimizedImageUrl(src, {
    width,
    height,
    quality: 80,
    format: 'auto',
    fit: 'crop'
  });

  // Generate responsive srcset
  const srcSet = buildResponsiveSrcSet(src, [320, 480, 640, 800, 1024, 1280], {
    quality: 80,
    format: 'auto',
    fit: 'crop'
  });

  // Aspect ratio class mapping
  const aspectClass = 
    aspectRatio === 'square' ? 'aspect-square' :
    aspectRatio === 'portrait' ? 'aspect-[3/4]' :
    aspectRatio === 'video' ? 'aspect-video' : '';

  // Fit class mapping
  const fitClass = 
    objectFit === 'contain' ? 'object-contain' :
    objectFit === 'fill' ? 'object-fill' : 'object-cover';

  // Handle image load
  const handleLoad = () => {
    setIsLoaded(true);
    setHasError(false);
    imageTracker.recordLoad(width, !priority, true);
  };

  // Handle image error
  const handleError = () => {
    setHasError(true);
    setIsLoaded(true);
    imageTracker.recordError();
  };

  // Reset states when src or retryKey changes
  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
  }, [src, retryKey]);

  return (
    <div className={`relative overflow-hidden bg-slate-100 ${aspectClass} ${className}`}>
      {/* 1. Shimmer / Blur Placeholder skeleton while loading */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-gradient-to-r from-slate-100 via-slate-200/70 to-slate-100 animate-pulse flex items-center justify-center">
          <div className="w-6 h-6 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin opacity-40" />
        </div>
      )}

      {/* 2. Error Fallback State */}
      {hasError ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center bg-slate-100 text-slate-400 select-none">
          <ImageOff className="w-6 h-6 mb-1.5 text-slate-400 stroke-1" style={{ width: fallbackIconSize, height: fallbackIconSize }} />
          <span className="text-[10px] font-medium text-slate-500 line-clamp-1 max-w-[90%]">{alt || 'Product Image'}</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setRetryKey(k => k + 1);
            }}
            className="mt-1.5 inline-flex items-center gap-1 text-[9px] font-bold text-indigo-600 hover:text-indigo-800 bg-white px-2 py-0.5 rounded border border-slate-200 cursor-pointer shadow-2xs"
            title="Retry loading image"
          >
            <RefreshCw className="w-2.5 h-2.5" />
            <span>Retry</span>
          </button>
        </div>
      ) : (
        /* 3. High-Performance HTML <img> tag with Responsive CDN attributes */
        <img
          key={retryKey}
          ref={imgRef}
          src={optimizedSrc}
          srcSet={srcSet || undefined}
          sizes={sizes}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={priority ? 'high' : 'auto'}
          onLoad={handleLoad}
          onError={handleError}
          className={`w-full h-full ${fitClass} transition-opacity duration-300 ease-out ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          referrerPolicy="no-referrer"
          {...rest}
        />
      )}
    </div>
  );
}
