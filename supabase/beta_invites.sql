-- ============================================================
-- beta_invites - controle de convites para o beta fechado
-- Rodar no SQL Editor do Supabase (pode rodar multiplas vezes)
-- Requer: admin_rls_helpers.sql ja aplicado (public.is_app_admin)
-- ============================================================

create extension if not exists pgcrypto;

create table if not exists public.beta_invites (
  id              uuid        primary key default gen_random_uuid(),
  email           text        not null,
  token           text        not null default encode(gen_random_bytes(16), 'hex'),
  nome            text        not null default '',
  observacao      text        not null default '',
  invited_at      timestamptz not null default now(),
  used_at         timestamptz,
  used_by_user_id uuid        references auth.users(id) on delete set null
);

alter table public.beta_invites
  add column if not exists email text not null,
  add column if not exists token text not null default encode(gen_random_bytes(16), 'hex'),
  add column if not exists nome text not null default '',
  add column if not exists observacao text not null default '',
  add column if not exists invited_at timestamptz not null default now(),
  add column if not exists used_at timestamptz,
  add column if not exists used_by_user_id uuid references auth.users(id) on delete set null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'beta_invites_email_unique'
      and conrelid = 'public.beta_invites'::regclass
  ) then
    alter table public.beta_invites
      add constraint beta_invites_email_unique unique (email);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'beta_invites_token_unique'
      and conrelid = 'public.beta_invites'::regclass
  ) then
    alter table public.beta_invites
      add constraint beta_invites_token_unique unique (token);
  end if;
end;
$$;

alter table public.beta_invites enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'beta_invites'
      and policyname = 'admins_all_beta_invites'
  ) then
    create policy "admins_all_beta_invites"
      on public.beta_invites
      for all
      to authenticated
      using (public.is_app_admin())
      with check (public.is_app_admin());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'beta_invites'
      and policyname = 'user_view_own_invite'
  ) then
    create policy "user_view_own_invite"
      on public.beta_invites
      for select
      to authenticated
      using (lower(trim(email)) = lower(trim(coalesce(auth.jwt() ->> 'email', ''))));
  end if;
end;
$$;

-- ============================================================
-- Funcao RPC: marca o convite do usuario logado como usado
-- Chamar apos primeiro login: supabase.rpc('mark_beta_invite_used')
-- ============================================================
create or replace function public.mark_beta_invite_used()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
begin
  v_email := lower(trim(coalesce(auth.jwt() ->> 'email', '')));
  if v_email = '' then return; end if;

  update public.beta_invites
     set used_at = now(),
         used_by_user_id = auth.uid()
   where lower(trim(email)) = v_email
     and used_at is null;
end;
$$;

grant select, insert, update, delete on public.beta_invites to authenticated;
grant execute on function public.mark_beta_invite_used() to authenticated;
