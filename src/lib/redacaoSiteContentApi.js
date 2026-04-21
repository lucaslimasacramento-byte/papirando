import { supabase } from './supabase';

const SELECT_FULL = 'theme_bank_json, kit_json, audiobook_catalog_json, sidebar_labels_json';
const SELECT_NO_SIDEBAR_LABELS = 'theme_bank_json, kit_json, audiobook_catalog_json';
const SELECT_MIN = 'theme_bank_json, kit_json';

async function fetchRedacaoSiteRow() {
  let r = await supabase.from('redacao_site_content').select(SELECT_FULL).eq('id', 'global').maybeSingle();
  if (!r.error) return r;
  const msg = String(r.error.message || r.error.details || '');
  if (msg.includes('sidebar_labels_json') || (r.error.code === '42703' && msg.toLowerCase().includes('sidebar'))) {
    r = await supabase.from('redacao_site_content').select(SELECT_NO_SIDEBAR_LABELS).eq('id', 'global').maybeSingle();
    if (!r.error) return r;
  }
  const msg2 = String(r.error?.message || r.error?.details || '');
  if (msg2.includes('audiobook_catalog_json') || r.error?.code === '42703') {
    return supabase.from('redacao_site_content').select(SELECT_MIN).eq('id', 'global').maybeSingle();
  }
  return r;
}

function parseSidebarLabelsFromRow(data) {
  if (!data) return null;
  const raw = data.sidebar_labels_json;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    const id = String(k || '').trim();
    const label = typeof v === 'string' ? v.trim() : String(v ?? '').trim();
    if (!id || !label) continue;
    out[id] = label;
  }
  return Object.keys(out).length ? out : null;
}

export async function fetchRedacaoSiteContent() {
  try {
    const { data, error } = await fetchRedacaoSiteRow();
    if (error) {
      return {
        ok: false,
        error: error.message,
        themeBank: null,
        kit: null,
        audiobookCatalog: null,
        sidebarLabels: null,
      };
    }
    if (!data) {
      return { ok: true, themeBank: null, kit: null, audiobookCatalog: null, sidebarLabels: null };
    }
    const themeBank = Array.isArray(data.theme_bank_json) ? data.theme_bank_json : null;
    const kit = data.kit_json && typeof data.kit_json === 'object' && !Array.isArray(data.kit_json) ? data.kit_json : null;
    const rawAb = data.audiobook_catalog_json;
    const audiobookCatalog = Array.isArray(rawAb) && rawAb.length ? rawAb : null;
    return {
      ok: true,
      themeBank: themeBank?.length ? themeBank : null,
      kit,
      audiobookCatalog,
      sidebarLabels: parseSidebarLabelsFromRow(data),
    };
  } catch (e) {
    return {
      ok: false,
      error: String(e?.message || e),
      themeBank: null,
      kit: null,
      audiobookCatalog: null,
      sidebarLabels: null,
    };
  }
}

/** @param {unknown} input */
export function sanitizeSidebarLabelsForSave(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const out = {};
  for (const [k, v] of Object.entries(input)) {
    const id = String(k || '').trim();
    if (!id || id.length > 64 || !/^[\w-]+$/.test(id)) continue;
    const label = String(v ?? '').trim();
    if (!label) continue;
    out[id] = label.length > 80 ? label.slice(0, 80) : label;
  }
  return Object.keys(out).length ? out : null;
}

async function selectExistingPreservedColumns() {
  let r = await supabase
    .from('redacao_site_content')
    .select('audiobook_catalog_json, sidebar_labels_json')
    .eq('id', 'global')
    .maybeSingle();
  if (!r.error) return r.data || {};
  const msg = String(r.error.message || r.error.details || '');
  if (msg.includes('sidebar_labels_json') || (r.error.code === '42703' && msg.toLowerCase().includes('sidebar'))) {
    r = await supabase.from('redacao_site_content').select('audiobook_catalog_json').eq('id', 'global').maybeSingle();
    if (!r.error) return { ...(r.data || {}) };
  }
  return {};
}

/**
 * @param {{ themeBankJson: unknown, kitJson: unknown, audiobookCatalogJson?: unknown }} payload
 * `audiobookCatalogJson`: `undefined` = não altera coluna; `[]` ou inválido = grava null (app volta ao catálogo embutido de audiolivros).
 */
export async function upsertRedacaoSiteContent(payload) {
  const themeArr = Array.isArray(payload.themeBankJson) ? payload.themeBankJson : [];
  const kitVal = payload.kitJson;
  const kit_json =
    kitVal == null || kitVal === ''
      ? null
      : typeof kitVal === 'object' && !Array.isArray(kitVal)
        ? kitVal
        : null;

  const existing = await selectExistingPreservedColumns();

  let audiobook_catalog_json =
    existing && Object.prototype.hasOwnProperty.call(existing, 'audiobook_catalog_json')
      ? existing.audiobook_catalog_json
      : null;

  if (payload.audiobookCatalogJson !== undefined) {
    const ab = payload.audiobookCatalogJson;
    audiobook_catalog_json = Array.isArray(ab) && ab.length ? ab : null;
  }

  const row = {
    id: 'global',
    theme_bank_json: themeArr,
    kit_json,
    audiobook_catalog_json,
    updated_at: new Date().toISOString(),
  };

  if (existing && Object.prototype.hasOwnProperty.call(existing, 'sidebar_labels_json')) {
    row.sidebar_labels_json = existing.sidebar_labels_json ?? null;
  }

  const { error } = await supabase.from('redacao_site_content').upsert(row, { onConflict: 'id' });
  if (error) {
    if (String(error.message || '').includes('audiobook_catalog_json')) {
      const { error: err2 } = await supabase
        .from('redacao_site_content')
        .upsert(
          {
            id: 'global',
            theme_bank_json: themeArr,
            kit_json,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );
      if (err2) throw new Error(err2.message);
      return { themeBank: themeArr.length ? themeArr : null, kit: kit_json, audiobookCatalog: null };
    }
    throw new Error(error.message);
  }
  return { themeBank: themeArr.length ? themeArr : null, kit: kit_json, audiobookCatalog: audiobook_catalog_json };
}

/**
 * Grava só os rótulos do menu lateral (não altera temas, kit nem audiolivros).
 * @param {unknown} labelsJson mapa tabId -> texto; null ou objeto vazio remove o override no banco.
 */
export async function upsertSidebarLabels(labelsJson) {
  const sanitized = sanitizeSidebarLabelsForSave(labelsJson);
  const payload = {
    sidebar_labels_json: sanitized,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from('redacao_site_content').update(payload).eq('id', 'global');
  if (error) {
    if (String(error.message || '').includes('sidebar_labels_json')) {
      throw new Error(
        'Coluna sidebar_labels_json ausente. Rode no Supabase o script supabase/redacao_site_content_sidebar_labels.sql'
      );
    }
    throw new Error(error.message);
  }
  return { ok: true, sidebarLabels: sanitized };
}
