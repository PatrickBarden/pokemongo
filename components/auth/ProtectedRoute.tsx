'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseClient } from '@/lib/supabase-client';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'user' | 'admin' | 'mod';
  fallback?: React.ReactNode;
}

export function ProtectedRoute({ 
  children, 
  requiredRole = 'user',
  fallback 
}: ProtectedRouteProps) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabaseClient.auth.getSession();

        if (!session) {
          router.push('/login');
          return;
        }

        // Verificar role se necessário
        if (requiredRole === 'admin' || requiredRole === 'mod') {
          const { data: user } = await (supabaseClient as any)
            .from('users')
            .select('role, banned_at')
            .eq('id', session.user.id)
            .single();

          // Usuário banido
          if (user?.banned_at) {
            await supabaseClient.auth.signOut();
            router.push('/login?error=banned');
            return;
          }

          // Verificar permissão
          if (requiredRole === 'admin' && user?.role !== 'admin') {
            router.push('/dashboard');
            return;
          }

          if (requiredRole === 'mod' && user?.role !== 'admin' && user?.role !== 'mod') {
            router.push('/dashboard');
            return;
          }
        }

        setIsAuthorized(true);
      } catch (error) {
        console.error('Auth check error:', error);
        router.push('/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router, requiredRole]);

  if (isLoading) {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen">
        <div className="relative w-10 h-10">
          <div className="w-10 h-10 border-3 border-slate-200 rounded-full"></div>
          <div className="w-10 h-10 border-3 border-poke-blue border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
}

// HOC para proteger páginas
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  requiredRole?: 'user' | 'admin' | 'mod'
) {
  return function ProtectedComponent(props: P) {
    return (
      <ProtectedRoute requiredRole={requiredRole}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}
