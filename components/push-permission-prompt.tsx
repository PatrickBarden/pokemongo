'use client';

import { useState, useEffect } from 'react';
import { Bell, MessageCircle, ShoppingBag, DollarSign, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { 
  isNativePlatform, 
  isPushAvailable, 
  requestPushPermission,
  registerDeviceToken,
  getSavedPushToken
} from '@/lib/push-notifications';

interface PushPermissionPromptProps {
  userId?: string;
  onComplete?: () => void;
}

export function PushPermissionPrompt({ userId, onComplete }: PushPermissionPromptProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    checkShouldShow();
  }, []);

  const checkShouldShow = async () => {
    // Só mostrar em plataforma nativa
    if (!isNativePlatform() || !isPushAvailable()) {
      return;
    }

    // Verificar se já tem token (já deu permissão)
    const existingToken = getSavedPushToken();
    if (existingToken) {
      return;
    }

    // Verificar se já mostrou antes (localStorage)
    const hasShownBefore = localStorage.getItem('push_prompt_shown');
    if (hasShownBefore) {
      return;
    }

    // Aguardar um pouco antes de mostrar (melhor UX)
    setTimeout(() => {
      setIsVisible(true);
    }, 2000);
  };

  const handleAllow = async () => {
    setIsLoading(true);
    localStorage.setItem('push_prompt_shown', 'true');

    try {
      const granted = await requestPushPermission();
      
      if (granted && userId) {
        const token = getSavedPushToken();
        if (token) {
          await registerDeviceToken(userId, token);
        }
      }
    } catch (error) {
      console.error('Erro ao solicitar permissão:', error);
    } finally {
      setIsLoading(false);
      setIsVisible(false);
      onComplete?.();
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('push_prompt_shown', 'true');
    setIsVisible(false);
    onComplete?.();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-sm bg-card rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Header com gradiente */}
        <div className="bg-gradient-to-br from-poke-blue via-blue-500 to-indigo-600 p-6 text-white text-center relative">
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
          
          <div className="w-16 h-16 mx-auto mb-4 bg-white/20 rounded-2xl flex items-center justify-center">
            <Bell className="h-8 w-8 text-white" />
          </div>
          
          <h2 className="text-xl font-bold mb-1">Ative as Notificações</h2>
          <p className="text-white/80 text-sm">
            Fique por dentro de tudo que acontece!
          </p>
        </div>

        {/* Benefícios */}
        <div className="p-5 space-y-3">
          <p className="text-sm text-muted-foreground text-center mb-4">
            Você receberá alertas importantes sobre:
          </p>
          
          <div className="space-y-3">
            <BenefitItem 
              icon={ShoppingBag} 
              color="text-green-500 bg-green-500/10"
              title="Vendas e Pedidos"
              description="Saiba quando alguém comprar seu Pokémon"
            />
            <BenefitItem 
              icon={MessageCircle} 
              color="text-blue-500 bg-blue-500/10"
              title="Mensagens"
              description="Responda rápido aos interessados"
            />
            <BenefitItem 
              icon={DollarSign} 
              color="text-amber-500 bg-amber-500/10"
              title="Pagamentos"
              description="Acompanhe seus recebimentos"
            />
            <BenefitItem 
              icon={Sparkles} 
              color="text-purple-500 bg-purple-500/10"
              title="Ofertas Especiais"
              description="Promoções exclusivas para você"
            />
          </div>
        </div>

        {/* Botões */}
        <div className="p-5 pt-2 space-y-2">
          <Button 
            onClick={handleAllow}
            disabled={isLoading}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-poke-blue to-blue-600 hover:from-poke-blue/90 hover:to-blue-700 text-white font-semibold shadow-lg"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Bell className="h-5 w-5 mr-2" />
                Permitir Notificações
              </>
            )}
          </Button>
          
          <Button 
            variant="ghost" 
            onClick={handleDismiss}
            className="w-full h-10 text-muted-foreground hover:text-foreground"
          >
            Agora não
          </Button>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5">
          <p className="text-[10px] text-center text-muted-foreground">
            Você pode desativar a qualquer momento nas configurações do app
          </p>
        </div>
      </div>
    </div>
  );
}

function BenefitItem({ 
  icon: Icon, 
  color, 
  title, 
  description 
}: { 
  icon: any; 
  color: string; 
  title: string; 
  description: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className={cn("p-2 rounded-xl shrink-0", color)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground truncate">{description}</p>
      </div>
    </div>
  );
}
