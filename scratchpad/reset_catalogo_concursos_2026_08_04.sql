-- Reinicializa somente o catálogo de CONCURSOS.
-- Preserva vestibulares, ENEM e quaisquer outros tipos.
--
-- Rode uma única vez no Supabase SQL Editor. Este arquivo NÃO é executado
-- automaticamente pelo Papirando nem pelos coletores.
-- Antes de apagar, ele arquiva templates, disciplinas e tópicos em três
-- tabelas de segurança. Caso uma delas já exista, a transação falha sem
-- alterar o catálogo, evitando um segundo reset acidental.

begin;

do $$
begin
  if to_regclass('public.catalogo_concursos_backup_20260804') is not null
     or to_regclass('public.catalogo_concursos_subjects_backup_20260804') is not null
     or to_regclass('public.catalogo_concursos_topics_backup_20260804') is not null then
    raise exception 'Backup do reset de concursos de 2026-08-04 já existe; nenhuma alteração foi aplicada.';
  end if;
end $$;

create table public.catalogo_concursos_backup_20260804 as
select t.*, now() as arquivado_em
from public.contest_templates t
where t.tipo = 'concurso';

create table public.catalogo_concursos_subjects_backup_20260804 as
select s.*, now() as arquivado_em
from public.contest_template_subjects s
join public.catalogo_concursos_backup_20260804 t on t.id = s.template_id;

create table public.catalogo_concursos_topics_backup_20260804 as
select p.*, now() as arquivado_em
from public.contest_template_topics p
join public.catalogo_concursos_subjects_backup_20260804 s on s.id = p.subject_id;

-- As FKs do schema removem disciplinas e tópicos associados por cascata.
delete from public.contest_templates
where tipo = 'concurso';

commit;

-- Conferência: deve retornar 0 em concursos; vestibular/ENEM permanecem.
select
  tipo,
  count(*) as itens_restantes
from public.contest_templates
group by tipo
order by tipo;

select
  (select count(*) from public.catalogo_concursos_backup_20260804) as concursos_arquivados,
  (select count(*) from public.catalogo_concursos_subjects_backup_20260804) as disciplinas_arquivadas,
  (select count(*) from public.catalogo_concursos_topics_backup_20260804) as topicos_arquivados;
