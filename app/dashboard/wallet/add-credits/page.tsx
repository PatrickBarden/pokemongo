'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabaseClient } from '@/lib/supabase-client';
import { 
  Zap, 
  Coins, 
  Star, 
  Crown, 
  Gem,
  BadgeCheck,
  Sparkles,
  TrendingUp,
  ArrowLeft,
  Shield,
  CreditCard,
  CheckCircle2
} from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface CreditPackage {
  id: string;
  name: string;
  slug: string;
  description: string;
  credits: number;
  price: number;
  bonus_credits: number;
  bonus_percentage: number;
  is_popular: boolean;
  is_best_value: boolean;
  display_order: number;
  icon: string;
  color: string;
}

const iconMap: Record<string, React.ElementType> = {
  zap: Zap,
  coins: Coins,
  star: Star,
  crown: Crown,
  gem: Gem,
};

const colorMap: Record<string, { bg: string; text: string; gradient: string; border: string }> = {
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-600', gradient: 'from-blue-500 to-blue-600', border: 'border-blue-500/30 hover:border-blue-500/50' },
  green: { bg: 'bg-emerald-500/10', text: 'text-emerald-600', gradient: 'from-emerald-500 to-emerald-600', border: 'border-emerald-500/30 hover:border-emerald-500/50' },
  purple: { bg: 'bg-purple-500/10', text: 'text-purple-600', gradient: 'from-purple-500 to-purple-600', border: 'border-purple-500/30 hover:border-purple-500/50' },
  amber: { bg: 'bg-amber-500/10', text: 'text-amber-600', gradient: 'from-amber-500 to-amber-600', border: 'border-amber-500/30 hover:border-amber-500/50' },
  pink: { bg: 'bg-pink-500/10', text: 'text-pink-600', gradient: 'from-pink-500 to-pink-600', border: 'border-pink-500/30 hover:border-pink-500/50' },
};

export default function AddCreditsPage() {
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [userId, setUserId] = useState<string>('');

  useEffect(() => {
    loadPackages();
  }, []);

  const loadPackages = async () => {
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (user) setUserId(user.id);

      const { data, error } = await supabaseClient
        .from('credit_packages')
        .select('*')
        .eq('active', true)
        .order('display_order', { ascending: true });

      if (data) {
        setPackages(data);
      }
    } catch (error) {
      console.error('Error loading packages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = (packageId: string) => {
    if (!userId) {
      toast.error('Você precisa estar logado');
      return;
    }
    // Redirecionar para página de checkout
    window.location.href = `/dashboard/wallet/checkout?package=${packageId}`;
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
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/wallet">
          <Button variant="ghost" size="icon" className="rounded-xl">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Adicionar Créditos</h1>
          <p className="text-sm text-muted-foreground">Escolha o pacote ideal para você</p>
        </div>
      </div>

      {/* Info Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-emerald-500/10 to-green-500/5 border border-emerald-500/20 rounded-xl p-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Quanto maior o pacote, maior o bônus!</p>
            <p className="text-sm text-muted-foreground">Economize até 40% com pacotes maiores</p>
          </div>
        </div>
      </motion.div>

      {/* Packages Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {packages.map((pkg, index) => {
          const IconComponent = iconMap[pkg.icon] || Coins;
          const colors = colorMap[pkg.color] || colorMap.blue;
          const totalCredits = pkg.credits + pkg.bonus_credits;
          const isSelected = selectedPackage === pkg.id;

          return (
            <motion.div
              key={pkg.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02, y: -4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => !processing && handlePurchase(pkg.id)}
              className={cn(
                'relative bg-card rounded-2xl border-2 p-5 cursor-pointer transition-all duration-300',
                pkg.is_popular ? 'border-purple-500 shadow-lg shadow-purple-500/20' : colors.border,
                isSelected && 'ring-2 ring-primary ring-offset-2'
              )}
            >
              {/* Popular/Best Value Badge */}
              {(pkg.is_popular || pkg.is_best_value) && (
                <div className={cn(
                  'absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold text-white flex items-center gap-1',
                  pkg.is_popular ? 'bg-gradient-to-r from-purple-500 to-pink-500' : 'bg-gradient-to-r from-amber-500 to-orange-500'
                )}>
                  {pkg.is_popular ? (
                    <>
                      <Star className="h-3 w-3 fill-current" />
                      Mais Popular
                    </>
                  ) : (
                    <>
                      <TrendingUp className="h-3 w-3" />
                      Melhor Valor
                    </>
                  )}
                </div>
              )}

              {/* Icon */}
              <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center mb-4', colors.bg)}>
                <IconComponent className={cn('h-7 w-7', colors.text)} />
              </div>

              {/* Name & Description */}
              <h3 className="text-lg font-bold text-foreground mb-1">{pkg.name}</h3>
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{pkg.description}</p>

              {/* Credits Display */}
              <div className="bg-muted/50 rounded-xl p-3 mb-4">
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-3xl font-bold text-foreground">{pkg.credits}</span>
                  <span className="text-sm text-muted-foreground">créditos</span>
                </div>
                {pkg.bonus_credits > 0 && (
                  <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                    <Sparkles className="h-4 w-4" />
                    <span className="text-sm font-semibold">+{pkg.bonus_credits} bônus ({pkg.bonus_percentage}%)</span>
                  </div>
                )}
                {pkg.bonus_credits > 0 && (
                  <div className="mt-2 pt-2 border-t border-border">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Total:</span>
                      <span className="font-bold text-foreground">{totalCredits} créditos</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Price & CTA */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-2xl font-bold text-foreground">{formatCurrency(pkg.price)}</span>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  disabled={processing}
                  className={cn(
                    'px-5 py-2.5 rounded-xl font-semibold text-white text-sm flex items-center gap-2 transition-all',
                    `bg-gradient-to-r ${colors.gradient}`,
                    'hover:shadow-lg hover:shadow-black/20',
                    processing && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {isSelected && processing ? (
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <BadgeCheck className="h-4 w-4" />
                  )}
                  Comprar
                </motion.button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Security Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-card rounded-2xl border border-border p-6"
      >
        <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <Shield className="h-5 w-5 text-poke-blue" />
          Pagamento Seguro
        </h3>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <p className="font-medium text-sm text-foreground">Mercado Pago</p>
              <p className="text-xs text-muted-foreground">Processado com segurança</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <CreditCard className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-sm text-foreground">Múltiplas Formas</p>
              <p className="text-xs text-muted-foreground">PIX, Cartão, Boleto</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-purple-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <Sparkles className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <p className="font-medium text-sm text-foreground">Créditos Instantâneos</p>
              <p className="text-xs text-muted-foreground">Disponível na hora</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
