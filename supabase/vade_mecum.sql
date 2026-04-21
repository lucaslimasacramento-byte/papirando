create extension if not exists pgcrypto;

create table if not exists public.vade_mecum_documents (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  edition text,
  source text,
  pdf_url text not null,
  storage_path text,
  section_page_map jsonb not null default '{}'::jsonb,
  updated_at_label text,
  is_active boolean not null default true,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.vade_mecum_documents add column if not exists storage_path text;
alter table public.vade_mecum_documents add column if not exists section_page_map jsonb not null default '{}'::jsonb;
alter table public.vade_mecum_documents add column if not exists updated_at_label text;
alter table public.vade_mecum_documents add column if not exists is_active boolean not null default true;
alter table public.vade_mecum_documents add column if not exists uploaded_by uuid references auth.users(id) on delete set null;

create table if not exists public.vade_mecum_user_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  document_id uuid references public.vade_mecum_documents(id) on delete set null,
  selected_section text,
  current_page integer not null default 1,
  section_states jsonb not null default '{}'::jsonb,
  markers jsonb not null default '[]'::jsonb,
  search_history jsonb not null default '[]'::jsonb,
  last_pdf_search text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.vade_mecum_user_states add column if not exists document_id uuid references public.vade_mecum_documents(id) on delete set null;
alter table public.vade_mecum_user_states add column if not exists selected_section text;
alter table public.vade_mecum_user_states add column if not exists current_page integer not null default 1;
alter table public.vade_mecum_user_states add column if not exists section_states jsonb not null default '{}'::jsonb;
alter table public.vade_mecum_user_states add column if not exists markers jsonb not null default '[]'::jsonb;
alter table public.vade_mecum_user_states add column if not exists search_history jsonb not null default '[]'::jsonb;
alter table public.vade_mecum_user_states add column if not exists last_pdf_search text not null default '';

alter table public.vade_mecum_documents enable row level security;
alter table public.vade_mecum_user_states enable row level security;

insert into storage.buckets (id, name, public)
values ('vade-mecum-files', 'vade-mecum-files', true)
on conflict (id) do update
set public = excluded.public;

drop policy if exists "vade_mecum_documents_public_read" on public.vade_mecum_documents;
create policy "vade_mecum_documents_public_read"
on public.vade_mecum_documents
for select
to authenticated, anon
using (is_active = true);

drop policy if exists "vade_mecum_documents_admin_write" on public.vade_mecum_documents;
create policy "vade_mecum_documents_admin_write"
on public.vade_mecum_documents
for all
to authenticated
using (public.is_app_admin())
with check (public.is_app_admin());

drop policy if exists "vade_mecum_user_states_own_read" on public.vade_mecum_user_states;
create policy "vade_mecum_user_states_own_read"
on public.vade_mecum_user_states
for select
to authenticated
using (auth.uid() = user_id or public.is_app_admin());

drop policy if exists "vade_mecum_user_states_own_write" on public.vade_mecum_user_states;
create policy "vade_mecum_user_states_own_write"
on public.vade_mecum_user_states
for all
to authenticated
using (auth.uid() = user_id or public.is_app_admin())
with check (auth.uid() = user_id or public.is_app_admin());

drop policy if exists "vade_mecum_storage_public_read" on storage.objects;
create policy "vade_mecum_storage_public_read"
on storage.objects
for select
to public
using (bucket_id = 'vade-mecum-files');

drop policy if exists "vade_mecum_storage_admin_insert" on storage.objects;
create policy "vade_mecum_storage_admin_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'vade-mecum-files'
  and public.is_app_admin()
);

drop policy if exists "vade_mecum_storage_admin_update" on storage.objects;
create policy "vade_mecum_storage_admin_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'vade-mecum-files'
  and public.is_app_admin()
)
with check (
  bucket_id = 'vade-mecum-files'
  and public.is_app_admin()
);

drop policy if exists "vade_mecum_storage_admin_delete" on storage.objects;
create policy "vade_mecum_storage_admin_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'vade-mecum-files'
  and public.is_app_admin()
);

insert into public.vade_mecum_documents (
  slug,
  title,
  edition,
  source,
  pdf_url,
  storage_path,
  section_page_map,
  updated_at_label,
  is_active
)
values (
  'vade-mecum-oficial',
  'Vade Mecum do Senado Federal',
  '2a edicao',
  'Senado Federal',
  '/assets/docs/vade-mecum-senado-federal-2ed.pdf',
  '',
  '{
    "Apresentacao": 1,
    "Constituicao Federal": 9,
    "Lei de Introducao as Normas do Direito Brasileiro": 92,
    "Codigo Civil": 101,
    "Codigo de Processo Civil": 302,
    "Codigo Penal e Contravencoes Penais": 533,
    "Codigo de Processo Penal": 641,
    "Codigo Tributario Nacional": 761,
    "Codigo de Defesa do Consumidor": 828,
    "Codigo Eleitoral": 862,
    "Codigo Florestal": 928,
    "Consolidacao das Leis do Trabalho": 1006,
    "Leis especiais": 1174,
    "Legislacao administrativa": 1290,
    "Sumulas e informativos": 1360
  }'::jsonb,
  '01/04/2026',
  true
)
on conflict (slug) do update
set
  title = excluded.title,
  edition = excluded.edition,
  source = excluded.source,
  updated_at_label = excluded.updated_at_label,
  section_page_map = excluded.section_page_map,
  is_active = true,
  updated_at = now();
