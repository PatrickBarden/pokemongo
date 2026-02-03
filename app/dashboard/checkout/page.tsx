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
  Info
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
          console.log('Erro ao buscar imagem:', error);
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

      // Redirecionar para checkout do Mercado Pago
      // Usar sandboxInitPoint para credenciais TEST-xxx
      const checkoutUrl = sandboxInitPoint || initPoint;
      console.log('🔗 Checkout URLs:', { sandboxInitPoint, initPoint, using: checkoutUrl });
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/market">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Checkout</h1>
          <p className="text-muted-foreground text-sm">Finalize sua compra com segurança</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Informações do Produto */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card do Pokémon */}
          <Card className="border-2 border-poke-blue/20">
            <CardHeader className="bg-gradient-to-r from-poke-blue/10 to-poke-yellow/10">
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-poke-blue" />
                Detalhes do Pokémon
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                {/* Imagem */}
                <div className="flex-shrink-0 mx-auto sm:mx-0">
                  <div className="w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-br from-poke-blue/10 to-poke-yellow/10 rounded-xl flex items-center justify-center border-2 border-poke-blue/20 overflow-hidden">
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

                {/* Informações */}
                <div className="flex-1 text-center sm:text-left">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-3 gap-2">
                    <div>
                      <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-1">
                        {listing.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Vendedor: <span className="font-medium text-poke-blue">{listing.owner?.display_name}</span>
                      </p>
                    </div>
                    <Badge className="bg-poke-yellow text-poke-dark border-0 mx-auto sm:mx-0">
                      {translateType(listing.category)}
                    </Badge>
                  </div>

                  <p className="text-muted-foreground mb-4">
                    {listing.description}
                  </p>

                  {/* Variantes */}
                  {(listing.is_shiny || listing.has_costume || listing.has_background || listing.is_purified || listing.is_dynamax || listing.is_gigantamax) && (
                    <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                      {listing.is_shiny && (
                        <Badge className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-white border-0">
                          <Sparkles className="h-3 w-3 mr-1" />
                          Brilhante
                        </Badge>
                      )}
                      {listing.has_costume && (
                        <Badge className="bg-gradient-to-r from-purple-500 to-purple-700 text-white border-0">
                          <Shirt className="h-3 w-3 mr-1" />
                          Com Traje
                        </Badge>
                      )}
                      {listing.has_background && (
                        <Badge className="bg-gradient-to-r from-blue-500 to-blue-700 text-white border-0">
                          <ImageIcon className="h-3 w-3 mr-1" />
                          Com Fundo
                        </Badge>
                      )}
                      {listing.is_purified && (
                        <Badge className="bg-gradient-to-r from-pink-500 to-pink-700 text-white border-0">
                          <Heart className="h-3 w-3 mr-1" />
                          Purificado
                        </Badge>
                      )}
                      {listing.is_dynamax && (
                        <Badge className="bg-gradient-to-r from-red-500 to-red-700 text-white border-0">
                          Dinamax
                        </Badge>
                      )}
                      {listing.is_gigantamax && (
                        <Badge className="bg-gradient-to-r from-orange-500 to-red-600 text-white border-0">
                          Gigamax
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Informações de Segurança */}
          <Card className="border-2 border-green-200 dark:border-green-900 bg-green-50/50 dark:bg-green-950/20">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <Shield className="h-12 w-12 text-green-600 dark:text-green-400 flex-shrink-0 mx-auto sm:mx-0" />
                <div>
                  <h3 className="font-bold text-green-900 dark:text-green-100 mb-2 flex items-center justify-center sm:justify-start gap-2">
                    <CheckCircle2 className="h-5 w-5" />
                    Compra 100% Segura
                  </h3>
                  <ul className="space-y-1 text-sm text-green-800 dark:text-green-200">
                    <li>✓ Pagamento processado pelo Mercado Pago</li>
                    <li>✓ Nossa equipe intermediará a troca no Pokémon GO</li>
                    <li>✓ Garantia de entrega ou reembolso total</li>
                    <li>✓ Suporte disponível para qualquer dúvida</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Resumo do Pedido */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6 border-2 border-poke-blue/20">
            <CardHeader className="bg-gradient-to-r from-poke-blue/10 to-poke-yellow/10">
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-poke-blue" />
                Resumo do Pedido
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {/* Valores */}
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">{formatCurrency(listing.price_suggested)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    Taxa de serviço
                    <span className="text-xs text-muted-foreground/70">
                      ({feeInfo?.totalFeePercentage || 0}%)
                    </span>
                  </span>
                  <span className="font-medium text-orange-600">
                    {feeInfo ? formatCurrency(feeInfo.totalFee) : 'Calculando...'}
                  </span>
                </div>
                {feeInfo && (
                  <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                    <div className="flex items-start gap-1">
                      <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      <span>
                        A taxa de {feeInfo.totalFeePercentage}% é cobrada para garantir a segurança da transação e intermediação da troca.
                      </span>
                    </div>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-xl font-bold">
                  <span>Total</span>
                  <span className="text-poke-blue">
                    {feeInfo ? formatCurrency(listing.price_suggested + feeInfo.totalFee) : formatCurrency(listing.price_suggested)}
                  </span>
                </div>
              </div>

              {/* Botão de Pagamento */}
              <Button
                onClick={handleCheckout}
                disabled={processing}
                className="w-full bg-green-600 hover:bg-green-700 text-white h-14 text-lg font-semibold"
              >
                {processing ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-5 w-5 mr-2" />
                    Ir para Pagamento
                  </>
                )}
              </Button>

              {/* Métodos de Pagamento */}
              <div className="pt-4 border-t">
                <p className="text-xs text-muted-foreground text-center mb-3">
                  Métodos de pagamento aceitos:
                </p>
                <div className="flex justify-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs">Cartão de Crédito</Badge>
                  <Badge variant="outline" className="text-xs">Cartão de Débito</Badge>
                  <Badge variant="outline" className="text-xs">PIX</Badge>
                  <Badge variant="outline" className="text-xs">Boleto</Badge>
                </div>
              </div>

              {/* Logo Mercado Pago */}
              <div className="text-center pt-4 border-t">
                <p className="text-xs text-muted-foreground mb-2">
                  Pagamento processado por
                </p>
                <div className="flex items-center justify-center gap-2">
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
