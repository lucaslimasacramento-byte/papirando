import React, { useMemo, useState } from 'react';
import { BookOpen, Search, SlidersHorizontal } from 'lucide-react';
import {
  buildCanonicalHistory,
  buildHistoryTimelineItem,
  formatMinutesLabel,
} from '../lib/studyAnalytics';

/* ── Paleta por tipo de registro ────────────────────────────────── */
const TYPE_PALETTE = {
  blue:    { stripe: '#2557a7', bg: 'var(--pl-accent-soft)',  border: 'rgba(30,58,95,0.14)',   text: '#1e3a5f' },
  orange:  { stripe: '#c05621', bg: 'var(--pl-danger-soft)',  border: 'rgba(192,86,33,0.16)',  text: '#c05621' },
  emerald: { stripe: '#305e22', bg: 'var(--pl-success-soft)', border: 'rgba(48,94,34,0.16)',   text: '#305e22' },
  indigo:  { stripe: '#3730a3', bg: 'var(--pl-accent-soft)',  border: 'rgba(55,48,163,0.14)',  text: '#3730a3' },
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

  return (
    <div className="pl-page">

      {/* ── Cabeçalho padrão da plataforma (variante C · com stat) ── */}
      <header style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 32, alignItems: 'end' }}>
        <div>
          <h1 className="pl-display" style={{ margin: 0, fontSize: 56, color: 'var(--pl-ink)' }}>
            Histórico<span style={{ color: 'var(--pl-accent)' }}>.</span>
          </h1>
          <p style={{ margin: '12px 0 0', fontSize: 15, fontWeight: 500, color: 'var(--pl-ink-2)', maxWidth: 660, lineHeight: 1.5 }}>
            Toda sessão registrada, em ordem cronológica. A análise fica na aba Estatísticas.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ background: 'var(--pl-bg-soft)', border: '1px solid var(--pl-rule-2)', borderRadius: 8, padding: '10px 16px', minWidth: 92 }}>
            <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--pl-ink-3)', lineHeight: 1, fontFamily: 'var(--pl-sans)' }}>Registros</div>
            <div style={{ fontFamily: 'var(--pl-serif)', fontStyle: 'italic', fontWeight: 300, fontSize: 34, letterSpacing: '-0.04em', lineHeight: 1, color: 'var(--pl-ink)', marginTop: 6 }}>
              {totalSessions}<span style={{ color: 'var(--pl-accent)' }}>.</span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Busca ── */}
      <div style={{
        flexShrink: 0,
        background: 'var(--pl-surface)',
        border: '1px solid var(--pl-rule-strong)',
        borderRadius: 8,
        padding: '13px 18px',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <Search size={15} style={{ color: 'var(--pl-ink-3)', flexShrink: 0 }} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por matéria, tópico ou observação…"
          style={{
            flex: 1, background: 'transparent', border: 0, outline: 0,
            fontFamily: 'var(--pl-sans)', fontSize: 13.5,
            color: 'var(--pl-ink-2)',
            letterSpacing: '-0.005em',
          }}
        />
        <kbd style={{
          fontFamily: 'var(--pl-mono)', fontSize: 10,
          color: 'var(--pl-ink-3)', fontWeight: 500,
          background: 'var(--pl-bg-soft)',
          padding: '2px 6px', borderRadius: 3,
          border: '1px solid var(--pl-rule)',
          lineHeight: 1.6,
        }}>⌘ /</kbd>
      </div>

      {/* ── Filtros ── */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{
          fontFamily: 'var(--pl-sans)',
          fontSize: 10.5, fontWeight: 700, letterSpacing: '0.22em',
          textTransform: 'uppercase', color: 'var(--pl-ink-3)',
          display: 'inline-flex', alignItems: 'center', gap: 6, marginRight: 4,
        }}>
          <SlidersHorizontal size={11} /> Filtro
        </span>

        {FILTERS.map((item) => {
          const active = filter === item;
          return (
            <button
              key={item}
              type="button"
              onClick={() => setFilter(item)}
              style={{
                padding: '7px 14px',
                fontFamily: 'var(--pl-sans)', fontSize: 12.5, fontWeight: 600,
                letterSpacing: '-0.005em',
                color: active ? 'var(--pl-bg)' : 'var(--pl-ink-2)',
                background: active ? 'var(--pl-ink)' : 'var(--pl-surface)',
                border: `1px solid ${active ? 'var(--pl-ink)' : 'var(--pl-rule-strong)'}`,
                borderRadius: 6, cursor: 'pointer',
                transition: 'background .12s, color .12s, border-color .12s',
              }}
            >
              {item}
            </button>
          );
        })}

        <span style={{
          marginLeft: 'auto',
          fontFamily: 'var(--pl-mono)', fontSize: 12,
          color: 'var(--pl-ink-3)', fontWeight: 500,
        }}>
          <span style={{ color: 'var(--pl-ink-2)', fontWeight: 600 }}>{filtered.length}</span>
          {' / '}
          <span style={{ color: 'var(--pl-ink-2)', fontWeight: 600 }}>{totalSessions}</span>
        </span>
      </div>

      {/* ── Timeline ── */}
      <div style={{
        flex: 1, minHeight: 0,
        background: 'var(--pl-bg-soft)',
        border: '1px solid var(--pl-rule-strong)',
        borderRadius: 8,
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Cabeçalho da seção */}
        <div style={{
          flexShrink: 0,
          padding: '16px 22px',
          borderBottom: '1px solid var(--pl-rule)',
          background: 'var(--pl-surface)',
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <span style={{
            fontFamily: 'var(--pl-sans)',
            fontSize: 10, fontWeight: 700, letterSpacing: '0.28em',
            textTransform: 'uppercase', color: 'var(--pl-ink-3)',
            marginRight: 4,
          }}>
            Linha do tempo
          </span>
          <span style={{
            fontFamily: 'var(--pl-serif)', fontStyle: 'italic', fontWeight: 400,
            fontSize: 21, letterSpacing: '-0.025em',
            color: 'var(--pl-ink)', lineHeight: 1,
          }}>
            Registros por matéria
          </span>
        </div>

        {/* Lista rolável */}
        <div
          className="custom-scrollbar"
          style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 7 }}
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

/* ── Card de entrada da timeline ── */
function HistoryCard({ item }) {
  const palette = TYPE_PALETTE[item.color] || TYPE_PALETTE.blue;

  return (
    <div
      style={{
        position: 'relative', borderRadius: 8,
        border: `1px solid ${palette.border}`,
        background: 'var(--pl-surface)', overflow: 'hidden',
        transition: 'box-shadow .14s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 3px 10px rgba(20,17,13,0.08)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
    >
      {/* Faixa lateral colorida */}
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

/* ── Estado vazio editorial ── */
function EmptyState({ hasRecords }) {
  if (hasRecords) {
    return (
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        minHeight: 160, padding: '32px 20px', textAlign: 'center', gap: 10,
      }}>
        <h3 style={{
          fontFamily: 'var(--pl-serif)', fontStyle: 'italic', fontWeight: 400,
          fontSize: 24, letterSpacing: '-0.025em',
          color: 'var(--pl-ink)', lineHeight: 1.1, margin: 0,
        }}>
          Nenhum resultado<span style={{ color: 'var(--pl-accent)' }}>.</span>
        </h3>
        <p style={{ margin: 0, fontFamily: 'var(--pl-sans)', fontSize: 13, fontWeight: 500, color: 'var(--pl-ink-3)', maxWidth: '36ch', lineHeight: 1.5 }}>
          Tente outro filtro ou limpe a busca.
        </p>
      </div>
    );
  }

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '64px 32px 72px', textAlign: 'center', gap: 14,
    }}>
      {/* Mark com dog-ear */}
      <div style={{
        width: 76, height: 76,
        background: 'var(--pl-bg)',
        border: '1px solid var(--pl-rule-strong)',
        borderRadius: 8,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 4,
        position: 'relative',
        flexShrink: 0,
      }}>
        <div style={{
          position: 'absolute', top: 0, right: 0,
          width: 20, height: 20,
          background: 'var(--pl-bg-soft)',
          clipPath: 'polygon(100% 0, 0 0, 100% 100%)',
          borderBottom: '1px solid var(--pl-rule)',
          borderLeft: '1px solid var(--pl-rule)',
        }} />
        <BookOpen size={30} strokeWidth={1.4} style={{ color: 'var(--pl-ink-3)' }} />
      </div>

      <h3 style={{
        fontFamily: 'var(--pl-serif)', fontStyle: 'italic', fontWeight: 400,
        fontSize: 26, letterSpacing: '-0.025em',
        color: 'var(--pl-ink)', lineHeight: 1.1, margin: 0,
      }}>
        Nada registrado ainda<span style={{ color: 'var(--pl-accent)' }}>.</span>
      </h3>

      <p style={{
        fontFamily: 'var(--pl-sans)', fontSize: 13.5, lineHeight: 1.55,
        color: 'var(--pl-ink-2)', fontWeight: 500,
        maxWidth: '44ch', margin: 0,
      }}>
        Comece uma sessão de estudo — em alguns minutos o primeiro
        registro aparece por aqui, ordenado por matéria e dia.
      </p>

      <button style={{
        marginTop: 10,
        padding: '10px 18px',
        background: 'var(--pl-ink)', color: 'var(--pl-bg)',
        border: 0, borderRadius: 6,
        fontFamily: 'var(--pl-sans)', fontWeight: 600, fontSize: 13.5,
        letterSpacing: '-0.005em', cursor: 'pointer',
        display: 'inline-flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{
          width: 14, height: 14, flexShrink: 0,
          background: 'var(--pl-bg)', color: 'var(--pl-ink)',
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 6.5, lineHeight: 1,
        }}>▶</span>
        Papirar agora
      </button>

      <p style={{ margin: '2px 0 0', fontFamily: 'var(--pl-sans)', fontSize: 12.5, color: 'var(--pl-ink-3)', fontWeight: 500 }}>
        Ou explore o{' '}
        <a href="#" style={{ color: 'var(--pl-accent)', textDecoration: 'none', borderBottom: '1px solid currentColor', paddingBottom: 1, fontWeight: 600 }}>
          edital verticalizado
        </a>
        {' '}antes de começar.
      </p>
    </div>
  );
}
