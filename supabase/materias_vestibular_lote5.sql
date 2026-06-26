-- Lote 5: Bloco B — IBMEC, Mackenzie, PUC Campinas, PUC Goiás, PUC Minas,
--          PUC-Rio, PUC-SP, PUCPR, PUCRS, UCS

-- ===== Vestibular IBMEC (5 matérias) =====
DELETE FROM public.contest_template_subjects WHERE template_id = (SELECT id FROM public.contest_templates WHERE nome='Vestibular IBMEC' AND tipo='vestibular' LIMIT 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Língua Portuguesa e Literatura', 0 FROM public.contest_templates WHERE nome='Vestibular IBMEC' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Leitura, compreensão e interpretação de textos literários e não literários', 0),
  ((SELECT id FROM s), 'Gêneros textuais e tipologia textual', 1),
  ((SELECT id FROM s), 'Variação linguística e adequação vocabular', 2),
  ((SELECT id FROM s), 'Relações sintático-semânticas (coesão e coerência)', 3),
  ((SELECT id FROM s), 'Morfossintaxe: classes de palavras, concordância, regência e crase', 4),
  ((SELECT id FROM s), 'Figuras de linguagem', 5),
  ((SELECT id FROM s), 'Períodos literários brasileiros e portugueses', 6),
  ((SELECT id FROM s), 'Movimentos literários: Quinhentismo ao Modernismo e literatura contemporânea', 7);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Matemática', 1 FROM public.contest_templates WHERE nome='Vestibular IBMEC' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Conjuntos numéricos e operações', 0),
  ((SELECT id FROM s), 'Razão, proporção, porcentagem e juros', 1),
  ((SELECT id FROM s), 'Funções: afim, quadrática, modular, exponencial e logarítmica', 2),
  ((SELECT id FROM s), 'Progressões aritméticas e geométricas', 3),
  ((SELECT id FROM s), 'Trigonometria em triângulos e funções trigonométricas', 4),
  ((SELECT id FROM s), 'Matrizes, determinantes e sistemas lineares', 5),
  ((SELECT id FROM s), 'Análise combinatória e probabilidade', 6),
  ((SELECT id FROM s), 'Geometria plana: polígonos, circunferências, áreas e perímetros', 7),
  ((SELECT id FROM s), 'Geometria espacial: prismas, pirâmides, cilindros, cones e esferas', 8),
  ((SELECT id FROM s), 'Geometria analítica: ponto, reta e circunferência', 9);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'História', 2 FROM public.contest_templates WHERE nome='Vestibular IBMEC' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Antiguidade: civilizações orientais e clássicas (Grécia e Roma)', 0),
  ((SELECT id FROM s), 'Idade Média: feudalismo, império bizantino e islamismo', 1),
  ((SELECT id FROM s), 'Idade Moderna: Renascimento, Reformas Religiosas e Absolutismo', 2),
  ((SELECT id FROM s), 'Expansão Marítima e colonização da América', 3),
  ((SELECT id FROM s), 'História do Brasil: Período Colonial, economia açucareira e mineração', 4),
  ((SELECT id FROM s), 'Independência das Américas e Revoluções Burguesas', 5),
  ((SELECT id FROM s), 'Brasil Império: Primeiro Reinado, Período Regencial e Segundo Reinado', 6),
  ((SELECT id FROM s), 'Século XX: Guerras Mundiais, Crise de 1929, Regimes Totalitários e Guerra Fria', 7),
  ((SELECT id FROM s), 'Brasil República: Primeira República, Era Vargas, Ditadura Civil-Militar e Redemocratização', 8);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Geografia', 3 FROM public.contest_templates WHERE nome='Vestibular IBMEC' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Cartografia: escalas, projeções e coordenadas', 0),
  ((SELECT id FROM s), 'Geografia física: relevo, clima, vegetação e hidrografia do Brasil e do mundo', 1),
  ((SELECT id FROM s), 'Questões ambientais e impactos da ação humana', 2),
  ((SELECT id FROM s), 'Dinâmica demográfica e migrações', 3),
  ((SELECT id FROM s), 'Urbanização e metropolização', 4),
  ((SELECT id FROM s), 'Geografia agrária: sistemas agrícolas e estrutura fundiária', 5),
  ((SELECT id FROM s), 'Industrialização e fontes de energia', 6),
  ((SELECT id FROM s), 'Geopolítica mundial, globalização e blocos econômicos', 7);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Língua Inglesa', 4 FROM public.contest_templates WHERE nome='Vestibular IBMEC' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Estratégias de leitura e compreensão de textos autênticos', 0),
  ((SELECT id FROM s), 'Vocabulário contextualizado', 1),
  ((SELECT id FROM s), 'Estruturas gramaticais: tempos verbais, pronomes, preposições, conjunções e voz passiva', 2),
  ((SELECT id FROM s), 'Marcadores discursivos e conectivos', 3);

-- ===== Vestibular Mackenzie (8 matérias) =====
DELETE FROM public.contest_template_subjects WHERE template_id = (SELECT id FROM public.contest_templates WHERE nome='Vestibular Mackenzie' AND tipo='vestibular' LIMIT 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Língua Portuguesa', 0 FROM public.contest_templates WHERE nome='Vestibular Mackenzie' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Compreensão e interpretação de textos', 0),
  ((SELECT id FROM s), 'Ortografia oficial', 1),
  ((SELECT id FROM s), 'Acentuação gráfica', 2),
  ((SELECT id FROM s), 'Morfologia: estrutura e formação de palavras, classes gramaticais', 3),
  ((SELECT id FROM s), 'Sintaxe: termos da oração, coordenação e subordinação', 4),
  ((SELECT id FROM s), 'Concordância verbal e nominal', 5),
  ((SELECT id FROM s), 'Regência verbal e nominal, uso do acento indicativo de crase', 6),
  ((SELECT id FROM s), 'Pontuação', 7),
  ((SELECT id FROM s), 'Semântica: sinonímia, antonímia, homonímia, paronímia, polissemia', 8),
  ((SELECT id FROM s), 'Estilística: figuras de linguagem', 9);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Matemática', 1 FROM public.contest_templates WHERE nome='Vestibular Mackenzie' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Conjuntos e funções', 0),
  ((SELECT id FROM s), 'Funções polinomiais, exponenciais e logarítmicas', 1),
  ((SELECT id FROM s), 'Trigonometria', 2),
  ((SELECT id FROM s), 'Matrizes, determinantes e sistemas de equações lineares', 3),
  ((SELECT id FROM s), 'Análise combinatória, binômio de Newton e probabilidade', 4),
  ((SELECT id FROM s), 'Geometria plana e espacial', 5),
  ((SELECT id FROM s), 'Geometria analítica', 6),
  ((SELECT id FROM s), 'Números complexos e polinômios', 7);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Física', 2 FROM public.contest_templates WHERE nome='Vestibular Mackenzie' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Cinemática escalar e vetorial', 0),
  ((SELECT id FROM s), 'Dinâmica: Leis de Newton, trabalho, energia e potência', 1),
  ((SELECT id FROM s), 'Gravitação universal', 2),
  ((SELECT id FROM s), 'Estática e Hidrostática', 3),
  ((SELECT id FROM s), 'Termologia: calorimetria, termodinâmica e dilatação', 4),
  ((SELECT id FROM s), 'Óptica geométrica', 5),
  ((SELECT id FROM s), 'Ondulatória e Acústica', 6),
  ((SELECT id FROM s), 'Eletrostática, Eletrodinâmica e Eletromagnetismo', 7);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Química', 3 FROM public.contest_templates WHERE nome='Vestibular Mackenzie' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Propriedades da matéria e estrutura atômica', 0),
  ((SELECT id FROM s), 'Tabela periódica e propriedades periódicas', 1),
  ((SELECT id FROM s), 'Ligações químicas e polaridade', 2),
  ((SELECT id FROM s), 'Funções inorgânicas: ácidos, bases, sais e óxidos', 3),
  ((SELECT id FROM s), 'Estequiometria e leis ponderais', 4),
  ((SELECT id FROM s), 'Soluções e propriedades coligativas', 5),
  ((SELECT id FROM s), 'Termoquímica e Cinética química', 6),
  ((SELECT id FROM s), 'Equilíbrio químico e pH', 7),
  ((SELECT id FROM s), 'Eletroquímica: pilhas e eletrólise', 8),
  ((SELECT id FROM s), 'Química orgânica: funções, nomenclatura, isomeria e reações', 9);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Biologia', 4 FROM public.contest_templates WHERE nome='Vestibular Mackenzie' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Bioquímica celular: água, sais minerais, carboidratos, lipídios, proteínas e ácidos nucleicos', 0),
  ((SELECT id FROM s), 'Citologia: membrana, citoplasma, organelas e divisão celular (mitose e meiose)', 1),
  ((SELECT id FROM s), 'Histologia animal e vegetal', 2),
  ((SELECT id FROM s), 'Seres vivos: vírus, bactérias, fungos, protozoários', 3),
  ((SELECT id FROM s), 'Botânica: morfologia, fisiologia e grupos vegetais', 4),
  ((SELECT id FROM s), 'Zoologia: invertebrados e vertebrados', 5),
  ((SELECT id FROM s), 'Fisiologia humana', 6),
  ((SELECT id FROM s), 'Genética: Leis de Mendel, grupos sanguíneos e biotecnologia', 7),
  ((SELECT id FROM s), 'Evolução: teorias evolutivas e especiação', 8),
  ((SELECT id FROM s), 'Ecologia: ciclos biogeoquímicos, cadeias alimentares, biomas e desequilíbrios ambientais', 9);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'História', 5 FROM public.contest_templates WHERE nome='Vestibular Mackenzie' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'História Geral: da Antiguidade à Idade Contemporânea', 0),
  ((SELECT id FROM s), 'Guerras Mundiais, Guerra Fria e nova ordem mundial', 1),
  ((SELECT id FROM s), 'História do Brasil: Colônia, Império e República', 2),
  ((SELECT id FROM s), 'Movimentos sociais, políticos e culturais no Brasil', 3);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Geografia', 6 FROM public.contest_templates WHERE nome='Vestibular Mackenzie' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Geografia do Brasil: quadro natural, população, urbanização, agropecuária e indústria', 0),
  ((SELECT id FROM s), 'Geografia Geral: cartografia, clima, relevo, biomas', 1),
  ((SELECT id FROM s), 'Geopolítica, globalização e conflitos mundiais atuais', 2),
  ((SELECT id FROM s), 'Meio ambiente e sustentabilidade', 3);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Língua Inglesa', 7 FROM public.contest_templates WHERE nome='Vestibular Mackenzie' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Interpretação de textos de fontes diversas', 0),
  ((SELECT id FROM s), 'Gramática normativa aplicada ao texto', 1),
  ((SELECT id FROM s), 'Vocabulário essencial', 2);

-- ===== Vestibular PUC Campinas (4 matérias) =====
DELETE FROM public.contest_template_subjects WHERE template_id = (SELECT id FROM public.contest_templates WHERE nome='Vestibular PUC Campinas' AND tipo='vestibular' LIMIT 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Ciências da Natureza', 0 FROM public.contest_templates WHERE nome='Vestibular PUC Campinas' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Física: Mecânica, Termofísica, Óptica, Ondulatória e Eletromagnetismo', 0),
  ((SELECT id FROM s), 'Química: Estrutura da matéria, Transformações químicas, Química orgânica e inorgânica, Energia', 1),
  ((SELECT id FROM s), 'Biologia: Organização celular, Hereditariedade, Diversidade da vida, Ecologia, Evolução e Saúde', 2);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Ciências Humanas', 1 FROM public.contest_templates WHERE nome='Vestibular PUC Campinas' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'História: Processos históricos do Brasil e do mundo, Cidadania, Cultura, Conflitos e Relações de poder', 0),
  ((SELECT id FROM s), 'Geografia: Espaço geográfico, Dinâmicas naturais, Dinâmicas populacionais e econômicas, Geopolítica', 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Linguagens e Códigos', 2 FROM public.contest_templates WHERE nome='Vestibular PUC Campinas' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Língua Portuguesa: Análise de textos, Gramática, Variação linguística e Produção textual', 0),
  ((SELECT id FROM s), 'Literatura: Movimentos literários e análise de obras significativas da literatura brasileira', 1),
  ((SELECT id FROM s), 'Língua Estrangeira (Inglês): Leitura e interpretação de textos', 2);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Matemática', 3 FROM public.contest_templates WHERE nome='Vestibular PUC Campinas' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Aritmética e Álgebra', 0),
  ((SELECT id FROM s), 'Geometria Plana, Espacial e Analítica', 1),
  ((SELECT id FROM s), 'Trigonometria', 2),
  ((SELECT id FROM s), 'Estatística e Probabilidade', 3),
  ((SELECT id FROM s), 'Funções e Progressões', 4);

-- ===== Vestibular PUC Goiás (4 matérias) =====
DELETE FROM public.contest_template_subjects WHERE template_id = (SELECT id FROM public.contest_templates WHERE nome='Vestibular PUC Goiás' AND tipo='vestibular' LIMIT 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Linguagens, Códigos e suas Tecnologias', 0 FROM public.contest_templates WHERE nome='Vestibular PUC Goiás' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Interpretação de textos verbais e não verbais', 0),
  ((SELECT id FROM s), 'Norma padrão da língua portuguesa', 1),
  ((SELECT id FROM s), 'Recursos expressivos e figuras de linguagem', 2),
  ((SELECT id FROM s), 'História da literatura brasileira e suas escolas', 3),
  ((SELECT id FROM s), 'Língua estrangeira moderna (Inglês ou Espanhol) focada em leitura', 4);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Matemática e suas Tecnologias', 1 FROM public.contest_templates WHERE nome='Vestibular PUC Goiás' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Sistemas de numeração e conjuntos', 0),
  ((SELECT id FROM s), 'Álgebra básica e funções', 1),
  ((SELECT id FROM s), 'Geometrias plana, espacial e analítica', 2),
  ((SELECT id FROM s), 'Tratamento da informação: estatística básica, contagem e probabilidade', 3);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Ciências da Natureza e suas Tecnologias', 2 FROM public.contest_templates WHERE nome='Vestibular PUC Goiás' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Física: Cinemática, Leis de Newton, Conservação da Energia, Termodinâmica, Ondas e Eletricidade', 0),
  ((SELECT id FROM s), 'Química: Modelos atômicos, Classificação periódica, Ligações, Reações, Cinética, Equilíbrio e Compostos de Carbono', 1),
  ((SELECT id FROM s), 'Biologia: Moléculas, Células, Tecidos, Organismos, Genética, Evolução e Interações Ecológicas', 2);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Ciências Humanas e suas Tecnologias', 3 FROM public.contest_templates WHERE nome='Vestibular PUC Goiás' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'História: Formação do Brasil contemporâneo, Relações de trabalho, Poder e cultura na história ocidental', 0),
  ((SELECT id FROM s), 'Geografia: Relação sociedade-natureza, Espaço agropecuário e industrial, Redes de comunicação e transportes', 1),
  ((SELECT id FROM s), 'Filosofia e Sociologia: Surgimento da sociologia, Cidadania, Direitos humanos, Ética e Política', 2);

-- ===== Vestibular PUC Minas (8 matérias) =====
DELETE FROM public.contest_template_subjects WHERE template_id = (SELECT id FROM public.contest_templates WHERE nome='Vestibular PUC Minas' AND tipo='vestibular' LIMIT 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Língua Portuguesa e Literatura', 0 FROM public.contest_templates WHERE nome='Vestibular PUC Minas' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Leitura, análise e interpretação de textos', 0),
  ((SELECT id FROM s), 'Coesão e coerência textual', 1),
  ((SELECT id FROM s), 'Classes de palavras e suas funções sintáticas', 2),
  ((SELECT id FROM s), 'Sintaxe de concordância e regência', 3),
  ((SELECT id FROM s), 'Pontuação', 4),
  ((SELECT id FROM s), 'Literatura brasileira: principais movimentos, autores e obras', 5);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Língua Estrangeira', 1 FROM public.contest_templates WHERE nome='Vestibular PUC Minas' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Leitura e compreensão de textos em Inglês ou Espanhol', 0),
  ((SELECT id FROM s), 'Gramática contextualizada', 1),
  ((SELECT id FROM s), 'Vocabulário', 2);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'História', 2 FROM public.contest_templates WHERE nome='Vestibular PUC Minas' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'História Mundial: da Antiguidade aos dias atuais, com foco em processos econômicos, sociais e políticos', 0),
  ((SELECT id FROM s), 'História do Brasil: Período Colonial, Império e República até a atualidade', 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Geografia', 3 FROM public.contest_templates WHERE nome='Vestibular PUC Minas' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'O espaço geográfico mundial e brasileiro', 0),
  ((SELECT id FROM s), 'A natureza e sua dinâmica: clima, relevo, hidrografia e biomas', 1),
  ((SELECT id FROM s), 'A população: estrutura, dinâmica e mobilidade', 2),
  ((SELECT id FROM s), 'Atividades econômicas, urbanização e questões ambientais', 3);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Matemática', 4 FROM public.contest_templates WHERE nome='Vestibular PUC Minas' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Aritmética, Álgebra, Funções e Equações', 0),
  ((SELECT id FROM s), 'Geometria (Plana, Espacial e Analítica)', 1),
  ((SELECT id FROM s), 'Análise Combinatória, Probabilidade e Estatística', 2);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Física', 5 FROM public.contest_templates WHERE nome='Vestibular PUC Minas' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Mecânica, Termologia, Óptica, Ondulatória e Eletromagnetismo', 0);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Química', 6 FROM public.contest_templates WHERE nome='Vestibular PUC Minas' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Estrutura da matéria, Transformações químicas e energia, Dinâmica das transformações químicas, Compostos de carbono', 0);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Biologia', 7 FROM public.contest_templates WHERE nome='Vestibular PUC Minas' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Bases moleculares e celulares da vida', 0),
  ((SELECT id FROM s), 'Hereditariedade e Evolução', 1),
  ((SELECT id FROM s), 'Diversidade dos seres vivos', 2),
  ((SELECT id FROM s), 'Ecologia e meio ambiente', 3);

-- ===== Vestibular PUC-Rio (6 matérias) =====
DELETE FROM public.contest_template_subjects WHERE template_id = (SELECT id FROM public.contest_templates WHERE nome='Vestibular PUC-Rio' AND tipo='vestibular' LIMIT 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Língua Portuguesa e Literatura Brasileira', 0 FROM public.contest_templates WHERE nome='Vestibular PUC-Rio' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Compreensão de leitura de textos de diferentes gêneros', 0),
  ((SELECT id FROM s), 'Organização textual: coesão, coerência, argumentação', 1),
  ((SELECT id FROM s), 'Gramática: classes de palavras, sintaxe da oração e do período, concordância, regência, crase e pontuação', 2),
  ((SELECT id FROM s), 'História da Literatura Brasileira: do Quinhentismo à Literatura Contemporânea', 3),
  ((SELECT id FROM s), 'Estilos de época, análise de poemas e prosas', 4);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Matemática', 1 FROM public.contest_templates WHERE nome='Vestibular PUC-Rio' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Álgebra e Funções (polinomiais, exponenciais, logarítmicas, trigonométricas)', 0),
  ((SELECT id FROM s), 'Trigonometria', 1),
  ((SELECT id FROM s), 'Geometria Plana, Geometria Espacial e Geometria Analítica', 2),
  ((SELECT id FROM s), 'Matrizes, Determinantes e Sistemas Lineares', 3),
  ((SELECT id FROM s), 'Análise Combinatória e Probabilidades', 4),
  ((SELECT id FROM s), 'Progressões Aritméticas e Geométricas', 5);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'História', 2 FROM public.contest_templates WHERE nome='Vestibular PUC-Rio' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'História do Mundo Ocidental: Antiguidade Clássica, Idade Média, Época Moderna e Mundo Contemporâneo', 0),
  ((SELECT id FROM s), 'História das Américas: Colonização, Independências, Séculos XIX e XX', 1),
  ((SELECT id FROM s), 'História do Brasil: Sociedade Colonial, Império, República Velha, Era Vargas, Período Democrático, Ditadura Militar e Nova República', 2);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Geografia', 3 FROM public.contest_templates WHERE nome='Vestibular PUC-Rio' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Dinâmica da natureza e impactos ambientais (clima, relevo, vegetação, solos e água)', 0),
  ((SELECT id FROM s), 'Organização do espaço agrário e urbano', 1),
  ((SELECT id FROM s), 'Dinâmica demográfica e desigualdades socioespaciais', 2),
  ((SELECT id FROM s), 'Globalização, redes e território', 3),
  ((SELECT id FROM s), 'Geopolítica e relações internacionais', 4),
  ((SELECT id FROM s), 'Formação territorial do Brasil', 5);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Ciências da Natureza (Biologia, Física, Química)', 4 FROM public.contest_templates WHERE nome='Vestibular PUC-Rio' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Biologia: Níveis de organização da vida, Metabolismo, Genética, Evolução, Fisiologia Humana e Ecologia', 0),
  ((SELECT id FROM s), 'Física: Grandezas e medidas, Mecânica (Cinemática e Dinâmica), Termodinâmica, Ondas, Óptica e Eletromagnetismo', 1),
  ((SELECT id FROM s), 'Química: Estrutura atômica, Classificação periódica, Ligações, Funções inorgânicas, Reações químicas, Estequiometria, Soluções, Termoquímica e Química Orgânica', 2);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Língua Estrangeira (Inglês ou Espanhol)', 5 FROM public.contest_templates WHERE nome='Vestibular PUC-Rio' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Compreensão de textos', 0),
  ((SELECT id FROM s), 'Reconhecimento de vocabulário e estruturas sintáticas fundamentais', 1);

-- ===== Vestibular PUC-SP (9 matérias) =====
DELETE FROM public.contest_template_subjects WHERE template_id = (SELECT id FROM public.contest_templates WHERE nome='Vestibular PUC-SP' AND tipo='vestibular' LIMIT 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Língua Portuguesa e Literatura', 0 FROM public.contest_templates WHERE nome='Vestibular PUC-SP' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Compreensão, interpretação e estruturação de textos', 0),
  ((SELECT id FROM s), 'Variação linguística e registros de linguagem', 1),
  ((SELECT id FROM s), 'Fonética, morfologia e sintaxe da norma-padrão', 2),
  ((SELECT id FROM s), 'Coesão e coerência', 3),
  ((SELECT id FROM s), 'Figuras de linguagem', 4),
  ((SELECT id FROM s), 'História da Literatura Brasileira e de Portugal: do Trovadorismo à contemporaneidade', 5),
  ((SELECT id FROM s), 'Análise das relações entre literatura, história e cultura', 6);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Literatura — Obras obrigatórias', 1 FROM public.contest_templates WHERE nome='Vestibular PUC-SP' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Macunaíma (Mário de Andrade)', 0),
  ((SELECT id FROM s), 'Vidas Secas (Graciliano Ramos)', 1),
  ((SELECT id FROM s), 'A Rosa do Povo (Carlos Drummond de Andrade)', 2),
  ((SELECT id FROM s), 'O Cortiço (Aluísio Azevedo)', 3),
  ((SELECT id FROM s), 'Quincas Borba (Machado de Assis)', 4);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Matemática', 2 FROM public.contest_templates WHERE nome='Vestibular PUC-SP' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Lógica e conjuntos', 0),
  ((SELECT id FROM s), 'Aritmética e Álgebra', 1),
  ((SELECT id FROM s), 'Funções: conceito, gráficos, afim, quadrática, modular, exponencial, logarítmica e trigonométrica', 2),
  ((SELECT id FROM s), 'Análise Combinatória e Probabilidade', 3),
  ((SELECT id FROM s), 'Matrizes, determinantes e sistemas lineares', 4),
  ((SELECT id FROM s), 'Geometrias plana, espacial e analítica', 5),
  ((SELECT id FROM s), 'Estatística: medidas de tendência central e dispersão', 6);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'História', 3 FROM public.contest_templates WHERE nome='Vestibular PUC-SP' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Antiguidade: Grécia e Roma', 0),
  ((SELECT id FROM s), 'Idade Média: sociedade feudal, Igreja e renascimento comercial', 1),
  ((SELECT id FROM s), 'Idade Moderna: absolutismo, mercantilismo, renascimento e reformas', 2),
  ((SELECT id FROM s), 'Brasil Colônia: economia, sociedade e administração', 3),
  ((SELECT id FROM s), 'Brasil Império e República', 4),
  ((SELECT id FROM s), 'Século XX: Guerras, Regimes Totalitários, Guerra Fria e Globalização', 5);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Geografia', 4 FROM public.contest_templates WHERE nome='Vestibular PUC-SP' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Representação do espaço: mapas e escalas', 0),
  ((SELECT id FROM s), 'Geografia Física: estrutura geológica, relevo, clima, hidrografia e biomas', 1),
  ((SELECT id FROM s), 'Dinâmica demográfica e migrações', 2),
  ((SELECT id FROM s), 'Geografia Agrária e Urbana', 3),
  ((SELECT id FROM s), 'Atividades econômicas, industrialização e comércio', 4),
  ((SELECT id FROM s), 'Geopolítica e ordem mundial atual', 5);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Física', 5 FROM public.contest_templates WHERE nome='Vestibular PUC-SP' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Mecânica: cinemática, leis de Newton, energia, conservação e estática', 0),
  ((SELECT id FROM s), 'Termologia: temperatura, calor, termodinâmica e gases', 1),
  ((SELECT id FROM s), 'Óptica geométrica e fenômenos ondulatórios', 2),
  ((SELECT id FROM s), 'Eletricidade e Magnetismo', 3);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Química', 6 FROM public.contest_templates WHERE nome='Vestibular PUC-SP' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Matéria: propriedades e estrutura atômica', 0),
  ((SELECT id FROM s), 'Ligações químicas e substâncias', 1),
  ((SELECT id FROM s), 'Funções inorgânicas', 2),
  ((SELECT id FROM s), 'Estequiometria', 3),
  ((SELECT id FROM s), 'Físico-Química: soluções, termoquímica, cinética e equilíbrio', 4),
  ((SELECT id FROM s), 'Eletroquímica', 5),
  ((SELECT id FROM s), 'Química Orgânica: classificação, nomenclatura, isomeria e propriedades', 6);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Biologia', 7 FROM public.contest_templates WHERE nome='Vestibular PUC-SP' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Biologia Celular e Molecular', 0),
  ((SELECT id FROM s), 'Histologia', 1),
  ((SELECT id FROM s), 'Diversidade dos seres vivos', 2),
  ((SELECT id FROM s), 'Anatomia e Fisiologia comparada e humana', 3),
  ((SELECT id FROM s), 'Genética e Biologia Molecular', 4),
  ((SELECT id FROM s), 'Evolução', 5),
  ((SELECT id FROM s), 'Ecologia e sustentabilidade', 6);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Língua Estrangeira (Inglês)', 8 FROM public.contest_templates WHERE nome='Vestibular PUC-SP' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Estratégias de leitura e compreensão de textos variados', 0),
  ((SELECT id FROM s), 'Gramática normativa aplicada à compreensão', 1),
  ((SELECT id FROM s), 'Vocabulário geral', 2);

-- ===== Vestibular PUCPR (4 matérias) =====
DELETE FROM public.contest_template_subjects WHERE template_id = (SELECT id FROM public.contest_templates WHERE nome='Vestibular PUCPR' AND tipo='vestibular' LIMIT 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Linguagens, Códigos e suas Tecnologias', 0 FROM public.contest_templates WHERE nome='Vestibular PUCPR' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Língua Portuguesa: leitura e interpretação de textos, gramática aplicada (fonologia, morfologia, sintaxe, semântica)', 0),
  ((SELECT id FROM s), 'Literatura: escolas literárias brasileiras, análise de textos e gêneros literários', 1),
  ((SELECT id FROM s), 'Língua Estrangeira (Inglês): compreensão de textos, aspectos gramaticais fundamentais', 2);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Matemática e suas Tecnologias', 1 FROM public.contest_templates WHERE nome='Vestibular PUCPR' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Números e Álgebra', 0),
  ((SELECT id FROM s), 'Geometria e Medidas (Plana, Espacial e Analítica)', 1),
  ((SELECT id FROM s), 'Grandezas, Proporcionalidade e Funções', 2),
  ((SELECT id FROM s), 'Estatística, Probabilidade e Combinatória', 3);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Ciências da Natureza e suas Tecnologias', 2 FROM public.contest_templates WHERE nome='Vestibular PUCPR' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Biologia: Células e tecidos, Fisiologia dos sistemas, Genética, Evolução, Diversidade biológica e Ecologia', 0),
  ((SELECT id FROM s), 'Física: Cinemática, Dinâmica, Energia, Termodinâmica, Eletromagnetismo, Ondulatória e Óptica', 1),
  ((SELECT id FROM s), 'Química: Estrutura da matéria, Ligações, Compostos inorgânicos, Estequiometria, Físico-química e Química orgânica', 2);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Ciências Humanas e suas Tecnologias', 3 FROM public.contest_templates WHERE nome='Vestibular PUCPR' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'História: Brasil (Colônia, Império e República), História Geral (Antiguidade ao Mundo Contemporâneo)', 0),
  ((SELECT id FROM s), 'Geografia: Cartografia, Geografia Física (clima, relevo, vegetação), Geografia Humana (população, urbanização) e Geopolítica', 1),
  ((SELECT id FROM s), 'Filosofia e Sociologia: Fundamentos do pensamento, Sociedade, Estado e Movimentos Sociais', 2);

-- ===== Vestibular PUCRS (8 matérias) =====
DELETE FROM public.contest_template_subjects WHERE template_id = (SELECT id FROM public.contest_templates WHERE nome='Vestibular PUCRS' AND tipo='vestibular' LIMIT 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Língua Portuguesa e Literatura', 0 FROM public.contest_templates WHERE nome='Vestibular PUCRS' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Compreensão e interpretação de textos', 0),
  ((SELECT id FROM s), 'Recursos linguísticos: fonologia, ortografia, morfologia, sintaxe e semântica', 1),
  ((SELECT id FROM s), 'Produção textual e tipologia', 2),
  ((SELECT id FROM s), 'História da literatura brasileira e portuguesa: estilos de época, principais autores e obras', 3);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Língua Estrangeira (Inglês ou Espanhol)', 1 FROM public.contest_templates WHERE nome='Vestibular PUCRS' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Compreensão leitora de textos autênticos', 0),
  ((SELECT id FROM s), 'Conhecimento léxico-gramatical inserido em contexto', 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Matemática', 2 FROM public.contest_templates WHERE nome='Vestibular PUCRS' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Aritmética e Conjuntos', 0),
  ((SELECT id FROM s), 'Álgebra: equações, inequações, matrizes e sistemas', 1),
  ((SELECT id FROM s), 'Funções de variáveis reais', 2),
  ((SELECT id FROM s), 'Geometria Plana, Espacial e Analítica', 3),
  ((SELECT id FROM s), 'Trigonometria', 4),
  ((SELECT id FROM s), 'Sequências, Análise Combinatória, Probabilidade e Estatística', 5);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Física', 3 FROM public.contest_templates WHERE nome='Vestibular PUCRS' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Mecânica: movimento, forças, energia, quantidade de movimento', 0),
  ((SELECT id FROM s), 'Física Térmica: temperatura, calor e termodinâmica', 1),
  ((SELECT id FROM s), 'Óptica e Ondulatória', 2),
  ((SELECT id FROM s), 'Eletricidade e Magnetismo', 3),
  ((SELECT id FROM s), 'Noções de Física Moderna', 4);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Química', 4 FROM public.contest_templates WHERE nome='Vestibular PUCRS' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Constituição da matéria e propriedades', 0),
  ((SELECT id FROM s), 'Substâncias e misturas', 1),
  ((SELECT id FROM s), 'Tabela periódica e ligações', 2),
  ((SELECT id FROM s), 'Funções inorgânicas e reações', 3),
  ((SELECT id FROM s), 'Cálculos químicos', 4),
  ((SELECT id FROM s), 'Soluções, Termoquímica, Cinética e Equilíbrio', 5),
  ((SELECT id FROM s), 'Eletroquímica', 6),
  ((SELECT id FROM s), 'Química Orgânica', 7);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Biologia', 5 FROM public.contest_templates WHERE nome='Vestibular PUCRS' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Composição química da matéria viva', 0),
  ((SELECT id FROM s), 'Estrutura e funcionamento celular', 1),
  ((SELECT id FROM s), 'Reprodução e desenvolvimento', 2),
  ((SELECT id FROM s), 'Herança genética', 3),
  ((SELECT id FROM s), 'Diversidade e evolução dos seres vivos', 4),
  ((SELECT id FROM s), 'Ecologia e interações com o ambiente', 5);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'História', 6 FROM public.contest_templates WHERE nome='Vestibular PUCRS' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Pré-História e Antiguidade Clássica', 0),
  ((SELECT id FROM s), 'Idade Média e Moderna', 1),
  ((SELECT id FROM s), 'Idade Contemporânea: séculos XIX, XX e XXI', 2),
  ((SELECT id FROM s), 'História do Brasil: da organização colonial aos desafios do século XXI', 3);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Geografia', 7 FROM public.contest_templates WHERE nome='Vestibular PUCRS' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Fundamentos de cartografia', 0),
  ((SELECT id FROM s), 'A base física do planeta e do Brasil', 1),
  ((SELECT id FROM s), 'A organização econômica e social do espaço', 2),
  ((SELECT id FROM s), 'O espaço agrário e urbano', 3),
  ((SELECT id FROM s), 'Geopolítica e ordem ambiental internacional', 4);

-- ===== Vestibular UCS (5 matérias) =====
DELETE FROM public.contest_template_subjects WHERE template_id = (SELECT id FROM public.contest_templates WHERE nome='Vestibular UCS' AND tipo='vestibular' LIMIT 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Língua Portuguesa, Literatura e Redação', 0 FROM public.contest_templates WHERE nome='Vestibular UCS' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Leitura e interpretação de diferentes gêneros textuais', 0),
  ((SELECT id FROM s), 'Estrutura e formação de palavras', 1),
  ((SELECT id FROM s), 'Sintaxe e pontuação', 2),
  ((SELECT id FROM s), 'Concordância e regência', 3),
  ((SELECT id FROM s), 'Teoria literária e principais movimentos da literatura brasileira e gaúcha', 4);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Língua Estrangeira (Espanhol ou Inglês)', 1 FROM public.contest_templates WHERE nome='Vestibular UCS' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Compreensão de textos verbais e não-verbais', 0),
  ((SELECT id FROM s), 'Morfossintaxe aplicada à leitura', 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Ciências da Natureza', 2 FROM public.contest_templates WHERE nome='Vestibular UCS' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Biologia: Citologia, genética, evolução, fisiologia e ecologia', 0),
  ((SELECT id FROM s), 'Química: Estrutura da matéria, ligações, funções inorgânicas e orgânicas, físico-química', 1),
  ((SELECT id FROM s), 'Física: Cinemática, dinâmica, termofísica, ondas, óptica e eletromagnetismo', 2);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Ciências Humanas', 3 FROM public.contest_templates WHERE nome='Vestibular UCS' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'História: Processos históricos globais e do Brasil, com ênfase na história do Rio Grande do Sul', 0),
  ((SELECT id FROM s), 'Geografia: Espaço natural e socioeconômico, cartografia, dinâmica populacional e questões ambientais', 1),
  ((SELECT id FROM s), 'Filosofia e Sociologia: Pensamento filosófico e organização sociopolítica', 2);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Matemática', 4 FROM public.contest_templates WHERE nome='Vestibular UCS' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Conjuntos numéricos e funções', 0),
  ((SELECT id FROM s), 'Geometria euclidiana (plana e espacial)', 1),
  ((SELECT id FROM s), 'Trigonometria e geometria analítica', 2),
  ((SELECT id FROM s), 'Estatística, análise combinatória e probabilidade', 3);
