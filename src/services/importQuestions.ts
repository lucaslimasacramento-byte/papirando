import { supabase } from '../lib/supabase';
import {
  getEnemQuestionsByYear,
  normalizeEnemQuestion,
  type NormalizedQuestion,
} from './questionsApi';

const ENEM_YEARS = Array.from({ length: 2023 - 2009 + 1 }, (_, index) => 2009 + index);
const CHUNK_SIZE = 80;

export type ImportResult = {
  year?: number;
  imported: number;
  errors: string[];
};

function toDbDifficulty(value: NormalizedQuestion['difficulty']): string {
  if (value === 'easy') return 'Facil';
  if (value === 'hard') return 'Dificil';
  return 'Media';
}

function toDbAlternatives(question: NormalizedQuestion) {
  return question.alternatives.map((item) => ({
    id: item.key,
    label: item.text,
    isCorrect: Boolean(item.is_correct),
  }));
}

function toQuestionRow(question: NormalizedQuestion) {
  const alternatives = toDbAlternatives(question);

  return {
    external_id: question.external_id,
    source: question.source,
    exam: question.exam || null,
    year: question.year || null,
    discipline: question.discipline || '',
    disciplina: question.discipline || '',
    subject: question.subject || null,
    topic: question.topic || '',
    statement: question.statement,
    enunciado: question.statement,
    alternatives,
    alternativas: alternatives,
    correct_answer: question.correct_answer || null,
    gabarito: question.correct_answer || '',
    explanation: question.explanation || null,
    explicacao: question.explanation || '',
    image_url: question.image_url || null,
    difficulty: question.difficulty || null,
    dificuldade: toDbDifficulty(question.difficulty),
    raw: question.raw,
    banca: question.source === 'enem.dev' ? 'ENEM' : 'Open Trivia DB',
    ano: question.year ? String(question.year) : '',
    tipo: 'multipla_escolha',
    is_public: true,
    updated_at: new Date().toISOString(),
  };
}

async function upsertQuestions(questions: NormalizedQuestion[]): Promise<number> {
  let imported = 0;

  for (let index = 0; index < questions.length; index += CHUNK_SIZE) {
    const chunk = questions.slice(index, index + CHUNK_SIZE);
    const rows = chunk.map(toQuestionRow);
    const { data, error } = await supabase
      .from('questions')
      .upsert(rows, { onConflict: 'source,external_id' })
      .select('id');

    if (error) {
      throw error;
    }

    imported += Array.isArray(data) ? data.length : rows.length;
  }

  return imported;
}

export async function importEnemYear(year: number): Promise<ImportResult> {
  const errors: string[] = [];

  try {
    const questions = await getEnemQuestionsByYear(year);
    const normalized = questions
      .map((question) => normalizeEnemQuestion(question, year))
      .filter((question) => question.external_id && question.statement && question.alternatives.length > 0);

    const imported = await upsertQuestions(normalized);
    return { year, imported, errors };
  } catch (error: any) {
    const message = error?.message || `Falha ao importar ENEM ${year}`;
    console.error('[QuestionImport] ENEM year failed:', year, error);
    errors.push(message);
    return { year, imported: 0, errors };
  }
}

function wait(ms: number) {
  return new Promise((resolve) => globalThis.setTimeout(resolve, ms));
}

export async function importAllEnemYears(): Promise<ImportResult> {
  const aggregate: ImportResult = { imported: 0, errors: [] };

  for (const year of ENEM_YEARS) {
    const result = await importEnemYear(year);
    aggregate.imported += result.imported;
    aggregate.errors.push(...result.errors.map((error) => `${year}: ${error}`));
    await wait(300);
  }

  return aggregate;
}
