import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getOrderStats, listOrders } from '@/server/queries/orders';
import { Package, Clock, AlertTriangle, DollarSign, TrendingUp, Timer, Bell, CheckCircle2, UserPlus, ArrowRight, CreditCard, XCircle, Hourglass } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import Link from 'next/link';
import { StatusBadge } from '@/components/order/status-badge';
import { formatDateTime, formatRelativeTime } from '@/lib/format';
import { getAdminNotifications } from './admin-actions';

export default async function AdminDashboard() {
  const stats = await getOrderStats();
  const recentOrders = await listOrders();
  const notifications = await getAdminNotifications();

  const topOrders = recentOrders?.slice(0, 10) || [];

  const getSeverityColor = (severity: string, type?: string) => {
    // Cores especiais para tipos de pagamento
    if (type === 'payment_approved') return 'bg-green-100 text-green-600 border-green-200';
    if (type === 'payment_rejected') return 'bg-red-100 text-red-600 border-red-200';
    if (type === 'payment_pending') return 'bg-amber-100 text-amber-600 border-amber-200';
    
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-600 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-600 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-600 border-yellow-200';
      default: return 'bg-blue-100 text-blue-600 border-blue-200';
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'dispute': return AlertTriangle;
      case 'payout': return DollarSign;
      case 'order_check': return Package;
      case 'new_user': return UserPlus;
      case 'payment_approved': return CreditCard;
      case 'payment_pending': return Hourglass;
      case 'payment_rejected': return XCircle;
      case 'new_order': return Package;
      case 'delivery_submitted': return CheckCircle2;
      default: return Bell;
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-poke-dark">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Visão geral da plataforma de intermediação
          </p>
        </div>
        {notifications.length > 0 && (
          <div className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-full border border-red-100 animate-pulse">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-semibold">{notifications.length} Ações Necessárias</span>
          </div>
        )}
      </div>

      {/* Central de Ação / Notificações */}
      <Card className="border-l-4 border-l-poke-red shadow-md bg-white/50 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bell className="h-5 w-5 text-poke-red" />
              Central de Ação
            </CardTitle>
            <span className="text-xs text-muted-foreground">
              {notifications.length} pendências
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {notifications.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {notifications.map((notif) => {
                const Icon = getNotificationIcon(notif.type);
                return (
                  <Link 
                    href={notif.link} 
                    key={notif.id}
                    className={`block p-4 rounded-lg border transition-all hover:shadow-md hover:scale-[1.01] ${getSeverityColor(notif.severity, notif.type)} bg-white`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-full shrink-0 ${getSeverityColor(notif.severity, notif.type)} bg-opacity-20`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-semibold text-sm truncate pr-2 text-slate-900">{notif.title}</p>
                          <span className="text-[10px] opacity-70 whitespace-nowrap font-medium text-slate-500">
                            {formatRelativeTime(notif.created_at)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 line-clamp-2 mb-2">
                          {notif.description}
                        </p>
                        <div className="flex items-center text-xs font-medium text-poke-blue group">
                          Resolver
                          <ArrowRight className="h-3 w-3 ml-1 transition-transform group-hover:translate-x-1" />
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <p>Nenhuma pendência no momento!</p>
            </div>
          )}
        </CardContent>
      </Card>

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
