import React, { useMemo } from 'react';
import {
  ArrowRight,
  BellRing,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Flame,
  Home,
  Play,
  Sparkles,
  Target,
} from 'lucide-react';
import { buildStudyHistoryOverview } from '../lib/studyAnalytics';
import PageHeadPremium, { PageHeadPremiumBadge } from '../components/PageHeadPremium';

export default function Dashboard({
  openTimerSetup,
  setActiveTab,
  agendaHoje,
  agendaAmanha,
  historicoReal,
  userDisplayName = '',
  targetContest,
  studyRecommendation = null,
  dailyRoutine = [],
  onOpenTargetContest,
  onStartRecommendedSession,
  onStartRoutineItem,
}) {
  const safeHistorico = useMemo(() => (Array.isArray(historicoReal) ? historicoReal : []), [historicoReal]);
  const safeAgendaHoje = useMemo(() => (Array.isArray(agendaHoje) ? agendaHoje : []), [agendaHoje]);
  const safeAgendaAmanha = useMemo(() => (Array.isArray(agendaAmanha) ? agendaAmanha : []), [agendaAmanha]);
  const safeRoutine = Array.isArray(dailyRoutine) ? dailyRoutine.slice(0, 4) : [];
  const safeReviewQueue = Array.isArray(studyRecommendation?.reviewQueue)
    ? studyRecommendation.reviewQueue
    : [];
  const historyOverview = useMemo(
    () => buildStudyHistoryOverview(safeHistorico, { dayGoalMinutes: 180 }),
    [safeHistorico]
  );
  const dayContextLabel = useMemo(
    () => new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }),
    []
  );

  const currentHour = new Date().getHours();
  const timeTone =
    currentHour < 12
      ? {
          badge: 'Manhã',
          title: 'Seu foco principal precisa aparecer logo na primeira sessão.',
          greeting: 'Bom dia',
        }
      : currentHour < 18
        ? {
            badge: 'Tarde',
            title: 'Bom momento para consolidar com questões e revisões curtas.',
            greeting: 'Boa tarde',
          }
        : {
            badge: 'Noite',
            title: 'Feche o dia reforçando constância e organização.',
            greeting: 'Boa noite',
          };

  const primaryRecommendation = studyRecommendation?.primary || null;
  const targetDaysRemaining = Number.isFinite(Number(targetContest?.diasParaProva))
    ? Number(targetContest.diasParaProva)
    : null;
  const urgentReviews = safeReviewQueue.filter((item) => item?.urgencyLabel === 'Alta prioridade').length;

  const totalAcertos = safeHistorico.reduce((acc, item) => acc + Number(item?.acertos || 0), 0);
  const totalErros = safeHistorico.reduce((acc, item) => acc + Number(item?.erros || 0), 0);
  const totalQuestoes = totalAcertos + totalErros;
  const weeklyAccuracy = totalQuestoes > 0 ? Math.round((totalAcertos / totalQuestoes) * 100) : 0;

  const reminder = useMemo(() => {
    const hoje = safeAgendaHoje[0] || null;
    const amanha = safeAgendaAmanha[0] || null;

    if (hoje) {
      return {
        badge: 'Hoje',
        title: hoje.titulo || hoje.nome || 'Existe algo importante para hoje',
        detail: hoje.detalhe || hoje.texto || 'Vale olhar a agenda antes de iniciar.',
      };
    }

    if (amanha) {
      return {
        badge: 'Amanhã',
        title: amanha.titulo || amanha.nome || 'Algo pede atenção amanhã',
        detail: amanha.detalhe || amanha.texto || 'Antecipe o que já estiver claro.',
      };
    }

    if (targetDaysRemaining !== null && targetDaysRemaining <= 15) {
      return {
        badge: 'Urgente',
        title: 'Prova se aproximando',
        detail: `Faltam ${targetDaysRemaining} dia(s) para o alvo principal.`,
      };
    }

    if (urgentReviews > 0) {
      return {
        badge: 'Revisões',
        title: `${urgentReviews} revisão(ões) em alta prioridade`,
        detail: 'Existe espaço claro para reforço hoje.',
      };
    }

    return {
      badge: 'Estável',
      title: 'Sem alerta crítico agora',
      detail: 'O melhor movimento é seguir a sessão sugerida.',
    };
  }, [safeAgendaHoje, safeAgendaAmanha, targetDaysRemaining, urgentReviews]);

  const studySummaryTitle =
    primaryRecommendation?.nome || 'Nenhuma sessão recomendada neste momento';
  const studySummaryDetail =
    primaryRecommendation?.nextTopic?.nome ||
    primaryRecommendation?.reason ||
    'Registre mais estudos para o app montar a recomendação automaticamente.';
  const quickAction =
    primaryRecommendation
      ? {
          label: 'Iniciar sessão recomendada',
          onClick: () => onStartRecommendedSession?.(primaryRecommendation),
        }
      : {
          label: 'Abrir timer',
          onClick: () => openTimerSetup?.(),
        };
  const cleanUserName = String(userDisplayName || '').trim();
  const greetingLine = cleanUserName ? `${timeTone.greeting}, ${cleanUserName}` : timeTone.greeting;
  const heroDescription = primaryRecommendation
    ? `${studySummaryTitle}. ${studySummaryDetail}`
    : targetContest?.nome || 'Organize o dia a partir do próximo passo mais importante.';

  return (
    <div className="page-shell animate-in fade-in duration-500 !pt-4 sm:!pt-5">
      <PageHeadPremium
        icon={Home}
        titleAs="h1"
        badge={
          <PageHeadPremiumBadge icon={CalendarDays}>
            {timeTone.badge} · {dayContextLabel}
          </PageHeadPremiumBadge>
        }
        title={greetingLine}
        subtitle={heroDescription}
        trailing={
          <div className="flex w-full shrink-0 flex-wrap gap-2 sm:w-auto sm:justify-end sm:gap-2">
            <button
              type="button"
              onClick={quickAction.onClick}
              className="btn-primary inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold sm:px-3.5 sm:py-2 sm:text-[13px]"
            >
              <Play size={14} fill="currentColor" className="opacity-95" />
              {quickAction.label}
            </button>

            <button
              type="button"
              onClick={() =>
                targetContest?.id ? onOpenTargetContest?.(targetContest.id) : setActiveTab('planejamento')
              }
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:border-white/30 hover:bg-white/15 sm:px-3.5 sm:py-2 sm:text-[13px]"
            >
              {targetContest?.id ? 'Abrir alvo' : 'Abrir planejamento'}
              <ArrowRight size={14} strokeWidth={2} />
            </button>
          </div>
        }
      />

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <KpiCard label="Tempo hoje" value={historyOverview.todayMinutesLabel} detail="Volume efetivo" icon={Clock3} />
        <KpiCard
          label="Sequência"
          value={`${historyOverview.streakDays} dias`}
          detail="Consistência"
          icon={Flame}
        />
        <KpiCard label="Precisão (janela atual)" value={`${weeklyAccuracy}%`} detail={`${totalAcertos} acertos`} icon={Target} />
        <KpiCard
          label="Meta diária"
          value={`${historyOverview.todayGoalProgress}%`}
          detail="Meta diária do plano"
          icon={CheckCircle2}
        />
        <KpiCard
          label="Revisões"
          value={`${urgentReviews}`}
          detail="Em alta prioridade"
          icon={Sparkles}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,340px)] lg:items-start xl:grid-cols-[minmax(0,1.15fr)_minmax(280px,380px)]">
        <div className="section-card">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-2xs font-semibold uppercase tracking-wider text-slate-400">Rotina do dia</p>
              <h3 className="mt-1 text-base font-semibold text-slate-900 sm:text-lg">Próximos blocos de estudo</h3>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('planejamento')}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 transition hover:text-blue-900"
            >
              Ver planejamento
              <ArrowRight size={14} strokeWidth={2} />
            </button>
          </div>

          <div className="space-y-3">
            {safeRoutine.length === 0 ? (
              <EmptyState
                text="Defina um alvo e registre mais estudo para o app montar sua rotina automaticamente."
                actionLabel={targetContest?.id ? 'Abrir concurso-alvo' : 'Definir concurso-alvo'}
                onAction={() =>
                  targetContest?.id ? onOpenTargetContest?.(targetContest.id) : setActiveTab('planejamento')
                }
              />
            ) : (
              safeRoutine.map((item, index) => (
                <RoutineRow
                  key={item.id || `routine-${index}`}
                  index={index}
                  item={item}
                  onStart={() => onStartRoutineItem?.(item.recommendation)}
                />
              ))
            )}
          </div>
        </div>

        <div className="grid gap-4">
          <MiniPanel
            label="Lembrete"
            icon={<BellRing size={15} className="text-blue-700" strokeWidth={2} />}
            title={reminder.title}
            detail={reminder.detail}
            badge={reminder.badge}
            tone="brand"
            compact
          />

          <MiniPanel
            label="Resumo rápido"
            icon={<Sparkles size={15} className="text-blue-700" strokeWidth={2} />}
            title={studySummaryTitle}
            detail={
              primaryRecommendation
                ? `${studySummaryDetail} | média recente ${historyOverview.last7DaysAverageLabel}/dia`
                : studySummaryDetail
            }
            badge={primaryRecommendation?.studyModeLabel || 'Plano'}
            tone="brand"
            compact
          />

          <div className="section-card soft-accent">
            <div className="flex items-center gap-2">
              <CalendarDays size={15} className="text-blue-700" strokeWidth={2} />
              <p className="text-2xs font-semibold uppercase tracking-wider text-slate-500">Agenda curta</p>
            </div>

            <div className="mt-4 grid gap-3">
              <AgendaBlock title="Hoje" items={safeAgendaHoje.slice(0, 2)} emptyText="Nada urgente para hoje." />
              <AgendaBlock title="Amanhã" items={safeAgendaAmanha.slice(0, 2)} emptyText="Nada urgente para amanhã." />
              <button
                type="button"
                onClick={() => setActiveTab?.('lembretes')}
                className="btn-secondary w-full justify-center py-2.5"
              >
                Abrir calendário completo
                <ArrowRight size={14} strokeWidth={2} />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Badge({ label, tone = 'primary' }) {
  const classes =
    tone === 'secondary'
      ? 'border-slate-200 bg-slate-50 text-slate-600'
      : 'border-blue-100 bg-blue-50/90 text-blue-800';

  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${classes}`}
    >
      {label}
    </span>
  );
}

function KpiCard({ label, value, detail, icon: Icon }) {
  return (
    <div className="kpi-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-2xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
          <p className="mt-1.5 text-xl font-semibold tabular-nums leading-none tracking-tight text-slate-900 sm:text-2xl">
            {value}
          </p>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">{detail}</p>
        </div>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-blue-700 sm:h-9 sm:w-9">
          <Icon size={16} strokeWidth={2} />
        </div>
      </div>
    </div>
  );
}

function MiniPanel({ label, icon, title, detail, badge, tone = 'neutral', compact = false }) {
  const badgeClass =
    tone === 'brand'
      ? 'border border-blue-100 bg-blue-50 text-blue-800'
      : 'border border-slate-200 bg-slate-50 text-slate-600';

  return (
    <div className="section-card">
      <div className="flex items-center justify-between gap-3">
        <div className="text-2xs font-semibold uppercase tracking-wider text-slate-400">{label}</div>
        {icon}
      </div>

      <div className="mt-2.5 flex items-start justify-between gap-3">
        <p className={`font-semibold leading-snug text-slate-900 ${compact ? 'text-sm' : 'text-sm sm:text-base'}`}>{title}</p>
        <span
          className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${badgeClass}`}
        >
          {badge}
        </span>
      </div>

      <p className={`mt-2 leading-relaxed text-slate-500 ${compact ? 'line-clamp-2 text-xs' : 'text-sm'}`}>{detail}</p>
    </div>
  );
}

function RoutineRow({ item, onStart, index }) {
  const urgencyLabel = item?.priority === 'alta' ? 'ideal agora' : 'pode adiar';

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-slate-200/90 bg-white px-3 py-3 sm:px-4 md:flex-row md:items-center md:justify-between">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-sm font-semibold text-blue-800 sm:h-9 sm:w-9">
          {index + 1}
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-slate-900">{item.subtitle}</p>
            <span className="rounded-md border border-blue-100 bg-blue-50/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-800">
              {item.tag}
            </span>
            <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              {urgencyLabel}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-slate-500">{item.detail}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 md:shrink-0">
        <div className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm font-medium text-slate-700">
          {item.duration}
        </div>
        <button type="button" onClick={onStart} className="btn-primary py-2 pl-3 pr-3.5">
          <Play size={14} fill="currentColor" className="opacity-95" />
          Iniciar
        </button>
      </div>
    </div>
  );
}

function AgendaBlock({ title, items, emptyText }) {
  return (
    <div className="rounded-lg border border-slate-200/90 bg-slate-50/80 px-3 py-3 sm:px-4">
      <div className="inline-flex rounded-md border border-slate-200/80 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </div>

      {items.length === 0 ? (
        <p className="mt-3 text-sm text-slate-400">{emptyText}</p>
      ) : (
        <div className="mt-3 space-y-3">
          {items.map((item, index) => {
            const titleText =
              typeof item === 'string'
                ? item
                : item?.titulo || item?.nome || item?.texto || `Item ${index + 1}`;
            const detailText = typeof item === 'string' ? '' : item?.detalhe || '';
            const done = Boolean(item?.concluido);

            return (
              <div key={item?.id || `${title}-${index}`} className="flex items-start gap-3">
                <div className="mt-0.5">
                  {done ? (
                    <CheckCircle2 size={16} className="text-emerald-600" strokeWidth={2} />
                  ) : (
                    <CalendarDays size={16} className="text-blue-700" strokeWidth={2} />
                  )}
                </div>
                <div className="min-w-0">
                  <p className={`line-clamp-2 text-sm font-medium ${done ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                    {titleText}
                  </p>
                  {detailText ? <p className="mt-1 text-xs text-slate-500">{detailText}</p> : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EmptyState({ text, actionLabel = '', onAction = null }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-200/90 bg-slate-50/50 px-4 py-8 text-center text-sm leading-relaxed text-slate-500 sm:px-6 sm:py-10">
      {text}
      {actionLabel && typeof onAction === 'function' ? (
        <div className="mt-4">
          <button type="button" onClick={onAction} className="btn-secondary px-4 py-2">
            {actionLabel}
            <ArrowRight size={14} strokeWidth={2} />
          </button>
        </div>
      ) : null}
    </div>
  );
}

