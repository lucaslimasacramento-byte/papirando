import { supabase } from './supabase';
import { normalizeMindMapRecord } from './mindMaps';

function isMissingMindMapsSchema(error) {
  const code = String(error?.code || error?.status || '');
  return code === '42P01' || code === '42703';
}

function asStringArray(value) {
  return Array.isArray(value) ? value.map((item) => String(item)).filter(Boolean) : [];
}

function toMapRow(map, userId) {
  return {
    user_id: userId,
    record_key: `map:${String(map.id || '')}`,
    record_type: 'map',
    title: String(map.titulo || ''),
    category: String(map.categoria || 'Geral'),
    discipline_id: String(map.disciplinaId || ''),
    discipline_name: String(map.disciplinaNome || ''),
    plan: String(map.plano || 'Geral'),
    topic_ids: asStringArray(map.topicoIds),
    nodes: Array.isArray(map.nodes) ? map.nodes : [],
    contest_ids: asStringArray(map.contestIds),
    prompt_base: String(map.promptBase || ''),
    favorite: Boolean(map.favorito),
    opened_count: Math.max(0, Number(map.totalAberturas || 0)),
    source_type: String(map.sourceType || 'manual'),
    action: '',
    timestamp: null,
    payload: {},
    created_at: map.criadoEm || new Date().toISOString(),
    updated_at: map.atualizadoEm || new Date().toISOString(),
  };
}

function toHistoryRow(item, userId) {
  return {
    user_id: userId,
    record_key: `history:${String(item.id || '')}`,
    record_type: 'history',
    title: String(item.titulo || ''),
    category: '',
    discipline_id: '',
    discipline_name: '',
    plan: '',
    topic_ids: [],
    nodes: [],
    contest_ids: [],
    prompt_base: '',
    favorite: false,
    opened_count: 0,
    source_type: 'history',
    action: String(item.action || ''),
    timestamp: item.timestamp || new Date().toISOString(),
    payload: {
      id: String(item.id || ''),
      mapId: String(item.mapId || ''),
      titulo: String(item.titulo || ''),
      action: String(item.action || ''),
      timestamp: item.timestamp || new Date().toISOString(),
    },
    created_at: item.timestamp || new Date().toISOString(),
    updated_at: item.timestamp || new Date().toISOString(),
  };
}

function toStateRow(activeMapId, userId) {
  return {
    user_id: userId,
    record_key: 'state:active-map',
    record_type: 'state',
    title: 'active-map',
    category: '',
    discipline_id: '',
    discipline_name: '',
    plan: '',
    topic_ids: [],
    nodes: [],
    contest_ids: [],
    prompt_base: '',
    favorite: false,
    opened_count: 0,
    source_type: 'state',
    action: '',
    timestamp: new Date().toISOString(),
    payload: {
      activeMapId: String(activeMapId || ''),
    },
  };
}

async function deleteMissingRows({ userId, recordType, nextKeys = [], existingRows = [] }) {
  const staleKeys = existingRows
    .filter((row) => row.record_type === recordType)
    .map((row) => String(row.record_key || ''))
    .filter((recordKey) => !nextKeys.includes(recordKey));

  if (staleKeys.length === 0) return;

  const { error } = await supabase
    .from('mind_maps')
    .delete()
    .eq('user_id', userId)
    .eq('record_type', recordType)
    .in('record_key', staleKeys);

  if (error) throw error;
}

export async function loadMindMapsFromSupabase({
  userId = '',
  context = {},
  fallbackMaps = [],
}) {
  if (!String(userId || '').trim()) {
    return {
      maps: fallbackMaps,
      history: [],
      activeMapId: '',
      mode: 'memory',
      schemaReady: false,
      error: null,
    };
  }

  const { data, error } = await supabase
    .from('mind_maps')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) {
    return {
      maps: fallbackMaps,
      history: [],
      activeMapId: '',
      mode: 'memory',
      schemaReady: !isMissingMindMapsSchema(error),
      error,
    };
  }

  const rows = Array.isArray(data) ? data : [];
  const maps = rows
    .filter((row) => row.record_type === 'map')
    .map((row) =>
      normalizeMindMapRecord(
        {
          id: String(row.record_key || '').replace(/^map:/, ''),
          titulo: row.title || '',
          categoria: row.category || 'Geral',
          disciplinaId: row.discipline_id || '',
          disciplinaNome: row.discipline_name || '',
          plano: row.plan || 'Geral',
          topicoIds: row.topic_ids || [],
          nodes: row.nodes || [],
          contestIds: row.contest_ids || [],
          promptBase: row.prompt_base || '',
          favorito: Boolean(row.favorite),
          criadoEm: row.created_at || new Date().toISOString(),
          atualizadoEm: row.updated_at || row.created_at || new Date().toISOString(),
          ultimoAcessoEm: row.timestamp || '',
          totalAberturas: Number(row.opened_count || 0),
          sourceType: row.source_type || 'manual',
        },
        context
      )
    );

  const history = rows
    .filter((row) => row.record_type === 'history')
    .map((row) => ({
      id: String(row?.payload?.id || row.record_key || '').replace(/^history:/, ''),
      mapId: String(row?.payload?.mapId || ''),
      titulo: String(row?.payload?.titulo || row.title || ''),
      action: String(row?.payload?.action || row.action || ''),
      timestamp: row?.payload?.timestamp || row.timestamp || row.updated_at || row.created_at || '',
    }))
    .sort((first, second) => new Date(second.timestamp || 0).getTime() - new Date(first.timestamp || 0).getTime());

  const activeState = rows.find((row) => row.record_type === 'state' && row.record_key === 'state:active-map');

  return {
    maps: maps.length > 0 ? maps : fallbackMaps,
    history,
    activeMapId: String(activeState?.payload?.activeMapId || ''),
    mode: 'supabase',
    schemaReady: true,
    error: null,
  };
}

export async function saveMindMapsToSupabase({
  userId = '',
  maps = [],
  history = [],
  activeMapId = '',
}) {
  if (!String(userId || '').trim()) return { ok: false, skipped: true };

  const { data: existingRows, error: existingError } = await supabase
    .from('mind_maps')
    .select('record_key, record_type')
    .eq('user_id', userId);

  if (existingError) throw existingError;

  const mapRows = maps.map((map) => toMapRow(map, userId));
  const historyRows = history.map((item) => toHistoryRow(item, userId));
  const stateRows = [toStateRow(activeMapId, userId)];

  if (mapRows.length > 0) {
    const { error } = await supabase.from('mind_maps').upsert(mapRows, { onConflict: 'user_id,record_key' });
    if (error) throw error;
  }

  if (historyRows.length > 0) {
    const { error } = await supabase.from('mind_maps').upsert(historyRows, { onConflict: 'user_id,record_key' });
    if (error) throw error;
  }

  const { error: stateError } = await supabase.from('mind_maps').upsert(stateRows, { onConflict: 'user_id,record_key' });
  if (stateError) throw stateError;

  await deleteMissingRows({
    userId,
    recordType: 'map',
    nextKeys: mapRows.map((row) => row.record_key),
    existingRows,
  });
  await deleteMissingRows({
    userId,
    recordType: 'history',
    nextKeys: historyRows.map((row) => row.record_key),
    existingRows,
  });

  return { ok: true, skipped: false };
}
