-- Remove as duplicatas do catalogo de disciplinas e impede que voltem.
--
-- A tabela nao tem restricao de unicidade em `nome`, entao o `on conflict do nothing` da
-- semente nunca teve em que conflitar: cada execucao inseriu outra copia. O resultado foram
-- 72 linhas para ~15 disciplinas, com a mesma "Legislacao Pertinente ao Policial Militar"
-- repetida varias vezes.
--
-- Duplicata no catalogo nao e so sujeira: a mesma disciplina pode resolver para ids
-- diferentes em alunos diferentes, e qualquer agrupamento por catalogo passa a mentir.
--
-- Ordem importa: duas tabelas apontam para estas linhas (subjects.subject_catalog_id e
-- contest_template_subjects.subject_catalog_id, ambas com `on delete set null`). Apagar
-- antes de repontar desligaria o vinculo das disciplinas ja criadas, em silencio.

create or replace function public.sem_acento(texto text)
returns text
language sql
immutable
set search_path = public
as $$
  select lower(translate(
    coalesce(texto, ''),
    'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
    'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'
  ));
$$;

-- 1. Quem fica: uma linha por nome (ignorando acento). Entre iguais, ganha a que TEM acento;
--    empatou, fica a mais antiga.
drop table if exists _sobreviventes;

create temporary table _sobreviventes as
select distinct on (public.sem_acento(nome))
  id,
  public.sem_acento(nome) as chave
from public.subject_catalog
order by
  public.sem_acento(nome),
  (lower(nome) <> public.sem_acento(nome)) desc,
  created_at asc;

-- 2. Os nomes e aliases das duplicatas viram alias da sobrevivente — nada de matching se
--    perde no caminho.
with todos as (
  select sob.id as sobrevivente_id, valores.valor
  from _sobreviventes sob
  join public.subject_catalog c on public.sem_acento(c.nome) = sob.chave
  cross join lateral (
    select to_jsonb(c.nome) as valor
    union all
    select alias from jsonb_array_elements(c.aliases) as alias
  ) valores
),
agrupados as (
  select t.sobrevivente_id, jsonb_agg(distinct t.valor) as aliases
  from todos t
  join public.subject_catalog s on s.id = t.sobrevivente_id
  where t.valor <> to_jsonb(s.nome)
  group by t.sobrevivente_id
)
update public.subject_catalog sc
set aliases = a.aliases
from agrupados a
where sc.id = a.sobrevivente_id;

-- 3. Repontar quem apontava para uma duplicata.
--
-- Condicional de proposito: o vinculo (subject_catalog_id) vem de
-- supabase/subject_catalog_links.sql, que pode nao ter rodado no projeto — e o proprio app
-- tem caminho de reserva para inserir disciplina sem ele. Sem a checagem, o script inteiro
-- aborta com "column does not exist" e a limpeza nao acontece.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'subjects' and column_name = 'subject_catalog_id'
  ) then
    update public.subjects s
    set subject_catalog_id = sob.id
    from public.subject_catalog c
    join _sobreviventes sob on sob.chave = public.sem_acento(c.nome)
    where s.subject_catalog_id = c.id
      and s.subject_catalog_id <> sob.id;
  else
    raise notice 'subjects.subject_catalog_id nao existe: nada a repontar (rode subject_catalog_links.sql se quiser o vinculo).';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'contest_template_subjects' and column_name = 'subject_catalog_id'
  ) then
    update public.contest_template_subjects cts
    set subject_catalog_id = sob.id
    from public.subject_catalog c
    join _sobreviventes sob on sob.chave = public.sem_acento(c.nome)
    where cts.subject_catalog_id = c.id
      and cts.subject_catalog_id <> sob.id;
  else
    raise notice 'contest_template_subjects.subject_catalog_id nao existe: nada a repontar.';
  end if;
end
$$;

-- 4. Agora sim, apagar as duplicatas.
delete from public.subject_catalog c
where not exists (select 1 from _sobreviventes sob where sob.id = c.id);

drop table _sobreviventes;

-- 5. A trava que faltava. Com ela, a semente volta a ser idempotente de verdade — e uma
--    segunda execucao passa a dar erro em vez de duplicar em silencio.
create unique index if not exists subject_catalog_nome_unico
  on public.subject_catalog (public.sem_acento(nome));

-- 6. Conferencia: deve sair uma linha por disciplina.
select count(*) as total from public.subject_catalog;
select nome, area, aliases from public.subject_catalog order by area, nome;
