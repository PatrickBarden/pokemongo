# 🎮 Pokémon GO Marketplace

Plataforma de intermediação para compra e venda de produtos e serviços relacionados a Pokémon GO.

## 🚀 Tecnologias

- **Frontend**: Next.js 13.5.1 (App Router) + TypeScript
- **Estilização**: TailwindCSS + shadcn/ui
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Formulários**: React Hook Form + Zod
- **Tabelas**: TanStack Table
- **Ícones**: Lucide React

## 📋 Pré-requisitos

- Node.js 18+ instalado
- Conta no Supabase (https://app.supabase.com)
- npm ou yarn

## 🔧 Instalação

### 1. Clone o repositório

```bash
git clone <url-do-repositorio>
cd pokemongo
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure o Supabase

Siga o guia completo em **[MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)** para:
- Criar projeto no Supabase
- Executar migração do banco de dados
- Configurar variáveis de ambiente

### 4. Configure as variáveis de ambiente

```bash
cp .env.example .env.local
```

Edite `.env.local` com suas credenciais do Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anonima
SUPABASE_SERVICE_ROLE_KEY=sua-chave-service-role
```

### 5. Execute a aplicação

```bash
npm run dev
```

Acesse http://localhost:3000

## 👤 Credenciais Padrão

**Admin:**
- Email: `admin@admin.com`
- Senha: `123456`

⚠️ **Altere essas credenciais em produção!**

## 📚 Documentação

- **[DATABASE_ANALYSIS.md](./DATABASE_ANALYSIS.md)** - Análise completa do banco de dados
- **[MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)** - Guia passo a passo de migração
- **[supabase/migrations/](./supabase/migrations/)** - Scripts SQL de migração

## 🏗️ Estrutura do Projeto

```
pokemongo/
├── app/                    # App Router (Next.js 13)
│   ├── admin/             # Painel administrativo
│   ├── dashboard/         # Área do usuário
│   ├── login/             # Autenticação
│   └── signup/            # Cadastro
├── components/            # Componentes React
│   ├── ui/               # Componentes shadcn/ui
│   └── order/            # Componentes de pedidos
├── lib/                  # Utilitários
│   ├── supabase.ts       # Cliente Supabase (server)
│   ├── supabase-client.ts # Cliente Supabase (client)
│   └── database.types.ts  # Tipos TypeScript
├── server/               # Lógica de servidor
│   ├── actions/          # Server Actions
│   └── queries/          # Queries do banco
└── supabase/            # Configuração Supabase
    └── migrations/       # Migrações SQL
```

## 🎯 Funcionalidades

### Usuário
- ✅ Autenticação (login/signup)
- ✅ Dashboard com estatísticas
- ✅ Marketplace de produtos
- ✅ Sistema de pedidos
- ✅ Chat com vendedor
- ✅ Histórico de transações

### Admin
- ✅ Dashboard administrativo
- ✅ Gestão de pedidos
- ✅ Gestão de usuários
- ✅ Gestão de disputas
- ✅ Sistema de payouts
- ✅ Relatórios e métricas

## 🗄️ Banco de Dados

### Tabelas Principais

- **users** - Usuários da plataforma
- **profiles** - Perfis dos usuários
- **listings** - Produtos/serviços
- **orders** - Pedidos de compra/venda
- **order_events** - Histórico de eventos
- **messages** - Chat entre usuários
- **disputes** - Disputas
- **payouts** - Pagamentos aos vendedores
- **deliveries** - Comprovantes de entrega
- **payment_notifications** - Webhooks de pagamento
- **availabilities** - Disponibilidade de vendedores

Veja análise completa em [DATABASE_ANALYSIS.md](./DATABASE_ANALYSIS.md)

## 🔐 Segurança

- ✅ Row Level Security (RLS) em todas as tabelas
- ✅ Políticas granulares por operação
- ✅ Autenticação via Supabase Auth
- ✅ Service role apenas no backend
- ✅ Validação de dados com Zod

## 🚀 Deploy

### Vercel (Recomendado)

1. Faça push do código para GitHub
2. Conecte o repositório no Vercel
3. Configure as variáveis de ambiente
4. Deploy automático!

### Outras plataformas

O projeto é compatível com qualquer plataforma que suporte Next.js:
- Netlify
- Railway
- Render
- AWS Amplify

## 📝 Scripts Disponíveis

```bash
npm run dev          # Inicia servidor de desenvolvimento
npm run build        # Build para produção
npm run start        # Inicia servidor de produção
npm run lint         # Executa linter
npm run typecheck    # Verifica tipos TypeScript
```

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT.

## 🐛 Problemas Conhecidos

Veja [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) seção "Troubleshooting" para soluções de problemas comuns.

## 📞 Suporte

Para dúvidas ou problemas:
1. Consulte a documentação
2. Verifique os logs do Supabase
3. Abra uma issue no GitHub

---

**Desenvolvido com ❤️ para a comunidade Pokémon GO**
