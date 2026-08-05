create extension if not exists pgcrypto;

create table if not exists public.contest_templates (
  id uuid primary key default gen_random_uuid(),
  slug text unique,
  nome text not null,
  plano text not null,
  concurso text not null,
  area text default 'Geral',
  cargo text,
  banca text,
  salario text,
  inscricao_valor text,
  escolaridade text,
  vagas text,
  lotacao text,
  etapas text,
  etapas_tags jsonb not null default '[]'::jsonb,
  taf_itens jsonb not null default '[]'::jsonb,
  cor text default '#2563EB',
  status text not null default 'ativo',
  status_concurso text default 'em_analise',
  prova_data date,
  edital_url text,
  imagem_url text,
  catalog_batch text,
  origem text not null default 'catalogo',
  descricao text,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.contest_templates add column if not exists cargo text;
alter table public.contest_templates add column if not exists area text default 'Geral';
alter table public.contest_templates add column if not exists status_concurso text default 'em_analise';
alter table public.contest_templates add column if not exists prova_data date;
alter table public.contest_templates add column if not exists edital_url text;
alter table public.contest_templates add column if not exists imagem_url text;
alter table public.contest_templates add column if not exists catalog_batch text;
alter table public.contest_templates add column if not exists salario text;
alter table public.contest_templates add column if not exists inscricao_valor text;
alter table public.contest_templates add column if not exists escolaridade text;
alter table public.contest_templates add column if not exists vagas text;
alter table public.contest_templates add column if not exists lotacao text;
alter table public.contest_templates add column if not exists etapas text;
alter table public.contest_templates add column if not exists etapas_tags jsonb not null default '[]'::jsonb;
alter table public.contest_templates add column if not exists taf_itens jsonb not null default '[]'::jsonb;

create table if not exists public.contest_template_subjects (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.contest_templates(id) on delete cascade,
  nome text not null,
  cor text,
  ordem integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.contest_template_topics (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.contest_template_subjects(id) on delete cascade,
  nome text not null,
  ordem integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.contest_templates enable row level security;
alter table public.contest_template_subjects enable row level security;
alter table public.contest_template_topics enable row level security;

insert into storage.buckets (id, name, public)
values
  ('contest-images', 'contest-images', true),
  ('contest-edital-files', 'contest-edital-files', true)
on conflict (id) do update
set public = excluded.public;

drop policy if exists "contest_templates_read_public" on public.contest_templates;
create policy "contest_templates_read_public"
on public.contest_templates
for select
to authenticated, anon
using (is_public = true);

drop policy if exists "contest_template_subjects_read_public" on public.contest_template_subjects;
create policy "contest_template_subjects_read_public"
on public.contest_template_subjects
for select
to authenticated, anon
using (
  exists (
    select 1
    from public.contest_templates template
    where template.id = contest_template_subjects.template_id
      and template.is_public = true
  )
);

drop policy if exists "contest_template_topics_read_public" on public.contest_template_topics;
create policy "contest_template_topics_read_public"
on public.contest_template_topics
for select
to authenticated, anon
using (
  exists (
    select 1
    from public.contest_template_subjects subject
    join public.contest_templates template on template.id = subject.template_id
    where subject.id = contest_template_topics.subject_id
      and template.is_public = true
  )
);

drop policy if exists "contest_templates_admin_write" on public.contest_templates;
create policy "contest_templates_admin_write"
on public.contest_templates
for all
to authenticated
using (public.is_app_admin())
with check (public.is_app_admin());

drop policy if exists "contest_template_subjects_admin_write" on public.contest_template_subjects;
create policy "contest_template_subjects_admin_write"
on public.contest_template_subjects
for all
to authenticated
using (public.is_app_admin())
with check (public.is_app_admin());

drop policy if exists "contest_template_topics_admin_write" on public.contest_template_topics;
create policy "contest_template_topics_admin_write"
on public.contest_template_topics
for all
to authenticated
using (public.is_app_admin())
with check (public.is_app_admin());

drop policy if exists "contest_storage_public_read" on storage.objects;
create policy "contest_storage_public_read"
on storage.objects
for select
to public
using (bucket_id in ('contest-images', 'contest-edital-files'));

drop policy if exists "contest_storage_admin_upload" on storage.objects;
create policy "contest_storage_admin_upload"
on storage.objects
for insert
to authenticated
with check (
  bucket_id in ('contest-images', 'contest-edital-files')
  and public.is_app_admin()
);

drop policy if exists "contest_storage_admin_update" on storage.objects;
create policy "contest_storage_admin_update"
on storage.objects
for update
to authenticated
using (
  bucket_id in ('contest-images', 'contest-edital-files')
  and public.is_app_admin()
)
with check (
  bucket_id in ('contest-images', 'contest-edital-files')
  and public.is_app_admin()
);

drop policy if exists "contest_storage_admin_delete" on storage.objects;
create policy "contest_storage_admin_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id in ('contest-images', 'contest-edital-files')
  and public.is_app_admin()
);

create or replace function public.admin_delete_contest_template(
  p_id uuid default null,
  p_slug text default null
)
returns table (
  deleted_id uuid,
  deleted_slug text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_app_admin() then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;

  return query
  delete from public.contest_templates ct
  where (p_id is not null and ct.id = p_id)
     or (p_slug is not null and ct.slug = p_slug)
  returning ct.id, ct.slug;
end;
$$;

grant execute on function public.admin_delete_contest_template(uuid, text) to authenticated;

insert into public.contest_templates (slug, nome, plano, concurso, area, cargo, banca, salario, inscricao_valor, escolaridade, vagas, lotacao, etapas, etapas_tags, taf_itens, cor, origem, descricao, status_concurso, prova_data)
values
  (
    'pmal-oficial-2026',
    'PMAL - Oficial (2026)',
    'PMAL - Oficial',
    'Policia Militar do Estado de Alagoas (PMAL)',
    'Policial',
    'Curso de Formacao de Oficiais',
    'Cebraspe',
    'R$ 8.099,94',
    'R$ 200,00',
    'Nivel superior',
    '60 vagas',
    'Alagoas',
    'Prova objetiva, prova discursiva, TAF e investigacao social',
    '["prova_objetiva","prova_discursiva","taf","investigacao_social","exames_medicos","toxicologico"]'::jsonb,
    '["Corrida","Barra fixa","Abdominal","Natacao"]'::jsonb,
    '#1D4ED8',
    'catalogo',
    'Curso base do CFO da PMAL com disciplinas principais do edital de 2026.',
    'confirmado',
    '2026-07-19'
  ),
  (
    'pmal-praca-2026',
    'PMAL - Praca (2026)',
    'PMAL - Praca',
    'Policia Militar do Estado de Alagoas (PMAL)',
    'Policial',
    'Curso de Formacao de Pracas',
    'Cebraspe',
    'R$ 5.516,71',
    'R$ 150,00',
    'Nivel medio',
    '500 vagas + CR',
    'Alagoas',
    'Prova objetiva, TAF, avaliacao psicologica e investigacao social',
    '["prova_objetiva","taf","avaliacao_psicologica","investigacao_social","exames_medicos","toxicologico"]'::jsonb,
    '["Corrida","Barra fixa","Abdominal"]'::jsonb,
    '#0F766E',
    'catalogo',
    'Curso base do CFP da PMAL com disciplinas principais do edital de 2026.',
    'confirmado',
    '2026-07-19'
  )
on conflict (slug) do update
set
  nome = excluded.nome,
  plano = excluded.plano,
  concurso = excluded.concurso,
  area = excluded.area,
  cargo = excluded.cargo,
  banca = excluded.banca,
  salario = excluded.salario,
  inscricao_valor = excluded.inscricao_valor,
  escolaridade = excluded.escolaridade,
  vagas = excluded.vagas,
  lotacao = excluded.lotacao,
  etapas = excluded.etapas,
  etapas_tags = excluded.etapas_tags,
  taf_itens = excluded.taf_itens,
  cor = excluded.cor,
  descricao = excluded.descricao,
  status_concurso = excluded.status_concurso,
  prova_data = excluded.prova_data,
  updated_at = now();

with templates as (
  select id, slug
  from public.contest_templates
  where slug in ('pmal-oficial-2026', 'pmal-praca-2026')
)
insert into public.contest_template_subjects (template_id, nome, ordem)
select templates.id, data.nome, data.ordem
from templates
join (
  values
    ('pmal-oficial-2026', 'Lingua Portuguesa', 0),
    ('pmal-oficial-2026', 'Biologia', 1),
    ('pmal-oficial-2026', 'Fisica', 2),
    ('pmal-oficial-2026', 'Quimica', 3),
    ('pmal-oficial-2026', 'Matematica', 4),
    ('pmal-oficial-2026', 'Legislacao Pertinente a Atuacao do Policial Militar de Alagoas', 5),
    ('pmal-oficial-2026', 'Nocoes de Direito Penal', 6),
    ('pmal-oficial-2026', 'Nocoes de Direitos Humanos', 7),
    ('pmal-oficial-2026', 'Nocoes de Processo Penal', 8),
    ('pmal-oficial-2026', 'Direito Penal Militar', 9),
    ('pmal-oficial-2026', 'Direito Processual Penal Militar', 10),
    ('pmal-oficial-2026', 'Nocoes de Direito Constitucional', 11),
    ('pmal-oficial-2026', 'Nocoes de Direito Administrativo', 12),
    ('pmal-praca-2026', 'Legislacao Pertinente ao Policial Militar de Alagoas', 0),
    ('pmal-praca-2026', 'Nocoes de Direito Administrativo', 1),
    ('pmal-praca-2026', 'Nocoes de Direito Constitucional', 2),
    ('pmal-praca-2026', 'Nocoes de Direito Processual Penal', 3),
    ('pmal-praca-2026', 'Nocoes de Direito Penal Militar', 4),
    ('pmal-praca-2026', 'Nocoes de Direito Processual Penal Militar', 5),
    ('pmal-praca-2026', 'Nocoes de Direitos Humanos', 6)
) as data(slug, nome, ordem) on data.slug = templates.slug
where not exists (
  select 1
  from public.contest_template_subjects existing
  where existing.template_id = templates.id
    and existing.nome = data.nome
);
