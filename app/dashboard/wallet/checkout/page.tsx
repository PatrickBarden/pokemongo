'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseClient } from '@/lib/supabase-client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/lib/format';
import { 
  CreditCard, 
  ArrowLeft, 
  Coins, 
  Shield, 
  Sparkles, 
  Loader2,
  CheckCircle2,
  AlertCircle,
  Gift,
  Zap,
  Star,
  Crown,
  Gem,
  Clock3,
  Lock,
  ChevronRight,
  ChevronLeft,
  ShieldCheck
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

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

const colorMap: Record<string, { bg: string; text: string; gradient: string }> = {
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-600', gradient: 'from-blue-500 to-blue-600' },
  green: { bg: 'bg-emerald-500/10', text: 'text-emerald-600', gradient: 'from-emerald-500 to-emerald-600' },
  purple: { bg: 'bg-purple-500/10', text: 'text-purple-600', gradient: 'from-purple-500 to-purple-600' },
  amber: { bg: 'bg-amber-500/10', text: 'text-amber-600', gradient: 'from-amber-500 to-amber-600' },
  pink: { bg: 'bg-pink-500/10', text: 'text-pink-600', gradient: 'from-pink-500 to-pink-600' },
};

const STEPS = [
  { label: 'Segurança', icon: Shield },
  { label: 'Pacote', icon: Coins },
  { label: 'Pagamento', icon: CreditCard },
];

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const [pkg, setPkg] = useState<CreditPackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [step, setStep] = useState(0);

  useEffect(() => {
    loadCheckoutData();
  }, []);

  const loadCheckoutData = async () => {
    try {
      const packageId = searchParams.get('package');
      
      if (!packageId) {
        toast({
          title: "Erro",
          description: "Nenhum pacote selecionado.",
          variant: "destructive",
        });
        router.push('/dashboard/wallet/add-credits');
        return;
      }

      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) {
        toast({
          title: "Erro",
          description: "Você precisa estar logado.",
          variant: "destructive",
        });
        router.push('/login');
        return;
      }
      setCurrentUserId(user.id);

      const { data: packageData, error } = await supabaseClient
        .from('credit_packages')
        .select('*')
        .eq('id', packageId)
        .eq('active', true)
        .single();

      if (error || !packageData) {
        toast({
          title: "Erro",
          description: "Pacote não encontrado ou não está mais disponível.",
          variant: "destructive",
        });
        router.push('/dashboard/wallet/add-credits');
        return;
      }

      setPkg(packageData);
    } catch (error: any) {
      console.error('Erro ao carregar checkout:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados do checkout.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async () => {
    if (!pkg || !currentUserId) return;

    setProcessing(true);

    try {
      // Criar registro de compra de créditos
      const { data: purchase, error: purchaseError } = await (supabaseClient as any)
        .from('credit_purchases')
        .insert({
          user_id: currentUserId,
          package_id: pkg.id,
          credits_amount: pkg.credits,
          bonus_credits: pkg.bonus_credits,
          price_paid: pkg.price,
          status: 'pending',
        })
        .select()
        .single();

      if (purchaseError) throw purchaseError;

      // Criar preferência de pagamento no Mercado Pago
      const response = await fetch('/api/mercadopago/create-credit-preference', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: currentUserId,
          purchaseId: purchase.id,
          packageName: pkg.name,
          credits: pkg.credits + pkg.bonus_credits,
          price: pkg.price,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao criar preferência de pagamento');
      }

      const { sandboxInitPoint, initPoint } = await response.json();

      toast({
        title: "Redirecionando para pagamento... 💳",
        description: `Compra de ${pkg.credits + pkg.bonus_credits} créditos iniciada!`,
      });

      // Redirecionar para checkout do Mercado Pago (produção)
      const checkoutUrl = initPoint;
      if (Capacitor.isNativePlatform()) {
        await Browser.open({ url: checkoutUrl });
      } else {
        window.location.href = checkoutUrl;
      }

    } catch (error: any) {
      console.error('Erro ao processar checkout:', error);
      toast({
        title: "Erro ao processar pagamento",
        description: error.message || "Tente novamente mais tarde.",
        variant: "destructive",
      });
      setProcessing(false);
    }
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

  if (!pkg) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-semibold mb-2">Pacote não encontrado</h3>
        <p className="text-muted-foreground mb-4 text-center text-sm">
          O pacote selecionado não está mais disponível.
        </p>
        <Link href="/dashboard/wallet/add-credits">
          <Button>Voltar aos Pacotes</Button>
        </Link>
      </div>
    );
  }

  const IconComponent = iconMap[pkg.icon] || Coins;
  const colors = colorMap[pkg.color] || colorMap.blue;
  const totalCredits = pkg.credits + pkg.bonus_credits;

  const goNext = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const goBack = () => {
    if (step === 0) {
      router.push('/dashboard/wallet/add-credits');
    } else {
      setStep((s) => s - 1);
    }
  };

  // ── Step 1: Segurança & Processo ──
  const StepSecurity = () => (
    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-700 text-white p-5 shadow-lg">
        <Badge className="border-0 bg-white/15 text-white hover:bg-white/15 mb-3">Créditos instantâneos</Badge>
        <h2 className="text-xl font-bold leading-tight mb-2">
          Reforce sua carteira e acelere sua jornada.
        </h2>
        <p className="text-sm text-white/85">
          O pagamento é processado pelo Mercado Pago e os créditos são liberados automaticamente.
        </p>

        <div className="mt-4 space-y-2">
          {[
            { icon: CreditCard, title: '1. Pagamento', desc: 'Você conclui em ambiente seguro.' },
            { icon: Zap, title: '2. Liberação', desc: 'O sistema valida a operação.' },
            { icon: CheckCircle2, title: '3. Carteira', desc: 'Créditos prontos para uso.' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl bg-white/10 border border-white/10 p-3">
              <item.icon className="h-5 w-5 shrink-0" />
              <div>
                <p className="text-sm font-semibold">{item.title}</p>
                <p className="text-xs text-white/75">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-50/60 dark:bg-emerald-950/20 p-4">
        <div className="flex gap-3">
          <ShieldCheck className="h-8 w-8 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-emerald-900 dark:text-emerald-100 text-sm mb-1.5">Por que esta compra é segura?</h3>
            <ul className="space-y-1.5 text-xs text-emerald-800 dark:text-emerald-200">
              <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 shrink-0" /> Checkout seguro com Mercado Pago</li>
              <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 shrink-0" /> Fluxo rápido e transparente</li>
              <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 shrink-0" /> Adição instantânea à sua conta</li>
              <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 shrink-0" /> Suporte prioritário se precisar</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );

  // ── Step 2: Item sendo comprado ──
  const StepPackage = () => (
    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="rounded-2xl border bg-card p-4 shadow-sm">
        <div className="flex gap-4">
          <div className={cn('w-24 h-24 rounded-xl border flex items-center justify-center shrink-0', colors.bg, 'border-' + colors.text.replace('text-', '') + '/20')}>
            <IconComponent className={cn('h-10 w-10', colors.text)} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-lg font-bold text-foreground leading-tight">{pkg.name}</h3>
              {(pkg.is_popular || pkg.is_best_value) && (
                <Badge className={cn('shrink-0 border-0 text-white text-[10px]', pkg.is_popular ? 'bg-purple-500' : 'bg-amber-500')}>
                  {pkg.is_popular ? 'Popular' : 'Melhor Oferta'}
                </Badge>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{pkg.description}</p>
            <p className="mt-2 text-xl font-black text-poke-blue">{formatCurrency(pkg.price)}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t">
          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0 text-xs shadow-none">
            <Coins className="h-3 w-3 mr-1" /> {pkg.credits} base
          </Badge>
          {pkg.bonus_credits > 0 && (
            <Badge className="bg-gradient-to-r from-amber-400 to-orange-500 text-white border-0 text-xs shadow-none">
              <Sparkles className="h-3 w-3 mr-1" /> +{pkg.bonus_credits} bônus
            </Badge>
          )}
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <Gift className="h-5 w-5 text-emerald-600" />
          <span className="font-semibold text-sm">Composição e Recebimento</span>
        </div>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Créditos base</span>
            <span className="font-medium text-foreground">{pkg.credits}</span>
          </div>
          {pkg.bonus_credits > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Bônus promocional</span>
              <span className="font-medium text-emerald-600">+{pkg.bonus_credits}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between items-center text-sm">
            <span className="font-medium">Total na carteira</span>
            <span className="text-lg font-bold text-emerald-600">{totalCredits}</span>
          </div>
        </div>
      </div>
      
      <div className="rounded-2xl border bg-card p-4 shadow-sm">
        <h4 className="font-semibold text-sm mb-2">Quando eu recebo?</h4>
        <div className="flex items-start gap-2">
          <Clock3 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">O saldo é atualizado instantaneamente após nossa plataforma receber a confirmação de pagamento do Mercado Pago (geralmente ocorre em segundos no PIX/Cartão).</p>
        </div>
      </div>
    </div>
  );

  // ── Step 3: Resumo & Pagamento ──
  const StepPayment = () => (
    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-b from-emerald-500/5 to-transparent p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-base flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-emerald-600" />
            Resumo do pacote
          </h3>
          <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs">Seguro</Badge>
        </div>

        <div className="flex items-center gap-3 rounded-xl bg-card border p-3 mb-4">
          <div className={cn('w-12 h-12 rounded-lg flex items-center justify-center shrink-0 border', colors.bg, 'border-' + colors.text.replace('text-', '') + '/20')}>
            <IconComponent className={cn('w-6 h-6', colors.text)} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{pkg.name}</p>
            <p className="text-xs text-muted-foreground">+{totalCredits} créditos totais</p>
          </div>
          <span className="text-sm font-semibold shrink-0">1x</span>
        </div>

        <div className="space-y-2.5">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Valor do pacote</span>
            <span className="font-medium">{formatCurrency(pkg.price)}</span>
          </div>
          <Separator />
          <div className="flex justify-between items-center">
            <span className="text-lg font-bold">Total a Pagar</span>
            <span className="text-2xl font-black text-poke-blue">{formatCurrency(pkg.price)}</span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-dashed bg-card p-4">
        <div className="flex items-center gap-2 font-semibold text-sm text-foreground mb-2">
          <Lock className="h-4 w-4 text-emerald-600" />
          Ambiente do Mercado Pago
        </div>
        <p className="text-xs text-muted-foreground">
          Você será guiado ao checkout seguro e externo para finalizar sua compra.
        </p>
      </div>

      <div className="text-center">
        <p className="text-xs text-muted-foreground mb-2">Métodos aceitos</p>
        <div className="flex justify-center gap-1.5 flex-wrap">
          <Badge variant="outline" className="text-[10px]">Crédito</Badge>
          <Badge variant="outline" className="text-[10px]">Débito</Badge>
          <Badge variant="outline" className="text-[10px]">PIX</Badge>
        </div>
      </div>

      <div className="text-center pt-2 border-t">
        <p className="text-[10px] text-muted-foreground mb-1.5">Pagamento processado por</p>
        <div className="bg-[#009EE3] text-white px-3 py-1 rounded font-bold text-xs inline-block">mercado pago</div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col min-h-[calc(100vh-12rem)]">
      {/* Header compacto */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={goBack} className="p-2 -ml-2 rounded-xl hover:bg-muted transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-foreground">Checkout de créditos</h1>
          <p className="text-xs text-muted-foreground truncate">Etapa {step + 1} de {STEPS.length}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-muted-foreground">Pagar</p>
          <p className="text-base font-bold text-poke-blue">{formatCurrency(pkg.price)}</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-1 mb-5">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const isActive = i === step;
          const isDone = i < step;
          return (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-all",
                isActive && "bg-emerald-600 text-white shadow-md",
                isDone && "bg-emerald-600/15 text-emerald-700 dark:text-emerald-400",
                !isActive && !isDone && "bg-muted text-muted-foreground"
              )}
            >
              {isDone ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{s.label}</span>
            </button>
          );
        })}
      </div>

      {/* Step content */}
      <div className="flex-1">
        {step === 0 && <StepSecurity />}
        {step === 1 && <StepPackage />}
        {step === 2 && <StepPayment />}
      </div>

      {/* Bottom action bar */}
      <div className="mt-8 pt-6 pb-8 border-t border-border/50 bg-background">
        {step < STEPS.length - 1 ? (
          <div className="flex gap-3">
            {step > 0 && (
              <Button variant="outline" onClick={goBack} className="rounded-xl px-4 shadow-sm border-border/60">
                <ChevronLeft className="h-4 w-4 mr-1" />
                Voltar
              </Button>
            )}
            <Button onClick={goNext} className="flex-1 h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-md">
              Continuar
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        ) : (
          <div className="flex gap-3">
            <Button variant="outline" onClick={goBack} className="rounded-xl px-4 shadow-sm border-border/60">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Voltar
            </Button>
            <Button
              onClick={handleCheckout}
              disabled={processing}
              className="flex-1 h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-md"
            >
              {processing ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  Pagamento
                  <ChevronRight className="h-5 w-5 ml-1" />
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CreditCheckoutPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="relative w-10 h-10">
          <div className="w-10 h-10 border-3 border-border rounded-full"></div>
          <div className="w-10 h-10 border-3 border-poke-blue border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
        </div>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}
