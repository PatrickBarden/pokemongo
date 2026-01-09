import type { CapacitorConfig } from '@capacitor/cli';

// ⚠️ MODO DEV: Mude para false quando for gerar build de produção
const DEV_MODE = true;

const config: CapacitorConfig = {
  appId: 'app.tgppokemon',
  appName: 'TGP Pokemon',
  webDir: 'public',
  
  // Configurações do servidor
  server: {
    // DEV: aponta para Next.js dev server via IP especial do emulador Android
    // PROD: comente/remova url e use webDir com build estático ou URL de produção
    url: DEV_MODE ? 'http://10.0.2.2:3000' : undefined,
    cleartext: DEV_MODE,
    androidScheme: DEV_MODE ? 'http' : 'https',
    iosScheme: DEV_MODE ? 'http' : 'https',
  },
  
  // Configurações Android
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined,
    },
    // Permite mixed content para desenvolvimento
    allowMixedContent: false,
    // Cor da splash screen
    backgroundColor: '#3B82F6',
  },
  
  // Configurações iOS
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    // Cor da splash screen
    backgroundColor: '#3B82F6',
  },
  
  // Plugins
  plugins: {
    // Configuração da Splash Screen
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#3B82F6',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: true,
      spinnerStyle: 'large',
      spinnerColor: '#FFFFFF',
      splashFullScreen: true,
      splashImmersive: true,
    },
    
    // Configuração da Status Bar
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#3B82F6',
    },
    
    // Configuração do Keyboard
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
    
    // Configuração de Push Notifications (para futuro)
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
