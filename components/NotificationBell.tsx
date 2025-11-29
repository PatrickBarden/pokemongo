'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell, Check, CheckCheck, Trash2, MessageCircle, Package, Star, TrendingDown, ShoppingBag, DollarSign, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabaseClient } from '@/lib/supabase-client';
import {
  getUserNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteReadNotifications,
  type UserNotification
} from '@/server/actions/notifications';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface NotificationBellProps {
  userId: string;
}

export function NotificationBell({ userId }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const loadNotifications = useCallback(async () => {
    if (!userId) return;
    
    const [notifs, count] = await Promise.all([
      getUserNotifications(userId, 10),
      getUnreadNotificationCount(userId)
    ]);
    
    setNotifications(notifs);
    setUnreadCount(count);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Realtime subscription
  useEffect(() => {
    if (!userId) return;

    const channel = supabaseClient
      .channel('user-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          const newNotification = payload.new as UserNotification;
          setNotifications(prev => [newNotification, ...prev.slice(0, 9)]);
          setUnreadCount(prev => prev + 1);
          
          // Play notification sound (optional)
          playNotificationSound();
          
          // Show browser notification if permitted
          showBrowserNotification(newNotification);
        }
      )
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [userId]);

  const playNotificationSound = () => {
    try {
      const audio = new Audio('/notification.mp3');
      audio.volume = 0.3;
      audio.play().catch(() => {});
    } catch {}
  };

  const showBrowserNotification = async (notification: UserNotification) => {
    if (!('Notification' in window)) return;
    
    if (Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/icon-192.png',
        tag: notification.id
      });
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    await markNotificationAsRead(notificationId);
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const handleMarkAllAsRead = async () => {
    await markAllNotificationsAsRead(userId);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const handleClearRead = async () => {
    await deleteReadNotifications(userId);
    setNotifications(prev => prev.filter(n => !n.read));
  };

  const getNotificationIcon = (type: UserNotification['type']) => {
    switch (type) {
      case 'new_message':
        return <MessageCircle className="h-4 w-4 text-blue-500" />;
      case 'order_status':
        return <Package className="h-4 w-4 text-purple-500" />;
      case 'payment_received':
        return <DollarSign className="h-4 w-4 text-green-500" />;
      case 'new_review':
        return <Star className="h-4 w-4 text-yellow-500" />;
      case 'price_drop':
        return <TrendingDown className="h-4 w-4 text-green-500" />;
      case 'wishlist_match':
        return <ShoppingBag className="h-4 w-4 text-pink-500" />;
      case 'new_sale':
        return <ShoppingBag className="h-4 w-4 text-green-500" />;
      case 'payout_completed':
        return <DollarSign className="h-4 w-4 text-green-500" />;
      default:
        return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs animate-pulse"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notificações</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto py-1 px-2 text-xs"
              onClick={handleMarkAllAsRead}
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Marcar todas como lidas
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <ScrollArea className="h-[300px]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-poke-blue"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">Nenhuma notificação</p>
            </div>
          ) : (
            <div className="space-y-1 p-1">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "flex items-start gap-3 p-2 rounded-lg cursor-pointer transition-colors",
                    notification.read 
                      ? "bg-transparent hover:bg-gray-50" 
                      : "bg-blue-50 hover:bg-blue-100"
                  )}
                  onClick={() => {
                    if (!notification.read) {
                      handleMarkAsRead(notification.id);
                    }
                    if (notification.link) {
                      setOpen(false);
                      window.location.href = notification.link;
                    }
                  }}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm line-clamp-1",
                      !notification.read && "font-semibold"
                    )}>
                      {notification.title}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(notification.created_at), {
                        addSuffix: true,
                        locale: ptBR
                      })}
                    </p>
                  </div>
                  {!notification.read && (
                    <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-2" />
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <DropdownMenuSeparator />
        <div className="p-2 flex items-center justify-between">
          <Link href="/dashboard/notifications" onClick={() => setOpen(false)} className="flex-1">
            <Button variant="default" size="sm" className="w-full text-xs bg-poke-blue hover:bg-poke-blue/90">
              Ver todas as notificações
            </Button>
          </Link>
          {notifications.some(n => n.read) && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-red-500 hover:text-red-600 ml-2"
              onClick={handleClearRead}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Hook para solicitar permissão de notificações do navegador
export function useNotificationPermission() {
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      return 'denied';
    }

    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  };

  return { permission, requestPermission };
}
