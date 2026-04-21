create extension if not exists pgcrypto;

create table if not exists public.community_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  color text not null default '#dbeafe',
  position integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  author_name text not null,
  author_avatar_url text not null default '',
  title text not null,
  content text not null,
  excerpt text not null default '',
  category_slug text not null,
  category_name text not null,
  community_scope text not null default 'Forum publico',
  is_public boolean not null default true,
  is_pinned boolean not null default false,
  views_count integer not null default 0,
  upvotes_count integer not null default 0,
  comments_count integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid,
  author_name text not null,
  author_avatar_url text not null default '',
  content text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.community_post_reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null,
  reaction_type text not null check (reaction_type in ('upvote', 'save')),
  created_at timestamptz not null default timezone('utc', now()),
  unique (post_id, user_id, reaction_type)
);

create or replace function public.community_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.community_refresh_post_counts()
returns trigger
language plpgsql
as $$
declare
  target_post_id uuid;
begin
  target_post_id = coalesce(new.post_id, old.post_id);

  update public.community_posts
  set
    comments_count = (
      select count(*)
      from public.community_comments
      where post_id = target_post_id
    ),
    upvotes_count = (
      select count(*)
      from public.community_post_reactions
      where post_id = target_post_id
        and reaction_type = 'upvote'
    ),
    updated_at = timezone('utc', now())
  where id = target_post_id;

  return coalesce(new, old);
end;
$$;

drop trigger if exists community_categories_touch_updated_at on public.community_categories;
create trigger community_categories_touch_updated_at
before update on public.community_categories
for each row execute function public.community_touch_updated_at();

drop trigger if exists community_posts_touch_updated_at on public.community_posts;
create trigger community_posts_touch_updated_at
before update on public.community_posts
for each row execute function public.community_touch_updated_at();

drop trigger if exists community_comments_touch_updated_at on public.community_comments;
create trigger community_comments_touch_updated_at
before update on public.community_comments
for each row execute function public.community_touch_updated_at();

drop trigger if exists community_comments_refresh_post_counts on public.community_comments;
create trigger community_comments_refresh_post_counts
after insert or update or delete on public.community_comments
for each row execute function public.community_refresh_post_counts();

drop trigger if exists community_reactions_refresh_post_counts on public.community_post_reactions;
create trigger community_reactions_refresh_post_counts
after insert or update or delete on public.community_post_reactions
for each row execute function public.community_refresh_post_counts();

alter table public.community_categories enable row level security;
alter table public.community_posts enable row level security;
alter table public.community_comments enable row level security;
alter table public.community_post_reactions enable row level security;

drop policy if exists "community_categories_select" on public.community_categories;
create policy "community_categories_select"
on public.community_categories
for select
using (true);

drop policy if exists "community_posts_select" on public.community_posts;
create policy "community_posts_select"
on public.community_posts
for select
to anon, authenticated
using (is_public = true or auth.uid() = user_id);

drop policy if exists "community_posts_insert" on public.community_posts;
create policy "community_posts_insert"
on public.community_posts
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "community_posts_update_own" on public.community_posts;
create policy "community_posts_update_own"
on public.community_posts
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "community_comments_select" on public.community_comments;
create policy "community_comments_select"
on public.community_comments
for select
to anon, authenticated
using (true);

drop policy if exists "community_comments_insert" on public.community_comments;
create policy "community_comments_insert"
on public.community_comments
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "community_comments_update_own" on public.community_comments;
create policy "community_comments_update_own"
on public.community_comments
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "community_reactions_select_own" on public.community_post_reactions;
create policy "community_reactions_select_own"
on public.community_post_reactions
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "community_reactions_insert_own" on public.community_post_reactions;
create policy "community_reactions_insert_own"
on public.community_post_reactions
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "community_reactions_delete_own" on public.community_post_reactions;
create policy "community_reactions_delete_own"
on public.community_post_reactions
for delete
to authenticated
using (auth.uid() = user_id);

grant select on public.community_categories to anon, authenticated;

grant select on public.community_posts to anon, authenticated;
grant insert, update on public.community_posts to authenticated;

grant select on public.community_comments to anon, authenticated;
grant insert, update on public.community_comments to authenticated;

grant select on public.community_post_reactions to authenticated;
grant insert, delete on public.community_post_reactions to authenticated;

-- Moderacao: public.is_profile_admin() definido em admin_rls_helpers.sql (aplicar antes deste script).

grant insert, update, delete on public.community_categories to authenticated;
grant delete on public.community_posts to authenticated;
grant delete on public.community_comments to authenticated;

drop policy if exists "community_categories_insert_admin" on public.community_categories;
create policy "community_categories_insert_admin"
on public.community_categories
for insert
to authenticated
with check (public.is_profile_admin());

drop policy if exists "community_categories_update_admin" on public.community_categories;
create policy "community_categories_update_admin"
on public.community_categories
for update
to authenticated
using (public.is_profile_admin())
with check (public.is_profile_admin());

drop policy if exists "community_categories_delete_admin" on public.community_categories;
create policy "community_categories_delete_admin"
on public.community_categories
for delete
to authenticated
using (public.is_profile_admin());

drop policy if exists "community_posts_update_admin" on public.community_posts;
create policy "community_posts_update_admin"
on public.community_posts
for update
to authenticated
using (public.is_profile_admin())
with check (public.is_profile_admin());

drop policy if exists "community_posts_delete_admin" on public.community_posts;
create policy "community_posts_delete_admin"
on public.community_posts
for delete
to authenticated
using (public.is_profile_admin());

drop policy if exists "community_comments_update_admin" on public.community_comments;
create policy "community_comments_update_admin"
on public.community_comments
for update
to authenticated
using (public.is_profile_admin())
with check (public.is_profile_admin());

drop policy if exists "community_comments_delete_admin" on public.community_comments;
create policy "community_comments_delete_admin"
on public.community_comments
for delete
to authenticated
using (public.is_profile_admin());

insert into public.community_categories (slug, name, description, color, position)
values
  ('rotina', 'Rotina', 'Organizacao, constancia, trabalho e estudo na vida real.', '#dbeafe', 1),
  ('estudos', 'Estudos', 'Metodos, revisoes, leitura e produtividade.', '#e0e7ff', 2),
  ('questoes', 'Questoes', 'Bancas, exercicios e estrategia de resolucao.', '#dcfce7', 3),
  ('editais', 'Editais', 'Analise de edital, reta final e prioridades.', '#fef3c7', 4),
  ('desabafo', 'Desabafo', 'Espaco seguro para dividir semanas ruins e recomecos.', '#fee2e2', 5),
  ('dicas', 'Dicas', 'Taticas simples que funcionam no dia a dia.', '#fce7f3', 6)
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  color = excluded.color,
  position = excluded.position,
  is_active = true,
  updated_at = timezone('utc', now());
