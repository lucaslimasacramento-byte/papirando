alter table public.profiles
  add column if not exists username text,
  add column if not exists cpf text,
  add column if not exists ranking_codename text;

create unique index if not exists profiles_username_unique
  on public.profiles (lower(username))
  where username is not null and btrim(username) <> '';

create unique index if not exists profiles_cpf_unique
  on public.profiles (cpf)
  where cpf is not null and btrim(cpf) <> '';

create unique index if not exists profiles_ranking_codename_unique
  on public.profiles (lower(ranking_codename))
  where ranking_codename is not null and btrim(ranking_codename) <> '';
