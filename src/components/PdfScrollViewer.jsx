import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { Loader2 } from 'lucide-react';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

/**
 * Visualizador de PDF com SCROLL CONTÍNUO (todas as páginas empilhadas) renderizado
 * via pdf.js em canvas. Substitui o <iframe>, que o Chrome bloqueia mesmo same-origin
 * quando há X-Frame-Options: DENY no app.
 *
 * - Virtualizado: só as páginas perto do viewport viram canvas; o resto fica como
 *   placeholder de mesma altura. Aguenta documentos de centenas de páginas.
 * - Fit-to-width: a escala acompanha a largura disponível (ResizeObserver).
 * - Ref imperativo: `scrollToPage(n)` para navegação externa (seções, busca…).
 * - `onVisiblePageChange(n)` informa a página mais visível durante o scroll.
 */
const PdfScrollViewer = forwardRef(function PdfScrollViewer(
  { url, initialPage = 1, onVisiblePageChange, onNumPages, maxScale = 2.2 },
  ref
) {
  const scrollRef = useRef(null);
  const docRef = useRef(null);
  const pageRefs = useRef([]);            // wrappers por página
  const canvasRefs = useRef([]);          // canvas montados
  const renderTasks = useRef([]);         // tasks de render em voo
  const renderedPages = useRef(new Set());
  const didInitialScroll = useRef(false);
  const visiblePageRef = useRef(initialPage);

  const [numPages, setNumPages] = useState(0);
  const [baseViewport, setBaseViewport] = useState(null); // { width, height } @scale 1
  const [renderWidth, setRenderWidth] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [, forceTick] = useState(0);

  const scale = baseViewport && renderWidth ? Math.min(maxScale, renderWidth / baseViewport.width) : 1;
  const pageHeight = baseViewport ? baseViewport.height * scale : 0;
  const pageWidth = baseViewport ? baseViewport.width * scale : 0;

  // ── Carrega o documento ──────────────────────────────────────────────
  useEffect(() => {
    if (!url) return undefined;
    let cancelled = false;
    setLoading(true);
    setError('');
    didInitialScroll.current = false;
    renderedPages.current = new Set();

    const task = pdfjsLib.getDocument(url);
    task.promise
      .then(async (doc) => {
        if (cancelled) return;
        docRef.current = doc;
        setNumPages(doc.numPages);
        onNumPages?.(doc.numPages);
        const first = await doc.getPage(1);
        if (cancelled) return;
        const vp = first.getViewport({ scale: 1 });
        setBaseViewport({ width: vp.width, height: vp.height });
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('[PdfScrollViewer] erro ao carregar PDF:', err?.message || err);
        setError('Não foi possível carregar o PDF.');
        setLoading(false);
      });

    return () => {
      cancelled = true;
      renderTasks.current.forEach((t) => { try { t?.cancel(); } catch { /* noop */ } });
      renderTasks.current = [];
      try { docRef.current?.destroy(); } catch { /* noop */ }
      docRef.current = null;
    };
  }, [url, onNumPages]);

  // ── Mede a largura disponível (fit-to-width) ─────────────────────────
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;
    const measure = () => {
      const w = el.clientWidth;
      if (w > 0) setRenderWidth(Math.max(280, w - 48));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [baseViewport]);

  // ── Renderiza uma página específica em canvas ────────────────────────
  const renderPage = useCallback(async (pageNum) => {
    const doc = docRef.current;
    const canvas = canvasRefs.current[pageNum];
    if (!doc || !canvas || !pageWidth) return;
    if (renderedPages.current.has(pageNum)) return;
    renderedPages.current.add(pageNum);

    try {
      const page = await doc.getPage(pageNum);
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const viewport = page.getViewport({ scale });
      const ctx = canvas.getContext('2d');
      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const task = page.render({ canvasContext: ctx, viewport });
      renderTasks.current[pageNum] = task;
      await task.promise;
    } catch (err) {
      if (err?.name !== 'RenderingCancelledException') {
        renderedPages.current.delete(pageNum); // permite re-tentar
      }
    }
  }, [scale, pageWidth]);

  const discardPage = useCallback((pageNum) => {
    if (!renderedPages.current.has(pageNum)) return;
    try { renderTasks.current[pageNum]?.cancel(); } catch { /* noop */ }
    renderTasks.current[pageNum] = null;
    const canvas = canvasRefs.current[pageNum];
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
    }
    renderedPages.current.delete(pageNum);
  }, []);

  // ── Virtualização + página visível, via scroll ───────────────────────
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !numPages || !pageHeight) return undefined;

    let frame = 0;
    const update = () => {
      frame = 0;
      const scrollTop = el.scrollTop;
      const viewH = el.clientHeight;
      const slotH = pageHeight + 24; // + gap
      const first = Math.max(1, Math.floor(scrollTop / slotH) + 1);
      const last = Math.min(numPages, Math.ceil((scrollTop + viewH) / slotH) + 1);

      const keepFrom = Math.max(1, first - 2);
      const keepTo = Math.min(numPages, last + 2);

      for (let p = keepFrom; p <= keepTo; p += 1) renderPage(p);
      renderedPages.current.forEach((p) => {
        if (p < keepFrom - 1 || p > keepTo + 1) discardPage(p);
      });
      forceTick((t) => (t + 1) % 1000000);

      // página mais visível = a que cruza ~1/3 do topo do viewport
      const anchor = scrollTop + viewH * 0.33;
      const current = Math.min(numPages, Math.max(1, Math.round(anchor / slotH) + 1));
      if (current !== visiblePageRef.current) {
        visiblePageRef.current = current;
        onVisiblePageChange?.(current);
      }
    };

    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    update();
    return () => {
      el.removeEventListener('scroll', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [numPages, pageHeight, renderPage, discardPage, onVisiblePageChange]);

  // ── Scroll inicial para initialPage ──────────────────────────────────
  useEffect(() => {
    if (didInitialScroll.current || !numPages || !pageHeight) return;
    const target = Math.min(numPages, Math.max(1, initialPage));
    if (target > 1) {
      const el = scrollRef.current;
      if (el) el.scrollTop = (target - 1) * (pageHeight + 24);
    }
    visiblePageRef.current = target;
    didInitialScroll.current = true;
  }, [numPages, pageHeight, initialPage]);

  useImperativeHandle(ref, () => ({
    scrollToPage(pageNum) {
      const el = scrollRef.current;
      if (!el || !pageHeight) return;
      const target = Math.min(numPages || pageNum, Math.max(1, pageNum));
      // Salto instantâneo (não-smooth): evita renderizar todas as páginas
      // intermediárias num pulo de seção (ex.: pág 9 → 302).
      el.scrollTop = (target - 1) * (pageHeight + 24);
      visiblePageRef.current = target;
    },
  }), [numPages, pageHeight]);

  return (
    <div ref={scrollRef} className="pl-pdfscroll">
      {loading && (
        <div className="pl-pdfscroll-state">
          <Loader2 size={20} className="animate-spin" style={{ color: 'var(--pl-accent)' }} />
          <span>Carregando documento…</span>
        </div>
      )}
      {error && !loading && (
        <div className="pl-pdfscroll-state error">{error}</div>
      )}
      {!loading && !error && baseViewport && Array.from({ length: numPages }, (_, i) => {
        const pageNum = i + 1;
        return (
          <div
            key={pageNum}
            ref={(node) => { pageRefs.current[pageNum] = node; }}
            className="pl-pdfscroll-page"
            style={{ width: pageWidth, height: pageHeight }}
            data-page={pageNum}
          >
            <canvas ref={(node) => { canvasRefs.current[pageNum] = node; }} />
            <span className="pl-pdfscroll-pagenum">{pageNum}</span>
          </div>
        );
      })}
    </div>
  );
});

export default PdfScrollViewer;
