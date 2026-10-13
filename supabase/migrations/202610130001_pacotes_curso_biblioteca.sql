-- Cursos padrão com material pronto (ex.: PM-BA Soldado).
--
-- Modelo:
--   library_topics      → temas da biblioteca neutra (matéria + tema), reutilizáveis entre cursos
--   library_flashcards  → cartões neutros por tema (id estável "pap-..." vindo do acervo)
--   course_packages             → curso vendido/aderido (ligado opcionalmente a um contest_template)
--   course_package_subjects     → quais matérias da biblioteca o curso inclui
--   course_package_materials    → PDFs do curso (levam a assinatura do curso, por isso são do curso e não da biblioteca)
--   course_package_enrollments  → adesão do aluno ao curso
--
-- Questões continuam em public.questions (source='papirando', external_id='pap-...', raw = JSON nativo).
-- Ao aderir (RPC enroll_in_course_package) o aluno recebe cópias dos flashcards nos baralhos dele
-- (flashcard_decks/cards), preservando o FSRS por aluno; source_card_id evita duplicar.
--
-- Nada aqui apaga ou altera dados existentes.

create extension if not exists pgcrypto;

-- ── Biblioteca ────────────────────────────────────────────────────────────────
create table if not exists public.library_topics (
  id         uuid primary key default gen_random_uuid(),
  materia    text not null,
  tema       text not null,
  slug       text not null unique,
  uf         char(2),
  ordem      integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (materia, tema)
);
create index if not exists library_topics_materia_idx on public.library_topics (materia, ordem);

create table if not exists public.library_flashcards (
  id         text primary key,                    -- id estável do acervo ("pap-...")
  topic_id   uuid not null references public.library_topics(id) on delete cascade,
  frente     text not null,
  verso      text not null,
  uf         char(2),
  ordem      integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists library_flashcards_topic_idx on public.library_flashcards (topic_id, ordem);

-- ── Cursos ────────────────────────────────────────────────────────────────────
create table if not exists public.course_packages (
  id                  uuid primary key default gen_random_uuid(),
  slug                text not null unique,
  titulo              text not null,
  descricao           text not null default '',
  contest_template_id uuid references public.contest_templates(id) on delete set null,
  is_published        boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists courses_contest_template_idx on public.course_packages (contest_template_id);

create table if not exists public.course_package_subjects (
  package_id  uuid not null references public.course_packages(id) on delete cascade,
  materia    text not null,
  ordem      integer not null default 0,
  primary key (package_id, materia)
);

create table if not exists public.course_package_materials (
  id           uuid primary key default gen_random_uuid(),
  package_id    uuid not null references public.course_packages(id) on delete cascade,
  topic_id     uuid not null references public.library_topics(id) on delete cascade,
  kind         text not null check (kind in ('pdf_completo','mapa_mental','resumo','simulado','slides')),
  title        text not null,
  storage_path text not null unique,              -- objeto no bucket course-materials
  file_size    bigint not null default 0,
  ordem        integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (package_id, topic_id, kind)
);
create index if not exists course_materials_course_topic_idx on public.course_package_materials (package_id, topic_id, ordem);

create table if not exists public.course_package_enrollments (
  package_id  uuid not null references public.course_packages(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (package_id, user_id)
);
create index if not exists course_enrollments_user_idx on public.course_package_enrollments (user_id);

-- ── Origem dos flashcards copiados para o aluno ──────────────────────────────
alter table public.flashcard_decks add column if not exists source_topic_id uuid references public.library_topics(id) on delete set null;
alter table public.flashcard_decks add column if not exists source_package_id uuid references public.course_packages(id) on delete set null;
alter table public.flashcard_cards add column if not exists source_card_id text;

create unique index if not exists flashcard_decks_user_source_topic_uidx
  on public.flashcard_decks (user_id, source_topic_id) where source_topic_id is not null;
create unique index if not exists flashcard_cards_user_source_card_uidx
  on public.flashcard_cards (user_id, source_card_id) where source_card_id is not null;

-- ── Helpers de acesso ─────────────────────────────────────────────────────────
create or replace function public.is_enrolled_in_course_package(p_package_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select auth.uid() is not null and exists (
    select 1 from public.course_package_enrollments e
    where e.package_id = p_package_id and e.user_id = auth.uid()
  );
$$;

create or replace function public.can_read_course_package_object(p_name text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.is_app_admin() or exists (
    select 1
    from public.course_package_materials m
    join public.course_package_enrollments e on e.package_id = m.package_id
    where m.storage_path = p_name and e.user_id = auth.uid()
  );
$$;

-- ── RLS ───────────────────────────────────────────────────────────────────────
alter table public.library_topics     enable row level security;
alter table public.library_flashcards enable row level security;
alter table public.course_packages            enable row level security;
alter table public.course_package_subjects    enable row level security;
alter table public.course_package_materials   enable row level security;
alter table public.course_package_enrollments enable row level security;

drop policy if exists library_topics_read on public.library_topics;
create policy library_topics_read on public.library_topics
  for select to authenticated using (true);
drop policy if exists library_topics_admin on public.library_topics;
create policy library_topics_admin on public.library_topics
  for all to authenticated using (public.is_app_admin()) with check (public.is_app_admin());

drop policy if exists library_flashcards_read on public.library_flashcards;
create policy library_flashcards_read on public.library_flashcards
  for select to authenticated using (
    public.is_app_admin() or exists (
      select 1
      from public.library_topics t
      join public.course_package_subjects cs on cs.materia = t.materia
      join public.course_package_enrollments e on e.package_id = cs.package_id and e.user_id = auth.uid()
      where t.id = library_flashcards.topic_id
    )
  );
drop policy if exists library_flashcards_admin on public.library_flashcards;
create policy library_flashcards_admin on public.library_flashcards
  for all to authenticated using (public.is_app_admin()) with check (public.is_app_admin());

drop policy if exists courses_read on public.course_packages;
create policy courses_read on public.course_packages
  for select to anon, authenticated using (is_published or public.is_app_admin());
drop policy if exists courses_admin on public.course_packages;
create policy courses_admin on public.course_packages
  for all to authenticated using (public.is_app_admin()) with check (public.is_app_admin());

drop policy if exists course_subjects_read on public.course_package_subjects;
create policy course_subjects_read on public.course_package_subjects
  for select to anon, authenticated using (
    public.is_app_admin() or exists (select 1 from public.course_packages c where c.id = package_id and c.is_published)
  );
drop policy if exists course_subjects_admin on public.course_package_subjects;
create policy course_subjects_admin on public.course_package_subjects
  for all to authenticated using (public.is_app_admin()) with check (public.is_app_admin());

-- Lista de materiais (títulos/tipos) é visível a quem enxerga o curso; o ARQUIVO só abre
-- para matriculados (policy do Storage abaixo).
drop policy if exists course_materials_read on public.course_package_materials;
create policy course_materials_read on public.course_package_materials
  for select to authenticated using (
    public.is_app_admin() or exists (select 1 from public.course_packages c where c.id = package_id and c.is_published)
  );
drop policy if exists course_materials_admin on public.course_package_materials;
create policy course_materials_admin on public.course_package_materials
  for all to authenticated using (public.is_app_admin()) with check (public.is_app_admin());

drop policy if exists course_enrollments_own_read on public.course_package_enrollments;
create policy course_enrollments_own_read on public.course_package_enrollments
  for select to authenticated using (user_id = auth.uid() or public.is_app_admin());
drop policy if exists course_enrollments_own_delete on public.course_package_enrollments;
create policy course_enrollments_own_delete on public.course_package_enrollments
  for delete to authenticated using (user_id = auth.uid() or public.is_app_admin());
-- Inserção só pela RPC enroll_in_course_package (security definer).

grant select on public.library_topics, public.library_flashcards, public.course_package_materials,
  public.course_package_enrollments to authenticated;
grant select on public.course_packages, public.course_package_subjects to anon, authenticated;
grant delete on public.course_package_enrollments to authenticated;
grant insert, update, delete on public.library_topics, public.library_flashcards, public.course_packages,
  public.course_package_subjects, public.course_package_materials to authenticated;

-- ── Adesão ────────────────────────────────────────────────────────────────────
-- Matricula o aluno e copia os flashcards do curso para baralhos dele (um por tema).
-- Idempotente: rodar de novo só acrescenta cartões novos da biblioteca.
create or replace function public.enroll_in_course_package(p_package_slug text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_course  public.course_packages%rowtype;
  v_topic   record;
  v_deck_id uuid;
  v_decks   integer := 0;
  v_cards   integer := 0;
  v_n       integer;
begin
  if v_uid is null then
    raise exception 'Faça login para aderir ao curso.' using errcode = '28000';
  end if;

  select * into v_course from public.course_packages where slug = p_package_slug;
  if not found or (not v_course.is_published and not public.is_app_admin()) then
    raise exception 'Curso não encontrado.' using errcode = 'P0002';
  end if;

  insert into public.course_package_enrollments (package_id, user_id)
  values (v_course.id, v_uid)
  on conflict do nothing;

  for v_topic in
    select t.*, cs.ordem as materia_ordem
    from public.library_topics t
    join public.course_package_subjects cs on cs.materia = t.materia and cs.package_id = v_course.id
    where exists (select 1 from public.library_flashcards f where f.topic_id = t.id)
    order by cs.ordem, t.ordem
  loop
    select id into v_deck_id from public.flashcard_decks
    where user_id = v_uid and source_topic_id = v_topic.id;

    if v_deck_id is null then
      insert into public.flashcard_decks (user_id, title, description, disciplina, color, source_topic_id, source_package_id)
      values (v_uid, v_topic.tema, v_course.titulo, v_topic.materia, 'blue', v_topic.id, v_course.id)
      returning id into v_deck_id;
      v_decks := v_decks + 1;
    end if;

    insert into public.flashcard_cards (deck_id, user_id, front, back, source_card_id)
    select v_deck_id, v_uid, f.frente, f.verso, f.id
    from public.library_flashcards f
    where f.topic_id = v_topic.id
    order by f.ordem
    on conflict (user_id, source_card_id) where source_card_id is not null do nothing;
    get diagnostics v_n = row_count;
    v_cards := v_cards + v_n;
  end loop;

  return jsonb_build_object('package_id', v_course.id, 'decks_created', v_decks, 'cards_added', v_cards);
end;
$$;

revoke all on function public.enroll_in_course_package(text) from public, anon;
grant execute on function public.enroll_in_course_package(text) to authenticated;
grant execute on function public.is_enrolled_in_course_package(uuid) to authenticated;
grant execute on function public.can_read_course_package_object(text) to authenticated;

-- ── Storage: bucket privado dos PDFs dos cursos ──────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('course-materials', 'course-materials', false, 52428800, array['application/pdf'])
on conflict (id) do nothing;

drop policy if exists course_materials_obj_read on storage.objects;
create policy course_materials_obj_read on storage.objects
  for select to authenticated
  using (bucket_id = 'course-materials' and public.can_read_course_package_object(name));

drop policy if exists course_materials_obj_admin_write on storage.objects;
create policy course_materials_obj_admin_write on storage.objects
  for insert to authenticated
  with check (bucket_id = 'course-materials' and public.is_app_admin());
