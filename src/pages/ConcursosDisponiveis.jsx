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
import PageHeadPremium from '../components/PageHeadPremium';
import { buildContestForRole, CONTEST_STATUS_LABELS, CONTEST_STATUS_OPTIONS, getContestRoles, groupContestTemplates, normalizeContestStatus } from '../lib/contestGrouping';
import { getContestAreaBackground } from '../lib/contestAreaTheme';

const STATUS_LABELS = CONTEST_STATUS_LABELS;
const STATUS_FILTER_OPTIONS = ['Todos', ...CONTEST_STATUS_OPTIONS.map((option) => option.value)];

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
  const groupedCatalog = useMemo(() => groupContestTemplates(concursoCatalog), [concursoCatalog]);

  const formatDateBR = (value) => {
    if (!value) return 'Sem data';
    const [year, month, day] = String(value).split('-');
    if (year && month && day) return `${day}/${month}/${year}`;
    return value;
  };

  const formatCurrencyBR = (value) => {
    const cleaned = String(value || '').trim();
    if (!cleaned) return 'A definir';
    if (/\s+a\s+R\$/i.test(cleaned)) return cleaned;

    const numeric = Number(cleaned.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.'));
    if (!Number.isFinite(numeric) || numeric <= 0) return 'A definir';

    return numeric.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const areas = useMemo(
    () => ['Todas', ...Array.from(new Set(groupedCatalog.map((item) => item.area || 'Geral')))],
    [groupedCatalog]
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

    const filtered = groupedCatalog.filter((contest) => {
      const roleText = getContestRoles(contest).map((role) => role.nome || role.cargo).join(' ');
      const haystack = [contest.nome, contest.concurso, contest.cargo, contest.banca, contest.area, roleText]
        .join(' ')
        .toLowerCase();

      const matchQuery = haystack.includes(query.toLowerCase());
      const matchArea =
        areasSelecionadas.length === 0 ||
        areasSelecionadas.includes('Todas') ||
        areasSelecionadas.includes(contest.area || 'Geral');
      const matchStatus = statusFiltro === 'Todos' || normalizeContestStatus(contest.status_concurso) === statusFiltro;

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
        (['inscricoes_abertas', 'prova_marcada', 'edital_publicado'].includes(normalizeContestStatus(contest.status_concurso)) ? 15 : 0) +
        (contest.prova_data ? 10 : 0) +
        (contest.salario ? 5 : 0);

      return score(second, secondImported) - score(first, firstImported);
    });
  }, [areasSelecionadas, groupedCatalog, cursos, favoriteContestIds, interestedContestIds, query, sortMode, statusFiltro]);

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
          ? groupedCatalog.filter((item) => item.is_public !== false).length
          : groupedCatalog.filter((item) => (item.area || 'Geral') === area && item.is_public !== false).length,
    }));
  }, [areas, groupedCatalog]);

  const displayedGroups = useMemo(() => {
    if (areasSelecionadas.length > 0 && !areasSelecionadas.includes('Todas')) {
      return grouped.filter(([area]) => areasSelecionadas.includes(area));
    }

    return grouped;
  }, [areasSelecionadas, grouped]);
  const totalPublicados = useMemo(
    () => groupedCatalog.filter((item) => item.is_public !== false).length,
    [groupedCatalog]
  );
  const totalAreas = useMemo(
    () => new Set(groupedCatalog.map((item) => item.area || 'Geral')).size,
    [groupedCatalog]
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
      setAreasSelecionadas(['Todas']);
      return;
    }

    setAreasSelecionadas((prev) => (prev.includes(area) ? ['Todas'] : [area]));
  };

  const handleImport = async (contest) => {
    const roles = getContestRoles(contest);
    if (roles.length > 1) {
      handleOpenContest(contest);
      return;
    }

    const importTemplate = buildContestForRole(contest, roles[0]);
    setImportingId(importTemplate.id || contest.id);
    try {
      await onImportCatalogCourse?.(importTemplate);
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
    <div className="page-shell !pt-4 sm:!pt-5">
      <PageHeadPremium
        className="lg:!flex-row lg:!items-center lg:!justify-between"
        icon={Compass}
        titleAs="h1"
        title="Concursos disponíveis"
        subtitle="Encontre concursos por área, banca, cargo ou data de prova e importe os mais relevantes para o seu painel."
        leadingClassName="lg:max-w-[calc(100%-18rem)] xl:max-w-[52rem]"
        trailingWrapClassName="lg:ml-auto lg:w-auto lg:max-w-[17rem] lg:self-center"
        trailingClassName="xl:max-w-none xl:flex-none"
        trailing={
          <div className="flex w-full flex-wrap items-center justify-start gap-2 text-xs font-semibold text-ink-200 sm:w-auto sm:justify-end sm:text-[13px]">
            <span className="whitespace-nowrap rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-ink-100">
              {totalPublicados} publicados
            </span>
            <span className="whitespace-nowrap rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-ink-100">
              {totalAreas} áreas
            </span>
          </div>
        }
      />

      <section className="surface-card block w-full min-w-0 self-stretch overflow-visible rounded-2xl p-5 sm:p-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative max-w-xl flex-1">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por concurso, banca, cargo ou área..."
                className="w-full rounded-2xl border border-ink-200 bg-ink-50/70 py-3 pl-11 pr-4 text-sm font-semibold text-ink-700 outline-none transition-all focus:border-brand-500 focus:ring-4 focus:ring-brand-50"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center rounded-xl border border-ink-200 bg-white p-1">
                <button
                  type="button"
                  onClick={() => setViewMode('vitrine')}
                  className={`rounded-lg px-3 py-2 text-sm font-bold transition-colors ${
                    viewMode === 'vitrine' ? 'bg-brand-50 text-brand-700' : 'text-ink-500 hover:bg-ink-50'
                  }`}
                >
                  Vitrine
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('lista')}
                  className={`rounded-lg px-3 py-2 text-sm font-bold transition-colors ${
                    viewMode === 'lista' ? 'bg-brand-50 text-brand-700' : 'text-ink-500 hover:bg-ink-50'
                  }`}
                >
                  Lista
                </button>
              </div>
              <FilterSelect
                value={sortMode}
                onChange={setSortMode}
                options={['relevancia', 'prova', 'salario', 'inscricao', 'nome']}
                renderLabel={(value) => {
                  if (value === 'relevancia') return 'Ordenar: relevância';
                  if (value === 'prova') return 'Ordenar: prova mais próxima';
                  if (value === 'salario') return 'Ordenar: maior salário';
                  if (value === 'inscricao') return 'Ordenar: menor inscrição';
                  return 'Ordenar: nome';
                }}
              />
              <FilterSelect
                value={statusFiltro}
                onChange={setStatusFiltro}
                options={STATUS_FILTER_OPTIONS}
                renderLabel={(value) => (value === 'Todos' ? 'Todos os status' : STATUS_LABELS[value] || value)}
              />
              {(query || statusFiltro !== 'Todos' || (areasSelecionadas.length > 0 && !areasSelecionadas.includes('Todas'))) && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setStatusFiltro('Todos');
                    setSortMode('relevancia');
                    setAreasSelecionadas(['Todas']);
                  }}
                  className="rounded-xl border border-ink-200 bg-white px-4 py-3 text-sm font-bold text-ink-600 transition-colors hover:bg-ink-50"
                >
                  Limpar filtros
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-ink-400">
              <Filter size={14} className="text-ink-400" />
              Áreas
            </span>
            {areaStats.map((item) => (
              <button
                key={item.area}
                type="button"
                onClick={() => toggleArea(item.area)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
                  (item.area === 'Todas' && (areasSelecionadas.includes('Todas') || areasSelecionadas.length === 0)) ||
                  areasSelecionadas.includes(item.area)
                    ? 'border-brand-200 bg-brand-50 text-brand-700 shadow-sm'
                    : 'border-ink-200 bg-ink-50/70 text-ink-600 hover:border-brand-100 hover:bg-white'
                }`}
              >
                <span>{item.area}</span>
                <span className="inline-flex min-w-[1.35rem] items-center justify-center rounded-full bg-black/5 px-1.5 py-0.5 text-[10px] leading-none opacity-70">
                  {item.total}
                </span>
              </button>
            ))}
          </div>

          {!isAdmin && (
            <div
              className={`rounded-2xl border px-4 py-3 ${
                limiteAtingido ? 'border-amber-200 bg-amber-50' : 'border-brand-100 bg-brand-50/70'
              }`}
            >
              <p className="text-sm font-semibold text-ink-900">
                {currentCourseCount} de {currentCourseLimit} cursos ocupados
              </p>
              <p className="mt-1 text-xs font-semibold text-ink-500">
                {limiteAtingido
                  ? 'As importações ficaram bloqueadas até você liberar uma vaga.'
                  : `Você ainda tem ${remainingCourseSlots} vaga(s) para importar concursos.`}
              </p>
            </div>
          )}
        </div>
      </section>

      {recommendationBuckets.length > 0 && (
        <section className="surface-card block w-full min-w-0 self-stretch overflow-visible rounded-2xl p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-400">Insights</p>
              <h3 className="mt-1 text-2xl font-semibold text-ink-900">Onde vale olhar primeiro</h3>
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
        {groupedCatalog.length === 0 ? (
          <section className="rounded-[2rem] border border-dashed border-ink-200 bg-white p-10 text-center text-sm font-semibold text-ink-500">
            Nenhum concurso disponível no momento. Aguarde a equipe adicionar novos editais.
          </section>
        ) : null}

        {displayedGroups.map(([area, contests]) => (
          <section key={area}>
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-400">
                  Área
                </p>
                <h3 className="mt-1 text-2xl font-semibold text-ink-900">{area}</h3>
              </div>
              <span className="rounded-full border border-ink-200 bg-white px-4 py-2 text-sm font-bold text-ink-500 shadow-sm">
                {contests.length} concursos
              </span>
            </div>

            {viewMode === 'vitrine' ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {contests.map((contest) => {
                  const cargos = getContestRoles(contest);
                  const hasMultipleRoles = cargos.length > 1;
                  const allSubjects = cargos.flatMap((cargo) => cargo.disciplinas || []);
                  const topicosCount = allSubjects.reduce((acc, subject) => acc + (subject.topicos?.length || 0), 0);

                  return (
                    <article
                      key={contest.id}
                      className="group overflow-hidden rounded-[1.35rem] border border-ink-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)] transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-[0_18px_44px_rgba(37,99,235,0.13)]"
                    >
                      <button
                        type="button"
                        onClick={() => handleOpenContest(contest)}
                        className="block w-full text-left"
                      >
                        <div
                          className="relative flex h-48 items-center justify-center overflow-hidden border-b border-ink-100"
                          style={{
                            background: getContestAreaBackground(contest.area || 'Geral', contest.cor),
                          }}
                        >
                          <div className="pointer-events-none absolute -left-10 -top-10 h-28 w-28 rounded-full bg-cyan-400/10" />
                          <div className="pointer-events-none absolute -right-8 bottom-2 h-24 w-24 rounded-full bg-emerald-300/10" />
                          <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 rounded-bl-full border-b border-l border-amber-200/30" />
                          {contest.imagem_url ? (
                            <img
                              src={contest.imagem_url}
                              alt={contest.nome}
                              className="relative z-10 max-h-[74%] max-w-[62%] object-contain drop-shadow-[0_18px_24px_rgba(0,0,0,0.32)] transition-transform duration-300 group-hover:scale-[1.06]"
                            />
                          ) : (
                            <div
                              className="relative z-10 flex h-20 w-20 items-center justify-center rounded-3xl border border-white/15 bg-white/10 text-white shadow-xl backdrop-blur"
                              style={{
                                color: '#fff',
                              }}
                            >
                              <LibraryBig size={56} />
                            </div>
                          )}
                        </div>

                        <div className="p-4">
                          <div className="mb-3 flex flex-wrap items-center gap-2">
                            <AreaBadge>{contest.area || 'Geral'}</AreaBadge>
                            <StatusBadge>{STATUS_LABELS[normalizeContestStatus(contest.status_concurso)] || 'Previsto'}</StatusBadge>
                          </div>

                          <h4 className="line-clamp-2 min-h-[52px] text-lg font-bold leading-snug tracking-tight text-ink-950">
                            {contest.nome}
                          </h4>
                          <p className="mt-1 line-clamp-2 min-h-[44px] text-sm font-semibold text-ink-500">
                            {contest.cargo || contest.concurso}
                          </p>
                          {hasMultipleRoles && (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {cargos.slice(0, 3).map((cargo) => (
                                <span
                                  key={cargo.id}
                                  className="rounded-full border border-ink-200 bg-ink-50 px-2.5 py-1 text-[10px] font-bold text-ink-600"
                                >
                                  {cargo.nome}
                                </span>
                              ))}
                              {cargos.length > 3 && (
                                <span className="rounded-full border border-brand-100 bg-brand-50 px-2.5 py-1 text-[10px] font-bold text-brand-700">
                                  +{cargos.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                          <p className="mt-2 truncate text-sm font-bold text-ink-600">
                            {contest.banca || 'Banca a definir'}
                          </p>

                          <div className="mt-4 grid grid-cols-2 gap-2">
                            <QuickInfo label="Prova" value={formatDateBR(contest.prova_data)} />
                            <QuickInfo label={hasMultipleRoles ? 'Salários' : 'Salário'} value={formatCurrencyBR(contest.salario)} tone="green" wide={hasMultipleRoles} />
                            <QuickInfo label={hasMultipleRoles ? 'Inscrições' : 'Inscrição'} value={formatCurrencyBR(contest.inscricao_valor)} tone="amber" wide={hasMultipleRoles} />
                            <QuickInfo label="Nível" value={contest.escolaridade || 'A definir'} />
                            <QuickInfo label={hasMultipleRoles ? 'Vagas totais' : 'Vagas'} value={contest.vagas || 'A definir'} />
                          </div>

                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <MetaCounter label={hasMultipleRoles ? 'Cargos' : 'Disciplinas'} value={hasMultipleRoles ? cargos.length : contest.disciplinas?.length || 0} />
                            <MetaCounter label={hasMultipleRoles ? 'Tópicos gerais' : 'Tópicos'} value={topicosCount} />
                          </div>
                        </div>
                      </button>

                      <div className="px-4 pb-4">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenContest(contest)}
                            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-ink-200 bg-white px-4 text-sm font-bold text-ink-700 transition-colors hover:bg-ink-50"
                          >
                            Ver detalhes
                          </button>
                          <button
                            type="button"
                            onClick={() => handleImport(contest)}
                            disabled={importingId === contest.id || limiteAtingido}
                            className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 text-sm font-bold text-white transition-colors hover:bg-brand-900 disabled:opacity-70"
                          >
                            {limiteAtingido
                              ? 'Limite atingido'
                              : importingId === contest.id
                                ? 'Importando...'
                                : hasMultipleRoles
                                  ? 'Escolher cargo'
                                  : 'Adicionar aos meus cursos'}
                            <ArrowRight size={16} />
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="surface-card overflow-hidden rounded-[22px]">
                <div className="hidden grid-cols-[2.1fr_1fr_1fr_1fr_1fr_1fr_1fr] gap-4 border-b border-ink-200 bg-ink-50 px-5 py-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-400 lg:grid">
                  <span>Concurso</span>
                  <span>Banca</span>
                  <span>Área</span>
                  <span>Salário</span>
                  <span>Inscrição</span>
                  <span>Prova</span>
                  <span>Ações</span>
                </div>

                <div className="divide-y divide-ink-100">
                  {contests.map((contest) => (
                    <div
                      key={contest.id}
                      className="grid gap-4 px-5 py-4 lg:grid-cols-[2.1fr_1fr_1fr_1fr_1fr_1fr_1fr] lg:items-center"
                    >
                      <button type="button" onClick={() => handleOpenContest(contest)} className="text-left">
                        <p className="text-base font-semibold text-ink-900">{contest.nome}</p>
                        <p className="mt-1 text-sm font-semibold text-ink-500">{contest.cargo || contest.concurso}</p>
                      </button>

                      <div className="text-sm font-semibold text-ink-600">{contest.banca || 'A definir'}</div>
                      <div className="flex flex-wrap gap-2">
                        <AreaBadge>{contest.area || 'Geral'}</AreaBadge>
                        <StatusBadge>{STATUS_LABELS[normalizeContestStatus(contest.status_concurso)] || 'Previsto'}</StatusBadge>
                      </div>
                      <div className="text-sm font-semibold text-emerald-700">{formatCurrencyBR(contest.salario)}</div>
                      <div className="text-sm font-semibold text-amber-700">{formatCurrencyBR(contest.inscricao_valor)}</div>
                      <div className="text-sm font-semibold text-brand-700">{formatDateBR(contest.prova_data)}</div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenContest(contest)}
                          className="rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm font-bold text-ink-600"
                        >
                          Ver detalhes
                        </button>
                        <button
                          type="button"
                          onClick={() => handleImport(contest)}
                          disabled={importingId === contest.id || limiteAtingido}
                          className="rounded-xl bg-[#1d4ed8] px-3 py-2 text-sm font-bold text-white disabled:opacity-70"
                        >
                          {importingId === contest.id ? '...' : 'Adicionar'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        ))}

        {groupedCatalog.length > 0 && displayedGroups.length === 0 && (
          <section className="rounded-[2rem] border border-dashed border-ink-200 bg-white p-10 text-center text-sm font-semibold text-ink-500">
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
      className="rounded-2xl border border-ink-200 bg-white px-4 py-3 text-sm font-semibold text-ink-700 outline-none transition-all focus:border-brand-500 focus:ring-4 focus:ring-brand-50"
    >
      {options.map((option) => {
        const optionValue = typeof option === 'string' ? option : option.value;
        const label =
          renderLabel?.(optionValue) || (typeof option === 'string' ? option : option.label || option.value);

        return (
          <option key={optionValue} value={optionValue}>
            {label}
          </option>
        );
      })}
    </select>
  );
}

function AreaBadge({ children }) {
  return (
    <span className="rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-700">
      {children}
    </span>
  );
}

function StatusBadge({ children }) {
  return (
    <span className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
      {children}
    </span>
  );
}

function InfoPill({ icon: Icon, label }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-xl border border-ink-200 bg-ink-50 px-3 py-2 text-xs font-bold text-ink-600">
      <Icon size={12} className="text-brand-600" />
      <span className="truncate">{label}</span>
    </div>
  );
}

function MetaCounter({ label, value }) {
  return (
    <div className="rounded-[14px] border border-ink-200 bg-ink-50 px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-400">{label}</p>
      <p className="mt-1 text-base font-semibold text-ink-900">{value}</p>
    </div>
  );
}

function QuickInfo({ label, value, tone = 'blue', wide = false }) {
  const toneClasses = {
    blue: 'text-brand-700',
    amber: 'text-amber-700',
    green: 'text-emerald-700',
  };

  return (
    <div className={`min-w-0 rounded-[14px] border border-ink-200 bg-ink-50/80 px-3 py-2 ${wide ? 'col-span-2' : ''}`}>
      <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-ink-400">{label}</p>
      <p className={`mt-1 break-words text-xs font-black leading-snug ${toneClasses[tone] || toneClasses.blue}`}>{value}</p>
    </div>
  );
}

function QuickTag({ children, tone = 'blue' }) {
  const toneClasses = {
    blue: 'border-brand-100 bg-brand-50 text-brand-700',
    amber: 'border-amber-100 bg-amber-50 text-amber-700',
    rose: 'border-rose-100 bg-rose-50 text-rose-700',
    green: 'border-emerald-100 bg-emerald-50 text-emerald-700',
  };

  return (
    <span className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${toneClasses[tone] || toneClasses.blue}`}>
      {children}
    </span>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-xl border border-ink-200 bg-white px-3 py-2">
      <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-ink-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-ink-900">{value}</p>
    </div>
  );
}

function RecommendationPanel({ title, items = [], emptyText, onOpen, formatDateBR }) {
  const isHorizontal = title === 'Provas mais próximas';
  const visibleItems = isHorizontal ? items.slice(0, 3) : items;

  return (
    <section className="surface-card-strong rounded-[24px] p-4">
      {!isHorizontal ? (
        <div className="mb-4">
          <h3 className="text-xl font-semibold text-ink-900">{title}</h3>
        </div>
      ) : null}

      {visibleItems.length === 0 ? (
        <div className="rounded-[1.4rem] border border-dashed border-ink-200 bg-ink-50/70 px-4 py-6 text-sm font-semibold text-ink-500">
          {emptyText}
        </div>
      ) : (
        <div className={isHorizontal ? 'grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3' : 'space-y-3'}>
          {visibleItems.map((item) => (
            <button
              key={`rec-${title}-${item.id}`}
              type="button"
              onClick={() => onOpen(item)}
              className={`w-full rounded-[1.4rem] border border-ink-200 bg-ink-50/70 text-left transition-all hover:-translate-y-0.5 hover:shadow-sm ${
                isHorizontal ? 'min-h-[120px] p-4' : 'min-h-[120px] p-4'
              }`}
            >
              <p className="line-clamp-2 text-sm font-semibold text-ink-900">{item.nome}</p>
              <p className="mt-1 text-xs font-semibold text-ink-500">{item.cargo || item.concurso}</p>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/45 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[2rem] border border-ink-200 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.18)]">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-ink-100 bg-white/95 px-6 py-4 backdrop-blur">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-400">
              Detalhes do concurso
            </p>
            <h3 className="mt-1 text-2xl font-semibold text-ink-900">{contest.nome}</h3>
          </div>
          <button onClick={onClose} className="rounded-xl border border-ink-200 bg-white p-2 text-ink-500">
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-6 p-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <div className="space-y-4">
            <div
              className="relative flex h-48 items-center justify-center overflow-hidden rounded-[1.6rem] border border-ink-200"
              style={{
                background: getContestAreaBackground(contest.area || 'Geral', contest.cor),
              }}
            >
              <div className="pointer-events-none absolute -left-10 -top-10 h-28 w-28 rounded-full bg-cyan-400/10" />
              <div className="pointer-events-none absolute -right-8 bottom-2 h-24 w-24 rounded-full bg-emerald-300/10" />
              {contest.imagem_url ? (
                <img
                  src={contest.imagem_url}
                  alt={contest.nome}
                  className="relative z-10 max-h-[74%] max-w-[62%] object-contain drop-shadow-[0_18px_24px_rgba(0,0,0,0.32)]"
                />
              ) : (
                <div
                  className="relative z-10 flex h-20 w-20 items-center justify-center rounded-3xl border border-white/15 bg-white/10 text-white shadow-xl backdrop-blur"
                >
                  <LibraryBig size={42} />
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <AreaBadge>{contest.area || 'Geral'}</AreaBadge>
              <StatusBadge>{STATUS_LABELS[normalizeContestStatus(contest.status_concurso)] || 'Previsto'}</StatusBadge>
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
            <p className="text-sm font-semibold text-ink-500">{contest.cargo || contest.concurso}</p>
            <p className="mt-1 text-sm font-medium text-ink-500">{contest.banca || 'Banca a definir'}</p>

            {contest.descricao && (
              <div className="mt-5 rounded-[1.4rem] border border-ink-200 bg-ink-50/70 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-400">Resumo</p>
                <p className="mt-3 text-sm font-medium leading-relaxed text-ink-600">{contest.descricao}</p>
              </div>
            )}

            {(contest.vagas || contest.lotacao || contest.etapas || contest.etapas_tags?.length > 0) && (
              <div className="mt-5 rounded-[1.4rem] border border-ink-200 bg-ink-50/70 p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-400">
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
                        className="rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700"
                      >
                        {STAGE_LABELS[tag] || tag}
                      </span>
                    ))}
                  </div>
                )}

                {contest.taf_itens?.length > 0 && (
                  <div className="mt-4 rounded-[1rem] border border-brand-100 bg-brand-50/70 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">Itens do TAF</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {contest.taf_itens.map((item) => (
                        <span
                          key={item}
                          className="rounded-full border border-white bg-white px-3 py-1 text-xs font-bold text-ink-700"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="mt-5 rounded-[1.4rem] border border-ink-200 bg-white p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-400">
                    Estrutura base
                  </p>
                  <h4 className="mt-1 text-lg font-semibold text-ink-900">Disciplinas do concurso</h4>
                </div>
                <span className="rounded-full border border-ink-200 bg-ink-50 px-3 py-1 text-xs font-bold text-ink-500">
                  {contest.disciplinas?.length || 0} disciplinas
                </span>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {(contest.disciplinas || []).map((disciplina) => (
                  <div key={disciplina.nome} className="rounded-[1.1rem] border border-ink-200 bg-ink-50/70 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-bold text-ink-900">{disciplina.nome}</p>
                        <p className="mt-1 text-xs font-semibold text-ink-500">
                          {disciplina.topicos?.length || 0} tópicos mapeados
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onToggleSubject(disciplina.nome)}
                        className="rounded-xl border border-ink-200 bg-white p-2 text-ink-600"
                      >
                        <Plus
                          size={14}
                          className={`transition-transform ${expandedSubjects[disciplina.nome] ? 'rotate-45' : ''}`}
                        />
                      </button>
                    </div>

                    {expandedSubjects[disciplina.nome] && (
                      <div className="mt-3 space-y-2 border-t border-ink-200 pt-3">
                        {(disciplina.topicos || []).length > 0 ? (
                          (disciplina.topicos || []).map((topico) => (
                            <div
                              key={topico.id || topico.nome}
                              className="rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm font-medium text-ink-600"
                            >
                              {topico.nome}
                            </div>
                          ))
                        ) : (
                          <div className="rounded-xl border border-dashed border-ink-200 bg-white px-3 py-2 text-sm font-medium text-ink-500">
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
                onClick={() => onImport(contest)}
                disabled={importingId === contest.id || limiteAtingido}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1d4ed8] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#1D4ED8] disabled:opacity-70"
              >
                {limiteAtingido
                  ? 'Limite atingido'
                  : importingId === contest.id
                    ? 'Importando...'
                    : 'Adicionar aos meus cursos'}
                <ArrowRight size={16} />
              </button>

              {contest.edital_url && (
                <button
                  onClick={() => window.open(contest.edital_url, '_blank', 'noopener,noreferrer')}
                  className="inline-flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-4 py-3 text-sm font-bold text-ink-600"
                >
                  Edital
                  <ExternalLink size={15} />
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
    <div className="rounded-[1rem] border border-ink-200 bg-white px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-400">{label}</p>
      <p className="mt-2 text-sm font-bold text-ink-900">{value}</p>
    </div>
  );
}
