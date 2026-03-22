import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const errorParam = searchParams.get('error_description') || searchParams.get('error');

  // Se houver erro OAuth retornado pelo provider
  if (errorParam) {
    console.error('[auth/callback] OAuth error:', errorParam);
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(errorParam)}`
    );
  }

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error('[auth/callback] Exchange error:', exchangeError.message);
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(exchangeError.message)}`
      );
    }

    // Sessão estabelecida — buscar role do usuário para redirecionar
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      // Garantir que o usuário existe na tabela public.users
      const { data: existingUser } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      if (!existingUser) {
        // Usuário novo (primeiro login com Google) — criar registro
        const email = user.email || '';
        const displayName =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.user_metadata?.display_name ||
          email.split('@')[0] ||
          'Usuário';
        const avatarUrl =
          user.user_metadata?.avatar_url ||
          user.user_metadata?.picture ||
          null;

        await supabase.from('users').insert({
          id: user.id,
          email,
          display_name: displayName,
          role: 'user',
          reputation_score: 100,
        });

        if (avatarUrl) {
          await supabase.from('profiles').upsert({
            user_id: user.id,
            avatar_url: avatarUrl,
          });
        } else {
          await supabase.from('profiles').upsert({ user_id: user.id });
        }

        // Criar carteira
        await supabase.from('wallets').upsert({
          user_id: user.id,
          balance: 0,
          pending_balance: 0,
        });
      }

      const role = existingUser?.role ?? 'user';
      const redirectPath = role === 'admin' ? '/admin' : '/dashboard';
      console.log(`[auth/callback] Usuário ${user.email} → role:${role} → ${redirectPath}`);
      return NextResponse.redirect(`${origin}${redirectPath}`);
    }
  }

  // Sem código nem sessão — voltar para login
  console.error('[auth/callback] Sem código PKCE ou sessão');
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}
