create extension if not exists pgcrypto;

create table if not exists public.essay_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  banca text not null default 'CESPE / CEBRASPE',
  tema text not null default '',
  status text not null default 'draft',
  input_mode text not null default 'text',
  text text not null default '',
  original_text text not null default '',
  transcribed_text text not null default '',
  attachment_url text not null default '',
  attachment_path text not null default '',
  attachment_name text not null default '',
  attachment_type text not null default '',
  correction jsonb,
  score numeric(4,1) not null default 0,
  word_count integer not null default 0,
  paragraph_count integer not null default 0,
  line_count integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  corrected_at timestamptz
);

create index if not exists essay_submissions_user_id_idx
  on public.essay_submissions (user_id, updated_at desc);

alter table public.essay_submissions enable row level security;

drop policy if exists "essay_submissions_own_read" on public.essay_submissions;
create policy "essay_submissions_own_read"
on public.essay_submissions
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "essay_submissions_own_insert" on public.essay_submissions;
create policy "essay_submissions_own_insert"
on public.essay_submissions
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "essay_submissions_own_update" on public.essay_submissions;
create policy "essay_submissions_own_update"
on public.essay_submissions
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "essay_submissions_own_delete" on public.essay_submissions;
create policy "essay_submissions_own_delete"
on public.essay_submissions
for delete
to authenticated
using (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('essay-uploads', 'essay-uploads', true)
on conflict (id) do nothing;

drop policy if exists "essay_uploads_public_read" on storage.objects;
create policy "essay_uploads_public_read"
on storage.objects
for select
to public
using (bucket_id = 'essay-uploads');

drop policy if exists "essay_uploads_own_insert" on storage.objects;
create policy "essay_uploads_own_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'essay-uploads'
  and auth.uid()::text = split_part(name, '/', 1)
);

drop policy if exists "essay_uploads_own_update" on storage.objects;
create policy "essay_uploads_own_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'essay-uploads'
  and auth.uid()::text = split_part(name, '/', 1)
)
with check (
  bucket_id = 'essay-uploads'
  and auth.uid()::text = split_part(name, '/', 1)
);

drop policy if exists "essay_uploads_own_delete" on storage.objects;
create policy "essay_uploads_own_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'essay-uploads'
  and auth.uid()::text = split_part(name, '/', 1)
);
