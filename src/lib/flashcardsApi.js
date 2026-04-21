import { getDueCards, newCard, scheduleCard } from './fsrs';
import { supabase } from './supabase';

function normalizeDeck(value = {}) {
  const payload = value && typeof value === 'object' ? value : {};
  return {
    ...payload,
    title: String(payload.title || payload.titulo || '').trim(),
    disciplina: String(payload.disciplina || '').trim(),
    description: String(payload.description || payload.descricao || '').trim(),
    color: String(payload.color || 'blue').trim() || 'blue',
    total_cards: Number(payload.total_cards ?? payload.card_count ?? 0),
    revisados: Number(payload.revisados ?? payload.reviewed_count ?? 0),
  };
}

function normalizeCard(value = {}) {
  return {
    ...newCard(),
    ...(value && typeof value === 'object' ? value : {}),
  };
}

export async function loadDecks(userId) {
  if (!userId) return [];

  const { data: decks, error } = await supabase
    .from('flashcard_decks')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) throw error;

  const deckList = Array.isArray(decks) ? decks : [];
  if (deckList.length === 0) return [];

  const deckIds = deckList.map((deck) => deck.id);

  const [{ data: cards }, { data: reviews }] = await Promise.all([
    supabase.from('flashcard_cards').select('id, deck_id').in('deck_id', deckIds),
    supabase.from('flashcard_reviews').select('id, deck_id').in('deck_id', deckIds),
  ]);

  const totals = new Map();
  const reviewed = new Map();

  (Array.isArray(cards) ? cards : []).forEach((card) => {
    totals.set(card.deck_id, Number(totals.get(card.deck_id) || 0) + 1);
  });

  (Array.isArray(reviews) ? reviews : []).forEach((review) => {
    reviewed.set(review.deck_id, Number(reviewed.get(review.deck_id) || 0) + 1);
  });

  return deckList.map((deck) =>
    normalizeDeck({
      ...deck,
      total_cards: totals.get(deck.id) || 0,
      revisados: reviewed.get(deck.id) || 0,
    })
  );
}

export async function createDeck({ userId, titulo, disciplina }) {
  const payload = {
    user_id: userId,
    title: String(titulo || '').trim(),
    disciplina: String(disciplina || '').trim(),
  };

  const { data, error } = await supabase
    .from('flashcard_decks')
    .insert(payload)
    .select('*')
    .single();

  if (error) throw error;
  return normalizeDeck(data);
}

export async function deleteDeck(deckId) {
  const { error } = await supabase.from('flashcard_decks').delete().eq('id', deckId);
  if (error) throw error;
}

export async function loadCards(deckId) {
  const { data, error } = await supabase
    .from('flashcard_cards')
    .select('*')
    .eq('deck_id', deckId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (Array.isArray(data) ? data : []).map(normalizeCard);
}

export async function createCard({ deckId, userId, front, back }) {
  const base = newCard();
  const { data, error } = await supabase
    .from('flashcard_cards')
    .insert({
      deck_id: deckId,
      user_id: userId,
      front: String(front || '').trim(),
      back: String(back || '').trim(),
      ...base,
    })
    .select('*')
    .single();

  if (error) throw error;
  return normalizeCard(data);
}

export async function deleteCard(cardId) {
  const { error } = await supabase.from('flashcard_cards').delete().eq('id', cardId);
  if (error) throw error;
}

export async function loadDueCards(deckId) {
  const cards = await loadCards(deckId);
  return getDueCards(cards);
}

export async function submitReview({ card, rating, userId, deckId }) {
  const updated = scheduleCard(card, rating);

  const { error: cardError } = await supabase
    .from('flashcard_cards')
    .update({
      stability: updated.stability,
      difficulty: updated.difficulty,
      elapsed_days: updated.elapsed_days,
      scheduled_days: updated.scheduled_days,
      reps: updated.reps,
      lapses: updated.lapses,
      state: updated.state,
      due: updated.due,
      last_review: updated.last_review,
    })
    .eq('id', card.id);

  if (cardError) throw cardError;

  const { error: reviewError } = await supabase.from('flashcard_reviews').insert({
    user_id: userId,
    deck_id: deckId,
    card_id: card.id,
    rating,
    reviewed_at: new Date().toISOString(),
  });

  if (reviewError) throw reviewError;

  const { error: progressError } = await supabase
    .from('flashcard_deck_progress')
    .upsert(
      {
        user_id: userId,
        deck_id: deckId,
        last_reviewed_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,deck_id' }
    );

  if (progressError) {
    console.warn('Nao foi possivel atualizar progresso do deck:', progressError);
  }

  return normalizeCard(updated);
}

export { normalizeDeck };
