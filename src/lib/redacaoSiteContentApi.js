import { supabase } from './supabase';

import { normalizeNotificationSettings } from './notificationSettings';
import { normalizeCourseTemplates } from './courseTemplates';

const SELECT_FULL = 'theme_bank_json, kit_json, audiobook_catalog_json, sidebar_labels_json, notification_settings_json, course_templates_json';
const SELECT_NO_SIDEBAR_LABELS = 'theme_bank_json, kit_json, audiobook_catalog_json';
const SELECT_MIN = 'theme_bank_json, kit_json';

async function fetchRedacaoSiteRow() {
  let r = await supabase.from('redacao_site_content').select(SELECT_FULL).eq('id', 'global').maybeSingle();
  if (!r.error) return r;
  let msg = String(r.error.message || r.error.details || '');
  if (msg.includes('course_templates_json') || (r.error.code === '42703' && msg.toLowerCase().includes('course'))) {
    r = await supabase
      .from('redacao_site_content')
      .select('theme_bank_json, kit_json, audiobook_catalog_json, sidebar_labels_json, notification_settings_json')
      .eq('id', 'global')
      .maybeSingle();
    if (!r.error) return r;
    msg = String(r.error.message || r.error.details || '');
  }
  if (msg.includes('notification_settings_json') || (r.error.code === '42703' && msg.toLowerCase().includes('notification'))) {
    r = await supabase
      .from('redacao_site_content')
      .select('theme_bank_json, kit_json, audiobook_catalog_json, sidebar_labels_json')
      .eq('id', 'global')
      .maybeSingle();
    if (!r.error) return r;
    msg = String(r.error.message || r.error.details || '');
  }
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

function parseNotificationSettingsFromRow(data) {
  if (!data || !data.notification_settings_json) return null;
  return normalizeNotificationSettings(data.notification_settings_json);
}

function parseCourseTemplatesFromRow(data) {
  // Retorna null APENAS quando a coluna não existe na linha (nunca foi salvo).
  // Array vazio = usuário apagou tudo intencionalmente — retorna [] para não cair no fallback de DEFAULT.
  if (!data || !Object.prototype.hasOwnProperty.call(data, 'course_templates_json')) return null;
  if (!Array.isArray(data.course_templates_json)) return null;
  if (data.course_templates_json.length === 0) return []; // salvo vazio de propósito
  return normalizeCourseTemplates(data.course_templates_json);
}

/**
 * Busca course_templates_json em um SELECT dedicado e independente,
 * para não ser afetado por falhas de schema cache no SELECT principal.
 */
async function fetchCourseTemplatesOnly() {
  try {
    const { data, error } = await supabase
      .from('redacao_site_content')
      .select('course_templates_json')
      .eq('id', 'global')
      .maybeSingle();
    if (error || !data) return null; // coluna ausente ou erro → null
    return data; // { course_templates_json: [...] | null }
  } catch {
    return null;
  }
}

export async function fetchRedacaoSiteContent() {
  try {
    const [{ data, error }, courseRow] = await Promise.all([
      fetchRedacaoSiteRow(),
      fetchCourseTemplatesOnly(),
    ]);
    if (error) {
      return {
        ok: false,
        error: error.message,
        themeBank: null,
        kit: null,
        audiobookCatalog: null,
        sidebarLabels: null,
        notificationSettings: null,
        courseTemplates: null,
      };
    }
    if (!data) return { ok: true, themeBank: null, kit: null, audiobookCatalog: null, sidebarLabels: null, notificationSettings: null, courseTemplates: null };
    const themeBank = Array.isArray(data.theme_bank_json) ? data.theme_bank_json : null;
    const kit = data.kit_json && typeof data.kit_json === 'object' && !Array.isArray(data.kit_json) ? data.kit_json : null;
    const rawAb = data.audiobook_catalog_json;
    const audiobookCatalog = Array.isArray(rawAb) && rawAb.length ? rawAb : null;
    // Merge course_templates_json do fetch dedicado (tem precedência sobre o fetch principal)
    const merged = courseRow ? { ...data, ...courseRow } : data;
    return {
      ok: true,
      themeBank: themeBank?.length ? themeBank : null,
      kit,
      audiobookCatalog,
      sidebarLabels: parseSidebarLabelsFromRow(data),
      notificationSettings: parseNotificationSettingsFromRow(data),
      courseTemplates: parseCourseTemplatesFromRow(merged),
    };
  } catch (e) {
    return {
      ok: false,
      error: String(e?.message || e),
      themeBank: null,
      kit: null,
      audiobookCatalog: null,
      sidebarLabels: null,
      notificationSettings: null,
      courseTemplates: null,
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
    .select('audiobook_catalog_json, sidebar_labels_json, notification_settings_json, course_templates_json')
    .eq('id', 'global')
    .maybeSingle();
  if (!r.error) return r.data || {};
  let msg = String(r.error.message || r.error.details || '');
  if (msg.includes('course_templates_json') || (r.error.code === '42703' && msg.toLowerCase().includes('course'))) {
    r = await supabase
      .from('redacao_site_content')
      .select('audiobook_catalog_json, sidebar_labels_json, notification_settings_json')
      .eq('id', 'global')
      .maybeSingle();
    if (!r.error) return { ...(r.data || {}) };
    msg = String(r.error.message || r.error.details || '');
  }
  if (msg.includes('notification_settings_json') || (r.error.code === '42703' && msg.toLowerCase().includes('notification'))) {
    r = await supabase
      .from('redacao_site_content')
      .select('audiobook_catalog_json, sidebar_labels_json')
      .eq('id', 'global')
      .maybeSingle();
    if (!r.error) return { ...(r.data || {}) };
    msg = String(r.error.message || r.error.details || '');
  }
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
  if (existing && Object.prototype.hasOwnProperty.call(existing, 'notification_settings_json')) {
    row.notification_settings_json = existing.notification_settings_json ?? null;
  }
  if (existing && Object.prototype.hasOwnProperty.call(existing, 'course_templates_json')) {
    row.course_templates_json = existing.course_templates_json ?? null;
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

export async function upsertNotificationSettings(settingsJson) {
  const sanitized = normalizeNotificationSettings(settingsJson);
  const payload = {
    notification_settings_json: sanitized,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from('redacao_site_content').update(payload).eq('id', 'global');
  if (error) {
    if (String(error.message || '').includes('notification_settings_json')) {
      throw new Error(
        'Coluna notification_settings_json ausente. Rode no Supabase o script supabase/redacao_site_content_notification_settings.sql'
      );
    }
    throw new Error(error.message);
  }
  return { ok: true, notificationSettings: sanitized };
}

export async function upsertCourseTemplates(templatesJson) {
  const sanitized = normalizeCourseTemplates(templatesJson);
  const payload = {
    course_templates_json: sanitized,
    updated_at: new Date().toISOString(),
  };

  // Usa UPDATE para respeitar a RLS (permite UPDATE mas não INSERT para usuários autenticados).
  const { error } = await supabase
    .from('redacao_site_content')
    .update(payload)
    .eq('id', 'global');

  if (error) {
    if (String(error.message || '').includes('course_templates_json')) {
      throw new Error(
        'Coluna course_templates_json ausente. Rode no Supabase o script supabase/redacao_site_content_course_templates.sql'
      );
    }
    throw new Error(error.message);
  }

  return { ok: true, courseTemplates: sanitized };
}
