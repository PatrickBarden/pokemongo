import { Badge } from '@/components/ui/badge';

type OrderStatus =
  | 'pending'
  | 'payment_pending'
  | 'paid'
  | 'processing'
  | 'awaiting_seller'
  | 'seller_accepted'
  | 'in_delivery'
  | 'delivery_submitted'
  | 'in_review'
  | 'completed'
  | 'cancelled'
  | 'refunded'
  | 'dispute'
  | 'failed'
  // Legacy status (uppercase)
  | 'PAYMENT_PENDING'
  | 'AWAITING_SELLER'
  | 'SELLER_ACCEPTED'
  | 'DELIVERY_SUBMITTED'
  | 'IN_REVIEW'
  | 'COMPLETED'
  | 'DISPUTE'
  | 'CANCELLED';

interface StatusBadgeProps {
  status: OrderStatus | string;
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  // Novos status (lowercase)
  pending: { label: 'Pendente', variant: 'outline' },
  payment_pending: { label: 'Pagamento Pendente', variant: 'outline' },
  paid: { label: 'Pago', variant: 'default' },
  processing: { label: 'Processando', variant: 'secondary' },
  awaiting_seller: { label: 'Aguardando Vendedor', variant: 'secondary' },
  seller_accepted: { label: 'Vendedor Aceitou', variant: 'default' },
  in_delivery: { label: 'Em Entrega', variant: 'default' },
  delivery_submitted: { label: 'Entrega Enviada', variant: 'default' },
  in_review: { label: 'Em Revisão', variant: 'default' },
  completed: { label: 'Concluído', variant: 'default' },
  cancelled: { label: 'Cancelado', variant: 'destructive' },
  refunded: { label: 'Reembolsado', variant: 'destructive' },
  dispute: { label: 'Disputa', variant: 'destructive' },
  failed: { label: 'Falhou', variant: 'destructive' },
  // Legacy status (uppercase) - mantidos para compatibilidade
  PAYMENT_PENDING: { label: 'Pagamento Pendente', variant: 'outline' },
  AWAITING_SELLER: { label: 'Aguardando Vendedor', variant: 'secondary' },
  SELLER_ACCEPTED: { label: 'Vendedor Aceitou', variant: 'default' },
  DELIVERY_SUBMITTED: { label: 'Entrega Enviada', variant: 'default' },
  IN_REVIEW: { label: 'Em Revisão', variant: 'default' },
  COMPLETED: { label: 'Concluído', variant: 'default' },
  DISPUTE: { label: 'Disputa', variant: 'destructive' },
  CANCELLED: { label: 'Cancelado', variant: 'destructive' },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] || { label: status, variant: 'outline' as const };

  return (
    <Badge variant={config.variant} className={
      status === 'COMPLETED' ? 'bg-green-600 hover:bg-green-700' :
      status === 'IN_REVIEW' ? 'bg-blue-600 hover:bg-blue-700' :
      status === 'SELLER_ACCEPTED' || status === 'DELIVERY_SUBMITTED' ? 'bg-cyan-600 hover:bg-cyan-700' :
      ''
    }>
      {config.label}
    </Badge>
  );
}
