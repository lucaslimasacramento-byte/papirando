-- Migration: plano de estudos aprovado e versionado (Passo 1 da trilha de estudos).
-- Move o cronograma gerado pela IA do localStorage para o Supabase como
-- "fonte de verdade", com versionamento e blocos individuais rastreaveis.
-- Idempotente. Inclui RLS own_all + GRANTs para authenticated.

-- ── study_plans (plano aprovado, versionado) ──
CREATE TABLE IF NOT EXISTS public.study_plans (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode           text NOT NULL DEFAULT 'fixo',
  status         text NOT NULL DEFAULT 'approved',
  version        integer NOT NULL DEFAULT 1,
  meta           text NOT NULL DEFAULT '',
  provider       text NOT NULL DEFAULT '',
  model          text NOT NULL DEFAULT '',
  resumo         text NOT NULL DEFAULT '',
  dica           text NOT NULL DEFAULT '',
  prioridades    jsonb NOT NULL DEFAULT '[]'::jsonb,
  horas_totais   numeric NOT NULL DEFAULT 0,
  source_payload jsonb,
  generated_by   text NOT NULL DEFAULT 'ai',
  approved_at    timestamptz,
  created_at     timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT study_plans_mode_check CHECK (mode IN ('fixo', 'flexivel')),
  CONSTRAINT study_plans_status_check CHECK (status IN ('draft', 'approved', 'archived')),
  CONSTRAINT study_plans_generated_by_check CHECK (generated_by IN ('ai', 'user', 'system'))
);
CREATE INDEX IF NOT EXISTS study_plans_user_id_idx ON public.study_plans (user_id);
-- No maximo um plano aprovado por usuario+modo (o resto vira 'archived').
CREATE UNIQUE INDEX IF NOT EXISTS study_plans_active_per_mode_idx
  ON public.study_plans (user_id, mode) WHERE status = 'approved';
ALTER TABLE public.study_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "study_plans_own_all" ON public.study_plans;
CREATE POLICY "study_plans_own_all"
  ON public.study_plans FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_plans TO authenticated;

-- ── study_plan_blocks (blocos individuais do plano) ──
-- Aponta (via texto denormalizado) para disciplina/topico ja existentes; os
-- FKs subject_id/topic_id ficam nullable para uso futuro sem duplicar dado.
CREATE TABLE IF NOT EXISTS public.study_plan_blocks (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id       uuid NOT NULL REFERENCES public.study_plans(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dia           text NOT NULL DEFAULT '',
  horario       text NOT NULL DEFAULT '',
  disciplina    text NOT NULL DEFAULT '',
  topico        text NOT NULL DEFAULT '',
  modo          text NOT NULL DEFAULT 'Teoria',
  duracao       integer NOT NULL DEFAULT 0,
  justificativa text NOT NULL DEFAULT '',
  order_index   integer NOT NULL DEFAULT 0,
  status        text NOT NULL DEFAULT 'pending',
  subject_id    uuid,
  topic_id      uuid,
  created_at    timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT study_plan_blocks_status_check CHECK (status IN ('pending', 'done', 'skipped', 'rescheduled'))
);
CREATE INDEX IF NOT EXISTS study_plan_blocks_plan_id_idx ON public.study_plan_blocks (plan_id);
CREATE INDEX IF NOT EXISTS study_plan_blocks_user_id_idx ON public.study_plan_blocks (user_id);
ALTER TABLE public.study_plan_blocks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "study_plan_blocks_own_all" ON public.study_plan_blocks;
CREATE POLICY "study_plan_blocks_own_all"
  ON public.study_plan_blocks FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_plan_blocks TO authenticated;
