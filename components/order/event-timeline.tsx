import { CheckCircle2, Clock, AlertCircle, XCircle, UserCheck, FileText, MessageSquare, DollarSign } from 'lucide-react';
import { formatDateTime } from '@/lib/format';

interface OrderEvent {
  id: string;
  type: string;
  data: any;
  actor_id: string | null;
  created_at: string;
}

interface EventTimelineProps {
  events: OrderEvent[];
  actorNames?: Record<string, string>;
}

const eventIcons: Record<string, any> = {
  ORDER_CREATED: Clock,
  PAYMENT_CONFIRMED: CheckCircle2,
  SELLER_ASSIGNED: UserCheck,
  SELLER_ACCEPTED: CheckCircle2,
  DELIVERY_SUBMITTED: FileText,
  REVIEW_STARTED: Clock,
  ORDER_COMPLETED: CheckCircle2,
  ORDER_CANCELLED: XCircle,
  DISPUTE_OPENED: AlertCircle,
  MESSAGE_SENT: MessageSquare,
  PAYOUT_PROCESSED: DollarSign,
  REFUND_ISSUED: DollarSign,
};

const eventLabels: Record<string, string> = {
  ORDER_CREATED: 'Ordem Criada',
  PAYMENT_CONFIRMED: 'Pagamento Confirmado',
  SELLER_ASSIGNED: 'Vendedor Atribuído',
  SELLER_ACCEPTED: 'Vendedor Aceitou',
  DELIVERY_SUBMITTED: 'Entrega Enviada',
  REVIEW_STARTED: 'Revisão Iniciada',
  ORDER_COMPLETED: 'Ordem Concluída',
  ORDER_CANCELLED: 'Ordem Cancelada',
  DISPUTE_OPENED: 'Disputa Aberta',
  MESSAGE_SENT: 'Mensagem Enviada',
  PAYOUT_PROCESSED: 'Pagamento Processado',
  REFUND_ISSUED: 'Reembolso Emitido',
};

export function EventTimeline({ events, actorNames = {} }: EventTimelineProps) {
  return (
    <div className="space-y-4">
      {events.map((event, index) => {
        const Icon = eventIcons[event.type] || Clock;
        const label = eventLabels[event.type] || event.type;
        const isLast = index === events.length - 1;

        return (
          <div key={event.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={`rounded-full p-2 ${
                event.type.includes('COMPLETED') || event.type.includes('CONFIRMED') || event.type.includes('ACCEPTED')
                  ? 'bg-green-100 text-green-600'
                  : event.type.includes('CANCELLED') || event.type.includes('DISPUTE')
                  ? 'bg-red-100 text-red-600'
                  : 'bg-blue-100 text-blue-600'
              }`}>
                <Icon className="h-4 w-4" />
              </div>
              {!isLast && <div className="w-0.5 h-full bg-gray-200 mt-2" />}
            </div>
            <div className="flex-1 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{label}</p>
                  {event.actor_id && (
                    <p className="text-sm text-muted-foreground">
                      por {actorNames[event.actor_id] || event.actor_id}
                    </p>
                  )}
                  {event.data && Object.keys(event.data).length > 0 && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {JSON.stringify(event.data)}
                    </p>
                  )}
                </div>
                <p className="text-sm text-muted-foreground whitespace-nowrap ml-4">
                  {formatDateTime(event.created_at)}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
