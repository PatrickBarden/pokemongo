'use client';

import { cn } from '@/lib/utils';
import { 
  Shield, 
  ShieldCheck, 
  Award,
  Star
} from 'lucide-react';

interface SellerBadgeProps {
  level: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  verified?: boolean;
  rating?: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const levelConfig = {
  bronze: {
    label: 'Bronze',
    bgColor: 'bg-amber-100',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-300',
    icon: Shield
  },
  silver: {
    label: 'Prata',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-600',
    borderColor: 'border-gray-300',
    icon: Shield
  },
  gold: {
    label: 'Ouro',
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-700',
    borderColor: 'border-yellow-400',
    icon: Award
  },
  platinum: {
    label: 'Platina',
    bgColor: 'bg-cyan-100',
    textColor: 'text-cyan-700',
    borderColor: 'border-cyan-400',
    icon: Award
  },
  diamond: {
    label: 'Diamante',
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-700',
    borderColor: 'border-purple-400',
    icon: ShieldCheck
  }
};

const sizeConfig = {
  sm: {
    padding: 'px-1.5 py-0.5',
    iconSize: 'h-3 w-3',
    textSize: 'text-xs',
    gap: 'gap-0.5'
  },
  md: {
    padding: 'px-2 py-1',
    iconSize: 'h-4 w-4',
    textSize: 'text-sm',
    gap: 'gap-1'
  },
  lg: {
    padding: 'px-3 py-1.5',
    iconSize: 'h-5 w-5',
    textSize: 'text-base',
    gap: 'gap-1.5'
  }
};

export function SellerBadge({
  level,
  verified = false,
  rating,
  size = 'md',
  showLabel = true
}: SellerBadgeProps) {
  const config = levelConfig[level];
  const sizeStyles = sizeConfig[size];
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-1.5">
      <span
        className={cn(
          'inline-flex items-center rounded-full border font-medium',
          config.bgColor,
          config.textColor,
          config.borderColor,
          sizeStyles.padding,
          sizeStyles.gap
        )}
      >
        <Icon className={sizeStyles.iconSize} />
        {showLabel && (
          <span className={sizeStyles.textSize}>{config.label}</span>
        )}
      </span>

      {verified && (
        <span
          className={cn(
            'inline-flex items-center rounded-full border font-medium',
            'bg-green-100 text-green-700 border-green-300',
            sizeStyles.padding,
            sizeStyles.gap
          )}
          title="Vendedor Verificado"
        >
          <ShieldCheck className={sizeStyles.iconSize} />
          {showLabel && size !== 'sm' && (
            <span className={sizeStyles.textSize}>Verificado</span>
          )}
        </span>
      )}

      {rating !== undefined && rating > 0 && (
        <span
          className={cn(
            'inline-flex items-center rounded-full border font-medium',
            'bg-yellow-50 text-yellow-700 border-yellow-200',
            sizeStyles.padding,
            sizeStyles.gap
          )}
        >
          <Star className={cn(sizeStyles.iconSize, 'fill-yellow-400')} />
          <span className={sizeStyles.textSize}>{rating.toFixed(1)}</span>
        </span>
      )}
    </div>
  );
}
