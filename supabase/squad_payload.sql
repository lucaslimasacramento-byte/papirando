-- Esquadrões: payload rico em community_posts (scope Esquadrão) + resolução segura de convite.
-- Aplicar no mesmo projeto Supabase onde roda community.sql.

alter table public.community_posts
  add column if not exists squad_payload jsonb not null default '{}'::jsonb;

comment on column public.community_posts.squad_payload is
  'Estado serializado do esquadrão (avisos, atividades, simulados, inviteCode, roster, etc.) quando community_scope = Esquadrão.';

-- Convite: busca por código sem expor todos os esquadrões (security definer).
create or replace function public.resolve_squad_invite(p_code text)
returns setof public.community_posts
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.community_posts
  where community_scope = 'Esquadrão'
    and lower(trim(coalesce(squad_payload->>'inviteCode', ''))) = lower(trim(coalesce(p_code, '')))
    and length(trim(coalesce(p_code, ''))) > 3
  limit 1;
$$;

grant execute on function public.resolve_squad_invite(text) to anon, authenticated;
