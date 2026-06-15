-- ============================================================================
-- BLINDAGEM DE SEGURANÇA — rodar no Supabase SQL Editor (idempotente)
-- Detectado na auditoria de segurança de 2026-06-14.
--
-- Impede que um usuário comum se auto-conceda plano pago ou cargo de admin
-- escrevendo direto em profiles via PostgREST (ex.: PATCH subscription_plan='papiro').
-- service_role (webhooks/edge functions) e admin continuam autorizados.
--
-- Esta versão é TOLERANTE: se a função is_app_admin() ainda não existir no banco,
-- o bloqueio continua valendo para usuários comuns (fail-safe) sem quebrar updates
-- normais de perfil (nome, username, avatar, etc. não são campos privilegiados).
-- ============================================================================

do $$
begin
  if to_regclass('public.profiles') is not null then
    create or replace function public.protect_profile_privileged_fields()
    returns trigger
    language plpgsql
    security definer
    set search_path = public
    as $fn$
    begin
      -- service_role (edge functions, webhooks) sempre pode.
      if auth.role() = 'service_role' then
        return new;
      end if;

      -- Admin pode — tolerante caso o helper ainda não exista.
      begin
        if public.is_app_admin() then
          return new;
        end if;
      exception
        when undefined_function then null; -- sem helper: cai no bloqueio abaixo
      end;

      -- Usuário comum NÃO pode alterar campos privilegiados.
      if to_jsonb(new)->'role' is distinct from to_jsonb(old)->'role'
        or to_jsonb(new)->'subscription_plan' is distinct from to_jsonb(old)->'subscription_plan'
        or to_jsonb(new)->'subscription_status' is distinct from to_jsonb(old)->'subscription_status'
        or to_jsonb(new)->'max_courses' is distinct from to_jsonb(old)->'max_courses'
      then
        raise exception 'profile privileged fields are read-only';
      end if;

      return new;
    end;
    $fn$;

    drop trigger if exists trg_protect_profile_privileged_fields on public.profiles;
    create trigger trg_protect_profile_privileged_fields
      before update on public.profiles
      for each row
      execute function public.protect_profile_privileged_fields();
  end if;
end $$;

-- ── Verificação rápida (deve listar 1 linha) ──────────────────────────────
-- select tgname from pg_trigger where tgname = 'trg_protect_profile_privileged_fields';
