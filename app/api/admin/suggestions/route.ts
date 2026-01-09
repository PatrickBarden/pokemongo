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
      .from('suggestions')
      .select(`
        *,
        user:user_id(id, display_name, email)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar sugestões:', error);
      return NextResponse.json({ suggestions: [], error: error.message });
    }

    // Buscar estatísticas
    const stats = {
      total: data?.length || 0,
      pending: data?.filter(s => s.status === 'pending').length || 0,
      reviewing: data?.filter(s => s.status === 'reviewing').length || 0,
      approved: data?.filter(s => s.status === 'approved').length || 0,
      implemented: data?.filter(s => s.status === 'implemented').length || 0,
      rejected: data?.filter(s => s.status === 'rejected').length || 0,
    };

    return NextResponse.json({ suggestions: data || [], stats });
  } catch (err: any) {
    console.error('Erro:', err);
    return NextResponse.json({ suggestions: [], stats: {}, error: err.message }, { status: 500 });
  }
}
