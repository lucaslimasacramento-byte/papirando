-- Catálogo de bancas examinadoras (cadastro na plataforma; usado em filtros de questões, etc.)
create extension if not exists pgcrypto;

create table if not exists public.exam_boards (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  ordem integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint exam_boards_nome_unique unique (nome)
);

alter table public.exam_boards enable row level security;

drop policy if exists "exam_boards_read_public" on public.exam_boards;
create policy "exam_boards_read_public"
on public.exam_boards
for select
to authenticated, anon
using (true);

drop policy if exists "exam_boards_admin_write" on public.exam_boards;
create policy "exam_boards_admin_write"
on public.exam_boards
for all
to authenticated
using (public.is_app_admin())
with check (public.is_app_admin());

create or replace function public.set_exam_boards_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_exam_boards_updated_at on public.exam_boards;
create trigger trg_exam_boards_updated_at
before update on public.exam_boards
for each row
execute function public.set_exam_boards_updated_at();
