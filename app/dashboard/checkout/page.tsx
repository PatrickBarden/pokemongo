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
  Store,
  Lock,
  ChevronRight,
  ChevronLeft,
  ShieldCheck
} from 'lucide-react';
import { translateType } from '@/lib/translations';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { calculateFee, FeeCalculation } from '@/server/actions/platform-fees';
import { cn } from '@/lib/utils';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { CouponInput } from '@/components/coupon-input';
import { TicketPercent } from 'lucide-react';

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
    avatar_url?: string;
  };
}

const STEPS = [
  { label: 'Segurança', icon: Shield },
  { label: 'Item', icon: Package },
  { label: 'Pagamento', icon: CreditCard },
];

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [feeInfo, setFeeInfo] = useState<FeeCalculation | null>(null);
  const [step, setStep] = useState(0);
  const [couponId, setCouponId] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);

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

      const { data: listingData, error } = await (supabaseClient as any)
        .from('listings')
        .select(`
          *,
          owner:owner_id(
            id,
            display_name,
            email,
            avatar_url
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

      if (listingData.owner_id === user.id) {
        toast({
          title: "Ação não permitida",
          description: "Você não pode comprar seus próprios Pokémon.",
          variant: "destructive",
        });
        router.push('/dashboard/market');
        return;
      }

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
      const discountedBase = Math.max(0, listing.price_suggested - couponDiscount);
      const totalWithFee = discountedBase + feeInfo.totalFee;

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
            price: discountedBase,
            quantity: 1,
          }],
          total_amount: totalWithFee,
          platform_fee: feeInfo.totalFee,
          fee_percentage: feeInfo.totalFeePercentage,
          couponCode: couponCode || undefined,
          couponId: couponId || undefined,
          couponDiscount: couponDiscount || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao criar preferência de pagamento');
      }

      const { initPoint, orderNumber } = await response.json();

      toast({
        title: "Redirecionando para pagamento... 💳",
        description: `Pedido ${orderNumber} criado com sucesso!`,
      });

      if (Capacitor.isNativePlatform()) {
        await Browser.open({ url: initPoint });
      } else {
        window.location.href = initPoint;
      }

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
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-semibold mb-2">Item não encontrado</h3>
        <p className="text-muted-foreground mb-4 text-center text-sm">
          O Pokémon que você tentou comprar não está mais disponível.
        </p>
        <Link href="/dashboard/market">
          <Button>Voltar ao Mercado</Button>
        </Link>
      </div>
    );
  }

  const imageUrl = listing.photo_url ||
    listing.pokemon_data?.sprites?.other?.['official-artwork']?.front_default ||
    listing.pokemon_data?.sprites?.front_default;

  const basePrice = listing.price_suggested;
  const discountedPrice = Math.max(0, basePrice - couponDiscount);
  const totalValue = feeInfo ? discountedPrice + feeInfo.totalFee : discountedPrice;

  const goNext = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const goBack = () => {
    if (step === 0) {
      router.push('/dashboard/market');
    } else {
      setStep((s) => s - 1);
    }
  };

  // ── Step 1: Segurança & Processo ──
  const StepSecurity = () => (
    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="rounded-2xl bg-gradient-to-br from-poke-blue via-sky-600 to-indigo-700 text-white p-5 shadow-lg">
        <Badge className="border-0 bg-white/15 text-white hover:bg-white/15 mb-3">Pagamento protegido</Badge>
        <h2 className="text-xl font-bold leading-tight mb-2">
          Você está a poucos passos de garantir seu Pokémon.
        </h2>
        <p className="text-sm text-white/85">
          O pagamento é processado pelo Mercado Pago e a nossa equipe acompanha a mediação da entrega.
        </p>

        <div className="mt-4 space-y-2">
          {[
            { icon: CreditCard, title: '1. Pagamento', desc: 'Você conclui em ambiente seguro.' },
            { icon: Shield, title: '2. Mediação', desc: 'A plataforma acompanha o processo.' },
            { icon: CheckCircle2, title: '3. Entrega', desc: 'Pedido concluído com suporte.' },
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

      <div className="rounded-2xl border border-green-500/20 bg-green-50/60 dark:bg-green-950/20 p-4">
        <div className="flex gap-3">
          <ShieldCheck className="h-8 w-8 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-green-900 dark:text-green-100 text-sm mb-1.5">Por que esta compra é segura?</h3>
            <ul className="space-y-1.5 text-xs text-green-800 dark:text-green-200">
              <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 shrink-0" /> Pagamento via Mercado Pago</li>
              <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 shrink-0" /> Intermediação da plataforma</li>
              <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 shrink-0" /> Garantia de entrega ou reembolso</li>
              <li className="flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 shrink-0" /> Suporte humano em caso de problema</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );

  // ── Step 2: Item sendo comprado ──
  const StepItem = () => (
    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="rounded-2xl border bg-card p-4 shadow-sm">
        <div className="flex gap-4">
          <div className="w-24 h-24 rounded-xl border-2 border-poke-blue/15 bg-gradient-to-br from-poke-blue/10 to-poke-yellow/10 overflow-hidden flex items-center justify-center shrink-0">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={listing.title}
                className={`w-full h-full ${listing.photo_url ? 'object-cover' : 'object-contain p-3'}`}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <Package className="w-10 h-10 text-poke-blue/40" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-lg font-bold text-foreground leading-tight">{listing.title}</h3>
              <Badge className="shrink-0 bg-poke-yellow text-poke-dark border-0 text-xs">{translateType(listing.category)}</Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{listing.description}</p>
            <p className="mt-2 text-xl font-black text-poke-blue">{formatCurrency(listing.price_suggested)}</p>
          </div>
        </div>

        {(listing.is_shiny || listing.has_costume || listing.has_background || listing.is_purified || listing.is_dynamax || listing.is_gigantamax) && (
          <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t">
            {listing.is_shiny && (
              <Badge className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-white border-0 text-xs">
                <Sparkles className="h-3 w-3 mr-1" /> Brilhante
              </Badge>
            )}
            {listing.has_costume && (
              <Badge className="bg-gradient-to-r from-purple-500 to-purple-700 text-white border-0 text-xs">
                <Shirt className="h-3 w-3 mr-1" /> Com traje
              </Badge>
            )}
            {listing.has_background && (
              <Badge className="bg-gradient-to-r from-blue-500 to-blue-700 text-white border-0 text-xs">
                <ImageIcon className="h-3 w-3 mr-1" /> Com fundo
              </Badge>
            )}
            {listing.is_purified && (
              <Badge className="bg-gradient-to-r from-pink-500 to-pink-700 text-white border-0 text-xs">
                <Heart className="h-3 w-3 mr-1" /> Purificado
              </Badge>
            )}
            {listing.is_dynamax && <Badge className="bg-gradient-to-r from-red-500 to-red-700 text-white border-0 text-xs">Dinamax</Badge>}
            {listing.is_gigantamax && <Badge className="bg-gradient-to-r from-orange-500 to-red-600 text-white border-0 text-xs">Gigamax</Badge>}
          </div>
        )}
      </div>

      <div className="rounded-2xl border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <Store className="h-5 w-5 text-poke-blue" />
          <span className="font-semibold text-sm">Vendedor</span>
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-muted/40 p-3">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-poke-blue to-poke-blue/80 flex items-center justify-center text-white font-bold shrink-0">
            {listing.owner?.avatar_url ? (
              <img src={listing.owner.avatar_url} alt={listing.owner.display_name} className="w-full h-full object-cover" />
            ) : (
              listing.owner?.display_name?.charAt(0).toUpperCase() || 'V'
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{listing.owner?.display_name}</p>
            <p className="text-xs text-muted-foreground">Vendedor verificado na plataforma</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border bg-card p-4 shadow-sm">
        <h4 className="font-semibold text-sm mb-2">O que acontece depois?</h4>
        <div className="space-y-2">
          {[
            'Você confirma o pagamento em ambiente protegido.',
            'Seu pedido entra em acompanhamento pela equipe.',
            'Você acompanha tudo na aba de pedidos.',
          ].map((text, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-poke-blue text-[10px] font-bold text-white shrink-0 mt-0.5">{i + 1}</div>
              <p className="text-xs text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ── Step 3: Resumo & Pagamento ──
  const StepPayment = () => (
    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="rounded-2xl border border-poke-blue/20 bg-gradient-to-b from-poke-blue/5 to-transparent p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-base flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-poke-blue" />
            Resumo do pedido
          </h3>
          <Badge variant="outline" className="border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300 text-xs">Seguro</Badge>
        </div>

        <div className="flex items-center gap-3 rounded-xl bg-card border p-3 mb-4">
          <div className="w-12 h-12 rounded-lg border bg-muted/30 overflow-hidden flex items-center justify-center shrink-0">
            {imageUrl ? (
              <img src={imageUrl} alt={listing.title} className={`w-full h-full ${listing.photo_url ? 'object-cover' : 'object-contain p-2'}`} />
            ) : (
              <Package className="w-6 h-6 text-poke-blue/40" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{listing.title}</p>
            <p className="text-xs text-muted-foreground">Vendedor: {listing.owner?.display_name}</p>
          </div>
          <span className="text-sm font-semibold shrink-0">1x</span>
        </div>

        <div className="space-y-2.5">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium">{formatCurrency(basePrice)}</span>
          </div>
          {couponDiscount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-emerald-600 flex items-center gap-1">
                <TicketPercent className="h-3.5 w-3.5" />
                Cupom {couponCode}
              </span>
              <span className="font-medium text-emerald-600">- {formatCurrency(couponDiscount)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1">
              Taxa de serviço
              <span className="text-[10px] text-muted-foreground/60">({feeInfo?.totalFeePercentage || 0}%)</span>
            </span>
            <span className="font-medium text-orange-600">{feeInfo ? formatCurrency(feeInfo.totalFee) : '...'}</span>
          </div>
          {feeInfo && (
            <div className="rounded-lg bg-muted/40 p-2.5 text-[11px] text-muted-foreground flex items-start gap-1.5">
              <Info className="h-3 w-3 mt-0.5 shrink-0" />
              <span>Cobre segurança da transação, processamento e intermediação da entrega.</span>
            </div>
          )}
          <Separator />
          {/* Cupom input */}
          <div className="pt-1">
            <CouponInput
              userId={currentUserId}
              orderAmount={basePrice}
              appliedCode={couponCode}
              appliedDiscount={couponDiscount || undefined}
              disabled={processing}
              onApply={(id, code, discount) => {
                setCouponId(id);
                setCouponCode(code);
                setCouponDiscount(discount);
              }}
              onRemove={() => {
                setCouponId('');
                setCouponCode('');
                setCouponDiscount(0);
              }}
            />
          </div>
          <Separator />
          <div className="flex justify-between items-center">
            <span className="text-lg font-bold">Total</span>
            <div className="text-right">
              {couponDiscount > 0 && (
                <p className="text-xs line-through text-muted-foreground">{formatCurrency(basePrice + (feeInfo?.totalFee || 0))}</p>
              )}
              <span className="text-2xl font-black text-poke-blue">{formatCurrency(totalValue)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-dashed bg-card p-4">
        <div className="flex items-center gap-2 font-semibold text-sm text-foreground mb-2">
          <Lock className="h-4 w-4 text-poke-blue" />
          O pagamento acontece fora do app
        </div>
        <p className="text-xs text-muted-foreground">
          Você será redirecionado para o ambiente seguro do Mercado Pago para concluir a compra com PIX, cartão ou boleto.
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
          <h1 className="text-lg font-bold text-foreground">Checkout seguro</h1>
          <p className="text-xs text-muted-foreground">Etapa {step + 1} de {STEPS.length}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-muted-foreground">Total</p>
          {couponDiscount > 0 && <p className="text-[10px] line-through text-muted-foreground">{formatCurrency(basePrice + (feeInfo?.totalFee || 0))}</p>}
          <p className="text-base font-bold text-poke-blue">{formatCurrency(totalValue)}</p>
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
                isActive && "bg-poke-blue text-white shadow-md",
                isDone && "bg-poke-blue/15 text-poke-blue",
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
        {step === 1 && <StepItem />}
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
            <Button onClick={goNext} className="flex-1 h-12 rounded-xl bg-poke-blue hover:bg-poke-blue/90 text-white font-semibold shadow-md">
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
              className="flex-1 h-12 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold shadow-md"
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
