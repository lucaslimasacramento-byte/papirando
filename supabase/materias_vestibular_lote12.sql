-- Lote 12: Vestibular UESB (13 matérias, BA) e Vestibular Unesc (8 matérias, SC)
-- UESPI, UNEB → disciplinas: [] — deletar do catálogo.

-- ===== Vestibular UESB =====
INSERT INTO public.contest_templates (slug, nome, plano, concurso, tipo, area, cor, status, is_public, scope, institution_type, uf)
VALUES ('vestibular-uesb', 'Vestibular UESB', 'free', 'UESB', 'vestibular', 'Geral', '#2563EB', 'ativo', true, 'estadual', 'publica', 'BA')
ON CONFLICT (slug) DO UPDATE SET nome = EXCLUDED.nome, is_public = true;

DELETE FROM public.contest_template_subjects WHERE template_id = (SELECT id FROM public.contest_templates WHERE nome='Vestibular UESB' AND tipo='vestibular' LIMIT 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Língua Portuguesa', 0 FROM public.contest_templates WHERE nome='Vestibular UESB' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Leitura e interpretação de textos literários e informativos, de tipologia variada', 0),
  ((SELECT id FROM s), 'Classes de palavras e suas flexões nominais e verbais', 1),
  ((SELECT id FROM s), 'Palavras de relação intervocabular e interoracional', 2),
  ((SELECT id FROM s), 'Sintaxe de concordância, de regência e de colocação', 3),
  ((SELECT id FROM s), 'Crase', 4),
  ((SELECT id FROM s), 'Frase, oração e período; frase verbal e frase nominal', 5),
  ((SELECT id FROM s), 'Elementos constituintes da oração e suas funções morfossintáticas', 6),
  ((SELECT id FROM s), 'Processo de coordenação e paralelismo de construção', 7),
  ((SELECT id FROM s), 'Processo de subordinação: relações de dependência e de interdependência', 8),
  ((SELECT id FROM s), 'Orações coordenadas e subordinadas, desenvolvidas e reduzidas', 9),
  ((SELECT id FROM s), 'Semântica: conotação, denotação, sinonímia, antonímia e paronímia', 10),
  ((SELECT id FROM s), 'Figuras de linguagem', 11),
  ((SELECT id FROM s), 'Níveis de linguagem e funções de linguagem', 12),
  ((SELECT id FROM s), 'Formas de discurso', 13),
  ((SELECT id FROM s), 'Pontuação: recursos expressivos e sintático-semânticos', 14),
  ((SELECT id FROM s), 'Formação de palavras: processos', 15),
  ((SELECT id FROM s), 'Ortografia', 16),
  ((SELECT id FROM s), 'Acentuação gráfica', 17);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Literatura Brasileira', 1 FROM public.contest_templates WHERE nome='Vestibular UESB' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Análise literária e identificação de estilos de época', 0),
  ((SELECT id FROM s), 'Barroco', 1),
  ((SELECT id FROM s), 'Arcadismo e Neoclassicismo', 2),
  ((SELECT id FROM s), 'Romantismo', 3),
  ((SELECT id FROM s), 'Realismo, Naturalismo e Parnasianismo', 4),
  ((SELECT id FROM s), 'Simbolismo e Pré-Modernismo (período sincrético)', 5),
  ((SELECT id FROM s), 'Modernismo e tendências atuais', 6);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Redação', 2 FROM public.contest_templates WHERE nome='Vestibular UESB' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Produção de texto em prosa e sob diversos formatos, a partir de textos motivadores', 0),
  ((SELECT id FROM s), 'Temas relacionados à realidade social, econômica, política e cultural do país', 1),
  ((SELECT id FROM s), 'Avaliação do plano de conteúdo e do plano de expressão', 2);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Língua Estrangeira — Inglês', 3 FROM public.contest_templates WHERE nome='Vestibular UESB' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Leitura e compreensão de textos de fontes variadas', 0),
  ((SELECT id FROM s), 'Identificação de fatos e ideias', 1),
  ((SELECT id FROM s), 'Vocabulário', 2),
  ((SELECT id FROM s), 'Gramática do discurso: referência gramatical e lexical', 3),
  ((SELECT id FROM s), 'Formação de palavras', 4),
  ((SELECT id FROM s), 'Marcadores de discurso', 5),
  ((SELECT id FROM s), 'Grupos nominais e artigos', 6),
  ((SELECT id FROM s), 'Pronomes, substantivos e verbos', 7),
  ((SELECT id FROM s), 'Adjetivos, advérbios e preposições', 8),
  ((SELECT id FROM s), 'Sujeito, predicado, objeto direto e indireto', 9);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Língua Estrangeira — Espanhol', 4 FROM public.contest_templates WHERE nome='Vestibular UESB' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Leitura e compreensão de textos de fontes variadas', 0),
  ((SELECT id FROM s), 'Determinantes do nome: artigos, possessivos, demonstrativos, numerais, relativos, interrogativos e exclamativos', 1),
  ((SELECT id FROM s), 'Substantivos e adjetivos: gênero, número e grau', 2),
  ((SELECT id FROM s), 'Pronomes pessoais, possessivos, demonstrativos, relativos, indefinidos, interrogativos e exclamativos', 3),
  ((SELECT id FROM s), 'Verbos: auxiliares, regulares, irregulares, impessoais, pronominais, forma passiva e perífrases', 4),
  ((SELECT id FROM s), 'Advérbios, locuções adverbiais, preposições e conjunções', 5),
  ((SELECT id FROM s), 'Acentuação, sinônimos e antônimos', 6),
  ((SELECT id FROM s), 'Divergências entre português e espanhol: heterográficos, heterofônicos, heterogenéricos e heterosemânticos', 7),
  ((SELECT id FROM s), 'Oração e seus elementos; período simples e composto: coordenação e subordinação', 8);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Língua Estrangeira — Francês', 5 FROM public.contest_templates WHERE nome='Vestibular UESB' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Leitura e compreensão de textos de fontes variadas', 0),
  ((SELECT id FROM s), 'Determinantes do nome: artigos, possessivos, demonstrativos, numerais, relativos, interrogativos e exclamativos', 1),
  ((SELECT id FROM s), 'Substantivos e adjetivos: gênero, número e grau', 2),
  ((SELECT id FROM s), 'Pronomes pessoais, possessivos, demonstrativos, relativos, indefinidos; y e en', 3),
  ((SELECT id FROM s), 'Verbos auxiliares, regulares, irregulares, impessoais, pronominais e forma passiva', 4),
  ((SELECT id FROM s), 'Advérbios, preposições e conjunções', 5),
  ((SELECT id FROM s), 'Acentuação, sinônimos e antônimos', 6),
  ((SELECT id FROM s), 'Emprego de ne...que; frase negativa; uso da partícula on', 7),
  ((SELECT id FROM s), 'Oração e seus elementos; período simples e composto: coordenação e subordinação', 8);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Matemática', 6 FROM public.contest_templates WHERE nome='Vestibular UESB' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Lógica matemática e conjuntos: proposições, operações lógicas, quantificadores, pertinência, inclusão e operações', 0),
  ((SELECT id FROM s), 'Noções de argumentos lógicos e diagramas de Venn', 1),
  ((SELECT id FROM s), 'Conjuntos numéricos: reais e subconjuntos, razão, proporção e grandezas proporcionais', 2),
  ((SELECT id FROM s), 'Polinômios: operações, propriedades e relação entre coeficientes e raízes', 3),
  ((SELECT id FROM s), 'Funções: plano cartesiano, domínio, imagem, gráfico, crescimento, decrescimento e composição', 4),
  ((SELECT id FROM s), 'Funções afim, quadrática, modular, exponencial e logarítmica', 5),
  ((SELECT id FROM s), 'Funções trigonométricas, relações e fórmulas, gráficos, equações e inequações', 6),
  ((SELECT id FROM s), 'Sequências, progressão aritmética e progressão geométrica', 7),
  ((SELECT id FROM s), 'Matrizes: operações, tipos e matriz inversa; determinantes; sistemas lineares', 8),
  ((SELECT id FROM s), 'Análise combinatória: princípio fundamental da contagem, arranjos, combinações e permutações', 9),
  ((SELECT id FROM s), 'Binômio de Newton', 10),
  ((SELECT id FROM s), 'Probabilidade e estatística: espaço amostral, eventos, distribuição de frequências, medidas de posição e dispersão', 11),
  ((SELECT id FROM s), 'Matemática financeira: descontos, juros simples, juros compostos e capitalização', 12),
  ((SELECT id FROM s), 'Trigonometria: arcos e ângulos, razões no triângulo retângulo e na circunferência, leis dos senos e cossenos', 13),
  ((SELECT id FROM s), 'Números complexos: representação e operações', 14),
  ((SELECT id FROM s), 'Geometria plana: segmentos, ângulos, triângulos, quadriláteros, polígonos regulares, circunferência, perímetro e áreas', 15),
  ((SELECT id FROM s), 'Geometria espacial: paralelismo, perpendicularismo, poliedros, prismas, pirâmides, cilindros, cones, esferas, áreas e volumes', 16),
  ((SELECT id FROM s), 'Geometria analítica: distância entre pontos, reta e circunferência', 17);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Ciências Humanas', 7 FROM public.contest_templates WHERE nome='Vestibular UESB' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Espaço da natureza: localização, coordenadas geográficas, cartografia, projeções, escalas e fusos horários', 0),
  ((SELECT id FROM s), 'Formação do espaço natural: fatores endógenos e exógenos, formas e estrutura do relevo', 1),
  ((SELECT id FROM s), 'Atmosfera: fatores e elementos do clima, tipos climáticos e clima no Brasil', 2),
  ((SELECT id FROM s), 'Solos no Brasil; águas oceânicas e continentais; bacias hidrográficas brasileiras', 3),
  ((SELECT id FROM s), 'Ecossistemas brasileiros; meio ambiente, conservação, preservação e desenvolvimento sustentável', 4),
  ((SELECT id FROM s), 'Espaço da produção: agropecuária, capitalismo no campo e desenvolvimento técnico-científico', 5),
  ((SELECT id FROM s), 'Industrialização e geopolítica: localização industrial, industrialização brasileira e divisão internacional do trabalho', 6),
  ((SELECT id FROM s), 'Energia: fontes, distribuição mundial e brasileira', 7),
  ((SELECT id FROM s), 'Comércio internacional, OMC e comércio brasileiro', 8),
  ((SELECT id FROM s), 'População no mundo e no Brasil: distribuição, dinâmica, estruturas e migrações', 9),
  ((SELECT id FROM s), 'Urbanização no mundo e no Brasil: rede urbana, metropolização e áreas metropolitanas', 10),
  ((SELECT id FROM s), 'Sistema viário e organização espacial brasileira, divisões regionais e macrorregiões', 11),
  ((SELECT id FROM s), 'Fundamentos da civilização ocidental: Grécia e Roma — formação política, social e econômica', 12),
  ((SELECT id FROM s), 'Civilização muçulmana', 13),
  ((SELECT id FROM s), 'Mundo ocidental da Idade Média ao mundo atual: feudalismo, transição ao capitalismo, Renascimento, estados nacionais e Reforma', 14),
  ((SELECT id FROM s), 'Impérios nacionais, mercantilismo, sistema colonial, absolutismo e império português', 15),
  ((SELECT id FROM s), 'Brasil colonial: grande propriedade, exportação, escravidão e estrutura política e social', 16),
  ((SELECT id FROM s), 'Consolidação do capitalismo, Revolução Industrial, imperialismo e revoluções liberais', 17),
  ((SELECT id FROM s), 'Brasil no século XIX: Império, República, Primeira República, Revolução de 1930 e Era Vargas', 18),
  ((SELECT id FROM s), 'Primeira Guerra Mundial, Revolução Russa, entreguerras, totalitarismos e Estado Novo no Brasil', 19),
  ((SELECT id FROM s), 'Segunda Guerra Mundial, pós-guerra, bipolaridade, Guerra Fria, descolonização e América Latina', 20),
  ((SELECT id FROM s), 'Brasil pós-Estado Novo: golpe de 1964, ditadura militar, abertura e redemocratização', 21),
  ((SELECT id FROM s), 'Panorama político, econômico, social e cultural brasileiro da década de 1960 aos dias atuais', 22),
  ((SELECT id FROM s), 'Espaço mundial contemporâneo: fim da Guerra Fria, conflitos étnico-religiosos, multipolaridade', 23),
  ((SELECT id FROM s), 'Globalização, neoliberalismo e blocos econômicos', 24),
  ((SELECT id FROM s), 'Brasil e América Latina no mundo atual: blocos econômicos, cooperação e desafios sociais', 25),
  ((SELECT id FROM s), 'Acontecimentos amplamente divulgados pela mídia nos últimos dois anos', 26);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Biologia', 8 FROM public.contest_templates WHERE nome='Vestibular UESB' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Evolução celular: célula procariótica e reino Monera', 0),
  ((SELECT id FROM s), 'Células eucarióticas: compartimentação, aspectos morfofuncionais e reino Protista', 1),
  ((SELECT id FROM s), 'Divisão de trabalho, especialização e pluricelularidade', 2),
  ((SELECT id FROM s), 'Sistemas de revestimento e sustentação', 3),
  ((SELECT id FROM s), 'Sistemas de nutrição, respiração, circulação e excreção', 4),
  ((SELECT id FROM s), 'Sistemas endócrino e nervoso e integração orgânica', 5),
  ((SELECT id FROM s), 'Biossistemática dos pluricelulares', 6),
  ((SELECT id FROM s), 'Reprodução celular e orgânica, genética mendeliana e pós-mendeliana', 7),
  ((SELECT id FROM s), 'Evolução: de Darwin ao século XXI', 8),
  ((SELECT id FROM s), 'Vida em contexto ecológico: biosfera, teias da vida e estratégias ecológicas', 9),
  ((SELECT id FROM s), 'Interferência do homem na dinâmica dos ecossistemas', 10),
  ((SELECT id FROM s), 'Saúde coletiva: epidemias, endemias, doenças emergentes e reemergentes no Brasil', 11);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Física', 9 FROM public.contest_templates WHERE nome='Vestibular UESB' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Grandezas físicas: classificação, sistemas de unidades e operações vetoriais', 0),
  ((SELECT id FROM s), 'Cinemática: MRU, MRUV, movimento circular, queda livre e lançamento de projéteis', 1),
  ((SELECT id FROM s), 'Força e movimento: leis de Newton e aplicações', 2),
  ((SELECT id FROM s), 'Trabalho, potência, energia cinética, energia potencial e conservação da energia', 3),
  ((SELECT id FROM s), 'Impulso, quantidade de movimento e conservação', 4),
  ((SELECT id FROM s), 'Sistemas de partículas, centro de massa e colisões', 5),
  ((SELECT id FROM s), 'Gravitação universal e sistema solar', 6),
  ((SELECT id FROM s), 'Mecânica dos fluidos: hidrostática e hidrodinâmica', 7),
  ((SELECT id FROM s), 'Termodinâmica: equilíbrio térmico, escalas, dilatação, calor específico e latente', 8),
  ((SELECT id FROM s), 'Transferência de calor; equivalência entre calor e energia', 9),
  ((SELECT id FROM s), 'Primeira lei da termodinâmica', 10),
  ((SELECT id FROM s), 'Segunda lei da termodinâmica e máquinas térmicas', 11),
  ((SELECT id FROM s), 'Óptica geométrica: princípios e aplicações', 12),
  ((SELECT id FROM s), 'Ondas e fenômenos ondulatórios', 13),
  ((SELECT id FROM s), 'Eletrostática: carga elétrica, campo elétrico e potencial', 14),
  ((SELECT id FROM s), 'Eletrodinâmica: corrente, resistência, Lei de Ohm, associação de resistores e Lei de Joule', 15),
  ((SELECT id FROM s), 'Campo magnético de correntes e ímãs; força magnética', 16),
  ((SELECT id FROM s), 'Indução eletromagnética e espectro eletromagnético', 17);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Química', 10 FROM public.contest_templates WHERE nome='Vestibular UESB' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Estruturas e propriedades da matéria: espécies químicas e misturas', 0),
  ((SELECT id FROM s), 'Estrutura atômica: partículas subatômicas, número atômico, massa, isotopia e distribuição eletrônica', 1),
  ((SELECT id FROM s), 'Tabela periódica moderna; ligações químicas e teoria de Lewis; alotropia', 2),
  ((SELECT id FROM s), 'Funções inorgânicas: ácidos, bases, óxidos, sais e hidratos', 3),
  ((SELECT id FROM s), 'Compostos orgânicos: cadeias carbônicas, funções orgânicas, nomenclatura e propriedades físicas', 4),
  ((SELECT id FROM s), 'Bioquímica: proteínas, glicídios e lipídios', 5),
  ((SELECT id FROM s), 'Transformações físicas e químicas: mudanças de fase, teoria cinética dos gases e soluções', 6),
  ((SELECT id FROM s), 'Número de oxidação e classificação das reações', 7),
  ((SELECT id FROM s), 'Balanceamento de reações', 8),
  ((SELECT id FROM s), 'Termoquímica: energia e entalpia', 9),
  ((SELECT id FROM s), 'Eletroquímica: pilhas e baterias', 10),
  ((SELECT id FROM s), 'Equilíbrio em meio aquoso: pH, pOH, solubilidade e deslocamento de equilíbrio', 11),
  ((SELECT id FROM s), 'Transformações moleculares: radioatividade, emissões naturais e artificiais', 12),
  ((SELECT id FROM s), 'Petróleo, biogás e carvão mineral', 13),
  ((SELECT id FROM s), 'Aspectos sociopolíticos e culturais da Química: desenvolvimento científico, ética e impacto ambiental', 14);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Literatura — Obras obrigatórias', 11 FROM public.contest_templates WHERE nome='Vestibular UESB' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), '"Tchau" — Lygia Bojunga', 0),
  ((SELECT id FROM s), '"A invasão" — Dias Gomes', 1),
  ((SELECT id FROM s), '"Mata Doce" — Luciany Aparecida', 2);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Filmes selecionados', 12 FROM public.contest_templates WHERE nome='Vestibular UESB' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), '"Amoras" — Patrícia Moreira e Cornélio Cunegundes', 0),
  ((SELECT id FROM s), '"Alice dos Anjos" — Daniel Leite Almeida', 1),
  ((SELECT id FROM s), '"Coleção Preciosa" — Rayssa Coelho e Filipe Gama', 2);

-- ===== Vestibular Unesc =====
INSERT INTO public.contest_templates (slug, nome, plano, concurso, tipo, area, cor, status, is_public, scope, institution_type, uf)
VALUES ('vestibular-unesc', 'Vestibular Unesc', 'free', 'Unesc', 'vestibular', 'Geral', '#2563EB', 'ativo', true, 'estadual', 'privada', 'SC')
ON CONFLICT (slug) DO UPDATE SET nome = EXCLUDED.nome, is_public = true;

DELETE FROM public.contest_template_subjects WHERE template_id = (SELECT id FROM public.contest_templates WHERE nome='Vestibular Unesc' AND tipo='vestibular' LIMIT 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Literatura — Obras obrigatórias', 0 FROM public.contest_templates WHERE nome='Vestibular Unesc' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), '"Memórias póstumas de Brás Cubas" — Machado de Assis', 0),
  ((SELECT id FROM s), '"Memorial de Maria Moura" — Rachel de Queiroz', 1),
  ((SELECT id FROM s), '"Insubmissas lágrimas de mulheres" — Conceição Evaristo', 2),
  ((SELECT id FROM s), '"O código das Águas" — Lindolf Bell', 3),
  ((SELECT id FROM s), '"Uma tristeza infinita" — Antônio Xerxenesky', 4);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Linguagens, Códigos e suas Tecnologias', 1 FROM public.contest_templates WHERE nome='Vestibular Unesc' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Estudo do texto: sequências discursivas, gêneros textuais e modos de organização da composição textual', 0),
  ((SELECT id FROM s), 'Estudo das práticas corporais: linguagem corporal, identidade, esporte, dança, lutas, jogos e saúde', 1),
  ((SELECT id FROM s), 'Produção e recepção de textos artísticos: Artes Visuais, Teatro, Música e Dança', 2),
  ((SELECT id FROM s), 'Estudo do texto literário: literatura e processo social, gêneros, recursos expressivos e patrimônio literário', 3),
  ((SELECT id FROM s), 'Aspectos linguísticos: recursos expressivos, macroestrutura semântica e relações lógico-semânticas', 4),
  ((SELECT id FROM s), 'Texto argumentativo: gêneros, pontos de vista, organização e papéis comunicativos', 5),
  ((SELECT id FROM s), 'Aspectos linguísticos da Língua Portuguesa: norma culta, variação, coesão e tempos verbais', 6),
  ((SELECT id FROM s), 'Gêneros digitais: tecnologia da comunicação, suporte textual e função social', 7);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Matemática e suas Tecnologias', 2 FROM public.contest_templates WHERE nome='Vestibular Unesc' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Conhecimentos numéricos: operações em conjuntos numéricos, divisibilidade, fatoração, razões, proporções, porcentagem e progressões', 0),
  ((SELECT id FROM s), 'Conhecimentos geométricos: figuras planas e espaciais, medidas, congruência, semelhança, Teorema de Tales e trigonometria do ângulo agudo', 1),
  ((SELECT id FROM s), 'Estatística e probabilidade: análise de dados, medidas de tendência central e noções de probabilidade', 2),
  ((SELECT id FROM s), 'Conhecimentos algébricos: funções (afim, quadrática, exponencial, logarítmica), equações e inequações', 3),
  ((SELECT id FROM s), 'Álgebra e geometria analítica: plano cartesiano, retas, circunferências e sistemas de equações', 4);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Física', 3 FROM public.contest_templates WHERE nome='Vestibular Unesc' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Grandezas físicas, SI, análise dimensional e representações vetorial e gráfica', 0),
  ((SELECT id FROM s), 'Cinemática e dinâmica; trabalho, energia e potência; quantidade de movimento', 1),
  ((SELECT id FROM s), 'Equilíbrio, torque, centro de massa e movimento circular', 2),
  ((SELECT id FROM s), 'Gravitação universal; fluidos (hidrostática e hidrodinâmica)', 3),
  ((SELECT id FROM s), 'Termologia e termodinâmica: temperatura, transferência de calor, gases ideais e leis', 4),
  ((SELECT id FROM s), 'Ondulatória: ondas mecânicas e eletromagnéticas, acústica e efeito Doppler', 5),
  ((SELECT id FROM s), 'Óptica geométrica: reflexão, refração, espelhos, lentes e instrumentos ópticos', 6),
  ((SELECT id FROM s), 'Eletricidade e magnetismo: campo elétrico, circuitos, indução eletromagnética e transformadores', 7),
  ((SELECT id FROM s), 'Física moderna: quantização da energia, efeito fotoelétrico, radioatividade e relatividade restrita', 8);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Química', 4 FROM public.contest_templates WHERE nome='Vestibular Unesc' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Transformações químicas: sistemas gasosos, leis dos gases e teoria cinética', 0),
  ((SELECT id FROM s), 'Modelos atômicos, tabela periódica e ligações químicas', 1),
  ((SELECT id FROM s), 'Estequiometria: fórmulas, balanceamento, leis ponderais, mol e massa molar', 2),
  ((SELECT id FROM s), 'Materiais e propriedades: estados físicos, misturas, ligações e substâncias', 3),
  ((SELECT id FROM s), 'Água e soluções: solubilidade, concentração, propriedades coligativas, ácidos e bases', 4),
  ((SELECT id FROM s), 'Energia química: termoquímica, oxirredução, pilhas, eletrólise e transformações nucleares', 5),
  ((SELECT id FROM s), 'Cinética química e equilíbrio químico: velocidade, constante de equilíbrio e pH', 6),
  ((SELECT id FROM s), 'Compostos de carbono: funções orgânicas, polímeros, lipídios, proteínas e biocombustíveis', 7),
  ((SELECT id FROM s), 'Química, sociedade e ambiente: poluição, petróleo, energia nuclear e impactos ambientais', 8);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Biologia', 5 FROM public.contest_templates WHERE nome='Vestibular Unesc' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Moléculas, células e tecidos: estrutura, metabolismo, fotossíntese, respiração e síntese proteica', 0),
  ((SELECT id FROM s), 'Aplicações biotecnológicas: células-tronco, clonagem, DNA recombinante e aspectos éticos', 1),
  ((SELECT id FROM s), 'Hereditariedade: princípios mendelianos, genética humana, mutações e aconselhamento genético', 2),
  ((SELECT id FROM s), 'Identidade dos seres vivos: sistemática, evolução, ciclos de vida e fisiologia comparada', 3),
  ((SELECT id FROM s), 'Ecologia: ecossistemas, biomas brasileiros, biodiversidade, ciclos biogeoquímicos e mudanças climáticas', 4),
  ((SELECT id FROM s), 'Origem e evolução da vida: hipóteses, Darwin, teoria sintética e seleção artificial', 5),
  ((SELECT id FROM s), 'Qualidade de vida: doenças, saúde pública, DSTs, drogas, saneamento e legislação ambiental', 6);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Ciências Humanas e suas Tecnologias', 6 FROM public.contest_templates WHERE nome='Vestibular Unesc' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Diversidade cultural: conquista da América, escravidão, resistência indígena e africana e movimentos culturais', 0),
  ((SELECT id FROM s), 'Organização social e Estado: cidadania, democracia, formação territorial brasileira e liberalismo', 1),
  ((SELECT id FROM s), 'Geopolítica contemporânea: Revolução Bolchevique, Revolução Chinesa, Guerras Mundiais, Guerra Fria e totalitarismos', 2),
  ((SELECT id FROM s), 'Ditaduras na América Latina, Estado Novo e reorganização pós-Guerra Fria', 3),
  ((SELECT id FROM s), 'Direitos, cidadania e espaço urbano: direitos humanos, constituições brasileiras, pobreza e segregação', 4),
  ((SELECT id FROM s), 'Estruturas produtivas: feudalismo, capitalismo, Revolução Industrial, industrialização e globalização', 5),
  ((SELECT id FROM s), 'Espaços agrários: agronegócio, agricultura familiar e lutas sociais no campo', 6),
  ((SELECT id FROM s), 'Domínios naturais e ambiente: recursos naturais, mudanças climáticas, biomas, relevo e hidrografia', 7),
  ((SELECT id FROM s), 'Atmosfera e vegetação: elementos climáticos, classificação climática e vegetação brasileira', 8),
  ((SELECT id FROM s), 'Representação espacial: projeções cartográficas e tecnologias aplicadas à cartografia', 9);
