'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { notifyNewReview } from './push-notifications';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

export type Review = {
  id: string;
  order_id: string;
  reviewer_id: string;
  reviewed_id: string;
  rating: number;
  comment: string | null;
  review_type: 'buyer_to_seller' | 'seller_to_buyer';
  is_public: boolean;
  created_at: string;
  reviewer?: {
    display_name: string;
    avatar_url?: string;
  };
};

export type UserStats = {
  id: string;
  display_name: string;
  reputation_score: number;
  total_sales: number;
  total_purchases: number;
  total_reviews_received: number;
  average_rating: number;
  seller_level: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  verified_seller: boolean;
  last_sale_at: string | null;
};

// Criar uma avaliação
export async function createReview(
  orderId: string,
  reviewerId: string,
  reviewedId: string,
  rating: number,
  comment: string,
  reviewType: 'buyer_to_seller' | 'seller_to_buyer'
): Promise<{ success: boolean; error?: string; review?: Review }> {
  try {
    // Validar rating
    if (rating < 1 || rating > 5) {
      return { success: false, error: 'Avaliação deve ser entre 1 e 5 estrelas' };
    }

    // Verificar se o pedido existe e está completo
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, status, buyer_id, seller_id')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return { success: false, error: 'Pedido não encontrado' };
    }

    if (order.status !== 'completed') {
      return { success: false, error: 'Só é possível avaliar pedidos concluídos' };
    }

    // Verificar se o usuário participou do pedido
    if (order.buyer_id !== reviewerId && order.seller_id !== reviewerId) {
      return { success: false, error: 'Você não participou deste pedido' };
    }

    // Verificar se já existe avaliação
    const { data: existingReview } = await supabaseAdmin
      .from('reviews')
      .select('id')
      .eq('order_id', orderId)
      .eq('reviewer_id', reviewerId)
      .single();

    if (existingReview) {
      return { success: false, error: 'Você já avaliou este pedido' };
    }

    // Criar avaliação
    const { data: review, error: reviewError } = await supabaseAdmin
      .from('reviews')
      .insert({
        order_id: orderId,
        reviewer_id: reviewerId,
        reviewed_id: reviewedId,
        rating,
        comment: comment || null,
        review_type: reviewType,
        is_public: true
      })
      .select()
      .single();

    if (reviewError) {
      console.error('Erro ao criar avaliação:', reviewError);
      return { success: false, error: 'Erro ao criar avaliação' };
    }

    // Criar notificação para o usuário avaliado
    await supabaseAdmin
      .from('admin_notifications')
      .insert({
        type: 'new_user',
        title: '⭐ Nova Avaliação Recebida',
        description: `Você recebeu uma avaliação de ${rating} estrelas`,
        severity: rating >= 4 ? 'low' : 'medium',
        link: `/dashboard/profile`,
        metadata: { review_id: review.id, rating }
      });

    // Enviar push notification para o usuário avaliado
    try {
      const { data: reviewer } = await supabaseAdmin
        .from('users')
        .select('display_name')
        .eq('id', reviewerId)
        .single();
      
      const reviewerName = (reviewer as any)?.display_name || 'Um usuário';
      notifyNewReview(reviewedId, reviewerName, rating).catch(console.error);
    } catch (pushError) {
      console.error('Erro ao enviar push de avaliação:', pushError);
    }

    revalidatePath('/dashboard/orders');
    revalidatePath('/dashboard/profile');
    revalidatePath('/admin/users');

    return { success: true, review };
  } catch (error) {
    console.error('Erro ao criar avaliação:', error);
    return { success: false, error: 'Erro interno do servidor' };
  }
}

// Buscar avaliações de um usuário
export async function getUserReviews(
  userId: string,
  limit: number = 10
): Promise<{ reviews: Review[]; stats: UserStats | null }> {
  try {
    // Buscar avaliações recebidas
    const { data: reviews, error: reviewsError } = await supabaseAdmin
      .from('reviews')
      .select(`
        *,
        reviewer:reviewer_id(display_name)
      `)
      .eq('reviewed_id', userId)
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (reviewsError) {
      console.error('Erro ao buscar avaliações:', reviewsError);
      return { reviews: [], stats: null };
    }

    // Buscar stats do usuário
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select(`
        id,
        display_name,
        reputation_score,
        total_sales,
        total_purchases,
        total_reviews_received,
        average_rating,
        seller_level,
        verified_seller,
        last_sale_at
      `)
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('Erro ao buscar stats:', userError);
    }

    const formattedReviews = (reviews || []).map((r: any) => ({
      ...r,
      reviewer: {
        display_name: r.reviewer?.display_name || 'Usuário'
      }
    }));

    return {
      reviews: formattedReviews,
      stats: user as UserStats | null
    };
  } catch (error) {
    console.error('Erro ao buscar avaliações:', error);
    return { reviews: [], stats: null };
  }
}

// Verificar se pode avaliar um pedido
export async function canReviewOrder(
  orderId: string,
  userId: string
): Promise<{ canReview: boolean; reviewType?: 'buyer_to_seller' | 'seller_to_buyer'; targetUserId?: string }> {
  try {
    // Buscar pedido
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('id, status, buyer_id, seller_id')
      .eq('id', orderId)
      .single();

    if (!order || order.status !== 'completed') {
      return { canReview: false };
    }

    // Verificar se já avaliou
    const { data: existingReview } = await supabaseAdmin
      .from('reviews')
      .select('id')
      .eq('order_id', orderId)
      .eq('reviewer_id', userId)
      .single();

    if (existingReview) {
      return { canReview: false };
    }

    // Determinar tipo de avaliação
    if (order.buyer_id === userId) {
      return {
        canReview: true,
        reviewType: 'buyer_to_seller',
        targetUserId: order.seller_id
      };
    } else if (order.seller_id === userId) {
      return {
        canReview: true,
        reviewType: 'seller_to_buyer',
        targetUserId: order.buyer_id
      };
    }

    return { canReview: false };
  } catch (error) {
    console.error('Erro ao verificar avaliação:', error);
    return { canReview: false };
  }
}

// Buscar ranking de vendedores
export async function getTopSellers(limit: number = 10): Promise<UserStats[]> {
  try {
    const { data: sellers, error } = await supabaseAdmin
      .from('users')
      .select(`
        id,
        display_name,
        reputation_score,
        total_sales,
        total_purchases,
        total_reviews_received,
        average_rating,
        seller_level,
        verified_seller,
        last_sale_at
      `)
      .gt('total_sales', 0)
      .order('reputation_score', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Erro ao buscar top sellers:', error);
      return [];
    }

    return sellers || [];
  } catch (error) {
    console.error('Erro ao buscar top sellers:', error);
    return [];
  }
}

// Buscar estatísticas de avaliações de um pedido
export async function getOrderReviews(orderId: string): Promise<{
  buyerReview: Review | null;
  sellerReview: Review | null;
}> {
  try {
    const { data: reviews } = await supabaseAdmin
      .from('reviews')
      .select(`
        *,
        reviewer:reviewer_id(display_name)
      `)
      .eq('order_id', orderId);

    const buyerReview = reviews?.find(r => r.review_type === 'buyer_to_seller') || null;
    const sellerReview = reviews?.find(r => r.review_type === 'seller_to_buyer') || null;

    return { buyerReview, sellerReview };
  } catch (error) {
    console.error('Erro ao buscar avaliações do pedido:', error);
    return { buyerReview: null, sellerReview: null };
  }
}

// Calcular distribuição de avaliações
export async function getReviewDistribution(userId: string): Promise<{
  distribution: { rating: number; count: number; percentage: number }[];
  total: number;
}> {
  try {
    const { data: reviews } = await supabaseAdmin
      .from('reviews')
      .select('rating')
      .eq('reviewed_id', userId);

    if (!reviews || reviews.length === 0) {
      return {
        distribution: [
          { rating: 5, count: 0, percentage: 0 },
          { rating: 4, count: 0, percentage: 0 },
          { rating: 3, count: 0, percentage: 0 },
          { rating: 2, count: 0, percentage: 0 },
          { rating: 1, count: 0, percentage: 0 },
        ],
        total: 0
      };
    }

    const total = reviews.length;
    const counts = [5, 4, 3, 2, 1].map(rating => ({
      rating,
      count: reviews.filter(r => r.rating === rating).length,
      percentage: Math.round((reviews.filter(r => r.rating === rating).length / total) * 100)
    }));

    return { distribution: counts, total };
  } catch (error) {
    console.error('Erro ao calcular distribuição:', error);
    return {
      distribution: [],
      total: 0
    };
  }
}
