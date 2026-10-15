-- Trilha dos cursos prontos: progresso do aluno por tema e por etapa.
--
-- Cada tema de um curso pronto é uma etapa da trilha com 7 passos:
--   pdf_completo, mapa_mental, resumo, slides, simulado  (os 5 PDFs do tema)
--   questoes, flashcards                                  (praticar o tema)
-- Uma linha = um passo concluído. Desmarcar = apagar a linha.
--
-- Depende de 202610130001_pacotes_curso_biblioteca.sql. Nada aqui altera dados existentes.
begin;

create table if not exists public.course_package_progress (
  user_id    uuid not null references auth.users(id) on delete cascade,
  package_id uuid not null references public.course_packages(id) on delete cascade,
  topic_id   uuid not null references public.library_topics(id) on delete cascade,
  step       text not null check (step in ('pdf_completo','mapa_mental','resumo','slides','simulado','questoes','flashcards')),
  done_at    timestamptz not null default now(),
  primary key (user_id, package_id, topic_id, step)
);
create index if not exists course_progress_user_package_idx on public.course_package_progress (user_id, package_id);

alter table public.course_package_progress enable row level security;

drop policy if exists course_progress_own_read on public.course_package_progress;
create policy course_progress_own_read on public.course_package_progress
  for select to authenticated using (user_id = auth.uid() or public.is_app_admin());

-- Só marca progresso quem aderiu ao curso (admin também, para conferir a trilha).
drop policy if exists course_progress_own_insert on public.course_package_progress;
create policy course_progress_own_insert on public.course_package_progress
  for insert to authenticated with check (
    user_id = auth.uid()
    and (public.is_enrolled_in_course_package(package_id) or public.is_app_admin())
  );

drop policy if exists course_progress_own_delete on public.course_package_progress;
create policy course_progress_own_delete on public.course_package_progress
  for delete to authenticated using (user_id = auth.uid());

grant select, insert, delete on public.course_package_progress to authenticated;

commit;

select to_regclass('public.course_package_progress') as tabela_criada;
