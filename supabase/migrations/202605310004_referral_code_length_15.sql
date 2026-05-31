-- Migration: aumenta limite do referral_code de 10 para 15 caracteres
-- Re-sincroniza usuários com username mais longo que 10 chars

do $$
declare
  r record;
  new_code text;
begin
  for r in
    select id, username, referral_code
    from public.profiles
    where username is not null
      and char_length(upper(regexp_replace(username, '[^A-Za-z0-9]', '', 'g'))) > 10
  loop
    new_code := left(upper(regexp_replace(r.username, '[^A-Za-z0-9]', '', 'g')), 15);

    if upper(coalesce(r.referral_code, '')) <> new_code then
      if not exists (
        select 1 from public.profiles
        where upper(referral_code) = new_code
          and id <> r.id
      ) then
        update public.profiles
        set referral_code = new_code
        where id = r.id;
      end if;
    end if;
  end loop;
end;
$$;
