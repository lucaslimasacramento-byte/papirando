import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  BrainCircuit,
  ChevronRight,
  Clock3,
  Flame,
  History,
  Search,
  TrendingUp,
  CheckCircle2,
} from 'lucide-react';
import {
  buildCanonicalHistory,
  buildDisciplineSummaryFromHistory,
  buildHistoryTimelineItem,
  formatMinutesLabel,
} from '../lib/studyAnalytics';

function formatDate(dateStr) {
  if (!dateStr) return '--';
  const date = new Date(`${dateStr}T12:00:00`);
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function normalizeFilterValue(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

export default function Historico({
  historicoReal = [],
  subjectCatalog = [],
  initialQuery = '',
  initialFilter = 'Todos',
}) {
  const [query, setQuery] = useState(initialQuery);
  const [filter, setFilter] = useState(initialFilter);

  const canonicalHistory = useMemo(
    () => buildCanonicalHistory(historicoReal, subjectCatalog),
    [historicoReal, subjectCatalog]
  );

  const timeline = useMemo(
    () => canonicalHistory.map((record, index) => buildHistoryTimelineItem(record, index)),
    [canonicalHistory]
  );

  const filtered = useMemo(() => timeline.filter((item) => {
    const q = query.toLowerCase();
    const matchesQuery =
      item.title.toLowerCase().includes(q) ||
      item.note.toLowerCase().includes(q) ||
      String(item.disciplina || '').toLowerCase().includes(q);
    const matchesFilter =
      filter === 'Todos' ||
      normalizeFilterValue(item.type) === normalizeFilterValue(filter);
    return matchesQuery && matchesFilter;
  }), [filter, query, timeline]);

  const totalSessions = timeline.length;
  const totalMinutes = timeline.reduce((acc, item) => acc + item.duration, 0);
  const totalQuestions = timeline.reduce((acc, item) => acc + item.questions, 0);
  const averageAccuracy =
    totalQuestions > 0
      ? Math.round(
          canonicalHistory.reduce((acc, item) => acc + Number(item.acertos || 0), 0) /
            totalQuestions * 100
        )
      : 0;

  const disciplineSummary = useMemo(
    () => buildDisciplineSummaryFromHistory(canonicalHistory).slice(0, 5),
    [canonicalHistory]
  );
  const bestDiscipline = disciplineSummary[0] || null;
  const weakestDiscipline =
    [...buildDisciplineSummaryFromHistory(canonicalHistory)]
      .filter((item) => item.questions > 0)
      .sort((a, b) => a.accuracy - b.accuracy)[0] || null;

  const FILTERS = ['Todos', 'Estudo', 'Questões', 'Simulado', 'Revisão'];

  return (
    <div className="pl-paper-bg" style={{ flex: 1, overflow: 'auto', padding: '28px 36px 48px' }}>

      {/* ── HERO ── */}
      <header style={{ display: 'flex', gap: 28, alignItems: 'flex-end' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="pl-eyebrow">
            Inteligência de desempenho
            <span style={{ margin: '0 8px', opacity: 0.5 }}>·</span>
            Histórico
          </div>
          <h1 className="pl-display" style={{ margin: '12px 0 0', fontSize: 64, color: 'var(--pl-ink)' }}>
            Tudo que você papiro<span style={{ color: 'var(--pl-accent)' }}>u.</span>
          </h1>
          <p style={{ margin: '14px 0 0', fontSize: 16, fontWeight: 500, color: 'var(--pl-ink-2)', maxWidth: 560, lineHeight: 1.55 }}>
            Linha do tempo de estudos agrupada por matéria. Cada sessão registrada
            alimenta os insights e a recomendação inteligente.
          </p>
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
              {averageAccuracy}
            </span>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--pl-ink-3)' }}>%</span>
          </div>
          <div className="pl-progress accent">
            <div className="fill" style={{ width: `${averageAccuracy}%` }} />
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 11.5, color: 'var(--pl-ink-3)', fontWeight: 500 }}>
            {totalSessions} sessões · {totalQuestions} questões
          </p>
        </aside>
      </header>

      <div className="pl-rule" style={{ margin: '28px 0 22px' }} />

      {/* ── KPI STRIP ── */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 22 }}>
        <PlKpi label="Sessões" num={String(totalSessions)} icon={<BookOpen size={14} style={{ color: 'var(--pl-accent)' }} />} />
        <PlKpi label="Tempo total" num={formatMinutesLabel(totalMinutes)} />
        <PlKpi label="Questões" num={String(totalQuestions)} icon={<CheckCircle2 size={14} style={{ color: 'var(--pl-success)' }} />} />
        <PlKpi label="Precisão média" num={`${averageAccuracy}`} unit="%" accentColor={averageAccuracy >= 70 ? 'success' : averageAccuracy >= 50 ? undefined : 'warn'} />
      </section>

      {/* ── FILTER BAR ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
        marginBottom: 18, padding: '12px 16px',
        background: 'var(--pl-surface)', border: '1px solid var(--pl-rule-2)',
        borderRadius: 8,
      }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={13} style={{
            position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--pl-ink-4)', pointerEvents: 'none',
          }} />
          <input
            className="pl-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por matéria, tópico ou observação…"
            style={{ width: '100%', paddingLeft: 30, height: 32, fontSize: 12.5 }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              style={{
                height: 28, padding: '0 10px', borderRadius: 5, border: '1px solid',
                fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'var(--pl-sans)',
                borderColor: filter === f ? 'var(--pl-accent)' : 'var(--pl-rule-strong)',
                background: filter === f ? 'var(--pl-accent-soft)' : 'transparent',
                color: filter === f ? 'var(--pl-accent)' : 'var(--pl-ink-3)',
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* ── TWO-COLUMN ── */}
      <section style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 18 }}>

        {/* Timeline */}
        <div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.length === 0 ? (
              <div className="pl-card" style={{
                padding: '40px 24px', textAlign: 'center',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
              }}>
                <BookOpen size={28} style={{ color: 'var(--pl-ink-4)' }} />
                <p style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--pl-ink-2)' }}>
                  Nenhum registro ainda. Bora começar hoje.
                </p>
              </div>
            ) : (
              filtered.map((item) => (
                <TimelineItem key={item.id} item={item} />
              ))
            )}
          </div>
        </div>

        {/* Insights + Summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* IA insight */}
          <div className="pl-card-ai">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <span className="pl-tag-ai">
                <BrainCircuit size={10} /> Bizu IA
              </span>
              <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--pl-ink-3)', letterSpacing: '0.04em' }}>
                leitura rápida
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600, color: 'var(--pl-ink)', lineHeight: 1.5 }}>
              {bestDiscipline
                ? <><span className="pl-mark-text">{bestDiscipline.name}</span> é sua matéria mais presente no histórico.</>
                : 'Ainda sem dados suficientes para leitura automática.'}
            </p>
          </div>

          {/* Ritmo */}
          <div className="pl-card" style={{ padding: '14px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Flame size={14} style={{ color: 'var(--pl-warn)' }} />
              <div className="pl-eyebrow" style={{ fontSize: 9.5 }}>Ritmo atual</div>
            </div>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: 'var(--pl-ink-2)', lineHeight: 1.5 }}>
              {totalSessions > 0
                ? `${totalSessions} sessão(ões) registradas. Continue — a constância é o que vence concurso.`
                : 'Registre seus estudos e o ritmo aparece aqui.'}
            </p>
          </div>

          {/* Discipline summary */}
          <div className="pl-card" style={{ padding: '16px 18px' }}>
            <div style={{ marginBottom: 14 }}>
              <div className="pl-eyebrow" style={{ fontSize: 10 }}>Resumo por matéria</div>
              <h3 style={{
                margin: '4px 0 0', fontFamily: 'var(--pl-serif)', fontStyle: 'italic',
                fontWeight: 400, fontSize: 20, letterSpacing: '-0.02em', color: 'var(--pl-ink)',
              }}>
                Top {disciplineSummary.length || 0} matérias
              </h3>
            </div>
            {disciplineSummary.length === 0 ? (
              <p style={{ fontSize: 12.5, color: 'var(--pl-ink-4)', fontWeight: 500 }}>
                Sem registros suficientes para montar o ranking.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {disciplineSummary.map((item) => (
                  <div key={item.name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, alignItems: 'baseline' }}>
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--pl-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '68%' }}>
                        {item.name}
                      </span>
                      <span className="pl-num" style={{ fontSize: 16, color: 'var(--pl-ink)' }}>
                        {item.accuracy}%
                      </span>
                    </div>
                    <div className="pl-progress accent">
                      <div className="fill" style={{ width: `${item.accuracy}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
            {weakestDiscipline && (
              <div style={{
                marginTop: 14, padding: '10px 12px',
                background: 'var(--pl-warn-soft)', borderRadius: 6,
                border: '1px solid rgba(180,83,9,0.15)',
              }}>
                <div className="pl-eyebrow" style={{ fontSize: 9.5, color: 'var(--pl-warn)' }}>Ponto de atenção</div>
                <p style={{ margin: '4px 0 0', fontSize: 13, fontWeight: 600, color: 'var(--pl-ink)' }}>
                  {weakestDiscipline.name}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 11.5, color: 'var(--pl-warn)', fontWeight: 500 }}>
                  Acurácia atual: {weakestDiscipline.accuracy}%
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function PlKpi({ label, num, unit, icon, accentColor }) {
  const color =
    accentColor === 'success' ? 'var(--pl-success)' :
    accentColor === 'warn' ? 'var(--pl-warn)' :
    'var(--pl-ink)';
  return (
    <div className="pl-card" style={{ padding: '14px 16px' }}>
      <div className="pl-eyebrow" style={{ fontSize: 10 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 6 }}>
        <span className="pl-num" style={{ fontSize: 32, color, lineHeight: 1 }}>{num}</span>
        {unit && <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--pl-ink-3)', marginLeft: 2 }}>{unit}</span>}
        {icon && <span style={{ marginLeft: 'auto' }}>{icon}</span>}
      </div>
    </div>
  );
}

function TimelineItem({ item }) {
  const accentMap = {
    blue: 'var(--pl-accent)',
    orange: 'var(--pl-warn)',
    emerald: 'var(--pl-success)',
    indigo: '#6366f1',
  };
  const accent = accentMap[item.color] || 'var(--pl-ink-4)';

  return (
    <div className="pl-card" style={{ padding: '0', overflow: 'hidden' }}>
      <div style={{ display: 'flex' }}>
        {/* Left accent bar */}
        <div style={{ width: 3, background: accent, flexShrink: 0, borderRadius: '0 0 0 0' }} />
        <div style={{ flex: 1, padding: '14px 16px', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center',
                  height: 20, padding: '0 7px', borderRadius: 3,
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                  background: `${accent}18`, color: accent, border: `1px solid ${accent}30`,
                }}>
                  {item.type}
                </span>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--pl-ink-4)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  {formatDate(item.date)}
                </span>
              </div>
              <h4 style={{ margin: '0 0 3px', fontSize: 13.5, fontWeight: 600, color: 'var(--pl-ink)', lineHeight: 1.3 }}>
                {item.title}
              </h4>
              <p style={{
                margin: 0, fontSize: 12, color: 'var(--pl-ink-3)', fontWeight: 500, lineHeight: 1.4,
                overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
              }}>
                {item.note}
              </p>
            </div>

            {/* Metrics */}
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <MetricPill label="Tempo" value={formatMinutesLabel(item.duration)} />
              <MetricPill label="Questões" value={String(item.questions)} />
              <MetricPill label="Acerto" value={`${item.accuracy}%`} highlight />
            </div>
          </div>

          {/* Accuracy bar */}
          {item.questions > 0 && (
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="pl-progress" style={{ flex: 1, maxWidth: 180 }}>
                <div style={{ height: '100%', background: accent, width: `${item.accuracy}%`, borderRadius: 2 }} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--pl-ink-4)', fontVariantNumeric: 'tabular-nums' }}>
                {item.accuracy}%
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricPill({ label, value, highlight }) {
  return (
    <div style={{
      textAlign: 'center', padding: '6px 10px', borderRadius: 5,
      background: highlight ? 'var(--pl-success-soft)' : 'var(--pl-bg-soft)',
      border: `1px solid ${highlight ? 'rgba(77,124,63,0.15)' : 'var(--pl-rule)'}`,
      minWidth: 52,
    }}>
      <div className="pl-eyebrow" style={{ fontSize: 9 }}>{label}</div>
      <div style={{
        fontSize: 13, fontWeight: 700, marginTop: 2,
        color: highlight ? 'var(--pl-success)' : 'var(--pl-ink)',
      }}>
        {value}
      </div>
    </div>
  );
}
