-- Ranking de Simulados — 3 métricas reais + visão Geral ponderada.
-- Aplicar no banco de produção (Management API / SQL Editor).
--
-- Métricas por usuário:
--   • média de acertos (%)  → AVG(simulado_records.desempenho)
--   • nº de simulados        → COUNT(simulado_records)
--   • XP                     → profiles.xp_total (novo, alimentado pelo app)
-- A visão "Geral" combina as três normalizadas 0–100 com pesos 50/30/20 (no frontend).

-- 1) XP consultável por usuário (antes o XP só era calculado localmente).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS xp_total integer NOT NULL DEFAULT 0;

-- 2) RPC agregada para o leaderboard. SECURITY DEFINER para ler agregados de todos os
--    usuários SEM expor as linhas cruas de simulado_records (privacidade: só contagem e média).
CREATE OR REPLACE FUNCTION public.get_simulados_leaderboard()
RETURNS TABLE (
  user_id uuid,
  username text,
  full_name text,
  avatar_url text,
  subscription_plan text,
  xp_total integer,
  simulado_count bigint,
  avg_desempenho numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id AS user_id,
    p.username,
    p.full_name,
    p.avatar_url,
    p.subscription_plan,
    COALESCE(p.xp_total, 0) AS xp_total,
    COALESCE(s.cnt, 0) AS simulado_count,
    COALESCE(s.avg_desemp, 0) AS avg_desempenho
  FROM public.profiles p
  LEFT JOIN (
    SELECT
      user_id,
      COUNT(*) AS cnt,
      ROUND(AVG(NULLIF(desempenho, NULL)))::numeric AS avg_desemp
    FROM public.simulado_records
    GROUP BY user_id
  ) s ON s.user_id = p.id
  WHERE COALESCE(s.cnt, 0) > 0 OR COALESCE(p.xp_total, 0) > 0;
$$;

-- 3) Permitir que usuários autenticados executem a RPC.
GRANT EXECUTE ON FUNCTION public.get_simulados_leaderboard() TO authenticated;
