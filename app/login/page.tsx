'use client';

import { useState } from 'react';
import { supabaseClient } from '@/lib/supabase-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

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
        const { data: userData, error: userError } = await supabaseClient
          .from('users')
          .select('role')
          .eq('id', data.user.id)
          .maybeSingle();

        if (userError) {
          console.error('Error fetching user:', userError);
          setError('Erro ao buscar dados do usuário. Tente fazer logout e login novamente.');
          await supabaseClient.auth.signOut();
          setLoading(false);
          return;
        }

        if (!userData) {
          setError('Usuário não encontrado no sistema. Por favor, entre em contato com o suporte.');
          await supabaseClient.auth.signOut();
          setLoading(false);
          return;
        }

        if ((userData as any)?.role === 'admin') {
          router.push('/admin');
        } else {
          router.push('/dashboard');
        }
        router.refresh();
      }
    } catch (error: any) {
      console.error('Login error:', error);
      setError(error.message || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-poke-blue/20 via-poke-gray to-poke-yellow/20 p-4">
      <Card className="w-full max-w-md border-2 border-poke-blue/30 shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-poke-blue flex items-center justify-center mb-4">
            <span className="text-2xl font-bold text-white">PI</span>
          </div>
          <CardTitle className="text-2xl font-bold text-poke-dark">Bem-vindo de volta</CardTitle>
          <CardDescription>
            Entre com suas credenciais para acessar sua conta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="border-poke-blue/30 focus:border-poke-blue"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="border-poke-blue/30 focus:border-poke-blue"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-poke-blue hover:bg-poke-blue/90"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </Button>

            <div className="text-center text-sm">
              <span className="text-muted-foreground">Não tem uma conta? </span>
              <Link href="/signup" className="text-poke-blue hover:underline font-medium">
                Cadastre-se
              </Link>
            </div>
          </form>

          <div className="mt-6 p-4 bg-poke-yellow/10 rounded-lg border border-poke-yellow/30">
            <p className="text-xs text-center text-muted-foreground mb-2">Acesso Admin:</p>
            <p className="text-xs text-center font-mono">admin@admin.com / 123456</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
