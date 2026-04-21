-- Banco de questões cadastradas manualmente pelo admin

CREATE TABLE IF NOT EXISTS questions (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  disciplina      TEXT NOT NULL DEFAULT '',
  topico          TEXT NOT NULL DEFAULT '',
  banca           TEXT NOT NULL DEFAULT '',
  cargo           TEXT NOT NULL DEFAULT '',
  ano             TEXT NOT NULL DEFAULT '',
  plano           TEXT NOT NULL DEFAULT '',   -- vinculação ao concurso/plano
  tipo            TEXT NOT NULL DEFAULT 'certo_errado', -- 'certo_errado' | 'multipla_escolha'
  enunciado       TEXT NOT NULL,
  alternativas    JSONB NOT NULL DEFAULT '[]', -- [{id, label, isCorrect}]
  gabarito        TEXT NOT NULL DEFAULT '',    -- id da alternativa correta (ou 'C'/'E')
  explicacao      TEXT NOT NULL DEFAULT '',
  dificuldade     TEXT NOT NULL DEFAULT 'Media', -- 'Facil' | 'Media' | 'Dificil'
  is_public       BOOLEAN NOT NULL DEFAULT TRUE,
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para filtros comuns na tela de Questões
CREATE INDEX IF NOT EXISTS questions_disciplina_idx ON questions(disciplina);
CREATE INDEX IF NOT EXISTS questions_banca_idx      ON questions(banca);
CREATE INDEX IF NOT EXISTS questions_plano_idx      ON questions(plano);
CREATE INDEX IF NOT EXISTS questions_tipo_idx       ON questions(tipo);
CREATE INDEX IF NOT EXISTS questions_public_idx     ON questions(is_public);

-- RLS: questões públicas visíveis a todos autenticados; admin gerencia tudo
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leitura de questões públicas" ON questions;
CREATE POLICY "Leitura de questões públicas"
  ON questions FOR SELECT
  USING (is_public = TRUE);

DROP POLICY IF EXISTS "Admin gerencia questões" ON questions;
CREATE POLICY "Admin gerencia questões"
  ON questions FOR ALL
  USING (public.is_app_admin())
  WITH CHECK (public.is_app_admin());
