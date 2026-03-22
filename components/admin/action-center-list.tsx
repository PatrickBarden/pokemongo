'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronLeft, ChevronRight, Package, Clock, AlertTriangle, DollarSign, TrendingUp, Timer, Bell, CheckCircle2, UserPlus, CreditCard, XCircle, Hourglass } from 'lucide-react';
import { formatRelativeTime } from '@/lib/format';

export function ActionCenterList({ notifications }: { notifications: any[] }) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  const totalPages = Math.ceil(notifications.length / itemsPerPage);

  const paginatedNotifications = notifications.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getSeverityColor = (severity: string, type?: string) => {
    // Cores especiais para tipos de pagamento - suporte dark mode
    if (type === 'payment_approved') return 'bg-green-500/10 text-green-500 border-green-500/20';
    if (type === 'payment_rejected') return 'bg-red-500/10 text-red-500 border-red-500/20';
    if (type === 'payment_pending') return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
    
    switch (severity) {
      case 'critical': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'high': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'medium': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      default: return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'dispute': return AlertTriangle;
      case 'payout': return DollarSign;
      case 'order_check': return Package;
      case 'new_user': return UserPlus;
      case 'payment_approved': return CreditCard;
      case 'payment_pending': return Hourglass;
      case 'payment_rejected': return XCircle;
      case 'new_order': return Package;
      case 'delivery_submitted': return CheckCircle2;
      default: return Bell;
    }
  };

  if (notifications.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
        <p>Nenhuma pendência no momento!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {paginatedNotifications.map((notif: any) => {
          const Icon = getNotificationIcon(notif.type);
          return (
            <Link 
              href={notif.link} 
              key={notif.id}
              className={`block p-4 rounded-lg border transition-all hover:shadow-md hover:scale-[1.01] ${getSeverityColor(notif.severity, notif.type)} bg-card`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-full shrink-0 ${getSeverityColor(notif.severity, notif.type)} bg-opacity-20`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-semibold text-sm truncate pr-2 text-foreground">{notif.title}</p>
                    <span className="text-[10px] opacity-70 whitespace-nowrap font-medium text-muted-foreground">
                      {formatRelativeTime(notif.created_at)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                    {notif.description}
                  </p>
                  <div className="flex items-center text-xs font-medium text-poke-blue group">
                    Resolver
                    <ArrowRight className="h-3 w-3 ml-1 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t pt-4">
          <p className="text-sm text-muted-foreground">
            Página {currentPage} de {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-md border bg-background hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-md border bg-background hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
