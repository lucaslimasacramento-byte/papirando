import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CircleDot,
  LayoutDashboard,
  Undo as UndoIcon,
  MousePointer2,
  Plus,
  Redo2,
  Sparkles,
  Trash2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  ROOT_ID,
  addChildNode,
  createMindGraph,
  inferMindGraphFromLegacyMap,
  normalizeMindGraph,
  removeNode,
  setRootText,
  updateNodePosition,
  updateNodeText,
} from '../lib/mindMapGraph';

const COLORS = {
  indigo: 'from-brand-600 to-ink-600 ring-brand-200',
  sky: 'from-sky-500 to-brand-600 ring-sky-200',
  emerald: 'from-emerald-500 to-teal-600 ring-emerald-200',
  amber: 'from-amber-500 to-orange-600 ring-amber-200',
  violet: 'from-ink-500 to-purple-600 ring-ink-200',
};

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

/**
 * @param {{ mindGraph?: object, titulo?: string }} props.map
 * @param {(next: import('../lib/mindMapGraph').MindGraph) => void} [props.onGraphChange]
 * @param {(title: string) => void} [props.onRootTitleChange]
 * @param {boolean} [props.readOnly] — só navegação (zoom/pan); sem editar grafo
 */
export default function MindMapStudio({ map, onGraphChange, onRootTitleChange, readOnly = false }) {
  const graph = useMemo(() => {
    if (!map) return createMindGraph('Ideia central');
    if (map.mindGraph && Array.isArray(map.mindGraph.nodes)) {
      return normalizeMindGraph(map.mindGraph, map.titulo || 'Ideia central');
    }
    return normalizeMindGraph(inferMindGraphFromLegacyMap(map), map.titulo || 'Ideia central');
  }, [map]);

  const [selectedId, setSelectedId] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panRef = useRef(null);
  const dragRef = useRef(null);
  const [dragVisual, setDragVisual] = useState(null);
  const viewportRef = useRef(null);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState('');
  const historyRef = useRef([]);
  const futureRef = useRef([]);

  const pushHistory = useCallback((g) => {
    historyRef.current = [...historyRef.current, JSON.stringify(g)].slice(-40);
    futureRef.current = [];
  }, []);

  const commit = useCallback(
    (nextGraph, opts = {}) => {
      if (readOnly) return;
      const normalized = normalizeMindGraph(nextGraph, map?.titulo || '');
      if (!opts.skipHistory) pushHistory(graph);
      onGraphChange?.(normalized);
      const root = normalized.nodes.find((n) => n.id === ROOT_ID);
      if (root && onRootTitleChange) onRootTitleChange(root.text);
    },
    [graph, map?.titulo, onGraphChange, onRootTitleChange, pushHistory, readOnly]
  );

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setSelectedId(null);
      setEditingId(null);
      setDragVisual(null);
    });
    dragRef.current = null;
    return () => window.cancelAnimationFrame(frame);
  }, [map?.id]);

  const displayNodes = useMemo(() => {
    return graph.nodes.map((n) => {
      if (dragVisual && dragVisual.id === n.id) {
        return { ...n, x: n.x + dragVisual.dx, y: n.y + dragVisual.dy };
      }
      return n;
    });
  }, [graph.nodes, dragVisual]);

  const nodesById = useMemo(() => new Map(displayNodes.map((n) => [n.id, n])), [displayNodes]);

  const edges = useMemo(() => {
    const out = [];
    displayNodes.forEach((n) => {
      if (!n.parentId) return;
      const p = nodesById.get(n.parentId);
      if (!p) return;
      out.push({ id: `${p.id}-${n.id}`, x1: p.x, y1: p.y, x2: n.x, y2: n.y });
    });
    return out;
  }, [displayNodes, nodesById]);

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.06 : 0.06;
    setZoom((z) => clamp(Number((z + delta).toFixed(2)), 0.35, 2.2));
  };

  const startPan = (e) => {
    if (e.button !== 0 && e.button !== 1) return;
    panRef.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y, pointerId: e.pointerId };
    setIsPanning(true);
    viewportRef.current?.setPointerCapture(e.pointerId);
  };

  const onCanvasPointerMove = (e) => {
    if (dragRef.current && dragRef.current.pointerId === e.pointerId) {
      const dx = (e.clientX - dragRef.current.startX) / zoom;
      const dy = (e.clientY - dragRef.current.startY) / zoom;
      setDragVisual({ id: dragRef.current.id, dx, dy });
      return;
    }
    if (!panRef.current || panRef.current.pointerId !== e.pointerId) return;
    const dx = e.clientX - panRef.current.startX;
    const dy = e.clientY - panRef.current.startY;
    setPan({ x: panRef.current.panX + dx, y: panRef.current.panY + dy });
  };

  const endPan = (e) => {
    if (dragRef.current?.pointerId === e.pointerId) {
      if (readOnly) {
        dragRef.current = null;
        setDragVisual(null);
      } else {
        const { id, startX, startY, baseGraphJson, origX, origY } = dragRef.current;
        const dx = (e.clientX - startX) / zoom;
        const dy = (e.clientY - startY) / zoom;
        const base = JSON.parse(baseGraphJson);
        commit(updateNodePosition(base, id, origX + dx, origY + dy));
        dragRef.current = null;
        setDragVisual(null);
      }
    }
    if (panRef.current?.pointerId === e.pointerId) {
      panRef.current = null;
      setIsPanning(false);
    }
    try {
      viewportRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
  };

  const startDragNode = (node, e) => {
    e.stopPropagation();
    if (readOnly) return;
    if (node.id === ROOT_ID) return;
    setSelectedId(node.id);
    dragRef.current = {
      id: node.id,
      startX: e.clientX,
      startY: e.clientY,
      origX: node.x,
      origY: node.y,
      baseGraphJson: JSON.stringify(graph),
      pointerId: e.pointerId,
    };
    setDragVisual({ id: node.id, dx: 0, dy: 0 });
    viewportRef.current?.setPointerCapture(e.pointerId);
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleUndo = () => {
    if (readOnly) return;
    const h = historyRef.current;
    if (h.length === 0) return;
    futureRef.current = [JSON.stringify(graph), ...futureRef.current].slice(0, 40);
    const prev = JSON.parse(h[h.length - 1]);
    historyRef.current = h.slice(0, -1);
    commit(prev, { skipHistory: true });
  };

  const handleRedo = () => {
    if (readOnly) return;
    const f = futureRef.current;
    if (f.length === 0) return;
    const next = JSON.parse(f[0]);
    futureRef.current = f.slice(1);
    historyRef.current = [...historyRef.current, JSON.stringify(graph)].slice(-40);
    commit(next, { skipHistory: true });
  };

  const selected = selectedId ? nodesById.get(selectedId) : null;
  const parentForAdd = selected?.id && selected.id !== ROOT_ID ? selected.id : ROOT_ID;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-ink-200 bg-ink-50/90 px-3 py-2.5">
        <span className="mr-1 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-ink-400">
          <MousePointer2 size={12} />
          {readOnly ? 'Visualizacao' : 'Ferramentas'}
        </span>
        {!readOnly ? (
          <>
            <ToolbarBtn
              icon={Plus}
              label="Novo ramo"
              onClick={() => commit(addChildNode(graph, parentForAdd, 'Novo conceito'))}
            />
            <ToolbarBtn
              icon={Trash2}
              label="Remover nó"
              disabled={!selectedId || selectedId === ROOT_ID}
              danger
              onClick={() => {
                if (!selectedId || selectedId === ROOT_ID) return;
                commit(removeNode(graph, selectedId));
                setSelectedId(null);
              }}
            />
            <span className="mx-1 hidden h-6 w-px bg-ink-200 sm:inline-block" />
          </>
        ) : null}
        <ToolbarBtn icon={ZoomIn} label="Mais zoom" onClick={() => setZoom((z) => clamp(z + 0.1, 0.35, 2.2))} />
        <ToolbarBtn icon={ZoomOut} label="Menos zoom" onClick={() => setZoom((z) => clamp(z - 0.1, 0.35, 2.2))} />
        <ToolbarBtn icon={LayoutDashboard} label="Encaixar vista" onClick={resetView} />
        {!readOnly ? (
          <>
            <ToolbarBtn icon={UndoIcon} label="Desfazer" onClick={handleUndo} />
            <ToolbarBtn icon={Redo2} label="Refazer" onClick={handleRedo} />
          </>
        ) : null}
      </div>

      <div className="rounded-2xl border border-ink-200 bg-gradient-to-b from-ink-50 to-white p-3 shadow-inner">
        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-medium text-ink-500">
          <Sparkles size={14} className="text-brand-500" />
          {readOnly
            ? 'Mapa oficial (somente leitura). Use Copiar na biblioteca para editar o seu.'
            : 'Arraste o fundo para mover a vista; arraste os cartões para reorganizar. Clique para selecionar. Duplo clique para renomear.'}
        </div>

        <div
          ref={viewportRef}
          className="relative h-[min(72vh,640px)] min-h-[420px] overflow-hidden rounded-2xl border border-ink-200 bg-white touch-none"
          style={{
            backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)',
            backgroundSize: '20px 20px',
            cursor: isPanning ? 'grabbing' : 'grab',
          }}
          onWheel={handleWheel}
          onPointerMove={onCanvasPointerMove}
          onPointerUp={endPan}
          onPointerLeave={endPan}
          onPointerDown={(e) => {
            if (e.target === e.currentTarget || (e.target.closest && e.target.closest('[data-canvas-bg="1"]'))) {
              setSelectedId(null);
              setEditingId(null);
              startPan(e);
            }
          }}
        >
          <div data-canvas-bg="1" className="absolute inset-0" />

          <div
            className="absolute left-1/2 top-1/2 h-0 w-0"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: '0 0',
            }}
          >
            <svg
              className="pointer-events-none absolute"
              style={{ left: -1600, top: -1200, width: 3200, height: 2400 }}
              viewBox="-1600 -1200 3200 2400"
            >
              {edges.map((edge) => (
                <line
                  key={edge.id}
                  x1={edge.x1}
                  y1={edge.y1}
                  x2={edge.x2}
                  y2={edge.y2}
                  stroke="#94a3b8"
                  strokeWidth="3"
                  strokeLinecap="round"
                  opacity={0.88}
                />
              ))}
            </svg>

            {displayNodes.map((node) => {
              const isRoot = node.id === ROOT_ID;
              const isSelected = selectedId === node.id;
              const colorKey = COLORS[node.color] || COLORS.sky;
              const isEditing = editingId === node.id;

              return (
                <div
                  key={node.id}
                  role="button"
                  tabIndex={0}
                  className="absolute select-none"
                  style={{
                    transform: `translate(${node.x}px, ${node.y}px) translate(-50%, -50%)`,
                  }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    setSelectedId(node.id);
                    if (!isEditing) startDragNode(graph.nodes.find((n) => n.id === node.id), e);
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    if (readOnly) return;
                    const base = graph.nodes.find((n) => n.id === node.id);
                    setEditingId(node.id);
                    setEditDraft(base?.text || '');
                  }}
                >
                  {isEditing ? (
                    <input
                      autoFocus
                      value={editDraft}
                      onChange={(ev) => setEditDraft(ev.target.value)}
                      onPointerDown={(ev) => ev.stopPropagation()}
                      onBlur={() => {
                        if (isRoot) {
                          commit(setRootText(graph, editDraft));
                          onRootTitleChange?.(editDraft.trim() || 'Ideia central');
                        } else {
                          commit(updateNodeText(graph, node.id, editDraft));
                        }
                        setEditingId(null);
                      }}
                      onKeyDown={(ev) => {
                        if (ev.key === 'Enter' || ev.key === 'Escape') ev.target.blur();
                      }}
                      className="min-w-[140px] max-w-[260px] rounded-xl border-2 border-brand-400 bg-white px-3 py-2 text-sm font-semibold text-ink-800 shadow-lg outline-none"
                    />
                  ) : (
                    <div
                      className={`max-w-[220px] rounded-2xl bg-gradient-to-br px-4 py-3 text-center shadow-lg ring-2 transition ${colorKey} ${
                        isRoot ? 'py-4 text-base font-bold text-white' : 'text-sm font-semibold text-white'
                      } ${isSelected ? 'ring-offset-2 ring-offset-white' : ''}`}
                    >
                      <div className="line-clamp-4 leading-snug">{node.text}</div>
                      {node.topicId ? (
                        <div className="mt-2 flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider text-white/80">
                          <CircleDot size={10} />
                          Vinculado
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function ToolbarBtn({ icon: Icon, label, onClick, disabled, danger }) {
  return (
    <button
      type="button"
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-2 text-xs font-bold transition ${
        danger
          ? 'border-rose-200 bg-white text-rose-700 hover:bg-rose-50 disabled:opacity-40'
          : 'border-ink-200 bg-white text-ink-700 hover:bg-ink-50 disabled:opacity-40'
      }`}
    >
      <Icon size={14} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
