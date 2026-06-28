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

  // ── 1. Educação ──────────────────────────────────────────────────────────────
  { id: 'grad-pedagogia',                nome: 'Pedagogia',                         area: 'Educação', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-psicopedagogia',           nome: 'Psicopedagogia',                    area: 'Educação', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-educacao-especial',        nome: 'Educação Especial',                 area: 'Educação', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-gestao-educacional',       nome: 'Gestão Educacional',                area: 'Educação', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-design-instrucional',      nome: 'Design Instrucional',               area: 'Educação', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-tecnologias-educacionais', nome: 'Tecnologias Educacionais',          area: 'Educação', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-educacao-campo',           nome: 'Educação do Campo',                 area: 'Educação', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-pedagogia-social',         nome: 'Pedagogia Social',                  area: 'Educação', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-andragogia',               nome: 'Andragogia (Educação de Adultos)',  area: 'Educação', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-neuroeducacao',            nome: 'Neuroeducação',                     area: 'Educação', intent: 'faculdade', imagem_url: '', subjects: [] },

  // ── 2. Artes e Humanidades ───────────────────────────────────────────────────
  { id: 'grad-historia',                 nome: 'História',                          area: 'Artes e Humanidades', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-letras',                   nome: 'Letras (Idiomas e Literatura)',     area: 'Artes e Humanidades', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-filosofia',                nome: 'Filosofia',                         area: 'Artes e Humanidades', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-artes-visuais',            nome: 'Artes Visuais',                     area: 'Artes e Humanidades', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-musica',                   nome: 'Música',                            area: 'Artes e Humanidades', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-teatro',                   nome: 'Teatro e Artes Cênicas',            area: 'Artes e Humanidades', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-cinema',                   nome: 'Cinema e Audiovisual',              area: 'Artes e Humanidades', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-design-interiores',        nome: 'Design de Interiores',              area: 'Artes e Humanidades', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-traducao',                 nome: 'Tradução e Interpretação',          area: 'Artes e Humanidades', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-teologia',                 nome: 'Teologia',                          area: 'Artes e Humanidades', intent: 'faculdade', imagem_url: '', subjects: [] },

  // ── 3. Ciências Sociais, Comunicação e Informação ────────────────────────────
  { id: 'grad-sociologia',               nome: 'Sociologia',                        area: 'Ciências Sociais, Comunicação e Informação', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-antropologia',             nome: 'Antropologia',                      area: 'Ciências Sociais, Comunicação e Informação', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-ciencia-politica',         nome: 'Ciência Política',                  area: 'Ciências Sociais, Comunicação e Informação', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-geografia',                nome: 'Geografia',                         area: 'Ciências Sociais, Comunicação e Informação', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-jornalismo',               nome: 'Jornalismo',                        area: 'Ciências Sociais, Comunicação e Informação', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-publicidade',              nome: 'Publicidade e Propaganda',          area: 'Ciências Sociais, Comunicação e Informação', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-relacoes-publicas',        nome: 'Relações Públicas',                 area: 'Ciências Sociais, Comunicação e Informação', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-relacoes-internacionais',  nome: 'Relações Internacionais',           area: 'Ciências Sociais, Comunicação e Informação', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-museologia',               nome: 'Museologia',                        area: 'Ciências Sociais, Comunicação e Informação', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-biblioteconomia',          nome: 'Biblioteconomia',                   area: 'Ciências Sociais, Comunicação e Informação', intent: 'faculdade', imagem_url: '', subjects: [] },

  // ── 4. Negócios, Administração e Direito ─────────────────────────────────────
  { id: 'grad-administracao',            nome: 'Administração',                     area: 'Negócios, Administração e Direito', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-direito',                  nome: 'Direito',                           area: 'Negócios, Administração e Direito', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-contabeis',                nome: 'Ciências Contábeis',                area: 'Negócios, Administração e Direito', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-economia',                 nome: 'Economia',                          area: 'Negócios, Administração e Direito', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-rh',                       nome: 'Gestão de Recursos Humanos',        area: 'Negócios, Administração e Direito', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-marketing',                nome: 'Marketing',                         area: 'Negócios, Administração e Direito', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-comercio-exterior',        nome: 'Comércio Exterior',                 area: 'Negócios, Administração e Direito', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-gestao-publica',           nome: 'Gestão Pública',                    area: 'Negócios, Administração e Direito', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-logistica',                nome: 'Logística',                         area: 'Negócios, Administração e Direito', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-secretariado',             nome: 'Secretariado Executivo',            area: 'Negócios, Administração e Direito', intent: 'faculdade', imagem_url: '', subjects: [] },

  // ── 5. Ciências Naturais, Matemática e Estatística ───────────────────────────
  { id: 'grad-matematica',               nome: 'Matemática',                        area: 'Ciências Naturais, Matemática e Estatística', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-fisica',                   nome: 'Física',                            area: 'Ciências Naturais, Matemática e Estatística', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-quimica',                  nome: 'Química',                           area: 'Ciências Naturais, Matemática e Estatística', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-ciencias-biologicas',      nome: 'Ciências Biológicas',               area: 'Ciências Naturais, Matemática e Estatística', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-estatistica',              nome: 'Estatística',                       area: 'Ciências Naturais, Matemática e Estatística', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-geologia',                 nome: 'Geologia',                          area: 'Ciências Naturais, Matemática e Estatística', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-oceanografia',             nome: 'Oceanografia',                      area: 'Ciências Naturais, Matemática e Estatística', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-astronomia',               nome: 'Astronomia',                        area: 'Ciências Naturais, Matemática e Estatística', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-meteorologia',             nome: 'Meteorologia',                      area: 'Ciências Naturais, Matemática e Estatística', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-geofisica',                nome: 'Geofísica',                         area: 'Ciências Naturais, Matemática e Estatística', intent: 'faculdade', imagem_url: '', subjects: [] },

  // ── 6. Computação e Tecnologias da Informação e Comunicação (TIC) ────────────
  { id: 'grad-ciencia-computacao',       nome: 'Ciência da Computação',             area: 'Computação e Tecnologias da Informação e Comunicação (TIC)', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-engenharia-software',      nome: 'Engenharia de Software',            area: 'Computação e Tecnologias da Informação e Comunicação (TIC)', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-sistemas-informacao',      nome: 'Sistemas de Informação',            area: 'Computação e Tecnologias da Informação e Comunicação (TIC)', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-ads',                      nome: 'Análise e Desenvolvimento de Sistemas', area: 'Computação e Tecnologias da Informação e Comunicação (TIC)', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-seguranca-informacao',     nome: 'Segurança da Informação',           area: 'Computação e Tecnologias da Informação e Comunicação (TIC)', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-inteligencia-artificial',  nome: 'Inteligência Artificial',           area: 'Computação e Tecnologias da Informação e Comunicação (TIC)', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-banco-dados',              nome: 'Banco de Dados',                    area: 'Computação e Tecnologias da Informação e Comunicação (TIC)', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-redes-computadores',       nome: 'Redes de Computadores',             area: 'Computação e Tecnologias da Informação e Comunicação (TIC)', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-jogos-digitais',           nome: 'Jogos Digitais',                    area: 'Computação e Tecnologias da Informação e Comunicação (TIC)', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-gestao-ti',                nome: 'Gestão da Tecnologia da Informação', area: 'Computação e Tecnologias da Informação e Comunicação (TIC)', intent: 'faculdade', imagem_url: '', subjects: [] },

  // ── 7. Engenharia, Produção e Construção ─────────────────────────────────────
  { id: 'grad-eng-civil',                nome: 'Engenharia Civil',                  area: 'Engenharia, Produção e Construção', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-eng-mecanica',             nome: 'Engenharia Mecânica',               area: 'Engenharia, Produção e Construção', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-eng-eletrica',             nome: 'Engenharia Elétrica',               area: 'Engenharia, Produção e Construção', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-eng-producao',             nome: 'Engenharia de Produção',            area: 'Engenharia, Produção e Construção', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-eng-quimica',              nome: 'Engenharia Química',                area: 'Engenharia, Produção e Construção', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-arquitetura',              nome: 'Arquitetura e Urbanismo',           area: 'Engenharia, Produção e Construção', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-eng-automacao',            nome: 'Engenharia de Controle e Automação', area: 'Engenharia, Produção e Construção', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-eng-materiais',            nome: 'Engenharia de Materiais',           area: 'Engenharia, Produção e Construção', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-eng-ambiental',            nome: 'Engenharia Ambiental',              area: 'Engenharia, Produção e Construção', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-design-produto',           nome: 'Design de Produto',                 area: 'Engenharia, Produção e Construção', intent: 'faculdade', imagem_url: '', subjects: [] },

  // ── 8. Agricultura, Silvicultura, Pesca e Veterinária ────────────────────────
  { id: 'grad-agronomia',                nome: 'Agronomia',                         area: 'Agricultura, Silvicultura, Pesca e Veterinária', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-medicina-veterinaria',     nome: 'Medicina Veterinária',              area: 'Agricultura, Silvicultura, Pesca e Veterinária', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-zootecnia',                nome: 'Zootecnia',                         area: 'Agricultura, Silvicultura, Pesca e Veterinária', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-eng-florestal',            nome: 'Engenharia Florestal',              area: 'Agricultura, Silvicultura, Pesca e Veterinária', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-eng-aquicultura',          nome: 'Engenharia de Aquicultura',         area: 'Agricultura, Silvicultura, Pesca e Veterinária', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-agroindustria',            nome: 'Agroindústria',                     area: 'Agricultura, Silvicultura, Pesca e Veterinária', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-gestao-agronegocio',       nome: 'Gestão do Agronegócio',             area: 'Agricultura, Silvicultura, Pesca e Veterinária', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-horticultura',             nome: 'Horticultura',                      area: 'Agricultura, Silvicultura, Pesca e Veterinária', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-cta',                      nome: 'Ciência e Tecnologia de Alimentos', area: 'Agricultura, Silvicultura, Pesca e Veterinária', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-irrigacao-drenagem',       nome: 'Irrigação e Drenagem',              area: 'Agricultura, Silvicultura, Pesca e Veterinária', intent: 'faculdade', imagem_url: '', subjects: [] },

  // ── 9. Saúde e Bem-estar ─────────────────────────────────────────────────────
  { id: 'grad-medicina',                 nome: 'Medicina',                          area: 'Saúde e Bem-estar', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-enfermagem',               nome: 'Enfermagem',                        area: 'Saúde e Bem-estar', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-fisioterapia',             nome: 'Fisioterapia',                      area: 'Saúde e Bem-estar', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-odontologia',              nome: 'Odontologia',                       area: 'Saúde e Bem-estar', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-psicologia',               nome: 'Psicologia',                        area: 'Saúde e Bem-estar', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-nutricao',                 nome: 'Nutrição',                          area: 'Saúde e Bem-estar', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-farmacia',                 nome: 'Farmácia',                          area: 'Saúde e Bem-estar', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-biomedicina',              nome: 'Biomedicina',                       area: 'Saúde e Bem-estar', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-fonoaudiologia',           nome: 'Fonoaudiologia',                    area: 'Saúde e Bem-estar', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-educacao-fisica',          nome: 'Educação Física',                   area: 'Saúde e Bem-estar', intent: 'faculdade', imagem_url: '', subjects: [] },

  // ── 10. Serviços ─────────────────────────────────────────────────────────────
  { id: 'grad-gastronomia',              nome: 'Gastronomia',                       area: 'Serviços', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-turismo',                  nome: 'Turismo',                           area: 'Serviços', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-hotelaria',                nome: 'Hotelaria',                         area: 'Serviços', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-gestao-eventos',           nome: 'Gestão de Eventos',                 area: 'Serviços', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-seguranca-publica',        nome: 'Segurança Pública',                 area: 'Serviços', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-estetica',                 nome: 'Estética e Cosmética',              area: 'Serviços', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-defesa-gestao',            nome: 'Defesa e Gestão Estratégica',       area: 'Serviços', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-servicos-juridicos',       nome: 'Serviços Jurídicos e Notariais',    area: 'Serviços', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-gestao-cooperativas',      nome: 'Gestão de Cooperativas',            area: 'Serviços', intent: 'faculdade', imagem_url: '', subjects: [] },
  { id: 'grad-seguranca-trabalho',       nome: 'Segurança do Trabalho',             area: 'Serviços', intent: 'faculdade', imagem_url: '', subjects: [] },
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
