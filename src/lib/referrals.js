export const REFERRAL_STORAGE_KEY = 'papirando_pending_referral_code';

export const REFERRAL_GOALS = [
  { alvo: 1,  titulo: '1 mês grátis' },
  { alvo: 3,  titulo: '3 meses grátis' },
  { alvo: 5,  titulo: '6 meses grátis' },
  { alvo: 10, titulo: '1 ano grátis' },
];

export function normalizeReferralCode(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 18);
}

export function buildDefaultReferralCode({ username = '', email = '', userId = '' } = {}) {
  const normalizedUsername = normalizeReferralCode(username).slice(0, 10);
  if (normalizedUsername.length >= 4) return normalizedUsername;

  const emailPrefix = String(email || '').split('@')[0];
  const normalizedEmail = normalizeReferralCode(emailPrefix).slice(0, 10);
  if (normalizedEmail.length >= 4) return normalizedEmail;

  const userTail = normalizeReferralCode(String(userId || '').slice(-6));
  return normalizeReferralCode(`PAPI${userTail || '2026'}`).slice(0, 12);
}

export function buildInviteUrl(code, origin = '') {
  const normalizedCode = normalizeReferralCode(code);
  const safeOrigin =
    String(origin || '').trim() ||
    (typeof window !== 'undefined' ? window.location.origin : 'https://papirando.app');

  if (!normalizedCode) return safeOrigin;
  return `${safeOrigin.replace(/\/$/, '')}/entrar?ref=${encodeURIComponent(normalizedCode)}`;
}

/** Lê convite na query (?convite= / ?ref= / ?invite=), no path (/convite/X) ou no hash (#...?ref=). */
export function extractReferralCodeFromLocation(locationLike = null) {
  const source =
    locationLike ||
    (typeof window !== 'undefined'
      ? {
          search: window.location.search,
          pathname: window.location.pathname,
          hash: window.location.hash,
        }
      : null);

  if (!source) return '';

  const searchParams = new URLSearchParams(String(source.search || ''));
  const byQuery = normalizeReferralCode(
    searchParams.get('convite') || searchParams.get('ref') || searchParams.get('invite')
  );
  if (byQuery) return byQuery;

  const pathname = String(source.pathname || '');
  const match = pathname.match(/\/convite\/([^/?#]+)/i);
  const byPath = normalizeReferralCode(match?.[1] || '');
  if (byPath) return byPath;

  const hash = String(source.hash || '');
  const hashQueryPart = hash.includes('?') ? hash.slice(hash.indexOf('?') + 1) : '';
  if (hashQueryPart) {
    const hp = new URLSearchParams(hashQueryPart);
    const byHash = normalizeReferralCode(
      hp.get('convite') || hp.get('ref') || hp.get('invite')
    );
    if (byHash) return byHash;
  }

  return '';
}

/** Captura o código a partir da janela atual (inclui pathname + search; útil no mount e após navegação). */
export function captureReferralCodeFromWindow() {
  if (typeof window === 'undefined') return '';

  const fromPage = extractReferralCodeFromLocation({
    search: window.location.search,
    pathname: window.location.pathname,
    hash: window.location.hash,
  });
  if (fromPage) return fromPage;

  return '';
}

export function persistPendingReferralCode(code) {
  if (typeof window === 'undefined') return;
  const normalizedCode = normalizeReferralCode(code);

  try {
    if (normalizedCode) {
      window.localStorage.setItem(REFERRAL_STORAGE_KEY, normalizedCode);
    } else {
      window.localStorage.removeItem(REFERRAL_STORAGE_KEY);
    }
  } catch (error) {
    console.warn('Falha ao persistir codigo de convite.', error);
  }
}

export function getStoredReferralCode() {
  if (typeof window === 'undefined') return '';

  try {
    return normalizeReferralCode(window.localStorage.getItem(REFERRAL_STORAGE_KEY) || '');
  } catch (error) {
    console.warn('Falha ao ler codigo de convite salvo.', error);
    return '';
  }
}

export function formatReferralDate(value) {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';

  return parsed.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function getReferralGoalSummary(confirmedCount) {
  const safeConfirmedCount = Math.max(0, Number(confirmedCount || 0));
  const nextGoal = REFERRAL_GOALS.find((goal) => safeConfirmedCount < goal.alvo) || null;
  const progress = nextGoal ? Math.min(100, (safeConfirmedCount / nextGoal.alvo) * 100) : 100;

  return {
    confirmedCount: safeConfirmedCount,
    nextGoal,
    progress,
  };
}
