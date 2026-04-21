-- Leitura e atualização de todos os perfis por administradores (AdminUsuarios, contagens).
-- Pré-requisitos: public.profiles com RLS ativo; supabase/admin_rls_helpers.sql já aplicado.

drop policy if exists "profiles_admin_select" on public.profiles;
create policy "profiles_admin_select"
on public.profiles
for select
to authenticated
using (public.is_app_admin());

drop policy if exists "profiles_admin_update" on public.profiles;
create policy "profiles_admin_update"
on public.profiles
for update
to authenticated
using (public.is_app_admin())
with check (public.is_app_admin());
