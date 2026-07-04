-- ============================================================================
-- BLINDAGEM RLS — correções de segurança da auditoria de 2026-07-04
-- Revise no SQL Editor do Supabase antes de aplicar em produção.
-- Idempotente: pode rodar mais de uma vez.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- P0-1 · Escalada a admin via profiles.email
-- Furo: usuário comum tinha GRANT UPDATE(email) e o trigger de proteção não
-- cobria a coluna email; is_app_admin() concede admin a e-mail @papirando.com.
-- Logo: update profiles set email='x@papirando.com' → admin.
-- Correção em 2 camadas:
--   (a) is_app_admin() deixa de confiar em profiles.email para o domínio
--       institucional (só confia no e-mail VERIFICADO do JWT, que o usuário
--       não consegue forjar) + role + lista de contingência.
--   (b) trigger passa a bloquear qualquer não-admin de gravar e-mail
--       @papirando.com no próprio profile (defesa em profundidade).
-- ----------------------------------------------------------------------------

create or replace function public.is_app_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when auth.uid() is null then false
    else
      coalesce(
        (
          select
            -- role no banco: fonte de verdade (protegida por trigger)
            lower(coalesce(p.role::text, '')) in ('admin', 'admin_master', 'master')
            -- contingência: e-mail explícito (não domínio genérico auto-editável)
            or lower(trim(coalesce(p.email, ''))) in (
              'lucaslimasacramento@gmail.com'
            )
          from public.profiles p
          where p.id = auth.uid()
          limit 1
        ),
        false
      )
      -- e-mail VERIFICADO do provedor de auth (JWT) — usuário não forja este
      or lower(coalesce(auth.jwt() ->> 'email', '')) like '%@papirando.com'
      or lower(trim(coalesce(auth.jwt() ->> 'email', ''))) in (
        'lucaslimasacramento@gmail.com'
      )
  end;
$$;

grant execute on function public.is_app_admin() to authenticated;

-- Trigger de proteção: agora também blinda o e-mail institucional.
create or replace function public.protect_profile_privileged_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if auth.role() = 'service_role' or public.is_app_admin() then
    return new;
  end if;

  if to_jsonb(new)->'role' is distinct from to_jsonb(old)->'role'
    or to_jsonb(new)->'subscription_plan' is distinct from to_jsonb(old)->'subscription_plan'
    or to_jsonb(new)->'subscription_status' is distinct from to_jsonb(old)->'subscription_status'
    or to_jsonb(new)->'max_courses' is distinct from to_jsonb(old)->'max_courses'
  then
    raise exception 'profile privileged fields are read-only';
  end if;

  -- Impede não-admin de se autopromover setando e-mail institucional.
  if lower(coalesce(to_jsonb(new)->>'email', '')) like '%@papirando.com'
     and (to_jsonb(new)->'email' is distinct from to_jsonb(old)->'email')
  then
    raise exception 'cannot assign institutional email domain';
  end if;

  return new;
end;
$fn$;

drop trigger if exists trg_protect_profile_privileged_fields on public.profiles;
create trigger trg_protect_profile_privileged_fields
  before update on public.profiles
  for each row
  execute function public.protect_profile_privileged_fields();

-- ----------------------------------------------------------------------------
-- P0-2 · admin_notices: usuário reescrevia broadcasts vistos por todos
-- Furo: policy de UPDATE com `user_id is null` deixava qualquer logado editar
-- os avisos globais (phishing para toda a base).
-- Correção: usuário só pode dar UPDATE no PRÓPRIO aviso individual.
-- (Descartar broadcast deve ser feito por tabela de dismissals, não editando a
--  linha compartilhada — fica como follow-up de produto.)
-- ----------------------------------------------------------------------------

drop policy if exists "admin_notices_user_update" on public.admin_notices;
create policy "admin_notices_user_update"
  on public.admin_notices
  for update
  to authenticated
  using  (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- P1-1 · community_comments legíveis em posts privados
-- Furo: SELECT com USING (true) expunha comentários de posts privados
-- (esquadrões, is_public=false) a qualquer um, inclusive anônimo.
-- Correção: só vê comentário se puder ver o post pai.
-- ----------------------------------------------------------------------------

drop policy if exists "community_comments_select" on public.community_comments;
create policy "community_comments_select"
  on public.community_comments
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.community_posts p
      where p.id = community_comments.post_id
        and (p.is_public = true or p.user_id = auth.uid())
    )
  );

-- ----------------------------------------------------------------------------
-- P1-2 · resolve_squad_invite exposto a anônimo (enumeração de esquadrões)
-- Furo: função SECURITY DEFINER retornava a linha inteira do post por código
-- de convite, com grant a anon → enumerável sem login.
-- Correção mínima e segura: exigir usuário autenticado (remove grant anon).
-- (Reduzir colunas retornadas fica como follow-up sem quebrar o app.)
-- ----------------------------------------------------------------------------

revoke execute on function public.resolve_squad_invite(text) from anon;
grant execute on function public.resolve_squad_invite(text) to authenticated;

-- ============================================================================
-- FOLLOW-UPS (não incluídos aqui por exigirem mudança de frontend/produto):
--  · profiles_referral_related_read expõe PII completa (CPF/telefone/IP) do par
--    de indicação → trocar por RPC/view com só nome/username/avatar.
--  · bucket essay-uploads é público → tornar privado + URL assinada.
--  · limites de plano server-side (RPCs security definer p/ criação).
--  · ai-server.mjs validar JWT do Supabase + usage_counters.
-- ============================================================================
