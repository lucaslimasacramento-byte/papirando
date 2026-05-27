-- Fontes publicas de questoes e suporte a importacao por API.
-- ENEM API: https://api.enem.dev/v1
-- OpenTrivia: https://opentdb.com/api.php
-- BrasilAPI documentada como fonte auxiliar futura, nao usada como banco de questoes.

create table if not exists public.question_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  base_url text,
  license text,
  notes text,
  created_at timestamptz default now()
);

alter table public.question_sources enable row level security;

drop policy if exists "question sources readable" on public.question_sources;
create policy "question sources readable"
  on public.question_sources for select
  using (true);

drop policy if exists "question sources admin manage" on public.question_sources;
create policy "question sources admin manage"
  on public.question_sources for all
  using (public.is_app_admin())
  with check (public.is_app_admin());

insert into public.question_sources (name, base_url, license, notes)
values
  ('enem.dev', 'https://api.enem.dev/v1', 'Public/open-source API', 'Fonte principal para questoes ENEM. Retorna ano, disciplina macro, idioma, alternativas e gabarito. Nao retorna topico granular.'),
  ('opentdb', 'https://opentdb.com/api.php', 'Free public API', 'Usar apenas como fallback/mock/gamificacao; nao e banco principal de concurso.'),
  ('brasilapi', 'https://brasilapi.com.br', 'Public API', 'Fonte auxiliar futura para dados brasileiros como feriados, CEP, CNPJ e DDD; sem importacao de questoes.')
on conflict do nothing;

alter table public.questions
  add column if not exists external_id text,
  add column if not exists source text not null default 'manual',
  add column if not exists exam text,
  add column if not exists year integer,
  add column if not exists discipline text,
  add column if not exists subject text,
  add column if not exists topic text,
  add column if not exists statement text,
  add column if not exists alternatives jsonb,
  add column if not exists correct_answer text,
  add column if not exists explanation text,
  add column if not exists image_url text,
  add column if not exists difficulty text,
  add column if not exists raw jsonb;

update public.questions
set
  source = coalesce(nullif(source, ''), 'manual'),
  discipline = coalesce(discipline, disciplina),
  statement = coalesce(statement, enunciado),
  alternatives = coalesce(alternatives, alternativas),
  correct_answer = coalesce(correct_answer, gabarito),
  explanation = coalesce(explanation, explicacao),
  difficulty = coalesce(difficulty, dificuldade),
  year = coalesce(year, case when ano ~ '^[0-9]{4}$' then ano::integer else null end)
where statement is null
   or alternatives is null
   or correct_answer is null
   or explanation is null
   or difficulty is null
   or year is null;

alter table public.questions
  alter column source set not null;

create unique index if not exists questions_source_external_id_unique
  on public.questions(source, external_id);

create index if not exists questions_source_idx on public.questions(source);
create index if not exists questions_year_idx on public.questions(year);
create index if not exists questions_discipline_import_idx on public.questions(discipline);
create index if not exists questions_subject_idx on public.questions(subject);
create index if not exists questions_topic_idx on public.questions(topic);
