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
      .from('listings')
      .select(`
        *,
        owner:owner_id (
          id,
          display_name,
          email
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar listings:', error);
      return NextResponse.json({ listings: [], error: error.message });
    }

    return NextResponse.json({ listings: data || [] });
  } catch (err: any) {
    console.error('Erro ao conectar com Supabase:', err);
    return NextResponse.json({ listings: [], error: err.message }, { status: 500 });
  }
}
