-- Retag dos exames ENEM: move de tipo 'vestibular' para a nova categoria 'enem'.
-- Rodar no Supabase SQL Editor.
--
-- Contexto: o ENEM deixou de ser um vestibular e virou categoria própria no app
-- (admin Catálogo + vitrine Concursos disponíveis + fluxo Novo objetivo).
-- O front decide a categoria pelo campo contest_templates.tipo.
--
-- A regex usa limite de palavra para casar "ENEM" / "ENEM PPL" / "ENEM Digital"
-- sem pegar substrings dentro de outras palavras.

-- 1) PREVIEW — rode primeiro e confira a lista antes de atualizar:
SELECT id, nome, concurso, banca, tipo, scope, uf
FROM public.contest_templates
WHERE tipo = 'vestibular'
  AND (
    nome     ~* '(^|[^a-z])enem([^a-z]|$)'
    OR concurso ~* '(^|[^a-z])enem([^a-z]|$)'
    OR slug   ILIKE 'enem%'
  )
ORDER BY nome;

-- 2) APLICAR — depois de validar o preview acima:
UPDATE public.contest_templates
SET tipo  = 'enem',
    scope = 'nacional',   -- ENEM é nacional; zera qualquer scope/uf herdado de vestibular
    uf    = NULL
WHERE tipo = 'vestibular'
  AND (
    nome     ~* '(^|[^a-z])enem([^a-z]|$)'
    OR concurso ~* '(^|[^a-z])enem([^a-z]|$)'
    OR slug   ILIKE 'enem%'
  );

-- 3) CONFERIR — quantos ficaram em cada categoria:
SELECT tipo, count(*) FROM public.contest_templates GROUP BY tipo ORDER BY tipo;
