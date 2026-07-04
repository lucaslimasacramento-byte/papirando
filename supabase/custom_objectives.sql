-- Objetivos personalizados que os ALUNOS criam quando não acham no catálogo.
-- Sinal de demanda: o admin usa isso para saber o que falta cadastrar.
-- Pré-requisito: public.is_app_admin() (supabase/admin_rls_helpers.sql).

CREATE TABLE IF NOT EXISTS custom_objectives (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome        TEXT NOT NULL,
  tipo        TEXT NOT NULL DEFAULT 'concurso',   -- concurso | vestibular | faculdade | livre
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS custom_objectives_created_at_idx ON custom_objectives(created_at DESC);
CREATE INDEX IF NOT EXISTS custom_objectives_tipo_idx ON custom_objectives(tipo);

ALTER TABLE custom_objectives ENABLE ROW LEVEL SECURITY;

-- Aluno insere/lê/apaga os próprios.
DROP POLICY IF EXISTS "Aluno gerencia proprios objetivos personalizados" ON custom_objectives;
CREATE POLICY "Aluno gerencia proprios objetivos personalizados"
  ON custom_objectives FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admin lê tudo (para a página de demanda).
DROP POLICY IF EXISTS "Admin le todos os objetivos personalizados" ON custom_objectives;
CREATE POLICY "Admin le todos os objetivos personalizados"
  ON custom_objectives FOR SELECT
  USING (public.is_app_admin());
