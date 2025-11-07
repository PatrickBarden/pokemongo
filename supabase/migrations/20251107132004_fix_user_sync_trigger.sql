/*
  # Corrigir Trigger de Sincronização de Usuários

  1. Remove o trigger antigo
  2. Cria nova função de sincronização mais robusta
  3. Recria o trigger
*/

-- Remover trigger e função antigos
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Criar nova função de sincronização
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  user_role text;
BEGIN
  -- Determinar o role baseado no email
  IF NEW.email = 'admin@admin.com' THEN
    user_role := 'admin';
  ELSE
    user_role := 'user';
  END IF;

  -- Inserir na tabela users
  INSERT INTO public.users (
    id,
    email,
    display_name,
    role,
    reputation_score,
    created_at
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    user_role,
    100,
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  -- Inserir na tabela profiles
  INSERT INTO public.profiles (
    user_id,
    created_at
  ) VALUES (
    NEW.id,
    NOW()
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Recriar o trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Garantir que a tabela users tem índice único no email
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON public.users(email);

-- Garantir que a tabela profiles tem índice único no user_id
CREATE UNIQUE INDEX IF NOT EXISTS profiles_user_id_unique ON public.profiles(user_id);
