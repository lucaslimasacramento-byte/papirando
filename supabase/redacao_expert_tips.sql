-- Dicas e esqueletos de redação (catálogo editado pelo admin; leitura pública no app)
create extension if not exists pgcrypto;

create table if not exists public.redacao_expert_tips (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null default '',
  sort_order integer not null default 0,
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists redacao_expert_tips_sort_idx
  on public.redacao_expert_tips (sort_order asc, updated_at desc);

alter table public.redacao_expert_tips enable row level security;

drop policy if exists "redacao_expert_tips_read_all" on public.redacao_expert_tips;
create policy "redacao_expert_tips_read_all"
on public.redacao_expert_tips
for select
to authenticated, anon
using (true);

-- Escrita apenas para admins (is_app_admin em admin_rls_helpers.sql).
drop policy if exists "redacao_expert_tips_admin_write" on public.redacao_expert_tips;
create policy "redacao_expert_tips_admin_write"
on public.redacao_expert_tips
for all
to authenticated
using (public.is_app_admin())
with check (public.is_app_admin());
