create extension if not exists pgcrypto;

create table if not exists public.mind_maps (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  nome text not null,
  dados jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create or replace function public.mind_maps_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists mind_maps_touch_updated_at on public.mind_maps;
create trigger mind_maps_touch_updated_at
before update on public.mind_maps
for each row execute function public.mind_maps_touch_updated_at();

alter table public.mind_maps enable row level security;

drop policy if exists "mind_maps_select_own" on public.mind_maps;
create policy "mind_maps_select_own"
on public.mind_maps
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "mind_maps_insert_own" on public.mind_maps;
create policy "mind_maps_insert_own"
on public.mind_maps
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "mind_maps_update_own" on public.mind_maps;
create policy "mind_maps_update_own"
on public.mind_maps
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "mind_maps_delete_own" on public.mind_maps;
create policy "mind_maps_delete_own"
on public.mind_maps
for delete
to authenticated
using (auth.uid() = user_id);

grant select, insert, update, delete on public.mind_maps to authenticated;
