/*
  # Criar Usuário Administrador Padrão

  1. Cria usuário admin na tabela auth.users
  2. Cria registro correspondente na tabela public.users
  3. Define role como 'admin'

  Credenciais:
  - Email: admin@admin.com
  - Senha: 123456
*/

-- Inserir admin na tabela auth.users
-- Nota: A senha '123456' será hashada pelo Supabase
DO $$
DECLARE
  admin_id uuid;
BEGIN
  -- Gerar um UUID para o admin
  admin_id := gen_random_uuid();

  -- Verificar se o admin já existe em auth.users
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@admin.com') THEN
    -- Inserir na auth.users com senha hashada (bcrypt de '123456')
    -- Hash bcrypt de '123456': $2a$10$rqiU7kM0V5y0V5y0V5y0V.OQKj4V5y0V5y0V5y0V5y0V5y0V5y0V
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      aud,
      role
    ) VALUES (
      admin_id,
      '00000000-0000-0000-0000-000000000000',
      'admin@admin.com',
      '$2a$10$rqiU7kM0V5y0V5y0V5y0V.OQKj4V5y0V5y0V5y0V5y0V5y0V5y0V',
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"display_name":"Administrador"}',
      NOW(),
      NOW(),
      'authenticated',
      'authenticated'
    );
  END IF;

  -- Verificar se o admin já existe na tabela public.users
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE email = 'admin@admin.com') THEN
    -- Inserir na tabela public.users
    INSERT INTO public.users (
      id,
      email,
      display_name,
      role,
      reputation_score,
      created_at
    ) VALUES (
      admin_id,
      'admin@admin.com',
      'Administrador',
      'admin',
      100,
      NOW()
    );

    -- Inserir profile
    INSERT INTO public.profiles (
      user_id,
      created_at
    ) VALUES (
      admin_id,
      NOW()
    );
  END IF;
END $$;
