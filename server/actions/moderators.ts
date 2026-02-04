'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

// Criar cliente dentro da função para garantir que as env vars estejam disponíveis
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Missing Supabase credentials');
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

export interface ModeratorPermissions {
  can_view_orders: boolean;
  can_manage_orders: boolean;
  can_resolve_disputes: boolean;
  can_view_users: boolean;
  can_ban_users: boolean;
  can_warn_users: boolean;
  can_view_listings: boolean;
  can_moderate_listings: boolean;
  can_delete_listings: boolean;
  can_view_chats: boolean;
  can_respond_chats: boolean;
  can_view_finances: boolean;
  can_process_payouts: boolean;
}

export interface Moderator {
  id: string;
  email: string;
  display_name: string;
  role: string;
  created_at: string;
  permissions?: ModeratorPermissions & {
    id: string;
    notes: string | null;
    created_at: string;
    updated_at: string;
  };
}

// Listar todos os moderadores
export async function listModerators(): Promise<Moderator[]> {
  try {
    // Buscar usuários com role 'mod'
    const { data: users, error: usersError } = await getSupabaseAdmin()
      .from('users')
      .select('id, email, display_name, role, created_at')
      .eq('role', 'mod')
      .order('created_at', { ascending: false });

    if (usersError) {
      console.error('Erro ao listar moderadores:', usersError);
      return [];
    }

    if (!users || users.length === 0) {
      return [];
    }

    // Buscar permissões separadamente
    const userIds = users.map(u => u.id);
    const { data: permissions, error: permError } = await getSupabaseAdmin()
      .from('moderator_permissions')
      .select('*')
      .in('user_id', userIds);

    if (permError) {
      console.error('Erro ao buscar permissões:', permError);
    }

    // Mapear permissões para usuários
    return users.map((user: any) => ({
      ...user,
      permissions: permissions?.find(p => p.user_id === user.id) || null
    }));
  } catch (error) {
    console.error('Erro ao listar moderadores:', error);
    return [];
  }
}

// Buscar usuário por email para promover a moderador
export async function findUserByEmail(email: string) {
  const { data, error } = await getSupabaseAdmin()
    .from('users')
    .select('id, email, display_name, role')
    .eq('email', email)
    .single();

  if (error) {
    return { user: null, error: 'Usuário não encontrado' };
  }

  if (data.role === 'admin') {
    return { user: null, error: 'Não é possível modificar um administrador' };
  }

  if (data.role === 'mod') {
    return { user: null, error: 'Este usuário já é um moderador' };
  }

  return { user: data, error: null };
}

// Criar/Promover moderador
export async function createModerator(
  userId: string,
  permissions: Partial<ModeratorPermissions>,
  notes?: string,
  createdBy?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Atualizar role do usuário para 'mod'
    const { error: userError } = await getSupabaseAdmin()
      .from('users')
      .update({ role: 'mod' })
      .eq('id', userId);

    if (userError) throw userError;

    // Criar permissões do moderador
    const { error: permError } = await getSupabaseAdmin()
      .from('moderator_permissions')
      .upsert({
        user_id: userId,
        ...permissions,
        notes,
        created_by: createdBy,
      });

    if (permError) throw permError;

    revalidatePath('/admin/moderators');
    return { success: true };
  } catch (error: any) {
    console.error('Erro ao criar moderador:', error);
    return { success: false, error: error.message };
  }
}

// Atualizar permissões do moderador
export async function updateModeratorPermissions(
  userId: string,
  permissions: Partial<ModeratorPermissions>,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await getSupabaseAdmin()
      .from('moderator_permissions')
      .update({
        ...permissions,
        notes,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (error) throw error;

    revalidatePath('/admin/moderators');
    return { success: true };
  } catch (error: any) {
    console.error('Erro ao atualizar permissões:', error);
    return { success: false, error: error.message };
  }
}

// Remover moderador (rebaixar para usuário comum)
export async function removeModerator(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Remover permissões
    await getSupabaseAdmin()
      .from('moderator_permissions')
      .delete()
      .eq('user_id', userId);

    // Rebaixar para usuário comum
    const { error } = await getSupabaseAdmin()
      .from('users')
      .update({ role: 'user' })
      .eq('id', userId);

    if (error) throw error;

    revalidatePath('/admin/moderators');
    return { success: true };
  } catch (error: any) {
    console.error('Erro ao remover moderador:', error);
    return { success: false, error: error.message };
  }
}

// Buscar permissões do moderador logado
export async function getMyPermissions(userId: string): Promise<ModeratorPermissions | null> {
  const { data, error } = await getSupabaseAdmin()
    .from('moderator_permissions')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('Erro ao buscar permissões:', error);
    return null;
  }

  return data;
}

// Registrar ação do moderador
export async function logModeratorAction(
  moderatorId: string,
  actionType: string,
  targetType: string,
  targetId: string | null,
  description: string,
  metadata?: Record<string, any>
): Promise<{ success: boolean }> {
  try {
    await getSupabaseAdmin()
      .from('moderator_actions')
      .insert({
        moderator_id: moderatorId,
        action_type: actionType,
        target_type: targetType,
        target_id: targetId,
        description,
        metadata: metadata || {}
      });

    return { success: true };
  } catch (error) {
    console.error('Erro ao registrar ação:', error);
    return { success: false };
  }
}

// Listar ações de moderadores (para admin)
export async function listModeratorActions(
  moderatorId?: string,
  limit: number = 50
) {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from('moderator_actions')
    .select(`
      *,
      moderator:moderator_id(display_name, email)
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (moderatorId) {
    query = query.eq('moderator_id', moderatorId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Erro ao listar ações:', error);
    return [];
  }

  return data;
}

// Verificar se usuário tem permissão específica
export async function checkPermission(
  userId: string,
  permission: keyof ModeratorPermissions
): Promise<boolean> {
  // Primeiro verificar se é admin
  const { data: user } = await getSupabaseAdmin()
    .from('users')
    .select('role')
    .eq('id', userId)
    .single();

  if (user?.role === 'admin') return true;
  if (user?.role !== 'mod') return false;

  // Verificar permissão específica
  const { data: perms } = await getSupabaseAdmin()
    .from('moderator_permissions')
    .select(permission)
    .eq('user_id', userId)
    .single();

  return (perms as any)?.[permission] || false;
}
