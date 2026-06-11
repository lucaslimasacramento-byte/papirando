-- ============================================================================
-- TABELAS FALTANTES EM PRODUÇÃO — detectadas na auditoria de 2026-06-11
-- Rodar este arquivo INTEIRO no Supabase SQL Editor (uma vez só; é idempotente).
--
-- O que estava quebrado sem isso:
--   1. essay_submissions     → Redações não salvam ("Erro ao carregar redações")
--   2. flashcard_reviews     → REVISAR UM FLASHCARD QUEBRA (submitReview lança)
--   3. flashcard_deck_progress → progresso do deck nunca atualiza
-- ============================================================================

create extension if not exists pgcrypto;

-- ============================================================================
-- 1. essay_submissions (Redações) + bucket de uploads
-- ============================================================================

create table if not exists public.essay_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  banca text not null default 'CESPE / CEBRASPE',
  tema text not null default '',
  status text not null default 'draft',
  input_mode text not null default 'text',
  text text not null default '',
  original_text text not null default '',
  transcribed_text text not null default '',
  attachment_url text not null default '',
  attachment_path text not null default '',
  attachment_name text not null default '',
  attachment_type text not null default '',
  correction jsonb,
  score numeric(4,1) not null default 0,
  word_count integer not null default 0,
  paragraph_count integer not null default 0,
  line_count integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  corrected_at timestamptz
);

create index if not exists essay_submissions_user_id_idx
  on public.essay_submissions (user_id, updated_at desc);

alter table public.essay_submissions enable row level security;

drop policy if exists "essay_submissions_own_read" on public.essay_submissions;
create policy "essay_submissions_own_read"
on public.essay_submissions
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "essay_submissions_own_insert" on public.essay_submissions;
create policy "essay_submissions_own_insert"
on public.essay_submissions
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "essay_submissions_own_update" on public.essay_submissions;
create policy "essay_submissions_own_update"
on public.essay_submissions
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "essay_submissions_own_delete" on public.essay_submissions;
create policy "essay_submissions_own_delete"
on public.essay_submissions
for delete
to authenticated
using (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('essay-uploads', 'essay-uploads', true)
on conflict (id) do nothing;

drop policy if exists "essay_uploads_public_read" on storage.objects;
create policy "essay_uploads_public_read"
on storage.objects
for select
to public
using (bucket_id = 'essay-uploads');

drop policy if exists "essay_uploads_own_insert" on storage.objects;
create policy "essay_uploads_own_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'essay-uploads'
  and auth.uid()::text = split_part(name, '/', 1)
);

drop policy if exists "essay_uploads_own_update" on storage.objects;
create policy "essay_uploads_own_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'essay-uploads'
  and auth.uid()::text = split_part(name, '/', 1)
)
with check (
  bucket_id = 'essay-uploads'
  and auth.uid()::text = split_part(name, '/', 1)
);

-- ============================================================================
-- 2. flashcard_reviews (histórico de revisões FSRS)
-- ============================================================================

create table if not exists public.flashcard_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  deck_id uuid not null references public.flashcard_decks(id) on delete cascade,
  card_id uuid not null references public.flashcard_cards(id) on delete cascade,
  rating smallint not null,
  reviewed_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
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

-- ============================================================================
-- 3. flashcard_deck_progress (último acesso por deck — upsert em user_id+deck_id)
-- ============================================================================

create table if not exists public.flashcard_deck_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  deck_id uuid not null references public.flashcard_decks(id) on delete cascade,
  last_reviewed_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  constraint flashcard_deck_progress_user_deck_unique unique (user_id, deck_id)
);

create index if not exists flashcard_deck_progress_user_id_idx
  on public.flashcard_deck_progress (user_id);

alter table public.flashcard_deck_progress enable row level security;

drop policy if exists "flashcard_deck_progress_own_all" on public.flashcard_deck_progress;
create policy "flashcard_deck_progress_own_all"
on public.flashcard_deck_progress
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
