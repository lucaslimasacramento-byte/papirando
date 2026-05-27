-- DRAFT ONLY — Inferido do código. Validar contra schema real do Supabase antes de aplicar.
--
-- Fontes consultadas:
-- - src/App.jsx
-- - src/lib/profileApi.js
-- - src/pages/Perfil.jsx
-- - src/pages/AdminUsuarios.jsx
-- - src/pages/Disciplinas.jsx
-- - src/components/EditarDisciplinaModal.jsx
-- - src/pages/Planejamento.jsx
-- - src/lib/flashcardsApi.js
-- - src/pages/Revisoes.jsx
-- - supabase/security_hardening.sql
-- - supabase/admin_role_bootstrap.sql
-- - supabase/onboarding.sql
-- - supabase/profile_identity_constraints.sql
-- - supabase/registration_antifraud.sql
--
-- Este arquivo consolida tabelas que existem no banco vivo, mas nao tinham
-- CREATE TABLE versionado no repo. Nao aplicar em producao sem comparar com
-- o schema real do Supabase.

create extension if not exists pgcrypto;

-- =============================================================================
-- 1. profiles
-- =============================================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade, -- App.jsx/profileApi: select/upsert por id; espelha auth.users.id
  email text, -- App.jsx upsert inicial; Perfil.jsx update de email; AdminUsuarios exibe/filtra
  nome text, -- App.jsx/profileApi/Perfil.jsx: nome do usuario
  full_name text, -- Perfil/Onboarding aceitam profile.full_name/name como fallback
  username text, -- App.jsx/profileApi/Perfil.jsx: disponibilidade e identificador publico
  celular text, -- App.jsx/profileApi/Perfil.jsx/AdminUsuarios: telefone principal
  telefone text, -- App.jsx/Perfil.jsx leem/escrevem como alias legado de celular
  avatar_url text, -- profileApi uploadAvatar e Perfil.jsx exibem foto
  cpf text, -- Perfil.jsx/OnboardingWizard: valida e consulta CPF; profile_identity_constraints.sql
  birth_date date, -- profileApi allowlist e registration_antifraud.sql
  cpf_validado_algoritmo boolean not null default false, -- registration_antifraud.sql
  email_verificado boolean not null default false, -- registration_antifraud.sql sincroniza auth.users.email_confirmed_at
  status_cadastro text not null default 'ativo', -- registration_antifraud.sql
  tentativas_cadastro integer not null default 0, -- registration_antifraud.sql
  ultimo_ip_cadastro text, -- registration_antifraud.sql
  role text not null default 'student', -- admin_role_bootstrap.sql/AdminUsuarios.jsx
  subscription_plan text not null default 'gratuito', -- AdminUsuarios.jsx/Perfil.jsx/App.jsx
  subscription_status text not null default 'trial', -- AdminUsuarios.jsx/Perfil.jsx
  max_courses integer not null default 3, -- AdminUsuarios.jsx/App.jsx/security_hardening.sql
  ranking_display_mode text not null default 'username', -- Perfil.jsx/App.jsx leem como modo username/codename
  ranking_codename text, -- App.jsx/Perfil.jsx: disponibilidade e ranking
  referral_code text, -- App.jsx/profileApi/Perfil.jsx: codigo de indicacao
  referred_by_code text, -- App.jsx/profileApi/Perfil.jsx: codigo do indicador
  referred_by_profile_id uuid references public.profiles(id) on delete set null, -- referrals.sql relaciona perfis
  onboarding_done boolean not null default false, -- onboarding.sql/OnboardingWizard.jsx
  meta_horas_semana numeric(4,1) not null default 15, -- onboarding.sql e migration cpf_unique_horas_numeric.sql
  billing jsonb not null default '{}'::jsonb, -- App.jsx monta billing no perfil local; incerto no banco vivo
  created_at timestamptz not null default timezone('utc', now()), -- registration_antifraud.sql/Perfil.jsx exibe data
  updated_at timestamptz not null default timezone('utc', now()), -- registration_antifraud.sql/OnboardingWizard.jsx atualiza
  constraint profiles_status_cadastro_check
    check (status_cadastro in ('pendente', 'ativo', 'bloqueado', 'suspeito')),
  constraint profiles_ranking_display_mode_check
    check (ranking_display_mode in ('username', 'codename'))
);

create unique index if not exists profiles_username_unique
  on public.profiles (lower(username))
  where username is not null and btrim(username) <> '';

create unique index if not exists profiles_cpf_unique
  on public.profiles (cpf)
  where cpf is not null and btrim(cpf) <> '';

create unique index if not exists profiles_ranking_codename_unique
  on public.profiles (lower(ranking_codename))
  where ranking_codename is not null and btrim(ranking_codename) <> '';

create unique index if not exists profiles_referral_code_unique
  on public.profiles (upper(referral_code))
  where referral_code is not null and btrim(referral_code) <> '';

create index if not exists profiles_referred_by_profile_id_idx
  on public.profiles (referred_by_profile_id);

alter table public.profiles enable row level security;

drop policy if exists "profiles_own_select" on public.profiles;
create policy "profiles_own_select"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "profiles_own_insert" on public.profiles;
create policy "profiles_own_insert"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "profiles_own_update" on public.profiles;
create policy "profiles_own_update"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "profiles_admin_select" on public.profiles;
create policy "profiles_admin_select"
on public.profiles
for select
to authenticated
using (public.is_app_admin());

drop policy if exists "profiles_admin_update" on public.profiles;
create policy "profiles_admin_update"
on public.profiles
for update
to authenticated
using (public.is_app_admin())
with check (public.is_app_admin());

-- =============================================================================
-- 2. subjects
-- =============================================================================

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(), -- App.jsx/Disciplinas.jsx: id da disciplina
  user_id uuid not null references auth.users(id) on delete cascade, -- App.jsx/EditarDisciplinaModal.jsx insert e RLS
  nome text not null, -- App.jsx/Disciplinas.jsx/EditarDisciplinaModal.jsx
  plano text not null default 'Geral', -- App.jsx/EditarDisciplinaModal.jsx vincula ao curso/plano
  cor text not null default '#1e3a5f', -- App.jsx/EditarDisciplinaModal.jsx cor da disciplina
  percentual integer not null default 0, -- App.jsx/EditarDisciplinaModal.jsx atualiza progresso
  tempo_total_min integer not null default 0, -- App.jsx/EditarDisciplinaModal.jsx soma tempo estudado
  subject_catalog_id uuid references public.subject_catalog(id) on delete set null, -- subject_catalog_links.sql/App.jsx tenta inserir com fallback
  created_at timestamptz not null default timezone('utc', now()), -- Disciplinas.jsx ordena por created_at
  updated_at timestamptz not null default timezone('utc', now()) -- auditoria inferida por padrao do app
);

create index if not exists subjects_user_id_idx
  on public.subjects (user_id);

create index if not exists subjects_subject_catalog_id_idx
  on public.subjects (subject_catalog_id);

alter table public.subjects enable row level security;

drop policy if exists "subjects_own_all" on public.subjects;
create policy "subjects_own_all"
on public.subjects
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- =============================================================================
-- 3. topics
-- =============================================================================

create table if not exists public.topics (
  id uuid primary key default gen_random_uuid(), -- App.jsx/EditarDisciplinaModal.jsx: id do topico
  subject_id uuid not null references public.subjects(id) on delete cascade, -- App.jsx/EditarDisciplinaModal.jsx FK para disciplina
  nome text not null, -- App.jsx/Disciplinas.jsx/EditarDisciplinaModal.jsx
  ordem integer not null default 1, -- Disciplinas.jsx ordena; App.jsx/EditarDisciplinaModal.jsx grava
  concluido boolean not null default false, -- App.jsx/EditarDisciplinaModal.jsx marca conclusao
  acertos integer not null default 0, -- App.jsx/EditarDisciplinaModal.jsx/Revisoes integra desempenho
  erros integer not null default 0, -- App.jsx/EditarDisciplinaModal.jsx/Revisoes integra desempenho
  percentual integer not null default 0, -- App.jsx/EditarDisciplinaModal.jsx calcula aproveitamento
  data_conclusao date, -- App.jsx/EditarDisciplinaModal.jsx grava YYYY-MM-DD ao concluir
  created_at timestamptz not null default timezone('utc', now()), -- auditoria inferida por padrao
  updated_at timestamptz not null default timezone('utc', now()) -- auditoria inferida por padrao
);

create index if not exists topics_subject_id_idx
  on public.topics (subject_id);

create index if not exists topics_subject_ordem_idx
  on public.topics (subject_id, ordem);

alter table public.topics enable row level security;

drop policy if exists "topics_own_all" on public.topics;
create policy "topics_own_all"
on public.topics
for all
to authenticated
using (
  exists (
    select 1
    from public.subjects s
    where s.id = topics.subject_id
      and s.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.subjects s
    where s.id = topics.subject_id
      and s.user_id = auth.uid()
  )
);

-- =============================================================================
-- 4. calendar_reminders
-- =============================================================================

create table if not exists public.calendar_reminders (
  id uuid primary key default gen_random_uuid(), -- App.jsx upsert/insert/delete por id
  user_id uuid not null references auth.users(id) on delete cascade, -- App.jsx payload e RLS
  titulo text not null, -- App.jsx payload: normalized.title/reminder.title
  descricao text not null default '', -- App.jsx payload: description/text
  tipo text not null default 'lembrete', -- App.jsx payload: reminder type
  data text not null, -- App.jsx payload e order; formato YYYY-MM-DD no cliente
  hora text not null default '', -- App.jsx payload; formato HH:MM ou vazio
  contest_slug text not null default '', -- App.jsx payload: contestSlug/contestId
  disciplina text not null default '', -- App.jsx payload: disciplina relacionada
  is_done boolean not null default false, -- App.jsx/Lembretes usam flag normalizada quando existir
  created_at timestamptz not null default timezone('utc', now()), -- auditoria inferida por padrao
  updated_at timestamptz not null default timezone('utc', now()) -- auditoria inferida por padrao
);

create index if not exists calendar_reminders_user_id_idx
  on public.calendar_reminders (user_id);

create index if not exists calendar_reminders_user_data_idx
  on public.calendar_reminders (user_id, data);

alter table public.calendar_reminders enable row level security;

drop policy if exists "calendar_reminders_own_all" on public.calendar_reminders;
create policy "calendar_reminders_own_all"
on public.calendar_reminders
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- =============================================================================
-- 5. weekly_availability
-- =============================================================================

create table if not exists public.weekly_availability (
  id uuid primary key default gen_random_uuid(), -- Planejamento.jsx select/delete/insert
  user_id uuid not null references auth.users(id) on delete cascade, -- Planejamento.jsx payload e RLS
  dia_semana smallint not null, -- Planejamento.jsx mapWeekdayIdToNumber()
  hora_inicio text not null default '08:00', -- Planejamento.jsx payload fixo
  hora_fim text not null default '12:00', -- Planejamento.jsx payload calculado por minutesToTimeString()
  created_at timestamptz not null default timezone('utc', now()), -- auditoria inferida por padrao
  updated_at timestamptz not null default timezone('utc', now()), -- auditoria inferida por padrao
  constraint weekly_availability_dia_semana_check check (dia_semana between 0 and 6)
);

create index if not exists weekly_availability_user_id_idx
  on public.weekly_availability (user_id);

create index if not exists weekly_availability_user_day_idx
  on public.weekly_availability (user_id, dia_semana);

alter table public.weekly_availability enable row level security;

drop policy if exists "weekly_availability_own_all" on public.weekly_availability;
create policy "weekly_availability_own_all"
on public.weekly_availability
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- =============================================================================
-- 6. flashcard_reviews
-- =============================================================================

create table if not exists public.flashcard_reviews (
  id uuid primary key default gen_random_uuid(), -- flashcardsApi.js select id
  user_id uuid not null references auth.users(id) on delete cascade, -- flashcardsApi.js insert e RLS
  deck_id uuid not null references public.flashcard_decks(id) on delete cascade, -- flashcardsApi.js/Revisoes.jsx agregam por deck
  card_id uuid not null references public.flashcard_cards(id) on delete cascade, -- flashcardsApi.js insert a partir do card revisado
  rating smallint not null, -- flashcardsApi.js insert rating FSRS 1..4
  reviewed_at timestamptz not null default timezone('utc', now()), -- flashcardsApi.js grava new Date().toISOString()
  created_at timestamptz not null default timezone('utc', now()), -- auditoria inferida por padrao
  constraint flashcard_reviews_rating_check check (rating between 1 and 4)
);

create index if not exists flashcard_reviews_user_id_idx
  on public.flashcard_reviews (user_id);

create index if not exists flashcard_reviews_deck_id_idx
  on public.flashcard_reviews (deck_id);

create index if not exists flashcard_reviews_card_id_idx
  on public.flashcard_reviews (card_id);

create index if not exists flashcard_reviews_user_deck_idx
  on public.flashcard_reviews (user_id, deck_id);

alter table public.flashcard_reviews enable row level security;

drop policy if exists "flashcard_reviews_own_all" on public.flashcard_reviews;
create policy "flashcard_reviews_own_all"
on public.flashcard_reviews
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- =============================================================================
-- Notas finais: colunas incertas / validar contra o banco vivo
-- =============================================================================
--
-- profiles.telefone:
--   O frontend le como fallback de celular e App.jsx monta em profilePatch, mas
--   profileApi.js nao deixa "telefone" passar no PROFILE_ALLOWED_PATCH_KEYS.
--   Mantido como alias legado por compatibilidade.
--
-- profiles.full_name:
--   Onboarding/Perfil aceitam full_name/name como fallback. Nao apareceu escrita
--   direta nas chamadas Supabase consultadas. Validar se existe no banco vivo.
--
-- profiles.ranking_display_mode:
--   Perfil/App leem e tentam salvar via updateProfile(), mas profileApi.js hoje
--   filtra a chave. Mantido porque a UI depende dele para preferencia de ranking.
--
-- profiles.billing:
--   App.jsx monta billing no patch local, mas profileApi.js filtra antes de
--   persistir. Mantido como jsonb incerto; remover se o banco vivo nao tiver.
--
-- profiles.subscription_plan/subscription_status/max_courses:
--   AdminUsuarios.jsx atualiza e security_hardening.sql protege. Confirmar defaults
--   reais por plano antes de aplicar.
--
-- subjects.subject_catalog_id:
--   App.jsx/EditarDisciplinaModal.jsx tentam inserir e fazem retry sem a coluna em
--   caso de erro. FK assumida para public.subject_catalog(id).
--
-- topics.data_conclusao:
--   O cliente envia string YYYY-MM-DD. Draft usa DATE; mudar para TEXT se o schema
--   vivo estiver armazenando como texto.
--
-- calendar_reminders.data/hora:
--   O cliente trata como strings. Draft usa TEXT para evitar cast inesperado.
--
-- weekly_availability.hora_inicio/hora_fim:
--   O cliente envia strings HH:MM. Draft usa TEXT; TIME tambem seria plausivel,
--   mas exigiria validar conversoes.
--
-- flashcard_reviews:
--   Apenas id/deck_id sao selecionados e user_id/deck_id/card_id/rating/reviewed_at
--   sao inseridos. Qualquer coluna extra do banco vivo deve ser comparada antes.
