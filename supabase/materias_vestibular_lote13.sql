-- Lote 13: Unicentro, Unioeste, UNICAP, Unimontes, UNIT, UPE, URCA, Unitins, UVA
-- Vazios (deletar): UNIFOR, UNEMAT, UniCEUB, Unisinos, Univali, Univille, Univates, Unochapecó, UPF

-- ===== Unicentro (12 matérias, PR, pública) =====
INSERT INTO public.contest_templates (slug, nome, plano, concurso, tipo, area, cor, status, is_public, scope, institution_type, uf)
VALUES ('vestibular-unicentro', 'Vestibular Unicentro', 'free', 'Unicentro', 'vestibular', 'Geral', '#2563EB', 'ativo', true, 'estadual', 'publica', 'PR')
ON CONFLICT (slug) DO UPDATE SET nome = EXCLUDED.nome, is_public = true;

DELETE FROM public.contest_template_subjects WHERE template_id = (SELECT id FROM public.contest_templates WHERE nome='Vestibular Unicentro' AND tipo='vestibular' LIMIT 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Língua Portuguesa', 0 FROM public.contest_templates WHERE nome='Vestibular Unicentro' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Recepção de textos: leitura, interpretação, variação linguística, recursos linguísticos, coerência e coesão', 0),
  ((SELECT id FROM s), 'Aspectos fonológicos e morfológicos: fonemas, sílabas, acentuação, ortografia, classes de palavras e formação de palavras', 1),
  ((SELECT id FROM s), 'Sintaxe: termos da oração, coordenação, subordinação, concordância, regência, colocação, crase e pontuação', 2),
  ((SELECT id FROM s), 'Semântica: significação das palavras e linguagem figurada', 3),
  ((SELECT id FROM s), 'Literatura: perspectivas estética, subjetiva, social e histórica; versificação, metro, rima e ritmo', 4);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Literatura — Obras obrigatórias', 1 FROM public.contest_templates WHERE nome='Vestibular Unicentro' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'A árvore que dava dinheiro — Domingos Pellegrini', 0),
  ((SELECT id FROM s), 'Memórias Póstumas de Brás Cubas — Machado de Assis', 1),
  ((SELECT id FROM s), 'A falência — Júlia Lopes de Almeida', 2),
  ((SELECT id FROM s), 'Extremo Oeste — Paulo Fehlauer', 3),
  ((SELECT id FROM s), 'Seminário dos Ratos — Lygia Fagundes Telles', 4),
  ((SELECT id FROM s), 'Eu sou Macuxi e outras histórias — Julie/Trudruá Dorrico', 5),
  ((SELECT id FROM s), 'Contos Negros — Ruth Guimarães', 6),
  ((SELECT id FROM s), 'Melhores Contos — João Guimarães Rosa', 7),
  ((SELECT id FROM s), 'Ay Kakyri Tama: eu moro na cidade — Márcia Wayna Kambeba', 8),
  ((SELECT id FROM s), 'Também guardamos pedras aqui — Luiza Romão', 9),
  ((SELECT id FROM s), 'Alguma Poesia — Carlos Drummond de Andrade', 10),
  ((SELECT id FROM s), 'Histórias que os jornais não contam — Moacyr Scliar', 11);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Língua Estrangeira (Inglês e Espanhol)', 2 FROM public.contest_templates WHERE nome='Vestibular Unicentro' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Interpretação de textos a partir de gêneros textuais diversos; uso da língua em contexto mundial e nas diferentes esferas sociais', 0);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Arte', 3 FROM public.contest_templates WHERE nome='Vestibular Unicentro' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Fundamentos e elementos estruturantes da música, dança, artes visuais e teatro', 0),
  ((SELECT id FROM s), 'Processos criativos e de produção em arte; história da arte em diferentes contextos', 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Biologia', 4 FROM public.contest_templates WHERE nome='Vestibular Unicentro' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Origem da vida; citologia (membrana, organoides, núcleo, cromossomos, código genético, mitose e meiose); fotossíntese e respiração celular', 0),
  ((SELECT id FROM s), 'Histologia animal e vegetal; embriologia; genética mendeliana e não mendeliana; grupos sanguíneos; herança ligada ao sexo', 1),
  ((SELECT id FROM s), 'Evolução; botânica; zoologia; ecologia; anatomia, fisiologia e saúde humana; doenças infectocontagiosas e parasitoses', 2);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Filosofia', 5 FROM public.contest_templates WHERE nome='Vestibular Unicentro' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Mito e filosofia; conhecimento; ética; filosofia política; filosofia e ciência; estética', 0);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Física', 6 FROM public.contest_templates WHERE nome='Vestibular Unicentro' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Grandezas físicas e medidas; relações entre grandezas e vetores', 0),
  ((SELECT id FROM s), 'Mecânica: cinemática, estática, dinâmica, gravitação e hidrostática; termologia; movimento ondulatório; óptica geométrica e física', 1),
  ((SELECT id FROM s), 'Eletricidade: eletrostática, eletrodinâmica, magnetismo, indução e radiação eletromagnética; física moderna', 2);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Geografia', 7 FROM public.contest_templates WHERE nome='Vestibular Unicentro' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Produção do espaço e relação sociedade-natureza', 0),
  ((SELECT id FROM s), 'Espaço mundial: capitalismo, geopolítica, industrialização, redes urbanas, espaço rural e população', 1),
  ((SELECT id FROM s), 'Espaço brasileiro e paranaense: regionalização, campo-cidade, agronegócio, movimentos sociais e ambiente; cartografia', 2);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'História', 8 FROM public.contest_templates WHERE nome='Vestibular Unicentro' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Produção do conhecimento histórico; construção, contradições e contestações da ordem burguesa', 0),
  ((SELECT id FROM s), 'Nova ordem mundial; Brasil contemporâneo; movimentos sociais; relações étnico-raciais no Brasil e no Paraná', 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Matemática', 9 FROM public.contest_templates WHERE nome='Vestibular Unicentro' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Álgebra: funções, progressões, logaritmos, exponenciais, combinatória, probabilidade, Binômio de Newton, polinômios, matrizes, determinantes, sistemas e números complexos', 0),
  ((SELECT id FROM s), 'Trigonometria; geometria plana e espacial; geometria analítica: plano cartesiano, reta, circunferência e ângulos', 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Química', 10 FROM public.contest_templates WHERE nome='Vestibular Unicentro' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Fenômenos, misturas, substâncias; leis ponderais e volumétricas; atomística; funções inorgânicas; estequiometria', 0),
  ((SELECT id FROM s), 'Estrutura atômica moderna; tabela periódica; ligações; reações; soluções; propriedades coligativas; eletroquímica; termoquímica; cinética; equilíbrio; radioatividade; química orgânica', 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Sociologia', 11 FROM public.contest_templates WHERE nome='Vestibular Unicentro' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Surgimento da Sociologia e teorias sociológicas; processo de socialização e instituições sociais', 0),
  ((SELECT id FROM s), 'Cultura e indústria cultural; trabalho, produção e classes sociais; poder, política e ideologia; direitos, cidadania e movimentos sociais', 1);

-- ===== Unioeste (7 matérias, PR, pública) =====
INSERT INTO public.contest_templates (slug, nome, plano, concurso, tipo, area, cor, status, is_public, scope, institution_type, uf)
VALUES ('vestibular-unioeste', 'Vestibular Unioeste', 'free', 'Unioeste', 'vestibular', 'Geral', '#2563EB', 'ativo', true, 'estadual', 'publica', 'PR')
ON CONFLICT (slug) DO UPDATE SET nome = EXCLUDED.nome, is_public = true;

DELETE FROM public.contest_template_subjects WHERE template_id = (SELECT id FROM public.contest_templates WHERE nome='Vestibular Unioeste' AND tipo='vestibular' LIMIT 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Redação', 0 FROM public.contest_templates WHERE nome='Vestibular Unioeste' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Produção textual a partir de coletânea; artigo de opinião e comentário interpretativo-crítico; leitura, reflexão e articulação de ponto de vista', 0);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Língua Portuguesa', 1 FROM public.contest_templates WHERE nome='Vestibular Unioeste' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Análise de textos multissemióticos e multimodais; gêneros discursivos; fatores de textualidade; coesão e coerência', 0),
  ((SELECT id FROM s), 'Gramática, sintaxe, pontuação e recursos estilísticos; norma padrão; variação linguística; intertextualidade; recursos argumentativos', 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Língua Inglesa', 2 FROM public.contest_templates WHERE nome='Vestibular Unioeste' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Compreensão de gêneros de campos jornalístico, científico, didático e artístico-literário; tema, contexto, coesão e coerência', 0),
  ((SELECT id FROM s), 'Vocabulário; classes de palavras; tempos verbais; verbos modais; phrasal verbs; voz passiva; comparativo e superlativo; conectores', 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Língua Espanhola', 3 FROM public.contest_templates WHERE nome='Vestibular Unioeste' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Compreensão de textos; tema, ideias principais, finalidade, contexto e gênero textual; intertextualidade; inferência', 0),
  ((SELECT id FROM s), 'Classes de palavras; modos e tempos verbais; conectores; polissemia; pontuação e acentuação; variação linguística; pronomes objeto', 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Literatura — Obras obrigatórias', 4 FROM public.contest_templates WHERE nome='Vestibular Unioeste' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'A carta de Pero Vaz de Caminha', 0),
  ((SELECT id FROM s), 'As vítimas algozes — Joaquim Manuel de Macedo', 1),
  ((SELECT id FROM s), 'Lembrança de morrer — Álvares de Azevedo', 2),
  ((SELECT id FROM s), 'Dona Paula — Machado de Assis', 3),
  ((SELECT id FROM s), 'Catedral — Alphonsus de Guimaraens', 4),
  ((SELECT id FROM s), 'O africano e o poeta — Narcisa Amália', 5),
  ((SELECT id FROM s), 'Mãe — José de Alencar', 6),
  ((SELECT id FROM s), 'Diário de um detento — Racionais MC''s', 7),
  ((SELECT id FROM s), 'A hora e a vez de Augusto Matraga — João Guimarães Rosa', 8),
  ((SELECT id FROM s), 'Penélope — Dalton Trevisan', 9),
  ((SELECT id FROM s), 'Amor — Clarice Lispector', 10),
  ((SELECT id FROM s), 'Poeminho do contra — Mário Quintana', 11),
  ((SELECT id FROM s), 'A morte do leiteiro — Carlos Drummond de Andrade', 12),
  ((SELECT id FROM s), 'Brasil — Eliane Potiguara', 13),
  ((SELECT id FROM s), 'Protesto — Carlos de Assumpção', 14),
  ((SELECT id FROM s), 'Eles eram muitos cavalos — Luiz Ruffato', 15),
  ((SELECT id FROM s), 'Cidade de Deus — Paulo Lins', 16);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Ciências Humanas', 5 FROM public.contest_templates WHERE nome='Vestibular Unioeste' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Filosofia, Geografia, História e Sociologia — conteúdos do ensino médio conforme programa oficial por séries', 0);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Ciências da Natureza e Matemática', 6 FROM public.contest_templates WHERE nome='Vestibular Unioeste' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Biologia, Física, Matemática e Química — conteúdos do ensino médio conforme programa oficial por séries', 0);

-- ===== UNICAP (11 matérias, PE, privada) =====
INSERT INTO public.contest_templates (slug, nome, plano, concurso, tipo, area, cor, status, is_public, scope, institution_type, uf)
VALUES ('vestibular-unicap', 'Vestibular UNICAP', 'free', 'UNICAP', 'vestibular', 'Geral', '#2563EB', 'ativo', true, 'estadual', 'privada', 'PE')
ON CONFLICT (slug) DO UPDATE SET nome = EXCLUDED.nome, is_public = true;

DELETE FROM public.contest_template_subjects WHERE template_id = (SELECT id FROM public.contest_templates WHERE nome='Vestibular UNICAP' AND tipo='vestibular' LIMIT 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Língua Portuguesa e Literatura', 0 FROM public.contest_templates WHERE nome='Vestibular UNICAP' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Compreensão e interpretação de textos: objetivo e crítico, intertextualidade, linha argumentativa, tipologia e gênero textual', 0),
  ((SELECT id FROM s), 'Aspectos gramaticais: funcionamento linguístico, recursos gramaticais, adequação ao contexto e norma padrão escrita', 1),
  ((SELECT id FROM s), 'Literatura Brasileira: análise de obras em diálogo com contextos histórico-culturais; períodos artísticos; recursos estilísticos', 2);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Língua Inglesa', 1 FROM public.contest_templates WHERE nome='Vestibular UNICAP' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Leitura e interpretação de textos em inglês; inferência lexical; gênero textual; coesão e coerência', 0),
  ((SELECT id FROM s), 'Gramática: articles, nouns, quantifiers, pronouns, possessives, verb tenses, modal verbs, conjunctions, prepositions', 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Língua Espanhola', 2 FROM public.contest_templates WHERE nome='Vestibular UNICAP' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Leitura, compreensão e interpretação de textos em espanhol; vocabulário, inferência, gênero textual e aspectos socioculturais', 0),
  ((SELECT id FROM s), 'Gramática: artículos, clases de palabras, conectores, tiempos verbales, modos verbales, verbos de cambio', 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'História', 3 FROM public.contest_templates WHERE nome='Vestibular UNICAP' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'História Geral: Pré-História à Antiguidade; Idade Média; Idade Moderna; revoluções; imperialismo; Guerras Mundiais; Guerra Fria; globalização', 0),
  ((SELECT id FROM s), 'História do Brasil: povos indígenas, colonização, Império, República, Era Vargas, regime militar e Brasil de Sarney a Bolsonaro', 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Geografia', 4 FROM public.contest_templates WHERE nome='Vestibular UNICAP' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Ciência geográfica; cartografia; estrutura da Terra; relevo, clima, hidrosfera; problemas ambientais', 0),
  ((SELECT id FROM s), 'Geopolítica; globalização; urbanização; população; agropecuária; regionalização do território brasileiro', 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Química', 5 FROM public.contest_templates WHERE nome='Vestibular UNICAP' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Transformações químicas; estrutura atômica; reações inorgânicas; estequiometria; leis de Lavoisier, Proust e Gay-Lussac; leis dos gases', 0),
  ((SELECT id FROM s), 'Tabela periódica; ligações; soluções; propriedades coligativas; ácidos e bases; cinética; equilíbrio; termoquímica; eletroquímica', 1),
  ((SELECT id FROM s), 'Compostos orgânicos: funções, isomeria, nomenclatura, reações, petróleo, álcoois, lipídeos, carboidratos, proteínas e polímeros', 2);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Física', 6 FROM public.contest_templates WHERE nome='Vestibular UNICAP' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Introdução à Física; cinemática; dinâmica; estática; hidrostática; termologia; ondulatória; óptica geométrica', 0),
  ((SELECT id FROM s), 'Eletrostática; eletrodinâmica; magnetismo e indução eletromagnética', 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Biologia', 7 FROM public.contest_templates WHERE nome='Vestibular UNICAP' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Composição química da célula; células procarióticas e eucarióticas; metabolismo energético; núcleo, divisões celulares e reprodução', 0),
  ((SELECT id FROM s), 'Tecidos animais; morfologia e fisiologia dos sistemas; hereditariedade; genética molecular; biotecnologia; evolução; ecologia', 1),
  ((SELECT id FROM s), 'Sistemática; vírus, bactérias, protistas e fungos; diversidade das plantas; diversidade dos animais', 2);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Matemática', 8 FROM public.contest_templates WHERE nome='Vestibular UNICAP' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Fundamentos aritméticos e algébricos; razões, proporções, porcentagem, juros; funções e gráficos; matrizes e sistemas lineares', 0),
  ((SELECT id FROM s), 'Trigonometria; geometria plana, espacial e analítica; estatística; combinatória; probabilidade; Binômio de Newton', 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Filosofia', 9 FROM public.contest_templates WHERE nome='Vestibular UNICAP' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Origem e periodização da Filosofia; epistemologia na Antiguidade, Medievo, Modernidade e Pós-modernidade', 0),
  ((SELECT id FROM s), 'Lógica; ética e liberdade; bioética, conceitos e valores', 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Sociologia', 10 FROM public.contest_templates WHERE nome='Vestibular UNICAP' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Introdução à Sociologia: Durkheim, Weber e Marx; sociedade, estrutura, classes e relações de poder', 0),
  ((SELECT id FROM s), 'Democracia, cidadania e direitos humanos; indústria cultural e ideologias; movimentos sociais; sociedade contemporânea', 1);

-- ===== Unimontes (12 matérias, MG, pública) =====
INSERT INTO public.contest_templates (slug, nome, plano, concurso, tipo, area, cor, status, is_public, scope, institution_type, uf)
VALUES ('vestibular-unimontes', 'Vestibular Unimontes', 'free', 'Unimontes', 'vestibular', 'Geral', '#2563EB', 'ativo', true, 'estadual', 'publica', 'MG')
ON CONFLICT (slug) DO UPDATE SET nome = EXCLUDED.nome, is_public = true;

DELETE FROM public.contest_template_subjects WHERE template_id = (SELECT id FROM public.contest_templates WHERE nome='Vestibular Unimontes' AND tipo='vestibular' LIMIT 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Biologia', 0 FROM public.contest_templates WHERE nome='Vestibular Unimontes' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Constituição animal e vegetal em nível celular e molecular: bioquímica, histologia, morfologia e fisiologia', 0),
  ((SELECT id FROM s), 'Taxonomia, fisiologia, evolução e ecologia; reprodução, desenvolvimento embrionário, hereditariedade, bioética e biotecnologia', 1),
  ((SELECT id FROM s), 'Saúde e qualidade de vida; doenças infecciosas, crônicas e metabólicas de interesse epidemiológico e regional', 2);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Filosofia', 1 FROM public.contest_templates WHERE nome='Vestibular Unimontes' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Mito e Filosofia; razão e modalidades; fundamentos filosóficos da ciência e do conhecimento científico', 0),
  ((SELECT id FROM s), 'Ética: virtude, dever, autonomia, moral, felicidade, justiça, solidariedade, livre-arbítrio e liberdade', 1),
  ((SELECT id FROM s), 'Política: democracia, liberalismo, marxismo, autoritarismo, contrato social, cidadania, direitos humanos, poder e violência', 2),
  ((SELECT id FROM s), 'Estética, arte e contemporaneidade', 3);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Física', 2 FROM public.contest_templates WHERE nome='Vestibular Unimontes' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Mecânica: cinemática, vetores, leis de Newton, gravitação, fluidos, trabalho, energia, impulso, torque e equilíbrio', 0),
  ((SELECT id FROM s), 'Termodinâmica: temperatura, gases ideais, calor, mudanças de fase, segunda lei, máquinas térmicas e entropia', 1),
  ((SELECT id FROM s), 'Vibrações e ondas; óptica geométrica e física; eletricidade e magnetismo: carga, campo, potencial, circuitos e indução eletromagnética', 2);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Geografia', 3 FROM public.contest_templates WHERE nome='Vestibular Unimontes' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Representação cartográfica; formas de organização do espaço geográfico; grandes conjuntos naturais do globo', 0),
  ((SELECT id FROM s), 'Indústria e tecnologias; globalização; circulação, comércio e transporte; dinâmica demográfica; meio ambiente e recursos naturais', 1),
  ((SELECT id FROM s), 'Dinâmica da natureza e questão ambiental no Brasil; espaço urbano-industrial e rural; complexos regionais; papel do Brasil no capitalismo mundial', 2);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'História', 4 FROM public.contest_templates WHERE nome='Vestibular Unimontes' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Feudalismo ao Estado Moderno; Grandes Navegações; povos americanos; sistema colonial; capitalismo e socialismo; Guerras Mundiais; Guerra Fria', 0),
  ((SELECT id FROM s), 'Formação do Estado brasileiro; Regências; Segundo Reinado; República; imperialismo; entre-guerras; descolonização; ditaduras na América Latina', 1),
  ((SELECT id FROM s), 'Abertura política; URSS; globalização; Oriente Médio, África, diversidade cultural e crises atuais', 2);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Língua Espanhola', 5 FROM public.contest_templates WHERE nome='Vestibular Unimontes' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Interpretação de textos; estratégias de leitura; sentido global; ideias centrais; cognatos e gêneros textuais', 0),
  ((SELECT id FROM s), 'Aspectos culturais; conectores lógicos; classes de palavras; orações; estilo indireto; voz passiva', 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Língua Inglesa', 6 FROM public.contest_templates WHERE nome='Vestibular Unimontes' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Interpretação de textos e vocabulário em contexto; classes de palavras; formação de palavras; caso genitivo', 0),
  ((SELECT id FROM s), 'Tempos verbais; orações relativas e condicionais; discurso indireto; voz passiva', 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Língua Portuguesa', 7 FROM public.contest_templates WHERE nome='Vestibular Unimontes' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Práticas de linguagem; leitura reflexiva de notícias, editoriais, contos, artigos, crônicas e gêneros digitais', 0),
  ((SELECT id FROM s), 'Intenções do locutor; análise de efeitos de sentido; textos multissemióticos; tipos textuais; funcionamento dos gêneros textuais e discursivos', 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Literatura', 8 FROM public.contest_templates WHERE nome='Vestibular Unimontes' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Literatura, sociedade e cultura; análise e interpretação de textos clássicos da literatura brasileira; estilo individual e de época', 0),
  ((SELECT id FROM s), 'Periodização; gêneros literários; recursos estético-literários; intertextualidade; relações entre literatura e outras artes', 1),
  ((SELECT id FROM s), 'Romantismo, Realismo, Parnasianismo, Simbolismo, Modernismo e contemporaneidade; expressões afro-brasileiras e indígenas; Norte de Minas', 2);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Matemática', 9 FROM public.contest_templates WHERE nome='Vestibular Unimontes' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Conjuntos; números; proporcionalidade; funções; números complexos; polinômios; exponenciais e logaritmos; trigonometria', 0),
  ((SELECT id FROM s), 'Sequências; análise combinatória; matrizes e sistemas lineares; geometria plana, espacial e analítica; estatística básica; probabilidade', 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Química', 10 FROM public.contest_templates WHERE nome='Vestibular Unimontes' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Matéria e energia; substâncias e misturas; modelos atômicos; estrutura atômica; radioatividade; tabela periódica; ligações químicas', 0),
  ((SELECT id FROM s), 'Funções químicas; reações e estequiometria; soluções; termoquímica; cinética; equilíbrio; eletroquímica', 1),
  ((SELECT id FROM s), 'Química orgânica: funções, isomeria, reações orgânicas e macromoléculas', 2);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Sociologia', 11 FROM public.contest_templates WHERE nome='Vestibular Unimontes' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Clássicos da Sociologia: Marx, Durkheim e Weber; análise do capitalismo; estrutura, ação, globalização, trabalho e classes sociais', 0),
  ((SELECT id FROM s), 'Transformações no trabalho: taylorismo, fordismo e uberização; desigualdades sociais: gênero, raça, renda, sexualidade e escolaridade', 1);

-- ===== UNIT (8 matérias, SE, privada) =====
INSERT INTO public.contest_templates (slug, nome, plano, concurso, tipo, area, cor, status, is_public, scope, institution_type, uf)
VALUES ('vestibular-unit', 'Vestibular UNIT', 'free', 'UNIT', 'vestibular', 'Geral', '#2563EB', 'ativo', true, 'estadual', 'privada', 'SE')
ON CONFLICT (slug) DO UPDATE SET nome = EXCLUDED.nome, is_public = true;

DELETE FROM public.contest_template_subjects WHERE template_id = (SELECT id FROM public.contest_templates WHERE nome='Vestibular UNIT' AND tipo='vestibular' LIMIT 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Biologia', 0 FROM public.contest_templates WHERE nome='Vestibular UNIT' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Seres vivos: características, classificação, taxonomia, vírus e principais grupos', 0),
  ((SELECT id FROM s), 'Célula: procarionte, eucarionte, componentes, funções, código genético, mitose e meiose; tecidos animais e vegetais', 1),
  ((SELECT id FROM s), 'Funções vitais, reprodução, genética, evolução, ecologia; saúde, doenças carenciais, infectocontagiosas e parasitárias', 2);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Física', 1 FROM public.contest_templates WHERE nome='Vestibular UNIT' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Grandezas físicas, medidas e análise dimensional; mecânica da partícula; sistemas de muitas partículas; centro de massa e estática', 0),
  ((SELECT id FROM s), 'Pressão, líquidos, gases perfeitos, atmosfera, termodinâmica e conservação de energia; fenômenos ondulatórios e óptica; eletricidade e magnetismo', 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Geografia', 2 FROM public.contest_templates WHERE nome='Vestibular UNIT' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Espaço da natureza: relevo, clima, águas, recursos e conservação', 0),
  ((SELECT id FROM s), 'Organização do espaço mundial: capitalismo, imperialismo, blocos, geopolítica, indústria, urbanização e agricultura', 1),
  ((SELECT id FROM s), 'Espaço brasileiro: industrialização, desigualdades, urbanização, agricultura, estrutura fundiária, população e questões regionais', 2);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'História', 3 FROM public.contest_templates WHERE nome='Vestibular UNIT' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Mundo ocidental moderno: expansão marítima, Estado moderno, absolutismo, colonização, Humanismo, Renascimento, Reformas e Ilustração', 0),
  ((SELECT id FROM s), 'Mundo contemporâneo: Revolução Industrial, liberalismo, revoluções liberais, independências, imperialismo, guerras mundiais, fascismos, Vargas e Estado Novo', 1),
  ((SELECT id FROM s), 'Mundo pós-1945: Guerra Fria, descolonização, América Latina, Chile, Cuba, Brasil de 1946 a 1988 e Nova República', 2);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Língua Estrangeira (Inglês ou Espanhol)', 4 FROM public.contest_templates WHERE nome='Vestibular UNIT' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Compreensão de textos autênticos; vocabulário; gramática básica; estratégias de leitura; cognatos; reconhecimento de gêneros e intenções comunicativas', 0);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Língua Portuguesa e Literatura Brasileira', 5 FROM public.contest_templates WHERE nome='Vestibular UNIT' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Compreensão e interpretação; gêneros do discurso; norma culta; ortografia; morfossintaxe; classes de palavras; regência, concordância e pontuação', 0),
  ((SELECT id FROM s), 'Teoria literária; processo literário brasileiro; Romantismo; Realismo e Naturalismo; Parnasianismo e Simbolismo; Modernismo e poesia contemporânea', 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Matemática', 6 FROM public.contest_templates WHERE nome='Vestibular UNIT' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Lógica; conjuntos; conjuntos numéricos; funções, gráficos, segundo grau, exponencial e logarítmica; equações e inequações; polinômios', 0),
  ((SELECT id FROM s), 'Sequências; progressões; juros; combinatória; Binômio de Newton; probabilidade; matrizes, determinantes e sistemas; geometria; trigonometria; geometria analítica', 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Química', 7 FROM public.contest_templates WHERE nome='Vestibular UNIT' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Estrutura da matéria; modelos atômicos; número atômico, massa, isótopos, configuração eletrônica, mol; tabela periódica; ligações; funções inorgânicas', 0),
  ((SELECT id FROM s), 'Estados da matéria, gases e soluções; reações, balanceamento, estequiometria, termoquímica, cinética, equilíbrio, pH, eletroquímica e radioatividade', 1),
  ((SELECT id FROM s), 'Química orgânica: cadeias, funções, nomenclatura, isomeria, reações, produtos naturais e petróleo', 2);

-- ===== UPE (8 matérias, PE, pública) =====
INSERT INTO public.contest_templates (slug, nome, plano, concurso, tipo, area, cor, status, is_public, scope, institution_type, uf)
VALUES ('vestibular-upe', 'Vestibular UPE', 'free', 'UPE', 'vestibular', 'Geral', '#2563EB', 'ativo', true, 'estadual', 'publica', 'PE')
ON CONFLICT (slug) DO UPDATE SET nome = EXCLUDED.nome, is_public = true;

DELETE FROM public.contest_template_subjects WHERE template_id = (SELECT id FROM public.contest_templates WHERE nome='Vestibular UPE' AND tipo='vestibular' LIMIT 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Redação', 0 FROM public.contest_templates WHERE nome='Vestibular UPE' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Texto dissertativo-argumentativo; interpretação da proposta; características linguísticas e discursivas; autoria; articulação de ideias; norma do português brasileiro', 0);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Linguagens e suas Tecnologias', 1 FROM public.contest_templates WHERE nome='Vestibular UPE' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Textos jornalístico-midiáticos e digitais; multimodalidade, hipertextualidade e autoria; informação e checagem; intertextualidade', 0),
  ((SELECT id FROM s), 'Relações lógico-semânticas; português brasileiro: modalidades, formação sociolinguística, contribuições africanas e indígenas, preconceito linguístico', 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Literatura — Obras obrigatórias', 2 FROM public.contest_templates WHERE nome='Vestibular UPE' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'A visão das plantas — Djaimilia Pereira de Almeida', 0),
  ((SELECT id FROM s), 'Vestida de preto e outros contos — Mário de Andrade', 1),
  ((SELECT id FROM s), 'Ponciá Vicêncio — Conceição Evaristo', 2),
  ((SELECT id FROM s), 'Recado do morro — João Guimarães Rosa', 3),
  ((SELECT id FROM s), 'Quarto de despejo: diário de uma favelada — Carolina Maria de Jesus', 4),
  ((SELECT id FROM s), 'Futuro ancestral — Ailton Krenak', 5),
  ((SELECT id FROM s), 'A paixão segundo G.H. — Clarice Lispector', 6),
  ((SELECT id FROM s), 'Solo para vilarejo — Cida Pedrosa', 7),
  ((SELECT id FROM s), 'Mensagem — Fernando Pessoa', 8),
  ((SELECT id FROM s), 'Torto arado — Itamar Vieira Júnior', 9);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Língua Inglesa', 3 FROM public.contest_templates WHERE nome='Vestibular UPE' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Leitura, compreensão e análise linguística de textos em inglês; textos multissemióticos; estratégias de compreensão; formação de palavras; cognatos e falsos cognatos', 0);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Língua Espanhola', 4 FROM public.contest_templates WHERE nome='Vestibular UPE' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Leitura, compreensão e interpretação de textos em espanhol; vocabulário; usos linguísticos em contextos hispanofalantes', 0);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Matemática e suas Tecnologias', 5 FROM public.contest_templates WHERE nome='Vestibular UPE' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Razão e proporção; porcentagem; escala; números e álgebra; funções; geometria; grandezas e medidas; probabilidade; estatística', 0);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Ciências da Natureza e suas Tecnologias', 6 FROM public.contest_templates WHERE nome='Vestibular UPE' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Biologia: diversidade, genética, biotecnologia, evolução, ecologia, biodiversidade, problemas ambientais', 0),
  ((SELECT id FROM s), 'Física: fenômenos oscilatórios e ondulatórios, eletromagnetismo, relatividade restrita, física quântica e astronomia', 1),
  ((SELECT id FROM s), 'Química: substâncias e materiais, transformações químicas, compostos orgânicos, petróleo, eletroquímica e metalurgia', 2);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Ciências Humanas e Sociais Aplicadas', 7 FROM public.contest_templates WHERE nome='Vestibular UPE' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Processos políticos, econômicos, sociais, ambientais e culturais em diferentes tempos e espaços; formação de territórios e fronteiras', 0),
  ((SELECT id FROM s), 'Conflitos, desigualdade, exclusão e poder; relações sociedade-natureza; desigualdades e violências; direitos humanos; cidadania', 1);

-- ===== URCA (10 matérias, CE, pública) =====
INSERT INTO public.contest_templates (slug, nome, plano, concurso, tipo, area, cor, status, is_public, scope, institution_type, uf)
VALUES ('vestibular-urca', 'Vestibular URCA', 'free', 'URCA', 'vestibular', 'Geral', '#2563EB', 'ativo', true, 'estadual', 'publica', 'CE')
ON CONFLICT (slug) DO UPDATE SET nome = EXCLUDED.nome, is_public = true;

DELETE FROM public.contest_template_subjects WHERE template_id = (SELECT id FROM public.contest_templates WHERE nome='Vestibular URCA' AND tipo='vestibular' LIMIT 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Matemática', 0 FROM public.contest_templates WHERE nome='Vestibular URCA' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Conjuntos, conjuntos numéricos, intervalos; razão, proporção, potenciação, radiciação, porcentagem, juros e medidas', 0),
  ((SELECT id FROM s), 'Matrizes, determinantes e sistemas lineares; progressões; funções (afim, quadrática, modulares, exponenciais, logarítmicas e trigonométricas)', 1),
  ((SELECT id FROM s), 'Geometria plana e espacial; análise combinatória, probabilidade e estatística; geometria analítica da reta e circunferência', 2);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Física', 1 FROM public.contest_templates WHERE nome='Vestibular URCA' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Medidas, cinemática, vetores, leis de Newton, conservação de energia, impulso e gravitação; estática dos fluidos; ondas e termologia', 0),
  ((SELECT id FROM s), 'Óptica; eletrostática; corrente elétrica, circuitos e capacitores; magnetismo e indução eletromagnética', 1),
  ((SELECT id FROM s), 'Relatividade restrita; natureza quântica da luz; modelos atômicos; física nuclear; partículas elementares e cosmologia', 2);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Química', 2 FROM public.contest_templates WHERE nome='Vestibular URCA' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Matéria, composição, estrutura atômica, classificação periódica, ligações químicas e funções químicas', 0),
  ((SELECT id FROM s), 'Reações e estequiometria; soluções; termoquímica; cinética; equilíbrio; eletroquímica', 1),
  ((SELECT id FROM s), 'Química orgânica: compostos de carbono, cadeias, isomeria, funções, nomenclatura, carboidratos, lipídios, proteínas, petróleo e radioatividade', 2);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Biologia', 3 FROM public.contest_templates WHERE nome='Vestibular URCA' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Biologia molecular; biologia celular; citogenética; bioenergética; embriologia; histologia', 0),
  ((SELECT id FROM s), 'Taxonomia; vírus; Monera, Protoctista, Fungi, Plantae e Animalia; anatomia e fisiologia', 1),
  ((SELECT id FROM s), 'Genética; origem da vida e evolução; ecologia', 2);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'História', 4 FROM public.contest_templates WHERE nome='Vestibular URCA' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Sociedades antigas a modernas; expansão marítima; colonização da América; Brasil Colônia; Iluminismo; formação do mundo contemporâneo', 0),
  ((SELECT id FROM s), 'República brasileira; Guerras Mundiais; Revolução Russa; crise de 1929; fascismos; pós-1945; Guerra Fria; Ceará e Cariri; globalização', 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Geografia', 5 FROM public.contest_templates WHERE nome='Vestibular URCA' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Formação do pensamento geográfico; produção e organização do espaço; mundialização do capitalismo e geopolítica mundial', 0),
  ((SELECT id FROM s), 'Fundamentos de geografia física e questão ambiental; geografia do Brasil; espaço do Nordeste, Ceará e Cariri cearense; geotecnologias', 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Português', 6 FROM public.contest_templates WHERE nome='Vestibular URCA' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Compreensão literal, interpretativa e crítica; tema, gênero textual, coerência, coesão e fatores pragmáticos', 0),
  ((SELECT id FROM s), 'Linguagem e funções; variedades e modalidades linguísticas; fonologia, morfossintaxe, semântica e estilística', 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Literaturas Lusófonas', 7 FROM public.contest_templates WHERE nome='Vestibular URCA' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Presença do épico nas literaturas de Portugal, Brasil e África; nacionalismo e identidades nacionais lusófonas', 0),
  ((SELECT id FROM s), 'Elementos messiânicos; manifestações contemporâneas; relações entre literatura e hipertextualidade', 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Língua Inglesa', 8 FROM public.contest_templates WHERE nome='Vestibular URCA' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Compreensão e interpretação de textos; vocabulário em língua inglesa', 0);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Língua Espanhola', 9 FROM public.contest_templates WHERE nome='Vestibular URCA' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Compreensão e interpretação de textos; vocabulário em língua espanhola', 0);

-- ===== Unitins (10 matérias, TO, pública) =====
INSERT INTO public.contest_templates (slug, nome, plano, concurso, tipo, area, cor, status, is_public, scope, institution_type, uf)
VALUES ('vestibular-unitins', 'Vestibular Unitins', 'free', 'Unitins', 'vestibular', 'Geral', '#2563EB', 'ativo', true, 'estadual', 'publica', 'TO')
ON CONFLICT (slug) DO UPDATE SET nome = EXCLUDED.nome, is_public = true;

DELETE FROM public.contest_template_subjects WHERE template_id = (SELECT id FROM public.contest_templates WHERE nome='Vestibular Unitins' AND tipo='vestibular' LIMIT 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Física', 0 FROM public.contest_templates WHERE nome='Vestibular Unitins' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Medição; cinemática; dinâmica; termodinâmica; vibrações e ondas; ótica; eletrostática; eletrodinâmica; eletromagnetismo', 0);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Matemática', 1 FROM public.contest_templates WHERE nome='Vestibular Unitins' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Conjuntos; fundamentos aritméticos; funções; matrizes e determinantes; álgebra; análise combinatória; probabilidade e estatística', 0),
  ((SELECT id FROM s), 'Geometria plana, euclidiana e espacial; matemática financeira; trigonometria', 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Química', 2 FROM public.contest_templates WHERE nome='Vestibular Unitins' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Estrutura da matéria; átomos; elementos químicos; transformação da matéria; mudanças de estado; soluções, reações e estequiometria', 0),
  ((SELECT id FROM s), 'Termodinâmica; equilíbrio químico; sais, ácidos e bases; reações de óxido-redução; cinética química', 1),
  ((SELECT id FROM s), 'Compostos de carbono: estrutura, funções, propriedades e reações orgânicas', 2);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Biologia', 3 FROM public.contest_templates WHERE nome='Vestibular Unitins' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Biologia celular; biologia molecular; histologia e embriologia; reprodução e desenvolvimento; seres vivos, vírus e reinos; sistemática', 0),
  ((SELECT id FROM s), 'Genética e biotecnologia; origem da vida e evolução; ecologia; biologia sanitária, doenças infecciosas, imunidade e saneamento', 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'História', 4 FROM public.contest_templates WHERE nome='Vestibular Unitins' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'História do Brasil: expansão marítima portuguesa, colônia, Independência, Primeiro e Segundo Reinados, República, Era Vargas e Nova República', 0),
  ((SELECT id FROM s), 'História Geral: Antiguidade, Idade Média, Modernidade, Idade Contemporânea, guerras mundiais, Guerra Fria e nova ordem econômica', 1),
  ((SELECT id FROM s), 'História do Tocantins: implantação, desenvolvimento e atualidades', 2);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Geografia', 5 FROM public.contest_templates WHERE nome='Vestibular Unitins' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'População brasileira e mundial; migrações; urbanização; globalização; blocos econômicos; conflitos mundiais; energia e recursos minerais', 0),
  ((SELECT id FROM s), 'Desenvolvimento industrial e agropastoril; clima; vegetação; hidrografia; estrutura geológica do Brasil; Geografia do Tocantins', 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Língua Estrangeira (Inglês ou Espanhol)', 6 FROM public.contest_templates WHERE nome='Vestibular Unitins' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Compreensão de textos escritos; funções sintático-semânticas de vocábulos; uso da língua em contextos situacionais; gêneros e intenções comunicativas', 0);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Língua Portuguesa', 7 FROM public.contest_templates WHERE nome='Vestibular Unitins' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Compreensão e interpretação de textos de diversos gêneros; significação explícita e implícita; denotação e conotação; variedades do português', 0),
  ((SELECT id FROM s), 'Norma ortográfica; morfossintaxe; classes de palavras; concordância, regência, pontuação; discurso direto, indireto e indireto livre; recursos expressivos', 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Literatura Brasileira', 8 FROM public.contest_templates WHERE nome='Vestibular Unitins' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Barroco (Gregório de Matos); Arcadismo (Cláudio Manuel da Costa e Tomás Antônio Gonzaga); Romantismo (Gonçalves Dias, Álvares de Azevedo, Castro Alves, José de Alencar)', 0),
  ((SELECT id FROM s), 'Realismo e Naturalismo (Machado de Assis, Aluísio Azevedo); Parnasianismo e Simbolismo (Raimundo Correia e Cruz e Sousa)', 1),
  ((SELECT id FROM s), 'Modernismo: Mário de Andrade, Oswald de Andrade, Cecília Meireles, Manuel Bandeira; tendências contemporâneas: Guimarães Rosa, Clarice Lispector, Carolina Maria de Jesus, Conceição Evaristo, Drummond', 2);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Redação', 9 FROM public.contest_templates WHERE nome='Vestibular Unitins' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Texto dissertativo-argumentativo em prosa; norma-padrão; leitura de textos motivadores; argumentação; coesão, coerência e autoria', 0);

-- ===== UVA (11 matérias, CE, pública) =====
INSERT INTO public.contest_templates (slug, nome, plano, concurso, tipo, area, cor, status, is_public, scope, institution_type, uf)
VALUES ('vestibular-uva', 'Vestibular UVA', 'free', 'UVA', 'vestibular', 'Geral', '#2563EB', 'ativo', true, 'estadual', 'publica', 'CE')
ON CONFLICT (slug) DO UPDATE SET nome = EXCLUDED.nome, is_public = true;

DELETE FROM public.contest_template_subjects WHERE template_id = (SELECT id FROM public.contest_templates WHERE nome='Vestibular UVA' AND tipo='vestibular' LIMIT 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Língua Portuguesa', 0 FROM public.contest_templates WHERE nome='Vestibular UVA' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Leitura e compreensão de textos de diferentes gêneros: ficcionais (conto, crônica, romance, poético) e não ficcionais (notícia, editorial, artigo de opinião)', 0),
  ((SELECT id FROM s), 'Gramática: fonologia, morfologia e sintaxe; semântica, figuras de linguagem e análise do discurso', 1),
  ((SELECT id FROM s), 'Literatura: Era Colonial, Classicismo, Barroco, Arcadismo, Romantismo, Realismo, Naturalismo, Parnasianismo, Simbolismo, Modernismo e contemporaneidade', 2);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Literatura — Obras obrigatórias', 1 FROM public.contest_templates WHERE nome='Vestibular UVA' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'A Rainha do Ignoto — Emília Freitas', 0),
  ((SELECT id FROM s), 'Lucíola — José de Alencar', 1),
  ((SELECT id FROM s), 'O Livro dos Livros — Vicente Jr.', 2),
  ((SELECT id FROM s), 'Coisas de Sala de Aula & Outras Crônicas — Alan Torres, André Araújo, Antônio Ortiz e Sinval Farias', 3),
  ((SELECT id FROM s), 'Pequenas Narrativas — Dimas Carvalho', 4);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Língua Inglesa', 2 FROM public.contest_templates WHERE nome='Vestibular UVA' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Leitura de textos de diferentes gêneros; função social; ideia principal; informações explícitas e implícitas; vocabulário acadêmico', 0),
  ((SELECT id FROM s), 'Auxiliary verbs, modal verbs, tenses, participles, gerunds; adjectives and adverbs; prepositions; relative clauses; reported speech; morphology', 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Língua Espanhola', 3 FROM public.contest_templates WHERE nome='Vestibular UVA' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Fonética; ortografia; morfologia; substantivo, adjetivo, pronome, artigo, verbo, advérbio, preposição e conjunção', 0),
  ((SELECT id FROM s), 'Sintaxe; concordância; voz passiva; orações reflexivas e perifrásticas; análise e estudo das ideias de um texto', 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Física', 4 FROM public.contest_templates WHERE nome='Vestibular UVA' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Grandezas físicas e sistemas de unidades; estática; cinemática e dinâmica da partícula; energia e trabalho; hidrostática', 0),
  ((SELECT id FROM s), 'Termologia; fenômenos ondulatórios e óptica; eletricidade; magnetismo', 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Matemática', 5 FROM public.contest_templates WHERE nome='Vestibular UVA' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Conjuntos e operações; conjuntos numéricos; teoria elementar dos números; matemática comercial; equações, inequações e sistemas', 0),
  ((SELECT id FROM s), 'Álgebra: sequências, progressões, logaritmos, matrizes, determinantes, combinatória, Binômio de Newton e probabilidade', 1),
  ((SELECT id FROM s), 'Trigonometria; polinômios; números complexos; geometria plana, espacial e analítica; cônicas', 2);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Química', 6 FROM public.contest_templates WHERE nome='Vestibular UVA' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Espécies químicas, misturas, estados físicos, estrutura da matéria, leis das combinações, teoria atômica e tabela periódica', 0),
  ((SELECT id FROM s), 'Ligações químicas; reações e estequiometria; cinética e equilíbrio; funções inorgânicas; soluções; termoquímica e eletroquímica', 1),
  ((SELECT id FROM s), 'Química do carbono: funções orgânicas, isomeria e reações orgânicas', 2);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Biologia', 7 FROM public.contest_templates WHERE nome='Vestibular UVA' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Metodologia científica; citologia; embriologia; histologia; organização e diversidade dos seres vivos', 0),
  ((SELECT id FROM s), 'Anatomia e fisiologia dos animais e plantas; vírus, bactérias e protozoários; genética; evolução; ecologia; biologia e saúde', 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'História', 8 FROM public.contest_templates WHERE nome='Vestibular UVA' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'História Geral: Antiguidade à Modernidade; Revolução Industrial; imperialismo; guerras mundiais; Revolução Russa; Guerra Fria; globalização', 0),
  ((SELECT id FROM s), 'História do Brasil: colonial, imperial, republicano, redemocratização e golpe de 1964; História do Ceará e do Vale do Acaraú', 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Geografia', 9 FROM public.contest_templates WHERE nome='Vestibular UVA' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Teoria e método geográfico; representação cartográfica; Geografia Física: rochas, solos, relevo, clima, hidrologia, vegetação e geossistemas', 0),
  ((SELECT id FROM s), 'Geografia Humana: população, agricultura, questão agrária, espaço urbano, indústria; Geografia Regional: Ásia, Europa, África, Américas', 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Redação', 10 FROM public.contest_templates WHERE nome='Vestibular UVA' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Texto dissertativo-argumentativo (15 a 30 linhas); domínio da modalidade escrita formal; argumentação; mecanismos linguísticos; proposta de intervenção', 0);
