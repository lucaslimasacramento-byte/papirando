-- Critério único de administrador para políticas RLS (alinhado ao app + questions.sql).
-- Aplicar antes de qualquer script que use public.is_app_admin() ou public.is_profile_admin().
--
-- Inclui: profiles.role = 'admin', e-mail institucional @papirando.com, e-mails de contingência
-- (espelho mínimo de ADMIN_EMAILS no cliente), e o mesmo critério via claim de e-mail no JWT
-- quando o perfil ainda não refletiu o papel.

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
            lower(coalesce(p.role::text, '')) = 'admin'
            or lower(coalesce(p.email, '')) like '%@papirando.com'
            or lower(trim(coalesce(p.email, ''))) in (
              'lucaslimasacramento@gmail.com'
            )
          from public.profiles p
          where p.id = auth.uid()
          limit 1
        ),
        false
      )
      or lower(coalesce(auth.jwt() ->> 'email', '')) like '%@papirando.com'
      or lower(trim(coalesce(auth.jwt() ->> 'email', ''))) in (
        'lucaslimasacramento@gmail.com'
      )
  end;
$$;

-- Alias histórico (community / mind_map_gallery).
create or replace function public.is_profile_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_app_admin();
$$;

grant execute on function public.is_app_admin() to authenticated;
grant execute on function public.is_profile_admin() to authenticated;

comment on function public.is_app_admin() is
  'True se o utilizador autenticado é admin da app (perfil, domínio papirando.com, lista curta ou JWT). Usar em políticas RLS.';
