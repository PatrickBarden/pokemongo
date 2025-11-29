'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { StarRating } from './StarRating';
import { createReview } from '@/server/actions/reviews';
import { Loader2, Send, CheckCircle } from 'lucide-react';

interface ReviewFormProps {
  orderId: string;
  reviewerId: string;
  reviewedId: string;
  reviewedName: string;
  reviewType: 'buyer_to_seller' | 'seller_to_buyer';
  onSuccess?: () => void;
}

export function ReviewForm({
  orderId,
  reviewerId,
  reviewedId,
  reviewedName,
  reviewType,
  onSuccess
}: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (rating === 0) {
      setError('Por favor, selecione uma avaliação');
      return;
    }

    setLoading(true);
    setError('');

    const result = await createReview(
      orderId,
      reviewerId,
      reviewedId,
      rating,
      comment,
      reviewType
    );

    setLoading(false);

    if (result.success) {
      setSuccess(true);
      onSuccess?.();
    } else {
      setError(result.error || 'Erro ao enviar avaliação');
    }
  };

  if (success) {
    return (
      <div className="text-center py-6">
        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
        <h3 className="font-semibold text-lg text-gray-900">Avaliação Enviada!</h3>
        <p className="text-gray-600 text-sm mt-1">
          Obrigado por avaliar {reviewedName}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Como foi sua experiência com {reviewedName}?
        </label>
        <div className="flex justify-center py-2">
          <StarRating
            rating={rating}
            size="lg"
            interactive
            onRatingChange={setRating}
          />
        </div>
        {rating > 0 && (
          <p className="text-center text-sm text-gray-500 mt-1">
            {rating === 1 && 'Péssimo'}
            {rating === 2 && 'Ruim'}
            {rating === 3 && 'Regular'}
            {rating === 4 && 'Bom'}
            {rating === 5 && 'Excelente!'}
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Comentário (opcional)
        </label>
        <Textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Conte como foi a negociação..."
          rows={3}
          maxLength={500}
        />
        <p className="text-xs text-gray-400 mt-1 text-right">
          {comment.length}/500
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>
      )}

      <Button
        type="submit"
        disabled={loading || rating === 0}
        className="w-full"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Enviando...
          </>
        ) : (
          <>
            <Send className="h-4 w-4 mr-2" />
            Enviar Avaliação
          </>
        )}
      </Button>
    </form>
  );
}
