-- Allows authenticated users to complete/update their own required profile data.
-- RLS still restricts rows to auth.uid() = profiles.id; this only grants the
-- column-level UPDATE privileges needed by the client profile flows.

alter table public.profiles enable row level security;

drop policy if exists "profiles_own_select" on public.profiles;
create policy "profiles_own_select"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "profiles_own_update" on public.profiles;
create policy "profiles_own_update"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

grant update (
  nome,
  email,
  username,
  celular,
  telefone,
  avatar_url,
  ranking_display_mode,
  ranking_codename,
  birth_date,
  cpf,
  cpf_validado_algoritmo,
  referral_code,
  referred_by_code,
  meta_horas_semana,
  onboarding_done
) on public.profiles to authenticated;

grant execute on function public.cpf_disponivel(text) to authenticated;
