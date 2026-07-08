-- ============================================================================
-- BLINDAGEM FASE 1 — auditoria 2026-07-04/07
-- Verificado contra o banco REAL antes de escrever. Idempotente.
--   1. is_premium_user(): fonte única de "é premium" para o servidor.
--   2. mind_maps: criar só é permitido a premium (feature 100% premium).
--   3. get_referred_display(): expõe só nome/username na indicação (não CPF/e-mail).
--   4. remove profiles_referral_related_read (vazava a linha inteira do par).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1 · is_premium_user() — premium = admin OU assinatura ativa/trial não expirada
--     OU plano pago no profile. Fail-open no sentido de acesso (nunca bloqueia
--     quem tem assinatura válida). Usada pelo servidor de IA e por policies.
-- ----------------------------------------------------------------------------
create or replace function public.is_premium_user(p_uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when p_uid is null then false
    else (
      public.is_app_admin()
      or exists (
        select 1 from public.subscriptions s
        where s.user_id = p_uid
          and lower(coalesce(s.status, '')) in ('active', 'trialing')
          and (s.current_period_end is null or s.current_period_end > now())
      )
      or exists (
        select 1 from public.profiles p
        where p.id = p_uid
          and lower(coalesce(p.subscription_plan, '')) not in ('', 'gratuito', 'free', 'folha')
      )
    )
  end;
$$;

grant execute on function public.is_premium_user(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- 2 · mind_maps: criar exige premium (FEATURE_ACCESS mindmap_create = folha:false).
--     Só o INSERT é gated; UPDATE/DELETE de mapas já existentes seguem livres,
--     para não travar quem criou durante o trial.
-- ----------------------------------------------------------------------------
drop policy if exists "mind_maps_insert_own" on public.mind_maps;
create policy "mind_maps_insert_own"
  on public.mind_maps
  for insert
  to authenticated
  with check (auth.uid() = user_id and public.is_premium_user());

-- ----------------------------------------------------------------------------
-- 3 · get_referred_display() — dados de indicação sem PII sensível.
--     Retorna só id/nome/username/created_at de quem o usuário indicou.
-- ----------------------------------------------------------------------------
create or replace function public.get_referred_display()
returns table (id uuid, nome text, username text, created_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.nome, p.username, p.created_at
  from public.profiles p
  where auth.uid() is not null
    and p.id <> auth.uid()
    and (
      p.referred_by_profile_id = auth.uid()
      or upper(coalesce(p.referred_by_code, '')) = (
        select upper(coalesce(me.referral_code, ''))
        from public.profiles me
        where me.id = auth.uid()
      )
    );
$$;

grant execute on function public.get_referred_display() to authenticated;

-- ----------------------------------------------------------------------------
-- 4 · Remove a policy que expunha a linha inteira do perfil (CPF/celular/IP)
--     entre pares de indicação. O app passa a usar get_referred_display().
-- ----------------------------------------------------------------------------
drop policy if exists "profiles_referral_related_read" on public.profiles;

-- ============================================================================
-- Enforcement de IA (plano + cota) é feito em api/_ai.js usando is_premium_user()
-- e increment_usage('ai_backstop', ...). Limites contáveis de conteúdo
-- (questões/redações/uploads/posts) permanecem no frontend: enforcement por
-- contagem de linhas via RLS foi avaliado e adiado por risco de quebrar uso
-- legítimo pós-trial (semântica de insert varia por tabela).
-- ============================================================================
