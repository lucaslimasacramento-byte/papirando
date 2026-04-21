-- Tabela de sessões de estudo
-- Fonte de verdade para o histórico real do aluno

CREATE TABLE IF NOT EXISTS study_sessions (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  disciplina      TEXT NOT NULL DEFAULT '',
  disciplina_canonica TEXT NOT NULL DEFAULT '',
  disciplina_id   UUID,
  topico          TEXT NOT NULL DEFAULT '',
  topico_id       UUID,
  plano           TEXT NOT NULL DEFAULT 'Geral',
  tipo            TEXT NOT NULL DEFAULT 'ESTUDO',
  tempo           TEXT NOT NULL DEFAULT '00:00:00',
  acertos         INTEGER NOT NULL DEFAULT 0,
  erros           INTEGER NOT NULL DEFAULT 0,
  data            DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para queries do Dashboard
CREATE INDEX IF NOT EXISTS study_sessions_user_id_idx ON study_sessions(user_id);
CREATE INDEX IF NOT EXISTS study_sessions_data_idx ON study_sessions(data);
CREATE INDEX IF NOT EXISTS study_sessions_user_data_idx ON study_sessions(user_id, data);

-- RLS: cada usuário só vê e modifica os próprios registros
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário lê próprias sessões"
  ON study_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuário insere próprias sessões"
  ON study_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuário deleta próprias sessões"
  ON study_sessions FOR DELETE
  USING (auth.uid() = user_id);
