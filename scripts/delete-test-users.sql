-- ============================================================================
-- SCRIPT: Excluir usuários de teste e TODOS os dados relacionados
-- Usuários:
--   1. secundariadobiel073@gmail.com (APRO)
--   2. gabedsam01@gmail.com (Gabriel Sampaio de Souza)
--   3. gabrielprincipalemail@gmail.com (Gabriel Sampaio de Souza)
--
-- Execute este script no Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================================

-- Passo 1: Identificar os IDs dos usuários
DO $$
DECLARE
  v_user_ids UUID[];
  v_listing_ids UUID[];
  v_order_ids UUID[];
  v_wallet_ids UUID[];
  v_conversation_ids UUID[];
  v_order_conversation_ids UUID[];
  v_count INT;
BEGIN
  -- Buscar IDs dos usuários pelos emails
  SELECT ARRAY_AGG(id) INTO v_user_ids
  FROM public.users
  WHERE email IN (
    'secundariadobiel073@gmail.com',
    'gabedsam01@gmail.com',
    'gabrielprincipalemail@gmail.com'
  );

  IF v_user_ids IS NULL OR array_length(v_user_ids, 1) IS NULL THEN
    RAISE NOTICE '⚠️ Nenhum usuário encontrado com esses emails.';
    RETURN;
  END IF;

  RAISE NOTICE '🔍 Encontrados % usuários para exclusão: %', array_length(v_user_ids, 1), v_user_ids;

  -- Buscar IDs de listings desses usuários
  SELECT ARRAY_AGG(id) INTO v_listing_ids
  FROM public.listings
  WHERE owner_id = ANY(v_user_ids);

  -- Buscar IDs de orders relacionadas (como buyer ou seller)
  SELECT ARRAY_AGG(id) INTO v_order_ids
  FROM public.orders
  WHERE buyer_id = ANY(v_user_ids) OR seller_id = ANY(v_user_ids);

  -- Buscar IDs de wallets
  SELECT ARRAY_AGG(id) INTO v_wallet_ids
  FROM public.wallets
  WHERE user_id = ANY(v_user_ids);

  -- Buscar IDs de conversations
  SELECT ARRAY_AGG(id) INTO v_conversation_ids
  FROM public.conversations
  WHERE participant_1 = ANY(v_user_ids) OR participant_2 = ANY(v_user_ids);

  -- Buscar IDs de order_conversations
  SELECT ARRAY_AGG(id) INTO v_order_conversation_ids
  FROM public.order_conversations
  WHERE buyer_id = ANY(v_user_ids) OR seller_id = ANY(v_user_ids);

  -- ==========================================================================
  -- Passo 2: Excluir dados em ordem segura (filhos antes de pais)
  -- ==========================================================================

  -- 2.1 Mensagens de conversas de pedidos
  IF v_order_conversation_ids IS NOT NULL THEN
    DELETE FROM public.order_conversation_messages WHERE conversation_id = ANY(v_order_conversation_ids);
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '🗑️ order_conversation_messages: % registros excluídos', v_count;

    DELETE FROM public.order_conversations WHERE id = ANY(v_order_conversation_ids);
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '🗑️ order_conversations: % registros excluídos', v_count;
  END IF;

  -- 2.2 Mensagens de chat
  IF v_conversation_ids IS NOT NULL THEN
    DELETE FROM public.chat_messages WHERE conversation_id = ANY(v_conversation_ids);
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '🗑️ chat_messages: % registros excluídos', v_count;

    DELETE FROM public.conversations WHERE id = ANY(v_conversation_ids);
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '🗑️ conversations: % registros excluídos', v_count;
  END IF;

  -- 2.3 Dados de orders
  IF v_order_ids IS NOT NULL THEN
    DELETE FROM public.payment_notifications WHERE order_id = ANY(v_order_ids);
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '🗑️ payment_notifications: % registros excluídos', v_count;

    DELETE FROM public.deliveries WHERE order_id = ANY(v_order_ids);
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '🗑️ deliveries: % registros excluídos', v_count;

    DELETE FROM public.payouts WHERE order_id = ANY(v_order_ids);
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '🗑️ payouts: % registros excluídos', v_count;

    DELETE FROM public.disputes WHERE order_id = ANY(v_order_ids);
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '🗑️ disputes: % registros excluídos', v_count;

    DELETE FROM public.messages WHERE order_id = ANY(v_order_ids);
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '🗑️ messages: % registros excluídos', v_count;

    DELETE FROM public.order_events WHERE order_id = ANY(v_order_ids);
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '🗑️ order_events: % registros excluídos', v_count;

    DELETE FROM public.orders WHERE id = ANY(v_order_ids);
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '🗑️ orders: % registros excluídos', v_count;
  END IF;

  -- 2.4 Listings e dependentes
  IF v_listing_ids IS NOT NULL THEN
    -- account_listings se existir
    BEGIN
      DELETE FROM public.account_listings WHERE listing_id = ANY(v_listing_ids);
      GET DIAGNOSTICS v_count = ROW_COUNT;
      RAISE NOTICE '🗑️ account_listings: % registros excluídos', v_count;
    EXCEPTION WHEN undefined_table THEN
      RAISE NOTICE 'ℹ️ account_listings: tabela não existe, pulando.';
    END;

    DELETE FROM public.availabilities WHERE listing_id = ANY(v_listing_ids);
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '🗑️ availabilities: % registros excluídos', v_count;

    DELETE FROM public.listings WHERE id = ANY(v_listing_ids);
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '🗑️ listings: % registros excluídos', v_count;
  END IF;

  -- 2.5 Wallet e transações
  IF v_wallet_ids IS NOT NULL THEN
    BEGIN
      DELETE FROM public.wallet_withdrawals WHERE wallet_id = ANY(v_wallet_ids);
      GET DIAGNOSTICS v_count = ROW_COUNT;
      RAISE NOTICE '🗑️ wallet_withdrawals: % registros excluídos', v_count;
    EXCEPTION WHEN undefined_table THEN NULL;
    END;

    BEGIN
      DELETE FROM public.credit_purchases WHERE wallet_id = ANY(v_wallet_ids);
      GET DIAGNOSTICS v_count = ROW_COUNT;
      RAISE NOTICE '🗑️ credit_purchases: % registros excluídos', v_count;
    EXCEPTION WHEN undefined_table THEN NULL;
    END;

    BEGIN
      DELETE FROM public.wallet_transactions WHERE wallet_id = ANY(v_wallet_ids);
      GET DIAGNOSTICS v_count = ROW_COUNT;
      RAISE NOTICE '🗑️ wallet_transactions: % registros excluídos', v_count;
    EXCEPTION WHEN undefined_table THEN NULL;
    END;

    BEGIN
      DELETE FROM public.wallets WHERE id = ANY(v_wallet_ids);
      GET DIAGNOSTICS v_count = ROW_COUNT;
      RAISE NOTICE '🗑️ wallets: % registros excluídos', v_count;
    EXCEPTION WHEN undefined_table THEN NULL;
    END;
  END IF;

  -- 2.6 Sugestões e votos
  DELETE FROM public.suggestion_votes WHERE user_id = ANY(v_user_ids);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️ suggestion_votes: % registros excluídos', v_count;

  DELETE FROM public.suggestions WHERE user_id = ANY(v_user_ids);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️ suggestions: % registros excluídos', v_count;

  -- 2.7 Denúncias
  DELETE FROM public.complaints WHERE reporter_id = ANY(v_user_ids);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️ complaints (reporter): % registros excluídos', v_count;

  UPDATE public.complaints SET reported_user_id = NULL WHERE reported_user_id = ANY(v_user_ids);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🔄 complaints (reported_user_id): % registros atualizados para NULL', v_count;

  -- 2.8 Favoritos
  BEGIN
    DELETE FROM public.favorites WHERE user_id = ANY(v_user_ids);
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '🗑️ favorites: % registros excluídos', v_count;
  EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'ℹ️ favorites: tabela não existe, pulando.';
  END;

  -- 2.9 Reviews
  BEGIN
    DELETE FROM public.reviews WHERE reviewer_id = ANY(v_user_ids) OR reviewed_id = ANY(v_user_ids);
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '🗑️ reviews: % registros excluídos', v_count;
  EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'ℹ️ reviews: tabela não existe, pulando.';
  EXCEPTION WHEN undefined_column THEN
    BEGIN
      DELETE FROM public.reviews WHERE user_id = ANY(v_user_ids);
      GET DIAGNOSTICS v_count = ROW_COUNT;
      RAISE NOTICE '🗑️ reviews: % registros excluídos', v_count;
    EXCEPTION WHEN undefined_table THEN NULL;
    EXCEPTION WHEN undefined_column THEN NULL;
    END;
  END;

  -- 2.10 Moderador (caso algum deles seja mod)
  DELETE FROM public.moderator_actions WHERE moderator_id = ANY(v_user_ids);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️ moderator_actions: % registros excluídos', v_count;

  DELETE FROM public.moderator_permissions WHERE user_id = ANY(v_user_ids);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️ moderator_permissions: % registros excluídos', v_count;

  -- 2.11 Push subscriptions
  BEGIN
    DELETE FROM public.push_subscriptions WHERE user_id = ANY(v_user_ids);
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '🗑️ push_subscriptions: % registros excluídos', v_count;
  EXCEPTION WHEN undefined_table THEN
    RAISE NOTICE 'ℹ️ push_subscriptions: tabela não existe, pulando.';
  END;

  -- 2.12 Availabilities diretas do usuário
  DELETE FROM public.availabilities WHERE user_id = ANY(v_user_ids);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️ availabilities (user): % registros excluídos', v_count;

  -- 2.13 Perfis
  DELETE FROM public.profiles WHERE user_id = ANY(v_user_ids);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️ profiles: % registros excluídos', v_count;

  -- ==========================================================================
  -- Passo 3: Excluir os usuários
  -- ==========================================================================

  -- 3.1 Excluir da tabela public.users
  DELETE FROM public.users WHERE id = ANY(v_user_ids);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️ users: % registros excluídos', v_count;

  -- 3.2 Excluir da tabela auth.users (remove login/autenticação)
  DELETE FROM auth.users WHERE id = ANY(v_user_ids);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️ auth.users: % registros excluídos', v_count;

  RAISE NOTICE '✅ CONCLUÍDO! Todos os dados dos % usuários foram excluídos.', array_length(v_user_ids, 1);
END;
$$;
