'use client';

import { Capacitor } from '@capacitor/core';
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { supabaseClient } from './supabase-client';

// Tipos
export interface DeviceToken {
  id: string;
  user_id: string;
  token: string;
  platform: 'android' | 'ios' | 'web';
  device_name?: string;
  device_model?: string;
  app_version?: string;
  is_active: boolean;
  created_at: string;
}

// Verificar se está em plataforma nativa
export const isNativePlatform = () => {
  return Capacitor.isNativePlatform();
};

// Verificar se Push Notifications está disponível
export const isPushAvailable = () => {
  return Capacitor.isPluginAvailable('PushNotifications');
};

// Solicitar permissão para notificações
export const requestPushPermission = async (): Promise<boolean> => {
  if (!isPushAvailable()) {
    console.log('Push Notifications não disponível nesta plataforma');
    return false;
  }

  try {
    const result = await PushNotifications.requestPermissions();

    if (result.receive === 'granted') {
      // Registrar para receber notificações
      await PushNotifications.register();
      return true;
    }

    return false;
  } catch (error) {
    console.error('Erro ao solicitar permissão de push:', error);
    return false;
  }
};

// Registrar token do dispositivo no servidor
export const registerDeviceToken = async (
  userId: string,
  token: string
): Promise<boolean> => {
  try {
    const platform = Capacitor.getPlatform() as 'android' | 'ios' | 'web';

    // Upsert - insere ou atualiza se já existir
    const { error } = await (supabaseClient
      .from('device_tokens') as any)
      .upsert({
        user_id: userId,
        token: token,
        platform: platform,
        device_name: navigator.userAgent,
        is_active: true,
        last_used_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,token'
      });

    if (error) {
      console.error('Erro ao registrar token:', error);
      return false;
    }

    console.log('Token registrado com sucesso');
    return true;
  } catch (error) {
    console.error('Erro ao registrar token:', error);
    return false;
  }
};

// Remover token do dispositivo (logout)
export const removeDeviceToken = async (userId: string): Promise<boolean> => {
  try {
    const { error } = await (supabaseClient
      .from('device_tokens') as any)
      .update({ is_active: false })
      .eq('user_id', userId);

    if (error) {
      console.error('Erro ao remover token:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Erro ao remover token:', error);
    return false;
  }
};

// Configurar listeners para Push Notifications
export const setupPushListeners = (
  onNotificationReceived?: (notification: PushNotificationSchema) => void,
  onNotificationAction?: (action: ActionPerformed) => void
) => {
  if (!isPushAvailable()) return;

  // Listener para quando recebe token
  PushNotifications.addListener('registration', async (token: Token) => {
    console.log('Push token recebido:', token.value);

    // O token será registrado quando o usuário fizer login
    // Salvar temporariamente no localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('push_token', token.value);
    }
  });

  // Listener para erro de registro
  PushNotifications.addListener('registrationError', (error) => {
    console.error('Erro no registro de push:', error);
  });

  // Listener para notificação recebida (app em foreground)
  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.log('Notificação recebida:', notification);
    onNotificationReceived?.(notification);
  });

  // Listener para ação na notificação (usuário clicou)
  PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    console.log('Ação na notificação:', action);
    onNotificationAction?.(action);
  });
};

// Remover listeners
export const removePushListeners = async () => {
  if (!isPushAvailable()) return;
  await PushNotifications.removeAllListeners();
};

// Obter token salvo
export const getSavedPushToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('push_token');
};

// Limpar token salvo
export const clearSavedPushToken = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('push_token');
  }
};
