# Guia Completo: Capacitor + Android Studio

## Como o App Funciona

O app **TGP Pokemon** é um projeto **Next.js** que roda num servidor (Vercel, por exemplo). O Capacitor cria um app Android/iOS que é basicamente um **navegador embutido (WebView)** apontando para o seu servidor Next.js.

- **Modo DEV**: O app aponta para `http://10.0.2.2:3000` (IP especial que o emulador Android usa para acessar o `localhost` do seu PC)
- **Modo PRODUÇÃO**: O app apontará para a URL de produção (ex: `https://tgp-pokemon.vercel.app`)

---

## Pré-requisitos

1. **Node.js** instalado (v18+)
2. **Android Studio** instalado (você já tem: Panda 2 | 2025.3.2)
3. **JDK 17+** (geralmente já vem com o Android Studio)
4. **Um emulador Android configurado** OU um celular Android conectado via USB

---

## Passo a Passo Completo

### Passo 1: Iniciar o servidor Next.js (DEV)

Abra um terminal na pasta do projeto e rode:

```bash
npm run dev
```

> **Importante:** O servidor precisa estar rodando em `localhost:3000` para o emulador Android conseguir acessar. Deixe esse terminal aberto durante todo o desenvolvimento.

---

### Passo 2: Sincronizar o Capacitor

Sempre que fizer alterações no código ou nos plugins, rode:

```bash
npx cap sync android
```

Esse comando:
- Copia os assets web para o projeto Android
- Atualiza os plugins nativos
- Sincroniza as configurações

---

### Passo 3: Abrir o projeto no Android Studio

Rode o comando:

```bash
npx cap open android
```

Ou manualmente:
1. Abra o **Android Studio**
2. Clique em **"Open"** (ou File > Open)
3. Navegue até: `C:\PROJETOS\pokemongo\android`
4. Selecione a pasta `android` e clique em **OK**

---

### Passo 4: Aguarde o Gradle sincronizar

Quando o projeto abrir pela primeira vez no Android Studio:

1. O Android Studio vai baixar dependências e sincronizar o **Gradle**
2. Aguarde a barra de progresso na parte inferior terminar
3. Se aparecer uma mensagem pedindo para atualizar o Gradle, clique em **"Update"**
4. Se pedir para instalar SDKs, aceite e instale

> ⏱ Isso pode levar alguns minutos na primeira vez.

---

### Passo 5: Configurar um Emulador (se ainda não tiver)

1. No Android Studio, clique em **Tools > Device Manager** (ou no ícone de celular na barra lateral)
2. Clique em **"Create Virtual Device"**
3. Escolha um modelo (recomendo **Pixel 7** ou **Pixel 8**)
4. Escolha a imagem do sistema: **API 34 (Android 14)** — clique em "Download" se necessário
5. Clique em **Next** e depois **Finish**

---

### Passo 6: Rodar o App

1. **Certifique-se que o `npm run dev` está rodando** no terminal
2. No Android Studio, selecione o emulador no dropdown ao lado do botão ▶ (play)
3. Clique no botão **▶ Run** (play verde) ou pressione `Shift + F10`
4. Aguarde o build e a instalação no emulador
5. O app vai abrir e carregar a interface do TGP Pokemon!

---

### Passo 7: Testar em Celular Físico (Opcional)

Para testar num celular Android real:

1. No celular, vá em **Configurações > Sobre o telefone**
2. Toque 7 vezes em **"Número da versão"** para ativar as **Opções do Desenvolvedor**
3. Volte em Configurações, entre em **Opções do Desenvolvedor**
4. Ative **"Depuração USB"**
5. Conecte o celular ao PC via cabo USB
6. Aceite a permissão de depuração que aparecerá no celular
7. O celular aparecerá no dropdown do Android Studio — selecione e clique em ▶

> **Nota para celular físico:** O `10.0.2.2` só funciona no emulador. Para celular físico, você precisa usar o IP local do seu PC (ex: `192.168.1.100:3000`). Altere temporariamente a URL em `capacitor.config.ts` ou use o modo produção apontando para a URL do Vercel.

---

## Fluxo de Trabalho Diário

```
1. Abra o terminal → npm run dev
2. Faça suas alterações no código (Windsurf/VS Code)
3. O app no emulador atualiza automaticamente (hot reload via dev server)
4. Se mexer em plugins nativos → npx cap sync android
5. Se mexer em configs do Capacitor → npx cap sync android + rebuild no Android Studio
```

---

## Comandos Rápidos (Referência)

| Comando | O que faz |
|---------|-----------|
| `npm run dev` | Inicia o servidor Next.js local |
| `npx cap sync android` | Sincroniza plugins e configs com o Android |
| `npx cap open android` | Abre o projeto no Android Studio |
| `npm run mobile:android` | Build completo + sync + abre Android Studio |
| `npx cap sync` | Sincroniza Android e iOS de uma vez |

---

## Solução de Problemas

### "App abre mas fica em branco"
- Verifique se o `npm run dev` está rodando
- No emulador, teste acessar `http://10.0.2.2:3000` no navegador Chrome

### "Erro de Gradle"
- File > Invalidate Caches > Restart
- Build > Clean Project
- Build > Rebuild Project

### "Emulador muito lento"
- Ative a **aceleração de hardware** (HAXM/Hyper-V) nas configurações do Android Studio
- Use um emulador com imagem **x86_64** (não ARM)

### "Tela branca no celular físico"
- Mude a URL no `capacitor.config.ts` para o IP local do seu PC
- Ou use a URL de produção do Vercel

---

## Para Gerar o APK de Produção

Quando for publicar na Play Store:

1. Em `capacitor.config.ts`, mude `DEV_MODE` para `false`
2. Configure a `PRODUCTION_URL` com a URL real do seu deploy
3. Rode `npx cap sync android`
4. No Android Studio: **Build > Generate Signed Bundle / APK**
5. Siga o assistente para criar a keystore e gerar o AAB (Android App Bundle)

> **Importante:** Guarde a keystore em local seguro — você vai precisar dela para todas as atualizações futuras na Play Store.
