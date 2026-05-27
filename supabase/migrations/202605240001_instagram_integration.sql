create extension if not exists pgcrypto;

create table if not exists public.instagram_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  instagram_user_id text not null,
  instagram_username text,
  facebook_page_id text,
  access_token text not null,
  token_expires_at timestamptz,
  permissions text[] not null default '{}',
  connected_at timestamptz not null default now(),
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, instagram_user_id)
);

create table if not exists public.instagram_oauth_states (
  state text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  redirect_to text,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.instagram_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.instagram_accounts(id) on delete cascade,
  instagram_media_id text,
  instagram_container_id text,
  media_url text not null,
  media_urls text[] not null default '{}',
  media_type text not null default 'IMAGE' check (media_type in ('IMAGE', 'CAROUSEL', 'REELS')),
  caption text not null default '',
  scheduled_at timestamptz,
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'publishing', 'published', 'failed')),
  error_message text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.instagram_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.instagram_accounts(id) on delete cascade,
  post_id uuid references public.instagram_posts(id) on delete set null,
  instagram_media_id text,
  impressions integer not null default 0,
  reach integer not null default 0,
  engagement integer not null default 0,
  likes integer not null default 0,
  comments integer not null default 0,
  saves integer not null default 0,
  raw jsonb not null default '{}'::jsonb,
  captured_at timestamptz not null default now()
);

create index if not exists instagram_accounts_user_idx on public.instagram_accounts(user_id);
create index if not exists instagram_posts_user_status_idx on public.instagram_posts(user_id, status, scheduled_at);
create index if not exists instagram_metrics_post_idx on public.instagram_metrics(post_id, captured_at desc);
create index if not exists instagram_oauth_states_user_idx on public.instagram_oauth_states(user_id, expires_at);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'instagram-temp',
  'instagram-temp',
  true,
  104857600,
  array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.instagram_accounts enable row level security;
alter table public.instagram_oauth_states enable row level security;
alter table public.instagram_posts enable row level security;
alter table public.instagram_metrics enable row level security;

drop policy if exists "instagram_accounts_select_own" on public.instagram_accounts;
create policy "instagram_accounts_select_own"
  on public.instagram_accounts for select
  using (auth.uid() = user_id);

drop policy if exists "instagram_posts_crud_own" on public.instagram_posts;
create policy "instagram_posts_crud_own"
  on public.instagram_posts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "instagram_metrics_select_own" on public.instagram_metrics;
create policy "instagram_metrics_select_own"
  on public.instagram_metrics for select
  using (auth.uid() = user_id);

drop policy if exists "instagram_oauth_states_service_only" on public.instagram_oauth_states;
create policy "instagram_oauth_states_service_only"
  on public.instagram_oauth_states for all
  using (false)
  with check (false);

drop policy if exists "instagram_temp_read_public" on storage.objects;
create policy "instagram_temp_read_public"
  on storage.objects for select
  using (bucket_id = 'instagram-temp');

drop policy if exists "instagram_temp_insert_own" on storage.objects;
create policy "instagram_temp_insert_own"
  on storage.objects for insert
  with check (bucket_id = 'instagram-temp' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "instagram_temp_update_own" on storage.objects;
create policy "instagram_temp_update_own"
  on storage.objects for update
  using (bucket_id = 'instagram-temp' and auth.uid()::text = (storage.foldername(name))[1])
  with check (bucket_id = 'instagram-temp' and auth.uid()::text = (storage.foldername(name))[1]);
