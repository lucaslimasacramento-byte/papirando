import React, { useMemo } from 'react';
import {
  Activity,
  ArrowUpRight,
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  Clock,
  Filter,
  Flame,
  Layers,
  PieChart,
} from 'lucide-react';
import {
  buildCanonicalHistory,
  buildDisciplineSummaryFromHistory,
  calculateStudyStreak,
  formatMinutesLabel,
  parseStudyTimeToMinutes,
} from '../lib/studyAnalytics';
import { canonicalizeSubjectName } from '../lib/subjectCatalogUtils';

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
    <div className="pl-paper-bg" style={{ flex: 1, overflow: 'auto', padding: '28px 36px 48px' }}>

      {/* ── HERO ── */}
      <header style={{ display: 'flex', gap: 28, alignItems: 'flex-end' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="pl-eyebrow">
            Inteligência analítica
            <span style={{ margin: '0 8px', opacity: 0.5 }}>·</span>
            Estatísticas
          </div>
          <h1 className="pl-display" style={{ margin: '12px 0 0', fontSize: 64, color: 'var(--pl-ink)' }}>
            Seus número<span style={{ color: 'var(--pl-accent)' }}>s.</span>
          </h1>
          <p style={{ margin: '14px 0 0', fontSize: 16, fontWeight: 500, color: 'var(--pl-ink-2)', maxWidth: 560, lineHeight: 1.55 }}>
            Consolidados por matéria canônica — tempo, acurácia e progresso no edital em uma leitura só.
          </p>
          <div style={{ marginTop: 22 }}>
            <button
              className="pl-btn pl-btn-lg"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
              onClick={() => setIsFilterPanelOpen?.(true)}
            >
              <Filter size={14} /> Filtros avançados
            </button>
          </div>
        </div>

        {/* Accuracy aside */}
        <aside style={{
          width: 220, flexShrink: 0,
          background: 'var(--pl-surface)', border: '1px solid var(--pl-rule-2)',
          borderRadius: 6, padding: '16px 18px',
        }}>
          <div className="pl-eyebrow" style={{ fontSize: 10 }}>Desempenho geral</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, margin: '8px 0 10px' }}>
            <span className="pl-num" style={{ fontSize: 42, color: 'var(--pl-ink)', lineHeight: 1 }}>
              {percAcertos}
            </span>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--pl-ink-3)' }}>%</span>
          </div>
          <div className="pl-progress accent">
            <div className="fill" style={{ width: `${percAcertos}%` }} />
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 11.5, color: 'var(--pl-ink-3)', fontWeight: 500 }}>
            {stats.acertos} acertos · {stats.erros} erros
          </p>
        </aside>
      </header>

      <div className="pl-rule" style={{ margin: '28px 0 22px' }} />

      {/* ── KPI STRIP ── */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8, marginBottom: 22 }}>
        <PlKpi label="Tempo total" num={stats.tempoTotal} sub={`~${stats.mediaDia}/dia`} icon={<Clock size={13} style={{ color: 'var(--pl-accent)' }} />} />
        <PlKpi label="Streak" num={`${stats.streakDias}d`} icon={<Flame size={13} style={{ color: 'var(--pl-warn)' }} />} />
        <PlKpi label="Dias estudados" num={String(stats.diasEstudados)} />
        <PlKpi label="Questões" num={String(stats.totalQuestoes)} icon={<CheckCircle2 size={13} style={{ color: 'var(--pl-success)' }} />} />
        <PlKpi label="Acurácia" num={`${percAcertos}%`} accentColor={percAcertos >= 70 ? 'success' : percAcertos >= 50 ? undefined : 'warn'} />
        <PlKpi label="Edital" num={`${stats.progressoEdital}%`} sub={`${stats.topicosConcluidos} tópicos`} />
        <PlKpi label="Redações" num={String(redacaoSummary.corrected || 0)} sub={redacaoSummary.averageScore ? `${String(redacaoSummary.averageScore).replace('.', ',')} / 10` : 'Sem nota'} />
      </section>

      {/* ── TWO-COLUMN ── */}
      <section style={{ display: 'grid', gridTemplateColumns: '1.25fr 1fr', gap: 18 }}>

        {/* Discipline analysis */}
        <div className="pl-card" style={{ padding: '20px 22px' }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Activity size={14} style={{ color: 'var(--pl-accent)' }} />
              <div className="pl-eyebrow" style={{ fontSize: 10 }}>Análise por matéria canônica</div>
            </div>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--pl-ink-3)', fontWeight: 500 }}>
              Tempo e acurácia consolidados no mesmo nome padrão.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {disciplineSummary.length === 0 ? (
              <div style={{
                padding: '24px', textAlign: 'center', borderRadius: 6,
                border: '1px dashed var(--pl-rule-2)', background: 'var(--pl-bg-soft)',
                fontSize: 13, fontWeight: 600, color: 'var(--pl-ink-4)',
              }}>
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

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* IA diagnostic */}
          <div className="pl-card-ai" style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <span className="pl-tag-ai">
                <BrainCircuit size={10} /> Bizu IA
              </span>
              <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--pl-ink-3)', letterSpacing: '0.04em' }}>
                diagnóstico estratégico
              </span>
            </div>
            <h3 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 600, color: 'var(--pl-ink)', letterSpacing: '-0.01em' }}>
              {bestDiscipline
                ? <><span className="pl-mark-text">{bestDiscipline.name}</span> lidera sua dedicação atual.</>
                : 'Registre mais estudos para leituras automáticas.'}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
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
                text="Use a matéria com menor acurácia como próximo bloco de revisão e mantenha as mais fortes em manutenção."
              />
            </div>

            {/* Potential badge */}
            <div style={{
              marginTop: 14, padding: '10px 14px',
              background: 'var(--pl-accent-soft)', borderRadius: 6,
              border: '1px solid var(--pl-accent-ring)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span className="pl-eyebrow" style={{ fontSize: 9.5, color: 'var(--pl-accent)' }}>
                Potencial de subida
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 18, fontWeight: 700, color: 'var(--pl-accent)', fontFamily: 'var(--pl-serif)', fontStyle: 'italic' }}>
                +{Math.max(5, 100 - percAcertos)}%
                <ArrowUpRight size={15} />
              </span>
            </div>
          </div>

          {/* Topics */}
          <div className="pl-card" style={{ padding: '16px 18px' }}>
            <div className="pl-eyebrow" style={{ fontSize: 10, marginBottom: 12 }}>Tópicos mais respondidos</div>
            {topicRows.length === 0 ? (
              <p style={{ fontSize: 12.5, color: 'var(--pl-ink-4)', fontWeight: 500 }}>
                Sem tópicos com questões respondidas.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {topicRows.map((item) => (
                  <TopicRow key={`${item.disc}-${item.topico}`} item={item} />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function PlKpi({ label, num, sub, icon, accentColor }) {
  const color =
    accentColor === 'success' ? 'var(--pl-success)' :
    accentColor === 'warn' ? 'var(--pl-warn)' :
    'var(--pl-ink)';
  return (
    <div className="pl-card" style={{ padding: '12px 14px' }}>
      <div className="pl-eyebrow" style={{ fontSize: 9.5 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginTop: 5 }}>
        <span className="pl-num" style={{ fontSize: 22, color, lineHeight: 1 }}>{num}</span>
        {icon && <span style={{ marginLeft: 'auto' }}>{icon}</span>}
      </div>
      {sub && <p style={{ margin: '3px 0 0', fontSize: 10, color: 'var(--pl-ink-4)', fontWeight: 500 }}>{sub}</p>}
    </div>
  );
}

function DisciplineRow({ name, timeLabel, accuracy, questions, maxMinutes, minutes }) {
  const width = Math.max(8, Math.round((minutes / Math.max(maxMinutes, 1)) * 100));
  const accentColor = accuracy >= 70 ? 'var(--pl-success)' : accuracy >= 50 ? 'var(--pl-accent)' : 'var(--pl-warn)';

  return (
    <div style={{
      padding: '12px 14px', borderRadius: 6,
      border: '1px solid var(--pl-rule)', background: 'var(--pl-bg-soft)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--pl-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {name}
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 11, fontWeight: 500, color: 'var(--pl-ink-4)' }}>
            {questions} questões
          </p>
        </div>
        <span className="pl-tag" style={{ flexShrink: 0, background: 'var(--pl-surface)' }}>
          {timeLabel}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div className="pl-progress" style={{ flex: 1 }}>
          <div style={{ height: '100%', background: accentColor, width: `${width}%`, borderRadius: 2 }} />
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: accentColor, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
          {accuracy}%
        </span>
      </div>
    </div>
  );
}

function TopicRow({ item }) {
  const color = item.pct >= 80 ? 'var(--pl-success)' : item.pct >= 60 ? 'var(--pl-warn)' : 'var(--pl-danger)';

  return (
    <div style={{ paddingBottom: 10, borderBottom: '1px solid var(--pl-rule)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5, flexWrap: 'wrap' }}>
        <span className="pl-tag" style={{ fontSize: 9.5 }}>{item.disc}</span>
        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--pl-ink-4)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          {item.qTot} questões
        </span>
      </div>
      <p style={{ margin: '0 0 6px', fontSize: 12.5, fontWeight: 600, color: 'var(--pl-ink)' }}>
        {item.topico}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div className="pl-progress" style={{ flex: 1 }}>
          <div style={{ height: '100%', background: color, width: `${item.pct}%`, borderRadius: 2 }} />
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color, flexShrink: 0 }}>{item.pct}%</span>
      </div>
    </div>
  );
}

function InsightBullet({ title, text }) {
  return (
    <div style={{
      padding: '10px 12px', borderRadius: 6,
      background: 'var(--pl-bg-soft)', border: '1px solid var(--pl-rule)',
      borderLeft: '3px solid var(--pl-accent)',
    }}>
      <div className="pl-eyebrow" style={{ fontSize: 9.5, color: 'var(--pl-accent)', marginBottom: 4 }}>
        {title}
      </div>
      <p style={{ margin: 0, fontSize: 12.5, fontWeight: 500, color: 'var(--pl-ink-2)', lineHeight: 1.5 }}>
        {text}
      </p>
    </div>
  );
}
