'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseClient } from '@/lib/supabase-client';
import { createUserInDatabase } from '@/server/actions/auth';

export function useDeepLinks() {
  const router = useRouter();

  useEffect(() => {
    const setupDeepLinks = async () => {
      if (typeof window === 'undefined') return;
      
      try {
        const { App } = await import('@capacitor/app');
        
        const processOAuthCallback = async (url: string) => {
          console.log('=== Deep Link OAuth Callback ===');
          console.log('URL:', url);
          
          try {
            // Extrair parâmetros - pode estar no hash (implicit) ou query (PKCE)
            const urlObj = new URL(url);
            
            // Verificar erro primeiro
            const errorParam = urlObj.searchParams.get('error_description') || 
                              urlObj.searchParams.get('error');
            if (errorParam) {
              console.error('OAuth error:', errorParam);
              router.replace(`/login?error=${encodeURIComponent(errorParam)}`);
              return;
            }
            
            // Tentar pegar tokens do hash (fluxo implicit)
            const hashParams = new URLSearchParams(url.split('#')[1] || '');
            const accessToken = hashParams.get('access_token');
            const refreshToken = hashParams.get('refresh_token');
            
            if (accessToken) {
              console.log('Tokens encontrados no hash (implicit flow)');
              const { data, error } = await supabaseClient.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken || '',
              });
              
              if (error) {
                console.error('Erro ao setar sessão:', error);
                router.replace(`/login?error=${encodeURIComponent(error.message)}`);
                return;
              }
              
              if (data?.user) {
                await handleUserLogin(data.user);
                return;
              }
            }
            
            // Tentar pegar código (fluxo PKCE)
            const code = urlObj.searchParams.get('code');
            if (code) {
              console.log('Código PKCE encontrado');
              const { data, error } = await supabaseClient.auth.exchangeCodeForSession(code);
              
              if (error) {
                console.error('Erro ao trocar código:', error);
                // Tentar verificar se já tem sessão
                const { data: { session } } = await supabaseClient.auth.getSession();
                if (session?.user) {
                  await handleUserLogin(session.user);
                  return;
                }
                router.replace(`/login?error=${encodeURIComponent(error.message)}`);
                return;
              }
              
              if (data?.user) {
                await handleUserLogin(data.user);
                return;
              }
            }
            
            // Verificar se já existe sessão
            const { data: { session } } = await supabaseClient.auth.getSession();
            if (session?.user) {
              console.log('Sessão existente encontrada');
              await handleUserLogin(session.user);
              return;
            }
            
            console.error('Nenhum token ou código encontrado');
            router.replace('/login?error=no_auth_data');
          } catch (e: any) {
            console.error('Erro no processamento:', e);
            router.replace(`/login?error=${encodeURIComponent(e?.message || 'oauth_error')}`);
          }
        };
        
        const handleUserLogin = async (user: any) => {
          console.log('=== handleUserLogin ===');
          console.log('Processando usuário:', user.email);
          
          // Sempre tentar criar/atualizar usuário
          const displayName = user.user_metadata?.full_name || 
                             user.user_metadata?.name || 
                             user.email?.split('@')[0] || 'Usuário';
          
          // Pegar avatar do Google
          const avatarUrl = user.user_metadata?.avatar_url || 
                           user.user_metadata?.picture || 
                           null;
          
          try {
            await createUserInDatabase(user.id, user.email || '', displayName, avatarUrl);
            console.log('Usuário criado/atualizado com sucesso');
          } catch (e) {
            console.error('Erro ao criar usuário:', e);
          }
          
          // Verificar se a sessão está persistida antes de redirecionar
          let sessionVerified = false;
          for (let i = 0; i < 5; i++) {
            const { data: { session } } = await supabaseClient.auth.getSession();
            if (session?.user) {
              console.log('Sessão verificada após', i + 1, 'tentativas');
              sessionVerified = true;
              break;
            }
            console.log('Aguardando sessão persistir... tentativa', i + 1);
            await new Promise(r => setTimeout(r, 500));
          }
          
          if (!sessionVerified) {
            console.warn('Sessão não foi persistida, mas continuando com redirect');
          }
          
          // Buscar role atualizada
          const { data: userData } = await supabaseClient
            .from('users')
            .select('role')
            .eq('id', user.id)
            .maybeSingle();
          
          console.log('Role do usuário:', (userData as any)?.role);
          
          if ((userData as any)?.role === 'admin') {
            console.log('Redirecionando para /admin');
            router.replace('/admin');
          } else {
            console.log('Redirecionando para /dashboard');
            router.replace('/dashboard');
          }
        };
        
        // Listener para deep links quando o app está aberto
        App.addListener('appUrlOpen', async ({ url }) => {
          console.log('Deep link recebido (app aberto):', url);
          if (url.includes('auth') || url.includes('callback')) {
            await processOAuthCallback(url);
          }
        });
        
        // Verificar se o app foi aberto via deep link (cold start)
        const urlOpen = await App.getLaunchUrl();
        if (urlOpen?.url && (urlOpen.url.includes('auth') || urlOpen.url.includes('callback'))) {
          console.log('Deep link recebido (cold start):', urlOpen.url);
          await processOAuthCallback(urlOpen.url);
        }
        
        console.log('Deep link listeners configurados');
      } catch (e) {
        console.log('Deep links não disponíveis:', e);
      }
    };

    setupDeepLinks();
  }, [router]);
}
