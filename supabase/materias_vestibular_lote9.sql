-- Lote 9: Vestibular UEM, Vestibular UEMA, Vestibular UEMASUL, Vestibular UEMG
-- ON CONFLICT em cada seção para recriar registros se necessário.

-- ===== Vestibular UEM (9 matérias) =====
INSERT INTO public.contest_templates (slug, nome, plano, concurso, tipo, area, cor, status, is_public, scope, institution_type, uf)
VALUES ('vestibular-uem', 'Vestibular UEM', 'free', 'UEM', 'vestibular', 'Geral', '#2563EB', 'ativo', true, 'estadual', 'publica', 'PR')
ON CONFLICT (slug) DO UPDATE SET nome = EXCLUDED.nome, is_public = true;

DELETE FROM public.contest_template_subjects WHERE template_id = (SELECT id FROM public.contest_templates WHERE nome='Vestibular UEM' AND tipo='vestibular' LIMIT 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Biologia', 0 FROM public.contest_templates WHERE nome='Vestibular UEM' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Organização celular e bases moleculares da vida', 0),
  ((SELECT id FROM s), 'Metabolismo energético: fotossíntese e respiração', 1),
  ((SELECT id FROM s), 'Reprodução e desenvolvimento embrionário', 2),
  ((SELECT id FROM s), 'Genética, hereditariedade e biologia molecular', 3),
  ((SELECT id FROM s), 'Evolução e origem da vida', 4),
  ((SELECT id FROM s), 'Diversidade dos seres vivos (vírus, bactérias, fungos, plantas e animais)', 5),
  ((SELECT id FROM s), 'Anatomia e fisiologia humana', 6),
  ((SELECT id FROM s), 'Ecologia: ecossistemas, ciclos biogeoquímicos e relações ecológicas', 7);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Física', 1 FROM public.contest_templates WHERE nome='Vestibular UEM' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Mecânica: cinemática, leis de Newton, trabalho, energia e conservação', 0),
  ((SELECT id FROM s), 'Gravitação universal e hidrostática', 1),
  ((SELECT id FROM s), 'Termologia: calorimetria, termodinâmica e comportamento dos gases', 2),
  ((SELECT id FROM s), 'Óptica geométrica e física', 3),
  ((SELECT id FROM s), 'Ondulatória e acústica', 4),
  ((SELECT id FROM s), 'Eletromagnetismo: eletrostática, eletrodinâmica e indução eletromagnética', 5),
  ((SELECT id FROM s), 'Física Moderna: dualidade onda-partícula e relatividade restrita', 6);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Geografia', 2 FROM public.contest_templates WHERE nome='Vestibular UEM' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'A Terra e o Universo: noções de cartografia e orientação espacial', 0),
  ((SELECT id FROM s), 'Geomorfologia, relevo e solos', 1),
  ((SELECT id FROM s), 'Climatologia e hidrografia do Brasil e do mundo', 2),
  ((SELECT id FROM s), 'Biogeografia e questões socioambientais', 3),
  ((SELECT id FROM s), 'Geografia da população: dinâmica demográfica e migrações', 4),
  ((SELECT id FROM s), 'Geografia agrária, urbanização e metropolização', 5),
  ((SELECT id FROM s), 'Geopolítica, globalização e blocos econômicos', 6),
  ((SELECT id FROM s), 'Geografia do Paraná: quadro natural, população e economia', 7);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'História', 3 FROM public.contest_templates WHERE nome='Vestibular UEM' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Antiguidade: sociedades do Oriente Próximo e Antiguidade Clássica', 0),
  ((SELECT id FROM s), 'Idade Média: formação do feudalismo e civilização islâmica', 1),
  ((SELECT id FROM s), 'Idade Moderna: Renascimento, Reformas, Absolutismo e Mercantilismo', 2),
  ((SELECT id FROM s), 'Idade Contemporânea: Revoluções Burguesas, Revolução Industrial, Guerras Mundiais, Guerra Fria e mundo atual', 3),
  ((SELECT id FROM s), 'História do Brasil: sistema colonial, Brasil Império e Brasil República', 4),
  ((SELECT id FROM s), 'História do Paraná: ocupação, conflitos sociais e desenvolvimento econômico', 5);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Língua Portuguesa e Literaturas', 4 FROM public.contest_templates WHERE nome='Vestibular UEM' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Compreensão e interpretação de textos literários e não literários', 0),
  ((SELECT id FROM s), 'Fonética, fonologia e ortografia', 1),
  ((SELECT id FROM s), 'Morfossintaxe: classes de palavras, orações e períodos', 2),
  ((SELECT id FROM s), 'Concordância, regência e crase', 3),
  ((SELECT id FROM s), 'Semântica e recursos estilísticos', 4),
  ((SELECT id FROM s), 'História da Literatura Brasileira e Portuguesa: escolas, autores e gêneros literários', 5);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Matemática', 5 FROM public.contest_templates WHERE nome='Vestibular UEM' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Conjuntos numéricos, razão, proporção e porcentagem', 0),
  ((SELECT id FROM s), 'Funções: afim, quadrática, modular, exponencial e logarítmica', 1),
  ((SELECT id FROM s), 'Progressões aritméticas e geométricas', 2),
  ((SELECT id FROM s), 'Trigonometria', 3),
  ((SELECT id FROM s), 'Matrizes, determinantes e sistemas de equações lineares', 4),
  ((SELECT id FROM s), 'Análise combinatória e probabilidade', 5),
  ((SELECT id FROM s), 'Geometria plana e espacial', 6),
  ((SELECT id FROM s), 'Geometria analítica e polinômios', 7);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Química', 6 FROM public.contest_templates WHERE nome='Vestibular UEM' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Estrutura atômica e classificação periódica dos elementos', 0),
  ((SELECT id FROM s), 'Ligações químicas e forças intermoleculares', 1),
  ((SELECT id FROM s), 'Funções inorgânicas e reações químicas', 2),
  ((SELECT id FROM s), 'Estequiometria e leis ponderais', 3),
  ((SELECT id FROM s), 'Estudo das soluções e propriedades coligativas', 4),
  ((SELECT id FROM s), 'Termoquímica, cinética química e equilíbrio químico', 5),
  ((SELECT id FROM s), 'Eletroquímica: pilhas e eletrólise', 6),
  ((SELECT id FROM s), 'Química orgânica: funções, nomenclatura, isomeria e principais reações', 7);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Filosofia', 7 FROM public.contest_templates WHERE nome='Vestibular UEM' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Origem da filosofia e o pensamento mítico', 0),
  ((SELECT id FROM s), 'Filosofia antiga: pré-socráticos, Sócrates, Platão e Aristóteles', 1),
  ((SELECT id FROM s), 'Filosofia medieval, moderna e contemporânea', 2),
  ((SELECT id FROM s), 'Teoria do conhecimento e epistemologia', 3),
  ((SELECT id FROM s), 'Ética, moral e filosofia política', 4);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Sociologia', 8 FROM public.contest_templates WHERE nome='Vestibular UEM' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'O surgimento da Sociologia como ciência', 0),
  ((SELECT id FROM s), 'Clássicos da Sociologia: Comte, Durkheim, Marx e Weber', 1),
  ((SELECT id FROM s), 'Cultura, ideologia e indústria cultural', 2),
  ((SELECT id FROM s), 'Estratificação social, desigualdade e movimentos sociais', 3),
  ((SELECT id FROM s), 'O mundo do trabalho e as transformações no capitalismo', 4),
  ((SELECT id FROM s), 'Sociologia brasileira e formação do Brasil', 5);

-- ===== Vestibular UEMA (4 matérias) =====
INSERT INTO public.contest_templates (slug, nome, plano, concurso, tipo, area, cor, status, is_public, scope, institution_type, uf)
VALUES ('vestibular-uema', 'Vestibular UEMA', 'free', 'UEMA', 'vestibular', 'Geral', '#2563EB', 'ativo', true, 'estadual', 'publica', 'MA')
ON CONFLICT (slug) DO UPDATE SET nome = EXCLUDED.nome, is_public = true;

DELETE FROM public.contest_template_subjects WHERE template_id = (SELECT id FROM public.contest_templates WHERE nome='Vestibular UEMA' AND tipo='vestibular' LIMIT 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Linguagens e Códigos', 0 FROM public.contest_templates WHERE nome='Vestibular UEMA' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Língua Portuguesa: leitura, interpretação, gêneros textuais, coesão e coerência', 0),
  ((SELECT id FROM s), 'Gramática: morfologia, sintaxe, concordância, regência e ortografia', 1),
  ((SELECT id FROM s), 'Literatura: movimentos literários do Brasil e de Portugal', 2),
  ((SELECT id FROM s), 'Língua Estrangeira (Inglês ou Espanhol): leitura e compreensão textual', 3);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Ciências Humanas', 1 FROM public.contest_templates WHERE nome='Vestibular UEMA' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'História: Brasil (Colônia, Império e República), História Geral e História do Maranhão (Balaiada, economia e sociedade)', 0),
  ((SELECT id FROM s), 'Geografia: Geografia Física, Humana e Econômica, Geopolítica e Geografia do Maranhão', 1),
  ((SELECT id FROM s), 'Filosofia: Ética, política, teoria do conhecimento e história da filosofia', 2),
  ((SELECT id FROM s), 'Sociologia: Pensamento sociológico clássico, cultura, trabalho, desigualdade e sociologia brasileira', 3);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Ciências da Natureza', 2 FROM public.contest_templates WHERE nome='Vestibular UEMA' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Biologia: Citologia, histologia, reinos, genética, evolução e ecologia (com foco nos ecossistemas maranhenses)', 0),
  ((SELECT id FROM s), 'Física: Cinemática, dinâmica, hidrostática, termologia, óptica, ondulatória e eletromagnetismo', 1),
  ((SELECT id FROM s), 'Química: Estrutura da matéria, tabela periódica, ligações, funções inorgânicas, físico-química e química orgânica', 2);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Matemática', 3 FROM public.contest_templates WHERE nome='Vestibular UEMA' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Aritmética e Álgebra elementar', 0),
  ((SELECT id FROM s), 'Funções reais, exponenciais e logarítmicas', 1),
  ((SELECT id FROM s), 'Geometria Plana, Espacial e Analítica', 2),
  ((SELECT id FROM s), 'Trigonometria e números complexos', 3),
  ((SELECT id FROM s), 'Estatística, análise combinatória e probabilidade', 4);

-- ===== Vestibular UEMASUL (4 matérias) =====
INSERT INTO public.contest_templates (slug, nome, plano, concurso, tipo, area, cor, status, is_public, scope, institution_type, uf)
VALUES ('vestibular-uemasul', 'Vestibular UEMASUL', 'free', 'UEMASUL', 'vestibular', 'Geral', '#2563EB', 'ativo', true, 'estadual', 'publica', 'MA')
ON CONFLICT (slug) DO UPDATE SET nome = EXCLUDED.nome, is_public = true;

DELETE FROM public.contest_template_subjects WHERE template_id = (SELECT id FROM public.contest_templates WHERE nome='Vestibular UEMASUL' AND tipo='vestibular' LIMIT 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Linguagens, Códigos e suas Tecnologias', 0 FROM public.contest_templates WHERE nome='Vestibular UEMASUL' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Interpretação e estruturação de textos', 0),
  ((SELECT id FROM s), 'Variação linguística e gramática normativa', 1),
  ((SELECT id FROM s), 'Literatura Brasileira e escolas literárias', 2),
  ((SELECT id FROM s), 'Compreensão de leitura em Língua Estrangeira', 3);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Ciências Humanas e suas Tecnologias', 1 FROM public.contest_templates WHERE nome='Vestibular UEMASUL' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'História Geral, do Brasil e do Maranhão', 0),
  ((SELECT id FROM s), 'Geografia Geral, do Brasil e do Maranhão (foco na Região Tocantina)', 1),
  ((SELECT id FROM s), 'Fundamentos de Filosofia e Sociologia', 2);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Ciências da Natureza e suas Tecnologias', 2 FROM public.contest_templates WHERE nome='Vestibular UEMASUL' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Biologia: bases celulares, hereditariedade, reinos e ecologia', 0),
  ((SELECT id FROM s), 'Física: mecânica, calor, fenômenos ondulatórios e eletromagnetismo', 1),
  ((SELECT id FROM s), 'Química: transformações da matéria, estequiometria, físico-química e compostos orgânicos', 2);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Matemática e suas Tecnologias', 3 FROM public.contest_templates WHERE nome='Vestibular UEMASUL' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Álgebra e funções', 0),
  ((SELECT id FROM s), 'Geometrias plana, espacial e analítica', 1),
  ((SELECT id FROM s), 'Matemática financeira, estatística e probabilidade', 2);

-- ===== Vestibular UEMG (7 matérias) =====
INSERT INTO public.contest_templates (slug, nome, plano, concurso, tipo, area, cor, status, is_public, scope, institution_type, uf)
VALUES ('vestibular-uemg', 'Vestibular UEMG', 'free', 'UEMG', 'vestibular', 'Geral', '#2563EB', 'ativo', true, 'estadual', 'publica', 'MG')
ON CONFLICT (slug) DO UPDATE SET nome = EXCLUDED.nome, is_public = true;

DELETE FROM public.contest_template_subjects WHERE template_id = (SELECT id FROM public.contest_templates WHERE nome='Vestibular UEMG' AND tipo='vestibular' LIMIT 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Biologia', 0 FROM public.contest_templates WHERE nome='Vestibular UEMG' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'A célula: estrutura, organelas e divisão celular', 0),
  ((SELECT id FROM s), 'Metabolismo energético', 1),
  ((SELECT id FROM s), 'Genética e evolução', 2),
  ((SELECT id FROM s), 'Os seres vivos: vírus, bactérias, fungos, protistas, plantas e animais', 3),
  ((SELECT id FROM s), 'Anatomia e fisiologia humana', 4),
  ((SELECT id FROM s), 'Ecologia e conservação ambiental', 5);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Física', 1 FROM public.contest_templates WHERE nome='Vestibular UEMG' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Mecânica (cinemática, dinâmica, energia)', 0),
  ((SELECT id FROM s), 'Termologia e termodinâmica', 1),
  ((SELECT id FROM s), 'Ondulatória e óptica geométrica', 2),
  ((SELECT id FROM s), 'Eletricidade (eletrostática e circuitos) e magnetismo', 3);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Geografia', 2 FROM public.contest_templates WHERE nome='Vestibular UEMG' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'O espaço geográfico e representação cartográfica', 0),
  ((SELECT id FROM s), 'Geografia física: geologia, relevo, clima, hidrografia e vegetação', 1),
  ((SELECT id FROM s), 'Geografia humana: população e urbanização', 2),
  ((SELECT id FROM s), 'Geografia econômica e agrária', 3),
  ((SELECT id FROM s), 'Geopolítica contemporânea e espaço geográfico de Minas Gerais', 4);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'História', 3 FROM public.contest_templates WHERE nome='Vestibular UEMG' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'As sociedades na Antiguidade', 0),
  ((SELECT id FROM s), 'O mundo medieval e a transição para a modernidade', 1),
  ((SELECT id FROM s), 'O mundo moderno: expansão, colonização e iluminismo', 2),
  ((SELECT id FROM s), 'O mundo contemporâneo e o século XX', 3),
  ((SELECT id FROM s), 'História do Brasil: da colônia à atualidade', 4),
  ((SELECT id FROM s), 'História de Minas Gerais', 5);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Língua Portuguesa, Literatura e Produção de Texto', 4 FROM public.contest_templates WHERE nome='Vestibular UEMG' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Compreensão de textos', 0),
  ((SELECT id FROM s), 'Norma padrão, variação linguística e sintaxe', 1),
  ((SELECT id FROM s), 'Figuras de linguagem, coesão e coerência', 2),
  ((SELECT id FROM s), 'Escolas literárias e obras representativas da Literatura Brasileira', 3);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Matemática', 5 FROM public.contest_templates WHERE nome='Vestibular UEMG' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Números e Álgebra', 0),
  ((SELECT id FROM s), 'Funções polinomiais, exponenciais e trigonométricas', 1),
  ((SELECT id FROM s), 'Geometria plana e espacial', 2),
  ((SELECT id FROM s), 'Geometria analítica', 3),
  ((SELECT id FROM s), 'Tratamento da informação (Estatística e Probabilidade)', 4);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Química', 6 FROM public.contest_templates WHERE nome='Vestibular UEMG' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Materiais e suas propriedades', 0),
  ((SELECT id FROM s), 'Estrutura atômica e tabela periódica', 1),
  ((SELECT id FROM s), 'Ligações químicas e reações inorgânicas', 2),
  ((SELECT id FROM s), 'Estequiometria e soluções', 3),
  ((SELECT id FROM s), 'Termoquímica, cinética e equilíbrio', 4),
  ((SELECT id FROM s), 'Compostos de carbono (Química Orgânica)', 5);
