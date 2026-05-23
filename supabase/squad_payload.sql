-- Esquadroes: payload rico em community_posts (scope Esquadrao) + resolucao segura de convite.
-- Aplicar no mesmo projeto Supabase onde roda community.sql.

alter table public.community_posts
  add column if not exists squad_payload jsonb not null default '{}'::jsonb;

comment on column public.community_posts.squad_payload is
  'Estado serializado do esquadrao (avisos, atividades, simulados, inviteCode, roster, etc.) quando community_scope = Esquadrao.';

-- Convite: busca por codigo sem expor todos os esquadroes (security definer).
-- Normaliza o codigo, bloqueia entradas curtas e limita caracteres para reduzir enumeracao.
create or replace function public.resolve_squad_invite(p_code text)
returns setof public.community_posts
language sql
stable
security definer
set search_path = public
as $$
  with normalized as (
    select upper(regexp_replace(trim(coalesce(p_code, '')), '[^A-Za-z0-9-]', '', 'g')) as code
  )
  select public.community_posts.*
  from public.community_posts
  cross join normalized n
  where community_scope = U&'Esquadr\00E3o'
    and n.code ~ '^[A-Z0-9-]{6,32}$'
    and upper(trim(coalesce(squad_payload->>'inviteCode', ''))) = n.code
  limit 1;
$$;

grant execute on function public.resolve_squad_invite(text) to anon, authenticated;
