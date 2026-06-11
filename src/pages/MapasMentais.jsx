import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Copy,
  DownloadCloud,
  ExternalLink,
  Eye,
  Folder,
  Heart,
  Network,
  PlusSquare,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  UploadCloud,
} from 'lucide-react';
import MindMapStudio from '../components/MindMapStudio';
import {
  MIND_MAPS_HISTORY_STORAGE_KEY,
  MIND_MAPS_STORAGE_KEY,
  buildSeedMindMaps,
  findContestMatchesForDiscipline,
  formatMindMapTimestamp,
  inferMindMapCategory,
  loadMindMapsFromSupabase,
  normalizeMindMapRecord,
  saveMindMapToSupabase,
  syncMindMapsWithAppData,
} from '../lib/mindMaps';
import { mindGraphToTopicNodes, ROOT_ID } from '../lib/mindMapGraph';
import { galleryMapFromRow, loadMindMapGalleryRows } from '../lib/mindMapGalleryApi';
import { canonicalizeSubjectName, normalizeSubjectText } from '../lib/subjectCatalogUtils';
import { generateMindMap } from '../lib/aiClient';

const DEFAULT_FILTERS = {
  query: '',
  category: 'Todas',
  plan: 'Todos',
  contestId: 'Todos',
  favoritesOnly: false,
};

function buildMapFromPrompt(prompt, context) {
  const normalizedPrompt = String(prompt || '').replace(/\s+/g, ' ').trim();
  if (!normalizedPrompt) return null;

  const matchedDiscipline = (context.bancoDisciplinas || []).find((discipline) => {
    const normalizedName = normalizeSubjectText(
      canonicalizeSubjectName(discipline.nome || '', context.subjectCatalog)
    );

    return normalizedPrompt.toLowerCase().includes(normalizedName);
  }) || null;

  const nodes = (Array.isArray(matchedDiscipline?.topicos) ? matchedDiscipline.topicos.slice(0, 6) : [])
    .map((topic) => ({
      id: String(topic.id),
      label: topic.nome,
      topicId: String(topic.id),
    }));

  const fallbackNodes = normalizedPrompt
    .split(/[,.:-]/)
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .slice(0, 6)
    .map((label, index) => ({
      id: `prompt-${Date.now()}-${index + 1}`,
      label,
      topicId: '',
    }));

  const title =
    matchedDiscipline?.nome ||
    (normalizedPrompt.length > 44 ? `${normalizedPrompt.slice(0, 41).trim()}...` : normalizedPrompt);

  return normalizeMindMapRecord(
    {
      id: `map-${Date.now()}`,
      titulo: title,
      categoria: inferMindMapCategory(title, context.subjectCatalog),
      disciplinaId: matchedDiscipline?.id || '',
      disciplinaNome: matchedDiscipline?.nome || title,
      plano: matchedDiscipline?.plano || 'Geral',
      topicoIds: (nodes.length > 0 ? nodes : fallbackNodes).map((node) => String(node.topicId || '')).filter(Boolean),
      nodes: nodes.length > 0 ? nodes : fallbackNodes,
      contestIds: matchedDiscipline
        ? findContestMatchesForDiscipline(
            matchedDiscipline,
            context.contestLibrary,
            context.subjectCatalog
          ).map((contest) => String(contest.id))
        : [],
      promptBase: normalizedPrompt,
      favorito: false,
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
      ultimoAcessoEm: '',
      totalAberturas: 0,
      sourceType: matchedDiscipline ? 'discipline' : 'manual',
    },
    context
  );
}

function downloadMapAsJson(map) {
  const payload = JSON.stringify(map, null, 2);
  const blob = new Blob([payload], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${String(map.titulo || 'mapa-mental').toLowerCase().replace(/[^a-z0-9]+/gi, '-')}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function translateAction(action) {
  const labels = {
    opened: 'Mapa aberto',
    downloaded: 'Mapa exportado',
    created: 'Mapa criado',
    imported: 'Mapa importado',
  };

  return labels[action] || 'Atividade';
}

export default function MapasMentais({
  bancoDisciplinas = [],
  subjectCatalog = [],
  contestLibrary = [],
  currentUserId = '',
  selectedCoursePlan = 'Todos',
  targetContestId = '',
  isAdmin = false,
  onOpenAdminMindMaps,
  onOpenDiscipline,
  onOpenContest,
  onOpenStudyRegister,
  isPremium = false,
  onUpgrade,
}) {
  const context = useMemo(
    () => ({ bancoDisciplinas, subjectCatalog, contestLibrary }),
    [bancoDisciplinas, subjectCatalog, contestLibrary]
  );
  const importedInputRef = useRef(null);
  const hasLoadedRemoteRef = useRef(false);
  const [galleryRows, setGalleryRows] = useState([]);

  const [filters, setFilters] = useState(() => ({
    ...DEFAULT_FILTERS,
    plan: selectedCoursePlan && selectedCoursePlan !== 'Todos' ? selectedCoursePlan : 'Todos',
    contestId: targetContestId || 'Todos',
  }));
  const [promptMapa, setPromptMapa] = useState('');
  const [aiMapForm, setAiMapForm] = useState({ courseId: '', disciplinaId: '', topicoId: '' });
  const [aiMapLoading, setAiMapLoading] = useState(false);
  const [aiMapError, setAiMapError] = useState('');
  const [mapas, setMapas] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(MIND_MAPS_STORAGE_KEY) || '[]');
      if (Array.isArray(saved) && saved.length > 0) {
        return saved.map((record) => normalizeMindMapRecord(record, context));
      }
    } catch {
      // noop
    }

    return buildSeedMindMaps(bancoDisciplinas, contestLibrary, subjectCatalog);
  });
  const [historicoUso, setHistoricoUso] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(MIND_MAPS_HISTORY_STORAGE_KEY) || '[]');
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  });
  const [mapaAtivoId, setMapaAtivoId] = useState('');
  const [planFilterDirty, setPlanFilterDirty] = useState(false);

  useEffect(() => {
    let active = true;

    const loadRemoteState = async () => {
      hasLoadedRemoteRef.current = false;
      const fallbackMaps = (() => {
        try {
          const localMaps = JSON.parse(localStorage.getItem(MIND_MAPS_STORAGE_KEY) || '[]');
          if (Array.isArray(localMaps) && localMaps.length > 0) {
            return localMaps.map((record) => normalizeMindMapRecord(record, context));
          }
        } catch {
          // noop
        }

        return buildSeedMindMaps(bancoDisciplinas, contestLibrary, subjectCatalog);
      })();

      if (!currentUserId) {
        if (!active) return;
        setMapas(fallbackMaps);
        setHistoricoUso([]);
        setMapaAtivoId(fallbackMaps[0]?.id || '');
        hasLoadedRemoteRef.current = true;
        return;
      }

      try {
        const remoteMaps = (await loadMindMapsFromSupabase(currentUserId)).map((record) =>
          normalizeMindMapRecord(record, context)
        );

        if (!active) return;

        const mergedMaps = remoteMaps.length > 0 ? [...remoteMaps] : [];
        fallbackMaps.forEach((localMap) => {
          const existsRemotely = remoteMaps.some((remoteMap) => String(remoteMap.id) === String(localMap.id));
          if (!existsRemotely) mergedMaps.push(localMap);
        });

        const nextMaps = mergedMaps.length > 0 ? mergedMaps : fallbackMaps;
        setMapas(nextMaps);
        setMapaAtivoId((prev) => prev || nextMaps[0]?.id || '');
      } catch (error) {
        console.warn('Nao foi possivel carregar mapas mentais do Supabase.', error);
        setMapas(fallbackMaps);
        setMapaAtivoId(fallbackMaps[0]?.id || '');
      }

      if (!active) return;
      setHistoricoUso((prev) => (Array.isArray(prev) ? prev : []));
      hasLoadedRemoteRef.current = true;
    };

    loadRemoteState();

    return () => {
      active = false;
    };
  }, [bancoDisciplinas, contestLibrary, context, currentUserId, subjectCatalog]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await loadMindMapGalleryRows();
        if (!cancelled) setGalleryRows(Array.isArray(rows) ? rows : []);
      } catch (e) {
        console.warn('Galeria de mapas mentais indisponivel (rode supabase/mind_map_gallery.sql).', e);
        if (!cancelled) setGalleryRows([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(MIND_MAPS_STORAGE_KEY, JSON.stringify(mapas));
  }, [mapas]);

  useEffect(() => {
    localStorage.setItem(MIND_MAPS_HISTORY_STORAGE_KEY, JSON.stringify(historicoUso));
  }, [historicoUso]);

  useEffect(() => {
    if (!currentUserId || !hasLoadedRemoteRef.current) return;
    mapas.forEach((map) => {
      saveMindMapToSupabase(currentUserId, map).catch(console.warn);
    });
  }, [currentUserId, mapas]);

  const syncedMaps = useMemo(() => {
    const sourceMaps =
      mapas.length > 0 ? mapas : buildSeedMindMaps(bancoDisciplinas, contestLibrary, subjectCatalog);
    return syncMindMapsWithAppData(sourceMaps, context);
  }, [bancoDisciplinas, contestLibrary, context, mapas, subjectCatalog]);
  const effectivePlanFilter =
    !planFilterDirty && filters.plan === 'Todos' && selectedCoursePlan && selectedCoursePlan !== 'Todos'
      ? selectedCoursePlan
      : filters.plan;

  const mapasOrdenados = useMemo(() => {
    return [...syncedMaps].sort((first, second) => {
      const favoriteDiff = Number(Boolean(second.favorito)) - Number(Boolean(first.favorito));
      if (favoriteDiff !== 0) return favoriteDiff;
      return (
        new Date(second.ultimoAcessoEm || second.atualizadoEm || 0).getTime() -
        new Date(first.ultimoAcessoEm || first.atualizadoEm || 0).getTime()
      );
    });
  }, [syncedMaps]);

  const galleryMaps = useMemo(
    () =>
      (galleryRows || [])
        .map((row) => galleryMapFromRow(row, context))
        .filter(Boolean),
    [galleryRows, context]
  );

  const galeriaFiltrada = useMemo(() => {
    const q = normalizeSubjectText(filters.query);
    if (!q) return galleryMaps;
    return galleryMaps.filter((map) => {
      const fields = [map.titulo, map.categoria, map.disciplinaNome, ...(map.nodes || []).map((n) => n.label)].map(
        normalizeSubjectText
      );
      return fields.some((field) => field.includes(q));
    });
  }, [filters.query, galleryMaps]);

  const mapaAtivo = useMemo(() => {
    if (!mapaAtivoId) {
      return mapasOrdenados[0] || galleryMaps[0] || null;
    }
    if (String(mapaAtivoId).startsWith('gallery-')) {
      return galleryMaps.find((m) => m.id === mapaAtivoId) || galleryMaps[0] || mapasOrdenados[0] || null;
    }
    return mapasOrdenados.find((map) => map.id === mapaAtivoId) || mapasOrdenados[0] || galleryMaps[0] || null;
  }, [mapaAtivoId, galleryMaps, mapasOrdenados]);

  const isGalleryView = Boolean(mapaAtivo?.sourceType === 'gallery');

  const handleMindGraphChange = useCallback(
    (nextGraph) => {
      if (!mapaAtivoId || String(mapaAtivoId).startsWith('gallery-')) return;
      const topicNodes = mindGraphToTopicNodes(nextGraph);
      const root = nextGraph.nodes.find((n) => n.id === ROOT_ID);
      const now = new Date().toISOString();
      setMapas((prev) =>
        prev.map((m) => {
          if (m.id !== mapaAtivoId) return m;
          const titulo = String(root?.text || m.titulo || '').trim() || m.titulo;
          return {
            ...m,
            mindGraph: nextGraph,
            titulo,
            nodes: topicNodes,
            topicoIds: topicNodes.map((n) => String(n.topicId || '')).filter(Boolean),
            atualizadoEm: now,
          };
        })
      );
    },
    [mapaAtivoId]
  );

  const contestOptions = useMemo(
    () =>
      contestLibrary
        .map((contest) => ({ id: String(contest.id), nome: contest.nome }))
        .sort((first, second) => first.nome.localeCompare(second.nome, 'pt-BR')),
    [contestLibrary]
  );

  const categoryCounts = useMemo(() => {
    const counts = syncedMaps.reduce((acc, map) => {
      const key = map.categoria || 'Geral';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts)
      .map(([nome, quantidade]) => ({ nome, quantidade }))
      .sort((first, second) => first.nome.localeCompare(second.nome, 'pt-BR'));
  }, [syncedMaps]);

  const mapasHeaderStats = useMemo(() => {
    const favCount = syncedMaps.filter((m) => m.favorito).length;
    return [
      { key: 'maps', icon: Folder, label: 'Mapas', value: String(syncedMaps.length), accent: 'blue' },
      { key: 'cats', icon: Sparkles, label: 'Categorias', value: String(categoryCounts.length), accent: 'indigo' },
      { key: 'fav', icon: Heart, label: 'Favoritos', value: String(favCount), accent: 'emerald' },
      {
        key: 'ativo',
        icon: Target,
        label: 'Ativo',
        value: mapaAtivo?.categoria?.trim() || '—',
        accent: 'violet',
      },
    ];
  }, [syncedMaps, categoryCounts.length, mapaAtivo]);

  const mapasFiltrados = useMemo(() => {
    const query = normalizeSubjectText(filters.query);

    return mapasOrdenados.filter((map) => {
      const contestIds = (map.contestIds || []).map((item) => String(item));
      const searchableFields = [
        map.titulo,
        map.disciplinaNome,
        map.categoria,
        map.plano,
        ...(map.nodes || []).map((node) => node.label),
      ].map(normalizeSubjectText);

      const matchesQuery = !query || searchableFields.some((field) => field.includes(query));
      const matchesCategory = filters.category === 'Todas' || map.categoria === filters.category;
      const matchesPlan = effectivePlanFilter === 'Todos' || map.plano === effectivePlanFilter;
      const matchesContest = filters.contestId === 'Todos' || contestIds.includes(String(filters.contestId));
      const matchesFavorites = !filters.favoritesOnly || map.favorito;

      return matchesQuery && matchesCategory && matchesPlan && matchesContest && matchesFavorites;
    });
  }, [effectivePlanFilter, filters, mapasOrdenados]);

  const relatedContests = useMemo(() => {
    if (!mapaAtivo) return [];
    return contestLibrary.filter((contest) => (mapaAtivo.contestIds || []).includes(String(contest.id)));
  }, [contestLibrary, mapaAtivo]);

  const recentHistory = useMemo(() => historicoUso.slice(0, 6), [historicoUso]);

  const ensureMapsMaterialized = () => {
    if (mapas.length > 0 || bancoDisciplinas.length === 0) return null;
    const seeded = buildSeedMindMaps(bancoDisciplinas, contestLibrary, subjectCatalog);
    setMapas(seeded);
    return seeded;
  };

  const registerUsage = useCallback((map, action) => {
    const timestamp = new Date().toISOString();

    setHistoricoUso((prev) =>
      [
        {
          id: `${action}-${map.id}-${Date.now()}`,
          mapId: map.id,
          titulo: map.titulo,
          action,
          timestamp,
        },
        ...prev,
      ].slice(0, 40)
    );

    if (action === 'opened') {
      setMapas((prev) =>
        prev.map((item) =>
          item.id === map.id
            ? {
                ...item,
                ultimoAcessoEm: timestamp,
                atualizadoEm: item.atualizadoEm || timestamp,
                totalAberturas: Number(item.totalAberturas || 0) + 1,
              }
            : item
        )
      );
    }
  }, []);

  const openMap = (map) => {
    ensureMapsMaterialized();
    setMapaAtivoId(map.id);
    registerUsage(map, 'opened');
  };

  const openGalleryMap = (map) => {
    setMapaAtivoId(map.id);
    registerUsage(map, 'opened');
  };

  const copyGalleryToMyLibrary = useCallback(
    (galleryMap) => {
      if (!galleryMap || galleryMap.sourceType !== 'gallery') return;
      const newId = `map-${Date.now()}`;
      const normalized = normalizeMindMapRecord(
        {
          ...galleryMap,
          id: newId,
          sourceType: 'from_gallery',
          favorito: false,
          criadoEm: new Date().toISOString(),
          atualizadoEm: new Date().toISOString(),
          ultimoAcessoEm: '',
          totalAberturas: 0,
        },
        context
      );
      setMapas((prev) => [normalized, ...prev]);
      setMapaAtivoId(newId);
      registerUsage(normalized, 'imported');
    },
    [context, registerUsage]
  );

  const handleGerarMapa = async () => {
    if (!isPremium) { if (typeof onUpgrade === 'function') onUpgrade(); return; }
    const normalizedPrompt = String(promptMapa || '').replace(/\s+/g, ' ').trim();
    if (!normalizedPrompt && !aiSelectedDiscipline) return;

    const adoptMap = (novoMapa) => {
      setMapas((prev) => [novoMapa, ...prev]);
      setPromptMapa('');
      setMapaAtivoId(novoMapa.id);
      registerUsage(novoMapa, 'created');
    };

    setAiMapLoading(true);
    setAiMapError('');
    try {
      const payload = await generateMindMap({
        disciplina: aiSelectedDiscipline?.nome || '',
        topico: normalizedPrompt || aiSelectedDiscipline?.nome || '',
        topics: aiTopicOptions.map((topic) => String(topic?.nome || '')).filter(Boolean),
      });
      const branches = Array.isArray(payload?.branches) ? payload.branches : [];
      const nodes = branches
        .slice(0, 8)
        .map((branch, index) => ({
          id: `ai-${Date.now()}-${index + 1}`,
          label: String(branch?.label || '').trim(),
          topicId: '',
        }))
        .filter((node) => node.label);
      if (nodes.length === 0) throw new Error('A IA não retornou ramos válidos para o mapa.');

      const titulo = String(payload?.title || normalizedPrompt || 'Mapa mental').trim();
      adoptMap(normalizeMindMapRecord(
        {
          id: `map-${Date.now()}`,
          titulo,
          categoria: String(payload?.category || '').trim() || inferMindMapCategory(titulo, context.subjectCatalog),
          disciplinaId: aiSelectedDiscipline?.id || '',
          disciplinaNome: aiSelectedDiscipline?.nome || titulo,
          plano: aiSelectedDiscipline?.plano || 'Geral',
          topicoIds: [],
          nodes,
          contestIds: [],
          promptBase: normalizedPrompt,
          favorito: false,
          criadoEm: new Date().toISOString(),
          atualizadoEm: new Date().toISOString(),
          ultimoAcessoEm: '',
          totalAberturas: 0,
          sourceType: 'ai',
        },
        context
      ));
    } catch (error) {
      console.error('[MapasMentais] geração IA falhou:', error?.message || error);
      // Fallback: estrutura básica local a partir do prompt, com aviso honesto.
      const fallbackMap = buildMapFromPrompt(normalizedPrompt, context);
      if (fallbackMap) {
        adoptMap(fallbackMap);
        setAiMapError('A IA está indisponível agora — criei uma estrutura básica a partir do seu texto. Edite à vontade e tente a IA de novo mais tarde.');
      } else {
        setAiMapError(String(error?.message || 'A IA não respondeu agora. Tente novamente em instantes.'));
      }
    } finally {
      setAiMapLoading(false);
    }
  };

  const handleToggleFavorite = (mapId) => {
    ensureMapsMaterialized();
    setMapas((prev) =>
      prev.map((map) =>
        map.id === mapId
          ? { ...map, favorito: !map.favorito, atualizadoEm: new Date().toISOString() }
          : map
      )
    );
  };

  const handleImportClick = () => {
    importedInputRef.current?.click();
  };

  const handleImportFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      const content = await file.text();
      const parsed = JSON.parse(content);
      const normalized = normalizeMindMapRecord(
        {
          ...parsed,
          id: parsed?.id || `imported-${Date.now()}`,
          titulo: parsed?.titulo || file.name.replace(/\.json$/i, ''),
          atualizadoEm: new Date().toISOString(),
          criadoEm: parsed?.criadoEm || new Date().toISOString(),
          sourceType: 'imported',
        },
        context
      );
      setMapas((prev) => [normalized, ...prev]);
      setMapaAtivoId(normalized.id);
      registerUsage(normalized, 'imported');
    } catch (error) {
      console.error('Erro ao importar mapa mental:', error);
      alert('Nao foi possivel importar o arquivo. Use um JSON valido exportado da biblioteca.');
    }
  };

  const handleDownloadCurrentMap = () => {
    if (!mapaAtivo) return;
    ensureMapsMaterialized();
    downloadMapAsJson(mapaAtivo);
    registerUsage(mapaAtivo, 'downloaded');
  };

  const activeDiscipline = mapaAtivo?.disciplinaId
    ? bancoDisciplinas.find((discipline) => String(discipline.id) === String(mapaAtivo.disciplinaId))
    : null;
  const aiCourseOptions = useMemo(
    () => [...new Set(bancoDisciplinas.map((discipline) => discipline.plano || 'Geral'))].filter(Boolean),
    [bancoDisciplinas]
  );
  const aiDisciplineOptions = useMemo(
    () =>
      bancoDisciplinas.filter((discipline) => {
        if (!aiMapForm.courseId) return true;
        return String(discipline.plano || 'Geral') === String(aiMapForm.courseId);
      }),
    [aiMapForm.courseId, bancoDisciplinas]
  );
  const aiSelectedDiscipline = useMemo(
    () =>
      aiDisciplineOptions.find(
        (discipline) => String(discipline.id || discipline.nome) === String(aiMapForm.disciplinaId)
      ) || null,
    [aiDisciplineOptions, aiMapForm.disciplinaId]
  );
  const aiTopicOptions = useMemo(
    () => (Array.isArray(aiSelectedDiscipline?.topicos) ? aiSelectedDiscipline.topicos : []),
    [aiSelectedDiscipline]
  );
  const canGenerateAiMap = Boolean(promptMapa.trim() || aiMapForm.disciplinaId || aiMapForm.courseId);

  return (
    <div className="pl-page">
      {/* ═══ Hero compacto ═══ */}
      <header className="pl-hero-compact">
        <div>
          <div className="lede-row">
            <div className="pl-hero-icon">
              <Network size={18} strokeWidth={1.75} />
            </div>
            <span className="pl-eyebrow">Estúdio visual</span>
          </div>
          <h1>Mapas mentais<span className="dot">.</span></h1>
          <p className="subtitle">
            Sua mesa de trabalho conectada a disciplinas, tópicos e concursos. Gere com IA, edite à mão, vincule ao seu fluxo.
          </p>
        </div>
        <div className="pl-hero-kpis">
          {mapasHeaderStats.slice(0, 4).map((stat) => (
            <div key={stat.key} className={`pl-hero-kpi ${stat.accent === 'emerald' ? 'success' : stat.accent === 'blue' || stat.accent === 'indigo' ? 'accent' : ''}`}>
              <span className="lab">{stat.label}</span>
              <span className="val">{stat.value}</span>
            </div>
          ))}
        </div>
      </header>

      {/* ═══ Mapas da equipe — tira slim ═══ */}
      <section className="pl-team-strip" aria-label="Mapas mentais disponibilizados pela equipe">
        <div className="head">
          <p className="ttl">Mapas da equipe · <em>prontos pra usar</em></p>
          <p className="desc">
            Publicados pelos administradores. Veja no estúdio (leitura) ou copie pra editar.
          </p>
          {isAdmin && typeof onOpenAdminMindMaps === 'function' ? (
            <button type="button" onClick={onOpenAdminMindMaps} className="pl-btn pl-btn-sm">
              <ShieldCheck size={13} /> Publicar modelos
            </button>
          ) : null}
        </div>

        {galeriaFiltrada.length === 0 ? (
          <div className="pl-team-empty">
            {galleryMaps.length === 0
              ? 'Nenhum mapa da equipe publicado ainda. Quando o admin subir modelos, eles aparecem aqui pra todos.'
              : 'Nenhum modelo corresponde aos filtros atuais.'}
          </div>
        ) : (
          <div className="pl-team-scroll">
            {galeriaFiltrada.map((mapa) => {
              const ativo = mapa.id === mapaAtivo?.id && isGalleryView;
              return (
                <div key={mapa.id} className={`pl-team-card ${ativo ? 'active' : ''}`}>
                  <span className="cat">Equipe · {mapa.categoria || 'Geral'}</span>
                  <h4>{mapa.titulo}</h4>
                  <div className="row">
                    <button type="button" onClick={() => openGalleryMap(mapa)}>
                      <Eye /> Ver
                    </button>
                    <button type="button" className="primary" onClick={() => copyGalleryToMyLibrary(mapa)}>
                      <Copy /> Copiar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ═══ Estúdio + Sidebar ═══ */}
      <div className="pl-mapa-layout">
        {/* ★ ESTÚDIO ★ */}
        <section className="pl-studio">
          <div className="pl-studio-head">
            <div className="title-col">
              <span className="eyebrow">Estúdio · editor</span>
              <h2>{mapaAtivo?.titulo || 'Nenhum mapa selecionado'}</h2>
              <p className="sub">
                {mapaAtivo?.categoria || 'Sem categoria'} · {formatMindMapTimestamp(mapaAtivo?.ultimoAcessoEm || mapaAtivo?.atualizadoEm)}
              </p>
            </div>
            <div className="toolbar">
              <button type="button" onClick={() => document.getElementById('mapa-prompt-input')?.focus()} className="pl-btn pl-btn-sm pl-btn-primary">
                <PlusSquare size={13} /> Novo mapa
              </button>
              <button type="button" onClick={handleImportClick} className="pl-btn pl-btn-sm">
                <UploadCloud size={13} /> Importar
              </button>
              <button type="button" onClick={handleDownloadCurrentMap} disabled={!mapaAtivo} className="pl-btn pl-btn-sm" style={{ opacity: !mapaAtivo ? 0.45 : 1 }}>
                <DownloadCloud size={13} /> Exportar
              </button>
              {mapaAtivo && !isGalleryView ? (
                <>
                  <span className="div" />
                  <button
                    type="button"
                    onClick={() => handleToggleFavorite(mapaAtivo.id)}
                    className={`fav ${mapaAtivo.favorito ? 'on' : ''}`}
                    title={mapaAtivo.favorito ? 'Favorito' : 'Favoritar'}
                    aria-label={mapaAtivo.favorito ? 'Remover dos favoritos' : 'Marcar como favorito'}
                  >
                    <Heart />
                  </button>
                </>
              ) : null}
            </div>
            <input ref={importedInputRef} type="file" accept="application/json" onChange={handleImportFile} className="hidden" style={{ display: 'none' }} />
          </div>

          {mapaAtivo?.disciplinaId && !isGalleryView ? (
            <div className="pl-studio-banner">
              <span>
                Vinculado à disciplina <strong>{mapaAtivo.disciplinaNome || '—'}</strong>
              </span>
              <button
                type="button"
                onClick={() => onOpenDiscipline?.(activeDiscipline || { id: mapaAtivo.disciplinaId }, mapaAtivo.topicoIds?.[0] || '')}
                className="pl-btn pl-btn-sm"
              >
                <Target size={12} /> Abrir disciplina
              </button>
            </div>
          ) : null}

          {isGalleryView ? (
            <div className="pl-studio-banner warn">
              <span>Modelo oficial da equipe — somente leitura.</span>
              <button type="button" onClick={() => copyGalleryToMyLibrary(mapaAtivo)} className="pl-btn pl-btn-sm pl-btn-primary">
                <Copy size={12} /> Copiar pra minha biblioteca
              </button>
            </div>
          ) : null}

          <div className="pl-studio-canvas">
            <div className="pl-studio-canvas-inner">
              {mapaAtivo ? (
                <MindMapStudio
                  key={mapaAtivo.id}
                  map={mapaAtivo}
                  onGraphChange={isGalleryView ? undefined : handleMindGraphChange}
                  readOnly={isGalleryView}
                />
              ) : (
                <div className="pl-studio-empty">
                  <div className="pl-studio-empty-icon"><Network /></div>
                  <h3>Mesa vazia.</h3>
                  <p>
                    Gere um mapa com a barra abaixo ou abra um modelo da equipe / da sua biblioteca pra começar.
                  </p>
                  <span className="hint">
                    <ArrowRight /> Use o campo de prompt no rodapé do estúdio
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Generation command bar (sempre visível) */}
          <div className="pl-genbar">
            <div className="pl-genbar-row">
              <select
                value={aiMapForm.courseId}
                onChange={(event) => setAiMapForm((prev) => ({ ...prev, courseId: event.target.value, disciplinaId: '', topicoId: '' }))}
                className="pl-input"
              >
                <option value="">Curso</option>
                {aiCourseOptions.map((plan) => <option key={plan} value={plan}>{plan}</option>)}
              </select>
              <select
                value={aiMapForm.disciplinaId}
                onChange={(event) => setAiMapForm((prev) => ({ ...prev, disciplinaId: event.target.value, topicoId: '' }))}
                className="pl-input"
              >
                <option value="">Disciplina</option>
                {aiDisciplineOptions.map((d) => <option key={d.id || d.nome} value={d.id || d.nome}>{d.nome}</option>)}
              </select>
              <select
                value={aiMapForm.topicoId}
                onChange={(event) => setAiMapForm((prev) => ({ ...prev, topicoId: event.target.value }))}
                disabled={!aiSelectedDiscipline}
                className="pl-input"
                style={{ opacity: !aiSelectedDiscipline ? 0.5 : 1 }}
              >
                <option value="">Tópico</option>
                {aiTopicOptions.map((t) => <option key={t.id || t.nome} value={t.id || t.nome}>{t.nome}</option>)}
              </select>
            </div>
            <div className="pl-genbar-prompt">
              <span className="badge">Prompt</span>
              <input
                id="mapa-prompt-input"
                type="text"
                value={promptMapa}
                onChange={(event) => setPromptMapa(event.target.value)}
                placeholder="Digite um tema ou um resumo curto para criar um mapa conectado…"
              />
              <button
                type="button"
                onClick={handleGerarMapa}
                disabled={(!isPremium) || !canGenerateAiMap || aiMapLoading}
                className="pl-btn pl-btn-ai btn-gen"
                style={{ opacity: (!isPremium || !canGenerateAiMap || aiMapLoading) ? 0.55 : 1 }}
                title={!isPremium ? 'Disponível no plano Papiro' : undefined}
              >
                {aiMapLoading ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {aiMapLoading ? 'Criando…' : (!isPremium ? 'Papiro — Gerar mapa' : 'Gerar mapa')}
              </button>
            </div>
            {aiMapError ? <div className="pl-genbar-error">{aiMapError}</div> : null}
          </div>
        </section>

        {/* ═══ Sidebar ═══ */}
        <aside className="pl-mapa-sidebar">
          {/* Biblioteca + filtros */}
          <div className="card">
            <span className="eyebrow">Biblioteca</span>
            <h3>Seus mapas</h3>
            <div className="search-block">
              <Search />
              <input
                type="search"
                value={filters.query}
                onChange={(event) => setFilters((prev) => ({ ...prev, query: event.target.value }))}
                placeholder="Buscar mapa, categoria, tópico…"
              />
            </div>
            <div className="filter-grid">
              <select
                value={effectivePlanFilter}
                onChange={(event) => { setPlanFilterDirty(true); setFilters((prev) => ({ ...prev, plan: event.target.value })); }}
              >
                <option value="Todos">Todos os planos</option>
                {[...new Set(bancoDisciplinas.map((d) => d.plano || 'Geral'))].map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <select
                value={filters.contestId}
                onChange={(event) => setFilters((prev) => ({ ...prev, contestId: event.target.value }))}
              >
                <option value="Todos">Todos os concursos</option>
                {contestOptions.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
              <button
                type="button"
                onClick={() => setFilters((prev) => ({ ...prev, favoritesOnly: !prev.favoritesOnly }))}
                className={`fav-toggle ${filters.favoritesOnly ? 'on' : ''}`}
              >
                <Heart /> {filters.favoritesOnly ? 'Só favoritos' : 'Exibir só favoritos'}
              </button>
            </div>

            {/* Categorias inline */}
            <div className="pl-cat-list">
              <div
                onClick={() => setFilters((prev) => ({ ...prev, category: 'Todas' }))}
                className={`pl-cat-row ${filters.category === 'Todas' ? 'active' : ''}`}
                role="button"
                tabIndex={0}
              >
                <span>Todas</span>
                <span className="cnt">{syncedMaps.length}</span>
              </div>
              {categoryCounts.map((c) => (
                <div
                  key={c.nome}
                  onClick={() => setFilters((prev) => ({ ...prev, category: c.nome }))}
                  className={`pl-cat-row ${filters.category === c.nome ? 'active' : ''}`}
                  role="button"
                  tabIndex={0}
                >
                  <span>{c.nome}</span>
                  <span className="cnt">{c.quantidade}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Lista de mapas */}
          <div className="card">
            <span className="eyebrow">Armazenados</span>
            <h3>Lista de mapas</h3>
            <div className="pl-mapa-list">
              {mapasFiltrados.length === 0 && galeriaFiltrada.length === 0 ? (
                <div className="pl-mapa-empty">Nenhum mapa encontrado com os filtros atuais.</div>
              ) : (
                <>
                  {galeriaFiltrada.map((mapa) => {
                    const ativo = mapa.id === mapaAtivo?.id && isGalleryView;
                    return (
                      <div
                        key={mapa.id}
                        className={`pl-mapa-item gallery ${ativo ? 'active' : ''}`}
                        onClick={() => openGalleryMap(mapa)}
                        role="button"
                        tabIndex={0}
                      >
                        <div className="info">
                          <p className="ttl">{mapa.titulo}</p>
                          <p className="meta">Equipe · {mapa.categoria}</p>
                        </div>
                      </div>
                    );
                  })}
                  {mapasFiltrados.map((mapa) => {
                    const ativo = mapa.id === mapaAtivo?.id && !isGalleryView;
                    return (
                      <div
                        key={mapa.id}
                        className={`pl-mapa-item ${ativo ? 'active' : ''}`}
                        onClick={() => openMap(mapa)}
                        role="button"
                        tabIndex={0}
                      >
                        <div className="info">
                          <p className="ttl">{mapa.titulo}</p>
                          <p className="meta">{mapa.categoria} · {mapa.plano || 'Geral'}</p>
                        </div>
                        <button
                          type="button"
                          className={`heart ${mapa.favorito ? 'on' : ''}`}
                          onClick={(e) => { e.stopPropagation(); handleToggleFavorite(mapa.id); }}
                          title="Favoritar"
                          aria-label={mapa.favorito ? 'Remover dos favoritos' : 'Favoritar'}
                        >
                          <Heart />
                        </button>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>

          {/* Vínculos */}
          <div className="card">
            <span className="eyebrow">Vínculos</span>
            <h3>Disciplina, tópicos e concursos</h3>
            {mapaAtivo ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
                <div className="pl-info-block">
                  <div className="lab">Disciplina</div>
                  <div className="val">{mapaAtivo.disciplinaNome || 'Não vinculada'}</div>
                </div>
                <div className="pl-info-block">
                  <div className="lab">Plano</div>
                  <div className="val">{mapaAtivo.plano || 'Geral'}</div>
                </div>
                <div>
                  <div className="lab" style={{ fontSize: 10, fontWeight: 700, color: 'var(--pl-ink-3)', letterSpacing: '0.18em', textTransform: 'uppercase' }}>
                    Tópicos do mapa
                  </div>
                  <div className="pl-vinc-chips">
                    {mapaAtivo.nodes.map((node) => (
                      <button
                        key={node.id}
                        type="button"
                        onClick={() => node.topicId && mapaAtivo.disciplinaId && onOpenDiscipline?.(activeDiscipline || { id: mapaAtivo.disciplinaId }, node.topicId)}
                        className={`pl-vinc-chip ${node.topicId ? 'linked' : ''}`}
                      >
                        {node.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="lab" style={{ fontSize: 10, fontWeight: 700, color: 'var(--pl-ink-3)', letterSpacing: '0.18em', textTransform: 'uppercase' }}>
                    Concursos
                  </div>
                  <div className="pl-vinc-chips">
                    {relatedContests.length > 0 ? relatedContests.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => onOpenContest?.(c.id)}
                        className="pl-vinc-chip contest"
                      >
                        {c.nome} <ExternalLink />
                      </button>
                    )) : (
                      <span className="pl-vinc-chip">Nenhum</span>
                    )}
                  </div>
                </div>
                {mapaAtivo.disciplinaId ? (
                  <button
                    type="button"
                    onClick={() => onOpenStudyRegister?.(activeDiscipline || { id: mapaAtivo.disciplinaId })}
                    className="pl-btn pl-btn-primary"
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    Registrar estudo com este mapa <ArrowRight size={13} />
                  </button>
                ) : null}
              </div>
            ) : (
              <div className="pl-mapa-empty" style={{ marginTop: 10 }}>
                Selecione um mapa para ver os vínculos.
              </div>
            )}
          </div>

          {/* Histórico — colapsado, só se tiver itens */}
          {recentHistory.length > 0 ? (
            <div className="card">
              <span className="eyebrow">Histórico de uso</span>
              <h3>Atividades recentes</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
                {recentHistory.map((item) => (
                  <div key={item.id} className="pl-info-block">
                    <div className="val" style={{ marginTop: 0 }}>{item.titulo}</div>
                    <div className="lab" style={{ marginTop: 4 }}>
                      {translateAction(item.action)} · {formatMindMapTimestamp(item.timestamp)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
