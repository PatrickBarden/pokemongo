# 🔔 Configuração do Firebase Cloud Messaging (FCM)

Este documento explica como configurar o Firebase para enviar Push Notifications.

## 📋 Pré-requisitos

- Conta Google (gratuita)
- Projeto já configurado com Capacitor

## 🚀 Passo a Passo

### 1. Criar Projeto no Firebase

1. Acesse [Firebase Console](https://console.firebase.google.com/)
2. Clique em **"Adicionar projeto"**
3. Nome do projeto: `TGP Pokemon` (ou o nome que preferir)
4. Desative o Google Analytics (opcional)
5. Clique em **"Criar projeto"**

### 2. Adicionar App Android

1. No dashboard do projeto, clique no ícone **Android**
2. Preencha:
   - **Package name**: `app.tgppokemon`
   - **App nickname**: TGP Pokemon
   - **SHA-1**: (opcional para push, necessário para Google Sign-In)
3. Clique em **"Register app"**
4. Baixe o arquivo `google-services.json`
5. Coloque o arquivo em: `android/app/google-services.json`

### 3. Adicionar App iOS (opcional)

1. No dashboard, clique em **"Add app"** → **iOS**
2. Preencha:
   - **Bundle ID**: `app.tgppokemon`
   - **App nickname**: TGP Pokemon
3. Baixe o arquivo `GoogleService-Info.plist`
4. Coloque em: `ios/App/App/GoogleService-Info.plist`

### 4. Obter Server Key (FCM)

1. No Firebase Console, vá em **⚙️ Configurações do projeto**
2. Aba **Cloud Messaging**
3. Copie a **Server key** (chave do servidor)
4. Adicione ao seu `.env.local`:

```env
FCM_SERVER_KEY=sua_server_key_aqui
```

### 5. Configurar Android

Edite `android/app/build.gradle`:

```gradle
// No final do arquivo, adicione:
apply plugin: 'com.google.gms.google-services'
```

Edite `android/build.gradle`:

```gradle
buildscript {
    dependencies {
        // Adicione esta linha
        classpath 'com.google.gms:google-services:4.4.0'
    }
}
```

### 6. Sincronizar Capacitor

```bash
npx cap sync android
```

---

## 🔧 Variáveis de Ambiente

Adicione ao seu `.env.local`:

```env
# Firebase Cloud Messaging
FCM_SERVER_KEY=sua_server_key_aqui

# Opcional: Firebase Admin SDK (para recursos avançados)
FIREBASE_PROJECT_ID=seu_project_id
FIREBASE_PRIVATE_KEY="sua_private_key"
FIREBASE_CLIENT_EMAIL=seu_client_email
```

---

## 📱 Testar Push Notifications

### Via Firebase Console

1. Vá em **Engage** → **Cloud Messaging**
2. Clique em **"Send your first message"**
3. Preencha título e mensagem
4. Em **Target**, selecione seu app
5. Clique em **"Send test message"**
6. Cole o token do dispositivo (veja no console do app)

### Via Painel Admin

1. Acesse `/admin/push-notifications`
2. Clique em **"Nova Notificação"**
3. Preencha título e mensagem
4. Selecione o público-alvo
5. Clique em **"Enviar Agora"**

---

## 🔑 Onde encontrar cada chave

| Chave | Local |
|-------|-------|
| **Server Key** | Firebase Console → ⚙️ → Cloud Messaging |
| **Project ID** | Firebase Console → ⚙️ → Geral |
| **google-services.json** | Firebase Console → ⚙️ → Seus apps → Android |
| **GoogleService-Info.plist** | Firebase Console → ⚙️ → Seus apps → iOS |

---

## 🐛 Troubleshooting

### Notificação não chega

1. Verifique se o `FCM_SERVER_KEY` está correto
2. Verifique se o token do dispositivo está ativo
3. Verifique os logs em `/admin/push-notifications`

### Erro "MismatchSenderId"

- O `google-services.json` não corresponde ao projeto Firebase
- Baixe novamente o arquivo do Firebase Console

### Erro "InvalidRegistration"

- O token do dispositivo expirou ou é inválido
- O dispositivo precisa se registrar novamente

### Token não aparece no banco

- Verifique se solicitou permissão de notificações
- Verifique o console do app por erros

---

## 📊 Custos do Firebase

| Recurso | Limite Gratuito |
|---------|-----------------|
| **Cloud Messaging** | Ilimitado |
| **Realtime Database** | 1GB armazenamento, 10GB/mês transferência |
| **Authentication** | 10k verificações/mês |
| **Hosting** | 1GB armazenamento, 10GB/mês transferência |

**Push Notifications são 100% GRATUITAS** no Firebase! 🎉

---

## 🔗 Links Úteis

- [Firebase Console](https://console.firebase.google.com/)
- [Documentação FCM](https://firebase.google.com/docs/cloud-messaging)
- [Capacitor Push Notifications](https://capacitorjs.com/docs/apis/push-notifications)
- [Guia de Migração para FCM v1](https://firebase.google.com/docs/cloud-messaging/migrate-v1)

---

## ✅ Checklist de Configuração

- [ ] Projeto criado no Firebase Console
- [ ] App Android adicionado
- [ ] `google-services.json` em `android/app/`
- [ ] `FCM_SERVER_KEY` no `.env.local`
- [ ] `build.gradle` configurado
- [ ] `npx cap sync` executado
- [ ] Teste enviado com sucesso
