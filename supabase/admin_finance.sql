create extension if not exists pgcrypto;

create table if not exists public.admin_finance_expenses (
  id uuid primary key default gen_random_uuid(),
  descricao text not null,
  categoria text not null default 'operacao',
  valor numeric(12,2) not null default 0,
  competencia text not null,
  status text not null default 'paga',
  observacao text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admin_finance_expenses enable row level security;

drop policy if exists "admin_finance_admin_read" on public.admin_finance_expenses;
create policy "admin_finance_admin_read"
on public.admin_finance_expenses
for select
to authenticated
using (public.is_app_admin());

drop policy if exists "admin_finance_admin_write" on public.admin_finance_expenses;
create policy "admin_finance_admin_write"
on public.admin_finance_expenses
for all
to authenticated
using (public.is_app_admin())
with check (public.is_app_admin());

create or replace function public.set_admin_finance_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_admin_finance_updated_at on public.admin_finance_expenses;
create trigger trg_admin_finance_updated_at
before update on public.admin_finance_expenses
for each row
execute function public.set_admin_finance_updated_at();
