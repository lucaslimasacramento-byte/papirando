import { getDueCards, newCard, scheduleCard } from './fsrs';
import { supabase } from './supabase';

/**
 * Repeticao espacada por TOPICO (Passo 4 da trilha), reusando a engine FSRS
 * dos flashcards. Cada linha de topic_review_schedule e um "card" FSRS por
 * (user, disciplina, topico). A revisao aparece embutida no plano como bloco
 * de "Revisao" — sem tela separada.
 */

const FSRS_FIELDS = [
  'stability',
  'difficulty',
  'elapsed_days',
  'scheduled_days',
  'reps',
  'lapses',
  'state',
  'due',
  'last_review',
];

/** Normaliza texto para comparar/deduplicar (trim + colapsa espacos). */
function clean(value) {
  return String(value || '').trim();
}

/**
 * Garante um card de revisao para cada topico informado, sem resetar os que ja
 * existem (ignoreDuplicates). topics: [{ disciplina, topico }].
 */
export async function ensureTopicReviewCards({ userId, topics = [] }) {
  if (!userId || !Array.isArray(topics) || topics.length === 0) return;

  const seen = new Set();
  const rows = [];
  for (const t of topics) {
    const disciplina = clean(t?.disciplina);
    const topico = clean(t?.topico);
    if (!topico) continue; // so entra na revisao topico nomeado
    const key = `${disciplina}::${topico}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({ user_id: userId, disciplina, topico, ...newCard() });
  }
  if (rows.length === 0) return;

  const { error } = await supabase
    .from('topic_review_schedule')
    .upsert(rows, { onConflict: 'user_id,disciplina,topico', ignoreDuplicates: true });
  if (error) throw error;
}

/** Carrega todos os cards de revisao do usuario. */
export async function loadTopicReviewCards(userId) {
  if (!userId) return [];
  const { data, error } = await supabase
    .from('topic_review_schedule')
    .select('*')
    .eq('user_id', userId);
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

/** Topicos cuja revisao ja venceu (due <= agora), mais urgentes primeiro. */
export async function getDueTopicReviews(userId) {
  const cards = await loadTopicReviewCards(userId);
  return getDueCards(cards);
}

/** Quantos topicos vencem hoje. */
export async function countDueTopicReviews(userId) {
  const cards = await loadTopicReviewCards(userId);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);
  return cards.filter((c) => c && new Date(c.due) <= endOfDay).length;
}

/**
 * Registra a avaliacao de uma revisao (1 Errei / 2 Dificil / 3 Lembrei /
 * 4 Facil): recalcula o estado FSRS e grava o proximo `due`.
 * @returns {Promise<object>} card atualizado
 */
export async function submitTopicReview({ card, rating }) {
  if (!card?.id) throw new Error('Card de revisao invalido.');
  const updated = scheduleCard(card, rating);

  const patch = { last_rating: rating, updated_at: new Date().toISOString() };
  for (const field of FSRS_FIELDS) patch[field] = updated[field];

  const { error } = await supabase
    .from('topic_review_schedule')
    .update(patch)
    .eq('id', card.id);
  if (error) throw error;

  return { ...card, ...patch };
}
