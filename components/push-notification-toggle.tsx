'use client';

import { useState, useEffect } from 'react';
import { Bell, BellOff, Smartphone, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { 
  isNativePlatform, 
  isPushAvailable, 
  requestPushPermission,
  registerDeviceToken,
  removeDeviceToken,
  getSavedPushToken
} from '@/lib/push-notifications';

interface PushNotificationToggleProps {
  userId: string;
  variant?: 'card' | 'inline';
  className?: string;
}

export function PushNotificationToggle({ 
  userId, 
  variant = 'card',
  className 
}: PushNotificationToggleProps) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const [platform, setPlatform] = useState<string>('web');

  useEffect(() => {
    checkStatus();
  }, [userId]);

  const checkStatus = async () => {
    const native = isNativePlatform();
    const available = isPushAvailable();
    
    setIsAvailable(native && available);
    
    if (native) {
      // Detectar plataforma
      const { Capacitor } = await import('@capacitor/core');
      setPlatform(Capacitor.getPlatform());
    }

    // Verificar se já tem token salvo
    const token = getSavedPushToken();
    setIsEnabled(!!token);
  };

  const handleToggle = async () => {
    if (!isAvailable) {
      toast.info('Notificações push só funcionam no app mobile', {
        description: 'Baixe o app para receber notificações no celular.'
      });
      return;
    }

    setIsLoading(true);

    try {
      if (!isEnabled) {
        // Ativar notificações
        const granted = await requestPushPermission();
        
        if (granted) {
          const token = getSavedPushToken();
          if (token && userId) {
            await registerDeviceToken(userId, token);
            setIsEnabled(true);
            toast.success('Notificações ativadas!', {
              description: 'Você receberá alertas de pedidos, mensagens e promoções.'
            });
          }
        } else {
          toast.error('Permissão negada', {
            description: 'Você pode ativar nas configurações do dispositivo.'
          });
        }
      } else {
        // Desativar notificações
        await removeDeviceToken(userId);
        setIsEnabled(false);
        toast.success('Notificações desativadas', {
          description: 'Você não receberá mais alertas push.'
        });
      }
    } catch (error) {
      console.error('Erro ao alternar notificações:', error);
      toast.error('Erro ao configurar notificações');
    } finally {
      setIsLoading(false);
    }
  };

  // Variante inline (para usar em listas de configurações)
  if (variant === 'inline') {
    return (
      <div className={cn("flex items-center justify-between py-3", className)}>
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-2 rounded-lg",
            isEnabled ? "bg-green-500/20" : "bg-muted"
          )}>
            {isEnabled ? (
              <Bell className="h-5 w-5 text-green-500" />
            ) : (
              <BellOff className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
          <div>
            <p className="font-medium text-foreground">Notificações Push</p>
            <p className="text-sm text-muted-foreground">
              {isAvailable 
                ? (isEnabled ? 'Ativadas' : 'Desativadas')
                : 'Disponível apenas no app'
              }
            </p>
          </div>
        </div>
        <Switch
          checked={isEnabled}
          onCheckedChange={handleToggle}
          disabled={isLoading || !isAvailable}
        />
      </div>
    );
  }

  // Variante card (para destaque)
  return (
    <Card className={cn("bg-card border-border", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2.5 rounded-xl",
              isEnabled ? "bg-green-500/20" : "bg-muted"
            )}>
              {isEnabled ? (
                <Bell className="h-6 w-6 text-green-500" />
              ) : (
                <BellOff className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div>
              <CardTitle className="text-lg">Notificações Push</CardTitle>
              <CardDescription>
                Receba alertas no seu dispositivo
              </CardDescription>
            </div>
          </div>
          {isEnabled && (
            <Badge className="bg-green-500/20 text-green-500 border-0">
              <Check className="h-3 w-3 mr-1" />
              Ativo
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status do dispositivo */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Smartphone className="h-4 w-4" />
          <span>
            {isAvailable 
              ? `Dispositivo: ${platform === 'android' ? 'Android' : platform === 'ios' ? 'iOS' : 'Web'}`
              : 'Acesse pelo app mobile para ativar'
            }
          </span>
        </div>

        {/* O que você recebe */}
        {isAvailable && (
          <div className="p-3 bg-muted/50 rounded-lg space-y-2">
            <p className="text-sm font-medium text-foreground">Você receberá alertas de:</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-poke-blue rounded-full" />
                Novos pedidos e vendas
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-poke-blue rounded-full" />
                Mensagens de compradores
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-poke-blue rounded-full" />
                Atualizações de pagamento
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-poke-blue rounded-full" />
                Promoções e novidades
              </li>
            </ul>
          </div>
        )}

        {/* Botão de ação */}
        <Button
          onClick={handleToggle}
          disabled={isLoading || !isAvailable}
          variant={isEnabled ? "outline" : "default"}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Configurando...
            </>
          ) : isEnabled ? (
            <>
              <BellOff className="h-4 w-4 mr-2" />
              Desativar Notificações
            </>
          ) : (
            <>
              <Bell className="h-4 w-4 mr-2" />
              Ativar Notificações
            </>
          )}
        </Button>

        {!isAvailable && (
          <p className="text-xs text-center text-muted-foreground">
            💡 Baixe o app na Play Store para receber notificações
          </p>
        )}
      </CardContent>
    </Card>
  );
}
