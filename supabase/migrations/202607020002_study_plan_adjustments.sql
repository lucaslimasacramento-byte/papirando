-- Migration: log de ajustes do plano de estudos (Passo 3 da trilha).
-- Cada linha registra uma readaptacao deterministica (atraso, erro, conclusao
-- antecipada) aplicada a um bloco, para auditoria e para alimentar futuras
-- analises ("voce costuma adiar Direito nas sextas"). Idempotente.

CREATE TABLE IF NOT EXISTS public.study_plan_adjustments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id         uuid NOT NULL REFERENCES public.study_plans(id) ON DELETE CASCADE,
  block_id        uuid REFERENCES public.study_plan_blocks(id) ON DELETE SET NULL,
  adjustment_type text NOT NULL,
  reason          text NOT NULL DEFAULT '',
  payload         jsonb NOT NULL DEFAULT '{}'::jsonb,
  triggered_by    text NOT NULL DEFAULT 'system',
  created_at      timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT study_plan_adjustments_type_check
    CHECK (adjustment_type IN ('atraso', 'erro', 'conclusao_antecipada', 'manual', 'regen_ia')),
  CONSTRAINT study_plan_adjustments_triggered_by_check
    CHECK (triggered_by IN ('system', 'user', 'ai'))
);
CREATE INDEX IF NOT EXISTS study_plan_adjustments_user_id_idx ON public.study_plan_adjustments (user_id);
CREATE INDEX IF NOT EXISTS study_plan_adjustments_plan_id_idx ON public.study_plan_adjustments (plan_id);
ALTER TABLE public.study_plan_adjustments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "study_plan_adjustments_own_all" ON public.study_plan_adjustments;
CREATE POLICY "study_plan_adjustments_own_all"
  ON public.study_plan_adjustments FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_plan_adjustments TO authenticated;
