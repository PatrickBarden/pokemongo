import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getOrderStats, listOrders } from '@/server/queries/orders';
import { Package, Clock, AlertTriangle, DollarSign, TrendingUp, Timer } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import Link from 'next/link';
import { StatusBadge } from '@/components/order/status-badge';
import { formatDateTime, formatRelativeTime } from '@/lib/format';

export default async function AdminDashboard() {
  const stats = await getOrderStats();
  const recentOrders = await listOrders();

  const topOrders = recentOrders?.slice(0, 10) || [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-poke-dark">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Visão geral da plataforma de intermediação
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="border-l-4 border-l-poke-blue">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ordens Abertas</CardTitle>
            <Package className="h-4 w-4 text-poke-blue" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-poke-blue">{stats?.openOrders || 0}</div>
            <p className="text-xs text-muted-foreground">
              Em andamento
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-poke-yellow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Revisão</CardTitle>
            <Clock className="h-4 w-4 text-poke-yellow" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-poke-yellow">{stats?.inReview || 0}</div>
            <p className="text-xs text-muted-foreground">
              Aguardando aprovação
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-poke-red">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Disputas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-poke-red" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-poke-red">{stats?.disputes || 0}</div>
            <p className="text-xs text-muted-foreground">
              Requerem atenção
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-poke-blue">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita (Fee)</CardTitle>
            <DollarSign className="h-4 w-4 text-poke-blue" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-poke-blue">{formatCurrency(stats?.revenue || 0)}</div>
            <p className="text-xs text-muted-foreground">
              Total de taxas recebidas
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-poke-yellow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
            <TrendingUp className="h-4 w-4 text-poke-yellow" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-poke-yellow">{stats?.conversionRate.toFixed(1) || 0}%</div>
            <p className="text-xs text-muted-foreground">
              Pagamento → Conclusão
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-poke-blue">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
            <Timer className="h-4 w-4 text-poke-blue" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-poke-blue">{stats?.avgCompletionTime.toFixed(0) || 0}h</div>
            <p className="text-xs text-muted-foreground">
              Conclusão de ordens
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-poke-blue/20">
        <CardHeader>
          <CardTitle>Ordens Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topOrders.map((order: any) => (
              <Link
                key={order.id}
                href={`/admin/orders/${order.id}`}
                className="flex items-center justify-between p-4 border border-poke-blue/20 rounded-lg hover:bg-poke-blue/5 hover:border-poke-blue transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-mono text-sm text-muted-foreground">
                      {order.id.slice(0, 8)}
                    </span>
                    <StatusBadge status={order.status} />
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">{order.listing?.title}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Comprador: {order.buyer?.display_name || 'N/A'}
                    {order.seller && ` • Vendedor: ${order.seller?.display_name}`}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{formatCurrency(order.amount_total)}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatRelativeTime(order.created_at)}
                  </div>
                </div>
              </Link>
            ))}
            {topOrders.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma ordem encontrada
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
