'use client';

import { motion } from 'framer-motion';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Eye,
  EyeOff,
  ArrowDownToLine,
  ArrowUpFromLine,
  History,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { useState } from 'react';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface WalletCardProps {
  balance: number;
  pendingBalance: number;
  totalEarned: number;
  totalSpent: number;
  compact?: boolean;
}

export function WalletCard({
  balance,
  pendingBalance,
  totalEarned,
  totalSpent,
  compact = false
}: WalletCardProps) {
  const [showBalance, setShowBalance] = useState(true);

  if (compact) {
    return (
      <Link href="/dashboard/wallet" className="block">
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="bg-gradient-to-br from-poke-blue via-blue-600 to-indigo-700 rounded-2xl p-4 text-white relative overflow-hidden group cursor-pointer"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

          <div className="flex items-center justify-between relative">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Wallet className="h-4 w-4 text-white/80" />
                <span className="text-xs text-white/80 font-medium">Minha Carteira</span>
              </div>
              <div className="text-2xl font-bold">
                {showBalance ? formatCurrency(balance) : '••••••'}
              </div>
              {pendingBalance > 0 && (
                <div className="text-xs text-white/70 mt-1 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  {formatCurrency(pendingBalance)} pendente
                </div>
              )}
            </div>
            <ChevronRight className="h-5 w-5 text-white/60 group-hover:translate-x-1 transition-transform" />
          </div>
        </motion.div>
      </Link>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-poke-blue via-blue-600 to-indigo-700 rounded-3xl p-6 text-white relative overflow-hidden"
    >
      {/* Background decorations */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
      <div className="absolute top-1/2 right-1/4 w-24 h-24 bg-white/5 rounded-full" />

      {/* Header */}
      <div className="flex items-center justify-between mb-6 relative">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
            <Wallet className="h-6 w-6" />
          </div>
          <div>
            <h2 className="font-semibold text-lg">Minha Carteira</h2>
            <p className="text-white/70 text-sm">Créditos Pokémon GO</p>
          </div>
        </div>
        <button
          onClick={() => setShowBalance(!showBalance)}
          className="p-2 hover:bg-white/10 rounded-xl transition-colors"
        >
          {showBalance ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
        </button>
      </div>

      {/* Balance */}
      <div className="mb-6 relative">
        <p className="text-white/70 text-sm mb-1">Saldo disponível</p>
        <motion.div
          key={showBalance ? 'visible' : 'hidden'}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-4xl font-bold tracking-tight"
        >
          {showBalance ? formatCurrency(balance) : '•••••••'}
        </motion.div>
        {pendingBalance > 0 && showBalance && (
          <div className="flex items-center gap-2 mt-2 text-white/70 text-sm">
            <Sparkles className="h-4 w-4 text-amber-300" />
            <span>{formatCurrency(pendingBalance)} pendente de vendas</span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6 relative">
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-emerald-300" />
            <span className="text-xs text-white/70">Ganhos</span>
          </div>
          <p className="font-semibold">
            {showBalance ? formatCurrency(totalEarned) : '••••'}
          </p>
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="h-4 w-4 text-rose-300" />
            <span className="text-xs text-white/70">Gastos</span>
          </div>
          <p className="font-semibold">
            {showBalance ? formatCurrency(totalSpent) : '••••'}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 relative">
        <Link href="/dashboard/wallet/add-credits" className="flex-1">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full bg-white text-poke-blue font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-black/20"
          >
            <ArrowDownToLine className="h-5 w-5" />
            Adicionar
          </motion.button>
        </Link>
        <Link href="/dashboard/wallet/withdraw" className="flex-1">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full bg-white/20 backdrop-blur-sm text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 border border-white/30"
          >
            <ArrowUpFromLine className="h-5 w-5" />
            Sacar
          </motion.button>
        </Link>
        <Link href="/dashboard/wallet/history">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-white/20 backdrop-blur-sm text-white p-3 rounded-xl border border-white/30"
          >
            <History className="h-5 w-5" />
          </motion.button>
        </Link>
      </div>
    </motion.div>
  );
}
