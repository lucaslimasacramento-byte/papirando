-- Disciplinas/tópicos do lote 2 de vestibulares (FUVEST-USP, PAES UEMA, PAS UEM, PAS UnB, PSS UEPG)
-- Rodar no Supabase SQL Editor. Reimporta limpo (apaga matérias antigas do registro).

-- ===== FUVEST - USP (14 matérias) =====
DELETE FROM public.contest_template_subjects WHERE template_id = (SELECT id FROM public.contest_templates WHERE nome='FUVEST - USP' AND tipo='vestibular' LIMIT 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Arte', 0 FROM public.contest_templates WHERE nome='FUVEST - USP' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Elementos das linguagens artísticas: ponto, linha, forma, cor, luz, sombra, textura, volume, superfície, ritmo, movimento, composição, harmonia, contraste, equilíbrio, escala, proporção, perspectiva, espaço, som, silêncio, tempo, corpo, gesto e voz.', 0),
  ((SELECT id FROM s), 'Materialidades, suportes, ferramentas, procedimentos, técnicas e tecnologias nas artes visuais, música, dança, teatro, audiovisual e cultura digital.', 1),
  ((SELECT id FROM s), 'Processos de criação, autoria, experimentação, repertório cultural, mediação cultural, patrimônio cultural, arte brasileira, arte indígena, arte africana, arte afro-brasileira, arte contemporânea e cultura visual.', 2),
  ((SELECT id FROM s), 'Relações entre arte, sociedade, política, tecnologia, identidade, diversidade, memória, patrimônio e indústria cultural.', 3);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Educação Física', 1 FROM public.contest_templates WHERE nome='FUVEST - USP' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Práticas corporais como textos culturais: brincadeiras, jogos, danças, lutas, esportes, ginásticas e práticas corporais de aventura.', 0),
  ((SELECT id FROM s), 'Cultura corporal de movimento, patrimônio cultural, lazer, saúde, qualidade de vida, inclusão, diversidade, mídias, tecnologia e práticas corporais na sociedade.', 1),
  ((SELECT id FROM s), 'História, transformações, sentidos, valores, regras, técnicas, táticas e impactos sociais das práticas corporais.', 2);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Língua Inglesa', 2 FROM public.contest_templates WHERE nome='FUVEST - USP' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Compreensão geral e específica de textos escritos, orais e multissemióticos em língua inglesa.', 0),
  ((SELECT id FROM s), 'Relação entre texto, contexto de produção, circulação, recepção, finalidade, público-alvo, gênero discursivo e suporte.', 1),
  ((SELECT id FROM s), 'Vocabulário, cognatos, falsos cognatos, sinonímia, antonímia, polissemia, expressões idiomáticas, phrasal verbs e formação de palavras.', 2),
  ((SELECT id FROM s), 'Substantivos, adjetivos, advérbios, pronomes, tempos verbais, comparativos, superlativos, voz passiva, discurso indireto, conectores e marcadores discursivos.', 3),
  ((SELECT id FROM s), 'Figuras de linguagem, ironia, metáfora, metonímia, hipérbole, eufemismo, pun, inferência, posicionamento discursivo e inglês como língua de comunicação global.', 4);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Língua Portuguesa', 3 FROM public.contest_templates WHERE nome='FUVEST - USP' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Leitura, compreensão, interpretação e análise de textos verbais, não verbais, multimodais e multissemióticos.', 0),
  ((SELECT id FROM s), 'Gêneros discursivos, tipologias textuais, funções da linguagem, situação comunicativa, interlocutores, suporte, circulação e finalidade textual.', 1),
  ((SELECT id FROM s), 'Coesão, coerência, operadores lógico-discursivos, conectores, referenciação, progressão temática, organização textual e argumentação.', 2),
  ((SELECT id FROM s), 'Intertextualidade, interdiscursividade, dialogismo, citação, paráfrase, paródia, estilização, vozes sociais e efeitos de sentido.', 3),
  ((SELECT id FROM s), 'Semântica: denotação, conotação, sinonímia, antonímia, polissemia, ambiguidade, pressupostos, subentendidos e figuras de linguagem.', 4),
  ((SELECT id FROM s), 'Morfologia, classes de palavras, processos de formação de palavras, morfossintaxe, sintaxe do período simples e composto, concordância, regência, colocação, pontuação e ortografia.', 5),
  ((SELECT id FROM s), 'Variação linguística, norma-padrão, registros de linguagem, adequação linguística, oralidade, escrita, preconceito linguístico e usos sociais da língua.', 6),
  ((SELECT id FROM s), 'Literatura: gêneros literários, crônica, conto, romance, poema, recursos expressivos, linguagem literária, estilos de época, tradição literária e leitura crítica das obras obrigatórias.', 7);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Redação', 4 FROM public.contest_templates WHERE nome='FUVEST - USP' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Produção textual em norma-padrão da língua portuguesa.', 0),
  ((SELECT id FROM s), 'Organização argumentativa, tese, argumentos, repertório sociocultural, progressão textual, coesão, coerência e adequação ao tema e ao gênero solicitado.', 1),
  ((SELECT id FROM s), 'Leitura crítica da proposta, seleção de informações, posicionamento autoral, clareza, precisão vocabular e domínio dos mecanismos linguísticos.', 2);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Matemática', 5 FROM public.contest_templates WHERE nome='FUVEST - USP' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Números, operações, conjuntos numéricos, proporcionalidade, razão, proporção, porcentagem, juros, grandezas e medidas.', 0),
  ((SELECT id FROM s), 'Álgebra, expressões algébricas, equações, inequações, sistemas, polinômios, sequências, progressões aritméticas e geométricas.', 1),
  ((SELECT id FROM s), 'Funções: afim, quadrática, modular, exponencial, logarítmica, trigonométrica, domínio, imagem, gráficos, crescimento, decrescimento, zeros, máximos e mínimos.', 2),
  ((SELECT id FROM s), 'Geometria plana: ângulos, polígonos, circunferência, áreas, semelhança, congruência, relações métricas e trigonometria no triângulo.', 3),
  ((SELECT id FROM s), 'Geometria espacial: prismas, pirâmides, cilindros, cones, esferas, áreas, volumes e relações métricas.', 4),
  ((SELECT id FROM s), 'Geometria analítica: plano cartesiano, distância, ponto médio, reta, circunferência, posições relativas e interpretação gráfica.', 5),
  ((SELECT id FROM s), 'Trigonometria, matrizes, determinantes, sistemas lineares, análise combinatória, probabilidade, estatística, leitura de tabelas, gráficos e infográficos.', 6);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Física', 6 FROM public.contest_templates WHERE nome='FUVEST - USP' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Grandezas físicas, unidades, medidas, ordem de grandeza, análise dimensional, gráficos, tabelas, modelos e linguagem matemática aplicada à Física.', 0),
  ((SELECT id FROM s), 'Mecânica: cinemática, dinâmica, leis de Newton, forças, trabalho, energia, potência, impulso, quantidade de movimento, colisões, equilíbrio, gravitação e movimento circular.', 1),
  ((SELECT id FROM s), 'Hidrostática, termologia, calorimetria, termodinâmica, gases, mudanças de estado, dilatação térmica e máquinas térmicas.', 2),
  ((SELECT id FROM s), 'Ondulatória, acústica, óptica geométrica, reflexão, refração, lentes, espelhos, interferência, difração, efeito Doppler e fenômenos luminosos.', 3),
  ((SELECT id FROM s), 'Eletricidade, eletrostática, eletrodinâmica, circuitos elétricos, potência elétrica, magnetismo, indução eletromagnética e aplicações tecnológicas.', 4),
  ((SELECT id FROM s), 'Física moderna, radiações, estrutura da matéria, efeito fotoelétrico, relatividade, radioatividade, tecnologias contemporâneas e impactos sociais.', 5);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Química', 7 FROM public.contest_templates WHERE nome='FUVEST - USP' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Matéria, energia, propriedades, estados físicos, substâncias, misturas, separação de misturas e transformações químicas.', 0),
  ((SELECT id FROM s), 'Modelos atômicos, estrutura atômica, tabela periódica, propriedades periódicas, ligações químicas, forças intermoleculares e geometria molecular.', 1),
  ((SELECT id FROM s), 'Funções inorgânicas: ácidos, bases, sais, óxidos, nomenclatura, propriedades e reações.', 2),
  ((SELECT id FROM s), 'Reações químicas, balanceamento, número de oxidação, oxirredução, cálculos químicos, mol, massa molar, estequiometria, rendimento, pureza e reagente limitante.', 3),
  ((SELECT id FROM s), 'Soluções, concentração, diluição, misturas, propriedades coligativas, termoquímica, cinética química, equilíbrio químico, equilíbrio iônico, pH e pOH.', 4),
  ((SELECT id FROM s), 'Eletroquímica, pilhas, eletrólise, corrosão, química orgânica, funções orgânicas, isomeria, reações orgânicas, polímeros, química ambiental e aplicações tecnológicas.', 5);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Biologia', 8 FROM public.contest_templates WHERE nome='FUVEST - USP' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Origem da vida, método científico, níveis de organização biológica, composição química dos seres vivos e metabolismo celular.', 0),
  ((SELECT id FROM s), 'Citologia, membranas, organelas, núcleo, divisão celular, respiração celular, fotossíntese, fermentação e síntese proteica.', 1),
  ((SELECT id FROM s), 'Genética, hereditariedade, DNA, RNA, mutações, biotecnologia, engenharia genética, genoma, bioética e evolução.', 2),
  ((SELECT id FROM s), 'Classificação dos seres vivos, vírus, bactérias, protozoários, fungos, algas, plantas e animais.', 3),
  ((SELECT id FROM s), 'Fisiologia humana, sistemas orgânicos, reprodução, desenvolvimento embrionário, saúde, doenças, imunologia e vacinação.', 4),
  ((SELECT id FROM s), 'Ecologia, populações, comunidades, ecossistemas, cadeias e teias alimentares, ciclos biogeoquímicos, biomas, impactos ambientais, conservação e sustentabilidade.', 5);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'História', 9 FROM public.contest_templates WHERE nome='FUVEST - USP' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Produção do conhecimento histórico, fontes, memória, cultura, identidade, tempo histórico e diversidade.', 0),
  ((SELECT id FROM s), 'Antiguidade, sociedades africanas, asiáticas, europeias e americanas, Grécia, Roma, povos originários e formações sociais antigas.', 1),
  ((SELECT id FROM s), 'Idade Média, feudalismo, cristianismo, islamismo, relações de poder, cultura e economia medieval.', 2),
  ((SELECT id FROM s), 'Idade Moderna, Renascimento, Reformas, expansão marítima, colonização, mercantilismo, escravidão, sociedades coloniais e Iluminismo.', 3),
  ((SELECT id FROM s), 'Revoluções burguesas, Revolução Industrial, independências nas Américas, formação dos Estados nacionais, imperialismo e capitalismo.', 4),
  ((SELECT id FROM s), 'Brasil colonial, imperial e republicano, escravidão, abolição, cidadania, movimentos sociais, autoritarismos, democracia, ditadura civil-militar e redemocratização.', 5),
  ((SELECT id FROM s), 'Guerras Mundiais, Revolução Russa, crise de 1929, fascismo, nazismo, Guerra Fria, descolonização, globalização, conflitos contemporâneos e direitos humanos.', 6);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Geografia', 10 FROM public.contest_templates WHERE nome='FUVEST - USP' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Cartografia, orientação, coordenadas geográficas, escala, projeções, mapas, imagens, gráficos, sensoriamento remoto e geotecnologias.', 0),
  ((SELECT id FROM s), 'Dinâmica da natureza: estrutura geológica, relevo, solos, clima, hidrografia, vegetação, biomas e domínios naturais.', 1),
  ((SELECT id FROM s), 'Questões ambientais, recursos naturais, energia, impactos ambientais, mudanças climáticas, sustentabilidade e conflitos socioambientais.', 2),
  ((SELECT id FROM s), 'População, demografia, migrações, urbanização, redes urbanas, metropolização, segregação socioespacial e qualidade de vida.', 3),
  ((SELECT id FROM s), 'Espaço agrário, indústria, comércio, transportes, comunicações, globalização, capitalismo, divisão internacional do trabalho e redes geográficas.', 4),
  ((SELECT id FROM s), 'Geopolítica, Estado, território, fronteiras, regionalizações, conflitos, blocos econômicos e desigualdades socioespaciais.', 5),
  ((SELECT id FROM s), 'Brasil: formação territorial, regiões, economia, população, urbanização, agropecuária, indústria, energia, transportes e meio ambiente.', 6);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Filosofia', 11 FROM public.contest_templates WHERE nome='FUVEST - USP' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Origem da filosofia, mito, razão, atitude filosófica, argumentação, lógica, validade, verdade e conhecimento.', 0),
  ((SELECT id FROM s), 'Epistemologia, ciência, método científico, senso comum, opinião, racionalismo, empirismo, criticismo, positivismo e pensamento contemporâneo.', 1),
  ((SELECT id FROM s), 'Ética, moral, liberdade, responsabilidade, virtude, dever, felicidade, direitos humanos e bioética.', 2),
  ((SELECT id FROM s), 'Filosofia política, Estado, poder, cidadania, democracia, justiça, liberalismo, socialismo, contratualismo, totalitarismo e participação política.', 3),
  ((SELECT id FROM s), 'Estética, arte, experiência estética, belo, sublime, gosto, cultura de massa e indústria cultural.', 4);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Sociologia', 12 FROM public.contest_templates WHERE nome='FUVEST - USP' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Surgimento da Sociologia, sociedade moderna, pensamento sociológico clássico e contemporâneo.', 0),
  ((SELECT id FROM s), 'Indivíduo e sociedade, socialização, instituições sociais, cultura, identidade, ideologia, diversidade e etnocentrismo.', 1),
  ((SELECT id FROM s), 'Estratificação social, classes sociais, desigualdades, raça, gênero, sexualidade, juventudes, minorias e movimentos sociais.', 2),
  ((SELECT id FROM s), 'Trabalho, capitalismo, divisão social do trabalho, taylorismo, fordismo, toyotismo, precarização, tecnologia e globalização.', 3),
  ((SELECT id FROM s), 'Estado, poder, política, democracia, cidadania, direitos humanos, participação social, violência e controle social.', 4);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Literatura — Obras obrigatórias', 13 FROM public.contest_templates WHERE nome='FUVEST - USP' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Opúsculo Humanitário — Nísia Floresta', 0),
  ((SELECT id FROM s), 'Nebulosas — Narcisa Amália', 1),
  ((SELECT id FROM s), 'Memórias de Martha — Julia Lopes de Almeida', 2),
  ((SELECT id FROM s), 'Caminho de pedras — Rachel de Queiroz', 3),
  ((SELECT id FROM s), 'A paixão segundo G. H. — Clarice Lispector', 4),
  ((SELECT id FROM s), 'Geografia — Sophia de Mello Breyner Andresen', 5),
  ((SELECT id FROM s), 'Balada de amor ao vento — Paulina Chiziane', 6),
  ((SELECT id FROM s), 'Canção para ninar menino grande — Conceição Evaristo', 7),
  ((SELECT id FROM s), 'A visão das plantas — Djaimilia Pereira de Almeida', 8);

-- ===== PAES UEMA (12 matérias) =====
DELETE FROM public.contest_template_subjects WHERE template_id = (SELECT id FROM public.contest_templates WHERE nome='PAES UEMA' AND tipo='vestibular' LIMIT 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Língua Portuguesa e Literatura', 0 FROM public.contest_templates WHERE nome='PAES UEMA' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Norma-padrão da língua portuguesa, variações linguísticas, funções da linguagem, denotação, conotação, sinonímia, antonímia e ambiguidade.', 0),
  ((SELECT id FROM s), 'Acentuação gráfica, texto, textualidade, tipologias textuais, gêneros literários, gêneros textuais e gêneros digitais.', 1),
  ((SELECT id FROM s), 'Coerência, coesão, intertextualidade, modalizadores discursivos, organização textual e argumentação.', 2),
  ((SELECT id FROM s), 'Morfossintaxe, estrutura e formação de palavras, classes de palavras, pontuação, concordância, regência, coordenação e subordinação.', 3),
  ((SELECT id FROM s), 'Discursos direto, indireto e indireto livre.', 4),
  ((SELECT id FROM s), 'Teoria literária, recursos estilísticos, figuras de linguagem, estilos de época do Trovadorismo às tendências contemporâneas e pós-modernas.', 5),
  ((SELECT id FROM s), 'Literatura brasileira, literatura portuguesa, literatura maranhense e leitura crítica de obras literárias.', 6);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Língua Espanhola', 1 FROM public.contest_templates WHERE nome='PAES UEMA' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Compreensão e interpretação de gêneros textuais em língua espanhola: vinheta, tira, publicidade, notícia, artigo, crônica, charge e demais textos verbais e não verbais.', 0),
  ((SELECT id FROM s), 'Funções da linguagem, elementos comunicativos, expressões idiomáticas e vocabulário contextual.', 1),
  ((SELECT id FROM s), 'Sinonímia, antonímia, paronímia, homonímia, polissemia, heterossemânticos, denotação e conotação.', 2),
  ((SELECT id FROM s), 'Pronomes pessoais, possessivos, demonstrativos, indefinidos, complementos e relativos.', 3),
  ((SELECT id FROM s), 'Artigos, substantivos, adjetivos, advérbios, conjunções, preposições, numerais e conectivos.', 4),
  ((SELECT id FROM s), 'Verbos regulares e irregulares nos modos indicativo, subjuntivo e imperativo.', 5),
  ((SELECT id FROM s), 'Perífrases verbais de infinitivo, gerúndio e particípio, variação linguística e acentuação.', 6);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Língua Inglesa', 2 FROM public.contest_templates WHERE nome='PAES UEMA' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Leitura e interpretação de textos verbais, não verbais e multissemióticos.', 0),
  ((SELECT id FROM s), 'Skimming, identificação de ideias gerais, localização de informações específicas, inferências, cognatos e falsos cognatos.', 1),
  ((SELECT id FROM s), 'Organização textual, vocabulário contextual, sinonímia, antonímia e relações de sentido.', 2),
  ((SELECT id FROM s), 'Artigos, substantivos, adjetivos, numerais, pronomes, advérbios, preposições e conjunções.', 3),
  ((SELECT id FROM s), 'Tempos verbais, formação de palavras, phrasal verbs, prepositional verbs e estruturas gramaticais em contexto.', 4);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'História', 3 FROM public.contest_templates WHERE nome='PAES UEMA' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Mundo Antigo: reinos africanos, Egito, Grécia e Roma.', 0),
  ((SELECT id FROM s), 'Mundo Medieval: feudalismo, sociedade, economia, cultura, Igreja e relações de poder.', 1),
  ((SELECT id FROM s), 'Idade Moderna: expansão marítima, Renascimento, Reformas, Contrarreforma, colonização da América e do Brasil, escravidão e Iluminismo.', 2),
  ((SELECT id FROM s), 'Revolução Francesa, Revolução Industrial, imperialismo, independência dos Estados Unidos, independências da América Latina e independência do Brasil.', 3),
  ((SELECT id FROM s), 'Racismo, cultura afro-brasileira, Brasil Império, República Velha, Primeira Guerra Mundial, Segunda Guerra Mundial, Taylorismo, Fordismo, crise de 1929, fascismo e nazismo.', 4),
  ((SELECT id FROM s), 'Era Vargas, anos 1950 e 1960, ditadura civil-militar, redemocratização, democracia, direitos humanos e sociedade contemporânea.', 5),
  ((SELECT id FROM s), 'Descolonização, Guerra Fria, conflitos internacionais, mundo do trabalho contemporâneo e História do Maranhão colonial, imperial e contemporâneo.', 6);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Geografia', 4 FROM public.contest_templates WHERE nome='PAES UEMA' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Terra no sistema planetário, litosfera, continentes, hidrosfera, orientação, coordenadas geográficas e fusos horários.', 0),
  ((SELECT id FROM s), 'Cartografia, representação espacial, mapas, escalas, projeções, sensoriamento remoto e geotecnologias.', 1),
  ((SELECT id FROM s), 'Ambientes naturais do mundo, do Brasil e do Maranhão: clima, vegetação, relevo, hidrografia, solos e biomas.', 2),
  ((SELECT id FROM s), 'Demografia, migrações, urbanização, população, trabalho, paisagens culturais e conflitos socioespaciais.', 3),
  ((SELECT id FROM s), 'Uso da terra, atividades econômicas, agropecuária, indústria, energia, matérias-primas, comércio, transportes e comunicações.', 4),
  ((SELECT id FROM s), 'Questões ambientais, sustentabilidade, educação ambiental, identidades territoriais, culturas, violências e geopolítica.', 5);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Filosofia', 5 FROM public.contest_templates WHERE nome='PAES UEMA' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Cultura, natureza, história, trabalho, tecnologia, sagrado e crises civilizatórias.', 0),
  ((SELECT id FROM s), 'Conhecimento: origens, tipos, verdade, métodos, ciência, correntes filosóficas, linguagem, pensamento, pós-verdade e ideologia.', 1),
  ((SELECT id FROM s), 'Origem da filosofia, mito, períodos da filosofia, filosofias indígenas e africanas.', 2),
  ((SELECT id FROM s), 'Lógica, argumentação, princípios lógicos, silogismo, validade, correção, proposição e lógica simbólica.', 3),
  ((SELECT id FROM s), 'Estética, arte, sensibilidade, experiência estética e cultura.', 4),
  ((SELECT id FROM s), 'Política: Estado, formas de governo, totalitarismo, biopolítica, republicanismo, liberalismo, socialismo, neoliberalismo, cidadania, democracia, feminismo, raça, gênero e decolonialidade.', 5),
  ((SELECT id FROM s), 'Ética: valores, moral, normas, dever, liberdade, direitos humanos, violências, existencialismo e bioética.', 6);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Sociologia', 6 FROM public.contest_templates WHERE nome='PAES UEMA' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Surgimento da Sociologia, indivíduo e sociedade, teorias sociológicas clássicas e contemporâneas.', 0),
  ((SELECT id FROM s), 'Formação da sociedade brasileira, conceitos sociológicos básicos, estratificação social, mobilidade social, cultura e ideologia.', 1),
  ((SELECT id FROM s), 'Colonialismo, racismo, mito da democracia racial, povos indígenas, relações interétnicas e desigualdades sociais.', 2),
  ((SELECT id FROM s), 'Violência, gênero, sexualidades, movimentos sociais, direitos humanos, cidadania e participação política.', 3),
  ((SELECT id FROM s), 'Trabalho: fordismo, taylorismo, toyotismo, uberização, modos de produção, relações de produção, emprego, desemprego e trabalho escravo contemporâneo.', 4),
  ((SELECT id FROM s), 'Estado, poder, governo, regimes políticos, democracia, globalização, soberania, neoliberalismo, sociedade, meio ambiente, sustentabilidade e justiça ambiental.', 5);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Matemática', 7 FROM public.contest_templates WHERE nome='PAES UEMA' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Sistemas de unidades, grandezas, medidas, números reais, divisibilidade, médias, razão, proporção, regra de três, porcentagem e juros.', 0),
  ((SELECT id FROM s), 'Conjuntos, plano cartesiano, relações e funções, domínio, imagem, sinal, crescimento, decrescimento, função composta e função inversa.', 1),
  ((SELECT id FROM s), 'Funções polinomiais do 1º e 2º graus, inequações, função modular, exponencial, logarítmica e trigonométrica.', 2),
  ((SELECT id FROM s), 'Geometria plana, geometria espacial, trigonometria, matrizes, determinantes e sistemas lineares.', 3),
  ((SELECT id FROM s), 'Análise combinatória, binômio, estatística, probabilidade, sequências, progressões aritméticas e geométricas.', 4),
  ((SELECT id FROM s), 'Geometria analítica, cônicas, sistemas de equações, gráficos, tabelas e resolução de problemas.', 5);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Física', 8 FROM public.contest_templates WHERE nome='PAES UEMA' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Grandezas físicas, Sistema Internacional de Unidades, cinemática, movimento uniforme, movimento uniformemente variado, queda livre e lançamentos.', 0),
  ((SELECT id FROM s), 'Dinâmica, leis de Newton, forças, plano inclinado, trabalho, energia, potência, conservação da quantidade de movimento, impulso e colisões.', 1),
  ((SELECT id FROM s), 'Gravitação, leis de Kepler, lei da gravitação universal, hidrostática, termologia, calorimetria e termodinâmica.', 2),
  ((SELECT id FROM s), 'Óptica geométrica, ondulatória, acústica, efeito Doppler, eletrostática, eletrodinâmica e eletromagnetismo.', 3),
  ((SELECT id FROM s), 'Física moderna: efeito fotoelétrico, estrutura atômica, relatividade e radioatividade.', 4);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Biologia', 9 FROM public.contest_templates WHERE nome='PAES UEMA' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Método científico, origem da vida, substâncias orgânicas e inorgânicas, nutrientes e organização celular.', 0),
  ((SELECT id FROM s), 'Citologia, ciclo celular, gametogênese, cariótipo, alterações cromossômicas, metabolismo energético e reprodução.', 1),
  ((SELECT id FROM s), 'Embriologia, histologia, ecologia, fluxo de energia, ciclos biogeoquímicos, biomas e sustentabilidade.', 2),
  ((SELECT id FROM s), 'Classificação biológica, sistemática, vírus, bactérias, protozoários, algas, fungos, plantas e animais.', 3),
  ((SELECT id FROM s), 'Genética, biotecnologia, síntese proteica, mutações, DNA, genoma, evolução e sistemas do corpo humano.', 4),
  ((SELECT id FROM s), 'Saúde, doenças, imunologia, relações entre ciência, tecnologia, sociedade e ambiente.', 5);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Química', 10 FROM public.contest_templates WHERE nome='PAES UEMA' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Matéria, energia, fenômenos físicos e químicos, estados físicos, substâncias, misturas, separação de misturas e práticas de laboratório.', 0),
  ((SELECT id FROM s), 'Teoria atômica, tabela periódica, ligações químicas, polaridade, geometria molecular e forças intermoleculares.', 1),
  ((SELECT id FROM s), 'Reações químicas, balanceamento, número de oxidação, funções inorgânicas, ácidos, bases, sais e óxidos.', 2),
  ((SELECT id FROM s), 'Cálculos químicos, massa, mol, constante de Avogadro, leis ponderais, estequiometria, gases e soluções.', 3),
  ((SELECT id FROM s), 'Termoquímica, cinética química, equilíbrio químico, eletroquímica, química orgânica, funções orgânicas, isomeria e reações orgânicas.', 4),
  ((SELECT id FROM s), 'Química experimental, química ambiental, materiais, aplicações tecnológicas e impactos socioambientais.', 5);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Literatura — Obras obrigatórias', 11 FROM public.contest_templates WHERE nome='PAES UEMA' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Cantos à beira mar — Maria Firmina dos Reis', 0),
  ((SELECT id FROM s), 'As meninas — Lygia Fagundes Telles', 1),
  ((SELECT id FROM s), 'Entre a espada e a rosa — Marina Colasanti', 2);

-- ===== PAS UEM (16 matérias) =====
DELETE FROM public.contest_template_subjects WHERE template_id = (SELECT id FROM public.contest_templates WHERE nome='PAS UEM' AND tipo='vestibular' LIMIT 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Redação', 0 FROM public.contest_templates WHERE nome='PAS UEM' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Etapa 1: carta de solicitação, comentário de postagens e resposta argumentativa.', 0),
  ((SELECT id FROM s), 'Etapa 2: carta de solicitação, comentário crítico de postagens, resposta argumentativa e artigo de opinião.', 1),
  ((SELECT id FROM s), 'Etapa 3: carta de solicitação, comentário crítico de postagens, resposta argumentativa, artigo de opinião e carta aberta.', 2);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Língua Portuguesa', 1 FROM public.contest_templates WHERE nome='PAS UEM' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Compreensão e interpretação de textos em todas as etapas.', 0),
  ((SELECT id FROM s), 'Condições de produção, estrutura composicional e marcas de estilo de diferentes gêneros do discurso.', 1),
  ((SELECT id FROM s), 'Funções sintáticas, produção de sentido, variação linguística do Português Brasileiro, organizadores textuais, operadores discursivos e conectivos.', 2),
  ((SELECT id FROM s), 'Argumentação, argumentos, contra-argumentos, vozes sociais, discurso oral, modalizadores e efeitos de sentido.', 3),
  ((SELECT id FROM s), 'Período simples, período composto, morfossintaxe, semântica, coesão, coerência, intertextualidade e análise linguística em contexto.', 4);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Língua Espanhola', 2 FROM public.contest_templates WHERE nome='PAS UEM' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Pronomes pessoais, incluindo vos, artigos, substantivos, adjetivos, possessivos, demonstrativos e numerais.', 0),
  ((SELECT id FROM s), 'Verbos regulares e irregulares nos modos indicativo, subjuntivo e imperativo.', 1),
  ((SELECT id FROM s), 'Acentuação, conjunções, preposições, pronomes indefinidos, pronomes complementos, apócopes e relativos.', 2),
  ((SELECT id FROM s), 'Formas não pessoais do verbo, interjeições, discurso direto e indireto, variação linguística e vocabulário em contexto.', 3);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Língua Francesa', 3 FROM public.contest_templates WHERE nome='PAS UEM' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Vocabulário, relações de sentido, sinonímia e antonímia.', 0),
  ((SELECT id FROM s), 'Marcadores de coesão e coerência: artigos definidos, indefinidos e partitivos, adjetivos demonstrativos, possessivos e indefinidos, pronomes pessoais e negação.', 1),
  ((SELECT id FROM s), 'Advérbios, coordenadas enunciativas, tempo e lugar de produção do discurso.', 2),
  ((SELECT id FROM s), 'Tempos verbais: presente, passé composé, futuro simples, imperfeito, mais-que-perfeito e presente do subjuntivo.', 3);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Língua Inglesa', 4 FROM public.contest_templates WHERE nome='PAS UEM' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Gêneros textuais das esferas cotidiana, midiática, literária, artística, científica, escolar e publicitária.', 0),
  ((SELECT id FROM s), 'Leitura, ideia principal, detalhes, inferências, organização textual, texto verbal e não verbal e análise da língua em uso.', 1),
  ((SELECT id FROM s), 'Personal pronouns, possessive adjectives and pronouns, articles, simple present, frequency adverbs, present continuous, simple past, past continuous, simple future, immediate future, imperative, there to be, question words, prepositions, quantifiers e plural of nouns.', 2),
  ((SELECT id FROM s), 'Comparatives, adjectives, adverbs, conjunctions, emphasizers, modal verbs, reflexive pronouns, relative pronouns, indefinite pronouns, conditional sentences, passive voice, reported speech, cognates, false cognates, affixes e question tags.', 3);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Arte', 5 FROM public.contest_templates WHERE nome='PAS UEM' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Etapa 1: música, som, ruído, parâmetros do som, instrumentos musicais, música ocidental contemporânea, samba, bossa nova, rock, arte moderna latino-americana, arte contemporânea, performance, videoarte, instalação, arte e política, teatro improvisacional, elementos da linguagem cênica, manifestações da cultura popular, teatralidades negras, indígenas, feministas e LGBTQIAPN+, dança contemporânea e danças típicas brasileiras.', 0),
  ((SELECT id FROM s), 'Etapa 2: voz cantada, música corporal, orquestra, música ocidental moderna e romântica, MPB, música sertaneja, Neoclassicismo, Renascimento, Barroco, produção teatral, teatro engajado, Teatro do Oprimido, teatro paranaense, dança moderna e danças folclóricas.', 1),
  ((SELECT id FROM s), 'Etapa 3: música e tecnologia, música clássica ocidental, tropicália, manguebeat, festivais de música, funk, rap, música eletrônica, arte medieval, arte greco-romana, arte egípcia, arte pré-histórica, dramaturgias contemporâneas, teatro e acessibilidade, performance, hibridismo, políticas culturais brasileiras, dança de salão e dança clássica.', 2);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Educação Física', 6 FROM public.contest_templates WHERE nome='PAS UEM' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Etapa 1: jogos cooperativos, dança de salão, ginástica de condicionamento físico, esporte plural, esporte educação, esporte participação, esporte lazer, mídia digital, lutas e cultura de movimento.', 0),
  ((SELECT id FROM s), 'Etapa 2: jogos, brincadeiras, esportes, ginásticas, saúde, prevenção de doenças, danças de rua, ritmos, lutas, conceitos e características das práticas corporais.', 1),
  ((SELECT id FROM s), 'Etapa 3: jogos e brincadeiras em mídias e culturas digitais, esportes, ginástica, lutas, danças, práticas corporais de aventura, cultura corporal, saúde, treinamento, sedentarismo e prevenção de doenças.', 2);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Filosofia', 7 FROM public.contest_templates WHERE nome='PAS UEM' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Etapa 1: origem da filosofia, discurso filosófico, argumentação filosófica, experimentos de pensamento, filosofia grega, sofística, método socrático, dialética, teoria das ideias, conhecimento, reminiscência, ciência, técnica, cosmologia, antropologia, teoria do conhecimento, ceticismo, racionalismo, empirismo, idealismo transcendental, lógica elementar, inferência, silogismo e falácias.', 0),
  ((SELECT id FROM s), 'Etapa 2: ética, virtude, vida boa, política, Estado, sociedade civil, soberania, direitos, obrigações dos cidadãos, cidadania, responsabilidade social, liberalismo, socialismo, contratualismo e justiça distributiva.', 1),
  ((SELECT id FROM s), 'Etapa 3: filosofia da ciência, revoluções científicas, paradigmas, verificação de teorias, positivismo, historicismo, ciência e poder, ciência e valor, mitos da ciência, estética, belo, sublime, arte, juízo de gosto, gênio, cultura de massas, indústria cultural, metafísica, universais, Tomás de Aquino e Avicena.', 2);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Geografia', 8 FROM public.contest_templates WHERE nome='PAS UEM' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Etapa 1: Geografia Geral, conceitos geográficos fundamentais, localização, orientação, movimentos da Terra, fusos horários, cartografia, estrutura geológica, tectônica de placas, rochas, relevo, agentes internos e externos, clima, biomas, solos, hidrografia, recursos naturais, fontes de energia e impactos ambientais.', 0),
  ((SELECT id FROM s), 'Etapa 2: Geografia do Brasil, estrutura geológica, relevo, climas do Brasil, bacias hidrográficas, biomas, domínios morfoclimáticos, população, economia, urbanização, regionalização do Brasil e Paraná no século XIX.', 1),
  ((SELECT id FROM s), 'Etapa 3: Geografia Global, espaço mundial, globalização, redes, fluxos, geopolítica, regionalizações do espaço geográfico, regionalização Norte-Sul e questões socioambientais contemporâneas.', 2);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'História', 9 FROM public.contest_templates WHERE nome='PAS UEM' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Etapa 1: Antiguidade Ocidental grega e romana, sociedades antigas, povos indígenas, História Antiga, História Medieval, formação do mundo moderno e processos históricos iniciais.', 0),
  ((SELECT id FROM s), 'Etapa 2: mundo moderno e contemporâneo, Renascimento, Reforma, revolução científica, colonização das Américas, mercantilismo, povos indígenas, invasões, revoluções burguesas, Revolução Industrial, capitalismo, independências nas Américas, Brasil Império e Paraná no século XIX.', 1),
  ((SELECT id FROM s), 'Etapa 3: cidadania e participação política no Brasil, formação do Estado brasileiro, eleições, voto, partidos políticos, autoritarismos, suspensão de direitos, juventudes, mulheres, lutas coletivas, relações étnico-raciais e sociais, mulheres na história paranaense, conflitos agrários no Paraná, modernização do campo, êxodo rural, urbanização, industrialização, trabalho, trabalhadores e movimentos operários no Paraná.', 2);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Sociologia', 10 FROM public.contest_templates WHERE nome='PAS UEM' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Etapa 1: sociedade, relações sociais, cidadania, cultura, socialização e noções introdutórias das Ciências Sociais.', 0),
  ((SELECT id FROM s), 'Etapa 2: constituição da Sociologia, sociedades modernas, Marx, Weber, Durkheim, teorias sociológicas contemporâneas, métodos, cultura, etnografia, diversidade, etnocentrismo, cultura brasileira, mundo do trabalho, novas tecnologias e globalização.', 1),
  ((SELECT id FROM s), 'Etapa 3: poder, relações entre Estado e sociedade, formas, sistemas e regimes de governo, democracia, direitos, cidadania, direitos humanos, preconceito, discriminação, intolerância, trabalho, renda, desigualdades sociais, desigualdades de gênero, mercado de trabalho e relações raciais no Brasil.', 2);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Matemática', 11 FROM public.contest_templates WHERE nome='PAS UEM' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Etapa 1: números, conjuntos, grandezas, medidas, razão, proporção, porcentagem, funções, geometria, estatística e resolução de problemas.', 0),
  ((SELECT id FROM s), 'Etapa 2: análise combinatória, problemas de contagem, princípio multiplicativo, princípio aditivo, fatorial, arranjo, combinação, permutação, probabilidade, espaços amostrais, probabilidade da união e intersecção de eventos, geometria plana, congruência, semelhança, funções polinomiais do 1º grau e do 2º grau.', 1),
  ((SELECT id FROM s), 'Etapa 3: funções, funções polinomiais do 1º grau, domínio, imagem, crescimento, decrescimento, gráficos, aplicações cotidianas e interdisciplinares, funções e conteúdos matemáticos avançados previstos para a etapa final.', 2);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Biologia', 12 FROM public.contest_templates WHERE nome='PAS UEM' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Etapa 1: fenômeno vida, organização dos seres vivos, mecanismos biológicos, biodiversidade, hereditariedade, variabilidade genética, ecologia, ciência, tecnologia e saúde.', 0),
  ((SELECT id FROM s), 'Etapa 2: diversidade dos organismos, vírus, bactérias, protozoários, algas, fungos, plantas, animais, zoologia, botânica, fisiologia comparada, reprodução, desenvolvimento, genética, evolução, imunologia, saúde pública e epidemiologia.', 1),
  ((SELECT id FROM s), 'Etapa 3: biologia humana, genética, biotecnologia, ecologia, evolução, saúde, ciência, tecnologia e questões contemporâneas relacionadas à vida.', 2);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Física', 13 FROM public.contest_templates WHERE nome='PAS UEM' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Etapa 1: grandezas físicas, medidas, SI, escalares e vetores, relações funcionais, gráficos, mecânica, cinemática, movimento uniforme, movimento uniformemente variado, queda livre, lançamentos, movimento circular, dinâmica, leis de Newton, forças, gravitação, impulso, quantidade de movimento, trabalho, energia, potência, conservação de energia, colisões, centro de massa, equilíbrio, polias e máquinas simples.', 0),
  ((SELECT id FROM s), 'Etapa 2: hidrostática, hidrodinâmica, densidade, pressão, Lei de Stevin, princípio de Pascal, empuxo, princípio de Arquimedes, vazão, equação da continuidade, equação de Bernoulli, termologia, temperatura, Lei Zero da Termodinâmica, escalas termométricas, dilatação térmica e calorimetria.', 1),
  ((SELECT id FROM s), 'Etapa 3: ondulatória, ondas estacionárias, ondas sonoras, altura, intensidade, timbre, velocidade, cordas vibrantes, tubos sonoros, efeito Doppler sonoro e luminoso, física moderna e aplicações tecnológicas.', 2);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Química', 14 FROM public.contest_templates WHERE nome='PAS UEM' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Etapa 1: constituição e transformações da matéria, estados físicos, substâncias, propriedades, separação de misturas, símbolos químicos, átomo, modelos atômicos, tabela periódica, ligações químicas, radioatividade, equações químicas, balanceamento, reações, estequiometria, funções inorgânicas, ácidos, bases, sais, óxidos, indicadores e meio ambiente.', 0),
  ((SELECT id FROM s), 'Etapa 2: soluções, dispersões, coeficiente de solubilidade, unidades de concentração, diluição, misturas de soluções, termoquímica, reações endotérmicas e exotérmicas, entalpia, Lei de Hess, cinética química, equilíbrio químico, equilíbrio iônico, pH, pOH, eletroquímica, pilhas, baterias, introdução à química orgânica, cadeias carbônicas e compostos orgânicos.', 1),
  ((SELECT id FROM s), 'Etapa 3: funções orgânicas, fórmulas estruturais, hidrocarbonetos alifáticos e aromáticos, álcoois, éteres, ésteres, aminas, ácidos carboxílicos, cetonas, haletos de alquila, amidas, reações orgânicas e aplicações.', 2);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Literatura — Obras obrigatórias', 15 FROM public.contest_templates WHERE nome='PAS UEM' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Etapa 1: Isso ninguém me tira — Ana Maria Machado', 0),
  ((SELECT id FROM s), 'Etapa 1: Poemas selecionados — Gregório de Matos', 1),
  ((SELECT id FROM s), 'Etapa 1: Poemas selecionados de Marília de Dirceu — Tomás Antônio Gonzaga', 2),
  ((SELECT id FROM s), 'Etapa 1: Poemas selecionados — Cláudio Manuel da Costa', 3),
  ((SELECT id FROM s), 'Etapa 1: Sonetos selecionados — Luís Vaz de Camões', 4),
  ((SELECT id FROM s), 'Etapa 1: Poemas selecionados de Toda Poesia — Paulo Leminski', 5),
  ((SELECT id FROM s), 'Etapa 1: Crônicas selecionadas de Comédias para se ler na escola — Luís Fernando Veríssimo', 6),
  ((SELECT id FROM s), 'Etapa 1: A Montanha da água lilás — Pepetela', 7),
  ((SELECT id FROM s), 'Etapa 3: Poemas selecionados de Toda Poesia — Paulo Leminski', 8),
  ((SELECT id FROM s), 'Etapa 3: Poemas selecionados — Adélia Prado', 9),
  ((SELECT id FROM s), 'Etapa 3: Poemas selecionados — Elisa Lucinda', 10),
  ((SELECT id FROM s), 'Etapa 3: Menino de engenho — José Lins do Rego', 11),
  ((SELECT id FROM s), 'Etapa 3: Quarto de despejo — Carolina Maria de Jesus', 12),
  ((SELECT id FROM s), 'Etapa 3: Contos Macacos, Tentação e Viagem à Petrópolis — Clarice Lispector', 13),
  ((SELECT id FROM s), 'Etapa 3: Contos Ana Davenga, Di Lixão e A gente combinamos de não morrer — Conceição Evaristo', 14),
  ((SELECT id FROM s), 'Etapa 3: Contos Penélope, O ciclista e Orgulho de Mulher — Dalton Trevisan', 15),
  ((SELECT id FROM s), 'Etapa 3: O santo inquérito — Dias Gomes', 16),
  ((SELECT id FROM s), 'Etapa 3: Poemas selecionados — Fernando Pessoa', 17),
  ((SELECT id FROM s), 'Etapa 3: Contos A saia amarrotada, O novo padre e Os machos lacrimosos — Mia Couto', 18);

-- ===== PAS UnB (6 matérias) =====
DELETE FROM public.contest_template_subjects WHERE template_id = (SELECT id FROM public.contest_templates WHERE nome='PAS UnB' AND tipo='vestibular' LIMIT 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Linguagens', 0 FROM public.contest_templates WHERE nome='PAS UnB' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Uso social da linguagem verbal, visual, sonora, corporal, artística, matemática, científica e tecnológica.', 0),
  ((SELECT id FROM s), 'Leitura, interpretação e produção de textos verbais, não verbais, multimodais e multissemióticos.', 1),
  ((SELECT id FROM s), 'Língua portuguesa, língua estrangeira, artes, cultura, comunicação, gêneros discursivos, repertórios culturais e práticas sociais de linguagem.', 2),
  ((SELECT id FROM s), 'Análise de textos, discursos, representações, identidades, diversidade, cultura digital, argumentação e interação social.', 3);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Matemática', 1 FROM public.contest_templates WHERE nome='PAS UnB' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Modelagem, resolução de problemas, raciocínio lógico, representação, interpretação de dados e uso de linguagem matemática.', 0),
  ((SELECT id FROM s), 'Números, grandezas, medidas, funções, geometria, estatística, probabilidade, tabelas, gráficos e relações quantitativas em contextos interdisciplinares.', 1),
  ((SELECT id FROM s), 'Uso de modelos matemáticos para interpretar fenômenos naturais, sociais, econômicos, tecnológicos e culturais.', 2);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Ciências da Natureza', 2 FROM public.contest_templates WHERE nome='PAS UnB' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Questões sociocientíficas relacionadas às ciências da natureza, tecnologia, ambiente, saúde, alimentação, energia e sociedade.', 0),
  ((SELECT id FROM s), 'Física, Química e Biologia em abordagem interdisciplinar e contextualizada.', 1),
  ((SELECT id FROM s), 'Termodinâmica, termologia, ondulatória, óptica geométrica, física moderna, história da termodinâmica, história da óptica e história da física moderna.', 2),
  ((SELECT id FROM s), 'Compostos inorgânicos, gases, termoquímica, soluções, materiais, transformações químicas e energia.', 3),
  ((SELECT id FROM s), 'Sistemática, taxonomia, vírus, bactérias, algas, protozoários, fungos, plantas, animais, botânica, zoologia, embriologia, fisiologia comparada e órgãos dos sentidos.', 4),
  ((SELECT id FROM s), 'Combustíveis fósseis, biocombustíveis, transporte, mobilidade, tecnologia da informação, produção e distribuição de alimentos, saúde pública, segurança e saúde no trabalho, desmatamento, biomas, sustentabilidade e desenvolvimento sustentável.', 5);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Humanidades', 3 FROM public.contest_templates WHERE nome='PAS UnB' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Filosofia, Geografia, História e Sociologia articuladas em abordagem interdisciplinar.', 0),
  ((SELECT id FROM s), 'Ser humano como sujeito histórico, social, filosófico e geográfico; relações entre sociedade, natureza, cultura, território, política e poder.', 1),
  ((SELECT id FROM s), 'Formas e regimes de Estado, relações territoriais, Estado Democrático de Direito, representação política, participação social e direitos humanos.', 2),
  ((SELECT id FROM s), 'Conhecimento científico, métodos, ideias, crenças, opiniões, discurso, linguagem, estética, arte e tecnologia.', 3),
  ((SELECT id FROM s), 'Colonização da América portuguesa, Estados nacionais, nacionalismos, capitalismo, resistência indígena e antiescravista.', 4),
  ((SELECT id FROM s), 'Racismo, patriarcado, minorias, grupos minorizados, diversidade, identidade, diferença, relações étnico-raciais, gênero, classe e desigualdades.', 5),
  ((SELECT id FROM s), 'Trabalho, cultura, ambiente, comunidades indígenas, quilombolas e tradicionais, biodiversidade, bioética, sustentabilidade, modelos produtivos, consumo, estratificação social, mudanças técnico-científicas e crises do mundo do trabalho.', 6);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Obras de referência', 4 FROM public.contest_templates WHERE nome='PAS UnB' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'PAS 1: Desvendando o Endereço Físico do Telescópio James Webb', 0),
  ((SELECT id FROM s), 'PAS 1: O manual de Epicteto — Epicteto', 1),
  ((SELECT id FROM s), 'PAS 1: Aliança do Fundo do Mar — Carlos Fioravanti', 2),
  ((SELECT id FROM s), 'PAS 1: Artigo 5º da Constituição da República Federativa do Brasil, até o inciso XII', 3),
  ((SELECT id FROM s), 'PAS 1: O Cerrado está morrendo — Revista Darcy', 4),
  ((SELECT id FROM s), 'PAS 1: Quando e por que os humanos começaram a falar?', 5),
  ((SELECT id FROM s), 'PAS 1: Para onde vais? — Woya Hayi Mawe', 6),
  ((SELECT id FROM s), 'PAS 1: Terraplanismo, Pós-Verdade e as promessas não cumpridas da modernidade — Mariana Alvim', 7),
  ((SELECT id FROM s), 'PAS 1: Xondaro Ka''aguy Reguá — OWERA', 8),
  ((SELECT id FROM s), 'PAS 1: Falas da Terra', 9),
  ((SELECT id FROM s), 'PAS 1: O Povo Brasileiro, parte I, A matriz Tupi — Darcy Ribeiro', 10),
  ((SELECT id FROM s), 'PAS 1: O perigo de uma História Única — Chimamanda Adichie', 11),
  ((SELECT id FROM s), 'PAS 1: Rumo ao Muquém — Santiago Dellape', 12),
  ((SELECT id FROM s), 'PAS 1: Discurso COP 26 — Txai Suruí', 13),
  ((SELECT id FROM s), 'PAS 2: A indústria cultural — T. Adorno e M. Horkheimer', 14),
  ((SELECT id FROM s), 'PAS 2: Resposta à pergunta: O que é o esclarecimento? — Immanuel Kant', 15),
  ((SELECT id FROM s), 'PAS 2: Resenha energética brasileira — Ministério de Minas e Energia', 16),
  ((SELECT id FROM s), 'PAS 2: O cerrado está morrendo — Revista Darcy', 17),
  ((SELECT id FROM s), 'PAS 2: Como colonizadores infectaram milhares de índios no Brasil — BBC', 18),
  ((SELECT id FROM s), 'PAS 2: Biossegurança no trabalho em frigoríficos — Gabriela Chaves Marra, Luciana Hugue de Souza e Telma Abdalla de Oliveira Cardoso', 19),
  ((SELECT id FROM s), 'PAS 2: A fome que nos atravessa — Revista Darcy', 20),
  ((SELECT id FROM s), 'PAS 2: Raízes do conhecimento — Revista Fapesp', 21),
  ((SELECT id FROM s), 'PAS 2: Oceano turbulento — Revista Darcy', 22),
  ((SELECT id FROM s), 'PAS 2: Lei Maria da Penha', 23),
  ((SELECT id FROM s), 'PAS 2: A geometria e sua relação com as estruturas dos vírus — Gabriel Cafeu Brandão', 24),
  ((SELECT id FROM s), 'PAS 2: A terra é redonda — Marco Moriconi', 25),
  ((SELECT id FROM s), 'PAS 3: Anemia falciforme foi invisibilizada pelo racismo, mostram entidades', 26),
  ((SELECT id FROM s), 'PAS 3: Galvani e Volta, um embate elétrico', 27),
  ((SELECT id FROM s), 'PAS 3: Elétricos movidos a etanol', 28),
  ((SELECT id FROM s), 'PAS 3: O Despertar dos robôs', 29),
  ((SELECT id FROM s), 'PAS 3: Como a descoberta da radiação mudou o futuro da humanidade', 30),
  ((SELECT id FROM s), 'PAS 3: A importância da biotecnologia para o desenvolvimento da Amazônia', 31),
  ((SELECT id FROM s), 'PAS 3: Cupuaçu só surgiu com a domesticação de fruto por indígenas', 32),
  ((SELECT id FROM s), 'PAS 3: Uma abordagem de Circuitos Elétricos utilizando Sistemas Lineares', 33),
  ((SELECT id FROM s), 'PAS 3: Necropolítica — Achille Mbembe', 34),
  ((SELECT id FROM s), 'PAS 3: Epistemicídio — Sueli Carneiro', 35),
  ((SELECT id FROM s), 'PAS 3: Sociedade do cansaço — Byung-Chul Han', 36);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Literatura — Obras obrigatórias', 5 FROM public.contest_templates WHERE nome='PAS UnB' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'PAS 2: Mal secreto — Raimundo Correia', 0),
  ((SELECT id FROM s), 'PAS 2: Ismália — Alphonsus de Guimaraens', 1),
  ((SELECT id FROM s), 'PAS 2: Lembrança de morrer — Álvares de Azevedo', 2),
  ((SELECT id FROM s), 'PAS 2: Profissão de fé — Olavo Bilac', 3),
  ((SELECT id FROM s), 'PAS 2: O assinalado — Cruz e Sousa', 4),
  ((SELECT id FROM s), 'PAS 2: A canção do africano — Castro Alves', 5),
  ((SELECT id FROM s), 'PAS 2: Remorso Póstumo — Charles Baudelaire', 6),
  ((SELECT id FROM s), 'PAS 3: A gente combinamos de não morrer — Conceição Evaristo', 7),
  ((SELECT id FROM s), 'PAS 3: Desenredo — Guimarães Rosa', 8),
  ((SELECT id FROM s), 'PAS 3: Laços de Família — Clarice Lispector', 9),
  ((SELECT id FROM s), 'PAS 3: Elegia 1938 — Carlos Drummond de Andrade', 10),
  ((SELECT id FROM s), 'PAS 3: Um médico rural — Franz Kafka', 11),
  ((SELECT id FROM s), 'PAS 3: A próxima aldeia — Franz Kafka', 12),
  ((SELECT id FROM s), 'PAS 3: Reinvenção — Cecília Meireles', 13),
  ((SELECT id FROM s), 'PAS 3: A lágrima — Augusto dos Anjos', 14),
  ((SELECT id FROM s), 'PAS 3: Evocação do Recife: memória, escravidão e história — Manuel Bandeira', 15),
  ((SELECT id FROM s), 'PAS 3: O quinze — Rachel de Queiroz', 16),
  ((SELECT id FROM s), 'PAS 3: Casamento — Adélia Prado', 17);

-- ===== PSS UEPG (14 matérias) =====
DELETE FROM public.contest_template_subjects WHERE template_id = (SELECT id FROM public.contest_templates WHERE nome='PSS UEPG' AND tipo='vestibular' LIMIT 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Arte', 0 FROM public.contest_templates WHERE nome='PSS UEPG' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'PSS 1: arte rupestre, arte na Antiguidade Oriental e Clássica, Egito Antigo, Grécia Antiga, Roma Antiga, teatro na Antiguidade, linguagem da dança, circo, fontes sonoras, instrumentos de orquestra, Teatro do Oprimido, Teatro Imagem, Teatro Fórum, arte medieval, arte renascentista, Barroco, Barroco brasileiro, Neoclassicismo, Romantismo, Realismo, Modernismo brasileiro, corpo na História da Arte, performance, happening, Fluxus, arte conceitual, Commedia dell''arte, expressão corporal e arte oriental.', 0),
  ((SELECT id FROM s), 'PSS 2: vanguardas modernas europeias, Expressionismo, Expressionismo Abstrato, Fauvismo, Cubismo, Futurismo, Dadaísmo, Surrealismo, cinema de vanguarda, cinema expressionista, cinema surrealista, matrizes culturais brasileiras, influências indígenas, africanas e europeias, patrimônio cultural brasileiro, arte paranaense, arte dos povos originários, ritmos africanos no Brasil, arte contemporânea, crítica, autonomia e práticas híbridas.', 1),
  ((SELECT id FROM s), 'PSS 3: conteúdos de Arte previstos para a terceira etapa do PSS 2026 conforme documento oficial de conteúdos programáticos da UEPG.', 2);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Educação Física', 1 FROM public.contest_templates WHERE nome='PSS UEPG' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'PSS 1: esportes paralímpicos, megaeventos esportivos, goalball, vôlei sentado, esgrima em cadeira de rodas, basquete em cadeira de rodas, capoeira, dimensões do esporte, vôlei, futebol, basquetebol, basquete 3x3, ginástica artística, ginástica para todos, ginástica de condicionamento físico, alongamento, pilates, sedentarismo, exercício físico, obesidade, jogos cooperativos e jogos eletrônicos.', 0),
  ((SELECT id FROM s), 'PSS 2: conteúdos de práticas corporais, esportes, ginásticas, jogos, danças, lutas, saúde, cultura corporal e práticas corporais previstos para a segunda etapa do PSS 2026.', 1),
  ((SELECT id FROM s), 'PSS 3: conteúdos de práticas corporais, esporte, ginástica, lutas, jogos, dança, aventura, cultura corporal, treinamento e saúde previstos para a terceira etapa do PSS 2026.', 2);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Língua Portuguesa', 2 FROM public.contest_templates WHERE nome='PSS UEPG' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'PSS 1: fonética, fonologia, ortografia, tonicidade, acentuação gráfica, sílaba tônica, homógrafos, morfologia, pronomes, advérbios, verbos regulares e irregulares, coesão referencial, anáfora, catáfora, figuras de sintaxe, semântica, modalização discursiva, coesão lexical, conectivos, sinonímia, hiponímia, hiperonímia, figuras de linguagem, figuras de pensamento, figuras de som, adequação vocabular, fala, escrita, registros formais e informais, interpretação textual, relações lógico-discursivas, intertextualidade e literatura.', 0),
  ((SELECT id FROM s), 'PSS 2: análise de aspectos éticos, estéticos e políticos em textos, funções dos verbos e pronomes, modos, tempos e vozes verbais, estruturas frasais, orações, períodos, coesão referencial, morfossintaxe, sintaxe, classes de palavras, formação de tempos verbais, intencionalidade, aceitabilidade, denotação, conotação, inferência, variação linguística, relações sociolinguísticas, estrutura da oração, semiose, argumentação e literatura.', 1),
  ((SELECT id FROM s), 'PSS 3: fonologia, fonemas, letras, tonicidade, classificação de palavras, funcionamento das linguagens e práticas culturais, interpretação textual, análise linguística, literatura e conteúdos previstos para a terceira série no documento oficial.', 2);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Redação', 3 FROM public.contest_templates WHERE nome='PSS UEPG' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'PSS 1: narração escolar, narrativa de aventura, narrativa fantástica, continuidade de narrativa e comentário de internet.', 0),
  ((SELECT id FROM s), 'PSS 2: notícia e resposta argumentativa.', 1),
  ((SELECT id FROM s), 'PSS 3: gêneros de redação definidos no boletim oficial de gêneros de redação do PSS 2026.', 2);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Língua Inglesa', 4 FROM public.contest_templates WHERE nome='PSS UEPG' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'PSS 1: leitura, compreensão e interpretação textual, análise crítica, posicionamento do autor, inferências, tema, intencionalidades, ideias principais e secundárias, função comunicativa, variedades linguísticas, contexto de produção, recepção e circulação, relações lógico-discursivas, escolhas lexicais, funções morfossintáticas, funções semânticas e pragmáticas, adjetivos, advérbios, conjunções, superlativos, presente simples, passado simples, passado contínuo, pronomes reflexivos e phrasal verbs.', 0),
  ((SELECT id FROM s), 'PSS 2: leitura, compreensão, interpretação, inferências, gramática contextual e conteúdos de língua inglesa previstos para a segunda etapa.', 1),
  ((SELECT id FROM s), 'PSS 3: leitura, compreensão, interpretação, análise linguística e conteúdos de língua inglesa previstos para a terceira etapa.', 2);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Língua Espanhola', 5 FROM public.contest_templates WHERE nome='PSS UEPG' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'PSS 1: leitura, compreensão e interpretação de textos, vocabulário, artigos definidos e indefinidos, pronomes pessoais, pronomes interrogativos, verbos ser e estar, verbos no presente do indicativo regulares e irregulares, números cardinais, substantivos e adjetivos quanto a gênero e número, expressões de comunicação formal e informal.', 0),
  ((SELECT id FROM s), 'PSS 2: leitura, compreensão, interpretação, vocabulário e conteúdos gramaticais de língua espanhola previstos para a segunda etapa.', 1),
  ((SELECT id FROM s), 'PSS 3: leitura, compreensão, interpretação, vocabulário e conteúdos gramaticais de língua espanhola previstos para a terceira etapa.', 2);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Biologia', 6 FROM public.contest_templates WHERE nome='PSS UEPG' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'PSS 1: teorias e hipóteses sobre a origem da vida, abiogênese, biogênese, origem e evolução do primeiro ser vivo, tipos celulares, biologia celular, células procariotas e eucariotas, células autotróficas e heterotróficas, composição química das células, envoltórios celulares, citoplasma, organelas, metabolismo energético, respiração celular, fermentação, fotossíntese, quimiossíntese, núcleo, divisão celular, educação alimentar e nutricional, reprodução humana, gametogênese, fecundação, desenvolvimento embrionário, anexos embrionários, ISTs, métodos contraceptivos, gravidez na adolescência, genética e biologia molecular.', 0),
  ((SELECT id FROM s), 'PSS 2: protozoários, algas, fungos, líquens, micorrizas, invertebrados, protocordados, cordados, biologia comparada, doenças transmitidas por animais, vegetais, morfologia, sistemática, fisiologia, reprodução, ciclos de vida, genética, leis mendelianas, interações gênicas, ligação gênica, determinação genética do sexo, herança poligênica, evolução, seleção natural, especiação, imunologia, saúde pública, epidemiologia, vacinas, contracepção, ISTs e dependência química.', 1),
  ((SELECT id FROM s), 'PSS 3: conteúdos de Biologia previstos para a terceira etapa do PSS 2026 no documento oficial da UEPG.', 2);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Química', 7 FROM public.contest_templates WHERE nome='PSS UEPG' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'PSS 1: estudo da matéria, propriedades, estados de agregação, substâncias, misturas, separação de misturas, leis ponderais, notação química, símbolos, fórmulas, equações químicas, balanceamento, massa atômica, massa molar, estrutura atômica, modelos atômicos, número atômico, número de massa, isótopos, isóbaros, isótonos, isoeletrônicos, postulados de Bohr, números quânticos, distribuição eletrônica, íons, tabela periódica, propriedades periódicas, ligações químicas, compostos inorgânicos, reações químicas, oxirredução e cálculos químicos.', 0),
  ((SELECT id FROM s), 'PSS 2: soluções, dispersões, solubilidade, concentração, diluição, mistura de soluções, termoquímica, entalpia, Lei de Hess, cinética química, velocidade de reação, energia de ativação, equilíbrio químico, Princípio de Le Chatelier, equilíbrio iônico, pH, pOH, eletroquímica, pilhas, baterias, química orgânica, propriedades do carbono e cadeias carbônicas.', 1),
  ((SELECT id FROM s), 'PSS 3: conteúdos de Química previstos para a terceira etapa do PSS 2026 no documento oficial da UEPG.', 2);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Matemática', 8 FROM public.contest_templates WHERE nome='PSS UEPG' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'PSS 1: números reais, conjuntos numéricos, operações, potências, reta numérica, intervalos, medidas, regra de três simples e composta, Sistema Internacional de Unidades, notação científica, unidades agrárias, astronômicas, de transferência e armazenamento de dados, densidade demográfica, densidade de materiais, algarismos significativos, funções reais, plano cartesiano, perímetro, área, domínio, imagem, gráficos, funções polinomiais, função afim, função quadrática, crescimento, decrescimento, zeros, máximos, mínimos, fatoração, matemática financeira, porcentagem, juros, rendas, receitas, compras, empréstimos, investimentos e geometria plana.', 0),
  ((SELECT id FROM s), 'PSS 2: conteúdos de Matemática da segunda série previstos no documento oficial do PSS 2026.', 1),
  ((SELECT id FROM s), 'PSS 3: conteúdos de Matemática da terceira série previstos no documento oficial do PSS 2026.', 2);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Geografia', 9 FROM public.contest_templates WHERE nome='PSS UEPG' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'PSS 1: conceitos básicos de Geografia, astronomia, origem do Universo, movimentos da Terra, geologia, estrutura geológica da Terra, formação e transformação do relevo, geologia e geomorfologia do Paraná e do Brasil, cartografia, coordenadas cartográficas, projeções, escala, sensoriamento remoto, sistemas de informações geográficas, cartografia digital, mapas temáticos, fuso horário, clima, fatores climáticos, tipos de clima no Paraná, no Brasil e no mundo, fenômenos e problemas ambientais atmosféricos, conferências ambientais e clima, conceitos e estrutura demográfica.', 0),
  ((SELECT id FROM s), 'PSS 2: conteúdos de Geografia da segunda série previstos no documento oficial do PSS 2026.', 1),
  ((SELECT id FROM s), 'PSS 3: conteúdos de Geografia da terceira série previstos no documento oficial do PSS 2026.', 2);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'História', 10 FROM public.contest_templates WHERE nome='PSS UEPG' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'PSS 1: conteúdos de História da primeira série previstos no documento oficial do PSS 2026.', 0),
  ((SELECT id FROM s), 'PSS 2: conteúdos de História da segunda série previstos no documento oficial do PSS 2026.', 1),
  ((SELECT id FROM s), 'PSS 3: conteúdos de História da terceira série previstos no documento oficial do PSS 2026.', 2);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Filosofia', 11 FROM public.contest_templates WHERE nome='PSS UEPG' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'PSS 1: conteúdos de Filosofia da primeira série previstos no documento oficial do PSS 2026.', 0),
  ((SELECT id FROM s), 'PSS 2: conteúdos de Filosofia da segunda série previstos no documento oficial do PSS 2026.', 1),
  ((SELECT id FROM s), 'PSS 3: conteúdos de Filosofia da terceira série previstos no documento oficial do PSS 2026.', 2);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Sociologia', 12 FROM public.contest_templates WHERE nome='PSS UEPG' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'PSS 1: conteúdos de Sociologia da primeira série previstos no documento oficial do PSS 2026.', 0),
  ((SELECT id FROM s), 'PSS 2: conteúdos de Sociologia da segunda série previstos no documento oficial do PSS 2026.', 1),
  ((SELECT id FROM s), 'PSS 3: conteúdos de Sociologia da terceira série previstos no documento oficial do PSS 2026.', 2);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Literatura — Obras obrigatórias', 13 FROM public.contest_templates WHERE nome='PSS UEPG' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'PSS 1: Os homens de barro — Ariano Suassuna', 0),
  ((SELECT id FROM s), 'PSS 1: Cumbe — Marcelo D''Salete', 1),
  ((SELECT id FROM s), 'PSS 2: Capítulo dos chapéus — Machado de Assis', 2),
  ((SELECT id FROM s), 'PSS 2: Um homem célebre — Machado de Assis', 3),
  ((SELECT id FROM s), 'PSS 2: A causa secreta — Machado de Assis', 4),
  ((SELECT id FROM s), 'PSS 2: Uma senhora — Machado de Assis', 5),
  ((SELECT id FROM s), 'PSS 2: O caso da vara — Machado de Assis', 6),
  ((SELECT id FROM s), 'PSS 2: Doze reis e a moça no labirinto do vento — Marina Colasanti', 7),
  ((SELECT id FROM s), 'PSS 3: Clara dos Anjos — Lima Barreto', 8),
  ((SELECT id FROM s), 'PSS 3: Olhos d''água — Conceição Evaristo', 9),
  ((SELECT id FROM s), 'PSS 3: Torto Arado — Itamar Vieira Junior', 10),
  ((SELECT id FROM s), 'PSS 3: Sentimento do Mundo — Carlos Drummond de Andrade', 11),
  ((SELECT id FROM s), 'PSS 3: Ay Kakyri Tama: Eu moro na cidade — Marcia Wayna Kambeba', 12);
