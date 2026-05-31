-- Migration: adiciona colunas do Asaas na tabela subscriptions
alter table public.subscriptions
  add column if not exists asaas_customer_id      text,
  add column if not exists asaas_subscription_id  text;

create unique index if not exists subscriptions_asaas_subscription_id_unique
  on public.subscriptions (asaas_subscription_id)
  where asaas_subscription_id is not null;

create index if not exists subscriptions_asaas_customer_id_idx
  on public.subscriptions (asaas_customer_id)
  where asaas_customer_id is not null;
