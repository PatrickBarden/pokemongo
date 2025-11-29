'use client';

import { StarRating } from './StarRating';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  ShieldCheck, 
  Award, 
  TrendingUp,
  Package,
  ShoppingCart,
  MessageSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface UserReputationCardProps {
  displayName: string;
  reputationScore: number;
  totalSales: number;
  totalPurchases: number;
  totalReviews: number;
  averageRating: number;
  sellerLevel: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  verifiedSeller: boolean;
  compact?: boolean;
}

const levelConfig = {
  bronze: {
    label: 'Bronze',
    color: 'bg-amber-700 text-white',
    icon: Shield,
    gradient: 'from-amber-600 to-amber-800'
  },
  silver: {
    label: 'Prata',
    color: 'bg-gray-400 text-white',
    icon: Shield,
    gradient: 'from-gray-300 to-gray-500'
  },
  gold: {
    label: 'Ouro',
    color: 'bg-yellow-500 text-white',
    icon: Award,
    gradient: 'from-yellow-400 to-yellow-600'
  },
  platinum: {
    label: 'Platina',
    color: 'bg-cyan-500 text-white',
    icon: Award,
    gradient: 'from-cyan-400 to-cyan-600'
  },
  diamond: {
    label: 'Diamante',
    color: 'bg-purple-500 text-white',
    icon: ShieldCheck,
    gradient: 'from-purple-400 to-purple-600'
  }
};

export function UserReputationCard({
  displayName,
  reputationScore,
  totalSales,
  totalPurchases,
  totalReviews,
  averageRating,
  sellerLevel,
  verifiedSeller,
  compact = false
}: UserReputationCardProps) {
  const level = levelConfig[sellerLevel];
  const LevelIcon = level.icon;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Badge className={cn('text-xs', level.color)}>
          <LevelIcon className="h-3 w-3 mr-1" />
          {level.label}
        </Badge>
        {verifiedSeller && (
          <Badge variant="outline" className="text-xs text-green-600 border-green-300">
            <ShieldCheck className="h-3 w-3 mr-1" />
            Verificado
          </Badge>
        )}
        <StarRating rating={averageRating} size="sm" showValue />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border shadow-sm p-4">
      {/* Header com nível */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={cn(
            'p-2 rounded-lg bg-gradient-to-br',
            level.gradient
          )}>
            <LevelIcon className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">{displayName}</p>
            <Badge className={cn('text-xs', level.color)}>
              {level.label}
            </Badge>
          </div>
        </div>
        {verifiedSeller && (
          <Badge variant="outline" className="text-green-600 border-green-300">
            <ShieldCheck className="h-3 w-3 mr-1" />
            Verificado
          </Badge>
        )}
      </div>

      {/* Rating */}
      <div className="flex items-center gap-3 mb-4 pb-4 border-b">
        <StarRating rating={averageRating} size="md" />
        <span className="text-2xl font-bold text-gray-900">
          {averageRating.toFixed(1)}
        </span>
        <span className="text-sm text-gray-500">
          ({totalReviews} {totalReviews === 1 ? 'avaliação' : 'avaliações'})
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-gray-500 mb-1">
            <Package className="h-4 w-4" />
          </div>
          <p className="text-xl font-bold text-gray-900">{totalSales}</p>
          <p className="text-xs text-gray-500">Vendas</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-gray-500 mb-1">
            <ShoppingCart className="h-4 w-4" />
          </div>
          <p className="text-xl font-bold text-gray-900">{totalPurchases}</p>
          <p className="text-xs text-gray-500">Compras</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-gray-500 mb-1">
            <TrendingUp className="h-4 w-4" />
          </div>
          <p className="text-xl font-bold text-gray-900">{reputationScore}</p>
          <p className="text-xs text-gray-500">Reputação</p>
        </div>
      </div>
    </div>
  );
}
