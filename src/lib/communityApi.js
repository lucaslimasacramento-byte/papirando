import { supabase, supabaseAnonKey, supabaseBaseUrl, supabaseDirectUrl } from './supabase';

const DEFAULT_PUBLIC_CATEGORIES = [
  {
    id: 'categoria-rotina',
    slug: 'rotina',
    name: 'Rotina',
    description: 'Organizacao, constancia, trabalho e estudo na vida real.',
    color: '#dbeafe',
    postCount: 0,
  },
  {
    id: 'categoria-estudos',
    slug: 'estudos',
    name: 'Estudos',
    description: 'Metodos, revisoes, leitura e produtividade.',
    color: '#e0e7ff',
    postCount: 0,
  },
  {
    id: 'categoria-questoes',
    slug: 'questoes',
    name: 'Questoes',
    description: 'Bancas, exercicios e estrategia de resolucao.',
    color: '#dcfce7',
    postCount: 0,
  },
  {
    id: 'categoria-editais',
    slug: 'editais',
    name: 'Editais',
    description: 'Analise de edital, reta final e prioridades.',
    color: '#fef3c7',
    postCount: 0,
  },
  {
    id: 'categoria-desabafo',
    slug: 'desabafo',
    name: 'Desabafo',
    description: 'Espaco seguro para dividir semanas ruins e recomecos.',
    color: '#fee2e2',
    postCount: 0,
  },
  {
    id: 'categoria-dicas',
    slug: 'dicas',
    name: 'Dicas',
    description: 'Taticas simples que funcionam no dia a dia.',
    color: '#fce7f3',
    postCount: 0,
  },
];

const COMMUNITY_SUPABASE_URL = supabaseBaseUrl;
const COMMUNITY_SUPABASE_DIRECT_URL = supabaseDirectUrl;
const COMMUNITY_SUPABASE_ANON_KEY = supabaseAnonKey;

const DEFAULT_PUBLIC_POSTS = [
  {
    id: 'community-seed-1',
    userId: '',
    author: 'Equipe Papirando',
    avatar: '',
    section: 'Forum publico',
    category: 'Rotina',
    categorySlug: 'rotina',
    title: 'Como voces organizam o ciclo de estudos quando trabalham o dia inteiro?',
    content:
      'Quero ver modelos reais. Nada de cronograma perfeito de influencer. Vale rotina curta, flexivel e que sobreviva a semanas pesadas.',
    excerpt:
      'Quero ver modelos reais. Nada de cronograma perfeito de influencer. Vale rotina curta, flexivel e que sobreviva a semanas pesadas.',
    createdAt: new Date(Date.now() - 22 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 22 * 60 * 1000).toISOString(),
    viewsCount: 214,
    upvotesCount: 38,
    commentsCount: 2,
    isPinned: true,
    comments: [
      {
        id: 'community-comment-seed-1',
        postId: 'community-seed-1',
        userId: '',
        author: 'AnaCosta',
        avatar: '',
        content: 'Eu uso blocos de 50 minutos durante a semana e deixo o refinamento para o sabado.',
        createdAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
      },
      {
        id: 'community-comment-seed-2',
        postId: 'community-seed-1',
        userId: '',
        author: 'RafaelM',
        avatar: '',
        content: 'Quando o trabalho aperta eu reduzo metas, mas nunca zero o dia. Isso me salva.',
        createdAt: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
      },
    ],
    savedByCurrentUser: false,
    upvotedByCurrentUser: false,
  },
  {
    id: 'community-seed-2',
    userId: '',
    author: 'BiancaR',
    avatar: '',
    section: 'Forum publico',
    category: 'Questoes',
    categorySlug: 'questoes',
    title: 'Vale focar so em CESPE ou voces misturam banca durante a base?',
    content:
      'Estou em duvida se vale ficar 100% CESPE desde ja ou consolidar teoria e mesclar outras bancas para ganhar repertorio.',
    excerpt:
      'Estou em duvida se vale ficar 100% CESPE desde ja ou consolidar teoria e mesclar outras bancas para ganhar repertorio.',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    viewsCount: 126,
    upvotesCount: 21,
    commentsCount: 1,
    isPinned: false,
    comments: [
      {
        id: 'community-comment-seed-3',
        postId: 'community-seed-2',
        userId: '',
        author: 'TalesM',
        avatar: '',
        content: 'Eu misturo um pouco no comeco e depois afino para a banca principal.',
        createdAt: new Date(Date.now() - 85 * 60 * 1000).toISOString(),
      },
    ],
    savedByCurrentUser: false,
    upvotedByCurrentUser: false,
  },
  {
    id: 'community-seed-3',
    userId: '',
    author: 'MarinaLima',
    avatar: '',
    section: 'Forum publico',
    category: 'Desabafo',
    categorySlug: 'desabafo',
    title: 'Como voces lidam com semana ruim sem comecar a se sabotar?',
    content:
      'Tive uma sequencia pesada, meu rendimento caiu e veio aquela vontade classica de jogar tudo para o mato. Como voces se reorganizam?',
    excerpt:
      'Tive uma sequencia pesada, meu rendimento caiu e veio aquela vontade classica de jogar tudo para o mato. Como voces se reorganizam?',
    createdAt: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 7 * 60 * 60 * 1000).toISOString(),
    viewsCount: 188,
    upvotesCount: 29,
    commentsCount: 0,
    isPinned: false,
    comments: [],
    savedByCurrentUser: false,
    upvotedByCurrentUser: false,
  },
];

const DEFAULT_COMMUNITY_STATE = {
  memberships: [
    { id: 'esquadrao-pf-2026', name: 'Esquadrao PF 2026', role: 'Aluno' },
    { id: 'elite-tribunais', name: 'Elite Tribunais', role: 'Aluno' },
  ],
  referralCode: '',
  squads: [
    {
      id: 'esquadrao-pf-2026',
      name: 'Esquadrao PF 2026',
      owner: 'Professor Darlan',
      roleLabel: 'Professor',
      type: 'Cursinho parceiro',
      focus: 'Policia Federal',
      members: 214,
      rankingTier: 'Ouro',
      coverUrl: '',
      nextEvent: 'Plantao hoje as 19h',
    },
    {
      id: 'elite-tribunais',
      name: 'Elite Tribunais',
      owner: 'Professora Camila',
      roleLabel: 'Professora',
      type: 'Turma fechada',
      focus: 'Tribunais',
      members: 167,
      rankingTier: 'Prata',
      coverUrl: '',
      nextEvent: 'Simulado no sabado',
    },
    {
      id: 'missao-pm',
      name: 'Missao PM',
      owner: 'Professor Victor',
      roleLabel: 'Professor',
      type: 'Esquadrao intensivo',
      focus: 'Policias militares',
      members: 389,
      rankingTier: 'Diamante',
      coverUrl: '',
      nextEvent: 'TAF coletivo amanha',
    },
  ],
  categories: DEFAULT_PUBLIC_CATEGORIES,
  forumPosts: DEFAULT_PUBLIC_POSTS,
  rankings: {
    geral: [
      { id: 'geral-1', rank: 1, name: 'Ana Beatriz', metric: '18.200 XP', contest: 'PMAL 2026 - CFO', tier: 'Ouro' },
      { id: 'geral-2', rank: 2, name: 'Carlos Henrique', metric: '17.430 XP', contest: 'PF Administrativa', tier: 'Prata' },
      { id: 'geral-3', rank: 3, name: 'Julia Mendes', metric: '15.980 XP', contest: 'TJBA Analista', tier: 'Bronze' },
    ],
    questoes: [
      { id: 'quest-1', rank: 1, name: 'Bruno L.', metric: '8.240 acertos', contest: 'PF Administrativa', tier: 'Ouro' },
      { id: 'quest-2', rank: 2, name: 'Maria Clara', metric: '7.980 acertos', contest: 'PMAL 2026 - CFO', tier: 'Prata' },
      { id: 'quest-3', rank: 3, name: 'Joao Neto', metric: '7.420 acertos', contest: 'TJBA Analista', tier: 'Bronze' },
    ],
    tempo: [
      { id: 'tempo-1', rank: 1, name: 'Rafaela M.', metric: '412h estudadas', contest: 'TRT 5', tier: 'Ouro' },
      { id: 'tempo-2', rank: 2, name: 'Victor Hugo', metric: '398h estudadas', contest: 'PMRN Saude', tier: 'Prata' },
      { id: 'tempo-3', rank: 3, name: 'Leila Costa', metric: '374h estudadas', contest: 'PF Administrativa', tier: 'Bronze' },
    ],
    simulados: [
      { id: 'sim-1', rank: 1, name: 'Camila B.', metric: '42 simulados', contest: 'PMAL 2026 - CFO', tier: 'Ouro' },
      { id: 'sim-2', rank: 2, name: 'Pedro M.', metric: '38 simulados', contest: 'Esquadrao PF 2026', tier: 'Prata' },
      { id: 'sim-3', rank: 3, name: 'Daniele S.', metric: '31 simulados', contest: 'TJBA Analista', tier: 'Bronze' },
    ],
  },
  savedPostIds: [],
  upvotedPostIds: [],
};

export function slugifyCategory(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function toIsoString(value, fallback = new Date().toISOString()) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
}

function formatMetricCount(value) {
  return Number(value || 0).toLocaleString('pt-BR');
}

function getErrorCode(error) {
  return String(error?.code || error?.status || '');
}

function isMissingCommunitySchema(error) {
  return ['42P01', '42703'].includes(getErrorCode(error));
}

function isAuthOrPolicyError(error) {
  const code = getErrorCode(error);
  const message = String(error?.message || '').toLowerCase();
  const details = String(error?.details || '').toLowerCase();
  const hint = String(error?.hint || '').toLowerCase();

  return (
    code === '401' ||
    code === '403' ||
    code === '42501' ||
    message.includes('jwt') ||
    message.includes('permission denied') ||
    message.includes('row-level security') ||
    message.includes('violates row-level security policy') ||
    details.includes('row-level security') ||
    hint.includes('policy')
  );
}

function describeCommunityError(error) {
  const rawMessage = String(error?.message || 'Falha desconhecida na comunidade.')
  const rawDetails = String(error?.details || '')
  const rawHint = String(error?.hint || '')
  const code = getErrorCode(error)

  const full = `${rawMessage} ${rawDetails} ${rawHint}`.toLowerCase()

  if (code === 'SESSION_TOKEN_MISSING') {
    return {
      code,
      message: rawMessage,
    }
  }

  if (full.includes('failed to fetch')) {
    return {
      code,
      message: 'A requisicao REST da comunidade falhou antes de chegar ao banco. Recarregue o app, confirme a sessao autenticada e teste novamente.',
    }
  }

  if (isMissingCommunitySchema(error)) {
    return {
      code,
      message: 'As tabelas da comunidade nao foram encontradas no banco. Verifique se o community.sql foi aplicado no projeto Supabase correto.',
    }
  }

  if (isAuthOrPolicyError(error)) {
    return {
      code,
      message: 'O Supabase respondeu, mas bloqueou o acesso REST. Verifique grants, RLS policies e permissoes para anon/authenticated nas tabelas da comunidade.',
    }
  }

  return {
    code,
    message: rawMessage,
  }
}

async function safeReadResponseBody(response) {
  try {
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return await response.json();
    }
    return await response.text();
  } catch {
    return null;
  }
}

function buildRestHeaders(key) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
}

function createCommunityError(message, code = 'COMMUNITY_ERROR', details = '') {
  return {
    code,
    message,
    details,
    hint: '',
  };
}

function resolveCommunityAccessToken(accessToken = '') {
  return String(accessToken || '').trim();
}

function isOversizedCommunityAccessToken(accessToken = '') {
  return resolveCommunityAccessToken(accessToken).length > 3500;
}

function decodeCommunityJwtPayload(accessToken = '') {
  const token = resolveCommunityAccessToken(accessToken);
  if (!token) return null;

  const parts = token.split('.');
  if (parts.length < 2) return null;

  try {
    const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    if (typeof atob !== 'function') return null;
    const raw = atob(padded);

    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function resolveCommunityActorId(currentUserId = '', accessToken = '') {
  const normalizedCurrentUserId = String(currentUserId || '').trim();
  const jwtPayload = decodeCommunityJwtPayload(accessToken);
  const tokenUserId = String(jwtPayload?.sub || '').trim();

  if (tokenUserId) return tokenUserId;
  return normalizedCurrentUserId;
}

function requireCommunityAccessToken(accessToken = '') {
  const token = resolveCommunityAccessToken(accessToken);
  if (!token) {
    return {
      token: '',
      error: createCommunityError(
        'A sessao autenticada nao entregou access token para a Comunidades. Recarregue o app e faca login novamente.',
        'SESSION_TOKEN_MISSING'
      ),
    };
  }

  if (isOversizedCommunityAccessToken(token)) {
    return {
      token: '',
      error: createCommunityError(
        'O access token da sessao ficou grande demais para trafegar nas requests. Isso costuma acontecer quando metadados grandes, como avatar em base64, entram no auth user. Remova esse dado do auth metadata e faca login novamente.',
        'SESSION_TOKEN_TOO_LARGE'
      ),
    };
  }

  return { token, error: null };
}

async function communityRestRequest({
  path,
  method = 'GET',
  body,
  token = '',
  prefer = '',
}) {
  const url = `${COMMUNITY_SUPABASE_URL}/rest/v1/${String(path || '').replace(/^\/+/, '')}`;
  const headers = {
    ...buildRestHeaders(COMMUNITY_SUPABASE_ANON_KEY),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (prefer) {
    headers.Prefer = prefer;
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const payload = await safeReadResponseBody(response);

  if (!response.ok) {
    return {
      data: null,
      error: {
        status: response.status,
        code: String(response.status),
        message:
          typeof payload === 'string'
            ? payload || `REST ${response.status}`
            : payload?.message || payload?.error_description || payload?.msg || `REST ${response.status}`,
        details: typeof payload === 'object' ? JSON.stringify(payload) : String(payload || ''),
      },
    };
  }

  return {
    data: payload,
    error: null,
  };
}

export function formatCommunityRelativeTime(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'agora';

  const diffMs = date.getTime() - Date.now();
  const rtf = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });
  const minutes = Math.round(diffMs / 60000);
  const hours = Math.round(diffMs / 3600000);
  const days = Math.round(diffMs / 86400000);

  if (Math.abs(minutes) < 60) return rtf.format(minutes, 'minute');
  if (Math.abs(hours) < 24) return rtf.format(hours, 'hour');
  return rtf.format(days, 'day');
}

export function getCommunityUserDisplayName(profile = {}, currentUserEmail = '') {
  if (
    String(profile?.ranking_display_mode || 'username') === 'codename' &&
    String(profile?.ranking_codename || '').trim()
  ) {
    return String(profile.ranking_codename).trim();
  }

  return String(profile?.username || profile?.nome || currentUserEmail || 'Aluno').trim() || 'Aluno';
}

export function getCommunityUserAvatar(profile = {}) {
  return (
    String(profile?.avatar_url || profile?.avatarUrl || profile?.photo_url || profile?.foto_url || '').trim() || ''
  );
}

async function fetchProfileAvatarsByUserIds(userIds = []) {
  const ids = [...new Set(userIds.map((id) => String(id || '').trim()).filter(Boolean))];
  if (!ids.length) return new Map();
  const { data, error } = await supabase.from('profiles').select('id, avatar_url').in('id', ids);
  if (error || !Array.isArray(data)) return new Map();
  const map = new Map();
  data.forEach((row) => {
    const url = String(row?.avatar_url || '').trim();
    if (row?.id) map.set(String(row.id), url);
  });
  return map;
}

function normalizeCommunityComment(comment = {}) {
  return {
    id: String(comment.id || `comment-${Date.now()}`),
    postId: String(comment.postId || comment.post_id || ''),
    userId: String(comment.userId || comment.user_id || ''),
    author: String(comment.author || comment.author_name || comment.user || 'Usuario'),
    avatar: String(comment.avatar || comment.author_avatar_url || ''),
    content: String(comment.content || comment.message || '').trim(),
    createdAt: toIsoString(comment.createdAt || comment.created_at),
  };
}

function normalizeCommunityPost(post = {}, savedPostIds = [], upvotedPostIds = []) {
  const category = String(post.category || post.category_name || 'Discussao').trim() || 'Discussao';
  const categorySlug = String(post.categorySlug || post.category_slug || slugifyCategory(category) || 'geral');
  const comments = Array.isArray(post.comments) ? post.comments.map(normalizeCommunityComment) : [];

  return {
    id: String(post.id || `post-${Date.now()}`),
    userId: String(post.userId || post.user_id || ''),
    author: String(post.author || post.author_name || post.user || 'Usuario'),
    avatar: String(post.avatar || post.author_avatar_url || ''),
    section: String(post.section || post.community_scope || 'Forum publico'),
    category,
    categorySlug,
    title: String(post.title || 'Novo topico').trim() || 'Novo topico',
    content: String(post.content || post.message || post.excerpt || '').trim(),
    excerpt: String(post.excerpt || post.content || post.message || '').trim(),
    createdAt: toIsoString(post.createdAt || post.created_at),
    updatedAt: toIsoString(post.updatedAt || post.updated_at || post.createdAt || post.created_at),
    viewsCount: Math.max(0, Number(post.viewsCount ?? post.views_count ?? post.views ?? 0)),
    upvotesCount: Math.max(0, Number(post.upvotesCount ?? post.upvotes_count ?? post.upvotes ?? post.helpful ?? 0)),
    commentsCount: Math.max(0, Number(post.commentsCount ?? post.comments_count ?? post.comments ?? comments.length ?? 0)),
    isPinned: Boolean(post.isPinned ?? post.is_pinned ?? post.pinned),
    comments,
    savedByCurrentUser: Boolean(post.savedByCurrentUser ?? savedPostIds.includes(String(post.id || ''))),
    upvotedByCurrentUser: Boolean(post.upvotedByCurrentUser ?? upvotedPostIds.includes(String(post.id || ''))),
    isPublic:
      post.is_public !== undefined
        ? Boolean(post.is_public)
        : post.isPublic !== undefined
          ? Boolean(post.isPublic)
          : true,
  };
}

export function normalizeCommunityState(input = {}) {
  const base = {
    ...DEFAULT_COMMUNITY_STATE,
    ...input,
  };

  const savedPostIds = Array.isArray(base.savedPostIds) ? base.savedPostIds.map((item) => String(item)) : [];
  const upvotedPostIds = Array.isArray(base.upvotedPostIds) ? base.upvotedPostIds.map((item) => String(item)) : [];

  const forumPosts = (Array.isArray(base.forumPosts) ? base.forumPosts : DEFAULT_COMMUNITY_STATE.forumPosts).map((post) =>
    normalizeCommunityPost(post, savedPostIds, upvotedPostIds)
  );

  const categoriesSource = Array.isArray(base.categories) && base.categories.length > 0 ? base.categories : DEFAULT_PUBLIC_CATEGORIES;
  const categories = categoriesSource.map((category) => {
    const slug = String(category.slug || slugifyCategory(category.name) || 'geral');
    const postCount = forumPosts.filter((post) => post.categorySlug === slug).length;
    return {
      id: String(category.id || `category-${slug}`),
      slug,
      name: String(category.name || category.label || slug).trim(),
      description: String(category.description || '').trim(),
      color: String(category.color || '#e2e8f0'),
      postCount,
    };
  });

  return {
    memberships: Array.isArray(base.memberships) ? base.memberships : DEFAULT_COMMUNITY_STATE.memberships,
    referralCode: String(base.referralCode || ''),
    squads: Array.isArray(base.squads) ? base.squads : DEFAULT_COMMUNITY_STATE.squads,
    categories,
    forumPosts,
    rankings: base.rankings && typeof base.rankings === 'object' ? base.rankings : DEFAULT_COMMUNITY_STATE.rankings,
    savedPostIds,
    upvotedPostIds,
  };
}

export function getDefaultCommunityState(overrides = {}) {
  return normalizeCommunityState({
    ...DEFAULT_COMMUNITY_STATE,
    ...overrides,
  });
}

export function buildCommunityProfileMetrics(profileMetrics = {}, historicoReal = []) {
  const studyMinutes = Number(profileMetrics?.minutesStudied || profileMetrics?.minutes || 0);
  const studyHours = studyMinutes / 60;
  const questionsSolved = (Array.isArray(historicoReal) ? historicoReal : []).reduce(
    (total, item) => total + Number(item?.questoes || item?.questions || 0),
    0
  );
  const correctAnswers = (Array.isArray(historicoReal) ? historicoReal : []).reduce(
    (total, item) => total + Number(item?.acertos || item?.correctAnswers || 0),
    0
  );
  const sessions = Array.isArray(historicoReal) ? historicoReal.length : 0;
  const accuracy = questionsSolved > 0 ? Math.round((correctAnswers / questionsSolved) * 100) : 0;

  return {
    xpTotal: Math.max(0, Number(profileMetrics?.xpTotal || 0)),
    studyHours,
    questionsSolved,
    correctAnswers,
    sessions,
    accuracy,
    formattedStudyHours: `${studyHours.toLocaleString('pt-BR', { minimumFractionDigits: studyHours >= 10 ? 0 : 1, maximumFractionDigits: 1 })}h`,
    formattedQuestionsSolved: formatMetricCount(questionsSolved),
    formattedCorrectAnswers: formatMetricCount(correctAnswers),
    formattedAccuracy: `${accuracy}%`,
  };
}

export function buildCommunityRankings({
  communityState = {},
  profile = {},
  currentUserEmail = '',
  currentContestLabel = 'Plataforma geral',
  communityMetrics = {},
}) {
  const resolveTier = (rank) => {
    if (rank === 1) return 'Ouro';
    if (rank === 2) return 'Prata';
    if (rank === 3) return 'Bronze';
    return 'Liga';
  };

  const parseMetricValue = (value) => {
    const digits = String(value || '')
      .replace(/[^\d,.-]/g, '')
      .replace(/\.(?=\d{3}(\D|$))/g, '')
      .replace(',', '.');
    const parsed = Number(digits);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const currentRankingName = getCommunityUserDisplayName(profile, currentUserEmail);

  const normalizeRankingList = (items, metricLabel, currentValue) => {
    const baseItems = Array.isArray(items) ? items : [];
    const withoutCurrentUser = baseItems.filter((item) => String(item.id || '') !== 'current-user');
    const nextItems =
      currentValue > 0
        ? [
            ...withoutCurrentUser,
            {
              id: 'current-user',
              name: currentRankingName,
              metric: `${Math.round(currentValue).toLocaleString('pt-BR')} ${metricLabel}`,
              contest: currentContestLabel,
              tier: 'Liga',
            },
          ]
        : withoutCurrentUser;

    return nextItems
      .sort((first, second) => parseMetricValue(second.metric) - parseMetricValue(first.metric))
      .map((item, index) => ({
        ...item,
        rank: index + 1,
        tier: item.id === 'current-user' ? resolveTier(index + 1) : item.tier || resolveTier(index + 1),
      }));
  };

  return {
    geral: normalizeRankingList(communityState?.rankings?.geral, 'XP', communityMetrics?.xpTotal || 0),
    questoes: normalizeRankingList(communityState?.rankings?.questoes, 'acertos', communityMetrics?.correctAnswers || 0),
    tempo: normalizeRankingList(communityState?.rankings?.tempo, 'h estudadas', communityMetrics?.studyHours || 0),
    simulados: normalizeRankingList(communityState?.rankings?.simulados, 'sessoes', communityMetrics?.sessions || 0),
  };
}

export async function probeCommunitySchema() {
  const attempt = async () => {
    const [categoriesResult, postsResult, commentsResult] = await Promise.all([
      communityRestRequest({ path: 'community_categories?select=id&limit=1' }),
      communityRestRequest({ path: 'community_posts?select=id&limit=1' }),
      communityRestRequest({ path: 'community_comments?select=id&limit=1' }),
    ]);
    return [categoriesResult, postsResult, commentsResult];
  };

  try {
    let results = await attempt();
    let errors = [results[0].error, results[1].error, results[2].error].filter(Boolean);

    // retry uma vez após 1.5s se falhar com Failed to fetch
    if (errors.length > 0 && String(errors[0]?.message || '').toLowerCase().includes('failed to fetch')) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      results = await attempt();
      errors = [results[0].error, results[1].error, results[2].error].filter(Boolean);
    }

    if (errors.length === 0) return { ready: true, reason: 'ok', error: null };

    const firstError = errors[0];
    if (errors.some(isMissingCommunitySchema)) {
      return { ready: false, reason: 'missing_schema', error: describeCommunityError(firstError) };
    }
    if (isAuthOrPolicyError(firstError)) {
      return { ready: false, reason: 'blocked_by_policy', error: describeCommunityError(firstError) };
    }
    return { ready: false, reason: 'query_error', error: describeCommunityError(firstError) };
  } catch (error) {
    return { ready: false, reason: 'probe_failed', error: describeCommunityError(error) };
  }
}

export async function probeCommunityConnectivity({
  supabaseUrl = '',
  supabaseAnonKey = '',
  directSupabaseUrl = '',
  proxyEnabled = false,
}) {
  const url = String(supabaseUrl || COMMUNITY_SUPABASE_URL || '').trim().replace(/\/+$/, '');
  const key = String(supabaseAnonKey || '').trim();
  const directUrl = String(directSupabaseUrl || COMMUNITY_SUPABASE_DIRECT_URL || '').trim().replace(/\/+$/, '');

  if (!url || !key) {
    return {
      ok: false,
      stage: 'env',
      message: 'VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY nao foram carregadas no app.',
      details: {
        hasUrl: Boolean(url),
        hasKey: Boolean(key),
      },
    };
  }

  const authUrl = `${url}/auth/v1/settings`;
  const restUrl = `${url}/rest/v1/community_categories?select=id&limit=1`;

  try {
    const authResponse = await fetch(authUrl, {
      method: 'GET',
      headers: {
        apikey: key,
      },
    });

    const restResponse = await fetch(restUrl, {
      method: 'GET',
      headers: buildRestHeaders(key),
    });

    const authBody = await safeReadResponseBody(authResponse);
    const restBody = await safeReadResponseBody(restResponse);

    const authOk = authResponse.ok;
    const restOk = restResponse.ok;

    let message = proxyEnabled
      ? 'Conectividade basica com Auth e REST validada via proxy local do Vite.'
      : 'Conectividade basica com Auth e REST do Supabase validada.';

    if (!authOk && !restOk) {
      message = `Auth ${authResponse.status} / REST ${restResponse.status}. O projeto nao respondeu corretamente em nenhum endpoint principal.`;
    } else if (authOk && !restOk) {
      if (restResponse.status === 401 || restResponse.status === 403) {
        message = `Auth ${authResponse.status} / REST ${restResponse.status}. URL e chave parecem validas, mas o REST bloqueou o acesso. Verifique grants, RLS, policies e se a tabela community_categories existe no projeto certo.`;
      } else {
        message = `Auth ${authResponse.status} / REST ${restResponse.status}. O REST respondeu fora do esperado. Verifique schema, grants e nome das tabelas.`;
      }
    } else if (!authOk && restOk) {
      message = `Auth ${authResponse.status} / REST ${restResponse.status}. O REST respondeu, mas o endpoint de Auth falhou. Verifique configuracao do projeto Supabase.`;
    }

    return {
      ok: authOk && restOk,
      stage: 'network',
      message,
      details: {
        authStatus: authResponse.status,
        restStatus: restResponse.status,
        urlHost: url.replace(/^https?:\/\//, ''),
        directUrlHost: directUrl.replace(/^https?:\/\//, ''),
        proxyEnabled,
        authUrl,
        restUrl,
        authBody,
        restBody,
      },
    };
  } catch (error) {
    return {
      ok: false,
      stage: 'network',
      message:
        'Falha de rede ao acessar o Supabase. Se voce alterou o .env, reinicie o dev server. Se ja reiniciou, verifique rede, CORS, URL do projeto ou disponibilidade do Supabase.',
      details: {
        urlHost: url.replace(/^https?:\/\//, ''),
        directUrlHost: directUrl.replace(/^https?:\/\//, ''),
        proxyEnabled,
        authUrl,
        restUrl,
        rawMessage: String(error?.message || 'Failed to fetch'),
      },
    };
  }
}

function buildAuthorSnapshot(profile = {}, currentUserEmail = '') {
  const author = getCommunityUserDisplayName(profile, currentUserEmail);
  return {
    author,
    avatar: getCommunityUserAvatar(profile),
  };
}

export async function loadCommunityFromSupabase({
  currentUserId = '',
  fallbackState = {},
  accessToken = '',
}) {
  const normalizedFallback = normalizeCommunityState(fallbackState);
  const token = resolveCommunityAccessToken(accessToken);
  const safeReactionToken = isOversizedCommunityAccessToken(token) ? '' : token;
  const actorId = resolveCommunityActorId(currentUserId, token);
  const schemaProbe = await probeCommunitySchema();

  if (!schemaProbe.ready) {
    return {
      state: normalizedFallback,
      mode: 'local',
      schemaReady: false,
      reason: schemaProbe.reason,
      error: schemaProbe.error,
    };
  }

  try {
    const [categoriesResult, postsResult, commentsResult, reactionsResult] = await Promise.all([
      communityRestRequest({
        path: 'community_categories?select=*&is_active=eq.true&order=position.asc',
      }),
      communityRestRequest({
        path: 'community_posts?select=*&is_public=eq.true&order=is_pinned.desc,created_at.desc',
      }),
      communityRestRequest({
        path: 'community_comments?select=*&order=created_at.asc',
      }),
      actorId && safeReactionToken
        ? communityRestRequest({
            path: `community_post_reactions?select=post_id,reaction_type&user_id=eq.${encodeURIComponent(actorId)}`,
            token: safeReactionToken,
          })
        : Promise.resolve({ data: [], error: null }),
    ]);

    const errors = [categoriesResult.error, postsResult.error, commentsResult.error, reactionsResult.error].filter(Boolean);

    if (errors.length > 0) {
      return {
        state: normalizedFallback,
        mode: 'local',
        schemaReady: true,
        reason: isAuthOrPolicyError(errors[0]) ? 'blocked_by_policy' : 'query_error',
        error: describeCommunityError(errors[0]),
      };
    }

    const commentsByPostId = new Map();
    (commentsResult.data || []).map(normalizeCommunityComment).forEach((comment) => {
      const existing = commentsByPostId.get(comment.postId) || [];
      commentsByPostId.set(comment.postId, [...existing, comment]);
    });

    const savedPostIds = [];
    const upvotedPostIds = [];
    (reactionsResult.data || []).forEach((reaction) => {
      if (reaction.reaction_type === 'save') savedPostIds.push(String(reaction.post_id || ''));
      if (reaction.reaction_type === 'upvote') upvotedPostIds.push(String(reaction.post_id || ''));
    });

    const nextState = normalizeCommunityState({
      ...normalizedFallback,
      categories: (categoriesResult.data || []).map((category) => ({
        id: category.id,
        slug: category.slug,
        name: category.name,
        description: category.description,
        color: category.color,
      })),
      forumPosts: (postsResult.data || []).map((post) => ({
        ...post,
        comments: commentsByPostId.get(String(post.id || '')) || [],
      })),
      savedPostIds,
      upvotedPostIds,
    });

    return { state: nextState, mode: 'supabase', schemaReady: true, reason: 'ok', error: null };
  } catch (error) {
    console.error('Erro ao carregar comunidade:', error);
    return {
      state: normalizedFallback,
      mode: 'local',
      schemaReady: true,
      reason: isAuthOrPolicyError(error) ? 'blocked_by_policy' : 'load_failed',
      error: describeCommunityError(error),
    };
  }
}

export async function createCommunityPost({
  currentUserId,
  profile,
  currentUserEmail = '',
  draft = {},
  accessToken = '',
}) {
  const { token, error: tokenError } = requireCommunityAccessToken(accessToken);
  if (tokenError) return { data: null, error: tokenError };

  const { author, avatar } = buildAuthorSnapshot(profile, currentUserEmail);
  const actorId = resolveCommunityActorId(currentUserId, token);
  const payload = {
    user_id: actorId || null,
    author_name: author,
    author_avatar_url: avatar,
    title: String(draft.title || '').trim(),
    content: String(draft.content || '').trim(),
    excerpt: String(draft.content || '').trim(),
    category_slug: String(draft.categorySlug || slugifyCategory(draft.category) || 'estudos'),
    category_name: String(draft.category || 'Estudos').trim(),
    community_scope: 'Forum publico',
    is_public: true,
  };

  return communityRestRequest({
    path: 'community_posts',
    method: 'POST',
    body: payload,
    token,
    prefer: 'return=representation',
  });
}

export async function createCommunityComment({
  currentUserId,
  profile,
  currentUserEmail = '',
  postId,
  content,
  accessToken = '',
}) {
  const { token, error: tokenError } = requireCommunityAccessToken(accessToken);
  if (tokenError) return { data: null, error: tokenError };

  const { author, avatar } = buildAuthorSnapshot(profile, currentUserEmail);
  const actorId = resolveCommunityActorId(currentUserId, token);
  return communityRestRequest({
    path: 'community_comments',
    method: 'POST',
    token,
    prefer: 'return=representation',
    body: {
      post_id: postId,
      user_id: actorId || null,
      author_name: author,
      author_avatar_url: avatar,
      content: String(content || '').trim(),
    },
  });
}

export async function setCommunityReaction({
  currentUserId,
  postId,
  reactionType,
  enabled,
  accessToken = '',
}) {
  const actorId = resolveCommunityActorId(currentUserId, accessToken);
  if (!actorId) {
    throw new Error('Usuario nao autenticado para reagir.');
  }

  const { token, error: tokenError } = requireCommunityAccessToken(accessToken);
  if (tokenError) return { data: null, error: tokenError };

  if (enabled) {
    return communityRestRequest({
      path: 'community_post_reactions',
      method: 'POST',
      token,
      prefer: 'resolution=merge-duplicates,return=representation',
      body: {
        post_id: postId,
        user_id: actorId,
        reaction_type: reactionType,
      },
    });
  }

  return communityRestRequest({
    path: `community_post_reactions?post_id=eq.${encodeURIComponent(postId)}&user_id=eq.${encodeURIComponent(actorId)}&reaction_type=eq.${encodeURIComponent(reactionType)}`,
    method: 'DELETE',
    token,
  });
}

export async function incrementCommunityPostView({ post, accessToken = '' }) {
  const { token, error: tokenError } = requireCommunityAccessToken(accessToken);
  if (tokenError) return { data: null, error: tokenError };

  return communityRestRequest({
    path: `community_posts?id=eq.${encodeURIComponent(post.id)}`,
    method: 'PATCH',
    token,
    body: {
      views_count: Math.max(0, Number(post?.viewsCount || post?.views_count || 0)) + 1,
      updated_at: new Date().toISOString(),
    },
  });
}

export async function runCommunitySmokeTest({
  currentUserId,
  profile,
  currentUserEmail = '',
  accessToken = '',
}) {
  const now = new Date();
  const smokeId = now.toISOString();
  const { author, avatar } = buildAuthorSnapshot(profile, currentUserEmail);
  const debugSteps = [];

  const captureError = (stage, error) => ({
    ok: false,
    stage,
    message: `${stage}: ${describeCommunityError(error).message}`,
    details: {
      stage,
      rawMessage: String(error?.message || 'Failed to fetch'),
      code: String(error?.code || error?.status || ''),
      details: String(error?.details || ''),
      hint: String(error?.hint || ''),
      currentUserId: currentUserId || '',
      steps: debugSteps,
    },
    testedAt: now.toISOString(),
  });

  try {
    const { token, error: tokenError } = requireCommunityAccessToken(accessToken);
    if (tokenError) return captureError('access_token', tokenError);
    const effectiveUserId = resolveCommunityActorId(currentUserId, token);
    debugSteps.push(`token ok (${effectiveUserId || 'sem usuario'})`);


    const { data: categories, error: categoriesError } = await communityRestRequest({
      path: 'community_categories?select=slug,name&is_active=eq.true&order=position.asc&limit=1',
    });

    if (categoriesError) return captureError('load_categories', categoriesError);
    debugSteps.push(`categorias ok (${categories?.length || 0})`);

    if (!effectiveUserId) {
      return {
        ok: false,
        stage: 'auth_required',
        message: 'Smoke test de escrita bloqueado: usuario nao autenticado.',
        details: {
          currentUserId: '',
          steps: debugSteps,
        },
        testedAt: now.toISOString(),
      };
    }

    const category = categories?.[0] || { slug: 'estudos', name: 'Estudos' };

    const { data: postRows, error: postError } = await communityRestRequest({
      path: 'community_posts',
      method: 'POST',
      token,
      prefer: 'return=representation',
      body: {
        user_id: effectiveUserId,
        author_name: author,
        author_avatar_url: avatar,
        title: `[SMOKE] Comunidades ${smokeId}`,
        content: 'Post tecnico oculto para validacao automatica da integracao de comunidades.',
        excerpt: 'Smoke test da integracao de comunidades.',
        category_slug: category.slug,
        category_name: category.name,
        community_scope: 'Forum publico',
        is_public: false,
      },
    });

    if (postError) return captureError('insert_post', postError);
    const post = Array.isArray(postRows) ? postRows[0] : postRows;
    debugSteps.push(`post ok (${post.id})`);

    const { error: commentError } = await communityRestRequest({
      path: 'community_comments',
      method: 'POST',
      token,
      prefer: 'return=representation',
      body: {
        post_id: post.id,
        user_id: effectiveUserId,
        author_name: author,
        author_avatar_url: avatar,
        content: `Comentario tecnico do smoke test em ${smokeId}.`,
      },
    });

    if (commentError) return captureError('insert_comment', commentError);
    debugSteps.push('comentario ok');

    const { error: upvoteError } = await communityRestRequest({
      path: 'community_post_reactions',
      method: 'POST',
      token,
      prefer: 'resolution=merge-duplicates,return=representation',
      body: {
        post_id: post.id,
        user_id: effectiveUserId,
        reaction_type: 'upvote',
      },
    });

    if (upvoteError) return captureError('insert_upvote', upvoteError);
    debugSteps.push('upvote ok');

    const { error: saveError } = await communityRestRequest({
      path: 'community_post_reactions',
      method: 'POST',
      token,
      prefer: 'resolution=merge-duplicates,return=representation',
      body: {
        post_id: post.id,
        user_id: effectiveUserId,
        reaction_type: 'save',
      },
    });

    if (saveError) return captureError('insert_save', saveError);
    debugSteps.push('save ok');

    const { error: viewError } = await communityRestRequest({
      path: `community_posts?id=eq.${encodeURIComponent(post.id)}`,
      method: 'PATCH',
      token,
      body: {
        views_count: Math.max(1, Number(post?.views_count || 0) + 1),
        updated_at: new Date().toISOString(),
      },
    });

    if (viewError) return captureError('update_views', viewError);
    debugSteps.push('views ok');

    const { data: validatedRows, error: validationError } = await communityRestRequest({
      path: `community_posts?select=id,comments_count,upvotes_count,views_count&id=eq.${encodeURIComponent(post.id)}&limit=1`,
      token,
    });

    if (validationError) return captureError('validate_post', validationError);
    const validatedPost = Array.isArray(validatedRows) ? validatedRows[0] : validatedRows;
    debugSteps.push('validacao ok');

    const ok =
      Number(validatedPost?.comments_count || 0) >= 1 &&
      Number(validatedPost?.upvotes_count || 0) >= 1 &&
      Number(validatedPost?.views_count || 0) >= 1;

    return {
      ok,
      stage: ok ? 'completed' : 'validation_warning',
      message: ok
        ? 'Leitura e escrita da comunidade validadas com post tecnico oculto.'
        : 'O smoke test escreveu dados, mas as contagens retornadas nao vieram como esperado.',
      details: {
        postId: validatedPost?.id || post.id,
        commentsCount: Number(validatedPost?.comments_count || 0),
        upvotesCount: Number(validatedPost?.upvotes_count || 0),
        viewsCount: Number(validatedPost?.views_count || 0),
        currentUserId: effectiveUserId,
        steps: debugSteps,
      },
      testedAt: now.toISOString(),
    };
  } catch (error) {
    console.error('Erro bruto no smoke test da comunidade:', error);
    console.error('message:', error?.message);
    console.error('details:', error?.details);
    console.error('hint:', error?.hint);
    console.error('code:', error?.code);

    return captureError('unexpected', error);
  }
}

export function createLocalCommunityPost(state, { profile = {}, currentUserEmail = '', currentUserId = '', draft = {} }) {
  const { author, avatar } = buildAuthorSnapshot(profile, currentUserEmail);
  const now = new Date().toISOString();
  const nextPost = normalizeCommunityPost(
    {
      id: `local-post-${Date.now()}`,
      userId: currentUserId,
      author,
      avatar,
      section: 'Forum publico',
      category: String(draft.category || 'Estudos').trim() || 'Estudos',
      categorySlug: String(draft.categorySlug || slugifyCategory(draft.category) || 'estudos'),
      title: String(draft.title || '').trim(),
      content: String(draft.content || '').trim(),
      excerpt: String(draft.content || '').trim(),
      createdAt: now,
      updatedAt: now,
      viewsCount: 0,
      upvotesCount: 0,
      commentsCount: 0,
      comments: [],
      isPinned: false,
    },
    state?.savedPostIds,
    state?.upvotedPostIds
  );

  return normalizeCommunityState({
    ...state,
    forumPosts: [nextPost, ...(Array.isArray(state?.forumPosts) ? state.forumPosts : [])],
  });
}

export function createLocalCommunityComment(state, { profile = {}, currentUserEmail = '', currentUserId = '', postId, content }) {
  const { author, avatar } = buildAuthorSnapshot(profile, currentUserEmail);
  const nextComment = normalizeCommunityComment({
    id: `local-comment-${Date.now()}`,
    postId,
    userId: currentUserId,
    author,
    avatar,
    content,
    createdAt: new Date().toISOString(),
  });

  return normalizeCommunityState({
    ...state,
    forumPosts: (Array.isArray(state?.forumPosts) ? state.forumPosts : []).map((post) =>
      post.id === postId
        ? {
            ...post,
            comments: [...(Array.isArray(post.comments) ? post.comments : []), nextComment],
            commentsCount: Math.max(0, Number(post.commentsCount || 0)) + 1,
            updatedAt: new Date().toISOString(),
          }
        : post
    ),
  });
}

export function toggleLocalCommunityReaction(state, { postId, reactionType, enabled }) {
  const key = reactionType === 'save' ? 'savedPostIds' : 'upvotedPostIds';
  const nextIds = new Set(Array.isArray(state?.[key]) ? state[key].map((item) => String(item)) : []);

  if (enabled) nextIds.add(String(postId));
  else nextIds.delete(String(postId));

  return normalizeCommunityState({
    ...state,
    [key]: [...nextIds],
    forumPosts: (Array.isArray(state?.forumPosts) ? state.forumPosts : []).map((post) =>
      post.id === postId
        ? {
            ...post,
            upvotesCount:
              reactionType === 'upvote'
                ? Math.max(0, Number(post.upvotesCount || 0) + (enabled ? 1 : -1))
                : Number(post.upvotesCount || 0),
            savedByCurrentUser: reactionType === 'save' ? enabled : Boolean(post.savedByCurrentUser),
            upvotedByCurrentUser: reactionType === 'upvote' ? enabled : Boolean(post.upvotedByCurrentUser),
          }
        : post
    ),
  });
}

export function incrementLocalCommunityView(state, postId) {
  return normalizeCommunityState({
    ...state,
    forumPosts: (Array.isArray(state?.forumPosts) ? state.forumPosts : []).map((post) =>
      post.id === postId
        ? {
            ...post,
            viewsCount: Math.max(0, Number(post.viewsCount || 0)) + 1,
          }
        : post
    ),
  });
}

export async function loadCommunityPosts({ limit = 20, offset = 0, categorySlug = '', currentUserId = '' } = {}) {
  let query = supabase
    .from('community_posts')
    .select('*')
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .range(offset, offset + Math.max(1, Number(limit || 20)) - 1);

  if (categorySlug) {
    query = query.eq('category_slug', categorySlug);
  }

  const { data: posts, error: postsError } = await query;
  if (postsError) throw postsError;

  const postIds = (Array.isArray(posts) ? posts : []).map((post) => post.id).filter(Boolean);
  if (postIds.length === 0) return [];

  const [{ data: comments, error: commentsError }, { data: reactions, error: reactionsError }] = await Promise.all([
    supabase
      .from('community_comments')
      .select('*')
      .in('post_id', postIds)
      .order('created_at', { ascending: true }),
    supabase
      .from('community_post_reactions')
      .select('*')
      .in('post_id', postIds),
  ]);

  if (commentsError) throw commentsError;
  if (reactionsError) throw reactionsError;

  const idSet = new Set();
  (posts || []).forEach((p) => {
    if (p?.user_id) idSet.add(String(p.user_id));
  });
  (comments || []).forEach((c) => {
    if (c?.user_id) idSet.add(String(c.user_id));
  });
  const avatarMap = await fetchProfileAvatarsByUserIds([...idSet]);

  return (posts || []).map((post) => {
    const postComments = (comments || [])
      .filter((comment) => comment.post_id === post.id)
      .map((comment) =>
        normalizeCommunityComment({
          id: comment.id,
          postId: comment.post_id,
          userId: comment.user_id,
          author: comment.author_name || 'Aluno',
          avatar: comment.author_avatar_url || '',
          content: comment.content || '',
          createdAt: comment.created_at,
        })
      );

    const postReactions = (reactions || []).filter((reaction) => reaction.post_id === post.id);
    const upvotes = postReactions.filter((reaction) => reaction.reaction_type === 'upvote');
    const saves = postReactions.filter((reaction) => reaction.reaction_type === 'save');

    const normalized = normalizeCommunityPost(
      {
        id: post.id,
        userId: post.user_id,
        author: post.author_name || 'Aluno Papirando',
        avatar: post.author_avatar_url || '',
        section: post.community_scope || 'Forum publico',
        category: post.category_name || 'Estudos',
        categorySlug: post.category_slug || slugifyCategory(post.category_name || 'estudos'),
        title: post.title || '',
        content: post.content || '',
        excerpt: post.content || '',
        createdAt: post.created_at,
        updatedAt: post.updated_at || post.created_at,
        viewsCount: Number(post.views_count || 0),
        upvotesCount: upvotes.length,
        commentsCount: postComments.length,
        comments: postComments,
        isPinned: Boolean(post.is_pinned),
      },
      saves.filter((reaction) => reaction.user_id === currentUserId).map((reaction) => reaction.post_id),
      upvotes.filter((reaction) => reaction.user_id === currentUserId).map((reaction) => reaction.post_id)
    );

    const uid = String(post.user_id || '');
    const rowAvatar = uid ? avatarMap.get(uid) : '';
    return {
      ...normalized,
      avatar: String(normalized.avatar || '').trim() || String(rowAvatar || '').trim(),
      comments: (normalized.comments || []).map((c) => {
        const cid = String(c.userId || '');
        const fromProfile = cid ? avatarMap.get(cid) : '';
        return {
          ...c,
          avatar: String(c.avatar || '').trim() || String(fromProfile || '').trim(),
        };
      }),
    };
  });
}

export const COMMUNITY_MODERATION_TITLE = '[Conteúdo removido pela moderação]';
export const COMMUNITY_MODERATION_BODY =
  'Este tópico foi revisado pela equipe Papirando. O conteúdo original não está mais disponível.';

export const COMMUNITY_COMMENT_MODERATION_TEXT =
  'Comentário removido pela moderação da comunidade.';

export async function publishCommunityPost({
  userId,
  authorName,
  authorAvatarUrl = '',
  title,
  content,
  categorySlug,
  categoryName,
}) {
  const body = String(content || '').trim();
  const payload = {
    user_id: userId,
    author_name: authorName || 'Aluno Papirando',
    author_avatar_url: String(authorAvatarUrl || '').trim(),
    title: String(title || '').trim(),
    content: body,
    excerpt: body.slice(0, 400),
    category_slug: categorySlug || slugifyCategory(categoryName || 'estudos'),
    category_name: categoryName || 'Estudos',
    community_scope: 'Forum publico',
    is_public: true,
  };

  const { data, error } = await supabase.from('community_posts').insert(payload).select().maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function adminUpdateCommunityPost(postId, patch = {}) {
  if (!postId) throw new Error('postId obrigatório');
  const { data, error } = await supabase.from('community_posts').update(patch).eq('id', postId).select().maybeSingle();
  if (error) throw error;
  return data;
}

export async function adminDeleteCommunityPost(postId) {
  if (!postId) throw new Error('postId obrigatório');
  const { error } = await supabase.from('community_posts').delete().eq('id', postId);
  if (error) throw error;
}

export async function adminUpdateCommunityComment(commentId, patch = {}) {
  if (!commentId) throw new Error('commentId obrigatório');
  const { data, error } = await supabase.from('community_comments').update(patch).eq('id', commentId).select().maybeSingle();
  if (error) throw error;
  return data;
}

export async function adminDeleteCommunityComment(commentId) {
  if (!commentId) throw new Error('commentId obrigatório');
  const { error } = await supabase.from('community_comments').delete().eq('id', commentId);
  if (error) throw error;
}

export async function adminInsertCommunityCategory({ slug, name, description = '', color = '#e2e8f0', position = 99 }) {
  const normalizedSlug = slugifyCategory(slug || name);
  if (!normalizedSlug) throw new Error('slug inválido');
  const { data, error } = await supabase
    .from('community_categories')
    .insert({
      slug: normalizedSlug,
      name: String(name || '').trim() || normalizedSlug,
      description: String(description || '').trim(),
      color: String(color || '#e2e8f0'),
      position: Number(position) || 0,
      is_active: true,
    })
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function adminUpdateCommunityCategory(categoryId, patch = {}) {
  if (!categoryId) throw new Error('categoryId obrigatório');
  const { data, error } = await supabase.from('community_categories').update(patch).eq('id', categoryId).select().maybeSingle();
  if (error) throw error;
  return data;
}

export async function adminDeactivateCommunityCategory(categoryId) {
  return adminUpdateCommunityCategory(categoryId, { is_active: false });
}

export async function fetchCommunityCategoriesAdmin() {
  const { data, error } = await supabase.from('community_categories').select('*').order('position', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function loadPostComments(postId) {
  if (!postId) return [];

  const { data, error } = await supabase
    .from('community_comments')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  if (error) throw error;

  return (data || []).map((comment) =>
    normalizeCommunityComment({
      id: comment.id,
      postId: comment.post_id,
      userId: comment.user_id,
      author: comment.author_name || 'Aluno',
      avatar: comment.author_avatar_url || '',
      content: comment.content || '',
      createdAt: comment.created_at,
    })
  );
}

export async function addPostComment({ postId, userId, authorName, authorAvatarUrl = '', content }) {
  const payload = {
    post_id: postId,
    user_id: userId,
    author_name: authorName || 'Aluno Papirando',
    author_avatar_url: String(authorAvatarUrl || '').trim(),
    content: String(content || '').trim(),
  };

  const { data, error } = await supabase.from('community_comments').insert(payload).select().maybeSingle();
  if (error) throw error;
  return data || null;
}

/**
 * Define uma reação ('upvote' | 'save') conforme o estado desejado (enabled), em vez de
 * alternar cegamente. Idempotente: não duplica nem erra se já estiver no estado pedido.
 * Dirigir pelo estado desejado evita o local divergir do banco em cliques rápidos/reload parcial.
 */
export async function setPostReaction(postId, userId, reactionType, enabled) {
  if (!postId || !userId || !reactionType) return { enabled: Boolean(enabled) };

  const { data: existing, error: existingError } = await supabase
    .from('community_post_reactions')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .eq('reaction_type', reactionType)
    .maybeSingle();

  if (existingError) throw existingError;

  if (enabled) {
    if (existing?.id) return { enabled: true };
    const { error: insertError } = await supabase.from('community_post_reactions').insert({
      post_id: postId,
      user_id: userId,
      reaction_type: reactionType,
    });
    if (insertError) throw insertError;
    return { enabled: true };
  }

  if (existing?.id) {
    const { error: deleteError } = await supabase
      .from('community_post_reactions')
      .delete()
      .eq('id', existing.id);
    if (deleteError) throw deleteError;
  }
  return { enabled: false };
}

