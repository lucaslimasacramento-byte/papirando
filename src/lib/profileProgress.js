import { buildCanonicalHistory, parseStudyTimeToMinutes } from './studyAnalytics';
import { formatCpf, isValidCpf, normalizeCpf } from './cpfAlgorithm';

export { formatCpf, isValidCpf, normalizeCpf };

export const PROGRESS_METRIC_OPTIONS = [
  { value: 'sessions', label: 'Registros salvos' },
  { value: 'questions', label: 'Questões resolvidas' },
  { value: 'reviewSessions', label: 'Revisões' },
  { value: 'simulados', label: 'Simulados' },
  { value: 'perfectSimulados', label: 'Simulados perfeitos' },
  { value: 'studyDays', label: 'Dias estudados' },
  { value: 'streakDays', label: 'Ofensiva em dias' },
  { value: 'minutes', label: 'Minutos estudados' },
  { value: 'onlineMinutes', label: 'Minutos online' },
  { value: 'easyQuestions', label: 'Questões fáceis' },
  { value: 'mediumQuestions', label: 'Questões médias' },
  { value: 'hardQuestions', label: 'Questões difíceis' },
];

export function buildDefaultXpConfig() {
  return {
    perMinute: 1,
    perQuestion: 3,
    perSession: 25,
    perReview: 15,
    perSimulado: 40,
    perPerfectSimulado: 60,
    baseLevelStep: 600,
    stepGrowth: 180,
    customRules: [],
  };
}

export function buildDefaultBadgeConfig() {
  return [
    {
      id: 'primeiro_registro',
      nome: 'Primeiro passo',
      descricao: 'Ganhe ao salvar o primeiro registro de estudo.',
      metric: 'sessions',
      target: 1,
      color: 'emerald',
      plan: '',
      subject: '',
      topic: '',
    },
    {
      id: 'ritmo_firme',
      nome: 'Foco de ferro',
      descricao: 'Ganhe ao manter 7 dias consecutivos de estudo.',
      metric: 'streakDays',
      target: 7,
      color: 'orange',
      plan: '',
      subject: '',
      topic: '',
    },
    {
      id: 'revisora',
      nome: 'Memória afiada',
      descricao: 'Ganhe ao registrar 10 revisões.',
      metric: 'reviewSessions',
      target: 10,
      color: 'indigo',
      plan: '',
      subject: '',
      topic: '',
    },
    {
      id: 'maquina_questoes',
      nome: 'Máquina de questões',
      descricao: 'Ganhe ao resolver 1.000 questões.',
      metric: 'questions',
      target: 1000,
      color: 'blue',
      plan: '',
      subject: '',
      topic: '',
    },
    {
      id: 'sniper',
      nome: 'Sniper',
      descricao: 'Ganhe ao fechar um simulado com 100% de acerto.',
      metric: 'perfectSimulados',
      target: 1,
      color: 'purple',
      plan: '',
      subject: '',
      topic: '',
    },
    {
      id: 'consistencia',
      nome: 'Sobrevivente',
      descricao: 'Ganhe ao estudar em 30 dias diferentes.',
      metric: 'studyDays',
      target: 30,
      color: 'gray',
      plan: '',
      subject: '',
      topic: '',
    },
  ];
}

export function buildProfileMetrics(history = [], subjectCatalog = [], xpConfig = buildDefaultXpConfig()) {
  const metrics = buildScopedMetrics(history, subjectCatalog);
  const baseXp =
    metrics.totalMinutes * Number(xpConfig.perMinute || 1) +
    metrics.totalQuestions * Number(xpConfig.perQuestion || 3) +
    metrics.totalSessions * Number(xpConfig.perSession || 25) +
    metrics.reviewSessions * Number(xpConfig.perReview || 15) +
    metrics.totalSimulados * Number(xpConfig.perSimulado || 40) +
    metrics.perfectSimulados * Number(xpConfig.perPerfectSimulado || 60);

  const customXp = (Array.isArray(xpConfig.customRules) ? xpConfig.customRules : []).reduce((acc, rule) => {
    const scopedMetrics = buildScopedMetrics(history, subjectCatalog, rule);
    return acc + getMetricValue(scopedMetrics, rule?.metric) * Number(rule?.multiplier || 0);
  }, 0);

  return {
    ...metrics,
    xpTotal: baseXp + customXp,
    customXp,
  };
}

export function buildLevelSummary(xpTotal, xpConfig = buildDefaultXpConfig()) {
  const xp = Math.max(0, Number(xpTotal || 0));
  const baseLevelStep = Math.max(1, Number(xpConfig.baseLevelStep || 600));
  const stepGrowth = Math.max(0, Number(xpConfig.stepGrowth || 180));
  let level = 1;
  let currentLevelFloor = 0;
  let nextLevelXp = baseLevelStep;

  while (xp >= nextLevelXp) {
    level += 1;
    currentLevelFloor = nextLevelXp;
    nextLevelXp += baseLevelStep + (level - 1) * stepGrowth;
  }

  const progressRange = Math.max(1, nextLevelXp - currentLevelFloor);
  const progressPercent = Math.max(0, Math.min(100, Math.round(((xp - currentLevelFloor) / progressRange) * 100)));

  return {
    level,
    currentLevelFloor,
    nextLevelXp,
    progressPercent,
    nextLevelStep: baseLevelStep + (level - 1) * stepGrowth,
  };
}

export function buildBadgeSummary({
  history = [],
  subjectCatalog = [],
  badgeConfig = [],
  xpConfig = buildDefaultXpConfig(),
}) {
  const metrics = buildProfileMetrics(history, subjectCatalog, xpConfig);
  const configList = Array.isArray(badgeConfig) && badgeConfig.length > 0 ? badgeConfig : buildDefaultBadgeConfig();

  const badges = configList.map((badge) => {
    const scopedMetrics = buildScopedMetrics(history, subjectCatalog, badge);
    const current = Number(getMetricValue(scopedMetrics, badge.metric) || 0);
    const target = Math.max(1, Number(badge.target || 1));
    return {
      ...badge,
      current,
      target,
      unlocked: current >= target,
      progressPercent: Math.max(0, Math.min(100, Math.round((current / target) * 100))),
    };
  });

  return {
    metrics,
    badges,
    unlockedCount: badges.filter((badge) => badge.unlocked).length,
  };
}

export function buildScopedMetrics(history = [], subjectCatalog = [], scope = {}) {
  const canonicalHistory = buildCanonicalHistory(history, subjectCatalog).filter((record) =>
    recordMatchesScope(record, scope)
  );

  const studyDays = new Set();
  let totalMinutes = 0;
  let totalQuestions = 0;
  let reviewSessions = 0;
  let perfectSimulados = 0;
  let totalSimulados = 0;
  let onlineMinutes = 0;
  let easyQuestions = 0;
  let mediumQuestions = 0;
  let hardQuestions = 0;

  canonicalHistory.forEach((record) => {
    totalMinutes += parseStudyTimeToMinutes(record?.tempo);
    const acertos = Number(record?.acertos || 0);
    const erros = Number(record?.erros || 0);
    totalQuestions += acertos + erros;
    onlineMinutes += Number(record?.onlineMinutes || 0) + parseStudyTimeToMinutes(record?.tempoOnline || 0);
    easyQuestions += Number(record?.questoesFaceis || record?.easyQuestions || 0);
    mediumQuestions += Number(record?.questoesMedias || record?.mediumQuestions || 0);
    hardQuestions += Number(record?.questoesDificeis || record?.hardQuestions || 0);
    if (record?.data) studyDays.add(record.data);

    const type = String(record?.tipo || '').trim().toLowerCase();
    if (type === 'revisão' || type === 'revisao') reviewSessions += 1;
    if (type === 'simulado') {
      totalSimulados += 1;
      if (acertos > 0 && erros === 0) perfectSimulados += 1;
    }
  });

  return {
    totalSessions: canonicalHistory.length,
    totalMinutes,
    totalQuestions,
    reviewSessions,
    perfectSimulados,
    totalSimulados,
    studyDays: studyDays.size,
    streakDays: computeStudyStreak([...studyDays]),
    onlineMinutes,
    easyQuestions,
    mediumQuestions,
    hardQuestions,
  };
}

export function getMetricValue(metrics = {}, metric) {
  const metricMap = {
    sessions: metrics.totalSessions,
    totalSessions: metrics.totalSessions,
    minutes: metrics.totalMinutes,
    totalMinutes: metrics.totalMinutes,
    questions: metrics.totalQuestions,
    totalQuestions: metrics.totalQuestions,
    reviewSessions: metrics.reviewSessions,
    reviews: metrics.reviewSessions,
    simulados: metrics.totalSimulados,
    totalSimulados: metrics.totalSimulados,
    perfectSimulados: metrics.perfectSimulados,
    studyDays: metrics.studyDays,
    streakDays: metrics.streakDays,
    onlineMinutes: metrics.onlineMinutes,
    easyQuestions: metrics.easyQuestions,
    mediumQuestions: metrics.mediumQuestions,
    hardQuestions: metrics.hardQuestions,
  };

  return Number(metricMap[metric] || 0);
}

function recordMatchesScope(record, scope = {}) {
  const plan = normalizeText(scope?.plan);
  const subject = normalizeText(scope?.subject);
  const topic = normalizeText(scope?.topic);

  const recordPlan = normalizeText(record?.plano || record?.planoLabel || '');
  const recordSubject = normalizeText(record?.disciplinaCanonica || record?.disciplina || '');
  const recordTopic = normalizeText(record?.topico || record?.assunto || '');

  if (plan && !recordPlan.includes(plan)) return false;
  if (subject && !recordSubject.includes(subject)) return false;
  if (topic && !recordTopic.includes(topic)) return false;
  return true;
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function computeStudyStreak(dates = []) {
  const ordered = [...new Set((Array.isArray(dates) ? dates : []).filter(Boolean))].sort();
  if (ordered.length === 0) return 0;

  let longest = 1;
  let current = 1;

  for (let index = 1; index < ordered.length; index += 1) {
    const previous = new Date(`${ordered[index - 1]}T00:00:00`);
    const next = new Date(`${ordered[index]}T00:00:00`);
    const diff = Math.round((next.getTime() - previous.getTime()) / 86400000);

    if (diff === 1) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }

  return longest;
}
