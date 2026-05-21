-- ============================================================
-- admin_user_helpers.sql
-- Funções auxiliares para operações administrativas em usuários
-- Rodar no SQL Editor do Supabase
-- ============================================================

-- Retorna o user_id dado um e-mail (security definer, só admins devem chamar)
create or replace function public.get_user_id_by_email(p_email text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  -- Verifica se quem chama é admin
  if not public.is_app_admin() then
    raise exception 'Acesso negado.';
  end if;

  select id into v_id
    from auth.users
   where lower(trim(email)) = lower(trim(p_email))
   limit 1;

  return v_id;
end;
$$;

grant execute on function public.get_user_id_by_email(text) to authenticated;

-- Retorna e-mail de um user_id (admin only)
create or replace function public.get_email_by_user_id(p_user_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
begin
  if not public.is_app_admin() then
    raise exception 'Acesso negado.';
  end if;

  select email into v_email
    from auth.users
   where id = p_user_id;

  return v_email;
end;
$$;

grant execute on function public.get_email_by_user_id(uuid) to authenticated;
