'use client';

import { motion } from 'framer-motion';
import { 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  ShoppingCart,
  BadgeDollarSign,
  Gift,
  RotateCcw,
  Settings,
  Receipt
} from 'lucide-react';
import { formatCurrency, formatRelativeTime } from '@/lib/format';
import { cn } from '@/lib/utils';

interface TransactionItemProps {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  description: string | null;
  status: string;
  createdAt: string;
  index?: number;
}

const typeConfig: Record<string, { 
  icon: React.ElementType; 
  label: string; 
  color: string;
  bgColor: string;
}> = {
  DEPOSIT: {
    icon: ArrowDownToLine,
    label: 'Depósito',
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-500/10',
  },
  WITHDRAWAL: {
    icon: ArrowUpFromLine,
    label: 'Saque',
    color: 'text-rose-600 dark:text-rose-400',
    bgColor: 'bg-rose-500/10',
  },
  SALE_CREDIT: {
    icon: BadgeDollarSign,
    label: 'Venda',
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-500/10',
  },
  PURCHASE_DEBIT: {
    icon: ShoppingCart,
    label: 'Compra',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-500/10',
  },
  REFUND_CREDIT: {
    icon: RotateCcw,
    label: 'Reembolso',
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-500/10',
  },
  REFUND_DEBIT: {
    icon: RotateCcw,
    label: 'Reembolso',
    color: 'text-rose-600 dark:text-rose-400',
    bgColor: 'bg-rose-500/10',
  },
  BONUS_CREDIT: {
    icon: Gift,
    label: 'Bônus',
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-500/10',
  },
  ADJUSTMENT: {
    icon: Settings,
    label: 'Ajuste',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-500/10',
  },
  PLATFORM_FEE: {
    icon: Receipt,
    label: 'Taxa',
    color: 'text-slate-600 dark:text-slate-400',
    bgColor: 'bg-slate-500/10',
  },
};

export function TransactionItem({
  id,
  type,
  amount,
  balanceAfter,
  description,
  status,
  createdAt,
  index = 0,
}: TransactionItemProps) {
  const config = typeConfig[type] || typeConfig.ADJUSTMENT;
  const IconComponent = config.icon;
  const isPositive = amount > 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border hover:bg-muted/50 transition-colors"
    >
      {/* Icon */}
      <div className={cn(
        'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0',
        config.bgColor
      )}>
        <IconComponent className={cn('h-5 w-5', config.color)} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-semibold text-foreground">{config.label}</span>
          {status === 'PENDING' && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
              Pendente
            </span>
          )}
          {status === 'FAILED' && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400">
              Falhou
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground truncate">
          {description || config.label}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {formatRelativeTime(createdAt)}
        </p>
      </div>

      {/* Amount */}
      <div className="text-right flex-shrink-0">
        <p className={cn(
          'font-bold text-lg',
          isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
        )}>
          {isPositive ? '+' : ''}{formatCurrency(amount)}
        </p>
        <p className="text-xs text-muted-foreground">
          Saldo: {formatCurrency(balanceAfter)}
        </p>
      </div>
    </motion.div>
  );
}
