'use client';

import { motion } from 'framer-motion';
import { 
  Zap, 
  Coins, 
  Star, 
  Crown, 
  Gem,
  BadgeCheck,
  Sparkles,
  TrendingUp
} from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

interface CreditPackageCardProps {
  id: string;
  name: string;
  slug: string;
  description: string;
  credits: number;
  price: number;
  bonusCredits: number;
  bonusPercentage: number;
  isPopular: boolean;
  isBestValue: boolean;
  icon: string;
  color: string;
  onSelect: (id: string) => void;
  isLoading?: boolean;
  isSelected?: boolean;
}

const iconMap: Record<string, React.ElementType> = {
  zap: Zap,
  coins: Coins,
  star: Star,
  crown: Crown,
  gem: Gem,
};

const colorMap: Record<string, { bg: string; text: string; gradient: string; border: string }> = {
  blue: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-600 dark:text-blue-400',
    gradient: 'from-blue-500 to-blue-600',
    border: 'border-blue-500/30 hover:border-blue-500/50',
  },
  green: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-600 dark:text-emerald-400',
    gradient: 'from-emerald-500 to-emerald-600',
    border: 'border-emerald-500/30 hover:border-emerald-500/50',
  },
  purple: {
    bg: 'bg-purple-500/10',
    text: 'text-purple-600 dark:text-purple-400',
    gradient: 'from-purple-500 to-purple-600',
    border: 'border-purple-500/30 hover:border-purple-500/50',
  },
  amber: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-600 dark:text-amber-400',
    gradient: 'from-amber-500 to-amber-600',
    border: 'border-amber-500/30 hover:border-amber-500/50',
  },
  pink: {
    bg: 'bg-pink-500/10',
    text: 'text-pink-600 dark:text-pink-400',
    gradient: 'from-pink-500 to-pink-600',
    border: 'border-pink-500/30 hover:border-pink-500/50',
  },
};

export function CreditPackageCard({
  id,
  name,
  slug,
  description,
  credits,
  price,
  bonusCredits,
  bonusPercentage,
  isPopular,
  isBestValue,
  icon,
  color,
  onSelect,
  isLoading,
  isSelected,
}: CreditPackageCardProps) {
  const IconComponent = iconMap[icon] || Coins;
  const colors = colorMap[color] || colorMap.blue;
  const totalCredits = credits + bonusCredits;

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        'relative bg-card rounded-2xl border-2 p-5 cursor-pointer transition-all duration-300',
        isPopular ? 'border-purple-500 shadow-lg shadow-purple-500/20' : colors.border,
        isSelected && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
      )}
      onClick={() => !isLoading && onSelect(id)}
    >
      {/* Popular/Best Value Badge */}
      {(isPopular || isBestValue) && (
        <div className={cn(
          'absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold text-white flex items-center gap-1',
          isPopular ? 'bg-gradient-to-r from-purple-500 to-pink-500' : 'bg-gradient-to-r from-amber-500 to-orange-500'
        )}>
          {isPopular ? (
            <>
              <Star className="h-3 w-3 fill-current" />
              Mais Popular
            </>
          ) : (
            <>
              <TrendingUp className="h-3 w-3" />
              Melhor Valor
            </>
          )}
        </div>
      )}

      {/* Icon */}
      <div className={cn(
        'w-14 h-14 rounded-2xl flex items-center justify-center mb-4',
        colors.bg
      )}>
        <IconComponent className={cn('h-7 w-7', colors.text)} />
      </div>

      {/* Name & Description */}
      <h3 className="text-lg font-bold text-foreground mb-1">{name}</h3>
      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{description}</p>

      {/* Credits Display */}
      <div className="bg-muted/50 rounded-xl p-3 mb-4">
        <div className="flex items-baseline gap-1 mb-1">
          <span className="text-3xl font-bold text-foreground">{credits}</span>
          <span className="text-sm text-muted-foreground">créditos</span>
        </div>
        {bonusCredits > 0 && (
          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
            <Sparkles className="h-4 w-4" />
            <span className="text-sm font-semibold">+{bonusCredits} bônus ({bonusPercentage}%)</span>
          </div>
        )}
        {bonusCredits > 0 && (
          <div className="mt-2 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Total:</span>
              <span className="font-bold text-foreground">{totalCredits} créditos</span>
            </div>
          </div>
        )}
      </div>

      {/* Price & CTA */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-2xl font-bold text-foreground">{formatCurrency(price)}</span>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          disabled={isLoading}
          className={cn(
            'px-5 py-2.5 rounded-xl font-semibold text-white text-sm flex items-center gap-2 transition-all',
            `bg-gradient-to-r ${colors.gradient}`,
            'hover:shadow-lg hover:shadow-black/20',
            isLoading && 'opacity-50 cursor-not-allowed'
          )}
        >
          {isLoading ? (
            <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <BadgeCheck className="h-4 w-4" />
          )}
          Comprar
        </motion.button>
      </div>
    </motion.div>
  );
}
