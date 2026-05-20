import React, { useMemo } from 'react';
import { ArrowRight, Bell, Flame, Play, Sparkles } from 'lucide-react';
import { buildStudyHistoryOverview, parseStudyTimeToMinutes, toDateKey, shiftDays } from '../lib/studyAnalytics';

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
  const safeReviewQueue = Array.isArray(studyRecommendation?.reviewQueue) ? studyRecommendation.reviewQueue : [];

  const historyOverview = useMemo(
    () => buildStudyHistoryOverview(safeHistorico, { dayGoalMinutes: 180 }),
    [safeHistorico]
  );

  const dayContextLabel = useMemo(
    () => new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }),
    []
  );

  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12 ? 'Bom dia' : currentHour < 18 ? 'Boa tarde' : 'Boa noite';

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
    if (hoje) return { badge: 'Hoje', badgeTone: 'warn', title: hoje.titulo || hoje.nome || 'Algo importante hoje', detail: hoje.detalhe || hoje.texto || 'Vale olhar a agenda antes de iniciar.' };
    if (amanha) return { badge: 'Amanhã', badgeTone: '', title: amanha.titulo || amanha.nome || 'Algo pede atenção amanhã', detail: amanha.detalhe || amanha.texto || 'Antecipe o que já estiver claro.' };
    if (targetDaysRemaining !== null && targetDaysRemaining <= 15) return { badge: 'Urgente', badgeTone: 'danger', title: 'Prova se aproximando', detail: `Faltam ${targetDaysRemaining} dia(s) para o alvo principal.` };
    if (urgentReviews > 0) return { badge: 'Revisões', badgeTone: 'warn', title: `${urgentReviews} revisão(ões) em alta prioridade`, detail: 'Existe espaço claro para reforço hoje.' };
    return { badge: 'Estável', badgeTone: 'success', title: 'Sem alerta crítico agora', detail: 'O melhor movimento é seguir a sessão sugerida.' };
  }, [safeAgendaHoje, safeAgendaAmanha, targetDaysRemaining, urgentReviews]);

  const cleanUserName = String(userDisplayName || '').trim();
  const greetingLine = cleanUserName || greeting;

  const heroTopic = primaryRecommendation?.nome || targetContest?.nome || null;
  const heroDetail = primaryRecommendation?.nextTopic?.nome || primaryRecommendation?.reason || null;

  const quickAction = primaryRecommendation
    ? { label: 'Papirar agora', onClick: () => onStartRecommendedSession?.(primaryRecommendation) }
    : { label: 'Papirar agora', onClick: () => openTimerSetup?.() };

  // Week bar data — last 7 days from safeHistorico
  const weekBars = useMemo(() => {
    const today = new Date();
    const dayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    return Array.from({ length: 7 }, (_, i) => {
      const date = shiftDays(today, i - 6);
      const key = toDateKey(date);
      const sessions = safeHistorico.filter((s) => {
        const sKey = String(s?.data || '').substring(0, 10);
        return sKey === key;
      });
      const minutes = sessions.reduce((acc, s) => acc + parseStudyTimeToMinutes(s?.duracao || s?.tempo || 0), 0);
      const topCounts = {};
      sessions.forEach((s) => { const d = s?.disciplina || s?.materia || ''; if (d) topCounts[d] = (topCounts[d] || 0) + 1; });
      const topDisciplina = Object.keys(topCounts).sort((a, b) => topCounts[b] - topCounts[a])[0] || '—';
      const isToday = i === 6;
      return { d: dayLabels[date.getDay()], m: minutes, top: topDisciplina, isToday };
    });
  }, [safeHistorico]);

  const weekMax = Math.max(...weekBars.map((b) => b.m), 60);
  const weekTotalLabel = (() => {
    const total = weekBars.reduce((a, b) => a + b.m, 0);
    const h = Math.floor(total / 60);
    const m = total % 60;
    return `${h}h${String(m).padStart(2, '0')} acumuladas`;
  })();

  return (
    <div
      className="pl-paper-bg"
      style={{ flex: 1, overflow: 'auto', padding: '32px 40px 56px' }}
    >
      {/* ── HERO ── */}
      <header style={{ display: 'flex', gap: 28, alignItems: 'flex-end' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="pl-eyebrow">
            {dayContextLabel}
            {historyOverview.streakDays > 0 && (
              <>
                <span style={{ margin: '0 8px', opacity: 0.5 }}>·</span>
                <span style={{ color: 'var(--pl-accent)' }}>
                  Você está papirando há {historyOverview.streakDays} {historyOverview.streakDays === 1 ? 'dia' : 'dias'}
                </span>
              </>
            )}
          </div>
          <h1 className="pl-display" style={{ margin: '12px 0 0', fontSize: 68, color: 'var(--pl-ink)' }}>
            {greeting}{cleanUserName ? `, ${cleanUserName}` : ''}<span style={{ color: 'var(--pl-accent)' }}>.</span>
          </h1>
          {(heroTopic || heroDetail) && (
            <p style={{ margin: '14px 0 0', fontSize: 17, fontWeight: 500, color: 'var(--pl-ink-2)', maxWidth: 640, lineHeight: 1.5 }}>
              {heroTopic && (
                <>Hoje a gente <span className="pl-mark-text">papira {heroTopic}</span>{heroDetail ? ` — ${heroDetail}` : '.'}</>
              )}
              {!heroTopic && heroDetail}
            </p>
          )}
          <div style={{ marginTop: 22, display: 'flex', gap: 10 }}>
            <button className="pl-btn pl-btn-primary pl-btn-lg" onClick={quickAction.onClick} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Play size={13} fill="currentColor" /> {quickAction.label}
            </button>
            <button
              className="pl-btn pl-btn-lg"
              onClick={() => targetContest?.id ? onOpenTargetContest?.(targetContest.id) : setActiveTab?.('planejamento')}
            >
              {targetContest?.id ? 'Abrir alvo' : 'Abrir planejamento'}
            </button>
          </div>
        </div>

        {/* Página de hoje */}
        <aside style={{
          width: 300, flexShrink: 0,
          background: 'var(--pl-surface)', border: '1px solid var(--pl-rule-2)',
          borderRadius: 6, padding: '18px 20px',
        }}>
          <div className="pl-eyebrow" style={{ fontSize: 10 }}>Próxima sessão</div>
          {primaryRecommendation ? (
            <>
              <div style={{ marginTop: 12, fontFamily: 'var(--pl-serif)', fontStyle: 'italic', fontWeight: 400, fontSize: 21, color: 'var(--pl-ink)', letterSpacing: '-0.02em', lineHeight: 1.25 }}>
                <span className="pl-mark-text">{primaryRecommendation.nome}</span>
              </div>
              {primaryRecommendation.nextTopic?.nome && (
                <p style={{ margin: '10px 0 14px', fontSize: 13, color: 'var(--pl-ink-3)', fontWeight: 500, lineHeight: 1.55 }}>
                  {primaryRecommendation.nextTopic.nome}
                </p>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 12, borderTop: '1px solid var(--pl-rule)' }}>
                <div className="pl-progress accent" style={{ flex: 1 }}>
                  <div className="fill" style={{ width: `${historyOverview.todayGoalProgress}%` }} />
                </div>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--pl-ink-3)', fontVariantNumeric: 'tabular-nums' }}>
                  {historyOverview.todayGoalProgress}% da meta
                </span>
              </div>
            </>
          ) : (
            <p style={{ marginTop: 12, fontSize: 13, color: 'var(--pl-ink-3)', fontWeight: 500, lineHeight: 1.55 }}>
              {targetContest?.nome
                ? `Concurso-alvo: ${targetContest.nome}`
                : 'Defina um concurso-alvo para ver a sessão sugerida aqui.'}
            </p>
          )}
        </aside>
      </header>

      <div className="pl-rule" style={{ margin: '28px 0 22px' }} />

      {/* ── KPI STRIP ── */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
        <PlKpi label="Papirado hoje" num={historyOverview.todayMinutesLabel} detail="Volume efetivo" />
        <PlKpi
          label="Sequência"
          num={String(historyOverview.streakDays)}
          unit="d"
          detail="dias sem falhar"
          icon={<Flame size={14} style={{ color: 'var(--pl-warn)' }} />}
        />
        <PlKpi label="Precisão" num={String(weeklyAccuracy)} unit="%" detail={`${totalAcertos} acertos · ${totalErros} erros`} />
        <PlKpi label="Meta diária" num={String(historyOverview.todayGoalProgress)} unit="%" detail="do objetivo de hoje" progress={historyOverview.todayGoalProgress / 100} />
        <PlKpi label="Revisões" num={String(urgentReviews).padStart(2, '0')} detail="Alta prioridade" accentColor={urgentReviews > 0 ? 'warn' : undefined} />
      </section>

      {/* ── TWO-COLUMN ── */}
      <section style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 18, marginTop: 24 }}>
        {/* Routine */}
        <div className="pl-card" style={{ padding: '20px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <div className="pl-eyebrow">Rotina do dia</div>
              <h2 style={{ margin: '6px 0 0', fontFamily: 'var(--pl-serif)', fontStyle: 'italic', fontWeight: 400, fontSize: 26, letterSpacing: '-0.025em', color: 'var(--pl-ink)' }}>
                {safeRoutine.length > 0
                  ? `${safeRoutine.length} bloco${safeRoutine.length !== 1 ? 's' : ''} pra papirar hoje`
                  : 'Nenhum bloco agendado'}
              </h2>
            </div>
            <button className="pl-btn-link" onClick={() => setActiveTab?.('planejamento')}>
              Abrir plano <ArrowRight size={12} />
            </button>
          </div>

          {safeRoutine.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--pl-ink-3)', fontWeight: 500, lineHeight: 1.6, padding: '16px 0' }}>
              Defina um concurso-alvo e registre mais estudo para montar sua rotina automaticamente.
            </p>
          ) : (
            <div>
              {safeRoutine.map((item, index) => (
                <PlRoutineRow
                  key={item.id || `r-${index}`}
                  index={index}
                  item={item}
                  isFirst={index === 0}
                  onStart={() => onStartRoutineItem?.(item.recommendation)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Reminder */}
          <div className="pl-card" style={{ padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className={`pl-tag${reminder.badgeTone ? ` pl-tag-${reminder.badgeTone}` : ''}`}>
                {reminder.badge}
              </span>
              <Bell size={14} style={{ color: 'var(--pl-ink-4)' }} />
            </div>
            <h3 style={{ margin: '12px 0 4px', fontSize: 16, fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--pl-ink)' }}>
              {reminder.title}
            </h3>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--pl-ink-3)', fontWeight: 500, lineHeight: 1.5 }}>
              {reminder.detail}
            </p>
          </div>

          {/* AI rec */}
          <div className="pl-card-ai">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="pl-tag-ai">
                <Sparkles size={10} /> Bizu IA
              </span>
              <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--pl-ink-3)', letterSpacing: '0.04em' }}>
                analisou seu desempenho
              </span>
            </div>
            {primaryRecommendation ? (
              <>
                <h3 style={{ margin: '12px 0 4px', fontSize: 16, fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--pl-ink)' }}>
                  {primaryRecommendation.nome}
                </h3>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--pl-ink-3)', fontWeight: 500, lineHeight: 1.5 }}>
                  {primaryRecommendation.reason || primaryRecommendation.nextTopic?.nome
                    ? <><span className="pl-mark-text">{primaryRecommendation.nextTopic?.nome || primaryRecommendation.nome}</span> é a próxima prioridade.</>
                    : 'Continue no mesmo ritmo — a constância é o que vence concurso.'}
                </p>
              </>
            ) : (
              <>
                <h3 style={{ margin: '12px 0 4px', fontSize: 16, fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--pl-ink)' }}>
                  Continue papirando
                </h3>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--pl-ink-3)', fontWeight: 500, lineHeight: 1.5 }}>
                  Registre mais sessões para o Bizu IA personalizar suas recomendações.
                </p>
              </>
            )}
            <button
              className="pl-btn pl-btn-sm pl-btn-ai"
              style={{ marginTop: 12 }}
              onClick={quickAction.onClick}
            >
              <Sparkles size={11} /> Iniciar sessão
            </button>
          </div>

          {/* Countdown */}
          <div className="pl-card-paper" style={{ padding: '14px 18px' }}>
            <div className="pl-eyebrow" style={{ fontSize: 10 }}>Concurso-alvo</div>
            {targetDaysRemaining !== null ? (
              <>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 8 }}>
                  <span className="pl-num" style={{ fontSize: 42, color: 'var(--pl-ink)' }}>{targetDaysRemaining}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--pl-ink-2)' }}>dias até a prova</span>
                </div>
                <p style={{ margin: '6px 0 0', fontSize: 12.5, color: 'var(--pl-ink-3)', fontWeight: 500 }}>
                  {targetContest?.nome || 'Concurso definido'}
                </p>
              </>
            ) : (
              <p style={{ marginTop: 10, fontSize: 13, color: 'var(--pl-ink-3)', fontWeight: 500, lineHeight: 1.5 }}>
                <button
                  className="pl-btn-link"
                  style={{ fontSize: 13 }}
                  onClick={() => setActiveTab?.('planejamento')}
                >
                  Definir concurso-alvo <ArrowRight size={11} />
                </button>
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ── WEEK CHART ── */}
      <section style={{ marginTop: 26 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <div className="pl-eyebrow">Esta semana</div>
            <h2 style={{ margin: '6px 0 0', fontFamily: 'var(--pl-serif)', fontStyle: 'italic', fontWeight: 400, fontSize: 26, letterSpacing: '-0.025em', color: 'var(--pl-ink)' }}>
              Tempo por dia · {weekTotalLabel}
            </h2>
          </div>
          <button className="pl-btn-link" onClick={() => setActiveTab?.('estatisticas')}>
            Estatísticas completas <ArrowRight size={12} />
          </button>
        </div>

        <div className="pl-card" style={{ padding: '22px 26px' }}>
          <PlWeekBars bars={weekBars} max={weekMax} />
        </div>
      </section>
    </div>
  );
}

// ── Helpers ──

function PlKpi({ label, num, unit, detail, icon, progress, accentColor }) {
  return (
    <div className="pl-card" style={{ padding: '14px 16px' }}>
      <div className="pl-eyebrow" style={{ fontSize: 10 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 6 }}>
        <span className="pl-num" style={{ fontSize: 38, color: 'var(--pl-ink)', lineHeight: 1 }}>{num}</span>
        {unit && <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--pl-ink-3)', marginLeft: 2 }}>{unit}</span>}
        {icon && <span style={{ marginLeft: 'auto' }}>{icon}</span>}
      </div>
      <div style={{
        fontSize: 11.5, fontWeight: 500, marginTop: 4,
        color: accentColor === 'warn' ? 'var(--pl-warn)' : 'var(--pl-ink-3)',
      }}>
        {detail}
      </div>
      {progress != null && (
        <div className="pl-progress accent" style={{ marginTop: 10 }}>
          <div className="fill" style={{ width: `${Math.min(progress * 100, 100)}%` }} />
        </div>
      )}
    </div>
  );
}

function PlRoutineRow({ item, onStart, index, isFirst }) {
  const isNow = isFirst;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0',
      borderBottom: '1px solid var(--pl-rule)',
    }}>
      <div style={{
        width: 4, height: 32, borderRadius: 2, flexShrink: 0,
        background: isNow ? 'var(--pl-accent)' : index === 1 ? 'var(--pl-ink-4)' : 'var(--pl-ink-5)',
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--pl-ink)' }}>
            {item.subtitle || item.tag || `Bloco ${index + 1}`}
          </span>
          {isNow && <span className="pl-tag pl-tag-accent">Agora</span>}
          {!isNow && index === 1 && <span className="pl-tag">Próximo</span>}
        </div>
        <div style={{ fontSize: 12, color: 'var(--pl-ink-3)', fontWeight: 500, marginTop: 2 }}>
          {item.detail}
          {item.duration && (
            <><span style={{ opacity: 0.5, margin: '0 6px' }}>·</span>{item.duration}</>
          )}
        </div>
      </div>
      <button
        onClick={onStart}
        className={isNow ? 'pl-btn pl-btn-primary pl-btn-sm' : 'pl-btn pl-btn-sm'}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0 }}
      >
        <Play size={10} fill="currentColor" /> {isNow ? 'Papirar' : 'Iniciar'}
      </button>
    </div>
  );
}

function PlWeekBars({ bars, max }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, height: 180 }}>
      {bars.map((it) => {
        const h = max > 0 ? (it.m / max) * 150 : 0;
        return (
          <div
            key={it.d + String(it.isToday)}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, height: '100%' }}
          >
            <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', width: '100%' }}>
              <div style={{
                width: '100%', height: Math.max(h, 4),
                background: it.isToday ? 'var(--pl-accent)' : 'var(--pl-ink-4)',
                borderRadius: '4px 4px 0 0', position: 'relative',
              }}>
                {it.m > 0 && (
                  <div style={{
                    position: 'absolute', top: -22, left: '50%', transform: 'translateX(-50%)',
                    fontFamily: 'var(--pl-serif)', fontStyle: 'italic', fontWeight: 400,
                    fontSize: 13, color: it.isToday ? 'var(--pl-accent)' : 'var(--pl-ink-2)',
                    letterSpacing: '-0.02em', whiteSpace: 'nowrap',
                  }}>
                    {`${Math.floor(it.m / 60)}:${String(it.m % 60).padStart(2, '0')}`}
                  </div>
                )}
              </div>
            </div>
            <div style={{
              fontSize: 11, fontWeight: 700,
              color: it.isToday ? 'var(--pl-accent)' : 'var(--pl-ink-3)',
              letterSpacing: '0.04em', textTransform: 'uppercase',
            }}>
              {it.d}
            </div>
            <div style={{ fontSize: 10, color: 'var(--pl-ink-4)', fontWeight: 500 }}>{it.top}</div>
          </div>
        );
      })}
    </div>
  );
}
