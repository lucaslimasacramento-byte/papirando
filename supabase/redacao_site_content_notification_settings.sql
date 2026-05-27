-- Rode no SQL Editor do Supabase quando já existir public.redacao_site_content.
-- Guarda as flags globais de notificações exibidas no app.

alter table public.redacao_site_content
add column if not exists notification_settings_json jsonb;

comment on column public.redacao_site_content.notification_settings_json is
'Configuração global de notificações: tipos ativos e envio para todos os usuários.';
