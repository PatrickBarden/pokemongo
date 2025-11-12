# 🔌 Usando MCP do Mercado Pago

## ✅ Você já tem o MCP configurado!

Como você mencionou que o MCP do Mercado Pago já está habilitado na IDE, precisamos apenas adicionar o token no `.env.local` para que a API possa usá-lo.

## 🔑 Obter Token do MCP

O MCP do Mercado Pago já está autenticado, mas precisamos do token para fazer chamadas à API.

### Opção 1: Usar Credenciais de Teste Diretamente

1. Acesse: https://www.mercadopago.com.br/developers/panel/credentials
2. Vá em **"Credenciais de teste"**
3. Copie o **Access Token** (começa com `TEST-`)

### Opção 2: Verificar Token no MCP

Se o MCP já está configurado, o token deve estar disponível nas configurações do MCP.

## 📝 Adicionar ao .env.local

Crie ou edite o arquivo `.env.local` na raiz do projeto:

```bash
# Supabase (já deve estar configurado)
NEXT_PUBLIC_SUPABASE_URL=sua-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-key
SUPABASE_SERVICE_ROLE_KEY=sua-service-key

# Mercado Pago - Token de TESTE
MERCADO_PAGO_ACCESS_TOKEN=TEST-1234567890-112233-abc123def456-123456789
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 🚀 Testar

1. **Reinicie o servidor:**
   ```bash
   npm run dev
   ```

2. **Vá para o checkout:**
   - Acesse `/dashboard/market`
   - Clique em "Comprar" em um Pokémon
   - Clique em "Ir para Pagamento"

3. **Verifique os logs no terminal:**
   ```
   📥 Recebendo requisição: { orderId: '...', userId: '...' }
   ✅ Usando MCP do Mercado Pago
   🔍 Buscando pedido: ...
   ✅ Pedido encontrado: ...
   📦 Itens do pedido: [...]
   🔄 Criando preferência no Mercado Pago...
   ✅ Preferência criada: ...
   ```

## 🎯 Fluxo Atualizado

1. **Frontend** → Clica em "Ir para Pagamento"
2. **API** → Cria pedido no Supabase
3. **API** → Chama API REST do Mercado Pago (usando token do .env.local)
4. **Mercado Pago** → Retorna URL de checkout
5. **Frontend** → Redireciona para checkout do Mercado Pago

## ❓ FAQ

### Por que preciso do token no .env.local se o MCP já está configurado?

O MCP é usado pela IDE (Windsurf) para ferramentas de desenvolvimento, mas a aplicação Next.js roda em um processo separado e precisa do token para fazer chamadas à API do Mercado Pago.

### Qual token devo usar?

Use o **Access Token de TESTE** (começa com `TEST-`). Nunca use credenciais de produção durante desenvolvimento!

### O MCP e o .env.local são a mesma coisa?

Não! São diferentes:
- **MCP**: Ferramentas da IDE para desenvolvimento
- **.env.local**: Variáveis de ambiente para a aplicação Next.js

Ambos precisam estar configurados!

## 🔧 Troubleshooting

### Erro: "MERCADO_PAGO_ACCESS_TOKEN não configurado"

**Solução:** Adicione o token no `.env.local` e reinicie o servidor.

### Erro: "Invalid credentials" ou "Unauthorized"

**Solução:** 
1. Verifique se o token começa com `TEST-`
2. Confirme que copiou o token completo
3. Tente gerar um novo token no painel do Mercado Pago

### Erro: "Failed to fetch"

**Solução:**
1. Verifique sua conexão com a internet
2. Confirme que a API do Mercado Pago está acessível
3. Verifique se não há firewall bloqueando

## ✅ Checklist Final

- [ ] MCP do Mercado Pago está conectado na IDE ✅ (você já tem!)
- [ ] Obtive o Access Token de TESTE
- [ ] Adicionei `MERCADO_PAGO_ACCESS_TOKEN` no `.env.local`
- [ ] Adicionei `NEXT_PUBLIC_APP_URL=http://localhost:3000` no `.env.local`
- [ ] Reiniciei o servidor (`npm run dev`)
- [ ] Testei o checkout

## 🎉 Pronto!

Após seguir estes passos, o checkout deve funcionar perfeitamente usando o MCP do Mercado Pago! 🚀
