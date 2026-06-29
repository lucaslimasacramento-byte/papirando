import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  FileText,
  Flame,
  Play,
  Sparkles,
  Star,
  Target,
  Trophy,
  Zap,
} from 'lucide-react';
import { buildStudyHistoryOverview, dailyGoalMinutesFromWeeklyHours, parseStudyTimeToMinutes, shiftDays, toDateKey } from '../lib/studyAnalytics';

export default function Dashboard({
  openTimerSetup,
  setActiveTab,
  agendaHoje,
  agendaAmanha,
  historicoReal,
  userDisplayName = '',
  metaHorasSemana,
  targetContest,
  studyRecommendation = null,
  dailyRoutine = [],
  ultimaAnotacao = null,
  editalProgresso = null,
  onOpenTargetContest,
  onStartRecommendedSession,
  onStartRoutineItem,
  onOpenUltimaAnotacao,
}) {
  const safeHistorico = useMemo(() => (Array.isArray(historicoReal) ? historicoReal : []), [historicoReal]);
  const safeAgendaHoje = useMemo(() => (Array.isArray(agendaHoje) ? agendaHoje : []), [agendaHoje]);
  const safeAgendaAmanha = useMemo(() => (Array.isArray(agendaAmanha) ? agendaAmanha : []), [agendaAmanha]);
  const safeRoutine = Array.isArray(dailyRoutine) ? dailyRoutine.slice(0, 6) : [];
  const safeReviewQueue = Array.isArray(studyRecommendation?.reviewQueue) ? studyRecommendation.reviewQueue : [];

  const dayGoalMinutes = dailyGoalMinutesFromWeeklyHours(metaHorasSemana);
  const historyOverview = useMemo(
    () => buildStudyHistoryOverview(safeHistorico, { dayGoalMinutes }),
    [safeHistorico, dayGoalMinutes]
  );

  const dayContextLabel = useMemo(
    () => new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }),
    []
  );

  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'Bom dia' : currentHour < 18 ? 'Boa tarde' : 'Boa noite';
  const cleanUserName = String(userDisplayName || '').trim();
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
        badgeTone: 'warn',
        title: hoje.titulo || hoje.nome || 'Algo importante hoje',
        detail: hoje.detalhe || hoje.texto || 'Vale olhar a agenda antes de iniciar.',
      };
    }
    if (amanha) {
      return {
        badge: 'Amanhã',
        badgeTone: '',
        title: amanha.titulo || amanha.nome || 'Algo pede atenção amanhã',
        detail: amanha.detalhe || amanha.texto || 'Antecipe o que já estiver claro.',
      };
    }
    if (targetDaysRemaining !== null && targetDaysRemaining <= 15) {
      return {
        badge: 'Urgente',
        badgeTone: 'danger',
        title: 'Prova se aproximando',
        detail: `Faltam ${targetDaysRemaining} dia(s) para o alvo principal.`,
      };
    }
    if (urgentReviews > 0) {
      return {
        badge: 'Revisões',
        badgeTone: 'warn',
        title: `${urgentReviews} revisão(ões) em alta prioridade`,
        detail: 'Existe espaço claro para reforço hoje.',
      };
    }
    return {
      badge: 'Estável',
      badgeTone: 'success',
      title: 'Sem alerta crítico agora',
      detail: 'O melhor movimento é seguir a sessão sugerida.',
    };
  }, [safeAgendaHoje, safeAgendaAmanha, targetDaysRemaining, urgentReviews]);

  const heroTopic = primaryRecommendation?.nome || targetContest?.nome || null;
  const heroDetail = primaryRecommendation?.nextTopic?.nome || primaryRecommendation?.reason || null;
  const quickAction = {
    label: 'Papirar agora',
    // Cadeia de fallback — o clique nunca pode ser um no-op silencioso.
    onClick: () => {
      if (primaryRecommendation && typeof onStartRecommendedSession === 'function') {
        onStartRecommendedSession(primaryRecommendation);
        return;
      }
      if (typeof openTimerSetup === 'function') {
        openTimerSetup();
        return;
      }
      setActiveTab?.('sessoes');
    },
  };

  const weekBars = useMemo(() => {
    const today = new Date();
    const dayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
    return Array.from({ length: 7 }, (_, i) => {
      const date = shiftDays(today, i - 6);
      const key = toDateKey(date);
      const sessions = safeHistorico.filter((s) => String(s?.data || '').substring(0, 10) === key);
      const minutes = sessions.reduce((acc, s) => acc + parseStudyTimeToMinutes(s?.duracao || s?.tempo || 0), 0);
      const topCounts = {};
      sessions.forEach((s) => {
        const disciplina = s?.disciplina || s?.materia || '';
        if (disciplina) topCounts[disciplina] = (topCounts[disciplina] || 0) + 1;
      });
      const topDisciplina = Object.keys(topCounts).sort((a, b) => topCounts[b] - topCounts[a])[0] || '-';
      return { d: dayLabels[date.getDay()], m: minutes, top: topDisciplina, isToday: i === 6 };
    });
  }, [safeHistorico]);

  const weekMax = Math.max(...weekBars.map((b) => b.m), 60);
  const weekTotalLabel = (() => {
    const total = weekBars.reduce((a, b) => a + b.m, 0);
    const h = Math.floor(total / 60);
    const m = total % 60;
    return `${h}h${String(m).padStart(2, '0')} acumuladas`;
  })();

  if (!targetContest && safeHistorico.length === 0) {
    return (
      <div style={{ flex: 1, overflow: 'auto', background: 'var(--pl-bg)' }}>
        <div style={{ width: '100%', padding: 'clamp(16px, 4vw, 38px) clamp(12px, 3vw, 32px)' }}>
          <PlDashboardEmpty
            greeting={greeting}
            userName={cleanUserName}
            onStart={() => setActiveTab?.('planejamento')}
            onOpenContests={() => setActiveTab?.('planos')}
            onOpenQuestions={() => setActiveTab?.('questoes')}
            onOpenTimer={quickAction.onClick}
          />
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflow: 'auto', background: 'var(--pl-bg)' }}>
      <div style={{ width: '100%', padding: 'clamp(16px, 4vw, 36px) clamp(12px, 3vw, 32px)' }}>
        <section style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 220px', gap: 28, alignItems: 'center' }}>
          <div style={{ minWidth: 0 }}>
            <div className="pl-eyebrow">
              {dayContextLabel}
              {historyOverview.streakDays > 0 && (
                <>
                  <span style={{ margin: '0 8px', opacity: 0.5 }}>-</span>
                  <span>você está papirando há {historyOverview.streakDays} {historyOverview.streakDays === 1 ? 'dia' : 'dias'}</span>
                </>
              )}
            </div>
            <h1 className="pl-display" style={{ margin: '8px 0 0', fontSize: 'clamp(34px, 6vw, 62px)', color: 'var(--pl-ink)' }}>
              {greeting}{cleanUserName ? `, ${cleanUserName}` : ''}<span style={{ color: 'var(--pl-accent)' }}>.</span>
            </h1>
            {(heroTopic || heroDetail) && (
              <p style={{ margin: '12px 0 0', fontSize: 17, fontWeight: 500, color: 'var(--pl-ink-2)', maxWidth: 640, lineHeight: 1.45 }}>
                {heroTopic && (
                  <>Hoje a gente <span className="pl-mark-text">papira {heroTopic}</span>{heroDetail ? ` - ${heroDetail}` : '.'}</>
                )}
                {!heroTopic && heroDetail}
              </p>
            )}
            <div style={{ marginTop: 20, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button className="pl-btn pl-btn-primary pl-btn-lg" onClick={quickAction.onClick}>
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

          {targetDaysRemaining !== null && (
            <div className="pl-card" style={{ width: 220, padding: '17px 22px' }}>
              <div className="pl-eyebrow" style={{ fontSize: 10 }}>Objetivo-alvo</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, marginTop: 8 }}>
                <span className="pl-num" style={{ fontSize: 54, color: 'var(--pl-ink)', lineHeight: 1 }}>{targetDaysRemaining}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--pl-ink-2)' }}>dias</span>
              </div>
              <div style={{ marginTop: 6, fontSize: 13.5, fontWeight: 700, color: 'var(--pl-ink)' }}>
                {targetContest?.nome || 'Objetivo definido'}
              </div>
              <div style={{ marginTop: 3, fontSize: 12, color: 'var(--pl-ink-3)', fontWeight: 500 }}>
                {[targetContest?.banca, targetContest?.cargo || targetContest?.concurso].filter(Boolean).join(' - ')}
              </div>
            </div>
          )}
        </section>

        <div className="pl-rule" style={{ margin: '18px 0 16px' }} />

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: 12 }}>
          <PlKpi label="Papirado hoje" num={historyOverview.todayMinutesLabel} detail="Volume efetivo" />
          <PlKpi label="Sequência" num={String(historyOverview.streakDays)} unit="d" detail="dias sem falhar" icon={<Flame size={14} style={{ color: 'var(--pl-warn)' }} />} />
          <PlKpi label="Precisão" num={String(weeklyAccuracy)} unit="%" detail={`${totalAcertos} acertos - ${totalErros} erros`} />
          <PlKpi label="Meta diária" num={String(historyOverview.todayGoalProgress)} unit="%" detail="do objetivo de hoje" progress={historyOverview.todayGoalProgress / 100} />
          <PlKpi label="Revisões" num={String(urgentReviews).padStart(2, '0')} detail="Alta prioridade" accentColor={urgentReviews > 0 ? 'warn' : undefined} />
        </section>

        {/* ── Foco do Dia + Streak ── */}
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14, marginTop: 18 }}>
          <PlFocoDia
            recommendation={primaryRecommendation}
            todayProgress={historyOverview.todayGoalProgress}
            todayMinutesLabel={historyOverview.todayMinutesLabel}
            urgentReviews={urgentReviews}
            onStart={quickAction.onClick}
            onRevisoes={() => setActiveTab?.('revisoes')}
          />
          <PlStreakCard
            streakDays={historyOverview.streakDays}
            todayMinutes={historyOverview.todayMinutes}
            todayGoalProgress={historyOverview.todayGoalProgress}
          />
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, marginTop: 18 }}>
          <div className="pl-card" style={{ padding: '16px 18px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 8 }}>
              <div>
                <div className="pl-eyebrow">Rotina do dia</div>
                <h2 style={{ margin: '5px 0 0', fontFamily: 'var(--pl-serif)', fontStyle: 'italic', fontWeight: 400, fontSize: 27, letterSpacing: '-0.025em', color: 'var(--pl-ink)' }}>
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
              <p style={{ fontSize: 13, color: 'var(--pl-ink-3)', fontWeight: 500, lineHeight: 1.6, padding: '14px 0 4px' }}>
                Defina um objetivo-alvo e registre mais estudo para montar sua rotina automaticamente.
              </p>
            ) : (
              <div>
                {safeRoutine.map((item, index) => (
                  <PlRoutineRow
                    key={item.id || `r-${index}`}
                    index={index}
                    item={item}
                    isFirst={index === 0}
                    isLast={index === safeRoutine.length - 1}
                    onStart={() => onStartRoutineItem?.(item.recommendation)}
                  />
                ))}
              </div>
            )}
          </div>

          <PlBizuCard
            recommendation={primaryRecommendation}
            reminder={reminder}
            progress={historyOverview.todayGoalProgress}
            onStart={quickAction.onClick}
            onPlan={() => setActiveTab?.('planejamento')}
          />
        </section>

        {(ultimaAnotacao || editalProgresso) && (
          <section style={{ display: 'grid', gridTemplateColumns: ultimaAnotacao && editalProgresso ? '1.2fr 1fr' : '1fr', gap: 14, marginTop: 16 }}>
            {ultimaAnotacao && <PlLastNote nota={ultimaAnotacao} onOpen={onOpenUltimaAnotacao} onOpenNotebook={() => setActiveTab?.('redacoes')} />}
            {editalProgresso && <PlEditalProgress data={editalProgresso} onOpen={() => setActiveTab?.('edital')} />}
          </section>
        )}

        <section style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 10 }}>
            <div>
              <div className="pl-eyebrow">Esta semana</div>
              <h2 style={{ margin: '5px 0 0', fontFamily: 'var(--pl-serif)', fontStyle: 'italic', fontWeight: 400, fontSize: 26, letterSpacing: '-0.025em', color: 'var(--pl-ink)' }}>
                Tempo por dia - {weekTotalLabel}
              </h2>
            </div>
            <button className="pl-btn-link" onClick={() => setActiveTab?.('estatisticas')}>
              Estatísticas completas <ArrowRight size={12} />
            </button>
          </div>

          <div className="pl-card" style={{ padding: '18px 20px' }}>
            <PlWeekBars bars={weekBars} max={weekMax} />
          </div>
        </section>
      </div>
    </div>
  );
}

function PlKpi({ label, num, unit, detail, icon, progress, accentColor }) {
  return (
    <div className="pl-card" style={{ padding: '14px 16px 13px' }}>
      <div className="pl-eyebrow" style={{ fontSize: 10 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 6 }}>
        <span className="pl-num" style={{ fontSize: 38, color: 'var(--pl-ink)', lineHeight: 1 }}>{num}</span>
        {unit && <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--pl-ink-3)', marginLeft: 2 }}>{unit}</span>}
        {icon && <span style={{ marginLeft: 'auto' }}>{icon}</span>}
      </div>
      <div style={{ fontSize: 11.5, fontWeight: 500, marginTop: 5, color: accentColor === 'warn' ? 'var(--pl-warn)' : 'var(--pl-ink-3)' }}>
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

function PlRoutineRow({ item, onStart, index, isFirst, isLast }) {
  const tag = item.tag || item.type || 'Bloco';
  const tagClass =
    String(tag).toLowerCase().includes('teoria')
      ? 'pl-tag-highlight'
      : String(tag).toLowerCase().includes('revis')
        ? 'pl-tag-warn'
        : 'pl-tag-accent';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 0', borderBottom: isLast ? 'none' : '1px solid var(--pl-rule)' }}>
      <div style={{
        width: 29,
        height: 29,
        borderRadius: '50%',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: isFirst ? 'var(--pl-ink)' : 'transparent',
        color: isFirst ? 'var(--pl-bg)' : 'var(--pl-ink-3)',
        border: isFirst ? '0' : '1px solid var(--pl-rule-2)',
        fontFamily: 'var(--pl-serif)',
        fontStyle: 'italic',
        fontSize: 14,
        letterSpacing: '-0.04em',
      }}>
        {index + 1}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--pl-ink)' }}>
            {item.subtitle || item.nome || item.disciplina || `Bloco ${index + 1}`}
          </span>
          <span className={`pl-tag ${tagClass}`}>{tag}</span>
          {isFirst && <span className="pl-tag pl-tag-accent">Agora</span>}
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--pl-ink-3)', fontWeight: 500, marginTop: 1 }}>
          {item.detail || item.description || 'Sessão de estudo planejada'}
          {item.duration && (
            <><span style={{ opacity: 0.4, margin: '0 6px' }}>-</span>{item.duration}</>
          )}
        </div>
      </div>
      <button onClick={onStart} className={isFirst ? 'pl-btn pl-btn-primary pl-btn-sm' : 'pl-btn pl-btn-sm'} style={{ flexShrink: 0 }}>
        <Play size={10} fill="currentColor" /> {isFirst ? 'Papirar' : 'Iniciar'}
      </button>
    </div>
  );
}

function PlBizuCard({ recommendation, reminder, progress, onStart, onPlan }) {
  const title = recommendation?.nome || reminder?.title || 'Monte sua próxima sessão';
  const detail = recommendation?.reason || recommendation?.nextTopic?.nome || reminder?.detail || 'O Bizu IA usa seu desempenho para sugerir o melhor próximo passo.';

  return (
    <div className="pl-card-ai" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 13 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
        <span className="pl-tag-ai"><Sparkles size={10} /> Bizu IA</span>
        <span className={`pl-tag${reminder?.badgeTone ? ` pl-tag-${reminder.badgeTone}` : ''}`}>{reminder?.badge || 'Agora'}</span>
      </div>
      <div>
        <div className="pl-eyebrow" style={{ fontSize: 10 }}>Próxima sessão sugerida</div>
        <h3 style={{ margin: '7px 0 0', fontFamily: 'var(--pl-serif)', fontStyle: 'italic', fontWeight: 400, fontSize: 30, lineHeight: 1.12, letterSpacing: '-0.03em', color: 'var(--pl-ink)' }}>
          {title}
        </h3>
        <p style={{ margin: '9px 0 0', padding: '12px 14px', borderRadius: 4, background: 'var(--pl-bg-soft)', fontSize: 13.5, lineHeight: 1.45, color: 'var(--pl-ink-2)', fontWeight: 500 }}>
          {detail}
        </p>
      </div>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 7 }}>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--pl-ink-3)' }}>Meta de hoje</span>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--pl-ink-2)' }}>{progress}%</span>
        </div>
        <div className="pl-progress accent">
          <div className="fill" style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 'auto' }}>
        <button className="pl-btn pl-btn-ai" onClick={onStart} style={{ flex: 1, justifyContent: 'center' }}>
          <Sparkles size={11} /> Iniciar sessão
        </button>
        <button className="pl-btn pl-btn-sm" onClick={onPlan}>
          Ajustar plano
        </button>
      </div>
    </div>
  );
}

function PlLastNote({ nota, onOpen, onOpenNotebook }) {
  return (
    <div className="pl-card" style={{ padding: '18px 20px', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, right: 0, width: 34, height: 34, background: 'var(--pl-bg-soft)', clipPath: 'polygon(100% 0, 0 0, 100% 100%)', borderLeft: '1px solid var(--pl-rule-2)', borderBottom: '1px solid var(--pl-rule-2)' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span className="pl-tag pl-tag-highlight"><FileText size={11} /> Ultima anotacao</span>
        {nota?.data && <span style={{ fontSize: 11.5, color: 'var(--pl-ink-3)', fontWeight: 600 }}>{nota.data}</span>}
      </div>
      <h3 style={{ margin: '12px 0 0', fontFamily: 'var(--pl-serif)', fontStyle: 'italic', fontWeight: 400, fontSize: 24, lineHeight: 1.2, color: 'var(--pl-ink)', letterSpacing: '-0.03em' }}>
        {nota?.titulo || 'Anotacao recente'}
      </h3>
      {nota?.disciplina && (
        <div style={{ marginTop: 4, fontSize: 12, color: 'var(--pl-ink-3)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {nota.disciplina}
        </div>
      )}
      <p style={{ margin: '12px 0 0', paddingLeft: 12, borderLeft: '2px solid var(--pl-highlight)', fontSize: 13.5, lineHeight: 1.6, color: 'var(--pl-ink-2)', fontWeight: 500 }}>
        {nota?.excerpt || 'Continue de onde parou.'}
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
        <button className="pl-btn pl-btn-primary pl-btn-sm" onClick={onOpen}>
          {nota?.acaoLabel || 'Continuar lendo'}
        </button>
        <button className="pl-btn-link" onClick={onOpenNotebook}>
          Ver caderno <ArrowRight size={12} />
        </button>
      </div>
    </div>
  );
}

function PlEditalProgress({ data, onOpen }) {
  const list = Array.isArray(data?.porDisciplina) ? data.porDisciplina.slice(0, 5) : [];
  return (
    <div className="pl-card" style={{ padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 }}>
        <div>
          <div className="pl-eyebrow">Edital - progresso</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 7 }}>
            <span className="pl-num" style={{ fontSize: 44, color: 'var(--pl-ink)', lineHeight: 1 }}>{Math.round(Number(data?.geral || 0))}</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--pl-ink-2)' }}>% geral</span>
          </div>
        </div>
        <button className="pl-btn pl-btn-sm" onClick={onOpen}>
          Abrir edital
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 16 }}>
        {list.length === 0 ? (
          <p style={{ margin: 0, fontSize: 13, color: 'var(--pl-ink-3)', fontWeight: 500 }}>Sem disciplinas do edital para exibir.</p>
        ) : list.map((item) => (
          <div key={item.nome}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 5 }}>
              <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12.5, fontWeight: 700, color: 'var(--pl-ink)' }}>{item.nome}</span>
              <span className="pl-num" style={{ fontSize: 17, color: 'var(--pl-ink-2)' }}>{item.pct}%</span>
            </div>
            <div className="pl-progress accent">
              <div className="fill" style={{ width: `${Math.min(Math.max(Number(item.pct || 0), 0), 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlDashboardEmpty({ greeting, userName, onStart, onOpenContests, onOpenQuestions, onOpenTimer }) {
  const [tutorialStep, setTutorialStep] = useState(null);
  const tutorialSteps = [
    {
      title: 'Primeiro, escolha seu alvo.',
      text: 'Seu objetivo orienta plano, questões e rotina. Se ainda não tiver certeza, escolha provisório e ajuste depois.',
      actionLabel: 'Abrir cursos',
      onAction: onOpenContests,
    },
    {
      title: 'Depois, monte sua semana.',
      text: 'Organize os dias disponíveis, as matérias principais e uma cadência realista para começar sem bagunça.',
      actionLabel: 'Montar semana',
      onAction: onStart,
    },
    {
      title: 'Por fim, registre a primeira sessão.',
      text: 'Uma sessão curta já cria histórico e ajuda a plataforma a sugerir melhor o próximo estudo.',
      actionLabel: 'Abrir timer',
      onAction: onOpenTimer,
    },
  ];
  const isTutorialActive = tutorialStep !== null;
  const currentTutorial = isTutorialActive ? tutorialSteps[tutorialStep] : null;
  const startTutorial = () => setTutorialStep(0);
  const closeTutorial = () => setTutorialStep(null);
  const nextTutorial = () => setTutorialStep((step) => (step >= tutorialSteps.length - 1 ? null : step + 1));
  const previousTutorial = () => setTutorialStep((step) => Math.max(0, step - 1));

  return (
    <div style={{ minHeight: 'calc(100vh - 150px)', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 24 }}>
      <section>
        <div className="pl-eyebrow">Bem-vindo</div>
        <h1 className="pl-display" style={{ margin: '12px 0 0', fontSize: 'clamp(36px, 6vw, 68px)', color: 'var(--pl-ink)' }}>
          {greeting}{userName ? `, ${userName}` : ''}. Bora começar a papirar?
        </h1>
        <p style={{ margin: '16px 0 0', maxWidth: 680, fontSize: 17, lineHeight: 1.55, fontWeight: 500, color: 'var(--pl-ink-2)' }}>
          Defina um alvo, monte sua primeira semana e comece com uma sessão curta. O resto a plataforma organiza junto com você.
        </p>
      </section>
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        <PlOnboardStep number="1" title="Escolha seu alvo" text="Escolha seu objetivo de estudo." active={tutorialStep === 0} dimmed={isTutorialActive && tutorialStep !== 0} />
        <PlOnboardStep number="2" title="Monte a semana" text="Ajuste disponibilidade e matérias principais." active={tutorialStep === 1} dimmed={isTutorialActive && tutorialStep !== 1} />
        <PlOnboardStep number="3" title="Papire agora" text="Abra uma sessão e registre o primeiro estudo." active={tutorialStep === 2} dimmed={isTutorialActive && tutorialStep !== 2} />
      </section>
      {currentTutorial && (
        <section
          style={{
            position: 'relative',
            marginTop: -10,
            maxWidth: 650,
            border: '1px solid rgba(30,58,95,0.22)',
            background: 'var(--pl-bg)',
            borderRadius: 12,
            padding: '18px 20px',
            boxShadow: '0 16px 34px rgba(20,17,13,0.12)',
          }}
        >
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: -8,
              left: `${Math.min(86, 14 + tutorialStep * 32)}%`,
              width: 16,
              height: 16,
              background: 'var(--pl-bg)',
              borderLeft: '1px solid rgba(30,58,95,0.22)',
              borderTop: '1px solid rgba(30,58,95,0.22)',
              transform: 'rotate(45deg)',
            }}
          />
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <div className="pl-eyebrow" style={{ color: 'var(--pl-accent)' }}>Passo {tutorialStep + 1} de {tutorialSteps.length}</div>
              <h3 style={{ margin: '7px 0 0', fontSize: 19, lineHeight: 1.25, color: 'var(--pl-ink)' }}>{currentTutorial.title}</h3>
              <p style={{ margin: '8px 0 0', fontSize: 14, lineHeight: 1.55, color: 'var(--pl-ink-2)', fontWeight: 600 }}>
                {currentTutorial.text}
              </p>
            </div>
            <button type="button" className="pl-btn pl-btn-sm" onClick={closeTutorial} style={{ flexShrink: 0 }}>
              Fechar
            </button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
            <button type="button" className="pl-btn pl-btn-sm" onClick={previousTutorial} disabled={tutorialStep === 0}>
              Voltar
            </button>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <button type="button" className="pl-btn pl-btn-sm" onClick={currentTutorial.onAction}>
                {currentTutorial.actionLabel}
              </button>
              <button
                type="button"
                className="pl-btn pl-btn-sm"
                style={{ background: 'var(--pl-accent)', color: 'var(--pl-surface)', borderColor: 'var(--pl-accent)' }}
                onClick={nextTutorial}
              >
                {tutorialStep >= tutorialSteps.length - 1 ? 'Concluir' : 'Próximo passo'}
              </button>
            </div>
          </div>
        </section>
      )}
      <section
        style={{
          position: 'relative',
          overflow: 'hidden',
          padding: '24px 26px',
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          borderRadius: 12,
          border: '1px solid rgba(20,17,13,0.16)',
          background: 'var(--pl-bg-soft)',
          boxShadow: '0 18px 40px rgba(20,17,13,0.08)',
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 'auto 22px 18px auto',
            width: 76,
            height: 76,
            borderRadius: 999,
            background: 'radial-gradient(circle, rgba(200,160,50,0.28) 0%, rgba(200,160,50,0) 65%)',
          }}
        />
        {/* cores fixas da marca */}
        <div
          style={{
            flex: '0 0 auto',
            width: 48,
            height: 48,
            borderRadius: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#14110d',
            color: '#f4d04e',
            fontFamily: 'var(--pl-serif)',
            fontStyle: 'italic',
            fontSize: 27,
            lineHeight: 1,
            boxShadow: '0 12px 26px rgba(20,17,13,0.18)',
          }}
        >
          P<span style={{ color: '#7a9bbf' }}>.</span>
        </div>
        <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              height: 22,
              padding: '0 9px',
              borderRadius: 999,
              border: '1px solid rgba(30,58,95,0.22)',
              background: 'var(--pl-surface)',
              color: 'var(--pl-accent)',
              fontSize: 11,
              fontWeight: 800,
            }}
          >
            <Sparkles size={11} /> Guia inicial
          </span>
          <h2 style={{ margin: '13px 0 0', fontFamily: 'var(--pl-serif)', fontStyle: 'italic', fontWeight: 400, fontSize: 31, color: 'var(--pl-ink)', letterSpacing: '-0.03em' }}>
            Vamos configurar seu Papirando em 3 passos.
          </h2>
          <p style={{ margin: '8px 0 0', maxWidth: 680, fontSize: 14, lineHeight: 1.6, color: 'var(--pl-ink-2)', fontWeight: 600 }}>
            Eu te guio por alvo, disponibilidade e primeira sessão. Siga o roteiro agora ou comece praticando e ajuste depois.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
            {['1. Objetivo-alvo', '2. Semana de estudo', '3. Primeira sessão'].map((step) => (
              <span
                key={step}
                style={{
                  border: '1px solid rgba(20,17,13,0.13)',
                  background: 'var(--pl-bg-soft)',
                  borderRadius: 999,
                  padding: '6px 10px',
                  fontSize: 12,
                  fontWeight: 800,
                  color: 'var(--pl-ink-2)',
                }}
              >
                {step}
              </span>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end', position: 'relative' }}>
          <button
            className="pl-btn pl-btn-sm pl-btn-ai"
            onClick={startTutorial}
          >
            <Sparkles size={11} /> Começar tutorial
          </button>
          <button className="pl-btn pl-btn-sm" onClick={onOpenQuestions}>Ver questões</button>
          <button className="pl-btn pl-btn-sm" onClick={onOpenTimer}>Abrir timer</button>
        </div>
      </section>
    </div>
  );
}

function PlOnboardStep({ number, title, text, active = false, dimmed = false }) {
  return (
    <div
      className="pl-card"
      style={{
        padding: '18px 20px',
        borderColor: active ? 'rgba(30,58,95,0.38)' : undefined,
        background: active ? 'var(--pl-bg-soft)' : undefined,
        boxShadow: active ? '0 16px 32px rgba(30,58,95,0.14)' : undefined,
        opacity: dimmed ? 0.56 : 1,
        transform: active ? 'translateY(-2px)' : 'none',
        transition: 'opacity 0.16s ease, transform 0.16s ease, box-shadow 0.16s ease',
      }}
    >
      <div className="pl-num" style={{ fontSize: 38, color: active ? 'var(--pl-accent)' : 'var(--pl-ink)', lineHeight: 1 }}>{number}</div>
      <h3 style={{ margin: '10px 0 0', fontSize: 15, fontWeight: 800, color: 'var(--pl-ink)' }}>{title}</h3>
      <p style={{ margin: '6px 0 0', fontSize: 13, lineHeight: 1.5, color: 'var(--pl-ink-3)', fontWeight: 500 }}>{text}</p>
    </div>
  );
}

function PlFocoDia({ recommendation, todayProgress, todayMinutesLabel, urgentReviews, onStart, onRevisoes }) {
  const topico = recommendation?.nextTopic?.nome || null;
  const disciplina = recommendation?.nome || null;
  const reason = recommendation?.reason || null;
  const goalDone = todayProgress >= 100;

  return (
    <div className="pl-card" style={{ padding: '18px 22px', display: 'flex', gap: 20, alignItems: 'stretch', overflow: 'hidden', position: 'relative' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <span className="pl-eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Target size={10} /> Foco do dia
          </span>
          {goalDone && (
            <span style={{ borderRadius: 999, border: '1px solid var(--pl-success-soft)', background: 'var(--pl-success-soft)', padding: '2px 10px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--pl-success)' }}>
              Meta atingida!
            </span>
          )}
          {urgentReviews > 0 && (
            <span style={{ borderRadius: 999, border: '1px solid var(--pl-warn-soft)', background: 'var(--pl-warn-soft)', padding: '2px 10px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--pl-warn)' }}>
              {urgentReviews} revisão urgente
            </span>
          )}
        </div>

        {disciplina ? (
          <>
            <h3 style={{ margin: 0, fontFamily: 'var(--pl-serif)', fontStyle: 'italic', fontWeight: 400, fontSize: 28, lineHeight: 1.1, letterSpacing: '-0.03em', color: 'var(--pl-ink)' }}>
              {disciplina}<span style={{ color: 'var(--pl-accent)' }}>.</span>
            </h3>
            {topico && (
              <p style={{ margin: '6px 0 0', fontSize: 13, fontWeight: 600, color: 'var(--pl-ink-3)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <BookOpen size={12} /> {topico}
              </p>
            )}
            {reason && (
              <p style={{ margin: '10px 0 0', fontSize: 13.5, lineHeight: 1.5, color: 'var(--pl-ink-2)', fontWeight: 500, maxWidth: 480 }}>
                {reason}
              </p>
            )}
          </>
        ) : (
          <p style={{ margin: 0, fontFamily: 'var(--pl-serif)', fontStyle: 'italic', fontWeight: 400, fontSize: 24, color: 'var(--pl-ink-2)', lineHeight: 1.2 }}>
            Registre estudo para personalizar o foco diário.
          </p>
        )}

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
          <button className="pl-btn pl-btn-primary pl-btn-sm" onClick={onStart} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Zap size={12} /> Estudar agora
          </button>
          {urgentReviews > 0 && (
            <button className="pl-btn pl-btn-sm" onClick={onRevisoes} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              Revisar <ArrowRight size={11} />
            </button>
          )}
        </div>
      </div>

      <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <ProgressRing percent={todayProgress} />
        <p style={{ margin: 0, fontSize: 11.5, fontWeight: 700, color: 'var(--pl-ink-3)', textAlign: 'center' }}>
          {todayMinutesLabel}<br />papirado
        </p>
      </div>
    </div>
  );
}

function ProgressRing({ percent }) {
  const r = 34;
  const circ = 2 * Math.PI * r;
  const fill = circ - (Math.min(percent, 100) / 100) * circ;
  const done = percent >= 100;
  return (
    <svg width={84} height={84} viewBox="0 0 84 84">
      <circle cx={42} cy={42} r={r} fill="none" stroke="var(--pl-rule-2)" strokeWidth={7} />
      <circle
        cx={42} cy={42} r={r} fill="none"
        stroke={done ? 'var(--pl-success)' : 'var(--pl-accent)'}
        strokeWidth={7} strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={fill}
        style={{ transform: 'rotate(-90deg)', transformOrigin: '42px 42px', transition: 'stroke-dashoffset 0.6s ease' }}
      />
      <text x={42} y={47} textAnchor="middle" style={{ fontSize: 14, fontWeight: 800, fill: done ? 'var(--pl-success)' : 'var(--pl-ink)', fontFamily: 'var(--pl-sans)' }}>
        {percent}%
      </text>
    </svg>
  );
}

const STREAK_MILESTONES = [3, 7, 14, 21, 30, 60, 100];

function PlStreakCard({ streakDays, todayMinutes, todayGoalProgress }) {
  const nextMilestone = STREAK_MILESTONES.find((m) => m > streakDays) || STREAK_MILESTONES[STREAK_MILESTONES.length - 1];
  const prevMilestone = [...STREAK_MILESTONES].reverse().find((m) => m <= streakDays) || 0;
  const pct = nextMilestone > prevMilestone ? Math.min(100, Math.round(((streakDays - prevMilestone) / (nextMilestone - prevMilestone)) * 100)) : 100;
  const isActive = todayMinutes > 0;
  const isMilestone = STREAK_MILESTONES.includes(streakDays) && streakDays > 0;

  return (
    <div
      className="pl-card"
      style={{
        padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14,
        background: isMilestone ? 'var(--pl-bg-soft)' : 'var(--pl-surface)',
        borderColor: isMilestone ? 'var(--pl-warn)' : undefined,
        position: 'relative', overflow: 'hidden',
      }}
    >
      {isMilestone && (
        <div style={{ position: 'absolute', top: 0, right: 0, width: 64, height: 64, overflow: 'hidden', pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', top: 8, right: -16, width: 64, transform: 'rotate(45deg)', background: 'var(--pl-warn)', textAlign: 'center', fontSize: 8.5, fontWeight: 800, color: 'white', padding: '3px 0', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Marco!
          </div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div>
          <p className="pl-eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Flame size={10} style={{ color: streakDays > 0 ? 'var(--pl-warn)' : 'var(--pl-ink-4)' }} />
            Sequência
          </p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 6 }}>
            {streakDays > 0 && (
              <span className="pl-live-pulse" style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 999, background: 'var(--pl-success)', flexShrink: 0, alignSelf: 'center' }} />
            )}
            <span className="pl-num" style={{ fontSize: 46, lineHeight: 1, color: streakDays > 0 ? 'var(--pl-ink)' : 'var(--pl-ink-3)' }}>
              {streakDays}
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--pl-ink-3)' }}>
              {streakDays === 1 ? 'dia' : 'dias'}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {STREAK_MILESTONES.slice(0, 5).map((m) => (
            <div key={m} title={`${m} dias`} style={{ width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: streakDays >= m ? 'var(--pl-warn)' : 'var(--pl-bg-soft)', border: `1px solid ${streakDays >= m ? 'var(--pl-warn)' : 'var(--pl-rule-2)'}`, transition: 'background 0.2s' }}>
              {streakDays >= m
                ? <Star size={11} fill="white" style={{ color: 'white' }} />
                : <span style={{ fontSize: 8, fontWeight: 700, color: 'var(--pl-ink-4)' }}>{m}</span>
              }
            </div>
          ))}
        </div>
      </div>

      {streakDays < 100 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 11, color: 'var(--pl-ink-3)', fontWeight: 600 }}>
            <span>{streakDays}d</span>
            <span>Próximo: {nextMilestone}d</span>
          </div>
          <div style={{ height: 5, borderRadius: 99, background: 'var(--pl-rule-2)', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 99, background: streakDays > 0 ? 'var(--pl-warn)' : 'var(--pl-rule-strong)', width: `${pct}%`, transition: 'width 0.6s ease' }} />
          </div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 8, background: isActive ? 'var(--pl-success-soft)' : 'var(--pl-bg-soft)', border: `1px solid ${isActive ? 'var(--pl-success-soft)' : 'var(--pl-rule)'}` }}>
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: isActive ? 'var(--pl-success)' : 'var(--pl-ink-4)', flexShrink: 0 }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: isActive ? 'var(--pl-success)' : 'var(--pl-ink-3)' }}>
          {isActive ? `Ativo hoje — ${todayGoalProgress}% da meta` : 'Ainda não estudou hoje'}
        </span>
      </div>

      {isMilestone && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, background: 'var(--pl-warn-soft)', border: '1px solid var(--pl-warn-soft)' }}>
          <Trophy size={14} style={{ color: 'var(--pl-warn)', flexShrink: 0 }} />
          <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: 'var(--pl-warn)' }}>
            {streakDays} dias sem parar! Sequência incrível.
          </p>
        </div>
      )}
    </div>
  );
}

function PlWeekBars({ bars, max }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, height: 172 }}>
      {bars.map((it) => {
        const h = max > 0 ? (it.m / max) * 142 : 0;
        return (
          <div key={it.d + String(it.isToday)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, height: '100%' }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', width: '100%' }}>
              <div style={{ width: '100%', height: Math.max(h, 4), background: it.isToday ? 'var(--pl-ink)' : 'var(--pl-ink-4)', borderRadius: '4px 4px 0 0', position: 'relative' }}>
                {it.m > 0 && (
                  <div style={{ position: 'absolute', top: -22, left: '50%', transform: 'translateX(-50%)', fontFamily: 'var(--pl-serif)', fontStyle: 'italic', fontWeight: 400, fontSize: 13, color: 'var(--pl-ink-2)', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
                    {`${Math.floor(it.m / 60)}:${String(it.m % 60).padStart(2, '0')}`}
                  </div>
                )}
              </div>
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: it.isToday ? 'var(--pl-ink)' : 'var(--pl-ink-3)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              {it.d}
            </div>
            <div style={{ fontSize: 10, color: 'var(--pl-ink-4)', fontWeight: 500, minHeight: 12 }}>{it.top}</div>
          </div>
        );
      })}
    </div>
  );
}
