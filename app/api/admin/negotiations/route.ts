import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !key) {
    throw new Error('Missing Supabase credentials');
  }
  
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    
    // Query simplificada primeiro
    const { data: ordersRaw, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (ordersError) {
      console.error('Erro ao buscar orders:', ordersError);
      return NextResponse.json({ orders: [], error: ordersError.message });
    }

    // Buscar buyers e items separadamente
    const orders = await Promise.all((ordersRaw || []).map(async (order) => {
      // Buscar buyer
      const { data: buyer } = await supabase
        .from('users')
        .select('id, display_name, email')
        .eq('id', order.buyer_id)
        .single();

      // Buscar order_items com seller
      const { data: items } = await supabase
        .from('order_items')
        .select('*, seller:seller_id (id, display_name, email, pix_key)')
        .eq('order_id', order.id);

      return {
        ...order,
        buyer,
        order_items: items || []
      };
    }));

    return NextResponse.json({ orders });
  } catch (err: any) {
    console.error('Erro ao conectar com Supabase:', err);
    return NextResponse.json({ orders: [], error: err.message }, { status: 500 });
  }
}
