-- Lote 7: Vestibular UDESC, Vestibular UEA, Vestibular UECE
-- ON CONFLICT em cada seção para recriar registros deletados do catálogo.

-- ===== Vestibular UDESC (9 matérias) =====
INSERT INTO public.contest_templates (slug, nome, plano, concurso, tipo, area, cor, status, is_public, scope, institution_type, uf)
VALUES ('vestibular-udesc', 'Vestibular UDESC', 'free', 'UDESC', 'vestibular', 'Geral', '#2563EB', 'ativo', true, 'estadual', 'publica', 'SC')
ON CONFLICT (slug) DO UPDATE SET nome = EXCLUDED.nome, is_public = true;

DELETE FROM public.contest_template_subjects WHERE template_id = (SELECT id FROM public.contest_templates WHERE nome='Vestibular UDESC' AND tipo='vestibular' LIMIT 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Biologia', 0 FROM public.contest_templates WHERE nome='Vestibular UDESC' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Bases da Citologia: organização celular, membrana, organelas e núcleo', 0),
  ((SELECT id FROM s), 'Divisão celular: mitose e meiose', 1),
  ((SELECT id FROM s), 'Metabolismo energético: fotossíntese, respiração celular e fermentação', 2),
  ((SELECT id FROM s), 'Histologia animal e vegetal', 3),
  ((SELECT id FROM s), 'Classificação e reinos dos seres vivos (Monera, Protista, Fungi, Plantae e Animalia)', 4),
  ((SELECT id FROM s), 'Botânica: morfologia, anatomia e fisiologia das plantas', 5),
  ((SELECT id FROM s), 'Zoologia: invertebrados e vertebrados', 6),
  ((SELECT id FROM s), 'Fisiologia humana e saúde estrutural', 7),
  ((SELECT id FROM s), 'Genética: Leis de Mendel, grupos sanguíneos, herança ligada ao sexo e noções de biologia molecular', 8),
  ((SELECT id FROM s), 'Evolução: teorias, especiação e evidências evolutivas', 9),
  ((SELECT id FROM s), 'Ecologia: fluxos de energia, ciclos biogeoquímicos, relações ecológicas, sucessão e biomas', 10);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Física', 1 FROM public.contest_templates WHERE nome='Vestibular UDESC' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Mecânica: cinemática escalar e vetorial, dinâmica e Leis de Newton', 0),
  ((SELECT id FROM s), 'Trabalho, energia, potência e impulso', 1),
  ((SELECT id FROM s), 'Estática de corpos rígidos e hidrostática', 2),
  ((SELECT id FROM s), 'Termologia: termometria, calorimetria, dilatação térmica e termodinâmica', 3),
  ((SELECT id FROM s), 'Óptica geométrica: reflexão, refração, lentes e espelhos', 4),
  ((SELECT id FROM s), 'Ondulatória e Acústica', 5),
  ((SELECT id FROM s), 'Eletromagnetismo: eletrostática, eletrodinâmica (circuitos) e campo magnético', 6),
  ((SELECT id FROM s), 'Noções de Física Moderna', 7);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Geografia', 2 FROM public.contest_templates WHERE nome='Vestibular UDESC' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Cartografia e representação do espaço', 0),
  ((SELECT id FROM s), 'Geomorfologia, estrutura geológica e relevo', 1),
  ((SELECT id FROM s), 'Climatologia e hidrografia do Brasil e do mundo', 2),
  ((SELECT id FROM s), 'Biogeografia e problemas ambientais', 3),
  ((SELECT id FROM s), 'População: dinâmica, estrutura e migrações', 4),
  ((SELECT id FROM s), 'Espaço agrário: sistemas agrícolas e estrutura fundiária', 5),
  ((SELECT id FROM s), 'Urbanização e rede urbana', 6),
  ((SELECT id FROM s), 'Geografia da Indústria e fontes de energia', 7),
  ((SELECT id FROM s), 'Geopolítica, globalização e blocos econômicos', 8),
  ((SELECT id FROM s), 'Geografia de Santa Catarina: aspectos físicos, econômicos e socioespaciais', 9);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'História', 3 FROM public.contest_templates WHERE nome='Vestibular UDESC' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Antiguidade Clássica (Grécia e Roma)', 0),
  ((SELECT id FROM s), 'Idade Média: feudalismo, Igreja Católica e mundo islâmico', 1),
  ((SELECT id FROM s), 'Idade Moderna: Renascimento, Reformas Religiosas, Absolutismo e Mercantilismo', 2),
  ((SELECT id FROM s), 'Expansão Marítima e colonização da América', 3),
  ((SELECT id FROM s), 'Idade Contemporânea: Revolução Francesa, Revolução Industrial, Imperialismo e Guerras Mundiais', 4),
  ((SELECT id FROM s), 'Guerra Fria e a Nova Ordem Mundial', 5),
  ((SELECT id FROM s), 'História do Brasil: Período Colonial (economia açucareira, mineração, escravidão)', 6),
  ((SELECT id FROM s), 'Brasil Império: Independência, Regência e Segundo Reinado', 7),
  ((SELECT id FROM s), 'Brasil República: Primeira República, Era Vargas, Ditadura Militar e redemocratização', 8),
  ((SELECT id FROM s), 'História de Santa Catarina: ocupação, imigração, Guerra do Contestado e economia regional', 9);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Língua Estrangeira (Inglês ou Espanhol)', 4 FROM public.contest_templates WHERE nome='Vestibular UDESC' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Leitura, compreensão e interpretação de textos autênticos', 0),
  ((SELECT id FROM s), 'Reconhecimento de vocabulário em contexto', 1),
  ((SELECT id FROM s), 'Aspectos gramaticais essenciais para a compreensão textual (tempos verbais, conectivos, pronomes)', 2);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Língua Portuguesa e Literatura', 5 FROM public.contest_templates WHERE nome='Vestibular UDESC' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Compreensão e interpretação de textos literários e não literários', 0),
  ((SELECT id FROM s), 'Coerência e coesão textual', 1),
  ((SELECT id FROM s), 'Variação linguística', 2),
  ((SELECT id FROM s), 'Morfossintaxe: classes de palavras, concordância, regência e crase', 3),
  ((SELECT id FROM s), 'Estilística e figuras de linguagem', 4),
  ((SELECT id FROM s), 'História da Literatura Brasileira: principais escolas, autores e estilos de época', 5);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Literatura — Obras obrigatórias', 6 FROM public.contest_templates WHERE nome='Vestibular UDESC' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Torto Arado (Itamar Vieira Junior)', 0),
  ((SELECT id FROM s), 'Úrsula (Maria Firmina dos Reis)', 1),
  ((SELECT id FROM s), 'A alma encantadora das ruas (João do Rio)', 2),
  ((SELECT id FROM s), 'Velhos (Alumbramentos) (Jair Francisco Hamms)', 3),
  ((SELECT id FROM s), 'O ano em que meus pais saíram de férias (Claudio Galperin et al. - Roteiro/Filme)', 4);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Matemática', 7 FROM public.contest_templates WHERE nome='Vestibular UDESC' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Conjuntos numéricos e lógica', 0),
  ((SELECT id FROM s), 'Funções: afim, quadrática, modular, exponencial e logarítmica', 1),
  ((SELECT id FROM s), 'Trigonometria e funções trigonométricas', 2),
  ((SELECT id FROM s), 'Progressões Aritméticas (PA) e Geométricas (PG)', 3),
  ((SELECT id FROM s), 'Matrizes, determinantes e sistemas de equações lineares', 4),
  ((SELECT id FROM s), 'Análise combinatória, binômio de Newton e probabilidade', 5),
  ((SELECT id FROM s), 'Geometria plana: polígonos, circunferência, áreas e perímetros', 6),
  ((SELECT id FROM s), 'Geometria espacial: prismas, cilindros, pirâmides, cones e esferas', 7),
  ((SELECT id FROM s), 'Geometria analítica: ponto, reta, circunferência e cônicas', 8),
  ((SELECT id FROM s), 'Estatística descritiva, polinômios e números complexos', 9);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Química', 8 FROM public.contest_templates WHERE nome='Vestibular UDESC' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Estrutura atômica, modelos e classificação periódica', 0),
  ((SELECT id FROM s), 'Ligações químicas e interações intermoleculares', 1),
  ((SELECT id FROM s), 'Funções inorgânicas (ácidos, bases, sais e óxidos)', 2),
  ((SELECT id FROM s), 'Reações químicas, leis ponderais e estequiometria', 3),
  ((SELECT id FROM s), 'Estudo das soluções e propriedades coligativas', 4),
  ((SELECT id FROM s), 'Termoquímica (entalpia e Lei de Hess)', 5),
  ((SELECT id FROM s), 'Cinética química e princípios do equilíbrio químico', 6),
  ((SELECT id FROM s), 'Eletroquímica: pilhas e eletrólise', 7),
  ((SELECT id FROM s), 'Química Orgânica: classificação de cadeias, nomenclatura, funções orgânicas, isomeria e principais reações', 8);

-- ===== Vestibular UEA (10 matérias) =====
INSERT INTO public.contest_templates (slug, nome, plano, concurso, tipo, area, cor, status, is_public, scope, institution_type, uf)
VALUES ('vestibular-uea', 'Vestibular UEA', 'free', 'UEA', 'vestibular', 'Geral', '#2563EB', 'ativo', true, 'estadual', 'publica', 'AM')
ON CONFLICT (slug) DO UPDATE SET nome = EXCLUDED.nome, is_public = true;

DELETE FROM public.contest_template_subjects WHERE template_id = (SELECT id FROM public.contest_templates WHERE nome='Vestibular UEA' AND tipo='vestibular' LIMIT 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Biologia', 0 FROM public.contest_templates WHERE nome='Vestibular UEA' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Organização estrutural dos seres vivos: células procariontes e eucariontes', 0),
  ((SELECT id FROM s), 'Bioquímica celular: água, sais, carboidratos, lipídios e proteínas', 1),
  ((SELECT id FROM s), 'Núcleo, cromossomos e divisão celular', 2),
  ((SELECT id FROM s), 'Vírus, bactérias, protistas e fungos', 3),
  ((SELECT id FROM s), 'Botânica: anatomia, fisiologia e sistemática vegetal', 4),
  ((SELECT id FROM s), 'Zoologia: classificação e fisiologia comparada', 5),
  ((SELECT id FROM s), 'Fisiologia e anatomia humana', 6),
  ((SELECT id FROM s), 'Genética, biotecnologia e engenharia genética', 7),
  ((SELECT id FROM s), 'Origem da vida e Evolução', 8),
  ((SELECT id FROM s), 'Ecologia, biomas brasileiros e amazônicos, e alterações ambientais', 9);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Física', 1 FROM public.contest_templates WHERE nome='Vestibular UEA' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Cinemática do ponto material', 0),
  ((SELECT id FROM s), 'Dinâmica: forças, leis de Newton, energia mecânica e sua conservação', 1),
  ((SELECT id FROM s), 'Gravitação universal e leis de Kepler', 2),
  ((SELECT id FROM s), 'Estática e Hidrostática', 3),
  ((SELECT id FROM s), 'Física térmica: calor, temperatura, mudanças de estado e Termodinâmica', 4),
  ((SELECT id FROM s), 'Óptica geométrica e formação de imagens', 5),
  ((SELECT id FROM s), 'Movimento harmônico simples e Ondulatória', 6),
  ((SELECT id FROM s), 'Eletrostática: carga, campo e potencial elétrico', 7),
  ((SELECT id FROM s), 'Eletrodinâmica: corrente, resistência, geradores e circuitos', 8),
  ((SELECT id FROM s), 'Eletromagnetismo', 9);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Geografia', 2 FROM public.contest_templates WHERE nome='Vestibular UEA' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Cartografia e sistemas de informação geográfica', 0),
  ((SELECT id FROM s), 'Geomorfologia, dinâmica climática e domínios morfoclimáticos', 1),
  ((SELECT id FROM s), 'Geopolítica mundial e conflitos contemporâneos', 2),
  ((SELECT id FROM s), 'Globalização, comércio e blocos econômicos', 3),
  ((SELECT id FROM s), 'Estrutura socioeconômica, população e indicadores sociais', 4),
  ((SELECT id FROM s), 'Urbanização e dinâmicas do espaço agrário brasileiro', 5),
  ((SELECT id FROM s), 'Geografia da Amazônia: física (bacia hidrográfica, clima, floresta), ocupação do território, projetos de desenvolvimento e questões ambientais', 6);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'História', 3 FROM public.contest_templates WHERE nome='Vestibular UEA' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'A Antiguidade (Oriente Próximo e Médio, Grécia e Roma)', 0),
  ((SELECT id FROM s), 'A Idade Média e a transição para o capitalismo', 1),
  ((SELECT id FROM s), 'A época Moderna: expansão ultramarina e sistemas coloniais', 2),
  ((SELECT id FROM s), 'A época Contemporânea: revoluções burguesas, socialismo, imperialismo', 3),
  ((SELECT id FROM s), 'Séculos XX e XXI: Guerras Mundiais, descolonização e mundo atual', 4),
  ((SELECT id FROM s), 'História do Brasil: organização colonial, estrutura do Império, Primeira República e desenvolvimento sociopolítico até os dias atuais', 5),
  ((SELECT id FROM s), 'História do Amazonas: populações indígenas, período colonial na Amazônia, época da borracha, Zona Franca de Manaus e transformações econômicas', 6);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Língua Estrangeira (Inglês ou Espanhol)', 4 FROM public.contest_templates WHERE nome='Vestibular UEA' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Leitura e compreensão de textos variados (informativos, literários, jornalísticos)', 0),
  ((SELECT id FROM s), 'Uso do vocabulário em contexto', 1),
  ((SELECT id FROM s), 'Funções gramaticais como ferramentas para compreensão textual', 2);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Língua Portuguesa', 5 FROM public.contest_templates WHERE nome='Vestibular UEA' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Tipologia textual e gêneros do discurso', 0),
  ((SELECT id FROM s), 'Compreensão e interpretação de textos', 1),
  ((SELECT id FROM s), 'Norma-padrão e variação linguística', 2),
  ((SELECT id FROM s), 'Coesão e coerência: articuladores sintático-semânticos', 3),
  ((SELECT id FROM s), 'Morfossintaxe: período simples e composto, concordância e regência', 4),
  ((SELECT id FROM s), 'Semântica e figuras de linguagem', 5);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Literatura', 6 FROM public.contest_templates WHERE nome='Vestibular UEA' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Teoria da Literatura e gêneros literários', 0),
  ((SELECT id FROM s), 'Obras e autores representativos das escolas literárias de Portugal (Trovadorismo ao Realismo) e do Brasil (Quinhentismo ao Modernismo e literatura contemporânea)', 1),
  ((SELECT id FROM s), 'Expressões literárias do Amazonas', 2);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Literatura — Obras obrigatórias', 7 FROM public.contest_templates WHERE nome='Vestibular UEA' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'A Ilustre Casa de Ramires (Eça de Queirós)', 0),
  ((SELECT id FROM s), 'A Selva (Ferreira de Castro)', 1),
  ((SELECT id FROM s), 'A Dança dos Fantasmas (Luiz Bacellar)', 2),
  ((SELECT id FROM s), 'Dois Irmãos (Milton Hatoum)', 3),
  ((SELECT id FROM s), 'Antes que o mundo acabe (Marcelo Carneiro da Cunha)', 4);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Matemática', 8 FROM public.contest_templates WHERE nome='Vestibular UEA' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Aritmética e Álgebra elementar', 0),
  ((SELECT id FROM s), 'Conjuntos e funções de 1º e 2º graus, modulares, exponenciais e logarítmicas', 1),
  ((SELECT id FROM s), 'Progressões (PA e PG)', 2),
  ((SELECT id FROM s), 'Trigonometria plana', 3),
  ((SELECT id FROM s), 'Matrizes, determinantes e sistemas lineares', 4),
  ((SELECT id FROM s), 'Análise combinatória e cálculo de probabilidades', 5),
  ((SELECT id FROM s), 'Estatística básica', 6),
  ((SELECT id FROM s), 'Geometria plana e áreas de superfícies', 7),
  ((SELECT id FROM s), 'Geometria espacial (poliedros e corpos redondos)', 8),
  ((SELECT id FROM s), 'Geometria analítica (estudo de pontos, retas e circunferências)', 9);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Química', 9 FROM public.contest_templates WHERE nome='Vestibular UEA' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Propriedades da matéria e estrutura do átomo', 0),
  ((SELECT id FROM s), 'Classificação periódica dos elementos', 1),
  ((SELECT id FROM s), 'Ligações químicas (iônica, covalente e metálica)', 2),
  ((SELECT id FROM s), 'Funções inorgânicas elementares', 3),
  ((SELECT id FROM s), 'Cálculos químicos, estequiometria e fórmulas', 4),
  ((SELECT id FROM s), 'Soluções: concentração e propriedades coligativas', 5),
  ((SELECT id FROM s), 'Termoquímica', 6),
  ((SELECT id FROM s), 'Cinética química e equilíbrio químico (incluindo pH e pOH)', 7),
  ((SELECT id FROM s), 'Eletroquímica e números de oxidação', 8),
  ((SELECT id FROM s), 'Química Orgânica: postulados, funções, isomeria e reações básicas', 9);

-- ===== Vestibular UECE (9 matérias) =====
INSERT INTO public.contest_templates (slug, nome, plano, concurso, tipo, area, cor, status, is_public, scope, institution_type, uf)
VALUES ('vestibular-uece', 'Vestibular UECE', 'free', 'UECE', 'vestibular', 'Geral', '#2563EB', 'ativo', true, 'estadual', 'publica', 'CE')
ON CONFLICT (slug) DO UPDATE SET nome = EXCLUDED.nome, is_public = true;

DELETE FROM public.contest_template_subjects WHERE template_id = (SELECT id FROM public.contest_templates WHERE nome='Vestibular UECE' AND tipo='vestibular' LIMIT 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Biologia', 0 FROM public.contest_templates WHERE nome='Vestibular UECE' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'A Química da vida: água, sais minerais, carboidratos, lipídios, proteínas, ácidos nucleicos e vitaminas', 0),
  ((SELECT id FROM s), 'Biologia Celular: envoltórios, organelas, núcleo, código genético e síntese proteica', 1),
  ((SELECT id FROM s), 'Metabolismo energético (fotossíntese, quimiossíntese, respiração aeróbia e fermentação)', 2),
  ((SELECT id FROM s), 'Histologia animal e vegetal', 3),
  ((SELECT id FROM s), 'Diversidade dos Seres Vivos: Vírus, Reino Monera, Protista, Fungi, Plantae e Animalia', 4),
  ((SELECT id FROM s), 'Anatomia e Fisiologia Humana comparada', 5),
  ((SELECT id FROM s), 'Genética: primeira e segunda leis de Mendel, herança ligada ao sexo, interação gênica e mutações', 6),
  ((SELECT id FROM s), 'Evolução: origem da vida, Lamarckismo, Darwinismo, Teoria Sintética e especiação', 7),
  ((SELECT id FROM s), 'Ecologia: populações, comunidades, ecossistemas, biomas, sucessão ecológica e poluição', 8);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Física', 1 FROM public.contest_templates WHERE nome='Vestibular UECE' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Mecânica: Grandezas Físicas, Cinemática, Dinâmica da Partícula, Estática, Trabalho e Energia, Quantidade de Movimento e Impulso, Gravitação Universal', 0),
  ((SELECT id FROM s), 'Física dos Fluidos: Hidrostática e Princípios de Arquimedes e Pascal', 1),
  ((SELECT id FROM s), 'Termodinâmica: Termometria, Calorimetria, Dilatação Térmica, Comportamento dos Gases e Leis da Termodinâmica', 2),
  ((SELECT id FROM s), 'Ondulatória e Acústica', 3),
  ((SELECT id FROM s), 'Óptica Geométrica', 4),
  ((SELECT id FROM s), 'Eletromagnetismo: Eletrostática, Corrente Elétrica, Circuitos (Eletrodinâmica), Campo Magnético e Indução Eletromagnética', 5),
  ((SELECT id FROM s), 'Fundamentos da Física Moderna', 6);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Geografia', 2 FROM public.contest_templates WHERE nome='Vestibular UECE' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Fundamentos de Cartografia e Sistemas de Coordenadas', 0),
  ((SELECT id FROM s), 'Dinâmica da Natureza: geologia, geomorfologia, solos, climatologia, hidrografia e domínios morfoclimáticos', 1),
  ((SELECT id FROM s), 'População: crescimento demográfico, estrutura e migrações', 2),
  ((SELECT id FROM s), 'Urbanização e problemas socioespaciais urbanos', 3),
  ((SELECT id FROM s), 'O Espaço Agrário: estrutura fundiária, relações de trabalho e agronegócio', 4),
  ((SELECT id FROM s), 'Industrialização, Comércio e Redes de Transporte', 5),
  ((SELECT id FROM s), 'Geopolítica Mundial e Relações Internacionais', 6),
  ((SELECT id FROM s), 'A Questão Ambiental e a Sustentabilidade', 7),
  ((SELECT id FROM s), 'Geografia do Brasil e Geografia do Ceará: características físicas, dinâmica econômica e indicadores sociais', 8);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'História', 3 FROM public.contest_templates WHERE nome='Vestibular UECE' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Fundamentos do conhecimento histórico', 0),
  ((SELECT id FROM s), 'Antiguidade: sociedades orientais e clássicas (Grécia e Roma)', 1),
  ((SELECT id FROM s), 'Idade Média: modo de produção feudal, o islamismo e a baixa idade média', 2),
  ((SELECT id FROM s), 'Idade Moderna: Renascimento comercial, urbano e cultural, Reformas Religiosas, formação dos Estados Nacionais e mercantilismo', 3),
  ((SELECT id FROM s), 'Expansão Marítima e América Colonial', 4),
  ((SELECT id FROM s), 'Idade Contemporânea: Iluminismo, Independência dos EUA, Revolução Francesa, Revolução Industrial, Imperialismo, Guerras Mundiais, Totalitarismos, Guerra Fria e atualidades', 5),
  ((SELECT id FROM s), 'História do Brasil: Sociedade e economia colonial, Período Joanino, Império (Primeiro Reinado, Regência e Segundo Reinado)', 6),
  ((SELECT id FROM s), 'República Brasileira: da República Velha à Era Vargas, Período Democrático (1946-1964), Ditadura Militar e Nova República', 7),
  ((SELECT id FROM s), 'História do Ceará: ocupação territorial, indígenas, escravidão, período imperial, movimentos messiânicos e oligarquias republicanas', 8);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Língua Estrangeira (Inglês, Espanhol ou Francês)', 4 FROM public.contest_templates WHERE nome='Vestibular UECE' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Compreensão e interpretação de textos originais', 0),
  ((SELECT id FROM s), 'Apreensão de sentido global e informações específicas', 1),
  ((SELECT id FROM s), 'Funcionamento sistêmico da língua estrangeira (gramática e vocabulário aplicados ao texto)', 2);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Língua Portuguesa', 5 FROM public.contest_templates WHERE nome='Vestibular UECE' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Leitura, compreensão e interpretação crítica de textos em diferentes gêneros e suportes', 0),
  ((SELECT id FROM s), 'Variação linguística', 1),
  ((SELECT id FROM s), 'Mecanismos de coesão e coerência textuais', 2),
  ((SELECT id FROM s), 'Ortografia oficial vigente', 3),
  ((SELECT id FROM s), 'Morfossintaxe: classes de palavras, estruturação do período simples e do período composto', 4),
  ((SELECT id FROM s), 'Sintaxe de concordância (nominal e verbal), regência (nominal e verbal) e colocação pronominal', 5),
  ((SELECT id FROM s), 'Uso do sinal indicativo de crase', 6),
  ((SELECT id FROM s), 'Pontuação e seus efeitos de sentido', 7),
  ((SELECT id FROM s), 'Semântica: sinonímia, antonímia, paronímia, polissemia e figuras de linguagem', 8);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Matemática', 6 FROM public.contest_templates WHERE nome='Vestibular UECE' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Lógica Matemática e Teoria dos Conjuntos', 0),
  ((SELECT id FROM s), 'Números reais e complexos', 1),
  ((SELECT id FROM s), 'Funções reais (afim, quadrática, modular, exponencial, logarítmica e trigonométricas)', 2),
  ((SELECT id FROM s), 'Progressões Aritméticas e Geométricas', 3),
  ((SELECT id FROM s), 'Matrizes, Determinantes e Sistemas Lineares', 4),
  ((SELECT id FROM s), 'Polinômios e Equações Algébricas', 5),
  ((SELECT id FROM s), 'Análise Combinatória e Probabilidade', 6),
  ((SELECT id FROM s), 'Geometria Plana: figuras geométricas, congruência, semelhança, áreas e relações métricas', 7),
  ((SELECT id FROM s), 'Geometria Espacial: poliedros, corpos redondos, áreas e volumes', 8),
  ((SELECT id FROM s), 'Geometria Analítica no plano (ponto, reta e cônicas)', 9);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Química', 7 FROM public.contest_templates WHERE nome='Vestibular UECE' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Estrutura atômica da matéria e Modelos Atômicos', 0),
  ((SELECT id FROM s), 'Tabela Periódica dos Elementos', 1),
  ((SELECT id FROM s), 'Ligações Químicas e interações intermoleculares', 2),
  ((SELECT id FROM s), 'Funções Inorgânicas: ácidos, bases, sais e óxidos', 3),
  ((SELECT id FROM s), 'Reações Químicas e Estequiometria', 4),
  ((SELECT id FROM s), 'Estado Gasoso', 5),
  ((SELECT id FROM s), 'Soluções Químicas e Propriedades Coligativas', 6),
  ((SELECT id FROM s), 'Termoquímica e Cinética Química', 7),
  ((SELECT id FROM s), 'Equilíbrio Químico (molecular e iônico)', 8),
  ((SELECT id FROM s), 'Eletroquímica: reações de oxirredução, pilhas e eletrólise', 9),
  ((SELECT id FROM s), 'Química Orgânica: propriedades do carbono, classificação, principais funções orgânicas, isomeria e reações orgânicas', 10);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Sociologia e Filosofia', 8 FROM public.contest_templates WHERE nome='Vestibular UECE' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Filosofia: O surgimento da filosofia na Grécia Antiga, Filosofia Medieval, Moderna e Contemporânea', 0),
  ((SELECT id FROM s), 'Filosofia: Ética, Política e Teoria do Conhecimento', 1),
  ((SELECT id FROM s), 'Sociologia: Surgimento da sociologia e os clássicos (Auguste Comte, Karl Marx, Émile Durkheim, Max Weber)', 2),
  ((SELECT id FROM s), 'Sociologia: Indivíduo e sociedade, estratificação social, desigualdades e movimentos sociais', 3),
  ((SELECT id FROM s), 'Sociologia: Cultura, ideologia, Estado, instituições políticas e o pensamento sociológico no Brasil', 4);
