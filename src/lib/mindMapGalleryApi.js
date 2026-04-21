import { supabase } from './supabase';
import { normalizeMindMapRecord } from './mindMaps';

/** Converte linha do Supabase em registro de mapa para a UI (id estável de galeria). */
export function galleryMapFromRow(row, context = {}) {
  if (!row || typeof row !== 'object') return null;
  const dados = row.dados && typeof row.dados === 'object' ? row.dados : {};
  const merged = {
    ...dados,
    id: `gallery-${row.id}`,
    galleryRowId: row.id,
    titulo: String(row.titulo || dados.titulo || 'Mapa mental').trim(),
    sourceType: 'gallery',
    sortOrder: Number(row.sort_order) || 0,
  };
  return normalizeMindMapRecord(merged, context);
}

/** @param {Record<string, unknown>} row */
export function sanitizeDadosForGallerySave(map) {
  if (!map || typeof map !== 'object') return {};
  const {
    id: _id,
    galleryRowId: _g,
    sortOrder: _s,
    sourceType: _st,
    ...rest
  } = map;
  return { ...rest };
}

export async function loadMindMapGalleryRows() {
  const { data, error } = await supabase
    .from('mind_map_gallery')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

/**
 * @param {{ titulo: string, dados: object, sort_order?: number }} payload
 */
export async function insertMindMapGalleryItem(payload) {
  const row = {
    titulo: String(payload.titulo || '').trim() || 'Mapa mental',
    dados: payload.dados && typeof payload.dados === 'object' ? payload.dados : {},
    sort_order: Math.max(0, Number(payload.sort_order) || 0),
  };

  const { data, error } = await supabase.from('mind_map_gallery').insert(row).select('*').single();

  if (error) throw error;
  return data;
}

/**
 * @param {string} id uuid da linha (não o id `gallery-...` da UI)
 * @param {{ titulo?: string, dados?: object, sort_order?: number }} patch
 */
export async function updateMindMapGalleryItem(id, patch) {
  const payload = {};
  if (patch.titulo != null) payload.titulo = String(patch.titulo).trim() || 'Mapa mental';
  if (patch.dados != null && typeof patch.dados === 'object') payload.dados = patch.dados;
  if (patch.sort_order != null) payload.sort_order = Math.max(0, Number(patch.sort_order) || 0);

  const { data, error } = await supabase.from('mind_map_gallery').update(payload).eq('id', id).select('*').single();

  if (error) throw error;
  return data;
}

export async function deleteMindMapGalleryItem(id) {
  const { error } = await supabase.from('mind_map_gallery').delete().eq('id', id);
  if (error) throw error;
}
