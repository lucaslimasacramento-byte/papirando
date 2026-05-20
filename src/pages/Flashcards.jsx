import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Check,
  ChevronRight,
  Layers3,
  Loader2,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import PageHeadPremium, {
  PAGE_HEAD_PREMIUM_IA_ACTION_CLASS,
  PAGE_HEAD_PREMIUM_PRIMARY_ACTION_CLASS,
  PageHeadPremiumBadge,
} from '../components/PageHeadPremium';
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
  blue:    { bg: 'bg-brand-50',    ring: 'ring-brand-200',    dot: 'bg-brand-500',    text: 'text-brand-700'    },
  emerald: { bg: 'bg-emerald-50', ring: 'ring-emerald-200', dot: 'bg-emerald-500', text: 'text-emerald-700' },
  violet:  { bg: 'bg-ink-50',  ring: 'ring-ink-200',  dot: 'bg-ink-500',  text: 'text-ink-700'  },
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

function CField({ label, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-bold uppercase tracking-wide text-ink-500">{label}</label>
      {children}
    </div>
  );
}

function CModal({ title, onClose, children, footer }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl ring-1 ring-ink-200">
        <div className="flex items-center justify-between border-b border-ink-100 px-6 py-4">
          <h3 className="text-base font-bold text-ink-800">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-600">
            <X size={16} />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-6 py-5 space-y-4">{children}</div>
        {footer && <div className="border-t border-ink-100 px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}

function inputCls() {
  return 'w-full rounded-xl border-2 border-ink-200 bg-ink-50 px-4 py-3 text-sm font-semibold text-ink-800 outline-none transition-all focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10';
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Main Component Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

export default function Flashcards({ currentUserId }) {
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
  const [aiForm, setAiForm]         = useState({ disciplina: '', topico: '', quantidade: 10 });
  const [aiLoading, setAiLoading]   = useState(false);
  const [aiErr, setAiErr]           = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { type: 'deck'|'card', id }

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
    return { totalDecks, totalCards, totalReviewed };
  }, [decks]);

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
  async function handleAiGenerate() {
    if (!activeDeck?.id) {
      setAiErr('');
      window.alert('Selecione ou crie um deck antes de gerar.');
      return;
    }

    if (!String(aiForm.disciplina || '').trim() && !String(aiForm.topico || '').trim()) {
      setAiErr('Informe ao menos a disciplina ou o tópico.');
      return;
    }

    setAiLoading(true);
    setAiErr('');
    setAiSuccess('');

    try {
      const disciplina = String(aiForm.disciplina || '').trim();
      const topico = String(aiForm.topico || '').trim();
      const quantidade = Math.min(20, Math.max(5, Number(aiForm.quantidade) || 10));

      const payload = await generateFlashcards({ disciplina, topico, quantidade });
      const flashcards = Array.isArray(payload?.flashcards) ? payload.flashcards : [];

      if (flashcards.length === 0) {
        throw new Error('Nenhum flashcard foi retornado pela IA.');
      }

      await Promise.all(
        flashcards.map((card) =>
          createCard({
            deckId: activeDeck.id,
            userId: currentUserId,
            front: card?.frente || '',
            back: card?.verso || '',
          })
        )
      );

      await refreshDecks();
      await refreshCards(activeDeck.id);
      setAiSuccess(`${flashcards.length} flashcards criados com sucesso!`);
      setAiGenModal(false);
      setAiForm({ disciplina: '', topico: '', quantidade: 10 });
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
      <div className="flex h-full items-center justify-center text-ink-400">
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
            <h2 className="text-xl font-semibold text-ink-800 sm:text-2xl">Sessão concluída!</h2>
            <p className="mt-1 text-sm text-ink-500">{total} cards revisados</p>
          </div>
          <div className="grid w-full max-w-sm grid-cols-4 gap-2.5">
            {[
              { key: 'again', label: 'Errei',   color: 'bg-red-100 text-red-700'     },
              { key: 'hard',  label: 'Difícil', color: 'bg-orange-100 text-orange-700' },
              { key: 'good',  label: 'Lembrei', color: 'bg-green-100 text-green-700'  },
              { key: 'easy',  label: 'Fácil',   color: 'bg-brand-100 text-brand-700'    },
            ].map(({ key, label, color }) => (
              <div key={key} className={`flex flex-col items-center rounded-xl px-2.5 py-2.5 ${color}`}>
                <span className="text-lg font-semibold">{sessionStats[key]}</span>
                <span className="text-xs font-semibold mt-0.5">{label}</span>
              </div>
            ))}
          </div>
          <p className="text-sm font-semibold text-ink-600">
            Taxa de acerto: <span className="text-emerald-600 font-semibold">{total > 0 ? Math.round((correct / total) * 100) : 0}%</span>
          </p>
          <div className="flex flex-wrap justify-center gap-2.5">
            <button
              onClick={() => { setStudyMode(false); setSessionDone(false); }}
              className="flex items-center gap-1.5 rounded-xl border-2 border-ink-200 bg-white px-4 py-2 text-xs font-semibold text-ink-700 hover:bg-ink-50 sm:text-sm"
            >
              <ArrowLeft size={14} />
              Voltar ao deck
            </button>
            <button
              onClick={startStudy}
              className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700 sm:text-sm"
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
        <div className="flex items-center gap-2 border-b border-ink-100 px-3.5 py-2.5 sm:px-4">
          <button
            onClick={() => setStudyMode(false)}
            className="rounded-lg p-2 text-ink-400 hover:bg-ink-100 hover:text-ink-600"
          >
            <X size={16} />
          </button>
          <div className="flex-1">
            <p className="text-xs font-semibold text-ink-500">{activeDeck?.title}</p>
            <p className="text-xs font-semibold text-ink-700 sm:text-sm">
              {studyIndex + 1} / {studyQueue.length}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-ink-100">
          <div
            className="h-full bg-brand-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Card area */}
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-5 sm:px-6 sm:py-6">
          {/* Flip card */}
          <div
            onClick={() => setFlipped((f) => !f)}
            className="flex min-h-[170px] w-full max-w-xl cursor-pointer select-none flex-col items-center justify-center gap-3 rounded-2xl border-2 border-ink-200 bg-white p-5 text-center shadow-md ring-1 ring-ink-100 transition-all hover:shadow-lg sm:min-h-[190px] sm:p-6"
          >
            <p className="text-xs font-bold uppercase tracking-wider text-ink-400">
              {flipped ? 'Verso' : 'Frente'}
            </p>
            <p className="text-base font-semibold leading-relaxed text-ink-800 sm:text-lg">
              {flipped ? currentCard?.back : currentCard?.front}
            </p>
            {!flipped && (
              <p className="text-xs text-ink-400 mt-2">Clique para revelar</p>
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
              className="rounded-xl bg-ink-800 px-6 py-2.5 text-xs font-semibold text-white hover:bg-ink-700 sm:text-sm"
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
        <div className="flex items-center gap-2.5 border-b border-ink-100 px-4 py-3 sm:px-5">
          <button
            onClick={() => { setActiveDeck(null); setCards([]); }}
            className="rounded-lg p-2 text-ink-400 hover:bg-ink-100 hover:text-ink-600"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-ink-500 truncate">{activeDeck.disciplina || 'Flashcards'}</p>
            <h2 className="truncate text-sm font-semibold text-ink-800 sm:text-base">{activeDeck.title}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setDeleteConfirm({ type: 'deck', id: activeDeck.id }); }}
              className="rounded-lg p-2 text-ink-400 hover:bg-red-50 hover:text-red-500"
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
              className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 sm:px-3.5 sm:py-2"
            >
              <Plus size={14} />
              Card
            </button>
          </div>
        </div>

        {/* Stats bar */}
        <div className={`flex flex-wrap items-center gap-2.5 border-b border-ink-100 px-3.5 py-2 sm:px-4 ${color.bg}`}>
          <div className="text-center">
            <p className="text-base font-semibold text-ink-800">{cards.length}</p>
            <p className="text-[11px] font-semibold text-ink-500">Total</p>
          </div>
          <div className="text-center">
            <p className="text-base font-semibold text-ink-800">{dueCount}</p>
            <p className="text-[11px] font-semibold text-ink-500">Vence hoje</p>
          </div>
          <div className="text-center">
            <p className="text-base font-semibold text-ink-800">{dueNow}</p>
            <p className="text-[11px] font-semibold text-ink-500">Para revisar</p>
          </div>
          <div className="ml-auto">
            <button
              onClick={startStudy}
              disabled={dueNow === 0}
              className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed sm:px-3.5 sm:py-2"
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
              <Loader2 size={24} className="animate-spin text-brand-500" />
            </div>
          ) : cards.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-10">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-ink-100">
                <Layers3 size={28} className="text-ink-400" />
              </div>
              <p className="text-sm font-semibold text-ink-500">Nenhum card ainda.</p>
              <button
                onClick={() => { setFormErr(''); setCardModal(true); }}
                className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-brand-700 sm:text-sm"
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
                  'bg-ink-100 text-ink-600',
                  'bg-amber-100 text-amber-700',
                  'bg-emerald-100 text-emerald-700',
                  'bg-rose-100 text-rose-700',
                ][card.state] || 'bg-ink-100 text-ink-600';

                return (
                  <div
                    key={card.id}
                    className="flex items-start gap-2.5 rounded-xl border border-ink-200 bg-white px-3 py-2"
                  >
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="line-clamp-2 text-[13px] font-semibold text-ink-800">{card.front}</p>
                      <p className="line-clamp-2 text-xs text-ink-500">{card.back}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${stateColor}`}>
                        {stateLabel}
                      </span>
                      <button
                        onClick={() => setDeleteConfirm({ type: 'card', id: card.id })}
                        className="rounded p-1 text-ink-300 hover:text-red-400"
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
                <button onClick={() => setCardModal(false)} className="rounded-xl border-2 border-ink-200 px-4 py-2 text-sm font-bold text-ink-600 hover:bg-ink-50">
                  Cancelar
                </button>
                <button
                  onClick={handleCreateCard}
                  disabled={saving}
                  className="flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-50"
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
                <button onClick={() => setDeleteConfirm(null)} className="rounded-xl border-2 border-ink-200 px-4 py-2 text-sm font-bold text-ink-600 hover:bg-ink-50">
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
            <p className="text-sm text-ink-600">Este card será excluído permanentemente. Esta ação não pode ser desfeita.</p>
          </CModal>
        )}

        {/* AI generate modal */}
        {aiGenModal && (
          <CModal
            title="Gerar cards com IA"
            onClose={() => setAiGenModal(false)}
            footer={
              <div className="flex justify-end gap-2">
                <button onClick={() => setAiGenModal(false)} className="rounded-xl border-2 border-ink-200 px-4 py-2 text-sm font-bold text-ink-600 hover:bg-ink-50">
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleAiGenerate}
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
            <CField label="Disciplina">
              <input
                type="text"
                className={inputCls()}
                placeholder="Ex: Direito Constitucional"
                value={aiForm.disciplina}
                onChange={(e) => setAiForm((prev) => ({ ...prev, disciplina: e.target.value }))}
              />
            </CField>
            <CField label="Tópico">
              <input
                type="text"
                className={inputCls()}
                placeholder="Ex: Controle de constitucionalidade"
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
    <div className="page-shell flex h-full min-h-0 flex-col gap-0 overflow-hidden p-0">
      <PageHeadPremium
        className="shrink-0 gap-4"
        icon={Layers3}
        badge={<PageHeadPremiumBadge icon={Sparkles}>Repetição espaçada · FSRS</PageHeadPremiumBadge>}
        title="Flashcards"
        subtitle="Crie decks, estude com FSRS-4.5 e gere cartas com IA quando precisar."
        leadingClassName="min-w-0 shrink-0 lg:max-w-[26rem] xl:max-w-[28rem]"
        statGridClassName="grid min-h-0 w-full max-w-full grid-cols-3 gap-2 sm:max-w-[34rem] sm:gap-3 sm:justify-items-stretch [&>*]:self-stretch sm:[&>*]:min-w-[7.5rem]"
        trailingClassName="w-full shrink-0 sm:w-auto"
        stats={[
          {
            key: 'decks',
            label: 'Decks',
            value: String(deckStats.totalDecks),
            icon: Layers3,
            accent: 'blue',
            className: 'min-h-[5.25rem] sm:min-h-[5.75rem]',
          },
          {
            key: 'cards',
            label: 'Cards',
            value: String(deckStats.totalCards),
            icon: BookOpen,
            accent: 'emerald',
            className: 'min-h-[5.25rem] sm:min-h-[5.75rem]',
          },
          {
            key: 'rev',
            label: 'Revisados',
            value: String(deckStats.totalReviewed),
            icon: Check,
            accent: 'indigo',
            className: 'min-h-[5.25rem] sm:min-h-[5.75rem]',
          },
        ]}
        trailing={(
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end sm:gap-2">
            <button
              type="button"
              onClick={() => { setFormErr(''); setShowInlineDeckForm((prev) => !prev); }}
              className={`${PAGE_HEAD_PREMIUM_PRIMARY_ACTION_CLASS} w-full sm:w-auto`}
            >
              <Plus size={14} aria-hidden />
              Novo deck
            </button>
            <button
              type="button"
              onClick={() => { setAiErr(''); setAiSuccess(''); setAiGenModal(true); }}
              className={`${PAGE_HEAD_PREMIUM_IA_ACTION_CLASS} w-full sm:w-auto`}
            >
              <Sparkles size={14} aria-hidden />
              Gerar com IA
            </button>
          </div>
        )}
      />

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-5 lg:px-6">
        <ErrBanner msg={aiSuccess} />
        {showInlineDeckForm && (
          <div className="mb-3 rounded-xl border border-ink-200 bg-white p-3 shadow-sm">
            <ErrBanner msg={formErr} />
            <div className="grid gap-2.5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
              <input
                type="text"
                className={inputCls()}
                placeholder="Título do deck"
                value={deckForm.title}
                onChange={(e) => setDeckForm((f) => ({ ...f, title: e.target.value }))}
              />
              <input
                type="text"
                className={inputCls()}
                placeholder="Disciplina"
                value={deckForm.disciplina}
                onChange={(e) => setDeckForm((f) => ({ ...f, disciplina: e.target.value }))}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setShowInlineDeckForm(false)}
                  className="rounded-xl border-2 border-ink-200 px-4 py-3 text-sm font-bold text-ink-600 hover:bg-ink-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateDeck}
                  disabled={saving}
                  className="flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  Criar
                </button>
              </div>
            </div>
          </div>
        )}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={28} className="animate-spin text-brand-500" />
          </div>
        ) : decks.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-14">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-ink-100">
              <Layers3 size={36} className="text-ink-400" />
            </div>
            <div className="text-center">
              <p className="font-bold text-ink-700">Nenhum deck ainda</p>
              <p className="text-sm text-ink-500 mt-1">Crie seu primeiro deck para começar a estudar com repetição espaçada.</p>
            </div>
            <button
              type="button"
              onClick={() => { setFormErr(''); setShowInlineDeckForm(true); }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-brand-300/55 bg-gradient-to-r from-brand-400 via-brand-500 to-brand-500 px-3.5 py-2 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(37,99,235,0.38)] ring-1 ring-brand-200/25 transition hover:from-brand-300 hover:via-brand-400 hover:to-brand-400 hover:shadow-[0_12px_28px_rgba(37,99,235,0.45)]"
            >
              <Plus size={16} />
              Criar primeiro deck
            </button>
          </div>
        ) : (
          <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {decks.map((deck) => {
              const color = getColor(deck.color);
              return (
                <div
                  key={deck.id}
                  className={`group relative flex cursor-pointer flex-col gap-2 rounded-xl border-2 p-3.5 transition-all hover:shadow-md ring-2 ring-transparent hover:ring-2 ${color.bg} border-ink-200 hover:${color.ring}`}
                  onClick={() => openDeck(deck)}
                >
                  <div className="flex items-start justify-between">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${color.dot.replace('bg-', 'bg-').replace('-500', '-100')}`}>
                      <Layers3 size={18} className={color.text} />
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ type: 'deck', id: deck.id }); }}
                      className="rounded-lg p-1.5 text-ink-300 opacity-0 group-hover:opacity-100 hover:bg-white hover:text-red-400 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div>
                    <h3 className="line-clamp-2 text-sm font-semibold leading-tight text-ink-800">{deck.title}</h3>
                    {deck.disciplina && (
                      <p className={`text-xs font-bold mt-0.5 ${color.text}`}>{deck.disciplina}</p>
                    )}
                    {deck.description && (
                      <p className="text-xs text-ink-500 mt-1 line-clamp-2">{deck.description}</p>
                    )}
                  </div>

                  <div className="mt-auto flex items-center justify-between pt-1">
                    <span className="text-[11px] font-semibold text-ink-500">
                      {deck.total_cards} {deck.total_cards === 1 ? 'card' : 'cards'} · {deck.revisados} revisados
                    </span>
                    <ChevronRight size={16} className="text-ink-400" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete deck confirm */}
      {deleteConfirm?.type === 'deck' && (
        <CModal
          title="Excluir deck?"
          onClose={() => setDeleteConfirm(null)}
          footer={
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteConfirm(null)} className="rounded-xl border-2 border-ink-200 px-4 py-2 text-sm font-bold text-ink-600 hover:bg-ink-50">
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
          <p className="text-sm text-ink-600">
            O deck e todos os seus cards serão excluídos permanentemente. Esta ação não pode ser desfeita.
          </p>
        </CModal>
      )}
    </div>
  );
}
