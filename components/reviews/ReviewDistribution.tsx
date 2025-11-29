'use client';

import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReviewDistributionProps {
  distribution: { rating: number; count: number; percentage: number }[];
  total: number;
  averageRating: number;
}

export function ReviewDistribution({
  distribution,
  total,
  averageRating
}: ReviewDistributionProps) {
  return (
    <div className="bg-white rounded-xl border p-4">
      <div className="flex items-center gap-4 mb-4 pb-4 border-b">
        <div className="text-center">
          <p className="text-4xl font-bold text-gray-900">{averageRating.toFixed(1)}</p>
          <div className="flex items-center justify-center gap-0.5 mt-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={cn(
                  'h-4 w-4',
                  star <= Math.round(averageRating)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'fill-gray-200 text-gray-200'
                )}
              />
            ))}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {total} {total === 1 ? 'avaliação' : 'avaliações'}
          </p>
        </div>

        <div className="flex-1 space-y-2">
          {distribution.map(({ rating, count, percentage }) => (
            <div key={rating} className="flex items-center gap-2">
              <span className="text-sm text-gray-600 w-3">{rating}</span>
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-yellow-400 rounded-full transition-all duration-500"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="text-xs text-gray-500 w-8 text-right">{count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 text-center text-sm">
        <div>
          <p className="font-semibold text-green-600">
            {distribution.filter(d => d.rating >= 4).reduce((acc, d) => acc + d.count, 0)}
          </p>
          <p className="text-xs text-gray-500">Positivas</p>
        </div>
        <div>
          <p className="font-semibold text-yellow-600">
            {distribution.find(d => d.rating === 3)?.count || 0}
          </p>
          <p className="text-xs text-gray-500">Neutras</p>
        </div>
        <div>
          <p className="font-semibold text-red-600">
            {distribution.filter(d => d.rating <= 2).reduce((acc, d) => acc + d.count, 0)}
          </p>
          <p className="text-xs text-gray-500">Negativas</p>
        </div>
      </div>
    </div>
  );
}
