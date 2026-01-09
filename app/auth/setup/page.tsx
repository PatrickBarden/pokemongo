'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseClient } from '@/lib/supabase-client';
import { createUserInDatabase } from '@/server/actions/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle } from 'lucide-react';

export default function AuthSetupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState('Configurando sua conta...');
  const [done, setDone] = useState(false);

  useEffect(() => {
    const setupUser = async () => {
      try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        
        if (!user) {
          router.replace('/login?error=no_session');
          return;
        }

        console.log('Setting up user:', user.email);

        // Criar usuário no banco
        const email = user.email || '';
        const displayName =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.user_metadata?.display_name ||
          email.split('@')[0] ||
          'Usuário';

        try {
          await createUserInDatabase(user.id, email, displayName);
          console.log('User created successfully');
        } catch (e: any) {
          console.error('Error creating user:', e);
          // Pode ser duplicata, continuar
        }

        setMessage('Conta configurada!');
        setDone(true);

        // Aguardar um pouco e redirecionar
        await new Promise(r => setTimeout(r, 1000));

        // Verificar role
        const { data: userData } = await supabaseClient
          .from('users')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        if ((userData as any)?.role === 'admin') {
          window.location.href = '/admin';
        } else {
          window.location.href = '/dashboard';
        }
      } catch (err: any) {
        console.error('Setup error:', err);
        router.replace(`/login?error=${encodeURIComponent(err?.message || 'setup_error')}`);
      }
    };

    setupUser();
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-poke-blue/10 via-background to-poke-yellow/10 p-4">
      <Card className="w-full max-w-md border-2 border-poke-blue/30 shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold text-foreground">
            {done ? 'Tudo pronto!' : 'Configurando'}
          </CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-10">
          {done ? (
            <CheckCircle className="h-12 w-12 text-green-500" />
          ) : (
            <Loader2 className="h-8 w-8 animate-spin text-poke-blue" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
