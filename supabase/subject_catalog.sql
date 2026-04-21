create extension if not exists pgcrypto;

create table if not exists public.subject_catalog (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  area text not null default 'Geral',
  aliases jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subject_catalog enable row level security;

drop policy if exists "subject_catalog_read_public" on public.subject_catalog;
create policy "subject_catalog_read_public"
on public.subject_catalog
for select
to authenticated, anon
using (true);

drop policy if exists "subject_catalog_admin_write" on public.subject_catalog;
create policy "subject_catalog_admin_write"
on public.subject_catalog
for all
to authenticated
using (public.is_app_admin())
with check (public.is_app_admin());

create or replace function public.set_subject_catalog_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_subject_catalog_updated_at on public.subject_catalog;
create trigger trg_subject_catalog_updated_at
before update on public.subject_catalog
for each row
execute function public.set_subject_catalog_updated_at();

insert into public.subject_catalog (nome, area, aliases)
values
  ('Lingua Portuguesa', 'Basicas', '["Portugues","Lingua portuguesa"]'::jsonb),
  ('Matematica', 'Basicas', '["Raciocinio Matematico"]'::jsonb),
  ('Informatica', 'Basicas', '["Nocoes de Informatica","Tecnologia da Informacao"]'::jsonb),
  ('Atualidades', 'Basicas', '["Conhecimentos Gerais"]'::jsonb),
  ('Nocoes de Direito Constitucional', 'Juridicas', '["Direito Constitucional","Constitucional"]'::jsonb),
  ('Nocoes de Direito Administrativo', 'Juridicas', '["Direito Administrativo","Administrativo"]'::jsonb),
  ('Nocoes de Direito Penal', 'Juridicas', '["Direito Penal","Penal"]'::jsonb),
  ('Nocoes de Processo Penal', 'Juridicas', '["Direito Processual Penal","Processo Penal"]'::jsonb),
  ('Nocoes de Direitos Humanos', 'Juridicas', '["Direitos Humanos"]'::jsonb),
  ('Nocoes de Direito Penal Militar', 'Juridicas', '["Direito Penal Militar","Penal Militar"]'::jsonb),
  ('Nocoes de Direito Processual Penal Militar', 'Juridicas', '["Direito Processual Penal Militar","Processo Penal Militar"]'::jsonb),
  ('Legislacao Pertinente ao Policial Militar', 'Policial', '["Legislacao Militar","Legislacao Pertinente ao Policial Militar de Alagoas","Legislacao Pertinente a Atuacao do Policial Militar de Alagoas"]'::jsonb)
on conflict do nothing;
