import { Badge } from '@/components/ui/badge';

type OrderStatus =
  | 'PAYMENT_PENDING'
  | 'AWAITING_SELLER'
  | 'SELLER_ACCEPTED'
  | 'DELIVERY_SUBMITTED'
  | 'IN_REVIEW'
  | 'COMPLETED'
  | 'DISPUTE'
  | 'CANCELLED';

interface StatusBadgeProps {
  status: OrderStatus;
}

const statusConfig: Record<OrderStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
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
  const config = statusConfig[status];

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
