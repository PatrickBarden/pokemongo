'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function getOrdersWithDetails() {
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select(`
      *,
      buyer:buyer_id (id, display_name, email),
      order_items (
        *,
        seller:seller_id (id, display_name, email, pix_key)
      )
    `)
    .order('created_at', { ascending: false });

  return { data, error };
}

export async function updateOrderStatusAdmin(orderId: string, newStatus: string) {
  const updateData: any = { 
    status: newStatus,
    updated_at: new Date().toISOString()
  };

  if (newStatus === 'completed') {
    updateData.completed_at = new Date().toISOString();
  }
  if (newStatus === 'cancelled') {
    updateData.cancelled_at = new Date().toISOString();
  }
  if (newStatus === 'payment_confirmed') {
    updateData.confirmed_at = new Date().toISOString();
  }

  const { data, error } = await supabaseAdmin
    .from('orders')
    .update(updateData)
    .eq('id', orderId)
    .select()
    .single();

  return { data, error };
}

export async function markPayoutCompleteAdmin(orderId: string) {
  const { data, error } = await supabaseAdmin
    .from('orders')
    .update({ 
      payout_completed: true, 
      payout_at: new Date().toISOString() 
    })
    .eq('id', orderId)
    .select()
    .single();

  return { data, error };
}

export async function deleteOrderAdmin(orderId: string) {
  console.log('Deletando order:', orderId);
  
  // Primeiro deletar os order_items
  const { error: itemsError } = await supabaseAdmin
    .from('order_items')
    .delete()
    .eq('order_id', orderId);

  if (itemsError) {
    console.error('Erro ao deletar order_items:', itemsError);
  }

  // Depois deletar a order
  const { error, data } = await supabaseAdmin
    .from('orders')
    .delete()
    .eq('id', orderId)
    .select();

  if (error) {
    console.error('Erro ao deletar order:', error);
  } else {
    console.log('Order deletada com sucesso:', data);
    revalidatePath('/admin/negotiations');
  }

  return { error, success: !error };
}
