import { supabase } from './supabase';

export const DEFAULT_VADE_DOCUMENT = {
  id: 'default-vade-mecum',
  slug: 'vade-mecum-oficial',
  title: 'Vade Mecum do Senado Federal',
  edition: '2ª edição',
  source: 'Senado Federal',
  updatedAtLabel: '01/04/2026',
  pdfUrl: '/assets/docs/vade-mecum-senado-federal-2ed.pdf',
  storagePath: '',
  isActive: true,
};

export const BASE_VADE_SECTIONS = [
  'Apresentacao',
  'Constituicao Federal',
  'Lei de Introducao as Normas do Direito Brasileiro',
  'Codigo Civil',
  'Codigo de Processo Civil',
  'Codigo Penal e Contravencoes Penais',
  'Codigo de Processo Penal',
  'Codigo Tributario Nacional',
  'Codigo de Defesa do Consumidor',
  'Codigo Eleitoral',
  'Codigo Florestal',
  'Consolidacao das Leis do Trabalho',
  'Leis especiais',
  'Legislacao administrativa',
  'Sumulas e informativos',
];

export const DEFAULT_SECTION_PAGE_MAP = {
  Apresentacao: 1,
  'Constituicao Federal': 9,
  'Lei de Introducao as Normas do Direito Brasileiro': 92,
  'Codigo Civil': 101,
  'Codigo de Processo Civil': 302,
  'Codigo Penal e Contravencoes Penais': 533,
  'Codigo de Processo Penal': 641,
  'Codigo Tributario Nacional': 761,
  'Codigo de Defesa do Consumidor': 828,
  'Codigo Eleitoral': 862,
  'Codigo Florestal': 928,
  'Consolidacao das Leis do Trabalho': 1006,
  'Leis especiais': 1174,
  'Legislacao administrativa': 1290,
  'Sumulas e informativos': 1360,
};

export const DEFAULT_SECTION_STATE = {
  favorite: false,
  reviewed: false,
  note: '',
};

export function buildEmptyVadeState() {
  return {
    selectedSection: BASE_VADE_SECTIONS[0],
    currentPage: DEFAULT_SECTION_PAGE_MAP[BASE_VADE_SECTIONS[0]] || 1,
    sectionStates: {},
    markers: [],
    searchHistory: [],
    lastPdfSearch: '',
    updatedAt: '',
  };
}

function normalizeSectionStates(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

  return Object.entries(value).reduce((acc, [section, sectionState]) => {
    if (!section) return acc;
    acc[section] = {
      ...DEFAULT_SECTION_STATE,
      ...(sectionState && typeof sectionState === 'object' ? sectionState : {}),
    };
    return acc;
  }, {});
}

function normalizeMarkers(value) {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item) => item && typeof item === 'object')
    .map((item, index) => ({
      id: String(item.id || `marker-${Date.now()}-${index}`),
      page: Math.max(1, Number(item.page || 1)),
      section: String(item.section || ''),
      label: String(item.label || '').trim(),
      excerpt: String(item.excerpt || '').trim(),
      color: String(item.color || '#1e3a5f'),
      createdAt: item.createdAt || new Date().toISOString(),
    }));
}

function normalizeSearchHistory(value) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .slice(0, 12);
}

export function normalizeVadeDocument(document) {
  const payload = document && typeof document === 'object' ? document : {};
  const pageMap =
    payload.section_page_map && typeof payload.section_page_map === 'object'
      ? payload.section_page_map
      : DEFAULT_SECTION_PAGE_MAP;

  return {
    ...DEFAULT_VADE_DOCUMENT,
    ...payload,
    title: payload.title || payload.titulo || DEFAULT_VADE_DOCUMENT.title,
    edition: payload.edition || payload.edicao || DEFAULT_VADE_DOCUMENT.edition,
    source: payload.source || payload.fonte || DEFAULT_VADE_DOCUMENT.source,
    updatedAtLabel:
      payload.updatedAtLabel ||
      payload.updated_at_label ||
      payload.updated_at?.slice?.(0, 10)?.split('-')?.reverse?.().join('/') ||
      DEFAULT_VADE_DOCUMENT.updatedAtLabel,
    pdfUrl: payload.pdfUrl || payload.pdf_url || DEFAULT_VADE_DOCUMENT.pdfUrl,
    storagePath: payload.storagePath || payload.storage_path || '',
    sectionPageMap: { ...DEFAULT_SECTION_PAGE_MAP, ...pageMap },
  };
}

export function normalizeVadeState(state) {
  const payload = state && typeof state === 'object' ? state : {};
  const base = buildEmptyVadeState();

  return {
    ...base,
    ...payload,
    selectedSection: String(payload.selectedSection || payload.selected_section || base.selectedSection),
    currentPage: Math.max(1, Number(payload.currentPage || payload.current_page || base.currentPage)),
    sectionStates: normalizeSectionStates(payload.sectionStates || payload.section_states),
    markers: normalizeMarkers(payload.markers),
    searchHistory: normalizeSearchHistory(payload.searchHistory || payload.search_history),
    lastPdfSearch: String(payload.lastPdfSearch || payload.last_pdf_search || ''),
    updatedAt: payload.updatedAt || payload.updated_at || '',
  };
}

export function buildSectionOrder(document = DEFAULT_VADE_DOCUMENT) {
  const sectionPageMap = document.sectionPageMap || DEFAULT_SECTION_PAGE_MAP;
  return Object.entries(sectionPageMap)
    .sort((first, second) => Number(first[1] || 0) - Number(second[1] || 0))
    .map(([section]) => section);
}

export function inferSectionFromPage(page, sectionPageMap = DEFAULT_SECTION_PAGE_MAP) {
  const currentPage = Math.max(1, Number(page || 1));
  const orderedSections = Object.entries(sectionPageMap)
    .sort((first, second) => Number(first[1] || 0) - Number(second[1] || 0));

  let lastSection = orderedSections[0]?.[0] || BASE_VADE_SECTIONS[0];

  orderedSections.forEach(([section, startPage]) => {
    if (currentPage >= Number(startPage || 1)) {
      lastSection = section;
    }
  });

  return lastSection;
}

function getStoragePathFromUrl(url, bucket) {
  if (!url || !bucket) return '';

  try {
    const parsed = new URL(url);
    const marker = `/storage/v1/object/public/${bucket}/`;
    const index = parsed.pathname.indexOf(marker);
    if (index === -1) return '';
    return decodeURIComponent(parsed.pathname.slice(index + marker.length));
  } catch {
    return '';
  }
}

function buildSafeFileName(fileName) {
  return String(fileName || 'arquivo')
    .replace(/\.[^/.]+$/, '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export async function loadActiveVadeMecumDocument() {
  try {
    const { data, error } = await supabase
      .from('vade_mecum_documents')
      .select('*')
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return normalizeVadeDocument(data || DEFAULT_VADE_DOCUMENT);
  } catch (error) {
    console.error('Erro ao carregar documento ativo do Vade Mecum:', error);
    return normalizeVadeDocument(DEFAULT_VADE_DOCUMENT);
  }
}

/** Carrega o registro oficial por slug (para o painel admin). */
export async function loadVadeMecumDocumentBySlug(slug = 'vade-mecum-oficial') {
  const { data, error } = await supabase.from('vade_mecum_documents').select('*').eq('slug', slug).maybeSingle();
  if (error) throw error;
  return normalizeVadeDocument(data || DEFAULT_VADE_DOCUMENT);
}

/**
 * Atualiza metadados do lançamento (PDF permanece o mesmo até novo upload).
 * @param {string} slug
 * @param {{ title?: string, edition?: string, source?: string, updatedAtLabel?: string, sectionPageMap?: Record<string, number> }} patch
 */
export async function updateVadeMecumReleaseMeta(slug, patch) {
  const { data: row, error: fetchError } = await supabase.from('vade_mecum_documents').select('*').eq('slug', slug).maybeSingle();
  if (fetchError) throw fetchError;
  if (!row) throw new Error('Documento não encontrado.');

  const update = { updated_at: new Date().toISOString() };
  if (patch.title != null) update.title = String(patch.title).trim() || row.title;
  if (patch.edition != null) update.edition = String(patch.edition).trim();
  if (patch.source != null) update.source = String(patch.source).trim();
  if (patch.updatedAtLabel != null) update.updated_at_label = String(patch.updatedAtLabel).trim();
  if (patch.sectionPageMap != null && typeof patch.sectionPageMap === 'object' && !Array.isArray(patch.sectionPageMap)) {
    update.section_page_map = { ...DEFAULT_SECTION_PAGE_MAP, ...patch.sectionPageMap };
  }

  const { data, error } = await supabase.from('vade_mecum_documents').update(update).eq('slug', slug).select('*').single();
  if (error) throw error;
  return normalizeVadeDocument(data);
}

export async function loadVadeMecumUserState(userId) {
  if (!userId) return normalizeVadeState(buildEmptyVadeState());

  try {
    const { data, error } = await supabase
      .from('vade_mecum_user_states')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return normalizeVadeState(data || buildEmptyVadeState());
  } catch (error) {
    console.error('Erro ao carregar estado do Vade Mecum:', error);
    return normalizeVadeState(buildEmptyVadeState());
  }
}

export async function saveVadeMecumUserState({ userId, documentId, state }) {
  if (!userId) throw new Error('Usuário não autenticado.');

  const normalizedState = normalizeVadeState(state);

  const payload = {
    user_id: userId,
    document_id: documentId || null,
    selected_section: normalizedState.selectedSection,
    current_page: normalizedState.currentPage,
    section_states: normalizedState.sectionStates,
    markers: normalizedState.markers,
    search_history: normalizedState.searchHistory,
    last_pdf_search: normalizedState.lastPdfSearch,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('vade_mecum_user_states').upsert(payload, {
    onConflict: 'user_id',
  });

  if (error) throw error;
}

export async function uploadVadeMecumPdf({ file, currentDocument, currentUserId }) {
  if (!file) throw new Error('Selecione um arquivo PDF.');

  const extension = file.name.split('.').pop()?.toLowerCase() || 'pdf';
  if (extension !== 'pdf' || String(file.type || '').toLowerCase() !== 'application/pdf') {
    throw new Error('Envie um PDF valido.');
  }
  if (Number(file.size || 0) > 50 * 1024 * 1024) {
    throw new Error('O PDF deve ter no maximo 50 MB.');
  }

  const safeBaseName = buildSafeFileName(file.name) || 'vade-mecum';
  const filePath = `vade-mecum/${Date.now()}-${safeBaseName}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from('vade-mecum-files')
    .upload(filePath, file, {
      upsert: false,
      contentType: file.type || 'application/pdf',
    });

  if (uploadError) throw uploadError;

  const previousPath = getStoragePathFromUrl(currentDocument?.pdfUrl || '', 'vade-mecum-files');
  if (previousPath) {
    const { error: removeError } = await supabase.storage.from('vade-mecum-files').remove([previousPath]);
    if (removeError) {
      console.warn('Não foi possível remover o PDF anterior do Vade Mecum:', removeError);
    }
  }

  const { data: publicUrlData } = supabase.storage.from('vade-mecum-files').getPublicUrl(filePath);
  const nextDocument = {
    slug: 'vade-mecum-oficial',
    title: file.name.replace(/\.pdf$/i, ''),
    edition: 'Atualização administrativa',
    source: 'Painel Papirando',
    pdf_url: publicUrlData.publicUrl,
    storage_path: filePath,
    section_page_map: currentDocument?.sectionPageMap || DEFAULT_SECTION_PAGE_MAP,
    updated_at_label: new Date().toLocaleDateString('pt-BR'),
    uploaded_by: currentUserId || null,
    is_active: true,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('vade_mecum_documents')
    .upsert(nextDocument, { onConflict: 'slug' })
    .select('*')
    .single();

  if (error) throw error;
  return normalizeVadeDocument(data);
}

export async function resetVadeMecumDocument(currentDocument = null) {
  const nextDocument = {
    slug: 'vade-mecum-oficial',
    title: DEFAULT_VADE_DOCUMENT.title,
    edition: DEFAULT_VADE_DOCUMENT.edition,
    source: DEFAULT_VADE_DOCUMENT.source,
    pdf_url: DEFAULT_VADE_DOCUMENT.pdfUrl,
    storage_path: '',
    section_page_map: DEFAULT_SECTION_PAGE_MAP,
    updated_at_label: DEFAULT_VADE_DOCUMENT.updatedAtLabel,
    is_active: true,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('vade_mecum_documents')
    .upsert(nextDocument, { onConflict: 'slug' })
    .select('*')
    .single();

  if (error) throw error;

  const previousPath = getStoragePathFromUrl(currentDocument?.pdfUrl || '', 'vade-mecum-files');
  if (previousPath) {
    const { error: removeError } = await supabase.storage.from('vade-mecum-files').remove([previousPath]);
    if (removeError) {
      console.warn('Não foi possível remover o PDF customizado do Vade Mecum:', removeError);
    }
  }

  return normalizeVadeDocument(data);
}
