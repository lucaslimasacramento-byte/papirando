export const DEFAULT_COURSE_TEMPLATES = [
  // ── Vestibulares — Nacionais ─────────────────────────────────────────────────
  {
    id: 'vestibular-enem',
    nome: 'Vestibular / ENEM',
    area: 'Nacional',
    intent: 'vestibular',
    imagem_url: '',
    subjects: [
      { nome: 'Linguagens', topicos: ['Interpretacao de texto', 'Literatura', 'Generos textuais'] },
      { nome: 'Matematica', topicos: ['Funcoes', 'Geometria', 'Estatistica'] },
      { nome: 'Ciencias Humanas', topicos: ['Historia', 'Geografia', 'Sociologia e filosofia'] },
      { nome: 'Ciencias da Natureza', topicos: ['Biologia', 'Quimica', 'Fisica'] },
      { nome: 'Redacao', topicos: ['Repertorio', 'Estrutura dissertativa', 'Proposta de intervencao'] },
    ],
  },

  // ── Vestibulares — Bahia ─────────────────────────────────────────────────────
  { id: 'vest-uneb',    nome: 'UNEB — Universidade do Estado da Bahia',              area: 'Bahia', intent: 'vestibular', imagem_url: '', subjects: [] },
  { id: 'vest-uesb',    nome: 'UESB — Universidade Estadual do Sudoeste da Bahia',   area: 'Bahia', intent: 'vestibular', imagem_url: '', subjects: [] },
  { id: 'vest-uefs',    nome: 'UEFS — Universidade Estadual de Feira de Santana',    area: 'Bahia', intent: 'vestibular', imagem_url: '', subjects: [] },
  { id: 'vest-uesc',    nome: 'UESC — Universidade Estadual de Santa Cruz',          area: 'Bahia', intent: 'vestibular', imagem_url: '', subjects: [] },
  { id: 'vest-ifba',    nome: 'IFBA — Instituto Federal da Bahia',                   area: 'Bahia', intent: 'vestibular', imagem_url: '', subjects: [] },
  { id: 'vest-ifbaiano', nome: 'IF Baiano — Instituto Federal Baiano',              area: 'Bahia', intent: 'vestibular', imagem_url: '', subjects: [] },
  { id: 'vest-ucsal',   nome: 'UCSal — Universidade Catolica do Salvador',           area: 'Bahia', intent: 'vestibular', imagem_url: '', subjects: [] },
  { id: 'vest-unifacs', nome: 'UNIFACS — Universidade Salvador',                     area: 'Bahia', intent: 'vestibular', imagem_url: '', subjects: [] },
  { id: 'vest-bahiana', nome: 'Bahiana — Escola Bahiana de Medicina e Saude Publica', area: 'Bahia', intent: 'vestibular', imagem_url: '', subjects: [] },

  // ── Tecnologia / TI ─────────────────────────────────────────────────────────
  { id: 'grad-ciencia-computacao',       nome: 'Ciencia da Computacao',             area: 'Tecnologia', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-engenharia-software',      nome: 'Engenharia de Software',            area: 'Tecnologia', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-sistemas-informacao',      nome: 'Sistemas de Informacao',            area: 'Tecnologia', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-ads',                      nome: 'Analise e Desenvolvimento de Sistemas', area: 'Tecnologia', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-engenharia-computacao',    nome: 'Engenharia da Computacao',          area: 'Tecnologia', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-seguranca-informacao',     nome: 'Seguranca da Informacao',           area: 'Tecnologia', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-ciencia-dados',            nome: 'Ciencia de Dados',                  area: 'Tecnologia', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-inteligencia-artificial',  nome: 'Inteligencia Artificial',           area: 'Tecnologia', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-redes-computadores',       nome: 'Redes de Computadores',             area: 'Tecnologia', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-jogos-digitais',           nome: 'Jogos Digitais',                    area: 'Tecnologia', intent: 'faculdade', imagem_url: '', subjects: [] },

  // ── Saude ────────────────────────────────────────────────────────────────────
  { id: 'grad-medicina',                 nome: 'Medicina',                          area: 'Saude', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-enfermagem',               nome: 'Enfermagem',                        area: 'Saude', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-psicologia',               nome: 'Psicologia',                        area: 'Saude', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-fisioterapia',             nome: 'Fisioterapia',                      area: 'Saude', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-nutricao',                 nome: 'Nutricao',                          area: 'Saude', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-farmacia',                 nome: 'Farmacia',                          area: 'Saude', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-odontologia',              nome: 'Odontologia',                       area: 'Saude', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-biomedicina',              nome: 'Biomedicina',                       area: 'Saude', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-educacao-fisica',          nome: 'Educacao Fisica',                   area: 'Saude', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-terapia-ocupacional',      nome: 'Terapia Ocupacional',               area: 'Saude', intent: 'faculdade', imagem_url: '', subjects: [] },

  // ── Negocios / Administracao ─────────────────────────────────────────────────
  { id: 'grad-administracao',            nome: 'Administracao',                     area: 'Negocios', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-contabilidade',            nome: 'Ciencias Contabeis',                area: 'Negocios', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-economia',                 nome: 'Economia',                          area: 'Negocios', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-gestao-comercial',         nome: 'Gestao Comercial',                  area: 'Negocios', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-gestao-financeira',        nome: 'Gestao Financeira',                 area: 'Negocios', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-marketing',                nome: 'Marketing',                         area: 'Negocios', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-comercio-exterior',        nome: 'Comercio Exterior',                 area: 'Negocios', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-logistica',                nome: 'Logistica',                         area: 'Negocios', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-rh',                       nome: 'Recursos Humanos',                  area: 'Negocios', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-processos-gerenciais',     nome: 'Processos Gerenciais',              area: 'Negocios', intent: 'faculdade', imagem_url: '', subjects: [] },

  // ── Engenharia ───────────────────────────────────────────────────────────────
  { id: 'grad-eng-civil',                nome: 'Engenharia Civil',                  area: 'Engenharia', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-eng-mecanica',             nome: 'Engenharia Mecanica',               area: 'Engenharia', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-eng-eletrica',             nome: 'Engenharia Eletrica',               area: 'Engenharia', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-eng-producao',             nome: 'Engenharia de Producao',            area: 'Engenharia', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-eng-quimica',              nome: 'Engenharia Quimica',                area: 'Engenharia', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-eng-ambiental',            nome: 'Engenharia Ambiental',              area: 'Engenharia', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-eng-automacao',            nome: 'Engenharia de Controle e Automacao', area: 'Engenharia', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-eng-petroleo',             nome: 'Engenharia de Petroleo',            area: 'Engenharia', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-eng-aeroespacial',         nome: 'Engenharia Aeroespacial',           area: 'Engenharia', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-eng-biomedica',            nome: 'Engenharia Biomedica',              area: 'Engenharia', intent: 'faculdade', imagem_url: '', subjects: [] },

  // ── Direito e Ciencias Sociais ───────────────────────────────────────────────
  { id: 'grad-direito',                  nome: 'Direito',                           area: 'Direito e Sociais', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-servico-social',           nome: 'Servico Social',                    area: 'Direito e Sociais', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-relacoes-internacionais',  nome: 'Relacoes Internacionais',           area: 'Direito e Sociais', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-ciencia-politica',         nome: 'Ciencia Politica',                  area: 'Direito e Sociais', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-sociologia',               nome: 'Sociologia',                        area: 'Direito e Sociais', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-antropologia',             nome: 'Antropologia',                      area: 'Direito e Sociais', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-criminologia',             nome: 'Criminologia',                      area: 'Direito e Sociais', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-gestao-publica',           nome: 'Gestao Publica',                    area: 'Direito e Sociais', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-seguranca-publica',        nome: 'Seguranca Publica',                 area: 'Direito e Sociais', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-diplomacia',               nome: 'Diplomacia e Estudos Globais',      area: 'Direito e Sociais', intent: 'faculdade', imagem_url: '', subjects: [] },

  // ── Educacao e Licenciaturas ─────────────────────────────────────────────────
  { id: 'grad-pedagogia',                nome: 'Pedagogia',                         area: 'Educacao', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-letras',                   nome: 'Letras',                            area: 'Educacao', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-historia',                 nome: 'Historia',                          area: 'Educacao', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-geografia',                nome: 'Geografia',                         area: 'Educacao', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-matematica-lic',           nome: 'Matematica',                        area: 'Educacao', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-fisica-lic',               nome: 'Fisica',                            area: 'Educacao', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-quimica-lic',              nome: 'Quimica',                           area: 'Educacao', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-biologia-lic',             nome: 'Biologia',                          area: 'Educacao', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-filosofia',                nome: 'Filosofia',                         area: 'Educacao', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-educacao-especial',        nome: 'Educacao Especial',                 area: 'Educacao', intent: 'faculdade', imagem_url: '', subjects: [] },

  // ── Comunicacao e Midia ──────────────────────────────────────────────────────
  { id: 'grad-jornalismo',               nome: 'Jornalismo',                        area: 'Comunicacao', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-publicidade',              nome: 'Publicidade e Propaganda',          area: 'Comunicacao', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-cinema',                   nome: 'Cinema e Audiovisual',              area: 'Comunicacao', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-radio-tv',                 nome: 'Radio, TV e Internet',              area: 'Comunicacao', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-producao-multimidia',      nome: 'Producao Multimidia',               area: 'Comunicacao', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-relacoes-publicas',        nome: 'Relacoes Publicas',                 area: 'Comunicacao', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-design-grafico',           nome: 'Design Grafico',                    area: 'Comunicacao', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-marketing-digital',        nome: 'Marketing Digital',                 area: 'Comunicacao', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-fotografia',               nome: 'Fotografia',                        area: 'Comunicacao', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-comunicacao-social',       nome: 'Comunicacao Social',                area: 'Comunicacao', intent: 'faculdade', imagem_url: '', subjects: [] },

  // ── Arquitetura, Design e Artes ──────────────────────────────────────────────
  { id: 'grad-arquitetura',              nome: 'Arquitetura e Urbanismo',           area: 'Artes e Design', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-design-produto',           nome: 'Design de Produto',                 area: 'Artes e Design', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-design-interiores',        nome: 'Design de Interiores',              area: 'Artes e Design', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-moda',                     nome: 'Moda',                              area: 'Artes e Design', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-artes-visuais',            nome: 'Artes Visuais',                     area: 'Artes e Design', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-musica',                   nome: 'Musica',                            area: 'Artes e Design', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-teatro',                   nome: 'Teatro',                            area: 'Artes e Design', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-danca',                    nome: 'Danca',                             area: 'Artes e Design', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-design-games',             nome: 'Design de Games',                   area: 'Artes e Design', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-animacao',                 nome: 'Animacao',                          area: 'Artes e Design', intent: 'faculdade', imagem_url: '', subjects: [] },

  // ── Agrarias e Meio Ambiente ─────────────────────────────────────────────────
  { id: 'grad-agronomia',                nome: 'Agronomia',                         area: 'Agrarias', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-medicina-veterinaria',     nome: 'Medicina Veterinaria',              area: 'Agrarias', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-zootecnia',                nome: 'Zootecnia',                         area: 'Agrarias', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-eng-florestal',            nome: 'Engenharia Florestal',              area: 'Agrarias', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-eng-agricola',             nome: 'Engenharia Agricola',               area: 'Agrarias', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-gestao-ambiental',         nome: 'Gestao Ambiental',                  area: 'Agrarias', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-oceanografia',             nome: 'Oceanografia',                      area: 'Agrarias', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-agroecologia',             nome: 'Agroecologia',                      area: 'Agrarias', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-ciencias-biologicas',      nome: 'Ciencias Biologicas',               area: 'Agrarias', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-recursos-hidricos',        nome: 'Recursos Hidricos',                 area: 'Agrarias', intent: 'faculdade', imagem_url: '', subjects: [] },

  // ── Ciencias Exatas e Pesquisa ───────────────────────────────────────────────
  { id: 'grad-fisica',                   nome: 'Fisica',                            area: 'Exatas e Pesquisa', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-matematica',               nome: 'Matematica',                        area: 'Exatas e Pesquisa', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-estatistica',              nome: 'Estatistica',                       area: 'Exatas e Pesquisa', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-quimica',                  nome: 'Quimica',                           area: 'Exatas e Pesquisa', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-astronomia',               nome: 'Astronomia',                        area: 'Exatas e Pesquisa', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-ciencia-dados-exatas',     nome: 'Ciencia de Dados',                  area: 'Exatas e Pesquisa', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-atuaria',                  nome: 'Atuaria',                           area: 'Exatas e Pesquisa', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-nanotecnologia',           nome: 'Nanotecnologia',                    area: 'Exatas e Pesquisa', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-geofisica',                nome: 'Geofisica',                         area: 'Exatas e Pesquisa', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-computacao-cientifica',    nome: 'Computacao Cientifica',             area: 'Exatas e Pesquisa', intent: 'faculdade', imagem_url: '', subjects: [] },
];

export function normalizeCourseTemplate(template, index = 0) {
  const id = String(template?.id || template?.slug || `curso-template-${index + 1}`).trim();
  const nome = String(template?.nome || template?.name || '').trim();
  const area = String(template?.area || 'Geral').trim();
  const intent = ['faculdade', 'vestibular', 'livre'].includes(String(template?.intent || '').trim())
    ? String(template.intent).trim()
    : 'faculdade';
  const subjects = (Array.isArray(template?.subjects) ? template.subjects : template?.disciplinas || [])
    .map((subject, subjectIndex) => ({
      nome: String(subject?.nome || subject?.name || `Disciplina ${subjectIndex + 1}`).trim(),
      topicos: (Array.isArray(subject?.topicos) ? subject.topicos : subject?.topics || [])
        .map((topic) => String(typeof topic === 'string' ? topic : topic?.nome || '').trim())
        .filter(Boolean),
    }))
    .filter((subject) => subject.nome);

  return {
    id: id || `curso-template-${index + 1}`,
    nome,
    area: area || 'Geral',
    intent,
    imagem_url: String(template?.imagem_url || '').trim(),
    subjects,
  };
}

export function normalizeCourseTemplates(input) {
  // null / nao-array → sem dado salvo → mostra DEFAULT como ponto de partida
  // array vazio [] → usuario apagou tudo intencionalmente → respeita []
  // array nao-vazio → normaliza cada item
  if (!Array.isArray(input)) return DEFAULT_COURSE_TEMPLATES.map(normalizeCourseTemplate);
  return input.map(normalizeCourseTemplate);
}
