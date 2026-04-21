create extension if not exists pgcrypto;

create table if not exists public.admin_crm_leads (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  contato text,
  canal text not null default 'instagram',
  interesse text,
  stage text not null default 'novo',
  monthly_value numeric(12,2) not null default 0,
  observacao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admin_crm_leads enable row level security;

drop policy if exists "admin_crm_admin_read" on public.admin_crm_leads;
create policy "admin_crm_admin_read"
on public.admin_crm_leads
for select
to authenticated
using (public.is_app_admin());

drop policy if exists "admin_crm_admin_write" on public.admin_crm_leads;
create policy "admin_crm_admin_write"
on public.admin_crm_leads
for all
to authenticated
using (public.is_app_admin())
with check (public.is_app_admin());

create or replace function public.set_admin_crm_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_admin_crm_updated_at on public.admin_crm_leads;
create trigger trg_admin_crm_updated_at
before update on public.admin_crm_leads
for each row
execute function public.set_admin_crm_updated_at();
