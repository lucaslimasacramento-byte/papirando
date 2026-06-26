-- Lote 6: Bloco A restante com programa confirmado pelo Gemini
--   COM programa: Belas Artes, ESPM, FGV Direito SP, FGV EAESP, FGV EPGE
--   SEM programa (disciplinas: []) → deletar do catálogo: CEFET-MG, CEFET-RJ, Feevale
--
-- NOTA: todos os 5 registros podem ter sido deletados do catálogo — cada seção
-- começa com INSERT ... ON CONFLICT para recriar se necessário.

-- ===== Vestibular Belas Artes (1 matéria) =====
INSERT INTO public.contest_templates (slug, nome, plano, concurso, tipo, area, cor, status, is_public, scope, institution_type, uf)
VALUES ('vestibular-belas-artes', 'Vestibular Belas Artes', 'free', 'Belas Artes', 'vestibular', 'Geral', '#2563EB', 'ativo', true, 'estadual', 'privada', 'SP')
ON CONFLICT (slug) DO UPDATE SET nome = EXCLUDED.nome, is_public = true;

DELETE FROM public.contest_template_subjects WHERE template_id = (SELECT id FROM public.contest_templates WHERE nome='Vestibular Belas Artes' AND tipo='vestibular' LIMIT 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Conhecimentos Gerais', 0 FROM public.contest_templates WHERE nome='Vestibular Belas Artes' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Compreensão e interpretação de textos literários e não literários', 0),
  ((SELECT id FROM s), 'História da Arte e movimentos artísticos', 1),
  ((SELECT id FROM s), 'Atualidades e Cultura Geral', 2),
  ((SELECT id FROM s), 'Lógica e raciocínio quantitativo básico', 3),
  ((SELECT id FROM s), 'Geopolítica e história contemporânea', 4);

-- ===== Vestibular ESPM (4 matérias) =====
INSERT INTO public.contest_templates (slug, nome, plano, concurso, tipo, area, cor, status, is_public, scope, institution_type, uf)
VALUES ('vestibular-espm', 'Vestibular ESPM', 'free', 'ESPM', 'vestibular', 'Geral', '#2563EB', 'ativo', true, 'estadual', 'privada', 'SP')
ON CONFLICT (slug) DO UPDATE SET nome = EXCLUDED.nome, is_public = true;

DELETE FROM public.contest_template_subjects WHERE template_id = (SELECT id FROM public.contest_templates WHERE nome='Vestibular ESPM' AND tipo='vestibular' LIMIT 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Língua Portuguesa', 0 FROM public.contest_templates WHERE nome='Vestibular ESPM' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Leitura, compreensão e interpretação de textos', 0),
  ((SELECT id FROM s), 'Gramática normativa e ortografia', 1),
  ((SELECT id FROM s), 'Mecanismos de coesão e coerência', 2),
  ((SELECT id FROM s), 'Tipologia e gêneros textuais', 3);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Matemática', 1 FROM public.contest_templates WHERE nome='Vestibular ESPM' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Raciocínio lógico e resolução de problemas', 0),
  ((SELECT id FROM s), 'Porcentagem, razão, proporção e matemática financeira básica', 1),
  ((SELECT id FROM s), 'Estatística, leitura de gráficos e tabelas', 2),
  ((SELECT id FROM s), 'Álgebra, equações e funções elementares', 3);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Língua Inglesa', 2 FROM public.contest_templates WHERE nome='Vestibular ESPM' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Compreensão e interpretação de textos', 0),
  ((SELECT id FROM s), 'Vocabulário aplicado ao contexto de negócios, comunicação e atualidades', 1),
  ((SELECT id FROM s), 'Gramática aplicada à leitura', 2);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Humanidades e Cultura Geral Contemporânea', 3 FROM public.contest_templates WHERE nome='Vestibular ESPM' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'História do Brasil e História Geral (foco na Idade Contemporânea)', 0),
  ((SELECT id FROM s), 'Geografia, Geopolítica e Globalização', 1),
  ((SELECT id FROM s), 'Sociologia, Filosofia e movimentos sociais', 2),
  ((SELECT id FROM s), 'Atualidades: política, economia, tecnologia, meio ambiente e cultura', 3);

-- ===== Vestibular FGV Direito SP (4 matérias) =====
INSERT INTO public.contest_templates (slug, nome, plano, concurso, tipo, area, cor, status, is_public, scope, institution_type, uf)
VALUES ('vestibular-fgv-direito-sp', 'Vestibular FGV Direito SP', 'free', 'FGV Direito SP', 'vestibular', 'Geral', '#2563EB', 'ativo', true, 'estadual', 'privada', 'SP')
ON CONFLICT (slug) DO UPDATE SET nome = EXCLUDED.nome, is_public = true;

DELETE FROM public.contest_template_subjects WHERE template_id = (SELECT id FROM public.contest_templates WHERE nome='Vestibular FGV Direito SP' AND tipo='vestibular' LIMIT 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Língua Portuguesa', 0 FROM public.contest_templates WHERE nome='Vestibular FGV Direito SP' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Compreensão e interpretação de textos complexos', 0),
  ((SELECT id FROM s), 'Análise do discurso e argumentação', 1),
  ((SELECT id FROM s), 'Norma-padrão, adequação vocabular e sintaxe', 2),
  ((SELECT id FROM s), 'Coesão, coerência e recursos estilísticos', 3);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Língua Inglesa', 1 FROM public.contest_templates WHERE nome='Vestibular FGV Direito SP' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Leitura e interpretação de textos jornalísticos e acadêmicos', 0),
  ((SELECT id FROM s), 'Reconhecimento de informações específicas e inferência de significados', 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Ciências Humanas', 2 FROM public.contest_templates WHERE nome='Vestibular FGV Direito SP' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Processos históricos do Brasil e do mundo (séculos XIX a XXI)', 0),
  ((SELECT id FROM s), 'Formação do Estado e instituições políticas', 1),
  ((SELECT id FROM s), 'Dinâmicas espaciais, urbanização e demografia', 2),
  ((SELECT id FROM s), 'Geopolítica, economia global e atualidades', 3);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Artes e Questões Contemporâneas', 3 FROM public.contest_templates WHERE nome='Vestibular FGV Direito SP' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'História da arte e principais movimentos estéticos', 0),
  ((SELECT id FROM s), 'Análise de obras de arte, cinema e manifestações culturais', 1),
  ((SELECT id FROM s), 'Impactos socioculturais da tecnologia, mídia e redes sociais', 2),
  ((SELECT id FROM s), 'Diversidade, direitos humanos e cidadania', 3);

-- ===== Vestibular FGV EAESP (4 matérias) =====
INSERT INTO public.contest_templates (slug, nome, plano, concurso, tipo, area, cor, status, is_public, scope, institution_type, uf)
VALUES ('vestibular-fgv-eaesp', 'Vestibular FGV EAESP', 'free', 'FGV EAESP', 'vestibular', 'Geral', '#2563EB', 'ativo', true, 'estadual', 'privada', 'SP')
ON CONFLICT (slug) DO UPDATE SET nome = EXCLUDED.nome, is_public = true;

DELETE FROM public.contest_template_subjects WHERE template_id = (SELECT id FROM public.contest_templates WHERE nome='Vestibular FGV EAESP' AND tipo='vestibular' LIMIT 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Matemática Aplicada', 0 FROM public.contest_templates WHERE nome='Vestibular FGV EAESP' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Matemática financeira, juros e porcentagem', 0),
  ((SELECT id FROM s), 'Estatística descritiva e probabilidade', 1),
  ((SELECT id FROM s), 'Funções (afim, quadrática, exponencial, logarítmica) e leitura de gráficos', 2),
  ((SELECT id FROM s), 'Progressões (PA e PG)', 3),
  ((SELECT id FROM s), 'Matrizes e sistemas de equações lineares', 4),
  ((SELECT id FROM s), 'Geometria plana e espacial', 5);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Língua Portuguesa e Literatura', 1 FROM public.contest_templates WHERE nome='Vestibular FGV EAESP' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Interpretação textual, inferência e articulação de ideias', 0),
  ((SELECT id FROM s), 'Análise morfossintática e semântica', 1),
  ((SELECT id FROM s), 'Principais movimentos da literatura brasileira', 2),
  ((SELECT id FROM s), 'Análise de textos literários e suas relações com o contexto histórico', 3);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Ciências Humanas', 2 FROM public.contest_templates WHERE nome='Vestibular FGV EAESP' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'História do Brasil e do Mundo (foco nos séculos XX e XXI)', 0),
  ((SELECT id FROM s), 'Geografia humana, econômica e globalização', 1),
  ((SELECT id FROM s), 'Blocos econômicos e relações internacionais', 2),
  ((SELECT id FROM s), 'Problemas socioambientais contemporâneos', 3);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Língua Inglesa', 3 FROM public.contest_templates WHERE nome='Vestibular FGV EAESP' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Compreensão leitora em contextos gerais e de negócios', 0),
  ((SELECT id FROM s), 'Identificação de tese, argumentos e vocabulário contextual', 1);

-- ===== Vestibular FGV EPGE (3 matérias) =====
INSERT INTO public.contest_templates (slug, nome, plano, concurso, tipo, area, cor, status, is_public, scope, institution_type, uf)
VALUES ('vestibular-fgv-epge', 'Vestibular FGV EPGE', 'free', 'FGV EPGE', 'vestibular', 'Geral', '#2563EB', 'ativo', true, 'estadual', 'privada', 'RJ')
ON CONFLICT (slug) DO UPDATE SET nome = EXCLUDED.nome, is_public = true;

DELETE FROM public.contest_template_subjects WHERE template_id = (SELECT id FROM public.contest_templates WHERE nome='Vestibular FGV EPGE' AND tipo='vestibular' LIMIT 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Matemática', 0 FROM public.contest_templates WHERE nome='Vestibular FGV EPGE' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Lógica matemática e teoria dos conjuntos', 0),
  ((SELECT id FROM s), 'Álgebra, equações e inequações', 1),
  ((SELECT id FROM s), 'Funções de variáveis reais', 2),
  ((SELECT id FROM s), 'Trigonometria', 3),
  ((SELECT id FROM s), 'Geometria plana, espacial e analítica', 4),
  ((SELECT id FROM s), 'Sequências numéricas, matrizes, determinantes e sistemas lineares', 5),
  ((SELECT id FROM s), 'Análise combinatória e probabilidade', 6),
  ((SELECT id FROM s), 'Polinômios e números complexos', 7);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Língua Portuguesa', 1 FROM public.contest_templates WHERE nome='Vestibular FGV EPGE' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Leitura, compreensão e estruturação de textos', 0),
  ((SELECT id FROM s), 'Conhecimentos linguísticos: fonética, morfologia e sintaxe', 1),
  ((SELECT id FROM s), 'Variação linguística e figuras de linguagem', 2);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Língua Inglesa', 2 FROM public.contest_templates WHERE nome='Vestibular FGV EPGE' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Compreensão de textos', 0),
  ((SELECT id FROM s), 'Aspectos gramaticais e semânticos essenciais', 1);
