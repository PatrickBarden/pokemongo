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
          try {
            const urlObj = new URL(url);
            
            const errorParam = urlObj.searchParams.get('error_description') || 
                              urlObj.searchParams.get('error');
            if (errorParam) {
              router.replace(`/login?error=${encodeURIComponent(errorParam)}`);
              return;
            }
            
            // Tentar tokens do hash (implicit flow)
            const hashParams = new URLSearchParams(url.split('#')[1] || '');
            const accessToken = hashParams.get('access_token');
            const refreshToken = hashParams.get('refresh_token');
            
            if (accessToken) {
              const { data, error } = await supabaseClient.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken || '',
              });
              
              if (error) {
                router.replace(`/login?error=${encodeURIComponent(error.message)}`);
                return;
              }
              
              if (data?.user) {
                await handleUserLogin(data.user);
                return;
              }
            }
            
            // Tentar código (PKCE fallback)
            const code = urlObj.searchParams.get('code');
            if (code) {
              const { data, error } = await supabaseClient.auth.exchangeCodeForSession(code);
              
              if (error) {
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
            
            // Verificar sessão existente
            const { data: { session } } = await supabaseClient.auth.getSession();
            if (session?.user) {
              await handleUserLogin(session.user);
              return;
            }
            
            router.replace('/login?error=no_auth_data');
          } catch (e: any) {
            router.replace(`/login?error=${encodeURIComponent(e?.message || 'oauth_error')}`);
          }
        };
        
        const handleUserLogin = async (user: any) => {
          const displayName = user.user_metadata?.full_name || 
                             user.user_metadata?.name || 
                             user.email?.split('@')[0] || 'Usuário';
          
          const avatarUrl = user.user_metadata?.avatar_url || 
                           user.user_metadata?.picture || 
                           null;
          
          try {
            await createUserInDatabase(user.id, user.email || '', displayName, avatarUrl);
          } catch {
            // Usuário pode já existir - continuar
          }
          
          let sessionVerified = false;
          for (let i = 0; i < 5; i++) {
            const { data: { session } } = await supabaseClient.auth.getSession();
            if (session?.user) {
              sessionVerified = true;
              break;
            }
            await new Promise(r => setTimeout(r, 500));
          }
          
          if (!sessionVerified) return;
          
          const { data: userData } = await supabaseClient
            .from('users')
            .select('role')
            .eq('id', user.id)
            .maybeSingle();
          
          if ((userData as any)?.role === 'admin') {
            router.replace('/admin');
          } else {
            router.replace('/dashboard');
          }
        };
        
        App.addListener('appUrlOpen', async ({ url }) => {
          if (url.includes('auth') || url.includes('callback')) {
            await processOAuthCallback(url);
          }
        });
        
        const urlOpen = await App.getLaunchUrl();
        if (urlOpen?.url && (urlOpen.url.includes('auth') || urlOpen.url.includes('callback'))) {
          await processOAuthCallback(urlOpen.url);
        }
      } catch {
        // Capacitor não disponível em ambiente web
      }
    };

    setupDeepLinks();
  }, [router]);
}
