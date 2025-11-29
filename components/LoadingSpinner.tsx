'use client';

import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  fullScreen?: boolean;
  className?: string;
}

export function LoadingSpinner({ 
  size = 'md', 
  text = 'Carregando...', 
  fullScreen = false,
  className 
}: LoadingSpinnerProps) {
  const sizes = {
    sm: 'w-8 h-8 border-2',
    md: 'w-12 h-12 border-3',
    lg: 'w-16 h-16 border-4',
  };

  const containerClass = fullScreen 
    ? 'min-h-screen flex items-center justify-center bg-slate-50'
    : 'flex items-center justify-center h-[60vh]';

  return (
    <div className={cn(containerClass, className)}>
      <div className="text-center">
        <div className="relative mx-auto" style={{ width: size === 'sm' ? 32 : size === 'md' ? 48 : 64, height: size === 'sm' ? 32 : size === 'md' ? 48 : 64 }}>
          <div className={cn(
            "rounded-full border-slate-200 absolute inset-0",
            sizes[size]
          )} />
          <div className={cn(
            "rounded-full border-poke-blue border-t-transparent animate-spin absolute inset-0",
            sizes[size]
          )} />
        </div>
        {text && (
          <p className={cn(
            "mt-3 text-slate-500 font-medium",
            size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base'
          )}>
            {text}
          </p>
        )}
      </div>
    </div>
  );
}

// Skeleton loading para cards
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse bg-white rounded-2xl p-4 border border-slate-100", className)}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-slate-200 rounded-xl" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-slate-200 rounded w-3/4" />
          <div className="h-3 bg-slate-200 rounded w-1/2" />
        </div>
      </div>
    </div>
  );
}

// Skeleton loading para lista
export function ListSkeleton({ count = 3, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}
