'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/order/status-badge';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function OrderDetailPage() {
  const params = useParams();
  const orderId = params.id as string;
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOrder() {
      const { data } = await supabase
        .from('orders')
        .select(`
          *,
          buyer:buyer_id(id, display_name, email),
          seller:seller_id(id, display_name, email),
          listing:listing_id(id, title, description, category)
        `)
        .eq('id', orderId)
        .single();

      if (data) {
        setOrder(data);
      }
      setLoading(false);
    }

    fetchOrder();
  }, [orderId]);

  if (loading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>;
  }

  if (!order) {
    return <div className="text-center py-8">Ordem não encontrada</div>;
  }

  const netAmount = order.amount_total - order.platform_fee;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/orders">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </Link>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">Ordem {order.id.slice(0, 8)}</h1>
            <StatusBadge status={order.status} />
          </div>
          <p className="text-muted-foreground mt-1">
            Criada em {formatDateTime(order.created_at)}
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Comprador</CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <p className="font-semibold">{order.buyer?.display_name}</p>
              <p className="text-sm text-muted-foreground">{order.buyer?.email}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Vendedor</CardTitle>
          </CardHeader>
          <CardContent>
            {order.seller ? (
              <div>
                <p className="font-semibold">{order.seller?.display_name}</p>
                <p className="text-sm text-muted-foreground">{order.seller?.email}</p>
              </div>
            ) : (
              <p className="text-muted-foreground">Não atribuído</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Valores</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm">Total</span>
              <span className="font-semibold">{formatCurrency(order.amount_total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Taxa</span>
              <span className="font-semibold text-green-600">{formatCurrency(order.platform_fee)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t">
              <span className="text-sm">Líquido</span>
              <span className="font-semibold">{formatCurrency(netAmount)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detalhes do Serviço</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div>
              <span className="font-medium">Título:</span> {order.listing?.title}
            </div>
            <div>
              <span className="font-medium">Categoria:</span> {order.listing?.category}
            </div>
            <div>
              <span className="font-medium">Descrição:</span> {order.listing?.description}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
