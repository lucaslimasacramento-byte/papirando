import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookMarked,
  DownloadCloud,
  Focus,
  Loader2,
  Minimize2,
  RefreshCw,
  Scale,
  Search,
  Settings,
  Star,
  UploadCloud,
  Highlighter,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  NotebookPen,
  Trash2,
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {
  BASE_VADE_SECTIONS,
  DEFAULT_SECTION_PAGE_MAP,
  DEFAULT_SECTION_STATE,
  buildEmptyVadeState,
  buildSectionOrder,
  inferSectionFromPage,
  loadActiveVadeMecumDocument,
  loadVadeMecumUserState,
  normalizeVadeState,
  resetVadeMecumDocument,
  saveVadeMecumUserState,
  uploadVadeMecumPdf,
} from '../lib/vadeMecumApi';
import { mergeVadeBootstrapState } from '../lib/vadeMecumMerge';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const MARKER_COLORS = ['#2563EB', '#F59E0B', '#10B981', '#EC4899'];

function buildLocalStorageKey(userId) {
  return `papirando_vade_mecum_state_${userId || 'guest'}`;
}

function readLocalState(userId) {
  try {
    const raw = localStorage.getItem(buildLocalStorageKey(userId));
    return raw ? normalizeVadeState(JSON.parse(raw)) : normalizeVadeState(buildEmptyVadeState());
  } catch {
    return normalizeVadeState(buildEmptyVadeState());
  }
}

function persistLocalState(userId, state) {
  try {
    localStorage.setItem(buildLocalStorageKey(userId), JSON.stringify(state));
  } catch {
    // noop
  }
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function buildExcerpt(text, index, size = 70) {
  const start = Math.max(0, index - size);
  const end = Math.min(text.length, index + size);
  const prefix = start > 0 ? '...' : '';
  const suffix = end < text.length ? '...' : '';
  return `${prefix}${text.slice(start, end).replace(/\s+/g, ' ').trim()}${suffix}`;
}

function dedupeHistory(history, nextValue) {
  const normalized = String(nextValue || '').trim();
  if (!normalized) return history;
  return [normalized, ...history.filter((item) => item !== normalized)].slice(0, 12);
}

export default function Legislacao({ isAdmin = false, currentUserId = '', onOpenAdminLegislacao }) {
  const fileInputRef = useRef(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isIndexingPdf, setIsIndexingPdf] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [pdfStats, setPdfStats] = useState({ pages: 0, indexedPages: 0 });
  const [documentMeta, setDocumentMeta] = useState(null);
  const [vadeState, setVadeState] = useState(() => readLocalState(currentUserId));
  const [search, setSearch] = useState('');
  const [pdfSearchDraft, setPdfSearchDraft] = useState('');
  const [pdfSearch, setPdfSearch] = useState('');
  const [focusMode, setFocusMode] = useState(false);
  const [pageIndex, setPageIndex] = useState([]);
  const [markerDraft, setMarkerDraft] = useState({ label: '', excerpt: '', color: MARKER_COLORS[0] });
  const [asideTab, setAsideTab] = useState('bloco');

  useEffect(() => {
    if (!focusMode) return;
    const onKey = (event) => {
      if (event.key === 'Escape') setFocusMode(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [focusMode]);

  useEffect(() => {
    let ignore = false;

    const bootstrap = async () => {
      setIsBootstrapping(true);
      setLoadError('');

      try {
        const [loadedDocument, loadedRemoteState] = await Promise.all([
          loadActiveVadeMecumDocument(),
          currentUserId ? loadVadeMecumUserState(currentUserId) : Promise.resolve(normalizeVadeState(buildEmptyVadeState())),
        ]);

        if (ignore) return;

        setDocumentMeta(loadedDocument);

        const localState = readLocalState(currentUserId);
        const mergedState = normalizeVadeState(
          mergeVadeBootstrapState({
            remote: loadedRemoteState,
            local: localState,
          })
        );

        setVadeState(mergedState);
        setPdfSearchDraft(mergedState.lastPdfSearch || '');
        setPdfSearch(mergedState.lastPdfSearch || '');
        setMarkerDraft((prev) => ({
          ...prev,
          label: mergedState.selectedSection || prev.label,
        }));
      } catch (error) {
        if (!ignore) {
          setLoadError(error.message || 'Não foi possível carregar o Vade Mecum.');
        }
      } finally {
        if (!ignore) setIsBootstrapping(false);
      }
    };

    bootstrap();

    return () => {
      ignore = true;
    };
  }, [currentUserId]);

  useEffect(() => {
    if (!documentMeta?.pdfUrl) return;

    let cancelled = false;

    const indexPdf = async () => {
      setIsIndexingPdf(true);
      setLoadError('');
      setPageIndex([]);
      setPdfStats({ pages: 0, indexedPages: 0 });

      try {
        const loadingTask = pdfjsLib.getDocument(documentMeta.pdfUrl);
        const pdf = await loadingTask.promise;
        if (cancelled) return;

        setPdfStats({ pages: pdf.numPages, indexedPages: 0 });
        const pages = [];

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          const page = await pdf.getPage(pageNumber);
          const content = await page.getTextContent();
          const text = content.items
            .map((item) => ('str' in item ? item.str : ''))
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();

          pages.push({
            page: pageNumber,
            text,
            normalizedText: normalizeText(text),
            section: inferSectionFromPage(pageNumber, documentMeta.sectionPageMap || DEFAULT_SECTION_PAGE_MAP),
          });

          if (!cancelled) {
            setPdfStats({ pages: pdf.numPages, indexedPages: pageNumber });
          }
        }

        if (!cancelled) setPageIndex(pages);
      } catch (error) {
        if (!cancelled) {
          console.error('Erro ao indexar o PDF do Vade Mecum:', error);
          setLoadError('Não foi possível indexar o PDF para a busca interna.');
        }
      } finally {
        if (!cancelled) setIsIndexingPdf(false);
      }
    };

    indexPdf();

    return () => {
      cancelled = true;
    };
  }, [documentMeta?.pdfUrl, documentMeta?.sectionPageMap]);

  useEffect(() => {
    persistLocalState(currentUserId, vadeState);
  }, [currentUserId, vadeState]);

  useEffect(() => {
    if (!currentUserId || !documentMeta?.id || isBootstrapping) return;

    const timeoutId = window.setTimeout(async () => {
      setIsSaving(true);
      setSaveError('');

      try {
        await saveVadeMecumUserState({
          userId: currentUserId,
          documentId: documentMeta.id,
          state: vadeState,
        });
      } catch (error) {
        console.error('Erro ao salvar estado do Vade Mecum:', error);
        setSaveError('Salvamento online indisponivel no momento. Seus dados continuam salvos localmente.');
      } finally {
        setIsSaving(false);
      }
    }, 700);

    return () => window.clearTimeout(timeoutId);
  }, [currentUserId, documentMeta?.id, isBootstrapping, vadeState]);

  const sectionPageMap = documentMeta?.sectionPageMap || DEFAULT_SECTION_PAGE_MAP;
  const orderedSections = useMemo(() => {
    const fromDocument = buildSectionOrder(documentMeta || { sectionPageMap });
    return fromDocument.length > 0 ? fromDocument : BASE_VADE_SECTIONS;
  }, [documentMeta, sectionPageMap]);

  const selectedSection = orderedSections.includes(vadeState.selectedSection)
    ? vadeState.selectedSection
    : orderedSections[0];
  const currentPage = Math.max(1, Number(vadeState.currentPage || sectionPageMap[selectedSection] || 1));
  const activePdfUrl = documentMeta?.pdfUrl || '/assets/docs/vade-mecum-senado-federal-2ed.pdf';
  const iframePdfUrl = `${activePdfUrl}#toolbar=1&navpanes=0&page=${currentPage}`;
  const fullReaderUrl = `${activePdfUrl}#toolbar=1&page=${currentPage}`;

  const filteredSections = useMemo(() => {
    const query = normalizeText(search.trim());
    if (!query) return orderedSections;
    return orderedSections.filter((item) => normalizeText(item).includes(query));
  }, [orderedSections, search]);

  const currentSectionState = vadeState.sectionStates[selectedSection] || DEFAULT_SECTION_STATE;

  const searchResults = useMemo(() => {
    const query = normalizeText(pdfSearch.trim());
    if (!query) return [];

    return pageIndex
      .filter((page) => page.normalizedText.includes(query))
      .slice(0, 30)
      .map((page) => {
        const hitIndex = page.normalizedText.indexOf(query);
        return {
          page: page.page,
          section: page.section,
          excerpt: buildExcerpt(page.text, hitIndex >= 0 ? hitIndex : 0),
        };
      });
  }, [pageIndex, pdfSearch]);

  const favoriteSections = useMemo(
    () =>
      orderedSections.filter((section) => {
        const state = vadeState.sectionStates[section] || DEFAULT_SECTION_STATE;
        return Boolean(state.favorite);
      }),
    [orderedSections, vadeState.sectionStates]
  );

  const notesList = useMemo(
    () =>
      orderedSections
        .map((section) => ({
          section,
          note: String(vadeState.sectionStates[section]?.note || '').trim(),
        }))
        .filter((item) => item.note),
    [orderedSections, vadeState.sectionStates]
  );

  const markersForCurrentSection = useMemo(
    () => vadeState.markers.filter((marker) => marker.section === selectedSection),
    [selectedSection, vadeState.markers]
  );

  const favoriteCount = favoriteSections.length;
  const noteCount = notesList.length;
  const reviewedCount = orderedSections.filter((section) => vadeState.sectionStates[section]?.reviewed).length;

  const legislacaoHeaderStats = useMemo(
    () => [
      { key: 'blocos', icon: BookMarked, label: 'Blocos', value: String(orderedSections.length), accent: 'blue' },
      { key: 'fav', icon: Star, label: 'Favoritos', value: String(favoriteCount), accent: 'emerald' },
      { key: 'notas', icon: NotebookPen, label: 'Notas', value: String(noteCount), accent: 'indigo' },
      { key: 'markers', icon: Highlighter, label: 'Marcações', value: String(vadeState.markers.length), accent: 'amber' },
    ],
    [favoriteCount, noteCount, orderedSections.length, vadeState.markers.length]
  );

  const updateState = (updater) => {
    setVadeState((prev) => normalizeVadeState(typeof updater === 'function' ? updater(prev) : updater));
  };

  const updateSectionState = (patch) => {
    updateState((prev) => ({
      ...prev,
      sectionStates: {
        ...prev.sectionStates,
        [selectedSection]: {
          ...DEFAULT_SECTION_STATE,
          ...(prev.sectionStates[selectedSection] || {}),
          ...patch,
        },
      },
      updatedAt: new Date().toISOString(),
    }));
  };

  const goToSection = (section) => {
    updateState((prev) => ({
      ...prev,
      selectedSection: section,
      currentPage: sectionPageMap[section] || 1,
      updatedAt: new Date().toISOString(),
    }));

    setMarkerDraft((prev) => ({
      ...prev,
      label: section,
    }));
  };

  const goToPage = (page) => {
    const safePage = Math.max(1, Number(page || 1));
    const inferredSection = inferSectionFromPage(safePage, sectionPageMap);
    updateState((prev) => ({
      ...prev,
      currentPage: safePage,
      selectedSection: inferredSection,
      updatedAt: new Date().toISOString(),
    }));
  };

  const submitPdfSearch = () => {
    const nextValue = pdfSearchDraft.trim();
    setPdfSearch(nextValue);
    updateState((prev) => ({
      ...prev,
      lastPdfSearch: nextValue,
      searchHistory: nextValue ? dedupeHistory(prev.searchHistory, nextValue) : prev.searchHistory,
      updatedAt: new Date().toISOString(),
    }));
  };

  const addMarker = () => {
    const label = markerDraft.label.trim() || selectedSection;
    const excerpt = markerDraft.excerpt.trim() || (pdfSearch ? `Busca: ${pdfSearch}` : `Página ${currentPage}`);

    updateState((prev) => ({
      ...prev,
      markers: [
        {
          id: `marker-${Date.now()}`,
          page: currentPage,
          section: selectedSection,
          label,
          excerpt,
          color: markerDraft.color,
          createdAt: new Date().toISOString(),
        },
        ...prev.markers,
      ],
      updatedAt: new Date().toISOString(),
    }));

    setMarkerDraft((prev) => ({
      ...prev,
      excerpt: '',
    }));
  };

  const removeMarker = (markerId) => {
    updateState((prev) => ({
      ...prev,
      markers: prev.markers.filter((marker) => marker.id !== markerId),
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleChooseNewPdf = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !isAdmin) return;

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      alert('Envie um arquivo PDF.');
      return;
    }

    setIsUploading(true);

    try {
      const nextDocument = await uploadVadeMecumPdf({
        file,
        currentDocument: documentMeta,
        currentUserId,
      });

      setDocumentMeta(nextDocument);
      goToPage(nextDocument.sectionPageMap?.[selectedSection] || 1);
    } catch (error) {
      alert(error.message || 'Não foi possível atualizar o arquivo do Vade Mecum.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleResetDocument = async () => {
    if (!isAdmin) return;

    setIsUploading(true);

    try {
      const nextDocument = await resetVadeMecumDocument(documentMeta);
      setDocumentMeta(nextDocument);
      goToPage(nextDocument.sectionPageMap?.[orderedSections[0]] || 1);
    } catch (error) {
      alert(error.message || 'Não foi possível restaurar o arquivo oficial.');
    } finally {
      setIsUploading(false);
    }
  };

  const reviewProgressPct =
    orderedSections.length > 0 ? Math.round((reviewedCount / orderedSections.length) * 100) : 0;
  const maxPage = pdfStats.pages > 0 ? pdfStats.pages : null;

  if (isBootstrapping) {
    return (
      <div className="pl-app pl-paper-bg-soft pl-loading-shell">
        <div className="pl-loading-panel">
          <div className="pl-loading-stack">
            <div className="pl-loading-spinner" aria-hidden />
            <span className="eyebrow">Legislação</span>
            <p className="title">Carregando Vade Mecum.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pl-app pl-paper-bg-soft pl-leg-shell">
      {focusMode ? (
        <section className="pl-leg-focus">
          <div className="head">
            <div>
              <p>Modo foco · Esc pra sair</p>
              <h2>{selectedSection}</h2>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <a href={activePdfUrl} target="_blank" rel="noreferrer" className="pl-btn-dark">
                <DownloadCloud /> Abrir PDF
              </a>
              <button type="button" onClick={() => setFocusMode(false)} className="pl-btn-dark">
                <Minimize2 /> Sair do foco
              </button>
            </div>
          </div>
          <div className="canvas">
            <iframe
              key={`focus-${selectedSection}-${currentPage}`}
              title="Vade Mecum foco"
              src={iframePdfUrl}
            />
          </div>
        </section>
      ) : (
        <>
          {/* ═══ Hero compacto ═══ */}
          <header className="pl-leg-hero">
            <div className="lede">
              <div className="icon">
                <Scale size={18} strokeWidth={1.75} />
              </div>
              <div>
                <p className="eyebrow">Lei seca integrada</p>
                <h1>Legislação · Vade Mecum<span className="dot">.</span></h1>
              </div>
            </div>
            <div className="progress-mini">
              <div className="row">
                <span>Revisão por bloco</span>
                <span style={{ fontFamily: 'var(--pl-mono)', fontWeight: 700, letterSpacing: 0 }}>
                  {reviewedCount}/{orderedSections.length} ({reviewProgressPct}%)
                </span>
              </div>
              <div className="bar"><div className="fill" style={{ width: `${reviewProgressPct}%` }} /></div>
            </div>
            <div className="kpis">
              {legislacaoHeaderStats.slice(0, 4).map((s) => (
                <div key={s.key} className="kpi">
                  <span className="lab">{s.label}</span>
                  <span className="val">{s.value}</span>
                </div>
              ))}
            </div>
            <a href={fullReaderUrl} target="_blank" rel="noreferrer" className="pl-btn pl-btn-primary pl-btn-sm">
              <DownloadCloud size={13} /> Leitor completo
            </a>
          </header>

          {/* ═══ Toolbar compacta ═══ */}
          <div className="pl-leg-toolbar">
            <div className="file-block">
              <div className="file-icon"><Scale size={16} /></div>
              <div className="file-meta">
                <p className="ttl">{documentMeta?.title}</p>
                <p className="sub">
                  {documentMeta?.edition} · {documentMeta?.source} · {documentMeta?.updatedAtLabel}
                </p>
              </div>
            </div>
            <div className="searches">
              <div className="pl-leg-search">
                <Search />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar bloco legislativo…"
                />
              </div>
              <div className="pl-leg-search">
                <Search />
                <input
                  type="text"
                  value={pdfSearchDraft}
                  onChange={(e) => setPdfSearchDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') submitPdfSearch(); }}
                  placeholder="Buscar texto no PDF…"
                />
              </div>
            </div>
            <div className="actions">
              {isAdmin && (
                <>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="pl-btn pl-btn-sm"
                    style={{ opacity: isUploading ? 0.5 : 1 }}
                  >
                    {isUploading ? <Loader2 size={13} className="animate-spin" /> : <UploadCloud size={13} />}
                    Atualizar
                  </button>
                  <button
                    type="button"
                    onClick={handleResetDocument}
                    disabled={isUploading}
                    className="pl-btn pl-btn-sm"
                  >
                    <RefreshCw size={13} /> Base oficial
                  </button>
                  {typeof onOpenAdminLegislacao === 'function' && (
                    <button
                      type="button"
                      onClick={onOpenAdminLegislacao}
                      className="pl-btn pl-btn-sm"
                    >
                      <Settings size={13} /> Admin
                    </button>
                  )}
                </>
              )}
              <button type="button" onClick={() => setFocusMode(true)} className="pl-btn pl-btn-sm pl-btn-primary">
                <Focus size={13} /> Modo foco
              </button>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            style={{ display: 'none' }}
            onChange={handleChooseNewPdf}
          />

          {/* ═══ Section chips slim ═══ */}
          <div className="pl-leg-chips">
            {filteredSections.map((section) => {
              const state = vadeState.sectionStates[section] || {};
              const hasNote = String(state.note || '').trim().length > 0;
              return (
                <button
                  key={section}
                  type="button"
                  onClick={() => goToSection(section)}
                  className={`pl-leg-chip ${selectedSection === section ? 'active' : ''}`}
                >
                  <span>{section}</span>
                  {(state.favorite || state.reviewed || hasNote) && (
                    <span className="badges">
                      {state.favorite && <Star className="star" />}
                      {state.reviewed && <BookMarked />}
                      {hasNote && <NotebookPen />}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {loadError && (
            <div style={{
              padding: '10px 14px', marginBottom: 10,
              background: 'var(--pl-warn-soft)', color: 'var(--pl-warn)',
              border: '1px solid rgba(180,83,9,0.25)', borderLeft: '3px solid var(--pl-warn)',
              borderRadius: 4, fontSize: 13, fontWeight: 600,
            }}>{loadError}</div>
          )}
          {saveError && (
            <div style={{
              padding: '10px 14px', marginBottom: 10,
              background: 'var(--pl-warn-soft)', color: 'var(--pl-warn)',
              border: '1px solid rgba(180,83,9,0.25)', borderLeft: '3px solid var(--pl-warn)',
              borderRadius: 4, fontSize: 13, fontWeight: 600,
            }}>{saveError}</div>
          )}

          {/* ═══ Reader + Aside ═══ */}
          <div className="pl-leg-body">
            {/* PDF reader — protagonista */}
            <section className="pl-leg-reader">
              <div className="head">
                <div className="title-col">
                  <p>Leitura principal</p>
                  <h2>{selectedSection}</h2>
                </div>
                <div className="nav-row">
                  <button
                    type="button"
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage <= 1}
                    className="pl-btn pl-btn-sm"
                  >
                    <ChevronLeft size={13} /> Anterior
                  </button>
                  <button
                    type="button"
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={maxPage != null && currentPage >= maxPage}
                    className="pl-btn pl-btn-sm"
                  >
                    Próxima <ChevronRight size={13} />
                  </button>
                  <span className="page-tag">
                    Pág {currentPage}{maxPage != null ? ` / ${maxPage}` : ''}
                  </span>
                  <span className="page-tag">
                    Idx {pdfStats.indexedPages}/{pdfStats.pages || '…'}
                  </span>
                  {isIndexingPdf && (
                    <span className="status busy">
                      <Loader2 size={11} className="animate-spin" /> Indexando
                    </span>
                  )}
                  {isSaving && <span className="status save">Salvando…</span>}
                  <a href={activePdfUrl} target="_blank" rel="noreferrer" className="pl-btn pl-btn-sm">
                    <DownloadCloud size={13} /> PDF
                  </a>
                </div>
              </div>
              <div className="canvas">
                <iframe
                  key={`${selectedSection}-${currentPage}`}
                  title="Vade Mecum"
                  src={iframePdfUrl}
                />
              </div>
            </section>

            {/* Aside */}
            <aside className="pl-leg-aside">
              <div className="tabs">
                <button
                  type="button"
                  onClick={() => setAsideTab('bloco')}
                  className={`tab ${asideTab === 'bloco' ? 'active' : ''}`}
                >
                  Bloco
                </button>
                <button
                  type="button"
                  onClick={() => setAsideTab('marc')}
                  className={`tab ${asideTab === 'marc' ? 'active' : ''}`}
                >
                  Marcações
                </button>
                <button
                  type="button"
                  onClick={() => setAsideTab('busca')}
                  className={`tab ${asideTab === 'busca' ? 'active' : ''}`}
                >
                  Busca
                </button>
              </div>

              {asideTab === 'bloco' && (
                <div className="pane">
                  <div>
                    <p className="eyebrow">Bloco ativo</p>
                    <h3>{selectedSection}</h3>
                  </div>
                  <div className="pl-leg-pill-row">
                    <button
                      type="button"
                      onClick={() => updateSectionState({ favorite: !currentSectionState.favorite })}
                      className={`pl-leg-pill ${currentSectionState.favorite ? 'active star' : ''}`}
                    >
                      <Star /> {currentSectionState.favorite ? 'Favorito' : 'Favoritar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => updateSectionState({ reviewed: !currentSectionState.reviewed })}
                      className={`pl-leg-pill ${currentSectionState.reviewed ? 'active' : ''}`}
                    >
                      <BookMarked /> {currentSectionState.reviewed ? 'Revisado' : 'Revisar'}
                    </button>
                  </div>
                  <div>
                    <p className="eyebrow">Anotação rápida</p>
                    <textarea
                      className="pl-leg-note"
                      rows={6}
                      value={currentSectionState.note || ''}
                      onChange={(e) => updateSectionState({ note: e.target.value })}
                      placeholder="Observações, links, jurisprudência…"
                      style={{ marginTop: 6 }}
                    />
                  </div>
                </div>
              )}

              {asideTab === 'marc' && (
                <div className="pane">
                  <p className="eyebrow">Nova marcação (pág {currentPage})</p>
                  <div className="pl-leg-marker-form">
                    <input
                      value={markerDraft.label}
                      onChange={(e) => setMarkerDraft((p) => ({ ...p, label: e.target.value }))}
                      placeholder="Título"
                    />
                    <textarea
                      rows={2}
                      value={markerDraft.excerpt}
                      onChange={(e) => setMarkerDraft((p) => ({ ...p, excerpt: e.target.value }))}
                      placeholder="Trecho ou lembrete"
                    />
                    <div className="pl-leg-color-row">
                      {MARKER_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setMarkerDraft((p) => ({ ...p, color }))}
                          className={`pl-leg-color-dot ${markerDraft.color === color ? 'active' : ''}`}
                          style={{ background: color }}
                          aria-label={`Cor ${color}`}
                        />
                      ))}
                    </div>
                    <button type="button" onClick={addMarker} className="pl-btn pl-btn-primary pl-btn-sm" style={{ justifyContent: 'center' }}>
                      <Bookmark size={13} /> Salvar
                    </button>
                  </div>
                  <p className="eyebrow" style={{ marginTop: 8 }}>Marcações ({markersForCurrentSection.length})</p>
                  <div className="pl-leg-marker-list">
                    {markersForCurrentSection.length === 0 ? (
                      <p style={{ margin: 0, fontSize: 12, color: 'var(--pl-ink-3)', fontWeight: 500 }}>
                        Nenhuma marcação neste bloco ainda.
                      </p>
                    ) : (
                      markersForCurrentSection.map((m) => (
                        <div key={m.id} className="pl-leg-marker-item">
                          <button type="button" onClick={() => goToPage(m.page)} className="info">
                            <p className="lbl">
                              <span className="swatch" style={{ background: m.color }} />
                              <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {m.label || `Página ${m.page}`}
                              </span>
                            </p>
                            {m.excerpt && <p className="excerpt">{m.excerpt}</p>}
                            <p className="pg">Página {m.page}</p>
                          </button>
                          <button
                            type="button"
                            onClick={() => removeMarker(m.id)}
                            className="del"
                            aria-label="Excluir marcação"
                          >
                            <Trash2 />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {asideTab === 'busca' && (
                <div className="pane">
                  <div className="pl-leg-mini-stats">
                    <div className="pl-leg-mini-stat">
                      <span className="lab">Favoritos</span>
                      <span className="val">{favoriteCount}</span>
                    </div>
                    <div className="pl-leg-mini-stat">
                      <span className="lab">Notas</span>
                      <span className="val">{noteCount}</span>
                    </div>
                    <div className="pl-leg-mini-stat">
                      <span className="lab">Revisão</span>
                      <span className="val">{reviewedCount}</span>
                    </div>
                    <div className="pl-leg-mini-stat">
                      <span className="lab">Página</span>
                      <span className="val">{currentPage}</span>
                    </div>
                  </div>

                  {vadeState.searchHistory.length > 0 && (
                    <div>
                      <p className="eyebrow">Últimas buscas</p>
                      <div className="pl-leg-history-tags" style={{ marginTop: 6 }}>
                        {vadeState.searchHistory.map((item) => (
                          <button
                            key={item}
                            type="button"
                            onClick={() => { setPdfSearchDraft(item); setPdfSearch(item); }}
                            className="pl-leg-history-tag"
                          >
                            {item}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {pdfSearch && (
                    <div>
                      <p className="eyebrow">Resultados de "{pdfSearch}"</p>
                      <div className="pl-leg-search-results" style={{ marginTop: 6 }}>
                        {searchResults.length === 0 ? (
                          <p style={{ margin: 0, fontSize: 12, color: 'var(--pl-ink-3)', fontWeight: 500 }}>
                            Nenhuma ocorrência no texto indexado.
                          </p>
                        ) : (
                          searchResults.map((r, i) => (
                            <button
                              key={`${r.page}-${i}-${r.excerpt.slice(0, 24)}`}
                              type="button"
                              onClick={() => goToPage(r.page)}
                              className="pl-leg-search-result"
                            >
                              <span className="meta">Pág {r.page} · {r.section}</span>
                              <p className="ex">{r.excerpt}</p>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
