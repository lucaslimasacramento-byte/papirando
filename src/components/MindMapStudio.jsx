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
  indigo: 'from-indigo-600 to-violet-600 ring-indigo-200',
  sky: 'from-sky-500 to-blue-600 ring-sky-200',
  emerald: 'from-emerald-500 to-teal-600 ring-emerald-200',
  amber: 'from-amber-500 to-orange-600 ring-amber-200',
  violet: 'from-violet-500 to-purple-600 ring-violet-200',
};

// Node gradient colors by key (kept for canvas node rendering — intentional)
const NODE_GRADIENTS = {
  indigo: { bg: 'linear-gradient(135deg,#4f46e5,#7c3aed)', ring: '#a5b4fc' },
  sky: { bg: 'linear-gradient(135deg,#0ea5e9,#2563eb)', ring: '#7dd3fc' },
  emerald: { bg: 'linear-gradient(135deg,#10b981,#0d9488)', ring: '#6ee7b7' },
  amber: { bg: 'linear-gradient(135deg,#f59e0b,#ea580c)', ring: '#fcd34d' },
  violet: { bg: 'linear-gradient(135deg,#8b5cf6,#7c3aed)', ring: '#c4b5fd' },
};

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

/**
 * @param {{ mindGraph?: object, titulo?: string }} props.map
 * @param {(next: import('../lib/mindMapGraph').MindGraph) => void} [props.onGraphChange]
 * @param {(title: string) => void} [props.onRootTitleChange]
 * @param {boolean} [props.readOnly] — so navegacao (zoom/pan); sem editar grafo
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 8,
          borderRadius: 16,
          border: '1px solid var(--pl-rule-2)',
          background: 'var(--pl-bg-soft)',
          padding: '8px 12px',
        }}
      >
        <span
          style={{
            marginRight: 4,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            color: 'var(--pl-ink-3)',
          }}
        >
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
              label="Remover no"
              disabled={!selectedId || selectedId === ROOT_ID}
              danger
              onClick={() => {
                if (!selectedId || selectedId === ROOT_ID) return;
                commit(removeNode(graph, selectedId));
                setSelectedId(null);
              }}
            />
            <span style={{ margin: '0 4px', width: 1, height: 24, background: 'var(--pl-rule-2)', display: 'inline-block' }} />
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

      {/* Canvas wrapper */}
      <div
        style={{
          borderRadius: 16,
          border: '1px solid var(--pl-rule-2)',
          background: 'var(--pl-surface)',
          padding: 12,
          boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.04)',
        }}
      >
        <div
          style={{
            marginBottom: 8,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 8,
            fontSize: 12,
            fontWeight: 500,
            color: 'var(--pl-ink-2)',
          }}
        >
          <Sparkles size={14} style={{ color: 'var(--pl-accent)' }} />
          {readOnly
            ? 'Mapa oficial (somente leitura). Use Copiar na biblioteca para editar o seu.'
            : 'Arraste o fundo para mover a vista; arraste os cartoes para reorganizar. Clique para selecionar. Duplo clique para renomear.'}
        </div>

        <div
          ref={viewportRef}
          style={{
            touchAction: 'none',
            position: 'relative',
            height: 'min(72vh, 640px)',
            minHeight: 420,
            overflow: 'hidden',
            borderRadius: 16,
            border: '1px solid var(--pl-rule-2)',
            background: 'var(--pl-surface)',
            backgroundImage: 'radial-gradient(var(--pl-rule-strong) 1px, transparent 1px)',
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
          <div data-canvas-bg="1" style={{ position: 'absolute', inset: 0 }} />

          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              height: 0,
              width: 0,
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: '0 0',
            }}
          >
            <svg
              style={{
                pointerEvents: 'none',
                position: 'absolute',
                left: -1600,
                top: -1200,
                width: 3200,
                height: 2400,
              }}
              viewBox="-1600 -1200 3200 2400"
            >
              {edges.map((edge) => (
                <line
                  key={edge.id}
                  x1={edge.x1}
                  y1={edge.y1}
                  x2={edge.x2}
                  y2={edge.y2}
                  stroke="var(--pl-rule-strong)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  opacity={0.88}
                />
              ))}
            </svg>

            {displayNodes.map((node) => {
              const isRoot = node.id === ROOT_ID;
              const isSelected = selectedId === node.id;
              const colorKey = node.color && NODE_GRADIENTS[node.color] ? node.color : 'sky';
              const gradient = NODE_GRADIENTS[colorKey];
              const isEditing = editingId === node.id;

              return (
                <div
                  key={node.id}
                  role="button"
                  tabIndex={0}
                  style={{
                    position: 'absolute',
                    userSelect: 'none',
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
                      style={{
                        minWidth: 140,
                        maxWidth: 260,
                        borderRadius: 12,
                        border: '2px solid var(--pl-accent)',
                        background: 'var(--pl-surface)',
                        padding: '8px 12px',
                        fontSize: 14,
                        fontWeight: 600,
                        color: 'var(--pl-ink)',
                        boxShadow: 'var(--pl-sh-mid)',
                        outline: 'none',
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        maxWidth: 220,
                        borderRadius: 16,
                        background: gradient.bg,
                        padding: isRoot ? '16px 16px' : '12px 16px',
                        textAlign: 'center',
                        boxShadow: isSelected
                          ? `0 0 0 3px ${gradient.ring}, var(--pl-sh-mid)`
                          : 'var(--pl-sh-low)',
                        transition: 'box-shadow 0.15s',
                        color: '#fff',
                        fontSize: isRoot ? 15 : 13,
                        fontWeight: isRoot ? 700 : 600,
                      }}
                    >
                      <div style={{ WebkitLineClamp: 4, display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.35 }}>
                        {node.text}
                      </div>
                      {node.topicId ? (
                        <div
                          style={{
                            marginTop: 8,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 4,
                            fontSize: 10,
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.12em',
                            color: 'rgba(255,255,255,0.8)',
                          }}
                        >
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
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        borderRadius: 10,
        border: danger ? '1px solid var(--pl-danger-soft)' : '1px solid var(--pl-rule-2)',
        background: 'var(--pl-surface)',
        color: danger ? 'var(--pl-danger)' : 'var(--pl-ink-2)',
        padding: '6px 10px',
        fontSize: 12,
        fontWeight: 700,
        cursor: 'pointer',
        transition: 'background 0.12s, color 0.12s',
        opacity: disabled ? 0.4 : 1,
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = danger ? 'var(--pl-danger-soft)' : 'var(--pl-bg-soft)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'var(--pl-surface)';
      }}
    >
      <Icon size={14} />
      <span style={{ display: 'none' }} className="sm-inline-shown">{label}</span>
    </button>
  );
}
