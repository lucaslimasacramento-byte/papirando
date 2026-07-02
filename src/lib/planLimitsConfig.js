// Limites de plano editáveis pelo admin (sem mexer em código).
// Os defaults vêm de PLAN_CONFIG (planConfig.js); o admin pode sobrescrever
// e a sobrescrita é persistida em redacao_site_content.plan_limits_json.
//
// Hoje SÓ `max_courses` altera comportamento (via getCourseLimitFromProfile).
// `max_questions_per_day` fica salvo aqui para quando a trava diária for ligada.

import { PLAN_CONFIG } from './planConfig';

// Planos ativos hoje (modelo de 2 tiers). Aliases legados não são editáveis aqui.
export const EDITABLE_PLAN_KEYS = ['folha', 'papiro'];

export const PLAN_LIMIT_FIELDS = [
  {
    key: 'max_courses',
    label: 'Objetivos / cursos',
    help: 'Quantos objetivos o aluno pode vincular. Vazio = ilimitado.',
    enforced: true,
  },
  {
    key: 'max_questions_per_day',
    label: 'Questões por dia',
    help: 'Limite diário de questões. Vazio = ilimitado. (ainda não travado no app)',
    enforced: false,
  },
];

// Rótulo amigável de cada plano (cai no key se PLAN_CONFIG não tiver label).
export function planLabel(key) {
  return PLAN_CONFIG[key]?.label || key;
}

// Converte um valor cru num limite válido: null = ilimitado, número >= 0, ou fallback.
function coerceLimit(value, fallback) {
  if (value === null || value === '' || value === undefined) {
    return value === null || value === '' ? null : fallback;
  }
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.floor(n);
}

// Mescla os overrides do admin sobre os defaults de PLAN_CONFIG.
// Sempre retorna um objeto completo { folha: {...}, papiro: {...} }.
export function normalizePlanLimits(raw) {
  const overrides = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const out = {};
  for (const key of EDITABLE_PLAN_KEYS) {
    const base = PLAN_CONFIG[key] || {};
    const ov = overrides[key] && typeof overrides[key] === 'object' ? overrides[key] : {};
    out[key] = {
      max_courses: coerceLimit(ov.max_courses, base.max_courses ?? null),
      max_questions_per_day: coerceLimit(ov.max_questions_per_day, base.max_questions_per_day ?? null),
    };
  }
  return out;
}

// Só o que o admin realmente mudou frente aos defaults — payload enxuto pro banco.
export function planLimitsForSave(limits) {
  const normalized = normalizePlanLimits(limits);
  const out = {};
  for (const key of EDITABLE_PLAN_KEYS) {
    out[key] = {
      max_courses: normalized[key].max_courses,
      max_questions_per_day: normalized[key].max_questions_per_day,
    };
  }
  return out;
}

// Resolve a chave de plano a partir do perfil (com aliases legados).
export function resolvePlanKey(profile) {
  const plan = String(profile?.subscription_plan || '').toLowerCase();
  if (['papiro', 'tatico', 'elite', 'beta'].includes(plan)) return 'papiro';
  return 'folha';
}

// Limite de cursos do perfil segundo os limites resolvidos. null (ilimitado) → null.
export function planCourseLimit(profile, limits) {
  const resolved = normalizePlanLimits(limits);
  return resolved[resolvePlanKey(profile)]?.max_courses ?? null;
}
