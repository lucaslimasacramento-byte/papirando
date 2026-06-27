-- ENEM 2026 — atualização de dados oficiais (Edital nº 64, de 21/05/2026)
UPDATE public.contest_templates
SET
  nome              = 'ENEM',
  plano             = 'ENEM',
  concurso          = 'ENEM',
  area              = 'Geral',
  banca             = 'INEP / MEC',
  inscricao_valor   = 'R$ 85,00',
  escolaridade      = 'Ensino médio completo ou em conclusão',
  registration_start = '2026-05-25',
  registration_end  = '2026-06-05',
  prova_data        = '2026-11-08',
  status_concurso   = 'inscricoes_encerradas',
  descricao         = 'O ENEM é a principal porta de entrada para o ensino superior no Brasil. A prova avalia competências desenvolvidas no ensino médio por meio de questões interdisciplinares que exigem leitura crítica, domínio de conceitos, interpretação de situações reais, análise de dados, argumentação e capacidade de propor soluções para problemas sociais. A estrutura combina quatro áreas do conhecimento — Linguagens, Ciências Humanas, Ciências da Natureza e Matemática — com uma redação dissertativo-argumentativa. No 1º dia são aplicadas as provas de Linguagens, Redação e Ciências Humanas (5h30); no 2º dia, Ciências da Natureza e Matemática (5h). O resultado pode ser utilizado no SiSU para vagas em universidades públicas, no ProUni para bolsas em faculdades privadas e no Fies para financiamento estudantil.',
  meta              = jsonb_build_object(
    'prova_data_dia2', '2026-11-15',
    'duracao_dia1',    '5h30',
    'duracao_dia2',    '5h',
    'total_questoes',  '180',
    'edital_numero',   'Edital nº 64, de 21 de maio de 2026',
    'taxa_pagamento_ate', '2026-06-10'
  )
WHERE tipo = 'enem' AND (slug = 'enem' OR slug LIKE '%enem%' OR nome ILIKE '%enem%');
