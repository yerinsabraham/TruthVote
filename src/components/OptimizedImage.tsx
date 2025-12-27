'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  fill?: boolean;
}

/**
 * Custom image component with Firebase Storage optimization
 * Automatically generates optimized URLs with size/quality parameters
 */
export function OptimizedImage({
  src,
  alt,
  width = 800,
  height = 600,
  className = '',
  priority = false,
  fill = false,
}: OptimizedImageProps) {
  const [optimizedSrc, setOptimizedSrc] = useState(src);
  const [error, setError] = useState(false);

  useEffect(() => {
    // If it's a Firebase Storage URL, add size parameters
    if (src?.includes('firebasestorage.googleapis.com')) {
      // Firebase Storage supports size parameters in URL
      // Format: _WIDTHxHEIGHT for resizing
      const url = new URL(src);
      url.searchParams.set('w', width.toString());
      url.searchParams.set('h', height.toString());
      url.searchParams.set('q', '80'); // Quality 80% (good balance)
      setOptimizedSrc(url.toString());
    } else {
      setOptimizedSrc(src);
    }
  }, [src, width, height]);

  const handleError = () => {
    setError(true);
    // Fallback to original URL if optimization fails
    setOptimizedSrc(src);
  };

  if (!src) {
    return (
      <div 
        className={`bg-gray-200 dark:bg-gray-800 flex items-center justify-center ${className}`}
        style={{ width: fill ? '100%' : width, height: fill ? '100%' : height }}
      >
        <span className="text-gray-400 text-sm">No image</span>
      </div>
    );
  }

  return (
    <Image
      src={optimizedSrc}
      alt={alt}
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      fill={fill}
      className={className}
      priority={priority}
      onError={handleError}
      loading={priority ? 'eager' : 'lazy'}
    />
  );
}
