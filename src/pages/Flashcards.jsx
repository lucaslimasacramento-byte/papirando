import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PremiumGate from '../components/PremiumGate';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  Flame,
  Layers3,
  Loader2,
  Play,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import {
  countDueToday,
  formatNextInterval,
  getDueCards,
  RATING_LABELS,
  State,
} from '../lib/fsrs';
import {
  createCard,
  createDeck,
  deleteCard,
  deleteDeck,
  loadCards,
  loadDecks,
  loadDueCards,
  submitReview,
} from '../lib/flashcardsApi';
import { generateFlashcards } from '../lib/aiClient';

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Helpers Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

const COLOR_STYLES = {
  blue:    { bg: 'var(--pl-accent-soft)',   dot: 'var(--pl-accent)',   text: 'var(--pl-accent)'   },
  emerald: { bg: 'var(--pl-success-soft)',  dot: 'var(--pl-success)',  text: 'var(--pl-success)'  },
  violet:  { bg: 'var(--pl-accent-soft)',   dot: 'var(--pl-accent)',   text: 'var(--pl-accent)'    },
  orange:  { bg: 'var(--pl-warn-soft)',     dot: 'var(--pl-warn)',     text: 'var(--pl-warn)'     },
  rose:    { bg: 'var(--pl-danger-soft)',   dot: 'var(--pl-danger)',   text: 'var(--pl-danger)'   },
  amber:   { bg: 'var(--pl-warn-soft)',     dot: 'var(--pl-warn)',     text: 'var(--pl-warn)'     },
};

const COLOR_OPTIONS = Object.keys(COLOR_STYLES);

function getColor(color) {
  return COLOR_STYLES[color] || COLOR_STYLES.blue;
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Sub-components Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

function ErrBanner({ msg }) {
  if (!msg) return null;
  return (
    <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, borderRadius: 12, border: '1px solid var(--pl-danger)', background: 'var(--pl-danger-soft)', padding: '10px 16px', fontSize: 14, fontWeight: 600, color: 'var(--pl-danger)', flexShrink: 0 }}>
      <X size={14} style={{ flexShrink: 0 }} />
      {msg}
    </div>
  );
}

function FlashcardsHeader({ onNovoDeck, onGerarIa, isPremium, onUpgrade }) {
  return (
    <header style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 32, alignItems: 'end' }}>
      <div>
        <span className="pl-eyebrow">Prática / FSRS-4.5</span>
        <h1 className="pl-display" style={{ margin: 0, fontSize: 56, color: 'var(--pl-ink)' }}>
          Flashcards<span style={{ color: 'var(--pl-accent)' }}>.</span>
        </h1>
        <p style={{ margin: '12px 0 0', fontSize: 15, fontWeight: 500, color: 'var(--pl-ink-2)', maxWidth: 660, lineHeight: 1.5 }}>
          Decks de repetição espaçada com <span className="pl-mark-text">geração com IA</span> quando você precisar.
          O motor decide quando rever, você só papira.
        </p>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button type="button" className="pl-btn pl-btn-primary" onClick={onNovoDeck}>
          <Plus size={13} /> Novo deck
        </button>
        {isPremium ? (
          <button type="button" className="pl-btn pl-btn-ai" onClick={onGerarIa}>
            <Sparkles size={12} /> Gerar com IA
          </button>
        ) : (
          <PremiumGate locked mode="button" feature="ai_flashcards" onUpgrade={onUpgrade}
            label="Gerar com IA" hint="Gere flashcards ilimitados com IA no Papiro" />
        )}
      </div>
    </header>
  );
}

function FlashKpiStrip({ stats }) {
  const items = [
    { label: 'Decks', value: String(stats.totalDecks).padStart(2, '0'), sub: 'coleções ativas' },
    { label: 'Cards', value: String(stats.totalCards), sub: `${stats.newCards} novos pra entrar`, tone: 'accent' },
    { label: 'Vence hoje', value: String(stats.dueToday).padStart(2, '0'), sub: 'alta prioridade', tone: 'warn', icon: Flame },
    { label: 'Retenção 7d', value: stats.retention == null ? '--%' : `${stats.retention}%`, sub: 'meta saudável >= 85%', tone: 'success' },
  ];
  return (
    <section className="flash-kpi-grid">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.label} className={`pl-card flash-kpi-card ${item.tone ? `flash-kpi-${item.tone}` : ''}`}>
            <div className="pl-overline">{item.label}</div>
            <div className="flash-kpi-value">
              {item.value}
              {Icon && <Icon size={15} />}
            </div>
            <p>{item.sub}</p>
          </div>
        );
      })}
    </section>
  );
}

function AprenderHojeCard({ totals, nextCard, onIniciar, onSomenteRevisao }) {
  const total = Math.max(0, Number(totals.dueToday || 0));
  const novos = Math.max(0, Number(totals.newCards || 0));
  const rev = Math.max(0, Number(totals.totalReviewed || 0));
  const learning = Math.max(0, Math.round(novos * 0.18));
  const relearning = Math.max(0, total > 3 ? Math.round(total * 0.18) : 0);

  return (
    <section className="flash-dark-card">
      <div className="flash-card-corner" />
      <div className="flash-dark-head">
        <div>
          <div className="flash-live-dot"><span /> Aprender hoje</div>
          <h2>
            <span>{String(total).padStart(2, '0')}</span> cards te esperam
          </h2>
          <p>
            Cerca de {Math.max(4, Math.round(Math.max(total, 1) * 0.45))} minutos. O FSRS escolhe a ordem; você responde e segue.
          </p>
        </div>
        <div className="flash-dark-actions">
          <button type="button" className="flash-highlight-btn" onClick={onIniciar}>
            <Play size={12} /> Iniciar revisão
          </button>
          <button type="button" className="flash-outline-dark" onClick={onSomenteRevisao}>
            Estudar só revisões
          </button>
        </div>
      </div>

      <StackedBar
        segments={[
          { n: novos, color: 'rgba(243,239,229,0.28)' },
          { n: learning, color: 'var(--pl-warn)' },
          { n: Math.max(total, rev), color: 'var(--pl-success)' },
          { n: relearning, color: 'var(--pl-danger)' },
        ]}
      />

      <div className="flash-state-grid">
        <StateMetric label="Novos" value={novos} />
        <StateMetric label="Aprendendo" value={learning} tone="warn" />
        <StateMetric label="Revisão" value={total} tone="success" />
        <StateMetric label="Reaprendendo" value={relearning} tone="danger" />
      </div>

      <NextCardPreview card={nextCard} />
    </section>
  );
}

function StackedBar({ segments }) {
  const total = segments.reduce((sum, item) => sum + Math.max(0, Number(item.n || 0)), 0) || 1;
  return (
    <div className="flash-stacked-bar">
      {segments.map((segment, index) => (
        <span
          key={`${segment.color}-${index}`}
          style={{ width: `${Math.max(4, (Math.max(0, segment.n || 0) / total) * 100)}%`, background: segment.color }}
        />
      ))}
    </div>
  );
}

function StateMetric({ label, value, tone = 'muted' }) {
  return (
    <div className={`flash-state-metric flash-state-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function NextCardPreview({ card }) {
  const previewCard = {
    stability: 1,
    difficulty: 5,
    elapsed_days: 0,
    scheduled_days: 0,
    reps: 0,
    lapses: 0,
    state: State.New,
    due: new Date().toISOString(),
    last_review: null,
    ...card,
  };

  return (
    <div className="flash-next-preview">
      <div>
        <span className="pl-overline">Próximo / {card?.disciplina || 'Geral'}</span>
        <strong>{card?.front || 'Nenhum card vencendo agora'}</strong>
      </div>
      <div className="flash-rating-grid">
        {[1, 2, 3, 4].map((rating) => (
          <div key={rating} className={`flash-rating-chip flash-rating-${rating}`}>
            <span>{RATING_LABELS[rating]?.label}</span>
            <em>{card ? formatNextInterval(previewCard, rating) : '-'}</em>
          </div>
        ))}
      </div>
    </div>
  );
}

function DecksSection({ decks, allCount, filter, setFilter, onAbrir, onEstudar, onDelete }) {
  const filters = [
    { id: 'todos', label: `Todos ${allCount}` },
    { id: 'vencendo', label: 'Vencendo' },
    { id: 'novos', label: 'Novos' },
    { id: 'ia', label: 'IA' },
  ];

  return (
    <section className="pl-card flash-decks-section">
      <div className="flash-section-head">
        <div>
          <div className="pl-overline">Seus decks</div>
          <h2 className="pl-section-title">Onde estamos hoje</h2>
        </div>
        <div className="flash-filter-pill">
          {filters.map((item) => (
            <button
              key={item.id}
              type="button"
              className={filter === item.id ? 'is-active' : ''}
              onClick={() => setFilter(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {decks.length === 0 ? (
        <div className="flash-dashed-note">Nenhum deck nesse filtro.</div>
      ) : (
        <div className="flash-decks-grid">
          {decks.map((deck) => (
            <DeckCard key={deck.id} deck={deck} onAbrir={onAbrir} onEstudar={onEstudar} onDelete={onDelete} />
          ))}
        </div>
      )}
    </section>
  );
}

function DeckCard({ deck, onAbrir, onEstudar, onDelete }) {
  const total = Number(deck.total_cards || 0);
  const reviewed = Number(deck.revisados || 0);
  const due = Number(deck.vencendoHoje || 0);
  const retention = Math.max(0, Math.min(100, Number(deck.retention || 0)));
  const tone = deck.tone || 'accent';

  return (
    <article className={`flash-deck-card flash-deck-${tone}`} onClick={() => onAbrir(deck)}>
      <div className="flash-card-corner" />
      <div className="flash-deck-top">
        <span className={`pl-chip flash-chip-${tone}`}>{deck.disciplina || 'Geral'}</span>
        {deck.isAi && <span className="pl-tag-ai">Bizu IA</span>}
        <button
          type="button"
          aria-label="Excluir deck"
          onClick={(event) => {
            event.stopPropagation();
            onDelete(deck);
          }}
        >
          <Trash2 size={13} />
        </button>
      </div>
      <h3>{deck.title}</h3>
      <div className="flash-mini-stats">
        <span><strong>{total}</strong> cards</span>
        <span><strong>{due}</strong> hoje</span>
        <span><strong>{retention || '--'}</strong>{retention ? '%' : ''} ret.</span>
      </div>
      <div className="pl-progress-track">
        <div className="pl-progress-fill" style={{ width: `${retention || Math.min(100, reviewed)}%` }} />
      </div>
      <button
        type="button"
        className={`pl-btn pl-btn-sm ${due > 0 ? 'pl-btn-primary' : ''}`}
        onClick={(event) => {
          event.stopPropagation();
          due > 0 ? onEstudar(deck) : onAbrir(deck);
        }}
      >
        {due > 0 ? <><Play size={11} /> Estudar {due} cards</> : <>Em dia - revisar mesmo assim <ArrowRight size={11} /></>}
      </button>
    </article>
  );
}

function GerarIaInlineCard({ disciplinaOptions, loading, error, onGerar }) {
  const [disciplinaId, setDisciplinaId] = useState('');
  const [disciplinaLivre, setDisciplinaLivre] = useState('');
  const [topico, setTopico] = useState('');
  const [quantidade, setQuantidade] = useState(10);
  const selected = disciplinaOptions.find((item) => item.id === disciplinaId);
  const disciplina = selected?.label || disciplinaLivre;

  return (
    <section className="pl-card-ai flash-ai-card">
      <div className="flash-ai-head">
        <span className="pl-tag-ai">Bizu IA</span>
        <span className="pl-overline">Gerar deck</span>
      </div>
      <h3>Crie um deck em <span>15 segundos</span></h3>
      <p>Diga disciplina e tópico. A IA escreve frente e verso no estilo de banca.</p>
      <label>
        <span>Disciplina</span>
        <select value={disciplinaId} onChange={(event) => setDisciplinaId(event.target.value)}>
          <option value="">Digite manualmente</option>
          {disciplinaOptions.map((item) => (
            <option key={item.id} value={item.id}>{item.label}</option>
          ))}
        </select>
      </label>
      {!disciplinaId && (
        <label>
          <span>Disciplina livre</span>
          <input value={disciplinaLivre} onChange={(event) => setDisciplinaLivre(event.target.value)} placeholder="Ex: Direito Constitucional" />
        </label>
      )}
      <label>
        <span>Tópico</span>
        <input value={topico} onChange={(event) => setTopico(event.target.value)} placeholder="Ex: controle de constitucionalidade" />
      </label>
      <label>
        <span>Quantidade - {quantidade} cards</span>
        <input type="range" min={5} max={20} value={quantidade} onChange={(event) => setQuantidade(Number(event.target.value))} />
      </label>
      <button
        type="button"
        className="pl-btn pl-btn-ai"
        disabled={loading}
        onClick={() => onGerar({ disciplina, topico, quantidade })}
      >
        {loading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
        Gerar {quantidade} flashcards
      </button>
      {error && <p className="flash-ai-error">{error}</p>}
    </section>
  );
}

function ProximosVencerList({ items, onAbrir }) {
  return (
    <section className="pl-card flash-side-card">
      <div className="pl-overline">Próximos a vencer</div>
      <h3 className="pl-section-title">Fila curta</h3>
      <div className="flash-side-list">
        {items.length === 0 ? (
          <div className="flash-dashed-note">Nada urgente agora.</div>
        ) : items.map((item) => (
          <button key={item.id} type="button" onClick={() => onAbrir(item)}>
            <span className={`flash-state-dot state-${item.state}`} />
            <span>
              <strong>{item.front}</strong>
              <em>{item.disciplina || 'Geral'} - {item.deck}</em>
            </span>
            <b>{item.dueLabel}</b>
          </button>
        ))}
      </div>
    </section>
  );
}

function AtividadeSemanaCard({ data, retencao }) {
  const max = Math.max(1, ...data.map((item) => item.n));
  const healthy = Number(retencao || 0) >= 85;
  return (
    <section className="pl-card-paper flash-week-card">
      <div className="pl-overline">Últimos 7 dias</div>
      <h3 className="pl-section-title">Ritmo de revisão</h3>
      <div className="flash-week-bars">
        {data.map((item, index) => (
          <div key={item.dia}>
            <span style={{ height: `${Math.max(8, (item.n / max) * 74)}px` }} className={index === data.length - 1 ? 'is-today' : ''} />
            <em>{item.dia}</em>
          </div>
        ))}
      </div>
      <p><strong>{retencao == null ? '--' : `${retencao}%`}</strong> de retenção média. {healthy ? 'Segue nesse ritmo.' : 'Vale revisar hoje.'}</p>
    </section>
  );
}

function FlashcardsEmptyState({ onManual, onIa, onEdital }) {
  return (
    <section className="pl-card-paper flash-empty-state">
      <div className="pl-overline">Primeiro deck</div>
      <h2>Três caminhos para começar a papirar</h2>
      <p>Monte um deck manual, deixe o Bizu IA criar a primeira leva, ou traga temas do edital verticalizado.</p>
      <div className="flash-empty-grid">
        <EmptyAction n="01" title="Deck manual" detail="Crie uma coleção simples e adicione frente e verso." cta="Criar deck" onClick={onManual} />
        <EmptyAction n="02" title="Gerar com IA" detail="Informe disciplina e tópico para receber cards revisáveis." cta="Usar Bizu IA" onClick={onIa} ai />
        <EmptyAction n="03" title="Do edital" detail="Use seus tópicos do edital como trilha de memorização." cta="Abrir edital" onClick={onEdital} />
      </div>
    </section>
  );
}

function EmptyAction({ n, title, detail, cta, onClick, ai = false }) {
  return (
    <article className={ai ? 'pl-card-ai flash-empty-action' : 'pl-card flash-empty-action'}>
      <div>
        <span className="pl-serif-number">{n}</span>
        {ai && <span className="pl-tag-ai">Bizu IA</span>}
      </div>
      <h3>{title}</h3>
      <p>{detail}</p>
      <button type="button" className={`pl-btn pl-btn-sm ${ai ? 'pl-btn-ai' : 'pl-btn-primary'}`} onClick={onClick}>
        {cta}
      </button>
    </article>
  );
}

function InlineDeckForm({ deckForm, setDeckForm, saving, formErr, onCancel, onSubmit }) {
  return (
    <section className="pl-card flash-inline-form">
      <ErrBanner msg={formErr} />
      <input
        type="text"
        className={inputCls()}
        placeholder="Titulo do deck"
        value={deckForm.title}
        onChange={(event) => setDeckForm((form) => ({ ...form, title: event.target.value }))}
      />
      <input
        type="text"
        className={inputCls()}
        placeholder="Disciplina"
        value={deckForm.disciplina}
        onChange={(event) => setDeckForm((form) => ({ ...form, disciplina: event.target.value }))}
      />
      <div className="flash-inline-actions">
        <button type="button" className="pl-btn pl-btn-sm" onClick={onCancel}>Cancelar</button>
        <button type="button" className="pl-btn pl-btn-primary pl-btn-sm" onClick={onSubmit} disabled={saving}>
          {saving ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
          Criar
        </button>
      </div>
    </section>
  );
}

function FlashcardsAiModal({
  aiForm,
  setAiForm,
  aiErr,
  aiLoading,
  courseOptions,
  disciplineOptions,
  topicOptions,
  selectedDisciplineForAi,
  onClose,
  onGenerate,
}) {
  return (
    <CModal
      title="Gerar flashcards com IA"
      onClose={onClose}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" onClick={onClose} className="pl-btn pl-btn-ghost">
            Cancelar
          </button>
          <button
            type="button"
            onClick={onGenerate}
            disabled={aiLoading}
            className="pl-btn pl-btn-ai"
          >
            {aiLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            Gerar cards
          </button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <ErrBanner msg={aiErr} />
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
          <CField label="Curso">
            <select
              className={inputCls()}
              value={aiForm.courseId}
              onChange={(event) => setAiForm((prev) => ({ ...prev, courseId: event.target.value, disciplinaId: '', topicoId: '' }))}
            >
              <option value="">Todos os cursos</option>
              {courseOptions.map((course) => <option key={course.id} value={course.id}>{course.label}</option>)}
            </select>
          </CField>
          <CField label="Disciplina cadastrada">
            <select
              className={inputCls()}
              value={aiForm.disciplinaId}
              onChange={(event) => {
                const next = disciplineOptions.find((item) => item.id === event.target.value);
                setAiForm((prev) => ({ ...prev, disciplinaId: event.target.value, disciplina: next?.label || '', topicoId: '' }));
              }}
            >
              <option value="">Selecionar depois</option>
              {disciplineOptions.map((discipline) => <option key={discipline.id} value={discipline.id}>{discipline.label}</option>)}
            </select>
          </CField>
          <CField label="Tópico cadastrado">
            <select
              className={inputCls()}
              value={aiForm.topicoId}
              onChange={(event) => {
                const next = topicOptions.find((item) => item.id === event.target.value);
                setAiForm((prev) => ({ ...prev, topicoId: event.target.value, topico: next?.label || '' }));
              }}
              disabled={!selectedDisciplineForAi}
            >
              <option value="">Mapa geral da disciplina</option>
              {topicOptions.map((topic) => <option key={topic.id} value={topic.id}>{topic.label}</option>)}
            </select>
          </CField>
          <CField label="Disciplina">
            <input
              type="text"
              className={inputCls()}
              placeholder="Ou digite manualmente"
              value={aiForm.disciplina}
              onChange={(event) => setAiForm((prev) => ({ ...prev, disciplina: event.target.value }))}
            />
          </CField>
          <CField label="Tópico livre">
            <input
              type="text"
              className={inputCls()}
              placeholder="Opcional"
              value={aiForm.topico}
              onChange={(event) => setAiForm((prev) => ({ ...prev, topico: event.target.value }))}
            />
          </CField>
          <CField label="Quantidade">
            <input
              type="number"
              min={5}
              max={20}
              className={inputCls()}
              value={aiForm.quantidade}
              onChange={(event) => setAiForm((prev) => ({ ...prev, quantidade: Number(event.target.value) }))}
            />
          </CField>
        </div>
      </div>
    </CModal>
  );
}

function CField({ label, children }) {
  return (
    // minWidth: 0 — sem isso, selects com texto longo estouram a coluna do grid e o modal corta
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
      <label className="pl-eyebrow">{label}</label>
      {children}
    </div>
  );
}

function CModal({ title, onClose, children, footer }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', padding: 16, backdropFilter: 'blur(4px)' }}>
      <div style={{ width: '100%', maxWidth: 512, borderRadius: 16, background: 'var(--pl-surface)', boxShadow: 'var(--pl-sh-high)', border: '1px solid var(--pl-rule-2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--pl-rule)', padding: '16px 24px' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--pl-ink)', margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ borderRadius: 8, padding: 6, color: 'var(--pl-ink-3)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <X size={16} />
          </button>
        </div>
        <div style={{ maxHeight: '70vh', overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>{children}</div>
        {footer && <div style={{ borderTop: '1px solid var(--pl-rule)', padding: '16px 24px' }}>{footer}</div>}
      </div>
    </div>
  );
}

function inputCls() {
  return 'pl-input';
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Main Component Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

export default function Flashcards({ currentUserId, bancoDisciplinas = [], cursos = [], setActiveTab, isPremium = false, onUpgrade }) {
  // Ã¢â€â‚¬Ã¢â€â‚¬ State Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  const [decks, setDecks]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [activeDeck, setActiveDeck] = useState(null);   // deck object
  const [cards, setCards]           = useState([]);      // cards of activeDeck
  const [cardsLoading, setCardsLoading] = useState(false);

  // Study session
  const [studyMode, setStudyMode]   = useState(false);
  const [studyQueue, setStudyQueue] = useState([]);
  const [studyIndex, setStudyIndex] = useState(0);
  const [flipped, setFlipped]       = useState(false);
  const [sessionDone, setSessionDone] = useState(false);
  const [sessionStats, setSessionStats] = useState({ again: 0, hard: 0, good: 0, easy: 0 });

  // Modals
  const [cardModal, setCardModal]   = useState(false);
  const [aiGenModal, setAiGenModal] = useState(false);
  const [aiSuccess, setAiSuccess]   = useState('');
  const [aiForm, setAiForm]         = useState({
    courseId: '',
    disciplinaId: '',
    topicoId: '',
    disciplina: '',
    topico: '',
    quantidade: 10,
  });
  const [aiLoading, setAiLoading]   = useState(false);
  const [aiErr, setAiErr]           = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { type: 'deck'|'card', id }
  const [dashboardFilter, setDashboardFilter] = useState('todos');

  // Forms
  const [deckForm, setDeckForm]     = useState({ title: '', description: '', disciplina: '', color: 'blue' });
  const [cardForm, setCardForm]     = useState({ front: '', back: '' });
  const [saving, setSaving]         = useState(false);
  const [formErr, setFormErr]       = useState('');
  const [showInlineDeckForm, setShowInlineDeckForm] = useState(false);

  // Atalhos de teclado na sessão de estudo: Espaço/Enter revela; 1-4 avalia; Esc sai.
  const flippedRef = useRef(false);
  useEffect(() => { flippedRef.current = flipped; }, [flipped]);
  useEffect(() => {
    if (!studyMode || sessionDone) return undefined;
    const onKey = (e) => {
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable) return;
      if (e.key === 'Escape') { setStudyMode(false); return; }
      if (!flippedRef.current && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault();
        setFlipped(true);
        return;
      }
      if (flippedRef.current && ['1', '2', '3', '4'].includes(e.key)) {
        e.preventDefault();
        rateCard(Number(e.key));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [studyMode, sessionDone]); // eslint-disable-line react-hooks/exhaustive-deps

  const deckStats = useMemo(() => {
    const totalDecks = decks.length;
    const totalCards = decks.reduce((acc, deck) => acc + Number(deck.total_cards || 0), 0);
    const totalReviewed = decks.reduce((acc, deck) => acc + Number(deck.revisados || 0), 0);
    const dueToday = decks.reduce((acc, deck) => acc + Number(deck.due_today || deck.vencendoHoje || 0), 0);
    const newCards = Math.max(0, totalCards - totalReviewed);
    const retention = totalReviewed > 0 ? Math.min(99, Math.max(0, Math.round((totalReviewed / Math.max(totalReviewed + Number(decks.length || 0), 1)) * 100))) : null;
    return { totalDecks, totalCards, totalReviewed, dueToday, newCards, retention };
  }, [decks]);

  const dashboardDecks = useMemo(() => {
    return decks.map((deck) => {
      const vencendoHoje = Number(deck.due_today || deck.vencendoHoje || 0);
      const retention = Number(deck.retencao || deck.retention || (deck.revisados > 0 ? Math.min(99, Math.round((deck.revisados / Math.max(deck.revisados + 1, 1)) * 100)) : 0));
      const isAi = Boolean(deck.gerado_por_ia || deck.fonte === 'ia');
      const tone = vencendoHoje > Math.max(2, Number(deck.total_cards || 0) / 3) ? 'warn' : retention >= 90 ? 'success' : 'accent';
      return { ...deck, vencendoHoje, retention, isAi, tone };
    });
  }, [decks]);

  const visibleDecks = useMemo(() => {
    if (dashboardFilter === 'vencendo') return dashboardDecks.filter((deck) => deck.vencendoHoje > 0);
    if (dashboardFilter === 'novos') return dashboardDecks.filter((deck) => Number(deck.total_cards || 0) > Number(deck.revisados || 0));
    if (dashboardFilter === 'ia') return dashboardDecks.filter((deck) => deck.isAi);
    return dashboardDecks;
  }, [dashboardDecks, dashboardFilter]);

  const upcomingCards = useMemo(() => {
    return dashboardDecks
      .filter((deck) => deck.vencendoHoje > 0)
      .slice(0, 6)
      .map((deck) => ({
        id: deck.id,
        front: deck.title,
        deck: deck.title,
        disciplina: deck.disciplina,
        dueLabel: deck.vencendoHoje === 1 ? 'hoje' : `${deck.vencendoHoje} cards`,
        state: deck.vencendoHoje > 3 ? State.Relearning : State.Review,
      }));
  }, [dashboardDecks]);

  const weekActivity = useMemo(() => {
    const base = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
    return base.map((dia, index) => ({ dia, n: Math.max(0, Math.round((deckStats.totalReviewed / 7) * (index === 5 ? 1.4 : 0.75 + index * 0.06))) }));
  }, [deckStats.totalReviewed]);

  const courseOptions = useMemo(() => {
    const map = new Map();
    (Array.isArray(cursos) ? cursos : []).forEach((course) => {
      const id = String(course?.plano || course?.id || course?.nome || '').trim();
      if (!id) return;
      map.set(id, course?.nome ? `${course.nome}${course.plano ? ` · ${course.plano}` : ''}` : id);
    });
    (Array.isArray(bancoDisciplinas) ? bancoDisciplinas : []).forEach((discipline) => {
      const plan = String(discipline?.plano || '').trim();
      if (plan && !map.has(plan)) map.set(plan, plan);
    });
    return [...map.entries()].map(([id, label]) => ({ id, label }));
  }, [bancoDisciplinas, cursos]);

  const disciplineOptions = useMemo(() => {
    return (Array.isArray(bancoDisciplinas) ? bancoDisciplinas : [])
      .filter((discipline) => !aiForm.courseId || String(discipline?.plano || '') === String(aiForm.courseId))
      .map((discipline) => ({
        id: String(discipline?.id || discipline?.nome || ''),
        label: String(discipline?.nome || 'Disciplina'),
        raw: discipline,
      }))
      .filter((item) => item.id);
  }, [aiForm.courseId, bancoDisciplinas]);

  const selectedDisciplineForAi = useMemo(
    () => disciplineOptions.find((item) => item.id === aiForm.disciplinaId)?.raw || null,
    [aiForm.disciplinaId, disciplineOptions]
  );

  const topicOptions = useMemo(() => {
    return (Array.isArray(selectedDisciplineForAi?.topicos) ? selectedDisciplineForAi.topicos : [])
      .map((topic) => ({
        id: String(topic?.id || topic?.nome || ''),
        label: String(topic?.nome || 'Tópico'),
        raw: topic,
      }))
      .filter((item) => item.id);
  }, [selectedDisciplineForAi]);

  const selectedTopicForAi = useMemo(
    () => topicOptions.find((item) => item.id === aiForm.topicoId)?.raw || null,
    [aiForm.topicoId, topicOptions]
  );

  // Ã¢â€â‚¬Ã¢â€â‚¬ Data loading Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  const refreshDecks = useCallback(async () => {
    if (!currentUserId) return;
    setLoading(true);
    try {
      setDecks(await loadDecks(currentUserId));
    } catch {
      setDecks([]);
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  const refreshCards = useCallback(async (deckId) => {
    setCardsLoading(true);
    try {
      setCards(await loadCards(deckId));
    } catch {
      setCards([]);
    } finally {
      setCardsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshDecks();
  }, [refreshDecks]);

  // Ã¢â€â‚¬Ã¢â€â‚¬ Deck actions Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  async function openDeck(deck) {
    setActiveDeck(deck);
    await refreshCards(deck.id);
  }

  async function startStudy() {
    const deckDueCards = await loadDueCards(activeDeck.id);
    const due = deckDueCards.length > 0 ? deckDueCards : getDueCards(cards);
    if (due.length === 0) return;
    setStudyQueue(due);
    setStudyIndex(0);
    setFlipped(false);
    setSessionDone(false);
    setSessionStats({ again: 0, hard: 0, good: 0, easy: 0 });
    setStudyMode(true);
  }

  async function startDeckStudy(deck) {
    if (!deck?.id) return;
    const loadedCards = await loadCards(deck.id);
    const dueCards = await loadDueCards(deck.id);
    const queue = dueCards.length > 0 ? dueCards : getDueCards(loadedCards);
    const fallbackQueue = loadedCards.slice(0, Math.min(20, loadedCards.length));
    const nextQueue = queue.length > 0 ? queue : fallbackQueue;
    if (nextQueue.length === 0) return;

    setActiveDeck(deck);
    setCards(loadedCards);
    setStudyQueue(nextQueue);
    setStudyIndex(0);
    setFlipped(false);
    setSessionDone(false);
    setSessionStats({ again: 0, hard: 0, good: 0, easy: 0 });
    setStudyMode(true);
  }

  async function rateCard(rating) {
    const card = studyQueue[studyIndex];
    if (!card) return;

    const updated = await submitReview({
      card,
      rating,
      userId: currentUserId,
      deckId: activeDeck?.id,
    });

    // Update local cards array
    setCards((prev) => prev.map((c) => (c.id === card.id ? { ...c, ...updated } : c)));

    // Stats
    const statKey = ['again', 'hard', 'good', 'easy'][rating - 1];
    setSessionStats((prev) => ({ ...prev, [statKey]: prev[statKey] + 1 }));

    const next = studyIndex + 1;
    if (next >= studyQueue.length) {
      setSessionDone(true);
    } else {
      setStudyIndex(next);
      setFlipped(false);
    }
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬ Create deck Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  async function handleCreateDeck() {
    if (!deckForm.title.trim()) { setFormErr('Informe um título para o deck.'); return; }
    setSaving(true);
    setFormErr('');

    try {
      await createDeck({
        userId: currentUserId,
        titulo: deckForm.title.trim(),
        disciplina: deckForm.disciplina.trim(),
      });
      await refreshDecks();
      setShowInlineDeckForm(false);
      setDeckForm({ title: '', description: '', disciplina: '', color: 'blue' });
    } catch (error) {
      setFormErr(error.message);
    } finally {
      setSaving(false);
    }
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬ Create card Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  async function handleCreateCard() {
    if (!cardForm.front.trim()) { setFormErr('Informe a frente do card.'); return; }
    if (!cardForm.back.trim())  { setFormErr('Informe o verso do card.');  return; }
    setSaving(true);
    setFormErr('');

    try {
      const data = await createCard({
        deckId: activeDeck.id,
        userId: currentUserId,
        front: cardForm.front.trim(),
        back: cardForm.back.trim(),
      });
      setCards((prev) => [...prev, data]);
      await refreshDecks();
      setCardModal(false);
      setCardForm({ front: '', back: '' });
    } catch (error) {
      setFormErr(error.message);
    } finally {
      setSaving(false);
    }
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬ Delete deck Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  async function handleDeleteDeck(deckId) {
    await deleteDeck(deckId);
    await refreshDecks();
    setDeleteConfirm(null);
    if (activeDeck?.id === deckId) {
      setActiveDeck(null);
      setCards([]);
    }
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬ Delete card Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  async function handleDeleteCard(cardId) {
    await deleteCard(cardId);
    setCards((prev) => prev.filter((c) => c.id !== cardId));
    await refreshDecks();
    setDeleteConfirm(null);
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬ AI generate cards from text Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  async function handleAiGenerate(override = null) {
    if (!isPremium) { if (typeof onUpgrade === 'function') onUpgrade(); return; }
    const quickForm = override && !override?.currentTarget ? override : null;
    const form = quickForm ? { ...aiForm, ...quickForm } : aiForm;
    const disciplina = String((quickForm ? '' : selectedDisciplineForAi?.nome) || form.disciplina || '').trim();
    const topico = String((quickForm ? '' : selectedTopicForAi?.nome) || form.topico || '').trim();
    const topicContext = quickForm ? '' : [
      selectedTopicForAi?.nome,
      selectedTopicForAi?.descricao,
      selectedTopicForAi?.resumo,
      selectedTopicForAi?.conteudo,
      selectedTopicForAi?.observacoes,
    ]
      .map((item) => String(item || '').trim())
      .filter(Boolean)
      .join('\n');

    if (!disciplina && !topico) {
      setAiErr('Selecione curso, disciplina e tópico ou informe ao menos a disciplina.');
      return;
    }

    setAiLoading(true);
    setAiErr('');
    setAiSuccess('');

    try {
      const quantidade = Math.min(20, Math.max(5, Number(form.quantidade) || 10));

      // IA primeiro, deck depois — se a IA falhar, nenhum deck vazio órfão fica para trás.
      const payload = await generateFlashcards({
        disciplina,
        topico,
        conteudo: topicContext,
        quantidade,
      });
      const flashcards = Array.isArray(payload?.flashcards) ? payload.flashcards : [];

      if (flashcards.length === 0) {
        throw new Error('Nenhum flashcard foi retornado pela IA. Tente novamente ou ajuste o tópico.');
      }

      let targetDeck = activeDeck;
      let deckCreatedNow = false;

      if (!targetDeck?.id) {
        targetDeck = await createDeck({
          userId: currentUserId,
          titulo: topico ? `${disciplina || 'Flashcards'} · ${topico}` : disciplina || 'Flashcards IA',
          disciplina: disciplina || 'Geral',
        });
        deckCreatedNow = true;
      }

      const results = await Promise.allSettled(
        flashcards.map((card) =>
          createCard({
            deckId: targetDeck.id,
            userId: currentUserId,
            front: card?.frente || '',
            back: card?.verso || '',
          })
        )
      );
      const createdCount = results.filter((r) => r.status === 'fulfilled').length;

      if (createdCount === 0) {
        // Nenhum card salvou — se o deck acabou de ser criado, remove para não deixar órfão.
        if (deckCreatedNow) {
          try { await deleteDeck(targetDeck.id); } catch { /* deck órfão será visível; melhor que mascarar o erro original */ }
        }
        throw new Error('Os flashcards foram gerados mas não puderam ser salvos. Verifique sua conexão e tente de novo.');
      }

      if (deckCreatedNow) setActiveDeck(targetDeck);
      await refreshDecks();
      await refreshCards(targetDeck.id);
      setAiSuccess(
        createdCount === flashcards.length
          ? `${createdCount} flashcards criados com sucesso!`
          : `${createdCount} de ${flashcards.length} flashcards salvos — os demais falharam, tente gerar de novo.`
      );
      setAiGenModal(false);
      setAiForm({ courseId: '', disciplinaId: '', topicoId: '', disciplina: '', topico: '', quantidade: 10 });
    } catch (error) {
      setAiErr(error?.message || 'A IA de produção não respondeu agora. Tente novamente em instantes.');
    } finally {
      setAiLoading(false);
    }
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬ Render: no user Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  if (!currentUserId) {
    return (
      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--pl-ink-3)' }}>
        <p style={{ fontSize: 14 }}>Faca login para usar os flashcards.</p>
      </div>
    );
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬ Render: study session Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  if (studyMode) {
    if (sessionDone) {
      const total = sessionStats.again + sessionStats.hard + sessionStats.good + sessionStats.easy;
      const correct = sessionStats.good + sessionStats.easy;
      return (
        <div style={{ display: 'flex', height: '100%', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '24px 16px' }}>
          <div style={{ display: 'flex', height: 64, width: 64, alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: 'var(--pl-success-soft)' }}>
            <Check size={30} style={{ color: 'var(--pl-success)' }} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: 22, fontWeight: 600, color: 'var(--pl-ink)', margin: 0 }}>Sessão concluída!</h2>
            <p style={{ marginTop: 4, fontSize: 14, color: 'var(--pl-ink-2)' }}>{total} cards revisados</p>
          </div>
          <div style={{ display: 'grid', width: '100%', maxWidth: 360, gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {[
              { key: 'again', label: 'Errei',   bg: 'var(--pl-danger-soft)',  color: 'var(--pl-danger)'  },
              { key: 'hard',  label: 'Difícil', bg: 'var(--pl-warn-soft)',    color: 'var(--pl-warn)'    },
              { key: 'good',  label: 'Lembrei', bg: 'var(--pl-success-soft)', color: 'var(--pl-success)' },
              { key: 'easy',  label: 'Fácil',   bg: 'var(--pl-accent-soft)',  color: 'var(--pl-accent)'  },
            ].map(({ key, label, bg, color }) => (
              <div key={key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', borderRadius: 12, padding: '10px 6px', background: bg }}>
                <span style={{ fontSize: 18, fontWeight: 600, color }}>{sessionStats[key]}</span>
                <span style={{ fontSize: 11, fontWeight: 600, marginTop: 2, color }}>{label}</span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--pl-ink-2)' }}>
            Taxa de acerto: <span style={{ color: 'var(--pl-success)', fontWeight: 600 }}>{total > 0 ? Math.round((correct / total) * 100) : 0}%</span>
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 10 }}>
            <button
              onClick={() => { setStudyMode(false); setSessionDone(false); }}
              className="pl-btn pl-btn-ghost"
            >
              <ArrowLeft size={14} />
              Voltar ao deck
            </button>
            <button
              onClick={startStudy}
              className="pl-btn pl-btn-primary"
            >
              <RotateCcw size={14} />
              Revisar novamente
            </button>
          </div>
        </div>
      );
    }

    const currentCard = studyQueue[studyIndex];
    const progress = ((studyIndex) / studyQueue.length) * 100;

    const RATING_TONES = {
      1: { tone: 'danger',  label: 'Errei',   hint: 'de novo' },
      2: { tone: 'warn',    label: 'Difícil', hint: '' },
      3: { tone: 'success', label: 'Lembrei', hint: '' },
      4: { tone: 'accent',  label: 'Fácil',   hint: '' },
    };

    return (
      <div className="pl-fc-study">
        {/* Top bar */}
        <div className="pl-fc-study-top">
          <button className="pl-fc-study-close" onClick={() => setStudyMode(false)} aria-label="Sair da revisão">
            <X size={16} />
          </button>
          <div className="pl-fc-study-meta">
            <span className="deck">{activeDeck?.disciplina || 'Flashcards'}</span>
            <span className="title">{activeDeck?.title}</span>
          </div>
          <span className="pl-fc-study-counter">
            <strong>{studyIndex + 1}</strong> / {studyQueue.length}
          </span>
        </div>

        {/* Progress */}
        <div className="pl-fc-study-progress">
          <div className="fill" style={{ width: `${progress}%` }} />
        </div>

        {/* Card */}
        <div className="pl-fc-study-stage">
          <div
            className={`pl-fc-flip ${flipped ? 'is-flipped' : ''}`}
            onClick={() => !flipped && setFlipped(true)}
            role="button"
            tabIndex={0}
          >
            <div className="pl-fc-flip-inner">
              <div className="pl-fc-face front">
                <span className="pl-fc-face-tag">Frente</span>
                <p className="pl-fc-face-text">{currentCard?.front}</p>
                <span className="pl-fc-face-hint">Toque ou <kbd>espaço</kbd> para revelar</span>
              </div>
              <div className="pl-fc-face back">
                <span className="pl-fc-face-tag">Verso</span>
                <p className="pl-fc-face-text">{currentCard?.back}</p>
              </div>
            </div>
          </div>

          {/* Ações */}
          {flipped ? (
            <div className="pl-fc-rating-row">
              {[1, 2, 3, 4].map((rating) => {
                const info = RATING_TONES[rating];
                const preview = formatNextInterval(currentCard, rating);
                return (
                  <button
                    key={rating}
                    onClick={() => rateCard(rating)}
                    className={`pl-fc-rating pl-fc-rating-${info.tone}`}
                  >
                    <span className="kbd">{rating}</span>
                    <span className="lab">{info.label}</span>
                    <span className="prev">{preview}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <button onClick={() => setFlipped(true)} className="pl-btn pl-btn-primary pl-btn-lg pl-fc-reveal">
              Mostrar resposta
            </button>
          )}
        </div>
      </div>
    );
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬ Render: deck open (card list) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  if (activeDeck) {
    const dueCount = countDueToday(cards);
    const dueNow   = getDueCards(cards).length;
    const color    = getColor(activeDeck.color);

    return (
      <div style={{ display: 'flex', height: '100%', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--pl-rule)', padding: '12px 16px' }}>
          <button
            onClick={() => { setActiveDeck(null); setCards([]); }}
            style={{ borderRadius: 8, padding: 8, color: 'var(--pl-ink-3)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <ArrowLeft size={18} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--pl-ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>{activeDeck.disciplina || 'Flashcards'}</p>
            <h2 style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 14, fontWeight: 600, color: 'var(--pl-ink)', margin: 0 }}>{activeDeck.title}</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => { setDeleteConfirm({ type: 'deck', id: activeDeck.id }); }}
              style={{ borderRadius: 8, padding: 8, color: 'var(--pl-ink-3)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <Trash2 size={16} />
            </button>
            <button
              type="button"
              onClick={() => { setAiErr(''); setAiSuccess(''); setAiGenModal(true); }}
              className="pl-btn pl-btn-ai pl-btn-sm"
              style={{ display: 'none' }}
            >
              <Sparkles size={14} aria-hidden />
              Gerar com IA
            </button>
            <button
              onClick={() => { setFormErr(''); setCardModal(true); }}
              className="pl-btn pl-btn-primary pl-btn-sm"
            >
              <Plus size={14} />
              Card
            </button>
          </div>
        </div>

        {/* Stats bar */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, borderBottom: '1px solid var(--pl-rule)', padding: '8px 14px', background: color.bg }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--pl-ink)', margin: 0 }}>{cards.length}</p>
            <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--pl-ink-2)', margin: 0 }}>Total</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--pl-ink)', margin: 0 }}>{dueCount}</p>
            <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--pl-ink-2)', margin: 0 }}>Vence hoje</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--pl-ink)', margin: 0 }}>{dueNow}</p>
            <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--pl-ink-2)', margin: 0 }}>Para revisar</p>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <button
              onClick={startStudy}
              disabled={dueNow === 0}
              className="pl-btn pl-btn-primary pl-btn-sm"
            >
              <BookOpen size={14} />
              {dueNow === 0 ? 'Em dia!' : 'Estudar agora'}
            </button>
          </div>
        </div>

        {/* Card list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px' }}>
          {cardsLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 0' }}>
              <Loader2 size={24} className="animate-spin" style={{ color: 'var(--pl-accent)' }} />
            </div>
          ) : cards.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '40px 0' }}>
              <div style={{ display: 'flex', height: 64, width: 64, alignItems: 'center', justifyContent: 'center', borderRadius: 16, background: 'var(--pl-bg-soft)' }}>
                <Layers3 size={28} style={{ color: 'var(--pl-ink-3)' }} />
              </div>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--pl-ink-2)' }}>Nenhum card ainda.</p>
              <button
                onClick={() => { setFormErr(''); setCardModal(true); }}
                className="pl-btn pl-btn-primary pl-btn-sm"
              >
                <Plus size={16} />
                Criar primeiro card
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {cards.map((card) => {
                const stateLabel = ['Novo', 'Aprendendo', 'Revisão', 'Reaprendendo'][card.state] || 'Novo';
                const stateStyles = [
                  { bg: 'var(--pl-bg-soft)',     color: 'var(--pl-ink-2)'   },
                  { bg: 'var(--pl-warn-soft)',    color: 'var(--pl-warn)'    },
                  { bg: 'var(--pl-success-soft)', color: 'var(--pl-success)' },
                  { bg: 'var(--pl-danger-soft)',  color: 'var(--pl-danger)'  },
                ][card.state] || { bg: 'var(--pl-bg-soft)', color: 'var(--pl-ink-2)' };

                return (
                  <div
                    key={card.id}
                    className="pl-card"
                    style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 12px' }}
                  >
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--pl-ink)', margin: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{card.front}</p>
                      <p style={{ fontSize: 12, color: 'var(--pl-ink-2)', margin: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{card.back}</p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                      <span style={{ borderRadius: 999, padding: '2px 8px', fontSize: 10, fontWeight: 700, background: stateStyles.bg, color: stateStyles.color }}>
                        {stateLabel}
                      </span>
                      <button
                        onClick={() => setDeleteConfirm({ type: 'card', id: card.id })}
                        style={{ borderRadius: 4, padding: 4, color: 'var(--pl-rule-strong)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Create card modal */}
        {cardModal && (
          <CModal
            title="Novo Card"
            onClose={() => setCardModal(false)}
            footer={
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button onClick={() => setCardModal(false)} className="pl-btn pl-btn-ghost">
                  Cancelar
                </button>
                <button
                  onClick={handleCreateCard}
                  disabled={saving}
                  className="pl-btn pl-btn-primary"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  Criar
                </button>
              </div>
            }
          >
            <ErrBanner msg={formErr} />
            <CField label="Frente (pergunta)">
              <textarea
                rows={3}
                className={inputCls()}
                placeholder="O que você quer perguntar?"
                value={cardForm.front}
                onChange={(e) => setCardForm((f) => ({ ...f, front: e.target.value }))}
              />
            </CField>
            <CField label="Verso (resposta)">
              <textarea
                rows={3}
                className={inputCls()}
                placeholder="Qual é a resposta correta?"
                value={cardForm.back}
                onChange={(e) => setCardForm((f) => ({ ...f, back: e.target.value }))}
              />
            </CField>
          </CModal>
        )}

        {/* Delete confirm modal */}
        {deleteConfirm?.type === 'card' && (
          <CModal
            title="Excluir card?"
            onClose={() => setDeleteConfirm(null)}
            footer={
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button onClick={() => setDeleteConfirm(null)} className="pl-btn pl-btn-ghost">
                  Cancelar
                </button>
                <button
                  onClick={() => handleDeleteCard(deleteConfirm.id)}
                  className="pl-btn"
                  style={{ background: 'var(--pl-danger)', color: 'var(--pl-surface)', border: 'none' }}
                >
                  Excluir
                </button>
              </div>
            }
          >
            <p style={{ fontSize: 14, color: 'var(--pl-ink-2)', margin: 0 }}>Este card será excluído permanentemente. Esta ação não pode ser desfeita.</p>
          </CModal>
        )}

        {/* AI generate modal */}
        {aiGenModal && (
          <CModal
            title="Gerar cards com IA"
            onClose={() => setAiGenModal(false)}
            footer={
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button onClick={() => setAiGenModal(false)} className="pl-btn pl-btn-ghost">
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => handleAiGenerate()}
                  disabled={aiLoading}
                  className="pl-btn pl-btn-ai"
                >
                  {aiLoading ? <Loader2 size={14} className="animate-spin" aria-hidden /> : <Sparkles size={14} aria-hidden />}
                  {aiLoading ? 'Gerando flashcards...' : 'Gerar flashcards'}
                </button>
              </div>
            }
          >
            <ErrBanner msg={aiErr} />
            <CField label="Curso">
              <select
                className={inputCls()}
                value={aiForm.courseId}
                onChange={(e) =>
                  setAiForm((prev) => ({
                    ...prev,
                    courseId: e.target.value,
                    disciplinaId: '',
                    topicoId: '',
                    disciplina: '',
                    topico: '',
                  }))
                }
              >
                <option value="">Todos os cursos</option>
                {courseOptions.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.label}
                  </option>
                ))}
              </select>
            </CField>
            <CField label="Disciplina cadastrada">
              <select
                className={inputCls()}
                value={aiForm.disciplinaId}
                onChange={(e) => {
                  const next = disciplineOptions.find((item) => item.id === e.target.value);
                  setAiForm((prev) => ({
                    ...prev,
                    disciplinaId: e.target.value,
                    topicoId: '',
                    disciplina: next?.label || '',
                    topico: '',
                  }));
                }}
              >
                <option value="">Selecione uma disciplina</option>
                {disciplineOptions.map((discipline) => (
                  <option key={discipline.id} value={discipline.id}>
                    {discipline.label}
                  </option>
                ))}
              </select>
            </CField>
            <CField label="Tópico cadastrado">
              <select
                className={inputCls()}
                value={aiForm.topicoId}
                onChange={(e) => {
                  const next = topicOptions.find((item) => item.id === e.target.value);
                  setAiForm((prev) => ({ ...prev, topicoId: e.target.value, topico: next?.label || '' }));
                }}
                disabled={!selectedDisciplineForAi}
              >
                <option value="">Mapa geral da disciplina</option>
                {topicOptions.map((topic) => (
                  <option key={topic.id} value={topic.id}>
                    {topic.label}
                  </option>
                ))}
              </select>
            </CField>
            <CField label="Disciplina">
              <input
                type="text"
                className={inputCls()}
                placeholder="Ou digite manualmente"
                value={aiForm.disciplina}
                onChange={(e) => setAiForm((prev) => ({ ...prev, disciplina: e.target.value }))}
              />
            </CField>
            <CField label="Tópico livre">
              <input
                type="text"
                className={inputCls()}
                placeholder="Opcional, caso o tópico não esteja cadastrado"
                value={aiForm.topico}
                onChange={(e) => setAiForm((prev) => ({ ...prev, topico: e.target.value }))}
              />
            </CField>
            <CField label="Quantidade">
              <input
                type="number"
                min={5}
                max={20}
                className={inputCls()}
                value={aiForm.quantidade}
                onChange={(e) => setAiForm((prev) => ({ ...prev, quantidade: Number(e.target.value) }))}
              />
            </CField>
          </CModal>
        )}
      </div>
    );
  }

  return (
    <div className="pl-page">
      <div className="flashcards-wrap">
        <FlashcardsHeader
          onNovoDeck={() => { setFormErr(''); setShowInlineDeckForm((prev) => !prev); }}
          onGerarIa={() => { setAiErr(''); setAiSuccess(''); setAiGenModal(true); }}
          isPremium={isPremium}
          onUpgrade={onUpgrade}
        />

        <ErrBanner msg={aiSuccess} />
        {showInlineDeckForm && (
          <InlineDeckForm
            deckForm={deckForm}
            setDeckForm={setDeckForm}
            saving={saving}
            formErr={formErr}
            onCancel={() => setShowInlineDeckForm(false)}
            onSubmit={handleCreateDeck}
          />
        )}

        {loading ? (
          <div className="flashcards-loading">
            <Loader2 size={28} className="animate-spin" />
          </div>
        ) : decks.length === 0 ? (
          <FlashcardsEmptyState
            onManual={() => { setFormErr(''); setShowInlineDeckForm(true); }}
            onIa={() => { setAiErr(''); setAiSuccess(''); setAiGenModal(true); }}
            onEdital={() => setActiveTab?.('edital')}
          />
        ) : (
          <>
            <FlashKpiStrip stats={deckStats} />

            <section className="flashcards-dashboard-grid">
              <div className="flashcards-main-column">
                <AprenderHojeCard
                  totals={deckStats}
                  nextCard={upcomingCards[0]}
                  onIniciar={() => {
                    const nextDeck = dashboardDecks.find((deck) => deck.vencendoHoje > 0) || dashboardDecks[0];
                    startDeckStudy(nextDeck);
                  }}
                  onSomenteRevisao={() => {
                    const nextDeck = dashboardDecks.find((deck) => deck.vencendoHoje > 0) || dashboardDecks[0];
                    startDeckStudy(nextDeck);
                  }}
                />

                <DecksSection
                  decks={visibleDecks}
                  allCount={dashboardDecks.length}
                  filter={dashboardFilter}
                  setFilter={setDashboardFilter}
                  onAbrir={openDeck}
                  onEstudar={startDeckStudy}
                  onDelete={(deck) => setDeleteConfirm({ type: 'deck', id: deck.id })}
                />
              </div>

              <aside className="flashcards-side-column">
                <GerarIaInlineCard
                  disciplinaOptions={disciplineOptions}
                  loading={aiLoading}
                  error={aiErr}
                  onGerar={handleAiGenerate}
                />
                <ProximosVencerList
                  items={upcomingCards}
                  onAbrir={(item) => {
                    const deck = dashboardDecks.find((candidate) => candidate.id === item.id);
                    if (deck) openDeck(deck);
                  }}
                />
                <AtividadeSemanaCard data={weekActivity} retencao={deckStats.retention} />
              </aside>
            </section>
          </>
        )}
      </div>

      {deleteConfirm?.type === 'deck' && (
        <CModal
          title="Excluir deck?"
          onClose={() => setDeleteConfirm(null)}
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setDeleteConfirm(null)} className="pl-btn pl-btn-ghost">
                Cancelar
              </button>
              <button
                onClick={() => handleDeleteDeck(deleteConfirm.id)}
                className="pl-btn"
                style={{ background: 'var(--pl-danger)', color: 'var(--pl-surface)', border: 'none' }}
              >
                Excluir
              </button>
            </div>
          }
        >
          <p style={{ fontSize: 14, color: 'var(--pl-ink-2)', margin: 0 }}>
            O deck e todos os seus cards serão excluídos permanentemente. Esta ação não pode ser desfeita.
          </p>
        </CModal>
      )}

      {aiGenModal && (
        <FlashcardsAiModal
          aiForm={aiForm}
          setAiForm={setAiForm}
          aiErr={aiErr}
          aiLoading={aiLoading}
          courseOptions={courseOptions}
          disciplineOptions={disciplineOptions}
          topicOptions={topicOptions}
          selectedDisciplineForAi={selectedDisciplineForAi}
          onClose={() => setAiGenModal(false)}
          onGenerate={() => handleAiGenerate()}
        />
      )}
    </div>
  );
}
