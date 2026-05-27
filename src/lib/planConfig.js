/**
 * Fonte única de verdade para preços e limites dos planos.
 * Altere aqui para refletir em AdminFinance, cálculo de MRR e qualquer outra referência.
 */

export const PLAN_CONFIG = {
  gratuito: {
    label: 'Gratuito',
    preco_mensal: 0,
    preco_anual: 0,
    max_courses: 1,
    max_questions_per_day: 15,
  },
  tatico: {
    label: 'Tático',
    preco_mensal: 49.9,
    preco_anual: 29.9,
    max_courses: null,
    max_questions_per_day: null,
  },
  elite: {
    label: 'Elite',
    preco_mensal: 89.9,
    preco_anual: 59.9,
    max_courses: null,
    max_questions_per_day: null,
  },
};

/** Preço mensal por plano (usado em cálculo de MRR). */
export const PLAN_PRICES = Object.fromEntries(
  Object.entries(PLAN_CONFIG).map(([key, cfg]) => [key, cfg.preco_mensal])
);

/** Retorna o preço mensal de um plano ou 0 se não encontrado. */
export function getMonthlyPrice(plan) {
  return PLAN_CONFIG[plan]?.preco_mensal ?? 0;
}
