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
    
    // Disparar ambas as queries em paralelo
    const [usersResult, authResult] = await Promise.all([
      supabase
        .from('users')
        .select(`
          *,
          profile:profiles(region, contact, avatar_url)
        `)
        .order('created_at', { ascending: false }),
      supabase.auth.admin.listUsers().catch((err) => {
        console.error('Erro ao buscar usuários do auth:', err);
        return { data: { users: [] }, error: err };
      }),
    ]);

    if (usersResult.error) {
      console.error('Erro ao buscar usuários:', usersResult.error);
      return NextResponse.json({ users: [], error: usersResult.error.message });
    }

    const data = usersResult.data || [];

    // Verificar se algum usuário precisa de fallback de avatar
    const needsFallback = data.some((user: any) => !user.profile?.avatar_url);

    let authUsersMap = new Map<string, string | null>();
    if (needsFallback) {
      const authUsers = (authResult as any)?.data?.users || [];
      authUsersMap = new Map(
        authUsers.map((authUser: any) => [
          authUser.id,
          authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || null,
        ])
      );
    }

    const usersWithAvatarFallback = data.map((user: any) => {
      const profile = user.profile || null;
      const hasAvatar = !!profile?.avatar_url;

      return {
        ...user,
        profile: {
          region: profile?.region || null,
          contact: profile?.contact || null,
          avatar_url: hasAvatar ? profile.avatar_url : (authUsersMap.get(user.id) || null),
        },
      };
    });

    return NextResponse.json({ users: usersWithAvatarFallback });
  } catch (err: any) {
    console.error('Erro:', err);
    return NextResponse.json({ users: [], error: err.message }, { status: 500 });
  }
}
