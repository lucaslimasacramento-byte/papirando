-- Metas semanais de estudo por disciplina

CREATE TABLE IF NOT EXISTS weekly_goals (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start  DATE NOT NULL,  -- Sempre segunda-feira da semana
  disciplina  TEXT NOT NULL,
  meta_horas  FLOAT NOT NULL DEFAULT 2.0,  -- Horas alvo na semana
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, week_start, disciplina)
);

-- Índices
CREATE INDEX IF NOT EXISTS weekly_goals_user_week_idx ON weekly_goals(user_id, week_start);

-- RLS
ALTER TABLE weekly_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuário gerencia próprias metas"
  ON weekly_goals FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
