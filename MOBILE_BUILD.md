# 📱 TGP Pokemon - Build Mobile (Android/iOS)

Este documento descreve como compilar e publicar o app nas lojas.

## 📋 Informações do App

| Campo | Valor |
|-------|-------|
| **App ID** | `app.tgppokemon` |
| **Nome** | TGP Pokemon |
| **Modo** | Servidor (carrega do site web) |

## 🏗️ Arquitetura

O app usa **Capacitor em modo servidor**, ou seja:
- O app Android/iOS é um "wrapper" nativo
- O conteúdo é carregado do seu site web hospedado
- Vantagens: Atualizações instantâneas sem republish na loja

```
┌─────────────────────────────────────────┐
│           App Nativo (Capacitor)         │
│  ┌─────────────────────────────────────┐ │
│  │         WebView                      │ │
│  │    Carrega: https://seu-site.com    │ │
│  └─────────────────────────────────────┘ │
│  Status Bar | Splash Screen | Keyboard   │
└─────────────────────────────────────────┘
```

## 🚀 Configuração Inicial (Já Concluída ✅)

As dependências já foram instaladas:
- ✅ @capacitor/core, @capacitor/cli
- ✅ @capacitor/android
- ✅ @capacitor/status-bar, @capacitor/splash-screen, @capacitor/keyboard
- ✅ Plataforma Android adicionada

---

## 🔧 Desenvolvimento

### 1. Testar no Navegador
```bash
npm run dev
```

### 2. Testar no Emulador/Dispositivo Android
```bash
# 1. Primeiro, inicie o servidor de desenvolvimento
npm run dev

# 2. Em outro terminal, abra o Android Studio
npm run cap:android
```

### 3. Sincronizar após mudanças
```bash
npm run cap:sync
```

---

## 📦 Estrutura de Arquivos Capacitor

```
pokemongo/
├── android/              # Projeto Android Studio
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── res/      # Ícones e splash screens
│   │   │   └── AndroidManifest.xml
│   │   └── build.gradle
│   └── capacitor.settings.gradle
├── ios/                  # Projeto Xcode (apenas Mac)
│   └── App/
├── out/                  # Build estático do Next.js
└── capacitor.config.ts   # Configuração do Capacitor
```

---

## 🎨 Assets Necessários

### Ícones do App
| Plataforma | Tamanho | Local |
|------------|---------|-------|
| Android | 48x48 até 512x512 | `android/app/src/main/res/mipmap-*` |
| iOS | 1024x1024 | `ios/App/App/Assets.xcassets/AppIcon.appiconset` |

### Splash Screen
| Plataforma | Formato | Local |
|------------|---------|-------|
| Android | 9-patch ou PNG | `android/app/src/main/res/drawable/splash.png` |
| iOS | Storyboard | `ios/App/App/Base.lproj/LaunchScreen.storyboard` |

**Dica**: Use https://www.appicon.co/ para gerar todos os tamanhos automaticamente.

---

## 🏪 Publicação nas Lojas

### Google Play Store (Android)

#### Requisitos
- [ ] Conta Google Play Developer ($25 única vez)
- [ ] Ícone 512x512 PNG
- [ ] Feature Graphic 1024x500
- [ ] Screenshots (mínimo 2)
- [ ] Descrição curta (80 caracteres)
- [ ] Descrição completa (4000 caracteres)
- [ ] Política de Privacidade (URL)

#### Gerar APK/AAB
```bash
# No Android Studio:
# Build > Generate Signed Bundle / APK
# Escolher Android App Bundle (AAB) para Play Store
```

#### Passos
1. Acesse https://play.google.com/console
2. Criar aplicativo
3. Preencher informações da loja
4. Upload do AAB
5. Teste interno → Teste fechado → Produção

---

### App Store (iOS)

#### Requisitos
- [ ] Apple Developer Program ($99/ano)
- [ ] Mac com Xcode
- [ ] Ícone 1024x1024 PNG (sem transparência)
- [ ] Screenshots para cada tamanho de tela
- [ ] Descrição
- [ ] Política de Privacidade (URL)
- [ ] Classificação de conteúdo

#### Gerar Build
```bash
# No Xcode:
# Product > Archive
# Distribute App > App Store Connect
```

#### Passos
1. Acesse https://appstoreconnect.apple.com
2. Criar App
3. Preencher informações
4. Upload via Xcode ou Transporter
5. Submeter para revisão (1-3 dias)

---

## 🔐 Variáveis de Ambiente no Mobile

O Capacitor usa as variáveis definidas em build time. Para produção:

1. Crie `.env.production`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anonima
```

2. O build usará automaticamente essas variáveis.

---

## ⚠️ Problemas Comuns

### Build falha com "output: export"
- Verifique se não há rotas dinâmicas sem `generateStaticParams`
- API Routes não funcionam em build estático

### App não conecta ao Supabase
- Verifique as variáveis de ambiente
- Em Android, adicione permissão de internet no AndroidManifest.xml

### Splash screen não aparece
- Regenere os assets
- Execute `npx cap sync` novamente

---

## 📋 Checklist de Lançamento

### Pré-lançamento
- [ ] Testar em dispositivo real
- [ ] Verificar todas as funcionalidades
- [ ] Testar login/logout
- [ ] Testar pagamentos (se aplicável)
- [ ] Criar política de privacidade
- [ ] Criar termos de uso

### Assets
- [ ] Ícone do app (todos os tamanhos)
- [ ] Splash screen
- [ ] Screenshots da loja
- [ ] Feature graphic (Android)
- [ ] Preview video (opcional)

### Informações da Loja
- [ ] Nome do app
- [ ] Descrição curta
- [ ] Descrição completa
- [ ] Categoria
- [ ] Tags/palavras-chave
- [ ] Informações de contato

---

## 📞 Suporte

Para dúvidas sobre o processo de build:
- [Documentação Capacitor](https://capacitorjs.com/docs)
- [Publicar no Google Play](https://support.google.com/googleplay/android-developer/answer/9859152)
- [Publicar na App Store](https://developer.apple.com/app-store/submitting/)
