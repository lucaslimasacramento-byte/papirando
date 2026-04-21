/**
 * Mescla estado local e remoto do Vade Mecum ao abrir a tela, para não descartar
 * marcações / anotações feitas offline ou antes do último sync.
 */

function markerTime(m) {
  const t = Date.parse(String(m?.createdAt || m?.created_at || ''));
  return Number.isFinite(t) ? t : 0;
}

/** União por id; em conflito mantém a versão com createdAt mais recente. */
export function mergeMarkers(remote = [], local = []) {
  const map = new Map();

  const consider = (raw) => {
    if (!raw || typeof raw !== 'object') return;
    const id = String(raw.id || '').trim();
    if (!id) return;
    const prev = map.get(id);
    if (!prev) {
      map.set(id, raw);
      return;
    }
    map.set(id, markerTime(raw) >= markerTime(prev) ? raw : prev);
  };

  (Array.isArray(remote) ? remote : []).forEach(consider);
  (Array.isArray(local) ? local : []).forEach(consider);

  return Array.from(map.values()).sort((a, b) => markerTime(b) - markerTime(a));
}

export function mergeNoteStrings(localNote, remoteNote) {
  const l = String(localNote ?? '').trim();
  const r = String(remoteNote ?? '').trim();
  if (!l) return r;
  if (!r) return l;
  if (l === r) return l;
  if (r.includes(l)) return r;
  if (l.includes(r)) return l;
  return l.length >= r.length ? l : r;
}

export function mergeSectionStates(local = {}, remote = {}) {
  const keys = new Set([...Object.keys(local), ...Object.keys(remote)]);
  const out = {};

  for (const key of keys) {
    const l = local[key] || {};
    const r = remote[key] || {};
    out[key] = {
      favorite: Boolean(l.favorite) || Boolean(r.favorite),
      reviewed: Boolean(l.reviewed) || Boolean(r.reviewed),
      note: mergeNoteStrings(l.note, r.note),
    };
  }

  return out;
}

/** Prioriza termos locais e depois remotos, deduplicando (case-insensitive). */
export function mergeSearchHistory(remote = [], local = [], max = 12) {
  const seen = new Set();
  const out = [];

  const push = (item) => {
    const s = String(item || '').trim();
    if (!s) return;
    const k = s.toLowerCase();
    if (seen.has(k)) return;
    seen.add(k);
    out.push(s);
  };

  (Array.isArray(local) ? local : []).forEach(push);
  (Array.isArray(remote) ? remote : []).forEach(push);

  return out.slice(0, max);
}

/**
 * @param {{ remote: object, local: object }} args — objetos no formato interno do app (camelCase).
 */
export function mergeVadeBootstrapState({ remote, local }) {
  const r = remote && typeof remote === 'object' ? remote : {};
  const l = local && typeof local === 'object' ? local : {};

  return {
    ...r,
    sectionStates: mergeSectionStates(l.sectionStates || {}, r.sectionStates || {}),
    markers: mergeMarkers(r.markers || [], l.markers || []),
    searchHistory: mergeSearchHistory(r.searchHistory || [], l.searchHistory || [], 12),
    selectedSection: r.selectedSection || l.selectedSection,
    currentPage: Math.max(1, Number(r.currentPage || l.currentPage || 1)),
    lastPdfSearch: (String(r.lastPdfSearch || '').trim() || String(l.lastPdfSearch || '').trim() || '').trim(),
    updatedAt: r.updatedAt || l.updatedAt || '',
  };
}
