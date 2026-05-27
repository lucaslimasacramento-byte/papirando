-- Social auth hardening: never let profile sync abort Supabase Auth.
-- Google Identity Services can create/update auth.users without CPF/birth date.
-- If profile sync fails, Auth should still complete and the app can repair the profile.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    nome,
    avatar_url,
    email_verificado,
    status_cadastro
  )
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(
      nullif(new.raw_user_meta_data ->> 'nome', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      split_part(coalesce(new.email, ''), '@', 1)
    ),
    coalesce(
      nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
      nullif(new.raw_user_meta_data ->> 'picture', '')
    ),
    new.email_confirmed_at is not null,
    case
      when new.email_confirmed_at is not null then 'ativo'
      else 'pendente'
    end
  )
  on conflict (id) do update
    set
      email = excluded.email,
      nome = coalesce(nullif(public.profiles.nome, ''), excluded.nome),
      avatar_url = coalesce(nullif(public.profiles.avatar_url, ''), excluded.avatar_url),
      email_verificado = public.profiles.email_verificado or excluded.email_verificado,
      status_cadastro = case
        when public.profiles.status_cadastro = 'bloqueado' then public.profiles.status_cadastro
        when excluded.email_verificado then 'ativo'
        else public.profiles.status_cadastro
      end,
      updated_at = timezone('utc', now());

  return new;
exception
  when others then
    raise warning 'handle_new_user profile sync skipped for auth user %: %', new.id, sqlerrm;
    return new;
end;
$$;

create or replace function public.handle_auth_user_email_confirmed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email_confirmed_at is not null
     and (old.email_confirmed_at is distinct from new.email_confirmed_at) then
    update public.profiles
    set
      email_verificado = true,
      status_cadastro = case
        when status_cadastro = 'bloqueado' then status_cadastro
        else 'ativo'
      end,
      updated_at = timezone('utc', now())
    where id = new.id;
  end if;

  return new;
exception
  when others then
    raise warning 'email confirmation profile sync skipped for auth user %: %', new.id, sqlerrm;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

drop trigger if exists on_auth_user_email_confirmed on auth.users;
create trigger on_auth_user_email_confirmed
after update of email_confirmed_at on auth.users
for each row
when (new.email_confirmed_at is not null)
execute function public.handle_auth_user_email_confirmed();
