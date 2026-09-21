-- Remove as duplicatas do catalogo de disciplinas e impede que voltem.
--
-- A tabela nao tem restricao de unicidade em `nome`, entao o `on conflict do nothing` da
-- semente nunca teve em que conflitar: cada execucao inseriu outra copia. O resultado foram
-- 72 linhas para ~15 disciplinas.
--
-- Duplicata no catalogo nao e so sujeira: a mesma disciplina pode resolver para ids
-- diferentes em alunos diferentes, e qualquer agrupamento por catalogo passa a mentir.
--
-- Duas decisoes de forma, ambas por causa do ambiente:
--
-- 1. Sem tabela temporaria. O Supabase usa pooler de conexoes, e cada instrucao do editor
--    pode cair num backend diferente — a temporaria criada numa nao existe na seguinte
--    ("relation _sobreviventes does not exist"). A escolha de quem fica e recalculada em
--    cada passo, com a mesma regra; como nome e created_at nao mudam no meio, o resultado e
--    o mesmo.
--
-- 2. O repontar e condicional. O vinculo (subject_catalog_id) vem de
--    subject_catalog_links.sql, que pode nao ter rodado no projeto — e o app tem caminho de
--    reserva para inserir disciplina sem ele. Sem a checagem, o script inteiro aborta.
--
-- Ordem importa: as tabelas que apontam para estas linhas usam `on delete set null`. Apagar
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

-- Quem fica: uma linha por nome (ignorando acento). Entre iguais, ganha a que TEM acento;
-- empatou, fica a mais antiga.
create or replace view public.subject_catalog_sobreviventes as
select distinct on (public.sem_acento(nome))
  id,
  public.sem_acento(nome) as chave
from public.subject_catalog
order by
  public.sem_acento(nome),
  (lower(nome) <> public.sem_acento(nome)) desc,
  created_at asc;

-- 1. Os nomes e aliases das duplicatas viram alias da sobrevivente — nada de matching se
--    perde no caminho.
with todos as (
  select sob.id as sobrevivente_id, valores.valor
  from public.subject_catalog_sobreviventes sob
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

-- 2. Repontar quem apontava para uma duplicata (so onde a coluna existir).
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'subjects' and column_name = 'subject_catalog_id'
  ) then
    update public.subjects s
    set subject_catalog_id = sob.id
    from public.subject_catalog c
    join public.subject_catalog_sobreviventes sob on sob.chave = public.sem_acento(c.nome)
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
    join public.subject_catalog_sobreviventes sob on sob.chave = public.sem_acento(c.nome)
    where cts.subject_catalog_id = c.id
      and cts.subject_catalog_id <> sob.id;
  else
    raise notice 'contest_template_subjects.subject_catalog_id nao existe: nada a repontar.';
  end if;
end
$$;

-- 3. Agora sim, apagar as duplicatas.
delete from public.subject_catalog c
where not exists (
  select 1 from public.subject_catalog_sobreviventes sob where sob.id = c.id
);

drop view public.subject_catalog_sobreviventes;

-- 4. A trava que faltava. Com ela, a semente volta a ser idempotente de verdade.
create unique index if not exists subject_catalog_nome_unico
  on public.subject_catalog (public.sem_acento(nome));

-- 5. Conferencia: deve sair uma linha por disciplina.
select count(*) as total from public.subject_catalog;
select nome, area, aliases from public.subject_catalog order by area, nome;
