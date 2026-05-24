import React, { useMemo, useState } from 'react';
import {
  History,
  BookOpen,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import {
  buildCanonicalHistory,
  buildHistoryTimelineItem,
  formatMinutesLabel,
} from '../lib/studyAnalytics';
import PageHeadPremium, {
  PageHeadPremiumStatCompact,
} from '../components/PageHeadPremium';

/* ── Paleta de cores por tipo de registro ──────────────────────────────────
   Cada entrada = { stripe, bg, border, text } — cores cálidas, nunca cool/slate. */
const TYPE_PALETTE = {
  blue: {
    stripe: '#2557a7',
    bg:     'rgba(30, 58, 95, 0.05)',
    border: 'rgba(30, 58, 95, 0.14)',
    text:   '#1e3a5f',
  },
  orange: {
    stripe: '#c05621',
    bg:     'rgba(192, 86, 33, 0.05)',
    border: 'rgba(192, 86, 33, 0.16)',
    text:   '#c05621',
  },
  emerald: {
    stripe: '#305e22',
    bg:     'rgba(48, 94, 34, 0.05)',
    border: 'rgba(48, 94, 34, 0.16)',
    text:   '#305e22',
  },
  indigo: {
    stripe: '#3730a3',
    bg:     'rgba(55, 48, 163, 0.05)',
    border: 'rgba(55, 48, 163, 0.14)',
    text:   '#3730a3',
  },
};

const FILTERS = ['Todos', 'Estudo', 'Questões', 'Simulado', 'Revisão'];

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
        normalizeFilterValue(item.type) === normalizeFilterValue(filter);
      return matchesQuery && matchesFilter;
    });
  }, [filter, query, timeline]);

  const totalSessions  = timeline.length;
  const totalMinutes   = useMemo(() => timeline.reduce((s, i) => s + (i.duration || 0), 0), [timeline]);
  const avgAccuracy    = useMemo(() => {
    const withAcc = timeline.filter((i) => i.questions > 0);
    if (!withAcc.length) return 0;
    return Math.round(withAcc.reduce((s, i) => s + i.accuracy, 0) / withAcc.length);
  }, [timeline]);

  return (
    <div className="page-shell flex h-full min-h-0 flex-col !gap-3 !pb-6 !pt-4 animate-in fade-in duration-500 sm:!pt-5 lg:!gap-4">

      {/* Cabeçalho premium escuro */}
      <PageHeadPremium
        icon={History}
        title="Histórico"
        subtitle="Linha do tempo dos seus registros. A análise fica na aba Estatísticas."
        stats={[
          { key: 'sess', label: 'Sessões', value: String(totalSessions),            icon: History,   accent: 'blue',    valueLayout: 'hero' },
          { key: 'time', label: 'Tempo',   value: formatMinutesLabel(totalMinutes), icon: BookOpen,  accent: 'emerald', valueLayout: 'hero' },
          { key: 'acc',  label: 'Acerto',  value: `${avgAccuracy}%`,               icon: SlidersHorizontal, accent: 'amber', valueLayout: 'hero' },
        ]}
        statsDense
      />

      {/* Busca + filtros */}
      <div
        className="section-card shrink-0"
        style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}
      >
        {/* Campo de busca */}
        <div style={{ position: 'relative' }}>
          <Search
            size={14}
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--pl-ink-3)',
              pointerEvents: 'none',
            }}
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por matéria, tópico ou observação…"
            style={{
              width: '100%',
              height: 38,
              paddingLeft: 36,
              paddingRight: 12,
              border: '1px solid var(--pl-rule-strong)',
              borderRadius: 8,
              background: 'var(--pl-bg-soft)',
              color: 'var(--pl-ink)',
              fontFamily: 'var(--pl-sans)',
              fontSize: 13,
              fontWeight: 500,
              outline: 'none',
              transition: 'border-color .12s',
            }}
            onFocus={(e)  => { e.target.style.borderColor = 'var(--pl-accent)'; }}
            onBlur={(e)   => { e.target.style.borderColor = 'var(--pl-rule-strong)'; }}
          />
        </div>

        {/* Pills de filtro */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 9.5,
              fontWeight: 700,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'var(--pl-ink-3)',
              paddingRight: 4,
            }}
          >
            <SlidersHorizontal size={11} />
            Filtro
          </span>
          {FILTERS.map((item) => {
            const active = filter === item;
            return (
              <button
                key={item}
                type="button"
                onClick={() => setFilter(item)}
                style={{
                  height: 28,
                  padding: '0 10px',
                  borderRadius: 6,
                  border: active ? '1px solid var(--pl-ink)' : '1px solid var(--pl-rule-2)',
                  background: active ? 'var(--pl-ink)' : 'var(--pl-surface)',
                  color: active ? 'var(--pl-bg)' : 'var(--pl-ink-2)',
                  fontFamily: 'var(--pl-sans)',
                  fontSize: 11.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background .1s, color .1s, border-color .1s',
                }}
              >
                {item}
              </button>
            );
          })}

          {/* Contador */}
          <span
            style={{
              marginLeft: 'auto',
              height: 24,
              padding: '0 10px',
              borderRadius: 5,
              border: '1px solid var(--pl-rule-2)',
              background: 'var(--pl-bg-soft)',
              color: 'var(--pl-ink-3)',
              fontFamily: 'var(--pl-sans)',
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: '0.06em',
              display: 'inline-flex',
              alignItems: 'center',
              whiteSpace: 'nowrap',
            }}
          >
            {filtered.length} / {totalSessions}
          </span>
        </div>
      </div>

      {/* Timeline */}
      <div
        className="section-card"
        style={{ flex: 1, minHeight: 0, overflow: 'hidden', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}
      >
        {/* Cabeçalho da seção */}
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, flexShrink: 0 }}>
          <div>
            <p className="pl-eyebrow" style={{ fontSize: 10 }}>Linha do tempo</p>
            <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--pl-sans)', fontSize: 15, fontWeight: 700, color: 'var(--pl-ink)', letterSpacing: '-0.01em' }}>
              Registros consolidados por matéria
            </h3>
          </div>
        </div>

        {/* Lista */}
        <div
          className="custom-scrollbar"
          style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 2 }}
        >
          {filtered.length === 0 ? (
            <EmptyState hasRecords={totalSessions > 0} />
          ) : (
            filtered.map((item) => (
              <HistoryCard key={item.id} item={item} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Card de entrada ────────────────────────────────────────────── */
function HistoryCard({ item }) {
  const palette = TYPE_PALETTE[item.color] || TYPE_PALETTE.blue;

  return (
    <div
      style={{
        position: 'relative',
        borderRadius: 10,
        border: `1px solid ${palette.border}`,
        background: 'var(--pl-surface)',
        overflow: 'hidden',
        transition: 'box-shadow .15s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(20,17,13,0.08)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
    >
      {/* Faixa lateral colorida */}
      <div
        style={{
          position: 'absolute',
          top: 0, bottom: 0, left: 0,
          width: 3,
          background: palette.stripe,
          borderRadius: '10px 0 0 10px',
        }}
      />

      <div style={{ padding: '12px 14px 12px 18px' }}>
        {/* Topo: tipo + data */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                height: 20,
                padding: '0 8px',
                borderRadius: 4,
                border: `1px solid ${palette.border}`,
                background: palette.bg,
                color: palette.text,
                fontFamily: 'var(--pl-sans)',
                fontSize: 9.5,
                fontWeight: 800,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
              }}
            >
              {item.type}
            </span>
            <span
              style={{
                fontFamily: 'var(--pl-mono)',
                fontSize: 9.5,
                fontWeight: 700,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--pl-ink-3)',
              }}
            >
              {formatDate(item.date)}
            </span>
          </div>

          {/* Métricas compactas — direita */}
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <MiniMetric label="Tempo"    value={formatMinutesLabel(item.duration)} />
            <MiniMetric label="Questões" value={String(item.questions)} />
            <MiniMetric label="Acerto"   value={`${item.accuracy}%`} highlight={item.accuracy >= 70} />
          </div>
        </div>

        {/* Título + nota */}
        <h4
          style={{
            margin: 0,
            fontFamily: 'var(--pl-sans)',
            fontSize: 13.5,
            fontWeight: 700,
            letterSpacing: '-0.01em',
            color: 'var(--pl-ink)',
            lineHeight: 1.3,
          }}
        >
          {item.title}
        </h4>
        {item.note ? (
          <p
            style={{
              margin: '4px 0 0',
              fontFamily: 'var(--pl-sans)',
              fontSize: 12,
              fontWeight: 500,
              lineHeight: 1.55,
              color: 'var(--pl-ink-3)',
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {item.note}
          </p>
        ) : null}

        {/* Barra de performance */}
        {item.questions > 0 && (
          <div style={{ marginTop: 10 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: 4,
                fontFamily: 'var(--pl-mono)',
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: 'var(--pl-ink-3)',
              }}
            >
              <span>Performance</span>
              <span style={{ color: palette.text }}>{item.accuracy}%</span>
            </div>
            <div
              style={{
                height: 3,
                borderRadius: 99,
                background: 'var(--pl-rule)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  borderRadius: 99,
                  width: `${item.accuracy}%`,
                  background: palette.stripe,
                  transition: 'width .4s ease',
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Métrica compacta ───────────────────────────────────────────── */
function MiniMetric({ label, value, highlight = false }) {
  return (
    <div
      style={{
        minWidth: 52,
        padding: '5px 8px',
        borderRadius: 7,
        border: '1px solid var(--pl-rule-2)',
        background: highlight ? 'rgba(48, 94, 34, 0.07)' : 'var(--pl-bg-soft)',
        textAlign: 'center',
      }}
    >
      <p
        style={{
          margin: 0,
          fontFamily: 'var(--pl-mono)',
          fontSize: 8.5,
          fontWeight: 700,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'var(--pl-ink-3)',
          marginBottom: 2,
        }}
      >
        {label}
      </p>
      <p
        style={{
          margin: 0,
          fontFamily: 'var(--pl-serif)',
          fontStyle: 'italic',
          fontSize: 15,
          fontWeight: 400,
          lineHeight: 1,
          color: highlight ? '#305e22' : 'var(--pl-ink)',
          letterSpacing: '-0.02em',
        }}
      >
        {value}
      </p>
    </div>
  );
}

/* ─── Estado vazio ───────────────────────────────────────────────── */
function EmptyState({ hasRecords }) {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 180,
        borderRadius: 10,
        border: '1.5px dashed var(--pl-rule-strong)',
        background: 'var(--pl-bg-soft)',
        padding: '32px 24px',
        textAlign: 'center',
        gap: 10,
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 10,
          background: 'var(--pl-surface)',
          border: '1px solid var(--pl-rule-2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <BookOpen size={20} style={{ color: 'var(--pl-ink-3)' }} />
      </div>
      <p
        style={{
          margin: 0,
          fontFamily: 'var(--pl-sans)',
          fontSize: 14,
          fontWeight: 700,
          color: 'var(--pl-ink)',
          letterSpacing: '-0.01em',
        }}
      >
        {hasRecords ? 'Nenhum resultado para esse filtro.' : 'Nenhum registro ainda.'}
      </p>
      <p
        style={{
          margin: 0,
          fontFamily: 'var(--pl-sans)',
          fontSize: 12.5,
          fontWeight: 500,
          color: 'var(--pl-ink-3)',
          maxWidth: 320,
          lineHeight: 1.55,
        }}
      >
        {hasRecords
          ? 'Tente outro filtro ou limpe a busca.'
          : 'Registre uma sessão de estudo para começar a montar sua linha do tempo.'}
      </p>
    </div>
  );
}
