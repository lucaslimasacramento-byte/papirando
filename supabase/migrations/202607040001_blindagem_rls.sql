-- ============================================================================
-- BLINDAGEM RLS — correções da auditoria de 2026-07-04
-- REVISADO contra o estado REAL do banco de produção (não contra os .sql do repo,
-- que estavam dessincronizados). Apenas furos CONFIRMADOS no banco entram aqui.
-- Idempotente: pode rodar mais de uma vez.
--
-- NÃO incluído de propósito:
--   · is_app_admin(): produção já é role-only (sem cláusula de e-mail). Mexer
--     seria RETROCESSO. Escalada por e-mail NÃO existe em produção.
--   · triggers de profiles: role/plano/status já protegidos por
--     protect_profile_privileged_fields + profiles_block_sensitive_self_update.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- P0 · admin_notices: qualquer usuário reescrevia broadcasts (user_id IS NULL)
-- Estado no banco: policy UPDATE com `(user_id = auth.uid()) OR (user_id IS NULL)`.
-- Correção: usuário só edita o PRÓPRIO aviso individual. (O "dispensar broadcast"
-- passou a ser guardado no navegador — ver App.jsx handleDismissNotice.)
-- ----------------------------------------------------------------------------

drop policy if exists "admin_notices_user_update" on public.admin_notices;
create policy "admin_notices_user_update"
  on public.admin_notices
  for update
  to authenticated
  using  (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- P1 · community_comments: comentários de posts privados legíveis por qualquer um
-- Estado no banco: policy SELECT com `USING (true)` para anon+authenticated.
-- Correção: só vê o comentário quem pode ver o post pai.
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
-- P1 · resolve_squad_invite exposto a anônimo (enumeração de esquadrões)
-- Estado no banco: EXECUTE concedido a anon E a PUBLIC (todos).
-- Correção: revogar de PUBLIC e anon; manter só usuário autenticado.
-- ----------------------------------------------------------------------------

revoke execute on function public.resolve_squad_invite(text) from public;
revoke execute on function public.resolve_squad_invite(text) from anon;
grant execute on function public.resolve_squad_invite(text) to authenticated;

-- ============================================================================
-- FOLLOW-UPS (fora desta migration — exigem mudança de app/produto):
--   · profiles_referral_related_read expõe PII do par de indicação (verificar no banco).
--   · bucket essay-uploads público → privado + URL assinada.
--   · limites de plano server-side + ai-server.mjs validar JWT.
-- ============================================================================
