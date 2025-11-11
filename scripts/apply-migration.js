#!/usr/bin/env node

/**
 * Script para aplicar migração de variantes automaticamente
 * Execute: node scripts/apply-migration.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ ERRO: Variáveis de ambiente não encontradas!');
  console.error('Certifique-se de que .env.local existe com:');
  console.error('  NEXT_PUBLIC_SUPABASE_URL');
  console.error('  NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const SQL_MIGRATION = `
-- Adicionar as colunas de variantes
ALTER TABLE public.listings 
ADD COLUMN IF NOT EXISTS is_shiny BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS has_costume BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS has_background BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_purified BOOLEAN DEFAULT false;

-- Atualizar valores NULL para false
UPDATE public.listings 
SET 
    is_shiny = COALESCE(is_shiny, false),
    has_costume = COALESCE(has_costume, false),
    has_background = COALESCE(has_background, false),
    is_purified = COALESCE(is_purified, false);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_listings_is_shiny ON public.listings(is_shiny) WHERE is_shiny = true;
CREATE INDEX IF NOT EXISTS idx_listings_has_costume ON public.listings(has_costume) WHERE has_costume = true;
CREATE INDEX IF NOT EXISTS idx_listings_has_background ON public.listings(has_background) WHERE has_background = true;
CREATE INDEX IF NOT EXISTS idx_listings_is_purified ON public.listings(is_purified) WHERE is_purified = true;
`;

async function applyMigration() {
  console.log('🚀 Iniciando aplicação da migração...\n');

  try {
    console.log('📡 Conectando ao Supabase...');
    console.log(`   URL: ${supabaseUrl}\n`);

    // Nota: A API do Supabase JS não permite executar SQL diretamente
    // Você precisa usar o Supabase Dashboard ou CLI
    console.log('⚠️  ATENÇÃO:');
    console.log('   O Supabase JS Client não permite executar SQL DDL diretamente.');
    console.log('   Você precisa executar a migração de uma destas formas:\n');
    
    console.log('📋 OPÇÃO 1: Supabase Dashboard (Recomendado)');
    console.log('   1. Acesse: https://app.supabase.com');
    console.log('   2. Vá em: SQL Editor → + New Query');
    console.log('   3. Cole o SQL do arquivo: EXECUTAR_AGORA.sql');
    console.log('   4. Clique em RUN\n');

    console.log('📋 OPÇÃO 2: Supabase CLI');
    console.log('   1. Instale: npm install -g supabase');
    console.log('   2. Execute: supabase db push\n');

    console.log('📋 OPÇÃO 3: Copie este SQL:');
    console.log('─'.repeat(60));
    console.log(SQL_MIGRATION);
    console.log('─'.repeat(60));

    // Verificar se as colunas já existem
    console.log('\n🔍 Verificando estrutura atual da tabela...');
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .limit(1);

    if (error) {
      console.error('❌ Erro ao verificar tabela:', error.message);
      process.exit(1);
    }

    if (data && data.length > 0) {
      const columns = Object.keys(data[0]);
      const hasVariants = [
        'is_shiny',
        'has_costume', 
        'has_background',
        'is_purified'
      ].every(col => columns.includes(col));

      if (hasVariants) {
        console.log('✅ As colunas de variantes JÁ EXISTEM!');
        console.log('   Você pode cadastrar Pokémon normalmente.');
      } else {
        console.log('❌ As colunas de variantes NÃO EXISTEM ainda.');
        console.log('   Execute o SQL acima no Supabase Dashboard.');
      }
    } else {
      console.log('⚠️  Tabela listings está vazia. Não foi possível verificar.');
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

applyMigration();
