'use client';

import { useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabase-client';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  MessageCircle, 
  Package, 
  User, 
  XCircle,
  DollarSign,
  ShieldAlert,
} from 'lucide-react';

type Order = {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  created_at: string;
  buyer: {
    id: string;
    display_name: string;
    email: string;
  };
  order_items: {
    id: string;
    pokemon_name: string;
    price: number;
    seller: {
      id: string;
      display_name: string;
      email: string;
    };
  }[];
};

const statusConfig = {
  payment_confirmed: {
    label: 'Pagamento Confirmado',
    color: 'bg-blue-500',
    icon: DollarSign,
    description: 'Pronto para intermediação'
  },
  in_review: {
    label: 'Em Análise',
    color: 'bg-yellow-500',
    icon: AlertTriangle,
    description: 'Disputa ou análise manual'
  },
  dispute: {
    label: 'Em Disputa',
    color: 'bg-orange-500',
    icon: ShieldAlert,
    description: 'Problema reportado'
  },
  completed: {
    label: 'Concluído',
    color: 'bg-green-500',
    icon: CheckCircle2,
    description: 'Transação finalizada'
  },
  cancelled: {
    label: 'Cancelado',
    color: 'bg-red-500',
    icon: XCircle,
    description: 'Transação cancelada'
  },
  refunded: {
    label: 'Reembolsado',
    color: 'bg-purple-500',
    icon: DollarSign,
    description: 'Valor devolvido'
  }
};

export default function NegotiationsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'complete' | 'cancel' | null>(null);
  const [actionReason, setActionReason] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    
    const { data, error } = await supabaseClient
      .from('orders')
      .select(`
        *,
        buyer:buyer_id(id, display_name, email),
        order_items(
          id,
          pokemon_name,
          price,
          seller:seller_id(id, display_name, email)
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar ordens:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as negociações.',
        variant: 'destructive',
      });
    } else {
      setOrders(data as any || []);
    }
    setLoading(false);
  };

  const handleAction = async () => {
    if (!selectedOrder || !actionType) return;

    let newStatus = '';
    if (actionType === 'complete') newStatus = 'COMPLETED';
    if (actionType === 'cancel') newStatus = 'CANCELLED';

    const { error } = await (supabaseClient as any)
      .from('orders')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', selectedOrder.id);

    if (error) {
      toast({
        title: 'Erro',
        description: `Erro ao ${actionType === 'complete' ? 'concluir' : 'cancelar'} a ordem.`,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Sucesso',
        description: `Ordem ${actionType === 'complete' ? 'concluída' : 'cancelada'} com sucesso.`,
      });
      fetchOrders();
      setActionDialogOpen(false);
      setSelectedOrder(null);
      setActionReason('');
    }
  };

  const openActionDialog = (order: Order, type: 'complete' | 'cancel') => {
    setSelectedOrder(order);
    setActionType(type);
    setActionDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status as keyof typeof statusConfig] || {
      label: status,
      color: 'bg-gray-500',
      icon: Clock,
    };
    const Icon = config.icon;
    
    return (
      <Badge className={`${config.color} text-white border-0 flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.buyer?.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.order_items.some(item => item.seller?.display_name.toLowerCase().includes(searchTerm.toLowerCase()));
      
    return matchesSearch;
  });

  const activeNegotiations = filteredOrders.filter(o => ['payment_confirmed', 'in_review', 'dispute'].includes(o.status));
  const historyOrders = filteredOrders.filter(o => ['completed', 'cancelled', 'refunded'].includes(o.status));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-poke-dark">Gestão de Negociações</h1>
          <p className="text-muted-foreground mt-1">
            Administre as ordens, intermedeie trocas e resolva disputas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="h-9 px-4 border-poke-blue text-poke-blue text-sm">
            {activeNegotiations.length} Ativas
          </Badge>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por número da ordem, comprador ou vendedor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="active">Em Andamento</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
        </TabsList>
        
        <TabsContent value="active" className="mt-6">
          {loading ? (
            <div className="flex justify-center p-8">Carregando...</div>
          ) : activeNegotiations.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
                <h3 className="text-xl font-medium">Tudo em dia!</h3>
                <p className="text-muted-foreground">Nenhuma negociação pendente no momento.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6">
              {activeNegotiations.map((order) => (
                <NegotiationCard 
                  key={order.id} 
                  order={order} 
                  getStatusBadge={getStatusBadge}
                  onComplete={() => openActionDialog(order, 'complete')}
                  onCancel={() => openActionDialog(order, 'cancel')}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <div className="grid gap-6">
            {historyOrders.map((order) => (
              <NegotiationCard 
                key={order.id} 
                order={order} 
                getStatusBadge={getStatusBadge}
                readOnly
              />
            ))}
            {historyOrders.length === 0 && !loading && (
              <p className="text-center text-muted-foreground py-8">Nenhum histórico encontrado.</p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'complete' ? 'Confirmar Conclusão' : 'Cancelar Ordem'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'complete' 
                ? 'Confirme que a troca foi realizada com sucesso no Pokémon GO e o comprador recebeu o item.'
                : 'Esta ação irá cancelar a ordem e iniciar o processo de reembolso.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">Observações (Interno)</label>
            <Textarea 
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              placeholder="Adicione notas sobre esta ação..."
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialogOpen(false)}>Cancelar</Button>
            <Button 
              variant={actionType === 'complete' ? 'default' : 'destructive'}
              className={actionType === 'complete' ? 'bg-green-600 hover:bg-green-700' : ''}
              onClick={handleAction}
            >
              {actionType === 'complete' ? 'Confirmar Entrega' : 'Cancelar Ordem'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function NegotiationCard({ order, getStatusBadge, onComplete, onCancel, readOnly = false }: any) {
  return (
    <Card className="overflow-hidden border-l-4 border-l-poke-blue hover:shadow-md transition-shadow">
      <CardHeader className="bg-slate-50 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="font-mono text-sm text-muted-foreground">#{order.order_number}</span>
              {getStatusBadge(order.status)}
            </div>
            <p className="text-xs text-muted-foreground">
              Criado em {formatDateTime(order.created_at)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-poke-blue">{formatCurrency(order.total_amount)}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground mb-2">
              <User className="h-4 w-4" />
              Comprador
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border">
              <p className="font-medium text-poke-dark">{order.buyer?.display_name || 'Usuário Desconhecido'}</p>
              <p className="text-xs text-muted-foreground">{order.buyer?.email}</p>
              <div className="mt-2 flex gap-2">
                <Button variant="outline" size="sm" className="h-6 text-xs px-2">Perfil</Button>
                <Button variant="outline" size="sm" className="h-6 text-xs px-2">Chat</Button>
              </div>
            </div>
          </div>

          <div className="space-y-2 md:col-span-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground mb-2">
              <Package className="h-4 w-4" />
              Detalhes da Transação
            </div>
            <div className="space-y-2">
              {order.order_items.map((item: any) => (
                <div key={item.id} className="bg-slate-50 p-3 rounded-lg border flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border shadow-sm">
                      <Package className="h-5 w-5 text-poke-blue" />
                    </div>
                    <div>
                      <p className="font-medium">{item.pokemon_name}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span>Vendedor:</span>
                        <span className="font-medium text-poke-dark">{item.seller?.display_name}</span>
                      </div>
                    </div>
                  </div>
                  <p className="font-semibold">{formatCurrency(item.price)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
      
      {!readOnly && (
        <CardFooter className="bg-slate-50/50 border-t flex justify-end gap-3 py-3">
          <Button variant="outline" className="border-poke-blue text-poke-blue hover:bg-poke-blue/10">
            <MessageCircle className="h-4 w-4 mr-2" />
            Chat da Negociação
          </Button>
          <Button variant="destructive" onClick={onCancel}>
            <XCircle className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={onComplete}>
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Confirmar Entrega
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
