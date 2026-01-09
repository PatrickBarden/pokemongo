'use client';

import { useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabase-client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/format';
import { 
  TrendingUp, 
  DollarSign, 
  Package, 
  Eye, 
  Heart, 
  Star, 
  ShoppingBag,
  Clock,
  CheckCircle2,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  RefreshCw,
  Plus,
  ExternalLink
} from 'lucide-react';
import { SellerBadge } from '@/components/reviews';
import { 
  getSellerStats, 
  getMonthlySales, 
  getTopListings, 
  getRecentSales,
  getPendingSellerOrders,
  type SellerStats,
  type MonthlySales,
  type TopListing,
  type RecentSale
} from '@/server/actions/seller-dashboard';
import Link from 'next/link';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function SellerDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');
  const [stats, setStats] = useState<SellerStats | null>(null);
  const [monthlySales, setMonthlySales] = useState<MonthlySales[]>([]);
  const [topListings, setTopListings] = useState<TopListing[]>([]);
  const [recentSales, setRecentSales] = useState<RecentSale[]>([]);
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);

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

      // Carregar dados em paralelo com tratamento individual de erros
      const [statsData, monthlyData, topData, recentData, pendingData] = await Promise.all([
        getSellerStats(user.id).catch(() => null),
        getMonthlySales(user.id).catch(() => []),
        getTopListings(user.id, 5).catch(() => []),
        getRecentSales(user.id, 10).catch(() => []),
        getPendingSellerOrders(user.id).catch(() => [])
      ]);

      // Definir valores padrão se os dados não carregarem
      setStats(statsData || {
        totalSales: 0,
        totalRevenue: 0,
        totalListings: 0,
        activeListings: 0,
        pendingOrders: 0,
        completedOrders: 0,
        averageRating: 0,
        totalReviews: 0,
        reputationScore: 100,
        sellerLevel: 'bronze',
        verifiedSeller: false,
        conversionRate: 0,
        totalViews: 0,
        totalFavorites: 0
      });
      setMonthlySales(monthlyData || []);
      setTopListings(topData || []);
      setRecentSales(recentData || []);
      setPendingOrders(pendingData || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      // Definir valores padrão em caso de erro geral
      setStats({
        totalSales: 0,
        totalRevenue: 0,
        totalListings: 0,
        activeListings: 0,
        pendingOrders: 0,
        completedOrders: 0,
        averageRating: 0,
        totalReviews: 0,
        reputationScore: 100,
        sellerLevel: 'bronze',
        verifiedSeller: false,
        conversionRate: 0,
        totalViews: 0,
        totalFavorites: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: { [key: string]: { label: string; color: string } } = {
      awaiting_seller: { label: 'Aguardando Você', color: 'bg-yellow-500' },
      seller_accepted: { label: 'Aceito', color: 'bg-blue-500' },
      in_delivery: { label: 'Em Entrega', color: 'bg-purple-500' },
      delivery_submitted: { label: 'Entrega Enviada', color: 'bg-cyan-500' },
      completed: { label: 'Concluído', color: 'bg-green-500' },
      cancelled: { label: 'Cancelado', color: 'bg-red-500' },
      pending: { label: 'Pendente', color: 'bg-gray-500' },
    };
    const config = statusConfig[status] || { label: status, color: 'bg-gray-500' };
    return <Badge className={`${config.color} text-white border-0`}>{config.label}</Badge>;
  };

  // Calcular maior valor do gráfico
  const maxRevenue = Math.max(...monthlySales.map(m => m.revenue), 1);

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

  return (
    <div className="space-y-4">
      {/* Header Compacto */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Minhas Vendas</h1>
          <p className="text-sm text-muted-foreground">Acompanhe sua performance</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadData} className="p-2 text-muted-foreground hover:bg-accent rounded-lg transition-colors">
            <RefreshCw className="h-4 w-4" />
          </button>
          <Link href="/dashboard/listings/new">
            <button className="flex items-center gap-1.5 px-3 py-2 bg-poke-blue text-white text-sm font-medium rounded-xl hover:bg-poke-blue/90 transition-colors">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Anunciar</span>
            </button>
          </Link>
        </div>
      </div>

      {/* Seller Badge - Compacto */}
      {stats && (
        <div className="bg-gradient-to-r from-poke-blue to-blue-600 rounded-2xl p-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <SellerBadge
                level={stats.sellerLevel as any}
                verified={stats.verifiedSeller}
                rating={stats.averageRating}
                size="md"
              />
              <div>
                <p className="text-xs text-white/70">Reputação</p>
                <p className="text-2xl font-bold">{stats.reputationScore}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-white/70">Receita Total</p>
              <p className="text-xl font-bold">{formatCurrency(stats?.totalRevenue || 0)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid - Compacto 2x2 */}
      <div className="grid grid-cols-4 gap-2">
        <div className="bg-card rounded-xl p-3 border border-border">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <p className="text-lg font-bold text-foreground">{stats?.completedOrders || 0}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Vendas</p>
        </div>

        <div className="bg-card rounded-xl p-3 border border-border">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 bg-purple-500/10 dark:bg-purple-500/20 rounded-lg flex items-center justify-center">
              <Package className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <p className="text-lg font-bold text-foreground">{stats?.activeListings || 0}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Ativos</p>
        </div>

        <div className="bg-card rounded-xl p-3 border border-border">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 bg-amber-500/10 dark:bg-amber-500/20 rounded-lg flex items-center justify-center">
              <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <p className="text-lg font-bold text-foreground">{stats?.pendingOrders || 0}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Pendentes</p>
        </div>

        <div className="bg-card rounded-xl p-3 border border-border">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 bg-rose-500/10 dark:bg-rose-500/20 rounded-lg flex items-center justify-center">
              <Heart className="h-3.5 w-3.5 text-rose-500 dark:text-rose-400" />
            </div>
          </div>
          <p className="text-lg font-bold text-foreground">{stats?.totalFavorites || 0}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Favoritos</p>
        </div>
      </div>

      {/* Stats Secundários - Inline */}
      <div className="flex items-center gap-4 text-sm flex-wrap">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Eye className="h-4 w-4 text-muted-foreground/70" />
          <span className="font-medium text-foreground">{stats?.totalViews || 0}</span>
          <span className="text-muted-foreground">views</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Star className="h-4 w-4 text-amber-400" />
          <span className="font-medium text-foreground">{(stats?.averageRating || 0).toFixed(1)}</span>
          <span className="text-muted-foreground">avaliação</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <TrendingUp className="h-4 w-4 text-cyan-500" />
          <span className="font-medium text-foreground">{stats?.conversionRate || 0}%</span>
          <span className="text-muted-foreground">conversão</span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Gráfico de Vendas Mensais - Compacto */}
        <div className="bg-card rounded-2xl border border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-poke-blue" />
              Receita Mensal
            </h3>
            <span className="text-xs text-muted-foreground">6 meses</span>
          </div>
          <div className="space-y-2">
            {monthlySales.map((month, index) => (
              <div key={index} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-8">{month.month.slice(0, 3)}</span>
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-poke-blue to-blue-400 rounded-full"
                    style={{ width: `${(month.revenue / maxRevenue) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-foreground w-16 text-right">
                  {formatCurrency(month.revenue)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Anúncios Mais Populares - Compacto */}
        <div className="bg-card rounded-2xl border border-border p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              Top Anúncios
            </h3>
            <span className="text-xs text-muted-foreground">por views</span>
          </div>
          {topListings.length > 0 ? (
            <div className="space-y-2">
              {topListings.slice(0, 5).map((listing, index) => (
                <div key={listing.id} className="flex items-center gap-2 py-1.5">
                  <span className="text-xs font-bold text-muted-foreground/50 w-4">{index + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate flex items-center gap-1">
                      {listing.title}
                      {listing.is_shiny && <Sparkles className="h-3 w-3 text-amber-500" />}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span>{listing.view_count} views</span>
                      <span>•</span>
                      <span>{listing.favorite_count} ❤️</span>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-poke-blue">{formatCurrency(listing.price_suggested)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <Package className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
              <p className="text-xs text-muted-foreground">Nenhum anúncio</p>
            </div>
          )}
        </div>
      </div>

      {/* Pedidos Pendentes - Compacto */}
      {pendingOrders.length > 0 && (
        <div className="bg-amber-500/10 dark:bg-amber-500/20 rounded-2xl border border-amber-500/30 p-4">
          <h3 className="text-sm font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4" />
            Pendentes ({pendingOrders.length})
          </h3>
          <div className="space-y-2">
            {pendingOrders.slice(0, 3).map((order) => (
              <div key={order.id} className="flex items-center justify-between p-2 bg-card rounded-xl border border-border">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{order.listing?.title || 'Pokémon'}</p>
                  <p className="text-xs text-muted-foreground">{order.buyer?.display_name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-poke-blue">
                    {formatCurrency(order.total_amount || order.amount_total || 0)}
                  </span>
                  <Link href={`/dashboard/orders/${order.id}`}>
                    <button className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Vendas Recentes - Compacto */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-poke-blue" />
            Vendas Recentes
          </h3>
        </div>
        {recentSales.length > 0 ? (
          <div className="divide-y divide-border">
            {recentSales.slice(0, 5).map((sale) => (
              <div key={sale.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{sale.pokemon_name}</p>
                  <p className="text-xs text-muted-foreground">{sale.buyer_name} • {format(new Date(sale.created_at), "dd/MM", { locale: ptBR })}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-emerald-500">{formatCurrency(sale.amount)}</p>
                  {getStatusBadge(sale.status)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <ShoppingBag className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Nenhuma venda ainda</p>
          </div>
        )}
      </div>

      {/* Botão Flutuante - Cadastrar Pokémon */}
      <Link href="/dashboard/listings/new" className="lg:hidden fixed bottom-20 right-4 z-50">
        <button className="flex items-center justify-center w-14 h-14 bg-gradient-to-r from-poke-blue to-blue-600 text-white rounded-full shadow-lg shadow-poke-blue/30 hover:shadow-xl hover:shadow-poke-blue/40 hover:scale-105 transition-all duration-200 animate-bounce-slow">
          <Plus className="h-6 w-6" />
        </button>
      </Link>
    </div>
  );
}
