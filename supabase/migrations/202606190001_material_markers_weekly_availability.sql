-- Migration: cria material_markers e weekly_availability (faltavam em produção).
-- Inclui os GRANTs para authenticated (os arquivos originais não tinham → davam 403).
-- Idempotente.

-- ── material_markers (marcadores do PDF em Materiais) ──
CREATE TABLE IF NOT EXISTS public.material_markers (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  material_id  UUID NOT NULL REFERENCES public.study_materials(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  page_num     INTEGER NOT NULL,
  label        TEXT NOT NULL DEFAULT '',
  excerpt      TEXT NOT NULL DEFAULT '',
  color        TEXT NOT NULL DEFAULT '#2563EB',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS material_markers_material_id_idx ON public.material_markers(material_id);
CREATE INDEX IF NOT EXISTS material_markers_user_id_idx ON public.material_markers(user_id);
ALTER TABLE public.material_markers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "material_markers_own_all" ON public.material_markers;
CREATE POLICY "material_markers_own_all"
  ON public.material_markers FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.material_markers TO authenticated;

-- ── weekly_availability (disponibilidade semanal no Planejamento) ──
CREATE TABLE IF NOT EXISTS public.weekly_availability (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dia_semana   smallint NOT NULL,
  hora_inicio  text NOT NULL DEFAULT '08:00',
  hora_fim     text NOT NULL DEFAULT '12:00',
  created_at   timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at   timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT weekly_availability_dia_semana_check CHECK (dia_semana BETWEEN 0 AND 6)
);
CREATE INDEX IF NOT EXISTS weekly_availability_user_id_idx ON public.weekly_availability (user_id);
CREATE INDEX IF NOT EXISTS weekly_availability_user_day_idx ON public.weekly_availability (user_id, dia_semana);
ALTER TABLE public.weekly_availability ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "weekly_availability_own_all" ON public.weekly_availability;
CREATE POLICY "weekly_availability_own_all"
  ON public.weekly_availability FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.weekly_availability TO authenticated;
