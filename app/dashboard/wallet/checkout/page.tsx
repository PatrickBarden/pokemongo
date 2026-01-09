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
  Gem
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

      // Redirecionar para checkout do Mercado Pago
      const checkoutUrl = sandboxInitPoint || initPoint;
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
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/wallet/add-credits">
          <Button variant="ghost" size="sm" className="rounded-xl">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-foreground">Checkout</h1>
          <p className="text-sm text-muted-foreground">Finalize sua compra de créditos</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Detalhes do Pacote */}
        <div className="lg:col-span-3 space-y-4">
          <Card className="border-2 border-poke-blue/20">
            <CardHeader className="bg-gradient-to-r from-poke-blue/10 to-blue-500/5">
              <CardTitle className="flex items-center gap-2 text-base">
                <Coins className="h-5 w-5 text-poke-blue" />
                Detalhes do Pacote
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex gap-6">
                {/* Ícone do Pacote */}
                <div className={cn('w-20 h-20 rounded-2xl flex items-center justify-center', colors.bg)}>
                  <IconComponent className={cn('h-10 w-10', colors.text)} />
                </div>

                {/* Info */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-xl font-bold text-foreground mb-1">
                        {pkg.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {pkg.description}
                      </p>
                    </div>
                    {(pkg.is_popular || pkg.is_best_value) && (
                      <Badge className={cn(
                        'text-white border-0',
                        pkg.is_popular ? 'bg-purple-500' : 'bg-amber-500'
                      )}>
                        {pkg.is_popular ? 'Popular' : 'Melhor Valor'}
                      </Badge>
                    )}
                  </div>

                  {/* Créditos */}
                  <div className="bg-muted/50 rounded-xl p-4 mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Créditos base</span>
                      <span className="font-semibold">{pkg.credits}</span>
                    </div>
                    {pkg.bonus_credits > 0 && (
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-emerald-600 flex items-center gap-1">
                          <Gift className="h-4 w-4" />
                          Bônus ({pkg.bonus_percentage}%)
                        </span>
                        <span className="font-semibold text-emerald-600">+{pkg.bonus_credits}</span>
                      </div>
                    )}
                    <Separator className="my-2" />
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Total de créditos</span>
                      <span className="text-lg font-bold text-poke-blue">{totalCredits}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card de Segurança */}
          <Card className="border-2 border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-900">
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <Shield className="h-10 w-10 text-emerald-600 flex-shrink-0" />
                <div>
                  <h3 className="font-bold text-emerald-900 dark:text-emerald-100 mb-2 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Compra 100% Segura
                  </h3>
                  <ul className="space-y-1 text-sm text-emerald-800 dark:text-emerald-200">
                    <li>✓ Pagamento processado pelo Mercado Pago</li>
                    <li>✓ Créditos adicionados instantaneamente</li>
                    <li>✓ Suporte disponível 24/7</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Resumo do Pedido */}
        <div className="lg:col-span-2">
          <Card className="sticky top-6 border-2 border-poke-blue/20">
            <CardHeader className="bg-gradient-to-r from-poke-blue/10 to-blue-500/5">
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="h-5 w-5 text-poke-blue" />
                Resumo
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {/* Valores */}
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{pkg.name}</span>
                  <span className="font-medium">{formatCurrency(pkg.price)}</span>
                </div>
                
                {pkg.bonus_credits > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-emerald-600 flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      Bônus incluído
                    </span>
                    <span className="font-medium text-emerald-600">
                      +{pkg.bonus_credits} créditos
                    </span>
                  </div>
                )}
                
                <Separator />
                
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-poke-blue">{formatCurrency(pkg.price)}</span>
                </div>
                
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <span className="text-sm text-muted-foreground">Você receberá</span>
                  <div className="text-2xl font-bold text-foreground">{totalCredits} créditos</div>
                </div>
              </div>

              {/* Botão de Pagamento */}
              <Button
                onClick={handleCheckout}
                disabled={processing}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-12 text-base font-semibold"
              >
                {processing ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-5 w-5 mr-2" />
                    Pagar {formatCurrency(pkg.price)}
                  </>
                )}
              </Button>

              {/* Métodos de Pagamento */}
              <div className="pt-4 border-t">
                <p className="text-xs text-muted-foreground text-center mb-3">
                  Formas de pagamento:
                </p>
                <div className="flex justify-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs">PIX</Badge>
                  <Badge variant="outline" className="text-xs">Cartão</Badge>
                  <Badge variant="outline" className="text-xs">Boleto</Badge>
                </div>
              </div>

              {/* Logo Mercado Pago */}
              <div className="text-center pt-4 border-t">
                <p className="text-xs text-muted-foreground mb-2">
                  Processado por
                </p>
                <div className="flex items-center justify-center">
                  <div className="bg-[#009EE3] text-white px-3 py-1 rounded font-bold text-sm">
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
