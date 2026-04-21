create extension if not exists pgcrypto;

alter table public.profiles
  add column if not exists referral_code text,
  add column if not exists referred_by_code text,
  add column if not exists referred_by_profile_id uuid references public.profiles(id) on delete set null;

create unique index if not exists profiles_referral_code_unique
  on public.profiles (upper(referral_code))
  where referral_code is not null and btrim(referral_code) <> '';

create index if not exists profiles_referred_by_profile_id_idx
  on public.profiles (referred_by_profile_id);

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_profile_id uuid not null references public.profiles(id) on delete cascade,
  referred_profile_id uuid not null unique references public.profiles(id) on delete cascade,
  referral_code text not null,
  status text not null default 'pending' check (status in ('pending', 'confirmed')),
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists referrals_referrer_idx
  on public.referrals (referrer_profile_id, status, created_at desc);

create table if not exists public.referral_bonus_events (
  id uuid primary key default gen_random_uuid(),
  referrer_profile_id uuid not null references public.profiles(id) on delete cascade,
  milestone integer not null,
  reward_title text not null,
  created_at timestamptz not null default now(),
  unique (referrer_profile_id, milestone)
);

create index if not exists referral_bonus_events_referrer_idx
  on public.referral_bonus_events (referrer_profile_id, milestone);

alter table public.referrals enable row level security;
alter table public.referral_bonus_events enable row level security;

drop policy if exists "referrals_self_read" on public.referrals;
create policy "referrals_self_read"
on public.referrals
for select
to authenticated
using (auth.uid() = referrer_profile_id or auth.uid() = referred_profile_id);

drop policy if exists "referral_bonus_events_self_read" on public.referral_bonus_events;
create policy "referral_bonus_events_self_read"
on public.referral_bonus_events
for select
to authenticated
using (auth.uid() = referrer_profile_id);

drop policy if exists "profiles_referral_related_read" on public.profiles;
create policy "profiles_referral_related_read"
on public.profiles
for select
to authenticated
using (
  auth.uid() = id
  or exists (
    select 1
    from public.referrals r
    where (r.referrer_profile_id = auth.uid() and r.referred_profile_id = profiles.id)
       or (r.referred_profile_id = auth.uid() and r.referrer_profile_id = profiles.id)
  )
);

create or replace function public.set_referral_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_referrals_updated_at on public.referrals;
create trigger trg_referrals_updated_at
before update on public.referrals
for each row
execute function public.set_referral_updated_at();

create or replace function public.prepare_profile_referral_fields()
returns trigger
language plpgsql
as $$
declare
  generated_code text;
  base_code text;
  existing_referrer_id uuid;
begin
  new.referral_code := upper(regexp_replace(coalesce(new.referral_code, ''), '[^A-Za-z0-9]', '', 'g'));
  new.referred_by_code := upper(regexp_replace(coalesce(new.referred_by_code, ''), '[^A-Za-z0-9]', '', 'g'));

  if coalesce(new.referral_code, '') = '' then
    base_code := upper(regexp_replace(coalesce(new.username, split_part(coalesce(new.email, ''), '@', 1), 'PAPI'), '[^A-Za-z0-9]', '', 'g'));
    base_code := left(base_code, 10);
    if char_length(base_code) < 4 then
      base_code := 'PAPI' || right(replace(coalesce(new.id::text, gen_random_uuid()::text), '-', ''), 6);
    end if;

    generated_code := base_code;

    if exists (
      select 1
      from public.profiles
      where upper(referral_code) = generated_code
        and id <> coalesce(new.id, gen_random_uuid())
    ) then
      generated_code := left(base_code, 6) || right(replace(coalesce(new.id::text, gen_random_uuid()::text), '-', ''), 4);
    end if;

    new.referral_code := generated_code;
  end if;

  if new.referred_by_code = new.referral_code then
    new.referred_by_code := null;
    new.referred_by_profile_id := null;
    return new;
  end if;

  if coalesce(new.referred_by_code, '') <> '' then
    select id
      into existing_referrer_id
    from public.profiles
    where upper(referral_code) = new.referred_by_code
      and id <> new.id
    limit 1;

    new.referred_by_profile_id := existing_referrer_id;
  else
    new.referred_by_profile_id := null;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_prepare_profile_referral_fields on public.profiles;
create trigger trg_prepare_profile_referral_fields
before insert or update on public.profiles
for each row
execute function public.prepare_profile_referral_fields();

create or replace function public.award_referral_bonus_events(target_referrer_id uuid)
returns void
language plpgsql
as $$
declare
  confirmed_total integer;
begin
  if target_referrer_id is null then
    return;
  end if;

  select count(*)
    into confirmed_total
  from public.referrals
  where referrer_profile_id = target_referrer_id
    and status = 'confirmed';

  if confirmed_total >= 1 then
    insert into public.referral_bonus_events (referrer_profile_id, milestone, reward_title)
    values (target_referrer_id, 1, '+1 mes VIP')
    on conflict (referrer_profile_id, milestone) do nothing;
  end if;

  if confirmed_total >= 3 then
    insert into public.referral_bonus_events (referrer_profile_id, milestone, reward_title)
    values (target_referrer_id, 3, '15% OFF fixo')
    on conflict (referrer_profile_id, milestone) do nothing;
  end if;

  if confirmed_total >= 5 then
    insert into public.referral_bonus_events (referrer_profile_id, milestone, reward_title)
    values (target_referrer_id, 5, '20% OFF fixo')
    on conflict (referrer_profile_id, milestone) do nothing;
  end if;

  if confirmed_total >= 10 then
    insert into public.referral_bonus_events (referrer_profile_id, milestone, reward_title)
    values (target_referrer_id, 10, 'Semestre gratis')
    on conflict (referrer_profile_id, milestone) do nothing;
  end if;
end;
$$;

create or replace function public.sync_profile_referral_program()
returns trigger
language plpgsql
as $$
declare
  target_status text;
begin
  if new.referred_by_profile_id is not null and new.referred_by_profile_id <> new.id then
    target_status := case when char_length(coalesce(new.cpf, '')) = 11 then 'confirmed' else 'pending' end;

    insert into public.referrals (
      referrer_profile_id,
      referred_profile_id,
      referral_code,
      status,
      confirmed_at
    )
    values (
      new.referred_by_profile_id,
      new.id,
      coalesce(new.referred_by_code, ''),
      target_status,
      case when target_status = 'confirmed' then now() else null end
    )
    on conflict (referred_profile_id) do update
      set referrer_profile_id = excluded.referrer_profile_id,
          referral_code = excluded.referral_code,
          status = case
            when public.referrals.status = 'confirmed' then 'confirmed'
            else excluded.status
          end,
          confirmed_at = case
            when public.referrals.status = 'confirmed' then public.referrals.confirmed_at
            when excluded.status = 'confirmed' then coalesce(public.referrals.confirmed_at, now())
            else public.referrals.confirmed_at
          end,
          updated_at = now();

    if target_status = 'confirmed' then
      perform public.award_referral_bonus_events(new.referred_by_profile_id);
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_profile_referral_program on public.profiles;
create trigger trg_sync_profile_referral_program
after insert or update on public.profiles
for each row
execute function public.sync_profile_referral_program();
