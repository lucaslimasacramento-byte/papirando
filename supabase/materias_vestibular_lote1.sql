-- Disciplinas/tópicos do lote 1 de vestibulares (5 que vieram preenchidos)
-- Rodar no Supabase SQL Editor. Reimporta limpo (apaga matérias antigas do registro).

-- ===== COMVEST - Unicamp (13 matérias) =====
DELETE FROM public.contest_template_subjects WHERE template_id = (SELECT id FROM public.contest_templates WHERE nome='COMVEST - Unicamp' AND tipo='vestibular' LIMIT 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Redação', 0 FROM public.contest_templates WHERE nome='COMVEST - Unicamp' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Produção de textos pertencentes a diferentes gêneros discursivos.', 0),
  ((SELECT id FROM s), 'Cumprimento da proposta temática e das tarefas solicitadas no enunciado.', 1),
  ((SELECT id FROM s), 'Configuração do gênero solicitado, considerando situação de produção, circulação e interlocução.', 2),
  ((SELECT id FROM s), 'Leitura crítica dos textos fornecidos na proposta e mobilização desses textos no projeto de escrita.', 3),
  ((SELECT id FROM s), 'Articulação coerente e coesa dos elementos da escrita.', 4),
  ((SELECT id FROM s), 'Seleção lexical apropriada ao estilo do gênero discursivo solicitado.', 5),
  ((SELECT id FROM s), 'Emprego de regras gramaticais e ortográficas adequadas ao registro de linguagem esperado.', 6);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Língua Portuguesa', 1 FROM public.contest_templates WHERE nome='COMVEST - Unicamp' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'O texto e seu funcionamento: caracterização, produção e circulação de diferentes gêneros discursivos; recursos coesivos que contribuem para a coerência, continuidade e progressão textual; interação entre texto verbal e não verbal.', 0),
  ((SELECT id FROM s), 'Processos de significação: estabelecimento de relações lógico-discursivas; intertextualidade e interdiscursividade; efeitos de sentido decorrentes de usos expressivos da língua.', 1),
  ((SELECT id FROM s), 'Funcionamento social da língua: variação linguística em diferentes contextos de circulação dos discursos; usos linguísticos na norma culta e em outras variedades; registros de formalidade e informalidade e estilos linguísticos.', 2),
  ((SELECT id FROM s), 'Sintaxe da língua portuguesa: elementos sintáticos usados na construção de textos; efeitos de sentido acarretados pela ordem dos constituintes da sentença; processos de coordenação e subordinação entre orações.', 3),
  ((SELECT id FROM s), 'Morfologia da língua portuguesa: elementos constituintes da estrutura do vocábulo; processos de formação de palavra; efeitos semânticos e expressivos produzidos pelo uso das diferentes classes morfológicas.', 4),
  ((SELECT id FROM s), 'Elementos de fonologia da língua portuguesa: efeitos de sentido produzidos por recursos fonético-fonológicos; relação entre oralidade e escrita.', 5);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Literaturas de Língua Portuguesa', 2 FROM public.contest_templates WHERE nome='COMVEST - Unicamp' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Leitura, compreensão analítica e interpretação crítica de textos produzidos nas tradições das literaturas de língua portuguesa.', 0),
  ((SELECT id FROM s), 'Elementos constitutivos da obra literária: composição, forma, estilo, linguagem, foco narrativo, personagens, tempo e espaço.', 1),
  ((SELECT id FROM s), 'Relações entre texto literário, contexto histórico-social, tradições culturais e circulação estética.', 2),
  ((SELECT id FROM s), 'Comparação entre obras, autores, gêneros e procedimentos literários a partir da lista anual de obras.', 3);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Literatura — Obras obrigatórias', 3 FROM public.contest_templates WHERE nome='COMVEST - Unicamp' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Ana Cristina Cesar — A teus pés.', 0),
  ((SELECT id FROM s), 'Bernardo Carvalho — Vida desabada.', 1),
  ((SELECT id FROM s), 'Cecília Meireles — Doze noturnos da Holanda e O aeronauta.', 2),
  ((SELECT id FROM s), 'Cora Coralina — Caminho de pedras.', 3),
  ((SELECT id FROM s), 'Fernando Pessoa — Mensagem.', 4),
  ((SELECT id FROM s), 'Lídia Jorge — Misericórdia.', 5),
  ((SELECT id FROM s), 'Machado de Assis — Canção de piratas.', 6),
  ((SELECT id FROM s), 'Malba Tahan — Maktub.', 7),
  ((SELECT id FROM s), 'Raul Bopp — Cobra Norato.', 8),
  ((SELECT id FROM s), 'Racionais MC''s — Sobrevivendo no inferno.', 9),
  ((SELECT id FROM s), 'Cartola — canções: "Acontece", "As rosas não falam", "Cordas de aço", "Disfarça e chora", "O mundo é um moinho", "Que é feito de você?", "Sala de recepção", "Silêncio de um cipreste", "Sim".', 10),
  ((SELECT id FROM s), 'Caio Fernando Abreu — Morangos mofados, contos: "Diálogo", "Além do Ponto", "Terça-Feira Gorda", "Pêra, uva ou maçã?", "O dia em que Júpiter encontrou Saturno", "Aqueles dois".', 11),
  ((SELECT id FROM s), 'Conceição Evaristo — Olhos d''água.', 12),
  ((SELECT id FROM s), 'Chimamanda Ngozi Adichie — No seu pescoço.', 13),
  ((SELECT id FROM s), 'Lewis Carroll — Alice no País das Maravilhas.', 14),
  ((SELECT id FROM s), 'Lima Barreto — Vida e morte de M. J. Gonzaga de Sá.', 15),
  ((SELECT id FROM s), 'Machado de Assis — Casa Velha.', 16),
  ((SELECT id FROM s), 'Ailton Krenak — A vida não é útil.', 17);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Matemática', 4 FROM public.contest_templates WHERE nome='COMVEST - Unicamp' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Conjuntos numéricos.', 0),
  ((SELECT id FROM s), 'Razões, proporções, porcentagem e juros.', 1),
  ((SELECT id FROM s), 'Expressões algébricas, polinômios, fatoração e produtos notáveis.', 2),
  ((SELECT id FROM s), 'Equações, inequações e sistemas.', 3),
  ((SELECT id FROM s), 'Funções afim, quadrática, exponencial, logarítmica e modular.', 4),
  ((SELECT id FROM s), 'Sequências, progressões aritméticas e geométricas.', 5),
  ((SELECT id FROM s), 'Geometria plana e espacial.', 6),
  ((SELECT id FROM s), 'Geometria analítica.', 7),
  ((SELECT id FROM s), 'Trigonometria.', 8),
  ((SELECT id FROM s), 'Análise combinatória e probabilidade.', 9);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Geografia', 5 FROM public.contest_templates WHERE nome='COMVEST - Unicamp' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Conceitos fundamentais: espaço geográfico, território, paisagem, meio, região e lugar; redes técnicas, escalas, fronteiras, soberania, Estado-nação e formação socioespacial.', 0),
  ((SELECT id FROM s), 'Linguagem cartográfica e geotecnologias: meios de orientação, coordenadas geográficas, movimentos da Terra, estações do ano e fusos horários; elementos do mapa, projeções cartográficas, mapas e cartas temáticas, escala cartográfica e escala geográfica.', 1),
  ((SELECT id FROM s), 'Componentes físico-naturais do espaço geográfico: deriva continental, expansão do assoalho oceânico e tectônica global; processos endógenos e exógenos do relevo; formas de relevo; compartimentos do relevo brasileiro e sul-americano; solos, formação, diferenciação e degradação.', 2),
  ((SELECT id FROM s), 'Clima, atmosfera, hidrosfera, biomas e dinâmicas ambientais.', 3),
  ((SELECT id FROM s), 'Dinâmicas socioespaciais, urbano-regionais e geopolíticas do Brasil e do mundo.', 4),
  ((SELECT id FROM s), 'Recursos naturais, energéticos, produção do espaço e conflitos territoriais.', 5);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'História', 6 FROM public.contest_templates WHERE nome='COMVEST - Unicamp' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'História, memória e temporalidades; fontes e narrativas históricas.', 0),
  ((SELECT id FROM s), 'Antiguidade: sociedades do Mediterrâneo, do Oriente Próximo e africanas; culturas, poderes e formas de organização social.', 1),
  ((SELECT id FROM s), 'Mundo medieval: cristandade, islamismo, feudalismo, circulação, poder e cultura.', 2),
  ((SELECT id FROM s), 'Mundo moderno: formação do Estado moderno e do absolutismo; expansão marítima europeia; encontros e choques culturais; conquista e colonização das Américas; indígenas e africanos, missionação, identidades e resistências; Iluminismo, crise do Antigo Regime e revoluções atlânticas.', 3),
  ((SELECT id FROM s), 'Período contemporâneo: independências nas Américas; ideários nacionais e revoluções no século XIX; revoluções industriais e transformações no mundo do trabalho; representações e práticas culturais e políticas no século XIX; África e imperialismo europeu; Brasil no século XIX; escravidão, tráfico transatlântico e abolicionismos; República no Brasil até 1964; revoluções do século XX; crise do liberalismo após 1929; fascismos e regimes totalitários; guerras mundiais e formação de um mundo polarizado; populismos na América Latina e na Europa.', 4),
  ((SELECT id FROM s), 'História do tempo presente: descolonizações na África e Ásia; ditadura civil-militar no Brasil; Brasil após 1985; ditaduras e redemocratizações na América Latina; crise dos regimes comunistas e mundo após a queda do muro de Berlim; globalização e sua crise.', 5);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Filosofia', 7 FROM public.contest_templates WHERE nome='COMVEST - Unicamp' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Natureza da reflexão filosófica e suas relações com outras formas de pensamento.', 0),
  ((SELECT id FROM s), 'Problemas filosóficos ligados a ética, política, conhecimento, linguagem, arte e ciência.', 1),
  ((SELECT id FROM s), 'Leitura, interpretação e argumentação a partir de textos filosóficos.', 2),
  ((SELECT id FROM s), 'Articulação entre conceitos filosóficos e questões contemporâneas.', 3);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Sociologia', 8 FROM public.contest_templates WHERE nome='COMVEST - Unicamp' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Conceitos sociológicos fundamentais para análise da vida social.', 0),
  ((SELECT id FROM s), 'Cultura, identidades, desigualdades, poder, cidadania e direitos.', 1),
  ((SELECT id FROM s), 'Trabalho, sociedade, movimentos sociais e instituições.', 2),
  ((SELECT id FROM s), 'Leitura e interpretação de fenômenos sociais contemporâneos.', 3);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Biologia', 9 FROM public.contest_templates WHERE nome='COMVEST - Unicamp' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Bases moleculares e celulares da vida: componentes bioquímicos da célula; estrutura celular de procariotos e eucariotos; organelas celulares em vegetais e animais; origem evolutiva das organelas; células-tronco, ciclo celular e divisões mitótica e meiótica.', 0),
  ((SELECT id FROM s), 'Hereditariedade: DNA e RNA; código genético e síntese de proteínas; leis de segregação mendeliana e padrões de herança; manipulação do DNA e biotecnologia; doenças genéticas humanas e impacto na saúde.', 1),
  ((SELECT id FROM s), 'Origem e evolução da vida: origem e diversificação da vida; variabilidade genética e mutações; seleção natural; papel do acaso na evolução; especiação; evolução biológica e intervenção antrópica.', 2),
  ((SELECT id FROM s), 'O ambiente e a vida: fluxos de energia e matéria em ecossistemas e biomas; ecossistemas, populações e comunidades; interações ecológicas; problemas ambientais contemporâneos; preservação e conservação da vida.', 3),
  ((SELECT id FROM s), 'Biodiversidade: bases biológicas da classificação dos seres vivos; biologia de vírus, bactérias, protistas e fungos; biologia das plantas e algas; biologia dos animais.', 4),
  ((SELECT id FROM s), 'Saúde humana: conceito de saúde; estrutura e função de células, órgãos e sistemas; biologia da reprodução, métodos contraceptivos, hormônios reprodutivos e IST; agressões à saúde das populações, saneamento e serviços de saúde; doenças causadas por microrganismos e vetores.', 5);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Física', 10 FROM public.contest_templates WHERE nome='COMVEST - Unicamp' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Fundamentos da Física: grandezas físicas e suas medidas; relações matemáticas entre grandezas escalares e vetoriais; representação gráfica de relações funcionais; estimativas de valores.', 0),
  ((SELECT id FROM s), 'Mecânica: cinemática em uma e duas dimensões; leis de Newton; atrito; peso e gravidade; torque e equilíbrio; gravitação universal, sistema solar e leis de Kepler; quantidade de movimento; trabalho, potência e energias cinética e potenciais; hidrostática.', 1),
  ((SELECT id FROM s), 'Astronomia: forma, estrutura e movimentos da Terra; Sol, Terra e Lua; planetas do sistema solar; composição e estrutura do sistema solar; estrelas e evolução estelar.', 2),
  ((SELECT id FROM s), 'Calorimetria e Termodinâmica: temperatura e equilíbrio térmico; Lei Zero e Primeira Lei da Termodinâmica; trocas de calor e propriedades térmicas da matéria; gases perfeitos; trabalho de um gás; transições de fase e calor latente.', 3),
  ((SELECT id FROM s), 'Óptica e Ondas: ondas planas, mecânicas, sonoras e esféricas; polarização, interferência e difração; espelhos; refração, reflexão total, prismas, lentes e instrumentos ópticos; espectro eletromagnético; óptica da visão.', 4),
  ((SELECT id FROM s), 'Eletricidade e magnetismo: campos e forças eletromagnéticas; potencial e diferença de potencial; corrente elétrica, resistores e potência; leis de Kirchhoff; capacitores; campo magnético; força magnética; indução eletromagnética.', 5);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Química', 11 FROM public.contest_templates WHERE nome='COMVEST - Unicamp' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Materiais: ocorrência na natureza, processos de purificação, caracterização e identificação de substâncias, mudanças de estado; símbolos e fórmulas; massas atômicas, massas molares e quantidade de substância.', 0),
  ((SELECT id FROM s), 'Gases, líquidos, sólidos e soluções: equação geral dos gases ideais, leis de Boyle e de Gay-Lussac, princípio de Avogadro, energia cinética média, misturas gasosas, pressão parcial e lei de Dalton, difusão e liquefação; caracterização dos estados líquido e sólido, pressão de vapor, soluções eletrolíticas e não eletrolíticas, propriedades coligativas, expressões de concentração e estado coloidal.', 1),
  ((SELECT id FROM s), 'Estrutura atômica e classificação periódica: subpartículas atômicas, níveis de energia e distribuição eletrônica; número atômico, número de massa e isótopos; energia de ionização, afinidade eletrônica e eletronegatividade; propriedades periódicas; radioatividade e radioisótopos.', 2),
  ((SELECT id FROM s), 'Ligações químicas: modelos iônico, covalente e metálico; polaridade; interações intermoleculares.', 3),
  ((SELECT id FROM s), 'Transformações dos materiais: conservação de átomos e cargas; cálculos estequiométricos; cinética química; colisões efetivas; velocidade de reação; energia de ativação; fatores que alteram a velocidade.', 4),
  ((SELECT id FROM s), 'Energia nas reações químicas: reações exotérmicas e endotérmicas; variação de entalpia; conservação da energia; lei de Hess; energia de ligação.', 5),
  ((SELECT id FROM s), 'Equilíbrio químico: sistemas em equilíbrio; constante de equilíbrio; princípio de Le Chatelier; conceitos ácido-base de Arrhenius, Brønsted e Lewis; equilíbrios ácido-base, hidrólise e solubilidade; pH de soluções.', 6),
  ((SELECT id FROM s), 'Eletroquímica: oxidação e redução; número de oxidação; espécies redutoras e oxidantes; potenciais padrão; pilhas; leis de Faraday; eletrólise.', 7),
  ((SELECT id FROM s), 'Química orgânica: fórmulas, cadeias carbônicas, ligações e isomeria; funções orgânicas; nomenclatura, obtenção e propriedades dos compostos representativos; carboidratos, lipídeos, proteínas, enzimas e polímeros.', 8),
  ((SELECT id FROM s), 'O mundo em transformação: composição e utilização de recursos naturais da crosta terrestre, atmosfera, biosfera e hidrosfera e consequências dessa utilização.', 9);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Inglês', 12 FROM public.contest_templates WHERE nome='COMVEST - Unicamp' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Leitura e interpretação de textos em língua inglesa em articulação com Ciências Humanas e Ciências da Natureza.', 0),
  ((SELECT id FROM s), 'Compreensão de gêneros variados, imagens, gráficos, tabelas e outros suportes.', 1),
  ((SELECT id FROM s), 'Inferência de sentidos, identificação de posicionamentos e articulação com contextos socioculturais.', 2);

-- ===== Vestibular Fatec (11 matérias) =====
DELETE FROM public.contest_template_subjects WHERE template_id = (SELECT id FROM public.contest_templates WHERE nome='Vestibular Fatec' AND tipo='vestibular' LIMIT 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Língua Portuguesa', 0 FROM public.contest_templates WHERE nome='Vestibular Fatec' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Gramática e texto: funcionamento social da língua; norma ortográfica; relação entre escrita e oralidade; distinção entre variedades linguísticas, categorias sociais, contextos de comunicação, formalidade e informalidade.', 0),
  ((SELECT id FROM s), 'Morfossintaxe: classes de palavras; elementos estruturais e processos de formação de palavras; flexão nominal e verbal; concordância nominal e verbal; regência nominal e verbal.', 1),
  ((SELECT id FROM s), 'Processos sintático-semânticos: frase, oração e período; coordenação e subordinação; conectivos, função sintática e valores lógico-semânticos; organização e reorganização de orações e períodos.', 2),
  ((SELECT id FROM s), 'Compreensão, interpretação e produção de textos de gêneros variados e de diversas mídias: significação explícita e implícita; denotação e conotação; coesão e coerência; descrição, narração e dissertação; discurso direto, indireto e indireto livre; relação do texto com seu contexto histórico e cultural; intertextualidade e interdiscursividade; interação entre texto verbal e não verbal.', 3),
  ((SELECT id FROM s), 'Leitura crítica: localização de informação, referência textual de elementos coesivos, relação entre diferentes textos e suportes, discriminação entre fato e opinião, reconhecimento de posicionamentos e comparação de perspectivas.', 4),
  ((SELECT id FROM s), 'Identificação do significado de itens lexicais fundamentais à compreensão do texto, incluindo verbos modais e marcadores discursivos.', 5);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Matemática', 1 FROM public.contest_templates WHERE nome='Vestibular Fatec' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Conjuntos numéricos: naturais, inteiros, racionais e reais; operações, propriedades, ordem, reta numérica e resolução de problemas; razões; proporcionalidade direta e inversa; notação científica; sequências; progressões aritméticas e geométricas; porcentagem, taxas e índices.', 0),
  ((SELECT id FROM s), 'Análise combinatória: princípios multiplicativo e aditivo; arranjos, permutações e combinações simples.', 1),
  ((SELECT id FROM s), 'Probabilidade: espaço amostral discreto e contínuo; eventos equiprováveis ou não; probabilidade de evento simples; união e intersecção de eventos; eventos dependentes, independentes e sucessivos.', 2),
  ((SELECT id FROM s), 'Sistemas lineares: resolução e discussão; representação algébrica e gráfica.', 3),
  ((SELECT id FROM s), 'Funções: relação entre grandezas; gráficos; taxa de variação; funções polinomiais do 1º grau, constante e quadrática; máximos e mínimos; funções exponencial e logarítmica.', 4),
  ((SELECT id FROM s), 'Geometria e medidas: formas planas e espaciais, áreas, volumes, semelhança, trigonometria e interpretação de representações.', 5);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Física', 2 FROM public.contest_templates WHERE nome='Vestibular Fatec' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Mecânica: cinemática, leis de Newton, trabalho, energia, impulso, quantidade de movimento, gravitação, hidrostática e hidrodinâmica.', 0),
  ((SELECT id FROM s), 'Física térmica: energia térmica, temperatura e termômetros; lei zero da termodinâmica; escalas termométricas; dilatação térmica; calorimetria; mudanças de estado; equilíbrio térmico; propagação do calor; gases e transformações gasosas.', 1),
  ((SELECT id FROM s), 'Ondulatória e acústica: movimento harmônico simples; ondas mecânicas; som e suas propriedades.', 2),
  ((SELECT id FROM s), 'Óptica: reflexão, refração, espelhos, lentes, instrumentos ópticos e fenômenos de propagação da luz.', 3),
  ((SELECT id FROM s), 'Eletricidade e magnetismo: eletrostática, corrente elétrica, resistência, circuitos, potência, magnetismo e indução eletromagnética.', 4);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Química', 3 FROM public.contest_templates WHERE nome='Vestibular Fatec' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Estrutura da matéria: modelos atômicos, partículas subatômicas, tabela periódica e propriedades periódicas.', 0),
  ((SELECT id FROM s), 'Ligações químicas e interações intermoleculares.', 1),
  ((SELECT id FROM s), 'Substâncias, misturas e processos de separação.', 2),
  ((SELECT id FROM s), 'Quantidade de matéria, mol, massas e cálculos estequiométricos.', 3),
  ((SELECT id FROM s), 'Soluções, concentrações e propriedades coligativas.', 4),
  ((SELECT id FROM s), 'Funções inorgânicas: ácidos, bases, sais e óxidos.', 5),
  ((SELECT id FROM s), 'Reações químicas, cinética e equilíbrio químico.', 6),
  ((SELECT id FROM s), 'Termoquímica e eletroquímica.', 7),
  ((SELECT id FROM s), 'Química orgânica: funções, nomenclatura, propriedades e reações básicas.', 8),
  ((SELECT id FROM s), 'Química ambiental e aplicações no cotidiano.', 9);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Biologia', 4 FROM public.contest_templates WHERE nome='Vestibular Fatec' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Ecologia: população, comunidade, ecossistema, biosfera, hábitat e nicho ecológico; cadeias e teias alimentares; produtividade; pirâmides ecológicas; ciclos biogeoquímicos; dinâmicas populacionais; sucessão ecológica; mudanças climáticas; poluição ambiental; alternativas energéticas; conservação biológica.', 0),
  ((SELECT id FROM s), 'Estudo químico e celular dos seres vivos, reprodução, desenvolvimento e metabolismo energético: organização celular; membrana e transportes; organelas; mitose e meiose; reprodução assexuada e sexuada; fotossíntese, quimiossíntese, respiração aeróbia e fermentação; DNA, RNA e síntese proteica; biotecnologia, transgênicos, clonagem, células-tronco, CRISPR, PCR e biologia forense.', 1),
  ((SELECT id FROM s), 'Níveis de organização e classificação biológica: Lineu, categorias taxonômicas, sistemática moderna, cladogramas, vírus, domínios e reinos.', 2),
  ((SELECT id FROM s), 'Biologia das plantas e dos animais.', 3),
  ((SELECT id FROM s), 'Corpo humano, saúde individual e coletiva.', 4),
  ((SELECT id FROM s), 'Hereditariedade, genética e evolução.', 5);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'História', 5 FROM public.contest_templates WHERE nome='Vestibular Fatec' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Antiguidade, Idade Média, Idade Moderna e Idade Contemporânea.', 0),
  ((SELECT id FROM s), 'Formação do mundo moderno, colonização, escravidão, revoluções, industrialização, imperialismo e guerras.', 1),
  ((SELECT id FROM s), 'História do Brasil: colonização, independência, Império, República, Era Vargas, ditadura civil-militar e redemocratização.', 2),
  ((SELECT id FROM s), 'Cidadania, trabalho, movimentos sociais, cultura e direitos humanos.', 3);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Geografia', 6 FROM public.contest_templates WHERE nome='Vestibular Fatec' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Os espaços mundial e brasileiro: sistemas socioeconômicos; espaços supranacionais; países e regiões geográficas; Estado e planejamento territorial; geopolítica.', 0),
  ((SELECT id FROM s), 'Produção, consumo, comércio internacional, blocos econômicos, organismos financeiros e Brasil na economia mundial.', 1),
  ((SELECT id FROM s), 'Mecanismos de dependência e dominação; violências, tensões, conflitos e separatismos.', 2),
  ((SELECT id FROM s), 'Transformações do espaço, fronteiras, regiões nacionais, divisão territorial do trabalho, industrialização, urbanização, produção agropecuária e estrutura agrária.', 3),
  ((SELECT id FROM s), 'Globalização, redes geográficas, população mundial e brasileira, comunidades tradicionais, migrações, desigualdades socioespaciais e movimentos sociais.', 4),
  ((SELECT id FROM s), 'Paisagens naturais, questão ambiental, impactos ambientais, desenvolvimento sustentável, políticas territoriais ambientais e conferências internacionais.', 5),
  ((SELECT id FROM s), 'Cartografia sistemática e temática, coordenadas geográficas, códigos, símbolos, escala cartográfica, anamorfose, fotografias aéreas, imagens de satélite e sistemas de informação geográfica.', 6);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Inglês', 7 FROM public.contest_templates WHERE nome='Vestibular Fatec' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Compreensão de textos autênticos escritos em língua inglesa.', 0),
  ((SELECT id FROM s), 'Localização de informações explícitas e implícitas.', 1),
  ((SELECT id FROM s), 'Relações entre partes do texto, sentidos de palavras e expressões no contexto, verbos modais e marcadores discursivos.', 2),
  ((SELECT id FROM s), 'Comparação de diferentes pontos de vista e interpretação crítica de textos.', 3);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Raciocínio Lógico', 8 FROM public.contest_templates WHERE nome='Vestibular Fatec' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Questões destinadas a verificar a capacidade de raciocínio lógico do candidato.', 0);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Multidisciplinar', 9 FROM public.contest_templates WHERE nome='Vestibular Fatec' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Questões que propõem a articulação de conhecimentos das disciplinas do Ensino Médio para a solução de situações-problema.', 0);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Redação', 10 FROM public.contest_templates WHERE nome='Vestibular Fatec' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Produção de texto para expor criticamente ideias, apresentar teses e argumentos de maneira lógica e criativa, ou desenvolver narrativa dotada de sentido.', 0),
  ((SELECT id FROM s), 'Adequação ao tema e à proposta; organização textual; coesão, coerência e progressão temática.', 1),
  ((SELECT id FROM s), 'Uso da variedade culta da língua portuguesa e adequação sintático-semântica.', 2);

-- ===== Vestibular Insper (8 matérias) =====
DELETE FROM public.contest_template_subjects WHERE template_id = (SELECT id FROM public.contest_templates WHERE nome='Vestibular Insper' AND tipo='vestibular' LIMIT 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Língua Portuguesa', 0 FROM public.contest_templates WHERE nome='Vestibular Insper' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Funcionamento social da língua: norma ortográfica; distinção entre variedades linguísticas, categorias sociais e contextos de comunicação; registros de formalidade e informalidade; relação entre escrita e oralidade.', 0),
  ((SELECT id FROM s), 'Morfossintaxe: classes de palavras; elementos estruturais e processos de formação de palavras; flexão nominal e verbal; concordância nominal e verbal; regência nominal e verbal.', 1),
  ((SELECT id FROM s), 'Processos sintático-semânticos: frase, oração e período; coordenação e subordinação; conectivos, função sintática e valores lógico-semânticos; organização e reorganização de orações e períodos; figuras de linguagem.', 2),
  ((SELECT id FROM s), 'Compreensão, interpretação e produção de textos de gêneros variados e diversas mídias: significação explícita e implícita; denotação e conotação; coesão e coerência; descrição, narração e dissertação; discurso direto, indireto e indireto livre; relação do texto com seu contexto histórico e cultural; intertextualidade e interdiscursividade; interação entre texto verbal e não verbal.', 3),
  ((SELECT id FROM s), 'Literatura brasileira: literatura de informação/literatura dos jesuítas; Barroco; Arcadismo; Romantismo; Realismo/Naturalismo; Parnasianismo; Simbolismo; Pré-Modernismo; Modernismo; Pós-Modernismo; análise literária e relação entre texto e contexto histórico-cultural.', 4),
  ((SELECT id FROM s), 'Literatura portuguesa: Trovadorismo; Humanismo; Classicismo; Barroco; Arcadismo; Romantismo; Realismo/Naturalismo; Parnasianismo; Simbolismo; Modernismo; Pós-Modernismo; análise literária e relação entre texto e contexto histórico-cultural.', 5),
  ((SELECT id FROM s), 'Literaturas africanas em língua portuguesa: análise literária; relação do texto com contexto histórico-cultural.', 6),
  ((SELECT id FROM s), 'Literatura indígena em língua portuguesa: análise literária; relação do texto com contexto histórico-cultural.', 7);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Redação', 1 FROM public.contest_templates WHERE nome='Vestibular Insper' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Produção de texto dissertativo-argumentativo em prosa.', 0),
  ((SELECT id FROM s), 'Atendimento ao tema proposto.', 1),
  ((SELECT id FROM s), 'Estrutura do gênero e coerência: tese, introdução, desenvolvimento e conclusão; sustentação argumentativa e objetividade.', 2),
  ((SELECT id FROM s), 'Modalidade e registro: norma-padrão, concordância, regência, ortografia, acentuação, pontuação e precisão vocabular.', 3),
  ((SELECT id FROM s), 'Coesão textual: uso de anáforas, catáforas, substituições, conjunções e organização em parágrafos.', 4);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Matemática', 2 FROM public.contest_templates WHERE nome='Vestibular Insper' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Conjuntos numéricos: naturais, inteiros, racionais e reais; operações, propriedades, ordem, reta numérica e resolução de problemas; razões; proporcionalidade direta e inversa; notação científica; sequências; progressões aritméticas e geométricas; juros simples e compostos, porcentagem, taxas e índices.', 0),
  ((SELECT id FROM s), 'Análise combinatória: princípios multiplicativo e aditivo; arranjos, permutações e combinações simples.', 1),
  ((SELECT id FROM s), 'Probabilidade: espaço amostral discreto e contínuo; eventos equiprováveis ou não; conceito de probabilidade; união, intersecção, condicional e independência.', 2),
  ((SELECT id FROM s), 'Sistemas lineares: resolução, discussão e representação algébrica e gráfica.', 3),
  ((SELECT id FROM s), 'Funções: relação entre grandezas; gráficos; taxa de variação; funções afim, constante, quadrática, exponencial e logarítmica; inequações.', 4),
  ((SELECT id FROM s), 'Matrizes, determinantes e noções de algoritmos, fluxograma e linguagem de programação.', 5),
  ((SELECT id FROM s), 'Sistemas de contagem e medidas: Sistema Internacional de Medidas, unidades de armazenamento e transferência de dados, bases decimal, binária e sexagesimal.', 6);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Biologia', 3 FROM public.contest_templates WHERE nome='Vestibular Insper' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Os seres vivos no ambiente: ecologia, cadeias e teias alimentares, fluxo de energia, produtividade, dinâmica populacional e conservação ambiental.', 0),
  ((SELECT id FROM s), 'Estudo químico e celular dos seres vivos, reprodução, desenvolvimento e metabolismo energético: componentes químicos, organização celular, membranas, organelas, núcleo, ciclo celular, mitose e meiose, reprodução, embriologia, fotossíntese, quimiossíntese, respiração, fermentação, DNA, RNA, síntese proteica, ativação gênica, mutações e biotecnologia.', 1),
  ((SELECT id FROM s), 'Níveis de organização, classificação biológica e diversidade dos seres vivos: vírus, domínios e reinos, bactérias, protozoários, algas, fungos, plantas e animais.', 2),
  ((SELECT id FROM s), 'Biologia das plantas e dos animais: ciclos de vida, anatomia vegetal, fisiologia vegetal, filos animais e fisiologia comparada.', 3),
  ((SELECT id FROM s), 'Corpo humano, saúde individual e coletiva: sistemas orgânicos, nutrição, SUS, saneamento, imunidade, vacinas, métodos anticoncepcionais, IST e doenças causadas por vírus, bactérias, fungos, protozoários e helmintos.', 4),
  ((SELECT id FROM s), 'Hereditariedade: leis de Mendel, conceitos de Genética, grupos sanguíneos, epistasia, herança quantitativa, genes ligados, heranças autossômicas, sexuais e mitocondrial.', 5),
  ((SELECT id FROM s), 'Origem e evolução da vida: teorias sobre origem da vida, Lamarck, Darwin e Wallace, teoria sintética, evidências da evolução, filogenia, genética de populações, especiação e evolução humana.', 6);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Física', 4 FROM public.contest_templates WHERE nome='Vestibular Insper' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Fundamentos da Física: grandezas fundamentais e derivadas, unidades, análise dimensional, proporcionalidade, gráficos e grandezas vetoriais.', 0),
  ((SELECT id FROM s), 'Mecânica: cinemática, balística, leis de Newton, forças, torque, movimento circular, trabalho, potência, energia, impulso, quantidade de movimento, gravitação, estática, hidrostática e hidrodinâmica.', 1),
  ((SELECT id FROM s), 'Física térmica: termometria, escalas, dilatação térmica, calorimetria, mudanças de estado, propagação do calor, gases e termodinâmica.', 2),
  ((SELECT id FROM s), 'Óptica e ondas: reflexão, refração, espelhos, lentes, instrumentos ópticos, ondas mecânicas e eletromagnéticas, som e efeito Doppler.', 3),
  ((SELECT id FROM s), 'Eletricidade e magnetismo: eletrostática, corrente elétrica, resistência, circuitos, potência, campo magnético, força magnética e indução eletromagnética.', 4);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Química', 5 FROM public.contest_templates WHERE nome='Vestibular Insper' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Transformações químicas e matéria: estados físicos, separação de misturas, propriedades da matéria, substâncias simples e compostas, leis ponderais e cálculos estequiométricos.', 0),
  ((SELECT id FROM s), 'Estrutura atômica e classificação periódica.', 1),
  ((SELECT id FROM s), 'Ligações químicas, polaridade, geometria molecular e interações intermoleculares.', 2),
  ((SELECT id FROM s), 'Substâncias moleculares, iônicas e metálicas e suas propriedades.', 3),
  ((SELECT id FROM s), 'Soluções, concentração, solubilidade, propriedades coligativas e tratamento da água.', 4),
  ((SELECT id FROM s), 'Ácidos, bases, sais e óxidos; teorias de Arrhenius, Lewis e Brønsted-Lowry.', 5),
  ((SELECT id FROM s), 'Cinética química e equilíbrio químico, incluindo pH, hidrólise e princípio de Le Châtelier.', 6),
  ((SELECT id FROM s), 'Termoquímica, oxirredução, pilhas, eletrólise, radioatividade e energia nuclear.', 7),
  ((SELECT id FROM s), 'Química orgânica e bioquímica: funções orgânicas, isomeria, polímeros, glicídios, lipídios, peptídeos, proteínas, enzimas, RNA e DNA.', 8),
  ((SELECT id FROM s), 'Química ambiental, ciclos biogeoquímicos, poluição e qualidade ambiental.', 9),
  ((SELECT id FROM s), 'Investigação científica e segurança na aquisição, armazenagem e utilização de produtos químicos domésticos.', 10);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'História', 6 FROM public.contest_templates WHERE nome='Vestibular Insper' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'História Geral: dos primeiros humanos ao Neolítico; Antiguidade no Oriente Próximo e na África; Antiguidade Clássica; período medieval; mundo moderno; expansão atlântica; revoluções, imperialismos, guerras, totalitarismos, descolonização e mundo contemporâneo.', 0),
  ((SELECT id FROM s), 'História do Brasil: povos originários, colonização, escravidão, independência, Império, República, Era Vargas, Estado Novo, nacional-desenvolvimentismo, regime civil-militar, redemocratização, Constituição de 1988, crises políticas, programas sociais, mobilizações políticas e sociais, desenvolvimento econômico e questões ambientais.', 1),
  ((SELECT id FROM s), 'Relações entre história, cidadania, trabalho, direitos, desigualdades, racismo, patriarcalismo e democracia.', 2);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Geografia', 7 FROM public.contest_templates WHERE nome='Vestibular Insper' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Espaços mundial e brasileiro: sistemas socioeconômicos, espaços supranacionais, países e regiões geográficas, Estado e planejamento territorial, geopolítica.', 0),
  ((SELECT id FROM s), 'Produção, consumo, comércio internacional e regional, blocos econômicos, organismos financeiros e Brasil na economia mundial.', 1),
  ((SELECT id FROM s), 'Dependência e dominação em diferentes escalas; violências, tensões, conflitos e separatismos.', 2),
  ((SELECT id FROM s), 'Transformações do espaço mundial e brasileiro; fronteiras e regiões; ordem mundial; trabalho e divisão territorial do trabalho.', 3),
  ((SELECT id FROM s), 'Questão urbana e espaço rural; industrialização, urbanização, metropolização, produção agropecuária e estrutura agrária.', 4),
  ((SELECT id FROM s), 'Globalização, redes geográficas, transportes, comunicações e integração nacional.', 5),
  ((SELECT id FROM s), 'População mundial e brasileira, comunidades tradicionais, estrutura demográfica e fluxos migratórios.', 6),
  ((SELECT id FROM s), 'Desigualdades socioeconômicas e socioespaciais, cidadania e direitos humanos.', 7),
  ((SELECT id FROM s), 'Grandes paisagens naturais da Terra, gênese e transformação; conservação, preservação e degradação ambiental.', 8);

-- ===== Vestibular ITA (6 matérias) =====
DELETE FROM public.contest_template_subjects WHERE template_id = (SELECT id FROM public.contest_templates WHERE nome='Vestibular ITA' AND tipo='vestibular' LIMIT 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Física', 0 FROM public.contest_templates WHERE nome='Vestibular ITA' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Noções sobre medidas físicas: algarismos significativos, medida, erro e incerteza, análise dimensional, grandezas escalares e vetoriais, soma e subtração de vetores, escalas e gráficos, funções e Sistema Internacional de Unidades.', 0),
  ((SELECT id FROM s), 'Cinemática escalar e vetorial da partícula: equação horária, trajetória, velocidade, aceleração, estudo gráfico do movimento, movimento de projéteis e movimento circular.', 1),
  ((SELECT id FROM s), 'Força, equilíbrio de partícula e corpo rígido, momento de uma força, equilíbrios estável e instável.', 2),
  ((SELECT id FROM s), 'Leis fundamentais da Mecânica, dinâmica retilínea e circular, força centrípeta, sistemas acelerados, força centrífuga, impulso, quantidade de movimento e centro de massa.', 3),
  ((SELECT id FROM s), 'Trabalho e energia cinética, energia potencial, conservação da energia mecânica, forças conservativas e dissipativas.', 4),
  ((SELECT id FROM s), 'Gravitação universal, campo gravitacional e leis de Kepler.', 5),
  ((SELECT id FROM s), 'Movimentos periódicos, movimento harmônico simples, superposição de MHS e pêndulo simples.', 6),
  ((SELECT id FROM s), 'Fluidos em equilíbrio e em movimento: pressão, massa específica, princípios de Arquimedes e Pascal, pressão atmosférica, vazão, fluxo de massa, equação de continuidade, Bernoulli e Torricelli.', 7),
  ((SELECT id FROM s), 'Termologia e termodinâmica: temperatura, termômetros, escalas, princípio zero, dilatação, gases perfeitos, equação de Clapeyron, teoria cinética, calor, calor específico, capacidade térmica, equivalente mecânico do calor, primeiro e segundo princípios e propagação do calor.', 8),
  ((SELECT id FROM s), 'Ondas e som: ondas transversais e longitudinais, natureza do som, altura, intensidade, timbre, velocidade do som, cordas vibrantes, tubos sonoros e efeito Doppler.', 9),
  ((SELECT id FROM s), 'Óptica geométrica e física: reflexão, refração, reflexão total, espelhos, lâminas, prismas, dispersão, lentes, sistemas ópticos, natureza ondulatória da luz, interferência, experiência de Young, difração, polarização e modelos ondulatório/corpuscular.', 10),
  ((SELECT id FROM s), 'Eletricidade e magnetismo: eletrização, estrutura do átomo, lei de Coulomb, campo e potencial elétrico, capacitores, corrente elétrica, resistência, lei de Ohm, associação de resistências, efeito Joule, leis de Kirchhoff, ponte de Wheatstone, geradores, campo magnético, bobinas, forças magnéticas, interação entre correntes, indução eletromagnética, leis de Faraday e Lenz, autoindução e ondas eletromagnéticas.', 11),
  ((SELECT id FROM s), 'Física moderna: efeito fotoelétrico, radiação de corpo negro, espectro de hidrogênio, átomo de Bohr, princípio de incerteza e relatividade restrita.', 12);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Português', 1 FROM public.contest_templates WHERE nome='Vestibular ITA' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Morfologia: estrutura das palavras, morfemas, principais radicais, processos de formação de palavras e neologismos; classificação e flexão das palavras.', 0),
  ((SELECT id FROM s), 'Sintaxe: termos essenciais, integrantes e acessórios da oração; período simples e composto; conectivos e produção de sentidos; pontuação; concordância nominal e verbal; regência nominal e verbal; crase; colocação pronominal.', 1),
  ((SELECT id FROM s), 'Semântica: sinonímia, antonímia, homonímia, paronímia, polissemia, hiponímia, hiperonímia e ambiguidade; intertextualidade.', 2),
  ((SELECT id FROM s), 'Estilística: figuras de palavras, de pensamento, de construção e de som.', 3),
  ((SELECT id FROM s), 'Leitura e interpretação: gêneros textuais, textos literários e não literários, textos verbais e não verbais; intenções, níveis de linguagem, funções da linguagem, estrutura, estética e público-alvo; inferências, pressupostos e implícitos; variedades linguísticas.', 4),
  ((SELECT id FROM s), 'Literatura brasileira: Barroco, Arcadismo, literatura de informação, Romantismo, Realismo-Naturalismo, Parnasianismo, Simbolismo, Pré-modernismo, Vanguardas europeias e influências no Modernismo, Modernismo e tendências contemporâneas.', 5),
  ((SELECT id FROM s), 'Literatura portuguesa: Trovadorismo, Humanismo, Classicismo, Barroco, Neoclassicismo/Pré-romantismo, Romantismo, Realismo, Simbolismo, Modernismo e literatura contemporânea.', 6);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Inglês', 2 FROM public.contest_templates WHERE nome='Vestibular ITA' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Compreensão de textos autênticos em língua inglesa.', 0),
  ((SELECT id FROM s), 'Predição de conteúdos, inferência de significados, reconhecimento de vocabulário em contextos diversos e identificação de estruturas gramaticais essenciais à compreensão.', 1),
  ((SELECT id FROM s), 'Compreensão global e detalhada de textos, expressões, frases e palavras em contexto.', 2),
  ((SELECT id FROM s), 'Questões a partir de expressões idiomáticas, frases isoladas e tiras cômicas.', 3),
  ((SELECT id FROM s), 'Síntese de ideias principais, identificação de objetivo e intenções do autor e relações entre as partes de um texto.', 4);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Redação', 3 FROM public.contest_templates WHERE nome='Vestibular ITA' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Produção de texto dissertativo-argumentativo.', 0),
  ((SELECT id FROM s), 'Capacidade de dissertar sobre o tema proposto.', 1),
  ((SELECT id FROM s), 'Desenvolvimento e organização do texto.', 2),
  ((SELECT id FROM s), 'Emprego adequado de recursos linguísticos e discursivos próprios da norma-padrão.', 3),
  ((SELECT id FROM s), 'Avaliação pelos itens tema, tipo de texto, coerência, coesão e modalidade.', 4);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Matemática', 4 FROM public.contest_templates WHERE nome='Vestibular ITA' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Teoria elementar dos conjuntos; conjuntos numéricos; números primos; Teorema Fundamental da Aritmética; divisibilidade; princípio da indução matemática e princípio das gavetas.', 0),
  ((SELECT id FROM s), 'Sequências; progressões aritméticas e geométricas; soma de termos; progressão geométrica infinita.', 1),
  ((SELECT id FROM s), 'Funções: injetoras, sobrejetoras e bijetoras; pares, ímpares e periódicas; compostas e inversas; funções afins, quadráticas, modulares, exponenciais e logarítmicas; equações, inequações e sistemas.', 2),
  ((SELECT id FROM s), 'Trigonometria: fórmulas de adição e subtração de arcos, arco duplo e arco metade; funções trigonométricas; transformação de soma em produto; equações e inequações trigonométricas.', 3),
  ((SELECT id FROM s), 'Números complexos: formas algébrica e trigonométrica, raízes complexas e fórmula de Moivre.', 4),
  ((SELECT id FROM s), 'Polinômios e equações algébricas: grau e propriedades, operações, fatoração, produtos notáveis, raízes reais e complexas, Teorema Fundamental da Álgebra, relações entre coeficientes e raízes, transformações aditiva e multiplicativa e equações recíprocas.', 5),
  ((SELECT id FROM s), 'Análise combinatória e probabilidade: problemas de contagem, arranjos, permutações, combinações, binômio de Newton, espaço amostral, probabilidade condicional e independência.', 6),
  ((SELECT id FROM s), 'Matrizes, determinantes e sistemas lineares.', 7),
  ((SELECT id FROM s), 'Geometria plana, analítica plana e espacial.', 8);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Química', 5 FROM public.contest_templates WHERE nome='Vestibular ITA' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Objetivos e ramos da Química; método científico.', 0),
  ((SELECT id FROM s), 'Matéria: propriedades dos estados sólido, líquido e gasoso; materiais amorfos e cristalinos.', 1),
  ((SELECT id FROM s), 'Misturas heterogêneas, coloides e soluções: conceitos, identificação, métodos de separação e grau de pureza.', 2),
  ((SELECT id FROM s), 'Elementos químicos, tabela periódica, substâncias simples e compostas, fórmulas, fontes, obtenção e propriedades.', 3),
  ((SELECT id FROM s), 'Átomos e moléculas: partículas fundamentais, modelos atômicos, massas atômicas e molares, radioatividade.', 4),
  ((SELECT id FROM s), 'Bases estequiométricas da teoria atômica moderna: leis dos gases, princípio de Avogadro e mol.', 5),
  ((SELECT id FROM s), 'Ligações químicas, geometria, polaridade, momento dipolar e forças intermoleculares.', 6),
  ((SELECT id FROM s), 'Soluções: concentrações, tipos, condutividade elétrica, solubilidade e propriedades coligativas.', 7),
  ((SELECT id FROM s), 'Reações químicas, equação química, balanceamento e cálculos estequiométricos.', 8),
  ((SELECT id FROM s), 'Equilíbrio químico: constantes e princípio de Le Chatelier.', 9),
  ((SELECT id FROM s), 'Termoquímica: calor, trabalho, energia interna, entalpia, entropia, energia livre de Gibbs, lei de Hess e energia de ligação.', 10),
  ((SELECT id FROM s), 'Cinética química: influência de temperatura, pressão, concentração e superfície de contato; catalisadores, inibidores, catálise enzimática, leis de velocidade, ordem de reação, energia de ativação, reações elementares e não elementares.', 11),
  ((SELECT id FROM s), 'Ácidos, bases, sais e óxidos: conceitos, nomenclatura, classificação, propriedades aquosas e obtenção.', 12),
  ((SELECT id FROM s), 'Eletroquímica: cátodo, ânodo, polaridade, potenciais de eletrodo, leis de Faraday, pares redox, equação de Nernst, baterias, corrosão e eletrólise.', 13),
  ((SELECT id FROM s), 'Química orgânica: funções orgânicas, grupos funcionais, classificação, nomenclatura, propriedades, obtenção, séries orgânicas e isomeria.', 14),
  ((SELECT id FROM s), 'Bioquímica: aminoácidos, peptídeos, proteínas, enzimas, carboidratos, nucleotídeos, ácidos nucleicos e lipídeos.', 15),
  ((SELECT id FROM s), 'Polímeros: monômeros, relação entre estrutura e propriedades, métodos de obtenção e aplicações.', 16),
  ((SELECT id FROM s), 'Química ambiental: ciclo do carbono, da água, do oxigênio, do nitrogênio, poluição da água e da atmosfera.', 17);

-- ===== Vestibular Univesp (9 matérias) =====
DELETE FROM public.contest_template_subjects WHERE template_id = (SELECT id FROM public.contest_templates WHERE nome='Vestibular Univesp' AND tipo='vestibular' LIMIT 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Língua Portuguesa', 0 FROM public.contest_templates WHERE nome='Vestibular Univesp' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Funcionamento social da língua: norma ortográfica; distinção entre variedades linguísticas, categorias sociais e contextos de comunicação; registros de formalidade e informalidade; relação entre escrita e oralidade.', 0),
  ((SELECT id FROM s), 'Morfossintaxe: classes de palavras; elementos estruturais e processos de formação de palavras; flexão nominal e verbal; concordância nominal e verbal; regência nominal e verbal.', 1),
  ((SELECT id FROM s), 'Processos sintático-semânticos: frase, oração e período; coordenação e subordinação; conectivos, função sintática e valores lógico-semânticos; organização e reorganização de orações e períodos; figuras de linguagem.', 2),
  ((SELECT id FROM s), 'Compreensão, interpretação e produção de textos de gêneros variados e diversas mídias: significação explícita e implícita; denotação e conotação; coesão e coerência; descrição, narração e dissertação; discurso direto, indireto e indireto livre; relação do texto com seu contexto histórico e cultural; intertextualidade e interdiscursividade; interação entre texto verbal e não verbal.', 3),
  ((SELECT id FROM s), 'Literatura brasileira e portuguesa: principais períodos literários, análise literária e relação do texto com seu contexto histórico e cultural.', 4),
  ((SELECT id FROM s), 'Literaturas africanas em Língua Portuguesa: autores representativos, análise literária e relação texto-contexto.', 5),
  ((SELECT id FROM s), 'Literatura indígena em Língua Portuguesa: autores representativos, análise literária e relação texto-contexto.', 6);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Língua Inglesa', 1 FROM public.contest_templates WHERE nome='Vestibular Univesp' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Compreensão de textos autênticos escritos em língua inglesa.', 0),
  ((SELECT id FROM s), 'Localização de informações explícitas e implícitas, inferência de sentidos e reconhecimento de vocabulário em contexto.', 1),
  ((SELECT id FROM s), 'Relações entre partes do texto, verbos modais e marcadores discursivos.', 2);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Matemática', 2 FROM public.contest_templates WHERE nome='Vestibular Univesp' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Conjuntos numéricos: naturais, inteiros, racionais e reais; operações, propriedades, ordem, reta numérica, proporcionalidade, razões, sequências e progressões, porcentagem, taxas e índices.', 0),
  ((SELECT id FROM s), 'Análise combinatória e probabilidade.', 1),
  ((SELECT id FROM s), 'Sistemas lineares.', 2),
  ((SELECT id FROM s), 'Funções: afim, constante, quadrática, exponencial e logarítmica; gráficos e taxas de variação.', 3),
  ((SELECT id FROM s), 'Sistemas de contagem e medidas.', 4);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Biologia', 3 FROM public.contest_templates WHERE nome='Vestibular Univesp' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Ecologia e ambiente: populações, comunidades, ecossistemas, cadeias e teias alimentares, produtividade, dinâmicas populacionais, sucessão ecológica, mudanças climáticas, poluição e conservação.', 0),
  ((SELECT id FROM s), 'Biologia celular, reprodução, desenvolvimento e metabolismo energético.', 1),
  ((SELECT id FROM s), 'DNA, RNA, síntese proteica, mutações e biotecnologia.', 2),
  ((SELECT id FROM s), 'Classificação biológica e diversidade dos seres vivos.', 3),
  ((SELECT id FROM s), 'Biologia das plantas, dos animais e fisiologia humana.', 4),
  ((SELECT id FROM s), 'Saúde individual e coletiva, imunidade, IST e doenças causadas por agentes infecciosos.', 5),
  ((SELECT id FROM s), 'Hereditariedade, genética e evolução.', 6);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Física', 4 FROM public.contest_templates WHERE nome='Vestibular Univesp' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Fundamentos da Física, grandezas, unidades e vetores.', 0),
  ((SELECT id FROM s), 'Mecânica: cinemática, leis de Newton, trabalho, energia, impulso, movimento circular, gravitação, hidrostática e hidrodinâmica.', 1),
  ((SELECT id FROM s), 'Física térmica: termometria, dilatação, calorimetria, gases e termodinâmica.', 2),
  ((SELECT id FROM s), 'Óptica e ondas.', 3),
  ((SELECT id FROM s), 'Eletricidade e magnetismo.', 4);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Química', 5 FROM public.contest_templates WHERE nome='Vestibular Univesp' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Estados físicos e separação de misturas.', 0),
  ((SELECT id FROM s), 'Estrutura atômica e classificação periódica.', 1),
  ((SELECT id FROM s), 'Ligações químicas e interações intermoleculares.', 2),
  ((SELECT id FROM s), 'Substâncias e soluções.', 3),
  ((SELECT id FROM s), 'Ácidos, bases, sais e óxidos.', 4),
  ((SELECT id FROM s), 'Reações químicas, estequiometria, cinética, equilíbrio e pH.', 5),
  ((SELECT id FROM s), 'Termoquímica, oxirredução, pilhas, eletrólise e radioatividade.', 6),
  ((SELECT id FROM s), 'Química orgânica, bioquímica e química ambiental.', 7),
  ((SELECT id FROM s), 'Método científico e segurança com produtos químicos.', 8);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'História', 6 FROM public.contest_templates WHERE nome='Vestibular Univesp' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'História Geral: primeiros humanos, Antiguidade, Idade Média, Mundo Moderno e Mundo Contemporâneo.', 0),
  ((SELECT id FROM s), 'Expansão marítima, colonização, revoluções, industrialização, imperialismo, guerras, totalitarismos, descolonização e mundo atual.', 1),
  ((SELECT id FROM s), 'História do Brasil: colonização, escravidão, independência, Império, República, Era Vargas, regime civil-militar e redemocratização.', 2),
  ((SELECT id FROM s), 'Cidadania, trabalho, direitos, desigualdades e movimentos sociais.', 3);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Geografia', 7 FROM public.contest_templates WHERE nome='Vestibular Univesp' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Espaços mundial e brasileiro: sistemas socioeconômicos, geopolítica, Estado, regiões, comércio internacional e globalização.', 0),
  ((SELECT id FROM s), 'Transformações do espaço, urbanização, industrialização, produção agropecuária e estrutura agrária.', 1),
  ((SELECT id FROM s), 'População, migrações, redes geográficas e desigualdades socioespaciais.', 2),
  ((SELECT id FROM s), 'Grandes paisagens naturais, clima, relevo, vegetação, hidrografia e questão ambiental.', 3),
  ((SELECT id FROM s), 'Cartografia, coordenadas geográficas, escala e tecnologias de representação do espaço.', 4);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Redação', 8 FROM public.contest_templates WHERE nome='Vestibular Univesp' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Produção de texto dissertativo-argumentativo em prosa.', 0),
  ((SELECT id FROM s), 'Atendimento ao tema proposto.', 1),
  ((SELECT id FROM s), 'Estrutura do gênero, coerência, coesão e desenvolvimento argumentativo.', 2),
  ((SELECT id FROM s), 'Adequação à norma-padrão da língua portuguesa.', 3);

