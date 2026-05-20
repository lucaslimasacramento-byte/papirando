import React, { useMemo, useState } from 'react';
import {
  History,
  BookOpen,
  Filter,
  Search,
} from 'lucide-react';
import {
  buildCanonicalHistory,
  buildHistoryTimelineItem,
  formatMinutesLabel,
} from '../lib/studyAnalytics';
import PageHeadPremium, { PageHeadPremiumBadge } from '../components/PageHeadPremium';

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

  return (
    <div className="page-shell flex h-full min-h-0 flex-col !gap-3 !pb-4 !pt-4 animate-in fade-in duration-500 sm:!pt-5 lg:!gap-4">
      <PageHeadPremium
        icon={History}
        className="lg:!flex-row lg:!items-center lg:!justify-between"
        badge={<PageHeadPremiumBadge icon={History}>Diário de bordo</PageHeadPremiumBadge>}
        title="Histórico de estudos"
        subtitle="Linha do tempo dos seus registros. Aqui você consulta o que foi feito; a leitura analítica fica na aba Estatísticas."
        leadingClassName="items-center lg:max-w-[52rem]"
      />

      <div className="section-card flex shrink-0 flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:py-3">
        <div className="relative min-w-0 flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por matéria, tópico ou observação..."
            className="w-full rounded-xl border border-transparent bg-ink-50 py-2.5 pl-10 pr-3 text-sm font-semibold text-ink-700 outline-none transition-all hover:border-ink-200 focus:border-emerald-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <div className="inline-flex items-center gap-1.5 px-1 text-[10px] font-semibold uppercase tracking-widest text-ink-400">
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
                  : 'border border-transparent bg-ink-50 text-ink-500 hover:border-ink-200'
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="section-card flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden p-4 sm:p-5">
        <div className="mb-3 flex shrink-0 items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-ink-900">Linha do tempo</h3>
            <p className="mt-0.5 text-xs font-medium text-ink-500">
              Registros recentes consolidados por matéria.
            </p>
          </div>
          <div className="shrink-0 rounded-lg border border-ink-100 bg-ink-50 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-500">
            {filtered.length} de {totalSessions} registros
          </div>
        </div>

        <div className="custom-scrollbar min-h-0 flex-1 space-y-2.5 overflow-y-auto pr-1">
          {filtered.length === 0 ? (
            <div className="flex min-h-[160px] items-center justify-center rounded-2xl border-2 border-dashed border-ink-200 bg-ink-50 text-center text-ink-400">
              <div className="flex flex-col items-center gap-2 px-4">
                <BookOpen size={24} className="text-ink-300" />
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
                          <span className="text-[10px] font-bold uppercase tracking-widest text-ink-400">
                            {formatDate(item.date)}
                          </span>
                        </div>

                        <div className="min-w-0">
                          <h4 className="text-sm font-semibold leading-snug text-ink-800 sm:text-[0.95rem]">
                            {item.title}
                          </h4>
                          <p className="mt-1 line-clamp-2 text-xs font-medium leading-relaxed text-ink-500">
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

                    <div className="mt-3 flex flex-col gap-2 border-t border-ink-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="w-full max-w-[200px]">
                        <div className="mb-1 flex justify-between text-[9px] font-semibold uppercase tracking-widest text-ink-400">
                          <span>Performance</span>
                          <span className={styles.text}>{item.accuracy}%</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
                          <div className={`${styles.line} h-full rounded-full`} style={{ width: `${item.accuracy}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function MiniMetric({ label, value, highlight = false, compact = false }) {
  const pad = compact ? 'p-2' : 'p-3';
  return (
    <div
      className={`rounded-lg border text-center ${pad} ${highlight ? 'border-emerald-100 bg-emerald-50' : 'border-ink-100 bg-ink-50'}`}
    >
      <p className="mb-0.5 text-[9px] font-semibold uppercase tracking-wider text-ink-400">{label}</p>
      <p className={`text-sm font-semibold leading-none sm:text-base ${highlight ? 'text-emerald-600' : 'text-ink-700'}`}>
        {value}
      </p>
    </div>
  );
}
