'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabaseClient } from '@/lib/supabase-client';
import { 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  History,
  ShoppingCart,
  BadgeDollarSign,
  RotateCcw,
  Gift,
  Settings,
  Receipt,
  ArrowLeft,
  Filter,
  Calendar
} from 'lucide-react';
import { formatCurrency, formatRelativeTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface Transaction {
  id: string;
  type: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  description: string | null;
  status: string;
  created_at: string;
}

const typeConfig: Record<string, { 
  icon: React.ElementType; 
  label: string; 
  color: string;
  bgColor: string;
}> = {
  DEPOSIT: { icon: ArrowDownToLine, label: 'Depósito', color: 'text-emerald-600', bgColor: 'bg-emerald-500/10' },
  WITHDRAWAL: { icon: ArrowUpFromLine, label: 'Saque', color: 'text-rose-600', bgColor: 'bg-rose-500/10' },
  SALE_CREDIT: { icon: BadgeDollarSign, label: 'Venda', color: 'text-emerald-600', bgColor: 'bg-emerald-500/10' },
  PURCHASE_DEBIT: { icon: ShoppingCart, label: 'Compra', color: 'text-blue-600', bgColor: 'bg-blue-500/10' },
  REFUND_CREDIT: { icon: RotateCcw, label: 'Reembolso Recebido', color: 'text-emerald-600', bgColor: 'bg-emerald-500/10' },
  REFUND_DEBIT: { icon: RotateCcw, label: 'Reembolso', color: 'text-rose-600', bgColor: 'bg-rose-500/10' },
  BONUS_CREDIT: { icon: Gift, label: 'Bônus', color: 'text-purple-600', bgColor: 'bg-purple-500/10' },
  ADJUSTMENT: { icon: Settings, label: 'Ajuste', color: 'text-amber-600', bgColor: 'bg-amber-500/10' },
  PLATFORM_FEE: { icon: Receipt, label: 'Taxa da Plataforma', color: 'text-slate-600', bgColor: 'bg-slate-500/10' },
};

const filterOptions = [
  { value: 'all', label: 'Todas' },
  { value: 'DEPOSIT', label: 'Depósitos' },
  { value: 'WITHDRAWAL', label: 'Saques' },
  { value: 'SALE_CREDIT', label: 'Vendas' },
  { value: 'PURCHASE_DEBIT', label: 'Compras' },
];

export default function WalletHistoryPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const LIMIT = 20;

  useEffect(() => {
    loadTransactions(true);
  }, [filter]);

  const loadTransactions = async (reset = false) => {
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) return;

      const currentPage = reset ? 0 : page;
      
      let query = supabaseClient
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(currentPage * LIMIT, (currentPage + 1) * LIMIT - 1);

      if (filter !== 'all') {
        query = query.eq('type', filter);
      }

      const { data, error } = await query;

      if (data) {
        if (reset) {
          setTransactions(data);
          setPage(0);
        } else {
          setTransactions(prev => [...prev, ...data]);
        }
        setHasMore(data.length === LIMIT);
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    setPage(prev => prev + 1);
    loadTransactions();
  };

  // Agrupar transações por data
  const groupedTransactions = transactions.reduce((acc, tx) => {
    const date = new Date(tx.created_at).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
    if (!acc[date]) acc[date] = [];
    acc[date].push(tx);
    return acc;
  }, {} as Record<string, Transaction[]>);

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
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/wallet">
          <Button variant="ghost" size="icon" className="rounded-xl">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">Histórico</h1>
          <p className="text-sm text-muted-foreground">Todas as suas transações</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-4 px-4">
        <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        {filterOptions.map(option => (
          <button
            key={option.value}
            onClick={() => setFilter(option.value)}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all',
              filter === option.value
                ? 'bg-poke-blue text-white'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Transactions List */}
      {Object.keys(groupedTransactions).length > 0 ? (
        <div className="space-y-6">
          {Object.entries(groupedTransactions).map(([date, txs]) => (
            <div key={date}>
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">{date}</span>
              </div>
              <div className="bg-card rounded-xl border border-border overflow-hidden divide-y divide-border">
                {txs.map((tx, index) => {
                  const config = typeConfig[tx.type] || typeConfig.ADJUSTMENT;
                  const IconComponent = config.icon;
                  const isPositive = tx.amount > 0;

                  return (
                    <motion.div
                      key={tx.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', config.bgColor)}>
                        <IconComponent className={cn('h-5 w-5', config.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="font-medium text-foreground">{config.label}</p>
                          {tx.status === 'PENDING' && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600">
                              Pendente
                            </span>
                          )}
                          {tx.status === 'FAILED' && (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-red-500/10 text-red-600">
                              Falhou
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {tx.description || config.label}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={cn('font-bold', isPositive ? 'text-emerald-600' : 'text-rose-600')}>
                          {isPositive ? '+' : ''}{formatCurrency(tx.amount)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Saldo: {formatCurrency(tx.balance_after)}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}

          {hasMore && (
            <div className="text-center">
              <Button variant="outline" onClick={loadMore}>
                Carregar mais
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12 bg-card rounded-xl border border-border">
          <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
            <History className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="font-medium text-foreground">Nenhuma transação encontrada</p>
          <p className="text-sm text-muted-foreground mt-1">
            {filter !== 'all' ? 'Tente outro filtro' : 'Suas transações aparecerão aqui'}
          </p>
        </div>
      )}
    </div>
  );
}
