create extension if not exists pgcrypto;

create table if not exists public.audiobook_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  audiobook_id text not null,
  progresso numeric not null default 0,        -- posição atual em segundos
  duracao numeric not null default 0,           -- duração total em segundos
  farthest_time numeric not null default 0,     -- ponto mais avançado ouvido
  concluido boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),

  constraint audiobook_progress_user_audiobook unique (user_id, audiobook_id)
);

create index if not exists audiobook_progress_user_idx
  on public.audiobook_progress (user_id);

create or replace function public.audiobook_progress_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists audiobook_progress_touch_updated_at on public.audiobook_progress;
create trigger audiobook_progress_touch_updated_at
  before update on public.audiobook_progress
  for each row execute function public.audiobook_progress_touch_updated_at();

alter table public.audiobook_progress enable row level security;

drop policy if exists "audiobook_progress_own" on public.audiobook_progress;
create policy "audiobook_progress_own"
  on public.audiobook_progress for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on public.audiobook_progress to authenticated;
