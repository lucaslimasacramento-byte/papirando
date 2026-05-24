-- Agendamento diário da função send-reminder-email
--
-- Pré-requisitos no Supabase:
--   1. Extensions > pg_cron   → ativar
--   2. Extensions > pg_net    → ativar
--   3. Secrets da Edge Function configurados:
--        supabase secrets set RESEND_API_KEY=re_XXXX
--        supabase secrets set FROM_EMAIL="Papirando <contato@papirando.com>"
--
-- Cole este arquivo inteiro no SQL Editor do Supabase e execute.

-- Garante que as extensões estão ativas
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove job anterior se existir
SELECT cron.unschedule('send-reminder-email')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'send-reminder-email'
);

-- Agenda para 11:00 UTC (08:00 BRT) todos os dias
SELECT cron.schedule(
  'send-reminder-email',
  '0 11 * * *',
  $$
  SELECT net.http_post(
    url     := current_setting('app.supabase_url') || '/functions/v1/send-reminder-email',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body    := '{}'::jsonb
  );
  $$
);

-- Configura as variáveis de app (substitua pelos valores reais do seu projeto)
-- Você encontra essas chaves em: Supabase Dashboard > Project Settings > API
ALTER DATABASE postgres
  SET app.supabase_url    = 'https://SEU_PROJECT_REF.supabase.co';

ALTER DATABASE postgres
  SET app.service_role_key = 'SEU_SERVICE_ROLE_KEY';

-- Verifica o job cadastrado
SELECT jobname, schedule, command FROM cron.job WHERE jobname = 'send-reminder-email';
