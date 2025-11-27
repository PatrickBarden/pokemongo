'use server';

import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Cliente Admin para ignorar RLS
const supabaseAdmin = createClient<Database>(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

export async function getUserDetails(userId: string) {
  try {
    // 1. Dados Básicos e Perfil
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select(`
        *,
        profile:profiles(*)
      `)
      .eq('id', userId)
      .single();

    if (userError) throw userError;

    // 2. Últimos Pedidos (Compra e Venda)
    const { data: orders, error: ordersError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(10);

    if (ordersError) throw ordersError;

    // 3. Anúncios Ativos
    const { data: listings, error: listingsError } = await supabaseAdmin
      .from('listings')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (listingsError) throw listingsError;

    return { 
      user: user as any, 
      orders: orders || [], 
      listings: listings || [] 
    };

  } catch (error: any) {
    console.error('Erro ao buscar detalhes do usuário:', error);
    return { error: error.message };
  }
}

export async function updateUserAdmin(userId: string, data: any) {
  try {
    // Atualizar tabela users
    const { error: userError } = await supabaseAdmin
      .from('users')
      .update({
        display_name: data.display_name,
        role: data.role,
        reputation_score: data.reputation_score,
        banned_at: data.is_banned ? new Date().toISOString() : null
      } as any)
      .eq('id', userId);

    if (userError) throw userError;

    // Atualizar tabela profiles
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        region: data.region,
        contact: data.contact
      } as any)
      .eq('user_id', userId);

    if (profileError) throw profileError;

    return { success: true };
  } catch (error: any) {
    console.error('Erro ao atualizar usuário:', error);
    return { error: error.message };
  }
}
