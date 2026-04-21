-- Catálogo de audiolivros editável (JSON array) na mesma linha global de conteúdo do site.
-- Rode no SQL Editor do Supabase após redacao_site_content.sql.

alter table public.redacao_site_content
  add column if not exists audiobook_catalog_json jsonb;

comment on column public.redacao_site_content.audiobook_catalog_json is
  'Array opcional de obras { id, title, subtitle, category, accent, disciplineName, materialLabel, description, tracks: [{ id, title, durationLabel, audioUrl }] }. Se null ou [], o app usa o catálogo embutido.';
