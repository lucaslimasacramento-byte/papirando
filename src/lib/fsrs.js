/**
 * FSRS-4.5 — Free Spaced Repetition Scheduler
 * Implementação baseada no algoritmo de Jarrett Ye (open source)
 * 20-40% mais eficiente que o SM-2 (Anki padrão)
 *
 * Ratings:
 *   1 = Again  (esqueceu)
 *   2 = Hard   (lembrou com dificuldade)
 *   3 = Good   (lembrou normalmente)
 *   4 = Easy   (muito fácil)
 *
 * States:
 *   0 = New
 *   1 = Learning
 *   2 = Review
 *   3 = Relearning
 */

// Pesos calibrados do FSRS-4.5
const W = [
  0.4072, 1.1829, 3.1262, 15.4722, 7.2102,
  0.5316, 1.0651, 0.0589, 1.5330,  0.1544,
  1.0070, 1.9384, 0.1100, 0.2900,  2.2700,
  0.1200, 2.9898,
];

const DECAY = -0.5;
const FACTOR = Math.pow(0.9, 1 / DECAY) - 1; // ≈ 0.2342
const REQUEST_RETENTION = 0.9;

// Estados do card
export const State = {
  New: 0,
  Learning: 1,
  Review: 2,
  Relearning: 3,
};

// Labels dos ratings para exibição
export const RATING_LABELS = {
  1: { label: 'Errei', color: 'bg-red-100 text-red-700 border-red-200', emoji: '✕' },
  2: { label: 'Difícil', color: 'bg-orange-100 text-orange-700 border-orange-200', emoji: '~' },
  3: { label: 'Lembrei', color: 'bg-green-100 text-green-700 border-green-200', emoji: '✓' },
  4: { label: 'Fácil', color: 'bg-brand-100 text-brand-700 border-brand-200', emoji: '⚡' },
};

// Card padrão (novo)
export function newCard() {
  return {
    stability: 0,
    difficulty: 5,
    elapsed_days: 0,
    scheduled_days: 0,
    reps: 0,
    lapses: 0,
    state: State.New,
    due: new Date().toISOString(),
    last_review: null,
  };
}

// Calcula intervalo em dias para manter retenção alvo
function nextInterval(stability) {
  return Math.max(1, Math.round((stability / FACTOR) * (Math.pow(REQUEST_RETENTION, 1 / DECAY) - 1)));
}

// Inicializa estabilidade para cards novos
function initStability(rating) {
  return Math.max(W[rating - 1], 0.1);
}

// Inicializa dificuldade para cards novos
function initDifficulty(rating) {
  const d = W[4] - Math.exp(W[5] * (rating - 1)) + 1;
  return clamp(d, 1, 10);
}

// Atualiza dificuldade após revisão
function nextDifficulty(difficulty, rating) {
  const deltaD = -W[6] * (rating - 3);
  const d = difficulty + deltaD * ((10 - difficulty) / 9);
  return clamp(d, 1, 10);
}

// Calcula fator de recall
function forgettingCurve(elapsedDays, stability) {
  return Math.pow(1 + FACTOR * elapsedDays / stability, DECAY);
}

// Atualiza estabilidade após revisão bem-sucedida
function nextRecallStability(difficulty, stability, retrievability, rating) {
  const hardPenalty = rating === 2 ? W[15] : 1;
  const easyBonus = rating === 4 ? W[16] : 1;
  return stability * (
    Math.exp(W[8]) *
    (11 - difficulty) *
    Math.pow(stability, -W[9]) *
    (Math.exp((1 - retrievability) * W[10]) - 1) *
    hardPenalty *
    easyBonus + 1
  );
}

// Atualiza estabilidade após esquecimento (lapse)
function nextForgetStability(difficulty, stability, retrievability) {
  return W[11] * Math.pow(difficulty, -W[12]) * (Math.pow(stability + 1, W[13]) - 1) * Math.exp((1 - retrievability) * W[14]);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function addMinutes(minutes) {
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}

function addDays(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

/**
 * Função principal: recebe um card e um rating, retorna o card atualizado.
 * @param {object} card - card atual com campos FSRS
 * @param {number} rating - 1 (Again), 2 (Hard), 3 (Good), 4 (Easy)
 * @returns {object} card atualizado
 */
export function scheduleCard(card, rating) {
  const now = new Date();
  const lastReview = card.last_review ? new Date(card.last_review) : now;
  const elapsedDays = Math.max(0, Math.floor((now - lastReview) / (1000 * 60 * 60 * 24)));

  const base = {
    ...card,
    last_review: now.toISOString(),
    elapsed_days: elapsedDays,
    reps: card.reps + 1,
  };

  // Card NOVO — primeira visualização
  if (card.state === State.New) {
    const stability = initStability(rating);
    const difficulty = initDifficulty(rating);

    if (rating === 1) {
      return { ...base, stability, difficulty, state: State.Learning, scheduled_days: 0, due: addMinutes(1) };
    }
    if (rating === 2) {
      return { ...base, stability, difficulty, state: State.Learning, scheduled_days: 0, due: addMinutes(5) };
    }
    if (rating === 3) {
      return { ...base, stability, difficulty, state: State.Learning, scheduled_days: 0, due: addMinutes(10) };
    }
    // rating === 4: Easy → vai direto para Review
    const interval = Math.max(1, nextInterval(stability));
    return { ...base, stability, difficulty, state: State.Review, scheduled_days: interval, due: addDays(interval) };
  }

  // Card em LEARNING
  if (card.state === State.Learning) {
    const stability = initStability(rating);
    const difficulty = nextDifficulty(card.difficulty, rating);

    if (rating === 1) {
      return { ...base, stability, difficulty, state: State.Learning, scheduled_days: 0, due: addMinutes(5) };
    }
    if (rating === 2) {
      return { ...base, stability, difficulty, state: State.Learning, scheduled_days: 0, due: addMinutes(10) };
    }
    // rating 3 ou 4 → passa para Review
    const interval = rating === 4 ? 4 : 1;
    return { ...base, stability, difficulty, state: State.Review, scheduled_days: interval, due: addDays(interval) };
  }

  // Card em RELEARNING
  if (card.state === State.Relearning) {
    const stability = initStability(rating);
    const difficulty = nextDifficulty(card.difficulty, rating);

    if (rating === 1) {
      return { ...base, stability, difficulty, state: State.Relearning, scheduled_days: 0, due: addMinutes(10) };
    }
    const interval = Math.max(1, nextInterval(stability));
    return { ...base, stability, difficulty, state: State.Review, scheduled_days: interval, due: addDays(interval) };
  }

  // Card em REVIEW
  const retrievability = forgettingCurve(elapsedDays, card.stability);
  const difficulty = nextDifficulty(card.difficulty, rating);

  if (rating === 1) {
    // Esqueceu — volta para Relearning
    const stability = nextForgetStability(difficulty, card.stability, retrievability);
    return {
      ...base,
      stability,
      difficulty,
      state: State.Relearning,
      lapses: card.lapses + 1,
      scheduled_days: 0,
      due: addMinutes(10),
    };
  }

  const stability = nextRecallStability(difficulty, card.stability, retrievability, rating);
  const interval = nextInterval(stability);
  return { ...base, stability, difficulty, state: State.Review, scheduled_days: interval, due: addDays(interval) };
}

/**
 * Retorna os cards que precisam ser revisados agora (due <= agora)
 */
export function getDueCards(cards) {
  const now = new Date();
  return (Array.isArray(cards) ? cards : [])
    .filter((card) => card && new Date(card.due) <= now)
    .sort((a, b) => new Date(a.due) - new Date(b.due));
}

/**
 * Retorna quantos cards vencem hoje
 */
export function countDueToday(cards) {
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);
  return (Array.isArray(cards) ? cards : []).filter(
    (card) => card && new Date(card.due) <= endOfDay
  ).length;
}

/**
 * Formata o próximo intervalo para exibição
 */
export function formatNextInterval(card, rating) {
  const updated = scheduleCard(card, rating);
  if (updated.state === State.Learning || updated.state === State.Relearning) {
    const diffMs = new Date(updated.due) - Date.now();
    const mins = Math.round(diffMs / 60000);
    return mins <= 1 ? '1 min' : `${mins} min`;
  }
  const days = updated.scheduled_days;
  if (days === 1) return '1 dia';
  if (days < 30) return `${days} dias`;
  const months = Math.round(days / 30);
  return `${months} ${months === 1 ? 'mês' : 'meses'}`;
}
