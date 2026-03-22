'use server';

import { getSupabaseAdminSingleton } from '@/lib/supabase-admin';
import { revalidatePath } from 'next/cache';
import { requireAuth } from '@/lib/auth-guard';

const supabase = getSupabaseAdminSingleton();

export async function openDispute(
  orderId: string,
  reason: string
) {
  const actor = await requireAuth();

  if (!reason || reason.trim().length === 0) {
    return { success: false, error: 'Motivo é obrigatório' };
  }

  const { error: disputeError } = await (supabase as any).from('disputes').insert({
    order_id: orderId,
    opened_by: actor.id,
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
    actor_id: actor.id,
  });

  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath('/admin/disputes');

  return { success: true };
}
