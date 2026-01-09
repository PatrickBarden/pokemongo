'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabaseClient } from '@/lib/supabase-client';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Plus,
  ArrowUpRight,
  History,
  ChevronRight,
  Eye,
  EyeOff,
  Clock,
  ShoppingCart,
  BadgeDollarSign,
  RotateCcw,
  Gift,
  ArrowDownToLine,
  ArrowUpFromLine,
  Coins
} from 'lucide-react';
import { formatCurrency, formatRelativeTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface WalletData {
  id: string;
  user_id: string;
  balance: number;
  pending_balance: number;
  total_earned: number;
  total_spent: number;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  balance_after: number;
  description: string | null;
  status: string;
  created_at: string;
}

const typeConfig: Record<string, { icon: React.ElementType; label: string; color: string; bgColor: string }> = {
  DEPOSIT: { icon: ArrowDownToLine, label: 'Deposito', color: 'text-emerald-500', bgColor: 'bg-emerald-500/10' },
  WITHDRAWAL: { icon: ArrowUpFromLine, label: 'Saque', color: 'text-rose-500', bgColor: 'bg-rose-500/10' },
  SALE_CREDIT: { icon: BadgeDollarSign, label: 'Venda', color: 'text-emerald-500', bgColor: 'bg-emerald-500/10' },
  PURCHASE_DEBIT: { icon: ShoppingCart, label: 'Compra', color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  REFUND_CREDIT: { icon: RotateCcw, label: 'Reembolso', color: 'text-amber-500', bgColor: 'bg-amber-500/10' },
  BONUS_CREDIT: { icon: Gift, label: 'Bonus', color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
};

export default function WalletPage() {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBalance, setShowBalance] = useState(true);

  useEffect(() => {
    loadWalletData();
  }, []);

  const loadWalletData = async () => {
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) return;

      let { data: walletData, error } = await supabaseClient
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code === 'PGRST116') {
        const { data: newWallet } = await supabaseClient
          .from('wallets')
          .insert({ user_id: user.id })
          .select()
          .single();
        walletData = newWallet;
      }

      if (walletData) setWallet(walletData);

      const { data: txData } = await supabaseClient
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (txData) setTransactions(txData);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="w-8 h-8 border-2 border-poke-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const balance = wallet?.balance || 0;
  const pendingBalance = wallet?.pending_balance || 0;
  const totalEarned = wallet?.total_earned || 0;
  const totalSpent = wallet?.total_spent || 0;

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Carteira</h1>
        <button 
          onClick={() => setShowBalance(!showBalance)} 
          className="p-2 rounded-full hover:bg-muted transition-colors"
        >
          {showBalance ? <Eye className="h-5 w-5 text-muted-foreground" /> : <EyeOff className="h-5 w-5 text-muted-foreground" />}
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-poke-blue to-blue-600 rounded-2xl p-5 text-white relative overflow-hidden"
      >
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full" />
        <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-white/5 rounded-full" />
        
        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <Coins className="h-4 w-4 text-white/70" />
            <span className="text-sm text-white/70">Saldo disponivel</span>
          </div>
          
          <div className="text-3xl font-bold mb-4">
            {showBalance ? formatCurrency(balance) : '******'}
          </div>

          {pendingBalance > 0 && (
            <div className="text-xs text-white/60 mb-4">
              + {formatCurrency(pendingBalance)} pendente
            </div>
          )}

          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-300" />
              <span className="text-white/70">Ganhos:</span>
              <span className="font-medium">{showBalance ? formatCurrency(totalEarned) : '****'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <TrendingDown className="h-3.5 w-3.5 text-rose-300" />
              <span className="text-white/70">Gastos:</span>
              <span className="font-medium">{showBalance ? formatCurrency(totalSpent) : '****'}</span>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-3 gap-2">
        <Link href="/dashboard/wallet/add-credits">
          <motion.button
            whileTap={{ scale: 0.98 }}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl p-3 flex flex-col items-center gap-1 transition-colors"
          >
            <Plus className="h-5 w-5" />
            <span className="text-xs font-medium">Adicionar</span>
          </motion.button>
        </Link>
        
        <Link href="/dashboard/wallet/withdraw">
          <motion.button
            whileTap={{ scale: 0.98 }}
            className="w-full bg-card hover:bg-muted border border-border text-foreground rounded-xl p-3 flex flex-col items-center gap-1 transition-colors"
          >
            <ArrowUpRight className="h-5 w-5" />
            <span className="text-xs font-medium">Sacar</span>
          </motion.button>
        </Link>
        
        <Link href="/dashboard/wallet/history">
          <motion.button
            whileTap={{ scale: 0.98 }}
            className="w-full bg-card hover:bg-muted border border-border text-foreground rounded-xl p-3 flex flex-col items-center gap-1 transition-colors"
          >
            <History className="h-5 w-5" />
            <span className="text-xs font-medium">Historico</span>
          </motion.button>
        </Link>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm text-foreground">Recentes</span>
          </div>
          <Link 
            href="/dashboard/wallet/history" 
            className="text-xs text-poke-blue font-medium flex items-center hover:underline"
          >
            Ver tudo <ChevronRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="divide-y divide-border">
          {transactions.length > 0 ? (
            transactions.map((tx) => {
              const config = typeConfig[tx.type] || typeConfig.DEPOSIT;
              const IconComponent = config.icon;
              const isPositive = tx.amount > 0;

              return (
                <div key={tx.id} className="flex items-center gap-3 px-4 py-3">
                  <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', config.bgColor)}>
                    <IconComponent className={cn('h-4 w-4', config.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{config.label}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {tx.description || formatRelativeTime(tx.created_at)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={cn('text-sm font-semibold', isPositive ? 'text-emerald-500' : 'text-rose-500')}>
                      {isPositive ? '+' : ''}{formatCurrency(tx.amount)}
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 px-4">
              <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center mx-auto mb-3">
                <Wallet className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">Nenhuma transacao</p>
              <p className="text-xs text-muted-foreground mb-3">Adicione creditos para comecar</p>
              <Link href="/dashboard/wallet/add-credits">
                <button className="text-xs bg-poke-blue text-white px-4 py-2 rounded-lg font-medium hover:bg-poke-blue/90 transition-colors">
                  Adicionar Creditos
                </button>
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Gift className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-foreground mb-1">Ganhe bonus!</p>
            <p className="text-xs text-muted-foreground">
              Compre pacotes de creditos e ganhe ate 40% de bonus extra.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
