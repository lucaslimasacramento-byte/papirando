-- Migration: sincroniza referral_code com username para usuários existentes
-- Regra: se o usuário tem username válido (≥4 chars alfanumérico) e o código
-- atual NÃO é o username normalizado, atualiza o código.
-- Se houver conflito de unicidade, mantém o código atual.

do $$
declare
  r record;
  new_code text;
begin
  for r in
    select id, username, referral_code
    from public.profiles
    where username is not null
      and char_length(upper(regexp_replace(username, '[^A-Za-z0-9]', '', 'g'))) >= 4
  loop
    new_code := left(upper(regexp_replace(r.username, '[^A-Za-z0-9]', '', 'g')), 10);

    -- Só atualiza se o código atual já não é o username
    if upper(coalesce(r.referral_code, '')) <> new_code then
      -- Verifica conflito com outro usuário
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
