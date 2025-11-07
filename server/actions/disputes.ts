'use server';

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

export async function openDispute(
  orderId: string,
  openedBy: string,
  reason: string
) {
  if (!reason || reason.trim().length === 0) {
    return { success: false, error: 'Motivo é obrigatório' };
  }

  const { error: disputeError } = await (supabase as any).from('disputes').insert({
    order_id: orderId,
    opened_by: openedBy,
    reason,
    status: 'OPEN',
  });

  if (disputeError) {
    return { success: false, error: disputeError.message };
  }

  const { error: orderError } = await (supabase.from('orders') as any)
    .update({
      status: 'DISPUTE',
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId);

  if (orderError) {
    return { success: false, error: orderError.message };
  }

  await (supabase as any).from('order_events').insert({
    order_id: orderId,
    type: 'DISPUTE_OPENED',
    data: { reason },
    actor_id: openedBy,
  });

  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath('/admin/disputes');

  return { success: true };
}
