import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function runMigration() {
  console.log('🚀 Executando migração do sistema de moderadores...\n');

  // SQL da migração
  const migrations = [
    {
      name: 'Criar tabela moderator_permissions',
      sql: `
        CREATE TABLE IF NOT EXISTS public.moderator_permissions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
          can_view_orders BOOLEAN DEFAULT true,
          can_manage_orders BOOLEAN DEFAULT false,
          can_resolve_disputes BOOLEAN DEFAULT false,
          can_view_users BOOLEAN DEFAULT true,
          can_ban_users BOOLEAN DEFAULT false,
          can_warn_users BOOLEAN DEFAULT true,
          can_view_listings BOOLEAN DEFAULT true,
          can_moderate_listings BOOLEAN DEFAULT true,
          can_delete_listings BOOLEAN DEFAULT false,
          can_view_chats BOOLEAN DEFAULT true,
          can_respond_chats BOOLEAN DEFAULT true,
          can_view_finances BOOLEAN DEFAULT false,
          can_process_payouts BOOLEAN DEFAULT false,
          notes TEXT,
          created_by UUID REFERENCES public.users(id),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE(user_id)
        )
      `
    },
    {
      name: 'Criar tabela moderator_actions',
      sql: `
        CREATE TABLE IF NOT EXISTS public.moderator_actions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          moderator_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
          action_type TEXT NOT NULL,
          target_type TEXT NOT NULL,
          target_id UUID,
          description TEXT NOT NULL,
          metadata JSONB DEFAULT '{}',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `
    },
    {
      name: 'Criar índices',
      sql: `
        CREATE INDEX IF NOT EXISTS idx_mod_perm_user ON public.moderator_permissions(user_id);
        CREATE INDEX IF NOT EXISTS idx_mod_actions_mod ON public.moderator_actions(moderator_id);
        CREATE INDEX IF NOT EXISTS idx_mod_actions_created ON public.moderator_actions(created_at DESC)
      `
    },
    {
      name: 'Habilitar RLS',
      sql: `
        ALTER TABLE public.moderator_permissions ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.moderator_actions ENABLE ROW LEVEL SECURITY
      `
    },
    {
      name: 'Criar políticas RLS para moderator_permissions',
      sql: `
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins manage mod perms') THEN
            CREATE POLICY "Admins manage mod perms" ON public.moderator_permissions
            FOR ALL TO authenticated
            USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin'));
          END IF;
          
          IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Mods view own perms') THEN
            CREATE POLICY "Mods view own perms" ON public.moderator_permissions
            FOR SELECT TO authenticated
            USING (user_id = auth.uid());
          END IF;
        END $$
      `
    },
    {
      name: 'Criar políticas RLS para moderator_actions',
      sql: `
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins view all actions') THEN
            CREATE POLICY "Admins view all actions" ON public.moderator_actions
            FOR SELECT TO authenticated
            USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin'));
          END IF;
          
          IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Mods view own actions') THEN
            CREATE POLICY "Mods view own actions" ON public.moderator_actions
            FOR SELECT TO authenticated
            USING (moderator_id = auth.uid());
          END IF;
          
          IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Mods create own actions') THEN
            CREATE POLICY "Mods create own actions" ON public.moderator_actions
            FOR INSERT TO authenticated
            WITH CHECK (moderator_id = auth.uid());
          END IF;
        END $$
      `
    }
  ];

  // Executar via fetch diretamente na API REST do Supabase
  const executeSQL = async (sql) => {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({ sql })
    });
    return response;
  };

  for (const migration of migrations) {
    console.log(`📝 ${migration.name}...`);
    try {
      // Tentar executar via rpc (se existir função exec_sql)
      const { error } = await supabase.rpc('exec_sql', { sql: migration.sql });
      
      if (error) {
        // Se não existir a função, a migração precisa ser manual
        console.log(`   ⚠️ Precisa executar manualmente`);
      } else {
        console.log(`   ✅ OK`);
      }
    } catch (e) {
      console.log(`   ⚠️ ${e.message}`);
    }
  }

  console.log('\n📋 Se as migrações não executaram automaticamente,');
  console.log('copie o SQL abaixo e execute no Supabase Dashboard:\n');
  console.log('====== SQL EDITOR ======\n');
  
  console.log(`
-- Sistema de Moderadores
CREATE TABLE IF NOT EXISTS public.moderator_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  can_view_orders BOOLEAN DEFAULT true,
  can_manage_orders BOOLEAN DEFAULT false,
  can_resolve_disputes BOOLEAN DEFAULT false,
  can_view_users BOOLEAN DEFAULT true,
  can_ban_users BOOLEAN DEFAULT false,
  can_warn_users BOOLEAN DEFAULT true,
  can_view_listings BOOLEAN DEFAULT true,
  can_moderate_listings BOOLEAN DEFAULT true,
  can_delete_listings BOOLEAN DEFAULT false,
  can_view_chats BOOLEAN DEFAULT true,
  can_respond_chats BOOLEAN DEFAULT true,
  can_view_finances BOOLEAN DEFAULT false,
  can_process_payouts BOOLEAN DEFAULT false,
  notes TEXT,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS public.moderator_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  moderator_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mod_perm_user ON public.moderator_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_mod_actions_mod ON public.moderator_actions(moderator_id);
CREATE INDEX IF NOT EXISTS idx_mod_actions_created ON public.moderator_actions(created_at DESC);

ALTER TABLE public.moderator_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderator_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage mod perms" ON public.moderator_permissions
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin'));

CREATE POLICY "Mods view own perms" ON public.moderator_permissions
FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins view all actions" ON public.moderator_actions
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role = 'admin'));

CREATE POLICY "Mods view own actions" ON public.moderator_actions
FOR SELECT TO authenticated
USING (moderator_id = auth.uid());

CREATE POLICY "Mods create own actions" ON public.moderator_actions
FOR INSERT TO authenticated
WITH CHECK (moderator_id = auth.uid());
  `);

  console.log('\n====== FIM DO SQL ======\n');
}

runMigration().catch(console.error);
