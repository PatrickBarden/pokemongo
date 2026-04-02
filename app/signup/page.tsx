'use client';

import { useState } from 'react';
import { supabaseClient } from '@/lib/supabase-client';
import { signUpUserComplete } from '@/server/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, Lock, User, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { Logo } from '@/components/Logo';

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const passwordRequirements = [
    { met: password.length >= 6, text: 'Mínimo 6 caracteres' },
    { met: /[A-Z]/.test(password), text: 'Uma letra maiúscula' },
    { met: /[0-9]/.test(password), text: 'Um número' },
  ];

  const isPasswordValid = password.length >= 6;

  const handleGoogleSignup = async () => {
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
        setError(error.message || 'Erro ao conectar com Google');
        setLoadingGoogle(false);
      }
    } catch (e: any) {
      setError(e?.message || 'Erro ao conectar com Google');
      setLoadingGoogle(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!isPasswordValid) {
      setError('A senha deve ter pelo menos 6 caracteres');
      setLoading(false);
      return;
    }

    try {
      const result = await signUpUserComplete(email, password, displayName);

      if (result.success) {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        if (data.user) {
          const { data: userData } = await supabaseClient
            .from('users')
            .select('role')
            .eq('id', data.user.id)
            .maybeSingle();

          if ((userData as any)?.role === 'admin') {
            window.location.href = '/admin';
          } else {
            window.location.href = '/dashboard';
          }
        }
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      setError(error.message || 'Erro ao criar conta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden flex flex-col">

      {/* Background — mobile usa bg-login.png, desktop usa background-desktop.png */}
      <div className="absolute inset-0 z-0">
        <img
          src="/bg-login.png"
          alt=""
          className="md:hidden w-full h-full object-cover object-top"
          aria-hidden
        />
        <img
          src="/background-desktop.png"
          alt=""
          className="hidden md:block w-full h-full object-cover object-center"
          aria-hidden
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-black/20 to-black/80" />
      </div>

      {/* Conteúdo */}
      <div className="relative z-10 flex flex-col min-h-screen">

        {/* Spacer mobile — expõe logo da imagem de fundo */}
        <div className="flex-1 max-h-[30vh] md:hidden" />

        {/* Form — mobile na base; desktop centralizado */}
        <div className="px-5 pb-8 pt-2 md:absolute md:inset-x-0 md:bottom-0 md:flex md:justify-center md:pb-16">
          <div className="w-full md:max-w-sm">

            {/* Card glass — título dentro do card */}
            <div className="rounded-3xl border border-white/12 bg-black/20 backdrop-blur-2xl shadow-2xl shadow-black/40 p-5 space-y-3">

              {/* Título dentro do card */}
              <div className="text-center">
                <h1 className="text-xl font-bold text-white">Criar sua conta</h1>
              </div>

              {error && (
                <Alert className="bg-red-500/20 border-red-400/30 animate-in fade-in slide-in-from-top-2">
                  <AlertDescription className="text-sm text-white">{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSignup} className="space-y-2">
                <div className="space-y-1.5">
                  <Label className="text-white/70 text-xs font-semibold tracking-widest uppercase">Nome de treinador</Label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 pointer-events-none" />
                    <Input
                      id="displayName"
                      type="text"
                      placeholder="Seu nome"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      required
                      disabled={loading}
                      className="pl-10 h-10 rounded-xl bg-white/10 border-white/20 text-white placeholder:text-white/35 focus-visible:ring-0 focus-visible:border-white/50 focus-visible:bg-white/15 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-white/70 text-xs font-semibold tracking-widest uppercase">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 pointer-events-none" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={loading}
                      className="pl-10 h-10 rounded-xl bg-white/10 border-white/20 text-white placeholder:text-white/35 focus-visible:ring-0 focus-visible:border-white/50 focus-visible:bg-white/15 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-white/70 text-xs font-semibold tracking-widest uppercase">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 pointer-events-none" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading}
                      className="pl-10 pr-11 h-10 rounded-xl bg-white/10 border-white/20 text-white placeholder:text-white/35 focus-visible:ring-0 focus-visible:border-white/50 focus-visible:bg-white/15 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {password && (
                    <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
                      {passwordRequirements.map((req, i) => (
                        <div key={i} className="flex items-center gap-1">
                          <CheckCircle2 className={`h-3 w-3 ${req.met ? 'text-emerald-400' : 'text-white/25'}`} />
                          <span className={`text-[10px] ${req.met ? 'text-emerald-400' : 'text-white/40'}`}>{req.text}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={loading || loadingGoogle || !isPasswordValid}
                  className="w-full h-11 rounded-xl bg-poke-blue hover:bg-poke-blue/90 text-white font-bold text-base shadow-lg shadow-blue-600/40 hover:shadow-blue-600/60 hover:scale-[1.01] active:scale-[0.98] transition-all mt-1"
                >
                  {loading ? (
                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Criando conta...</>
                  ) : 'Criar conta'}
                </Button>
              </form>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-white/15" />
                <span className="text-[11px] text-white/40 uppercase tracking-widest font-medium">ou</span>
                <div className="flex-1 h-px bg-white/15" />
              </div>

              <Button
                type="button"
                onClick={handleGoogleSignup}
                disabled={loading || loadingGoogle}
                className="w-full h-12 rounded-xl bg-white/10 hover:bg-white/18 border border-white/20 hover:border-white/35 text-white font-semibold transition-all hover:scale-[1.01] active:scale-[0.98] shadow-sm"
              >
                {loadingGoogle ? (
                  <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Conectando...</>
                ) : (
                  <><GoogleIcon className="mr-2.5 h-5 w-5" />Continuar com Google</>
                )}
              </Button>

              <p className="text-center text-sm text-white/55">
                Já tem uma conta?{' '}
                <Link href="/login" className="text-poke-blue font-bold hover:text-blue-300 transition-colors">
                  Fazer login
                </Link>
              </p>

              <p className="text-[10px] text-center text-white/35 px-2">
                Ao criar uma conta, você concorda com nossos{' '}
                <Link href="/terms" className="underline hover:text-white/60 transition-colors">Termos de Uso</Link>
                {' '}e{' '}
                <Link href="/privacy" className="underline hover:text-white/60 transition-colors">Política de Privacidade</Link>
              </p>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
