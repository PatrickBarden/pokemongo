# Como Funciona o Marketplace - Pokémon GO Trading Platform

Este documento explica, de forma simples e completa, como funciona todo o fluxo de compra e venda de Pokémon e contas dentro da nossa plataforma.

---

## Visão Geral

A plataforma funciona como um **marketplace intermediado**: o vendedor anuncia, o comprador paga, e a equipe administrativa acompanha toda a negociação para garantir segurança para ambos os lados.

```
VENDEDOR → Cria Anúncio → Admin Aprova → Aparece no Mercado
COMPRADOR → Escolhe Pokémon → Paga via MercadoPago → Conversa com Vendedor → Recebe Pokémon
ADMIN → Aprova Anúncios → Monitora Conversas → Gerencia Disputas → Repassa Pagamento
```

---

## 1. Criação de Anúncio (Listing)

### Quem pode criar?
- **Vendedores (usuários comuns)**: Criam anúncios pela página "Minhas Vendas" (`/dashboard/seller`) ou "Novo Anúncio" (`/dashboard/listings/new`).
- **Administradores**: Criam anúncios em nome de qualquer usuário pelo painel admin (`/admin/listings`).

### Tipos de anúncio
| Tipo | Descrição |
|------|-----------|
| `pokemon` | Um Pokémon individual (normal, shiny, com fantasia, purificado, etc.) |
| `account` | Uma conta inteira do Pokémon GO |

### O que acontece ao criar?
1. O vendedor preenche os dados: nome do Pokémon, tipo, preço sugerido, descrição, foto.
2. O anúncio é salvo na tabela `listings` com `active: false` e `admin_approved: false`.
3. O anúncio entra na fila de aprovação do admin.

### Exceção: Admin criando anúncio
- Quando o admin cria um anúncio, ele já nasce com `admin_approved: true` (aprovação automática).

**Arquivos envolvidos:**
- `server/actions/listings.ts` — Funções `createPokemonListing` e `createAccountListing`
- `app/dashboard/listings/new/page.tsx` — Tela de criação para usuários
- `app/admin/listings/page.tsx` — Tela de criação/gerenciamento para admin

---

## 2. Aprovação de Anúncios

### Fluxo de aprovação
1. O admin acessa o painel de anúncios (`/admin/listings`).
2. Vê a lista de anúncios pendentes (com filtro por status).
3. Pode **aprovar** ou **rejeitar** anúncios individualmente ou em lote (batch).

### O que muda ao aprovar?
- `admin_approved` → `true`
- `approved_at` → data/hora atual
- `active` → `true` (o anúncio fica visível no mercado)

### O que muda ao rejeitar?
- `admin_approved` → `false`
- `rejected_at` → data/hora atual
- `rejection_reason` → motivo informado pelo admin
- `active` → `false` (o anúncio NÃO aparece no mercado)

### Banner de pendência
- Na página "Minhas Vendas", o vendedor vê um banner informando quantos anúncios estão "Aguardando Aprovação".

---

## 3. Mercado (Marketplace)

### Como os anúncios aparecem?
- A página do mercado (`/dashboard/market`) busca apenas anúncios onde `active = true`.
- Os anúncios são exibidos com foto, nome, tipo, preço e informações do vendedor.
- O comprador pode **filtrar** por: categoria, tipo de Pokémon, variantes (shiny, com fantasia, purificado, etc.), faixa de preço, e ordenação.

### Ações do comprador no mercado:
1. **Adicionar ao carrinho** — Salva o item na tabela `cart_items`
2. **Comprar direto** — Vai para o checkout com aquele item específico
3. **Favoritar** — Salva nos favoritos
4. **Ver perfil do vendedor** — Mostra reputação, nível, total de vendas

**Arquivos envolvidos:**
- `app/dashboard/market/page.tsx` — Página do mercado
- `contexts/CartContext.tsx` — Gerenciamento do carrinho

---

## 4. Carrinho de Compras

### Como funciona?
1. O comprador adiciona Pokémon ao carrinho pela página do mercado.
2. Os itens ficam salvos na tabela `cart_items` (vinculados ao `user_id`).
3. Na página do carrinho (`/dashboard/cart`), o comprador vê todos os itens, valores, e pode remover itens ou limpar tudo.

### Finalizar compra pelo carrinho
1. Ao clicar "Finalizar Compra", o sistema:
   - Gera um número de pedido via `generate_order_number` (função do banco de dados)
   - Cria um registro na tabela `orders` com status `pending`
   - Cria registros na tabela `order_items` (cada Pokémon do carrinho)
   - Chama a API `/api/mercadopago/create-preference` para gerar o link de pagamento
   - Limpa o carrinho
   - Redireciona o comprador para o checkout do MercadoPago

**Arquivos envolvidos:**
- `app/dashboard/cart/page.tsx` — Página do carrinho
- `contexts/CartContext.tsx` — Funções de adicionar/remover/limpar

---

## 5. Checkout (Compra Direta)

### Fluxo alternativo (sem carrinho)
1. Na página do mercado, o comprador clica "Comprar" em um Pokémon.
2. É redirecionado para `/dashboard/checkout?listing=<id>`.
3. A página carrega os dados do Pokémon e calcula as taxas.
4. Ao confirmar, o sistema:
   - Chama `/api/mercadopago/create-preference` enviando os dados do item
   - A API cria o pedido (`orders`), os itens (`order_items`), e a preferência de pagamento
   - Retorna o link de checkout do MercadoPago
   - O comprador é redirecionado para pagar

**Arquivos envolvidos:**
- `app/dashboard/checkout/page.tsx` — Página de checkout direto
- `app/api/mercadopago/create-preference/route.ts` — API que cria pedido + preferência MP

---

## 6. Pagamento (MercadoPago)

### Como funciona o pagamento?
1. O comprador é redirecionado para o checkout do MercadoPago (ambiente sandbox ou produção).
2. Escolhe o método de pagamento (Pix, cartão, boleto, etc.).
3. Após o pagamento, o MercadoPago envia uma **notificação webhook** para nossa API.

### O que acontece quando o webhook é recebido?
A API `/api/mercadopago/webhook` processa a notificação:

| Status do Pagamento | Ação no Sistema |
|---------------------|-----------------|
| `approved` | Pedido muda para `AWAITING_SELLER`, conversa é criada, notificações são enviadas |
| `pending` / `in_process` | Pedido continua como `PAYMENT_PENDING` |
| `rejected` / `cancelled` | Pedido muda para `CANCELLED` |

### Quando o pagamento é aprovado:
1. Status do pedido → `AWAITING_SELLER`
2. **Conversa de pedido** é criada automaticamente na tabela `order_conversations`:
   - Participantes: comprador, vendedor e admin (como intermediário)
   - Mensagem de sistema com detalhes do pedido e próximos passos
3. **Notificação admin** é criada (novo pagamento aprovado)
4. **Push notification** é enviada ao vendedor (novo pedido)
5. **Push notification** é enviada ao comprador (pagamento confirmado)

### Taxas do pagamento
- A plataforma cobra uma **taxa total** que varia por faixa de valor (tabela `platform_fee_tiers`)
- Dessa taxa total, **5% vai para o MercadoPago** e o restante é lucro da plataforma
- Taxa mínima total: **R$ 10,00**
- O vendedor recebe: `valor da venda - taxa total`

**Arquivos envolvidos:**
- `app/api/mercadopago/webhook/route.ts` — Webhook que processa pagamentos
- `app/api/mercadopago/create-preference/route.ts` — Criação de preferência MP
- `server/actions/platform-fees.ts` — Cálculo de taxas

---

## 7. Conversa Pós-Compra

### Sistema de conversas
A plataforma tem **dois tipos** de conversa:

| Tipo | Tabela | Mensagens | Quando é criada |
|------|--------|-----------|-----------------|
| **Conversa de Pedido** | `order_conversations` | `order_conversation_messages` | Automaticamente após pagamento aprovado |
| **Conversa Direta** | `conversations` | `chat_messages` | Manualmente pelo comprador ou vendedor |

### Conversa de Pedido (após compra)
- Criada automaticamente pelo webhook quando o pagamento é aprovado.
- 3 participantes: comprador (`buyer_id`), vendedor (`seller_id`) e admin (`admin_id`).
- Mensagem inicial automática com detalhes do pedido e instruções.
- O admin monitora como intermediário.

### Conversa Direta
- Criada manualmente quando um usuário inicia um chat com outro (ex: tirar dúvidas antes de comprar).
- 2 participantes: `participant_1` e `participant_2`.
- Não está necessariamente vinculada a um pedido.

### Painel do Admin (Central de Mensagens)
- O admin vê **todas** as conversas (pedidos + diretas) em `/admin/chat`.
- Pode enviar mensagens, encerrar conversas, exportar para PDF.
- Mensagens enviadas detectam automaticamente a tabela correta (`order_conversation_messages` ou `chat_messages`).

**Arquivos envolvidos:**
- `server/actions/chat.ts` — Funções de chat (criar, listar, enviar, marcar como lido)
- `app/admin/chat/page.tsx` — Painel de mensagens do admin
- `app/dashboard/messages/page.tsx` — Página de mensagens do usuário

---

## 8. Entrega do Pokémon

### Fluxo de entrega
1. Após o pagamento ser confirmado, o **vendedor** é notificado.
2. O vendedor combina a entrega com o comprador pela conversa do pedido.
3. A entrega acontece **dentro do jogo Pokémon GO** (troca presencial ou a distância).
4. Após o comprador receber o Pokémon, ele confirma a entrega no sistema.
5. O admin pode monitorar e intervir se necessário.

### Status do pedido ao longo do tempo
```
pending → PAYMENT_PENDING → AWAITING_SELLER → payment_confirmed → completed
                                                                      ↓
                                                            cancelled / refunded
```

| Status | Significado |
|--------|-------------|
| `pending` | Pedido criado, aguardando pagamento |
| `PAYMENT_PENDING` | Pagamento em processamento |
| `AWAITING_SELLER` | Pagamento aprovado, aguardando vendedor |
| `payment_confirmed` | Admin confirmou, venda em andamento |
| `completed` | Entrega realizada, venda concluída |
| `cancelled` | Pedido cancelado |
| `refunded` | Pedido cancelado e valor devolvido |

---

## 9. Avaliações (Reviews)

### Quando o comprador pode avaliar?
- Apenas após o pedido ter status `completed`.
- O sistema verifica automaticamente se o comprador já avaliou o vendedor naquele pedido.

### Como funciona?
1. Na página "Meus Pedidos" (`/dashboard/orders`), pedidos concluídos mostram o botão "Avaliar".
2. O comprador dá uma nota (1 a 5 estrelas) e um comentário.
3. A avaliação é salva na tabela `reviews`.
4. O sistema atualiza automaticamente a reputação do vendedor (`reputation_score`) e seu nível (`seller_level`).

### Níveis de vendedor
| Nível | Requisito |
|-------|-----------|
| Bronze | 0 vendas |
| Prata | 5 vendas |
| Ouro | 20 vendas |
| Platina | 50 vendas |
| Diamante | 100 vendas |

**Arquivos envolvidos:**
- `server/actions/reviews.ts` — CRUD de avaliações
- `components/reviews.tsx` — Componentes de UI de avaliação
- `app/dashboard/orders/page.tsx` — Botão de avaliar nos pedidos

---

## 10. Gestão Administrativa

### Painel do Admin (`/admin`)
O administrador tem acesso a diversas ferramentas:

| Página | Função |
|--------|--------|
| `/admin/listings` | Gerenciar anúncios (aprovar, rejeitar, criar) |
| `/admin/orders` | Ver todos os pedidos e seus detalhes |
| `/admin/negotiations` | Gerenciar status de pedidos, repasses, reembolsos |
| `/admin/chat` | Central de mensagens (conversas de pedidos + diretas) |
| `/admin/disputes` | Gerenciar disputas entre comprador e vendedor |
| `/admin/users` | Gerenciar usuários da plataforma |
| `/admin/payouts` | Controlar repasses aos vendedores |
| `/admin/settings` | Configurações da plataforma |
| `/admin/reports` | Relatórios e métricas |
| `/admin/complaints` | Reclamações |
| `/admin/suggestions` | Sugestões dos usuários |

### Fluxo de repasse ao vendedor
1. Após a entrega ser confirmada, o admin marca o pedido como `completed`.
2. O admin então processa o repasse ao vendedor (valor da venda - taxas).
3. O campo `payout_completed` e `payout_at` são atualizados na tabela `orders`.

---

## 11. Disputas e Problemas

### Quando abre uma disputa?
- O comprador não recebe o Pokémon.
- O Pokémon recebido não corresponde ao anunciado.
- Problemas de comunicação entre comprador e vendedor.

### Como é resolvida?
1. O admin é notificado e acessa a conversa do pedido.
2. Analisa as mensagens e evidências.
3. Pode: confirmar entrega, cancelar pedido, ou reembolsar o comprador.
4. O admin tem poder total sobre o status do pedido.

---

## 12. Notificações

### Tipos de notificação
| Evento | Quem recebe | Tipo |
|--------|-------------|------|
| Novo pedido | Vendedor | Push + Admin notification |
| Pagamento aprovado | Comprador + Admin | Push + Admin notification |
| Pagamento rejeitado | Admin | Admin notification |
| Nova mensagem | Destinatário da mensagem | Push notification |
| Status do pedido atualizado | Comprador | Push notification |

**Arquivos envolvidos:**
- `server/actions/push-notifications.ts` — Envio de push notifications
- Tabela `admin_notifications` — Notificações para o painel admin

---

## Resumo Visual do Fluxo Completo

```
┌──────────────┐
│  VENDEDOR    │
│  Cria Anúncio│
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  ADMIN       │
│  Aprova      │
└──────┬───────┘
       │
       ▼
┌──────────────┐     ┌──────────────┐
│  MERCADO     │────▶│  COMPRADOR   │
│  (Listings)  │     │  Vê e Escolhe│
└──────────────┘     └──────┬───────┘
                            │
                    ┌───────┴───────┐
                    ▼               ▼
             ┌──────────┐   ┌──────────┐
             │ CARRINHO │   │ CHECKOUT │
             │ (vários) │   │ (direto) │
             └────┬─────┘   └────┬─────┘
                  │              │
                  └──────┬───────┘
                         ▼
              ┌──────────────────┐
              │  MERCADOPAGO     │
              │  Pagamento       │
              └────────┬─────────┘
                       │
                       ▼
              ┌──────────────────┐
              │  WEBHOOK         │
              │  Processa Pgto   │
              └────────┬─────────┘
                       │
           ┌───────────┼───────────┐
           ▼           ▼           ▼
    ┌────────────┐ ┌────────┐ ┌────────────┐
    │ Conversa   │ │ Pedido │ │ Notifica   │
    │ Criada     │ │ Atualiz│ │ Push+Admin │
    └────────────┘ └────────┘ └────────────┘
           │
           ▼
    ┌──────────────┐
    │  ENTREGA     │
    │  (no jogo)   │
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │  CONFIRMAÇÃO │
    │  + Avaliação │
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │  REPASSE     │
    │  ao Vendedor │
    └──────────────┘
```

---

## Tabelas do Banco de Dados Envolvidas

| Tabela | Descrição |
|--------|-----------|
| `users` | Usuários da plataforma (compradores, vendedores, admins) |
| `listings` | Anúncios de Pokémon e contas |
| `cart_items` | Itens no carrinho de cada usuário |
| `orders` | Pedidos de compra |
| `order_items` | Itens de cada pedido |
| `order_conversations` | Conversas de pedidos (3 participantes) |
| `order_conversation_messages` | Mensagens das conversas de pedidos |
| `conversations` | Conversas diretas (2 participantes) |
| `chat_messages` | Mensagens das conversas diretas |
| `reviews` | Avaliações de compradores sobre vendedores |
| `platform_fee_tiers` | Faixas de taxas da plataforma |
| `platform_settings` | Configurações gerais da plataforma |
| `mercadopago_notifications` | Log de webhooks do MercadoPago |
| `admin_notifications` | Notificações para o painel admin |

---

*Documento gerado automaticamente com base na análise do código-fonte da plataforma.*
