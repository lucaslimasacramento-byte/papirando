-- Tabela de materiais de estudo (PDFs)

CREATE TABLE IF NOT EXISTS study_materials (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  disciplina   TEXT NOT NULL DEFAULT '',
  storage_path TEXT NOT NULL,  -- caminho no Supabase Storage
  file_size    BIGINT NOT NULL DEFAULT 0,
  page_count   INTEGER NOT NULL DEFAULT 0,
  last_page    INTEGER NOT NULL DEFAULT 1,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Highlights/grifos salvos por material
CREATE TABLE IF NOT EXISTS material_highlights (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  material_id  UUID NOT NULL REFERENCES study_materials(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  page_num     INTEGER NOT NULL,
  text         TEXT NOT NULL,
  color        TEXT NOT NULL DEFAULT '#FCD34D',
  note         TEXT NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Anotações por material e página
CREATE TABLE IF NOT EXISTS material_notes (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  material_id  UUID NOT NULL REFERENCES study_materials(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  page_num     INTEGER NOT NULL,
  content      TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS study_materials_user_id_idx ON study_materials(user_id);
CREATE INDEX IF NOT EXISTS material_highlights_material_id_idx ON material_highlights(material_id);
CREATE INDEX IF NOT EXISTS material_notes_material_id_idx ON material_notes(material_id);

-- RLS
ALTER TABLE study_materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuário gerencia próprios materiais"
  ON study_materials FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER TABLE material_highlights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuário gerencia próprios highlights"
  ON material_highlights FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER TABLE material_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuário gerencia próprias anotações"
  ON material_notes FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Storage bucket (execute manualmente no Supabase Dashboard ou via API)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('study-materials', 'study-materials', false);
