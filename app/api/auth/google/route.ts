import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET(request: NextRequest) {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  // Determinar a URL de redirect baseada no origin da requisição
  const origin = request.headers.get('origin') || request.nextUrl.origin;
  const redirectTo = `${origin}/auth/callback`;
  
  console.log('=== Iniciando OAuth Google ===');
  console.log('Origin:', origin);
  console.log('Redirect URL:', redirectTo);
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      scopes: 'email profile',
    },
  });

  if (error) {
    console.error('OAuth error:', error);
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
  }

  if (data.url) {
    console.log('Redirecionando para:', data.url);
    return NextResponse.redirect(data.url);
  }

  return NextResponse.redirect(`${origin}/login?error=no_oauth_url`);
}
