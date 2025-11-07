'use client';

import { useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabase-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, ShoppingBag, TrendingUp, Clock } from 'lucide-react';
import { formatCurrency, formatRelativeTime } from '@/lib/format';
import { StatusBadge } from '@/components/order/status-badge';
import Link from 'next/link';

export default function UserDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;

    setUserId(user.id);

    const { data: orders } = await supabaseClient
      .from('orders')
      .select(`
        *,
        listing:listing_id(title)
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

    setStats({
      totalOrders: orders?.length || 0,
      totalListings: listings?.length || 0,
      totalSpent,
      totalEarned,
    });

    setRecentOrders(orders || []);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-poke-blue mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-poke-dark">Meu Dashboard</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">
          Acompanhe suas movimentações e estatísticas
        </p>
      </div>

      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-poke-blue">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Minhas Ordens</CardTitle>
            <Package className="h-4 w-4 text-poke-blue" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-poke-blue">{stats.totalOrders}</div>
            <p className="text-xs text-muted-foreground">Total de transações</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-poke-yellow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Meus Pokémon</CardTitle>
            <ShoppingBag className="h-4 w-4 text-poke-yellow" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-poke-yellow">{stats.totalListings}</div>
            <p className="text-xs text-muted-foreground">Pokémon cadastrados</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-poke-blue">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Gasto</CardTitle>
            <TrendingUp className="h-4 w-4 text-poke-blue" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-poke-blue">
              {formatCurrency(stats.totalSpent)}
            </div>
            <p className="text-xs text-muted-foreground">Em compras</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-poke-yellow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Recebido</CardTitle>
            <TrendingUp className="h-4 w-4 text-poke-yellow" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-poke-yellow">
              {formatCurrency(stats.totalEarned)}
            </div>
            <p className="text-xs text-muted-foreground">Em vendas</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-poke-blue/20">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Movimentações Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 sm:space-y-4">
            {recentOrders.map((order) => (
              <div
                key={order.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border border-poke-blue/20 rounded-lg hover:bg-poke-blue/5 transition-colors gap-3"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 sm:gap-3 mb-1 flex-wrap">
                    <span className="font-mono text-sm text-muted-foreground">
                      {order.id.slice(0, 8)}
                    </span>
                    <StatusBadge status={order.status} />
                    {order.buyer_id === userId ? (
                      <span className="text-xs bg-poke-blue/10 text-poke-blue px-2 py-1 rounded">
                        Compra
                      </span>
                    ) : (
                      <span className="text-xs bg-poke-yellow/20 text-poke-yellow px-2 py-1 rounded">
                        Venda
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-medium">
                    {order.listing?.title || 'Pokémon'}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    <Clock className="h-3 w-3 inline mr-1" />
                    {formatRelativeTime(order.created_at)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-poke-blue">
                    {formatCurrency(order.amount_total)}
                  </div>
                </div>
              </div>
            ))}

            {recentOrders.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Nenhuma movimentação ainda</p>
                <p className="text-sm mt-2">
                  Suas compras e vendas aparecerão aqui
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
