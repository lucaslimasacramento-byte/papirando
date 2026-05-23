-- ============================================================
-- RPC helpers para beta_invites
-- Rode no SQL Editor do Supabase
-- Pré-requisito: beta_invites.sql já executado
-- ============================================================

-- Retorna todos os convites (admin only)
CREATE OR REPLACE FUNCTION public.admin_get_beta_invites()
RETURNS TABLE (
  id            uuid,
  email         text,
  token         text,
  nome          text,
  observacao    text,
  invited_at    timestamptz,
  used_at       timestamptz,
  used_by_user_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_app_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  RETURN QUERY
    SELECT bi.id, bi.email, bi.token, bi.nome, bi.observacao,
           bi.invited_at, bi.used_at, bi.used_by_user_id
    FROM public.beta_invites bi
    ORDER BY bi.invited_at DESC
    LIMIT 300;
END;
$$;

-- Cria um convite (admin only)
CREATE OR REPLACE FUNCTION public.admin_insert_beta_invite(
  p_email       text,
  p_nome        text DEFAULT '',
  p_observacao  text DEFAULT ''
)
RETURNS TABLE (
  id            uuid,
  email         text,
  token         text,
  nome          text,
  observacao    text,
  invited_at    timestamptz,
  used_at       timestamptz,
  used_by_user_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text := lower(trim(coalesce(p_email, '')));
BEGIN
  IF NOT is_app_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  IF v_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
    RAISE EXCEPTION 'E-mail invalido';
  END IF;

  RETURN QUERY
    INSERT INTO public.beta_invites (email, nome, observacao)
    VALUES (
      v_email,
      left(trim(coalesce(p_nome, '')), 120),
      left(trim(coalesce(p_observacao, '')), 1000)
    )
    RETURNING
      beta_invites.id, beta_invites.email, beta_invites.token,
      beta_invites.nome, beta_invites.observacao,
      beta_invites.invited_at, beta_invites.used_at, beta_invites.used_by_user_id;
END;
$$;

-- Remove um convite (admin only)
CREATE OR REPLACE FUNCTION public.admin_delete_beta_invite(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_app_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  DELETE FROM public.beta_invites WHERE id = p_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_beta_invites()                        TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_insert_beta_invite(text, text, text)      TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_beta_invite(uuid)                  TO authenticated;
