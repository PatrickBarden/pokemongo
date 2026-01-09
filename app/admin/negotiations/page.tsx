'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// Server Actions removidos - usando API Routes agora
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrency } from '@/lib/format';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Package, Search, Eye, Clock, CheckCircle2, XCircle, DollarSign,
  ShoppingBag, TrendingUp, Wallet, MoreHorizontal, RefreshCw, 
  BanknoteIcon, AlertCircle, Trash2
} from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const orderStatusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: 'Aguardando', color: 'bg-yellow-500', icon: Clock },
  payment_confirmed: { label: 'Pago', color: 'bg-blue-500', icon: CheckCircle2 },
  completed: { label: 'Concluído', color: 'bg-green-500', icon: CheckCircle2 },
  cancelled: { label: 'Cancelado', color: 'bg-red-500', icon: XCircle },
  refunded: { label: 'Reembolsado', color: 'bg-orange-500', icon: RefreshCw },
};

export default function NegotiationsPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [payoutModalOpen, setPayoutModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    try {
      // Usar API Route em vez de Server Action para evitar problemas de CORS
      const response = await fetch('/api/admin/negotiations');
      const result = await response.json();
      console.log('Orders carregadas:', result.orders?.length);
      if (result.orders) {
        setOrders([...result.orders]);
      }
    } catch (error) {
      console.error('Erro ao carregar orders:', error);
    }
    setLoading(false);
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    setActionLoading(true);
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (!response.ok) {
        const result = await response.json();
        console.error('Erro ao atualizar status:', result.error);
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
    }
    await loadOrders();
    setActionLoading(false);
    setDetailModalOpen(false);
  };

  // Stats
  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    confirmed: orders.filter(o => o.status === 'payment_confirmed').length,
    completed: orders.filter(o => o.status === 'completed').length,
    cancelled: orders.filter(o => o.status === 'cancelled' || o.status === 'refunded').length,
    totalRevenue: orders.filter(o => o.status === 'completed').reduce((acc, o) => acc + o.total_amount, 0),
    pendingPayout: orders.filter(o => o.status === 'completed' && !o.payout_completed).reduce((acc, o) => acc + o.total_amount, 0),
  };

  // Filtros
  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.buyer?.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.buyer?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Pedidos pendentes de pagamento ao vendedor
  const pendingPayouts = orders.filter(o => o.status === 'completed' && !o.payout_completed);

  const getStatusBadge = (status: string) => {
    const config = orderStatusConfig[status];
    if (!config) return <Badge>{status}</Badge>;
    const Icon = config.icon;
    return (
      <Badge className={`${config.color} text-white border-0 flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const markPayoutComplete = async (orderId: string) => {
    setActionLoading(true);
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'payout' })
      });
      if (!response.ok) {
        const result = await response.json();
        console.error('Erro ao marcar payout:', result.error);
      }
    } catch (error) {
      console.error('Erro ao marcar payout:', error);
    }
    await loadOrders();
    setActionLoading(false);
    setPayoutModalOpen(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-poke-blue"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-full overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-poke-blue to-indigo-600 rounded-lg p-4 sm:p-6 text-white">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Central de Negociações</h1>
        <p className="mt-1 text-sm text-white/80">Gerencie pedidos, pagamentos e repasses aos vendedores</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="border-l-4 border-l-blue-500 min-w-0">
          <CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground truncate">Total Pedidos</p>
            <p className="text-xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-yellow-500 min-w-0">
          <CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground truncate">Aguardando</p>
            <p className="text-xl font-bold text-yellow-600">{stats.pending + stats.confirmed}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500 min-w-0">
          <CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground truncate">Receita Total</p>
            <p className="text-xl font-bold text-green-600">{formatCurrency(stats.totalRevenue)}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-500 min-w-0">
          <CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground truncate">Repasses Pendentes</p>
            <p className="text-xl font-bold text-orange-600">{formatCurrency(stats.pendingPayout)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="orders" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="orders" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Pedidos ({orders.length})
          </TabsTrigger>
          <TabsTrigger value="payouts" className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            Repasses ({pendingPayouts.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab Pedidos */}
        <TabsContent value="orders" className="space-y-4">
          {/* Filtros */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por número, comprador..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {Object.entries(orderStatusConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={loadOrders}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Atualizar
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Lista de Pedidos - Mobile */}
          <div className="lg:hidden space-y-3">
            {filteredOrders.map((order) => (
              <Card key={order.id} className="overflow-hidden">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-muted-foreground">{order.order_number}</span>
                        {getStatusBadge(order.status)}
                      </div>
                      <p className="text-sm font-medium truncate">{order.buyer?.display_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{order.buyer?.email}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-poke-blue">{formatCurrency(order.total_amount)}</p>
                      <p className="text-[10px] text-muted-foreground">{format(new Date(order.created_at), "dd/MM HH:mm")}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                    <Badge variant="secondary" className="text-[10px]">{order.order_items?.length || 0} itens</Badge>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-7 text-xs"
                      onClick={() => { setSelectedOrder(order); setDetailModalOpen(true); }}
                    >
                      <Eye className="h-3 w-3 mr-1" /> Detalhes
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Tabela de Pedidos - Desktop */}
          <Card className="hidden lg:block">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pedido</TableHead>
                    <TableHead>Comprador</TableHead>
                    <TableHead>Itens</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.order_number}</TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">{order.buyer?.display_name}</p>
                          <p className="text-xs text-muted-foreground">{order.buyer?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{order.order_items?.length || 0} itens</Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold text-poke-blue">
                        {formatCurrency(order.total_amount)}
                      </TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(order.created_at), "dd/MM/yy HH:mm")}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => { setSelectedOrder(order); setDetailModalOpen(true); }}>
                              <Eye className="mr-2 h-4 w-4" /> Ver Detalhes
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {order.status === 'pending' && (
                              <DropdownMenuItem onClick={() => updateOrderStatus(order.id, 'payment_confirmed')}>
                                <CheckCircle2 className="mr-2 h-4 w-4 text-blue-500" />
                                <span className="text-blue-500">Confirmar Pagamento</span>
                              </DropdownMenuItem>
                            )}
                            {order.status === 'payment_confirmed' && (
                              <DropdownMenuItem onClick={() => updateOrderStatus(order.id, 'completed')}>
                                <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                                <span className="text-green-500">Marcar Concluído</span>
                              </DropdownMenuItem>
                            )}
                            {(order.status === 'pending' || order.status === 'payment_confirmed') && (
                              <DropdownMenuItem onClick={() => updateOrderStatus(order.id, 'cancelled')}>
                                <XCircle className="mr-2 h-4 w-4 text-red-500" />
                                <span className="text-red-500">Cancelar</span>
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => {
                                setOrderToDelete(order);
                                setDeleteModalOpen(true);
                              }}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Deletar Pedido
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filteredOrders.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>Nenhum pedido encontrado</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Repasses */}
        <TabsContent value="payouts" className="space-y-4">
          {pendingPayouts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
                <h3 className="text-xl font-semibold text-green-700">Tudo em dia!</h3>
                <p className="text-muted-foreground">Não há repasses pendentes</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-orange-500" />
                  Repasses Pendentes aos Vendedores
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pedido</TableHead>
                      <TableHead>Vendedor</TableHead>
                      <TableHead>PIX</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Concluído em</TableHead>
                      <TableHead className="text-right">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingPayouts.map((order) => {
                      const seller = order.order_items?.[0]?.seller;
                      const sellerAmount = order.total_amount * 0.9; // 90% para vendedor
                      return (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">{order.order_number}</TableCell>
                          <TableCell>
                            <div>
                              <p className="text-sm font-medium">{seller?.display_name || 'N/A'}</p>
                              <p className="text-xs text-muted-foreground">{seller?.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <code className="text-xs bg-slate-100 px-2 py-1 rounded">
                              {seller?.pix_key || 'Não informado'}
                            </code>
                          </TableCell>
                          <TableCell className="text-right">
                            <div>
                              <p className="font-bold text-green-600">{formatCurrency(sellerAmount)}</p>
                              <p className="text-[10px] text-muted-foreground">90% de {formatCurrency(order.total_amount)}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {order.completed_at ? format(new Date(order.completed_at), "dd/MM/yy") : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => { setSelectedOrder(order); setPayoutModalOpen(true); }}
                            >
                              <BanknoteIcon className="h-4 w-4 mr-1" />
                              Pagar
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Modal Detalhes do Pedido */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Pedido {selectedOrder?.order_number}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                {getStatusBadge(selectedOrder.status)}
                <span className="text-2xl font-bold text-poke-blue">{formatCurrency(selectedOrder.total_amount)}</span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Comprador</p>
                  <p className="font-medium">{selectedOrder.buyer?.display_name}</p>
                  <p className="text-xs text-muted-foreground">{selectedOrder.buyer?.email}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Data</p>
                  <p className="font-medium">{format(new Date(selectedOrder.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Itens ({selectedOrder.order_items?.length})</p>
                <div className="space-y-2">
                  {selectedOrder.order_items?.map((item: any) => (
                    <div key={item.id} className="flex justify-between items-center bg-muted/50 p-3 rounded-lg">
                      <div>
                        <p className="font-medium">{item.pokemon_name}</p>
                        <p className="text-xs text-muted-foreground">Vendedor: {item.seller?.display_name}</p>
                      </div>
                      <p className="font-bold">{formatCurrency(item.price)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            {selectedOrder?.status === 'pending' && (
              <Button onClick={() => updateOrderStatus(selectedOrder.id, 'payment_confirmed')} disabled={actionLoading}>
                <CheckCircle2 className="h-4 w-4 mr-2" /> Confirmar Pagamento
              </Button>
            )}
            {selectedOrder?.status === 'payment_confirmed' && (
              <Button className="bg-green-600" onClick={() => updateOrderStatus(selectedOrder.id, 'completed')} disabled={actionLoading}>
                <CheckCircle2 className="h-4 w-4 mr-2" /> Concluir Pedido
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Confirmar Payout */}
      <Dialog open={payoutModalOpen} onOpenChange={setPayoutModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Repasse</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800">
                  Confirme que o repasse foi realizado para o vendedor <strong>{selectedOrder.order_items?.[0]?.seller?.display_name}</strong>
                </p>
                <p className="text-2xl font-bold text-green-700 mt-2">
                  {formatCurrency(selectedOrder.total_amount * 0.9)}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  PIX: {selectedOrder.order_items?.[0]?.seller?.pix_key || 'Não informado'}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayoutModalOpen(false)}>Cancelar</Button>
            <Button className="bg-green-600" onClick={() => markPayoutComplete(selectedOrder?.id)} disabled={actionLoading}>
              <CheckCircle2 className="h-4 w-4 mr-2" /> Confirmar Repasse
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Confirmar Delete */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              Deletar Pedido
            </DialogTitle>
          </DialogHeader>
          {orderToDelete && (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800 mb-3">
                  Você está prestes a deletar permanentemente o pedido:
                </p>
                <div className="bg-white rounded-lg p-3 border border-red-100">
                  <p className="font-bold text-lg text-red-900">{orderToDelete.order_number}</p>
                  <p className="text-sm text-gray-600">
                    Comprador: {orderToDelete.buyer?.display_name || 'N/A'}
                  </p>
                  <p className="text-sm font-semibold text-red-700 mt-1">
                    Valor: {formatCurrency(orderToDelete.total_amount)}
                  </p>
                </div>
                <div className="mt-3 p-2 bg-red-100 rounded text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>Esta ação não pode ser desfeita!</span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              onClick={() => {
                setDeleteModalOpen(false);
                setOrderToDelete(null);
              }}
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive"
              className="bg-red-600 hover:bg-red-700"
              onClick={async () => {
                if (orderToDelete) {
                  setActionLoading(true);
                  console.log('Iniciando delete do pedido:', orderToDelete.id);
                  try {
                    const response = await fetch(`/api/admin/orders/${orderToDelete.id}`, {
                      method: 'DELETE'
                    });
                    const result = await response.json();
                    console.log('Resultado do delete:', result);
                    if (!response.ok) {
                      alert('Erro ao deletar: ' + result.error);
                    }
                  } catch (error) {
                    console.error('Erro ao deletar:', error);
                  }
                  await loadOrders();
                  setActionLoading(false);
                  setDeleteModalOpen(false);
                  setOrderToDelete(null);
                }
              }} 
              disabled={actionLoading}
            >
              {actionLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Deletando...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Sim, Deletar Pedido
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
