'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseClient } from '@/lib/supabase-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  ChevronRight
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { cn } from '@/lib/utils';

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

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const [pkg, setPkg] = useState<CreditPackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');

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
      window.location.href = checkoutUrl;

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
        <Loader2 className="h-8 w-8 animate-spin text-poke-blue" />
      </div>
    );
  }

  if (!pkg) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Pacote não encontrado</h3>
            <p className="text-muted-foreground mb-4">
              O pacote selecionado não está mais disponível.
            </p>
            <Link href="/dashboard/wallet/add-credits">
              <Button>Ver Pacotes Disponíveis</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const IconComponent = iconMap[pkg.icon] || Coins;
  const colors = colorMap[pkg.color] || colorMap.blue;
  const totalCredits = pkg.credits + pkg.bonus_credits;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/wallet/add-credits">
          <Button variant="ghost" size="sm" className="rounded-xl">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Checkout de créditos</h1>
          <p className="text-sm text-muted-foreground">Finalize sua compra e adicione créditos à carteira com pagamento protegido.</p>
        </div>
      </div>

      <Card className="overflow-hidden border-0 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 text-white shadow-xl">
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-4 max-w-2xl">
              <Badge className="w-fit border-0 bg-white/15 text-white hover:bg-white/15">Créditos instantâneos</Badge>
              <div className="space-y-2">
                <h2 className="text-2xl sm:text-4xl font-bold leading-tight">Reforce sua carteira e acelere sua jornada no app.</h2>
                <p className="text-sm sm:text-base text-white/85">
                  Você escolhe o pacote, conclui o pagamento no Mercado Pago e recebe os créditos na carteira para continuar comprando com agilidade.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold"><Coins className="h-4 w-4" /> 1. Pacote</div>
                  <p className="mt-1 text-xs text-white/80">Você confirma o pacote ideal.</p>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold"><CreditCard className="h-4 w-4" /> 2. Pagamento</div>
                  <p className="mt-1 text-xs text-white/80">Pagamento em ambiente seguro.</p>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold"><CheckCircle2 className="h-4 w-4" /> 3. Carteira</div>
                  <p className="mt-1 text-xs text-white/80">Créditos liberados após confirmação.</p>
                </div>
              </div>
            </div>

            <div className="w-full max-w-sm rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-white/70">Você receberá</p>
              <div className="mt-2 text-4xl font-black">{totalCredits} créditos</div>
              <div className="mt-4 space-y-2 text-sm text-white/85">
                <div className="flex items-center justify-between">
                  <span>Pacote base</span>
                  <span>{pkg.credits} créditos</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Bônus</span>
                  <span>{pkg.bonus_credits > 0 ? `+${pkg.bonus_credits}` : 'Sem bônus'}</span>
                </div>
              </div>
              <div className="mt-5 flex items-center gap-2 rounded-2xl bg-black/10 px-3 py-2 text-xs text-white/80">
                <Lock className="h-4 w-4" /> Pagamento processado com segurança pelo Mercado Pago.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="space-y-6">
          <Card className="border border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Coins className="h-5 w-5 text-poke-blue" />
                Detalhes do pacote
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-5 md:flex-row">
                <div className={cn('mx-auto flex h-24 w-24 items-center justify-center rounded-3xl md:mx-0', colors.bg)}>
                  <IconComponent className={cn('h-12 w-12', colors.text)} />
                </div>

                <div className="flex-1 space-y-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h3 className="text-2xl font-bold text-foreground">{pkg.name}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{pkg.description}</p>
                    </div>
                    {(pkg.is_popular || pkg.is_best_value) && (
                      <Badge className={cn('w-fit border-0 text-white', pkg.is_popular ? 'bg-purple-500' : 'bg-amber-500')}>
                        {pkg.is_popular ? 'Popular' : 'Melhor Valor'}
                      </Badge>
                    )}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border bg-muted/30 p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <Gift className="h-4 w-4 text-emerald-600" />
                        Composição
                      </div>
                      <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                        <p>{pkg.credits} créditos base</p>
                        <p>{pkg.bonus_credits > 0 ? `+ ${pkg.bonus_credits} créditos bônus` : 'Sem bônus adicional'}</p>
                      </div>
                    </div>
                    <div className="rounded-2xl border bg-muted/30 p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <Clock3 className="h-4 w-4 text-poke-blue" />
                        Liberação
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">Os créditos ficam disponíveis após a confirmação do pagamento.</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border bg-muted/30 p-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Créditos base</span>
                      <span className="font-semibold">{pkg.credits}</span>
                    </div>
                    {pkg.bonus_credits > 0 && (
                      <div className="mt-2 flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1 text-emerald-600">
                          <Sparkles className="h-3.5 w-3.5" />
                          Bônus ({pkg.bonus_percentage}%)
                        </span>
                        <span className="font-semibold text-emerald-600">+{pkg.bonus_credits}</span>
                      </div>
                    )}
                    <Separator className="my-3" />
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-foreground">Total entregue</span>
                      <span className="text-xl font-bold text-poke-blue">{totalCredits}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border border-emerald-200 bg-emerald-50/60 shadow-sm dark:border-emerald-900 dark:bg-emerald-950/20">
              <CardContent className="pt-6">
                <div className="flex gap-3">
                  <Shield className="h-10 w-10 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <h3 className="mb-2 font-bold text-emerald-900 dark:text-emerald-100">Por que esta compra é segura?</h3>
                    <ul className="space-y-2 text-sm text-emerald-800 dark:text-emerald-200">
                      <li>✓ Pagamento via Mercado Pago</li>
                      <li>✓ Fluxo rápido e protegido</li>
                      <li>✓ Créditos vinculados à sua conta</li>
                      <li>✓ Suporte em caso de inconsistência</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border/60 shadow-sm">
              <CardContent className="pt-6">
                <h3 className="mb-3 font-bold text-foreground">O que acontece depois?</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 rounded-xl bg-muted/30 p-3">
                    <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-poke-blue text-xs font-bold text-white">1</div>
                    <div>
                      <p className="text-sm font-medium">Você conclui o pagamento</p>
                      <p className="text-xs text-muted-foreground">No ambiente seguro do Mercado Pago.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-xl bg-muted/30 p-3">
                    <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-poke-blue text-xs font-bold text-white">2</div>
                    <div>
                      <p className="text-sm font-medium">A compra é confirmada</p>
                      <p className="text-xs text-muted-foreground">O sistema valida a operação e atualiza seu saldo.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-xl bg-muted/30 p-3">
                    <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-poke-blue text-xs font-bold text-white">3</div>
                    <div>
                      <p className="text-sm font-medium">Você usa os créditos no app</p>
                      <p className="text-xs text-muted-foreground">Para acelerar compras e outras ações disponíveis.</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="space-y-6">
          <Card className="sticky top-6 border border-poke-blue/20 shadow-lg shadow-poke-blue/5">
            <CardHeader className="space-y-3 bg-gradient-to-r from-poke-blue/10 to-emerald-500/10">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CreditCard className="h-5 w-5 text-poke-blue" />
                  Resumo da compra
                </CardTitle>
                <Badge variant="outline" className="border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300">Seguro</Badge>
              </div>
              <p className="text-sm text-muted-foreground">Revise os créditos e siga para o pagamento.</p>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="rounded-2xl border bg-muted/20 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{pkg.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Pacote de créditos para sua carteira.</p>
                  </div>
                  <span className="text-sm font-semibold">1x</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Pacote</span>
                  <span className="font-medium">{formatCurrency(pkg.price)}</span>
                </div>
                {pkg.bonus_credits > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-1 text-emerald-600">
                      <Sparkles className="h-3 w-3" />
                      Bônus incluído
                    </span>
                    <span className="font-medium text-emerald-600">+{pkg.bonus_credits} créditos</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-2xl font-bold">
                  <span>Total</span>
                  <span className="text-poke-blue">{formatCurrency(pkg.price)}</span>
                </div>
                <div className="rounded-2xl border bg-muted/20 p-4 text-center">
                  <span className="text-sm text-muted-foreground">Você receberá</span>
                  <div className="mt-1 text-3xl font-black text-foreground">{totalCredits}</div>
                  <div className="text-xs text-muted-foreground">créditos na carteira</div>
                </div>
              </div>

              <Button
                onClick={handleCheckout}
                disabled={processing}
                className="h-14 w-full rounded-2xl bg-emerald-600 text-base font-semibold text-white hover:bg-emerald-700"
              >
                {processing ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Processando pagamento...
                  </>
                ) : (
                  <>
                    Seguir para o Mercado Pago
                    <ChevronRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>

              <div className="rounded-2xl border border-dashed bg-muted/20 p-4 text-sm">
                <div className="flex items-center gap-2 font-semibold text-foreground">
                  <Lock className="h-4 w-4 text-poke-blue" />
                  O pagamento acontece fora do app
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Você será redirecionado para o Mercado Pago para pagar com PIX, cartão ou boleto em ambiente protegido.
                </p>
              </div>

              <div className="border-t pt-4">
                <p className="mb-3 text-center text-xs text-muted-foreground">Formas de pagamento</p>
                <div className="flex flex-wrap justify-center gap-2">
                  <Badge variant="outline" className="text-xs">PIX</Badge>
                  <Badge variant="outline" className="text-xs">Cartão</Badge>
                  <Badge variant="outline" className="text-xs">Boleto</Badge>
                </div>
              </div>

              <div className="border-t pt-4 text-center">
                <p className="mb-2 text-xs text-muted-foreground">Processado por</p>
                <div className="flex items-center justify-center">
                  <div className="rounded bg-[#009EE3] px-3 py-1 text-sm font-bold text-white">
                    mercado pago
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function CreditCheckoutPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-poke-blue" />
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}
