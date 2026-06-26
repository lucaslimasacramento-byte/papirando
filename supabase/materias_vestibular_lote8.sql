-- Lote 8: Vestibular UEG, Vestibular UEL
-- Vestibular UEFS → disciplinas: [] — deletar do catálogo.
-- ON CONFLICT em cada seção para recriar registros se necessário.

-- ===== Vestibular UEG (8 matérias) =====
INSERT INTO public.contest_templates (slug, nome, plano, concurso, tipo, area, cor, status, is_public, scope, institution_type, uf)
VALUES ('vestibular-ueg', 'Vestibular UEG', 'free', 'UEG', 'vestibular', 'Geral', '#2563EB', 'ativo', true, 'estadual', 'publica', 'GO')
ON CONFLICT (slug) DO UPDATE SET nome = EXCLUDED.nome, is_public = true;

DELETE FROM public.contest_template_subjects WHERE template_id = (SELECT id FROM public.contest_templates WHERE nome='Vestibular UEG' AND tipo='vestibular' LIMIT 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Biologia', 0 FROM public.contest_templates WHERE nome='Vestibular UEG' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Organização celular e bases moleculares da vida', 0),
  ((SELECT id FROM s), 'Diversidade dos seres vivos (vírus, procariontes, fungos, protistas, plantas e animais)', 1),
  ((SELECT id FROM s), 'Anatomia e fisiologia humana e comparada', 2),
  ((SELECT id FROM s), 'Genética clássica, herança e noções de biologia molecular', 3),
  ((SELECT id FROM s), 'Evolução: teorias evolutivas, especiação e genética de populações', 4),
  ((SELECT id FROM s), 'Ecologia: dinâmica de populações, ciclos biogeoquímicos, biomas (com ênfase no Cerrado) e impactos ambientais', 5);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Física', 1 FROM public.contest_templates WHERE nome='Vestibular UEG' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Mecânica: cinemática, leis de Newton, conservação de energia e quantidade de movimento, gravitação', 0),
  ((SELECT id FROM s), 'Hidrostática e fluidos', 1),
  ((SELECT id FROM s), 'Termologia: calorimetria, termodinâmica e comportamento dos gases', 2),
  ((SELECT id FROM s), 'Óptica geométrica e fenômenos ondulatórios', 3),
  ((SELECT id FROM s), 'Eletromagnetismo: eletrostática, circuitos elétricos, campo magnético e indução', 4);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Geografia', 2 FROM public.contest_templates WHERE nome='Vestibular UEG' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Cartografia: escalas, projeções e leitura de mapas', 0),
  ((SELECT id FROM s), 'Geomorfologia, estrutura geológica e processos erosivos', 1),
  ((SELECT id FROM s), 'Climatologia e hidrografia do Brasil e do mundo', 2),
  ((SELECT id FROM s), 'Demografia, estrutura populacional e migrações', 3),
  ((SELECT id FROM s), 'Geografia agrária, urbanização e metropolização', 4),
  ((SELECT id FROM s), 'Geopolítica, globalização e blocos econômicos', 5),
  ((SELECT id FROM s), 'Geografia de Goiás: aspectos físicos, economia, agropecuária, industrialização e organização espacial', 6);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'História', 3 FROM public.contest_templates WHERE nome='Vestibular UEG' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'História Antiga e Medieval: estruturação social, política e cultural', 0),
  ((SELECT id FROM s), 'Idade Moderna: expansão comercial, Renascimento, Absolutismo e colonização das Américas', 1),
  ((SELECT id FROM s), 'Idade Contemporânea: Revoluções Burguesas, Revolução Industrial, Imperialismo, Guerras Mundiais e Guerra Fria', 2),
  ((SELECT id FROM s), 'História do Brasil: Período Colonial, Império, Primeira República, Era Vargas, Ditadura Militar e Nova República', 3),
  ((SELECT id FROM s), 'História de Goiás: ocupação do território, bandeirantismo, ciclo do ouro, economia agropecuária, construção de Goiânia e desenvolvimento regional', 4);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Língua Estrangeira (Inglês ou Espanhol)', 4 FROM public.contest_templates WHERE nome='Vestibular UEG' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Leitura, compreensão e interpretação de textos diversos', 0),
  ((SELECT id FROM s), 'Identificação de informações principais e secundárias', 1),
  ((SELECT id FROM s), 'Estruturas gramaticais e vocabulário aplicados ao contexto textual', 2);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Língua Portuguesa e Literatura', 5 FROM public.contest_templates WHERE nome='Vestibular UEG' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Leitura e interpretação de textos literários e não literários', 0),
  ((SELECT id FROM s), 'Gêneros textuais, coesão, coerência e adequação linguística', 1),
  ((SELECT id FROM s), 'Morfossintaxe: classes de palavras, sintaxe da oração e do período, concordância e regência', 2),
  ((SELECT id FROM s), 'Semântica, figuras de linguagem e variação linguística', 3),
  ((SELECT id FROM s), 'História da Literatura Brasileira: principais escolas, movimentos e autores', 4),
  ((SELECT id FROM s), 'Literatura Goiana: principais obras e autores regionais', 5);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Matemática', 6 FROM public.contest_templates WHERE nome='Vestibular UEG' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Conjuntos numéricos, razão, proporção e porcentagem', 0),
  ((SELECT id FROM s), 'Funções: afim, quadrática, modular, exponencial e logarítmica', 1),
  ((SELECT id FROM s), 'Progressões aritméticas e geométricas', 2),
  ((SELECT id FROM s), 'Análise combinatória e probabilidade', 3),
  ((SELECT id FROM s), 'Geometria plana (polígonos, áreas e perímetros) e geometria espacial (poliedros e corpos redondos)', 4),
  ((SELECT id FROM s), 'Trigonometria e geometria analítica', 5),
  ((SELECT id FROM s), 'Estatística básica', 6);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Química', 7 FROM public.contest_templates WHERE nome='Vestibular UEG' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Estrutura da matéria e modelos atômicos', 0),
  ((SELECT id FROM s), 'Tabela periódica, ligações químicas e interações intermoleculares', 1),
  ((SELECT id FROM s), 'Funções inorgânicas (ácidos, bases, sais e óxidos)', 2),
  ((SELECT id FROM s), 'Estequiometria, leis ponderais e soluções', 3),
  ((SELECT id FROM s), 'Termoquímica, cinética química e equilíbrio químico', 4),
  ((SELECT id FROM s), 'Eletroquímica (pilhas e eletrólise)', 5),
  ((SELECT id FROM s), 'Química orgânica: funções, nomenclatura, isomeria e reações', 6);

-- ===== Vestibular UEL (11 matérias) =====
INSERT INTO public.contest_templates (slug, nome, plano, concurso, tipo, area, cor, status, is_public, scope, institution_type, uf)
VALUES ('vestibular-uel', 'Vestibular UEL', 'free', 'UEL', 'vestibular', 'Geral', '#2563EB', 'ativo', true, 'estadual', 'publica', 'PR')
ON CONFLICT (slug) DO UPDATE SET nome = EXCLUDED.nome, is_public = true;

DELETE FROM public.contest_template_subjects WHERE template_id = (SELECT id FROM public.contest_templates WHERE nome='Vestibular UEL' AND tipo='vestibular' LIMIT 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Artes', 0 FROM public.contest_templates WHERE nome='Vestibular UEL' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'História da Arte: movimentos, estilos e períodos da arte ocidental e brasileira', 0),
  ((SELECT id FROM s), 'Linguagens visuais: pintura, escultura, arquitetura e fotografia', 1),
  ((SELECT id FROM s), 'Música: elementos estruturais, história da música e música brasileira', 2),
  ((SELECT id FROM s), 'Artes Cênicas: teatro, dança e suas manifestações históricas e contemporâneas', 3);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Biologia', 1 FROM public.contest_templates WHERE nome='Vestibular UEL' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Biologia Celular e Bioquímica: estrutura, organelas, metabolismo (respiração e fotossíntese)', 0),
  ((SELECT id FROM s), 'Genética e Biologia Molecular: leis da hereditariedade, DNA/RNA, biotecnologia', 1),
  ((SELECT id FROM s), 'Evolução: teorias evolutivas, evidências e especiação', 2),
  ((SELECT id FROM s), 'Diversidade Biológica: classificação, características dos reinos e embriologia', 3),
  ((SELECT id FROM s), 'Fisiologia e Anatomia Humana', 4),
  ((SELECT id FROM s), 'Ecologia: fluxos de energia, ciclos da matéria, relações ecológicas, biomas e conservação ambiental', 5);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Filosofia', 2 FROM public.contest_templates WHERE nome='Vestibular UEL' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Mito e surgimento da Filosofia na Grécia Antiga', 0),
  ((SELECT id FROM s), 'Teoria do Conhecimento: racionalismo, empirismo e criticismo', 1),
  ((SELECT id FROM s), 'Ética e Moral: concepções antigas, medievais, modernas e contemporâneas', 2),
  ((SELECT id FROM s), 'Filosofia Política: Estado, poder, contratualismo e democracia', 3),
  ((SELECT id FROM s), 'Filosofia da Ciência e Estética', 4);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Física', 3 FROM public.contest_templates WHERE nome='Vestibular UEL' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Mecânica: cinemática, leis de Newton, estática, energia, impulso e gravitação', 0),
  ((SELECT id FROM s), 'Física Térmica: temperatura, calor, dilatação, leis da termodinâmica e gases', 1),
  ((SELECT id FROM s), 'Óptica Geométrica e Ondulatória', 2),
  ((SELECT id FROM s), 'Eletromagnetismo: eletrostática, corrente, circuitos, campo magnético e indução', 3),
  ((SELECT id FROM s), 'Fundamentos da Física Moderna: efeito fotoelétrico e dualidade onda-partícula', 4);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Geografia', 4 FROM public.contest_templates WHERE nome='Vestibular UEL' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Epistemologia da Geografia e Cartografia', 0),
  ((SELECT id FROM s), 'Dinâmica da Terra: geologia, geomorfologia, solos, climatologia e hidrografia', 1),
  ((SELECT id FROM s), 'Espaço Agrário e Urbano: estrutura fundiária, agronegócio, urbanização e metropolização', 2),
  ((SELECT id FROM s), 'População: dinâmicas demográficas, migrações e trabalho', 3),
  ((SELECT id FROM s), 'Geopolítica: ordem mundial, globalização, blocos econômicos e conflitos', 4),
  ((SELECT id FROM s), 'Geografia do Paraná: relevo, clima, economia, ocupação e dinâmica populacional', 5);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'História', 5 FROM public.contest_templates WHERE nome='Vestibular UEL' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'História Antiga e Medieval: civilizações, escravismo, feudalismo e cultura', 0),
  ((SELECT id FROM s), 'História Moderna: transição para o capitalismo, mercantilismo, renascimento, reformas e absolutismo', 1),
  ((SELECT id FROM s), 'História Contemporânea: revoluções burguesas, industrialização, imperialismo, guerras mundiais, regimes totalitários e descolonização', 2),
  ((SELECT id FROM s), 'História do Brasil: sistema colonial, escravidão, Brasil Império e República (economia, política e movimentos sociais)', 3),
  ((SELECT id FROM s), 'História do Paraná: povos originários, colonização, erva-mate, café, conflitos (Guerra do Contestado) e modernização', 4);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Língua Estrangeira (Inglês, Espanhol ou Francês)', 6 FROM public.contest_templates WHERE nome='Vestibular UEL' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Compreensão leitora de textos em diferentes gêneros e registros', 0),
  ((SELECT id FROM s), 'Identificação da função social do texto e intenção do autor', 1),
  ((SELECT id FROM s), 'Domínio de estruturas morfossintáticas e vocabulário no contexto do texto', 2);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Língua Portuguesa e Literaturas', 7 FROM public.contest_templates WHERE nome='Vestibular UEL' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Leitura, compreensão e análise de textos verbais e não verbais', 0),
  ((SELECT id FROM s), 'Funcionamento da língua: fonologia, morfologia, sintaxe, semântica e pragmática', 1),
  ((SELECT id FROM s), 'Variação linguística e norma-padrão', 2),
  ((SELECT id FROM s), 'Teoria Literária: gêneros literários, linguagem poética e narrativa', 3),
  ((SELECT id FROM s), 'Historiografia Literária (Brasil e Portugal): estilos de época, autores e obras representativas', 4);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Matemática', 8 FROM public.contest_templates WHERE nome='Vestibular UEL' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Álgebra: conjuntos, números reais e complexos, polinômios, equações e sistemas lineares', 0),
  ((SELECT id FROM s), 'Funções: afim, quadrática, modular, exponencial e logarítmica', 1),
  ((SELECT id FROM s), 'Geometria: plana (polígonos e circunferências), espacial (poliedros e sólidos de revolução) e analítica', 2),
  ((SELECT id FROM s), 'Trigonometria: ciclo trigonométrico, funções e relações', 3),
  ((SELECT id FROM s), 'Matemática Discreta: progressões, análise combinatória e probabilidade', 4),
  ((SELECT id FROM s), 'Estatística: medidas de tendência central, dispersão e interpretação de gráficos', 5);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Química', 9 FROM public.contest_templates WHERE nome='Vestibular UEL' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Constituição da matéria, modelos atômicos e classificação periódica', 0),
  ((SELECT id FROM s), 'Ligações químicas, polaridade e forças intermoleculares', 1),
  ((SELECT id FROM s), 'Funções inorgânicas e reações químicas', 2),
  ((SELECT id FROM s), 'Estequiometria, cálculos químicos e leis ponderais', 3),
  ((SELECT id FROM s), 'Soluções e propriedades coligativas', 4),
  ((SELECT id FROM s), 'Termoquímica, cinética química e equilíbrio químico', 5),
  ((SELECT id FROM s), 'Eletroquímica (pilhas e eletrólise)', 6),
  ((SELECT id FROM s), 'Química Orgânica: estrutura do carbono, funções, nomenclatura, isomeria e reações orgânicas', 7);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Sociologia', 10 FROM public.contest_templates WHERE nome='Vestibular UEL' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'O surgimento da Sociologia e o contexto histórico', 0),
  ((SELECT id FROM s), 'Teorias Sociológicas Clássicas: Émile Durkheim, Karl Marx e Max Weber', 1),
  ((SELECT id FROM s), 'Relações indivíduo-sociedade, socialização e instituições sociais', 2),
  ((SELECT id FROM s), 'Trabalho, classes sociais e desigualdade', 3),
  ((SELECT id FROM s), 'Cultura, ideologia e indústria cultural', 4),
  ((SELECT id FROM s), 'Estado, poder, política e movimentos sociais', 5),
  ((SELECT id FROM s), 'Sociologia no Brasil: pensamento social brasileiro e dinâmicas contemporâneas', 6);
