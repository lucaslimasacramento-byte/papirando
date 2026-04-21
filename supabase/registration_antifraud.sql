-- Cadastro gratuito: colunas de status, antifraude, validação de CPF no banco e RPCs só para service_role.
-- Aplicar no SQL Editor do Supabase (ou via CLI). Senhas permanecem apenas em auth.users (Supabase Auth).
-- Deploy conjunto com RLS admin: `npm run db:bundle:admin-registration` (ou `supabase/deploy_registration_and_admin_rls.ps1`).

-- ---------------------------------------------------------------------------
-- Pré-requisito: auditoria em profiles
-- O trigger profiles_touch_updated_at() atribui NEW.updated_at; sem a coluna, qualquer UPDATE em profiles falha
-- (erro 42703: record "new" has no field "updated_at").
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists created_at timestamptz not null default timezone('utc', now());
alter table public.profiles add column if not exists updated_at timestamptz not null default timezone('utc', now());

-- ---------------------------------------------------------------------------
-- Funções de CPF (espelho do algoritmo local; fonte de verdade complementar)
-- ---------------------------------------------------------------------------
create or replace function public.cpf_passes_local_check(raw text)
returns boolean
language plpgsql
immutable
as $$
declare
  d text;
  i int;
  sum1 int := 0;
  sum2 int := 0;
  d1 int;
  d2 int;
begin
  d := regexp_replace(coalesce(raw, ''), '\D', '', 'g');
  if length(d) <> 11 then
    return false;
  end if;
  if d ~ '^(.)\1{10}$' then
    return false;
  end if;

  for i in 1..9 loop
    sum1 := sum1 + substring(d, i, 1)::int * (11 - i);
  end loop;
  d1 := (sum1 * 10) % 11;
  if d1 = 10 then d1 := 0; end if;
  if d1 <> substring(d, 10, 1)::int then
    return false;
  end if;

  for i in 1..10 loop
    sum2 := sum2 + substring(d, i, 1)::int * (12 - i);
  end loop;
  d2 := (sum2 * 10) % 11;
  if d2 = 10 then d2 := 0; end if;
  if d2 <> substring(d, 11, 1)::int then
    return false;
  end if;

  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- Perfis: campos de cadastro / verificação (password_hash fica no Auth)
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists birth_date date;
alter table public.profiles add column if not exists cpf_validado_algoritmo boolean not null default false;
alter table public.profiles add column if not exists email_verificado boolean not null default false;
alter table public.profiles add column if not exists status_cadastro text not null default 'ativo';
alter table public.profiles add column if not exists tentativas_cadastro integer not null default 0;
alter table public.profiles add column if not exists ultimo_ip_cadastro text;

alter table public.profiles drop constraint if exists profiles_status_cadastro_check;
alter table public.profiles add constraint profiles_status_cadastro_check
  check (status_cadastro in ('pendente', 'ativo', 'bloqueado', 'suspeito'));

comment on column public.profiles.cpf_validado_algoritmo is 'true se o CPF passou na validação local (dígitos verificadores)';
comment on column public.profiles.email_verificado is 'Sincronizado com auth.users.email_confirmed_at via trigger';
comment on column public.profiles.status_cadastro is 'pendente até confirmar e-mail; ativo após confirmação';

-- Contas já confirmadas no Auth
update public.profiles p
set email_verificado = true
from auth.users u
where u.id = p.id
  and u.email_confirmed_at is not null
  and p.email_verificado = false;

-- ---------------------------------------------------------------------------
-- Antifraude: log e bloqueio por IP (hash armazenado — não guardar IP puro)
-- ---------------------------------------------------------------------------
create table if not exists public.signup_attempt_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default timezone('utc', now()),
  ip_hash text not null,
  outcome text not null,
  reason_code text,
  internal_detail text,
  email_hash text
);

create index if not exists signup_attempt_log_ip_created_idx
  on public.signup_attempt_log (ip_hash, created_at desc);

alter table public.signup_attempt_log enable row level security;

create table if not exists public.signup_ip_blocks (
  ip_hash text primary key,
  blocked_until timestamptz not null,
  reason text not null default '',
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.signup_ip_blocks enable row level security;

-- ---------------------------------------------------------------------------
-- RPCs restritos ao service_role (Edge Function com service key)
-- ---------------------------------------------------------------------------
create or replace function public.registration_email_exists(checked_email text)
returns boolean
language sql
security definer
set search_path = public, auth
stable
as $$
  select exists(
    select 1
    from auth.users
    where lower(trim(email)) = lower(trim(checked_email))
  );
$$;

create or replace function public.registration_cpf_exists(checked_cpf text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists(
    select 1
    from public.profiles
    where cpf is not null
      and btrim(cpf) <> ''
      and cpf = checked_cpf
  );
$$;

revoke all on function public.registration_email_exists(text) from public;
revoke all on function public.registration_cpf_exists(text) from public;
grant execute on function public.registration_email_exists(text) to service_role;
grant execute on function public.registration_cpf_exists(text) to service_role;

-- ---------------------------------------------------------------------------
-- Trigger: confirmação de e-mail → perfil ativo
-- ---------------------------------------------------------------------------
create or replace function public.handle_auth_user_email_confirmed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email_confirmed_at is not null
     and (old.email_confirmed_at is distinct from new.email_confirmed_at) then
    update public.profiles
    set
      email_verificado = true,
      status_cadastro = case
        when status_cadastro = 'bloqueado' then status_cadastro
        else 'ativo'
      end,
      updated_at = timezone('utc', now())
    where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_confirmed on auth.users;
create trigger on_auth_user_email_confirmed
after update of email_confirmed_at on auth.users
for each row
when (new.email_confirmed_at is not null)
execute function public.handle_auth_user_email_confirmed();

-- ---------------------------------------------------------------------------
-- Trigger: impedir CPF inválido em inserts/updates (algoritmo local)
-- ---------------------------------------------------------------------------
create or replace function public.profiles_enforce_cpf_algorithm()
returns trigger
language plpgsql
as $$
begin
  if new.cpf is not null and btrim(new.cpf) <> '' then
    if not public.cpf_passes_local_check(new.cpf) then
      raise exception 'CPF inválido (validação no servidor)' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_enforce_cpf_algorithm_trg on public.profiles;
create trigger profiles_enforce_cpf_algorithm_trg
before insert or update of cpf on public.profiles
for each row
execute function public.profiles_enforce_cpf_algorithm();
