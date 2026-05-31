-- Dá 30 dias de trial Papiro para usuários que não têm subscription
-- (ex: usuários que entraram via Google OAuth antes da correção do trigger)

insert into public.subscriptions (
  user_id, provider, plan_name, billing_cycle, status,
  current_period_start, current_period_end, cancel_at_period_end
)
select
  p.id, 'manual', 'papiro', 'trial', 'trialing',
  now(),
  now() + interval '30 days',
  true
from public.profiles p
where not exists (
  select 1 from public.subscriptions s where s.user_id = p.id
)
and p.created_at >= now() - interval '30 days';

-- Atualiza o campo subscription_plan no profiles para quem ainda está com nome antigo
update public.profiles
set subscription_plan = 'papiro'
where subscription_plan in ('estudio', 'elite', 'tatico')
  and not exists (
    select 1 from public.subscriptions s
    where s.user_id = profiles.id
      and s.status in ('active', 'trialing')
      and s.plan_name = 'papiro'
  );
