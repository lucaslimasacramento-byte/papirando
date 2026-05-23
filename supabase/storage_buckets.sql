-- =============================================================
-- SEC-022: Storage Buckets — definição versionada
-- Criado em: 2026-05-23
-- Finalidade: documentar e permitir recriar todos os buckets
--             do Supabase Storage em caso de disaster recovery.
-- Rodar como: postgres (service role) no SQL Editor do Supabase
-- =============================================================

-- avatars: fotos de perfil dos usuários
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152,  -- 2 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public             = EXCLUDED.public,
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- contest-images: imagens dos concursos (banners, capas)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'contest-images',
  'contest-images',
  true,
  5242880,  -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public             = EXCLUDED.public,
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- contest-edital-files: editais em PDF dos concursos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'contest-edital-files',
  'contest-edital-files',
  true,
  20971520,  -- 20 MB
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public             = EXCLUDED.public,
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- vade-mecum-files: PDFs do vade mecum
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vade-mecum-files',
  'vade-mecum-files',
  true,
  52428800,  -- 50 MB
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public             = EXCLUDED.public,
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- =============================================================
-- Políticas RLS de Storage (referência — já aplicadas via painel)
-- Ver: supabase/security_hardening.sql para as policies completas
-- =============================================================
