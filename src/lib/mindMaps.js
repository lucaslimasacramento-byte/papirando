import { supabase } from './supabase';
import { mindGraphToTopicNodes, normalizeMindGraph } from './mindMapGraph';
import { canonicalizeSubjectName, normalizeSubjectText, resolveSubjectCatalogEntry } from './subjectCatalogUtils';

export const MIND_MAPS_STORAGE_KEY = 'papirando_mind_maps';
export const MIND_MAPS_HISTORY_STORAGE_KEY = 'papirando_mind_maps_history';

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeText(value, fallback = '') {
  return String(value || fallback).trim();
}

function buildTopicNodesFromList(topics = [], fallbackText = '') {
  const normalizedTopics = asArray(topics)
    .map((topic) => {
      if (typeof topic === 'string') {
        return { id: safeText(topic), nome: safeText(topic) };
      }

      return {
        id: topic?.id ? String(topic.id) : safeText(topic?.nome),
        nome: safeText(topic?.nome),
      };
    })
    .filter((topic) => topic.nome);

  if (normalizedTopics.length > 0) {
    return normalizedTopics.slice(0, 8).map((topic, index) => ({
      id: topic.id || `node-${index + 1}`,
      label: topic.nome,
      topicId: topic.id || '',
    }));
  }

  const fragments = safeText(fallbackText)
    .split(/[\n,;|]+/)
    .map((item) => safeText(item))
    .filter(Boolean);

  if (fragments.length > 0) {
    return fragments.slice(0, 8).map((label, index) => ({
      id: `fragment-${index + 1}`,
      label,
      topicId: '',
    }));
  }

  return [
    { id: 'default-1', label: 'Conceitos centrais', topicId: '' },
    { id: 'default-2', label: 'Regras principais', topicId: '' },
    { id: 'default-3', label: 'Excecoes', topicId: '' },
    { id: 'default-4', label: 'Pegadinhas', topicId: '' },
    { id: 'default-5', label: 'Resumo final', topicId: '' },
  ];
}

export function formatMindMapTimestamp(value) {
  if (!value) return 'Sem atividade';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sem atividade';

  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function findContestMatchesForDiscipline(discipline, contestLibrary = [], subjectCatalog = []) {
  if (!discipline) return [];

  const canonicalName = canonicalizeSubjectName(discipline.nome || '', subjectCatalog);
  const normalizedCanonical = normalizeSubjectText(canonicalName);
  const disciplinePlan = safeText(discipline.plano || 'Geral');

  return asArray(contestLibrary).filter((contest) => {
    const samePlan = disciplinePlan && safeText(contest?.plano) === disciplinePlan;
    const subjects = asArray(contest?.disciplinas);

    const hasSubjectMatch = subjects.some((subject) => {
      const subjectName =
        typeof subject === 'string'
          ? subject
          : safeText(subject?.nome || subject?.title);

      return normalizeSubjectText(canonicalizeSubjectName(subjectName, subjectCatalog)) === normalizedCanonical;
    });

    return samePlan || hasSubjectMatch;
  });
}

export function inferMindMapCategory(name, subjectCatalog = []) {
  return resolveSubjectCatalogEntry(name, subjectCatalog)?.area || 'Geral';
}

export function normalizeMindMapRecord(record, context = {}) {
  const {
    bancoDisciplinas = [],
    contestLibrary = [],
    subjectCatalog = [],
  } = context;

  const linkedDiscipline =
    bancoDisciplinas.find((discipline) => String(discipline.id) === String(record?.disciplinaId || '')) || null;

  const disciplineName = canonicalizeSubjectName(
    linkedDiscipline?.nome || record?.disciplinaNome || record?.titulo || '',
    subjectCatalog
  );
  const disciplinaId = linkedDiscipline?.id ?? record?.disciplinaId ?? '';
  const disciplineTopics = asArray(linkedDiscipline?.topicos);
  const preferredTopicIds = new Set(
    asArray(record?.topicoIds).map((item) => String(item)).filter(Boolean)
  );
  const selectedTopics = disciplineTopics.filter((topic) => preferredTopicIds.has(String(topic.id)));
  const fallbackTopics = selectedTopics.length > 0 ? selectedTopics : disciplineTopics.slice(0, 6);
  const contestMatches = linkedDiscipline
    ? findContestMatchesForDiscipline(linkedDiscipline, contestLibrary, subjectCatalog)
    : [];
  const contestIds =
    asArray(record?.contestIds).length > 0
      ? asArray(record.contestIds).map((item) => String(item))
      : contestMatches.map((contest) => String(contest.id));

  const category = safeText(record?.categoria) || inferMindMapCategory(disciplineName, subjectCatalog);

  const mindGraph =
    record?.mindGraph && typeof record.mindGraph === 'object' && Array.isArray(record.mindGraph.nodes) && record.mindGraph.nodes.length > 0
      ? normalizeMindGraph(record.mindGraph, disciplineName || record?.titulo || '')
      : null;

  const nodes = mindGraph
    ? mindGraphToTopicNodes(mindGraph)
    : buildTopicNodesFromList(
        record?.nodes?.length ? record.nodes : fallbackTopics,
        record?.promptBase || record?.resumo || ''
      );

  return {
    id: safeText(record?.id || `map-${Date.now()}`),
    titulo: safeText(record?.titulo || disciplineName || 'Mapa mental'),
    categoria: category,
    disciplinaId: disciplinaId ? String(disciplinaId) : '',
    disciplinaNome: disciplineName || 'Disciplina',
    plano: safeText(linkedDiscipline?.plano || record?.plano || 'Geral'),
    topicoIds: nodes.map((node) => String(node.topicId || '')).filter(Boolean),
    nodes,
    ...(mindGraph ? { mindGraph } : {}),
    contestIds,
    promptBase: safeText(record?.promptBase || ''),
    favorito: Boolean(record?.favorito),
    criadoEm: safeText(record?.criadoEm || new Date().toISOString()),
    atualizadoEm: safeText(record?.atualizadoEm || record?.criadoEm || new Date().toISOString()),
    ultimoAcessoEm: safeText(record?.ultimoAcessoEm || ''),
    totalAberturas: Math.max(0, Number(record?.totalAberturas || 0)),
    sourceType: safeText(record?.sourceType || (linkedDiscipline ? 'discipline' : 'manual') || 'manual'),
  };
}

export function syncMindMapsWithAppData(maps = [], context = {}) {
  return asArray(maps).map((record) => normalizeMindMapRecord(record, context));
}

export function buildSeedMindMaps(bancoDisciplinas = [], contestLibrary = [], subjectCatalog = []) {
  return asArray(bancoDisciplinas)
    .slice(0, 8)
    .map((discipline) => {
      const topicNodes = buildTopicNodesFromList(asArray(discipline.topicos).slice(0, 6));
      const contestIds = findContestMatchesForDiscipline(discipline, contestLibrary, subjectCatalog).map((contest) =>
        String(contest.id)
      );

      return normalizeMindMapRecord(
        {
          id: `seed-${discipline.id}`,
          titulo: discipline.nome,
          categoria: inferMindMapCategory(discipline.nome, subjectCatalog),
          disciplinaId: discipline.id,
          disciplinaNome: discipline.nome,
          plano: discipline.plano || 'Geral',
          topicoIds: topicNodes.map((node) => String(node.topicId || '')).filter(Boolean),
          nodes: topicNodes,
          contestIds,
          promptBase: discipline.nome,
          favorito: false,
          criadoEm: new Date().toISOString(),
          atualizadoEm: new Date().toISOString(),
          ultimoAcessoEm: '',
          totalAberturas: 0,
          sourceType: 'discipline',
        },
        { bancoDisciplinas, contestLibrary, subjectCatalog }
      );
    });
}

export async function loadMindMapsFromSupabase(userId) {
  if (!userId) return [];

  const { data, error } = await supabase
    .from('mind_maps')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) throw error;

  return (Array.isArray(data) ? data : []).map((row) => ({
    ...(row?.dados && typeof row.dados === 'object' ? row.dados : {}),
    id: row?.id,
    titulo: row?.nome || row?.dados?.titulo || 'Mapa mental',
    atualizadoEm: row?.updated_at || row?.dados?.atualizadoEm || new Date().toISOString(),
    criadoEm: row?.created_at || row?.dados?.criadoEm || new Date().toISOString(),
  }));
}

export async function saveMindMapToSupabase(userId, map) {
  if (!userId || !map?.id) return null;

  const payload = {
    id: map.id,
    user_id: userId,
    nome: String(map.title || map.titulo || 'Mapa mental'),
    dados: map,
  };

  const { data, error } = await supabase
    .from('mind_maps')
    .upsert(payload, { onConflict: 'id' })
    .select()
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

export async function deleteMindMapFromSupabase(mapId) {
  if (!mapId) return;

  const { error } = await supabase.from('mind_maps').delete().eq('id', mapId);
  if (error) throw error;
}
