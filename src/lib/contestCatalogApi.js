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

// Busca TODAS as linhas de uma tabela, paginando em blocos de 1000 (limite padrão
// do PostgREST). `filter` aplica .eq()/.order() etc. A RLS escopa o que cada
// usuário enxerga (público vê só is_public=true; admin vê tudo).
async function fetchAllRows(supabase, table, { applyFilter, orderColumn } = {}) {
  const PAGE = 1000;
  const build = (withCount) => {
    let query = supabase.from(table).select('*', withCount ? { count: 'exact' } : undefined);
    if (applyFilter) query = applyFilter(query);
    if (orderColumn) query = query.order(orderColumn, { ascending: true });
    return query;
  };

  // 1ª página com count exato → sabemos o total e disparamos o resto em paralelo.
  const first = await build(true).range(0, PAGE - 1);
  if (first.error) throw first.error;
  const rows = first.data || [];
  const total = typeof first.count === 'number' ? first.count : rows.length;
  if (total <= PAGE) return rows;

  const pageRequests = [];
  for (let from = PAGE; from < total; from += PAGE) {
    pageRequests.push(build(false).range(from, from + PAGE - 1));
  }
  const results = await Promise.all(pageRequests);
  for (const result of results) {
    if (result.error) throw result.error;
    rows.push(...(result.data || []));
  }

  return rows;
}

// Busca e monta templates (com disciplinas/tópicos) filtrando por is_public.
// Reutilizado pelo loader público (is_public=true) e pelo loader de rascunhos
// admin-only (is_public=false). A RLS já garante que só admin enxerga rascunhos.
//
// IMPORTANTE: disciplinas/tópicos são buscados SEM `.in(ids)` — com centenas de
// templates a lista de IDs estourava o tamanho da URL (HTTP 414) e o limite de
// 1000 linhas cortava o resto, fazendo o loader cair no fallback local. Agora
// pagina tudo (range) e deixa a RLS escopar; o agrupamento é feito por Map em JS.
async function fetchAndAssembleTemplates(supabase, isPublic) {
  const templates = await fetchAllRows(supabase, 'contest_templates', {
    applyFilter: (q) => q.eq('is_public', isPublic),
    orderColumn: 'created_at',
  });
  if (!templates.length) return [];

  const templateIdSet = new Set(templates.map((t) => t.id));

  const [allSubjects, allTopics] = await Promise.all([
    fetchAllRows(supabase, 'contest_template_subjects', { orderColumn: 'ordem' }),
    fetchAllRows(supabase, 'contest_template_topics', { orderColumn: 'ordem' }),
  ]);

  // tópicos agrupados por subject_id
  const topicsBySubject = new Map();
  for (const topic of allTopics) {
    const list = topicsBySubject.get(topic.subject_id);
    if (list) list.push(topic);
    else topicsBySubject.set(topic.subject_id, [topic]);
  }

  // disciplinas agrupadas por template_id (só dos templates carregados)
  const subjectsByTemplate = new Map();
  for (const subject of allSubjects) {
    if (!templateIdSet.has(subject.template_id)) continue;
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
