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
  Package,
  Shield,
  Sparkles,
  Shirt,
  Image as ImageIcon,
  Heart,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Info,
  Clock3,
  Store,
  Lock,
  ChevronRight
} from 'lucide-react';
import { translateType } from '@/lib/translations';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { calculateFee, FeeCalculation } from '@/server/actions/platform-fees';

interface Listing {
  id: string;
  title: string;
  description: string;
  category: string;
  price_suggested: number;
  owner_id: string;
  photo_url?: string;
  pokemon_data?: any;
  is_shiny?: boolean;
  has_costume?: boolean;
  has_background?: boolean;
  is_purified?: boolean;
  is_dynamax?: boolean;
  is_gigantamax?: boolean;
  owner?: {
    id: string;
    display_name: string;
    email: string;
  };
}

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [feeInfo, setFeeInfo] = useState<FeeCalculation | null>(null);

  useEffect(() => {
    loadCheckoutData();
  }, []);

  const loadCheckoutData = async () => {
    try {
      const listingId = searchParams.get('listing');

      if (!listingId) {
        toast({
          title: "Erro",
          description: "Nenhum item selecionado para compra.",
          variant: "destructive",
        });
        router.push('/dashboard/market');
        return;
      }

      // Buscar usuário atual
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

      // Buscar dados do listing
      const { data: listingData, error } = await (supabaseClient as any)
        .from('listings')
        .select(`
          *,
          owner:owner_id(
            id,
            display_name,
            email
          )
        `)
        .eq('id', listingId)
        .eq('active', true)
        .single();

      if (error || !listingData) {
        toast({
          title: "Erro",
          description: "Pokémon não encontrado ou não está mais disponível.",
          variant: "destructive",
        });
        router.push('/dashboard/market');
        return;
      }

      // Verificar se não é o próprio item
      if (listingData.owner_id === user.id) {
        toast({
          title: "Ação não permitida",
          description: "Você não pode comprar seus próprios Pokémon.",
          variant: "destructive",
        });
        router.push('/dashboard/market');
        return;
      }

      // Buscar imagem do Pokémon se necessário
      if (!listingData.pokemon_data || !listingData.pokemon_data.sprites) {
        try {
          const pokemonName = listingData.title
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .split(' ')[0]
            .trim();

          const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonName}`);
          if (response.ok) {
            const pokemonData = await response.json();
            listingData.pokemon_data = pokemonData;
          }
        } catch (error) {
          console.error('Erro ao buscar imagem:', error);
        }
      }

      setListing(listingData);

      // Calcular taxa
      const fee = await calculateFee(listingData.price_suggested);
      setFeeInfo(fee);
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
    if (!listing || !currentUserId || !feeInfo) return;

    setProcessing(true);

    try {
      // Calcular total com taxa
      const totalWithFee = listing.price_suggested + feeInfo.totalFee;

      // Criar pedido e preferência de pagamento via API
      const response = await fetch('/api/mercadopago/create-preference', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: currentUserId,
          items: [{
            listing_id: listing.id,
            seller_id: listing.owner_id,
            pokemon_name: listing.title,
            pokemon_photo_url: listing.photo_url,
            price: listing.price_suggested,
            quantity: 1,
          }],
          total_amount: totalWithFee,
          platform_fee: feeInfo.totalFee,
          fee_percentage: feeInfo.totalFeePercentage,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao criar preferência de pagamento');
      }

      const { sandboxInitPoint, initPoint, orderNumber } = await response.json();

      toast({
        title: "Redirecionando para pagamento... 💳",
        description: `Pedido ${orderNumber} criado com sucesso!`,
      });

      // Redirecionar para checkout do Mercado Pago (produção)
      const checkoutUrl = initPoint;
      window.location.href = checkoutUrl;

    } catch (error: any) {
      console.error('❌ Erro completo ao processar checkout:', {
        error,
        message: error.message,
        stack: error.stack,
        response: error.response
      });
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

  if (!listing) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Item não encontrado</h3>
            <p className="text-muted-foreground mb-4">
              O Pokémon que você tentou comprar não está mais disponível.
            </p>
            <Link href="/dashboard/market">
              <Button>Voltar ao Mercado</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const imageUrl = listing.photo_url ||
    listing.pokemon_data?.sprites?.other?.['official-artwork']?.front_default ||
    listing.pokemon_data?.sprites?.front_default;

  const totalValue = feeInfo ? listing.price_suggested + feeInfo.totalFee : listing.price_suggested;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/market">
          <Button variant="ghost" size="sm" className="rounded-xl">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Checkout seguro</h1>
          <p className="text-muted-foreground text-sm">Revise os detalhes e siga para o pagamento com proteção da plataforma.</p>
        </div>
      </div>

      <Card className="overflow-hidden border-0 bg-gradient-to-br from-poke-blue via-sky-600 to-indigo-700 text-white shadow-xl">
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-4 max-w-2xl">
              <Badge className="w-fit border-0 bg-white/15 text-white hover:bg-white/15">Pagamento protegido</Badge>
              <div className="space-y-2">
                <h2 className="text-2xl sm:text-4xl font-bold leading-tight">Você está a poucos passos de garantir seu Pokémon.</h2>
                <p className="text-sm sm:text-base text-white/85">
                  O pagamento é processado pelo Mercado Pago e a nossa equipe acompanha a mediação da entrega para reduzir risco e dar previsibilidade à compra.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold"><CreditCard className="h-4 w-4" /> 1. Pagamento</div>
                  <p className="mt-1 text-xs text-white/80">Você conclui em ambiente seguro.</p>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold"><Shield className="h-4 w-4" /> 2. Mediação</div>
                  <p className="mt-1 text-xs text-white/80">A plataforma acompanha o processo.</p>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold"><CheckCircle2 className="h-4 w-4" /> 3. Entrega</div>
                  <p className="mt-1 text-xs text-white/80">Pedido concluído com suporte se necessário.</p>
                </div>
              </div>
            </div>

            <div className="w-full max-w-sm rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-white/70">Total da compra</p>
              <div className="mt-2 text-4xl font-black">{formatCurrency(totalValue)}</div>
              <div className="mt-4 space-y-2 text-sm text-white/85">
                <div className="flex items-center justify-between">
                  <span>Item</span>
                  <span>{formatCurrency(listing.price_suggested)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Taxa de segurança</span>
                  <span>{feeInfo ? formatCurrency(feeInfo.totalFee) : 'Calculando...'}</span>
                </div>
              </div>
              <div className="mt-5 flex items-center gap-2 rounded-2xl bg-black/10 px-3 py-2 text-xs text-white/80">
                <Lock className="h-4 w-4" /> Dados de pagamento processados pelo Mercado Pago.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-6">
          <Card className="border border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Package className="h-5 w-5 text-poke-blue" />
                Item da compra
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-5 md:flex-row">
                <div className="mx-auto md:mx-0">
                  <div className="w-32 h-32 rounded-2xl border-2 border-poke-blue/15 bg-gradient-to-br from-poke-blue/10 to-poke-yellow/10 overflow-hidden flex items-center justify-center">
                    {imageUrl ? (
                      <>
                        <img
                          src={imageUrl}
                          alt={listing.title}
                          className={`w-full h-full ${listing.photo_url ? 'object-cover' : 'object-contain p-4'}`}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                        <div className="hidden items-center justify-center w-full h-full">
                          <Package className="w-16 h-16 text-poke-blue/40" />
                        </div>
                      </>
                    ) : (
                      <Package className="w-16 h-16 text-poke-blue/40" />
                    )}
                  </div>
                </div>

                <div className="flex-1 space-y-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h3 className="text-2xl font-bold text-foreground">{listing.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{listing.description}</p>
                    </div>
                    <Badge className="w-fit bg-poke-yellow text-poke-dark border-0">{translateType(listing.category)}</Badge>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border bg-muted/30 p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <Store className="h-4 w-4 text-poke-blue" />
                        Vendedor
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">{listing.owner?.display_name}</p>
                    </div>
                    <div className="rounded-2xl border bg-muted/30 p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <Clock3 className="h-4 w-4 text-poke-blue" />
                        Próximo passo
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">Após o pagamento, seu pedido entra em acompanhamento pela equipe.</p>
                    </div>
                  </div>

                  {(listing.is_shiny || listing.has_costume || listing.has_background || listing.is_purified || listing.is_dynamax || listing.is_gigantamax) && (
                    <div className="flex flex-wrap gap-2">
                      {listing.is_shiny && (
                        <Badge className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-white border-0">
                          <Sparkles className="h-3 w-3 mr-1" />
                          Brilhante
                        </Badge>
                      )}
                      {listing.has_costume && (
                        <Badge className="bg-gradient-to-r from-purple-500 to-purple-700 text-white border-0">
                          <Shirt className="h-3 w-3 mr-1" />
                          Com traje
                        </Badge>
                      )}
                      {listing.has_background && (
                        <Badge className="bg-gradient-to-r from-blue-500 to-blue-700 text-white border-0">
                          <ImageIcon className="h-3 w-3 mr-1" />
                          Com fundo
                        </Badge>
                      )}
                      {listing.is_purified && (
                        <Badge className="bg-gradient-to-r from-pink-500 to-pink-700 text-white border-0">
                          <Heart className="h-3 w-3 mr-1" />
                          Purificado
                        </Badge>
                      )}
                      {listing.is_dynamax && <Badge className="bg-gradient-to-r from-red-500 to-red-700 text-white border-0">Dinamax</Badge>}
                      {listing.is_gigantamax && <Badge className="bg-gradient-to-r from-orange-500 to-red-600 text-white border-0">Gigamax</Badge>}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border border-green-200 dark:border-green-900 bg-green-50/60 dark:bg-green-950/20 shadow-sm">
              <CardContent className="pt-6">
                <div className="flex gap-3">
                  <Shield className="h-10 w-10 text-green-600 dark:text-green-400 flex-shrink-0" />
                  <div>
                    <h3 className="font-bold text-green-900 dark:text-green-100 mb-2">Por que esta compra é segura?</h3>
                    <ul className="space-y-2 text-sm text-green-800 dark:text-green-200">
                      <li>✓ Pagamento via Mercado Pago</li>
                      <li>✓ Intermediação da plataforma</li>
                      <li>✓ Garantia de entrega ou reembolso</li>
                      <li>✓ Suporte humano em caso de problema</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border/60 shadow-sm">
              <CardContent className="pt-6">
                <h3 className="font-bold text-foreground mb-3">O que acontece depois?</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 rounded-xl bg-muted/30 p-3">
                    <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-poke-blue text-xs font-bold text-white">1</div>
                    <div>
                      <p className="text-sm font-medium">Você confirma o pagamento</p>
                      <p className="text-xs text-muted-foreground">Em ambiente externo e protegido.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-xl bg-muted/30 p-3">
                    <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-poke-blue text-xs font-bold text-white">2</div>
                    <div>
                      <p className="text-sm font-medium">Seu pedido entra em acompanhamento</p>
                      <p className="text-xs text-muted-foreground">A equipe valida e coordena a entrega.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 rounded-xl bg-muted/30 p-3">
                    <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-poke-blue text-xs font-bold text-white">3</div>
                    <div>
                      <p className="text-sm font-medium">Você acompanha tudo em pedidos</p>
                      <p className="text-xs text-muted-foreground">Com status claros e suporte se necessário.</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="space-y-6">
          <Card className="sticky top-6 border border-poke-blue/20 shadow-lg shadow-poke-blue/5">
            <CardHeader className="space-y-3 bg-gradient-to-r from-poke-blue/10 to-poke-yellow/10">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <CreditCard className="h-5 w-5 text-poke-blue" />
                  Resumo do pedido
                </CardTitle>
                <Badge variant="outline" className="border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300">Seguro</Badge>
              </div>
              <p className="text-sm text-muted-foreground">Revise os valores antes de seguir para o Mercado Pago.</p>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="rounded-2xl border bg-muted/20 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{listing.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Pedido individual com acompanhamento da plataforma.</p>
                  </div>
                  <span className="text-sm font-semibold">1x</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">{formatCurrency(listing.price_suggested)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    Taxa de serviço
                    <span className="text-xs text-muted-foreground/70">({feeInfo?.totalFeePercentage || 0}%)</span>
                  </span>
                  <span className="font-medium text-orange-600">{feeInfo ? formatCurrency(feeInfo.totalFee) : 'Calculando...'}</span>
                </div>
                {feeInfo && (
                  <div className="rounded-xl border bg-muted/40 p-3 text-xs text-muted-foreground">
                    <div className="flex items-start gap-2">
                      <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                      <span>
                        Essa taxa cobre a segurança da transação, o processamento de pagamento e a intermediação operacional da entrega.
                      </span>
                    </div>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-2xl font-bold">
                  <span>Total</span>
                  <span className="text-poke-blue">{formatCurrency(totalValue)}</span>
                </div>
              </div>

              <Button
                onClick={handleCheckout}
                disabled={processing}
                className="w-full h-14 rounded-2xl bg-green-600 text-base font-semibold text-white hover:bg-green-700"
              >
                {processing ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Processando pagamento...
                  </>
                ) : (
                  <>
                    Seguir para o Mercado Pago
                    <ChevronRight className="h-5 w-5 ml-2" />
                  </>
                )}
              </Button>

              <div className="rounded-2xl border border-dashed bg-muted/20 p-4 text-sm">
                <div className="flex items-center gap-2 font-semibold text-foreground">
                  <Lock className="h-4 w-4 text-poke-blue" />
                  O pagamento acontece fora do app
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Você será redirecionado para o ambiente seguro do Mercado Pago para concluir a compra com PIX, cartão ou boleto.
                </p>
              </div>

              <div className="pt-4 border-t">
                <p className="text-xs text-muted-foreground text-center mb-3">Métodos aceitos</p>
                <div className="flex justify-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs">Cartão de Crédito</Badge>
                  <Badge variant="outline" className="text-xs">Cartão de Débito</Badge>
                  <Badge variant="outline" className="text-xs">PIX</Badge>
                  <Badge variant="outline" className="text-xs">Boleto</Badge>
                </div>
              </div>

              <div className="text-center pt-4 border-t">
                <p className="text-xs text-muted-foreground mb-2">Pagamento processado por</p>
                <div className="flex items-center justify-center gap-2">
                  <div className="bg-[#009EE3] text-white px-3 py-1 rounded font-bold text-sm">mercado pago</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-12 w-12 animate-spin text-poke-blue" />
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}
