-- Conteúdo editável de Redações: banco de temas + kit (conectivos/modelos) em JSON.
-- Rode no SQL Editor do Supabase após redacao_expert_tips.sql.

create table if not exists public.redacao_site_content (
  id text primary key default 'global',
  theme_bank_json jsonb not null default '[]'::jsonb,
  kit_json jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);

insert into public.redacao_site_content (id, theme_bank_json, kit_json)
values ('global', '[]'::jsonb, null)
on conflict (id) do nothing;

alter table public.redacao_site_content enable row level security;

drop policy if exists "redacao_site_content_read_all" on public.redacao_site_content;
create policy "redacao_site_content_read_all"
on public.redacao_site_content
for select
to authenticated, anon
using (true);

drop policy if exists "redacao_site_content_admin_write" on public.redacao_site_content;
create policy "redacao_site_content_admin_write"
on public.redacao_site_content
for all
to authenticated
using (public.is_app_admin())
with check (public.is_app_admin());
