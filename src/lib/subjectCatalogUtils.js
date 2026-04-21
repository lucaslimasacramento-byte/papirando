export function normalizeSubjectText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function buildSubjectLookup(subjectCatalog = []) {
  const lookup = new Map();

  subjectCatalog.forEach((entry, index) => {
    const normalizedName = normalizeSubjectText(entry.nome);
    const normalizedAliases = (entry.aliases || []).map(normalizeSubjectText).filter(Boolean);
    const payload = {
      ...entry,
      nome: entry.nome,
      area: entry.area || 'Geral',
      aliases: entry.aliases || [],
      sortIndex: index,
    };

    if (normalizedName) lookup.set(normalizedName, payload);
    normalizedAliases.forEach((alias) => {
      if (!lookup.has(alias)) lookup.set(alias, payload);
    });
  });

  return lookup;
}

export function resolveSubjectCatalogEntry(value, subjectCatalog = []) {
  const normalized = normalizeSubjectText(value);
  if (!normalized) return null;

  const lookup = buildSubjectLookup(subjectCatalog);
  if (lookup.has(normalized)) {
    return lookup.get(normalized);
  }

  let best = null;

  subjectCatalog.forEach((entry, index) => {
    const allNames = [entry.nome, ...(entry.aliases || [])].map(normalizeSubjectText).filter(Boolean);
    const hasPartial = allNames.some(
      (candidate) =>
        candidate === normalized ||
        candidate.includes(normalized) ||
        normalized.includes(candidate)
    );

    if (hasPartial && !best) {
      best = {
        ...entry,
        sortIndex: index,
      };
    }
  });

  return best;
}

export function canonicalizeSubjectName(value, subjectCatalog = []) {
  return resolveSubjectCatalogEntry(value, subjectCatalog)?.nome || String(value || '').trim();
}
