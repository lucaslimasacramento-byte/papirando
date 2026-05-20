import { normalizeContestStatus } from './contestGrouping';

const DEFAULT_COLORS = ['#1d4ed8', '#4d7c3f', '#b45309', '#8B5CF6', '#EC4899', '#14B8A6'];

function parseArrayField(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];

  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeTopic(topic, index) {
  if (typeof topic === 'string') {
    return {
      id: `topic-${index}`,
      nome: topic,
      ordem: index,
    };
  }

  return {
    id: topic.id || `topic-${index}`,
    nome: topic.nome,
    ordem: Number(topic.ordem ?? index),
  };
}

function normalizeSubject(subject, index) {
  if (typeof subject === 'string') {
    return {
      id: `subject-${index}`,
      nome: subject,
      ordem: index,
      cor: DEFAULT_COLORS[index % DEFAULT_COLORS.length],
      topicos: [],
    };
  }

  const topicos = Array.isArray(subject.topicos)
    ? subject.topicos.map((topic, topicIndex) => normalizeTopic(topic, topicIndex))
    : [];

  return {
    id: subject.id || `subject-${index}`,
    nome: subject.nome,
    subject_catalog_id: subject.subject_catalog_id || null,
    ordem: Number(subject.ordem ?? index),
    cor: subject.cor || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
    topicos,
  };
}

export function normalizeContestTemplate(template, index = 0) {
  const disciplinas = Array.isArray(template.disciplinas)
    ? template.disciplinas.map((subject, subjectIndex) => normalizeSubject(subject, subjectIndex))
    : [];

  return {
    id: template.id || `template-${index}`,
    slug: template.slug || template.id || `template-${index}`,
    nome: template.nome,
    plano: template.plano || template.nome,
    concurso: template.concurso || template.nome,
    area: template.area || 'Geral',
    cargo: template.cargo || '',
    banca: template.banca || 'A definir',
    salario: template.salario || '',
    inscricao_valor: template.inscricao_valor || '',
    escolaridade: template.escolaridade || '',
    vagas: template.vagas || '',
    lotacao: template.lotacao || '',
    etapas: template.etapas || '',
    etapas_tags: parseArrayField(template.etapas_tags),
    taf_itens: parseArrayField(template.taf_itens),
    status: template.status || 'ativo',
    status_concurso: normalizeContestStatus(template.status_concurso || 'edital_publicado'),
    prova_data: template.prova_data || '',
    edital_url: template.edital_url || '',
    imagem_url: template.imagem_url || '',
    origem: template.origem || 'catalogo',
    cor: template.cor || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
    descricao: template.descricao || '',
    is_public: template.is_public !== false,
    storage: template.created_at ? 'supabase' : 'local',
    disciplinas,
  };
}

export async function loadContestCatalogFromSupabase(supabase, fallbackCatalog = []) {
  try {
    const { data: templates, error: templatesError } = await supabase
      .from('contest_templates')
      .select('*')
      .eq('is_public', true)
      .order('created_at', { ascending: false });

    if (templatesError) throw templatesError;
    if (!templates || templates.length === 0) {
      return [];
    }

    const templateIds = templates.map((template) => template.id);

    const { data: subjects, error: subjectsError } = await supabase
      .from('contest_template_subjects')
      .select('*')
      .in('template_id', templateIds)
      .order('ordem', { ascending: true });

    if (subjectsError) throw subjectsError;

    const subjectIds = (subjects || []).map((subject) => subject.id);
    let topics = [];

    if (subjectIds.length > 0) {
      const { data: topicRows, error: topicsError } = await supabase
        .from('contest_template_topics')
        .select('*')
        .in('subject_id', subjectIds)
        .order('ordem', { ascending: true });

      if (topicsError) throw topicsError;
      topics = topicRows || [];
    }

    return templates.map((template, index) => {
      const disciplinas = (subjects || [])
        .filter((subject) => subject.template_id === template.id)
        .map((subject, subjectIndex) =>
          normalizeSubject(
            {
              ...subject,
              topicos: topics.filter((topic) => topic.subject_id === subject.id),
            },
            subjectIndex
          )
        );

      return normalizeContestTemplate(
        {
          ...template,
          disciplinas,
        },
        index
      );
    });
  } catch (error) {
    console.warn(
      '[contestCatalog] usando catálogo local (Supabase indisponível no momento):',
      error?.message || error?.code || 'sem detalhe'
    );
    return fallbackCatalog.map((template, index) => normalizeContestTemplate(template, index));
  }
}
