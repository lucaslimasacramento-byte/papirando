-- Metadado operacional: todo lote de importação fica revisável e publicável
-- separadamente no Admin, sem alterar a visibilidade do concurso.
alter table public.contest_templates
  add column if not exists catalog_batch text;

create index if not exists idx_contest_templates_drafts_batch_created
  on public.contest_templates (catalog_batch, created_at desc)
  where is_public = false and catalog_batch is not null;

comment on column public.contest_templates.catalog_batch is
  'Identificador humano do lote de importação para revisão e publicação manual.';
