'use client';

import { useState } from 'react';
import { supabaseClient } from '@/lib/supabase-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/Logo';

export default function SetupPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  const createAdmin = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Tentar criar o usuário admin
      const { data, error: signUpError } = await supabaseClient.auth.signUp({
        email: 'admin@admin.com',
        password: '123456',
        options: {
          data: {
            display_name: 'Administrador',
          },
          emailRedirectTo: undefined,
        },
      });

      if (signUpError) {
        // Se o erro for que o usuário já existe
        if (signUpError.message.includes('already registered') ||
            signUpError.message.includes('User already registered')) {
          setSuccess('Admin já existe! Você pode fazer login agora.');
          setTimeout(() => {
            router.push('/login');
          }, 2000);
          return;
        }
        throw signUpError;
      }

      if (data.user) {
        // Aguardar um pouco para o trigger processar
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Verificar se o usuário foi criado na tabela users
        const { data: userData, error: userError } = await supabaseClient
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .maybeSingle();

        // Se não existir, criar manualmente
        if (!userData) {
          console.log('Trigger não executou, criando manualmente...');

          // Criar usuário manualmente
          const { error: insertUserError } = await (supabaseClient as any)
            .from('users')
            .insert({
              id: data.user.id,
              email: 'admin@admin.com',
              display_name: 'Administrador',
              role: 'admin',
              reputation_score: 100,
            });

          if (insertUserError && !insertUserError.message.includes('duplicate')) {
            throw new Error('Erro ao criar usuário: ' + insertUserError.message);
          }

          // Criar profile manualmente
          const { error: insertProfileError } = await (supabaseClient as any)
            .from('profiles')
            .insert({
              user_id: data.user.id,
            });

          if (insertProfileError && !insertProfileError.message.includes('duplicate')) {
            console.warn('Aviso ao criar profile:', insertProfileError.message);
          }
        } else if ((userData as any).role !== 'admin') {
          // Se o usuário existe mas não é admin, atualizar
          await (supabaseClient as any)
            .from('users')
            .update({ role: 'admin' })
            .eq('id', data.user.id);
        }

        setSuccess('Admin criado com sucesso! Redirecionando para login...');

        // Fazer logout
        await supabaseClient.auth.signOut();

        // Redirecionar
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      }
    } catch (error: any) {
      console.error('Erro completo:', error);
      setError(error.message || 'Erro ao criar admin');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-poke-blue/20 via-poke-gray to-poke-yellow/20 p-4">
      <Card className="w-full max-w-md border-2 border-poke-blue/30 shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <div className="mb-4 flex justify-center">
            <Logo size="md" />
          </div>
          <CardTitle className="text-2xl font-bold text-poke-dark">
            Setup Inicial
          </CardTitle>
          <CardDescription>
            Configure o administrador do sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="ml-2">{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-poke-blue bg-poke-blue/10">
              <CheckCircle className="h-4 w-4 text-poke-blue" />
              <AlertDescription className="text-poke-blue ml-2">
                {success}
              </AlertDescription>
            </Alert>
          )}

          <div className="p-4 bg-poke-yellow/10 rounded-lg border border-poke-yellow/30">
            <p className="text-sm font-medium text-center mb-2">
              Credenciais do Admin:
            </p>
            <p className="text-xs text-center font-mono mb-1">
              Email: admin@admin.com
            </p>
            <p className="text-xs text-center font-mono">
              Senha: 123456
            </p>
          </div>

          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs text-gray-600">
              <strong>Nota:</strong> Se você já criou o admin e está recebendo erro,
              tente fazer login diretamente.
            </p>
          </div>

          <Button
            onClick={createAdmin}
            className="w-full bg-poke-blue hover:bg-poke-blue/90"
            disabled={loading || !!success}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Criando Admin...
              </>
            ) : success ? (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Admin Criado!
              </>
            ) : (
              'Criar Administrador'
            )}
          </Button>

          <div className="text-center">
            <Button
              variant="link"
              onClick={() => router.push('/login')}
              className="text-poke-blue"
            >
              Ir para Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
