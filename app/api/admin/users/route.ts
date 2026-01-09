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
      .from('users')
      .select(`
        *,
        profile:profiles(region, contact)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar usuários:', error);
      return NextResponse.json({ users: [], error: error.message });
    }

    return NextResponse.json({ users: data || [] });
  } catch (err: any) {
    console.error('Erro:', err);
    return NextResponse.json({ users: [], error: err.message }, { status: 500 });
  }
}
