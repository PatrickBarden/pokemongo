'use client';

import { StarRating } from './StarRating';
import { formatRelativeTime } from '@/lib/format';
import { User, Quote } from 'lucide-react';
import type { Review } from '@/server/actions/reviews';

interface ReviewListProps {
  reviews: Review[];
  emptyMessage?: string;
}

export function ReviewList({ reviews, emptyMessage = 'Nenhuma avaliação ainda' }: ReviewListProps) {
  if (reviews.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Quote className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <div
          key={review.id}
          className="bg-white rounded-lg border p-4 hover:shadow-sm transition-shadow"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
              <User className="h-5 w-5 text-gray-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <p className="font-medium text-gray-900 truncate">
                  {review.reviewer?.display_name || 'Usuário'}
                </p>
                <span className="text-xs text-gray-400">
                  {formatRelativeTime(review.created_at)}
                </span>
              </div>
              <StarRating rating={review.rating} size="sm" />
              {review.comment && (
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                  &quot;{review.comment}&quot;
                </p>
              )}
              <p className="mt-1 text-xs text-gray-400">
                {review.review_type === 'buyer_to_seller' ? 'Comprador' : 'Vendedor'}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
