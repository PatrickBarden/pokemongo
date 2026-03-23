import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  compact?: boolean;
}

const normalize = (s: string) => (s || '').toUpperCase().replace(/[- ]/g, '_');

const statusMap: Record<string, { label: string; short: string; className: string }> = {
  PENDING:            { label: 'Pagamento Pendente', short: 'Pendente',          className: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30' },
  PAYMENT_PENDING:    { label: 'Pagamento Pendente', short: 'Pendente',          className: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30' },
  AWAITING_SELLER:    { label: 'Aguardando Vendedor', short: 'Aguardando',       className: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30' },
  PAYMENT_CONFIRMED:  { label: 'Pagamento Confirmado', short: 'Confirmado',      className: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30' },
  PAID:               { label: 'Pago',               short: 'Pago',              className: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30' },
  SELLER_ACCEPTED:    { label: 'Vendedor Aceitou',   short: 'Aceito',            className: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border-cyan-500/30' },
  IN_DELIVERY:        { label: 'Em Entrega',         short: 'Entregando',        className: 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30' },
  DELIVERY_SUBMITTED: { label: 'Entrega Enviada',    short: 'Enviado',           className: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border-cyan-500/30' },
  IN_REVIEW:          { label: 'Em Revisão',         short: 'Revisão',           className: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-500/30' },
  PROCESSING:         { label: 'Processando',        short: 'Processando',       className: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30' },
  COMPLETED:          { label: 'Concluído',          short: 'Concluído',         className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30' },
  CANCELLED:          { label: 'Cancelado',          short: 'Cancelado',         className: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30' },
  REFUNDED:           { label: 'Reembolsado',        short: 'Reembolsado',       className: 'bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30' },
  DISPUTE:            { label: 'Em Disputa',         short: 'Disputa',           className: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30' },
  FAILED:             { label: 'Falhou',             short: 'Falhou',            className: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30' },
};

const fallback = { label: 'Desconhecido', short: '?', className: 'bg-muted text-muted-foreground border-border' };

export function StatusBadge({ status, compact }: StatusBadgeProps) {
  const key = normalize(status);
  const config = statusMap[key] || fallback;

  return (
    <Badge
      variant="outline"
      className={cn(
        'border font-medium text-[10px] px-2 py-0.5 whitespace-nowrap',
        config.className,
      )}
    >
      {compact ? config.short : config.label}
    </Badge>
  );
}
