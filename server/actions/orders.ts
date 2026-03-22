'use server';

import { getSupabaseAdminSingleton } from '@/lib/supabase-admin';
import { transitionOrderStatus } from '@/lib/order-status';
import { revalidatePath } from 'next/cache';
import { notifyOrderStatus, notifyPaymentReceived } from './push-notifications';
import { requireAdmin, requireAdminOrMod } from '@/lib/auth-guard';

const supabase = getSupabaseAdminSingleton();

export async function requestReview(orderId: string) {
  const actor = await requireAdminOrMod();

  const { data: order, error: fetchError } = await (supabase.from('orders') as any)
    .select('status')
    .eq('id', orderId)
    .single();

  if (fetchError || !order) {
    return { success: false, error: 'Ordem não encontrada' };
  }

  if ((order as any).status !== 'DELIVERY_SUBMITTED') {
    return { success: false, error: 'Ordem não tem entrega enviada' };
  }

  try {
    await transitionOrderStatus({
      orderId,
      nextStatus: 'IN_REVIEW',
      changedBy: actor.id,
      reason: 'Review requested by actor',
      metadata: {}
    });
  } catch (error: any) {
    return { success: false, error: error.message };
  }

  await (supabase as any).from('order_events').insert({
    order_id: orderId,
    type: 'REVIEW_STARTED',
    data: {},
    actor_id: actor.id,
  });

  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${orderId}`);

  return { success: true };
}

export async function completeOrder(
  orderId: string,
  payoutData: { method: 'PIX' | 'SPLIT'; amount: number; reference?: string }
) {
  const actor = await requireAdmin();

  const { data: order, error: fetchError } = await (supabase.from('orders') as any)
    .select('status, seller_id')
    .eq('id', orderId)
    .single();

  if (fetchError || !order) {
    return { success: false, error: 'Ordem não encontrada' };
  }

  if ((order as any).status !== 'IN_REVIEW') {
    return { success: false, error: 'Ordem não está em revisão' };
  }

  try {
    await transitionOrderStatus({
      orderId,
      nextStatus: 'COMPLETED',
      changedBy: actor.id,
      reason: 'Order completed by admin flow',
      metadata: { payout_method: payoutData.method, payout_amount: payoutData.amount }
    });
  } catch (error: any) {
    return { success: false, error: error.message };
  }

  const { error: payoutError } = await (supabase as any).from('payouts').insert({
    order_id: orderId,
    seller_id: (order as any).seller_id,
    method: payoutData.method,
    amount: payoutData.amount,
    reference: payoutData.reference,
    status: 'PENDING',
  });

  if (payoutError) {
    return { success: false, error: payoutError.message };
  }

  await (supabase as any).from('order_events').insert({
    order_id: orderId,
    type: 'ORDER_COMPLETED',
    data: {},
    actor_id: actor.id,
  });

  // Enviar push notifications
  try {
    // Buscar dados do pedido para notificar
    const { data: orderDetails } = await (supabase.from('orders') as any)
      .select('buyer_id, seller_id, total_amount')
      .eq('id', orderId)
      .single();
    
    if (orderDetails) {
      // Notificar vendedor sobre pagamento recebido
      notifyPaymentReceived(
        (orderDetails as any).seller_id, 
        payoutData.amount, 
        orderId
      ).catch(console.error);
      
      // Notificar comprador sobre pedido concluído
      notifyOrderStatus(
        (orderDetails as any).buyer_id,
        orderId,
        'COMPLETED',
        'Seu pedido foi concluído com sucesso! 🎉'
      ).catch(console.error);
    }
  } catch (pushError) {
    console.error('Erro ao enviar push de pedido concluído:', pushError);
  }

  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${orderId}`);

  return { success: true };
}

export async function cancelAndRefund(
  orderId: string,
  reason: string
) {
  const actor = await requireAdmin();

  if (!reason || reason.trim().length === 0) {
    return { success: false, error: 'Motivo é obrigatório' };
  }

  try {
    await transitionOrderStatus({
      orderId,
      nextStatus: 'CANCELLED',
      changedBy: actor.id,
      reason,
      metadata: { source: 'cancel_and_refund' }
    });
  } catch (error: any) {
    return { success: false, error: error.message };
  }

  await (supabase as any).from('order_events').insert({
    order_id: orderId,
    type: 'ORDER_CANCELLED',
    data: { reason },
    actor_id: actor.id,
  });

  // Enviar push notification sobre cancelamento
  try {
    const { data: orderDetails } = await (supabase.from('orders') as any)
      .select('buyer_id, seller_id')
      .eq('id', orderId)
      .single();
    
    if (orderDetails) {
      // Notificar comprador
      notifyOrderStatus(
        (orderDetails as any).buyer_id,
        orderId,
        'CANCELLED',
        `Pedido cancelado: ${reason}`
      ).catch(console.error);
      
      // Notificar vendedor
      notifyOrderStatus(
        (orderDetails as any).seller_id,
        orderId,
        'CANCELLED',
        `Pedido cancelado: ${reason}`
      ).catch(console.error);
    }
  } catch (pushError) {
    console.error('Erro ao enviar push de cancelamento:', pushError);
  }

  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${orderId}`);

  return { success: true };
}

export async function sendMessage(
  orderId: string,
  text: string
) {
  const actor = await requireAdminOrMod();

  const { error } = await (supabase as any).from('messages').insert({
    order_id: orderId,
    sender_id: actor.id,
    text,
    attachments: [],
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/admin/orders/${orderId}`);

  return { success: true };
}
