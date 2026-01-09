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
    
    // Buscar usuários com role 'mod'
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, display_name, role, created_at')
      .eq('role', 'mod')
      .order('created_at', { ascending: false });

    if (usersError) {
      console.error('Erro ao listar moderadores:', usersError);
      return NextResponse.json({ moderators: [] });
    }

    if (!users || users.length === 0) {
      return NextResponse.json({ moderators: [] });
    }

    // Buscar permissões separadamente
    const userIds = users.map(u => u.id);
    const { data: permissions, error: permError } = await supabase
      .from('moderator_permissions')
      .select('*')
      .in('user_id', userIds);

    if (permError) {
      console.error('Erro ao buscar permissões:', permError);
    }

    // Mapear permissões para usuários
    const moderators = users.map((user: any) => ({
      ...user,
      permissions: permissions?.find(p => p.user_id === user.id) || null
    }));

    return NextResponse.json({ moderators });
  } catch (error) {
    console.error('Erro ao carregar moderadores:', error);
    return NextResponse.json({ moderators: [], error: 'Internal error' }, { status: 500 });
  }
}
