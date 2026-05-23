-- Papirando: papel administrativo no perfil (fonte de verdade para o app após login).
-- O cliente considera admin quem tem profiles.role = 'admin'/'admin_master' OU está em ADMIN_EMAILS no App.jsx.
--
-- RLS: aplicar antes admin_rls_helpers.sql (função is_app_admin) e profiles_admin_rls.sql
-- (políticas de SELECT/UPDATE em profiles para admins), depois os scripts das tabelas admin.
--
-- Promover por e-mail (rode no SQL Editor do Supabase, ajuste o e-mail):
-- update public.profiles
-- set role = 'admin', updated_at = timezone('utc', now())
-- where lower(trim(email)) = lower('seu@email.com');
--
-- Rebaixar:
-- update public.profiles set role = 'student' where id = '...';

-- Garante que a coluna existe antes de comentá-la (idempotente).
alter table public.profiles
  add column if not exists role text not null default 'student';

comment on column public.profiles.role is 'student | admin | admin_master — admin_master é o superadmin operacional do app.';
