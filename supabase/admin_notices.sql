-- Avisos do admin para usuários.
-- user_id = NULL  → broadcast (todos os usuários autenticados veem)
-- user_id = <uuid> → aviso individual para aquele usuário

create table if not exists public.admin_notices (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.profiles(id) on delete cascade, -- NULL = todos
  message    text not null check (char_length(message) between 1 and 1000),
  sent_at    timestamptz not null default timezone('utc', now()),
  read_at    timestamptz,           -- preenchido quando o usuário descarta (individual)
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists admin_notices_user_id_idx on public.admin_notices(user_id);
create index if not exists admin_notices_sent_at_idx  on public.admin_notices(sent_at desc);

-- RLS
alter table public.admin_notices enable row level security;

-- Admin: acesso total
create policy "admin_notices_admin_all"
  on public.admin_notices
  for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Usuário: lê os próprios avisos E os broadcasts (user_id IS NULL)
create policy "admin_notices_user_select"
  on public.admin_notices
  for select
  to authenticated
  using (user_id = auth.uid() or user_id is null);

-- Usuário: pode marcar lido apenas os próprios (read_at update)
create policy "admin_notices_user_update"
  on public.admin_notices
  for update
  to authenticated
  using  (user_id = auth.uid() or user_id is null)
  with check (user_id = auth.uid() or user_id is null);
