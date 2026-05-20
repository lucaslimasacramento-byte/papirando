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
import PageHeadPremium, {
  PAGE_HEAD_PREMIUM_PRIMARY_ACTION_CLASS,
  PAGE_HEAD_PREMIUM_SECONDARY_ACTION_CLASS,
  PageHeadPremiumBadge,
} from '../components/PageHeadPremium';

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

  const headStatTileClass =
    '!h-full !min-h-0 !justify-center !gap-1.5 !px-2.5 !py-2.5 sm:!gap-2 sm:!px-3 sm:!py-3 [&>div:first-child]:!mb-0 [&>div:first-child]:h-6 [&>div:first-child]:w-6 [&>p]:!mb-0 sm:[&>div:first-child]:h-7 sm:[&>div:first-child]:w-7';

  return (
    <div className="page-shell flex animate-in fade-in duration-500 flex-col gap-4 !pt-4 sm:!pt-5 lg:gap-5">
      <PageHeadPremium
        className="shrink-0 gap-4"
        icon={ListChecks}
        badge={
          <PageHeadPremiumBadge icon={PieChart}>
            Prática em prova
          </PageHeadPremiumBadge>
        }
        title="Simulados"
        subtitle="Registre provas externas, use o caderno inteligente e acompanhe média e melhor desempenho."
        leadingClassName="min-w-0 shrink-0 lg:max-w-[26rem] xl:max-w-[28rem]"
        statGridClassName="mx-auto grid w-fit max-w-full grid-cols-3 items-stretch gap-2 sm:gap-2.5 [&>*]:min-w-0 [&>*]:w-[6.35rem] [&>*]:min-h-[7.1rem] sm:[&>*]:w-[6.85rem] sm:[&>*]:min-h-[7.6rem]"
        trailingClassName="w-full shrink-0 sm:w-auto"
        stats={[
          {
            key: 'tot',
            icon: FileText,
            label: 'Realizados',
            value: String(displayTotal),
            accent: 'blue',
            className: headStatTileClass,
            valueClassName: '!text-sm !leading-normal sm:!text-base',
          },
          {
            key: 'avg',
            icon: BarChart2,
            label: 'Média geral',
            value: `${displayAverage}%`,
            accent: 'emerald',
            valueClassName: '!text-emerald-200 !text-sm !leading-normal sm:!text-base',
            className: headStatTileClass,
          },
          {
            key: 'best',
            icon: Award,
            label: 'Melhor nota',
            value: `${displayBest}%`,
            accent: 'amber',
            valueClassName: '!text-amber-200 !text-sm !leading-normal sm:!text-base',
            className: headStatTileClass,
          },
        ]}
        trailing={(
          <div className="grid w-full grid-cols-2 gap-x-2 gap-y-2 sm:w-auto sm:min-w-[17.5rem] sm:max-w-[22rem]">
            <button
              type="button"
              onClick={() => openSimuladoReviewModal?.('novo')}
              className={`${PAGE_HEAD_PREMIUM_PRIMARY_ACTION_CLASS} w-full min-w-0`}
            >
              <PlusSquare size={14} strokeWidth={2.2} aria-hidden />
              Registrar resultado
            </button>
            <button
              type="button"
              onClick={() => setRankingOpen(true)}
              className="group relative inline-flex min-h-[2.75rem] w-full min-w-0 animate-rankingCtaGlow rounded-xl bg-gradient-to-br from-amber-200/95 via-white/40 to-blue-600 p-[1.5px] shadow-lg shadow-blue-900/35 transition hover:shadow-xl hover:shadow-blue-800/45"
            >
              <span className="relative flex h-full min-h-[2.65rem] w-full items-center justify-center gap-1.5 overflow-hidden rounded-[11px] bg-gradient-to-br from-ink-950 via-blue-950 to-blue-700 px-3 py-2 sm:min-h-[2.9rem] sm:gap-2 sm:rounded-[11px] sm:px-4 sm:py-2.5">
                <span
                  className="pointer-events-none absolute inset-y-0 left-0 w-[45%] -translate-x-full skew-x-[-16deg] bg-gradient-to-r from-transparent via-white/35 to-transparent opacity-90 animate-rankingCtaShimmer"
                  aria-hidden
                />
                <Trophy
                  className="relative z-10 size-4 shrink-0 text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)] sm:size-[18px]"
                  strokeWidth={2}
                />
                <span className="relative z-10 text-xs font-semibold tracking-wide text-white sm:text-sm sm:text-[15px]">Ranking</span>
                <span className="relative z-10 inline-flex shrink-0 rounded-md border border-white/20 bg-white/10 px-1 py-0.5 text-[7px] font-bold uppercase tracking-[0.14em] text-amber-100/95 sm:px-1.5 sm:text-[9px]">
                  Top
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => setIsCadernoModalOpen(true)}
              className={`${PAGE_HEAD_PREMIUM_SECONDARY_ACTION_CLASS} w-full min-w-0`}
            >
              <Settings size={14} strokeWidth={2.2} aria-hidden />
              Montar no caderno
            </button>
            <button
              type="button"
              onClick={() => openHistoricoWithFilter?.('simulados')}
              className={`${PAGE_HEAD_PREMIUM_SECONDARY_ACTION_CLASS} w-full min-w-0`}
            >
              <History size={14} strokeWidth={2.2} aria-hidden />
              Ver no histórico
            </button>
          </div>
        )}
      />

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
            <div className="flex flex-col gap-3 border-b border-ink-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div>
                <h3 className="text-sm font-semibold text-ink-900 sm:text-base">Histórico de simulados</h3>
                <p className="mt-0.5 text-xs font-medium text-ink-500">
                  {filteredHistory.length} de {groupedSimulados.length} exibidos
                </p>
              </div>
              <div className="relative min-w-0 sm:max-w-xs sm:flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
                <input
                  type="search"
                  value={historyQuery}
                  onChange={(e) => setHistoryQuery(e.target.value)}
                  placeholder="Buscar por nome, banca ou data..."
                  className="w-full rounded-lg border border-ink-200 bg-ink-50 py-2 pl-9 pr-3 text-xs font-semibold text-ink-700 outline-none placeholder:text-ink-400 focus:border-blue-500 focus:bg-white sm:text-sm"
                />
              </div>
            </div>

            {filteredHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
                <ClipboardList className="text-ink-300" size={36} strokeWidth={1.5} />
                <p className="text-sm font-semibold text-ink-700">
                  {groupedSimulados.length === 0 ? 'Nenhum simulado registrado ainda' : 'Nenhum resultado para a busca'}
                </p>
                <p className="max-w-sm text-xs font-medium text-ink-500">
                  {groupedSimulados.length === 0
                    ? 'Use “Registrar resultado” para lançar sua primeira prova. Os dados ficam salvos na sua conta.'
                    : 'Ajuste os termos da busca ou limpe o campo para ver todos os registros.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-ink-100 bg-ink-50/80 text-[10px] font-semibold uppercase tracking-wider text-ink-500">
                      <th className="px-4 py-2.5 sm:px-5">Data</th>
                      <th className="px-4 py-2.5 sm:px-5">Prova</th>
                      <th className="px-4 py-2.5 sm:px-5">Banca</th>
                      <th className="px-4 py-2.5 text-center sm:px-5">Desemp.</th>
                      <th className="px-4 py-2.5 text-center sm:px-5">Questões</th>
                      <th className="px-4 py-2.5 sm:px-5">Tempo</th>
                      <th className="px-4 py-2.5 text-right sm:px-5"> </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100">
                    {filteredHistory.map((row) => (
                      <tr key={row.id} className="bg-white transition-colors hover:bg-ink-50/80">
                        <td className="whitespace-nowrap px-4 py-3 text-xs font-semibold text-ink-600 sm:px-5 sm:text-sm">
                          {formatDate(row.date)}
                        </td>
                        <td className="max-w-[200px] px-4 py-3 sm:max-w-[240px] sm:px-5">
                          <p className="truncate font-semibold text-ink-900" title={row.title}>
                            {row.title}
                          </p>
                          {row.comentarios ? (
                            <p className="mt-0.5 line-clamp-1 text-[11px] font-medium text-ink-400">{row.comentarios}</p>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-xs font-medium text-ink-600 sm:px-5 sm:text-sm">
                          {row.banca || '—'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-flex min-w-[2.75rem] justify-center rounded-full border px-2 py-0.5 text-xs font-semibold ${accuracyPillClass(row.accuracy)}`}
                          >
                            {row.accuracy}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-xs font-semibold tabular-nums text-ink-700 sm:text-sm">
                          {row.questions > 0 ? (
                            <span title={`${row.acertos} acertos · ${row.erros} erros · ${row.brancos} brancos`}>
                              {row.questions}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs font-medium text-ink-600 sm:px-5 sm:text-sm">
                          {row.tempo || '—'}
                        </td>
                        <td className="px-4 py-3 text-right sm:px-5">
                          <button
                            type="button"
                            onClick={() => openSimuladoReviewModal?.(row.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-blue-700 transition hover:border-blue-200 hover:bg-blue-50 sm:text-xs"
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
            <h4 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-ink-500">
              <TrendingUp size={16} className="text-blue-600" />
              Evolução por matéria
            </h4>
            <div className="space-y-4">
              {disciplineProgress.length === 0 ? (
                <p className="text-xs font-medium leading-relaxed text-ink-500">
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
            <h4 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-ink-500">
              <History size={16} className="text-blue-600" />
              Último simulado
            </h4>

            {latestSimulado ? (
              <div className="overflow-hidden rounded-xl border border-ink-200 bg-ink-50/60">
                <div className="border-b border-ink-100 bg-white px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-400">Realizado em {formatDate(latestSimulado.date)}</p>
                  <h5 className="mt-1 text-sm font-semibold leading-snug text-ink-900 sm:text-base">{latestSimulado.title}</h5>
                  {latestSimulado.banca ? (
                    <p className="mt-1 text-xs font-medium text-ink-500">Banca: {latestSimulado.banca}</p>
                  ) : null}
                </div>

                <div className="grid grid-cols-3 gap-2 border-b border-ink-100 p-3">
                  <MiniMetric label="Acertos" value={String(latestSimulado.acertos)} labelClass="text-emerald-600" />
                  <MiniMetric label="Erros" value={String(latestSimulado.erros)} labelClass="text-rose-600" />
                  <MiniMetric label="Brancos" value={String(latestSimulado.brancos)} labelClass="text-ink-400" />
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
                    className="btn-secondary rounded-lg border border-ink-200 py-2.5 text-xs font-semibold text-ink-700"
                  >
                    Linha do tempo
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-ink-200 bg-ink-50/80 px-4 py-8 text-center text-xs font-medium text-ink-500">
                Nenhum simulado registrado ainda.
              </div>
            )}
          </div>

          <div className="section-card !p-4 sm:!p-5">
            <h4 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-ink-500">
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
  if (accuracy <= 0) return 'border-ink-200 bg-ink-50 text-ink-600';
  return 'border-amber-200 bg-amber-50 text-amber-900';
}

function PathwayCard({ onAction, badge, badgeClass, title, description, meta, cta, tone = 'primary' }) {
  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3 sm:px-5">
        <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${badgeClass}`}>{badge}</span>
      </div>
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <h4 className="text-base font-semibold tracking-tight text-ink-900 sm:text-lg">{title}</h4>
        <p className="mt-2 flex-1 text-xs font-medium leading-relaxed text-ink-500 sm:text-sm">{description}</p>
        <ul className="mt-4 space-y-2">
          {meta.map((m) => (
            <li key={m.text} className="flex items-center gap-2 text-xs font-semibold text-ink-600">
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
              ? 'btn-secondary mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-ink-200 py-3 text-sm font-semibold text-ink-800'
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
        <span className="min-w-0 truncate text-ink-700">{label}</span>
        <span className={`shrink-0 tabular-nums ${textColor}`}>{value}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-ink-100">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width }} />
      </div>
    </div>
  );
}

function MiniMetric({ label, value, labelClass = 'text-ink-400' }) {
  return (
    <div className="rounded-lg border border-ink-100 bg-white px-2 py-2 text-center sm:px-3">
      <p className={`text-[9px] font-semibold uppercase tracking-widest sm:text-[10px] ${labelClass}`}>{label}</p>
      <p className="mt-1 text-base font-semibold tabular-nums text-ink-900">{value}</p>
    </div>
  );
}

function InfoRowLight({ label, value }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-ink-100 bg-ink-50/80 px-3 py-2.5">
      <span className="text-xs font-semibold text-ink-600">{label}</span>
      <span className="text-xs font-semibold tabular-nums text-ink-900">{value}</span>
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
