'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/contexts/CartContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/lib/format';
import { ShoppingCart, Trash2, Package, AlertCircle, CreditCard, Sparkles, Shirt, Image as ImageIcon, Heart, Loader2 } from 'lucide-react';
import { translateType } from '@/lib/translations';
import { supabaseClient } from '@/lib/supabase-client';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function CartPage() {
  const router = useRouter();
  const { items, itemCount, loading, removeFromCart, clearCart } = useCart();
  const { toast } = useToast();
  const [checkingOut, setCheckingOut] = useState(false);

  const totalValue = items.reduce((sum, item) => {
    return sum + (item.listing?.price_suggested || 0);
  }, 0);

  const handleRemoveItem = async (itemId: string) => {
    await removeFromCart(itemId);
  };

  const handleClearCart = async () => {
    if (confirm('Tem certeza que deseja limpar todo o carrinho?')) {
      await clearCart();
    }
  };

  const handleCheckout = async () => {
    if (items.length === 0) return;

    setCheckingOut(true);

    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) {
        toast({
          title: "Erro",
          description: "Você precisa estar logado para finalizar a compra.",
          variant: "destructive",
        });
        return;
      }

      // Gerar número do pedido
      const { data: orderNumberData, error: orderNumberError } = await (supabaseClient as any)
        .rpc('generate_order_number');

      if (orderNumberError) throw orderNumberError;

      // Criar pedido
      const { data: orderData, error: orderError } = await (supabaseClient as any)
        .from('orders')
        .insert({
          order_number: orderNumberData,
          buyer_id: user.id,
          status: 'pending',
          total_amount: totalValue,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Criar itens do pedido
      const orderItems = items.map(item => ({
        order_id: orderData.id,
        listing_id: item.listing_id,
        seller_id: item.listing.owner_id,
        pokemon_name: item.listing.title,
        pokemon_photo_url: item.listing.photo_url,
        price: item.listing.price_suggested,
        quantity: 1,
      }));

      const { error: itemsError } = await (supabaseClient as any)
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Criar preferência de pagamento no Mercado Pago
      const response = await fetch('/api/mercadopago/create-preference', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: orderData.id,
          userId: user.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao criar preferência de pagamento');
      }

      const { sandboxInitPoint, initPoint } = await response.json();

      // Limpar carrinho
      await clearCart();

      toast({
        title: "Redirecionando para pagamento... 💳",
        description: `Pedido ${orderNumberData} criado. Você será redirecionado para o checkout.`,
      });

      // Redirecionar para checkout do Mercado Pago
      // Usar sandboxInitPoint para credenciais TEST-xxx
      const checkoutUrl = sandboxInitPoint || initPoint;
      console.log('🔗 Checkout URLs:', { sandboxInitPoint, initPoint, using: checkoutUrl });
      window.location.href = checkoutUrl;

    } catch (error: any) {
      console.error('Erro ao finalizar compra:', error);
      toast({
        title: "Erro ao finalizar compra",
        description: error.message || "Tente novamente mais tarde.",
        variant: "destructive",
      });
    } finally {
      setCheckingOut(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-poke-blue"></div>
      </div>
    );
  }

  if (itemCount === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Carrinho</h1>
          <p className="text-muted-foreground mt-1">
            Seus Pokémon de interesse
          </p>
        </div>

        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <ShoppingCart className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Seu carrinho está vazio
            </h3>
            <p className="text-muted-foreground mb-6 text-center max-w-md">
              Explore o mercado e adicione Pokémon ao seu carrinho para organizar suas compras
            </p>
            <Link href="/dashboard/market">
              <Button className="bg-poke-blue hover:bg-poke-blue/90">
                <ShoppingCart className="h-4 w-4 mr-2" />
                Ir para o Mercado
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Carrinho</h1>
          <p className="text-muted-foreground mt-1">
            {itemCount} {itemCount === 1 ? 'Pokémon' : 'Pokémon'} no carrinho
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleClearCart}
          className="border-red-500 text-red-500 hover:bg-red-500/10"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Limpar Carrinho
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Lista de Itens */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => {
            const listing = item.listing;
            if (!listing) return null;

            // PRIORIDADE 1: Foto real do usuário
            const realPhoto = listing.photo_url;
            // PRIORIDADE 2: Sprite da PokeAPI
            const apiSprite = listing.pokemon_data?.sprites?.other?.['official-artwork']?.front_default
              || listing.pokemon_data?.sprites?.front_default;

            const imageUrl = realPhoto || apiSprite;

            return (
              <Card key={item.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    {/* Imagem do Pokémon */}
                    <div className="flex-shrink-0">
                      <div className="w-20 h-20 bg-card rounded-lg flex items-center justify-center border-2 border-poke-blue/20 overflow-hidden relative">
                        {imageUrl ? (
                          <>
                            <img
                              src={imageUrl}
                              alt={listing.title}
                              className={`${realPhoto ? 'w-full h-full object-cover' : 'w-16 h-16 object-contain'}`}
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                                if (fallback) fallback.style.display = 'flex';
                              }}
                            />
                            <div className="hidden items-center justify-center w-full h-full">
                              <Package className="w-10 h-10 text-poke-blue/40" />
                            </div>
                            {realPhoto && (
                              <div className="absolute bottom-0 right-0 bg-green-500 text-white text-[8px] px-1 rounded-tl-md font-bold">
                                ✓
                              </div>
                            )}
                          </>
                        ) : (
                          <Package className="w-10 h-10 text-poke-blue/40" />
                        )}
                      </div>
                    </div>

                    {/* Informações */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <h3 className="font-bold text-lg text-foreground line-clamp-1">
                            {listing.title}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Vendedor: {listing.owner?.display_name}
                          </p>
                        </div>
                        <Badge className="bg-poke-yellow text-foreground border-0">
                          {translateType(listing.category)}
                        </Badge>
                      </div>

                      {/* Variantes */}
                      {(listing.is_shiny || listing.has_costume || listing.has_background || listing.is_purified || listing.is_dynamax || listing.is_gigantamax) && (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {listing.is_shiny && (
                            <Badge className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-white border-0 text-xs">
                              <Sparkles className="h-3 w-3 mr-1" />
                              Brilhante
                            </Badge>
                          )}
                          {listing.has_costume && (
                            <Badge className="bg-gradient-to-r from-purple-500 to-purple-700 text-white border-0 text-xs">
                              <Shirt className="h-3 w-3 mr-1" />
                              Com Traje
                            </Badge>
                          )}
                          {listing.has_background && (
                            <Badge className="bg-gradient-to-r from-blue-500 to-blue-700 text-white border-0 text-xs">
                              <ImageIcon className="h-3 w-3 mr-1" />
                              Com Fundo
                            </Badge>
                          )}
                          {listing.is_purified && (
                            <Badge className="bg-gradient-to-r from-pink-500 to-pink-700 text-white border-0 text-xs">
                              <Heart className="h-3 w-3 mr-1" />
                              Purificado
                            </Badge>
                          )}
                          {listing.is_dynamax && (
                            <Badge className="bg-gradient-to-r from-red-500 to-red-700 text-white border-0 text-xs">
                              Dinamax
                            </Badge>
                          )}
                          {listing.is_gigantamax && (
                            <Badge className="bg-gradient-to-r from-orange-500 to-red-600 text-white border-0 text-xs">
                              Gigamax
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Preço e Ações */}
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold text-poke-blue">
                          {formatCurrency(listing.price_suggested)}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveItem(item.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Remover
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Resumo do Carrinho */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-poke-blue" />
                Resumo do Pedido
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Itens */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Itens ({itemCount})</span>
                  <span className="font-medium">{formatCurrency(totalValue)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-poke-blue">{formatCurrency(totalValue)}</span>
                </div>
              </div>

              {/* Aviso */}
              <div className="bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/20 rounded-lg p-3 flex gap-2">
                <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-blue-800 dark:text-blue-200">
                  <p className="font-semibold mb-1">💡 Transação Digital Segura</p>
                  <p>Nossa equipe intermediará a troca no Pokémon GO após confirmação do pagamento.</p>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="space-y-2">
                <Button
                  onClick={handleCheckout}
                  disabled={checkingOut}
                  className="w-full bg-green-600 hover:bg-green-700 text-white h-12 text-base"
                >
                  {checkingOut ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-5 w-5 mr-2" />
                      Finalizar Compra
                    </>
                  )}
                </Button>
                <Link href="/dashboard/market" className="block">
                  <Button variant="outline" className="w-full" disabled={checkingOut}>
                    Continuar Comprando
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
