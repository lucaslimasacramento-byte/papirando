-- Galeria global de mapas mentais (modelos oficiais visíveis a todos).
-- Rode no SQL Editor do Supabase após mind_maps.sql e admin_rls_helpers.sql.

create table if not exists public.mind_map_gallery (
  id uuid primary key default gen_random_uuid(),
  titulo text not null default 'Mapa mental',
  dados jsonb not null default '{}'::jsonb,
  sort_order int not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists mind_map_gallery_sort_idx
  on public.mind_map_gallery (sort_order asc, created_at desc);

create or replace function public.mind_map_gallery_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists mind_map_gallery_touch_updated_at on public.mind_map_gallery;
create trigger mind_map_gallery_touch_updated_at
before update on public.mind_map_gallery
for each row execute function public.mind_map_gallery_touch_updated_at();

-- Admin: public.is_profile_admin() em admin_rls_helpers.sql (aplicar antes deste script).

alter table public.mind_map_gallery enable row level security;

drop policy if exists "mind_map_gallery_select_public" on public.mind_map_gallery;
create policy "mind_map_gallery_select_public"
on public.mind_map_gallery
for select
to anon, authenticated
using (true);

drop policy if exists "mind_map_gallery_insert_admin" on public.mind_map_gallery;
create policy "mind_map_gallery_insert_admin"
on public.mind_map_gallery
for insert
to authenticated
with check (public.is_profile_admin());

drop policy if exists "mind_map_gallery_update_admin" on public.mind_map_gallery;
create policy "mind_map_gallery_update_admin"
on public.mind_map_gallery
for update
to authenticated
using (public.is_profile_admin())
with check (public.is_profile_admin());

drop policy if exists "mind_map_gallery_delete_admin" on public.mind_map_gallery;
create policy "mind_map_gallery_delete_admin"
on public.mind_map_gallery
for delete
to authenticated
using (public.is_profile_admin());

grant select on public.mind_map_gallery to anon, authenticated;
grant insert, update, delete on public.mind_map_gallery to authenticated;
grant execute on function public.is_profile_admin() to authenticated;
