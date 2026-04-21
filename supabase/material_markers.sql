-- Marcações estilo Vade Mecum (título, trecho, cor, página) por PDF do usuário

CREATE TABLE IF NOT EXISTS material_markers (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  material_id  UUID NOT NULL REFERENCES study_materials(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  page_num     INTEGER NOT NULL,
  label        TEXT NOT NULL DEFAULT '',
  excerpt      TEXT NOT NULL DEFAULT '',
  color        TEXT NOT NULL DEFAULT '#2563EB',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS material_markers_material_id_idx ON material_markers(material_id);
CREATE INDEX IF NOT EXISTS material_markers_user_id_idx ON material_markers(user_id);

ALTER TABLE material_markers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuário gerencia próprias marcações de material" ON material_markers;
CREATE POLICY "Usuário gerencia próprias marcações de material"
  ON material_markers FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
