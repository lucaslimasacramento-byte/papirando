import React, { useMemo, useState } from 'react';
import {
  History,
  BookOpen,
  Search,
  SlidersHorizontal,
  Clock,
  Target,
} from 'lucide-react';
import {
  buildCanonicalHistory,
  buildHistoryTimelineItem,
  formatMinutesLabel,
} from '../lib/studyAnalytics';
import PageHeadPremium from '../components/PageHeadPremium';

/* ── Paleta por tipo de registro ────────────────────────────────── */
const TYPE_PALETTE = {
  blue:    { stripe: '#2557a7', bg: 'rgba(30,58,95,0.06)',   border: 'rgba(30,58,95,0.14)',   text: '#1e3a5f' },
  orange:  { stripe: '#c05621', bg: 'rgba(192,86,33,0.06)',  border: 'rgba(192,86,33,0.16)',  text: '#c05621' },
  emerald: { stripe: '#305e22', bg: 'rgba(48,94,34,0.06)',   border: 'rgba(48,94,34,0.16)',   text: '#305e22' },
  indigo:  { stripe: '#3730a3', bg: 'rgba(55,48,163,0.06)',  border: 'rgba(55,48,163,0.14)',  text: '#3730a3' },
};

const FILTERS = ['Todos', 'Estudo', 'Questões', 'Simulado', 'Revisão'];

function formatDate(dateStr) {
  if (!dateStr) return '--';
  const d = new Date(`${dateStr}T12:00:00`);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function normalizeStr(value) {
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
  const [query, setQuery]   = useState(initialQuery);
  const [filter, setFilter] = useState(initialFilter);

  const canonicalHistory = useMemo(
    () => buildCanonicalHistory(historicoReal, subjectCatalog),
    [historicoReal, subjectCatalog],
  );

  const timeline = useMemo(
    () => canonicalHistory.map((record, index) => buildHistoryTimelineItem(record, index)),
    [canonicalHistory],
  );

  const filtered = useMemo(() => {
    return timeline.filter((item) => {
      const q = query.toLowerCase();
      const matchesQuery =
        item.title.toLowerCase().includes(q) ||
        item.note.toLowerCase().includes(q) ||
        String(item.disciplina || '').toLowerCase().includes(q);
      const matchesFilter =
        filter === 'Todos' ||
        normalizeStr(item.type) === normalizeStr(filter);
      return matchesQuery && matchesFilter;
    });
  }, [filter, query, timeline]);

  const totalSessions = timeline.length;
  const totalMinutes  = useMemo(() => timeline.reduce((s, i) => s + (i.duration || 0), 0), [timeline]);
  const avgAccuracy   = useMemo(() => {
    const withAcc = timeline.filter((i) => i.questions > 0);
    if (!withAcc.length) return null;
    return Math.round(withAcc.reduce((s, i) => s + i.accuracy, 0) / withAcc.length);
  }, [timeline]);

  return (
    <div className="page-shell flex h-full min-h-0 flex-col !gap-3 !pb-6 !pt-4 animate-in fade-in duration-500 sm:!pt-5 lg:!gap-4">

      {/* Cabeçalho escuro — simples, sem KPIs no bloco premium */}
      <PageHeadPremium
        icon={History}
        title="Histórico"
        subtitle="Linha do tempo dos seus registros. A análise fica na aba Estatísticas."
        trailing={
          totalSessions > 0 ? (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <HeaderStat icon={History} label="Sessões"    value={String(totalSessions)} />
              <HeaderStat icon={Clock}   label="Tempo"      value={formatMinutesLabel(totalMinutes)} />
              {avgAccuracy !== null && (
                <HeaderStat icon={Target} label="Acerto médio" value={`${avgAccuracy}%`} />
              )}
            </div>
          ) : null
        }
      />

      {/* Busca + filtros */}
      <div className="section-card shrink-0" style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Campo de busca */}
        <div style={{ position: 'relative' }}>
          <Search
            size={14}
            style={{
              position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)',
              color: 'var(--pl-ink-3)', pointerEvents: 'none',
            }}
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por matéria, tópico ou observação…"
            style={{
              width: '100%', height: 36, paddingLeft: 34, paddingRight: 12,
              border: '1px solid var(--pl-rule-strong)', borderRadius: 7,
              background: 'var(--pl-bg-soft)', color: 'var(--pl-ink)',
              fontFamily: 'var(--pl-sans)', fontSize: 13, fontWeight: 500,
              outline: 'none', transition: 'border-color .12s',
            }}
            onFocus={(e) => { e.target.style.borderColor = 'var(--pl-accent)'; }}
            onBlur={(e)  => { e.target.style.borderColor = 'var(--pl-rule-strong)'; }}
          />
        </div>

        {/* Pills de filtro */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 5 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 9.5, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase',
            color: 'var(--pl-ink-3)', paddingRight: 2,
          }}>
            <SlidersHorizontal size={10} /> Filtro
          </span>

          {FILTERS.map((item) => {
            const active = filter === item;
            return (
              <button
                key={item}
                type="button"
                onClick={() => setFilter(item)}
                style={{
                  height: 26, padding: '0 10px', borderRadius: 5,
                  border: active ? '1px solid var(--pl-ink)' : '1px solid var(--pl-rule-2)',
                  background: active ? 'var(--pl-ink)' : 'transparent',
                  color: active ? 'var(--pl-bg)' : 'var(--pl-ink-3)',
                  fontFamily: 'var(--pl-sans)', fontSize: 11.5, fontWeight: 600,
                  cursor: 'pointer', transition: 'background .1s, color .1s, border-color .1s',
                }}
              >
                {item}
              </button>
            );
          })}

          <span style={{
            marginLeft: 'auto', height: 22, padding: '0 9px', borderRadius: 4,
            border: '1px solid var(--pl-rule-2)', background: 'var(--pl-bg-soft)',
            color: 'var(--pl-ink-3)', fontFamily: 'var(--pl-mono)',
            fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
            display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap',
          }}>
            {filtered.length} / {totalSessions}
          </span>
        </div>
      </div>

      {/* Timeline */}
      <div
        className="section-card"
        style={{ flex: 1, minHeight: 0, overflow: 'hidden', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}
      >
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div>
            <p className="pl-eyebrow" style={{ fontSize: 9.5, marginBottom: 3 }}>Linha do tempo</p>
            <h3 style={{ margin: 0, fontFamily: 'var(--pl-sans)', fontSize: 14.5, fontWeight: 700, color: 'var(--pl-ink)', letterSpacing: '-0.01em' }}>
              Registros por matéria
            </h3>
          </div>
        </div>

        <div
          className="custom-scrollbar"
          style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 7, paddingRight: 2 }}
        >
          {filtered.length === 0
            ? <EmptyState hasRecords={totalSessions > 0} />
            : filtered.map((item) => <HistoryCard key={item.id} item={item} />)
          }
        </div>
      </div>
    </div>
  );
}

/* ── Stat no trailing do header (sem KPI gigante) ── */
function HeaderStat({ icon: Icon, label, value }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 7,
      padding: '6px 12px', borderRadius: 10,
      border: '1px solid rgba(255,255,255,0.10)',
      background: 'rgba(255,255,255,0.07)',
    }}>
      <Icon size={13} style={{ color: 'rgba(255,255,255,0.50)', flexShrink: 0 }} />
      <div>
        <p style={{ margin: 0, fontFamily: 'var(--pl-sans)', fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)' }}>
          {label}
        </p>
        <p style={{ margin: 0, fontFamily: 'var(--pl-serif)', fontStyle: 'italic', fontSize: 16, fontWeight: 400, lineHeight: 1.1, color: '#fff', letterSpacing: '-0.02em' }}>
          {value}
        </p>
      </div>
    </div>
  );
}

/* ── Card de entrada da timeline ── */
function HistoryCard({ item }) {
  const palette = TYPE_PALETTE[item.color] || TYPE_PALETTE.blue;

  return (
    <div
      style={{
        position: 'relative', borderRadius: 9,
        border: `1px solid ${palette.border}`,
        background: 'var(--pl-surface)', overflow: 'hidden',
        transition: 'box-shadow .14s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 3px 10px rgba(20,17,13,0.08)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
    >
      {/* Faixa lateral */}
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: 3, background: palette.stripe }} />

      <div style={{ padding: '11px 14px 11px 17px' }}>
        {/* Linha 1: tipo + data | métricas */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', minWidth: 0 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', height: 19, padding: '0 7px',
              borderRadius: 3, border: `1px solid ${palette.border}`, background: palette.bg,
              color: palette.text, fontFamily: 'var(--pl-sans)',
              fontSize: 9, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase',
            }}>
              {item.type}
            </span>
            <span style={{
              fontFamily: 'var(--pl-mono)', fontSize: 9.5, fontWeight: 700,
              letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--pl-ink-3)',
            }}>
              {formatDate(item.date)}
            </span>
          </div>

          <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
            <MiniMetric label="Tempo"    value={formatMinutesLabel(item.duration)} />
            <MiniMetric label="Questões" value={String(item.questions)} />
            <MiniMetric label="Acerto"   value={`${item.accuracy}%`} highlight={item.accuracy >= 70} />
          </div>
        </div>

        {/* Título */}
        <h4 style={{ margin: '7px 0 0', fontFamily: 'var(--pl-sans)', fontSize: 13.5, fontWeight: 700, letterSpacing: '-0.01em', color: 'var(--pl-ink)', lineHeight: 1.3 }}>
          {item.title}
        </h4>

        {/* Nota */}
        {item.note ? (
          <p style={{
            margin: '3px 0 0', fontFamily: 'var(--pl-sans)', fontSize: 12, fontWeight: 500,
            lineHeight: 1.5, color: 'var(--pl-ink-3)',
            overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          }}>
            {item.note}
          </p>
        ) : null}

        {/* Barra de performance */}
        {item.questions > 0 && (
          <div style={{ marginTop: 9 }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', marginBottom: 3,
              fontFamily: 'var(--pl-mono)', fontSize: 8.5, fontWeight: 700,
              letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--pl-ink-3)',
            }}>
              <span>Performance</span>
              <span style={{ color: palette.text }}>{item.accuracy}%</span>
            </div>
            <div style={{ height: 3, borderRadius: 99, background: 'var(--pl-rule)', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 99, width: `${item.accuracy}%`, background: palette.stripe, transition: 'width .4s ease' }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Métrica compacta no card ── */
function MiniMetric({ label, value, highlight = false }) {
  return (
    <div style={{
      minWidth: 50, padding: '4px 7px', borderRadius: 6, textAlign: 'center',
      border: '1px solid var(--pl-rule-2)',
      background: highlight ? 'rgba(48,94,34,0.07)' : 'var(--pl-bg-soft)',
    }}>
      <p style={{ margin: 0, fontFamily: 'var(--pl-mono)', fontSize: 8, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--pl-ink-3)', marginBottom: 1 }}>
        {label}
      </p>
      <p style={{ margin: 0, fontFamily: 'var(--pl-serif)', fontStyle: 'italic', fontSize: 14, fontWeight: 400, lineHeight: 1, color: highlight ? '#305e22' : 'var(--pl-ink)', letterSpacing: '-0.02em' }}>
        {value}
      </p>
    </div>
  );
}

/* ── Estado vazio ── */
function EmptyState({ hasRecords }) {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: 160, borderRadius: 8, border: '1.5px dashed var(--pl-rule-strong)',
      background: 'var(--pl-bg-soft)', padding: '28px 20px', textAlign: 'center', gap: 8,
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 9,
        background: 'var(--pl-surface)', border: '1px solid var(--pl-rule-2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <BookOpen size={18} style={{ color: 'var(--pl-ink-3)' }} />
      </div>
      <p style={{ margin: 0, fontFamily: 'var(--pl-sans)', fontSize: 13.5, fontWeight: 700, color: 'var(--pl-ink)', letterSpacing: '-0.01em' }}>
        {hasRecords ? 'Nenhum resultado para esse filtro.' : 'Nenhum registro ainda.'}
      </p>
      <p style={{ margin: 0, fontFamily: 'var(--pl-sans)', fontSize: 12, fontWeight: 500, color: 'var(--pl-ink-3)', maxWidth: 300, lineHeight: 1.5 }}>
        {hasRecords
          ? 'Tente outro filtro ou limpe a busca.'
          : 'Registre uma sessão de estudo para começar a montar sua linha do tempo.'}
      </p>
    </div>
  );
}
