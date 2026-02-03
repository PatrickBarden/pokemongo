'use client';

import { useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabase-client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Package,
  ShoppingBag,
  TrendingUp,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  ChevronRight,
  Wallet,
  Store,
  Plus,
  Zap,
  Gift,
  Star
} from 'lucide-react';
import { formatCurrency, formatRelativeTime } from '@/lib/format';
import { StatusBadge } from '@/components/order/status-badge';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { motion } from '@/components/ui/motion';

export default function UserDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;

    setUserId(user.id);

    // Buscar nome do usuário
    const { data: userData } = await supabaseClient
      .from('users')
      .select('display_name')
      .eq('id', user.id)
      .single();

    if (userData) {
      setUserName((userData as any).display_name?.split(' ')[0] || 'Treinador');
    }

    // Buscar avatar do perfil ou do Google
    const { data: profileData } = await supabaseClient
      .from('profiles')
      .select('avatar_url')
      .eq('user_id', user.id)
      .single();

    // Prioridade: avatar do perfil > avatar do Google > null
    const avatarUrl = (profileData as any)?.avatar_url ||
      user.user_metadata?.avatar_url ||
      user.user_metadata?.picture ||
      null;
    setUserAvatar(avatarUrl);

    // Buscar saldo da carteira
    const { data: walletData } = await supabaseClient
      .from('wallets')
      .select('balance')
      .eq('user_id', user.id)
      .single();

    if (walletData) {
      setWalletBalance(parseFloat((walletData as any).balance) || 0);
    }

    const { data: orders } = await supabaseClient
      .from('orders')
      .select(`
        *,
        listing:listing_id(title, photo_url)
      `)
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(5);

    const { data: listings } = await supabaseClient
      .from('listings')
      .select('*')
      .eq('owner_id', user.id);

    const totalSpent = (orders as any)
      ?.filter((o: any) => o.buyer_id === user.id)
      .reduce((acc: number, o: any) => acc + parseFloat(o.amount_total), 0) || 0;

    const totalEarned = (orders as any)
      ?.filter((o: any) => o.seller_id === user.id && o.status === 'COMPLETED')
      .reduce((acc: number, o: any) => acc + parseFloat(o.amount_total), 0) || 0;

    const pendingOrders = (orders as any)?.filter((o: any) =>
      ['PENDING', 'PAID', 'PROCESSING'].includes(o.status)
    ).length || 0;

    setStats({
      totalOrders: orders?.length || 0,
      totalListings: listings?.length || 0,
      activeListings: listings?.filter((l: any) => l.active).length || 0,
      totalSpent,
      totalEarned,
      pendingOrders,
    });

    setRecentOrders(orders || []);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="relative w-10 h-10">
          <div className="w-10 h-10 border-3 border-border rounded-full"></div>
          <div className="w-10 h-10 border-3 border-poke-blue border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
        </div>
      </div>
    );
  }

  // Hora do dia para saudação (horário local do usuário)
  const getGreeting = () => {
    // Usar horário local do navegador
    const now = new Date();
    const hour = now.getHours();

    if (hour >= 5 && hour < 12) return 'Bom dia';
    if (hour >= 12 && hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  // Gerar iniciais do nome para avatar fallback
  const getInitials = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  return (
    <motion.div
      className="space-y-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header com Avatar */}
      <motion.div
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <div className="flex items-center gap-3">
          {/* Avatar do usuário */}
          <Link href="/dashboard/profile" className="relative group">
            {userAvatar ? (
              <img
                src={userAvatar}
                alt={userName}
                referrerPolicy="no-referrer"
                className="w-12 h-12 rounded-full object-cover border-2 border-primary/20 group-hover:border-primary/50 transition-colors"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
            ) : null}
            <div
              className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground font-bold text-lg border-2 border-primary/20 group-hover:border-primary/50 transition-colors"
              style={{ display: userAvatar ? 'none' : 'flex' }}
            >
              {getInitials(userName)}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 rounded-full border-2 border-background" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-foreground">{getGreeting()}, {userName}! 👋</h1>
            <p className="text-xs text-muted-foreground">Resumo da sua conta</p>
          </div>
        </div>
        <Link href="/dashboard/seller">
          <motion.button
            className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-xl shadow-sm hover:bg-primary/90 transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Vender</span>
          </motion.button>
        </Link>
      </motion.div>

      {/* Stats Grid - Compacto */}
      <motion.div
        className="grid grid-cols-2 gap-3"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        {/* Card Carteira - Destaque */}
        <Link href="/dashboard/wallet" className="col-span-2">
          <motion.div
            className="bg-gradient-to-r from-poke-blue to-blue-600 rounded-2xl p-4 text-white relative overflow-hidden group"
            whileHover={{ scale: 1.02, boxShadow: '0 10px 40px rgba(59, 130, 246, 0.3)' }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
            <div className="flex items-center justify-between relative">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Wallet className="h-4 w-4 text-white/80" />
                  <span className="text-xs text-white/80 font-medium">Minha Carteira</span>
                </div>
                <div className="text-2xl font-bold">{formatCurrency(walletBalance)}</div>
                <p className="text-xs text-white/60 mt-0.5">Créditos disponíveis</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">Adicionar +</span>
                <ChevronRight className="h-5 w-5 text-white/60 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </motion.div>
        </Link>

        {/* Card Pedidos */}
        <motion.div
          whileHover={{ scale: 1.03, y: -2 }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        >
          <Link href="/dashboard/orders" className="block bg-card rounded-xl p-3.5 border border-border hover:border-border/80 hover:shadow-md transition-all group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-500/10 dark:bg-orange-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Package className="h-5 w-5 text-orange-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-foreground">{stats.totalOrders}</span>
                  {stats.pendingOrders > 0 && (
                    <span className="text-[10px] font-medium text-orange-600 dark:text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded-full">
                      {stats.pendingOrders} pend.
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Pedidos</p>
              </div>
            </div>
          </Link>
        </motion.div>

        {/* Card Pokémon */}
        <motion.div
          whileHover={{ scale: 1.03, y: -2 }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        >
          <Link href="/dashboard/seller" className="block bg-card rounded-xl p-3.5 border border-border hover:border-border/80 hover:shadow-md transition-all group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500/10 dark:bg-amber-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Sparkles className="h-5 w-5 text-amber-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-foreground">{stats.totalListings}</span>
                  {stats.activeListings > 0 && (
                    <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                      {stats.activeListings} ativos
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Pokémon</p>
              </div>
            </div>
          </Link>
        </motion.div>
      </motion.div>

      {/* Ações Rápidas - Design Moderno */}
      <motion.div
        className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <Link href="/dashboard/market" className="flex-shrink-0">
          <motion.div
            className="flex items-center gap-2.5 px-4 py-2.5 bg-gradient-to-r from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-xl hover:border-blue-500/40 hover:shadow-md hover:shadow-blue-500/10 transition-all group"
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-sm">
              <Store className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-semibold text-foreground">Mercado</span>
          </motion.div>
        </Link>
        <Link href="/dashboard/favorites" className="flex-shrink-0">
          <motion.div
            className="flex items-center gap-2.5 px-4 py-2.5 bg-gradient-to-r from-pink-500/10 to-pink-600/5 border border-pink-500/20 rounded-xl hover:border-pink-500/40 hover:shadow-md hover:shadow-pink-500/10 transition-all group"
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="w-9 h-9 bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl flex items-center justify-center shadow-sm">
              <Star className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-semibold text-foreground">Favoritos</span>
          </motion.div>
        </Link>
        <Link href="/dashboard/messages" className="flex-shrink-0">
          <motion.div
            className="flex items-center gap-2.5 px-4 py-2.5 bg-gradient-to-r from-green-500/10 to-green-600/5 border border-green-500/20 rounded-xl hover:border-green-500/40 hover:shadow-md hover:shadow-green-500/10 transition-all group"
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="w-9 h-9 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-sm">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-semibold text-foreground">Mensagens</span>
          </motion.div>
        </Link>
        <Link href="/dashboard/fees" className="flex-shrink-0">
          <motion.div
            className="flex items-center gap-2.5 px-4 py-2.5 bg-gradient-to-r from-purple-500/10 to-purple-600/5 border border-purple-500/20 rounded-xl hover:border-purple-500/40 hover:shadow-md hover:shadow-purple-500/10 transition-all group"
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-sm">
              <Gift className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-semibold text-foreground">Taxas</span>
          </motion.div>
        </Link>
      </motion.div>

      {/* Movimentações Recentes - Compacto */}
      <motion.div
        className="bg-card rounded-2xl border border-border overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Movimentações</h2>
          <Link href="/dashboard/orders" className="text-xs text-poke-blue font-medium flex items-center gap-0.5 hover:underline">
            Ver todas <ChevronRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="divide-y divide-border/50">
          {recentOrders.slice(0, 4).map((order) => {
            const isBuyer = order.buyer_id === userId;

            return (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                whileHover={{ backgroundColor: 'rgba(0,0,0,0.03)' }}
              >
                <Link
                  href="/dashboard/orders"
                  className="flex items-center gap-3 px-4 py-3 transition-colors"
                >
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                    isBuyer ? "bg-blue-500/10 dark:bg-blue-500/20" : "bg-emerald-500/10 dark:bg-emerald-500/20"
                  )}>
                    {isBuyer ? (
                      <ArrowUpRight className="h-4 w-4 text-blue-600" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4 text-emerald-600" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {order.listing?.title || 'Pokémon'}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatRelativeTime(order.created_at)}</p>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className={cn("text-sm font-semibold", isBuyer ? "text-blue-600" : "text-emerald-600")}>
                      {isBuyer ? '-' : '+'}{formatCurrency(order.amount_total)}
                    </p>
                    <StatusBadge status={order.status} />
                  </div>
                </Link>
              </motion.div>
            );
          })}

          {recentOrders.length === 0 && (
            <motion.div
              className="text-center py-8"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <motion.div
                className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center mx-auto mb-3"
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Package className="h-6 w-6 text-muted-foreground" />
              </motion.div>
              <p className="text-sm font-medium text-foreground">Nenhuma movimentação</p>
              <p className="text-xs text-muted-foreground mt-1">Suas transações aparecerão aqui</p>
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
