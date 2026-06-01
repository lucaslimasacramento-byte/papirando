-- Migration: sistema de contagem de uso por plano
-- Rastreia consumo de features com limites por usuário

create table if not exists public.usage_counters (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references public.profiles(id) on delete cascade,
  feature     text        not null,
  -- periodo: 'daily:YYYY-MM-DD' | 'monthly:YYYY-MM' | 'weekly:YYYY-Www'
  period      text        not null,
  count       integer     not null default 1,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, feature, period)
);

create index if not exists usage_counters_user_feature_period_idx
  on public.usage_counters (user_id, feature, period);

alter table public.usage_counters enable row level security;

drop policy if exists "usage_counters_self" on public.usage_counters;
create policy "usage_counters_self"
  on public.usage_counters
  for all
  to authenticated
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── RPC: incrementa e retorna o novo valor ────────────────────────────────────
create or replace function public.increment_usage(
  p_feature text,
  p_period  text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_count integer;
begin
  insert into public.usage_counters (user_id, feature, period, count)
  values (auth.uid(), p_feature, p_period, 1)
  on conflict (user_id, feature, period)
  do update
    set count      = usage_counters.count + 1,
        updated_at = now()
  returning count into new_count;

  return new_count;
end;
$$;

revoke all on function public.increment_usage(text, text) from public;
grant execute on function public.increment_usage(text, text) to authenticated;

-- ── RPC: lê contagens atuais para múltiplas features ─────────────────────────
create or replace function public.get_usage(
  p_features text[],
  p_periods  text[]
)
returns table(feature text, period text, count integer)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select uc.feature, uc.period, uc.count
  from public.usage_counters uc
  where uc.user_id = auth.uid()
    and uc.feature = any(p_features)
    and uc.period  = any(p_periods);
end;
$$;

revoke all on function public.get_usage(text[], text[]) from public;
grant execute on function public.get_usage(text[], text[]) to authenticated;
