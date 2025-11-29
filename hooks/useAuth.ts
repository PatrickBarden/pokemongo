'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseClient } from '@/lib/supabase-client';
import type { User, Session } from '@supabase/supabase-js';

interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  role: 'user' | 'admin' | 'mod';
  avatarUrl?: string;
  isBanned: boolean;
}

interface UseAuthReturn {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isMod: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, displayName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

// Tempo máximo de sessão inativa (30 minutos)
const SESSION_TIMEOUT = 30 * 60 * 1000;

export function useAuth(): UseAuthReturn {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastActivity, setLastActivity] = useState(Date.now());

  // Atualizar última atividade
  const updateActivity = useCallback(() => {
    setLastActivity(Date.now());
  }, []);

  // Carregar dados do usuário
  const loadUser = useCallback(async (authUser: User) => {
    try {
      const { data: userData, error } = await (supabaseClient as any)
        .from('users')
        .select('display_name, role, banned_at')
        .eq('id', authUser.id)
        .single();

      if (error) throw error;

      // Verificar se usuário está banido
      if (userData?.banned_at) {
        await supabaseClient.auth.signOut();
        setUser(null);
        setSession(null);
        router.push('/login?error=banned');
        return;
      }

      // Buscar avatar
      const { data: profile } = await (supabaseClient as any)
        .from('profiles')
        .select('avatar_url')
        .eq('user_id', authUser.id)
        .single();

      setUser({
        id: authUser.id,
        email: authUser.email || '',
        displayName: userData?.display_name || 'Usuário',
        role: userData?.role || 'user',
        avatarUrl: profile?.avatar_url,
        isBanned: !!userData?.banned_at,
      });
    } catch (error) {
      console.error('Error loading user:', error);
      setUser(null);
    }
  }, [router]);

  // Verificar timeout de sessão
  useEffect(() => {
    const checkTimeout = setInterval(() => {
      if (session && Date.now() - lastActivity > SESSION_TIMEOUT) {
        console.log('Session timeout - logging out');
        signOut();
      }
    }, 60000); // Verificar a cada minuto

    return () => clearInterval(checkTimeout);
  }, [session, lastActivity]);

  // Listeners de atividade
  useEffect(() => {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    
    events.forEach(event => {
      window.addEventListener(event, updateActivity, { passive: true });
    });

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, updateActivity);
      });
    };
  }, [updateActivity]);

  // Inicializar autenticação
  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session: currentSession } } = await supabaseClient.auth.getSession();
        
        if (currentSession?.user) {
          setSession(currentSession);
          await loadUser(currentSession.user);
        }
      } catch (error) {
        console.error('Auth init error:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    // Listener de mudanças de auth
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(
      async (event, newSession) => {
        if (event === 'SIGNED_IN' && newSession?.user) {
          setSession(newSession);
          await loadUser(newSession.user);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setSession(null);
        } else if (event === 'TOKEN_REFRESHED' && newSession) {
          setSession(newSession);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [loadUser]);

  // Sign In
  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    try {
      // Validação básica
      if (!email || !password) {
        return { error: 'Email e senha são obrigatórios' };
      }

      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      });

      if (error) {
        // Mensagens de erro amigáveis
        if (error.message.includes('Invalid login credentials')) {
          return { error: 'Email ou senha incorretos' };
        }
        if (error.message.includes('Email not confirmed')) {
          return { error: 'Por favor, confirme seu email antes de fazer login' };
        }
        return { error: error.message };
      }

      if (data.session && data.user) {
        setSession(data.session);
        await loadUser(data.user);
        updateActivity();
      }

      return { error: null };
    } catch (error: any) {
      return { error: error.message || 'Erro ao fazer login' };
    }
  };

  // Sign Up
  const signUp = async (
    email: string,
    password: string,
    displayName: string
  ): Promise<{ error: string | null }> => {
    try {
      // Validações
      if (!email || !password || !displayName) {
        return { error: 'Todos os campos são obrigatórios' };
      }

      if (password.length < 8) {
        return { error: 'Senha deve ter pelo menos 8 caracteres' };
      }

      if (displayName.length < 3) {
        return { error: 'Nome deve ter pelo menos 3 caracteres' };
      }

      const { data, error } = await supabaseClient.auth.signUp({
        email: email.toLowerCase().trim(),
        password,
        options: {
          data: {
            display_name: displayName.trim(),
          },
        },
      });

      if (error) {
        if (error.message.includes('already registered')) {
          return { error: 'Este email já está cadastrado' };
        }
        return { error: error.message };
      }

      return { error: null };
    } catch (error: any) {
      return { error: error.message || 'Erro ao criar conta' };
    }
  };

  // Sign Out
  const signOut = async (): Promise<void> => {
    try {
      await supabaseClient.auth.signOut();
      setUser(null);
      setSession(null);
      router.push('/login');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  // Refresh Session
  const refreshSession = async (): Promise<void> => {
    try {
      const { data: { session: newSession } } = await supabaseClient.auth.refreshSession();
      if (newSession) {
        setSession(newSession);
      }
    } catch (error) {
      console.error('Refresh session error:', error);
    }
  };

  return {
    user,
    session,
    loading,
    isAuthenticated: !!user && !!session,
    isAdmin: user?.role === 'admin',
    isMod: user?.role === 'mod' || user?.role === 'admin',
    signIn,
    signUp,
    signOut,
    refreshSession,
  };
}
