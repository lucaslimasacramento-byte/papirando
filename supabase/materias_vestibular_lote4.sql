-- Lote 4: Vestibular CEDERJ + Vestibular FAAP (recriar registro deletado)
-- Bloco A restante: CEFET-MG, CEFET-RJ, ESPM, Belas Artes, Feevale, FGV Direito SP, FGV EAESP, FGV EPGE — sem programa próprio (usar ENEM/SiSU), deletar do catálogo.

-- ===== Vestibular CEDERJ (6 matérias) =====
DELETE FROM public.contest_template_subjects WHERE template_id = (SELECT id FROM public.contest_templates WHERE nome='Vestibular CEDERJ' AND tipo='vestibular' LIMIT 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Física', 0 FROM public.contest_templates WHERE nome='Vestibular CEDERJ' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Conceitos de massa e de força.', 0),
  ((SELECT id FROM s), 'Referencial inercial e leis de Newton.', 1),
  ((SELECT id FROM s), 'Momento linear, impulso e conservação do momento linear.', 2),
  ((SELECT id FROM s), 'Interação gravitacional e queda dos corpos.', 3),
  ((SELECT id FROM s), 'Equilíbrio térmico e Termodinâmica.', 4),
  ((SELECT id FROM s), 'Dilatação térmica e calorimetria.', 5),
  ((SELECT id FROM s), 'Fenômenos ondulatórios e Óptica.', 6);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Geografia', 1 FROM public.contest_templates WHERE nome='Vestibular CEDERJ' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'A produção do espaço e a relação sociedade/natureza.', 0),
  ((SELECT id FROM s), 'Formas e estruturas do relevo terrestre.', 1),
  ((SELECT id FROM s), 'Conjuntos climato-botânicos.', 2),
  ((SELECT id FROM s), 'Águas oceânicas e continentais.', 3);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'História', 2 FROM public.contest_templates WHERE nome='Vestibular CEDERJ' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Expansão marítima e comercial, Estado Moderno e Absolutismo.', 0),
  ((SELECT id FROM s), 'Mercantilismo e antigos sistemas coloniais.', 1),
  ((SELECT id FROM s), 'Revoluções burguesas, fisiocracia e liberalismo.', 2),
  ((SELECT id FROM s), 'Liberalismo e nacionalismo no século XIX.', 3),
  ((SELECT id FROM s), 'Expansão norte-americana.', 4),
  ((SELECT id FROM s), 'Crise da sociedade liberal: guerras mundiais, revoluções sociais, fascismos e Grande Depressão de 1929.', 5),
  ((SELECT id FROM s), 'A sociedade capitalista atual, Guerra Fria e descolonização afro-asiática.', 6);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Língua Portuguesa', 3 FROM public.contest_templates WHERE nome='Vestibular CEDERJ' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Língua falada e escrita.', 0),
  ((SELECT id FROM s), 'Uso informal e formal da língua.', 1),
  ((SELECT id FROM s), 'Adequação ao contexto e sistema ortográfico vigente.', 2),
  ((SELECT id FROM s), 'Escrita e interpretação de diferentes gêneros textuais.', 3);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Matemática', 4 FROM public.contest_templates WHERE nome='Vestibular CEDERJ' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Teorema fundamental da álgebra.', 0),
  ((SELECT id FROM s), 'Sequências e progressões (aritméticas e geométricas).', 1),
  ((SELECT id FROM s), 'Análise combinatória e princípio fundamental da contagem.', 2);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Química', 5 FROM public.contest_templates WHERE nome='Vestibular CEDERJ' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Elétrons como onda e Princípio da Incerteza de Heisenberg.', 0),
  ((SELECT id FROM s), 'Teoria quântica e modelo atômico de Bohr.', 1),
  ((SELECT id FROM s), 'Configurações eletrônicas e tabela periódica.', 2),
  ((SELECT id FROM s), 'Classificação dos elementos.', 3),
  ((SELECT id FROM s), 'Forças intermoleculares (momento dipolar, forças de London, ligações de hidrogênio).', 4),
  ((SELECT id FROM s), 'Teoria cinético-molecular dos líquidos e sólidos.', 5);

-- ===== Vestibular FAAP — recriar registro + inserir matérias (4 matérias) =====
-- Recria o template deletado por engano
INSERT INTO public.contest_templates (slug, nome, plano, concurso, tipo, area, cor, status, is_public, scope, institution_type, uf)
VALUES ('vestibular-faap', 'Vestibular FAAP', 'free', 'FAAP', 'vestibular', 'Geral', '#2563EB', 'ativo', true, 'estadual', 'privada', 'SP')
ON CONFLICT (slug) DO UPDATE SET nome = EXCLUDED.nome, is_public = true;

DELETE FROM public.contest_template_subjects WHERE template_id = (SELECT id FROM public.contest_templates WHERE nome='Vestibular FAAP' AND tipo='vestibular' LIMIT 1);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Língua Portuguesa', 0 FROM public.contest_templates WHERE nome='Vestibular FAAP' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Compreensão e Interpretação de textos literários e não literários.', 0),
  ((SELECT id FROM s), 'Ortografia e Acentuação Gráfica.', 1),
  ((SELECT id FROM s), 'Análise Morfológica e Análise Sintática.', 2),
  ((SELECT id FROM s), 'Sintaxe de Concordância, Regência e Colocação.', 3),
  ((SELECT id FROM s), 'Figuras de Linguagem.', 4);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Matemática', 1 FROM public.contest_templates WHERE nome='Vestibular FAAP' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Conjuntos Numéricos e operações com intervalos na reta real.', 0),
  ((SELECT id FROM s), 'Função Afim, Quadrática e Modular.', 1),
  ((SELECT id FROM s), 'Progressões aritméticas e geométricas.', 2),
  ((SELECT id FROM s), 'Trigonometria e Funções trigonométricas.', 3),
  ((SELECT id FROM s), 'Função exponencial e logarítmica.', 4),
  ((SELECT id FROM s), 'Matrizes e determinantes.', 5),
  ((SELECT id FROM s), 'Análise combinatória: Arranjos, Permutações e Combinações.', 6),
  ((SELECT id FROM s), 'Polinômios e equações algébricas.', 7),
  ((SELECT id FROM s), 'Geometria plana: polígonos, círculo, áreas.', 8),
  ((SELECT id FROM s), 'Principais sólidos geométricos e volumes.', 9),
  ((SELECT id FROM s), 'Geometria analítica: estudo da reta e da circunferência.', 10),
  ((SELECT id FROM s), 'Razões, proporções e juros.', 11);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Geografia', 2 FROM public.contest_templates WHERE nome='Vestibular FAAP' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Dinâmica Natural: Climatologia, Geomorfologia, Hidrografia, Biogeografia e Ecologia.', 0),
  ((SELECT id FROM s), 'Os grandes domínios naturais.', 1),
  ((SELECT id FROM s), 'Dinâmica Populacional: evolução demográfica, estrutura da população e mobilidade espacial.', 2),
  ((SELECT id FROM s), 'Dinâmica Urbana: características das cidades, urbanização e metropolização.', 3),
  ((SELECT id FROM s), 'Dinâmica Econômica: agricultura, fontes de energia e industrialização.', 4),
  ((SELECT id FROM s), 'A nova economia.', 5),
  ((SELECT id FROM s), 'Geopolítica e Globalização.', 6),
  ((SELECT id FROM s), 'Atualidades.', 7);
WITH s AS (INSERT INTO public.contest_template_subjects (template_id, nome, ordem) SELECT id, 'Língua Inglesa', 3 FROM public.contest_templates WHERE nome='Vestibular FAAP' AND tipo='vestibular' LIMIT 1 RETURNING id)
INSERT INTO public.contest_template_topics (subject_id, nome, ordem) VALUES
  ((SELECT id FROM s), 'Compreensão de textos em língua inglesa extraídos de jornais, revistas e publicações recentes.', 0),
  ((SELECT id FROM s), 'Assuntos gerais da atualidade.', 1);
