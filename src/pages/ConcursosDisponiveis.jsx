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
import { buildContestForRole, CONTEST_STATUS_LABELS, CONTEST_STATUS_OPTIONS, getContestRoles, groupContestTemplates, normalizeContestStatus } from '../lib/contestGrouping';
import { getAreaToken } from '../lib/areaTokens';

const STATUS_LABELS = CONTEST_STATUS_LABELS;
const STATUS_FILTER_OPTIONS = ['Todos', ...CONTEST_STATUS_OPTIONS.map((option) => option.value)];
const STATUS_TONE_MAP = {
  edital_publicado: 'accent',
  homologado: 'success',
  previsto: 'highlight',
  encerrado: 'neutral',
  inscricoes_abertas: 'success',
  prova_marcada: 'accent',
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
  const recommendationBuckets = useMemo(() => [
    {
      id: 'recomendado',
      title: 'Recomendado',
      emptyText: 'Marque concursos como favoritos ou interessados para receber recomendacoes aqui.',
      items: smartSections.recomendados.length > 0 ? smartSections.recomendados : smartSections.proximosDaProva,
    },
    {
      id: 'andamento',
      title: 'Ja em andamento',
      emptyText: 'Quando voce importar concursos, eles passam a aparecer aqui.',
      items: smartSections.jaEmAndamento,
    },
  ], [smartSections]);

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
    <div className="pl-paper-bg-soft" style={{ flex: 1, overflow: 'auto', padding: '18px 20px 40px' }}>
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 24 }}>
        <ConcursosHeader publicados={totalPublicados} areas={totalAreas} />

        <ConcursosFilters
          query={query}
          setQuery={setQuery}
          viewMode={viewMode}
          setViewMode={setViewMode}
          sortMode={sortMode}
          setSortMode={setSortMode}
          statusFiltro={statusFiltro}
          setStatusFiltro={setStatusFiltro}
          areaStats={areaStats}
          areasSelecionadas={areasSelecionadas}
          toggleArea={toggleArea}
          onClear={() => {
            setQuery('');
            setStatusFiltro('Todos');
            setSortMode('relevancia');
            setAreasSelecionadas(['Todas']);
          }}
          showClear={Boolean(query || statusFiltro !== 'Todos' || (areasSelecionadas.length > 0 && !areasSelecionadas.includes('Todas')))}
        />

        {!isAdmin && (
          <div className="pl-card-paper" style={{ padding: '12px 14px', display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--pl-ink)' }}>
                {currentCourseCount} de {currentCourseLimit} cursos ocupados
              </div>
              <div style={{ marginTop: 2, fontSize: 12, fontWeight: 600, color: 'var(--pl-ink-3)' }}>
                {limiteAtingido
                  ? 'Importacoes bloqueadas ate voce liberar uma vaga.'
                  : `Voce ainda tem ${remainingCourseSlots} vaga(s) para importar concursos.`}
              </div>
            </div>
            <span className={`pl-tag ${limiteAtingido ? 'pl-tag-warn' : 'pl-tag-success'}`}>
              {limiteAtingido ? 'Limite atingido' : 'Disponivel'}
            </span>
          </div>
        )}

        <section>
          <div style={{ marginBottom: 12 }}>
            <div className="pl-eyebrow">Insights</div>
            <h2 style={{ margin: '5px 0 0', fontFamily: 'var(--pl-serif)', fontStyle: 'italic', fontWeight: 400, fontSize: 30, color: 'var(--pl-ink)' }}>
              Onde vale olhar primeiro
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14 }}>
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
        </section>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
        {groupedCatalog.length === 0 ? (
          <section className="rounded-[2rem] border border-dashed border-gray-200 bg-white p-10 text-center text-sm font-semibold text-gray-500">
            Nenhum concurso disponível no momento. Aguarde a equipe adicionar novos editais.
          </section>
        ) : null}

        {displayedGroups.map(([area, contests]) => {
          const areaToken = getAreaToken(area);
          return (
            <section key={area}>
              <AreaSectionHeader area={areaToken} count={contests.length} />
              {viewMode === 'vitrine' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16, marginTop: 14 }}>
                  {contests.map((contest) => {
                    const imported = cursos.some(
                      (curso) => curso.plano === contest.plano || curso.nome === contest.nome || curso.concurso === contest.concurso
                    );
                    return (
                      <ConcursoCard
                        key={contest.id}
                        concurso={contest}
                        area={areaToken}
                        imported={imported}
                        limiteAtingido={limiteAtingido}
                        importing={importingId === contest.id}
                        formatDateBR={formatDateBR}
                        formatCurrencyBR={formatCurrencyBR}
                        onOpen={() => handleOpenContest(contest)}
                        onImport={() => handleImport(contest)}
                      />
                    );
                  })}
                </div>
              ) : (
                <ListaConcursos
                  contests={contests}
                  area={areaToken}
                  cursos={cursos}
                  limiteAtingido={limiteAtingido}
                  importingId={importingId}
                  formatDateBR={formatDateBR}
                  formatCurrencyBR={formatCurrencyBR}
                  onOpen={handleOpenContest}
                  onImport={handleImport}
                />
              )}
            </section>
          );
        })}

        {groupedCatalog.length > 0 && displayedGroups.length === 0 && (
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
    </div>
  );
}

function ConcursosHeader({ publicados, areas }) {
  return (
    <header style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 32, alignItems: 'end' }}>
      <div>
        <div className="pl-eyebrow">Biblioteca</div>
        <h1 className="pl-display" style={{ margin: '10px 0 0', fontSize: 56, color: 'var(--pl-ink)' }}>
          Concursos disponiveis<span style={{ color: 'var(--pl-accent)' }}>.</span>
        </h1>
        <p style={{ margin: '12px 0 0', fontSize: 15, fontWeight: 500, color: 'var(--pl-ink-2)', maxWidth: 720, lineHeight: 1.5 }}>
          Procure por area, banca, cargo ou data de prova. Importe os que valem a pena pro seu painel;
          o resto a gente <span className="pl-mark-text">papira</span> depois.
        </p>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <StatTile label="Publicados" value={publicados} />
        <StatTile label="Areas" value={areas} />
      </div>
    </header>
  );
}

function StatTile({ label, value }) {
  return (
    <div className="pl-card" style={{ minWidth: 118, padding: '12px 14px' }}>
      <div className="pl-eyebrow" style={{ fontSize: 10 }}>{label}</div>
      <div className="pl-num" style={{ marginTop: 4, fontSize: 28, lineHeight: 1, color: 'var(--pl-ink)' }}>{value}</div>
    </div>
  );
}

function ConcursosFilters({
  query,
  setQuery,
  viewMode,
  setViewMode,
  sortMode,
  setSortMode,
  statusFiltro,
  setStatusFiltro,
  areaStats,
  areasSelecionadas,
  toggleArea,
  onClear,
  showClear,
}) {
  const isAreaActive = (area) =>
    (area === 'Todas' && (areasSelecionadas.includes('Todas') || areasSelecionadas.length === 0)) ||
    areasSelecionadas.includes(area);

  return (
    <section className="pl-card" style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 360px', height: 38, display: 'flex', alignItems: 'center', gap: 9, padding: '0 12px', borderRadius: 8, background: 'var(--pl-bg-soft)', border: '1px solid var(--pl-rule)' }}>
          <Search size={15} style={{ color: 'var(--pl-ink-3)' }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por concurso, banca, cargo ou area..."
            style={{ width: '100%', border: 0, outline: 0, background: 'transparent', fontSize: 13.5, fontWeight: 600, color: 'var(--pl-ink)' }}
          />
        </div>

        <Segmented value={viewMode} onChange={setViewMode} />
        <FilterSelect
          value={sortMode}
          onChange={setSortMode}
          options={['relevancia', 'prova', 'salario', 'inscricao', 'nome']}
          renderLabel={(value) => {
            if (value === 'relevancia') return 'Ordenar: relevancia';
            if (value === 'prova') return 'Ordenar: prova';
            if (value === 'salario') return 'Ordenar: salario';
            if (value === 'inscricao') return 'Ordenar: inscricao';
            return 'Ordenar: nome';
          }}
        />
        <FilterSelect
          value={statusFiltro}
          onChange={setStatusFiltro}
          options={STATUS_FILTER_OPTIONS}
          renderLabel={(value) => (value === 'Todos' ? 'Todos os status' : STATUS_LABELS[value] || value)}
        />
        {showClear && (
          <button type="button" className="pl-btn" onClick={onClear}>
            <X size={13} /> Limpar
          </button>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
        <span className="pl-eyebrow" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginRight: 2 }}>
          <Filter size={13} /> Areas
        </span>
        {areaStats.map((item) => {
          const token = item.area === 'Todas' ? null : getAreaToken(item.area);
          const active = isAreaActive(item.area);
          return (
            <AreaFilterChip
              key={item.area}
              label={item.area}
              count={item.total}
              color={token?.cover}
              active={active}
              onClick={() => toggleArea(item.area)}
            />
          );
        })}
      </div>
    </section>
  );
}

function Segmented({ value, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', height: 38, padding: 3, borderRadius: 8, border: '1px solid var(--pl-rule-strong)', background: 'var(--pl-bg-soft)' }}>
      {['vitrine', 'lista'].map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onChange(item)}
          style={{
            height: 30,
            padding: '0 12px',
            border: 0,
            borderRadius: 6,
            background: value === item ? 'var(--pl-surface)' : 'transparent',
            color: value === item ? 'var(--pl-ink)' : 'var(--pl-ink-3)',
            boxShadow: value === item ? 'var(--pl-sh-low)' : 'none',
            fontSize: 12.5,
            fontWeight: 800,
            cursor: 'pointer',
            textTransform: 'capitalize',
          }}
        >
          {item}
        </button>
      ))}
    </div>
  );
}

function AreaFilterChip({ label, count, color, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        height: 28,
        padding: '0 10px',
        borderRadius: 4,
        border: '1px solid var(--pl-rule-2)',
        background: active ? 'var(--pl-ink)' : 'transparent',
        color: active ? 'var(--pl-bg)' : 'var(--pl-ink-2)',
        fontSize: 12,
        fontWeight: 700,
        cursor: 'pointer',
      }}
    >
      {color && <span style={{ width: 8, height: 8, borderRadius: 2, background: color }} />}
      {label}
      <span style={{ minWidth: 18, height: 18, padding: '0 5px', borderRadius: 9, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: active ? 'rgba(243,239,229,0.18)' : 'var(--pl-bg-soft)', fontSize: 10 }}>
        {count}
      </span>
    </button>
  );
}

function AreaSectionHeader({ area, count }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <span style={{ width: 10, height: 10, borderRadius: 2, background: area.cover, flexShrink: 0 }} />
        <div>
          <div className="pl-eyebrow">Area</div>
          <h2 style={{ margin: '4px 0 0', fontFamily: 'var(--pl-serif)', fontStyle: 'italic', fontWeight: 400, fontSize: 29, color: 'var(--pl-ink)' }}>
            {area.label}
          </h2>
        </div>
      </div>
      <span className="pl-tag">{count} concursos</span>
    </div>
  );
}

function ConcursoCard({ concurso, area, imported, limiteAtingido, importing, formatDateBR, formatCurrencyBR, onOpen, onImport }) {
  const cargos = getContestRoles(concurso);
  const hasMultipleRoles = cargos.length > 1;
  const allSubjects = cargos.flatMap((cargo) => cargo.disciplinas || []);
  const topicosCount = allSubjects.reduce((acc, subject) => acc + (subject.topicos?.length || 0), 0);
  const statusKey = normalizeContestStatus(concurso.status_concurso);
  const statusTone = STATUS_TONE_MAP[statusKey] || 'accent';
  const stats = [
    { label: 'Prova', value: formatDateBR(concurso.prova_data) },
    { label: hasMultipleRoles ? 'Salarios' : 'Salario', value: formatCurrencyBR(concurso.salario), tone: 'success' },
    { label: hasMultipleRoles ? 'Inscricoes' : 'Inscricao', value: formatCurrencyBR(concurso.inscricao_valor), tone: 'warn' },
    { label: 'Nivel', value: concurso.escolaridade || 'A definir', tone: 'accent' },
    { label: hasMultipleRoles ? 'Vagas totais' : 'Vagas', value: concurso.vagas || 'A definir' },
    { label: hasMultipleRoles ? 'Cargos' : 'Disciplinas', value: hasMultipleRoles ? cargos.length : concurso.disciplinas?.length || 0 },
    { label: hasMultipleRoles ? 'Topicos gerais' : 'Topicos', value: topicosCount },
  ].filter((item) => item.value !== '' && item.value != null);

  return (
    <article className="pl-card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: 168, position: 'relative', background: `linear-gradient(135deg, ${area.cover} 0%, ${area.coverGlow} 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: '50%', background: `radial-gradient(circle, ${area.coverGlow} 0%, transparent 70%)`, opacity: 0.5 }} />
        {concurso.imagem_url ? (
          <img src={concurso.imagem_url} alt={concurso.nome} style={{ position: 'relative', zIndex: 1, maxWidth: 98, maxHeight: 98, objectFit: 'contain', filter: 'drop-shadow(0 18px 24px rgba(0,0,0,0.32))' }} />
        ) : (
          <div style={{ position: 'relative', zIndex: 1, width: 88, height: 88, borderRadius: 18, border: '1px solid rgba(243,239,229,0.18)', background: 'rgba(243,239,229,0.12)', color: '#f3efe5', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
            <LibraryBig size={48} />
          </div>
        )}
        {imported && (
          <div style={{ position: 'absolute', top: 12, right: 12, padding: '4px 8px', borderRadius: 4, background: 'rgba(243,239,229,0.15)', border: '1px solid rgba(243,239,229,0.20)', color: '#f3efe5', fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', backdropFilter: 'blur(4px)' }}>
            Importado
          </div>
        )}
      </div>

      <div style={{ padding: '16px 20px 20px', display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <span className="pl-tag" style={{ background: area.chip, color: area.chipInk, textTransform: 'uppercase', fontSize: 10 }}>{area.label}</span>
          <span className={`pl-tag ${statusTone === 'neutral' ? '' : `pl-tag-${statusTone}`}`} style={{ textTransform: 'uppercase', fontSize: 10 }}>
            {STATUS_LABELS[statusKey] || 'Previsto'}
          </span>
        </div>

        <div>
          <h3 style={{ margin: 0, fontSize: 20, lineHeight: 1.2, fontWeight: 800, color: 'var(--pl-ink)', letterSpacing: '-0.015em' }}>{concurso.nome}</h3>
          <p style={{ margin: '6px 0 0', fontSize: 13, lineHeight: 1.35, color: 'var(--pl-ink-2)', fontWeight: 600 }}>{concurso.cargo || concurso.concurso}</p>
        </div>

        {hasMultipleRoles && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {cargos.slice(0, 3).map((cargo) => <span key={cargo.id} className="pl-tag">{cargo.nome}</span>)}
            {cargos.length > 3 && <span className="pl-tag">+{cargos.length - 3}</span>}
          </div>
        )}

        <div style={{ fontSize: 12.5, color: 'var(--pl-ink-3)', fontWeight: 700 }}>{concurso.banca || 'Banca a definir'}</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {stats.map((item) => <ContestStat key={item.label} {...item} />)}
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
          <button className="pl-btn pl-btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={onOpen}>Ver detalhes</button>
          <button className="pl-btn pl-btn-primary pl-btn-sm" style={{ flex: 1, justifyContent: 'center' }} disabled={importing || limiteAtingido} onClick={onImport}>
            {limiteAtingido ? 'Limite atingido' : importing ? 'Importando...' : hasMultipleRoles ? 'Escolher cargo' : imported ? 'Abrir curso' : 'Adicionar'}
            <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </article>
  );
}

function ContestStat({ label, value, tone }) {
  const color =
    tone === 'success' ? 'var(--pl-success)' :
      tone === 'warn' ? 'var(--pl-warn)' :
        tone === 'accent' ? 'var(--pl-accent-2)' :
          'var(--pl-ink)';
  return (
    <div style={{ padding: '8px 10px', border: '1px solid var(--pl-rule-2)', borderRadius: 4, background: 'var(--pl-surface-2)', minWidth: 0 }}>
      <div className="pl-eyebrow" style={{ fontSize: 9 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 800, marginTop: 3, color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
    </div>
  );
}

function ListaConcursos({ contests, area, cursos, limiteAtingido, importingId, formatDateBR, formatCurrencyBR, onOpen, onImport }) {
  return (
    <div className="pl-card" style={{ overflow: 'hidden', marginTop: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1.2fr', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--pl-rule)', background: 'var(--pl-surface-2)' }}>
        {['Concurso', 'Banca', 'Area', 'Salario', 'Prova', 'Acoes'].map((label) => <span key={label} className="pl-eyebrow" style={{ fontSize: 9.5 }}>{label}</span>)}
      </div>
      {contests.map((contest) => {
        const imported = cursos.some((curso) => curso.plano === contest.plano || curso.nome === contest.nome || curso.concurso === contest.concurso);
        return (
          <div key={contest.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1.2fr', gap: 12, alignItems: 'center', padding: '13px 16px', borderBottom: '1px solid var(--pl-rule)' }}>
            <button type="button" onClick={() => onOpen(contest)} style={{ border: 0, background: 'transparent', textAlign: 'left', padding: 0, cursor: 'pointer' }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--pl-ink)' }}>{contest.nome}</div>
              <div style={{ marginTop: 3, fontSize: 12, color: 'var(--pl-ink-3)', fontWeight: 600 }}>{contest.cargo || contest.concurso}</div>
            </button>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--pl-ink-2)' }}>{contest.banca || 'A definir'}</div>
            <span className="pl-tag" style={{ width: 'fit-content', background: area.chip, color: area.chipInk }}>{area.label}</span>
            <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--pl-success)' }}>{formatCurrencyBR(contest.salario)}</div>
            <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--pl-ink-2)' }}>{formatDateBR(contest.prova_data)}</div>
            <div style={{ display: 'flex', gap: 7 }}>
              <button className="pl-btn pl-btn-sm" onClick={() => onOpen(contest)}>Detalhes</button>
              <button className="pl-btn pl-btn-primary pl-btn-sm" disabled={importingId === contest.id || limiteAtingido} onClick={() => onImport(contest)}>
                {importingId === contest.id ? '...' : imported ? 'Abrir' : 'Adicionar'}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FilterSelect({ value, onChange, options, renderLabel }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        height: 38,
        border: '1px solid var(--pl-rule-strong)',
        borderRadius: 8,
        background: 'var(--pl-surface)',
        color: 'var(--pl-ink)',
        padding: '0 12px',
        fontSize: 13,
        fontWeight: 700,
        outline: 'none',
      }}
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
  const token = getAreaToken(children);
  return (
    <span className="pl-tag" style={{ background: token.chip, color: token.chipInk, textTransform: 'uppercase', fontSize: 10 }}>
      {children}
    </span>
  );
}

function StatusBadge({ children }) {
  return (
    <span className="pl-tag pl-tag-success" style={{ textTransform: 'uppercase', fontSize: 10 }}>
      {children}
    </span>
  );
}

function InfoPill({ icon: Icon, label }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-bold text-gray-600">
      <Icon size={12} style={{ color: 'var(--pl-ink-2)' }} />
      <span className="truncate">{label}</span>
    </div>
  );
}

function MetaCounter({ label, value }) {
  return (
    <div className="rounded-[14px] border border-gray-200 bg-slate-50 px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">{label}</p>
      <p className="mt-1 text-base font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function QuickInfo({ label, value, tone = 'blue', wide = false }) {
  const toneClasses = {
    blue: 'text-blue-700',
    amber: 'text-amber-700',
    green: 'text-emerald-700',
  };

  return (
    <div className={`min-w-0 rounded-[14px] border border-slate-200 bg-slate-50/80 px-3 py-2 ${wide ? 'col-span-2' : ''}`}>
      <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className={`mt-1 break-words text-xs font-black leading-snug ${toneClasses[tone] || toneClasses.blue}`}>{value}</p>
    </div>
  );
}

function QuickTag({ children, tone = 'blue' }) {
  const toneClasses = {
    blue: 'border-blue-100 bg-blue-50 text-blue-700',
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
    <div className="rounded-xl border border-gray-200 bg-white px-3 py-2">
      <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-gray-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
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
  const areaToken = getAreaToken(contest.area || 'Geral');
  const topicosCount = (contest.disciplinas || []).reduce(
    (acc, subject) => acc + (subject.topicos?.length || 0),
    0
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[2rem] border border-gray-200 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.18)]">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white/95 px-6 py-4 backdrop-blur">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">
              Detalhes do concurso
            </p>
            <h3 className="mt-1 text-2xl font-semibold text-slate-900">{contest.nome}</h3>
          </div>
          <button onClick={onClose} className="rounded-xl border border-gray-200 bg-white p-2 text-gray-500">
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-6 p-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <div className="space-y-4">
            <div
              className="relative flex h-48 items-center justify-center overflow-hidden rounded-[1.6rem] border border-gray-200"
              style={{
                background: `linear-gradient(135deg, ${areaToken.cover} 0%, ${areaToken.coverGlow} 100%)`,
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
                onClick={() => onImport(contest)}
                disabled={importingId === contest.id || limiteAtingido}
                className="pl-btn pl-btn-primary"
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
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-600"
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
    <div className="rounded-[1rem] border border-gray-200 bg-white px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">{label}</p>
      <p className="mt-2 text-sm font-bold text-slate-900">{value}</p>
    </div>
  );
}
