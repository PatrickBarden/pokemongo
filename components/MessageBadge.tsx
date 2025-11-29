'use client';

import { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { supabaseClient } from '@/lib/supabase-client';
import { getUnreadMessageCount } from '@/server/actions/notifications';

interface MessageBadgeProps {
  userId: string;
  className?: string;
}

export function MessageBadge({ userId, className }: MessageBadgeProps) {
  const [unreadCount, setUnreadCount] = useState(0);

  const loadUnreadCount = useCallback(async () => {
    if (!userId) return;
    const count = await getUnreadMessageCount(userId);
    setUnreadCount(count);
  }, [userId]);

  useEffect(() => {
    loadUnreadCount();
  }, [loadUnreadCount]);

  // Realtime subscription para novas mensagens
  useEffect(() => {
    if (!userId) return;

    const channel = supabaseClient
      .channel('message-badge')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages'
        },
        (payload) => {
          // Verificar se a mensagem não é do próprio usuário
          if (payload.new.sender_id !== userId) {
            setUnreadCount(prev => prev + 1);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages'
        },
        (payload) => {
          // Se a mensagem foi marcada como lida
          if (payload.new.read_at && !payload.old.read_at) {
            setUnreadCount(prev => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [userId]);

  if (unreadCount === 0) return null;

  return (
    <Badge 
      className={`bg-red-500 text-white text-xs px-1.5 py-0.5 min-w-[18px] h-[18px] flex items-center justify-center ${className}`}
    >
      {unreadCount > 99 ? '99+' : unreadCount}
    </Badge>
  );
}

// Hook para usar o contador de mensagens não lidas
export function useUnreadMessages(userId: string) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const count = await getUnreadMessageCount(userId);
    setUnreadCount(count);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Realtime subscription
  useEffect(() => {
    if (!userId) return;

    const channel = supabaseClient
      .channel('unread-messages-hook')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages'
        },
        () => {
          refresh();
        }
      )
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [userId, refresh]);

  return { unreadCount, loading, refresh };
}
