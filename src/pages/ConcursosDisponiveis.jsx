import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  Compass,
  DollarSign,
  ExternalLink,
  Filter,
  GraduationCap,
  Layers3,
  LibraryBig,
  Search,
  Users,
  X,
} from 'lucide-react';


const STATUS_LABELS = {
  confirmado: 'Confirmado',
  previsto: 'Previsto',
  suspeito: 'Em análise',
  suspenso: 'Suspenso',
  encerrado: 'Encerrado',
};

const STAGE_LABELS = {
  prova_objetiva: 'Prova objetiva',
  prova_discursiva: 'Prova discursiva',
  redacao: 'Redação',
  taf: 'TAF',
  avaliacao_psicologica: 'Avaliação psicológica',
  investigacao_social: 'Investigação social',
  exames_medicos: 'Exames médicos',
  toxicologico: 'Exame toxicológico',
  heteroidentificacao: 'Heteroidentificação',
  curso_formacao: 'Curso de formação',
};

export default function ConcursosDisponiveis({
  concursoCatalog = [],
  onImportCatalogCourse,
  setActiveTab,
  onOpenContestDetail,
  favoriteContestIds = [],
  interestedContestIds = [],
  cursos = [],
  currentCourseLimit = 3,
  currentCourseCount = 0,
  remainingCourseSlots = 3,
  isAdmin = false,
}) {
  const [query, setQuery] = useState('');
  const [areasSelecionadas, setAreasSelecionadas] = useState([]);
  const [statusFiltro, setStatusFiltro] = useState('Todos');
  const [viewMode, setViewMode] = useState('vitrine');
  const [sortMode, setSortMode] = useState('relevancia');
  const [importingId, setImportingId] = useState('');
  const [selectedContest, setSelectedContest] = useState(null);
  const [expandedSubjects, setExpandedSubjects] = useState({});
  const limiteAtingido = !isAdmin && remainingCourseSlots <= 0;

  const formatDateBR = (value) => {
    if (!value) return 'Sem data';
    const [year, month, day] = String(value).split('-');
    if (year && month && day) return `${day}/${month}/${year}`;
    return value;
  };

  const formatCurrencyBR = (value) => {
    const cleaned = String(value || '').trim();
    if (!cleaned) return 'A definir';

    const numeric = Number(cleaned.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.'));
    if (!Number.isFinite(numeric) || numeric <= 0) return 'A definir';

    return numeric.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const areas = useMemo(
    () => ['Todas', ...Array.from(new Set(concursoCatalog.map((item) => item.area || 'Geral')))],
    [concursoCatalog]
  );

  useEffect(() => {
    if (areasSelecionadas.length > 0) return;
    if (areas.length > 1) {
      setAreasSelecionadas([areas[1]]);
    }
  }, [areas, areasSelecionadas]);

  const concursosFiltrados = useMemo(() => {
    const normalizeMoney = (value) => {
      const cleaned = String(value || '').trim();
      if (!cleaned) return 0;
      const numeric = Number(cleaned.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.'));
      return Number.isFinite(numeric) ? numeric : 0;
    };

    const filtered = concursoCatalog.filter((contest) => {
      const haystack = [contest.nome, contest.concurso, contest.cargo, contest.banca, contest.area]
        .join(' ')
        .toLowerCase();

      const matchQuery = haystack.includes(query.toLowerCase());
      const matchArea =
        areasSelecionadas.length === 0 ||
        areasSelecionadas.includes('Todas') ||
        areasSelecionadas.includes(contest.area || 'Geral');
      const matchStatus = statusFiltro === 'Todos' || (contest.status_concurso || 'suspeito') === statusFiltro;

      return matchQuery && matchArea && matchStatus && contest.is_public !== false;
    });

    return [...filtered].sort((first, second) => {
      if (sortMode === 'salario') {
        return normalizeMoney(second.salario) - normalizeMoney(first.salario);
      }

      if (sortMode === 'inscricao') {
        return normalizeMoney(first.inscricao_valor) - normalizeMoney(second.inscricao_valor);
      }

      if (sortMode === 'prova') {
        const firstDate = first.prova_data ? new Date(`${first.prova_data}T00:00:00`).getTime() : Number.MAX_SAFE_INTEGER;
        const secondDate = second.prova_data ? new Date(`${second.prova_data}T00:00:00`).getTime() : Number.MAX_SAFE_INTEGER;
        return firstDate - secondDate;
      }

      if (sortMode === 'nome') {
        return String(first.nome || '').localeCompare(String(second.nome || ''), 'pt-BR');
      }

      const firstImported = cursos.some(
        (curso) => curso.plano === first.plano || curso.nome === first.nome || curso.concurso === first.concurso
      );
      const secondImported = cursos.some(
        (curso) => curso.plano === second.plano || curso.nome === second.nome || curso.concurso === second.concurso
      );

      const score = (contest, imported) =>
        (favoriteContestIds.includes(contest.id) ? 45 : 0) +
        (interestedContestIds.includes(contest.id) ? 30 : 0) +
        (imported ? 25 : 0) +
        (contest.status_concurso === 'confirmado' ? 15 : 0) +
        (contest.prova_data ? 10 : 0) +
        (contest.salario ? 5 : 0);

      return score(second, secondImported) - score(first, firstImported);
    });
  }, [areasSelecionadas, concursoCatalog, cursos, favoriteContestIds, interestedContestIds, query, sortMode, statusFiltro]);

  const smartSections = useMemo(() => {
    const enriched = concursosFiltrados
      .map((contest) => {
        const importedCount = cursos.filter(
          (curso) =>
            curso.plano === contest.plano ||
            curso.nome === contest.nome ||
            curso.concurso === contest.concurso
        ).length;

        const provaDate = contest.prova_data ? new Date(`${contest.prova_data}T00:00:00`) : null;
        const today = new Date();
        const daysToExam = provaDate ? Math.ceil((provaDate.getTime() - today.getTime()) / 86400000) : null;

        return {
          ...contest,
          importedCount,
          daysToExam,
        };
      });

    const recomendados = enriched
      .filter((item) => favoriteContestIds.includes(item.id) || interestedContestIds.includes(item.id))
      .slice(0, 4);

    const proximosDaProva = enriched
      .filter((item) => item.daysToExam !== null && item.daysToExam >= 0)
      .sort((a, b) => a.daysToExam - b.daysToExam)
      .slice(0, 4);

    const jaEmAndamento = enriched
      .filter((item) => item.importedCount > 0)
      .sort((a, b) => b.importedCount - a.importedCount)
      .slice(0, 4);

    return {
      recomendados,
      proximosDaProva,
      jaEmAndamento,
    };
  }, [concursosFiltrados, cursos, favoriteContestIds, interestedContestIds]);

  const grouped = useMemo(() => {
    const groups = concursosFiltrados.reduce((acc, contest) => {
      const area = contest.area || 'Geral';
      if (!acc[area]) acc[area] = [];
      acc[area].push(contest);
      return acc;
    }, {});

    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b, 'pt-BR'));
  }, [concursosFiltrados]);

  const areaStats = useMemo(() => {
    return areas.map((area) => ({
      area,
      total:
        area === 'Todas'
          ? concursoCatalog.filter((item) => item.is_public !== false).length
          : concursoCatalog.filter((item) => (item.area || 'Geral') === area && item.is_public !== false).length,
    }));
  }, [areas, concursoCatalog]);

  const displayedGroups = useMemo(() => {
    if (areasSelecionadas.length > 0 && !areasSelecionadas.includes('Todas')) {
      return grouped.filter(([area]) => areasSelecionadas.includes(area));
    }

    return grouped;
  }, [areasSelecionadas, grouped]);
  const totalPublicados = useMemo(
    () => concursoCatalog.filter((item) => item.is_public !== false).length,
    [concursoCatalog]
  );
  const totalAreas = useMemo(
    () => new Set(concursoCatalog.map((item) => item.area || 'Geral')).size,
    [concursoCatalog]
  );
  const recommendationBuckets = useMemo(() => {
    const buckets = [];
    if (smartSections.proximosDaProva.length > 0) {
      buckets.push({
        id: 'provas',
        title: 'Provas mais próximas',
        emptyText: 'Os concursos com data definida vão aparecer aqui.',
        items: smartSections.proximosDaProva,
      });
    }
    if (smartSections.jaEmAndamento.length > 0) {
      buckets.push({
        id: 'andamento',
        title: 'Já em andamento',
        emptyText: 'Quando você importar concursos, eles passam a aparecer aqui.',
        items: smartSections.jaEmAndamento,
      });
    }
    return buckets;
  }, [smartSections]);

  const toggleArea = (area) => {
    if (area === 'Todas') {
      const allAreas = areas.filter((item) => item !== 'Todas');
      const isAllSelected =
        areasSelecionadas.includes('Todas') ||
        (allAreas.length > 0 && allAreas.every((item) => areasSelecionadas.includes(item)));

      setAreasSelecionadas(isAllSelected ? [] : ['Todas']);
      return;
    }

    setAreasSelecionadas((prev) => {
      const withoutTodas = prev.filter((item) => item !== 'Todas');
      if (withoutTodas.includes(area)) {
        return withoutTodas.filter((item) => item !== area);
      }

      return [...withoutTodas, area];
    });
  };

  const handleImport = async (contest) => {
    setImportingId(contest.id);
    try {
      await onImportCatalogCourse?.(contest);
      setActiveTab?.('planos');
    } finally {
      setImportingId('');
    }
  };

  const handleOpenContest = (contest) => {
    if (onOpenContestDetail) {
      onOpenContestDetail(contest);
      return;
    }

    setSelectedContest(contest);
  };

  return (
    <div className="pl-paper-bg" style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '28px 28px 56px' }}>
      {/* Hero */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
        <div>
          <div className="pl-eyebrow" style={{ marginBottom: 6 }}>Catálogo</div>
          <h1 className="pl-display" style={{ fontSize: 38, margin: 0 }}>Concursos disponíveis.</h1>
          <p style={{ fontSize: 13, color: 'var(--pl-ink-3)', marginTop: 6, maxWidth: 440 }}>
            Encontre concursos por área, banca, cargo ou data e importe os mais relevantes para o seu painel.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <span className="pl-tag" style={{ height: 28, display: 'inline-flex', alignItems: 'center' }}>{totalPublicados} publicados</span>
          <span className="pl-tag" style={{ height: 28, display: 'inline-flex', alignItems: 'center' }}>{totalAreas} áreas</span>
        </div>
      </div>

      <div className="pl-card" style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Search + controls row */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--pl-ink-4)', pointerEvents: 'none' }} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por concurso, banca, cargo ou área…"
              className="pl-input"
              style={{ paddingLeft: 30, height: 34, fontSize: 12.5, width: '100%' }}
            />
          </div>
          {/* View mode toggle */}
          <div style={{ display: 'flex', border: '1px solid var(--pl-rule-strong)', borderRadius: 6, overflow: 'hidden' }}>
            {[['vitrine', 'Vitrine'], ['lista', 'Lista']].map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                style={{
                  padding: '0 12px', height: 32, fontSize: 12, fontWeight: 700, border: 0, cursor: 'pointer',
                  background: viewMode === mode ? 'var(--pl-accent-soft)' : 'transparent',
                  color: viewMode === mode ? 'var(--pl-accent)' : 'var(--pl-ink-3)',
                }}
              >{label}</button>
            ))}
          </div>
          <FilterSelect
            value={sortMode}
            onChange={setSortMode}
            options={['relevancia', 'prova', 'salario', 'inscricao', 'nome']}
            renderLabel={(value) => {
              if (value === 'relevancia') return 'Relevância';
              if (value === 'prova') return 'Prova mais próxima';
              if (value === 'salario') return 'Maior salário';
              if (value === 'inscricao') return 'Menor inscrição';
              return 'Nome';
            }}
          />
          <FilterSelect
            value={statusFiltro}
            onChange={setStatusFiltro}
            options={['Todos', 'confirmado', 'previsto', 'suspeito', 'suspenso', 'encerrado']}
            renderLabel={(value) => (value === 'Todos' ? 'Todos os status' : STATUS_LABELS[value] || value)}
          />
          {(query || statusFiltro !== 'Todos' || (areasSelecionadas.length > 0 && !areasSelecionadas.includes('Todas'))) && (
            <button
              type="button"
              className="pl-btn pl-btn-ghost"
              onClick={() => { setQuery(''); setStatusFiltro('Todos'); setSortMode('relevancia'); setAreasSelecionadas(['Todas']); }}
            >
              <X size={11} /> Limpar
            </button>
          )}
        </div>

        {/* Area filters */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
          <span className="pl-eyebrow" style={{ fontSize: 9.5, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Filter size={10} /> Áreas
          </span>
          {areaStats.map((item) => {
            const isActive = (item.area === 'Todas' && (areasSelecionadas.includes('Todas') || areasSelecionadas.length === 0)) || areasSelecionadas.includes(item.area);
            return (
              <button
                key={item.area}
                type="button"
                onClick={() => toggleArea(item.area)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  height: 26, padding: '0 10px', borderRadius: 99, border: '1px solid',
                  fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
                  borderColor: isActive ? 'var(--pl-accent)' : 'var(--pl-rule-strong)',
                  background: isActive ? 'var(--pl-accent-soft)' : 'transparent',
                  color: isActive ? 'var(--pl-accent)' : 'var(--pl-ink-3)',
                }}
              >
                {item.area}
                <span style={{ fontSize: 10, background: 'rgba(0,0,0,0.08)', borderRadius: 99, padding: '0 4px' }}>{item.total}</span>
              </button>
            );
          })}
        </div>

        {!isAdmin && (
          <div style={{
            padding: '10px 14px', borderRadius: 8, border: '1px solid',
            borderColor: limiteAtingido ? 'var(--pl-warn-soft)' : 'var(--pl-accent-soft)',
            background: limiteAtingido ? 'var(--pl-warn-soft)' : 'var(--pl-accent-soft)',
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--pl-ink)', marginBottom: 3 }}>
              {currentCourseCount} de {currentCourseLimit} cursos ocupados
            </div>
            <div style={{ fontSize: 12, color: 'var(--pl-ink-3)' }}>
              {limiteAtingido ? 'Importações bloqueadas até você liberar uma vaga.' : `Ainda há ${remainingCourseSlots} vaga(s) para importar.`}
            </div>
          </div>
        )}
      </div>

      {recommendationBuckets.length > 0 && (
        <section className="pl-card">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-400">Insights</p>
              <h3 className="mt-1 text-2xl font-semibold text-slate-900">Onde vale olhar primeiro</h3>
            </div>
          </div>

          {recommendationBuckets.length > 0 ? (
            <div
              className={`grid gap-4 ${
                recommendationBuckets.length === 1
                  ? 'grid-cols-1'
                  : recommendationBuckets.length === 2
                    ? 'grid-cols-1 xl:grid-cols-2'
                    : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
              }`}
            >
              {recommendationBuckets.map((section) => (
                <RecommendationPanel
                  key={section.id}
                  title={section.title}
                  emptyText={section.emptyText}
                  items={section.items}
                  onOpen={handleOpenContest}
                  formatDateBR={formatDateBR}
                />
              ))}
            </div>
          ) : null}
        </section>
      )}

      <div className="space-y-8">
        {concursoCatalog.length === 0 ? (
          <section className="rounded-[2rem] border border-dashed border-gray-200 bg-white p-10 text-center text-sm font-semibold text-gray-500">
            Nenhum concurso disponível no momento. Aguarde a equipe adicionar novos editais.
          </section>
        ) : null}

        {displayedGroups.map(([area, contests]) => (
          <section key={area}>
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-400">
                  Área
                </p>
                <h3 className="mt-1 text-2xl font-semibold text-slate-900">{area}</h3>
              </div>
              <span className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-500 shadow-sm">
                {contests.length} concursos
              </span>
            </div>

            {viewMode === 'vitrine' ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {contests.map((contest) => {
                  const topicosCount = (contest.disciplinas || []).reduce(
                    (acc, subject) => acc + (subject.topicos?.length || 0),
                    0
                  );

                  return (
                    <article
                      key={contest.id}
                      className="pl-card"
                    >
                      <button
                        type="button"
                        onClick={() => handleOpenContest(contest)}
                        className="block w-full text-left"
                      >
                        <div className="h-24 overflow-hidden border-b border-slate-200 bg-slate-50">
                          {contest.imagem_url ? (
                            <img
                              src={contest.imagem_url}
                              alt={contest.nome}
                              className="h-full w-full object-contain bg-white p-2"
                            />
                          ) : (
                            <div
                              className="flex h-full w-full items-center justify-center text-white"
                              style={{
                                background: `linear-gradient(135deg, ${contest.cor || '#2563eb'} 0%, #1e40af 100%)`,
                              }}
                            >
                              <LibraryBig size={32} />
                            </div>
                          )}
                        </div>

                        <div className="p-4">
                          <div className="mb-3 flex flex-wrap gap-2">
                            <AreaBadge>{contest.area || 'Geral'}</AreaBadge>
                            <StatusBadge>{STATUS_LABELS[contest.status_concurso] || 'Em análise'}</StatusBadge>
                          </div>

                          <h4 className="text-lg font-semibold tracking-tight text-slate-900">{contest.nome}</h4>
                          <p className="mt-1 line-clamp-2 min-h-[44px] text-sm font-semibold text-gray-500">
                            {contest.cargo || contest.concurso}
                          </p>
                          <p className="mt-1 text-sm font-medium text-gray-500">
                            {contest.banca || 'Banca a definir'}
                          </p>

                          <div className="mt-4 flex flex-wrap gap-2">
                            <QuickTag tone="blue">{formatDateBR(contest.prova_data)}</QuickTag>
                            <QuickTag tone="green">{formatCurrencyBR(contest.salario)}</QuickTag>
                            <QuickTag tone="amber">{formatCurrencyBR(contest.inscricao_valor)}</QuickTag>
                            <QuickTag tone="blue">{contest.escolaridade || 'Nível a definir'}</QuickTag>
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-2">
                            <MetaCounter label="Disciplinas" value={contest.disciplinas?.length || 0} />
                            <MetaCounter label="Tópicos" value={topicosCount} />
                          </div>
                        </div>
                      </button>

                      <div className="px-4 pb-4">
                        <div className="flex gap-2">
                          <button type="button" className="pl-btn pl-btn-ghost" style={{ fontSize: 12 }} onClick={() => handleOpenContest(contest)}>
                            Ver detalhes
                          </button>
                          <button
                            type="button"
                            className="pl-btn pl-btn-primary"
                            onClick={() => handleImport(contest)}
                            disabled={importingId === contest.id || limiteAtingido}
                            style={{ flex: 1, justifyContent: 'center', fontSize: 12, opacity: (importingId === contest.id || limiteAtingido) ? 0.6 : 1 }}
                          >
                            {limiteAtingido ? 'Limite atingido' : importingId === contest.id ? 'Importando…' : 'Adicionar'}
                            <ArrowRight size={12} />
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="pl-card">
                <div className="hidden grid-cols-[2.1fr_1fr_1fr_1fr_1fr_1fr_1fr] gap-4 border-b border-gray-200 bg-gray-50 px-5 py-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400 lg:grid">
                  <span>Concurso</span>
                  <span>Banca</span>
                  <span>Área</span>
                  <span>Salário</span>
                  <span>Inscrição</span>
                  <span>Prova</span>
                  <span>Ações</span>
                </div>

                <div className="divide-y divide-gray-100">
                  {contests.map((contest) => (
                    <div
                      key={contest.id}
                      className="grid gap-4 px-5 py-4 lg:grid-cols-[2.1fr_1fr_1fr_1fr_1fr_1fr_1fr] lg:items-center"
                    >
                      <button type="button" onClick={() => handleOpenContest(contest)} className="text-left">
                        <p className="text-base font-semibold text-slate-900">{contest.nome}</p>
                        <p className="mt-1 text-sm font-semibold text-gray-500">{contest.cargo || contest.concurso}</p>
                      </button>

                      <div className="text-sm font-semibold text-gray-600">{contest.banca || 'A definir'}</div>
                      <div className="flex flex-wrap gap-2">
                        <AreaBadge>{contest.area || 'Geral'}</AreaBadge>
                        <StatusBadge>{STATUS_LABELS[contest.status_concurso] || 'Em análise'}</StatusBadge>
                      </div>
                      <div className="text-sm font-semibold text-emerald-700">{formatCurrencyBR(contest.salario)}</div>
                      <div className="text-sm font-semibold text-amber-700">{formatCurrencyBR(contest.inscricao_valor)}</div>
                      <div className="text-sm font-semibold text-blue-700">{formatDateBR(contest.prova_data)}</div>

                      <div className="flex flex-wrap gap-2">
                        <button type="button" className="pl-btn pl-btn-ghost" style={{ fontSize: 12 }} onClick={() => handleOpenContest(contest)}>
                          Ver detalhes
                        </button>
                        <button type="button" className="pl-btn pl-btn-primary" style={{ fontSize: 12, opacity: (importingId === contest.id || limiteAtingido) ? 0.6 : 1 }} onClick={() => handleImport(contest)} disabled={importingId === contest.id || limiteAtingido}>
                          {importingId === contest.id ? '…' : 'Adicionar'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        ))}

        {concursoCatalog.length > 0 && displayedGroups.length === 0 && (
          <section className="rounded-[2rem] border border-dashed border-gray-200 bg-white p-10 text-center text-sm font-semibold text-gray-500">
            Nenhum concurso encontrado com esses filtros.
          </section>
        )}
      </div>

      {selectedContest && (
        <ContestPreviewModal
          contest={selectedContest}
          formatDateBR={formatDateBR}
          formatCurrencyBR={formatCurrencyBR}
          expandedSubjects={expandedSubjects}
          onToggleSubject={(subjectName) =>
            setExpandedSubjects((prev) => ({ ...prev, [subjectName]: !prev[subjectName] }))
          }
          limiteAtingido={limiteAtingido}
          importingId={importingId}
          onClose={() => setSelectedContest(null)}
          onImport={handleImport}
        />
      )}
    </div>
  );
}

function FilterSelect({ value, onChange, options, renderLabel }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="pl-input"
      style={{ height: 34, fontSize: 12, paddingLeft: 10, paddingRight: 24 }}
    >
      {options.map((option) => {
        const optionValue = typeof option === 'string' ? option : option.value;
        const label = renderLabel?.(optionValue) || (typeof option === 'string' ? option : option.label || option.value);
        return <option key={optionValue} value={optionValue}>{label}</option>;
      })}
    </select>
  );
}

function AreaBadge({ children }) {
  return <span className="pl-tag" style={{ fontSize: 9.5, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{children}</span>;
}

function StatusBadge({ children }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', height: 20, padding: '0 8px', borderRadius: 99,
      fontSize: 9.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
      background: 'var(--pl-success-soft, #d1fae5)', color: 'var(--pl-success, #059669)',
      border: '1px solid #a7f3d0',
    }}>
      {children}
    </span>
  );
}

function InfoPill({ icon: Icon, label }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      padding: '7px 12px', borderRadius: 8,
      border: '1px solid var(--pl-rule-strong)',
      background: 'var(--pl-bg-soft)',
      fontSize: 12.5, fontWeight: 600, color: 'var(--pl-ink-2)',
    }}>
      <Icon size={12} style={{ color: 'var(--pl-accent)', flexShrink: 0 }} />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
    </div>
  );
}

function MetaCounter({ label, value }) {
  return (
    <div style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--pl-rule-strong)', background: 'var(--pl-bg-soft)' }}>
      <div className="pl-eyebrow" style={{ fontSize: 9, marginBottom: 4 }}>{label}</div>
      <div className="pl-num" style={{ fontSize: 16 }}>{value}</div>
    </div>
  );
}

function QuickTag({ children }) {
  return <span className="pl-tag" style={{ fontSize: 10, letterSpacing: '0.06em' }}>{children}</span>;
}

function MiniStat({ label, value }) {
  return (
    <div style={{ padding: '7px 10px', borderRadius: 6, border: '1px solid var(--pl-rule-strong)', background: 'var(--pl-surface)' }}>
      <div className="pl-eyebrow" style={{ fontSize: 8.5, marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--pl-ink)' }}>{value}</div>
    </div>
  );
}

function RecommendationPanel({ title, items = [], emptyText, onOpen, formatDateBR }) {
  const isHorizontal = title === 'Provas mais próximas';
  const visibleItems = isHorizontal ? items.slice(0, 3) : items;

  return (
    <section className="pl-card">
      {!isHorizontal ? (
        <div className="mb-4">
          <h3 className="text-xl font-semibold text-slate-900">{title}</h3>
        </div>
      ) : null}

      {visibleItems.length === 0 ? (
        <div className="rounded-[1.4rem] border border-dashed border-gray-200 bg-gray-50/70 px-4 py-6 text-sm font-semibold text-gray-500">
          {emptyText}
        </div>
      ) : (
        <div className={isHorizontal ? 'grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3' : 'space-y-3'}>
          {visibleItems.map((item) => (
            <button
              key={`rec-${title}-${item.id}`}
              type="button"
              onClick={() => onOpen(item)}
              className={`w-full rounded-[1.4rem] border border-gray-200 bg-gray-50/70 text-left transition-all hover:-translate-y-0.5 hover:shadow-sm ${
                isHorizontal ? 'min-h-[120px] p-4' : 'min-h-[120px] p-4'
              }`}
            >
              <p className="line-clamp-2 text-sm font-semibold text-slate-900">{item.nome}</p>
              <p className="mt-1 text-xs font-semibold text-gray-500">{item.cargo || item.concurso}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {item.prova_data && <QuickTag tone="blue">{formatDateBR(item.prova_data)}</QuickTag>}
                {item.importedCount > 0 && <QuickTag tone="green">Já importado</QuickTag>}
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function ContestPreviewModal({
  contest,
  onClose,
  onImport,
  importingId,
  limiteAtingido,
  formatDateBR,
  formatCurrencyBR,
  expandedSubjects,
  onToggleSubject,
}) {
  const topicosCount = (contest.disciplinas || []).reduce(
    (acc, subject) => acc + (subject.topicos?.length || 0),
    0
  );

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.45)', padding: 16 }}>
      <div className="pl-card" style={{ maxHeight: '90vh', width: '100%', maxWidth: 900, overflowY: 'auto', borderRadius: 16, padding: 0 }}>
        <div style={{ position: 'sticky', top: 0, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid var(--pl-rule)', background: 'var(--pl-surface)' }}>
          <div>
            <div className="pl-eyebrow" style={{ fontSize: 9.5, marginBottom: 4 }}>Detalhes do concurso</div>
            <h3 style={{ fontFamily: 'var(--pl-serif)', fontStyle: 'italic', fontWeight: 300, fontSize: 22, color: 'var(--pl-ink)', margin: 0, letterSpacing: '-0.04em' }}>{contest.nome}</h3>
          </div>
          <button type="button" className="pl-btn pl-btn-ghost" style={{ width: 30, height: 30, padding: 0, justifyContent: 'center' }} onClick={onClose}>
            <X size={14} />
          </button>
        </div>

        <div className="grid gap-6 p-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <div className="space-y-4">
            <div className="overflow-hidden rounded-[1.6rem] border border-gray-200 bg-gray-50">
              {contest.imagem_url ? (
                <img src={contest.imagem_url} alt={contest.nome} className="h-48 w-full object-contain bg-white p-4" />
              ) : (
                <div
                  className="flex h-48 w-full items-center justify-center text-white"
                  style={{ background: `linear-gradient(135deg, ${contest.cor || '#2563eb'} 0%, #1e3a8a 100%)` }}
                >
                  <LibraryBig size={42} />
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <AreaBadge>{contest.area || 'Geral'}</AreaBadge>
              <StatusBadge>{STATUS_LABELS[contest.status_concurso] || 'Em análise'}</StatusBadge>
            </div>

            <div className="grid gap-2">
              <InfoPill icon={CalendarDays} label={formatDateBR(contest.prova_data)} />
              <InfoPill icon={DollarSign} label={formatCurrencyBR(contest.salario)} />
              <InfoPill icon={DollarSign} label={`Inscrição ${formatCurrencyBR(contest.inscricao_valor)}`} />
              <InfoPill icon={GraduationCap} label={contest.escolaridade || 'Nível a definir'} />
              {contest.vagas && <InfoPill icon={Users} label={contest.vagas} />}
              {contest.lotacao && <InfoPill icon={Compass} label={contest.lotacao} />}
              <InfoPill icon={Layers3} label={`${contest.disciplinas?.length || 0} disciplinas`} />
              <InfoPill icon={BadgeCheck} label={`${topicosCount} tópicos`} />
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-gray-500">{contest.cargo || contest.concurso}</p>
            <p className="mt-1 text-sm font-medium text-gray-500">{contest.banca || 'Banca a definir'}</p>

            {contest.descricao && (
              <div className="mt-5 rounded-[1.4rem] border border-gray-200 bg-gray-50/70 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">Resumo</p>
                <p className="mt-3 text-sm font-medium leading-relaxed text-gray-600">{contest.descricao}</p>
              </div>
            )}

            {(contest.vagas || contest.lotacao || contest.etapas || contest.etapas_tags?.length > 0) && (
              <div className="mt-5 rounded-[1.4rem] border border-gray-200 bg-gray-50/70 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">
                  Informações do concurso
                </p>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <DetailBox label="Vagas" value={contest.vagas || 'Não informado'} />
                  <DetailBox label="Lotação" value={contest.lotacao || 'Não informado'} />
                  <DetailBox label="Etapas" value={contest.etapas || 'Não informado'} />
                </div>

                {contest.etapas_tags?.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {contest.etapas_tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700"
                      >
                        {STAGE_LABELS[tag] || tag}
                      </span>
                    ))}
                  </div>
                )}

                {contest.taf_itens?.length > 0 && (
                  <div className="mt-4 rounded-[1rem] border border-blue-100 bg-blue-50/70 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">Itens do TAF</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {contest.taf_itens.map((item) => (
                        <span
                          key={item}
                          className="rounded-full border border-white bg-white px-3 py-1 text-xs font-bold text-gray-700"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="mt-5 rounded-[1.4rem] border border-gray-200 bg-white p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">
                    Estrutura base
                  </p>
                  <h4 className="mt-1 text-lg font-semibold text-slate-900">Disciplinas do concurso</h4>
                </div>
                <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-bold text-gray-500">
                  {contest.disciplinas?.length || 0} disciplinas
                </span>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {(contest.disciplinas || []).map((disciplina) => (
                  <div key={disciplina.nome} className="rounded-[1.1rem] border border-gray-200 bg-gray-50/70 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-bold text-slate-900">{disciplina.nome}</p>
                        <p className="mt-1 text-xs font-semibold text-gray-500">
                          {disciplina.topicos?.length || 0} tópicos mapeados
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onToggleSubject(disciplina.nome)}
                        className="rounded-xl border border-gray-200 bg-white p-2 text-gray-600"
                      >
                        <Plus
                          size={14}
                          className={`transition-transform ${expandedSubjects[disciplina.nome] ? 'rotate-45' : ''}`}
                        />
                      </button>
                    </div>

                    {expandedSubjects[disciplina.nome] && (
                      <div className="mt-3 space-y-2 border-t border-gray-200 pt-3">
                        {(disciplina.topicos || []).length > 0 ? (
                          (disciplina.topicos || []).map((topico) => (
                            <div
                              key={topico.id || topico.nome}
                              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600"
                            >
                              {topico.nome}
                            </div>
                          ))
                        ) : (
                          <div className="rounded-xl border border-dashed border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-500">
                            Nenhum tópico detalhado ainda.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                className="pl-btn pl-btn-primary"
                onClick={() => onImport(contest)}
                disabled={importingId === contest.id || limiteAtingido}
                style={{ opacity: (importingId === contest.id || limiteAtingido) ? 0.6 : 1 }}
              >
                {limiteAtingido ? 'Limite atingido' : importingId === contest.id ? 'Importando…' : 'Adicionar aos meus cursos'}
                <ArrowRight size={13} />
              </button>

              {contest.edital_url && (
                <button
                  type="button"
                  className="pl-btn pl-btn-ghost"
                  onClick={() => window.open(contest.edital_url, '_blank', 'noopener,noreferrer')}
                >
                  Edital <ExternalLink size={12} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailBox({ label, value }) {
  return (
    <div style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--pl-rule-strong)', background: 'var(--pl-bg-soft)' }}>
      <div className="pl-eyebrow" style={{ fontSize: 9, marginBottom: 5 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--pl-ink)' }}>{value}</div>
    </div>
  );
}


