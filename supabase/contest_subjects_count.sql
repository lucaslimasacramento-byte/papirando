-- Contagem denormalizada de disciplinas por template (a lista do catálogo não
-- carrega disciplinas; o card mostra subjects_count sem precisar buscá-las).
alter table public.contest_templates
  add column if not exists subjects_count integer not null default 0;

-- Backfill com a contagem real.
update public.contest_templates t
set subjects_count = coalesce(c.cnt, 0)
from (
  select template_id, count(*) as cnt
  from public.contest_template_subjects
  group by template_id
) c
where c.template_id = t.id;

update public.contest_templates t
set subjects_count = 0
where not exists (
  select 1 from public.contest_template_subjects s where s.template_id = t.id
) and t.subjects_count <> 0;

-- Trigger: recalcula a contagem exata do(s) template(s) afetado(s).
create or replace function public.sync_template_subjects_count()
returns trigger language plpgsql security definer as $$
declare tid uuid;
begin
  tid := coalesce(new.template_id, old.template_id);
  if tid is not null then
    update public.contest_templates t
      set subjects_count = (select count(*) from public.contest_template_subjects s where s.template_id = tid)
      where t.id = tid;
  end if;
  if (tg_op = 'UPDATE' and new.template_id is distinct from old.template_id and old.template_id is not null) then
    update public.contest_templates t
      set subjects_count = (select count(*) from public.contest_template_subjects s where s.template_id = old.template_id)
      where t.id = old.template_id;
  end if;
  return null;
end;
$$;

drop trigger if exists trg_template_subjects_count on public.contest_template_subjects;
create trigger trg_template_subjects_count
after insert or delete or update of template_id on public.contest_template_subjects
for each row execute function public.sync_template_subjects_count();
