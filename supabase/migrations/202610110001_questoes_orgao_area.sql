-- ============================================================================
-- Questões: órgão e área do concurso
--
-- O aluno filtra por disciplina, banca e ano — e nenhum desses responde a pergunta que ele
-- faz de verdade: "quero as questões da PM AL, da área Combatente". O export do TEC traz os
-- dois campos; a tabela não tinha onde guardá-los.
--
-- `external_id` e `source` já existem (202607 / question_api_import.sql) e carregam o
-- ID TEC — com o índice único em (source, external_id), recolar o mesmo lote ATUALIZA em
-- vez de duplicar.
--
-- Idempotente.
-- ============================================================================

alter table public.questions
  add column if not exists orgao text not null default '',
  add column if not exists area  text not null default '';

comment on column public.questions.orgao is
  'Órgão do concurso (ex.: "Polícia Militar do Estado de Alagoas (PM AL)"). Vem do export do TEC.';
comment on column public.questions.area is
  'Área do concurso (ex.: "Combatente"). Um mesmo órgão/cargo pode ter provas por área.';

-- Filtro do aluno: os dois entram como critério ao lado de disciplina e banca.
create index if not exists questions_orgao_idx on public.questions(orgao);
create index if not exists questions_area_idx  on public.questions(area);
