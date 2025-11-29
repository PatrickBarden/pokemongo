'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

export type UserNotification = {
  id: string;
  user_id: string;
  type: 'new_message' | 'order_status' | 'payment_received' | 'new_review' | 'price_drop' | 'wishlist_match' | 'new_sale' | 'payout_completed' | 'system';
  title: string;
  message: string;
  link?: string;
  read: boolean;
  read_at?: string;
  metadata?: Record<string, any>;
  created_at: string;
};

// Buscar notificações do usuário
export async function getUserNotifications(
  userId: string,
  limit: number = 20,
  onlyUnread: boolean = false
): Promise<UserNotification[]> {
  try {
    let query = supabaseAdmin
      .from('user_notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (onlyUnread) {
      query = query.eq('read', false);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []) as UserNotification[];
  } catch (error) {
    console.error('Erro ao buscar notificações:', error);
    return [];
  }
}

// Contar notificações não lidas
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  try {
    const { count, error } = await supabaseAdmin
      .from('user_notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('Erro ao contar notificações:', error);
    return 0;
  }
}

// Contar mensagens não lidas
export async function getUnreadMessageCount(userId: string): Promise<number> {
  try {
    // Buscar conversas do usuário
    const { data: conversations } = await supabaseAdmin
      .from('conversations')
      .select('id')
      .or(`participant_1.eq.${userId},participant_2.eq.${userId}`);

    if (!conversations || conversations.length === 0) return 0;

    const conversationIds = conversations.map(c => c.id);

    // Contar mensagens não lidas nessas conversas
    const { count, error } = await supabaseAdmin
      .from('chat_messages')
      .select('id', { count: 'exact', head: true })
      .in('conversation_id', conversationIds)
      .neq('sender_id', userId)
      .is('read_at', null);

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('Erro ao contar mensagens não lidas:', error);
    return 0;
  }
}

// Marcar notificação como lida
export async function markNotificationAsRead(notificationId: string): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('user_notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Erro ao marcar notificação como lida:', error);
    return false;
  }
}

// Marcar todas as notificações como lidas
export async function markAllNotificationsAsRead(userId: string): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('user_notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) throw error;
    revalidatePath('/dashboard');
    return true;
  } catch (error) {
    console.error('Erro ao marcar todas notificações como lidas:', error);
    return false;
  }
}

// Deletar notificação
export async function deleteNotification(notificationId: string): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('user_notifications')
      .delete()
      .eq('id', notificationId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Erro ao deletar notificação:', error);
    return false;
  }
}

// Deletar todas as notificações lidas
export async function deleteReadNotifications(userId: string): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('user_notifications')
      .delete()
      .eq('user_id', userId)
      .eq('read', true);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Erro ao deletar notificações lidas:', error);
    return false;
  }
}

// Criar notificação manualmente (para uso em server actions)
export async function createNotification(
  userId: string,
  type: UserNotification['type'],
  title: string,
  message: string,
  link?: string,
  metadata?: Record<string, any>
): Promise<string | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('user_notifications')
      .insert({
        user_id: userId,
        type,
        title,
        message,
        link,
        metadata: metadata || {}
      })
      .select('id')
      .single();

    if (error) throw error;
    return data?.id || null;
  } catch (error) {
    console.error('Erro ao criar notificação:', error);
    return null;
  }
}

// Buscar resumo de notificações (para o header)
export async function getNotificationSummary(userId: string): Promise<{
  unreadCount: number;
  unreadMessages: number;
  recentNotifications: UserNotification[];
}> {
  try {
    const [unreadCount, unreadMessages, recentNotifications] = await Promise.all([
      getUnreadNotificationCount(userId),
      getUnreadMessageCount(userId),
      getUserNotifications(userId, 5, false)
    ]);

    return {
      unreadCount,
      unreadMessages,
      recentNotifications
    };
  } catch (error) {
    console.error('Erro ao buscar resumo de notificações:', error);
    return {
      unreadCount: 0,
      unreadMessages: 0,
      recentNotifications: []
    };
  }
}
