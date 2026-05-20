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
  Search,
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
import { resolveAiHeaders } from '../lib/aiRuntime';
import { newCard } from '../lib/fsrs';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const HIGHLIGHT_COLORS = [
  { value: '#FCD34D', label: 'Amarelo' },
  { value: '#6EE7B7', label: 'Verde' },
  { value: '#93C5FD', label: 'Azul' },
  { value: '#FCA5A5', label: 'Rosa' },
];

const MATERIAL_MARKER_COLORS = ['#1d4ed8', '#f59e0b', '#10b981', '#ec4899'];

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ErrBanner({ msg }) {
  if (!msg) return null;
  return (
    <div
      role="alert"
      style={{
        padding: '10px 14px',
        background: 'var(--pl-danger-soft)',
        color: 'var(--pl-danger)',
        border: '1px solid rgba(185,28,28,0.25)',
        borderLeft: '3px solid var(--pl-danger)',
        borderRadius: 4,
        fontSize: 13, fontWeight: 600,
        display: 'flex', alignItems: 'center', gap: 8,
      }}
    >
      <X size={13} /> {msg}
    </div>
  );
}

function SheetMark({ pdf = true }) {
  return (
    <div className={`pl-sheet-mark ${pdf ? 'pdf' : ''}`} aria-hidden>
      <div className="back" />
      <div className="front" />
      <div className="fold" />
    </div>
  );
}

/* ════════════════════════════════════════════════
   PDF Viewer
   ════════════════════════════════════════════════ */
function PDFViewer({ material, currentUserId, onBack, onCreateFlashcard }) {
  const canvasRef = useRef(null);
  const pdfDocRef = useRef(null);
  const renderTaskRef = useRef(null);

  const [page, setPage] = useState(material.last_page || 1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.4);
  const [loading, setLoading] = useState(true);
  const [pdfErr, setPdfErr] = useState('');

  const [highlights, setHighlights] = useState([]);
  const [notes, setNotes] = useState([]);
  const [markers, setMarkers] = useState([]);
  const [markerDraft, setMarkerDraft] = useState({
    label: '', excerpt: '', color: MATERIAL_MARKER_COLORS[0],
  });

  const [selectedText, setSelectedText] = useState('');
  const [hlColor, setHlColor] = useState(HIGHLIGHT_COLORS[0].value);
  const [showHlToolbar, setShowHlToolbar] = useState(false);
  const [toolbarPos, setToolbarPos] = useState({ x: 0, y: 0 });

  const [noteModal, setNoteModal] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [notePageTarget, setNotePageTarget] = useState(1);
  const [noteSaving, setNoteSaving] = useState(false);

  const [aiModal, setAiModal] = useState(false);
  const [aiText, setAiText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiErr, setAiErr] = useState('');
  const [aiDeckId, setAiDeckId] = useState('');
  const [decks, setDecks] = useState([]);

  const [pdfUrl, setPdfUrl] = useState(null);

  /* ─ load url ─ */
  useEffect(() => {
    async function getUrl() {
      const { data } = await supabase.storage
        .from('study-materials')
        .createSignedUrl(material.storage_path, 60 * 60);
      if (data?.signedUrl) setPdfUrl(data.signedUrl);
      else setPdfErr('Não foi possível carregar o PDF. Verifique o Storage.');
    }
    getUrl();
  }, [material.storage_path]);

  /* ─ load annotations ─ */
  useEffect(() => {
    async function loadAnnotations() {
      const [{ data: hls }, { data: nts }, markersRes] = await Promise.all([
        supabase.from('material_highlights').select('*').eq('material_id', material.id).order('created_at'),
        supabase.from('material_notes').select('*').eq('material_id', material.id).order('page_num'),
        supabase.from('material_markers').select('*').eq('material_id', material.id)
          .order('page_num', { ascending: true }).order('created_at', { ascending: true }),
      ]);
      setHighlights(hls || []);
      setNotes(nts || []);
      setMarkers(markersRes.error ? [] : (markersRes.data || []));
    }
    loadAnnotations();
  }, [material.id]);

  useEffect(() => {
    setMarkerDraft({ label: material.title || '', excerpt: '', color: MATERIAL_MARKER_COLORS[0] });
  }, [material.id, material.title]);

  /* ─ load decks ─ */
  useEffect(() => {
    async function loadDecks() {
      const { data } = await supabase
        .from('flashcard_decks').select('id, title')
        .eq('user_id', currentUserId).order('updated_at', { ascending: false });
      setDecks(data || []);
      if (data && data.length > 0) setAiDeckId(data[0].id);
    }
    loadDecks();
  }, [currentUserId]);

  /* ─ load document ─ */
  useEffect(() => {
    if (!pdfUrl) return;
    let cancelled = false;
    async function loadPdf() {
      setLoading(true); setPdfErr('');
      try {
        const doc = await pdfjsLib.getDocument(pdfUrl).promise;
        if (cancelled) return;
        pdfDocRef.current = doc;
        setTotalPages(doc.numPages);
        if (material.page_count !== doc.numPages) {
          await supabase.from('study_materials').update({ page_count: doc.numPages }).eq('id', material.id);
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

  /* ─ render page ─ */
  useEffect(() => {
    if (!pdfDocRef.current || !canvasRef.current || loading) return;
    let cancelled = false;
    async function renderPage() {
      if (renderTaskRef.current) { renderTaskRef.current.cancel(); renderTaskRef.current = null; }
      try {
        const pdfPage = await pdfDocRef.current.getPage(page);
        if (cancelled) return;
        const viewport = pdfPage.getViewport({ scale });
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        canvas.width = viewport.width; canvas.height = viewport.height;
        const task = pdfPage.render({ canvasContext: ctx, viewport });
        renderTaskRef.current = task;
        await task.promise;
        await supabase.from('study_materials')
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

  function handleMouseUp(e) {
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    if (!text || text.length < 3) {
      setShowHlToolbar(false); setSelectedText(''); return;
    }
    setSelectedText(text); setShowHlToolbar(true);
    setToolbarPos({ x: e.clientX, y: e.clientY - 50 });
  }

  async function saveHighlight() {
    if (!selectedText) return;
    const { data, error } = await supabase.from('material_highlights')
      .insert({ material_id: material.id, user_id: currentUserId, page_num: page, text: selectedText, color: hlColor })
      .select().single();
    if (!error && data) setHighlights((prev) => [...prev, data]);
    window.getSelection()?.removeAllRanges();
    setShowHlToolbar(false); setSelectedText('');
  }

  async function deleteHighlight(id) {
    await supabase.from('material_highlights').delete().eq('id', id);
    setHighlights((prev) => prev.filter((h) => h.id !== id));
  }

  async function saveNote() {
    if (!noteContent.trim()) return;
    setNoteSaving(true);
    const { data, error } = await supabase.from('material_notes')
      .insert({ material_id: material.id, user_id: currentUserId, page_num: notePageTarget, content: noteContent.trim() })
      .select().single();
    setNoteSaving(false);
    if (!error && data) {
      setNotes((prev) => [...prev, data].sort((a, b) => a.page_num - b.page_num));
      setNoteModal(false); setNoteContent('');
    }
  }

  async function deleteNote(id) {
    await supabase.from('material_notes').delete().eq('id', id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }

  async function saveMaterialMarker() {
    const label = markerDraft.label.trim() || material.title || `Página ${page}`;
    const excerpt = markerDraft.excerpt.trim();
    const { data, error } = await supabase.from('material_markers')
      .insert({
        material_id: material.id, user_id: currentUserId, page_num: page,
        label, excerpt, color: markerDraft.color,
      })
      .select().single();
    if (error) {
      window.alert(error.message || 'Não foi possível salvar a marcação. No Supabase, execute o script supabase/material_markers.sql e tente de novo.');
      return;
    }
    setMarkers((prev) => [...prev, data].sort((a, b) => {
      if (a.page_num !== b.page_num) return a.page_num - b.page_num;
      return String(a.created_at || '').localeCompare(String(b.created_at || ''));
    }));
    setMarkerDraft((prev) => ({ ...prev, excerpt: '' }));
  }

  async function deleteMaterialMarker(id) {
    await supabase.from('material_markers').delete().eq('id', id);
    setMarkers((prev) => prev.filter((m) => m.id !== id));
  }

  function openAiModal() {
    setAiText(selectedText || ''); setAiErr('');
    setShowHlToolbar(false); window.getSelection()?.removeAllRanges();
    setAiModal(true);
  }

  async function handleAiFlashcard() {
    if (!aiText.trim()) { setAiErr('Nenhum texto selecionado.'); return; }
    if (!aiDeckId) { setAiErr('Selecione um deck de destino.'); return; }
    setAiLoading(true); setAiErr('');
    try {
      const res = await fetch('/api/ai/generate-flashcards', {
        method: 'POST',
        headers: await resolveAiHeaders(),
        body: JSON.stringify({ text: aiText, maxCards: 5 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Erro ao gerar card.');
      if (!Array.isArray(data?.cards) || data.cards.length === 0) throw new Error('A IA não gerou cards para este trecho.');
      const base = newCard();
      const rows = data.cards.map((c) => ({
        deck_id: aiDeckId, user_id: currentUserId,
        front: String(c.front || '').trim(), back: String(c.back || '').trim(),
        stability: base.stability, difficulty: base.difficulty,
        elapsed_days: base.elapsed_days, scheduled_days: base.scheduled_days,
        reps: base.reps, lapses: base.lapses, state: base.state,
        due: base.due, last_review: base.last_review,
      })).filter((r) => r.front && r.back);
      const { error } = await supabase.from('flashcard_cards').insert(rows);
      if (error) throw new Error(error.message);
      if (selectedText && selectedText === aiText) await saveHighlight();
      setAiModal(false); setAiText('');
      if (onCreateFlashcard) onCreateFlashcard(rows.length);
    } catch (e) {
      setAiErr(e.message);
    } finally {
      setAiLoading(false);
    }
  }

  const pageHighlights = highlights.filter((h) => h.page_num === page);
  const pageNotes = notes.filter((n) => n.page_num === page);
  const markersSorted = [...markers].sort((a, b) => {
    if (a.page_num !== b.page_num) return a.page_num - b.page_num;
    return String(a.created_at || '').localeCompare(String(b.created_at || ''));
  });

  return (
    <div className="pl-app pl-mat-viewer-shell">
      {/* Top bar */}
      <div className="pl-mat-topbar">
        <button onClick={onBack} className="pl-btn pl-btn-sm" aria-label="Voltar">
          <ArrowLeft size={14} /> Biblioteca
        </button>
        <div className="title-block">
          <h2>{material.title}</h2>
          {material.disciplina ? <p>{material.disciplina}</p> : null}
        </div>
        <div className="pl-zoom">
          <button className="pl-zoom-btn" onClick={() => setScale((s) => Math.max(0.5, s - 0.2))} title="Diminuir">
            <ZoomOut />
          </button>
          <span className="pl-zoom-val">{Math.round(scale * 100)}%</span>
          <button className="pl-zoom-btn" onClick={() => setScale((s) => Math.min(3, s + 0.2))} title="Aumentar">
            <ZoomIn />
          </button>
        </div>
        <button
          onClick={() => { setNotePageTarget(page); setNoteContent(''); setNoteModal(true); }}
          className="pl-btn pl-btn-sm"
        >
          <NotebookPen size={14} /> Anotar
        </button>
      </div>

      <div className="pl-mat-canvas-stage">
        {/* Canvas area */}
        <div className="pl-mat-canvas-area" onMouseUp={handleMouseUp}>
          {pdfErr && (
            <div style={{
              marginTop: 40, padding: '14px 20px',
              background: 'var(--pl-danger-soft)', color: 'var(--pl-danger)',
              border: '1px solid rgba(185,28,28,0.25)', borderRadius: 6,
              fontSize: 13.5, fontWeight: 600,
            }}>{pdfErr}</div>
          )}
          {loading && !pdfErr && (
            <div style={{ marginTop: 60, display: 'flex', gap: 10, alignItems: 'center', color: 'var(--pl-ink-3)' }}>
              <Loader2 size={20} className="animate-spin" style={{ color: 'var(--pl-accent)' }} />
              <span style={{ fontSize: 13.5, fontWeight: 600 }}>Carregando PDF…</span>
            </div>
          )}
          {!pdfErr && (
            <div className="pl-mat-canvas-frame">
              <canvas ref={canvasRef} />
            </div>
          )}
          {totalPages > 0 && (
            <div className="pl-mat-pagenav">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                <ChevronLeft size={16} />
              </button>
              <span className="count">{page} / {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Sidebar — marcações */}
        <aside className="pl-mat-sidebar">
          <div className="head">
            <div className="title-row">
              <Bookmark />
              <span className="pl-eyebrow">Marcações</span>
            </div>
            <p style={{ margin: 0, fontSize: 11.5, color: 'var(--pl-ink-3)', fontWeight: 500, lineHeight: 1.5 }}>
              Salvas na sua conta (uma por linha no banco). Título, trecho e cor por página.
            </p>
            <input
              value={markerDraft.label}
              onChange={(e) => setMarkerDraft((prev) => ({ ...prev, label: e.target.value }))}
              placeholder="Título da marcação"
              className="pl-input"
              style={{ height: 34, fontSize: 12.5, fontWeight: 600 }}
            />
            <textarea
              rows={2}
              value={markerDraft.excerpt}
              onChange={(e) => setMarkerDraft((prev) => ({ ...prev, excerpt: e.target.value }))}
              placeholder="Trecho, lembrete ou fundamento"
              className="pl-input"
              style={{
                height: 'auto', padding: '8px 12px', resize: 'none',
                fontFamily: 'var(--pl-sans)', fontSize: 12.5, fontWeight: 500,
              }}
            />
            <div className="pl-color-dots">
              {MATERIAL_MARKER_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setMarkerDraft((prev) => ({ ...prev, color }))}
                  className={`pl-color-dot ${markerDraft.color === color ? 'active' : ''}`}
                  style={{ background: color }}
                  aria-label={`Cor ${color}`}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={saveMaterialMarker}
              className="pl-btn pl-btn-primary pl-btn-sm"
              style={{ justifyContent: 'center', width: '100%' }}
            >
              <Bookmark size={13} /> Salvar marcação — p. {page}
            </button>
          </div>

          <div className="body">
            {markersSorted.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <p className="pl-eyebrow" style={{ marginBottom: 0 }}>Todas ({markersSorted.length})</p>
                {markersSorted.map((m) => (
                  <div key={m.id} className={`pl-marker-card ${m.page_num === page ? 'current' : ''}`}>
                    <button
                      type="button"
                      onClick={() => setPage(m.page_num)}
                      style={{
                        background: 'transparent', border: 0, padding: 0,
                        flex: 1, minWidth: 0, textAlign: 'left', cursor: 'pointer',
                      }}
                    >
                      <p className="lbl">
                        <span className="swatch" style={{ background: m.color }} />
                        <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {m.label || `Página ${m.page_num}`}
                        </span>
                      </p>
                      {m.excerpt ? <p className="excerpt">{m.excerpt}</p> : null}
                      <p className="pg">Página {m.page_num}</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteMaterialMarker(m.id)}
                      style={{
                        flexShrink: 0,
                        background: 'transparent', border: 0, color: 'var(--pl-ink-4)',
                        padding: 4, cursor: 'pointer', borderRadius: 4,
                      }}
                      aria-label="Excluir marcação"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--pl-ink-4)', fontWeight: 500 }}>
                Nenhuma marcação neste PDF ainda.
              </p>
            )}
          </div>

          <div className="foot">
            {pageHighlights.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <p className="pl-eyebrow" style={{ marginBottom: 6 }}>Grifos — p. {page}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {pageHighlights.map((h) => (
                    <div
                      key={h.id}
                      style={{
                        padding: '8px 10px', borderRadius: 5,
                        background: h.color + '44',
                        display: 'flex', alignItems: 'flex-start', gap: 8,
                      }}
                    >
                      <p style={{
                        flex: 1, margin: 0,
                        fontSize: 12, fontWeight: 600, color: 'var(--pl-ink-2)',
                        lineHeight: 1.5,
                        display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                      }}>{h.text}</p>
                      <button
                        onClick={() => deleteHighlight(h.id)}
                        style={{
                          flexShrink: 0,
                          background: 'transparent', border: 0, color: 'var(--pl-ink-4)',
                          padding: 2, cursor: 'pointer',
                        }}
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {pageNotes.length > 0 && (
              <div>
                <p className="pl-eyebrow" style={{ marginBottom: 6 }}>Anotações — p. {page}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {pageNotes.map((n) => (
                    <div key={n.id} style={{
                      padding: '8px 10px', borderRadius: 5,
                      background: 'var(--pl-highlight-soft)',
                      border: '1px solid rgba(244,208,78,0.55)',
                      display: 'flex', alignItems: 'flex-start', gap: 8,
                    }}>
                      <p style={{ flex: 1, margin: 0, fontSize: 12, color: 'var(--pl-ink-2)', lineHeight: 1.5, fontWeight: 500 }}>
                        {n.content}
                      </p>
                      <button
                        onClick={() => deleteNote(n.id)}
                        style={{ background: 'transparent', border: 0, color: 'var(--pl-ink-4)', padding: 2, cursor: 'pointer' }}
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {pageHighlights.length === 0 && pageNotes.length === 0 && (
              <div style={{ textAlign: 'center', padding: '12px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <Highlighter size={20} style={{ color: 'var(--pl-ink-4)' }} />
                <p style={{ margin: 0, fontSize: 11.5, color: 'var(--pl-ink-3)', fontWeight: 500, lineHeight: 1.5, maxWidth: 240 }}>
                  Selecione texto para grifar ou pedir um flashcard à IA.
                </p>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Floating selection toolbar */}
      {showHlToolbar && (
        <div className="pl-float-toolbar" style={{ left: toolbarPos.x - 100, top: toolbarPos.y }}>
          {HIGHLIGHT_COLORS.map((c) => (
            <button
              key={c.value}
              onClick={() => setHlColor(c.value)}
              className={`dot ${hlColor === c.value ? 'active' : ''}`}
              style={{ background: c.value }}
              title={c.label}
            />
          ))}
          <div className="div" />
          <button onClick={saveHighlight} className="act">
            <Highlighter /> Grifar
          </button>
          <button onClick={openAiModal} className="act ai">
            <Sparkles /> Flashcard
          </button>
          <button
            onClick={() => { setShowHlToolbar(false); window.getSelection()?.removeAllRanges(); }}
            className="x"
            aria-label="Fechar"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* Note modal */}
      {noteModal && (
        <Modal title={`Anotação · página ${notePageTarget}`} onClose={() => setNoteModal(false)}>
          <textarea
            rows={4} autoFocus
            className="pl-input"
            style={{ height: 'auto', padding: 12, resize: 'vertical', fontFamily: 'var(--pl-sans)', fontSize: 14, fontWeight: 500 }}
            placeholder="Escreva sua anotação…"
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
          />
          <div className="pl-modal-foot" style={{ margin: '18px -24px -22px' }}>
            <button onClick={() => setNoteModal(false)} className="pl-btn">Cancelar</button>
            <button
              onClick={saveNote}
              disabled={noteSaving || !noteContent.trim()}
              className="pl-btn pl-btn-primary"
              style={{ opacity: noteSaving || !noteContent.trim() ? 0.5 : 1 }}
            >
              {noteSaving ? <Loader2 size={14} className="animate-spin" /> : <NotebookPen size={14} />}
              Salvar
            </button>
          </div>
        </Modal>
      )}

      {/* AI flashcard modal */}
      {aiModal && (
        <Modal title="Grifar e gerar flashcards" subtitle="A IA monta de 1 a 5 cards a partir do trecho selecionado." onClose={() => setAiModal(false)} wide>
          <ErrBanner msg={aiErr} />
          <div className="field-group" style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: aiErr ? 12 : 0 }}>
            <span className="pl-eyebrow">Trecho selecionado</span>
            <div style={{
              padding: '12px 14px',
              background: 'var(--pl-highlight-soft)',
              border: '1px solid rgba(244,208,78,0.55)',
              borderRadius: 6,
              fontSize: 13.5, fontFamily: 'var(--pl-serif)', fontStyle: 'italic',
              color: 'var(--pl-ink-2)', lineHeight: 1.55, maxHeight: 128, overflowY: 'auto',
            }}>
              {aiText || <span style={{ color: 'var(--pl-ink-4)' }}>Nenhum texto selecionado</span>}
            </div>
          </div>
          {decks.length > 0 ? (
            <div className="field-group" style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 14 }}>
              <span className="pl-eyebrow">Deck de destino</span>
              <select className="pl-input" value={aiDeckId} onChange={(e) => setAiDeckId(e.target.value)} style={{ fontWeight: 600 }}>
                {decks.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
              </select>
            </div>
          ) : (
            <div style={{
              marginTop: 14, padding: '10px 14px',
              background: 'var(--pl-warn-soft)', color: 'var(--pl-warn)',
              border: '1px solid rgba(180,83,9,0.25)', borderLeft: '3px solid var(--pl-warn)',
              borderRadius: 4, fontSize: 13, fontWeight: 600,
            }}>
              Crie um deck de flashcards primeiro para salvar os cards gerados.
            </div>
          )}
          <div className="pl-modal-foot" style={{ margin: '18px -24px -22px' }}>
            <button onClick={() => setAiModal(false)} className="pl-btn">Cancelar</button>
            <button
              onClick={handleAiFlashcard}
              disabled={aiLoading || !aiText || !aiDeckId}
              className="pl-btn pl-btn-ai"
              style={{ opacity: aiLoading || !aiText || !aiDeckId ? 0.5 : 1 }}
            >
              {aiLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {aiLoading ? 'Gerando…' : 'Criar flashcards'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════
   Página principal — listagem
   ════════════════════════════════════════════════ */
export default function Materiais({ currentUserId }) {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeMaterial, setActiveMaterial] = useState(null);

  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState('');
  const [uploadModal, setUploadModal] = useState(false);
  const [uploadForm, setUploadForm] = useState({ title: '', disciplina: '' });
  const [uploadFile, setUploadFile] = useState(null);

  const [filterQuery, setFilterQuery] = useState('');
  const [flashcardToast, setFlashcardToast] = useState('');
  const fileInputRef = useRef(null);

  const loadMaterials = useCallback(async () => {
    if (!currentUserId) return;
    setLoading(true);
    const { data } = await supabase
      .from('study_materials').select('*')
      .eq('user_id', currentUserId).order('updated_at', { ascending: false });
    setMaterials(data || []);
    setLoading(false);
  }, [currentUserId]);

  useEffect(() => { loadMaterials(); }, [loadMaterials]);

  async function handleUpload() {
    if (!uploadFile) { setUploadErr('Selecione um arquivo PDF.'); return; }
    if (!uploadForm.title.trim()) { setUploadErr('Informe um título.'); return; }
    if (uploadFile.type !== 'application/pdf' || !String(uploadFile.name || '').toLowerCase().endsWith('.pdf')) {
      setUploadErr('Apenas arquivos PDF válidos são aceitos.'); return;
    }
    if (Number(uploadFile.size || 0) > 25 * 1024 * 1024) {
      setUploadErr('O PDF deve ter no máximo 25 MB.'); return;
    }
    setUploading(true); setUploadErr('');
    try {
      const fileName = `${currentUserId}/${Date.now()}.pdf`;
      const { error: storageErr } = await supabase.storage
        .from('study-materials')
        .upload(fileName, uploadFile, { contentType: 'application/pdf', upsert: false });
      if (storageErr) throw new Error(storageErr.message);
      const { data, error: dbErr } = await supabase.from('study_materials')
        .insert({
          user_id: currentUserId,
          title: uploadForm.title.trim(),
          disciplina: uploadForm.disciplina.trim(),
          storage_path: fileName,
          file_size: uploadFile.size,
        }).select().single();
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
    if (typeof window !== 'undefined' && !window.confirm(`Remover "${material.title}" da sua biblioteca?`)) return;
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
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--pl-ink-3)' }}>
        <p style={{ fontSize: 14, fontWeight: 500 }}>Faça login para acessar seus materiais.</p>
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
          <div style={{
            position: 'fixed', bottom: 24, right: 24, zIndex: 100,
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '12px 18px',
            background: 'var(--pl-ink)', color: 'var(--pl-bg)',
            borderRadius: 8, boxShadow: 'var(--pl-sh-high)',
            fontSize: 13.5, fontWeight: 600,
          }}>
            <Sparkles size={15} />
            {flashcardToast}
          </div>
        )}
      </>
    );
  }

  const totalPaginas = materials.reduce((acc, item) => acc + Number(item.page_count || 0), 0);
  const retomadas = materials.filter((item) => Number(item.last_page || 0) > 1).length;

  const filtered = filterQuery.trim()
    ? materials.filter((m) => {
        const q = filterQuery.toLowerCase();
        return (m.title || '').toLowerCase().includes(q) || (m.disciplina || '').toLowerCase().includes(q);
      })
    : materials;

  return (
    <div className="pl-app pl-paper-bg-soft pl-mat-shell">
      {/* Hero editorial */}
      <header className="pl-hero-editorial">
        <div>
          <div className="lede-row">
            <div className="pl-hero-icon">
              <FileText size={18} strokeWidth={1.75} />
            </div>
            <span className="pl-eyebrow">Biblioteca PDF</span>
          </div>
          <h1>Materiais de estudo<span className="dot">.</span></h1>
          <p className="subtitle">
            Envie suas apostilas e leis. Grife trechos, escreva margens e gere flashcards com IA — sua biblioteca pessoal de estudo, no mesmo papel.
          </p>
        </div>
        <div className="meta">
          <span>PDF · marcações · flashcards<br />até 25 MB por arquivo</span>
          <button
            type="button"
            onClick={() => { setUploadErr(''); setUploadModal(true); }}
            className="pl-btn pl-btn-primary"
          >
            <Upload size={14} /> Enviar PDF
          </button>
        </div>
      </header>

      {/* KPI strip */}
      <div className="pl-kpi-strip-3">
        <div className="pl-kpi-bar">
          <div className="left">
            <span className="lab"><FileText size={12} /> Materiais</span>
            <span className="sub">na biblioteca</span>
          </div>
          <span className="val">{materials.length}</span>
        </div>
        <div className="pl-kpi-bar accent">
          <div className="left">
            <span className="lab"><BookOpen size={12} /> Páginas</span>
            <span className="sub">total nos PDFs</span>
          </div>
          <span className="val">{totalPaginas}</span>
        </div>
        <div className="pl-kpi-bar success">
          <div className="left">
            <span className="lab"><Bookmark size={12} /> Retomadas</span>
            <span className="sub">em leitura</span>
          </div>
          <span className="val">{retomadas}</span>
        </div>
      </div>

      {/* Loading / empty / grid */}
      {loading ? (
        <div style={{ padding: '80px 0', display: 'flex', justifyContent: 'center' }}>
          <Loader2 size={26} className="animate-spin" style={{ color: 'var(--pl-accent)' }} />
        </div>
      ) : materials.length === 0 ? (
        <div className="pl-empty-state">
          <div className="pl-empty-stack" aria-hidden>
            <div className="sheet s1" />
            <div className="sheet s2" />
            <div className="sheet s3" />
          </div>
          <h3>Sua biblioteca está vazia.</h3>
          <p>Envie PDFs de apostilas, leis ou resumos. Você poderá grifar trechos, anotar margens e pedir flashcards à IA sem sair da página.</p>
          <button
            type="button"
            onClick={() => { setUploadErr(''); setUploadModal(true); }}
            className="pl-btn pl-btn-primary pl-btn-lg"
          >
            <Upload size={16} /> Enviar primeiro PDF
          </button>
        </div>
      ) : (
        <>
          <div className="pl-lib-head">
            <h2>Sua biblioteca</h2>
            <div className="pl-filter-search">
              <Search />
              <input
                type="search"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder="Filtrar por título ou disciplina…"
              />
            </div>
          </div>
          {filtered.length === 0 ? (
            <div style={{
              padding: '40px 24px', textAlign: 'center',
              background: 'var(--pl-bg-soft)', border: '1px dashed var(--pl-rule-strong)', borderRadius: 6,
            }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--pl-ink)' }}>Nada encontrado</p>
              <p style={{ margin: '6px auto 0', maxWidth: 360, fontSize: 12.5, color: 'var(--pl-ink-3)', fontWeight: 500 }}>
                Nenhum material com esse filtro. Tente outro termo.
              </p>
            </div>
          ) : (
            <div className="pl-mat-grid">
              {filtered.map((m) => {
                const progress = m.page_count > 0 && m.last_page > 0
                  ? Math.min(100, Math.round((m.last_page / m.page_count) * 100))
                  : 0;
                return (
                  <article
                    key={m.id}
                    className="pl-mat-card"
                    onClick={() => setActiveMaterial(m)}
                  >
                    <div className="topline">
                      <SheetMark />
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleDelete(m); }}
                        className="delete-btn"
                        title="Excluir"
                        aria-label="Excluir material"
                      >
                        <Trash2 />
                      </button>
                    </div>
                    <div>
                      <h4>{m.title}</h4>
                      {m.disciplina && <p className="disciplina">{m.disciplina}</p>}
                    </div>
                    {progress > 0 && (
                      <div className="progress"><div className="fill" style={{ width: `${progress}%` }} /></div>
                    )}
                    <div className="meta-row">
                      {m.page_count > 0 && <span>{m.page_count} páginas</span>}
                      {m.page_count > 0 && m.file_size > 0 && <span className="sep">·</span>}
                      {m.file_size > 0 && <span>{formatFileSize(m.file_size)}</span>}
                      {m.last_page > 1 && (
                        <span className="resume">
                          <Bookmark /> p. {m.last_page}
                        </span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Upload modal */}
      {uploadModal && (
        <Modal title="Enviar PDF" onClose={() => setUploadModal(false)}>
          <ErrBanner msg={uploadErr} />
          <div className="field-group" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span className="pl-eyebrow">Título <span style={{ color: 'var(--pl-danger)' }}>*</span></span>
            <input
              type="text"
              className="pl-input"
              placeholder="Ex: Apostila Direito Administrativo 2025"
              value={uploadForm.title}
              onChange={(e) => setUploadForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>
          <div className="field-group" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span className="pl-eyebrow">Disciplina</span>
            <input
              type="text"
              className="pl-input"
              placeholder="Ex: Direito Administrativo"
              value={uploadForm.disciplina}
              onChange={(e) => setUploadForm((f) => ({ ...f, disciplina: e.target.value }))}
            />
          </div>
          <div className="field-group" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span className="pl-eyebrow">Arquivo PDF <span style={{ color: 'var(--pl-danger)' }}>*</span></span>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              style={{ display: 'none' }}
              onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`pl-upload-zone ${uploadFile ? 'filled' : ''}`}
            >
              <Upload />
              <span style={{ fontWeight: uploadFile ? 700 : 600 }}>
                {uploadFile ? uploadFile.name : 'Clique para selecionar o PDF'}
              </span>
              {uploadFile && <span className="file-size">{formatFileSize(uploadFile.size)}</span>}
            </button>
            <p style={{ margin: 0, fontSize: 11, color: 'var(--pl-ink-3)', fontWeight: 500 }}>
              Apenas PDF, até 25 MB.
            </p>
          </div>
          <div className="pl-modal-foot" style={{ margin: '8px -24px -24px' }}>
            <button
              type="button"
              onClick={() => setUploadModal(false)}
              className="pl-btn"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleUpload}
              disabled={uploading}
              className="pl-btn pl-btn-primary"
              style={{ opacity: uploading ? 0.6 : 1 }}
            >
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              {uploading ? 'Enviando…' : 'Enviar'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════
   Modal genérico editorial
   ════════════════════════════════════════════════ */
function Modal({ title, subtitle, onClose, wide, children }) {
  return (
    <div className="pl-modal-overlay" role="dialog" aria-modal="true" onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div className={`pl-modal ${wide ? 'wide' : ''}`}>
        <div className="fold-corner" />
        <div className="pl-modal-head">
          <div>
            <h3>{title}<span className="dot">.</span></h3>
            {subtitle ? (
              <p style={{ margin: '4px 0 0', fontSize: 12.5, color: 'var(--pl-ink-3)', fontWeight: 500 }}>{subtitle}</p>
            ) : null}
          </div>
          <button onClick={onClose} className="pl-modal-close" aria-label="Fechar">
            <X size={16} />
          </button>
        </div>
        <div className="pl-modal-body">{children}</div>
      </div>
    </div>
  );
}