/**
 * planLimits.js — configuração central de limites do plano Folha
 *
 * Durante o trial (isPremium = true via useSubscription) todos os limites são ignorados.
 * Após o trial expirar sem assinatura, os limites do Folha entram em vigor.
 */

// ── Helpers de período ────────────────────────────────────────────────────────

export function dailyPeriod() {
  return 'daily:' + new Date().toISOString().slice(0, 10);
}

export function monthlyPeriod() {
  return 'monthly:' + new Date().toISOString().slice(0, 7);
}

export function weeklyPeriod() {
  const d = new Date();
  const startOfYear = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7);
  return `weekly:${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

export function getPeriod(type) {
  if (type === 'daily')   return dailyPeriod();
  if (type === 'monthly') return monthlyPeriod();
  if (type === 'weekly')  return weeklyPeriod();
  return 'daily:' + new Date().toISOString().slice(0, 10);
}

// ── Limites contáveis (rastreados no banco) ───────────────────────────────────
// folha: número máximo de usos no período
// period: 'daily' | 'monthly' | 'weekly'
// label: texto exibido no banner de limite

export const COUNTED_LIMITS = {
  questions_daily: {
    period: 'daily',
    folha: 10,
    label: 'questões respondidas por dia',
    upgradeHint: 'Questões ilimitadas no Papiro',
  },
  simulados_monthly: {
    period: 'monthly',
    folha: 1,
    label: 'simulado por mês',
    upgradeHint: 'Simulados ilimitados no Papiro',
  },
  uploads_monthly: {
    period: 'monthly',
    folha: 1,
    label: 'upload de material por mês',
    upgradeHint: 'Uploads ilimitados no Papiro',
  },
  essays_monthly: {
    period: 'monthly',
    folha: 1,
    label: 'correção de redação por mês',
    upgradeHint: 'Correções ilimitadas no Papiro',
  },
  ai_chat_daily: {
    period: 'daily',
    folha: 10,
    label: 'mensagens de IA por dia',
    upgradeHint: 'Chat ilimitado no Papiro',
  },
  conciliador_weekly: {
    period: 'weekly',
    folha: 1,
    label: 'análise de concurso por semana',
    upgradeHint: 'Análises ilimitadas no Papiro',
  },
  community_posts_weekly: {
    period: 'weekly',
    folha: 2,
    label: 'posts por semana',
    upgradeHint: 'Posts ilimitados no Papiro',
  },
};

// ── Features completamente bloqueadas no plano Folha ─────────────────────────
// false = bloqueado no Folha | true = liberado no Folha

export const FEATURE_ACCESS = {
  // IA
  ai_flashcards:          { folha: false, label: 'Geração de flashcards por IA',       upgradeHint: 'Crie flashcards ilimitados com IA no Papiro' },
  ai_questions:           { folha: false, label: 'Geração de questões por IA',          upgradeHint: 'Gere questões ilimitadas com IA no Papiro' },
  ai_mindmaps:            { folha: false, label: 'Geração de mapas mentais por IA',     upgradeHint: 'Crie mapas ilimitados com IA no Papiro' },
  ai_planning:            { folha: false, label: 'Planejamento automático por IA',      upgradeHint: 'Planejamento adaptativo no Papiro' },
  ai_revision:            { folha: false, label: 'Revisão inteligente por IA',          upgradeHint: 'Priorização inteligente de revisões no Papiro' },
  ai_edital:              { folha: false, label: 'Análise de edital por IA',            upgradeHint: 'Análise completa do edital no Papiro' },
  ai_material_extract:    { folha: false, label: 'Extração de conteúdo por IA',         upgradeHint: 'Extraia flashcards e questões dos seus materiais' },

  // Conteúdo e organização
  material_highlights:    { folha: false, label: 'Destaques e notas em materiais',      upgradeHint: 'Anote e destaque seus materiais no Papiro' },
  audiobooks:             { folha: false, label: 'Audiobooks',                          upgradeHint: 'Acesse a biblioteca de audiobooks no Papiro' },
  legislation_highlights: { folha: false, label: 'Destaques na legislação',             upgradeHint: 'Anote e destaque a legislação no Papiro' },

  // Comunidade
  vip_community:          { folha: false, label: 'Sala VIP da comunidade',              upgradeHint: 'Acesse a sala VIP no Papiro' },
  create_squad:           { folha: false, label: 'Criar esquadrão',                     upgradeHint: 'Crie seu próprio esquadrão no Papiro' },

  // Features com acesso parcial (folha = true mas com restrição de UI)
  simulados_banca:        { folha: false, label: 'Modo Banca (CESPE, FGV, FCC…)',      upgradeHint: 'Treine com todas as bancas no Papiro' },
  mindmap_create:         { folha: false, label: 'Criar mapas mentais',                 upgradeHint: 'Crie e edite mapas mentais no Papiro' },
};

// ── Helpers para uso no código ────────────────────────────────────────────────

/** Retorna true se a feature requer premium */
export function requiresPremium(featureKey) {
  return FEATURE_ACCESS[featureKey]?.folha === false;
}

/** Retorna config de limite contável ou null */
export function getCountedLimit(featureKey) {
  return COUNTED_LIMITS[featureKey] ?? null;
}

/** Textos padrão do gate */
export function getGateLabel(featureKey) {
  return (
    FEATURE_ACCESS[featureKey]?.label ||
    COUNTED_LIMITS[featureKey]?.label ||
    'Recurso premium'
  );
}

export function getGateHint(featureKey) {
  return (
    FEATURE_ACCESS[featureKey]?.upgradeHint ||
    COUNTED_LIMITS[featureKey]?.upgradeHint ||
    'Disponível no plano Papiro'
  );
}
