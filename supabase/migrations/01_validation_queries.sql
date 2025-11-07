/*
  # Queries de Validação Pós-Migração
  
  Execute estas queries após a migração para validar que tudo está correto.
  Copie e cole no SQL Editor do Supabase.
*/

-- ============================================================================
-- 1. VERIFICAR TABELAS CRIADAS
-- ============================================================================

SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name AND table_schema = 'public') as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Resultado esperado: 11 tabelas
-- availabilities, deliveries, disputes, listings, messages, 
-- order_events, orders, payment_notifications, payouts, profiles, users

-- ============================================================================
-- 2. VERIFICAR POLÍTICAS RLS
-- ============================================================================

SELECT 
  tablename,
  COUNT(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- Resultado esperado: Todas as 11 tabelas com políticas

-- ============================================================================
-- 3. VERIFICAR ÍNDICES
-- ============================================================================

SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Resultado esperado: ~13 índices customizados

-- ============================================================================
-- 4. VERIFICAR FOREIGN KEYS
-- ============================================================================

SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- Resultado esperado: ~15 foreign keys

-- ============================================================================
-- 5. VERIFICAR TRIGGERS
-- ============================================================================

SELECT 
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- Resultado esperado: Pelo menos 1 trigger (update_orders_updated_at)

-- ============================================================================
-- 6. VERIFICAR CONSTRAINTS CHECK
-- ============================================================================

SELECT
  tc.table_name,
  cc.constraint_name,
  cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc
  ON tc.constraint_name = cc.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.constraint_type = 'CHECK'
ORDER BY tc.table_name;

-- Resultado esperado: Constraints em users.role, orders.status, payouts.method, etc.

-- ============================================================================
-- 7. VERIFICAR USUÁRIO ADMIN (se criado)
-- ============================================================================

SELECT 
  id,
  email,
  display_name,
  role,
  reputation_score,
  created_at
FROM public.users
WHERE email = 'admin@admin.com';

-- Resultado esperado: 1 linha com role = 'admin'
-- Se não retornar nada, o admin ainda não foi criado

-- ============================================================================
-- 8. TESTAR POLÍTICAS RLS - SELECT
-- ============================================================================

-- Esta query deve retornar vazio se você não estiver autenticado
-- ou retornar apenas seus dados se estiver autenticado
SELECT COUNT(*) as my_user_count
FROM public.users
WHERE id = auth.uid();

-- Resultado esperado: 0 (se não autenticado) ou 1 (se autenticado)

-- ============================================================================
-- 9. VERIFICAR EXTENSÕES
-- ============================================================================

SELECT 
  extname,
  extversion
FROM pg_extension
WHERE extname IN ('uuid-ossp', 'pgcrypto');

-- Resultado esperado: 2 linhas (uuid-ossp e pgcrypto)

-- ============================================================================
-- 10. VERIFICAR ESTRUTURA COMPLETA DE UMA TABELA
-- ============================================================================

SELECT 
  column_name,
  data_type,
  character_maximum_length,
  column_default,
  is_nullable,
  udt_name
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'orders'
ORDER BY ordinal_position;

-- Resultado esperado: 10 colunas (id, buyer_id, listing_id, seller_id, 
-- amount_total, offer_amount, platform_fee, status, created_at, updated_at)

-- ============================================================================
-- 11. RESUMO GERAL
-- ============================================================================

SELECT 
  'Tables' as object_type,
  COUNT(*) as count
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'

UNION ALL

SELECT 
  'Policies' as object_type,
  COUNT(*) as count
FROM pg_policies
WHERE schemaname = 'public'

UNION ALL

SELECT 
  'Indexes' as object_type,
  COUNT(*) as count
FROM pg_indexes
WHERE schemaname = 'public' AND indexname LIKE 'idx_%'

UNION ALL

SELECT 
  'Foreign Keys' as object_type,
  COUNT(*) as count
FROM information_schema.table_constraints
WHERE table_schema = 'public' AND constraint_type = 'FOREIGN KEY'

UNION ALL

SELECT 
  'Triggers' as object_type,
  COUNT(*) as count
FROM information_schema.triggers
WHERE trigger_schema = 'public'

ORDER BY object_type;

-- ============================================================================
-- 12. VERIFICAR PERMISSÕES RLS
-- ============================================================================

-- Verificar se RLS está habilitado em todas as tabelas
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Resultado esperado: Todas as tabelas com rls_enabled = true

-- ============================================================================
-- CONCLUSÃO
-- ============================================================================

/*
  ✅ Se todas as queries acima retornarem os resultados esperados,
     a migração foi executada com sucesso!

  ❌ Se alguma query falhar ou retornar resultados inesperados,
     revise o arquivo 00_complete_schema.sql e execute novamente.

  📝 Próximos passos:
  1. Criar usuário admin (via código ou dashboard)
  2. Testar autenticação
  3. Testar criação de dados
  4. Verificar políticas RLS em ação
*/
