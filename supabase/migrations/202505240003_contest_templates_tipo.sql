-- Adiciona coluna `tipo` ao catálogo de templates de concursos
-- Valores esperados: 'concurso' (padrão), 'vestibular', 'enem'

ALTER TABLE contest_templates
  ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'concurso'
  CHECK (tipo IN ('concurso', 'vestibular', 'enem'));

-- Índice para filtrar por tipo na tela de Objetivos
CREATE INDEX IF NOT EXISTS idx_contest_templates_tipo
  ON contest_templates (tipo);
