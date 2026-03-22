'use server';

import { createSupabaseServerClient } from './supabase-server';

export type UserRole = 'admin' | 'mod' | 'user';

export interface AuthenticatedUser {
  id: string;
  role: UserRole;
  email: string;
  display_name: string;
}

/**
 * Verifica a sessão do usuário e retorna seus dados.
 * Lança erro se não autenticado.
 */
export async function requireAuth(): Promise<AuthenticatedUser> {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Não autorizado: sessão inválida ou expirada.');
  }

  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id, role, email, display_name')
    .eq('id', user.id)
    .single();

  if (userError || !userData) {
    throw new Error('Não autorizado: usuário não encontrado.');
  }

  return userData as unknown as AuthenticatedUser;
}

/**
 * Verifica se o usuário autenticado tem uma das roles permitidas.
 * Lança erro se não autorizado.
 */
export async function requireRole(...allowedRoles: UserRole[]): Promise<AuthenticatedUser> {
  const user = await requireAuth();

  if (!allowedRoles.includes(user.role)) {
    throw new Error(`Sem permissão: role '${user.role}' não tem acesso a esta ação.`);
  }

  return user;
}

/**
 * Verifica se o usuário autenticado é admin.
 */
export async function requireAdmin(): Promise<AuthenticatedUser> {
  return requireRole('admin');
}

/**
 * Verifica se o usuário autenticado é admin ou moderador.
 */
export async function requireAdminOrMod(): Promise<AuthenticatedUser> {
  return requireRole('admin', 'mod');
}

/**
 * Verifica se o usuário autenticado é o dono do recurso ou admin.
 */
export async function requireOwnerOrAdmin(resourceOwnerId: string): Promise<AuthenticatedUser> {
  const user = await requireAuth();

  if (user.id !== resourceOwnerId && user.role !== 'admin') {
    throw new Error('Sem permissão: você não é o dono deste recurso.');
  }

  return user;
}
