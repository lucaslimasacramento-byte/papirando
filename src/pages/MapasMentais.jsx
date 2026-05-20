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

  const nodes = (matchedDiscipline?.topicos?.slice(0, 6) || [])
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

  const registerUsage = (map, action) => {
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
  };

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

  const handleGerarMapa = () => {
    const novoMapa = buildMapFromPrompt(promptMapa, context);
    if (!novoMapa) return;

    setMapas((prev) => [novoMapa, ...prev]);
    setPromptMapa('');
    setMapaAtivoId(novoMapa.id);
    registerUsage(novoMapa, 'created');
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

  return (
    <div className="pl-paper-bg" style={{ padding: '28px 28px 48px' }}>
      <div style={{ maxWidth: 1320, margin: '0 auto' }}>
        {/* ── Hero ── */}
        <div style={{ marginBottom: 28 }}>
          <p className="pl-eyebrow" style={{ marginBottom: 8 }}>Estúdio visual</p>
          <h1 className="pl-display" style={{ marginBottom: 12 }}>Mapas mentais.</h1>
          <p style={{ fontSize: 13, color: 'var(--pl-ink-2)', maxWidth: 520, marginBottom: 16 }}>
            Biblioteca integrada com disciplinas, tópicos e concursos. Abra, filtre, favorite, navegue e reaproveite seus mapas.
          </p>
          <p style={{ fontSize: 12, color: 'var(--pl-ink-3)' }}>
            {galleryMaps.length > 0
              ? `${galleryMaps.length} modelo(s) da equipe disponível(is) — copie para editar na sua biblioteca.`
              : 'Modelos prontos publicados pela equipe aparecem na área "Mapas da equipe" abaixo.'}
          </p>
        </div>

        <section
          className="mb-6 rounded-2xl border border-indigo-200/90 bg-gradient-to-br from-indigo-50 via-white to-violet-50/90 p-4 shadow-[0_12px_36px_rgba(79,70,229,0.08)] md:p-6"
          aria-label="Mapas mentais disponibilizados pela equipe"
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-700">Mapas da equipe · Papirando</p>
              <h2 className="mt-1 text-lg font-semibold tracking-tight text-slate-900 md:text-xl">
                Prontos para quem não quer montar do zero
              </h2>
              <p className="mt-2 max-w-3xl text-sm font-medium leading-relaxed text-slate-600">
                Estes mapas são publicados pelos administradores na galeria global. Abra para ver no estúdio (somente leitura) ou use{' '}
                <strong className="font-semibold text-slate-800">Copiar para minha biblioteca</strong> para editar, favoritar e vincular ao seu fluxo.
              </p>
            </div>
            {isAdmin && typeof onOpenAdminMindMaps === 'function' ? (
              <button
                type="button"
                onClick={onOpenAdminMindMaps}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-indigo-300 bg-white px-4 py-2.5 text-sm font-semibold text-indigo-900 shadow-sm transition hover:bg-indigo-50"
              >
                <ShieldCheck size={18} className="text-indigo-600" />
                Publicar modelos (admin)
              </button>
            ) : null}
          </div>

          {galeriaFiltrada.length === 0 ? (
            <div className="mt-5 rounded-xl border border-dashed border-indigo-200 bg-white/70 px-4 py-8 text-center">
              <p className="text-sm font-semibold text-slate-700">
                {galleryMaps.length === 0
                  ? 'Nenhum mapa da equipe publicado ainda. Quando o admin subir modelos na galeria, eles aparecem aqui para todos.'
                  : 'Nenhum modelo da equipe corresponde à busca ou aos filtros da biblioteca. Limpe a busca ou ajuste categoria/plano.'}
              </p>
            </div>
          ) : (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {galeriaFiltrada.map((mapa) => {
                const ativo = mapa.id === mapaAtivo?.id && isGalleryView;
                return (
                  <div
                    key={mapa.id}
                    className={`flex flex-col rounded-2xl border p-4 transition ${ativo ? 'border-indigo-400 bg-white shadow-md ring-2 ring-indigo-200' : 'border-indigo-100 bg-white/90 hover:border-indigo-200'}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-600">Equipe · {mapa.categoria || 'Geral'}</p>
                      <h3 className="mt-1 line-clamp-2 text-base font-semibold text-slate-900">{mapa.titulo}</h3>
                    </div>
                    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                      <button
                        type="button"
                        onClick={() => openGalleryMap(mapa)}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-xs font-bold text-slate-800 transition hover:bg-slate-100"
                      >
                        <Eye size={14} />
                        Ver no estúdio
                      </button>
                      <button
                        type="button"
                        onClick={() => copyGalleryToMyLibrary(mapa)}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-600 py-2.5 text-xs font-bold text-white transition hover:bg-indigo-700"
                      >
                        <Copy size={14} />
                        Copiar e editar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
          <div className="space-y-6">
            <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,0.06)] md:p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Editor</p>
                  <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">{mapaAtivo?.titulo || 'Nenhum mapa selecionado'}</h2>
                  <p className="mt-1 text-sm font-medium text-slate-500">
                    {mapaAtivo?.categoria || 'Sem categoria'} · {formatMindMapTimestamp(mapaAtivo?.ultimoAcessoEm || mapaAtivo?.atualizadoEm)}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <ActionButton icon={PlusSquare} text="Novo mapa" primary onClick={() => document.getElementById('mapa-prompt-input')?.focus()} />
                  <ActionButton icon={UploadCloud} text="Importar" onClick={handleImportClick} />
                  <ActionButton icon={DownloadCloud} text="Exportar" onClick={handleDownloadCurrentMap} disabled={!mapaAtivo} />
                </div>
              </div>
              <input ref={importedInputRef} type="file" accept="application/json" onChange={handleImportFile} className="hidden" />
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,0.06)] md:p-6">
              <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center">
                <div className="flex-1 rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3">
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Gerar novo mapa</label>
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                    <input
                      id="mapa-prompt-input"
                      type="text"
                      value={promptMapa}
                      onChange={(event) => setPromptMapa(event.target.value)}
                      placeholder="Digite um tema ou um resumo curto para criar um mapa conectado ao seu conteudo"
                      className="w-full bg-transparent text-sm font-semibold text-slate-700 outline-none placeholder:text-slate-300"
                    />
                    <button
                      type="button"
                      onClick={handleGerarMapa}
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-blue-800 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-900"
                    >
                      Gerar mapa
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              </div>

              {mapaAtivo?.disciplinaId && !isGalleryView ? (
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <MiniToolbarButton
                    icon={Target}
                    label="Abrir disciplina"
                    onClick={() => onOpenDiscipline?.(activeDiscipline || { id: mapaAtivo.disciplinaId }, mapaAtivo.topicoIds?.[0] || '')}
                  />
                </div>
              ) : null}

              {isGalleryView ? (
                <div className="mb-4 flex flex-col gap-2 rounded-2xl border border-indigo-200 bg-indigo-50/90 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-semibold text-indigo-950">
                    Modelo oficial da equipe. Copie para sua biblioteca para editar nos seus mapas.
                  </p>
                  <button
                    type="button"
                    onClick={() => copyGalleryToMyLibrary(mapaAtivo)}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-blue-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-900"
                  >
                    <Copy size={16} />
                    Copiar para minha biblioteca
                  </button>
                </div>
              ) : null}

              <div className="relative rounded-[26px] border border-slate-200 bg-slate-50/80 p-3">
                {mapaAtivo ? (
                  <>
                    {!isGalleryView ? (
                      <button
                        type="button"
                        onClick={() => handleToggleFavorite(mapaAtivo.id)}
                        className={`absolute right-5 top-5 z-10 inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold shadow-sm transition ${mapaAtivo.favorito ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-slate-200 bg-white text-slate-500'}`}
                      >
                        <Heart size={14} className={mapaAtivo.favorito ? 'fill-current' : ''} />
                        {mapaAtivo.favorito ? 'Favorito' : 'Favoritar'}
                      </button>
                    ) : null}
                    <MindMapStudio
                      key={mapaAtivo.id}
                      map={mapaAtivo}
                      onGraphChange={isGalleryView ? undefined : handleMindGraphChange}
                      readOnly={isGalleryView}
                    />
                  </>
                ) : (
                  <div className="flex min-h-[420px] items-center justify-center px-4 py-8">
                    <EmptyCanvas />
                  </div>
                )}
              </div>
            </div>
          </div>
          <aside className="space-y-6">
            <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Biblioteca</p>
              <h3 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">Seus mapas</h3>

              <div className="relative mt-4">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                <input
                  type="text"
                  value={filters.query}
                  onChange={(event) => setFilters((prev) => ({ ...prev, query: event.target.value }))}
                  placeholder="Buscar mapas, categorias, topicos ou concursos"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500"
                />
              </div>

              <div className="mt-4 grid gap-3">
                <select
                  value={effectivePlanFilter}
                  onChange={(event) => {
                    setPlanFilterDirty(true);
                    setFilters((prev) => ({ ...prev, plan: event.target.value }));
                  }}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none"
                >
                  <option value="Todos">Todos os planos</option>
                  {[...new Set(bancoDisciplinas.map((discipline) => discipline.plano || 'Geral'))].map((plan) => (
                    <option key={plan} value={plan}>
                      {plan}
                    </option>
                  ))}
                </select>

                <select
                  value={filters.contestId}
                  onChange={(event) => setFilters((prev) => ({ ...prev, contestId: event.target.value }))}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none"
                >
                  <option value="Todos">Todos os concursos</option>
                  {contestOptions.map((contest) => (
                    <option key={contest.id} value={contest.id}>
                      {contest.nome}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => setFilters((prev) => ({ ...prev, favoritesOnly: !prev.favoritesOnly }))}
                  className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${filters.favoritesOnly ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-slate-200 bg-slate-50 text-slate-600'}`}
                >
                  {filters.favoritesOnly ? 'Mostrando apenas favoritos' : 'Exibir somente favoritos'}
                </button>
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
              <div className="mb-4 flex items-center gap-2">
                <Folder size={16} className="text-slate-400" />
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Categorias</p>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setFilters((prev) => ({ ...prev, category: 'Todas' }))}
                  className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${filters.category === 'Todas' ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100'}`}
                >
                  <span className="text-sm font-semibold text-slate-700">Todas</span>
                  <span className="rounded-xl bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-400 shadow-sm">{syncedMaps.length}</span>
                </button>

                {categoryCounts.map((categoria) => (
                  <button
                    key={categoria.nome}
                    type="button"
                    onClick={() => setFilters((prev) => ({ ...prev, category: categoria.nome }))}
                    className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${filters.category === categoria.nome ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100'}`}
                  >
                    <span className="text-sm font-semibold text-slate-700">{categoria.nome}</span>
                    <span className="rounded-xl bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-400 shadow-sm">{categoria.quantidade}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Armazenados</p>
                  <h3 className="mt-1 text-lg font-semibold tracking-tight text-slate-900">Lista de mapas</h3>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-500">
                  {galeriaFiltrada.length + mapasFiltrados.length}
                </span>
              </div>

              {galeriaFiltrada.length > 0 ? (
                <div className="mb-6 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-600">Modelos da equipe (atalho)</p>
                    <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700">{galeriaFiltrada.length}</span>
                  </div>
                  <p className="text-[11px] font-medium text-slate-500">A lista completa com cards está na faixa roxa acima.</p>
                  {galeriaFiltrada.map((mapa) => {
                    const ativo = mapa.id === mapaAtivo?.id && isGalleryView;
                    return (
                      <div
                        key={mapa.id}
                        className={`w-full rounded-[22px] border p-4 text-left transition ${ativo ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200 bg-white hover:border-indigo-200 hover:bg-slate-50'}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <button type="button" onClick={() => openGalleryMap(mapa)} className="min-w-0 flex-1 text-left">
                            <h4 className={`truncate text-sm font-semibold ${ativo ? 'text-indigo-950' : 'text-slate-800'}`}>{mapa.titulo}</h4>
                            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-indigo-600/90">Oficial · {mapa.categoria}</p>
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyGalleryToMyLibrary(mapa)}
                          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-indigo-200 bg-white py-2.5 text-xs font-bold text-indigo-800 transition hover:bg-indigo-50"
                        >
                          <Copy size={14} />
                          Copiar e editar
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : null}

              <div className="space-y-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Meus mapas</p>
                {mapasFiltrados.map((mapa) => {
                  const ativo = mapa.id === mapaAtivo?.id && !isGalleryView;

                  return (
                    <div key={mapa.id} className={`w-full rounded-[22px] border p-4 text-left transition ${ativo ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <button type="button" onClick={() => openMap(mapa)} className="min-w-0 flex-1 text-left">
                          <h4 className={`truncate text-sm font-semibold ${ativo ? 'text-blue-950' : 'text-slate-800'}`}>{mapa.titulo}</h4>
                          <p className={`mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${ativo ? 'text-blue-600/80' : 'text-slate-400'}`}>{mapa.categoria}</p>
                          <p className="mt-2 text-xs font-semibold text-slate-500">{mapa.plano || 'Geral'} · {Math.max(0, Number(mapa.totalAberturas || 0))} abertura(s)</p>
                        </button>

                        <button type="button" onClick={() => handleToggleFavorite(mapa.id)} className={`rounded-full p-2 ${mapa.favorito ? 'text-rose-500' : 'text-slate-300'}`} title="Favoritar mapa">
                          <Heart size={16} className={mapa.favorito ? 'fill-current' : ''} />
                        </button>
                      </div>

                      <button type="button" onClick={() => openMap(mapa)} className={`mt-3 flex h-14 w-full items-center justify-center rounded-2xl border ${ativo ? 'border-blue-100 bg-white' : 'border-slate-200 bg-slate-50'}`}>
                        <Network size={22} className={ativo ? 'text-blue-300' : 'text-slate-300'} />
                      </button>
                    </div>
                  );
                })}

                {mapasFiltrados.length === 0 && galeriaFiltrada.length === 0 ? (
                  <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm font-semibold text-slate-400">
                    Nenhum mapa encontrado com os filtros atuais.
                  </div>
                ) : null}
                {mapasFiltrados.length === 0 && galeriaFiltrada.length > 0 ? (
                  <p className="text-center text-xs font-medium text-slate-500">Nenhum mapa seu com estes filtros; veja a galeria acima.</p>
                ) : null}
              </div>
            </div>
            <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Vinculos</p>
              <h3 className="mt-1 text-lg font-semibold tracking-tight text-slate-900">Disciplina, topicos e concursos</h3>
              {mapaAtivo ? (
                <div className="mt-4 space-y-4">
                  <InfoBlock label="Disciplina" value={mapaAtivo.disciplinaNome || 'Nao vinculada'} />
                  <InfoBlock label="Plano" value={mapaAtivo.plano || 'Geral'} />
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Topicos do mapa</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {mapaAtivo.nodes.map((node) => (
                        <button
                          key={node.id}
                          type="button"
                          onClick={() => node.topicId && mapaAtivo.disciplinaId && onOpenDiscipline?.(activeDiscipline || { id: mapaAtivo.disciplinaId }, node.topicId)}
                          className={`rounded-full border px-3 py-1.5 text-xs font-bold ${node.topicId ? 'border-blue-100 bg-blue-50 text-blue-700' : 'border-slate-200 bg-slate-50 text-slate-500'}`}
                        >
                          {node.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Concursos relacionados</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {relatedContests.length > 0 ? (
                        relatedContests.map((contest) => (
                          <button
                            key={contest.id}
                            type="button"
                            onClick={() => onOpenContest?.(contest.id)}
                            className="inline-flex items-center gap-2 rounded-full border border-amber-100 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700"
                          >
                            {contest.nome}
                            <ExternalLink size={12} />
                          </button>
                        ))
                      ) : (
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-500">Nenhum concurso vinculado</span>
                      )}
                    </div>
                  </div>
                  {mapaAtivo.disciplinaId ? (
                    <button
                      type="button"
                      onClick={() => onOpenStudyRegister?.(activeDiscipline || { id: mapaAtivo.disciplinaId })}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-800 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-900"
                    >
                      Registrar estudo com este mapa
                      <ArrowRight size={15} />
                    </button>
                  ) : null}
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm font-semibold text-slate-400">
                  Selecione um mapa para ver os vinculos.
                </div>
              )}
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Historico de uso</p>
              <h3 className="mt-1 text-lg font-semibold tracking-tight text-slate-900">Atividades recentes</h3>
              <div className="mt-4 space-y-3">
                {recentHistory.length > 0 ? (
                  recentHistory.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="text-sm font-semibold text-slate-800">{item.titulo}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">{translateAction(item.action)} · {formatMindMapTimestamp(item.timestamp)}</p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm font-semibold text-slate-400">
                    As aberturas, downloads e criacoes de mapas vao aparecer aqui.
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function ActionButton({ icon, text, primary = false, onClick, disabled = false }) {
  const IconComponent = icon;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition ${primary ? 'bg-blue-800 text-white hover:bg-blue-900' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'} ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
    >
      <IconComponent size={16} />
      {text}
    </button>
  );
}

function MiniToolbarButton({ icon, label, onClick }) {
  const IconComponent = icon;
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100">
      <IconComponent size={14} />
      {label}
    </button>
  );
}

function InfoBlock({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}

function EmptyCanvas() {
  return (
    <div className="rounded-[28px] border border-dashed border-slate-200 bg-white/80 px-8 py-12 text-center shadow-sm">
      <p className="text-lg font-semibold text-slate-800">Nenhum mapa pronto ainda</p>
      <p className="mt-2 text-sm font-semibold text-slate-500">Gere um mapa pelo campo acima ou importe um JSON da biblioteca.</p>
    </div>
  );
}
