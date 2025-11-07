/*
  # Remover Trigger e Usar Abordagem de Código

  1. Remove o trigger que está causando conflitos com RLS
  2. Simplifica as políticas RLS para permitir inserção por service_role
  3. O código da aplicação vai criar os usuários diretamente
  
  ## Mudanças
  
  - Remove trigger on_auth_user_created
  - Remove função handle_new_user
  - Simplifica políticas de inserção
*/

-- Remover trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Remover função
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Remover políticas antigas
DROP POLICY IF EXISTS "Service can insert users" ON public.users;
DROP POLICY IF EXISTS "Service can insert profiles" ON public.profiles;

-- Criar política para permitir service_role inserir usuários
CREATE POLICY "Allow service role to insert users"
  ON public.users
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Criar política para permitir service_role inserir profiles  
CREATE POLICY "Allow service role to insert profiles"
  ON public.profiles
  FOR INSERT
  TO service_role
  WITH CHECK (true);
