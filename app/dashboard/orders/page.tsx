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
  MapPin,
  MessageCircle,
  Star
} from 'lucide-react';
import { StartChatButton } from '@/components/chat/start-chat-button';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ReviewForm } from '@/components/reviews';
import { canReviewOrder, getOrderReviews } from '@/server/actions/reviews';

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
  buyer_id: string;
}

interface OrderItem {
  id: string;
  pokemon_name: string;
  pokemon_photo_url?: string;
  price: number;
  quantity: number;
  seller_id: string;
  seller: {
    id: string;
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
    description: 'Pagamento confirmado, admin processando a venda'
  },
  completed: {
    label: 'Concluído',
    color: 'bg-green-500',
    icon: CheckCircle2,
    description: 'Venda concluída com sucesso'
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
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewOrderId, setReviewOrderId] = useState<string>('');
  const [reviewTargetId, setReviewTargetId] = useState<string>('');
  const [reviewTargetName, setReviewTargetName] = useState<string>('');
  const [canReview, setCanReview] = useState<{ [key: string]: boolean }>({});

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
      setCurrentUserId(user.id);

      const { data, error } = await (supabaseClient as any)
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            seller:seller_id (
              id,
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

      // Verificar quais pedidos podem ser avaliados
      const reviewStatus: { [key: string]: boolean } = {};
      for (const order of (data || [])) {
        if (order.status === 'completed') {
          const result = await canReviewOrder(order.id, user.id);
          reviewStatus[order.id] = result.canReview;
        }
      }
      setCanReview(reviewStatus);
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
    } finally {
      setLoading(false);
    }
  };

  const openReviewModal = (order: Order) => {
    // Pegar o primeiro vendedor do pedido
    const seller = order.order_items[0]?.seller;
    if (seller) {
      setReviewOrderId(order.id);
      setReviewTargetId(seller.id);
      setReviewTargetName(seller.display_name);
      setReviewModalOpen(true);
    }
  };

  const handleReviewSuccess = () => {
    // Atualizar estado de canReview
    setCanReview(prev => ({ ...prev, [reviewOrderId]: false }));
    setTimeout(() => {
      setReviewModalOpen(false);
    }, 2000);
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
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Meus Pedidos</h1>
          <p className="text-sm text-muted-foreground">Acompanhe suas transações</p>
        </div>
      </div>

      {/* Stats Cards - Grid Horizontal Compacto */}
      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        <div className="bg-blue-500/10 dark:bg-blue-500/20 rounded-xl p-3 border border-blue-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] sm:text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide">Total</p>
              <p className="text-lg sm:text-2xl font-bold text-blue-700 dark:text-blue-300">{stats.total}</p>
            </div>
            <div className="hidden sm:flex w-8 h-8 bg-blue-500/20 rounded-lg items-center justify-center">
              <ShoppingBag className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-amber-500/10 dark:bg-amber-500/20 rounded-xl p-3 border border-amber-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] sm:text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wide">Andamento</p>
              <p className="text-lg sm:text-2xl font-bold text-amber-700 dark:text-amber-300">{stats.pending + stats.payment_confirmed}</p>
            </div>
            <div className="hidden sm:flex w-8 h-8 bg-amber-500/20 rounded-lg items-center justify-center">
              <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
        </div>

        <div className="bg-emerald-500/10 dark:bg-emerald-500/20 rounded-xl p-3 border border-emerald-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] sm:text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Concluído</p>
              <p className="text-lg sm:text-2xl font-bold text-emerald-700 dark:text-emerald-300">{stats.completed}</p>
            </div>
            <div className="hidden sm:flex w-8 h-8 bg-emerald-500/20 rounded-lg items-center justify-center">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
        </div>

        <div className="bg-rose-500/10 dark:bg-rose-500/20 rounded-xl p-3 border border-rose-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] sm:text-xs font-medium text-rose-600 dark:text-rose-400 uppercase tracking-wide">Cancelado</p>
              <p className="text-lg sm:text-2xl font-bold text-rose-700 dark:text-rose-300">{stats.cancelled + stats.refunded}</p>
            </div>
            <div className="hidden sm:flex w-8 h-8 bg-rose-500/20 rounded-lg items-center justify-center">
              <XCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filters - Compacto */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar pedido ou Pokémon..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-10 bg-card border-border rounded-xl text-sm"
          />
        </div>

        {/* Filter Pills - Scroll Horizontal no Mobile */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
          <button
            onClick={() => setStatusFilter('all')}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${statusFilter === 'all'
                ? 'bg-poke-blue text-white shadow-sm'
                : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}
          >
            Todos
          </button>
          {Object.entries(statusConfig).map(([key, config]) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${statusFilter === key
                  ? `${config.color} text-white shadow-sm`
                  : 'bg-muted text-muted-foreground hover:bg-accent'
                }`}
            >
              {config.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
            <Package className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">
            {searchTerm || statusFilter !== 'all' ? 'Nenhum pedido encontrado' : 'Nenhum pedido ainda'}
          </h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            {searchTerm || statusFilter !== 'all'
              ? 'Tente ajustar os filtros'
              : 'Explore o mercado para fazer sua primeira compra'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => (
            <div
              key={order.id}
              className="bg-card rounded-2xl border border-border p-4 hover:shadow-md hover:border-border/80 transition-all active:scale-[0.99]"
            >
              {/* Header do Card */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-sm text-foreground">{order.order_number}</h3>
                    {getStatusBadge(order.status)}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(order.created_at), "dd MMM, yyyy", { locale: ptBR })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Package className="h-3 w-3" />
                      {order.order_items.length} {order.order_items.length === 1 ? 'item' : 'itens'}
                    </span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Total</p>
                  <p className="text-lg font-bold text-poke-blue">{formatCurrency(order.total_amount)}</p>
                </div>
              </div>

              {/* Items Preview - Compacto */}
              <div className="flex gap-1.5 flex-wrap mb-3">
                {order.order_items.slice(0, 2).map((item) => (
                  <div key={item.id} className="flex items-center gap-1.5 bg-muted rounded-lg px-2 py-1">
                    {item.pokemon_photo_url ? (
                      <img src={item.pokemon_photo_url} alt={item.pokemon_name} className="w-5 h-5 rounded object-cover" />
                    ) : (
                      <div className="w-5 h-5 bg-poke-blue/10 rounded flex items-center justify-center">
                        <Package className="w-3 h-3 text-poke-blue" />
                      </div>
                    )}
                    <span className="text-xs font-medium text-foreground">{item.pokemon_name}</span>
                  </div>
                ))}
                {order.order_items.length > 2 && (
                  <span className="text-xs text-muted-foreground px-2 py-1">+{order.order_items.length - 2}</span>
                )}
              </div>

              {/* Actions - Linha única */}
              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <button
                  onClick={() => { setSelectedOrder(order); setModalOpen(true); }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-poke-blue bg-poke-blue/5 hover:bg-poke-blue/10 rounded-lg transition-colors"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Ver Detalhes
                </button>

                {(order.status === 'payment_confirmed' || order.status === 'completed') &&
                  order.order_items[0]?.seller && currentUserId && (
                    <StartChatButton
                      currentUserId={currentUserId}
                      otherUserId={order.order_items[0].seller_id}
                      otherUserName={order.order_items[0].seller.display_name}
                      orderId={order.id}
                      subject={`Pedido ${order.order_number}`}
                      variant="ghost"
                      size="sm"
                      className="flex-1 h-auto py-2 text-xs font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg"
                    />
                  )}

                {order.status === 'completed' && canReview[order.id] && (
                  <button
                    onClick={() => openReviewModal(order)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors"
                  >
                    <Star className="h-3.5 w-3.5" />
                    Avaliar
                  </button>
                )}

                {order.status === 'completed' && canReview[order.id] === false && (
                  <span className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg">
                    <CheckCircle2 className="h-3 w-3" />
                    Avaliado
                  </span>
                )}
              </div>
            </div>
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
                <div className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 dark:from-blue-500/20 dark:to-indigo-500/20 rounded-lg p-4 border border-blue-500/20">
                  <h3 className="font-semibold text-sm mb-3 text-blue-900 dark:text-blue-100 flex items-center gap-2">
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
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isCompleted ? config.color : 'bg-muted'
                            } text-white`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 pb-3">
                            <p className={`text-sm font-medium ${isCompleted ? 'text-foreground' : 'text-muted-foreground'}`}>
                              {config.label}
                            </p>
                            <p className="text-xs text-muted-foreground">{config.description}</p>
                            {isActive && (
                              <div className="mt-2 bg-card rounded px-2 py-1 text-xs text-blue-700 dark:text-blue-300 border border-blue-500/20">
                                ⚡ Status atual
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {selectedOrder.status === 'cancelled' && (
                    <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                        <XCircle className="h-4 w-4" />
                        <span className="font-semibold text-sm">Pedido Cancelado</span>
                      </div>
                      {selectedOrder.cancellation_reason && (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                          Motivo: {selectedOrder.cancellation_reason}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Items */}
                <div>
                  <h3 className="font-semibold mb-3 text-foreground">Itens do Pedido</h3>
                  <div className="space-y-3">
                    {selectedOrder.order_items.map((item) => (
                      <div key={item.id} className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                        {item.pokemon_photo_url ? (
                          <div className="w-16 h-16 rounded-lg border-2 border-poke-blue/20 overflow-hidden bg-poke-blue/10 flex items-center justify-center">
                            <img
                              src={item.pokemon_photo_url}
                              alt={item.pokemon_name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                            <Package className="h-8 w-8 text-poke-blue/40 absolute" style={{ display: 'none' }} />
                          </div>
                        ) : (
                          <div className="w-16 h-16 bg-poke-blue/10 rounded-lg flex items-center justify-center">
                            <Package className="h-8 w-8 text-poke-blue/40" />
                          </div>
                        )}
                        <div className="flex-1">
                          <h4 className="font-semibold text-foreground">{item.pokemon_name}</h4>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <User className="h-3 w-3" />
                            Vendedor: {item.seller?.display_name || 'N/A'}
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
                  <div className="bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/20 rounded-lg p-3">
                    <p className="text-sm text-amber-900 dark:text-amber-200">
                      <strong>Observações:</strong> {selectedOrder.notes}
                    </p>
                  </div>
                )}

                {/* Botão de Chat com Vendedor - só após pagamento confirmado */}
                {(selectedOrder.status === 'payment_confirmed' || selectedOrder.status === 'completed') &&
                  selectedOrder.order_items[0]?.seller && currentUserId && (
                    <div className="bg-green-500/10 dark:bg-green-500/20 border border-green-500/20 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-green-800 dark:text-green-300 flex items-center gap-2">
                            <MessageCircle className="h-4 w-4" />
                            Falar com o Vendedor
                          </h4>
                          <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                            Entre em contato com {selectedOrder.order_items[0].seller.display_name} sobre este pedido
                          </p>
                        </div>
                        <StartChatButton
                          currentUserId={currentUserId}
                          otherUserId={selectedOrder.order_items[0].seller_id}
                          otherUserName={selectedOrder.order_items[0].seller.display_name}
                          orderId={selectedOrder.id}
                          subject={`Pedido ${selectedOrder.order_number}`}
                          variant="default"
                          className="bg-green-600 hover:bg-green-700"
                        />
                      </div>
                    </div>
                  )}

                {/* Aviso para pedidos pendentes */}
                {selectedOrder.status === 'pending' && (
                  <div className="bg-yellow-500/10 dark:bg-yellow-500/20 border border-yellow-500/20 rounded-lg p-4">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      <strong>💬 Chat disponível após confirmação:</strong> Você poderá conversar com o vendedor assim que o pagamento for confirmado.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Avaliação */}
      <Dialog open={reviewModalOpen} onOpenChange={setReviewModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              Avaliar Vendedor
            </DialogTitle>
          </DialogHeader>
          <ReviewForm
            orderId={reviewOrderId}
            reviewerId={currentUserId}
            reviewedId={reviewTargetId}
            reviewedName={reviewTargetName}
            reviewType="buyer_to_seller"
            onSuccess={handleReviewSuccess}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
