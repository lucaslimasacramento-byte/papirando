-- ============================================================================
-- Limpeza e reorganização do catálogo (categorias) — rodar no Supabase SQL Editor
-- ============================================================================
-- Já foram rodados antes (NÃO repetir): retag ENEM (vestibular->enem) e
-- IFTO (concurso->vestibular). Este arquivo cobre o que ainda falta.
--
-- Rode os blocos NA ORDEM. O bloco 1 precisa vir antes de qualquer escrita
-- com tipo 'enem_inst' (senão o CHECK constraint rejeita).
-- ============================================================================


-- ── BLOCO 1 — liberar o novo tipo 'enem_inst' no CHECK constraint ───────────
-- (Confira antes os tipos existentes; se aparecer algum além de
--  concurso/vestibular/enem, inclua-o no IN abaixo.)
-- SELECT DISTINCT tipo FROM public.contest_templates ORDER BY tipo;

ALTER TABLE public.contest_templates DROP CONSTRAINT IF EXISTS contest_templates_tipo_check;
ALTER TABLE public.contest_templates
  ADD CONSTRAINT contest_templates_tipo_check
  CHECK (tipo IN ('concurso','vestibular','enem','enem_inst'));


-- ── BLOCO 2 — IFs + federais (SiSU) viram "instituição ENEM" ────────────────
-- Saem de Vestibulares e viram alvos selecionáveis dentro do objetivo ENEM.
-- Mantém a UF (útil para o aluno filtrar por estado no seletor).
UPDATE public.contest_templates SET tipo = 'enem_inst'
WHERE is_public = true
  AND (nome LIKE 'Ingresso Superior - IF%' OR nome LIKE 'SiSU - %');


-- ── BLOCO 3 — programas genéricos não são objetivo ──────────────────────────
UPDATE public.contest_templates SET is_public = false
WHERE nome IN ('SiSU', 'ProUni', 'Fies');


-- ── BLOCO 4 — despublicar vestibulares "de mentira" + duplicados ────────────
-- Faculdades particulares com ingresso agendado/online/EAD (sem vestibular real)
-- + 2 duplicados (Católica de Pernambuco = UNICAP; SiSU - UFPEL = UFPel).
UPDATE public.contest_templates SET is_public = false
WHERE tipo = 'vestibular' AND nome IN (
  'Vestibular São Judas','Vestibular Anhembi Morumbi','Vestibular UNIP','Vestibular UNINOVE',
  'Vestibular Cruzeiro do Sul','Vestibular UNICID','Vestibular Estácio','Vestibular Anhanguera',
  'Vestibular Unopar','Vestibular Pitágoras','Vestibular Unicesumar','Vestibular Uniasselvi',
  'Vestibular Uninter','Vestibular Positivo','Vestibular ULBRA',
  'Vestibular FIAP','Vestibular IESB','Vestibular Católica de Brasília','Vestibular Unisul',
  'Vestibular Católica de Pernambuco','SiSU - UFPEL'
);


-- ── BLOCO 5 — consolidar o ENEM (ENEM é ENEM; tira o "ENEM PPL") ────────────
UPDATE public.contest_templates SET is_public = false
WHERE tipo = 'enem' AND nome ILIKE '%PPL%';


-- ── BLOCO 6 (OPCIONAL) — corrigir IFTO ──────────────────────────────────────
-- "Professor Substituto" é concurso/seleção, não vestibular. Reverte os 2.
-- Confirme os ids antes (devem ser os de "IFTO - Professor Substituto").
UPDATE public.contest_templates SET tipo = 'concurso', scope = NULL, uf = NULL
WHERE id IN (
  '155a3fef-f478-4392-989c-8f2a40366c43',
  'ef7e0da3-f8ad-46c5-a828-73a894790727'
);


-- ── CONFERÊNCIA FINAL ───────────────────────────────────────────────────────
SELECT tipo, count(*) FILTER (WHERE is_public) AS publicados, count(*) AS total
FROM public.contest_templates
GROUP BY tipo ORDER BY tipo;
