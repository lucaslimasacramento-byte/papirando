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

// Quando o catalogo e o edital escrevem a MESMA disciplina, ganha quem tem acento.
//
// O catalogo existe para agrupar nomes equivalentes, nao para reescrever ortografia. So que
// entradas antigas dele foram cadastradas sem acento ("Nocoes de Direito Penal",
// "Matematica"), e como o nome canonico substituia o do edital, o erro do cadastro chegava
// a tela do aluno — inclusive em portugues errado, num produto de concurso.
//
// A regra nao inventa acento: se os dois textos sao iguais ignorando acento e caixa, fica o
// que tem acento. Nomes de fato diferentes ("Portugues" -> "Lingua Portuguesa") seguem
// resolvendo pelo catalogo, como antes.
function temAcento(texto) {
  const bruto = String(texto || '');
  return bruto.normalize('NFD').replace(/[\u0300-\u036f]/g, '') !== bruto;
}

export function canonicalizeSubjectName(value, subjectCatalog = []) {
  const original = String(value || '').trim();
  const canonico = resolveSubjectCatalogEntry(value, subjectCatalog)?.nome || original;

  const mesmoNome = normalizeSubjectText(canonico) === normalizeSubjectText(original);
  if (mesmoNome && temAcento(original) && !temAcento(canonico)) return original;

  return canonico;
}
