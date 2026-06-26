-- Disciplinas/tópicos do lote 3 de vestibulares (SSA UPE, Vestibular IME, Vestibular UERJ)
-- SIS/PSC UEA e VUNESP - Unesp vieram sem programa próprio (disciplinas: []) — nenhuma ação necessária.
-- Rodar no Supabase SQL Editor.

-- ===== SSA UPE (4 matérias) =====
DELETE FROM public.contest_template_subjects WHERE template_id = (SELECT id FROM public.contest_templates WHERE nome='SSA UPE' AND tipo='vestibular' LIMIT 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Linguagens e suas Tecnologias', 0 FROM public.contest_templates WHERE nome='SSA UPE' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Leitura e análise linguística/semiótica de textos do campo jornalístico-midiático: gêneros jornalísticos, condições de produção e recepção, recursos linguísticos, semióticos e multissemióticos, leitura crítica de mídias, checagem de fatos, manipulação informacional, curadoria em redes sociais.', 0),
  ((SELECT id FROM s), 'Leitura e análise linguística/semiótica de textos do campo da vida pessoal: práticas das culturas juvenis, manifestações de linguagem para compartilhar gostos e interesses, denunciar ou refletir, participação em comunidades informacionais.', 1),
  ((SELECT id FROM s), 'Leitura e análise linguística/semiótica de textos do campo da vida pública: formas não institucionalizadas de participação social, documentos legais e normativos, definições de direitos e deveres, contextos de produção.', 2),
  ((SELECT id FROM s), 'Leitura e análise linguística/semiótica de textos do campo das práticas de estudo e pesquisa: gêneros científicos e didáticos, produção e circulação do saber, procedimentos de pesquisa, coleta e análise de dados, uso de gráficos, citação e discurso reportado.', 3),
  ((SELECT id FROM s), 'Leitura e análise linguística/semiótica de textos do campo artístico-literário: gêneros literários (contos, crônicas, fábulas, poemas), intertextualidade, relação entre literatura e outras linguagens (teatro, dança, cinema), estereótipos sociais, diversidade cultural e de gênero.', 4);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Matemática e suas Tecnologias', 1 FROM public.contest_templates WHERE nome='SSA UPE' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Números e Álgebra: números reais (conjuntos, operações, reta real), plano cartesiano, razão e proporção, expressões algébricas, equações e sistemas do 1º e 2º grau.', 0),
  ((SELECT id FROM s), 'Funções: conceito de função, representações (algébrica, gráfica, tabular, verbal), domínio, imagem, funções afim, quadrática, exponencial, inversa, definidas por sentenças, taxa de variação.', 1),
  ((SELECT id FROM s), 'Proporcionalidade e Progressões: progressão aritmética (termo geral, soma dos n termos, relação com função afim), progressão geométrica (termo geral, soma infinita de PG decrescente, relação com função exponencial).', 2),
  ((SELECT id FROM s), 'Geometria e Medidas: grandezas e medidas (conversão de unidades, notação científica, ordens de grandeza), área e perímetro de figuras planas limitadas por retas ou arcos, cálculo de volumes de paralelepípedos retangulares.', 3),
  ((SELECT id FROM s), 'Probabilidade e Estatística: interpretação de gráficos, tabelas e infográficos, médias (aritmética, moda, mediana), medidas de dispersão (amplitude, variância, desvio padrão).', 4);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Ciências Humanas e Sociais Aplicadas', 2 FROM public.contest_templates WHERE nome='SSA UPE' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'História: introdução aos estudos históricos, fontes históricas (escritas, orais, iconográficas), pré-história, civilização Grega, civilização Romana, Idade Média e Império Muçulmano.', 0),
  ((SELECT id FROM s), 'Geografia: introdução aos estudos geográficos, conceitos de território, região, espaço, escala, orientações espaciais, linguagens cartográficas, coordenadas geográficas, fusos horários, relações Terra-Sol (movimentos da Terra, estações).', 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Ciências da Natureza e suas Tecnologias', 3 FROM public.contest_templates WHERE nome='SSA UPE' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Biologia: bases moleculares da vida (ácidos nucleicos, proteínas, lipídios, carboidratos), citologia (células, organelas, divisão celular, processos metabólicos como fotossíntese e respiração), anatomia e fisiologia humanas básicas.', 0),
  ((SELECT id FROM s), 'Física e Química: mecânica (leis de Newton, cinemática, trabalho e energia, calorimetria, termodinâmica), química (propriedades da matéria, ligações químicas, reações, estequiometria, equilíbrio químico, cinética química, eletroquímica).', 1);

-- ===== Vestibular IME (4 matérias) =====
DELETE FROM public.contest_template_subjects WHERE template_id = (SELECT id FROM public.contest_templates WHERE nome='Vestibular IME' AND tipo='vestibular' LIMIT 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Matemática', 0 FROM public.contest_templates WHERE nome='Vestibular IME' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Teoria de Conjuntos: noções elementares, subconjuntos, operações (união, interseção, diferença), conjuntos numéricos e sistemas de numeração.', 0),
  ((SELECT id FROM s), 'Funções: conceitos básicos (relação entre grandezas, conceito de função), funções polinomiais (afim, quadrática), exponencial, logarítmica, trigonométrica; funções inversas, compostas, injeteoras, sobrejetoras, bijetoras; indução finita.', 1),
  ((SELECT id FROM s), 'Números Complexos: forma algébrica e trigonométrica, operações, módulo, conjugado, fórmula de De Moivre, resolução de equações polinomiais.', 2),
  ((SELECT id FROM s), 'Polinômios e Equações: operações, divisões (Briot-Ruffini), raízes, teorema fundamental da álgebra, equações e inequações algébricas.', 3),
  ((SELECT id FROM s), 'Progressões e Combinatória: progressões aritmética e geométrica, binômio de Newton, princípios da contagem, permutações, combinações, probabilidade.', 4),
  ((SELECT id FROM s), 'Matrizes e Sistemas Lineares: matrizes (operações, determinantes até 3ª ordem), sistemas de equações lineares (resolução, regra de Cramer).', 5),
  ((SELECT id FROM s), 'Trigonometria: relações trigonométricas, equações e inequações trigonométricas, lei dos senos, lei dos cossenos, identidades trigonométricas.', 6);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Física', 1 FROM public.contest_templates WHERE nome='Vestibular IME' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Cinemática: movimento uniformemente variado, lançamento de projéteis, movimento circular (velocidade tangencial e angular, acelerações centrípeta e tangencial).', 0),
  ((SELECT id FROM s), 'Dinâmica: leis de Newton, momento e impulso, energia cinética e potencial, conservação de energia e quantidade de movimento, colisões elásticas e inelásticas.', 1),
  ((SELECT id FROM s), 'Gravitação: Lei da Gravitação Universal, campo gravitacional, leis de Kepler do movimento planetário.', 2),
  ((SELECT id FROM s), 'Hidrostática e Fluidos: princípio de Arquimedes, princípio de Pascal, pressão atmosférica, densidade e empuxo.', 3),
  ((SELECT id FROM s), 'Termologia: escalas termométricas, dilatação térmica, leis dos gases perfeitos, termodinâmica (primeira e segunda leis), ciclos termodinâmicos.', 4),
  ((SELECT id FROM s), 'Ondas e Óptica: ondas mecânicas (som e suas características, efeito Doppler), óptica geométrica (reflexão e refração da luz, lentes, espelhos), óptica física (interferência, difração, polarização).', 5),
  ((SELECT id FROM s), 'Eletricidade e Magnetismo: carga e campo elétrico, potencial elétrico, capacitores (lei de Gauss aplicada, energia armazenada), corrente contínua (Lei de Ohm, associação de resistências), indução eletromagnética (Lei de Faraday), circuitos elétricos.', 6);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Química', 2 FROM public.contest_templates WHERE nome='Vestibular IME' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Matéria e Substâncias: propriedades gerais da matéria, estados físicos, misturas e separações, átomos e tabela periódica (massa atômica, número atômico, isótopos).', 0),
  ((SELECT id FROM s), 'Química Orgânica e Funções Químicas: funções orgânicas básicas (alcanos, álcoois, aldeídos, ácidos, etc.), nomenclatura e reações típicas (síntese, decomposição, substituição, dupla troca).', 1),
  ((SELECT id FROM s), 'Reações Químicas e Estequiometria: balanceamento de equações, cálculos estequiométricos, rendimento e pureza de reagentes/produtos.', 2),
  ((SELECT id FROM s), 'Soluções e Gases: concentração de soluções (percentagem, mol/L), leis dos gases ideais, equações de Clapeyron e transformações gasosas.', 3),
  ((SELECT id FROM s), 'Equilíbrio Químico e Cinética: equilíbrio químico (constante de equilíbrio, deslocamentos), velocidade de reação (fatores que a influenciam, catálise), leis de velocidade.', 4),
  ((SELECT id FROM s), 'Eletroquímica: reações de oxirredução, pilhas eletroquímicas, eletrólise, Lei de Faraday, cálculo de cargas elétricas em processos redox.', 5);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Língua Inglesa', 3 FROM public.contest_templates WHERE nome='Vestibular IME' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Interpretação de textos em inglês: leitura e compreensão de textos diversos, vocabulário contextual, inferência de sentidos, identificação de ideias principais e secundárias.', 0),
  ((SELECT id FROM s), 'Tradução de inglês para português: tradução de pequenos textos de nível equivalente ao ensino médio completo.', 1),
  ((SELECT id FROM s), 'Produção textual em inglês: escrita de pequenos trechos em inglês em resposta a questões formuladas em inglês.', 2),
  ((SELECT id FROM s), 'Gramática básica de inglês: tempos verbais simples (presente, passado, futuro), pronomes pessoais, advérbios básicos, estruturas afirmativa, negativa e interrogativa, preposições e vocabulário fundamental.', 3);

-- ===== Vestibular UERJ (4 matérias) =====
DELETE FROM public.contest_template_subjects WHERE template_id = (SELECT id FROM public.contest_templates WHERE nome='Vestibular UERJ' AND tipo='vestibular' LIMIT 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Língua Portuguesa e Literatura', 0 FROM public.contest_templates WHERE nome='Vestibular UERJ' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Análise de textos literários e não literários: estudo de gêneros literários e artísticos, coesão e coerência, figuras de linguagem, intertextualidade, funções da linguagem, produção textual (narração, descrição, dissertação, injunção).', 0),
  ((SELECT id FROM s), 'Gramática da Língua Portuguesa: classes de palavras, sintaxe (frase, oração, período; concordância verbal e nominal; regência verbal e nominal), semântica (denotação e conotação, sinonímia, antonímia, polissemia).', 1),
  ((SELECT id FROM s), 'Literatura Brasileira e Portuguesa — Obras obrigatórias: Clarice Lispector — "Amor"; José de Alencar — "Senhora"; Pepetela — "O quase fim do mundo"; William Shakespeare — "Hamlet".', 2);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Matemática', 1 FROM public.contest_templates WHERE nome='Vestibular UERJ' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Aritmética e Álgebra: sistema decimal, divisibilidade, mmc e mdc, números naturais e reais, operações, porcentagem, regra de três; expressões algébricas; equações e inequações; matrizes e determinantes (até 3x3); sistemas lineares.', 0),
  ((SELECT id FROM s), 'Funções: funções afim, quadrática, exponencial, logarítmica, trigonométricas (seno, cosseno, tangente), gráficos, domínio, imagem, coeficientes.', 1),
  ((SELECT id FROM s), 'Geometria e Trigonometria: polígonos, circunferências, figuras planas (cálculo de área e perímetro); sólidos (prismas, pirâmides, cilindros, cones, esferas, cálculo de volume); semelhança de triângulos; relações trigonométricas no triângulo retângulo; lei dos cossenos e lei dos senos.', 2),
  ((SELECT id FROM s), 'Estatística: leitura e interpretação de tabelas, gráficos de setores e histogramas; medidas de tendência central (média, moda, mediana).', 3);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Ciências da Natureza', 2 FROM public.contest_templates WHERE nome='Vestibular UERJ' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Biologia: células e tecidos, metabolismo básico (fotossíntese, respiração celular), genética (DNA, RNA, síntese proteica), sistemas do corpo humano (nervoso, endócrino, reprodutor), ecologia básica (cadeias alimentares, ciclos biogeoquímicos, biodiversidade).', 0),
  ((SELECT id FROM s), 'Física: cinemática (movimento uniformemente variado, lançamentos, movimento circular), leis de Newton, trabalho e energia, calor e termologia (leis dos gases, termodinâmica), óptica geométrica (leis da reflexão e refração, lentes), eletricidade (carga, campo, potencial, circuitos, Lei de Ohm, capacitores).', 1),
  ((SELECT id FROM s), 'Química: estrutura atômica (átomos, tabela periódica), ligações químicas, estequiometria, funções químicas (ácidos, bases), reações químicas (síntese, decomposição, simples e dupla troca), equilíbrio químico, pH, cinética química.', 2);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Ciências Humanas', 3 FROM public.contest_templates WHERE nome='Vestibular UERJ' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Geografia: espaço geográfico (território, fronteiras, redes, localização global); escalas territoriais; dinâmica populacional (migrações, crescimento demográfico, políticas de população); urbanização (regiões metropolitanas, impactos ambientais).', 0),
  ((SELECT id FROM s), 'História: história do Brasil (períodos colonial, imperial, republicano), história mundial moderna (Revolução Industrial, guerras mundiais, Guerra Fria) e contemporânea (globalização, movimentos sociais), relações de poder e identidades culturais.', 1),
  ((SELECT id FROM s), 'Sociologia e Filosofia: conceitos básicos de sociedade, cultura e identidade; cidadania, direitos humanos, democracia; ética e ciência; diversidade cultural; análise de questões sociais contemporâneas (desigualdade, multiculturalismo, globalização).', 2);
