import React, { useEffect, useMemo, useRef, useState } from 'react';
import PageHeadPremium, {
  PAGE_HEAD_PREMIUM_PRIMARY_ACTION_CLASS,
  PageHeadPremiumBadge,
} from '../components/PageHeadPremium';
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
      <div className="min-h-screen w-full bg-[var(--bg-app)] p-4 md:p-6">
        <div className="app-main-shell flex min-h-[calc(100vh-140px)] items-center justify-center rounded-[28px] border border-slate-200 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
          <div className="flex items-center gap-3 text-sm font-semibold text-slate-500">
            <Loader2 size={18} className="animate-spin text-blue-700" />
            Carregando Vade Mecum...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[var(--bg-app)] p-4 md:p-6 xl:p-8">
      <div className="app-main-shell mx-auto flex min-h-[calc(100vh-120px)] w-full max-w-[1320px] flex-col gap-6">
      {!focusMode && (
        <PageHeadPremium
          className="mb-6 shrink-0 animate-in fade-in duration-500 gap-4 lg:!flex-row lg:!items-stretch lg:!justify-between xl:!items-center"
          icon={Scale}
          titleAs="h1"
          badge={
            <PageHeadPremiumBadge icon={BookMarked}>
              Lei seca integrada
            </PageHeadPremiumBadge>
          }
          title="Legislação · Vade Mecum"
          leadingClassName="min-w-0 shrink-0 lg:max-w-[26rem] xl:max-w-[28rem]"
          leadingExtra={
            <div className="max-w-md">
              <div className="flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                <span>Revisão por bloco</span>
                <span className="tabular-nums text-slate-400">
                  {reviewedCount}/{orderedSections.length} ({reviewProgressPct}%)
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-emerald-400/90 transition-[width] duration-300"
                  style={{ width: `${reviewProgressPct}%` }}
                />
              </div>
            </div>
          }
          statsStackBelowTrailing
          statsDense
          stats={legislacaoHeaderStats}
          statGridClassName="grid min-h-0 w-full min-w-0 shrink-0 grid-cols-2 gap-1.5 sm:grid-cols-4 sm:gap-2 [&>*]:min-w-0 [&>*]:self-stretch"
          trailingWrapClassName="lg:ml-auto lg:w-full lg:max-w-none xl:w-auto xl:max-w-[min(100%,44rem)] xl:shrink-0"
          trailing={(
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-2">
              <a
                href={fullReaderUrl}
                target="_blank"
                rel="noreferrer"
                className={`${PAGE_HEAD_PREMIUM_PRIMARY_ACTION_CLASS} w-full sm:w-auto`}
              >
                <DownloadCloud size={14} aria-hidden />
                Leitor completo
              </a>
            </div>
          )}
        />
      )}

      {!focusMode && (
        <section className="rounded-[28px] border border-slate-200/90 bg-white p-4 shadow-[0_12px_44px_rgba(15,23,42,0.07)] ring-1 ring-slate-900/[0.03] md:p-6">
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-[0_10px_28px_rgba(37,99,235,0.35)] sm:h-14 sm:w-14">
                  <Scale size={22} className="sm:h-6 sm:w-6" strokeWidth={2} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Arquivo ativo</p>
                  <h3 className="mt-1 text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">{documentMeta?.title}</h3>
                  <p className="mt-1 text-sm font-medium leading-relaxed text-slate-500">
                    {documentMeta?.edition} · {documentMeta?.source} · Atualizado em {documentMeta?.updatedAtLabel}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {isAdmin ? (
                  <>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700 disabled:opacity-70"
                    >
                      {isUploading ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
                      Atualizar arquivo
                    </button>
                    <button
                      type="button"
                      onClick={handleResetDocument}
                      disabled={isUploading}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 disabled:opacity-70"
                    >
                      <RefreshCw size={16} />
                      Base oficial
                    </button>
                    {typeof onOpenAdminLegislacao === 'function' ? (
                      <button
                        type="button"
                        onClick={onOpenAdminLegislacao}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-bold text-indigo-800"
                      >
                        <Settings size={16} />
                        Lançamentos (admin)
                      </button>
                    ) : null}
                  </>
                ) : null}

                <button
                  type="button"
                  onClick={() => setFocusMode(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700"
                >
                  <Focus size={16} />
                  Modo foco
                </button>

                <a
                  href={fullReaderUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700"
                >
                  <DownloadCloud size={16} />
                  Abrir leitor completo
                </a>
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-[0.45fr_0.55fr]">
              <div className="relative">
                <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar bloco legislativo..."
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-3 pl-11 pr-4 text-sm font-bold text-gray-700 outline-none focus:border-blue-600"
                />
              </div>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={pdfSearchDraft}
                    onChange={(event) => setPdfSearchDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') submitPdfSearch();
                    }}
                    placeholder="Buscar texto no PDF..."
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-3 pl-11 pr-4 text-sm font-bold text-gray-700 outline-none focus:border-blue-600"
                  />
                </div>
                <button type="button" onClick={submitPdfSearch} className="btn-primary rounded-2xl px-4 py-3">
                  Buscar
                </button>
              </div>
            </div>

            <div className="custom-scrollbar flex gap-2 overflow-x-auto pb-1">
              {filteredSections.map((section) => {
                const state = vadeState.sectionStates[section] || {};
                return (
                  <button
                    key={section}
                    type="button"
                    onClick={() => goToSection(section)}
                    className={`shrink-0 rounded-xl border px-4 py-2.5 text-sm font-bold transition ${
                      selectedSection === section
                        ? 'border-blue-200 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-gray-50/70 text-gray-700 hover:border-blue-200 hover:bg-blue-50/60 hover:text-blue-700'
                    }`}
                  >
                    <span>{section}</span>
                    {state.favorite || state.reviewed || String(state.note || '').trim() ? ' •' : ''}
                  </button>
                );
              })}
            </div>

            {favoriteSections.length > 0 ? (
              <div className="rounded-[1.25rem] border border-amber-100/80 bg-amber-50/40 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-800/80">Atalhos favoritos</p>
                <div className="custom-scrollbar mt-2 flex gap-2 overflow-x-auto pb-0.5">
                  {favoriteSections.map((section) => (
                    <button
                      key={section}
                      type="button"
                      onClick={() => goToSection(section)}
                      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                        selectedSection === section
                          ? 'border-amber-300 bg-white text-amber-900 shadow-sm'
                          : 'border-amber-200/90 bg-white/80 text-amber-900/90 hover:border-amber-300'
                      }`}
                    >
                      <Star size={12} className="shrink-0 text-amber-500" fill="currentColor" />
                      <span className="max-w-[200px] truncate">{section}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.4rem] border border-gray-200 bg-gray-50/70 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-600 disabled:opacity-50"
                >
                  <ChevronLeft size={15} />
                  Anterior
                </button>
                <button
                  type="button"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={maxPage != null && currentPage >= maxPage}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-600 disabled:opacity-50"
                >
                  Próxima
                  <ChevronRight size={15} />
                </button>
                <span className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700">
                  Página {currentPage}
                  {maxPage != null ? ` / ${maxPage}` : ''}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs font-bold">
                <span className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-gray-500">
                  PDF indexado: {pdfStats.indexedPages}/{pdfStats.pages || '...'}
                </span>
                {isIndexingPdf ? (
                  <span className="inline-flex items-center gap-2 text-amber-600">
                    <Loader2 size={14} className="animate-spin" />
                    Preparando busca interna
                  </span>
                ) : null}
                {isSaving ? <span className="text-emerald-600">Salvando...</span> : null}
              </div>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handleChooseNewPdf}
          />
        </section>
      )}

      {loadError ? (
        <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
          {loadError}
        </div>
      ) : null}

      {saveError ? (
        <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
          {saveError}
        </div>
      ) : null}

      {focusMode ? (
        <section className="flex min-h-[calc(100vh-140px)] flex-col overflow-hidden rounded-[2.2rem] border border-slate-900 bg-[#050816] shadow-[0_24px_80px_rgba(2,6,23,0.4)]">
          <div className="flex items-center justify-between gap-4 border-b border-slate-800 bg-[#0b1220] px-5 py-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Modo foco</p>
              <h3 className="mt-1 text-xl font-semibold text-white">{selectedSection}</h3>
              <p className="mt-1 text-xs font-medium text-slate-500">Pressione Esc para sair do modo foco</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <a
                href={activePdfUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-bold text-slate-200"
              >
                <DownloadCloud size={15} />
                Abrir PDF
              </a>

              <button
                type="button"
                onClick={() => setFocusMode(false)}
                className="inline-flex items-center gap-2 rounded-xl border border-blue-200/20 bg-blue-500/10 px-4 py-2.5 text-sm font-bold text-blue-200"
              >
                <Minimize2 size={15} />
                Sair do foco
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 bg-[#020617] p-3">
            <iframe
              key={`focus-${selectedSection}-${currentPage}`}
              title="Vade Mecum foco"
              src={iframePdfUrl}
              className="h-full w-full rounded-[1.4rem] border border-slate-800 bg-white"
            />
          </div>
        </section>
      ) : (
        <div className="grid min-h-0 flex-1 gap-6 xl:grid-cols-[1.55fr_0.45fr]">
          <section className="flex min-h-[calc(100vh-320px)] flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
            <div className="flex items-center justify-between gap-4 border-b border-gray-100 px-5 py-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">Leitura principal</p>
                <h3 className="mt-1 text-xl font-semibold text-slate-900">{selectedSection}</h3>
              </div>
              <a
                href={activePdfUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700"
              >
                <DownloadCloud size={15} />
                Abrir PDF
              </a>
            </div>

            <div className="min-h-0 flex-1 bg-[var(--bg-canvas)] p-3">
              <iframe
                key={`${selectedSection}-${currentPage}`}
                title="Vade Mecum"
                src={iframePdfUrl}
                className="h-full w-full rounded-[1.5rem] border border-gray-200 bg-white"
              />
            </div>
          </section>

          <aside className="flex min-h-[calc(100vh-320px)] flex-col gap-6">
            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">Bloco ativo</p>
              <h3 className="mt-2 text-xl font-semibold text-slate-900">{selectedSection}</h3>

              <div className="mt-5 flex flex-wrap gap-2">
                <ActionPill
                  active={currentSectionState.favorite}
                  icon={Star}
                  label={currentSectionState.favorite ? 'Favorito' : 'Marcar favorito'}
                  onClick={() => updateSectionState({ favorite: !currentSectionState.favorite })}
                />
                <ActionPill
                  active={currentSectionState.reviewed}
                  icon={BookMarked}
                  label={currentSectionState.reviewed ? 'Marcado para revisão' : 'Marcar revisão'}
                  onClick={() => updateSectionState({ reviewed: !currentSectionState.reviewed })}
                />
              </div>

              <div className="mt-5">
                <label className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                  Anotação rápida
                </label>
                <textarea
                  rows="8"
                  value={currentSectionState.note || ''}
                  onChange={(event) => updateSectionState({ note: event.target.value })}
                  placeholder="Escreva observações, links mentais, jurisprudência ou pontos para revisar depois."
                  className="mt-2 w-full rounded-[1.4rem] border border-gray-200 bg-gray-50/70 px-4 py-4 text-sm font-medium leading-relaxed text-gray-600 outline-none focus:border-blue-600"
                />
              </div>
            </section>

            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
              <div className="flex items-center gap-2">
                <Highlighter size={16} className="text-blue-700" />
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">Marcações</p>
              </div>

              <div className="mt-4 grid gap-3">
                <input
                  value={markerDraft.label}
                  onChange={(event) => setMarkerDraft((prev) => ({ ...prev, label: event.target.value }))}
                  placeholder="Título da marcação"
                  className="rounded-xl border border-gray-200 bg-gray-50/70 px-4 py-3 text-sm font-semibold text-gray-700 outline-none focus:border-blue-600"
                />
                <textarea
                  rows="3"
                  value={markerDraft.excerpt}
                  onChange={(event) => setMarkerDraft((prev) => ({ ...prev, excerpt: event.target.value }))}
                  placeholder="Trecho, lembrete ou fundamento da marcação"
                  className="rounded-[1.2rem] border border-gray-200 bg-gray-50/70 px-4 py-3 text-sm font-medium text-gray-700 outline-none focus:border-blue-600"
                />
                <div className="flex flex-wrap gap-2">
                  {MARKER_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setMarkerDraft((prev) => ({ ...prev, color }))}
                      className={`h-8 w-8 rounded-full border-2 ${markerDraft.color === color ? 'border-slate-700' : 'border-white'}`}
                      style={{ backgroundColor: color }}
                      aria-label={`Selecionar cor ${color}`}
                    />
                  ))}
                </div>
                <button type="button" onClick={addMarker} className="btn-primary rounded-xl px-4 py-3">
                  <Bookmark size={15} />
                  Salvar marcação da página {currentPage}
                </button>
              </div>

              <div className="custom-scrollbar mt-5 max-h-64 space-y-3 overflow-y-auto pr-1">
                {markersForCurrentSection.length === 0 ? (
                  <p className="text-sm font-medium text-gray-500">Nenhuma marcação salva neste bloco ainda.</p>
                ) : (
                  markersForCurrentSection.map((marker) => (
                    <div key={marker.id} className="rounded-[1.2rem] border border-gray-200 bg-gray-50/70 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => goToPage(marker.page)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <div className="flex items-center gap-2">
                            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: marker.color }} />
                            <p className="truncate font-semibold text-slate-900">{marker.label || `Página ${marker.page}`}</p>
                          </div>
                          <p className="mt-2 text-sm font-medium leading-relaxed text-gray-500">{marker.excerpt}</p>
                          <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400">
                            Página {marker.page}
                          </p>
                        </button>
                        <button
                          type="button"
                          onClick={() => removeMarker(marker.id)}
                          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
              <div className="flex items-center gap-2">
                <NotebookPen size={16} className="text-blue-700" />
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">Busca e resumo</p>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <MiniStat label="Favoritos" value={String(favoriteCount)} />
                <MiniStat label="Notas" value={String(noteCount)} />
                <MiniStat label="Revisão" value={String(reviewedCount)} />
                <MiniStat label="Página" value={String(currentPage)} />
              </div>

              {vadeState.searchHistory.length > 0 ? (
                <div className="mt-5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-400">Últimas buscas</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {vadeState.searchHistory.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => {
                          setPdfSearchDraft(item);
                          setPdfSearch(item);
                        }}
                        className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-bold text-gray-600"
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {pdfSearch ? (
                <div className="mt-5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-400">
                    Resultados da busca
                  </p>
                  <div className="custom-scrollbar mt-3 max-h-72 space-y-3 overflow-y-auto pr-1">
                    {searchResults.length === 0 ? (
                      <RoadmapCard title="Sem resultados" text="Nenhuma ocorrência encontrada no texto indexado do PDF." />
                    ) : (
                      searchResults.map((result, idx) => (
                        <button
                          key={`${result.page}-${idx}-${result.excerpt.slice(0, 24)}`}
                          type="button"
                          onClick={() => goToPage(result.page)}
                          className="w-full rounded-[1.4rem] border border-gray-200 bg-gray-50/70 p-4 text-left transition-colors hover:border-blue-200 hover:bg-blue-50/50"
                        >
                          <p className="font-semibold text-slate-900">
                            Página {result.page} · {result.section}
                          </p>
                          <p className="mt-2 text-sm font-medium leading-relaxed text-gray-500">{result.excerpt}</p>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              ) : null}

              <div className="mt-5 space-y-3">
                <RoadmapCard
                  title="Persistência por usuário"
                  text={
                    currentUserId
                      ? 'Favoritos, notas, página atual e marcações estão vinculados à sua conta.'
                      : 'Sem login, o Vade Mecum usa apenas persistência local.'
                  }
                />
                <RoadmapCard
                  title="Atalhos rápidos"
                  text={
                    favoriteSections.length > 0
                      ? `Favoritos ativos: ${favoriteSections.slice(0, 3).join(', ')}${favoriteSections.length > 3 ? '...' : ''}`
                      : 'Marque blocos como favoritos para criar seus atalhos de revisão.'
                  }
                />
              </div>
            </section>
          </aside>
        </div>
      )}
      </div>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-[1.3rem] border border-gray-200 bg-gray-50/70 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function ActionPill({ active, icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition ${
        active
          ? 'border-blue-200 bg-blue-50 text-blue-700'
          : 'border-gray-200 bg-white text-gray-500 hover:border-blue-100 hover:text-blue-700'
      }`}
    >
      <Icon size={13} className={active ? 'fill-current' : ''} />
      {label}
    </button>
  );
}

function RoadmapCard({ title, text }) {
  return (
    <div className="rounded-[1.4rem] border border-gray-200 bg-gray-50/70 p-4">
      <p className="font-semibold text-slate-900">{title}</p>
      <p className="mt-2 text-sm font-medium leading-relaxed text-gray-500">{text}</p>
    </div>
  );
}
