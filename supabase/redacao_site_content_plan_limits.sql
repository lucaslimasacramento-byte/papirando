-- Rode no SQL Editor do Supabase quando já existir public.redacao_site_content.
-- Guarda os limites de cada plano editáveis pelo admin (sem mexer em código).
-- Estrutura: { "folha": { "max_courses": 3, "max_questions_per_day": 10 },
--              "papiro": { "max_courses": null, "max_questions_per_day": null } }
-- null = ilimitado.

alter table public.redacao_site_content
add column if not exists plan_limits_json jsonb;

comment on column public.redacao_site_content.plan_limits_json is
'Limites por plano (max_courses, max_questions_per_day). null = ilimitado. Editável no Admin > Configurações.';
