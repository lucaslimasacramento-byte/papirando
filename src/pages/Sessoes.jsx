import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Pause,
  Play,
  Square,
  Target,
  Timer,
  Wind,
  Zap,
} from 'lucide-react';
import { buildStudyHistoryOverview } from '../lib/studyAnalytics';
import { supabase } from '../lib/supabase';

export default function Sessoes({
  currentUserId = '',
  customFocusTime,
  setCustomFocusTime,
  customPauseTime,
  setCustomPauseTime,
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
    const load = async () => {
      if (!currentUserId) { if (!ignore) setRecentSessions([]); return; }
      const { data, error } = await supabase
        .from('study_sessions')
        .select('disciplina, tipo, tempo, data, desempenho')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false })
        .limit(5);
      if (!ignore) setRecentSessions(!error && Array.isArray(data) ? data : []);
    };
    load();
    return () => { ignore = true; };
  }, [currentUserId]);

  const METHODS = [
    {
      key: 'pomodoro',
      title: 'Pomodoro',
      time: '25 min',
      desc: 'Foco / 5 min pausa. Excelente para consistência e início rápido.',
      onClick: () => startSpecificTimer?.('pomodoro', 25 * 60),
    },
    {
      key: 'flowtime',
      title: 'Flowtime',
      time: '50 min',
      desc: 'Foco / 10 min pausa. Ideal pra entrar em fluxo profundo.',
      onClick: () => startSpecificTimer?.('pomodoro', 50 * 60),
    },
    {
      key: 'ultradiante',
      title: 'Ultradiante',
      time: '90 min',
      desc: 'Foco / 20 min pausa. Para blocos pesados de teoria.',
      onClick: () => startSpecificTimer?.('pomodoro', 90 * 60),
    },
    {
      key: 'custom',
      title: 'Personalizado',
      time: 'Livre',
      desc: 'Defina foco e pausa do seu jeito para um bloco sob medida.',
      onClick: () => startSpecificTimer?.('custom', (customFocusTime || 25) * 60),
    },
  ];

  return (
    <div className="pl-paper-bg" style={{ flex: 1, overflow: 'auto', padding: '28px 36px 48px' }}>

      {/* ── HERO ── */}
      <header style={{ display: 'flex', gap: 28, alignItems: 'flex-end' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="pl-eyebrow">
            Área de foco
            <span style={{ margin: '0 8px', opacity: 0.5 }}>·</span>
            Sessões de estudo
          </div>
          <h1 className="pl-display" style={{ margin: '12px 0 0', fontSize: 64, color: 'var(--pl-ink)' }}>
            Inicia uma sessão<span style={{ color: 'var(--pl-accent)' }}>.</span>
          </h1>
          <p style={{ margin: '14px 0 0', fontSize: 16, fontWeight: 500, color: 'var(--pl-ink-2)', maxWidth: 560, lineHeight: 1.55 }}>
            Escolhe o método, dispara o timer, papira. Cada bloco registrado alimenta
            seu histórico e refina a recomendação do Bizu.
          </p>
          <div style={{ marginTop: 22, display: 'flex', gap: 10 }}>
            <button
              className="pl-btn pl-btn-primary pl-btn-lg"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
              onClick={() => openTimerSetup?.()}
            >
              <Play size={13} fill="currentColor" /> Iniciar timer
            </button>
            <button
              className="pl-btn pl-btn-lg"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
              onClick={() => setRegistroEstudoModalOpen?.(true)}
            >
              Registrar manual
            </button>
          </div>
        </div>

        {/* KPI strip (vertical aside) */}
        <aside style={{
          width: 260, flexShrink: 0,
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
        }}>
          <PlKpiMini label="Streak" num={String(historyOverview.streakDays)} unit="d" />
          <PlKpiMini label="Média 7d" num={historyOverview.last7DaysAverageLabel || '0h'} />
          <PlKpiMini label="Acurácia" num={String(historyOverview.overallAccuracy)} unit="%" />
          <PlKpiMini label="Revisões" num={String(urgentReviews).padStart(2, '0')} accent={urgentReviews > 0} />
        </aside>
      </header>

      <div className="pl-rule" style={{ margin: '28px 0 22px' }} />

      {/* ── TWO-COLUMN ── */}
      <section style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 18 }}>

        {/* Methods */}
        <div className="pl-card" style={{ padding: '20px 22px' }}>
          <div style={{ marginBottom: 18 }}>
            <div className="pl-eyebrow">Métodos de estudo</div>
            <h2 style={{
              margin: '6px 0 0', fontFamily: 'var(--pl-serif)', fontStyle: 'italic',
              fontWeight: 400, fontSize: 26, letterSpacing: '-0.025em', color: 'var(--pl-ink)',
            }}>
              Como você quer papirar hoje?
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {METHODS.map((m) => (
              <MethodCard key={m.key} {...m} />
            ))}
          </div>
        </div>

        {/* Right column: live + recommended */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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
          <RecommendedSessionCard
            recommendation={primaryRecommendation}
            onStart={() => onStartRecommendedSession?.(primaryRecommendation)}
            onOpenPlan={() => setActiveTab?.('planejamento')}
            onOpenRegister={() => setRegistroEstudoModalOpen?.(true)}
          />
        </div>
      </section>

      {/* ── RECENT SESSIONS ── */}
      <section style={{ marginTop: 26 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <div className="pl-eyebrow">Histórico recente</div>
            <h2 style={{
              margin: '6px 0 0', fontFamily: 'var(--pl-serif)', fontStyle: 'italic',
              fontWeight: 400, fontSize: 26, letterSpacing: '-0.025em', color: 'var(--pl-ink)',
            }}>
              Últimas sessões
            </h2>
          </div>
          <button
            className="pl-btn-link"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            onClick={() => setActiveTab?.('historico')}
          >
            Ver histórico completo <ArrowRight size={12} />
          </button>
        </div>

        <div className="pl-card" style={{ padding: '4px 0' }}>
          {recentSessions.length === 0 ? (
            <p style={{ padding: '20px 22px', fontSize: 13, color: 'var(--pl-ink-3)', fontWeight: 500 }}>
              Nenhuma sessão registrada ainda. Inicie seu primeiro timer!
            </p>
          ) : (
            recentSessions.map((session, i) => (
              <div key={`${session.disciplina || 'sess'}-${i}`} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 22px', borderBottom: i < recentSessions.length - 1 ? '1px solid var(--pl-rule)' : 'none',
                gap: 16,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--pl-ink)' }}>
                    {session.disciplina || 'Sessão'}
                  </span>
                  <span style={{ margin: '0 8px', color: 'var(--pl-ink-5)' }}>·</span>
                  <span style={{ fontSize: 12.5, color: 'var(--pl-ink-3)', fontWeight: 500 }}>
                    {session.tipo || 'Estudo'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                  <span className="pl-tag">{session.tempo || '—'}</span>
                  <span style={{ fontSize: 11.5, color: 'var(--pl-ink-4)', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
                    {session.data || '—'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function PlKpiMini({ label, num, unit, accent }) {
  return (
    <div className="pl-card-paper" style={{ padding: '12px 14px' }}>
      <div className="pl-eyebrow" style={{ fontSize: 9.5 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginTop: 4 }}>
        <span className="pl-num" style={{
          fontSize: 26, lineHeight: 1,
          color: accent ? 'var(--pl-warn)' : 'var(--pl-ink)',
        }}>{num}</span>
        {unit && <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--pl-ink-3)' }}>{unit}</span>}
      </div>
    </div>
  );
}

function MethodCard({ title, time, desc, onClick }) {
  return (
    <div
      className="pl-card"
      style={{ padding: '14px 16px', cursor: 'pointer', transition: 'background 0.1s' }}
      onClick={onClick}
      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--pl-bg-soft)'}
      onMouseLeave={(e) => e.currentTarget.style.background = 'var(--pl-surface)'}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--pl-ink)', letterSpacing: '-0.01em' }}>
          {title}
        </span>
        <span className="pl-tag pl-tag-accent">{time}</span>
      </div>
      <p style={{ margin: 0, fontSize: 12, color: 'var(--pl-ink-3)', fontWeight: 500, lineHeight: 1.5 }}>
        {desc}
      </p>
      <button
        className="pl-btn pl-btn-primary pl-btn-sm"
        style={{ marginTop: 12, width: '100%', justifyContent: 'center', display: 'inline-flex', alignItems: 'center', gap: 6 }}
        onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      >
        <Play size={10} fill="currentColor" /> Iniciar
      </button>
    </div>
  );
}

function LiveSessionCard({
  isTimerRunning, timerMode, activeTimerLabel, elapsedLabel,
  plannedDurationLabel, studySessionDraft,
  onOpenTimer, onPause, onResume, onStop, onRegister,
}) {
  return (
    <div style={{
      background: 'var(--pl-ink)', borderRadius: 6, padding: '20px 22px',
      color: 'var(--pl-bg)', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          height: 22, padding: '0 9px', borderRadius: 4,
          fontSize: 11, fontWeight: 700, letterSpacing: '0.01em',
          background: isTimerRunning ? 'rgba(77,124,63,0.30)' : 'rgba(255,255,255,0.12)',
          color: isTimerRunning ? '#9ecf8e' : 'rgba(243,239,229,0.6)',
          ...(isTimerRunning && { animation: 'pl-live-pulse 2s ease infinite' }),
        }}>
          <Activity size={10} /> {isTimerRunning ? 'Ao vivo' : 'Inativa'}
        </span>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(243,239,229,0.45)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          {timerMode === 'cronometro' ? 'Modo livre' : 'Pomodoro'} · {plannedDurationLabel}
        </span>
      </div>

      <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 600, color: 'var(--pl-bg)' }}>
        {isTimerRunning ? 'Timer ativo agora' : 'Nenhuma sessão rodando'}
      </h3>
      {studySessionDraft?.material && (
        <p style={{ margin: '0 0 12px', fontSize: 12.5, color: 'rgba(243,239,229,0.6)', fontWeight: 500 }}>
          {studySessionDraft.material}
          {studySessionDraft.categoria && ` · ${studySessionDraft.categoria}`}
        </p>
      )}

      {/* Big timer */}
      <div style={{
        margin: '16px 0',
        padding: '14px 18px',
        background: 'rgba(255,255,255,0.07)',
        borderRadius: 6,
        border: '1px solid rgba(255,255,255,0.10)',
      }}>
        <div style={{
          fontFamily: 'var(--pl-serif)', fontStyle: 'italic', fontWeight: 300,
          fontSize: 48, color: 'var(--pl-bg)', letterSpacing: '-0.04em', lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {activeTimerLabel}
        </div>
        <div style={{ marginTop: 6, fontSize: 11.5, color: 'rgba(243,239,229,0.5)', fontWeight: 500 }}>
          Tempo acumulado: {elapsedLabel}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {isTimerRunning ? (
          <button
            type="button" onClick={onPause}
            style={{
              height: 38, borderRadius: 6, border: '1px solid rgba(255,255,255,0.20)',
              background: 'rgba(255,255,255,0.10)', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              fontSize: 13, fontWeight: 600, color: 'var(--pl-bg)', fontFamily: 'var(--pl-sans)',
            }}
          >
            <Pause size={14} /> Pausar
          </button>
        ) : (
          <button
            type="button" onClick={onResume}
            style={{
              height: 38, borderRadius: 6, border: '1px solid rgba(255,255,255,0.20)',
              background: 'rgba(255,255,255,0.10)', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              fontSize: 13, fontWeight: 600, color: 'var(--pl-bg)', fontFamily: 'var(--pl-sans)',
            }}
          >
            <Play size={14} fill="currentColor" /> Retomar
          </button>
        )}
        <button
          type="button" onClick={onStop}
          style={{
            height: 38, borderRadius: 6, border: '1px solid rgba(185,28,28,0.5)',
            background: 'rgba(185,28,28,0.20)', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            fontSize: 13, fontWeight: 600, color: '#fca5a5', fontFamily: 'var(--pl-sans)',
          }}
        >
          <Square size={13} fill="currentColor" /> Encerrar
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
        <button
          type="button" onClick={onOpenTimer}
          style={{
            height: 34, borderRadius: 6, border: '1px solid rgba(255,255,255,0.12)',
            background: 'transparent', cursor: 'pointer',
            fontSize: 12.5, fontWeight: 600, color: 'rgba(243,239,229,0.65)', fontFamily: 'var(--pl-sans)',
          }}
        >
          Abrir overlay
        </button>
        <button
          type="button" onClick={onRegister}
          style={{
            height: 34, borderRadius: 6, border: '1px solid rgba(255,255,255,0.12)',
            background: 'transparent', cursor: 'pointer',
            fontSize: 12.5, fontWeight: 600, color: 'rgba(243,239,229,0.65)', fontFamily: 'var(--pl-sans)',
          }}
        >
          Registrar manual
        </button>
      </div>
    </div>
  );
}

function RecommendedSessionCard({ recommendation, onStart, onOpenPlan, onOpenRegister }) {
  return (
    <div className="pl-card-ai" style={{ flex: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <span className="pl-tag-ai">
          <BookOpen size={10} /> Bizu IA
        </span>
        <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--pl-ink-3)', letterSpacing: '0.04em' }}>
          próxima sessão sugerida
        </span>
      </div>
      <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--pl-ink)' }}>
        {recommendation?.nome || 'Aguardando dados'}
      </h3>
      <p style={{ margin: 0, fontSize: 12.5, color: 'var(--pl-ink-3)', fontWeight: 500, lineHeight: 1.5 }}>
        {recommendation
          ? `${recommendation.studyModeLabel || 'Teoria'} · ${recommendation.reason || 'Baseado no seu histórico'}`
          : 'Registre mais sessões para o Bizu personalizar suas recomendações.'}
      </p>
      {recommendation && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6,
          margin: '10px 0', padding: '10px 12px',
          background: 'var(--pl-bg-soft)', borderRadius: 6,
          border: '1px solid var(--pl-rule)',
        }}>
          <MiniInfo label="Tópico" value={recommendation.nextTopic?.nome || '—'} />
          <MiniInfo label="Duração" value={recommendation.suggestedDurationLabel || '45min'} />
          <MiniInfo label="Modo" value={recommendation.studyModeLabel || 'Teoria'} />
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
        <button
          className="pl-btn pl-btn-primary pl-btn-sm"
          style={{ justifyContent: 'center', display: 'inline-flex', alignItems: 'center', gap: 6 }}
          onClick={recommendation ? onStart : onOpenPlan}
        >
          <Play size={10} fill="currentColor" />
          {recommendation ? 'Começar' : 'Abrir plano'}
        </button>
        <button
          className="pl-btn pl-btn-sm"
          style={{ justifyContent: 'center', display: 'inline-flex', alignItems: 'center', gap: 6 }}
          onClick={onOpenRegister}
        >
          Registrar <ArrowRight size={11} />
        </button>
      </div>
    </div>
  );
}

function MiniInfo({ label, value }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div className="pl-eyebrow" style={{ fontSize: 9, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--pl-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {value}
      </div>
    </div>
  );
}
