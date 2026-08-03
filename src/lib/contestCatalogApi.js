import { normalizeContestStatus } from './contestGrouping';

const DEFAULT_COLORS = ['#1e3a5f', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6'];

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
    // Pre-edital: conteudo programatico veio do edital ANTERIOR e pode mudar quando o
    // novo sair. A tela precisa avisar o aluno — ver docs/CATALOGO-ESTRATEGIA.md.
    conteudo_provisorio: template.conteudo_provisorio === true,
    conteudo_fonte_url: template.conteudo_fonte_url || '',
    imagem_url: template.imagem_url || '',
    origem: template.origem || 'catalogo',
    cor: template.cor || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
    descricao: template.descricao || '',
    tipo: template.tipo || 'concurso',
    is_public: template.is_public !== false,
    storage: template.created_at ? 'supabase' : 'local',
    // Campos do modelo de vestibulares (híbrido). Ausentes em concursos/legado.
    uf: template.uf || null,
    scope: template.scope || null,
    modality: template.modality || null,
    institution_type: template.institution_type || null,
    registration_start: template.registration_start || null,
    registration_end: template.registration_end || null,
    meta: template.meta && typeof template.meta === 'object' ? template.meta : {},
    // Contagem denormalizada (trigger no banco) — a lista vem sem disciplinas,
    // então o card usa subjects_count para mostrar o total sem carregá-las.
    subjects_count: Number(template.subjects_count ?? (Array.isArray(disciplinas) ? disciplinas.length : 0)) || 0,
    disciplinas,
  };
}

// Busca todas as linhas aplicando um filtro, paginando em blocos de 1000.
// SEM `count: 'exact'`: em tabelas grandes com RLS o count varre a tabela inteira
// e estoura o statement timeout. Para quando a página vem curta.
async function fetchAllRows(supabase, table, { applyFilter } = {}) {
  const PAGE = 1000;
  const out = [];
  let from = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    let query = supabase.from(table).select('*');
    if (applyFilter) query = applyFilter(query);
    const { data, error } = await query.range(from, from + PAGE - 1);
    if (error) throw error;
    const rows = data || [];
    out.push(...rows);
    if (rows.length < PAGE) break;
    from += PAGE;
  }

  return out;
}

// Monta a LISTA filtrando por is_public — SÓ templates, SEM disciplinas/tópicos.
// Decisão arquitetural (def.): com 1.500+ concursos e ~27k tópicos, carregar
// disciplinas/tópicos junto da lista (mesmo escopado/paginado) estourava o
// statement timeout da RLS (500) E o lock de auth do supabase-js (muitos requests
// concorrentes → "Lock not released" → AbortError → fallback). A lista não precisa
// deles. Disciplinas/tópicos carregam SOB DEMANDA via loadContestTemplateContent
// quando um concurso é aberto pra editar/ver.
async function fetchTemplatesList(supabase, isPublic) {
  const templates = await fetchAllRows(supabase, 'contest_templates', {
    applyFilter: (q) => q.eq('is_public', isPublic).order('created_at', { ascending: false }),
  });
  return templates.map((template, index) =>
    normalizeContestTemplate({ ...template, disciplinas: [] }, index)
  );
}

// Carrega as disciplinas/tópicos de UM template (sob demanda). Consulta pequena
// (eq por template_id, in pelos poucos subject_ids) — rápida, sem timeout/lock.
export async function loadContestTemplateContent(supabase, templateId) {
  if (!templateId) return [];

  const { data: subjects, error: subjectsError } = await supabase
    .from('contest_template_subjects')
    .select('*')
    .eq('template_id', templateId)
    .order('ordem', { ascending: true });
  if (subjectsError) throw subjectsError;

  const subjectRows = subjects || [];
  const subjectIds = subjectRows.map((s) => s.id);
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

  return subjectRows.map((subject, index) =>
    normalizeSubject(
      { ...subject, topicos: topics.filter((t) => t.subject_id === subject.id) },
      index
    )
  );
}

export async function loadContestCatalogFromSupabase(supabase, fallbackCatalog = []) {
  try {
    return await fetchTemplatesList(supabase, true);
  } catch (error) {
    console.warn(
      '[contestCatalog] usando catálogo local (Supabase indisponível no momento):',
      error?.message || error?.code || 'sem detalhe'
    );
    return fallbackCatalog.map((template, index) => normalizeContestTemplate(template, index));
  }
}

// Carrega os rascunhos (is_public=false). Só retorna dados para admin — para os
// demais usuários a RLS devolve lista vazia. Não tem fallback local: rascunho
// só existe no Supabase.
export async function loadContestDraftsFromSupabase(supabase) {
  try {
    return await fetchTemplatesList(supabase, false);
  } catch (error) {
    console.warn(
      '[contestCatalog] não foi possível carregar rascunhos:',
      error?.message || error?.code || 'sem detalhe'
    );
    return [];
  }
}
