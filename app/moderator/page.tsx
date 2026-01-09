'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, 
  ShoppingBag, 
  Users, 
  AlertTriangle, 
  MessageCircle, 
  Clock,
  CheckCircle2,
  TrendingUp,
  Activity
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabaseClient } from '@/lib/supabase-client';
import { formatRelativeTime } from '@/lib/format';
import Link from 'next/link';
import { getMyPermissions, listModeratorActions, type ModeratorPermissions } from '@/server/actions/moderators';

interface Stats {
  totalOrders: number;
  pendingOrders: number;
  totalDisputes: number;
  unreadMessages: number;
}

interface RecentAction {
  id: string;
  action_type: string;
  target_type: string;
  description: string;
  created_at: string;
}

export default function ModeratorDashboard() {
  const [stats, setStats] = useState<Stats>({ totalOrders: 0, pendingOrders: 0, totalDisputes: 0, unreadMessages: 0 });
  const [permissions, setPermissions] = useState<ModeratorPermissions | null>(null);
  const [recentActions, setRecentActions] = useState<RecentAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) return;

      // Buscar dados do usuário
      const { data: userData } = await (supabaseClient as any)
        .from('users')
        .select('display_name, role')
        .eq('id', user.id)
        .single();

      if (userData) {
        setUserName(userData.display_name);
      }

      // Buscar permissões
      if (userData?.role === 'admin') {
        setPermissions({
          can_view_orders: true,
          can_manage_orders: true,
          can_resolve_disputes: true,
          can_view_users: true,
          can_ban_users: true,
          can_warn_users: true,
          can_view_listings: true,
          can_moderate_listings: true,
          can_delete_listings: true,
          can_view_chats: true,
          can_respond_chats: true,
          can_view_finances: true,
          can_process_payouts: true,
        });
      } else {
        const perms = await getMyPermissions(user.id);
        setPermissions(perms);
      }

      // Buscar estatísticas
      const [ordersRes, disputesRes] = await Promise.all([
        (supabaseClient as any).from('orders').select('id, status', { count: 'exact' }),
        (supabaseClient as any).from('orders').select('id', { count: 'exact' }).eq('status', 'DISPUTE'),
      ]);

      const pendingStatuses = ['PAYMENT_PENDING', 'AWAITING_SELLER', 'SELLER_ACCEPTED', 'DELIVERY_SUBMITTED', 'IN_REVIEW'];
      const pendingOrders = ordersRes.data?.filter((o: any) => pendingStatuses.includes(o.status)).length || 0;

      setStats({
        totalOrders: ordersRes.count || 0,
        pendingOrders,
        totalDisputes: disputesRes.count || 0,
        unreadMessages: 0,
      });

      // Buscar ações recentes do moderador
      const actions = await listModeratorActions(user.id, 10);
      setRecentActions(actions as RecentAction[]);

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'warn_user': return AlertTriangle;
      case 'ban_user': return Users;
      case 'moderate_listing': return ShoppingBag;
      case 'resolve_dispute': return CheckCircle2;
      default: return Activity;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Olá, {userName}! 👋
        </h1>
        <p className="text-muted-foreground mt-1">
          Bem-vindo ao painel de moderação
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {permissions?.can_view_orders && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                    <ShoppingBag className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.totalOrders}</p>
                    <p className="text-xs text-muted-foreground">Pedidos Total</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {permissions?.can_view_orders && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center">
                    <Clock className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.pendingOrders}</p>
                    <p className="text-xs text-muted-foreground">Pendentes</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {permissions?.can_resolve_disputes && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className={stats.totalDisputes > 0 ? 'border-red-500/50' : ''}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-500/10 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.totalDisputes}</p>
                    <p className="text-xs text-muted-foreground">Disputas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {permissions?.can_view_chats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                    <MessageCircle className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.unreadMessages}</p>
                    <p className="text-xs text-muted-foreground">Mensagens</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      {/* Quick Actions & Permissions */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Ações Rápidas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-500" />
              Ações Rápidas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {permissions?.can_view_orders && (
                <Link href="/moderator/orders">
                  <div className="p-4 bg-muted/50 rounded-xl hover:bg-muted transition-colors cursor-pointer">
                    <ShoppingBag className="h-6 w-6 text-blue-500 mb-2" />
                    <p className="font-medium text-sm">Ver Pedidos</p>
                    <p className="text-xs text-muted-foreground">Gerenciar pedidos</p>
                  </div>
                </Link>
              )}
              
              {permissions?.can_view_listings && (
                <Link href="/moderator/listings">
                  <div className="p-4 bg-muted/50 rounded-xl hover:bg-muted transition-colors cursor-pointer">
                    <ShoppingBag className="h-6 w-6 text-emerald-500 mb-2" />
                    <p className="font-medium text-sm">Anúncios</p>
                    <p className="text-xs text-muted-foreground">Moderar anúncios</p>
                  </div>
                </Link>
              )}
              
              {permissions?.can_view_users && (
                <Link href="/moderator/users">
                  <div className="p-4 bg-muted/50 rounded-xl hover:bg-muted transition-colors cursor-pointer">
                    <Users className="h-6 w-6 text-amber-500 mb-2" />
                    <p className="font-medium text-sm">Usuários</p>
                    <p className="text-xs text-muted-foreground">Gerenciar usuários</p>
                  </div>
                </Link>
              )}
              
              {permissions?.can_resolve_disputes && (
                <Link href="/moderator/disputes">
                  <div className="p-4 bg-muted/50 rounded-xl hover:bg-muted transition-colors cursor-pointer">
                    <AlertTriangle className="h-6 w-6 text-red-500 mb-2" />
                    <p className="font-medium text-sm">Disputas</p>
                    <p className="text-xs text-muted-foreground">Resolver disputas</p>
                  </div>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Minhas Permissões */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5 text-purple-500" />
              Minhas Permissões
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {permissions && Object.entries(permissions).map(([key, value]) => {
                if (typeof value !== 'boolean') return null;
                const label = key
                  .replace('can_', '')
                  .replace(/_/g, ' ')
                  .replace(/\b\w/g, l => l.toUpperCase());
                
                return (
                  <div key={key} className="flex items-center justify-between py-1">
                    <span className="text-sm text-muted-foreground">{label}</span>
                    {value ? (
                      <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Sim
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        Não
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ações Recentes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5 text-purple-500" />
            Minhas Ações Recentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentActions.length > 0 ? (
            <div className="space-y-3">
              {recentActions.map((action, index) => {
                const Icon = getActionIcon(action.action_type);
                return (
                  <motion.div
                    key={action.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="w-8 h-8 bg-purple-500/10 rounded-lg flex items-center justify-center">
                      <Icon className="h-4 w-4 text-purple-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{action.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {action.target_type} • {formatRelativeTime(action.created_at)}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <Activity className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                Nenhuma ação registrada ainda
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
