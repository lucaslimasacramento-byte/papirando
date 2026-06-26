-- Lote 10: Vestibular UEMS, Vestibular UENP, Vestibular UERR
-- Vestibular UEPB → disciplinas: [] — deletar do catálogo.
-- ON CONFLICT em cada seção para recriar registros se necessário.

-- ===== Vestibular UEMS (4 matérias) =====
INSERT INTO public.contest_templates (slug, nome, plano, concurso, tipo, area, cor, status, is_public, scope, institution_type, uf)
VALUES ('vestibular-uems', 'Vestibular UEMS', 'free', 'UEMS', 'vestibular', 'Geral', '#2563EB', 'ativo', true, 'estadual', 'publica', 'MS')
ON CONFLICT (slug) DO UPDATE SET nome = EXCLUDED.nome, is_public = true;

DELETE FROM public.contest_template_subjects WHERE template_id = (SELECT id FROM public.contest_templates WHERE nome='Vestibular UEMS' AND tipo='vestibular' LIMIT 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Linguagens, Códigos e suas Tecnologias', 0 FROM public.contest_templates WHERE nome='Vestibular UEMS' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Leitura, compreensão e interpretação de textos literários e não literários', 0),
  ((SELECT id FROM s), 'Análise do discurso, variação linguística e adequação vocabular', 1),
  ((SELECT id FROM s), 'Morfossintaxe: classes de palavras, estrutura da oração e do período', 2),
  ((SELECT id FROM s), 'Semântica e recursos estilísticos (figuras de linguagem)', 3),
  ((SELECT id FROM s), 'História da Literatura Brasileira: principais escolas, características e autores', 4),
  ((SELECT id FROM s), 'Língua Estrangeira (Inglês ou Espanhol): compreensão de leitura, gramática aplicada ao texto e vocabulário', 5);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Ciências Humanas e suas Tecnologias', 1 FROM public.contest_templates WHERE nome='Vestibular UEMS' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'História do Brasil: Período Colonial, Império, República Velha, Era Vargas, Ditadura Militar e Nova República', 0),
  ((SELECT id FROM s), 'História Geral: Antiguidade Clássica, Idade Média, Idade Moderna (Absolutismo, Renascimento, Expansão Marítima) e Idade Contemporânea', 1),
  ((SELECT id FROM s), 'História de Mato Grosso do Sul: ocupação territorial, ciclo da erva-mate, Guerra do Paraguai, divisão do estado e economia atual', 2),
  ((SELECT id FROM s), 'Geografia Física: estrutura geológica, relevo, hidrografia, clima e vegetação', 3),
  ((SELECT id FROM s), 'Geografia Humana e Econômica: dinâmica demográfica, urbanização, espaço agrário e globalização', 4),
  ((SELECT id FROM s), 'Filosofia e Sociologia: clássicos da sociologia, estratificação social, ética, política e cidadania', 5);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Ciências da Natureza e suas Tecnologias', 2 FROM public.contest_templates WHERE nome='Vestibular UEMS' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Biologia: citologia, metabolismo energético, histologia, reinos da natureza, genética, evolução e ecologia', 0),
  ((SELECT id FROM s), 'Física: mecânica (cinemática e dinâmica), termologia, óptica geométrica, ondulatória e eletromagnetismo', 1),
  ((SELECT id FROM s), 'Química: estrutura atômica, tabela periódica, ligações químicas, funções inorgânicas, estequiometria, físico-química e química orgânica', 2);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Matemática e suas Tecnologias', 3 FROM public.contest_templates WHERE nome='Vestibular UEMS' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Conjuntos numéricos, razão, proporção e porcentagem', 0),
  ((SELECT id FROM s), 'Funções: afim, quadrática, modular, exponencial e logarítmica', 1),
  ((SELECT id FROM s), 'Trigonometria e geometria analítica', 2),
  ((SELECT id FROM s), 'Geometria plana e espacial', 3),
  ((SELECT id FROM s), 'Análise combinatória e probabilidade', 4),
  ((SELECT id FROM s), 'Estatística descritiva básica', 5);

-- ===== Vestibular UENP (9 matérias) =====
INSERT INTO public.contest_templates (slug, nome, plano, concurso, tipo, area, cor, status, is_public, scope, institution_type, uf)
VALUES ('vestibular-uenp', 'Vestibular UENP', 'free', 'UENP', 'vestibular', 'Geral', '#2563EB', 'ativo', true, 'estadual', 'publica', 'PR')
ON CONFLICT (slug) DO UPDATE SET nome = EXCLUDED.nome, is_public = true;

DELETE FROM public.contest_template_subjects WHERE template_id = (SELECT id FROM public.contest_templates WHERE nome='Vestibular UENP' AND tipo='vestibular' LIMIT 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Biologia', 0 FROM public.contest_templates WHERE nome='Vestibular UENP' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Composição química da célula e biologia celular', 0),
  ((SELECT id FROM s), 'Reprodução, embriologia e histologia animal e vegetal', 1),
  ((SELECT id FROM s), 'Taxonomia e diversidade dos seres vivos', 2),
  ((SELECT id FROM s), 'Genética clássica e molecular', 3),
  ((SELECT id FROM s), 'Evolução biológica', 4),
  ((SELECT id FROM s), 'Ecologia e meio ambiente', 5);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Física', 1 FROM public.contest_templates WHERE nome='Vestibular UENP' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Mecânica: movimento, leis de Newton, energia, impulso e hidrostática', 0),
  ((SELECT id FROM s), 'Termofísica: calorimetria e termodinâmica', 1),
  ((SELECT id FROM s), 'Óptica e fenômenos ondulatórios', 2),
  ((SELECT id FROM s), 'Eletricidade e magnetismo', 3);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Geografia', 2 FROM public.contest_templates WHERE nome='Vestibular UENP' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Representações cartográficas', 0),
  ((SELECT id FROM s), 'Geografia física: litosfera, atmosfera, hidrosfera e biosfera', 1),
  ((SELECT id FROM s), 'Geografia humana: população, urbanização e sociedade', 2),
  ((SELECT id FROM s), 'Geografia econômica: agricultura, indústria e serviços', 3),
  ((SELECT id FROM s), 'Geopolítica e relações internacionais', 4),
  ((SELECT id FROM s), 'Geografia do Paraná', 5);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'História', 3 FROM public.contest_templates WHERE nome='Vestibular UENP' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'História Antiga e Medieval', 0),
  ((SELECT id FROM s), 'História Moderna: colonização e formação do mundo ocidental', 1),
  ((SELECT id FROM s), 'História Contemporânea: revoluções, conflitos mundiais e nova ordem', 2),
  ((SELECT id FROM s), 'História do Brasil: da colônia à atualidade', 3),
  ((SELECT id FROM s), 'História do Paraná', 4);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Língua Portuguesa e Literatura', 4 FROM public.contest_templates WHERE nome='Vestibular UENP' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Análise e interpretação de textos', 0),
  ((SELECT id FROM s), 'Gramática normativa: morfologia, sintaxe, regência e concordância', 1),
  ((SELECT id FROM s), 'Variação linguística', 2),
  ((SELECT id FROM s), 'Movimentos literários, autores e obras da literatura brasileira', 3);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Língua Estrangeira (Inglês ou Espanhol)', 5 FROM public.contest_templates WHERE nome='Vestibular UENP' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Compreensão de textos', 0),
  ((SELECT id FROM s), 'Aspectos gramaticais e semânticos', 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Matemática', 6 FROM public.contest_templates WHERE nome='Vestibular UENP' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Aritmética e álgebra', 0),
  ((SELECT id FROM s), 'Funções reais', 1),
  ((SELECT id FROM s), 'Geometria (plana, espacial e analítica)', 2),
  ((SELECT id FROM s), 'Estatística, probabilidade e análise combinatória', 3);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Química', 7 FROM public.contest_templates WHERE nome='Vestibular UENP' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Estrutura atômica e propriedades periódicas', 0),
  ((SELECT id FROM s), 'Ligações e reações químicas', 1),
  ((SELECT id FROM s), 'Cálculos químicos e soluções', 2),
  ((SELECT id FROM s), 'Termoquímica, cinética e equilíbrio', 3),
  ((SELECT id FROM s), 'Química orgânica: funções, isomeria e reações', 4);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Filosofia e Sociologia', 8 FROM public.contest_templates WHERE nome='Vestibular UENP' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Mito, ciência e filosofia', 0),
  ((SELECT id FROM s), 'Teoria do conhecimento e ética', 1),
  ((SELECT id FROM s), 'Fundamentos da sociologia, trabalho, classes e movimentos sociais', 2);

-- ===== Vestibular UERR (9 matérias) =====
INSERT INTO public.contest_templates (slug, nome, plano, concurso, tipo, area, cor, status, is_public, scope, institution_type, uf)
VALUES ('vestibular-uerr', 'Vestibular UERR', 'free', 'UERR', 'vestibular', 'Geral', '#2563EB', 'ativo', true, 'estadual', 'publica', 'RR')
ON CONFLICT (slug) DO UPDATE SET nome = EXCLUDED.nome, is_public = true;

DELETE FROM public.contest_template_subjects WHERE template_id = (SELECT id FROM public.contest_templates WHERE nome='Vestibular UERR' AND tipo='vestibular' LIMIT 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Língua Portuguesa', 0 FROM public.contest_templates WHERE nome='Vestibular UERR' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Leitura, compreensão e estruturação textual', 0),
  ((SELECT id FROM s), 'Ortografia oficial, acentuação e pontuação', 1),
  ((SELECT id FROM s), 'Morfologia e sintaxe', 2),
  ((SELECT id FROM s), 'Coesão e coerência', 3),
  ((SELECT id FROM s), 'Figuras de linguagem', 4);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Literatura', 1 FROM public.contest_templates WHERE nome='Vestibular UERR' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Gêneros literários e estilos de época', 0),
  ((SELECT id FROM s), 'História da Literatura Brasileira', 1),
  ((SELECT id FROM s), 'Expressões literárias e autores da região Norte e de Roraima', 2);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Matemática', 2 FROM public.contest_templates WHERE nome='Vestibular UERR' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Operações numéricas, proporcionalidade e porcentagem', 0),
  ((SELECT id FROM s), 'Equações, inequações e funções', 1),
  ((SELECT id FROM s), 'Geometrias: plana, espacial e analítica', 2),
  ((SELECT id FROM s), 'Trigonometria', 3),
  ((SELECT id FROM s), 'Progressões, matrizes e sistemas lineares', 4),
  ((SELECT id FROM s), 'Estatística e probabilidade', 5);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Biologia', 3 FROM public.contest_templates WHERE nome='Vestibular UERR' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Organização da vida, células e tecidos', 0),
  ((SELECT id FROM s), 'Sistemática e diversidade biológica', 1),
  ((SELECT id FROM s), 'Fisiologia dos organismos', 2),
  ((SELECT id FROM s), 'Hereditariedade e genética', 3),
  ((SELECT id FROM s), 'Evolução e ecologia (foco no bioma amazônico e lavrado roraimense)', 4);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Física', 4 FROM public.contest_templates WHERE nome='Vestibular UERR' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Fundamentos de mecânica', 0),
  ((SELECT id FROM s), 'Calor e fenômenos térmicos', 1),
  ((SELECT id FROM s), 'Ondas e óptica', 2),
  ((SELECT id FROM s), 'Eletricidade e conceitos básicos de magnetismo', 3);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Química', 5 FROM public.contest_templates WHERE nome='Vestibular UERR' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Matéria, estrutura atômica e interações', 0),
  ((SELECT id FROM s), 'Compostos inorgânicos e estequiometria', 1),
  ((SELECT id FROM s), 'Físico-química básica', 2),
  ((SELECT id FROM s), 'Princípios de química orgânica', 3);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'História', 6 FROM public.contest_templates WHERE nome='Vestibular UERR' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'História do mundo ocidental e processos de modernização', 0),
  ((SELECT id FROM s), 'História do Brasil', 1),
  ((SELECT id FROM s), 'História de Roraima: ocupação indígena, migrações, criação do estado e dinâmicas fronteiriças', 2);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Geografia', 7 FROM public.contest_templates WHERE nome='Vestibular UERR' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Espaço geográfico mundial e brasileiro', 0),
  ((SELECT id FROM s), 'Dinâmica populacional e econômica', 1),
  ((SELECT id FROM s), 'Cartografia básica', 2),
  ((SELECT id FROM s), 'Geografia de Roraima: aspectos físicos (lavrado e floresta), população, economia e geopolítica local', 3);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Língua Estrangeira (Espanhol ou Inglês)', 8 FROM public.contest_templates WHERE nome='Vestibular UERR' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Compreensão de textos autênticos', 0),
  ((SELECT id FROM s), 'Vocabulário essencial e estruturas sintáticas aplicadas à leitura', 1);
