import React, { useMemo, useState } from 'react';
import {
  History,
  TrendingUp,
  BookOpen,
  Clock3,
  Flame,
  Filter,
  CalendarDays,
  CheckCircle2,
  BrainCircuit,
  ChevronRight,
  Search,
  BarChart3,
} from 'lucide-react';
import {
  buildCanonicalHistory,
  buildDisciplineSummaryFromHistory,
  buildHistoryTimelineItem,
  formatMinutesLabel,
} from '../lib/studyAnalytics';
import {
  PageHeadPremiumShell,
  PageHeadPremiumIconTile,
  PageHeadPremiumBadge,
  PageHeadPremiumStatCompact,
  PAGE_HEAD_PREMIUM_ICON_GLYPH_CLASS,
} from '../components/PageHeadPremium';

const COLOR_STYLES = {
  blue: {
    soft: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    line: 'bg-blue-500',
  },
  orange: {
    soft: 'bg-orange-50',
    text: 'text-orange-700',
    border: 'border-orange-200',
    line: 'bg-orange-500',
  },
  emerald: {
    soft: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    line: 'bg-emerald-500',
  },
  indigo: {
    soft: 'bg-indigo-50',
    text: 'text-indigo-700',
    border: 'border-indigo-200',
    line: 'bg-indigo-500',
  },
};

function formatDate(dateStr) {
  if (!dateStr) return '--';
  const date = new Date(`${dateStr}T12:00:00`);
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function normalizeFilterValue(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export default function Historico({
  historicoReal = [],
  subjectCatalog = [],
  initialQuery = '',
  initialFilter = 'Todos',
}) {
  const [query, setQuery] = useState(initialQuery);
  const [filter, setFilter] = useState(initialFilter);

  const canonicalHistory = useMemo(
    () => buildCanonicalHistory(historicoReal, subjectCatalog),
    [historicoReal, subjectCatalog]
  );

  const timeline = useMemo(
    () => canonicalHistory.map((record, index) => buildHistoryTimelineItem(record, index)),
    [canonicalHistory]
  );

  const filtered = useMemo(() => {
    return timeline.filter((item) => {
      const q = query.toLowerCase();
      const matchesQuery =
        item.title.toLowerCase().includes(q) ||
        item.note.toLowerCase().includes(q) ||
        String(item.disciplina || '').toLowerCase().includes(q);
      const matchesFilter =
        filter === 'Todos' ||
        normalizeFilterValue(item.type) === normalizeFilterValue(filter);
      return matchesQuery && matchesFilter;
    });
  }, [filter, query, timeline]);

  const totalSessions = timeline.length;
  const totalMinutes = timeline.reduce((acc, item) => acc + item.duration, 0);
  const totalQuestions = timeline.reduce((acc, item) => acc + item.questions, 0);
  const averageAccuracy =
    totalQuestions > 0
      ? Math.round(
          canonicalHistory.reduce((acc, item) => acc + Number(item.acertos || 0), 0) /
            totalQuestions *
            100
        )
      : 0;

  const disciplineSummary = useMemo(
    () => buildDisciplineSummaryFromHistory(canonicalHistory).slice(0, 4),
    [canonicalHistory]
  );

  const bestDiscipline = disciplineSummary[0] || null;
  const weakestDiscipline =
    [...buildDisciplineSummaryFromHistory(canonicalHistory)]
      .filter((item) => item.questions > 0)
      .sort((first, second) => first.accuracy - second.accuracy)[0] || null;

  return (
    <div className="page-shell flex h-full min-h-0 flex-col !gap-3 !pb-4 !pt-4 animate-in fade-in duration-500 sm:!pt-5 lg:!gap-4">
      <PageHeadPremiumShell className="!block shrink-0">
        <div className="relative z-10 flex w-full min-w-0 flex-col gap-4 lg:flex-row lg:items-stretch">
          <div className="flex min-w-0 shrink-0 flex-1 items-center gap-3 sm:gap-3.5 lg:max-w-[min(100%,28rem)] xl:max-w-xl">
            <PageHeadPremiumIconTile>
              <History className={PAGE_HEAD_PREMIUM_ICON_GLYPH_CLASS} strokeWidth={2} aria-hidden />
            </PageHeadPremiumIconTile>
            <div className="min-w-0">
              <PageHeadPremiumBadge icon={History}>Inteligência de desempenho</PageHeadPremiumBadge>
              <h2 className="text-base font-semibold tracking-tight text-white sm:text-lg">Histórico de estudos</h2>
              <p className="mt-0.5 max-w-xl text-xs font-normal leading-snug text-slate-400 sm:mt-1 sm:max-w-2xl sm:text-[13px] sm:leading-relaxed">
                Agrupado por matéria canônica. A lista rola só no painel — a página não precisa rolar.
              </p>
              <div className="mt-3 max-w-xl">
                <div className="mb-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                  <span>Desempenho geral</span>
                  <span className="text-emerald-300">{averageAccuracy}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-emerald-400" style={{ width: `${averageAccuracy}%` }} />
                </div>
              </div>
            </div>
          </div>

          <div className="grid min-h-0 w-full min-w-0 flex-1 grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-2 [&>*]:min-w-0">
            <PageHeadPremiumStatCompact
              icon={BookOpen}
              label="Sessões"
              value={String(totalSessions)}
              accent="blue"
              valueLayout="hero"
            />
            <PageHeadPremiumStatCompact
              icon={Clock3}
              label="Tempo"
              value={formatMinutesLabel(totalMinutes)}
              accent="indigo"
              valueLayout="hero"
            />
            <PageHeadPremiumStatCompact
              icon={CheckCircle2}
              label="Questões"
              value={String(totalQuestions)}
              accent="emerald"
              valueLayout="hero"
            />
            <PageHeadPremiumStatCompact
              icon={TrendingUp}
              label="Precisão"
              value={`${averageAccuracy}%`}
              accent="orange"
              valueLayout="hero"
            />
          </div>
        </div>
      </PageHeadPremiumShell>

      <div className="section-card flex shrink-0 flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:py-3">
        <div className="relative min-w-0 flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por matéria, tópico ou observação..."
            className="w-full rounded-xl border border-transparent bg-slate-50 py-2.5 pl-10 pr-3 text-sm font-semibold text-slate-700 outline-none transition-all hover:border-slate-200 focus:border-emerald-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <div className="inline-flex items-center gap-1.5 px-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
            <Filter size={12} />
            Filtros
          </div>
          {['Todos', 'Estudo', 'Questões', 'Simulado', 'Revisão'].map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setFilter(item)}
              className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-all ${
                filter === item
                  ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border border-transparent bg-gray-50 text-gray-500 hover:border-gray-200'
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden xl:grid xl:grid-cols-[1.55fr_0.95fr] xl:grid-rows-1">
        <div className="section-card flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-4 sm:p-5 xl:min-h-0">
          <div className="mb-3 flex shrink-0 items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-slate-900">Linha do tempo</h3>
              <p className="mt-0.5 text-xs font-medium text-gray-500">
                Registros recentes consolidados por matéria.
              </p>
            </div>
            <div className="hidden shrink-0 items-center gap-1.5 rounded-lg border border-gray-100 bg-gray-50 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500 sm:flex">
              <CalendarDays size={12} />
              Registros
            </div>
          </div>

          <div className="custom-scrollbar min-h-0 flex-1 space-y-2.5 overflow-y-auto pr-1">
            {filtered.length === 0 ? (
              <div className="flex min-h-[160px] items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 text-center text-gray-400">
                <div className="flex flex-col items-center gap-2 px-4">
                  <BookOpen size={24} className="text-gray-300" />
                  <p className="text-sm font-bold">Nenhum registro ainda. Bora começar hoje.</p>
                </div>
              </div>
            ) : (
              filtered.map((item) => {
                const styles = COLOR_STYLES[item.color] || COLOR_STYLES.blue;
                return (
                  <div
                    key={item.id}
                    className={`relative overflow-hidden rounded-2xl border bg-white p-3.5 shadow-sm transition-all hover:shadow-md sm:p-4 ${styles.border}`}
                  >
                    <div className={`absolute bottom-0 left-0 top-0 w-1 rounded-r ${styles.line}`} />
                    <div className="pl-2.5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 space-y-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span
                              className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest ${styles.soft} ${styles.text} ${styles.border}`}
                            >
                              {item.type}
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                              {formatDate(item.date)}
                            </span>
                          </div>

                          <div className="min-w-0">
                            <h4 className="text-sm font-semibold leading-snug text-gray-800 sm:text-[0.95rem]">
                              {item.title}
                            </h4>
                            <p className="mt-1 line-clamp-2 text-xs font-medium leading-relaxed text-gray-500">
                              {item.note}
                            </p>
                          </div>
                        </div>

                        <div className="grid min-w-[220px] shrink-0 grid-cols-3 gap-2 sm:min-w-[240px]">
                          <MiniMetric label="Tempo" value={formatMinutesLabel(item.duration)} compact />
                          <MiniMetric label="Questões" value={String(item.questions)} compact />
                          <MiniMetric label="Acerto" value={`${item.accuracy}%`} highlight compact />
                        </div>
                      </div>

                      <div className="mt-3 flex flex-col gap-2 border-t border-gray-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="w-full max-w-[200px]">
                          <div className="mb-1 flex justify-between text-[9px] font-semibold uppercase tracking-widest text-gray-400">
                            <span>Performance</span>
                            <span className={styles.text}>{item.accuracy}%</span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                            <div className={`${styles.line} h-full rounded-full`} style={{ width: `${item.accuracy}%` }} />
                          </div>
                        </div>

                        <button
                          type="button"
                          className="flex items-center gap-1 text-xs font-semibold text-slate-900 transition-colors hover:text-emerald-600"
                        >
                          Ver detalhes
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="custom-scrollbar flex max-h-[min(42vh,22rem)] min-h-0 shrink-0 flex-col gap-3 overflow-y-auto overflow-x-hidden xl:max-h-none xl:h-full xl:min-h-0">
          <InsightCard
            icon={BrainCircuit}
            title="Leitura rápida da IA"
            accent="indigo"
            compact
            text={
              bestDiscipline
                ? `${bestDiscipline.name} aparece como seu bloco mais presente até agora.`
                : 'Ainda sem dados suficientes para leitura automática.'
            }
          />
          <InsightCard
            icon={Flame}
            title="Ritmo atual"
            accent="orange"
            compact
            text={
              totalSessions > 0
                ? `Você já acumulou ${totalSessions} sessão(ões) registradas no histórico canônico.`
                : 'Assim que você registrar os estudos, o ritmo aparece aqui.'
            }
          />
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-slate-50 shadow-md sm:p-5">
            <div className="mb-3 flex items-center gap-2">
              <BarChart3 size={16} className="text-blue-300" />
              <h4 className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Resumo por matéria</h4>
            </div>
            <div className="space-y-3">
              {disciplineSummary.length === 0 ? (
                <p className="text-xs font-semibold text-blue-100">Sem registros suficientes para montar o ranking.</p>
              ) : (
                disciplineSummary.map((item) => (
                  <ProgressRow
                    key={item.name}
                    label={item.name}
                    value={`${item.accuracy}%`}
                    width={`${item.accuracy}%`}
                  />
                ))
              )}
            </div>
            {weakestDiscipline && (
              <div className="mt-4 rounded-xl border border-white/10 bg-white/10 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Ponto de atenção</p>
                <p className="mt-1 text-sm font-semibold text-white">{weakestDiscipline.name}</p>
                <p className="mt-0.5 text-xs text-blue-100">Acurácia atual: {weakestDiscipline.accuracy}%</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniMetric({ label, value, highlight = false, compact = false }) {
  const pad = compact ? 'p-2' : 'p-3';
  return (
    <div
      className={`rounded-lg border text-center ${pad} ${highlight ? 'border-emerald-100 bg-emerald-50' : 'border-gray-100 bg-gray-50'}`}
    >
      <p className="mb-0.5 text-[9px] font-semibold uppercase tracking-wider text-gray-400">{label}</p>
      <p className={`text-sm font-semibold leading-none sm:text-base ${highlight ? 'text-emerald-600' : 'text-gray-700'}`}>
        {value}
      </p>
    </div>
  );
}

function InsightCard({ icon: Icon, title, text, accent, compact = false }) {
  const styles = {
    indigo: 'bg-indigo-50 border-indigo-100 text-indigo-700',
    orange: 'bg-orange-50 border-orange-100 text-orange-700',
  };

  const padding = compact ? 'p-4 rounded-2xl' : 'p-6 rounded-[2rem]';

  return (
    <div className={`border ${padding} ${styles[accent]}`}>
      <div className={`mb-2 flex items-center justify-center rounded-lg bg-white/70 ${compact ? 'h-9 w-9' : 'mb-4 h-11 w-11'}`}>
        <Icon size={compact ? 18 : 20} />
      </div>
      <h4 className={`font-semibold ${compact ? 'text-sm' : 'mb-2 text-base'}`}>{title}</h4>
      <p className={`font-semibold leading-snug opacity-90 ${compact ? 'text-xs' : 'text-sm'}`}>{text}</p>
    </div>
  );
}

function ProgressRow({ label, value, width }) {
  return (
    <div>
      <div className="flex justify-between text-xs font-bold mb-2">
        <span>{label}</span>
        <span className="text-blue-300">{value}</span>
      </div>
      <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full bg-blue-400 rounded-full" style={{ width }} />
      </div>
    </div>
  );
}
