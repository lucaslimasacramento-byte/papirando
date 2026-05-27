-- storage_buckets_missing.sql -- Aplicar no Supabase SQL Editor após revisar.

-- study-materials: uploads de PDFs e imagens pelos usuários
-- Referenciado em: src/pages/Materiais.jsx via supabase.storage.from('study-materials')
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'study-materials',
  'study-materials',
  false,
  31457280, -- 30 MB
  array['application/pdf', 'image/*']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "study_materials_own_select" on storage.objects;
create policy "study_materials_own_select"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'study-materials'
  and auth.uid()::text = split_part(name, '/', 1)
);

drop policy if exists "study_materials_own_insert" on storage.objects;
create policy "study_materials_own_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'study-materials'
  and auth.uid()::text = split_part(name, '/', 1)
);

drop policy if exists "study_materials_own_update" on storage.objects;
create policy "study_materials_own_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'study-materials'
  and auth.uid()::text = split_part(name, '/', 1)
)
with check (
  bucket_id = 'study-materials'
  and auth.uid()::text = split_part(name, '/', 1)
);

drop policy if exists "study_materials_own_delete" on storage.objects;
create policy "study_materials_own_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'study-materials'
  and auth.uid()::text = split_part(name, '/', 1)
);

-- instagram-temp: uploads temporários de mídia do Instagram
-- Referenciado em: src/lib/instagramApi.js
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'instagram-temp',
  'instagram-temp',
  false,
  10485760, -- 10 MB
  array['image/*', 'video/*']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Remove políticas antigas/públicas criadas pela migration de Instagram, se existirem.
drop policy if exists "instagram_temp_read_public" on storage.objects;
drop policy if exists "instagram_temp_insert_own" on storage.objects;
drop policy if exists "instagram_temp_update_own" on storage.objects;

drop policy if exists "instagram_temp_own_select" on storage.objects;
create policy "instagram_temp_own_select"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'instagram-temp'
  and auth.uid()::text = split_part(name, '/', 1)
);

drop policy if exists "instagram_temp_own_insert" on storage.objects;
create policy "instagram_temp_own_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'instagram-temp'
  and auth.uid()::text = split_part(name, '/', 1)
);

drop policy if exists "instagram_temp_own_update" on storage.objects;
create policy "instagram_temp_own_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'instagram-temp'
  and auth.uid()::text = split_part(name, '/', 1)
)
with check (
  bucket_id = 'instagram-temp'
  and auth.uid()::text = split_part(name, '/', 1)
);

drop policy if exists "instagram_temp_own_delete" on storage.objects;
create policy "instagram_temp_own_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'instagram-temp'
  and auth.uid()::text = split_part(name, '/', 1)
);
