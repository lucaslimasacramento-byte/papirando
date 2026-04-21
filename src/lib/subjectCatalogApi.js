export function normalizeSubjectCatalogEntry(entry, index = 0) {
  const aliases = Array.isArray(entry.aliases)
    ? entry.aliases
    : String(entry.aliases || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

  return {
    id: entry.id || `subject-catalog-${index}`,
    nome: entry.nome || '',
    area: entry.area || 'Geral',
    aliases,
    storage: entry.created_at ? 'supabase' : 'local',
  };
}

export async function loadSubjectCatalogFromSupabase(supabase, fallbackCatalog = []) {
  try {
    const { data, error } = await supabase
      .from('subject_catalog')
      .select('*')
      .order('nome', { ascending: true });

    if (error) throw error;
    if (!data || data.length === 0) {
      return fallbackCatalog.map((entry, index) => normalizeSubjectCatalogEntry(entry, index));
    }

    return data.map((entry, index) => normalizeSubjectCatalogEntry(entry, index));
  } catch (error) {
    console.warn(
      '[subjectCatalog] usando catálogo local (Supabase indisponível no momento):',
      error?.message || error?.code || 'sem detalhe'
    );
    return fallbackCatalog.map((entry, index) => normalizeSubjectCatalogEntry(entry, index));
  }
}
