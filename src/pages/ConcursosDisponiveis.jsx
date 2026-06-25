import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarDays,
  CheckCircle2,
  Compass,
  DollarSign,
  ExternalLink,
  Filter,
  GraduationCap,
  Layers3,
  LibraryBig,
  Loader2,
  Plus,
  Search,
  Users,
  X,
} from 'lucide-react';
import { buildContestForRole, CONTEST_STATUS_LABELS, CONTEST_STATUS_OPTIONS, getContestRoles, groupContestTemplates, normalizeContestStatus } from '../lib/contestGrouping';
import { getAreaToken } from '../lib/areaTokens';
import { storageThumb } from '../lib/imageUrl';

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

// Localidade (bucket) de um vestibular: UF quando estadual, senão "Nacional".
const localityOf = (t) => (t.scope === 'estadual' && t.uf ? String(t.uf).toUpperCase() : 'Nacional');
const MODALITY_LABEL = { presencial: 'Presencial', ead: 'EAD', hibrido: 'Híbrido', multiplo: 'Presencial e EAD' };
const INSTITUTION_TYPE_LABEL = { publica: 'Pública', privada: 'Privada', programa_governo: 'Programa do governo' };

export default function ConcursosDisponiveis({
  concursoCatalog = [],
  courseTemplates = [],
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
  const [tipoAtivo, setTipoAtivo] = useState('concurso');
  const [query, setQuery] = useState('');
  const [areasSelecionadas, setAreasSelecionadas] = useState([]);
  const [statusFiltro, setStatusFiltro] = useState('Todos');
  const [viewMode, setViewMode] = useState('vitrine');
  const [sortMode, setSortMode] = useState('relevancia');
  const [importingId, setImportingId] = useState('');
  const [importError, setImportError] = useState('');
  const [selectedContest, setSelectedContest] = useState(null);
  const [expandedSubjects, setExpandedSubjects] = useState({});
  const limiteAtingido = !isAdmin && remainingCourseSlots <= 0;
  // Catálogo publicado (contest_templates) agrupado e separado pelo tipo da aba ativa:
  // Concursos = tudo que não é vestibular · Vestibulares = tipo 'vestibular'.
  // (Graduação usa CourseTemplateView, fora deste fluxo.)
  const groupedCatalog = useMemo(() => {
    const all = groupContestTemplates(concursoCatalog);
    if (tipoAtivo === 'vestibular') return all.filter((t) => t.tipo === 'vestibular');
    if (tipoAtivo === 'enem') return all.filter((t) => t.tipo === 'enem');
    return all.filter((t) => (t.tipo || 'concurso') === 'concurso');
  }, [concursoCatalog, tipoAtivo]);

  const isVest = tipoAtivo === 'vestibular';
  // Chave de agrupamento/filtro: localidade (Nacional/UF) p/ vestibular, área p/ concurso.
  const groupKeyOf = (t) => (isVest ? localityOf(t) : (t.area || 'Geral'));

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

  const areas = useMemo(() => {
    const keys = Array.from(new Set(groupedCatalog.map(groupKeyOf)));
    // Vestibular: "Nacional" sempre primeiro, depois UFs em ordem alfabética.
    if (isVest) {
      keys.sort((a, b) => (a === 'Nacional' ? -1 : b === 'Nacional' ? 1 : a.localeCompare(b, 'pt-BR')));
    }
    return ['Todas', ...keys];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupedCatalog, isVest]);

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
        areasSelecionadas.includes(groupKeyOf(contest));
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
      const area = groupKeyOf(contest);
      if (!acc[area]) acc[area] = [];
      acc[area].push(contest);
      return acc;
    }, {});

    return Object.entries(groups).sort(([a], [b]) => {
      if (isVest) {
        if (a === 'Nacional') return -1;
        if (b === 'Nacional') return 1;
      }
      return a.localeCompare(b, 'pt-BR');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [concursosFiltrados, isVest]);

  const areaStats = useMemo(() => {
    return areas.map((area) => ({
      area,
      total:
        area === 'Todas'
          ? groupedCatalog.filter((item) => item.is_public !== false).length
          : groupedCatalog.filter((item) => groupKeyOf(item) === area && item.is_public !== false).length,
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
    () => new Set(groupedCatalog.map(groupKeyOf)).size,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [groupedCatalog, isVest]
  );
  const recommendationBuckets = useMemo(() => {
    const itens = tipoAtivo === 'vestibular' ? 'vestibulares' : 'concursos';
    return [
      {
        id: 'recomendado',
        title: 'Recomendado',
        emptyText: `Marque ${itens} como favoritos ou interessados para receber recomendações aqui.`,
        items: smartSections.recomendados.length > 0 ? smartSections.recomendados : smartSections.proximosDaProva,
      },
      {
        id: 'andamento',
        title: 'Já em andamento',
        emptyText: `Quando você adicionar ${itens}, eles passam a aparecer aqui.`,
        items: smartSections.jaEmAndamento,
      },
    ];
  }, [smartSections, tipoAtivo]);

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
    setImportError('');
    try {
      await onImportCatalogCourse?.(importTemplate);
      setActiveTab?.('planos');
    } catch (error) {
      setImportError(error?.message || 'Não foi possível adicionar esse concurso. Tente novamente.');
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

  const TIPOS = [
    { id: 'concurso',   label: 'Concursos',   icon: LibraryBig },
    { id: 'enem',       label: 'ENEM',         icon: Compass },
    { id: 'vestibular', label: 'Vestibulares', icon: GraduationCap },
    { id: 'faculdade',  label: 'Graduação',     icon: Building2 },
  ];

  return (
    <div className="pl-page">
        <ConcursosHeader publicados={totalPublicados} areas={totalAreas} tipo={tipoAtivo} />

        {importError && (
          <div style={{
            padding: '10px 14px',
            background: 'var(--pl-danger-soft)', color: 'var(--pl-danger)',
            border: '1px solid var(--pl-danger)', borderLeft: '3px solid var(--pl-danger)',
            borderRadius: 4, fontSize: 13, fontWeight: 600,
          }}>{importError}</div>
        )}

        {/* Seletor de tipo */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', borderBottom: '1px solid var(--pl-rule-2)', paddingBottom: 16 }}>
          {TIPOS.map(({ id, label, icon: Icon }) => {
            const active = tipoAtivo === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => { setTipoAtivo(id); setAreasSelecionadas([]); setQuery(''); }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '6px 16px', borderRadius: 20,
                  border: active ? '1px solid var(--pl-accent)' : '1px solid var(--pl-rule-2)',
                  background: active ? 'var(--pl-accent)' : 'var(--pl-surface)',
                  color: active ? 'var(--pl-bg)' : 'var(--pl-ink-2)',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all .12s',
                }}
              >
                <Icon size={13} />
                {label}
              </button>
            );
          })}
        </div>

        {/* Graduação — catálogo de cursos do admin (course_templates) */}
        {tipoAtivo === 'faculdade' && (
          <CourseTemplateView
            courseTemplates={courseTemplates}
            intentFilter={tipoAtivo}
            cursos={cursos}
            onCreateCourse={async (data) => {
              setImportError('');
              try {
                await onImportCatalogCourse?.(data);
                setActiveTab?.('planos');
              } catch (error) {
                setImportError(error?.message || 'Não foi possível adicionar esse curso. Tente novamente.');
              }
            }}
            limiteAtingido={limiteAtingido}
            isAdmin={isAdmin}
          />
        )}

        {/* Concursos, ENEM e Vestibulares — fluxo do catálogo publicado (contest_templates) */}
        {(tipoAtivo === 'concurso' || tipoAtivo === 'vestibular' || tipoAtivo === 'enem') && (
          <>
          <ConcursosFilters
          tipo={tipoAtivo}
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
                  ? 'Importações bloqueadas até você liberar uma vaga.'
                  : `Você ainda tem ${remainingCourseSlots} vaga(s) para adicionar ${tipoAtivo === 'vestibular' ? 'vestibulares' : 'concursos'}.`}
              </div>
            </div>
            <span className={`pl-tag ${limiteAtingido ? 'pl-tag-warn' : 'pl-tag-success'}`}>
              {limiteAtingido ? 'Limite atingido' : 'Disponível'}
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
          <section style={{ borderRadius: '2rem', border: '1px dashed var(--pl-rule-2)', background: 'var(--pl-surface)', padding: 40, textAlign: 'center', fontSize: 14, fontWeight: 600, color: 'var(--pl-ink-3)' }}>
            {tipoAtivo === 'vestibular'
              ? 'Nenhum vestibular publicado no momento. Publique vestibulares em Configurações → Catálogo.'
              : 'Nenhum concurso publicado no momento. Publique concursos em Configurações → Catálogo.'}
          </section>
        ) : null}

        {displayedGroups.map(([area, contests]) => {
          const areaToken = getAreaToken(area);
          return (
            <section key={area}>
              <AreaSectionHeader area={areaToken} count={contests.length} tipo={tipoAtivo} />
              {viewMode === 'vitrine' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(292px, 1fr))', gap: 14, marginTop: 14 }}>
                  {contests.map((contest) => {
                    const imported = cursos.some(
                      (curso) => curso.plano === contest.plano || curso.nome === contest.nome || curso.concurso === contest.concurso
                    );
                    return (
                      <ConcursoCard
                        key={contest.id}
                        concurso={contest}
                        area={areaToken}
                        tipo={tipoAtivo}
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
                  tipo={tipoAtivo}
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
          <section style={{ borderRadius: '2rem', border: '1px dashed var(--pl-rule-2)', background: 'var(--pl-surface)', padding: 40, textAlign: 'center', fontSize: 14, fontWeight: 600, color: 'var(--pl-ink-3)' }}>
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
          </>
        )}
    </div>
  );
}

// ─── Paleta de cores por área de graduação ────────────────────────────────────

const GRAD_AREA_PALETTE = {
  tecnologia:        { cover: '#0f2744', coverGlow: '#1a3d6b', chip: '#d6e4f7', chipInk: '#1a3d6b' },
  saude:             { cover: '#3d1a26', coverGlow: '#5c2b3a', chip: '#f0d8df', chipInk: '#5c2b3a' },
  negocios:          { cover: '#3d2206', coverGlow: '#6b3c0a', chip: '#f5e5cf', chipInk: '#6b3c0a' },
  engenharia:        { cover: '#0f302e', coverGlow: '#1a4f4b', chip: '#d6ecea', chipInk: '#1a4f4b' },
  'direito e sociais': { cover: '#1e1640', coverGlow: '#302560', chip: '#ddd8f5', chipInk: '#302560' },
  educacao:          { cover: '#1a2e14', coverGlow: '#2d4e22', chip: '#d8edcf', chipInk: '#2d4e22' },
  comunicacao:       { cover: '#2e1040', coverGlow: '#4a1a68', chip: '#e9d6f5', chipInk: '#4a1a68' },
  'artes e design':  { cover: '#40101a', coverGlow: '#6b1a2a', chip: '#f5d6db', chipInk: '#6b1a2a' },
  agrarias:          { cover: '#1e2e08', coverGlow: '#304c0e', chip: '#ddecc8', chipInk: '#304c0e' },
  'exatas e pesquisa': { cover: '#0a1f3a', coverGlow: '#133060', chip: '#cfddf5', chipInk: '#133060' },
  vestibular:        { cover: '#1a1230', coverGlow: '#2d1f52', chip: '#ddd5f5', chipInk: '#2d1f52' },
  nacional:          { cover: '#0d2a1a', coverGlow: '#174a2e', chip: '#d0eadb', chipInk: '#174a2e' },
  bahia:             { cover: '#3a1a00', coverGlow: '#6b3300', chip: '#fce8d0', chipInk: '#6b3300' },
};

function getGradAreaToken(area, intent) {
  const key = String(area || intent || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
  return GRAD_AREA_PALETTE[key] || GRAD_AREA_PALETTE[intent] || { cover: '#2a2420', coverGlow: '#3d3530', chip: 'var(--pl-bg-soft)', chipInk: 'var(--pl-ink-2)' };
}

// ─── CourseTemplateView — Vestibulares e Faculdade do catálogo admin ────────────

function CourseTemplateView({ courseTemplates = [], intentFilter, cursos, onCreateCourse, limiteAtingido, isAdmin }) {
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState('');
  const [areaAtiva, setAreaAtiva] = useState('Todas');

  const items = useMemo(
    () => (courseTemplates || []).filter((t) => t.intent === intentFilter),
    [courseTemplates, intentFilter]
  );

  // Todas as áreas existentes (para os chips — independe da busca)
  const allAreas = useMemo(() => {
    const seen = new Set();
    const out = [];
    items.forEach((t) => { if (t.area && !seen.has(t.area)) { seen.add(t.area); out.push(t.area); } });
    return out;
  }, [items]);

  // Itens filtrados por busca + área selecionada
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((t) => {
      const matchQuery = !q || t.nome.toLowerCase().includes(q) || (t.area || '').toLowerCase().includes(q);
      const matchArea = areaAtiva === 'Todas' || t.area === areaAtiva;
      return matchQuery && matchArea;
    });
  }, [items, query, areaAtiva]);

  // Áreas visíveis após filtro de busca
  const visibleAreas = useMemo(() => {
    const seen = new Set();
    const out = [];
    filtered.forEach((t) => { if (t.area && !seen.has(t.area)) { seen.add(t.area); out.push(t.area); } });
    return out;
  }, [filtered]);

  const jaAdicionados = useMemo(
    () => new Set((cursos || []).filter((c) => (c.intent || c.tipo) === intentFilter).map((c) => c.nome || c.plano)),
    [cursos, intentFilter]
  );

  const handleAdd = async (template) => {
    if (adding || limiteAtingido) return;
    setAdding(template.id);
    try {
      await onCreateCourse({
        nome: template.nome,
        plano: template.nome,
        area: template.area || 'Geral',
        tipo: intentFilter,
        intent: intentFilter,
        origem: 'catalogo',
        banca: '',
        imagem_url: template.imagem_url || '',
      });
    } finally {
      setAdding('');
    }
  };

  if (items.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '64px 24px' }}>
        <GraduationCap size={36} style={{ color: 'var(--pl-ink-4)', marginBottom: 14 }} />
        <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--pl-ink-2)', marginBottom: 8 }}>
          Nenhum {intentFilter === 'vestibular' ? 'vestibular' : 'curso de graduação'} cadastrado ainda.
        </p>
        <p style={{ fontSize: 13, color: 'var(--pl-ink-3)', maxWidth: 400, margin: '0 auto' }}>
          {isAdmin
            ? `Acesse Admin → Catálogo → aba ${intentFilter === 'vestibular' ? 'Vestibulares' : 'Graduação'} para adicionar.`
            : 'O administrador ainda não adicionou opções nessa categoria.'}
        </p>
      </div>
    );
  }

  const showClear = query || areaAtiva !== 'Todas';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* Barra de filtros — mesmo estilo pl-card do concurso */}
      <section className="pl-card" style={{ padding: 16, marginBottom: 28 }}>
        {/* Linha 1: busca + KPIs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 320px', height: 38, display: 'flex', alignItems: 'center', gap: 9, padding: '0 12px', borderRadius: 8, background: 'var(--pl-bg-soft)', border: '1px solid var(--pl-rule)' }}>
            <Search size={15} style={{ color: 'var(--pl-ink-3)', flexShrink: 0 }} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={intentFilter === 'vestibular' ? 'Buscar por vestibular ou área...' : 'Buscar por curso ou área...'}
              style={{ width: '100%', border: 0, outline: 0, background: 'transparent', fontSize: 13.5, fontWeight: 600, color: 'var(--pl-ink)' }}
            />
          </div>

          {/* KPI tiles inline */}
          <div className="pl-card" style={{ padding: '6px 14px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
            <div className="pl-eyebrow" style={{ fontSize: 9 }}>{intentFilter === 'vestibular' ? 'Vestibulares' : 'Graduações'}</div>
            <div className="pl-num" style={{ fontSize: 19, lineHeight: 1, color: 'var(--pl-ink)' }}>{items.length}</div>
          </div>
          <div className="pl-card" style={{ padding: '6px 14px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
            <div className="pl-eyebrow" style={{ fontSize: 9 }}>Áreas</div>
            <div className="pl-num" style={{ fontSize: 19, lineHeight: 1, color: 'var(--pl-ink)' }}>{allAreas.length}</div>
          </div>

          {showClear && (
            <button
              type="button"
              className="pl-btn"
              onClick={() => { setQuery(''); setAreaAtiva('Todas'); }}
            >
              <X size={13} /> Limpar
            </button>
          )}
        </div>

        {/* Linha 2: chips de área */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
          <span className="pl-eyebrow" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginRight: 2 }}>
            <Filter size={13} /> Áreas
          </span>

          {/* Chip "Todas" */}
          <button
            type="button"
            onClick={() => setAreaAtiva('Todas')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              height: 28, padding: '0 10px', borderRadius: 4,
              border: '1px solid var(--pl-rule-2)',
              background: areaAtiva === 'Todas' ? 'var(--pl-ink)' : 'transparent',
              color: areaAtiva === 'Todas' ? 'var(--pl-bg)' : 'var(--pl-ink-2)',
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}
          >
            Todas
            <span style={{ minWidth: 18, height: 18, padding: '0 5px', borderRadius: 9, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: areaAtiva === 'Todas' ? 'rgba(243,239,229,0.18)' : 'var(--pl-bg-soft)', fontSize: 10 }}>
              {items.length}
            </span>
          </button>

          {allAreas.map((area) => {
            const token = getGradAreaToken(area, intentFilter);
            const active = areaAtiva === area;
            const count = items.filter((t) => t.area === area).length;
            return (
              <button
                key={area}
                type="button"
                onClick={() => setAreaAtiva(active ? 'Todas' : area)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  height: 28, padding: '0 10px', borderRadius: 4,
                  border: '1px solid var(--pl-rule-2)',
                  background: active ? 'var(--pl-ink)' : 'transparent',
                  color: active ? 'var(--pl-bg)' : 'var(--pl-ink-2)',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  transition: 'background .1s, color .1s',
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: 2, background: active ? 'rgba(243,239,229,0.5)' : token.coverGlow, flexShrink: 0 }} />
                {area}
                <span style={{ minWidth: 18, height: 18, padding: '0 5px', borderRadius: 9, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: active ? 'rgba(243,239,229,0.18)' : 'var(--pl-bg-soft)', fontSize: 10 }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {limiteAtingido && (
        <div className="pl-card-paper" style={{ padding: '12px 16px', borderLeft: '3px solid var(--pl-warn)', marginBottom: 20 }}>
          <p style={{ fontSize: 13, color: 'var(--pl-warn)', fontWeight: 700, margin: 0 }}>
            Limite de objetivos atingido. Faça upgrade do plano para adicionar mais.
          </p>
        </div>
      )}

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 24px' }}>
          <p style={{ fontSize: 14, color: 'var(--pl-ink-3)' }}>
            Nenhum resultado{query ? <> para <strong>&quot;{query}&quot;</strong></> : ''}.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
          {visibleAreas.map((area) => {
            const areaToken = getGradAreaToken(area, intentFilter);
            const coursesInArea = filtered.filter((t) => t.area === area);
            return (
              <section key={area}>
                {/* Area header — mesmo estilo do concurso */}
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 16 }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: areaToken.coverGlow, flexShrink: 0 }} />
                    <div>
                      <div className="pl-eyebrow">Área</div>
                      <h2 style={{ margin: '4px 0 0', fontFamily: 'var(--pl-serif)', fontStyle: 'italic', fontWeight: 400, fontSize: 29, color: 'var(--pl-ink)', lineHeight: 1 }}>
                        {area}
                      </h2>
                    </div>
                  </div>
                  <span className="pl-tag">{coursesInArea.length} {intentFilter === 'vestibular' ? 'opções' : 'cursos'}</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
                  {coursesInArea.map((template) => {
                    const added = jaAdicionados.has(template.nome);
                    const loading = adding === template.id;
                    return (
                      <CourseCard
                        key={template.id}
                        template={template}
                        areaToken={areaToken}
                        intentFilter={intentFilter}
                        added={added}
                        loading={loading}
                        limiteAtingido={limiteAtingido}
                        onAdd={() => handleAdd(template)}
                      />
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CourseCard({ template, areaToken, intentFilter, added, loading, limiteAtingido, onAdd }) {
  return (
    <article
      className="pl-card"
      style={{
        padding: 0,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        opacity: added ? 0.72 : 1,
        transition: 'box-shadow .15s, transform .15s',
      }}
      onMouseEnter={(e) => { if (!added) { e.currentTarget.style.boxShadow = 'var(--pl-sh-mid)'; e.currentTarget.style.transform = 'translateY(-2px)'; } }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.transform = ''; }}
    >
      {/* Banner colorido */}
      <div style={{
        height: 110,
        position: 'relative',
        background: `linear-gradient(135deg, ${areaToken.cover} 0%, ${areaToken.coverGlow} 100%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
      }}>
        {/* Círculo decorativo */}
        <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: `radial-gradient(circle, ${areaToken.coverGlow} 0%, transparent 70%)`, opacity: 0.6 }} />

        {template.imagem_url ? (
          <img
            src={storageThumb(template.imagem_url, 160)}
            alt={template.nome}
            loading="lazy"
            decoding="async"
            style={{ position: 'relative', zIndex: 1, maxWidth: 72, maxHeight: 72, objectFit: 'contain', filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.30))' }}
          />
        ) : (
          <div style={{
            position: 'relative', zIndex: 1,
            width: 56, height: 56, borderRadius: 14,
            border: '1px solid rgba(243,239,229,0.18)',
            background: 'rgba(243,239,229,0.10)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(4px)',
            color: 'rgba(243,239,229,0.75)',
          }}>
            {intentFilter === 'vestibular'
              ? <GraduationCap size={26} />
              : <Building2 size={26} />}
          </div>
        )}

        {added && (
          <div style={{
            position: 'absolute', top: 8, right: 8,
            padding: '3px 7px', borderRadius: 4,
            background: 'rgba(243,239,229,0.15)',
            border: '1px solid rgba(243,239,229,0.22)',
            color: '#f3efe5',
            fontSize: 9, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase',
            backdropFilter: 'blur(4px)',
          }}>
            Adicionado
          </div>
        )}
      </div>

      {/* Corpo */}
      <div style={{ padding: '12px 14px 14px', display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
        {/* Area chip */}
        <span className="pl-tag" style={{ background: areaToken.chip, color: areaToken.chipInk, textTransform: 'uppercase', fontSize: 9, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block' }} title={template.area}>
          {template.area}
        </span>

        <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: 'var(--pl-ink)', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {template.nome}
        </p>

        <div style={{ marginTop: 'auto' }}>
          {added ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: 'var(--pl-success)' }}>
              <CheckCircle2 size={14} /> Já nos seus objetivos
            </div>
          ) : (
            <button
              type="button"
              className="pl-btn pl-btn-primary pl-btn-sm"
              disabled={loading || limiteAtingido}
              onClick={onAdd}
              style={{ width: '100%', justifyContent: 'center', fontSize: 12 }}
            >
              {loading
                ? <><Loader2 size={12} className="animate-spin" /> Adicionando…</>
                : <><Plus size={12} /> Adicionar</>}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function ConcursosHeader({ publicados, areas, tipo = 'concurso' }) {
  const isVest = tipo === 'vestibular';
  const isGrad = tipo === 'faculdade';
  return (
    <header style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 32, alignItems: 'end' }}>
      <div>
        <h1 className="pl-display" style={{ margin: 0, fontSize: 56, color: 'var(--pl-ink)' }}>
          Biblioteca<span style={{ color: 'var(--pl-accent)' }}>.</span>
        </h1>
        <p style={{ margin: '12px 0 0', fontSize: 15, fontWeight: 500, color: 'var(--pl-ink-2)', maxWidth: 720, lineHeight: 1.5 }}>
          {isVest ? (
            <>Procure por instituição, área ou data de prova. Adicione os vestibulares que valem a pena para o seu painel;
            o resto a gente <span className="pl-mark-text">papira</span> depois.</>
          ) : isGrad ? (
            <>Escolha o curso de graduação que você quer estudar e adicione ao seu painel
            para a gente <span className="pl-mark-text">papira</span>r junto.</>
          ) : (
            <>Procure por área, banca, cargo ou data de prova. Importe os concursos que valem a pena para o seu painel;
            o resto a gente <span className="pl-mark-text">papira</span> depois.</>
          )}
        </p>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <StatTile label="Publicados" value={publicados} />
        <StatTile label="Áreas" value={areas} />
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
  tipo = 'concurso',
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
            placeholder={tipo === 'vestibular' ? 'Buscar por vestibular, instituição ou área...' : 'Buscar por concurso, banca, cargo ou área...'}
            style={{ width: '100%', border: 0, outline: 0, background: 'transparent', fontSize: 13.5, fontWeight: 600, color: 'var(--pl-ink)' }}
          />
        </div>

        <Segmented value={viewMode} onChange={setViewMode} />
        <FilterSelect
          value={sortMode}
          onChange={setSortMode}
          options={['relevancia', 'prova', 'salario', 'inscricao', 'nome']}
          renderLabel={(value) => {
            if (value === 'relevancia') return 'Ordenar: relevância';
            if (value === 'prova') return 'Ordenar: prova';
            if (value === 'salario') return 'Ordenar: salário';
            if (value === 'inscricao') return 'Ordenar: inscrição';
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
          <Filter size={13} /> Áreas
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

function AreaSectionHeader({ area, count, tipo = 'concurso' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <span style={{ width: 10, height: 10, borderRadius: 2, background: area.cover, flexShrink: 0 }} />
        <div>
          <div className="pl-eyebrow">{tipo === 'vestibular' ? 'Localidade' : 'Área'}</div>
          <h2 style={{ margin: '4px 0 0', fontFamily: 'var(--pl-serif)', fontStyle: 'italic', fontWeight: 400, fontSize: 29, color: 'var(--pl-ink)' }}>
            {area.label}
          </h2>
        </div>
      </div>
      <span className="pl-tag">{count} {tipo === 'vestibular' ? 'vestibulares' : 'concursos'}</span>
    </div>
  );
}

function ConcursoCard({ concurso, area, imported, limiteAtingido, importing, formatDateBR, formatCurrencyBR, onOpen, onImport, tipo = 'concurso' }) {
  const isVest = tipo === 'vestibular';
  const cargos = getContestRoles(concurso);
  const hasMultipleRoles = !isVest && cargos.length > 1;
  const statusKey = normalizeContestStatus(concurso.status_concurso);
  const statusTone = STATUS_TONE_MAP[statusKey] || 'accent';
  const stats = [
    { label: 'Prova', value: formatDateBR(concurso.prova_data) },
    { label: hasMultipleRoles ? 'Salários' : 'Salário', value: formatCurrencyBR(concurso.salario), tone: 'success' },
    { label: hasMultipleRoles ? 'Inscrições' : 'Inscrição', value: formatCurrencyBR(concurso.inscricao_valor), tone: 'warn' },
    { label: 'Nível', value: concurso.escolaridade || 'A definir', tone: 'accent' },
    { label: hasMultipleRoles ? 'Vagas totais' : 'Vagas', value: concurso.vagas || 'A definir' },
    { label: hasMultipleRoles ? 'Cargos' : 'Disciplinas', value: hasMultipleRoles ? cargos.length : concurso.disciplinas?.length || 0 },
  ].filter((item) => item.value !== '' && item.value != null);

  return (
    <article className="pl-card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 330 }}>
      <div style={{ minHeight: 74, position: 'relative', background: `linear-gradient(135deg, ${area.cover} 0%, ${area.coverGlow} 100%)`, display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px' }}>
        <div style={{ position: 'absolute', top: -54, right: -42, width: 150, height: 150, borderRadius: '50%', background: `radial-gradient(circle, ${area.coverGlow} 0%, transparent 70%)`, opacity: 0.42 }} />
        {concurso.imagem_url ? (
          <img src={storageThumb(concurso.imagem_url, 120)} alt={concurso.nome} loading="lazy" decoding="async" style={{ position: 'relative', zIndex: 1, width: 50, height: 50, objectFit: 'contain', filter: 'drop-shadow(0 10px 16px rgba(0,0,0,0.32))', flexShrink: 0 }} />
        ) : (
          <div style={{ position: 'relative', zIndex: 1, width: 50, height: 50, borderRadius: 12, border: '1px solid rgba(243,239,229,0.18)', background: 'rgba(243,239,229,0.12)', color: '#f3efe5', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)', flexShrink: 0 }}>
            <LibraryBig size={26} />
          </div>
        )}
        <div style={{ position: 'relative', zIndex: 1, minWidth: 0, flex: 1 }}>
          <p style={{ margin: 0, fontSize: 10, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'rgba(243,239,229,0.62)' }}>
            {concurso.banca || (isVest ? 'Instituição a definir' : 'Banca a definir')}
          </p>
          <h3 style={{ margin: '4px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 16, lineHeight: 1.12, fontWeight: 800, color: '#f3efe5', letterSpacing: '-0.015em' }}>
            {concurso.nome}
          </h3>
        </div>
        {imported && (
          <div style={{ position: 'relative', zIndex: 1, padding: '4px 8px', borderRadius: 4, background: 'rgba(243,239,229,0.15)', border: '1px solid rgba(243,239,229,0.20)', color: '#f3efe5', fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', backdropFilter: 'blur(4px)', flexShrink: 0 }}>
            Importado
          </div>
        )}
      </div>

      <div style={{ padding: '10px 14px 12px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {!isVest && (
            <span className="pl-tag" style={{ background: area.chip, color: area.chipInk, textTransform: 'uppercase', fontSize: 10 }}>{area.label}</span>
          )}
          {isVest && (
            <span className="pl-tag pl-tag-accent" style={{ textTransform: 'uppercase', fontSize: 10 }}>{localityOf(concurso)}</span>
          )}
          {isVest && (concurso.institution_type || concurso.modality) && (
            <span className="pl-tag" style={{ textTransform: 'uppercase', fontSize: 10 }}>
              {[INSTITUTION_TYPE_LABEL[concurso.institution_type], MODALITY_LABEL[concurso.modality]].filter(Boolean).join(' · ')}
            </span>
          )}
          <span className={`pl-tag ${statusTone === 'neutral' ? '' : `pl-tag-${statusTone}`}`} style={{ textTransform: 'uppercase', fontSize: 10 }}>
            {STATUS_LABELS[statusKey] || 'Previsto'}
          </span>
        </div>

        <div>
          <p style={isVest
            ? { margin: 0, fontSize: 12, lineHeight: 1.42, color: 'var(--pl-ink-2)', fontWeight: 500 }
            : { margin: 0, minHeight: 32, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', fontSize: 12, lineHeight: 1.32, color: 'var(--pl-ink-2)', fontWeight: 600 }
          }>{isVest ? (concurso.descricao || `Vestibular · ${area.label}`) : (concurso.cargo || concurso.concurso)}</p>
        </div>

        {hasMultipleRoles && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, maxHeight: 25, overflow: 'hidden' }}>
            {cargos.slice(0, 2).map((cargo) => <span key={cargo.id} className="pl-tag">{cargo.nome}</span>)}
            {cargos.length > 2 && <span className="pl-tag">+{cargos.length - 2}</span>}
          </div>
        )}

        {isVest ? (
          concurso.prova_data ? (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, alignSelf: 'flex-start', padding: '5px 10px', borderRadius: 5, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-surface-2)', fontSize: 12, fontWeight: 700, color: 'var(--pl-ink-2)' }}>
              <CalendarDays size={13} /> Prova · {formatDateBR(concurso.prova_data)}
            </div>
          ) : null
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 6 }}>
            {stats.map((item) => <ContestStat key={item.label} {...item} />)}
          </div>
        )}

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
    <div style={{ padding: '7px 9px', border: '1px solid var(--pl-rule-2)', borderRadius: 5, background: 'var(--pl-surface-2)', minWidth: 0 }}>
      <div className="pl-eyebrow" style={{ fontSize: 8.5 }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 800, marginTop: 2, color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
    </div>
  );
}

function ListaConcursos({ contests, area, cursos, limiteAtingido, importingId, formatDateBR, formatCurrencyBR, onOpen, onImport, tipo = 'concurso' }) {
  const isVest = tipo === 'vestibular';
  const headers = isVest
    ? ['Vestibular', 'Instituição', 'Área', 'Requisito', 'Prova', 'Ações']
    : ['Concurso', 'Banca', 'Área', 'Salário', 'Prova', 'Ações'];
  return (
    <div className="pl-card" style={{ overflow: 'hidden', marginTop: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1.2fr', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--pl-rule)', background: 'var(--pl-surface-2)' }}>
        {headers.map((label) => <span key={label} className="pl-eyebrow" style={{ fontSize: 9.5 }}>{label}</span>)}
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
            {isVest
              ? <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--pl-ink-2)' }}>{contest.escolaridade || 'A definir'}</div>
              : <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--pl-success)' }}>{formatCurrencyBR(contest.salario)}</div>}
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
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, borderRadius: 12, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-bg-soft)', padding: '6px 12px' }}>
      <Icon size={12} style={{ color: 'var(--pl-ink-3)', flexShrink: 0 }} />
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--pl-ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
    </div>
  );
}

function QuickTag({ children, tone = 'blue' }) {
  const toneStyles = {
    blue: { border: '1px solid var(--pl-accent-soft)', background: 'var(--pl-accent-soft)', color: 'var(--pl-accent)' },
    amber: { border: '1px solid var(--pl-warn-soft)', background: 'var(--pl-warn-soft)', color: 'var(--pl-warn)' },
    rose: { border: '1px solid var(--pl-danger-soft)', background: 'var(--pl-danger-soft)', color: 'var(--pl-danger)' },
    green: { border: '1px solid var(--pl-success-soft)', background: 'var(--pl-success-soft)', color: 'var(--pl-success)' },
  };

  return (
    <span style={{ borderRadius: 999, padding: '4px 12px', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.16em', ...(toneStyles[tone] || toneStyles.blue) }}>
      {children}
    </span>
  );
}

function RecommendationPanel({ title, items = [], emptyText, onOpen, formatDateBR }) {
  const isHorizontal = title === 'Provas mais próximas';
  const visibleItems = isHorizontal ? items.slice(0, 3) : items;

  return (
    <section className="pl-card" style={{ padding: 16, borderRadius: 24 }}>
      {!isHorizontal && (
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 20, fontWeight: 600, color: 'var(--pl-ink)' }}>{title}</h3>
        </div>
      )}

      {visibleItems.length === 0 ? (
        <div style={{ borderRadius: 22, border: '1px dashed var(--pl-rule-strong)', background: 'var(--pl-bg-soft)', padding: '24px 16px', fontSize: 14, fontWeight: 600, color: 'var(--pl-ink-3)' }}>
          {emptyText}
        </div>
      ) : (
        <div style={{ display: isHorizontal ? 'grid' : 'flex', flexDirection: isHorizontal ? undefined : 'column', gridTemplateColumns: isHorizontal ? 'repeat(auto-fit, minmax(200px, 1fr))' : undefined, gap: 12 }}>
          {visibleItems.map((item) => (
            <button
              key={`rec-${title}-${item.id}`}
              type="button"
              onClick={() => onOpen(item)}
              style={{ width: '100%', borderRadius: 22, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-bg-soft)', textAlign: 'left', padding: 16, minHeight: 120, cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s' }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--pl-sh-low)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
            >
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--pl-ink)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.nome}</p>
              <p style={{ marginTop: 4, fontSize: 12, fontWeight: 600, color: 'var(--pl-ink-3)' }}>{item.cargo || item.concurso}</p>
              <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
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
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.45)', padding: 16 }}>
      <div style={{ maxHeight: '90vh', width: '100%', maxWidth: 896, overflowY: 'auto', borderRadius: 32, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-surface)', boxShadow: 'var(--pl-sh-high)' }}>

        {/* Header */}
        <div style={{ position: 'sticky', top: 0, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--pl-rule)', background: 'var(--pl-surface)', padding: '16px 24px', backdropFilter: 'blur(8px)' }}>
          <div>
            <p className="pl-eyebrow" style={{ marginBottom: 4 }}>Detalhes do concurso</p>
            <h3 style={{ fontSize: 22, fontWeight: 600, color: 'var(--pl-ink)' }}>{contest.nome}</h3>
          </div>
          <button onClick={onClose} style={{ borderRadius: 12, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-surface)', padding: 8, color: 'var(--pl-ink-3)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'grid', gap: 24, padding: 24, gridTemplateColumns: 'minmax(0, 280px) minmax(0, 1fr)' }}>

          {/* Left column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Banner */}
            <div
              style={{
                position: 'relative', display: 'flex', height: 192, alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden', borderRadius: 26, border: '1px solid var(--pl-rule-2)',
                background: `linear-gradient(135deg, ${areaToken.cover} 0%, ${areaToken.coverGlow} 100%)`,
              }}
            >
              <div style={{ pointerEvents: 'none', position: 'absolute', left: -40, top: -40, height: 112, width: 112, borderRadius: '50%', background: 'rgba(34,211,238,0.1)' }} />
              <div style={{ pointerEvents: 'none', position: 'absolute', right: -32, bottom: 8, height: 96, width: 96, borderRadius: '50%', background: 'rgba(52,211,153,0.1)' }} />
              {contest.imagem_url ? (
                <img src={storageThumb(contest.imagem_url, 256)} alt={contest.nome} loading="lazy" decoding="async" style={{ position: 'relative', zIndex: 1, maxHeight: '74%', maxWidth: '62%', objectFit: 'contain', filter: 'drop-shadow(0 18px 24px rgba(0,0,0,0.32))' }} />
              ) : (
                <div style={{ position: 'relative', zIndex: 1, display: 'flex', height: 80, width: 80, alignItems: 'center', justifyContent: 'center', borderRadius: 24, border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.1)', color: 'white', boxShadow: '0 8px 32px rgba(0,0,0,0.24)', backdropFilter: 'blur(8px)' }}>
                  <LibraryBig size={42} />
                </div>
              )}
            </div>

            {/* Badges */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <AreaBadge>{contest.area || 'Geral'}</AreaBadge>
              <StatusBadge>{STATUS_LABELS[normalizeContestStatus(contest.status_concurso)] || 'Previsto'}</StatusBadge>
            </div>

            {/* Info pills */}
            <div style={{ display: 'grid', gap: 8 }}>
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

          {/* Right column */}
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--pl-ink-2)' }}>{contest.cargo || contest.concurso}</p>
            <p style={{ marginTop: 4, fontSize: 14, fontWeight: 500, color: 'var(--pl-ink-3)' }}>{contest.banca || 'Banca a definir'}</p>

            {contest.descricao && (
              <div style={{ marginTop: 20, borderRadius: 22, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-bg-soft)', padding: 16 }}>
                <p className="pl-eyebrow" style={{ marginBottom: 12 }}>Resumo</p>
                <p style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.6, color: 'var(--pl-ink-2)' }}>{contest.descricao}</p>
              </div>
            )}

            {(contest.vagas || contest.lotacao || contest.etapas || contest.etapas_tags?.length > 0) && (
              <div style={{ marginTop: 20, borderRadius: 22, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-bg-soft)', padding: 16 }}>
                <p className="pl-eyebrow" style={{ marginBottom: 16 }}>Informações do concurso</p>
                <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(3, 1fr)' }}>
                  <DetailBox label="Vagas" value={contest.vagas || 'Não informado'} />
                  <DetailBox label="Lotação" value={contest.lotacao || 'Não informado'} />
                  <DetailBox label="Etapas" value={contest.etapas || 'Não informado'} />
                </div>

                {contest.etapas_tags?.length > 0 && (
                  <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {contest.etapas_tags.map((tag) => (
                      <span key={tag} style={{ borderRadius: 999, border: '1px solid var(--pl-accent-soft)', background: 'var(--pl-accent-soft)', padding: '4px 12px', fontSize: 12, fontWeight: 700, color: 'var(--pl-accent)' }}>
                        {STAGE_LABELS[tag] || tag}
                      </span>
                    ))}
                  </div>
                )}

                {contest.taf_itens?.length > 0 && (
                  <div style={{ marginTop: 16, borderRadius: 16, border: '1px solid var(--pl-accent-soft)', background: 'var(--pl-accent-soft)', padding: 16 }}>
                    <p className="pl-eyebrow" style={{ color: 'var(--pl-accent)', marginBottom: 12 }}>Itens do TAF</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {contest.taf_itens.map((item) => (
                        <span key={item} style={{ borderRadius: 999, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-surface)', padding: '4px 12px', fontSize: 12, fontWeight: 700, color: 'var(--pl-ink-2)' }}>
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Disciplinas */}
            <div style={{ marginTop: 20, borderRadius: 22, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-surface)', padding: 16 }}>
              <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <p className="pl-eyebrow" style={{ marginBottom: 4 }}>Estrutura base</p>
                  <h4 style={{ fontSize: 18, fontWeight: 600, color: 'var(--pl-ink)' }}>Disciplinas do concurso</h4>
                </div>
                <span style={{ borderRadius: 999, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-bg-soft)', padding: '4px 12px', fontSize: 12, fontWeight: 700, color: 'var(--pl-ink-3)' }}>
                  {contest.disciplinas?.length || 0} disciplinas
                </span>
              </div>

              <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                {(contest.disciplinas || []).map((disciplina) => (
                  <div key={disciplina.nome} style={{ borderRadius: 18, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-bg-soft)', padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                      <div>
                        <p style={{ fontWeight: 700, color: 'var(--pl-ink)' }}>{disciplina.nome}</p>
                        <p style={{ marginTop: 4, fontSize: 12, fontWeight: 600, color: 'var(--pl-ink-3)' }}>
                          {disciplina.topicos?.length || 0} tópicos mapeados
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onToggleSubject(disciplina.nome)}
                        style={{ borderRadius: 12, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-surface)', padding: 8, color: 'var(--pl-ink-2)', cursor: 'pointer' }}
                      >
                        <Plus size={14} style={{ transition: 'transform 0.2s', transform: expandedSubjects[disciplina.nome] ? 'rotate(45deg)' : 'rotate(0deg)' }} />
                      </button>
                    </div>

                    {expandedSubjects[disciplina.nome] && (
                      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid var(--pl-rule)', paddingTop: 12 }}>
                        {(disciplina.topicos || []).length > 0 ? (
                          (disciplina.topicos || []).map((topico) => (
                            <div key={topico.id || topico.nome} style={{ borderRadius: 12, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-surface)', padding: '8px 12px', fontSize: 14, fontWeight: 500, color: 'var(--pl-ink-2)' }}>
                              {topico.nome}
                            </div>
                          ))
                        ) : (
                          <div style={{ borderRadius: 12, border: '1px dashed var(--pl-rule-strong)', background: 'var(--pl-surface)', padding: '8px 12px', fontSize: 14, fontWeight: 500, color: 'var(--pl-ink-3)' }}>
                            Nenhum tópico detalhado ainda.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div style={{ marginTop: 24, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              <button
                onClick={() => onImport(contest)}
                disabled={importingId === contest.id || limiteAtingido}
                className="pl-btn pl-btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
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
                  className="pl-btn pl-btn-ghost"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
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
    <div style={{ borderRadius: 16, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-surface)', padding: '12px 16px' }}>
      <p className="pl-eyebrow" style={{ marginBottom: 8 }}>{label}</p>
      <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--pl-ink)' }}>{value}</p>
    </div>
  );
}
