import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    
    const { data, error } = await supabase
      .from('order_conversations')
      .select(`
        *,
        order:order_id(id, order_number, status, amount_total),
        buyer:buyer_id(id, display_name, email),
        seller:seller_id(id, display_name, email),
        admin:admin_id(id, display_name)
      `)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar conversas:', error);
      return NextResponse.json({ conversations: [], error: error.message });
    }

    return NextResponse.json({ conversations: data || [] });
  } catch (err: any) {
    console.error('Erro:', err);
    return NextResponse.json({ conversations: [], error: err.message }, { status: 500 });
  }
}
