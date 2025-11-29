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

export default function UserDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string>('');
  const [userName, setUserName] = useState<string>('');

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
          <div className="w-10 h-10 border-3 border-slate-200 rounded-full"></div>
          <div className="w-10 h-10 border-3 border-poke-blue border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
        </div>
      </div>
    );
  }

  // Hora do dia para saudação
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  return (
    <div className="space-y-4">
      {/* Header Compacto */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{getGreeting()}, {userName}! 👋</h1>
          <p className="text-sm text-slate-500">Resumo da sua conta</p>
        </div>
        <Link href="/dashboard/seller">
          <button className="flex items-center gap-1.5 px-3 py-2 bg-poke-blue text-white text-sm font-medium rounded-xl shadow-sm hover:bg-poke-blue/90 transition-colors">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Vender</span>
          </button>
        </Link>
      </div>

      {/* Stats Grid - Compacto */}
      <div className="grid grid-cols-2 gap-3">
        {/* Card Saldo - Destaque */}
        <Link href="/dashboard/wallet" className="col-span-2 bg-gradient-to-r from-poke-blue to-blue-600 rounded-2xl p-4 text-white relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="flex items-center justify-between relative">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Wallet className="h-4 w-4 text-white/80" />
                <span className="text-xs text-white/80 font-medium">Saldo</span>
              </div>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalEarned)}</div>
            </div>
            <ChevronRight className="h-5 w-5 text-white/60 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Card Pedidos */}
        <Link href="/dashboard/orders" className="bg-white rounded-xl p-3.5 border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <Package className="h-5 w-5 text-orange-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-slate-900">{stats.totalOrders}</span>
                {stats.pendingOrders > 0 && (
                  <span className="text-[10px] font-medium text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full">
                    {stats.pendingOrders} pend.
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">Pedidos</p>
            </div>
          </div>
        </Link>

        {/* Card Pokémon */}
        <Link href="/dashboard/seller" className="bg-white rounded-xl p-3.5 border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <Sparkles className="h-5 w-5 text-amber-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-slate-900">{stats.totalListings}</span>
                {stats.activeListings > 0 && (
                  <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                    {stats.activeListings} ativos
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">Pokémon</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Ações Rápidas - Compacto */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        <Link href="/dashboard/market" className="flex-shrink-0">
          <div className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-100 rounded-xl hover:border-slate-200 hover:shadow-sm transition-all">
            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
              <Store className="h-4 w-4 text-blue-600" />
            </div>
            <span className="text-sm font-medium text-slate-700">Mercado</span>
          </div>
        </Link>
        <Link href="/dashboard/favorites" className="flex-shrink-0">
          <div className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-100 rounded-xl hover:border-slate-200 hover:shadow-sm transition-all">
            <div className="w-8 h-8 bg-pink-50 rounded-lg flex items-center justify-center">
              <Star className="h-4 w-4 text-pink-600" />
            </div>
            <span className="text-sm font-medium text-slate-700">Favoritos</span>
          </div>
        </Link>
        <Link href="/dashboard/messages" className="flex-shrink-0">
          <div className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-100 rounded-xl hover:border-slate-200 hover:shadow-sm transition-all">
            <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
              <Zap className="h-4 w-4 text-green-600" />
            </div>
            <span className="text-sm font-medium text-slate-700">Mensagens</span>
          </div>
        </Link>
        <Link href="/dashboard/fees" className="flex-shrink-0">
          <div className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-100 rounded-xl hover:border-slate-200 hover:shadow-sm transition-all">
            <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center">
              <Gift className="h-4 w-4 text-purple-600" />
            </div>
            <span className="text-sm font-medium text-slate-700">Taxas</span>
          </div>
        </Link>
      </div>

      {/* Movimentações Recentes - Compacto */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-900">Movimentações</h2>
          <Link href="/dashboard/orders" className="text-xs text-poke-blue font-medium flex items-center gap-0.5 hover:underline">
            Ver todas <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        
        <div className="divide-y divide-slate-50">
          {recentOrders.slice(0, 4).map((order) => {
            const isBuyer = order.buyer_id === userId;
            
            return (
              <Link 
                key={order.id} 
                href="/dashboard/orders"
                className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors"
              >
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                  isBuyer ? "bg-blue-50" : "bg-emerald-50"
                )}>
                  {isBuyer ? (
                    <ArrowUpRight className="h-4 w-4 text-blue-600" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 text-emerald-600" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {order.listing?.title || 'Pokémon'}
                  </p>
                  <p className="text-xs text-slate-500">{formatRelativeTime(order.created_at)}</p>
                </div>
                
                <div className="text-right flex-shrink-0">
                  <p className={cn("text-sm font-semibold", isBuyer ? "text-blue-600" : "text-emerald-600")}>
                    {isBuyer ? '-' : '+'}{formatCurrency(order.amount_total)}
                  </p>
                  <StatusBadge status={order.status} />
                </div>
              </Link>
            );
          })}

          {recentOrders.length === 0 && (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Package className="h-6 w-6 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-700">Nenhuma movimentação</p>
              <p className="text-xs text-slate-500 mt-1">Suas transações aparecerão aqui</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
