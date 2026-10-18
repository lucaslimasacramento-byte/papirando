-- Conteúdo de um curso pronto numa chamada só (matérias → temas → materiais + nº de questões).
--
-- Antes a tela fazia 4 consultas em sequência e baixava as linhas de questões só para contar.
-- security invoker: as policies de RLS das tabelas continuam valendo para quem chama.
-- Depende de 202610130001_pacotes_curso_biblioteca.sql. Não altera dados.
begin;

create index if not exists questions_disciplina_topico_idx on public.questions (disciplina, topico) where is_public;

create or replace function public.course_package_overview(p_package_id uuid)
returns jsonb
language sql stable security invoker set search_path = public
as $$
  select coalesce(jsonb_agg(subject order by (subject->>'ordem')::int), '[]'::jsonb)
  from (
    select jsonb_build_object(
      'materia', cs.materia,
      'ordem', cs.ordem,
      'topics', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', t.id,
          'materia', t.materia,
          'tema', t.tema,
          'uf', t.uf,
          'ordem', t.ordem,
          'question_count', (
            select count(*) from public.questions q
            where q.is_public and q.disciplina = t.materia and q.topico = t.tema
          ),
          'materials', coalesce((
            select jsonb_agg(jsonb_build_object(
              'id', m.id, 'topic_id', m.topic_id, 'kind', m.kind, 'title', m.title,
              'storage_path', m.storage_path, 'file_size', m.file_size, 'ordem', m.ordem
            ) order by m.ordem)
            from public.course_package_materials m
            where m.package_id = p_package_id and m.topic_id = t.id
          ), '[]'::jsonb)
        ) order by t.ordem)
        from public.library_topics t
        where t.materia = cs.materia
      ), '[]'::jsonb)
    ) as subject
    from public.course_package_subjects cs
    where cs.package_id = p_package_id
  ) s;
$$;

grant execute on function public.course_package_overview(uuid) to authenticated;

commit;

select to_regprocedure('public.course_package_overview(uuid)') as funcao_criada;
