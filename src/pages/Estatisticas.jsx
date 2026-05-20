import React, { useMemo } from 'react';
import {
  PieChart,
  Filter,
  Clock,
  Flame,
  BookOpen,
  Activity,
  ArrowUpRight,
  BrainCircuit,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import {
  buildCanonicalHistory,
  buildDisciplineSummaryFromHistory,
  calculateStudyStreak,
  formatMinutesLabel,
  parseStudyTimeToMinutes,
} from '../lib/studyAnalytics';
import { canonicalizeSubjectName } from '../lib/subjectCatalogUtils';
import PageHeadPremium, { PageHeadPremiumBadge } from '../components/PageHeadPremium';

export default function Estatisticas({
  setIsFilterPanelOpen,
  historicoReal = [],
  bancoDisciplinas = [],
  subjectCatalog = [],
  redacaoSummary = {},
}) {
  const canonicalHistory = useMemo(
    () => buildCanonicalHistory(historicoReal, subjectCatalog),
    [historicoReal, subjectCatalog]
  );

  const disciplineSummary = useMemo(
    () => buildDisciplineSummaryFromHistory(canonicalHistory),
    [canonicalHistory]
  );

  const stats = useMemo(() => {
    const totalQuestoes = canonicalHistory.reduce(
      (acc, item) => acc + Number(item.acertos || 0) + Number(item.erros || 0),
      0
    );
    const acertos = canonicalHistory.reduce((acc, item) => acc + Number(item.acertos || 0), 0);
    const erros = canonicalHistory.reduce((acc, item) => acc + Number(item.erros || 0), 0);
    const totalMinutos = canonicalHistory.reduce((acc, item) => acc + parseStudyTimeToMinutes(item.tempo), 0);
    const diasEstudados = new Set(canonicalHistory.map((item) => item.data).filter(Boolean)).size;
    const topicosConcluidos = bancoDisciplinas.reduce(
      (acc, disciplina) => acc + (disciplina.topicos || []).filter((topico) => topico.concluido).length,
      0
    );
    const topicosPendentes = bancoDisciplinas.reduce(
      (acc, disciplina) => acc + (disciplina.topicos || []).filter((topico) => !topico.concluido).length,
      0
    );
    const streakDias = calculateStudyStreak(canonicalHistory);
    const progressoEdital =
      topicosConcluidos + topicosPendentes > 0
        ? Math.round((topicosConcluidos / (topicosConcluidos + topicosPendentes)) * 100)
        : 0;

    return {
      totalQuestoes,
      acertos,
      erros,
      tempoTotal: formatMinutesLabel(totalMinutos),
      mediaDia: diasEstudados > 0 ? formatMinutesLabel(Math.round(totalMinutos / diasEstudados)) : '0h 00m',
      diasEstudados,
      streakDias,
      progressoEdital,
      topicosConcluidos,
      topicosPendentes,
    };
  }, [bancoDisciplinas, canonicalHistory]);

  const percAcertos = stats.totalQuestoes > 0 ? Math.round((stats.acertos / stats.totalQuestoes) * 100) : 0;
  const bestDiscipline = disciplineSummary[0] || null;
  const weakestDiscipline =
    [...disciplineSummary]
      .filter((item) => item.questions > 0)
      .sort((first, second) => first.accuracy - second.accuracy)[0] || null;

  const topicRows = useMemo(() => {
    return bancoDisciplinas
      .flatMap((disciplina) =>
        (disciplina.topicos || []).map((topico) => {
          const total = Number(topico.acertos || 0) + Number(topico.erros || 0);
          const pct = total > 0 ? Math.round((Number(topico.acertos || 0) / total) * 100) : 0;
          return {
            disc: canonicalizeSubjectName(disciplina.nome, subjectCatalog),
            topico: topico.nome,
            qTot: total,
            pct,
          };
        })
      )
      .filter((item) => item.qTot > 0)
      .sort((first, second) => second.qTot - first.qTot)
      .slice(0, 8);
  }, [bancoDisciplinas, subjectCatalog]);

  return (
    <div className="page-shell flex h-full min-h-0 flex-col !gap-3 !pb-4 !pt-4 animate-in fade-in duration-500 sm:!pt-5 lg:!gap-4">
      <PageHeadPremium
        icon={PieChart}
        badge={<PageHeadPremiumBadge icon={PieChart}>Inteligência analítica</PageHeadPremiumBadge>}
        title="Estatísticas profundas"
        subtitle="Gargalos e oportunidades por matéria."
        className="gap-4 lg:!flex-row lg:!items-center lg:!justify-between"
        leadingClassName="min-w-0 shrink-0 items-center lg:max-w-[calc(100%-38rem)] xl:max-w-[28rem]"
        centerSlot={
          <div className="mx-auto flex w-full max-w-[16rem] min-w-0 flex-col items-center justify-center gap-2 px-1 text-center sm:px-0">
            <div className="text-[1.1rem] font-semibold leading-none tracking-[-0.02em] text-sky-200/95 tabular-nums sm:text-[1.25rem]">
              {percAcertos}%
            </div>
            <div className="flex w-full flex-col gap-1">
              <div className="text-[10px] font-medium uppercase tracking-[0.2em] text-ink-400/85">
                Desempenho geral
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full border border-white/[0.06] bg-white/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand-500 to-sky-400 shadow-[0_0_14px_rgba(56,189,248,0.22)] transition-[width] duration-500 ease-out"
                  style={{ width: `${percAcertos}%` }}
                />
              </div>
            </div>
          </div>
        }
        trailing={(
          <div className="flex w-full min-w-0 flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-2 xl:shrink-0">
            <div className="rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-center text-xs font-semibold text-ink-200 sm:py-2 sm:text-[13px]">
              Matérias padronizadas
            </div>
            <button
              type="button"
              onClick={() => setIsFilterPanelOpen?.(true)}
              className="inline-flex w-full min-w-0 items-center justify-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 focus-visible:ring-2 focus-visible:ring-brand-400/40 sm:w-auto sm:text-[13px]"
            >
              <Filter size={14} />
              Filtros avançados
            </button>
          </div>
        )}
        trailingClassName="w-full min-w-0 xl:min-w-0"
        trailingWrapClassName="lg:ml-auto lg:w-auto lg:max-w-[22rem] lg:self-center xl:max-w-[24rem]"
      />

      <div
        className="-mx-1 flex min-w-0 shrink-0 gap-2 overflow-x-auto pb-1 pt-0.5 custom-scrollbar sm:mx-0 sm:grid sm:w-full sm:grid-cols-7 sm:gap-2 sm:overflow-visible sm:pb-0 [&>*]:min-w-0"
        aria-label="Indicadores principais"
      >
        <MetricStripCard
          icon={Clock}
          title="Tempo de estudo"
          highlight={stats.tempoTotal}
          footerLabel="Média diária"
          footerValue={stats.mediaDia}
          accent="blue"
        />
        <MetricStripCard
          icon={Flame}
          title="Constância"
          highlight={`${stats.diasEstudados} dias`}
          footerLabel="Registros"
          footerValue={`${canonicalHistory.length} sessões`}
          accent="orange"
        />
        <MetricStripCard
          icon={CheckCircle2}
          title="Desempenho"
          highlight={`${percAcertos}%`}
          footerLabel="Acertos × erros"
          footerValue={`${stats.acertos} / ${stats.erros}`}
          accent="emerald"
        />
        <MetricStripCard
          icon={Layers}
          title="Edital"
          highlight={`${stats.progressoEdital}%`}
          footerLabel="Concluídos"
          footerValue={`${stats.topicosConcluidos} tópicos`}
          accent="indigo"
        />
        <MetricStripCard
          icon={BrainCircuit}
          title="Redações"
          highlight={String(redacaoSummary.corrected || 0)}
          footerLabel="Média atual"
          footerValue={
            redacaoSummary.averageScore
              ? `${String(redacaoSummary.averageScore).replace('.', ',')} / 10`
              : 'Sem nota ainda'
          }
          accent="blue"
        />
        <MetricStripCard
          icon={CheckCircle2}
          title="Melhor nota"
          highlight={redacaoSummary.bestScore ? String(redacaoSummary.bestScore).replace('.', ',') : '0'}
          footerLabel="Tema mais treinado"
          footerValue={redacaoSummary.topTheme || 'Ainda não definido'}
          accent="emerald"
        />
        <MetricStripCard
          icon={BookOpen}
          title="Rascunhos"
          highlight={String(redacaoSummary.drafts || 0)}
          footerLabel="Último tema"
          footerValue={redacaoSummary.latest?.tema || 'Nenhuma redação ainda'}
          accent="indigo"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.25fr_1fr] xl:gap-4">
        <div className="section-card flex min-h-0 min-w-0 flex-col overflow-hidden p-4 md:p-5">
          <div className="mb-3 shrink-0">
            <h3 className="flex items-center gap-2 text-base font-semibold text-ink-900">
              <Activity size={18} className="text-[#1d4ed8]" />
              Análise por matéria canônica
            </h3>
            <p className="mt-0.5 text-[11px] font-semibold text-ink-400">
              Tempo e acurácia consolidados no mesmo nome padrão.
            </p>
          </div>

          <div className="custom-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
            {disciplineSummary.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-ink-200 bg-ink-50 p-6 text-center text-sm font-semibold text-ink-400">
                Ainda não há registros suficientes para montar as estatísticas por matéria.
              </div>
            ) : (
              disciplineSummary.slice(0, 10).map((item) => (
                <DisciplineRow
                  key={item.name}
                  name={item.name}
                  timeLabel={item.timeLabel}
                  accuracy={item.accuracy}
                  questions={item.questions}
                  maxMinutes={disciplineSummary[0]?.minutes || 1}
                  minutes={item.minutes}
                />
              ))
            )}
          </div>
        </div>

        <div className="grid min-w-0 gap-3 xl:grid-rows-[minmax(26rem,auto)_auto]">
          <div className="relative flex min-h-[24rem] flex-col overflow-hidden rounded-xl border border-ink-800 bg-ink-900 p-4 text-ink-50 shadow-md ring-1 ring-[#1d4ed8]/15 sm:min-h-[26rem] sm:p-5">
            <div className="pointer-events-none absolute -right-12 -top-20 h-64 w-64 rounded-full bg-[#1d4ed8]/25 blur-3xl" />
            <div className="pointer-events-none absolute -left-8 bottom-0 h-40 w-40 rounded-full bg-[#1d4ed8]/10 blur-2xl" />
            <div className="relative z-10 flex min-h-0 flex-1 flex-col">
              <div className="mb-2 shrink-0 inline-flex w-fit max-w-full items-center gap-2 rounded-full border border-[#1d4ed8]/35 bg-[#1d4ed8]/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#BFDBFE]">
                <BrainCircuit size={12} className="shrink-0 text-[#93C5FD]" />
                <span className="truncate">Leitura da IA</span>
              </div>

              <h3 className="mb-1.5 shrink-0 text-base font-semibold tracking-tight text-white sm:text-lg">
                Diagnóstico estratégico
              </h3>
              <p className="mb-3 shrink-0 text-xs font-medium leading-relaxed text-ink-300 sm:text-sm">
                {bestDiscipline
                  ? `${bestDiscipline.name} lidera sua dedicação atual.`
                  : 'Assim que você registrar mais estudos, as leituras inteligentes aparecem aqui.'}
              </p>

              <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain pr-0.5">
                <div className="space-y-2.5 sm:space-y-3">
                  <InsightBullet
                    title="O que está forte"
                    text={
                      bestDiscipline
                        ? `${bestDiscipline.name} acumula ${bestDiscipline.timeLabel} e ${bestDiscipline.accuracy}% de acurácia.`
                        : 'Sem destaque suficiente por enquanto.'
                    }
                  />
                  <InsightBullet
                    title="O que pede ataque"
                    text={
                      weakestDiscipline
                        ? `${weakestDiscipline.name} está pedindo reforço, com ${weakestDiscipline.accuracy}% de acurácia.`
                        : 'Sem gargalo relevante detectado ainda.'
                    }
                  />
                  <InsightBullet
                    title="Próxima jogada"
                    text="Use a matéria com menor acurácia como próximo bloco de revisão e mantenha as matérias mais fortes em manutenção."
                  />
                </div>
              </div>

              <div className="shrink-0 pt-3">
                <div className="rounded-xl border border-[#1d4ed8]/25 bg-[#1d4ed8]/10 p-2.5 sm:p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#93C5FD]/90 sm:text-xs">
                      Potencial de subida
                    </span>
                    <span className="flex items-center gap-1 text-base font-semibold tabular-nums text-[#BFDBFE] sm:text-lg">
                      +{Math.max(5, 100 - percAcertos)}%
                      <ArrowUpRight size={16} className="shrink-0 text-[#93C5FD]" strokeWidth={2.25} />
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="section-card p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold text-ink-900">Tópicos mais respondidos</h3>
            </div>

            <div className="space-y-3">
              {topicRows.length === 0 ? (
                <p className="text-sm font-semibold text-ink-400">Sem tópicos suficientes com questões respondidas.</p>
              ) : (
                topicRows.map((item) => (
                  <TopicRow key={`${item.disc}-${item.topico}`} item={item} />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricStripCard({ icon: Icon, title, highlight, footerLabel, footerValue, accent }) {
  const accents = {
    blue: 'bg-[#EFF6FF] text-[#1d4ed8]',
    orange: 'bg-orange-50 text-orange-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    indigo: 'bg-brand-50 text-brand-600',
  };

  return (
    <div className="flex h-full w-full min-h-[6.75rem] min-w-[8.25rem] shrink-0 flex-col rounded-xl border border-ink-100 bg-white p-2 shadow-sm transition-all hover:border-[#1d4ed8]/20 hover:shadow-md sm:min-h-[6.25rem] sm:min-w-0 sm:p-2.5">
      <div className={`mb-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md sm:mb-1.5 sm:h-7 sm:w-7 sm:rounded-lg ${accents[accent]}`}>
        <Icon size={15} strokeWidth={2.25} />
      </div>
      <p className="line-clamp-2 text-[9px] font-bold uppercase leading-tight tracking-wide text-ink-400">{title}</p>
      <p className="mt-0.5 line-clamp-2 text-[0.9rem] font-bold leading-tight tracking-tight text-ink-900 sm:mt-1 sm:text-[0.95rem]">
        {highlight}
      </p>
      <div className="mt-auto rounded-md bg-ink-50 px-1.5 py-1 sm:rounded-lg sm:px-2 sm:py-1.5">
        <p className="line-clamp-1 text-[8px] font-bold uppercase tracking-wider text-ink-400">{footerLabel}</p>
        <p className="mt-0.5 line-clamp-2 text-[10px] font-semibold leading-snug text-ink-700">{footerValue}</p>
      </div>
    </div>
  );
}

function DisciplineRow({ name, timeLabel, accuracy, questions, maxMinutes, minutes }) {
  const width = Math.max(12, Math.round((minutes / Math.max(maxMinutes, 1)) * 100));

  return (
    <div className="rounded-2xl border border-ink-100 p-3.5 transition-all hover:border-[#1d4ed8]/25 hover:shadow-sm sm:p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink-800">{name}</p>
          <p className="mt-1 text-xs font-semibold text-ink-400">{questions} questões registradas</p>
        </div>
        <span className="rounded-full bg-[#EFF6FF] px-3 py-1 text-xs font-semibold text-[#1d4ed8]">{timeLabel}</span>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-widest text-ink-400">
          <span>Tempo relativo</span>
          <span>{accuracy}% de acurácia</span>
        </div>
        <div className="h-2.5 w-full rounded-full bg-ink-100 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-[#93C5FD] to-[#1d4ed8]" style={{ width: `${width}%` }} />
        </div>
      </div>
    </div>
  );
}

function TopicRow({ item }) {
  const color =
    item.pct >= 80 ? 'bg-emerald-500' : item.pct >= 60 ? 'bg-amber-500' : 'bg-rose-500';

  return (
    <div className="rounded-[1.5rem] border border-ink-100 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-ink-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-ink-500">
          {item.disc}
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-ink-400">{item.qTot} questões</span>
      </div>
      <p className="mt-3 text-sm font-bold text-ink-800">{item.topico}</p>
      <div className="mt-3 h-2.5 w-full rounded-full bg-ink-100 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${item.pct}%` }} />
      </div>
    </div>
  );
}

function InsightBullet({ title, text }) {
  return (
    <div className="rounded-xl border border-[#1d4ed8]/20 border-l-[3px] border-l-[#1d4ed8] bg-[#1d4ed8]/10 p-3 sm:rounded-2xl sm:p-3.5">
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-[#93C5FD] sm:text-xs">{title}</div>
      <p className="break-words text-[13px] font-medium leading-snug text-white/90 sm:text-sm sm:leading-relaxed">{text}</p>
    </div>
  );
}
