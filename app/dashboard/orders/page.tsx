'use client';

import { useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabase-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/lib/format';
import { 
  Package, 
  Search, 
  Eye, 
  Clock, 
  CheckCircle2, 
  Loader2, 
  Truck, 
  XCircle,
  ShoppingBag,
  Calendar,
  User,
  MapPin
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Order {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  created_at: string;
  updated_at: string;
  confirmed_at?: string;
  shipped_at?: string;
  delivered_at?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  notes?: string;
  order_items: OrderItem[];
}

interface OrderItem {
  id: string;
  pokemon_name: string;
  pokemon_photo_url?: string;
  price: number;
  quantity: number;
  seller: {
    display_name: string;
    email: string;
  };
}

const statusConfig = {
  pending: {
    label: 'Aguardando Pagamento',
    color: 'bg-yellow-500',
    icon: Clock,
    description: 'Aguardando confirmação do pagamento'
  },
  payment_confirmed: {
    label: 'Pagamento Confirmado',
    color: 'bg-blue-500',
    icon: CheckCircle2,
    description: 'Pagamento confirmado, admin processando a troca'
  },
  completed: {
    label: 'Concluído',
    color: 'bg-green-500',
    icon: CheckCircle2,
    description: 'Troca concluída com sucesso'
  },
  cancelled: {
    label: 'Cancelado',
    color: 'bg-red-500',
    icon: XCircle,
    description: 'Pedido cancelado'
  },
  refunded: {
    label: 'Reembolsado',
    color: 'bg-orange-500',
    icon: XCircle,
    description: 'Pedido cancelado e reembolsado'
  }
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    filterOrders();
  }, [searchTerm, statusFilter, orders]);

  const loadOrders = async () => {
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) return;

      const { data, error } = await (supabaseClient as any)
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            seller:seller_id (
              display_name,
              email
            )
          )
        `)
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setOrders(data || []);
      setFilteredOrders(data || []);
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterOrders = () => {
    let filtered = [...orders];

    // Filtro por status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    // Filtro por busca
    if (searchTerm) {
      filtered = filtered.filter(order =>
        order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.order_items.some(item =>
          item.pokemon_name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    setFilteredOrders(filtered);
  };

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status as keyof typeof statusConfig];
    if (!config) return null;

    const Icon = config.icon;

    return (
      <Badge className={`${config.color} text-white border-0 flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getOrderStats = () => {
    return {
      total: orders.length,
      pending: orders.filter(o => o.status === 'pending').length,
      payment_confirmed: orders.filter(o => o.status === 'payment_confirmed').length,
      completed: orders.filter(o => o.status === 'completed').length,
      cancelled: orders.filter(o => o.status === 'cancelled').length,
      refunded: orders.filter(o => o.status === 'refunded').length,
    };
  };

  const stats = getOrderStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-poke-blue mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando pedidos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-poke-blue to-poke-yellow rounded-lg p-6 text-white mb-6">
        <h1 className="text-3xl font-bold">Meus Pedidos</h1>
        <p className="mt-2 text-white/90">
          Acompanhe suas transações digitais de Pokémon GO
        </p>
        <div className="mt-4 bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
          <p className="text-sm flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <strong>Como funciona:</strong> Após o pagamento, nossa equipe coordena a troca diretamente no Pokémon GO entre você e o vendedor.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-blue-600">Total</p>
                <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
              </div>
              <ShoppingBag className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-yellow-600">Em Andamento</p>
                <p className="text-2xl font-bold text-yellow-900">
                  {stats.pending + stats.payment_confirmed}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-green-600">Concluído</p>
                <p className="text-2xl font-bold text-green-900">{stats.completed}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-red-600">Cancelado</p>
                <p className="text-2xl font-bold text-red-900">{stats.cancelled + stats.refunded}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por número do pedido ou Pokémon..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Status Filter */}
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('all')}
                className={statusFilter === 'all' ? 'bg-poke-blue' : ''}
              >
                Todos
              </Button>
              {Object.entries(statusConfig).map(([key, config]) => (
                <Button
                  key={key}
                  variant={statusFilter === key ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter(key)}
                  className={statusFilter === key ? config.color : ''}
                >
                  {config.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Package className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold text-poke-dark mb-2">
              {searchTerm || statusFilter !== 'all' 
                ? 'Nenhum pedido encontrado' 
                : 'Nenhuma transação ainda'}
            </h3>
            <p className="text-muted-foreground text-center max-w-md mb-4">
              {searchTerm || statusFilter !== 'all'
                ? 'Tente ajustar os filtros de busca'
                : 'Comece explorando o mercado e adicione Pokémon digitais ao carrinho'}
            </p>
            {!searchTerm && statusFilter === 'all' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-lg mx-auto text-left">
                <h4 className="font-semibold text-sm text-blue-900 mb-2">💡 Como funciona a transação digital:</h4>
                <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
                  <li>Adicione Pokémon ao carrinho e finalize a compra</li>
                  <li>Realize o pagamento e envie o comprovante</li>
                  <li>Admin processa e coordena a troca no Pokémon GO</li>
                  <li>Transação concluída! O Pokémon é seu 🎉</li>
                </ol>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <Card key={order.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  {/* Order Info */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-lg text-poke-dark">
                            {order.order_number}
                          </h3>
                          {getStatusBadge(order.status)}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(order.created_at), "dd 'de' MMM, yyyy", { locale: ptBR })}
                          </span>
                          <span className="flex items-center gap-1">
                            <Package className="h-3 w-3" />
                            {order.order_items.length} {order.order_items.length === 1 ? 'item' : 'itens'}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Total</p>
                        <p className="text-2xl font-bold text-poke-blue">
                          {formatCurrency(order.total_amount)}
                        </p>
                      </div>
                    </div>

                    {/* Items Preview */}
                    <div className="flex gap-2 flex-wrap">
                      {order.order_items.slice(0, 3).map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-2 bg-poke-blue/5 rounded-lg px-3 py-1.5"
                        >
                          {item.pokemon_photo_url ? (
                            <img
                              src={item.pokemon_photo_url}
                              alt={item.pokemon_name}
                              className="w-6 h-6 rounded object-cover"
                            />
                          ) : (
                            <Package className="w-4 h-4 text-poke-blue" />
                          )}
                          <span className="text-sm font-medium">{item.pokemon_name}</span>
                        </div>
                      ))}
                      {order.order_items.length > 3 && (
                        <div className="flex items-center px-3 py-1.5 text-sm text-muted-foreground">
                          +{order.order_items.length - 3} mais
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex lg:flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedOrder(order);
                        setModalOpen(true);
                      }}
                      className="border-poke-blue text-poke-blue hover:bg-poke-blue/10"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Ver Detalhes
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Order Details Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedOrder && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-poke-blue/10 rounded-full flex items-center justify-center">
                    <Package className="h-5 w-5 text-poke-blue" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span>Pedido {selectedOrder.order_number}</span>
                      {getStatusBadge(selectedOrder.status)}
                    </div>
                    <p className="text-sm font-normal text-muted-foreground">
                      {format(new Date(selectedOrder.created_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                {/* Timeline */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                  <h3 className="font-semibold text-sm mb-3 text-blue-900 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Linha do Tempo da Transação Digital
                  </h3>
                  <div className="space-y-3">
                    {Object.entries(statusConfig).filter(([key]) => key !== 'cancelled' && key !== 'refunded').map(([key, config], index) => {
                      const Icon = config.icon;
                      const isActive = selectedOrder.status === key;
                      const statusOrder = ['pending', 'payment_confirmed', 'completed'];
                      const currentIndex = statusOrder.indexOf(selectedOrder.status);
                      const stepIndex = statusOrder.indexOf(key);
                      const isCompleted = stepIndex <= currentIndex;

                      return (
                        <div key={key} className="flex items-start gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                            isCompleted ? config.color : 'bg-gray-200'
                          } text-white`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 pb-3">
                            <p className={`text-sm font-medium ${isCompleted ? 'text-gray-900' : 'text-gray-400'}`}>
                              {config.label}
                            </p>
                            <p className="text-xs text-gray-500">{config.description}</p>
                            {isActive && (
                              <div className="mt-2 bg-white rounded px-2 py-1 text-xs text-blue-700 border border-blue-200">
                                ⚡ Status atual
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {selectedOrder.status === 'cancelled' && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center gap-2 text-red-700">
                        <XCircle className="h-4 w-4" />
                        <span className="font-semibold text-sm">Pedido Cancelado</span>
                      </div>
                      {selectedOrder.cancellation_reason && (
                        <p className="text-xs text-red-600 mt-1">
                          Motivo: {selectedOrder.cancellation_reason}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Items */}
                <div>
                  <h3 className="font-semibold mb-3">Itens do Pedido</h3>
                  <div className="space-y-3">
                    {selectedOrder.order_items.map((item) => (
                      <div key={item.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                        {item.pokemon_photo_url ? (
                          <img
                            src={item.pokemon_photo_url}
                            alt={item.pokemon_name}
                            className="w-16 h-16 rounded-lg object-cover border-2 border-poke-blue/20"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-poke-blue/10 rounded-lg flex items-center justify-center">
                            <Package className="h-8 w-8 text-poke-blue/40" />
                          </div>
                        )}
                        <div className="flex-1">
                          <h4 className="font-semibold">{item.pokemon_name}</h4>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <User className="h-3 w-3" />
                            Vendedor: {item.seller.display_name}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-poke-blue">{formatCurrency(item.price)}</p>
                          <p className="text-xs text-muted-foreground">Qtd: {item.quantity}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Total */}
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Total do Pedido</span>
                  <span className="text-2xl font-bold text-poke-blue">
                    {formatCurrency(selectedOrder.total_amount)}
                  </span>
                </div>

                {selectedOrder.notes && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-sm text-amber-900">
                      <strong>Observações:</strong> {selectedOrder.notes}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
