-- Cursos (objetivos) do aluno.
--
-- Até aqui o curso vivia SÓ no localStorage do navegador, enquanto as disciplinas e os
-- tópicos dele já ficavam no Supabase. Trocar de aparelho, abrir anônima ou limpar os dados
-- do site fazia os cursos sumirem e as disciplinas ficarem — órfãs, aparecendo no Início e
-- no Plano sem curso nenhum para explicá-las, e sem porta de saída (a exclusão de objetivo
-- casa disciplina com curso pelo nome do plano; sem o curso, não há o que casar).
--
-- Agora que a plataforma inteira se monta a partir do edital, o curso é o objeto raiz do
-- produto — e era o que estava no armazenamento mais frágil.
--
-- O curso é guardado como documento (JSONB) em vez de trinta colunas: o app sempre carrega
-- todos os do aluno de uma vez e nunca filtra por campo no SQL, e a forma muda com
-- frequência (o quadro de provas e os dados do edital entraram esta semana). Coluna por
-- campo exigiria migração a cada mudança dessas, sem nada em troca.

CREATE TABLE IF NOT EXISTS courses (
  -- O id vem do app ("curso-1758240000000"), não é UUID: cursos já existentes no navegador
  -- precisam subir mantendo o id, senão perdem o vínculo com o que o aluno já usa.
  id          TEXT NOT NULL,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dados       JSONB NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, id)
);

-- O app lê todos os cursos do aluno na abertura, em ordem de criação.
CREATE INDEX IF NOT EXISTS courses_user_created_idx ON courses(user_id, created_at DESC);

ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Aluno gerencia os proprios cursos" ON courses;
CREATE POLICY "Aluno gerencia os proprios cursos"
  ON courses FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admin lê tudo (suporte: ver o que o aluno montou sem pedir print).
-- Condicional de propósito: is_app_admin() vem de supabase/admin_rls_helpers.sql, e se esse
-- script ainda não tiver rodado no projeto o CREATE POLICY derrubaria o arquivo inteiro —
-- deixando o aluno sem a política que realmente importa, que é a de cima.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'is_app_admin'
  ) THEN
    DROP POLICY IF EXISTS "Admin le todos os cursos" ON courses;
    CREATE POLICY "Admin le todos os cursos"
      ON courses FOR SELECT
      USING (public.is_app_admin());
  ELSE
    RAISE NOTICE 'is_app_admin() nao existe: politica de admin nao criada. Rode supabase/admin_rls_helpers.sql e este arquivo de novo.';
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.courses_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS courses_touch_updated_at ON courses;
CREATE TRIGGER courses_touch_updated_at
  BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION public.courses_touch_updated_at();
