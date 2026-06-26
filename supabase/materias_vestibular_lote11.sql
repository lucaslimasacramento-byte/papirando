-- Lote 11: Vestibular UEPG (9 matérias, PR)
-- UESC, UENF, UEPA → disciplinas: [] — deletar do catálogo.

-- ===== Vestibular UEPG =====
INSERT INTO public.contest_templates (slug, nome, plano, concurso, tipo, area, cor, status, is_public, scope, institution_type, uf)
VALUES ('vestibular-uepg', 'Vestibular UEPG', 'free', 'UEPG', 'vestibular', 'Geral', '#2563EB', 'ativo', true, 'estadual', 'publica', 'PR')
ON CONFLICT (slug) DO UPDATE SET nome = EXCLUDED.nome, is_public = true;

DELETE FROM public.contest_template_subjects WHERE template_id = (SELECT id FROM public.contest_templates WHERE nome='Vestibular UEPG' AND tipo='vestibular' LIMIT 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Biologia', 0 FROM public.contest_templates WHERE nome='Vestibular UEPG' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Bases moleculares da vida e biologia celular', 0),
  ((SELECT id FROM s), 'Histologia animal e vegetal', 1),
  ((SELECT id FROM s), 'Diversidade biológica e classificação dos seres vivos', 2),
  ((SELECT id FROM s), 'Anatomia e fisiologia comparada', 3),
  ((SELECT id FROM s), 'Genética, hereditariedade e biotecnologia', 4),
  ((SELECT id FROM s), 'Evolução biológica', 5),
  ((SELECT id FROM s), 'Ecologia e dinâmica dos ecossistemas', 6);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Física', 1 FROM public.contest_templates WHERE nome='Vestibular UEPG' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Mecânica: cinemática, leis de Newton, estática, energia e quantidade de movimento', 0),
  ((SELECT id FROM s), 'Gravitação e leis de Kepler', 1),
  ((SELECT id FROM s), 'Mecânica dos fluidos (hidrostática)', 2),
  ((SELECT id FROM s), 'Termologia: calorimetria, termodinâmica e comportamento dos gases', 3),
  ((SELECT id FROM s), 'Óptica geométrica e fenômenos ondulatórios', 4),
  ((SELECT id FROM s), 'Eletromagnetismo: eletrostática, eletrodinâmica e indução magnética', 5),
  ((SELECT id FROM s), 'Noções de Física Moderna', 6);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Geografia', 2 FROM public.contest_templates WHERE nome='Vestibular UEPG' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Cartografia e representação espacial', 0),
  ((SELECT id FROM s), 'Dinâmica da natureza: estrutura da Terra, relevo, clima, hidrografia e biomas', 1),
  ((SELECT id FROM s), 'Questões ambientais e impactos antrópicos', 2),
  ((SELECT id FROM s), 'Dinâmica populacional, estrutura demográfica e migrações', 3),
  ((SELECT id FROM s), 'Urbanização e espaço agrário', 4),
  ((SELECT id FROM s), 'Geopolítica, globalização e ordem mundial', 5),
  ((SELECT id FROM s), 'Geografia do Paraná: aspectos naturais, sociais e econômicos', 6);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'História', 3 FROM public.contest_templates WHERE nome='Vestibular UEPG' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Antiguidade Clássica e Oriental', 0),
  ((SELECT id FROM s), 'Idade Média e transição para o sistema capitalista', 1),
  ((SELECT id FROM s), 'Idade Moderna: Renascimento, Reformas Religiosas e Absolutismo', 2),
  ((SELECT id FROM s), 'Idade Contemporânea: Revolução Francesa, Industrialização, Imperialismo e Guerras Mundiais', 3),
  ((SELECT id FROM s), 'História do Brasil: Período Colonial, Império, Primeira República, Era Vargas e ditadura civil-militar', 4),
  ((SELECT id FROM s), 'História do Paraná: ocupação, economia tropeira, erva-mate, movimentos sociais e o Paraná contemporâneo', 5);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Língua Estrangeira (Inglês, Espanhol ou Francês)', 4 FROM public.contest_templates WHERE nome='Vestibular UEPG' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Leitura, compreensão e interpretação de textos diversos', 0),
  ((SELECT id FROM s), 'Aspectos gramaticais e morfológicos essenciais', 1),
  ((SELECT id FROM s), 'Vocabulário inserido no contexto textual', 2);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Língua Portuguesa e Literatura', 5 FROM public.contest_templates WHERE nome='Vestibular UEPG' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Leitura e interpretação de textos', 0),
  ((SELECT id FROM s), 'Gêneros e tipologias textuais', 1),
  ((SELECT id FROM s), 'Variação linguística e níveis de linguagem', 2),
  ((SELECT id FROM s), 'Gramática normativa: morfologia, sintaxe de concordância e regência, crase e pontuação', 3),
  ((SELECT id FROM s), 'Semântica, polissemia e figuras de linguagem', 4),
  ((SELECT id FROM s), 'Estilos de época, escolas literárias e principais autores da literatura brasileira', 5),
  ((SELECT id FROM s), 'Literatura paranaense', 6);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Matemática', 6 FROM public.contest_templates WHERE nome='Vestibular UEPG' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Conjuntos numéricos, aritmética e álgebra elementar', 0),
  ((SELECT id FROM s), 'Funções: afim, quadrática, modular, exponencial e logarítmica', 1),
  ((SELECT id FROM s), 'Sequências, progressões (PA e PG) e matemática financeira', 2),
  ((SELECT id FROM s), 'Trigonometria no triângulo retângulo e no ciclo trigonométrico', 3),
  ((SELECT id FROM s), 'Matrizes, determinantes e sistemas lineares', 4),
  ((SELECT id FROM s), 'Análise combinatória e probabilidade', 5),
  ((SELECT id FROM s), 'Geometria plana (polígonos e circunferências) e espacial (poliedros e sólidos de revolução)', 6),
  ((SELECT id FROM s), 'Geometria analítica e estatística básica', 7);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Química', 7 FROM public.contest_templates WHERE nome='Vestibular UEPG' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Estrutura da matéria e modelos atômicos', 0),
  ((SELECT id FROM s), 'Classificação periódica dos elementos e propriedades', 1),
  ((SELECT id FROM s), 'Ligações químicas, polaridade e interações intermoleculares', 2),
  ((SELECT id FROM s), 'Funções inorgânicas e reações inorgânicas', 3),
  ((SELECT id FROM s), 'Leis ponderais, estequiometria e soluções', 4),
  ((SELECT id FROM s), 'Termoquímica e cinética química', 5),
  ((SELECT id FROM s), 'Equilíbrio químico (molecular e iônico)', 6),
  ((SELECT id FROM s), 'Eletroquímica: pilhas e eletrólise', 7),
  ((SELECT id FROM s), 'Química orgânica: cadeias carbônicas, nomenclatura, funções orgânicas, isomeria e reações', 8);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Filosofia e Sociologia', 8 FROM public.contest_templates WHERE nome='Vestibular UEPG' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'As origens da Filosofia e a passagem do mito à razão', 0),
  ((SELECT id FROM s), 'Teoria do conhecimento (epistemologia)', 1),
  ((SELECT id FROM s), 'Ética, moral e filosofia política', 2),
  ((SELECT id FROM s), 'Surgimento da Sociologia e os teóricos clássicos (Marx, Durkheim e Weber)', 3),
  ((SELECT id FROM s), 'Estratificação social, classes e desigualdades', 4),
  ((SELECT id FROM s), 'Cultura, ideologia, indústria cultural e meios de comunicação', 5),
  ((SELECT id FROM s), 'Mundo do trabalho e movimentos sociais', 6),
  ((SELECT id FROM s), 'Cidadania, Estado e poder', 7);
