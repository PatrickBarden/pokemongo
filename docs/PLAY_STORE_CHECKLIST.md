# Checklist para Publicação na Play Store

## Status do Projeto

### ✅ Concluído
- [x] Projeto Capacitor configurado e sincronizado
- [x] Android Studio abrindo o projeto corretamente
- [x] App renderizando no emulador
- [x] APK debug gerado com sucesso (`android/app/build/outputs/apk/debug/app-debug.apk`)
- [x] Ícone personalizado (Pokéball azul TGP)
- [x] Splash screen configurada
- [x] Deep link OAuth implementado
- [x] Safe areas e UX mobile configurados
- [x] Política de Privacidade (`/politica-privacidade`)
- [x] Termos de Uso (`/termos-de-uso`)
- [x] Dark mode corrigido
- [x] Chat funcional (texto + imagens)
- [x] Manifest Android seguro para release
- [x] Network security config para debug/release

### ⏳ Necessário antes da Play Store
- [ ] Definir URL de produção real (Vercel/Netlify)
- [ ] Configurar `JAVA_HOME` permanentemente no Windows
- [ ] Testar app no celular real (login, chat, pedidos, pagamentos)
- [ ] Gerar keystore de assinatura para release
- [ ] Gerar AAB (Android App Bundle) assinado
- [ ] Criar conta Google Play Console (taxa única ~US$25)

### 📋 Ficha da Play Store (obrigatório)
- [ ] Nome do app: **TGP Pokemon**
- [ ] Descrição curta (até 80 caracteres)
- [ ] Descrição longa (até 4000 caracteres)
- [ ] Ícone 512x512 PNG (gerar a partir do vetor atual)
- [ ] Feature Graphic 1024x500 PNG
- [ ] Screenshots do app (mínimo 2, recomendado 4-8)
- [ ] Classificação etária (preencher questionário IARC)
- [ ] Categoria: **Entretenimento** ou **Compras**
- [ ] E-mail de suporte público
- [ ] URL da Política de Privacidade
- [ ] URL dos Termos de Uso
- [ ] Declaração de permissões do app

---

## Passo a Passo para Publicar

### 1. Testar APK no Celular Real
```
Arquivo: android\app\build\outputs\apk\debug\app-debug.apk
```
Envie para o celular e instale (ativar "Instalar apps desconhecidos").

### 2. Configurar URL de Produção
Em `capacitor.config.ts`, ajustar `PRODUCTION_URL` para a URL real do deploy.

### 3. Gerar Keystore
No Android Studio:
```
Build > Generate Signed Bundle / APK > Android App Bundle > Create new...
```
Guarde o arquivo `.jks`, alias e senhas em local seguro.

### 4. Gerar AAB Release
```bash
# No terminal (com JAVA_HOME configurado)
cd android
.\gradlew.bat bundleRelease
```
Ou pelo Android Studio: `Build > Generate Signed Bundle / APK`

O AAB ficará em: `android/app/build/outputs/bundle/release/app-release.aab`

### 5. Criar Conta na Play Console
- Acesse: https://play.google.com/console
- Pague a taxa de registro (~US$25)
- Preencha os dados da conta de desenvolvedor

### 6. Criar o App na Play Console
- Clique em "Criar app"
- Preencha nome, idioma, tipo (App), categoria
- Aceite as políticas

### 7. Preencher a Ficha
- **Listagem da loja principal:** nome, descrições, screenshots
- **Classificação de conteúdo:** preencher questionário
- **Público-alvo:** selecionar faixa etária (13+)
- **Política de privacidade:** URL da página criada

### 8. Upload e Teste Interno
- Vá em **Teste > Teste interno**
- Crie uma nova versão
- Faça upload do AAB
- Adicione testadores por e-mail
- Publique para teste interno

### 9. Publicação em Produção
- Após testes, vá em **Produção**
- Crie nova versão com o mesmo AAB
- Preencha notas de versão
- Envie para revisão (pode levar 1-7 dias)

---

## Observações Importantes

1. **Keystore:** NUNCA perca o arquivo keystore. Sem ele, você não atualiza o app na Play Store.
2. **Versionamento:** Atualize `versionCode` e `versionName` em `android/app/build.gradle` a cada release.
3. **Push Notifications:** Para funcionar, precisa do `google-services.json` do Firebase Console.
4. **Primeiro review:** A primeira publicação pode levar mais tempo (até 7 dias).
