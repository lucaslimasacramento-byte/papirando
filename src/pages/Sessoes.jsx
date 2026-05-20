import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  LayoutGrid,
  Pause,
  Play,
  ShieldCheck,
  Square,
  Target,
  Timer,
  Users,
  Wind,
  Zap,
} from 'lucide-react';
import { buildStudyHistoryOverview } from '../lib/studyAnalytics';
import PageHeadPremium, {
  PAGE_HEAD_PREMIUM_PRIMARY_ACTION_CLASS,
  PAGE_HEAD_PREMIUM_SECONDARY_ACTION_CLASS,
  PageHeadPremiumBadge,
} from '../components/PageHeadPremium';
import { supabase } from '../lib/supabase';

export default function Sessoes({
  currentUserId = '',
  customFocusTime,
  startSpecificTimer,
  openTimerSetup,
  setRegistroEstudoModalOpen,
  historicoReal = [],
  studyRecommendation = null,
  onStartRecommendedSession,
  setActiveTab,
  timerMode = 'cronometro',
  timerValue = 0,
  timerMax = 0,
  isTimerRunning = false,
  setIsTimerRunning,
  handleStopTimer,
  formatHHMMSS,
  studySessionDraft = null,
}) {
  const [recentSessions, setRecentSessions] = useState([]);

  const historyOverview = useMemo(
    () => buildStudyHistoryOverview(historicoReal, { dayGoalMinutes: 180 }),
    [historicoReal]
  );

  const primaryRecommendation = studyRecommendation?.primary || null;
  const urgentReviews = Array.isArray(studyRecommendation?.reviewQueue)
    ? studyRecommendation.reviewQueue.filter((item) => item?.urgencyLabel === 'Alta prioridade').length
    : 0;
  const activeTimerLabel =
    timerMode === 'cronometro'
      ? formatHHMMSS?.(timerValue || 0)
      : formatHHMMSS?.(Math.max(0, timerValue || 0));
  const elapsedLabel =
    timerMode === 'cronometro'
      ? formatHHMMSS?.(timerValue || 0)
      : formatHHMMSS?.(Math.max(0, (timerMax || 0) - (timerValue || 0)));
  const plannedDurationLabel =
    timerMode === 'cronometro' ? 'Livre' : formatHHMMSS?.(timerMax || 0);

  useEffect(() => {
    let ignore = false;

    const loadRecentSessions = async () => {
      if (!currentUserId) {
        if (!ignore) setRecentSessions([]);
        return;
      }

      const { data, error } = await supabase
        .from('study_sessions')
        .select('disciplina, tipo, tempo, data, desempenho')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.warn('[Sessoes] load recent sessions error:', error.message);
        if (!ignore) setRecentSessions([]);
        return;
      }

      if (!ignore) setRecentSessions(Array.isArray(data) ? data : []);
    };

    loadRecentSessions();
    return () => {
      ignore = true;
    };
  }, [currentUserId]);

  return (
    <div className="page-shell !h-auto flex flex-col !gap-3 !pb-8 !pt-4 animate-in fade-in duration-500 sm:!pt-5 lg:!gap-4">
      <PageHeadPremium
        className="gap-4"
        icon={Timer}
        badge={<PageHeadPremiumBadge icon={Zap}>Área de foco</PageHeadPremiumBadge>}
        title="Sessões de estudo"
        subtitle="Métodos de foco, timer global e registro do que você estudou."
        leadingClassName="min-w-0 shrink-0 lg:max-w-[26rem] xl:max-w-[28rem]"
        statGridClassName="grid min-h-0 w-full max-w-full grid-cols-2 gap-2.5 sm:max-w-[38rem] sm:grid-cols-4 sm:gap-3 sm:justify-items-stretch [&>*]:self-stretch sm:[&>*]:min-w-[7.25rem]"
        trailingClassName="w-full shrink-0 sm:w-auto"
        stats={[
          {
            key: 'streak',
            label: 'Streak',
            value: `${historyOverview.streakDays} dias`,
            icon: Zap,
            accent: 'orange',
            className: 'min-h-[5.2rem] sm:min-h-[5.5rem]',
          },
          {
            key: 'avg',
            label: 'Média 7d',
            value: historyOverview.last7DaysAverageLabel,
            icon: Clock,
            accent: 'blue',
            className: 'min-h-[5.2rem] sm:min-h-[5.5rem]',
          },
          {
            key: 'acc',
            label: 'Acurácia',
            value: `${historyOverview.overallAccuracy}%`,
            icon: Target,
            accent: 'emerald',
            className: 'min-h-[5.2rem] sm:min-h-[5.5rem]',
          },
          {
            key: 'rev',
            label: 'Revisões',
            value: `${urgentReviews}`,
            icon: CheckCircle2,
            accent: 'indigo',
            className: 'min-h-[5.2rem] sm:min-h-[5.5rem]',
          },
        ]}
        trailing={(
          <div className="flex w-full shrink-0 flex-col gap-2 md:flex-row md:items-center md:justify-end md:gap-2 lg:w-auto">
            <button
              type="button"
              onClick={() => openTimerSetup?.()}
              className={`${PAGE_HEAD_PREMIUM_PRIMARY_ACTION_CLASS} w-full md:w-auto`}
            >
              <Play size={14} fill="currentColor" className="opacity-95" aria-hidden />
              Abrir timer
            </button>
            <button
              type="button"
              onClick={() => setRegistroEstudoModalOpen?.(true)}
              className={`${PAGE_HEAD_PREMIUM_SECONDARY_ACTION_CLASS} w-full md:w-auto`}
            >
              <BookOpen size={14} aria-hidden />
              Registrar estudo
            </button>
          </div>
        )}
      />

      <div className="grid items-start gap-3 xl:grid-cols-[1.2fr_0.8fr] xl:gap-4">
        <div className="flex flex-col gap-2.5">
          <div className="section-card p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-ink-400">
                <LayoutGrid size={16} className="text-[#1d4ed8]" />
                Métodos de estudo
              </h3>

              <div className="flex flex-wrap items-center gap-2">
                <MethodPill icon={ShieldCheck} text="Ritmos clássicos" />
                <MethodPill icon={Users} text="Guiada" />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
              <MethodCard
                icon={Clock}
                iconWrap="bg-red-100 text-red-600"
                glow="bg-red-50"
                title="Pomodoro"
                description="25 min de foco / 5 min de pausa. Excelente para consistência e início rápido."
                hoverClass="hover:bg-red-600"
                onClick={() => startSpecificTimer('pomodoro', 25 * 60)}
              />

              <MethodCard
                icon={Wind}
                iconWrap="bg-purple-100 text-purple-600"
                glow="bg-purple-50"
                title="Flowtime"
                description="50 min de foco / 10 min de pausa. Ideal para entrar em fluxo profundo."
                hoverClass="hover:bg-purple-600"
                onClick={() => startSpecificTimer('pomodoro', 50 * 60)}
              />

              <MethodCard
                icon={Zap}
                iconWrap="bg-orange-100 text-orange-600"
                glow="bg-orange-50"
                title="Ultradiante"
                description="90 min de foco / 20 min de pausa. Para blocos pesados de teoria ou simulação."
                hoverClass="hover:bg-orange-600"
                onClick={() => startSpecificTimer('pomodoro', 90 * 60)}
              />

              <MethodCard
                icon={Activity}
                iconWrap="bg-emerald-100 text-emerald-600"
                glow="bg-emerald-50"
                title="Personalizado"
                description="Use o foco e pausa definidos por você para montar um bloco sob medida."
                hoverClass="hover:bg-emerald-600"
                onClick={() => startSpecificTimer('custom', customFocusTime * 60)}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <LiveSessionCard
            isTimerRunning={isTimerRunning}
            timerMode={timerMode}
            activeTimerLabel={activeTimerLabel || '00:00:00'}
            elapsedLabel={elapsedLabel || '00:00:00'}
            plannedDurationLabel={plannedDurationLabel || 'Livre'}
            studySessionDraft={studySessionDraft}
            onOpenTimer={openTimerSetup}
            onPause={() => setIsTimerRunning?.(false)}
            onResume={() => setIsTimerRunning?.(true)}
            onStop={handleStopTimer}
            onRegister={() => setRegistroEstudoModalOpen?.(true)}
          />
          <div>
            <RecommendedSessionCard
              recommendation={primaryRecommendation}
              onStart={() => onStartRecommendedSession?.(primaryRecommendation)}
              onOpenPlan={() => setActiveTab?.('planejamento')}
              onOpenRegister={() => setRegistroEstudoModalOpen?.(true)}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="custom-scrollbar flex min-w-0 flex-col pr-0.5">
          <div className="section-card p-4 sm:p-5">
            <div className="mb-3 flex items-center gap-2">
              <Clock size={16} className="text-[#1d4ed8]" />
              <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-400">Últimas sessões</h3>
            </div>

            {recentSessions.length === 0 ? (
              <p className="text-sm font-medium text-ink-500">
                Nenhuma sessão registrada ainda. Inicie seu primeiro timer!
              </p>
            ) : (
              <div className="space-y-3">
                {recentSessions.map((session, index) => (
                  <div
                    key={`${session.disciplina || 'sessao'}-${session.data || index}-${index}`}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink-200 bg-ink-50 px-4 py-3"
                  >
                    <p className="text-sm font-semibold text-ink-800">{session.disciplina || 'Sessão'}</p>
                    <p className="text-sm font-semibold text-ink-500">
                      {session.tipo || 'Estudo'} | {session.tempo || '00:00:00'} | {session.data || 'Sem data'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function LiveSessionCard({
  isTimerRunning,
  timerMode,
  activeTimerLabel,
  elapsedLabel,
  plannedDurationLabel,
  studySessionDraft,
  onOpenTimer,
  onPause,
  onResume,
  onStop,
  onRegister,
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-ink-800 bg-ink-900 p-5 text-white shadow-md ring-1 ring-[#1d4ed8]/20 sm:p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(37,99,235,0.12),transparent_55%)]" />
      <div className="relative z-10">
      <div className="inline-flex items-center gap-2 rounded-full border border-[#1d4ed8]/35 bg-[#1d4ed8]/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#BFDBFE]">
        <Activity size={12} className="text-[#93C5FD]" />
        Sessão ao vivo
      </div>

      <h3 className="mt-4 text-xl font-semibold sm:text-2xl">
        {isTimerRunning ? 'Timer ativo agora' : 'Nenhuma sessão rodando'}
      </h3>
      <p className="mt-2 text-sm font-medium leading-relaxed text-ink-300">
        {studySessionDraft?.material
          ? `${studySessionDraft.material} | ${studySessionDraft.categoria || 'Estudo'}`
          : 'Abra um timer, retome do overlay global ou registre a sessão manualmente.'}
      </p>

      <div className="mt-5 rounded-2xl border border-[#1d4ed8]/20 bg-white/10 p-4 sm:p-5">
        <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-[#93C5FD]/90">
          <span>{timerMode === 'cronometro' ? 'Modo livre' : 'Pomodoro'}</span>
          <span>{plannedDurationLabel}</span>
        </div>
        <div className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">{activeTimerLabel}</div>
        <p className="mt-2 text-sm text-ink-300">Tempo acumulado: {elapsedLabel}</p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:gap-3">
        {isTimerRunning ? (
          <button
            type="button"
            onClick={onPause}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-ink-900 transition hover:bg-ink-100"
          >
            <Pause size={16} />
            Pausar
          </button>
        ) : (
          <button
            type="button"
            onClick={onResume}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-ink-900 transition hover:bg-ink-100"
          >
            <Play size={16} fill="currentColor" />
            Retomar
          </button>
        )}

        <button
          type="button"
          onClick={onStop}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-600"
        >
          <Square size={16} fill="currentColor" />
          Encerrar
        </button>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2 sm:gap-3">
        <button
          type="button"
          onClick={onOpenTimer}
          className="rounded-xl border border-[#1d4ed8]/30 bg-[#1d4ed8]/10 px-3 py-2.5 text-xs font-bold text-[#E0E7FF] transition hover:bg-[#1d4ed8]/20 sm:rounded-2xl sm:px-4 sm:py-3 sm:text-sm"
        >
          Abrir overlay
        </button>
        <button
          type="button"
          onClick={onRegister}
          className="rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-xs font-bold text-ink-200 transition hover:bg-white/10 sm:rounded-2xl sm:px-4 sm:py-3 sm:text-sm"
        >
          Registrar manual
        </button>
      </div>
      </div>
    </div>
  );
}

function RecommendedSessionCard({ recommendation, onStart, onOpenPlan, onOpenRegister }) {
  return (
    <div className="section-card min-h-0 border-blue-100/50 p-3">
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-400">
        <BookOpen size={13} className="text-[#1d4ed8]" />
        Próxima sessão sugerida
      </div>

      <h3 className="mt-2 text-base font-semibold leading-tight text-ink-900 sm:text-lg">
        {recommendation?.nome || 'Sem recomendação suficiente ainda'}
      </h3>
      <p className="mt-1 text-xs leading-snug text-ink-500">
        {recommendation
          ? `${recommendation.studyModeLabel} | ${recommendation.reason}`
          : 'Registre mais histórico para o motor inteligente entender o melhor bloco para agora.'}
      </p>

      <div className="mt-2 grid grid-cols-3 gap-2 rounded-xl border border-ink-200 bg-ink-50 p-2.5">
        <MiniInfo label="Tópico" value={recommendation?.nextTopic?.nome || 'Aguardando dados'} />
        <MiniInfo label="Duração" value={recommendation?.suggestedDurationLabel || '0h 45m'} />
        <MiniInfo label="Modo" value={recommendation?.studyModeLabel || 'Teoria'} />
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={recommendation ? onStart : onOpenPlan}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#1d4ed8] px-2.5 py-2 text-[11px] font-semibold text-white shadow-sm transition hover:bg-[#1D4ED8] sm:text-xs"
        >
          <Play size={14} fill="currentColor" />
          {recommendation ? 'Começar sugerida' : 'Abrir plano'}
        </button>
        <button
          type="button"
          onClick={onOpenRegister}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-ink-200 bg-white px-2.5 py-2 text-[11px] font-semibold text-ink-700 transition hover:bg-ink-50 sm:text-xs"
        >
          Registrar
          <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );
}

function MiniInfo({ label, value }) {
  return (
    <div className="min-w-0">
      <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-ink-400">{label}</p>
      <p className="mt-0.5 truncate text-[11px] font-semibold text-ink-800 sm:text-xs">{value}</p>
    </div>
  );
}

function MethodPill({ icon: Icon, text }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-ink-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-ink-600 shadow-sm">
      <Icon size={13} className="text-[#1d4ed8]" />
      {text}
    </div>
  );
}

function MethodCard({ icon: Icon, iconWrap, glow, title, description, hoverClass, onClick }) {
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-3xl border border-ink-100 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg sm:p-6">
      <div className={`absolute -mr-8 -mt-8 h-20 w-20 rounded-bl-[3rem] transition-transform group-hover:scale-110 ${glow} right-0 top-0`} />

      <div className={`relative z-10 mb-4 flex h-12 w-12 items-center justify-center rounded-xl sm:mb-5 sm:h-14 sm:w-14 sm:rounded-2xl ${iconWrap}`}>
        <Icon size={24} />
      </div>

      <h4 className="compact-title mb-1.5 text-base sm:text-lg">{title}</h4>
      <p className="mb-5 flex-1 text-xs font-bold leading-relaxed text-ink-400 sm:mb-6 sm:text-sm">{description}</p>

      <button
        type="button"
        onClick={onClick}
        className={`group/button flex w-full items-center justify-center gap-2 rounded-xl bg-ink-900 py-3 text-sm font-semibold text-white shadow-md transition-all sm:rounded-2xl sm:py-3.5 sm:text-base ${hoverClass}`}
      >
        Iniciar
        <ArrowRight size={18} className="transition-transform group-hover/button:translate-x-2" />
      </button>
    </div>
  );
}

