-- Migration: garante constraint UNIQUE(user_id) em subscriptions.
-- Necessária para o upsert com onConflict: 'user_id' no create-checkout-session.
-- Sem isso o upsert falha e a assinatura nunca é gravada (usuário fica sem acesso
-- e o webhook não acha a assinatura para ativar).
alter table public.subscriptions
  add constraint subscriptions_user_id_unique unique (user_id);
