'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

// Criar cliente dentro da função para garantir que as env vars estejam disponíveis
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !key) {
    console.error('Missing Supabase credentials:', { url: !!url, key: !!key });
    throw new Error('Missing Supabase credentials');
  }
  
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

export async function getOrdersWithDetails() {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    
    // Query simplificada primeiro
    const { data: ordersRaw, error: ordersError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (ordersError) {
      console.error('Erro ao buscar orders:', ordersError);
      return { data: null, error: ordersError };
    }

    // Buscar buyers e items separadamente
    const orders = await Promise.all((ordersRaw || []).map(async (order) => {
      // Buscar buyer
      const { data: buyer } = await supabaseAdmin
        .from('users')
        .select('id, display_name, email')
        .eq('id', order.buyer_id)
        .single();

      // Buscar order_items com seller
      const { data: items } = await supabaseAdmin
        .from('order_items')
        .select('*, seller:seller_id (id, display_name, email, pix_key)')
        .eq('order_id', order.id);

      return {
        ...order,
        buyer,
        order_items: items || []
      };
    }));

    console.log('SERVER: Orders encontradas:', orders.length);
    return { data: orders, error: null };
  } catch (err) {
    console.error('Erro ao conectar com Supabase:', err);
    return { data: null, error: err };
  }
}

export async function updateOrderStatusAdmin(orderId: string, newStatus: string) {
  const supabaseAdmin = getSupabaseAdmin();
  
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
  const supabaseAdmin = getSupabaseAdmin();
  
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
  const supabaseAdmin = getSupabaseAdmin();
  
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
