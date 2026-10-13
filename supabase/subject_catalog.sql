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

-- `sem_acento` e a chave de unicidade do catalogo: duas grafias da mesma disciplina sao a
-- mesma disciplina. Sem ela, o `on conflict` abaixo nao teria em que conflitar — foi assim
-- que o catalogo chegou a 72 linhas para ~15 disciplinas.
create or replace function public.sem_acento(texto text)
returns text
language sql
immutable
set search_path = public
as $$
  select lower(translate(
    coalesce(texto, ''),
    'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
    'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'
  ));
$$;

create unique index if not exists subject_catalog_nome_unico
  on public.subject_catalog (public.sem_acento(nome));

-- O campo `nome` e o que aparece na tela do aluno: vai em portugues correto. As formas sem
-- acento ficam como ALIAS, que e para o que elas servem — casar o que o edital escreveu de
-- qualquer jeito.
insert into public.subject_catalog (nome, area, aliases)
values
  ('Língua Portuguesa', 'Básicas', '["Português","Portugues","Lingua Portuguesa","Lingua portuguesa"]'::jsonb),
  ('Matemática', 'Básicas', '["Matematica","Raciocínio Matemático","Raciocinio Matematico"]'::jsonb),
  ('Informática', 'Básicas', '["Informatica","Noções de Informática","Nocoes de Informatica","Tecnologia da Informação","Tecnologia da Informacao"]'::jsonb),
  ('Atualidades', 'Básicas', '["Conhecimentos Gerais"]'::jsonb),
  ('Noções de Direito Constitucional', 'Jurídicas', '["Nocoes de Direito Constitucional","Direito Constitucional","Constitucional"]'::jsonb),
  ('Noções de Direito Administrativo', 'Jurídicas', '["Nocoes de Direito Administrativo","Direito Administrativo","Administrativo"]'::jsonb),
  ('Noções de Direito Penal', 'Jurídicas', '["Nocoes de Direito Penal","Direito Penal","Penal"]'::jsonb),
  ('Noções de Processo Penal', 'Jurídicas', '["Nocoes de Processo Penal","Direito Processual Penal","Processo Penal"]'::jsonb),
  ('Noções de Direitos Humanos', 'Jurídicas', '["Nocoes de Direitos Humanos","Direitos Humanos"]'::jsonb),
  ('Noções de Direito Penal Militar', 'Jurídicas', '["Nocoes de Direito Penal Militar","Direito Penal Militar","Penal Militar"]'::jsonb),
  ('Noções de Direito Processual Penal Militar', 'Jurídicas', '["Nocoes de Direito Processual Penal Militar","Direito Processual Penal Militar","Processo Penal Militar"]'::jsonb),
  ('Legislação Pertinente ao Policial Militar', 'Policial', '["Legislacao Pertinente ao Policial Militar","Legislação Militar","Legislacao Militar","Legislação Pertinente ao Policial Militar de Alagoas","Legislacao Pertinente ao Policial Militar de Alagoas","Legislacao Pertinente a Atuacao do Policial Militar de Alagoas"]'::jsonb),
  ('Biologia', 'Básicas', '[]'::jsonb),
  ('Física', 'Básicas', '["Fisica"]'::jsonb),
  ('Química', 'Básicas', '["Quimica"]'::jsonb)
on conflict (public.sem_acento(nome)) do nothing;
