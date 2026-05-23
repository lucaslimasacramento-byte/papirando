import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Check,
  ChevronRight,
  Flame,
  Layers3,
  Loader2,
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

const COLOR_CLASSES = {
  blue:    { bg: 'bg-blue-50',    ring: 'ring-blue-200',    dot: 'bg-blue-500',    text: 'text-blue-700'    },
  emerald: { bg: 'bg-emerald-50', ring: 'ring-emerald-200', dot: 'bg-emerald-500', text: 'text-emerald-700' },
  violet:  { bg: 'bg-violet-50',  ring: 'ring-violet-200',  dot: 'bg-violet-500',  text: 'text-violet-700'  },
  orange:  { bg: 'bg-orange-50',  ring: 'ring-orange-200',  dot: 'bg-orange-500',  text: 'text-orange-700'  },
  rose:    { bg: 'bg-rose-50',    ring: 'ring-rose-200',    dot: 'bg-rose-500',    text: 'text-rose-700'    },
  amber:   { bg: 'bg-amber-50',   ring: 'ring-amber-200',   dot: 'bg-amber-500',   text: 'text-amber-700'   },
};

const COLOR_OPTIONS = Object.keys(COLOR_CLASSES);

function getColor(color) {
  return COLOR_CLASSES[color] || COLOR_CLASSES.blue;
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Sub-components Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

function ErrBanner({ msg }) {
  if (!msg) return null;
  return (
    <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
      <X size={14} className="shrink-0" />
      {msg}
    </div>
  );
}

function FlashcardsHeader({ onNovoDeck, onGerarIa }) {
  return (
    <header className="flashcards-header">
      <div>
        <div className="pl-overline">Pratica / FSRS-4.5</div>
        <h1 className="pl-display flashcards-title">
          Flashcards<span>.</span>
        </h1>
        <p className="pl-body flashcards-subtitle">
          Decks de repeticao espacada com <span className="pl-mark-text">geracao com IA</span> quando voce precisar.
          O motor decide quando rever, voce so papira.
        </p>
      </div>
      <div className="flashcards-header-actions">
        <button type="button" className="pl-btn pl-btn-primary" onClick={onNovoDeck}>
          <Plus size={13} /> Novo deck
        </button>
        <button type="button" className="pl-btn pl-btn-ai" onClick={onGerarIa}>
          <Sparkles size={12} /> Gerar com IA
        </button>
      </div>
    </header>
  );
}

function FlashKpiStrip({ stats }) {
  const items = [
    { label: 'Decks', value: String(stats.totalDecks).padStart(2, '0'), sub: 'colecoes ativas' },
    { label: 'Cards', value: String(stats.totalCards), sub: `${stats.newCards} novos pra entrar`, tone: 'accent' },
    { label: 'Vence hoje', value: String(stats.dueToday).padStart(2, '0'), sub: 'alta prioridade', tone: 'warn', icon: Flame },
    { label: 'Retencao 7d', value: stats.retention == null ? '--%' : `${stats.retention}%`, sub: 'meta saudavel >= 85%', tone: 'success' },
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
            Cerca de {Math.max(4, Math.round(Math.max(total, 1) * 0.45))} minutos. O FSRS escolhe a ordem; voce responde e segue.
          </p>
        </div>
        <div className="flash-dark-actions">
          <button type="button" className="flash-highlight-btn" onClick={onIniciar}>
            <Play size={12} /> Iniciar revisao
          </button>
          <button type="button" className="flash-outline-dark" onClick={onSomenteRevisao}>
            Estudar so revisoes
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
        <StateMetric label="Revisao" value={total} tone="success" />
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
        <span className="pl-overline">Proximo / {card?.disciplina || 'Geral'}</span>
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
      <p>Diga disciplina e topico. A IA escreve frente e verso no estilo de banca.</p>
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
        <span>Topico</span>
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
      <div className="pl-overline">Proximos a vencer</div>
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
      <div className="pl-overline">Ultimos 7 dias</div>
      <h3 className="pl-section-title">Ritmo de revisao</h3>
      <div className="flash-week-bars">
        {data.map((item, index) => (
          <div key={item.dia}>
            <span style={{ height: `${Math.max(8, (item.n / max) * 74)}px` }} className={index === data.length - 1 ? 'is-today' : ''} />
            <em>{item.dia}</em>
          </div>
        ))}
      </div>
      <p><strong>{retencao == null ? '--' : `${retencao}%`}</strong> de retencao media. {healthy ? 'Segue nesse ritmo.' : 'Vale revisar hoje.'}</p>
    </section>
  );
}

function FlashcardsEmptyState({ onManual, onIa, onEdital }) {
  return (
    <section className="pl-card-paper flash-empty-state">
      <div className="pl-overline">Primeiro deck</div>
      <h2>Tres caminhos pra comecar a papirar</h2>
      <p>Monte um deck manual, deixe o Bizu IA criar a primeira leva, ou traga temas do edital verticalizado.</p>
      <div className="flash-empty-grid">
        <EmptyAction n="01" title="Deck manual" detail="Crie uma colecao simples e adicione frente e verso." cta="Criar deck" onClick={onManual} />
        <EmptyAction n="02" title="Gerar com IA" detail="Informe disciplina e topico para receber cards revisaveis." cta="Usar Bizu IA" onClick={onIa} ai />
        <EmptyAction n="03" title="Do edital" detail="Use seus topicos do edital como trilha de memorizacao." cta="Abrir edital" onClick={onEdital} />
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
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl border-2 border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">
            Cancelar
          </button>
          <button
            type="button"
            onClick={onGenerate}
            disabled={aiLoading}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {aiLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            Gerar cards
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <ErrBanner msg={aiErr} />
        <div className="grid gap-3 sm:grid-cols-2">
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
          <CField label="Topico cadastrado">
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
          <CField label="Topico livre">
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
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</label>
      {children}
    </div>
  );
}

function CModal({ title, onClose, children, footer }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="text-base font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-6 py-5 space-y-4">{children}</div>
        {footer && <div className="border-t border-slate-100 px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}

function inputCls() {
  return 'w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10';
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Main Component Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

export default function Flashcards({ currentUserId, bancoDisciplinas = [], cursos = [], setActiveTab }) {
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
    } catch (error) {
      console.warn('[Flashcards] loadDecks error:', error.message);
      setDecks([]);
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  const refreshCards = useCallback(async (deckId) => {
    setCardsLoading(true);
    try {
      setCards(await loadCards(deckId));
    } catch (error) {
      console.warn('[Flashcards] loadCards error:', error.message);
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
      let targetDeck = activeDeck;

      if (!targetDeck?.id) {
        targetDeck = await createDeck({
          userId: currentUserId,
          titulo: topico ? `${disciplina || 'Flashcards'} · ${topico}` : disciplina || 'Flashcards IA',
          disciplina: disciplina || 'Geral',
        });
        setActiveDeck(targetDeck);
      }

      const payload = await generateFlashcards({
        disciplina,
        topico,
        conteudo: topicContext,
        quantidade,
      });
      const flashcards = Array.isArray(payload?.flashcards) ? payload.flashcards : [];

      if (flashcards.length === 0) {
        throw new Error('Nenhum flashcard foi retornado pela IA.');
      }

      await Promise.all(
        flashcards.map((card) =>
          createCard({
            deckId: targetDeck.id,
            userId: currentUserId,
            front: card?.frente || '',
            back: card?.verso || '',
          })
        )
      );

      await refreshDecks();
      await refreshCards(targetDeck.id);
      setAiSuccess(`${flashcards.length} flashcards criados com sucesso!`);
      setAiGenModal(false);
      setAiForm({ courseId: '', disciplinaId: '', topicoId: '', disciplina: '', topico: '', quantidade: 10 });
    } catch (error) {
      console.warn('[Flashcards] generateFlashcards error:', error?.message || error);
      setAiErr(error?.message || 'A IA de produção não respondeu agora. Tente novamente em instantes.');
    } finally {
      setAiLoading(false);
    }
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬ Render: no user Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  if (!currentUserId) {
    return (
      <div className="flex h-full items-center justify-center text-slate-400">
        <p className="text-sm">Faça login para usar os flashcards.</p>
      </div>
    );
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬ Render: study session Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  if (studyMode) {
    if (sessionDone) {
      const total = sessionStats.again + sessionStats.hard + sessionStats.good + sessionStats.easy;
      const correct = sessionStats.good + sessionStats.easy;
      return (
        <div className="flex h-full flex-col items-center justify-center gap-4 px-4 py-6 sm:px-6 sm:py-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <Check size={30} className="text-emerald-600" />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-semibold text-slate-800 sm:text-2xl">Sessão concluída!</h2>
            <p className="mt-1 text-sm text-slate-500">{total} cards revisados</p>
          </div>
          <div className="grid w-full max-w-sm grid-cols-4 gap-2.5">
            {[
              { key: 'again', label: 'Errei',   color: 'bg-red-100 text-red-700'     },
              { key: 'hard',  label: 'Difícil', color: 'bg-orange-100 text-orange-700' },
              { key: 'good',  label: 'Lembrei', color: 'bg-green-100 text-green-700'  },
              { key: 'easy',  label: 'Fácil',   color: 'bg-blue-100 text-blue-700'    },
            ].map(({ key, label, color }) => (
              <div key={key} className={`flex flex-col items-center rounded-xl px-2.5 py-2.5 ${color}`}>
                <span className="text-lg font-semibold">{sessionStats[key]}</span>
                <span className="text-xs font-semibold mt-0.5">{label}</span>
              </div>
            ))}
          </div>
          <p className="text-sm font-semibold text-slate-600">
            Taxa de acerto: <span className="text-emerald-600 font-semibold">{total > 0 ? Math.round((correct / total) * 100) : 0}%</span>
          </p>
          <div className="flex flex-wrap justify-center gap-2.5">
            <button
              onClick={() => { setStudyMode(false); setSessionDone(false); }}
              className="flex items-center gap-1.5 rounded-xl border-2 border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 sm:text-sm"
            >
              <ArrowLeft size={14} />
              Voltar ao deck
            </button>
            <button
              onClick={startStudy}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 sm:text-sm"
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

    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-slate-100 px-3.5 py-2.5 sm:px-4">
          <button
            onClick={() => setStudyMode(false)}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={16} />
          </button>
          <div className="flex-1">
            <p className="text-xs font-semibold text-slate-500">{activeDeck?.title}</p>
            <p className="text-xs font-semibold text-slate-700 sm:text-sm">
              {studyIndex + 1} / {studyQueue.length}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-slate-100">
          <div
            className="h-full bg-blue-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Card area */}
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-5 sm:px-6 sm:py-6">
          {/* Flip card */}
          <div
            onClick={() => setFlipped((f) => !f)}
            className="flex min-h-[170px] w-full max-w-xl cursor-pointer select-none flex-col items-center justify-center gap-3 rounded-2xl border-2 border-slate-200 bg-white p-5 text-center shadow-md ring-1 ring-slate-100 transition-all hover:shadow-lg sm:min-h-[190px] sm:p-6"
          >
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {flipped ? 'Verso' : 'Frente'}
            </p>
            <p className="text-base font-semibold leading-relaxed text-slate-800 sm:text-lg">
              {flipped ? currentCard?.back : currentCard?.front}
            </p>
            {!flipped && (
              <p className="text-xs text-slate-400 mt-2">Clique para revelar</p>
            )}
          </div>

          {/* Rating buttons */}
          {flipped ? (
            <div className="grid w-full max-w-2xl grid-cols-2 gap-2 sm:grid-cols-4">
              {[1, 2, 3, 4].map((rating) => {
                const info = RATING_LABELS[rating];
                const preview = formatNextInterval(currentCard, rating);
                return (
                  <button
                    key={rating}
                    onClick={() => rateCard(rating)}
                    className={`flex flex-col items-center rounded-xl border-2 px-3 py-2.5 text-xs font-semibold transition-all hover:scale-[1.02] active:scale-95 sm:text-sm ${info.color}`}
                  >
                    <span className="text-sm sm:text-base">{info.emoji}</span>
                    <span>{info.label}</span>
                    <span className="text-xs font-semibold opacity-70 mt-0.5">{preview}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <button
              onClick={() => setFlipped(true)}
              className="rounded-xl bg-slate-800 px-6 py-2.5 text-xs font-semibold text-white hover:bg-slate-700 sm:text-sm"
            >
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
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex items-center gap-2.5 border-b border-slate-100 px-4 py-3 sm:px-5">
          <button
            onClick={() => { setActiveDeck(null); setCards([]); }}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-500 truncate">{activeDeck.disciplina || 'Flashcards'}</p>
            <h2 className="truncate text-sm font-semibold text-slate-800 sm:text-base">{activeDeck.title}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setDeleteConfirm({ type: 'deck', id: activeDeck.id }); }}
              className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500"
            >
              <Trash2 size={16} />
            </button>
            <button
              type="button"
              onClick={() => { setAiErr(''); setAiSuccess(''); setAiGenModal(true); }}
              className="btn-ia hidden py-1.5 md:inline-flex"
            >
              <Sparkles size={14} aria-hidden />
              Gerar com IA
            </button>
            <button
              onClick={() => { setFormErr(''); setCardModal(true); }}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 sm:px-3.5 sm:py-2"
            >
              <Plus size={14} />
              Card
            </button>
          </div>
        </div>

        {/* Stats bar */}
        <div className={`flex flex-wrap items-center gap-2.5 border-b border-slate-100 px-3.5 py-2 sm:px-4 ${color.bg}`}>
          <div className="text-center">
            <p className="text-base font-semibold text-slate-800">{cards.length}</p>
            <p className="text-[11px] font-semibold text-slate-500">Total</p>
          </div>
          <div className="text-center">
            <p className="text-base font-semibold text-slate-800">{dueCount}</p>
            <p className="text-[11px] font-semibold text-slate-500">Vence hoje</p>
          </div>
          <div className="text-center">
            <p className="text-base font-semibold text-slate-800">{dueNow}</p>
            <p className="text-[11px] font-semibold text-slate-500">Para revisar</p>
          </div>
          <div className="ml-auto">
            <button
              onClick={startStudy}
              disabled={dueNow === 0}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed sm:px-3.5 sm:py-2"
            >
              <BookOpen size={14} />
              {dueNow === 0 ? 'Em dia!' : 'Estudar agora'}
            </button>
          </div>
        </div>

        {/* Card list */}
        <div className="flex-1 overflow-y-auto px-3.5 py-2.5 sm:px-4">
          {cardsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-blue-500" />
            </div>
          ) : cards.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-10">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
                <Layers3 size={28} className="text-slate-400" />
              </div>
              <p className="text-sm font-semibold text-slate-500">Nenhum card ainda.</p>
              <button
                onClick={() => { setFormErr(''); setCardModal(true); }}
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-700 sm:text-sm"
              >
                <Plus size={16} />
                Criar primeiro card
              </button>
            </div>
          ) : (
            <div className="space-y-1.5">
              {cards.map((card) => {
                const stateLabel = ['Novo', 'Aprendendo', 'Revisão', 'Reaprendendo'][card.state] || 'Novo';
                const stateColor = [
                  'bg-slate-100 text-slate-600',
                  'bg-amber-100 text-amber-700',
                  'bg-emerald-100 text-emerald-700',
                  'bg-rose-100 text-rose-700',
                ][card.state] || 'bg-slate-100 text-slate-600';

                return (
                  <div
                    key={card.id}
                    className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2"
                  >
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="line-clamp-2 text-[13px] font-semibold text-slate-800">{card.front}</p>
                      <p className="line-clamp-2 text-xs text-slate-500">{card.back}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${stateColor}`}>
                        {stateLabel}
                      </span>
                      <button
                        onClick={() => setDeleteConfirm({ type: 'card', id: card.id })}
                        className="rounded p-1 text-slate-300 hover:text-red-400"
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
              <div className="flex justify-end gap-2">
                <button onClick={() => setCardModal(false)} className="rounded-xl border-2 border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">
                  Cancelar
                </button>
                <button
                  onClick={handleCreateCard}
                  disabled={saving}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
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
              <div className="flex justify-end gap-2">
                <button onClick={() => setDeleteConfirm(null)} className="rounded-xl border-2 border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">
                  Cancelar
                </button>
                <button
                  onClick={() => handleDeleteCard(deleteConfirm.id)}
                  className="rounded-xl bg-red-600 px-5 py-2 text-sm font-bold text-white hover:bg-red-700"
                >
                  Excluir
                </button>
              </div>
            }
          >
            <p className="text-sm text-slate-600">Este card será excluído permanentemente. Esta ação não pode ser desfeita.</p>
          </CModal>
        )}

        {/* AI generate modal */}
        {aiGenModal && (
          <CModal
            title="Gerar cards com IA"
            onClose={() => setAiGenModal(false)}
            footer={
              <div className="flex justify-end gap-2">
                <button onClick={() => setAiGenModal(false)} className="rounded-xl border-2 border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => handleAiGenerate()}
                  disabled={aiLoading}
                  className="btn-ia gap-2 px-5 py-2.5 text-sm font-bold"
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
    <div className="pl-paper-bg-soft flashcards-page">
      <div className="flashcards-wrap">
        <FlashcardsHeader
          onNovoDeck={() => { setFormErr(''); setShowInlineDeckForm((prev) => !prev); }}
          onGerarIa={() => { setAiErr(''); setAiSuccess(''); setAiGenModal(true); }}
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
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteConfirm(null)} className="rounded-xl border-2 border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50">
                Cancelar
              </button>
              <button
                onClick={() => handleDeleteDeck(deleteConfirm.id)}
                className="rounded-xl bg-red-600 px-5 py-2 text-sm font-bold text-white hover:bg-red-700"
              >
                Excluir
              </button>
            </div>
          }
        >
          <p className="text-sm text-slate-600">
            O deck e todos os seus cards serao excluidos permanentemente. Esta acao nao pode ser desfeita.
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
