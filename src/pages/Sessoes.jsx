import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Flame,
  LayoutGrid,
  Pause,
  Play,
  ShieldCheck,
  Sparkles,
  Square,
  Target,
  Timer,
  Users,
  Wind,
  Zap,
} from 'lucide-react';
import { buildStudyHistoryOverview } from '../lib/studyAnalytics';
import { supabase } from '../lib/supabase';

const METODOS = [
  { id: 'pomodoro', nome: 'Pomodoro', eyebrow: 'Foco curto', foco: 25, pausa: 5, tom: 'highlight', desc: 'Excelente pra começar o dia e ganhar consistência sem cansar.' },
  { id: 'flowtime', nome: 'Flowtime', eyebrow: 'Foco médio', foco: 50, pausa: 10, tom: 'accent', desc: 'Ideal pra entrar em fluxo profundo numa matéria só.' },
  { id: 'ultradiante', nome: 'Ultradiante', eyebrow: 'Foco longo', foco: 90, pausa: 20, tom: 'warn', desc: 'Bloco pesado de teoria, leitura corrida ou simulação inteira.' },
  { id: 'personalizado', nome: 'Personalizado', eyebrow: 'Sob medida', foco: null, pausa: null, tom: 'success', desc: 'Você define o foco e a pausa. Bom pra rotinas já mapeadas.' },
];

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
  const [recentSessionsError, setRecentSessionsError] = useState(false);
  const [tipo, setTipo] = useState('classicos');

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
        console.error('[Sessoes] erro ao carregar sessões recentes:', error.message || error);
        if (!ignore) {
          setRecentSessions([]);
          setRecentSessionsError(true);
        }
        return;
      }
      if (!ignore) {
        setRecentSessions(Array.isArray(data) ? data : []);
        setRecentSessionsError(false);
      }
    };
    loadRecentSessions();
    return () => {
      ignore = true;
    };
  }, [currentUserId]);

  const startMetodo = (metodo) => {
    if (metodo.id === 'personalizado') {
      if (Number(customFocusTime || 0) > 0) startSpecificTimer?.('custom', Number(customFocusTime) * 60);
      else openTimerSetup?.();
      return;
    }
    startSpecificTimer?.('pomodoro', Number(metodo.foco || 25) * 60);
  };

  return (
    <div className="pl-page">
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <SessoesHeader
          onRegistrar={() => setRegistroEstudoModalOpen?.(true)}
          onAbrirTimer={() => openTimerSetup?.()}
        />

        <KpiStrip overview={historyOverview} urgentReviews={urgentReviews} />

        <section className="sessoes-main-grid">
          <MetodosCard tipo={tipo} setTipo={setTipo} onIniciar={startMetodo} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <SessaoAoVivoCard
              isRunning={isTimerRunning}
              modo={timerMode}
              tempoStr={activeTimerLabel || '00:00:00'}
              acumuladoStr={elapsedLabel || '00:00:00'}
              draft={studySessionDraft}
              onRetomar={() => setIsTimerRunning?.(true)}
              onEncerrar={handleStopTimer}
              onAbrirOverlay={() => openTimerSetup?.()}
              onRegistrarManual={() => setRegistroEstudoModalOpen?.(true)}
            />
            <ProximaSessaoCard
              recommendation={primaryRecommendation}
              onAbrirPlano={() => setActiveTab?.('planejamento')}
              onRegistrar={() => setRegistroEstudoModalOpen?.(true)}
              onStart={() => onStartRecommendedSession?.(primaryRecommendation)}
            />
          </div>
        </section>

        <RecentSessionsCard sessions={recentSessions} loadError={recentSessionsError} />
      </div>
    </div>
  );
}

function SessoesHeader({ onRegistrar, onAbrirTimer }) {
  return (
    <header style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 32, alignItems: 'end' }}>
      <div>
          <span className="pl-eyebrow">Área de foco</span>
          <h1 className="pl-display" style={{ margin: 0, fontSize: 56, color: 'var(--pl-ink)' }}>
            Sessões de estudo<span style={{ color: 'var(--pl-accent)' }}>.</span>
          </h1>
          <p style={{ margin: '12px 0 0', fontSize: 15, fontWeight: 500, color: 'var(--pl-ink-2)', maxWidth: 660, lineHeight: 1.5 }}>
            Escolha um método, acompanhe o timer global e registre o que você estudou sem sair do fluxo.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button type="button" className="pl-btn pl-btn-primary" onClick={onAbrirTimer}>
            <Play size={15} fill="currentColor" />
            Abrir timer
          </button>
          <button type="button" className="pl-btn pl-btn-secondary" onClick={onRegistrar}>
            <BookOpen size={14} />
            Registrar estudo
          </button>
        </div>
    </header>
  );
}

function KpiStrip({ overview, urgentReviews }) {
  return (
    <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}>
      <SessionKpi icon={Flame} label="Streak" value={`${overview.streakDays} dias`} sub="sequência atual" tone="warn" />
      <SessionKpi icon={Clock} label="Média 7d" value={overview.last7DaysAverageLabel} sub="tempo médio" tone="accent" />
      <SessionKpi icon={Target} label="Acurácia" value={`${overview.overallAccuracy}%`} sub="questões registradas" tone="success" />
      <SessionKpi icon={CheckCircle2} label="Revisões" value={urgentReviews} sub="alta prioridade" tone="warn" />
    </section>
  );
}

function SessionKpi({ icon: Icon, label, value, sub, tone }) {
  const toneClass = tone === 'success' ? 'pl-tag-success' : tone === 'warn' ? 'pl-tag-warn' : 'pl-tag-accent';
  return (
    <div className="pl-card" style={{ padding: 18 }}>
      <span className={`pl-tag ${toneClass}`}><Icon size={12} />{label}</span>
      <div className="pl-serif-number" style={{ marginTop: 12, fontSize: 36, lineHeight: 1 }}>{value}</div>
      <p className="pl-muted" style={{ margin: '6px 0 0', fontSize: 13 }}>{sub}</p>
    </div>
  );
}

function MetodosCard({ tipo, setTipo, onIniciar }) {
  return (
    <section className="pl-card" style={{ padding: 22 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'end', marginBottom: 16 }}>
        <div>
          <div className="pl-overline">Métodos de estudo</div>
          <h2 className="pl-section-title" style={{ marginTop: 7 }}>Qual ritmo hoje?</h2>
        </div>
        <div className="planning-segment">
          <button type="button" className={tipo === 'classicos' ? 'is-active' : ''} onClick={() => setTipo('classicos')}>
            <ShieldCheck size={13} />
            Ritmos clássicos
          </button>
          <button type="button" className={tipo === 'guiada' ? 'is-active' : ''} onClick={() => setTipo('guiada')}>
            <Users size={13} />
            Guiada
          </button>
        </div>
      </div>
      <div className="sessoes-method-grid">
        {METODOS.map((metodo) => (
          <MetodoCard key={metodo.id} metodo={metodo} onIniciar={() => onIniciar(metodo)} />
        ))}
      </div>
    </section>
  );
}

function MetodoCard({ metodo, onIniciar }) {
  const tagClass = metodo.tom === 'success' ? 'pl-tag-success' : metodo.tom === 'warn' ? 'pl-tag-warn' : metodo.tom === 'highlight' ? 'pl-tag-highlight' : 'pl-tag-accent';
  return (
    <article className="pl-card sessoes-method-card">
      <div className="sessoes-dog-ear" />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <span className={`pl-tag ${tagClass}`} style={{ textTransform: 'uppercase', fontSize: 10 }}>{metodo.eyebrow}</span>
        <span className="pl-serif-number" style={{ fontSize: 13, color: 'var(--pl-ink-3)' }}>
          {metodo.foco ? `${metodo.foco}/${metodo.pausa}min` : 'sob medida'}
        </span>
      </div>
      <div>
        <h3 className="pl-section-title" style={{ fontSize: 26 }}>{metodo.nome}</h3>
        <p className="pl-muted" style={{ margin: '8px 0 0', fontSize: 12.5, lineHeight: 1.45 }}>{metodo.desc}</p>
      </div>
      <button type="button" className="pl-btn pl-btn-primary" onClick={onIniciar} style={{ marginTop: 'auto', justifyContent: 'center' }}>
        <Play size={13} fill="currentColor" />
        Iniciar
      </button>
    </article>
  );
}

function SessaoAoVivoCard({ isRunning, modo, tempoStr, acumuladoStr, draft, onRetomar, onEncerrar, onAbrirOverlay, onRegistrarManual }) {
  return (
    <section className="pl-card sessoes-live-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--pl-success)' }} />
          <span className="pl-eyebrow" style={{ color: 'rgba(243,239,229,0.7)' }}>Sessão ao vivo</span>
        </span>
        <span className="pl-eyebrow" style={{ color: 'rgba(243,239,229,0.5)' }}>{modo}</span>
      </div>

      <div>
        <h3 className="pl-display" style={{ fontSize: 30, color: 'var(--pl-bg)' }}>
          {isRunning ? 'Sessão em andamento' : 'Nenhuma sessão rodando'}
        </h3>
        <p style={{ margin: '8px 0 0', fontSize: 12.5, color: 'rgba(243,239,229,0.62)', lineHeight: 1.5 }}>
          {draft?.material ? `${draft.material} · ${draft.categoria || 'Estudo'}` : 'Abra um timer, retome o overlay global ou registre uma sessão manual.'}
        </p>
      </div>

      <div className="sessoes-timer-box">
        <div className="pl-serif-number" style={{ fontSize: 48, lineHeight: 1, color: 'var(--pl-bg)' }}>{tempoStr}</div>
        <div className="pl-eyebrow" style={{ marginTop: 8, color: 'rgba(243,239,229,0.55)' }}>Tempo acumulado: {acumuladoStr}</div>
      </div>

      <div className="sessoes-dark-actions">
        <DarkBtn variant="light" onClick={onRetomar}><Play size={14} fill="currentColor" /> Retomar</DarkBtn>
        <DarkBtn variant="danger" onClick={onEncerrar}><Square size={13} fill="currentColor" /> Encerrar</DarkBtn>
        <DarkBtn variant="outline" onClick={onAbrirOverlay}><Timer size={13} /> Abrir overlay</DarkBtn>
        <DarkBtn variant="outline" onClick={onRegistrarManual}><BookOpen size={13} /> Registrar manual</DarkBtn>
      </div>
    </section>
  );
}

function DarkBtn({ variant, onClick, children }) {
  return (
    <button type="button" className={`sessoes-dark-btn ${variant}`} onClick={onClick}>
      {children}
    </button>
  );
}

function ProximaSessaoCard({ recommendation, onAbrirPlano, onRegistrar, onStart }) {
  const hasData = Boolean(recommendation);
  return (
    <section className="pl-card-paper" style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Sparkles size={13} />
        <span className="pl-overline">Próxima sessão sugerida</span>
      </div>
      <h3 className="pl-section-title" style={{ fontSize: 24, marginTop: 12 }}>
        {recommendation?.nome || 'Aguardando dados'}
      </h3>
      <p className="pl-muted" style={{ margin: '8px 0 0', fontSize: 13, lineHeight: 1.45 }}>
        {recommendation ? recommendation.reason : 'Registre mais histórico para o motor inteligente sugerir o melhor bloco.'}
      </p>
      <div className="sessoes-next-grid">
        <NextStat label="Tópico" value={recommendation?.nextTopic?.nome || 'Aguardando dados'} muted={!hasData} />
        <NextStat label="Duração" value={recommendation?.suggestedDurationLabel || '0h45m'} />
        <NextStat label="Modo" value={recommendation?.studyModeLabel || 'Teoria'} />
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button type="button" className="pl-btn pl-btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={onAbrirPlano}>Abrir plano</button>
        <button type="button" className="pl-btn pl-btn-primary pl-btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={hasData ? onStart : onRegistrar}>
          Registrar <ArrowRight size={13} />
        </button>
      </div>
    </section>
  );
}

function NextStat({ label, value, muted }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div className="pl-overline" style={{ fontSize: 9 }}>{label}</div>
      <strong style={{ display: 'block', marginTop: 4, fontSize: 12, color: muted ? 'var(--pl-ink-4)' : 'var(--pl-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {value}
      </strong>
    </div>
  );
}

function RecentSessionsCard({ sessions, loadError = false }) {
  return (
    <section className="pl-card" style={{ padding: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Clock size={16} />
        <div className="pl-overline">Últimas sessões</div>
      </div>
      {loadError ? (
        <p style={{ margin: 0, fontSize: 12.5, fontWeight: 600, color: 'var(--pl-warn)' }}>
          Não foi possível carregar suas sessões recentes. Recarregue a página para tentar de novo.
        </p>
      ) : sessions.length === 0 ? (
        <p className="pl-muted" style={{ margin: 0 }}>Nenhuma sessão registrada ainda. Inicie seu primeiro timer.</p>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {sessions.map((session, index) => (
            <div key={`${session.disciplina || 'sessao'}-${session.data || index}-${index}`} className="sessoes-recent-row">
              <strong>{session.disciplina || 'Sessão'}</strong>
              <span>{session.tipo || 'Estudo'} · {session.tempo || '00:00:00'} · {session.data || 'Sem data'}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
