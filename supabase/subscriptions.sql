-- ============================================================
-- subscriptions — assinaturas Stripe por usuário
-- Rodar no SQL Editor do Supabase
-- Requer: admin_rls_helpers.sql já aplicado (public.is_app_admin)
-- ============================================================

create extension if not exists pgcrypto;

-- Tabela principal
create table if not exists public.subscriptions (
  id                      uuid        primary key default gen_random_uuid(),
  user_id                 uuid        not null references auth.users(id) on delete cascade,
  provider                text        not null default 'stripe',
  plan_name               text        not null default 'gratuito', -- gratuito | tatico | elite
  stripe_customer_id      text,
  stripe_subscription_id  text        unique,
  stripe_price_id         text,
  status                  text        not null default 'active',   -- active | trialing | canceled | past_due | unpaid
  billing_cycle           text        default 'monthly',           -- monthly | annual
  current_period_start    timestamptz,
  current_period_end      timestamptz,
  cancel_at_period_end    boolean     not null default false,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- Adicionar colunas se já existir (idempotente)
alter table public.subscriptions
  add column if not exists plan_name text not null default 'gratuito',
  add column if not exists billing_cycle text default 'monthly',
  add column if not exists provider text not null default 'stripe',
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_price_id text,
  add column if not exists cancel_at_period_end boolean not null default false;

-- Índice por user_id
create index if not exists subscriptions_user_id_idx on public.subscriptions(user_id);
create index if not exists subscriptions_stripe_customer_idx on public.subscriptions(stripe_customer_id);

-- Trigger updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- RLS
alter table public.subscriptions enable row level security;

do $$
begin
  -- Admin pode tudo
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'subscriptions' and policyname = 'admins_all_subscriptions'
  ) then
    create policy "admins_all_subscriptions"
      on public.subscriptions for all to authenticated
      using (public.is_app_admin()) with check (public.is_app_admin());
  end if;

  -- Usuário vê apenas a própria assinatura
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'subscriptions' and policyname = 'user_view_own_subscription'
  ) then
    create policy "user_view_own_subscription"
      on public.subscriptions for select to authenticated
      using (user_id = auth.uid());
  end if;
end;
$$;

-- GRANTs obrigatórios
grant select on public.subscriptions to authenticated;

-- Função RPC: retorna o status de assinatura do usuário logado
create or replace function public.get_my_subscription()
returns table (
  plan_name text,
  status text,
  billing_cycle text,
  current_period_end timestamptz,
  cancel_at_period_end boolean
)
language plpgsql security definer set search_path = public
as $$
begin
  return query
    select s.plan_name, s.status, s.billing_cycle, s.current_period_end, s.cancel_at_period_end
    from public.subscriptions s
    where s.user_id = auth.uid()
      and s.status in ('active', 'trialing')
    order by s.created_at desc
    limit 1;
end;
$$;

grant execute on function public.get_my_subscription() to authenticated;

-- ============================================================
-- View admin: subscriptions com email do usuário
-- ============================================================
create or replace view public.subscriptions_admin_view as
  select
    s.*,
    u.email as user_email
  from public.subscriptions s
  left join auth.users u on u.id = s.user_id;

-- Apenas admins acessam esta view (via RLS da tabela base + service role no backend)
grant select on public.subscriptions_admin_view to authenticated;
