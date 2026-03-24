'use client';

import { useState, useEffect, Suspense } from 'react';
import { supabaseClient } from '@/lib/supabase-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { ThemeToggle } from '@/components/theme-toggle';

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-poke-blue/5 via-background to-poke-yellow/5">
        <Loader2 className="h-8 w-8 animate-spin text-poke-blue" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();

  // Verificar erro de OAuth e sessão ao carregar a página
  // Com implicit flow, os tokens vêm no hash da URL (#access_token=...)
  // e detectSessionInUrl do Supabase captura automaticamente
  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) {
      setError(decodeURIComponent(errorParam));
      setLoadingGoogle(false);
    }
    
    // Listener para mudanças de auth (captura sessão do implicit flow)
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('[auth] SIGNED_IN detectado via implicit flow');
          await ensureUserExists(session.user);
          
          const { data: userData } = await supabaseClient
            .from('users')
            .select('role')
            .eq('id', session.user.id)
            .maybeSingle();
          
          const role = (userData as any)?.role || 'user';
          window.location.href = role === 'admin' ? '/admin' : '/dashboard';
        }
      }
    );
    
    // Verificar se já tem sessão ativa (login normal ou refresh)
    const checkSession = async () => {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (session?.user) {
        const { data: userData } = await supabaseClient
          .from('users')
          .select('role')
          .eq('id', session.user.id)
          .maybeSingle();
        
        if ((userData as any)?.role === 'admin') {
          router.replace('/admin');
        } else {
          router.replace('/dashboard');
        }
      }
    };
    
    checkSession();
    
    return () => { subscription.unsubscribe(); };
  }, [searchParams, router]);

  // Garantir que o usuário existe na tabela public.users (primeiro login Google)
  const ensureUserExists = async (user: any) => {
    try {
      const { data: existingUser } = await supabaseClient
        .from('users')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (!existingUser) {
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

        await (supabaseClient as any).from('users').insert({
          id: user.id,
          email,
          display_name: displayName,
          role: 'user',
          reputation_score: 100,
        });

        if (avatarUrl) {
          await (supabaseClient as any).from('profiles').upsert({
            user_id: user.id,
            avatar_url: avatarUrl,
          });
        } else {
          await (supabaseClient as any).from('profiles').upsert({ user_id: user.id });
        }

        await (supabaseClient as any).from('wallets').upsert({
          user_id: user.id,
          balance: 0,
          pending_balance: 0,
        });

        console.log('[auth] Novo usuário Google criado:', email);
      }
    } catch (err) {
      console.error('[auth] Erro ao garantir usuário:', err);
    }
  };

  const handleGoogleLogin = async () => {
    setLoadingGoogle(true);
    setError('');

    try {
      // Fluxo PKCE: redirecionar para endpoint de callback no servidor onde os cookies serão definidos
      const redirectTo = `${window.location.origin}/auth/callback`;
      
      const { error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
        },
      });

      if (error) {
        console.error('OAuth error:', error);
        setError(error.message || 'Erro ao iniciar login com Google');
        setLoadingGoogle(false);
      }
    } catch (e: any) {
      console.error('Google login error:', e);
      setError(e?.message || 'Erro ao iniciar login com Google');
      setLoadingGoogle(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        await new Promise(resolve => setTimeout(resolve, 500));

        const { data: userData, error: userError } = await supabaseClient
          .from('users')
          .select('role')
          .eq('id', data.user.id)
          .maybeSingle();

        if (userError) {
          console.error('Error fetching user:', userError);
          setError(`Erro ao buscar dados do usuário: ${userError.message}`);
          setLoading(false);
          return;
        }

        // Usuário existe no Auth mas não na tabela users — redirecionar para dashboard
        // O middleware vai redirecionar corretamente; não bloquear o login
        if (!userData) {
          console.warn('Usuário não encontrado em public.users. Redirecionando para dashboard...');
          window.location.href = '/dashboard';
          return;
        }
        
        if ((userData as any)?.role === 'admin') {
          window.location.href = '/admin';
        } else {
          window.location.href = '/dashboard';
        }
      }
    } catch (error: any) {
      console.error('Login error:', error);
      setError(error.message || 'Erro ao fazer login');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-poke-blue/5 via-background to-poke-yellow/5">
      {/* Header */}
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4 pt-16 pb-8">
        <div className="w-full max-w-sm space-y-6">
          {/* Logo e Título */}
          <div className="text-center space-y-2">
            <div className="flex justify-center mb-4">
              <Logo size="lg" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              Bem-vindo de volta!
            </h1>
            <p className="text-sm text-muted-foreground">
              Entre na sua conta para continuar
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-2">
              <AlertDescription className="text-sm">{error}</AlertDescription>
            </Alert>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="pl-10 h-12 bg-background border-border/50 focus:border-poke-blue transition-colors"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Senha
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="pl-10 pr-10 h-12 bg-background border-border/50 focus:border-poke-blue transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-poke-blue hover:bg-poke-blue/90 text-white font-semibold rounded-xl shadow-lg shadow-poke-blue/25 transition-all hover:shadow-xl hover:shadow-poke-blue/30"
              disabled={loading || loadingGoogle}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/50" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-3 text-muted-foreground">ou continue com</span>
            </div>
          </div>

          {/* Google Button */}
          <Button
            type="button"
            variant="outline"
            className="w-full h-12 border-border/50 hover:bg-accent hover:border-border rounded-xl font-medium transition-all"
            onClick={handleGoogleLogin}
            disabled={loading || loadingGoogle}
          >
            {loadingGoogle ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Conectando...
              </>
            ) : (
              <>
                <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continuar com Google
              </>
            )}
          </Button>

          {/* Sign Up Link */}
          <p className="text-center text-sm text-muted-foreground">
            Não tem uma conta?{' '}
            <Link href="/signup" className="text-poke-blue hover:underline font-semibold">
              Criar conta
            </Link>
          </p>

        </div>
      </div>
    </div>
  );
}
