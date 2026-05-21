/**
 * Sincroniza esquadrão (turma privada) com linhas community_posts onde community_scope = 'Esquadrão'.
 * Coluna squad_payload: ver supabase/squad_payload.sql
 */

export function shapeSquadFromCommunityPost(post) {
  if (!post || typeof post !== 'object') return {};
  const payload = post.squad_payload && typeof post.squad_payload === 'object' ? post.squad_payload : {};
  const visibility =
    payload.visibility ||
    (post.is_public ? 'Público' : 'Privado');
  return {
    ...payload,
    id: String(post.id),
    name: String(post.title || payload.name || 'Esquadrão').trim(),
    owner: String(payload.owner || post.author_name || 'Professor responsável').trim(),
    focus: String(post.category_name || payload.focus || 'Turma personalizada').trim(),
    description: String(payload.description || post.content || '').trim(),
    visibility: String(visibility).trim(),
    inviteCode: String(payload.inviteCode || '').trim(),
  };
}

export function splitSquadForCommunityPostUpdate(squad) {
  const raw = JSON.parse(JSON.stringify(squad));
  const title = String(raw.name || '').trim() || 'Esquadrão';
  const author_name = String(raw.owner || '').trim() || 'Professor responsável';
  const category_name = String(raw.focus || '').trim() || 'Turma personalizada';
  const content =
    String(raw.description || '').trim() || 'Ambiente privado para acompanhamento do esquadrão.';
  const is_public = String(raw.visibility || '').toLowerCase().includes('públic');
  delete raw.id;
  delete raw.name;
  delete raw.owner;
  delete raw.focus;
  delete raw.description;
  delete raw.visibility;
  return {
    title,
    author_name,
    category_name,
    content,
    is_public,
    squad_payload: raw,
  };
}

export async function fetchSquadRowByInviteCode(supabaseClient, code) {
  const c = String(code || '').trim();
  if (!c || c.length < 4) return { row: null, error: new Error('Código inválido') };
  const { data, error } = await supabaseClient.rpc('resolve_squad_invite', { p_code: c });
  if (error) return { row: null, error };
  const row = Array.isArray(data) ? data[0] : data;
  return { row: row || null, error: null };
}

/** Forma mínima aceitável para gravar em communityState.squads (sem normalizeSquad do UI). */
export function coerceSquadForState(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const permissions = raw.permissions && typeof raw.permissions === 'object' ? raw.permissions : {};
  return {
    ...raw,
    id: String(raw.id),
    name: String(raw.name || 'Esquadrão').trim(),
    owner: String(raw.owner || 'Professor responsável').trim(),
    focus: String(raw.focus || 'Turma personalizada').trim(),
    description: String(raw.description || '').trim(),
    inviteCode: String(raw.inviteCode || '').trim(),
    visibility: String(raw.visibility || 'Privado').trim(),
    members: Math.max(1, Number(raw.members || 1)),
    rankingTier: String(raw.rankingTier || 'Bronze').trim(),
    nextEvent: String(raw.nextEvent || 'Sem marco definido').trim(),
    coverUrl: String(raw.coverUrl || '').trim(),
    teachers: Array.isArray(raw.teachers) ? raw.teachers : [],
    roster: Array.isArray(raw.roster) ? raw.roster : [],
    subjects: Array.isArray(raw.subjects) ? raw.subjects : [],
    notices: Array.isArray(raw.notices) ? raw.notices : [],
    activities: Array.isArray(raw.activities) ? raw.activities : [],
    simulados: Array.isArray(raw.simulados) ? raw.simulados : [],
    internalRanking: Array.isArray(raw.internalRanking) ? raw.internalRanking : [],
    questionPosts: Array.isArray(raw.questionPosts) ? raw.questionPosts : [],
    permissions,
  };
}
