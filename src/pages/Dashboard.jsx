import React, { useMemo } from 'react';
import {
  ArrowRight,
  FileText,
  Flame,
  Play,
  Sparkles,
} from 'lucide-react';
import { buildStudyHistoryOverview, parseStudyTimeToMinutes, shiftDays, toDateKey } from '../lib/studyAnalytics';

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

  const historyOverview = useMemo(
    () => buildStudyHistoryOverview(safeHistorico, { dayGoalMinutes: 180 }),
    [safeHistorico]
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
        badge: 'Amanha',
        badgeTone: '',
        title: amanha.titulo || amanha.nome || 'Algo pede atencao amanha',
        detail: amanha.detalhe || amanha.texto || 'Antecipe o que ja estiver claro.',
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
        badge: 'Revisoes',
        badgeTone: 'warn',
        title: `${urgentReviews} revisao(oes) em alta prioridade`,
        detail: 'Existe espaco claro para reforco hoje.',
      };
    }
    return {
      badge: 'Estavel',
      badgeTone: 'success',
      title: 'Sem alerta critico agora',
      detail: 'O melhor movimento e seguir a sessao sugerida.',
    };
  }, [safeAgendaHoje, safeAgendaAmanha, targetDaysRemaining, urgentReviews]);

  const heroTopic = primaryRecommendation?.nome || targetContest?.nome || null;
  const heroDetail = primaryRecommendation?.nextTopic?.nome || primaryRecommendation?.reason || null;
  const quickAction = primaryRecommendation
    ? { label: 'Papirar agora', onClick: () => onStartRecommendedSession?.(primaryRecommendation) }
    : { label: 'Papirar agora', onClick: () => openTimerSetup?.() };

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
        <div style={{ width: '100%', padding: '22px 32px 38px' }}>
          <PlDashboardEmpty
            greeting={greeting}
            userName={cleanUserName}
            onStart={() => setActiveTab?.('planejamento')}
            onOpenQuestions={() => setActiveTab?.('questoes')}
            onOpenTimer={quickAction.onClick}
          />
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflow: 'auto', background: 'var(--pl-bg)' }}>
      <div style={{ width: '100%', padding: '22px 32px 36px' }}>
        <section style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 220px', gap: 28, alignItems: 'center' }}>
          <div style={{ minWidth: 0 }}>
            <div className="pl-eyebrow">
              {dayContextLabel}
              {historyOverview.streakDays > 0 && (
                <>
                  <span style={{ margin: '0 8px', opacity: 0.5 }}>-</span>
                  <span>voce esta papirando ha {historyOverview.streakDays} {historyOverview.streakDays === 1 ? 'dia' : 'dias'}</span>
                </>
              )}
            </div>
            <h1 className="pl-display" style={{ margin: '8px 0 0', fontSize: 62, color: 'var(--pl-ink)' }}>
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
              <div className="pl-eyebrow" style={{ fontSize: 10 }}>Concurso-alvo</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, marginTop: 8 }}>
                <span className="pl-num" style={{ fontSize: 54, color: 'var(--pl-ink)', lineHeight: 1 }}>{targetDaysRemaining}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--pl-ink-2)' }}>dias</span>
              </div>
              <div style={{ marginTop: 6, fontSize: 13.5, fontWeight: 700, color: 'var(--pl-ink)' }}>
                {targetContest?.nome || 'Concurso definido'}
              </div>
              <div style={{ marginTop: 3, fontSize: 12, color: 'var(--pl-ink-3)', fontWeight: 500 }}>
                {[targetContest?.banca, targetContest?.cargo || targetContest?.concurso].filter(Boolean).join(' - ')}
              </div>
            </div>
          )}
        </section>

        <div className="pl-rule" style={{ margin: '18px 0 16px' }} />

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 12 }}>
          <PlKpi label="Papirado hoje" num={historyOverview.todayMinutesLabel} detail="Volume efetivo" />
          <PlKpi label="Sequencia" num={String(historyOverview.streakDays)} unit="d" detail="dias sem falhar" icon={<Flame size={14} style={{ color: 'var(--pl-warn)' }} />} />
          <PlKpi label="Precisao" num={String(weeklyAccuracy)} unit="%" detail={`${totalAcertos} acertos - ${totalErros} erros`} />
          <PlKpi label="Meta diaria" num={String(historyOverview.todayGoalProgress)} unit="%" detail="do objetivo de hoje" progress={historyOverview.todayGoalProgress / 100} />
          <PlKpi label="Revisoes" num={String(urgentReviews).padStart(2, '0')} detail="Alta prioridade" accentColor={urgentReviews > 0 ? 'warn' : undefined} />
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: '1.65fr 1fr', gap: 14, marginTop: 18 }}>
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
              Estatisticas completas <ArrowRight size={12} />
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
          {item.detail || item.description || 'Sessao de estudo planejada'}
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
  const title = recommendation?.nome || reminder?.title || 'Monte sua proxima sessao';
  const detail = recommendation?.reason || recommendation?.nextTopic?.nome || reminder?.detail || 'O Bizu IA usa seu desempenho para sugerir o melhor proximo passo.';

  return (
    <div className="pl-card-ai" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 13 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
        <span className="pl-tag-ai"><Sparkles size={10} /> Bizu IA</span>
        <span className={`pl-tag${reminder?.badgeTone ? ` pl-tag-${reminder.badgeTone}` : ''}`}>{reminder?.badge || 'Agora'}</span>
      </div>
      <div>
        <div className="pl-eyebrow" style={{ fontSize: 10 }}>Proxima sessao sugerida</div>
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
          <Sparkles size={11} /> Iniciar sessao
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

function PlDashboardEmpty({ greeting, userName, onStart, onOpenQuestions, onOpenTimer }) {
  return (
    <div style={{ minHeight: 'calc(100vh - 150px)', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 24 }}>
      <section>
        <div className="pl-eyebrow">Bem-vindo</div>
        <h1 className="pl-display" style={{ margin: '12px 0 0', fontSize: 68, color: 'var(--pl-ink)' }}>
          {greeting}{userName ? `, ${userName}` : ''}. Bora comecar a papirar?
        </h1>
        <p style={{ margin: '16px 0 0', maxWidth: 680, fontSize: 17, lineHeight: 1.55, fontWeight: 500, color: 'var(--pl-ink-2)' }}>
          Defina um alvo, monte sua primeira semana e comece com uma sessao curta. O resto a plataforma organiza junto com voce.
        </p>
      </section>
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
        <PlOnboardStep number="1" title="Escolha seu alvo" text="Defina concurso, banca e data para orientar o plano." />
        <PlOnboardStep number="2" title="Monte a semana" text="Ajuste disponibilidade e materias principais." />
        <PlOnboardStep number="3" title="Papire agora" text="Abra uma sessao e registre o primeiro estudo." />
      </section>
      <section className="pl-card-ai" style={{ padding: '22px 24px', display: 'flex', alignItems: 'center', gap: 18 }}>
        <div style={{ flex: 1 }}>
          <span className="pl-tag-ai"><Sparkles size={10} /> Bizu IA</span>
          <h2 style={{ margin: '12px 0 0', fontFamily: 'var(--pl-serif)', fontStyle: 'italic', fontWeight: 400, fontSize: 30, color: 'var(--pl-ink)', letterSpacing: '-0.03em' }}>
            Posso montar sua primeira semana.
          </h2>
          <p style={{ margin: '8px 0 0', fontSize: 13.5, lineHeight: 1.55, color: 'var(--pl-ink-2)', fontWeight: 500 }}>
            Comece pelo plano ou va direto para uma sessao de pratica.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button className="pl-btn pl-btn-sm pl-btn-ai" onClick={onStart}><Sparkles size={11} /> Montar semana</button>
          <button className="pl-btn pl-btn-sm" onClick={onOpenQuestions}>Ver questoes</button>
          <button className="pl-btn pl-btn-sm" onClick={onOpenTimer}>Abrir timer</button>
        </div>
      </section>
    </div>
  );
}

function PlOnboardStep({ number, title, text }) {
  return (
    <div className="pl-card" style={{ padding: '18px 20px' }}>
      <div className="pl-num" style={{ fontSize: 38, color: 'var(--pl-ink)', lineHeight: 1 }}>{number}</div>
      <h3 style={{ margin: '10px 0 0', fontSize: 15, fontWeight: 800, color: 'var(--pl-ink)' }}>{title}</h3>
      <p style={{ margin: '6px 0 0', fontSize: 13, lineHeight: 1.5, color: 'var(--pl-ink-3)', fontWeight: 500 }}>{text}</p>
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
