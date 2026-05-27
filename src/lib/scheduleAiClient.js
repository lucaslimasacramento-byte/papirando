import { resolveAiBaseUrl, resolveAiHeaders } from './aiRuntime';

/**
 * Gera um cronograma semanal de estudos usando IA.
 *
 * @param {{
 *   disciplinas: Array<{ nome: string, peso?: number, percentual?: number, topicosPendentes?: number }>,
 *   availability: Array<{ id: string, label: string, enabled: boolean, slots: Array<{ id: string, enabled: boolean, minutes: number }> }>,
 *   meta?: string
 * }} params
 * @returns {Promise<{
 *   provider: string,
 *   model: string,
 *   semana: Array<{ dia: string, blocos: Array<{ horario: string, disciplina: string, modo: string, duracao: number, topico: string, justificativa: string }> }>,
 *   resumo: string,
 *   prioridades: string[],
 *   horasTotais: number,
 *   dica: string
 * }>}
 */
export async function generateScheduleWithAI({ disciplinas = [], availability = [], meta = '' }) {
  const baseUrl = resolveAiBaseUrl();

  const response = await fetch(`${baseUrl}/api/ai/generate-schedule`, {
    method: 'POST',
    headers: await resolveAiHeaders(),
    body: JSON.stringify({ disciplinas, availability, meta }),
  });

  const responseText = await response.text().catch(() => '');
  let payload = {};

  if (responseText) {
    try {
      payload = JSON.parse(responseText);
    } catch {
      if (!response.ok) {
        throw new Error('O servidor de IA respondeu em formato invalido.');
      }
      throw new Error('A resposta do cronograma veio vazia ou invalida.');
    }
  }

  if (!response.ok) {
    throw new Error(
      payload?.error ||
        (responseText ? 'Nao foi possivel gerar o cronograma com IA.' : 'O servidor de IA nao retornou resposta.')
    );
  }

  if (!Array.isArray(payload?.semana)) {
    throw new Error('O cronograma retornado pela IA nao tem o formato esperado.');
  }

  return payload;
}

/** Mapeia o dia da semana (ex: 'seg') para o label completo */
export const DIA_LABELS = {
  dom: 'Domingo',
  seg: 'Segunda',
  ter: 'Terca',
  qua: 'Quarta',
  qui: 'Quinta',
  sex: 'Sexta',
  sab: 'Sabado',
};

/** Mapeia o modo para uma cor de fundo (usando pl-* tokens) */
export const MODO_COLORS = {
  Teoria: { bg: 'var(--pl-accent-soft)', color: 'var(--pl-accent)', border: 'var(--pl-accent)' },
  Questoes: { bg: 'var(--pl-warn-soft)', color: 'var(--pl-warn)', border: 'var(--pl-warn)' },
  Revisao: { bg: 'var(--pl-success-soft)', color: 'var(--pl-success)', border: 'var(--pl-success)' },
};
