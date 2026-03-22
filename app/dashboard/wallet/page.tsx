'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
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
  Coins,
  CheckCircle2,
  XCircle,
  Shield,
  CreditCard,
  RefreshCcw
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

interface CreditPurchase {
  id: string;
  status: string;
  credits_amount: number;
  bonus_credits: number;
  price_paid: number;
  payment_id?: string | null;
}

const typeConfig: Record<string, { icon: React.ElementType; label: string; color: string; bgColor: string }> = {
  DEPOSIT: { icon: ArrowDownToLine, label: 'Deposito', color: 'text-emerald-500', bgColor: 'bg-emerald-500/10' },
  WITHDRAWAL: { icon: ArrowUpFromLine, label: 'Saque', color: 'text-rose-500', bgColor: 'bg-rose-500/10' },
  SALE_CREDIT: { icon: BadgeDollarSign, label: 'Venda', color: 'text-emerald-500', bgColor: 'bg-emerald-500/10' },
  PURCHASE_DEBIT: { icon: ShoppingCart, label: 'Compra', color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
  REFUND_CREDIT: { icon: RotateCcw, label: 'Reembolso', color: 'text-amber-500', bgColor: 'bg-amber-500/10' },
  BONUS_CREDIT: { icon: Gift, label: 'Bonus', color: 'text-purple-500', bgColor: 'bg-purple-500/10' },
};

const walletPaymentReturnConfig = {
  success: {
    title: 'Créditos em processamento',
    description: 'Seu pagamento foi recebido pelo Mercado Pago. Assim que a confirmação finalizar, os créditos entram na sua carteira.',
    badge: 'Pagamento recebido',
    container: 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-900 dark:bg-emerald-950/20',
    iconWrap: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300',
    icon: CheckCircle2,
  },
  pending: {
    title: 'Pagamento ainda pendente',
    description: 'Seu pagamento está em análise. Alguns métodos podem levar mais tempo para liberar os créditos.',
    badge: 'Aguardando confirmação',
    container: 'border-amber-200 bg-amber-50/70 dark:border-amber-900 dark:bg-amber-950/20',
    iconWrap: 'bg-amber-500/15 text-amber-600 dark:text-amber-300',
    icon: Clock,
  },
  failure: {
    title: 'Pagamento de créditos não concluído',
    description: 'O pagamento não foi aprovado. Você pode tentar novamente e escolher outro método, se preferir.',
    badge: 'Ação necessária',
    container: 'border-rose-200 bg-rose-50/70 dark:border-rose-900 dark:bg-rose-950/20',
    iconWrap: 'bg-rose-500/15 text-rose-600 dark:text-rose-300',
    icon: XCircle,
  },
} as const;

export default function WalletPage() {
  const searchParams = useSearchParams();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBalance, setShowBalance] = useState(true);
  const [highlightedPurchase, setHighlightedPurchase] = useState<CreditPurchase | null>(null);

  useEffect(() => {
    loadWalletData();
  }, []);

  const loadWalletData = async () => {
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) return;

      const purchaseId = searchParams.get('purchase_id');

      let { data: walletData, error } = await supabaseClient
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code === 'PGRST116') {
        const { data: newWallet } = await (supabaseClient
          .from('wallets') as any)
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

      if (purchaseId) {
        const { data: purchaseData } = await (supabaseClient as any)
          .from('credit_purchases')
          .select('id, status, credits_amount, bonus_credits, price_paid, payment_id')
          .eq('id', purchaseId)
          .eq('user_id', user.id)
          .maybeSingle();

        setHighlightedPurchase(purchaseData || null);
      }
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
  const paymentStatus = searchParams.get('status');
  const walletPaymentFeedback = paymentStatus && paymentStatus in walletPaymentReturnConfig
    ? walletPaymentReturnConfig[paymentStatus as keyof typeof walletPaymentReturnConfig]
    : null;
  const WalletPaymentIcon = walletPaymentFeedback?.icon;
  const totalCreditsFromPurchase = highlightedPurchase
    ? highlightedPurchase.credits_amount + (highlightedPurchase.bonus_credits || 0)
    : 0;

  return (
    <div className="space-y-4 pb-24">
      {walletPaymentFeedback && (
        <div className={`rounded-2xl border p-5 shadow-sm ${walletPaymentFeedback.container}`}>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex gap-4">
              <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl ${walletPaymentFeedback.iconWrap}`}>
                {WalletPaymentIcon && <WalletPaymentIcon className="h-6 w-6" />}
              </div>
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-background/80 px-3 py-1 text-xs font-semibold text-foreground shadow-sm">
                    {walletPaymentFeedback.badge}
                  </span>
                  {highlightedPurchase && (
                    <span className="rounded-full border bg-background/70 px-3 py-1 text-xs font-medium text-foreground">
                      Compra {highlightedPurchase.id.slice(0, 8)}
                    </span>
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">{walletPaymentFeedback.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{walletPaymentFeedback.description}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border bg-background/70 p-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <CreditCard className="h-4 w-4 text-poke-blue" />
                      Pagamento
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {paymentStatus === 'success' ? 'O pagamento foi criado e está seguindo para confirmação.' : paymentStatus === 'pending' ? 'O provedor ainda não concluiu a confirmação.' : 'A tentativa não foi aprovada pelo provedor.'}
                    </p>
                  </div>
                  <div className="rounded-2xl border bg-background/70 p-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Coins className="h-4 w-4 text-poke-blue" />
                      Créditos
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {highlightedPurchase ? `${totalCreditsFromPurchase} créditos vinculados a esta compra.` : 'Os créditos serão refletidos aqui assim que a compra for confirmada.'}
                    </p>
                  </div>
                  <div className="rounded-2xl border bg-background/70 p-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Shield className="h-4 w-4 text-poke-blue" />
                      Próximo passo
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {paymentStatus === 'failure' ? 'Tente novamente com outro método de pagamento.' : 'Acompanhe o saldo e o histórico para ver a confirmação.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex w-full max-w-sm flex-col gap-3 rounded-3xl border bg-background/80 p-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Resumo da compra</p>
                <p className="mt-2 text-2xl font-black text-poke-blue">
                  {highlightedPurchase ? formatCurrency(highlightedPurchase.price_paid || 0) : formatCurrency(0)}
                </p>
              </div>
              <div className="rounded-2xl border bg-muted/20 p-3">
                <p className="text-xs text-muted-foreground">Créditos previstos</p>
                <p className="mt-1 text-xl font-bold text-foreground">{highlightedPurchase ? totalCreditsFromPurchase : '--'}</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Link href="/dashboard/wallet/history" className="flex-1">
                  <button className="w-full rounded-2xl bg-poke-blue px-4 py-2.5 text-sm font-semibold text-white hover:bg-poke-blue/90 transition-colors">
                    Ver histórico
                  </button>
                </Link>
                {paymentStatus === 'failure' ? (
                  <Link href="/dashboard/wallet/add-credits" className="flex-1">
                    <button className="w-full rounded-2xl border bg-background px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted transition-colors">
                      Tentar novamente
                    </button>
                  </Link>
                ) : (
                  <button onClick={loadWalletData} className="flex-1 rounded-2xl border bg-background px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted transition-colors">
                    <RefreshCcw className="mr-2 inline h-4 w-4" />
                    Atualizar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

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
