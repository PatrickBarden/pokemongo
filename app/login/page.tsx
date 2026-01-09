'use client';

import { useState, useEffect } from 'react';
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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();

  // Verificar erro de OAuth ao carregar a página
  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) {
      setError(decodeURIComponent(errorParam));
      setLoadingGoogle(false);
    }
    
    // Verificar se já tem sessão ativa
    const checkSession = async () => {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (session?.user) {
        console.log('Sessão ativa encontrada, redirecionando...');
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
  }, [searchParams, router]);

  const handleGoogleLogin = async () => {
    setLoadingGoogle(true);
    setError('');

    try {
      console.log('=== Google Login ===');
      console.log('Origin:', window.location.origin);
      
      // Detectar se está no emulador Android (Capacitor)
      const isCapacitor = window.location.origin.includes('10.0.2.2') || 
                          window.location.origin.includes('capacitor://') ||
                          window.location.origin.includes('localhost') && navigator.userAgent.includes('Android');
      
      // Para Android/Capacitor, usar deep link; para web, usar callback normal
      const redirectTo = isCapacitor 
        ? 'tgppokemon://auth/callback'
        : `${window.location.origin}/auth/callback`;
      
      console.log('Is Capacitor:', isCapacitor);
      console.log('Redirect URL:', redirectTo);
      
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
          .single();

        if (userError) {
          console.error('Error fetching user:', userError);
          setError(`Erro ao buscar dados do usuário: ${userError.message}`);
          setLoading(false);
          return;
        }

        if (!userData) {
          setError('Usuário não encontrado no sistema.');
          setLoading(false);
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

          {/* Admin Access (Development) */}
          <div className="p-3 bg-muted/50 rounded-xl border border-border/50">
            <p className="text-[10px] text-center text-muted-foreground mb-1">🔐 Acesso Admin (dev)</p>
            <p className="text-[10px] text-center font-mono text-muted-foreground">admin@admin.com / 123456</p>
          </div>
        </div>
      </div>
    </div>
  );
}
