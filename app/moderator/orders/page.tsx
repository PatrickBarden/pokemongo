'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ShoppingBag, 
  Search, 
  Eye,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Filter
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabaseClient } from '@/lib/supabase-client';
import { formatCurrency, formatDateTime } from '@/lib/format';
import Link from 'next/link';

interface Order {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  created_at: string;
  buyer: { display_name: string; email: string };
  listing: { title: string };
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  PAYMENT_PENDING: { label: 'Aguardando Pagamento', color: 'bg-amber-500', icon: Clock },
  AWAITING_SELLER: { label: 'Aguardando Vendedor', color: 'bg-blue-500', icon: Clock },
  SELLER_ACCEPTED: { label: 'Vendedor Aceitou', color: 'bg-indigo-500', icon: CheckCircle2 },
  DELIVERY_SUBMITTED: { label: 'Entrega Enviada', color: 'bg-purple-500', icon: ShoppingBag },
  IN_REVIEW: { label: 'Em Revisão', color: 'bg-orange-500', icon: Eye },
  COMPLETED: { label: 'Concluído', color: 'bg-emerald-500', icon: CheckCircle2 },
  DISPUTE: { label: 'Disputa', color: 'bg-red-500', icon: AlertTriangle },
  CANCELLED: { label: 'Cancelado', color: 'bg-gray-500', icon: XCircle },
};

export default function ModeratorOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadOrders();
  }, [statusFilter]);

  const loadOrders = async () => {
    try {
      let query = (supabaseClient as any)
        .from('orders')
        .select(`
          id,
          order_number,
          status,
          total_amount,
          created_at,
          buyer:buyer_id(display_name, email),
          listing:listing_id(title)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter(order => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      order.order_number?.toLowerCase().includes(searchLower) ||
      order.buyer?.display_name?.toLowerCase().includes(searchLower) ||
      order.listing?.title?.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <ShoppingBag className="h-6 w-6 text-purple-500" />
          Pedidos
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Visualize e acompanhe os pedidos da plataforma
        </p>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por número, comprador ou produto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filtrar status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            {Object.entries(statusConfig).map(([key, config]) => (
              <SelectItem key={key} value={key}>{config.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Lista de Pedidos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {filteredOrders.length} pedido{filteredOrders.length !== 1 ? 's' : ''}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredOrders.length > 0 ? (
            <div className="space-y-3">
              {filteredOrders.map((order, index) => {
                const status = statusConfig[order.status] || statusConfig.PAYMENT_PENDING;
                const StatusIcon = status.icon;

                return (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="flex items-center justify-between p-4 bg-muted/50 rounded-xl hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${status.color}/10`}>
                        <StatusIcon className={`h-5 w-5 ${status.color.replace('bg-', 'text-')}`} />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">
                          #{order.order_number}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {order.listing?.title || 'Produto'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {order.buyer?.display_name}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right hidden sm:block">
                        <p className="font-semibold">{formatCurrency(order.total_amount)}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(order.created_at).split(',')[0]}
                        </p>
                      </div>
                      <Badge className={`${status.color} text-white`}>
                        {status.label}
                      </Badge>
                      <Link href={`/admin/orders/${order.id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="font-medium text-foreground">Nenhum pedido encontrado</p>
              <p className="text-sm text-muted-foreground mt-1">
                Tente ajustar os filtros de busca
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
