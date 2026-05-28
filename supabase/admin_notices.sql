-- Tabela de avisos enviados pelo admin para usuários específicos.
-- Exibidos na próxima vez que o usuário logar (lidos pelo app via RLS).

create table if not exists public.admin_notices (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  message     text not null check (char_length(message) between 1 and 1000),
  sent_at     timestamptz not null default timezone('utc', now()),
  read_at     timestamptz,
  created_at  timestamptz not null default timezone('utc', now())
);

create index if not exists admin_notices_user_id_idx on public.admin_notices(user_id);
create index if not exists admin_notices_sent_at_idx  on public.admin_notices(sent_at desc);

-- RLS
alter table public.admin_notices enable row level security;

-- Admin pode inserir e ler tudo
create policy "admin_notices_admin_all"
  on public.admin_notices
  for all
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and (role = 'admin' or is_admin = true)
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and (role = 'admin' or is_admin = true)
    )
  );

-- Cada usuário lê e atualiza (marcar como lido) apenas os próprios avisos
create policy "admin_notices_user_select"
  on public.admin_notices
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "admin_notices_user_update"
  on public.admin_notices
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
