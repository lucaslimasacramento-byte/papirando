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
    imagem_url: template.imagem_url || '',
    origem: template.origem || 'catalogo',
    cor: template.cor || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
    descricao: template.descricao || '',
    tipo: template.tipo || 'concurso',
    is_public: template.is_public !== false,
    storage: template.created_at ? 'supabase' : 'local',
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

// Busca linhas escopadas por uma lista de IDs, em blocos pequenos (.in com poucos
// IDs por request, em pools de `concurrency`). Resolve dois problemas que matavam
// o loader com muitos itens: (a) HTTP 414 (URL gigante quando a lista de IDs é
// grande) e (b) statement timeout — cada query mexe só com as linhas daqueles IDs,
// então a RLS (que faz JOIN por linha) avalia um conjunto pequeno e rápido.
async function fetchByIds(supabase, table, column, ids, { orderColumn, chunkSize = 80, concurrency = 6 } = {}) {
  if (!ids.length) return [];
  const chunks = [];
  for (let i = 0; i < ids.length; i += chunkSize) chunks.push(ids.slice(i, i + chunkSize));

  const out = [];
  for (let i = 0; i < chunks.length; i += concurrency) {
    const batch = chunks.slice(i, i + concurrency).map(async (chunk) => {
      let query = supabase.from(table).select('*').in(column, chunk);
      if (orderColumn) query = query.order(orderColumn, { ascending: true });
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    });
    const results = await Promise.all(batch);
    for (const rows of results) out.push(...rows);
  }

  return out;
}

// Busca e monta templates (com disciplinas/tópicos) filtrando por is_public.
// Reutilizado pelo loader público (is_public=true) e pelo loader de rascunhos
// admin-only (is_public=false). A RLS já garante que só admin enxerga rascunhos.
//
// Disciplinas/tópicos são buscados ESCOPADOS por ID em blocos (fetchByIds) — não
// mais "tudo de uma vez": com 1.500+ concursos e ~27k tópicos, buscar tudo com
// count exato estourava o statement timeout (500) e a tela ficava vazia.
async function fetchAndAssembleTemplates(supabase, isPublic) {
  const templates = await fetchAllRows(supabase, 'contest_templates', {
    applyFilter: (q) => q.eq('is_public', isPublic).order('created_at', { ascending: false }),
  });
  if (!templates.length) return [];

  const templateIds = templates.map((t) => t.id);

  // Disciplinas/tópicos são complementares: se falharem, ainda retornamos os
  // templates — a lista (catálogo/rascunhos) não depende deles; só edição/detalhe.
  let allSubjects = [];
  let allTopics = [];
  try {
    allSubjects = await fetchByIds(supabase, 'contest_template_subjects', 'template_id', templateIds, {
      orderColumn: 'ordem',
    });
    const subjectIds = allSubjects.map((s) => s.id);
    allTopics = await fetchByIds(supabase, 'contest_template_topics', 'subject_id', subjectIds, {
      orderColumn: 'ordem',
    });
  } catch (error) {
    console.warn(
      '[contestCatalog] disciplinas/tópicos indisponíveis — retornando templates sem elas:',
      error?.message || error?.code || 'sem detalhe'
    );
  }

  // tópicos agrupados por subject_id
  const topicsBySubject = new Map();
  for (const topic of allTopics) {
    const list = topicsBySubject.get(topic.subject_id);
    if (list) list.push(topic);
    else topicsBySubject.set(topic.subject_id, [topic]);
  }

  // disciplinas agrupadas por template_id
  const subjectsByTemplate = new Map();
  for (const subject of allSubjects) {
    const list = subjectsByTemplate.get(subject.template_id);
    if (list) list.push(subject);
    else subjectsByTemplate.set(subject.template_id, [subject]);
  }

  return templates.map((template, index) => {
    const disciplinas = (subjectsByTemplate.get(template.id) || []).map((subject, subjectIndex) =>
      normalizeSubject(
        {
          ...subject,
          topicos: topicsBySubject.get(subject.id) || [],
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
}

export async function loadContestCatalogFromSupabase(supabase, fallbackCatalog = []) {
  try {
    return await fetchAndAssembleTemplates(supabase, true);
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
    return await fetchAndAssembleTemplates(supabase, false);
  } catch (error) {
    console.warn(
      '[contestCatalog] não foi possível carregar rascunhos:',
      error?.message || error?.code || 'sem detalhe'
    );
    return [];
  }
}
