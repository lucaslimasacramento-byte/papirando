import { supabase } from './supabase';

/** Pontos de redação derivados do resumo oficial (média, melhor nota, quantidade corrigida). */
export function computeRedacaoRankingPoints(summary = {}) {
  const corrected = Math.max(0, Number(summary.corrected || 0));
  const avg = Math.max(0, Number(summary.averageScore || 0));
  const best = Math.max(0, Number(summary.bestScore || 0));
  if (corrected === 0 && avg === 0 && best === 0) return 0;
  return Math.round(avg * 8 * Math.max(1, corrected) + best * 6);
}

export function sumHistoricoAcertos(historicoReal = []) {
  return (Array.isArray(historicoReal) ? historicoReal : []).reduce(
    (acc, row) => acc + Number(row?.acertos || 0),
    0
  );
}

function aggregateQuestionAnswers(rows = []) {
  const map = new Map();
  rows.forEach((row) => {
    const uid = String(row?.user_id || '').trim();
    if (!uid) return;
    const cur = map.get(uid) || { correct: 0, total: 0 };
    cur.total += 1;
    if (row?.is_correct) cur.correct += 1;
    map.set(uid, cur);
  });
  return map;
}

/**
 * Ranking oficial: acertos em question_answers + pontos de redação (apenas perfil logado).
 */
export async function loadOfficialRankingBoard({
  currentUserId = '',
  historicoReal = [],
  redacaoSummary = {},
  communityMetrics = {},
  profile = {},
}) {
  const selfQuestionPts = Number(
    communityMetrics?.correctAnswers != null ? communityMetrics.correctAnswers : sumHistoricoAcertos(historicoReal)
  );
  const selfRedacaoPts = computeRedacaoRankingPoints(redacaoSummary);
  const selfAttempts = Math.max(0, Number(communityMetrics?.questionsSolved || 0));

  let profiles = [];
  let answers = [];

  try {
    const [profilesRes, answersRes] = await Promise.all([
      supabase.from('profiles').select('id, username, full_name, avatar_url, subscription_plan').limit(80),
      supabase.from('question_answers').select('user_id, is_correct'),
    ]);
    if (!profilesRes.error) profiles = profilesRes.data || [];
    if (!answersRes.error) answers = answersRes.data || [];
  } catch {
    profiles = [];
    answers = [];
  }

  const byUser = aggregateQuestionAnswers(answers);
  const merged = new Map();

  (Array.isArray(profiles) ? profiles : []).forEach((p) => {
    const id = String(p.id || '');
    if (!id) return;
    const agg = byUser.get(id) || { correct: 0, total: 0 };
    const isSelf = id === String(currentUserId || '');
    const rPts = isSelf ? selfRedacaoPts : 0;
    merged.set(id, {
      id,
      username: String(p.username || '').trim(),
      fullName: String(p.full_name || '').trim(),
      avatarUrl: String(p.avatar_url || '').trim(),
      plan: String(p.subscription_plan || '').trim(),
      questionPoints: agg.correct,
      questionAttempts: agg.total,
      redacaoPoints: rPts,
      totalScore: agg.correct + rPts,
      isSelf,
    });
  });

  const uid = String(currentUserId || '');
  if (uid && !merged.has(uid)) {
    merged.set(uid, {
      id: uid,
      username: String(profile?.username || '').trim(),
      fullName: String(profile?.full_name || '').trim(),
      avatarUrl: String(profile?.avatar_url || '').trim(),
      plan: String(profile?.subscription_plan || '').trim(),
      questionPoints: selfQuestionPts,
      questionAttempts: Math.max(selfAttempts, selfQuestionPts),
      redacaoPoints: selfRedacaoPts,
      totalScore: selfQuestionPts + selfRedacaoPts,
      isSelf: true,
    });
  } else if (uid && merged.has(uid)) {
    const row = merged.get(uid);
    row.redacaoPoints = selfRedacaoPts;
    row.questionPoints = Math.max(row.questionPoints, selfQuestionPts);
    row.questionAttempts = Math.max(row.questionAttempts, selfAttempts, row.questionAttempts);
    row.totalScore = row.questionPoints + row.redacaoPoints;
    row.isSelf = true;
    if (!row.username) row.username = String(profile?.username || '').trim();
    if (!row.fullName) row.fullName = String(profile?.full_name || '').trim();
    if (!row.avatarUrl) row.avatarUrl = String(profile?.avatar_url || '').trim();
    if (!row.plan) row.plan = String(profile?.subscription_plan || '').trim();
  }

  const list = [...merged.values()].filter(
    (r) => r.questionAttempts > 0 || r.questionPoints > 0 || r.redacaoPoints > 0 || r.isSelf
  );
  list.sort((a, b) => b.totalScore - a.totalScore || b.questionPoints - a.questionPoints);
  return list.map((row, index) => ({ ...row, rank: index + 1 }));
}

export function displayNameFromRow(row) {
  if (row?.username) return `@${row.username}`;
  if (row?.fullName) return row.fullName;
  return 'Candidato';
}

// ───────────────────────────────────────────────────────────────────────────
// Ranking multi-métrica (média de acertos %, nº de simulados, XP) + visão Geral.
// Lê a RPC agregada get_simulados_leaderboard (ver supabase/simulados_ranking.sql).

export const RANKING_VIEWS = [
  { key: 'geral', label: 'Geral', metric: (r) => r.geralScore, format: (r) => `${r.geralScore} pts` },
  { key: 'acertos', label: 'Acertos', metric: (r) => r.mediaAcertos, format: (r) => `${r.mediaAcertos}%` },
  { key: 'simulados', label: 'Simulados', metric: (r) => r.simuladoCount, format: (r) => `${r.simuladoCount}` },
  { key: 'xp', label: 'XP', metric: (r) => r.xp, format: (r) => `${r.xp} XP` },
];

// Pesos da visão Geral (cada métrica normalizada 0–100 pelo máximo da população).
const GERAL_WEIGHTS = { acertos: 0.5, simulados: 0.3, xp: 0.2 };

export async function loadSimuladosLeaderboard({ currentUserId = '', profile = {} } = {}) {
  let raw = [];
  try {
    const { data, error } = await supabase.rpc('get_simulados_leaderboard');
    if (!error && Array.isArray(data)) raw = data;
  } catch {
    raw = [];
  }

  const uid = String(currentUserId || '');
  const rows = raw.map((r) => ({
    id: String(r.user_id || ''),
    username: String(r.username || '').trim(),
    fullName: String(r.full_name || '').trim(),
    avatarUrl: String(r.avatar_url || '').trim(),
    plan: String(r.subscription_plan || '').trim(),
    xp: Math.max(0, Number(r.xp_total || 0)),
    simuladoCount: Math.max(0, Number(r.simulado_count || 0)),
    mediaAcertos: Math.max(0, Math.min(100, Math.round(Number(r.avg_desempenho || 0)))),
    isSelf: uid !== '' && String(r.user_id || '') === uid,
  }));

  // Garante a linha do próprio usuário mesmo que ainda não tenha dados.
  if (uid && !rows.some((r) => r.id === uid)) {
    rows.push({
      id: uid,
      username: String(profile?.username || '').trim(),
      fullName: String(profile?.full_name || '').trim(),
      avatarUrl: String(profile?.avatar_url || '').trim(),
      plan: String(profile?.subscription_plan || '').trim(),
      xp: 0,
      simuladoCount: 0,
      mediaAcertos: 0,
      isSelf: true,
    });
  }

  const maxAcertos = Math.max(1, ...rows.map((r) => r.mediaAcertos));
  const maxCount = Math.max(1, ...rows.map((r) => r.simuladoCount));
  const maxXp = Math.max(1, ...rows.map((r) => r.xp));

  rows.forEach((r) => {
    const nAcertos = (r.mediaAcertos / maxAcertos) * 100;
    const nCount = (r.simuladoCount / maxCount) * 100;
    const nXp = (r.xp / maxXp) * 100;
    r.geralScore = Math.round(
      nAcertos * GERAL_WEIGHTS.acertos + nCount * GERAL_WEIGHTS.simulados + nXp * GERAL_WEIGHTS.xp
    );
  });

  return rows;
}

export function rankLeaderboard(rows = [], viewKey = 'geral') {
  const view = RANKING_VIEWS.find((v) => v.key === viewKey) || RANKING_VIEWS[0];
  return [...(Array.isArray(rows) ? rows : [])]
    .sort((a, b) => Number(view.metric(b)) - Number(view.metric(a)) || b.geralScore - a.geralScore)
    .map((row, index) => ({ ...row, rank: index + 1, displayScore: view.format(row) }));
}
