export type QuestionSource = 'enem.dev' | 'opentdb';

export type NormalizedQuestion = {
  external_id: string;
  source: QuestionSource;
  exam?: string;
  year?: number;
  discipline?: string;
  subject?: string;
  topic?: string;
  statement: string;
  alternatives: {
    key: string;
    text: string;
    is_correct?: boolean;
  }[];
  correct_answer?: string;
  explanation?: string;
  image_url?: string;
  difficulty?: 'easy' | 'medium' | 'hard' | null;
  raw: any;
};

const ENEM_BASE_URL = 'https://api.enem.dev/v1';
const OPEN_TRIVIA_URL = 'https://opentdb.com/api.php';

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: { accept: 'application/json' },
  });

  if (response.status === 429) {
    throw new Error('RATE_LIMIT_429');
  }

  if (!response.ok) {
    throw new Error(`HTTP_${response.status}`);
  }

  return response.json() as Promise<T>;
}

function decodeHtml(value: unknown): string {
  const text = String(value || '');
  if (!text) return '';

  if (typeof document !== 'undefined') {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
  }

  return text
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function asArray<T = any>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function pickImageUrl(question: any): string | undefined {
  const file = asArray(question?.files).find((item: any) => item?.url || item?.href);
  const alternativeFile = asArray(question?.alternatives)
    .map((item: any) => item?.file)
    .find((item: any) => item?.url || item?.href);
  return file?.url || file?.href || alternativeFile?.url || alternativeFile?.href || undefined;
}

function normalizeDifficulty(value: unknown): 'easy' | 'medium' | 'hard' | null {
  const raw = String(value || '').toLowerCase();
  if (raw === 'easy' || raw === 'facil' || raw === 'fácil') return 'easy';
  if (raw === 'medium' || raw === 'media' || raw === 'média' || raw === 'medio' || raw === 'médio') return 'medium';
  if (raw === 'hard' || raw === 'dificil' || raw === 'difícil') return 'hard';
  return null;
}

function shuffle<T>(items: T[]): T[] {
  return [...items]
    .map((item) => ({ item, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ item }) => item);
}

function wait(ms: number) {
  return new Promise((resolve) => globalThis.setTimeout(resolve, ms));
}

export async function getEnemExams() {
  return fetchJson<any[]>(`${ENEM_BASE_URL}/exams`);
}

export async function getEnemQuestionsByYear(year: number, limit?: number) {
  if (!limit) {
    const questions: any[] = [];
    for (let offset = 0; ; offset += 10) {
      const payload = await fetchJson<any>(`${ENEM_BASE_URL}/exams/${year}/questions?limit=10&offset=${offset}`);
      const page = Array.isArray(payload) ? payload : asArray(payload?.questions);
      questions.push(...page);
      if (!payload?.metadata?.hasMore || page.length === 0) break;
      await wait(1200);
    }
    return questions;
  }

  const params = new URLSearchParams();
  if (limit && Number.isFinite(limit) && limit > 0) {
    params.set('limit', String(Math.min(10, Math.round(limit))));
  }

  const suffix = params.toString() ? `?${params.toString()}` : '';
  const payload = await fetchJson<any>(`${ENEM_BASE_URL}/exams/${year}/questions${suffix}`);
  return Array.isArray(payload) ? payload : asArray(payload?.questions);
}

export async function getOpenTriviaQuestions(amount = 10) {
  const params = new URLSearchParams({
    amount: String(Math.max(1, Math.min(50, Math.round(amount || 10)))),
    type: 'multiple',
  });
  const payload = await fetchJson<any>(`${OPEN_TRIVIA_URL}?${params.toString()}`);
  return asArray(payload?.results);
}

export function normalizeEnemQuestion(question: any, year?: number): NormalizedQuestion {
  const questionYear = Number(question?.year || year) || undefined;
  const index = String(question?.index || question?.number || question?.id || '').trim();
  const discipline = String(question?.discipline || '').trim();
  const language = String(question?.language || '').trim();
  const introduction = String(question?.alternativesIntroduction || '').trim();
  const context = String(question?.context || '').trim();
  const statement = [context, introduction].filter(Boolean).join('\n\n');
  const alternatives = asArray(question?.alternatives).map((item: any) => ({
    key: String(item?.letter || item?.key || '').trim().toUpperCase(),
    text: String(item?.text || '').trim(),
    is_correct: Boolean(item?.isCorrect),
  })).filter((item) => item.key && item.text);
  const correctAnswer = String(question?.correctAlternative || alternatives.find((item) => item.is_correct)?.key || '').trim().toUpperCase();

  return {
    external_id: `enem-${questionYear || 'unknown'}-${index || question?.title || crypto.randomUUID()}`,
    source: 'enem.dev',
    exam: questionYear ? `ENEM ${questionYear}` : 'ENEM',
    year: questionYear,
    discipline,
    subject: language || discipline || undefined,
    topic: undefined,
    statement: statement || String(question?.title || '').trim(),
    alternatives,
    correct_answer: correctAnswer || undefined,
    explanation: undefined,
    image_url: pickImageUrl(question),
    difficulty: null,
    raw: question,
  };
}

export function normalizeOpenTriviaQuestion(question: any): NormalizedQuestion {
  const correct = decodeHtml(question?.correct_answer);
  const alternatives = shuffle([
    { key: 'A', text: correct, is_correct: true },
    ...asArray(question?.incorrect_answers).map((answer, index) => ({
      key: String.fromCharCode(66 + index),
      text: decodeHtml(answer),
      is_correct: false,
    })),
  ]).map((item, index) => ({
    ...item,
    key: String.fromCharCode(65 + index),
  }));
  const correctKey = alternatives.find((item) => item.is_correct)?.key;
  const statement = decodeHtml(question?.question);
  const category = decodeHtml(question?.category);

  return {
    external_id: `opentdb-${btoa(unescape(encodeURIComponent(`${category}:${statement}:${correct}`))).slice(0, 120)}`,
    source: 'opentdb',
    exam: 'Open Trivia DB',
    discipline: 'Conhecimentos gerais',
    subject: category || undefined,
    topic: category || undefined,
    statement,
    alternatives,
    correct_answer: correctKey,
    explanation: correct ? `Resposta correta: ${correct}` : undefined,
    difficulty: normalizeDifficulty(question?.difficulty),
    raw: question,
  };
}
