-- Corrige a acentuacao do catalogo de disciplinas que ja esta no banco.
--
-- O `nome` do catalogo substitui o nome que a IA leu do edital (canonicalizeSubjectName),
-- entao entradas cadastradas sem acento chegavam a tela do aluno: "Nocoes de Direito Penal",
-- "Matematica". Em produto de concurso, portugues errado na tela e defeito.
--
-- Roda quantas vezes quiser: cada UPDATE casa pelo nome SEM acento, entao depois de
-- corrigido ele simplesmente nao encontra mais nada para mudar.
--
-- O nome antigo nao se perde — entra como alias, que e o papel dele: casar o que vem escrito
-- de qualquer jeito no edital.

-- Funcao auxiliar: compara ignorando acento e caixa. unaccent() nao vem habilitado por
-- padrao no Supabase, entao a traducao e explicita.
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

-- Nomes.
with corretos(nome_certo) as (
  values
    ('Língua Portuguesa'),
    ('Matemática'),
    ('Informática'),
    ('Noções de Direito Constitucional'),
    ('Noções de Direito Administrativo'),
    ('Noções de Direito Penal'),
    ('Noções de Processo Penal'),
    ('Noções de Direitos Humanos'),
    ('Noções de Direito Penal Militar'),
    ('Noções de Direito Processual Penal Militar'),
    ('Legislação Pertinente ao Policial Militar'),
    ('Física'),
    ('Química')
)
update public.subject_catalog sc
set
  nome = c.nome_certo,
  -- Guarda o nome antigo como alias, sem duplicar se ja estiver la.
  aliases = case
    when sc.aliases @> to_jsonb(sc.nome) then sc.aliases
    else sc.aliases || to_jsonb(sc.nome)
  end
from corretos c
where public.sem_acento(sc.nome) = public.sem_acento(c.nome_certo)
  and sc.nome <> c.nome_certo;

-- Areas. `getAreaToken` no app normaliza a chave antes de usar, entao acentuar aqui nao
-- muda cor nem agrupamento.
update public.subject_catalog set area = 'Básicas'  where public.sem_acento(area) = 'basicas'  and area <> 'Básicas';
update public.subject_catalog set area = 'Jurídicas' where public.sem_acento(area) = 'juridicas' and area <> 'Jurídicas';

-- Confere o resultado.
select nome, area, aliases from public.subject_catalog order by area, nome;
