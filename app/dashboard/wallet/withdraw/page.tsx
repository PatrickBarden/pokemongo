'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabaseClient } from '@/lib/supabase-client';
import { 
  ArrowLeft,
  ArrowUpFromLine,
  Wallet,
  AlertCircle,
  CheckCircle2,
  Mail,
  Phone,
  Hash,
  User,
  Building2,
  Info
} from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { requestWithdrawal, getWallet } from '@/server/actions/wallet';

type PixKeyType = 'cpf' | 'cnpj' | 'email' | 'phone' | 'random';

const pixKeyTypes: { value: PixKeyType; label: string; icon: React.ElementType; placeholder: string }[] = [
  { value: 'cpf', label: 'CPF', icon: User, placeholder: '000.000.000-00' },
  { value: 'cnpj', label: 'CNPJ', icon: Building2, placeholder: '00.000.000/0000-00' },
  { value: 'email', label: 'E-mail', icon: Mail, placeholder: 'seu@email.com' },
  { value: 'phone', label: 'Telefone', icon: Phone, placeholder: '+55 (00) 00000-0000' },
  { value: 'random', label: 'Chave Aleatória', icon: Hash, placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
];

export default function WithdrawPage() {
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [userId, setUserId] = useState('');
  const [amount, setAmount] = useState('');
  const [pixKeyType, setPixKeyType] = useState<PixKeyType>('cpf');
  const [pixKey, setPixKey] = useState('');

  useEffect(() => {
    loadBalance();
  }, []);

  const loadBalance = async () => {
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) return;
      
      setUserId(user.id);
      
      const wallet = await getWallet(user.id);
      if (wallet) {
        setBalance(wallet.balance);
      }
    } catch (error) {
      console.error('Error loading balance:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    const withdrawAmount = parseFloat(amount);
    
    if (!withdrawAmount || withdrawAmount <= 0) {
      toast.error('Digite um valor válido');
      return;
    }

    if (withdrawAmount > balance) {
      toast.error('Saldo insuficiente');
      return;
    }

    if (withdrawAmount < 10) {
      toast.error('Valor mínimo para saque é R$ 10,00');
      return;
    }

    if (!pixKey.trim()) {
      toast.error('Digite sua chave PIX');
      return;
    }

    setProcessing(true);

    try {
      const result = await requestWithdrawal(userId, withdrawAmount, pixKey, pixKeyType);
      
      if (result.success) {
        toast.success('Solicitação de saque enviada!');
        toast.info('O valor será transferido em até 24 horas úteis');
        setAmount('');
        setPixKey('');
        loadBalance();
      } else {
        toast.error(result.error || 'Erro ao solicitar saque');
      }
    } catch (error) {
      toast.error('Erro ao processar solicitação');
    } finally {
      setProcessing(false);
    }
  };

  const setQuickAmount = (percentage: number) => {
    const value = (balance * percentage / 100).toFixed(2);
    setAmount(value);
  };

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
    <div className="space-y-6 pb-20 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/wallet">
          <Button variant="ghost" size="icon" className="rounded-xl">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Sacar</h1>
          <p className="text-sm text-muted-foreground">Transferir para sua conta PIX</p>
        </div>
      </div>

      {/* Balance Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-poke-blue to-blue-600 rounded-2xl p-5 text-white"
      >
        <div className="flex items-center gap-3 mb-2">
          <Wallet className="h-5 w-5 text-white/80" />
          <span className="text-sm text-white/80">Saldo disponível</span>
        </div>
        <p className="text-3xl font-bold">{formatCurrency(balance)}</p>
      </motion.div>

      {/* Amount Input */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card rounded-2xl border border-border p-5"
      >
        <Label className="text-sm font-medium text-foreground mb-3 block">
          Valor do saque
        </Label>
        <div className="relative mb-4">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg text-muted-foreground">R$</span>
          <Input
            type="number"
            step="0.01"
            min="10"
            max={balance}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0,00"
            className="pl-12 h-14 text-2xl font-bold"
          />
        </div>

        {/* Quick Amount Buttons */}
        <div className="flex gap-2">
          {[25, 50, 75, 100].map(pct => (
            <button
              key={pct}
              onClick={() => setQuickAmount(pct)}
              className="flex-1 py-2 px-3 rounded-lg text-sm font-medium bg-muted hover:bg-muted/80 transition-colors"
            >
              {pct}%
            </button>
          ))}
        </div>
      </motion.div>

      {/* PIX Key Type */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-card rounded-2xl border border-border p-5"
      >
        <Label className="text-sm font-medium text-foreground mb-3 block">
          Tipo de chave PIX
        </Label>
        <div className="grid grid-cols-5 gap-2 mb-4">
          {pixKeyTypes.map(type => {
            const Icon = type.icon;
            return (
              <button
                key={type.value}
                onClick={() => setPixKeyType(type.value)}
                className={cn(
                  'p-3 rounded-xl flex flex-col items-center gap-1 transition-all border-2',
                  pixKeyType === type.value
                    ? 'border-poke-blue bg-poke-blue/10'
                    : 'border-border hover:border-muted-foreground/30'
                )}
              >
                <Icon className={cn('h-5 w-5', pixKeyType === type.value ? 'text-poke-blue' : 'text-muted-foreground')} />
                <span className={cn('text-[10px] font-medium', pixKeyType === type.value ? 'text-poke-blue' : 'text-muted-foreground')}>
                  {type.label}
                </span>
              </button>
            );
          })}
        </div>

        <Label className="text-sm font-medium text-foreground mb-2 block">
          Chave PIX
        </Label>
        <Input
          type="text"
          value={pixKey}
          onChange={(e) => setPixKey(e.target.value)}
          placeholder={pixKeyTypes.find(t => t.value === pixKeyType)?.placeholder}
          className="h-12"
        />
      </motion.div>

      {/* Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4"
      >
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-amber-700 dark:text-amber-400 mb-1">Informações importantes</p>
            <ul className="text-amber-600 dark:text-amber-500 space-y-1">
              <li>• Valor mínimo: R$ 10,00</li>
              <li>• Prazo: até 24 horas úteis</li>
              <li>• Confira a chave PIX antes de confirmar</li>
            </ul>
          </div>
        </div>
      </motion.div>

      {/* Submit Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Button
          onClick={handleWithdraw}
          disabled={processing || !amount || !pixKey || parseFloat(amount) > balance}
          className="w-full h-14 text-lg font-semibold bg-poke-blue hover:bg-poke-blue/90"
        >
          {processing ? (
            <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <ArrowUpFromLine className="h-5 w-5 mr-2" />
              Solicitar Saque
            </>
          )}
        </Button>
      </motion.div>
    </div>
  );
}
