import type { CapacitorConfig } from '@capacitor/cli';

// ⚠️ MODO DEV: Mude para true para desenvolvimento local no Android Studio
// Em produção (APK para celular real / Play Store), mantenha false
const DEV_MODE = false;

// URL de produção do app na Vercel
const PRODUCTION_URL = 'https://pokemongo-xi.vercel.app';

const config: CapacitorConfig = {
  appId: 'app.tgppokemon',
  appName: 'TGP Pokemon',
  webDir: 'out',
  
  // Configurações do servidor
  server: {
    // DEV: aponta para Next.js dev server via IP do emulador Android
    // PROD: aponta para URL de produção (o app usa server actions/API routes)
    url: DEV_MODE ? 'http://10.0.2.2:3000' : PRODUCTION_URL,
    cleartext: DEV_MODE,
    androidScheme: DEV_MODE ? 'http' : 'https',
    iosScheme: DEV_MODE ? 'http' : 'https',
  },
  
  // Configurações Android
  android: {
    overrideUserAgent: "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36",
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined,
    },
    // Permite mixed content para desenvolvimento
    allowMixedContent: DEV_MODE,
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
