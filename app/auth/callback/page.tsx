'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseClient } from '@/lib/supabase-client';
import { createUserInDatabase } from '@/server/actions/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState('Finalizando login...');
  const [processed, setProcessed] = useState(false);

  useEffect(() => {
    if (processed) return;
    
    const handleAuthCallback = async () => {
      setProcessed(true);
      
      try {
        console.log('=== OAuth Callback ===');
        console.log('Full URL:', window.location.href);
        console.log('Hash:', window.location.hash);
        console.log('Search:', window.location.search);
        
        // MÉTODO 1: Verificar se há tokens no hash (fluxo implícito)
        if (window.location.hash && window.location.hash.includes('access_token')) {
          console.log('Fluxo IMPLICIT detectado');
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          
          if (accessToken) {
            console.log('Setando sessão com tokens do hash...');
            const { data, error } = await supabaseClient.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || '',
            });
            
            if (error) {
              console.error('Erro ao setar sessão:', error);
              window.location.href = `/login?error=${encodeURIComponent(error.message)}`;
              return;
            }
            
            if (data.user) {
              await processUser(data.user);
              return;
            }
          }
        }
        
        // MÉTODO 2: Verificar erro na URL
        const urlParams = new URLSearchParams(window.location.search);
        const errorParam = urlParams.get('error_description') || urlParams.get('error');
        
        if (errorParam) {
          console.error('OAuth error na URL:', errorParam);
          window.location.href = `/login?error=${encodeURIComponent(errorParam)}`;
          return;
        }
        
        // MÉTODO 3: Verificar código PKCE na URL
        const code = urlParams.get('code');
        if (code) {
          console.log('Código PKCE encontrado, trocando por sessão...');
          
          try {
            const { data, error } = await supabaseClient.auth.exchangeCodeForSession(code);
            
            if (error) {
              console.error('Erro ao trocar código PKCE:', error.message);
              // Não redirecionar imediatamente, tentar outros métodos
            } else if (data?.user) {
              console.log('Sessão obtida via PKCE');
              await processUser(data.user);
              return;
            }
          } catch (e) {
            console.error('Exceção ao trocar código:', e);
          }
        }
        
        // MÉTODO 4: Verificar se já existe sessão (detectSessionInUrl pode ter processado)
        console.log('Verificando sessão existente...');
        const { data: { session } } = await supabaseClient.auth.getSession();
        
        if (session?.user) {
          console.log('Sessão existente encontrada:', session.user.email);
          await processUser(session.user);
          return;
        }
        
        // MÉTODO 5: Aguardar evento de auth state change
        console.log('Aguardando auth state change...');
        
        const timeout = setTimeout(() => {
          console.error('Timeout - nenhuma sessão detectada');
          window.location.href = '/login?error=auth_timeout';
        }, 5000);
        
        const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(async (event, newSession) => {
          console.log('Auth event:', event);
          
          if (newSession?.user) {
            clearTimeout(timeout);
            subscription.unsubscribe();
            await processUser(newSession.user);
          }
        });
        
      } catch (err: any) {
        console.error('OAuth callback error:', err);
        window.location.href = `/login?error=${encodeURIComponent(err?.message || 'oauth_error')}`;
      }
    };

    const processUser = async (user: any) => {
      try {
        setMessage('Configurando sua conta...');
        console.log('Processando usuário:', user.id, user.email);

        // Verificar se usuário existe no banco
        const { data: existingUser, error: checkError } = await supabaseClient
          .from('users')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        console.log('Check usuário:', existingUser, checkError);

        // Sempre tentar criar/atualizar usuário
        const email = user.email || '';
        const displayName =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.user_metadata?.display_name ||
          email.split('@')[0] ||
          'Usuário';
        
        // Pegar avatar do Google
        const avatarUrl = 
          user.user_metadata?.avatar_url ||
          user.user_metadata?.picture ||
          null;

        console.log('Criando/atualizando usuário:', email, displayName, avatarUrl);
        
        try {
          await createUserInDatabase(user.id, email, displayName, avatarUrl);
          console.log('Usuário criado/atualizado com sucesso');
        } catch (createError: any) {
          console.error('Erro ao criar usuário:', createError);
          // Continuar mesmo se falhar (pode ser duplicata)
        }

        // Buscar role para redirecionar
        setMessage('Redirecionando...');
        
        // Pequeno delay para garantir que o usuário foi criado
        await new Promise(r => setTimeout(r, 500));
        
        const { data: userData } = await supabaseClient
          .from('users')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        console.log('Role do usuário:', userData);

        if ((userData as any)?.role === 'admin') {
          console.log('Redirecionando para /admin');
          window.location.href = '/admin';
        } else {
          console.log('Redirecionando para /dashboard');
          window.location.href = '/dashboard';
        }
      } catch (err: any) {
        console.error('Process user error:', err);
        window.location.href = `/login?error=${encodeURIComponent(err?.message || 'process_error')}`;
      }
    };

    handleAuthCallback();
  }, [processed]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 via-background to-secondary/20 p-4 pt-12">
      <Card className="w-full max-w-md border-2 border-poke-blue/30 shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold text-foreground">Aguarde</CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-poke-blue" />
        </CardContent>
      </Card>
    </div>
  );
}
