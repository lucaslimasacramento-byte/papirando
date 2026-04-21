import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Bookmark,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  FileText,
  Highlighter,
  Loader2,
  Minus,
  NotebookPen,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { supabase } from '../lib/supabase';
import { newCard } from '../lib/fsrs';
import PageHeadPremium from '../components/PageHeadPremium';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const HIGHLIGHT_COLORS = [
  { value: '#FCD34D', label: 'Amarelo', cls: 'bg-yellow-300' },
  { value: '#6EE7B7', label: 'Verde',   cls: 'bg-emerald-300' },
  { value: '#93C5FD', label: 'Azul',    cls: 'bg-blue-300'    },
  { value: '#FCA5A5', label: 'Rosa',    cls: 'bg-red-300'     },
];

/** Mesma paleta da aba Legislação — uma linha por marcação no Supabase (`material_markers`). */
const MATERIAL_MARKER_COLORS = ['#2563EB', '#F59E0B', '#10B981', '#EC4899'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function inputCls() {
  return 'w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10';
}

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ErrBanner({ msg }) {
  if (!msg) return null;
  return (
    <div className="mb-3 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700">
      <X size={13} className="shrink-0" />
      {msg}
    </div>
  );
}

// ─── PDF Viewer ───────────────────────────────────────────────────────────────

function PDFViewer({ material, currentUserId, onBack, onCreateFlashcard }) {
  const canvasRef        = useRef(null);
  const pdfDocRef        = useRef(null);
  const renderTaskRef    = useRef(null);

  const [page, setPage]          = useState(material.last_page || 1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale]        = useState(1.4);
  const [loading, setLoading]    = useState(true);
  const [pdfErr, setPdfErr]      = useState('');

  const [highlights, setHighlights] = useState([]);
  const [notes, setNotes]        = useState([]);
  const [markers, setMarkers] = useState([]);
  const [markerDraft, setMarkerDraft] = useState({
    label: '',
    excerpt: '',
    color: MATERIAL_MARKER_COLORS[0],
  });

  // Selection / highlight state
  const [selectedText, setSelectedText]   = useState('');
  const [hlColor, setHlColor]             = useState(HIGHLIGHT_COLORS[0].value);
  const [showHlToolbar, setShowHlToolbar] = useState(false);
  const [toolbarPos, setToolbarPos]       = useState({ x: 0, y: 0 });

  // Note state
  const [noteModal, setNoteModal]       = useState(false);
  const [noteContent, setNoteContent]   = useState('');
  const [notePageTarget, setNotePageTarget] = useState(1);
  const [noteSaving, setNoteSaving]     = useState(false);

  // AI generate flashcard from selection
  const [aiModal, setAiModal]   = useState(false);
  const [aiText, setAiText]     = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiErr, setAiErr]       = useState('');
  const [aiDeckId, setAiDeckId] = useState('');
  const [decks, setDecks]       = useState([]);

  // Load PDF URL from Supabase Storage
  const [pdfUrl, setPdfUrl] = useState(null);

  useEffect(() => {
    async function getUrl() {
      const { data } = await supabase.storage
        .from('study-materials')
        .createSignedUrl(material.storage_path, 60 * 60); // 1h
      if (data?.signedUrl) setPdfUrl(data.signedUrl);
      else setPdfErr('Não foi possível carregar o PDF. Verifique o Storage.');
    }
    getUrl();
  }, [material.storage_path]);

  // Load highlights, notes e marcações (tabela opcional até rodar `supabase/material_markers.sql`)
  useEffect(() => {
    async function loadAnnotations() {
      const [{ data: hls }, { data: nts }, markersRes] = await Promise.all([
        supabase.from('material_highlights').select('*').eq('material_id', material.id).order('created_at'),
        supabase.from('material_notes').select('*').eq('material_id', material.id).order('page_num'),
        supabase
          .from('material_markers')
          .select('*')
          .eq('material_id', material.id)
          .order('page_num', { ascending: true })
          .order('created_at', { ascending: true }),
      ]);
      setHighlights(hls || []);
      setNotes(nts || []);
      if (!markersRes.error) {
        setMarkers(markersRes.data || []);
      } else {
        setMarkers([]);
      }
    }
    loadAnnotations();
  }, [material.id]);

  useEffect(() => {
    setMarkerDraft({
      label: material.title || '',
      excerpt: '',
      color: MATERIAL_MARKER_COLORS[0],
    });
  }, [material.id, material.title]);

  // Load decks for AI modal
  useEffect(() => {
    async function loadDecks() {
      const { data } = await supabase
        .from('flashcard_decks')
        .select('id, title')
        .eq('user_id', currentUserId)
        .order('updated_at', { ascending: false });
      setDecks(data || []);
      if (data && data.length > 0) setAiDeckId(data[0].id);
    }
    loadDecks();
  }, [currentUserId]);

  // Load PDF document
  useEffect(() => {
    if (!pdfUrl) return;
    let cancelled = false;

    async function loadPdf() {
      setLoading(true);
      setPdfErr('');
      try {
        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        const doc = await loadingTask.promise;
        if (cancelled) return;
        pdfDocRef.current = doc;
        setTotalPages(doc.numPages);

        // Update page count in DB
        if (material.page_count !== doc.numPages) {
          await supabase
            .from('study_materials')
            .update({ page_count: doc.numPages })
            .eq('id', material.id);
        }
      } catch (e) {
        if (!cancelled) setPdfErr(`Erro ao abrir o PDF: ${e.message}`);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadPdf();
    return () => { cancelled = true; };
  }, [pdfUrl, material.id, material.page_count]);

  // Render page
  useEffect(() => {
    if (!pdfDocRef.current || !canvasRef.current || loading) return;
    let cancelled = false;

    async function renderPage() {
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }
      try {
        const pdfPage = await pdfDocRef.current.getPage(page);
        if (cancelled) return;

        const viewport = pdfPage.getViewport({ scale });
        const canvas   = canvasRef.current;
        const ctx      = canvas.getContext('2d');
        canvas.width   = viewport.width;
        canvas.height  = viewport.height;

        const task = pdfPage.render({ canvasContext: ctx, viewport });
        renderTaskRef.current = task;
        await task.promise;

        // Save last page
        await supabase
          .from('study_materials')
          .update({ last_page: page, updated_at: new Date().toISOString() })
          .eq('id', material.id);
      } catch (e) {
        if (!cancelled && e?.name !== 'RenderingCancelledException') {
          console.warn('[PDFViewer] render error:', e.message);
        }
      }
    }
    renderPage();
    return () => { cancelled = true; };
  }, [page, scale, loading, material.id]);

  // Text selection → show toolbar
  function handleMouseUp(e) {
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    if (!text || text.length < 3) {
      setShowHlToolbar(false);
      setSelectedText('');
      return;
    }
    setSelectedText(text);
    setShowHlToolbar(true);
    setToolbarPos({ x: e.clientX, y: e.clientY - 50 });
  }

  async function saveHighlight() {
    if (!selectedText) return;
    const { data, error } = await supabase
      .from('material_highlights')
      .insert({
        material_id: material.id,
        user_id:     currentUserId,
        page_num:    page,
        text:        selectedText,
        color:       hlColor,
      })
      .select()
      .single();

    if (!error && data) {
      setHighlights((prev) => [...prev, data]);
    }
    window.getSelection()?.removeAllRanges();
    setShowHlToolbar(false);
    setSelectedText('');
  }

  async function deleteHighlight(id) {
    await supabase.from('material_highlights').delete().eq('id', id);
    setHighlights((prev) => prev.filter((h) => h.id !== id));
  }

  async function saveNote() {
    if (!noteContent.trim()) return;
    setNoteSaving(true);
    const { data, error } = await supabase
      .from('material_notes')
      .insert({
        material_id: material.id,
        user_id:     currentUserId,
        page_num:    notePageTarget,
        content:     noteContent.trim(),
      })
      .select()
      .single();
    setNoteSaving(false);

    if (!error && data) {
      setNotes((prev) => [...prev, data].sort((a, b) => a.page_num - b.page_num));
      setNoteModal(false);
      setNoteContent('');
    }
  }

  async function deleteNote(id) {
    await supabase.from('material_notes').delete().eq('id', id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }

  async function saveMaterialMarker() {
    const label = markerDraft.label.trim() || material.title || `Página ${page}`;
    const excerpt = markerDraft.excerpt.trim();
    const { data, error } = await supabase
      .from('material_markers')
      .insert({
        material_id: material.id,
        user_id: currentUserId,
        page_num: page,
        label,
        excerpt,
        color: markerDraft.color,
      })
      .select()
      .single();

    if (error) {
      window.alert(
        error.message ||
          'Não foi possível salvar a marcação. No Supabase, execute o script supabase/material_markers.sql e tente de novo.'
      );
      return;
    }

    setMarkers((prev) =>
      [...prev, data].sort((a, b) => {
        if (a.page_num !== b.page_num) return a.page_num - b.page_num;
        return String(a.created_at || '').localeCompare(String(b.created_at || ''));
      })
    );
    setMarkerDraft((prev) => ({ ...prev, excerpt: '' }));
  }

  async function deleteMaterialMarker(id) {
    await supabase.from('material_markers').delete().eq('id', id);
    setMarkers((prev) => prev.filter((m) => m.id !== id));
  }

  // AI: grifar → flashcard
  function openAiModal() {
    setAiText(selectedText || '');
    setAiErr('');
    setShowHlToolbar(false);
    window.getSelection()?.removeAllRanges();
    setAiModal(true);
  }

  async function handleAiFlashcard() {
    if (!aiText.trim()) { setAiErr('Nenhum texto selecionado.'); return; }
    if (!aiDeckId) { setAiErr('Selecione um deck de destino.'); return; }
    setAiLoading(true);
    setAiErr('');

    try {
      const res = await fetch('/api/generate-flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: aiText, maxCards: 5 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Erro ao gerar card.');
      if (!Array.isArray(data?.cards) || data.cards.length === 0)
        throw new Error('A IA não gerou cards para este trecho.');

      const base = newCard();
      const rows = data.cards.map((c) => ({
        deck_id:        aiDeckId,
        user_id:        currentUserId,
        front:          String(c.front || '').trim(),
        back:           String(c.back || '').trim(),
        stability:      base.stability,
        difficulty:     base.difficulty,
        elapsed_days:   base.elapsed_days,
        scheduled_days: base.scheduled_days,
        reps:           base.reps,
        lapses:         base.lapses,
        state:          base.state,
        due:            base.due,
        last_review:    base.last_review,
      })).filter((r) => r.front && r.back);

      const { error } = await supabase.from('flashcard_cards').insert(rows);
      if (error) throw new Error(error.message);

      // Also save as highlight
      if (selectedText && selectedText === aiText) await saveHighlight();

      setAiModal(false);
      setAiText('');
      if (onCreateFlashcard) onCreateFlashcard(rows.length);
    } catch (e) {
      setAiErr(e.message);
    } finally {
      setAiLoading(false);
    }
  }

  const pageHighlights = highlights.filter((h) => h.page_num === page);
  const pageNotes      = notes.filter((n) => n.page_num === page);
  const markersSorted = [...markers].sort((a, b) => {
    if (a.page_num !== b.page_num) return a.page_num - b.page_num;
    return String(a.created_at || '').localeCompare(String(b.created_at || ''));
  });

  return (
    <div className="flex h-full flex-col bg-slate-100">
      {/* Top bar */}
      <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
        <button
          onClick={onBack}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-800 truncate">{material.title}</p>
          {material.disciplina && (
            <p className="text-xs text-slate-500">{material.disciplina}</p>
          )}
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-1">
          <button onClick={() => setScale((s) => Math.max(0.5, s - 0.2))} className="rounded-lg p-1.5 text-slate-600 hover:bg-white">
            <ZoomOut size={15} />
          </button>
          <span className="text-xs font-bold text-slate-700 w-12 text-center">{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale((s) => Math.min(3, s + 0.2))} className="rounded-lg p-1.5 text-slate-600 hover:bg-white">
            <ZoomIn size={15} />
          </button>
        </div>

        {/* Note button */}
        <button
          onClick={() => { setNotePageTarget(page); setNoteContent(''); setNoteModal(true); }}
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
        >
          <NotebookPen size={14} />
          Anotar
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* PDF canvas area */}
        <div
          className="flex-1 overflow-auto flex flex-col items-center py-6 px-4 relative"
          onMouseUp={handleMouseUp}
        >
          {pdfErr && (
            <div className="mt-8 rounded-xl border border-red-200 bg-red-50 px-6 py-4 text-sm font-semibold text-red-700">
              {pdfErr}
            </div>
          )}

          {loading && !pdfErr && (
            <div className="flex items-center gap-3 mt-16">
              <Loader2 size={22} className="animate-spin text-blue-500" />
              <span className="text-sm font-semibold text-slate-600">Carregando PDF...</span>
            </div>
          )}

          {!pdfErr && (
            <div className="rounded-lg shadow-xl overflow-hidden ring-1 ring-slate-300">
              <canvas ref={canvasRef} />
            </div>
          )}

          {/* Page navigation */}
          {totalPages > 0 && (
            <div className="flex items-center gap-3 mt-5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-30"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-sm font-bold text-slate-700">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-30"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>

        {/* Sidebar — marcações (DB), grifos e anotações por página */}
        <div className="flex w-[min(100vw-2rem,22rem)] shrink-0 flex-col overflow-hidden border-l border-slate-200 bg-white sm:min-w-[280px]">
          <div className="shrink-0 space-y-3 border-b border-slate-100 px-4 py-4">
            <div className="flex items-center gap-2">
              <Bookmark size={15} className="text-blue-600" />
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Marcações</p>
            </div>
            <p className="text-[11px] font-medium leading-snug text-slate-500">
              Salvas na sua conta (uma por linha no banco), como na Legislação — título, trecho e cor por página.
            </p>
            <input
              value={markerDraft.label}
              onChange={(e) => setMarkerDraft((prev) => ({ ...prev, label: e.target.value }))}
              placeholder="Título da marcação"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
            />
            <textarea
              rows={2}
              value={markerDraft.excerpt}
              onChange={(e) => setMarkerDraft((prev) => ({ ...prev, excerpt: e.target.value }))}
              placeholder="Trecho, lembrete ou fundamento"
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-xs font-medium text-slate-700 outline-none focus:border-blue-500"
            />
            <div className="flex flex-wrap gap-2">
              {MATERIAL_MARKER_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setMarkerDraft((prev) => ({ ...prev, color }))}
                  className={`h-7 w-7 rounded-full border-2 ${markerDraft.color === color ? 'border-slate-800' : 'border-transparent opacity-80'}`}
                  style={{ backgroundColor: color }}
                  aria-label={`Cor ${color}`}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={saveMaterialMarker}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2.5 text-xs font-bold text-white hover:bg-blue-700"
            >
              <Bookmark size={14} />
              Salvar marcação — p. {page}
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
            {markersSorted.length > 0 ? (
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Todas ({markersSorted.length})</p>
                {markersSorted.map((m) => (
                  <div
                    key={m.id}
                    className={`group flex items-start gap-2 rounded-xl border p-2.5 ${
                      m.page_num === page ? 'border-blue-200 bg-blue-50/80' : 'border-slate-100 bg-slate-50/60'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setPage(m.page_num)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: m.color }} />
                        <span className="truncate text-xs font-bold text-slate-800">{m.label || `Página ${m.page_num}`}</span>
                      </div>
                      {m.excerpt ? (
                        <p className="mt-1 line-clamp-2 text-[11px] font-medium leading-relaxed text-slate-600">{m.excerpt}</p>
                      ) : null}
                      <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Página {m.page_num}</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteMaterialMarker(m.id)}
                      className="shrink-0 rounded p-1 text-slate-400 opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                      aria-label="Excluir marcação"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-[11px] font-medium text-slate-400">Nenhuma marcação neste PDF ainda.</p>
            )}
          </div>

          <div className="shrink-0 border-t border-slate-100 px-4 py-3">
          {pageHighlights.length > 0 && (
            <div className="pt-1">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Grifos — p. {page}</p>
              <div className="space-y-2">
                {pageHighlights.map((h) => (
                  <div key={h.id} className="group flex items-start gap-2 rounded-xl p-2.5" style={{ backgroundColor: h.color + '44' }}>
                    <p className="flex-1 text-xs font-semibold text-slate-700 leading-relaxed line-clamp-3">{h.text}</p>
                    <button onClick={() => deleteHighlight(h.id)} className="opacity-0 group-hover:opacity-100 shrink-0 rounded p-0.5 text-slate-400 hover:text-red-400">
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {pageNotes.length > 0 && (
            <div className="pt-3">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Anotações — p. {page}</p>
              <div className="space-y-2">
                {pageNotes.map((n) => (
                  <div key={n.id} className="group flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-2.5">
                    <p className="flex-1 text-xs text-slate-700 leading-relaxed">{n.content}</p>
                    <button onClick={() => deleteNote(n.id)} className="opacity-0 group-hover:opacity-100 shrink-0 rounded p-0.5 text-slate-400 hover:text-red-400">
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {pageHighlights.length === 0 && pageNotes.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
              <Highlighter size={22} className="text-slate-300" />
              <p className="px-2 text-[11px] font-semibold leading-snug text-slate-400">
                Nesta página: selecione texto para grifar ou use flashcards com IA. Use marcações acima para lembretes por página.
              </p>
            </div>
          )}
          </div>
        </div>
      </div>

      {/* Floating selection toolbar */}
      {showHlToolbar && (
        <div
          className="fixed z-50 flex items-center gap-1.5 rounded-2xl bg-slate-800 px-3 py-2 shadow-2xl"
          style={{ left: toolbarPos.x - 100, top: toolbarPos.y }}
        >
          {/* Color dots */}
          {HIGHLIGHT_COLORS.map((c) => (
            <button
              key={c.value}
              onClick={() => setHlColor(c.value)}
              className={`h-5 w-5 rounded-full border-2 transition-all ${hlColor === c.value ? 'border-white scale-125' : 'border-transparent opacity-70'}`}
              style={{ backgroundColor: c.value }}
              title={c.label}
            />
          ))}
          <div className="w-px h-5 bg-slate-600 mx-1" />
          <button
            onClick={saveHighlight}
            className="flex items-center gap-1 rounded-lg bg-yellow-400 px-2.5 py-1 text-xs font-bold text-slate-900 hover:bg-yellow-300"
          >
            <Highlighter size={12} />
            Grifar
          </button>
          <button
            onClick={openAiModal}
            className="flex items-center gap-1 rounded-lg bg-violet-500 px-2.5 py-1 text-xs font-bold text-white hover:bg-violet-400"
          >
            <Sparkles size={12} />
            Flashcard
          </button>
          <button
            onClick={() => { setShowHlToolbar(false); window.getSelection()?.removeAllRanges(); }}
            className="rounded-lg p-1 text-slate-400 hover:text-white"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* Note modal */}
      {noteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h3 className="text-base font-bold text-slate-800">Anotação — Página {notePageTarget}</h3>
              <button onClick={() => setNoteModal(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                <X size={16} />
              </button>
            </div>
            <div className="px-6 py-5">
              <textarea
                rows={4}
                autoFocus
                className={inputCls()}
                placeholder="Escreva sua anotação..."
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
              <button onClick={() => setNoteModal(false)} className="rounded-xl border-2 border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">
                Cancelar
              </button>
              <button
                onClick={saveNote}
                disabled={noteSaving || !noteContent.trim()}
                className="flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2 text-sm font-bold text-white hover:bg-amber-600 disabled:opacity-50"
              >
                {noteSaving ? <Loader2 size={14} className="animate-spin" /> : <NotebookPen size={14} />}
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Flashcard modal */}
      {aiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h3 className="text-base font-bold text-slate-800">Grifar e criar Flashcard com IA</h3>
              <button onClick={() => setAiModal(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                <X size={16} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <ErrBanner msg={aiErr} />
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Trecho selecionado</label>
                <div className="mt-1.5 rounded-xl border-2 border-slate-200 bg-yellow-50 px-4 py-3 text-sm text-slate-700 leading-relaxed max-h-32 overflow-y-auto">
                  {aiText || <span className="text-slate-400 italic">Nenhum texto selecionado</span>}
                </div>
              </div>
              {decks.length > 0 && (
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Deck de destino</label>
                  <select
                    className={`${inputCls()} mt-1.5`}
                    value={aiDeckId}
                    onChange={(e) => setAiDeckId(e.target.value)}
                  >
                    {decks.map((d) => (
                      <option key={d.id} value={d.id}>{d.title}</option>
                    ))}
                  </select>
                </div>
              )}
              {decks.length === 0 && (
                <p className="text-sm text-amber-700 bg-amber-50 rounded-xl px-4 py-3 border border-amber-200 font-semibold">
                  Crie um deck de flashcards primeiro para salvar os cards gerados.
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
              <button onClick={() => setAiModal(false)} className="rounded-xl border-2 border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">
                Cancelar
              </button>
              <button
                onClick={handleAiFlashcard}
                disabled={aiLoading || !aiText || !aiDeckId}
                className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-50"
              >
                {aiLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {aiLoading ? 'Gerando...' : 'Criar flashcards'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function Materiais({ currentUserId }) {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [activeMaterial, setActiveMaterial] = useState(null);

  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState('');
  const [uploadModal, setUploadModal] = useState(false);
  const [uploadForm, setUploadForm] = useState({ title: '', disciplina: '' });
  const [uploadFile, setUploadFile] = useState(null);

  const [flashcardToast, setFlashcardToast] = useState('');
  const fileInputRef = useRef(null);

  const loadMaterials = useCallback(async () => {
    if (!currentUserId) return;
    setLoading(true);
    const { data } = await supabase
      .from('study_materials')
      .select('*')
      .eq('user_id', currentUserId)
      .order('updated_at', { ascending: false });
    setMaterials(data || []);
    setLoading(false);
  }, [currentUserId]);

  useEffect(() => { loadMaterials(); }, [loadMaterials]);

  async function handleUpload() {
    if (!uploadFile) { setUploadErr('Selecione um arquivo PDF.'); return; }
    if (!uploadForm.title.trim()) { setUploadErr('Informe um título.'); return; }
    if (uploadFile.type !== 'application/pdf') { setUploadErr('Apenas arquivos PDF são aceitos.'); return; }

    setUploading(true);
    setUploadErr('');

    try {
      const ext       = 'pdf';
      const fileName  = `${currentUserId}/${Date.now()}.${ext}`;
      const { error: storageErr } = await supabase.storage
        .from('study-materials')
        .upload(fileName, uploadFile, { contentType: 'application/pdf', upsert: false });

      if (storageErr) throw new Error(storageErr.message);

      const { data, error: dbErr } = await supabase
        .from('study_materials')
        .insert({
          user_id:      currentUserId,
          title:        uploadForm.title.trim(),
          disciplina:   uploadForm.disciplina.trim(),
          storage_path: fileName,
          file_size:    uploadFile.size,
        })
        .select()
        .single();

      if (dbErr) throw new Error(dbErr.message);

      setMaterials((prev) => [data, ...prev]);
      setUploadModal(false);
      setUploadForm({ title: '', disciplina: '' });
      setUploadFile(null);
    } catch (e) {
      setUploadErr(e.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(material) {
    await supabase.storage.from('study-materials').remove([material.storage_path]);
    await supabase.from('study_materials').delete().eq('id', material.id);
    setMaterials((prev) => prev.filter((m) => m.id !== material.id));
  }

  function showFlashcardToast(count) {
    setFlashcardToast(`${count} flashcard${count > 1 ? 's' : ''} criado${count > 1 ? 's' : ''}!`);
    setTimeout(() => setFlashcardToast(''), 3000);
  }

  if (!currentUserId) {
    return (
      <div className="flex h-full items-center justify-center text-slate-400">
        <p className="text-sm">Faça login para acessar seus materiais.</p>
      </div>
    );
  }

  if (activeMaterial) {
    return (
      <>
        <PDFViewer
          material={activeMaterial}
          currentUserId={currentUserId}
          onBack={() => { setActiveMaterial(null); loadMaterials(); }}
          onCreateFlashcard={showFlashcardToast}
        />
        {flashcardToast && (
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-bold text-white shadow-xl">
            <Sparkles size={16} />
            {flashcardToast}
          </div>
        )}
      </>
    );
  }

  return (
    <div className="page-shell flex h-full min-h-0 flex-col gap-0 p-0">
      <PageHeadPremium
        className="shrink-0 rounded-none border-x-0 border-t-0 lg:!px-6"
        icon={FileText}
        title="Materiais de estudo"
        subtitle="PDFs com marcações salvas, highlight, anotações e flashcards via IA"
        trailing={
          <button
            type="button"
            onClick={() => { setUploadErr(''); setUploadModal(true); }}
            className="btn-primary inline-flex shrink-0 items-center gap-1.5 self-start px-3 py-2 text-xs font-semibold sm:self-center sm:px-3.5 sm:py-2 sm:text-[13px]"
          >
            <Upload size={14} />
            Enviar PDF
          </button>
        }
      />

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-5 lg:px-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={28} className="animate-spin text-blue-500" />
          </div>
        ) : materials.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-100">
              <FileText size={36} className="text-slate-400" />
            </div>
            <div className="text-center">
              <p className="font-bold text-slate-700">Nenhum material ainda</p>
              <p className="text-sm text-slate-500 mt-1">Envie PDFs de apostilas, leis ou resumos para estudar com IA.</p>
            </div>
            <button
              type="button"
              onClick={() => { setUploadErr(''); setUploadModal(true); }}
              className="btn-primary"
            >
              <Upload size={16} />
              Enviar primeiro PDF
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {materials.map((m) => (
              <div
                key={m.id}
                className="section-card group relative flex cursor-pointer flex-col gap-3 p-5 transition-all hover:border-blue-200 hover:shadow-sm"
                onClick={() => setActiveMaterial(m)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50">
                    <FileText size={20} className="text-red-500" />
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(m); }}
                    className="opacity-0 group-hover:opacity-100 rounded-lg p-1.5 text-slate-300 hover:text-red-400 hover:bg-red-50 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div>
                  <h3 className="font-semibold leading-tight text-slate-900">{m.title}</h3>
                  {m.disciplina && (
                    <p className="text-xs font-bold text-blue-600 mt-0.5">{m.disciplina}</p>
                  )}
                </div>

                <div className="flex items-center gap-3 mt-auto pt-1 text-xs text-slate-500 font-semibold">
                  {m.page_count > 0 && <span>{m.page_count} páginas</span>}
                  {m.file_size > 0 && <span>{formatFileSize(m.file_size)}</span>}
                  {m.last_page > 1 && (
                    <span className="ml-auto text-blue-600">p. {m.last_page}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload modal */}
      {uploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h3 className="text-base font-bold text-slate-800">Enviar PDF</h3>
              <button onClick={() => setUploadModal(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
                <X size={16} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <ErrBanner msg={uploadErr} />

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Título *</label>
                <input
                  type="text"
                  className={inputCls()}
                  placeholder="Ex: Apostila Direito Administrativo 2025"
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm((f) => ({ ...f, title: e.target.value }))}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Disciplina</label>
                <input
                  type="text"
                  className={inputCls()}
                  placeholder="Ex: Direito Administrativo"
                  value={uploadForm.disciplina}
                  onChange={(e) => setUploadForm((f) => ({ ...f, disciplina: e.target.value }))}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">Arquivo PDF *</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:border-blue-400 transition-all"
                >
                  <Upload size={18} className="text-slate-400" />
                  {uploadFile ? uploadFile.name : 'Clique para selecionar o PDF'}
                </button>
                {uploadFile && (
                  <p className="text-xs text-slate-500 font-semibold">{formatFileSize(uploadFile.size)}</p>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
              <button onClick={() => setUploadModal(false)} className="rounded-xl border-2 border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">
                Cancelar
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                {uploading ? 'Enviando...' : 'Enviar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
