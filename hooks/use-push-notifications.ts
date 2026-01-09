'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  isNativePlatform, 
  isPushAvailable, 
  requestPushPermission, 
  registerDeviceToken, 
  removeDeviceToken,
  setupPushListeners,
  removePushListeners,
  getSavedPushToken,
  clearSavedPushToken
} from '@/lib/push-notifications';
import { toast } from 'sonner';

interface UsePushNotificationsOptions {
  userId?: string;
  enabled?: boolean;
  onNotificationReceived?: (notification: any) => void;
}

export function usePushNotifications(options: UsePushNotificationsOptions = {}) {
  const { userId, enabled = true, onNotificationReceived } = options;
  const router = useRouter();

  // Inicializar push notifications
  const initializePush = useCallback(async () => {
    if (!enabled || !isNativePlatform() || !isPushAvailable()) {
      return;
    }

    // Configurar listeners
    setupPushListeners(
      // Notificação recebida em foreground
      (notification) => {
        console.log('Notificação recebida:', notification);
        
        // Mostrar toast quando recebe notificação em foreground
        toast(notification.title || 'Nova notificação', {
          description: notification.body,
          action: notification.data?.link ? {
            label: 'Ver',
            onClick: () => router.push(notification.data.link)
          } : undefined
        });
        
        onNotificationReceived?.(notification);
      },
      // Usuário clicou na notificação
      (action) => {
        console.log('Ação na notificação:', action);
        
        // Navegar para a tela específica se houver link
        const data = action.notification.data;
        if (data?.link) {
          router.push(data.link);
        } else if (data?.screen) {
          router.push(`/dashboard/${data.screen}`);
        }
      }
    );

    // NÃO solicitar permissão automaticamente - deixar o PushPermissionPrompt fazer isso
    // Apenas registrar token se já tiver permissão
    const existingToken = getSavedPushToken();
    if (existingToken && userId) {
      await registerDeviceToken(userId, existingToken);
    }
  }, [enabled, userId, router, onNotificationReceived]);

  // Registrar token quando usuário logar
  const registerToken = useCallback(async (newUserId: string) => {
    if (!isNativePlatform() || !isPushAvailable()) return false;
    
    const token = getSavedPushToken();
    if (!token) {
      // Tentar solicitar permissão novamente
      const hasPermission = await requestPushPermission();
      if (!hasPermission) return false;
      
      const newToken = getSavedPushToken();
      if (!newToken) return false;
      
      return registerDeviceToken(newUserId, newToken);
    }
    
    return registerDeviceToken(newUserId, token);
  }, []);

  // Remover token quando usuário deslogar
  const unregisterToken = useCallback(async (logoutUserId: string) => {
    if (!isNativePlatform()) return;
    
    await removeDeviceToken(logoutUserId);
    clearSavedPushToken();
  }, []);

  // Inicializar ao montar componente
  useEffect(() => {
    initializePush();
    
    return () => {
      removePushListeners();
    };
  }, [initializePush]);

  // Registrar token quando userId mudar
  useEffect(() => {
    if (userId && isNativePlatform() && isPushAvailable()) {
      const token = getSavedPushToken();
      if (token) {
        registerDeviceToken(userId, token);
      }
    }
  }, [userId]);

  return {
    isAvailable: isNativePlatform() && isPushAvailable(),
    registerToken,
    unregisterToken,
    requestPermission: requestPushPermission
  };
}
