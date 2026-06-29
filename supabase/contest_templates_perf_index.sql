-- Acelera a lista pública do catálogo (where is_public=true order by created_at desc).
-- Antes: seq scan em ~1.660 linhas. Depois: index scan.
create index if not exists idx_contest_templates_public_created
  on public.contest_templates (is_public, created_at desc);
