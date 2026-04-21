alter table public.subjects
add column if not exists subject_catalog_id uuid references public.subject_catalog(id) on delete set null;

alter table public.contest_template_subjects
add column if not exists subject_catalog_id uuid references public.subject_catalog(id) on delete set null;

create index if not exists idx_subjects_subject_catalog_id
on public.subjects (subject_catalog_id);

create index if not exists idx_contest_template_subjects_subject_catalog_id
on public.contest_template_subjects (subject_catalog_id);
