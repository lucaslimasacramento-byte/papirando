import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Award,
  BarChart2,
  ChevronRight,
  ClipboardList,
  Clock,
  FileText,
  History,
  ListChecks,
  PieChart,
  PlusSquare,
  Search,
  Settings,
  Target,
  TrendingUp,
  Trophy,
} from 'lucide-react';
import SimuladosRankingPanel from '../components/SimuladosRankingPanel';
import {
  buildCanonicalHistory,
  buildDisciplineSummaryFromHistory,
  formatMinutesLabel,
  parseStudyTimeToMinutes,
} from '../lib/studyAnalytics';
import PageHeadPremium, { PageHeadPremiumBadge } from '../components/PageHeadPremium';

export default function Simulados({
  openSimuladoReviewModal,
  openHistoricoWithFilter,
  setIsCadernoModalOpen,
  historicoReal = [],
  subjectCatalog = [],
  simulados = [],
  simuladoStats = { total: 0, mediaDesempenho: 0, melhorNota: 0 },
  profile = {},
  currentUserId = '',
  redacaoSummary = {},
  communityMetrics = {},
}) {
  const [historyQuery, setHistoryQuery] = useState('');
  const [rankingOpen, setRankingOpen] = useState(false);

  const realStats = {
    total: Number(simuladoStats?.total || 0),
    mediaDesempenho: Number(simuladoStats?.mediaDesempenho || 0),
    melhorDesempenho: Number(simuladoStats?.melhorDesempenho || simuladoStats?.melhorNota || 0),
  };

  const canonicalHistory = useMemo(
    () => buildCanonicalHistory(historicoReal, subjectCatalog),
    [historicoReal, subjectCatalog]
  );
  const simuladoHistory = useMemo(
    () => canonicalHistory.filter((item) => String(item?.tipo || '').toUpperCase() === 'SIMULADO'),
    [canonicalHistory]
  );

  const groupedSimulados = useMemo(() => {
    if (Array.isArray(simulados) && simulados.length > 0) {
      return simulados
        .map((item) => {
          const rows = Array.isArray(item?.rows) ? item.rows : [];
          const acertos = Number(item?.acertos || 0);
          const erros = Number(item?.erros || 0);
          const brancos = Number(item?.brancos || 0);
          const questions = Number(item?.totalQuestoes || acertos + erros + brancos);

          return {
            id: item.id,
            date: item.data || '',
            title: item.nome || 'Simulado externo',
            tempo: item.tempo || '00:00:00',
            banca: item.banca || '',
            comentarios: item.comentarios || '',
            acertos,
            erros,
            brancos,
            questions,
            rows,
            accuracy: Number(item?.desempenho || (questions > 0 ? Math.round((acertos / questions) * 100) : 0)),
            notaLiquida: Number(item?.notaLiquida ?? item?.nota_liquida ?? (acertos - erros)),
          };
        })
        .sort((a, b) => String(b.date).localeCompare(String(a.date)));
    }

    const grouped = new Map();

    simuladoHistory.forEach((item) => {
      const key = buildSimuladoKey(item);
      const current = grouped.get(key) || {
        id: key,
        date: item.data || '',
        title: item.material || 'Simulado externo',
        tempo: item.tempo || '00:00:00',
        banca: inferBankFromMaterial(item.material || ''),
        comentarios: inferCommentsFromMaterial(item.material || ''),
        acertos: 0,
        erros: 0,
        brancos: 0,
        questions: 0,
        rows: [],
      };

      current.acertos += Number(item.acertos || 0);
      current.erros += Number(item.erros || 0);
      current.brancos += Number(item.brancos || 0);
      current.questions += Number(item.acertos || 0) + Number(item.erros || 0) + Number(item.brancos || 0);
      current.rows.push({
        id: `${key}-${current.rows.length + 1}`,
        disciplina: item.disciplinaCanonica || item.disciplina || '',
        topico: item.topico || '',
        peso: 1,
        brancos: Number(item.brancos || 0),
        acertos: Number(item.acertos || 0),
        erros: Number(item.erros || 0),
      });
      grouped.set(key, current);
    });

    return [...grouped.values()]
      .map((item) => ({
        ...item,
        accuracy: item.questions > 0 ? Math.round((item.acertos / item.questions) * 100) : 0,
        notaLiquida: Number((item.acertos - item.erros).toFixed(2)),
      }))
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }, [simuladoHistory, simulados]);

  const summary = useMemo(() => {
    if (Array.isArray(simulados) && simulados.length > 0) {
      const totalQuestions = groupedSimulados.reduce((acc, item) => acc + item.questions, 0);
      const totalMinutes = groupedSimulados.reduce((acc, item) => acc + parseStudyTimeToMinutes(item.tempo), 0);

      return {
        total: Number(simuladoStats?.total || groupedSimulados.length || 0),
        averageScore: Number(simuladoStats?.mediaDesempenho || 0),
        totalQuestions,
        totalMinutesLabel: formatMinutesLabel(totalMinutes),
        best: groupedSimulados[0] || null,
      };
    }

    const total = groupedSimulados.length;
    const averageScore =
      total > 0 ? Math.round(groupedSimulados.reduce((acc, item) => acc + item.accuracy, 0) / total) : 0;
    const totalQuestions = groupedSimulados.reduce((acc, item) => acc + item.questions, 0);
    const totalMinutes = simuladoHistory.reduce((acc, item) => acc + parseStudyTimeToMinutes(item.tempo), 0);

    return {
      total,
      averageScore,
      totalQuestions,
      totalMinutesLabel: formatMinutesLabel(totalMinutes),
      best: groupedSimulados[0] || null,
    };
  }, [groupedSimulados, simuladoHistory, simuladoStats, simulados]);

  const disciplineProgress = useMemo(
    () =>
      buildDisciplineSummaryFromHistory(simuladoHistory)
        .filter((item) => item.questions > 0)
        .slice(0, 5),
    [simuladoHistory]
  );

  const latestSimulado = groupedSimulados[0] || null;

  const filteredHistory = useMemo(() => {
    const q = historyQuery.trim().toLowerCase();
    if (!q) return groupedSimulados;
    return groupedSimulados.filter((item) => {
      const hay = `${item.title} ${item.banca} ${item.date} ${item.comentarios}`.toLowerCase();
      return hay.includes(q);
    });
  }, [groupedSimulados, historyQuery]);

  const displayTotal = realStats.total > 0 ? realStats.total : summary.total;
  const displayAverage = realStats.mediaDesempenho > 0 ? realStats.mediaDesempenho : summary.averageScore;
  const displayBest = realStats.melhorDesempenho > 0 ? realStats.melhorDesempenho : summary.best?.accuracy || 0;

  return (
    <div className="page-shell flex animate-in fade-in duration-500 flex-col gap-4 !pt-4 sm:!pt-5 lg:gap-5">
      <PageHeadPremium
        className="shrink-0"
        icon={ListChecks}
        leadingClassName="xl:!max-w-[min(100%,26rem)] xl:!flex-none"
        trailingClassName="xl:!w-full xl:!max-w-none xl:min-w-0 xl:flex-1"
        title="Simulados"
        subtitle="Registre resultados de simulados externos, monte provas no caderno e acompanhe evolução com base no seu histórico real."
        trailing={
          <div className="flex w-full min-w-0 flex-col gap-2 sm:gap-2.5">
            <PageHeadPremiumBadge icon={PieChart} className="!mb-0 w-fit shrink-0">
              Prática em prova
            </PageHeadPremiumBadge>
            <div className="scrollbar-thin flex min-w-0 w-full flex-1 items-stretch gap-2 overflow-x-auto pb-0.5 sm:min-w-0 sm:gap-2.5 sm:overflow-visible sm:pb-0">
              <KpiChip
                Icon={FileText}
                iconWrap="bg-blue-50 text-blue-600"
                label="Realizados"
                value={String(displayTotal)}
                suffix="registros"
                variant="premium"
              />
              <KpiChip
                Icon={BarChart2}
                iconWrap="bg-emerald-50 text-emerald-600"
                label="Média geral"
                value={String(displayAverage)}
                suffix="%"
                valueClass="text-emerald-700"
                variant="premium"
                premiumValueClass="text-emerald-200"
              />
              <KpiChip
                Icon={Award}
                iconWrap="bg-amber-50 text-amber-600"
                label="Melhor nota"
                value={String(displayBest)}
                suffix="%"
                valueClass="text-amber-800"
                variant="premium"
                premiumValueClass="text-amber-200"
              />
            </div>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => openSimuladoReviewModal?.('novo')} className="btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold shadow-sm sm:text-sm">
          <PlusSquare size={16} strokeWidth={2.2} />
          Registrar resultado
        </button>
        <button
          type="button"
          onClick={() => setIsCadernoModalOpen(true)}
          className="btn-secondary inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-sm sm:text-sm"
        >
          <Settings size={16} strokeWidth={2.2} />
          Montar no caderno
        </button>
        <button
          type="button"
          onClick={() => openHistoricoWithFilter?.('simulados')}
          className="btn-secondary inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-sm sm:text-sm"
        >
          <History size={16} strokeWidth={2.2} />
          Ver no histórico
        </button>
        <button
          type="button"
          onClick={() => setRankingOpen(true)}
          className="group relative inline-flex animate-rankingCtaGlow rounded-xl bg-gradient-to-br from-amber-200/95 via-white/40 to-blue-600 p-[1.5px] shadow-lg shadow-blue-900/35 transition hover:shadow-xl hover:shadow-blue-800/45"
        >
          <span className="relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-[11px] bg-gradient-to-br from-slate-950 via-blue-950 to-blue-700 px-5 py-2.5 sm:gap-2.5 sm:rounded-[11px] sm:px-6 sm:py-3">
            <span
              className="pointer-events-none absolute inset-y-0 left-0 w-[45%] -translate-x-full skew-x-[-16deg] bg-gradient-to-r from-transparent via-white/35 to-transparent opacity-90 animate-rankingCtaShimmer"
              aria-hidden
            />
            <Trophy
              className="relative z-10 size-4 shrink-0 text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)] sm:size-[18px]"
              strokeWidth={2}
            />
            <span className="relative z-10 text-sm font-semibold tracking-wide text-white sm:text-[15px]">Ranking</span>
            <span className="relative z-10 inline-flex rounded-md border border-white/20 bg-white/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.16em] text-amber-100/95 sm:px-2 sm:text-[9px]">
              Top
            </span>
          </span>
        </button>
      </div>

      <SimuladosRankingPanel
        open={rankingOpen}
        onClose={() => setRankingOpen(false)}
        profile={profile}
        currentUserId={currentUserId}
        historicoReal={historicoReal}
        redacaoSummary={redacaoSummary}
        communityMetrics={communityMetrics}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(280px,360px)] xl:gap-5">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
            <PathwayCard
              onAction={() => openSimuladoReviewModal?.('novo')}
              badge="Fluxo rápido"
              badgeClass="border-blue-200 bg-blue-50 text-blue-700"
              title="Registrar prova externa"
              description="Lançar acertos, erros, brancos, tempo e banca — ideal para simulados de cursinho ou PDF."
              meta={[
                { icon: ListChecks, text: 'Disciplinas por linha' },
                { icon: Clock, text: 'Cronômetro opcional' },
              ]}
              cta="Abrir formulário"
            />
            <PathwayCard
              onAction={() => setIsCadernoModalOpen(true)}
              badge="Personalizado"
              badgeClass="border-emerald-200 bg-emerald-50 text-emerald-800"
              title="Montar prova no caderno"
              description="Combine questões do banco em uma prova sob medida e registre o desempenho depois."
              meta={[
                { icon: Target, text: 'Foco por disciplina' },
                { icon: FileText, text: 'Mesma experiência de estudo' },
              ]}
              cta="Abrir caderno"
              tone="secondary"
            />
          </div>

          <section className="section-card !p-0 overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 sm:text-base">Histórico de simulados</h3>
                <p className="mt-0.5 text-xs font-medium text-slate-500">
                  {filteredHistory.length} de {groupedSimulados.length} exibidos
                </p>
              </div>
              <div className="relative min-w-0 sm:max-w-xs sm:flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={historyQuery}
                  onChange={(e) => setHistoryQuery(e.target.value)}
                  placeholder="Buscar por nome, banca ou data..."
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs font-semibold text-slate-700 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:bg-white sm:text-sm"
                />
              </div>
            </div>

            {filteredHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
                <ClipboardList className="text-slate-300" size={36} strokeWidth={1.5} />
                <p className="text-sm font-semibold text-slate-700">
                  {groupedSimulados.length === 0 ? 'Nenhum simulado registrado ainda' : 'Nenhum resultado para a busca'}
                </p>
                <p className="max-w-sm text-xs font-medium text-slate-500">
                  {groupedSimulados.length === 0
                    ? 'Use “Registrar resultado” para lançar sua primeira prova. Os dados ficam salvos na sua conta.'
                    : 'Ajuste os termos da busca ou limpe o campo para ver todos os registros.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/80 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      <th className="px-4 py-2.5 sm:px-5">Data</th>
                      <th className="px-4 py-2.5 sm:px-5">Prova</th>
                      <th className="px-4 py-2.5 sm:px-5">Banca</th>
                      <th className="px-4 py-2.5 text-center sm:px-5">Desemp.</th>
                      <th className="px-4 py-2.5 text-center sm:px-5">Questões</th>
                      <th className="px-4 py-2.5 sm:px-5">Tempo</th>
                      <th className="px-4 py-2.5 text-right sm:px-5"> </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredHistory.map((row) => (
                      <tr key={row.id} className="bg-white transition-colors hover:bg-slate-50/80">
                        <td className="whitespace-nowrap px-4 py-3 text-xs font-semibold text-slate-600 sm:px-5 sm:text-sm">
                          {formatDate(row.date)}
                        </td>
                        <td className="max-w-[200px] px-4 py-3 sm:max-w-[240px] sm:px-5">
                          <p className="truncate font-semibold text-slate-900" title={row.title}>
                            {row.title}
                          </p>
                          {row.comentarios ? (
                            <p className="mt-0.5 line-clamp-1 text-[11px] font-medium text-slate-400">{row.comentarios}</p>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-xs font-medium text-slate-600 sm:px-5 sm:text-sm">
                          {row.banca || '—'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-flex min-w-[2.75rem] justify-center rounded-full border px-2 py-0.5 text-xs font-semibold ${accuracyPillClass(row.accuracy)}`}
                          >
                            {row.accuracy}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-xs font-semibold tabular-nums text-slate-700 sm:text-sm">
                          {row.questions > 0 ? (
                            <span title={`${row.acertos} acertos · ${row.erros} erros · ${row.brancos} brancos`}>
                              {row.questions}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs font-medium text-slate-600 sm:px-5 sm:text-sm">
                          {row.tempo || '—'}
                        </td>
                        <td className="px-4 py-3 text-right sm:px-5">
                          <button
                            type="button"
                            onClick={() => openSimuladoReviewModal?.(row.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-blue-700 transition hover:border-blue-200 hover:bg-blue-50 sm:text-xs"
                          >
                            Revisar
                            <ChevronRight size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <aside className="flex min-w-0 flex-col gap-4">
          <div className="section-card !p-4 sm:!p-5">
            <h4 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
              <TrendingUp size={16} className="text-blue-600" />
              Evolução por matéria
            </h4>
            <div className="space-y-4">
              {disciplineProgress.length === 0 ? (
                <p className="text-xs font-medium leading-relaxed text-slate-500">
                  Quando houver simulados com disciplinas no histórico, o desempenho médio aparece aqui.
                </p>
              ) : (
                disciplineProgress.map((item) => (
                  <ProgressRow
                    key={item.name}
                    label={item.name}
                    value={`${item.accuracy}%`}
                    width={`${Math.min(100, item.accuracy)}%`}
                    color={item.accuracy >= 80 ? 'bg-emerald-500' : item.accuracy >= 65 ? 'bg-blue-600' : 'bg-amber-500'}
                    textColor={item.accuracy >= 80 ? 'text-emerald-600' : item.accuracy >= 65 ? 'text-blue-700' : 'text-amber-700'}
                  />
                ))
              )}
            </div>
          </div>

          <div className="section-card !p-4 sm:!p-5">
            <h4 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
              <History size={16} className="text-blue-600" />
              Último simulado
            </h4>

            {latestSimulado ? (
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50/60">
                <div className="border-b border-slate-100 bg-white px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Realizado em {formatDate(latestSimulado.date)}</p>
                  <h5 className="mt-1 text-sm font-semibold leading-snug text-slate-900 sm:text-base">{latestSimulado.title}</h5>
                  {latestSimulado.banca ? (
                    <p className="mt-1 text-xs font-medium text-slate-500">Banca: {latestSimulado.banca}</p>
                  ) : null}
                </div>

                <div className="grid grid-cols-3 gap-2 border-b border-slate-100 p-3">
                  <MiniMetric label="Acertos" value={String(latestSimulado.acertos)} labelClass="text-emerald-600" />
                  <MiniMetric label="Erros" value={String(latestSimulado.erros)} labelClass="text-rose-600" />
                  <MiniMetric label="Brancos" value={String(latestSimulado.brancos)} labelClass="text-slate-400" />
                </div>

                <div className="flex items-center justify-between bg-emerald-50/80 px-4 py-2.5">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-emerald-800">Nota líquida</span>
                  <span className="text-lg font-semibold tabular-nums text-emerald-700">{latestSimulado.notaLiquida}</span>
                </div>

                <div className="grid gap-2 p-3 sm:grid-cols-2">
                  <button type="button" onClick={() => openSimuladoReviewModal?.(latestSimulado.id)} className="btn-primary rounded-lg py-2.5 text-xs font-semibold">
                    Revisar detalhes
                  </button>
                  <button
                    type="button"
                    onClick={() => openHistoricoWithFilter?.('simulados')}
                    className="btn-secondary rounded-lg border border-slate-200 py-2.5 text-xs font-semibold text-slate-700"
                  >
                    Linha do tempo
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center text-xs font-medium text-slate-500">
                Nenhum simulado registrado ainda.
              </div>
            )}
          </div>

          <div className="section-card !p-4 sm:!p-5">
            <h4 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
              <PieChart size={16} className="text-blue-600" />
              Resumo operacional
            </h4>
            <div className="space-y-2">
              <InfoRowLight label="Registros fechados" value={String(displayTotal)} />
              <InfoRowLight label="Questões contabilizadas" value={String(summary.totalQuestions)} />
              <InfoRowLight label="Média atual" value={`${displayAverage}%`} />
              <InfoRowLight label="Melhor desempenho" value={`${displayBest}%`} />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function accuracyPillClass(accuracy) {
  if (accuracy >= 80) return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  if (accuracy >= 65) return 'border-blue-200 bg-blue-50 text-blue-800';
  if (accuracy <= 0) return 'border-slate-200 bg-slate-50 text-slate-600';
  return 'border-amber-200 bg-amber-50 text-amber-900';
}

function kpiIconPremium(iconWrap) {
  if (iconWrap.includes('blue-50')) return 'bg-blue-500/20 text-blue-300';
  if (iconWrap.includes('emerald-50')) return 'bg-emerald-500/20 text-emerald-300';
  if (iconWrap.includes('amber-50')) return 'bg-amber-500/20 text-amber-200';
  return 'bg-white/15 text-slate-200';
}

function KpiChip({
  Icon,
  iconWrap,
  label,
  value,
  suffix,
  valueClass = 'text-slate-900',
  variant = 'light',
  premiumValueClass,
}) {
  if (variant === 'premium') {
    const vCls = premiumValueClass || 'text-white';
    return (
      <div
        className={`flex min-w-0 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-2.5 py-2 backdrop-blur-sm max-sm:min-w-[10.25rem] max-sm:shrink-0 sm:flex-1 sm:basis-0 sm:gap-2.5 sm:px-3 sm:py-2.5`}
      >
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:h-9 sm:w-9 ${kpiIconPremium(iconWrap)}`}>
          {React.createElement(Icon, { size: 16, strokeWidth: 2.2 })}
        </div>
        <div className="min-w-0 flex-1 pr-0.5">
          <p className="text-[8px] font-semibold uppercase tracking-widest text-slate-500 sm:text-[9px]">{label}</p>
          <p className={`break-words text-base font-semibold leading-tight sm:text-lg sm:leading-none ${vCls}`}>
            {value}
            {suffix ? (
              <span className="text-[10px] font-semibold text-slate-400 sm:text-xs"> {suffix}</span>
            ) : null}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-2 shadow-sm sm:gap-2.5 sm:px-3 sm:py-2.5">
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:h-9 sm:w-9 ${iconWrap}`}>
        {React.createElement(Icon, { size: 16, strokeWidth: 2.2 })}
      </div>
      <div className="min-w-0 pr-1">
        <p className="text-[8px] font-semibold uppercase tracking-widest text-slate-400 sm:text-[9px]">{label}</p>
        <p className={`truncate text-base font-semibold leading-none sm:text-lg ${valueClass}`}>
          {value}
          <span className="text-[10px] font-semibold text-slate-400 sm:text-xs"> {suffix}</span>
        </p>
      </div>
    </div>
  );
}

function PathwayCard({ onAction, badge, badgeClass, title, description, meta, cta, tone = 'primary' }) {
  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 sm:px-5">
        <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${badgeClass}`}>{badge}</span>
      </div>
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <h4 className="text-base font-semibold tracking-tight text-slate-900 sm:text-lg">{title}</h4>
        <p className="mt-2 flex-1 text-xs font-medium leading-relaxed text-slate-500 sm:text-sm">{description}</p>
        <ul className="mt-4 space-y-2">
          {meta.map((m) => (
            <li key={m.text} className="flex items-center gap-2 text-xs font-semibold text-slate-600">
              <m.icon size={14} className="shrink-0 text-blue-600" />
              {m.text}
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={onAction}
          className={
            tone === 'secondary'
              ? 'btn-secondary mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-800'
              : 'btn-primary mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold shadow-sm'
          }
        >
          {cta}
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}

function ProgressRow({ label, value, width, color, textColor }) {
  return (
    <div>
      <div className="mb-1.5 flex justify-between gap-2 text-xs font-semibold">
        <span className="min-w-0 truncate text-slate-700">{label}</span>
        <span className={`shrink-0 tabular-nums ${textColor}`}>{value}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width }} />
      </div>
    </div>
  );
}

function MiniMetric({ label, value, labelClass = 'text-slate-400' }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-white px-2 py-2 text-center sm:px-3">
      <p className={`text-[9px] font-semibold uppercase tracking-widest sm:text-[10px] ${labelClass}`}>{label}</p>
      <p className="mt-1 text-base font-semibold tabular-nums text-slate-900">{value}</p>
    </div>
  );
}

function InfoRowLight({ label, value }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2.5">
      <span className="text-xs font-semibold text-slate-600">{label}</span>
      <span className="text-xs font-semibold tabular-nums text-slate-900">{value}</span>
    </div>
  );
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(`${value}T12:00:00`);
  return date.toLocaleDateString('pt-BR');
}

function buildSimuladoKey(item) {
  return `${item.data || 'sem-data'}|${item.material || 'Simulado externo'}`;
}

function inferBankFromMaterial(material = '') {
  const parts = String(material || '')
    .split(' | ')
    .map((item) => item.trim())
    .filter(Boolean);
  if (parts.length < 2) return '';
  return parts[1] || '';
}

function inferCommentsFromMaterial(material = '') {
  const parts = String(material || '')
    .split(' | ')
    .map((item) => item.trim())
    .filter(Boolean);
  if (parts.length < 3) return '';
  return parts.slice(2).join(' | ');
}
