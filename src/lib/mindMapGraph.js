/**
 * Modelo de grafo para o editor de mapas mentais (coordenadas relativas ao centro do canvas).
 * @typedef {{ id: string, parentId: string | null, text: string, x: number, y: number, topicId?: string, color?: string }} MindGraphNode
 * @typedef {{ version: number, nodes: MindGraphNode[] }} MindGraph
 */

export const MIND_GRAPH_VERSION = 1;
export const ROOT_ID = 'root';

function uid(prefix = 'n') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Cria grafo inicial a partir do título central (legado ou novo). */
export function createMindGraph(centerText) {
  const text = String(centerText || 'Ideia central').trim() || 'Ideia central';
  return {
    version: MIND_GRAPH_VERSION,
    nodes: [{ id: ROOT_ID, parentId: null, text, x: 0, y: 0, topicId: '', color: 'indigo' }],
  };
}

/** Converte mapa antigo (lista plana de ramos) em grafo editável. */
export function inferMindGraphFromLegacyMap(record) {
  const title = String(record?.titulo || 'Ideia central').trim() || 'Ideia central';
  const branches = Array.isArray(record?.nodes) ? record.nodes : [];
  const nodes = [{ id: ROOT_ID, parentId: null, text: title, x: 0, y: 0, topicId: '', color: 'indigo' }];
  const n = Math.max(branches.length, 1);
  branches.forEach((b, i) => {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2;
    const r = 220;
    nodes.push({
      id: String(b.id || uid('branch')),
      parentId: ROOT_ID,
      text: String(b.label || 'Nó').trim() || 'Nó',
      x: Math.round(Math.cos(angle) * r),
      y: Math.round(Math.sin(angle) * r),
      topicId: String(b.topicId || ''),
      color: 'sky',
    });
  });
  return { version: MIND_GRAPH_VERSION, nodes };
}

/** @param {MindGraph | null | undefined} graph */
export function normalizeMindGraph(graph, centerFallback = 'Ideia central') {
  if (!graph || !Array.isArray(graph.nodes) || graph.nodes.length === 0) {
    return createMindGraph(centerFallback);
  }
  const byId = new Map(graph.nodes.map((n) => [String(n.id), { ...n, id: String(n.id) }]));
  if (!byId.has(ROOT_ID)) {
    return createMindGraph(centerFallback);
  }
  const nodes = graph.nodes
    .filter((n) => n && typeof n === 'object')
    .map((n) => ({
      id: String(n.id).trim() || uid('n'),
      parentId: n.parentId == null ? null : String(n.parentId),
      text: String(n.text || n.label || '').trim() || 'Nó',
      x: Number.isFinite(Number(n.x)) ? Number(n.x) : 0,
      y: Number.isFinite(Number(n.y)) ? Number(n.y) : 0,
      topicId: String(n.topicId || ''),
      color: ['indigo', 'sky', 'emerald', 'amber', 'violet'].includes(n.color) ? n.color : 'sky',
    }));
  const ids = new Set(nodes.map((n) => n.id));
  nodes.forEach((n) => {
    if (n.parentId && !ids.has(n.parentId)) n.parentId = ROOT_ID;
  });
  return { version: MIND_GRAPH_VERSION, nodes };
}

/** Lista plana para busca / compat (exceto raiz). */
export function mindGraphToTopicNodes(graph) {
  const g = normalizeMindGraph(graph);
  return g.nodes
    .filter((n) => n.id !== ROOT_ID)
    .map((n) => ({ id: n.id, label: n.text, topicId: n.topicId || '' }));
}

/** @param {MindGraph} graph */
export function addChildNode(graph, parentId, text = 'Novo nó') {
  const g = normalizeMindGraph(graph);
  const parent = g.nodes.find((n) => n.id === parentId);
  if (!parent) return g;
  const siblings = g.nodes.filter((n) => n.parentId === parentId);
  const angleBase = -Math.PI / 2 + (siblings.length * 0.35);
  const r = parentId === ROOT_ID ? 200 : 140;
  const id = uid('node');
  const x = parent.x + Math.cos(angleBase) * r;
  const y = parent.y + Math.sin(angleBase) * r;
  return {
    ...g,
    nodes: [...g.nodes, { id, parentId, text: String(text).trim() || 'Novo nó', x, y, topicId: '', color: 'sky' }],
  };
}

/** @param {MindGraph} graph */
export function removeNode(graph, nodeId) {
  if (nodeId === ROOT_ID) return graph;
  const g = normalizeMindGraph(graph);
  const toRemove = new Set([nodeId]);
  let changed = true;
  while (changed) {
    changed = false;
    g.nodes.forEach((n) => {
      if (n.parentId && toRemove.has(n.parentId) && !toRemove.has(n.id)) {
        toRemove.add(n.id);
        changed = true;
      }
    });
  }
  return { ...g, nodes: g.nodes.filter((n) => !toRemove.has(n.id)) };
}

/** @param {MindGraph} graph */
export function updateNodeText(graph, nodeId, text) {
  const g = normalizeMindGraph(graph);
  return {
    ...g,
    nodes: g.nodes.map((n) => (n.id === nodeId ? { ...n, text: String(text || '').trim() || 'Nó' } : n)),
  };
}

/** @param {MindGraph} graph */
export function updateNodePosition(graph, nodeId, x, y) {
  const g = normalizeMindGraph(graph);
  if (nodeId === ROOT_ID) return g;
  return {
    ...g,
    nodes: g.nodes.map((n) => (n.id === nodeId ? { ...n, x, y } : n)),
  };
}

/** @param {MindGraph} graph */
export function setRootText(graph, text) {
  const g = normalizeMindGraph(graph);
  return {
    ...g,
    nodes: g.nodes.map((n) => (n.id === ROOT_ID ? { ...n, text: String(text || '').trim() || 'Central' } : n)),
  };
}
