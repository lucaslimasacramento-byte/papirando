alter table public.redacao_site_content
  add column if not exists course_templates_json jsonb;

update public.redacao_site_content
set course_templates_json = coalesce(course_templates_json, '[]'::jsonb)
where id = 'global';
