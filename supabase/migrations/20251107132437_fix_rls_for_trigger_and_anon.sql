/*
  # Corrigir RLS para Trigger e Usuários Anônimos

  1. Permite que o trigger insira dados nas tabelas users e profiles
  2. Permite que usuários não autenticados leiam da tabela users após login
  3. Adiciona políticas para permitir inserção inicial de usuários
  
  ## Mudanças
  
  - Adiciona política para permitir que o sistema insira novos usuários
  - Adiciona política para permitir que o sistema insira novos profiles
  - Adiciona política para permitir leitura após autenticação
*/

-- Remover políticas conflitantes de inserção se existirem
DROP POLICY IF EXISTS "Service can insert users" ON public.users;
DROP POLICY IF EXISTS "Service can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.users;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.profiles;

-- Criar política para permitir inserção de usuários pelo sistema
CREATE POLICY "Service can insert users"
  ON public.users
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- Criar política para permitir inserção de profiles pelo sistema
CREATE POLICY "Service can insert profiles"
  ON public.profiles
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- Permitir leitura de usuários após autenticação (para login)
DROP POLICY IF EXISTS "Allow read after auth" ON public.users;
CREATE POLICY "Allow read after auth"
  ON public.users
  FOR SELECT
  TO authenticated, anon
  USING (true);
