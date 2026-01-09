'use client';

import { useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabase-client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Bell, 
  Check, 
  CheckCheck, 
  Trash2, 
  MessageCircle, 
  Package, 
  Star, 
  TrendingDown, 
  ShoppingBag, 
  DollarSign, 
  Info,
  Settings,
  BellRing,
  BellOff
} from 'lucide-react';
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  deleteReadNotifications,
  type UserNotification
} from '@/server/actions/notifications';
import { useNotificationPermission } from '@/components/NotificationBell';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export default function NotificationsPage() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const { permission, requestPermission } = useNotificationPermission();
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      setUserId(user.id);

      const notifs = await getUserNotifications(user.id, 50).catch(() => []);
      setNotifications(notifs || []);
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  // Realtime subscription
  useEffect(() => {
    if (!userId) return;

    const channel = supabaseClient
      .channel('notifications-page')
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
          setNotifications(prev => [newNotification, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [userId]);

  const handleMarkAsRead = async (notificationId: string) => {
    await markNotificationAsRead(notificationId);
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
  };

  const handleMarkAllAsRead = async () => {
    await markAllNotificationsAsRead(userId);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    toast({
      title: 'Todas marcadas como lidas',
      description: 'Suas notificações foram atualizadas.'
    });
  };

  const handleDelete = async (notificationId: string) => {
    await deleteNotification(notificationId);
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  const handleClearRead = async () => {
    await deleteReadNotifications(userId);
    setNotifications(prev => prev.filter(n => !n.read));
    toast({
      title: 'Notificações limpas',
      description: 'As notificações lidas foram removidas.'
    });
  };

  const handleEnableNotifications = async () => {
    const result = await requestPermission();
    if (result === 'granted') {
      toast({
        title: 'Notificações ativadas!',
        description: 'Você receberá alertas em tempo real.'
      });
    } else if (result === 'denied') {
      toast({
        title: 'Permissão negada',
        description: 'Você pode ativar nas configurações do navegador.',
        variant: 'destructive'
      });
    }
  };

  const getNotificationIcon = (type: UserNotification['type']) => {
    switch (type) {
      case 'new_message':
        return <MessageCircle className="h-5 w-5 text-blue-500" />;
      case 'order_status':
        return <Package className="h-5 w-5 text-purple-500" />;
      case 'payment_received':
        return <DollarSign className="h-5 w-5 text-green-500" />;
      case 'new_review':
        return <Star className="h-5 w-5 text-yellow-500" />;
      case 'price_drop':
        return <TrendingDown className="h-5 w-5 text-green-500" />;
      case 'wishlist_match':
        return <ShoppingBag className="h-5 w-5 text-pink-500" />;
      case 'new_sale':
        return <ShoppingBag className="h-5 w-5 text-green-500" />;
      case 'payout_completed':
        return <DollarSign className="h-5 w-5 text-green-500" />;
      default:
        return <Info className="h-5 w-5 text-gray-500" />;
    }
  };

  const getTypeLabel = (type: UserNotification['type']) => {
    switch (type) {
      case 'new_message': return 'Mensagem';
      case 'order_status': return 'Pedido';
      case 'payment_received': return 'Pagamento';
      case 'new_review': return 'Avaliação';
      case 'price_drop': return 'Preço';
      case 'wishlist_match': return 'Desejo';
      case 'new_sale': return 'Venda';
      case 'payout_completed': return 'Saque';
      default: return 'Sistema';
    }
  };

  const filteredNotifications = filter === 'unread' 
    ? notifications.filter(n => !n.read) 
    : notifications;

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="relative w-10 h-10">
          <div className="w-10 h-10 border-3 border-slate-200 rounded-full"></div>
          <div className="w-10 h-10 border-3 border-poke-blue border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-poke-dark flex items-center gap-2">
            <Bell className="h-7 w-7" />
            Notificações
          </h1>
          <p className="text-muted-foreground mt-1">
            {unreadCount > 0 
              ? `Você tem ${unreadCount} notificação${unreadCount > 1 ? 'ões' : ''} não lida${unreadCount > 1 ? 's' : ''}`
              : 'Todas as notificações foram lidas'
            }
          </p>
        </div>
        <div className="flex items-center gap-2">
          {permission !== 'granted' && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleEnableNotifications}
              className="border-poke-blue text-poke-blue"
            >
              <BellRing className="h-4 w-4 mr-2" />
              Ativar Push
            </Button>
          )}
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={handleMarkAllAsRead}>
              <CheckCheck className="h-4 w-4 mr-2" />
              Marcar todas como lidas
            </Button>
          )}
        </div>
      </div>

      {/* Status das notificações push */}
      {permission === 'denied' && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4 flex items-center gap-3">
            <BellOff className="h-5 w-5 text-yellow-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-800">
                Notificações push desativadas
              </p>
              <p className="text-xs text-yellow-600">
                Ative nas configurações do navegador para receber alertas em tempo real.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtros */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as 'all' | 'unread')}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="all">
              Todas ({notifications.length})
            </TabsTrigger>
            <TabsTrigger value="unread">
              Não lidas ({unreadCount})
            </TabsTrigger>
          </TabsList>
          
          {notifications.some(n => n.read) && (
            <Button
              variant="ghost"
              size="sm"
              className="text-red-500 hover:text-red-600"
              onClick={handleClearRead}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Limpar lidas
            </Button>
          )}
        </div>

        <TabsContent value="all" className="mt-4">
          <NotificationList 
            notifications={filteredNotifications}
            onMarkAsRead={handleMarkAsRead}
            onDelete={handleDelete}
            getIcon={getNotificationIcon}
            getTypeLabel={getTypeLabel}
          />
        </TabsContent>

        <TabsContent value="unread" className="mt-4">
          <NotificationList 
            notifications={filteredNotifications}
            onMarkAsRead={handleMarkAsRead}
            onDelete={handleDelete}
            getIcon={getNotificationIcon}
            getTypeLabel={getTypeLabel}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function NotificationList({
  notifications,
  onMarkAsRead,
  onDelete,
  getIcon,
  getTypeLabel
}: {
  notifications: UserNotification[];
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
  getIcon: (type: UserNotification['type']) => React.ReactNode;
  getTypeLabel: (type: UserNotification['type']) => string;
}) {
  if (notifications.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Bell className="h-16 w-16 text-gray-300 mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">
            Nenhuma notificação
          </h3>
          <p className="text-muted-foreground text-center max-w-md">
            Quando você receber novas notificações, elas aparecerão aqui.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Agrupar por data
  const groupedByDate: { [key: string]: UserNotification[] } = {};
  notifications.forEach(notification => {
    const date = format(new Date(notification.created_at), 'yyyy-MM-dd');
    if (!groupedByDate[date]) {
      groupedByDate[date] = [];
    }
    groupedByDate[date].push(notification);
  });

  return (
    <div className="space-y-6">
      {Object.entries(groupedByDate).map(([date, notifs]) => (
        <div key={date}>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">
            {format(new Date(date), "dd 'de' MMMM", { locale: ptBR })}
          </h3>
          <div className="space-y-2">
            {notifs.map((notification) => (
              <Card 
                key={notification.id}
                className={cn(
                  "transition-all",
                  !notification.read && "border-blue-200 bg-blue-50/50"
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 p-2 bg-gray-100 rounded-full">
                      {getIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className={cn(
                              "font-medium",
                              !notification.read && "text-blue-900"
                            )}>
                              {notification.title}
                            </p>
                            <Badge variant="outline" className="text-xs">
                              {getTypeLabel(notification.type)}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {formatDistanceToNow(new Date(notification.created_at), {
                              addSuffix: true,
                              locale: ptBR
                            })}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {!notification.read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => onMarkAsRead(notification.id)}
                              title="Marcar como lida"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                            onClick={() => onDelete(notification.id)}
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {notification.link && (
                        <Link href={notification.link}>
                          <Button variant="link" size="sm" className="px-0 mt-2">
                            Ver detalhes →
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
