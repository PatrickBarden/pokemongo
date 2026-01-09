'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  DollarSign, 
  Users, 
  Package, 
  ShoppingCart,
  Download,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  FileText,
  PieChart,
  Activity,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { formatCurrency } from '@/lib/format';
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Cliente Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface ReportData {
  // Vendas
  totalSales: number;
  totalRevenue: number;
  averageTicket: number;
  salesByStatus: Record<string, number>;
  
  // Usuários
  totalUsers: number;
  newUsersThisPeriod: number;
  activeUsers: number;
  
  // Anúncios
  totalListings: number;
  activeListings: number;
  listingsByCategory: Record<string, number>;
  
  // Financeiro
  pendingPayouts: number;
  completedPayouts: number;
  totalPayoutAmount: number;
  platformFees: number;
  
  // Conversas
  totalConversations: number;
  activeConversations: number;
  closedConversations: number;
  averageRating: number;
  
  // Top Vendedores
  topSellers: Array<{
    id: string;
    name: string;
    sales: number;
    revenue: number;
  }>;
  
  // Vendas por dia
  salesByDay: Array<{
    date: string;
    count: number;
    revenue: number;
  }>;
}

type PeriodFilter = '7d' | '30d' | '90d' | 'month' | 'all';

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodFilter>('30d');
  const [data, setData] = useState<ReportData | null>(null);

  useEffect(() => {
    loadReportData();
  }, [period]);

  const getDateRange = () => {
    const now = new Date();
    switch (period) {
      case '7d':
        return { start: subDays(now, 7), end: now };
      case '30d':
        return { start: subDays(now, 30), end: now };
      case '90d':
        return { start: subDays(now, 90), end: now };
      case 'month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'all':
        return { start: new Date('2020-01-01'), end: now };
      default:
        return { start: subDays(now, 30), end: now };
    }
  };

  const loadReportData = async () => {
    setLoading(true);
    const { start, end } = getDateRange();
    const startStr = start.toISOString();
    const endStr = end.toISOString();

    try {
      // Buscar pedidos
      const { data: orders } = await supabase
        .from('orders')
        .select('*, order_items(*, seller:seller_id(id, display_name))')
        .gte('created_at', startStr)
        .lte('created_at', endStr);

      // Buscar usuários
      const { data: users } = await supabase
        .from('users')
        .select('*');

      const { data: newUsers } = await supabase
        .from('users')
        .select('*')
        .gte('created_at', startStr)
        .lte('created_at', endStr);

      // Buscar anúncios
      const { data: listings } = await supabase
        .from('listings')
        .select('*');

      // Buscar conversas
      const { data: conversations } = await supabase
        .from('conversations')
        .select('*');

      // Processar dados
      const ordersData = orders || [];
      const usersData = users || [];
      const listingsData = listings || [];
      const conversationsData = conversations || [];

      // Calcular métricas de vendas
      const completedOrders = ordersData.filter((o: any) => o.status === 'completed');
      const totalRevenue = completedOrders.reduce((sum: number, o: any) => sum + (Number(o.total_amount) || 0), 0);
      const averageTicket = completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0;

      // Status dos pedidos
      const salesByStatus: Record<string, number> = {};
      ordersData.forEach((o: any) => {
        salesByStatus[o.status] = (salesByStatus[o.status] || 0) + 1;
      });

      // Categorias de anúncios
      const listingsByCategory: Record<string, number> = {};
      listingsData.forEach((l: any) => {
        listingsByCategory[l.category] = (listingsByCategory[l.category] || 0) + 1;
      });

      // Payouts
      const pendingPayouts = ordersData.filter((o: any) => o.status === 'completed' && !o.payout_completed).length;
      const completedPayouts = ordersData.filter((o: any) => o.payout_completed).length;
      const totalPayoutAmount = ordersData
        .filter((o: any) => o.payout_completed)
        .reduce((sum: number, o: any) => sum + (Number(o.total_amount) * 0.9 || 0), 0);
      const platformFees = totalRevenue * 0.1;

      // Conversas
      const activeConvs = conversationsData.filter((c: any) => c.status === 'ACTIVE').length;
      const closedConvs = conversationsData.filter((c: any) => c.status === 'CLOSED').length;
      const ratings = conversationsData
        .filter((c: any) => c.buyer_rating || c.seller_rating)
        .map((c: any) => (c.buyer_rating || 0) + (c.seller_rating || 0))
        .filter((r: number) => r > 0);
      const avgRating = ratings.length > 0 ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length / 2 : 0;

      // Top vendedores
      const sellerSales: Record<string, { name: string; sales: number; revenue: number }> = {};
      completedOrders.forEach((o: any) => {
        o.order_items?.forEach((item: any) => {
          const sellerId = item.seller_id;
          const sellerName = item.seller?.display_name || 'Desconhecido';
          if (!sellerSales[sellerId]) {
            sellerSales[sellerId] = { name: sellerName, sales: 0, revenue: 0 };
          }
          sellerSales[sellerId].sales += 1;
          sellerSales[sellerId].revenue += Number(item.price) || 0;
        });
      });
      const topSellers = Object.entries(sellerSales)
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Vendas por dia (últimos 7 dias)
      const salesByDay: Array<{ date: string; count: number; revenue: number }> = [];
      for (let i = 6; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const dateStr = format(date, 'yyyy-MM-dd');
        const dayOrders = ordersData.filter((o: any) => 
          o.created_at?.startsWith(dateStr)
        );
        salesByDay.push({
          date: format(date, 'dd/MM', { locale: ptBR }),
          count: dayOrders.length,
          revenue: dayOrders.reduce((sum: number, o: any) => sum + (Number(o.total_amount) || 0), 0)
        });
      }

      setData({
        totalSales: ordersData.length,
        totalRevenue,
        averageTicket,
        salesByStatus,
        totalUsers: usersData.length,
        newUsersThisPeriod: newUsers?.length || 0,
        activeUsers: usersData.filter((u: any) => !u.banned_at).length,
        totalListings: listingsData.length,
        activeListings: listingsData.filter((l: any) => l.active).length,
        listingsByCategory,
        pendingPayouts,
        completedPayouts,
        totalPayoutAmount,
        platformFees,
        totalConversations: conversationsData.length,
        activeConversations: activeConvs,
        closedConversations: closedConvs,
        averageRating: avgRating,
        topSellers,
        salesByDay
      });
    } catch (error) {
      console.error('Erro ao carregar relatórios:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = (type: string) => {
    if (!data) return;
    
    let csvContent = '';
    let filename = '';
    
    switch (type) {
      case 'sales':
        csvContent = 'Status,Quantidade\n';
        Object.entries(data.salesByStatus).forEach(([status, count]) => {
          csvContent += `${status},${count}\n`;
        });
        filename = 'relatorio-vendas.csv';
        break;
      case 'sellers':
        csvContent = 'Vendedor,Vendas,Receita\n';
        data.topSellers.forEach(seller => {
          csvContent += `${seller.name},${seller.sales},${seller.revenue}\n`;
        });
        filename = 'top-vendedores.csv';
        break;
      case 'daily':
        csvContent = 'Data,Pedidos,Receita\n';
        data.salesByDay.forEach(day => {
          csvContent += `${day.date},${day.count},${day.revenue}\n`;
        });
        filename = 'vendas-diarias.csv';
        break;
    }
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  const StatCard = ({ 
    title, 
    value, 
    subtitle, 
    icon: Icon, 
    trend, 
    trendValue,
    color = 'blue'
  }: {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: any;
    trend?: 'up' | 'down' | 'neutral';
    trendValue?: string;
    color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
  }) => {
    const colorClasses = {
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      yellow: 'bg-yellow-500',
      red: 'bg-red-500',
      purple: 'bg-purple-500'
    };

    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <p className="text-2xl font-bold mt-1">{value}</p>
              {subtitle && (
                <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
              )}
              {trend && trendValue && (
                <div className={`flex items-center mt-2 text-xs ${
                  trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-500'
                }`}>
                  {trend === 'up' ? <ArrowUpRight className="h-3 w-3 mr-1" /> : 
                   trend === 'down' ? <ArrowDownRight className="h-3 w-3 mr-1" /> : null}
                  {trendValue}
                </div>
              )}
            </div>
            <div className={`p-3 rounded-full ${colorClasses[color]} bg-opacity-10`}>
              <Icon className={`h-6 w-6 text-${color}-500`} />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-poke-blue" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Relatórios</h1>
          <p className="text-muted-foreground mt-1">
            Análise completa do marketplace
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={(v) => setPeriod(v as PeriodFilter)}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="90d">Últimos 90 dias</SelectItem>
              <SelectItem value="month">Este mês</SelectItem>
              <SelectItem value="all">Todo período</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={loadReportData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* KPIs Principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Receita Total"
          value={formatCurrency(data?.totalRevenue || 0)}
          subtitle={`${data?.totalSales || 0} pedidos`}
          icon={DollarSign}
          color="green"
        />
        <StatCard
          title="Ticket Médio"
          value={formatCurrency(data?.averageTicket || 0)}
          subtitle="Por pedido concluído"
          icon={ShoppingCart}
          color="blue"
        />
        <StatCard
          title="Taxa da Plataforma"
          value={formatCurrency(data?.platformFees || 0)}
          subtitle="10% das vendas"
          icon={Wallet}
          color="purple"
        />
        <StatCard
          title="Usuários"
          value={data?.totalUsers || 0}
          subtitle={`+${data?.newUsersThisPeriod || 0} novos no período`}
          icon={Users}
          color="yellow"
        />
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">
            <BarChart3 className="h-4 w-4 mr-2" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="sales">
            <ShoppingCart className="h-4 w-4 mr-2" />
            Vendas
          </TabsTrigger>
          <TabsTrigger value="financial">
            <DollarSign className="h-4 w-4 mr-2" />
            Financeiro
          </TabsTrigger>
          <TabsTrigger value="users">
            <Users className="h-4 w-4 mr-2" />
            Usuários
          </TabsTrigger>
          <TabsTrigger value="listings">
            <Package className="h-4 w-4 mr-2" />
            Anúncios
          </TabsTrigger>
        </TabsList>

        {/* Visão Geral */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Gráfico de Vendas por Dia */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Vendas dos Últimos 7 Dias</CardTitle>
                  <CardDescription>Pedidos e receita diária</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => exportToCSV('daily')}>
                  <Download className="h-4 w-4 mr-1" />
                  CSV
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data?.salesByDay.map((day, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-sm font-medium w-16">{day.date}</span>
                      <div className="flex-1 mx-4">
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-poke-blue rounded-full transition-all"
                            style={{ 
                              width: `${Math.min(100, (day.count / Math.max(...data.salesByDay.map(d => d.count), 1)) * 100)}%` 
                            }}
                          />
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold">{day.count}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {formatCurrency(day.revenue)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Status dos Pedidos */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Status dos Pedidos</CardTitle>
                <CardDescription>Distribuição por status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(data?.salesByStatus || {}).map(([status, count]) => {
                    const statusConfig: Record<string, { label: string; color: string }> = {
                      pending: { label: 'Pendente', color: 'bg-yellow-500' },
                      payment_confirmed: { label: 'Pago', color: 'bg-blue-500' },
                      completed: { label: 'Concluído', color: 'bg-green-500' },
                      cancelled: { label: 'Cancelado', color: 'bg-red-500' },
                      refunded: { label: 'Reembolsado', color: 'bg-orange-500' },
                    };
                    const config = statusConfig[status] || { label: status, color: 'bg-gray-500' };
                    const total = Object.values(data?.salesByStatus || {}).reduce((a, b) => a + b, 0);
                    const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
                    
                    return (
                      <div key={status} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${config.color}`} />
                          <span className="text-sm">{config.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold">{count}</span>
                          <span className="text-xs text-muted-foreground">({percentage}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Vendedores */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Top Vendedores</CardTitle>
                <CardDescription>Maiores vendedores do período</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => exportToCSV('sellers')}>
                <Download className="h-4 w-4 mr-1" />
                CSV
              </Button>
            </CardHeader>
            <CardContent>
              {data?.topSellers && data.topSellers.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Posição</TableHead>
                      <TableHead>Vendedor</TableHead>
                      <TableHead className="text-center">Vendas</TableHead>
                      <TableHead className="text-right">Receita</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.topSellers.map((seller, i) => (
                      <TableRow key={seller.id}>
                        <TableCell>
                          <Badge variant={i === 0 ? 'default' : 'outline'} className={
                            i === 0 ? 'bg-yellow-500' : i === 1 ? 'bg-slate-400' : i === 2 ? 'bg-amber-600' : ''
                          }>
                            #{i + 1}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{seller.name}</TableCell>
                        <TableCell className="text-center">{seller.sales}</TableCell>
                        <TableCell className="text-right font-bold text-green-600">
                          {formatCurrency(seller.revenue)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p>Nenhuma venda no período</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vendas */}
        <TabsContent value="sales" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <StatCard
              title="Total de Pedidos"
              value={data?.totalSales || 0}
              icon={ShoppingCart}
              color="blue"
            />
            <StatCard
              title="Concluídos"
              value={data?.salesByStatus?.completed || 0}
              icon={CheckCircle2}
              color="green"
            />
            <StatCard
              title="Pendentes"
              value={data?.salesByStatus?.pending || 0}
              icon={Clock}
              color="yellow"
            />
            <StatCard
              title="Cancelados"
              value={data?.salesByStatus?.cancelled || 0}
              icon={XCircle}
              color="red"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Taxa de Conversão</CardTitle>
              <CardDescription>Análise de funil de vendas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { label: 'Pedidos Criados', value: data?.totalSales || 0, color: 'bg-blue-500' },
                  { label: 'Pagamentos Confirmados', value: (data?.salesByStatus?.payment_confirmed || 0) + (data?.salesByStatus?.completed || 0), color: 'bg-green-500' },
                  { label: 'Concluídos', value: data?.salesByStatus?.completed || 0, color: 'bg-emerald-500' },
                ].map((item, i) => {
                  const total = data?.totalSales || 1;
                  const percentage = ((item.value / total) * 100).toFixed(1);
                  return (
                    <div key={i}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{item.label}</span>
                        <span className="font-medium">{item.value} ({percentage}%)</span>
                      </div>
                      <div className="h-3 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${item.color} rounded-full transition-all`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Financeiro */}
        <TabsContent value="financial" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <StatCard
              title="Receita Bruta"
              value={formatCurrency(data?.totalRevenue || 0)}
              icon={DollarSign}
              color="green"
            />
            <StatCard
              title="Taxa Plataforma (10%)"
              value={formatCurrency(data?.platformFees || 0)}
              icon={Wallet}
              color="purple"
            />
            <StatCard
              title="Payouts Pendentes"
              value={data?.pendingPayouts || 0}
              icon={AlertCircle}
              color="yellow"
            />
            <StatCard
              title="Payouts Realizados"
              value={formatCurrency(data?.totalPayoutAmount || 0)}
              subtitle={`${data?.completedPayouts || 0} repasses`}
              icon={CheckCircle2}
              color="green"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Resumo Financeiro</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">Receita Total</span>
                    <span className="font-bold text-lg">{formatCurrency(data?.totalRevenue || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-muted-foreground">(-) Repasses Vendedores (90%)</span>
                    <span className="font-medium text-red-600">
                      -{formatCurrency((data?.totalRevenue || 0) * 0.9)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 bg-green-500/10 px-3 rounded-lg">
                    <span className="font-medium text-green-500">Lucro Plataforma</span>
                    <span className="font-bold text-lg text-green-500">
                      {formatCurrency(data?.platformFees || 0)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Status dos Payouts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-yellow-500/10 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-yellow-500" />
                      <span className="font-medium">Aguardando Repasse</span>
                    </div>
                    <Badge variant="outline" className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">
                      {data?.pendingPayouts || 0}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      <span className="font-medium">Repasses Concluídos</span>
                    </div>
                    <Badge variant="outline" className="bg-green-500/20 text-green-500 border-green-500/30">
                      {data?.completedPayouts || 0}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Usuários */}
        <TabsContent value="users" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <StatCard
              title="Total de Usuários"
              value={data?.totalUsers || 0}
              icon={Users}
              color="blue"
            />
            <StatCard
              title="Novos no Período"
              value={data?.newUsersThisPeriod || 0}
              icon={TrendingUp}
              color="green"
            />
            <StatCard
              title="Usuários Ativos"
              value={data?.activeUsers || 0}
              icon={Activity}
              color="purple"
            />
            <StatCard
              title="Avaliação Média"
              value={data?.averageRating ? data.averageRating.toFixed(1) + ' ⭐' : 'N/A'}
              icon={CheckCircle2}
              color="yellow"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Engajamento</CardTitle>
              <CardDescription>Métricas de conversas e interações</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center p-4 bg-blue-500/10 rounded-lg">
                  <p className="text-3xl font-bold text-poke-blue">{data?.totalConversations || 0}</p>
                  <p className="text-sm text-muted-foreground">Conversas Totais</p>
                </div>
                <div className="text-center p-4 bg-green-500/10 rounded-lg">
                  <p className="text-3xl font-bold text-green-500">{data?.activeConversations || 0}</p>
                  <p className="text-sm text-muted-foreground">Conversas Ativas</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-3xl font-bold text-muted-foreground">{data?.closedConversations || 0}</p>
                  <p className="text-sm text-muted-foreground">Conversas Encerradas</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Anúncios */}
        <TabsContent value="listings" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard
              title="Total de Anúncios"
              value={data?.totalListings || 0}
              icon={Package}
              color="blue"
            />
            <StatCard
              title="Anúncios Ativos"
              value={data?.activeListings || 0}
              icon={CheckCircle2}
              color="green"
            />
            <StatCard
              title="Inativos"
              value={(data?.totalListings || 0) - (data?.activeListings || 0)}
              icon={XCircle}
              color="red"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Anúncios por Categoria</CardTitle>
              <CardDescription>Distribuição dos anúncios</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(data?.listingsByCategory || {}).map(([category, count]) => {
                  const total = data?.totalListings || 1;
                  const percentage = ((count / total) * 100).toFixed(1);
                  const categoryLabels: Record<string, string> = {
                    pokemon: 'Pokémon',
                    item: 'Item',
                    service: 'Serviço',
                    account: 'Conta'
                  };
                  
                  return (
                    <div key={category}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{categoryLabels[category] || category}</span>
                        <span className="font-medium">{count} ({percentage}%)</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-poke-blue rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
