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
