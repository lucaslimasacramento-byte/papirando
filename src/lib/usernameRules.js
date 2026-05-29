export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 30;
export const USERNAME_ALLOWED_PATTERN = /^[a-z0-9._]+$/;
export const RESERVED_USERNAME_TERMS = ['papirando'];
export const BLOCKED_USERNAME_TERMS = [
  'puta',
  'merda',
  'porra',
  'caralho',
  'foda',
  'fodase',
  'fuder',
  'buceta',
  'pica',
  'cuzao',
  'arrombado',
  'arrombada',
  'vagabundo',
  'vagabunda',
  'otario',
  'otaria',
  'babaca',
  'desgraca',
  'cacete',
  'fdp',
];

export function normalizeUsername(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^@+/, '')
    .replace(/\s+/g, '');
}

export function validateUsername(value) {
  const username = normalizeUsername(value);
  const compactUsername = username.replace(/[._]/g, '');

  if (!username) return { ok: false, username, message: 'Digite um username.' };
  if (username.length < USERNAME_MIN_LENGTH) {
    return { ok: false, username, message: `O username precisa ter pelo menos ${USERNAME_MIN_LENGTH} caracteres.` };
  }
  if (username.length > USERNAME_MAX_LENGTH) {
    return { ok: false, username, message: `O username pode ter no máximo ${USERNAME_MAX_LENGTH} caracteres.` };
  }
  if (!USERNAME_ALLOWED_PATTERN.test(username)) {
    return { ok: false, username, message: 'Use apenas letras minúsculas, números, ponto e underline.' };
  }
  if (username.startsWith('.') || username.endsWith('.')) {
    return { ok: false, username, message: 'O username não pode começar ou terminar com ponto.' };
  }
  if (username.includes('..')) {
    return { ok: false, username, message: 'O username não pode ter dois pontos seguidos.' };
  }
  if (RESERVED_USERNAME_TERMS.some((term) => compactUsername.includes(term))) {
    return { ok: false, username, message: 'Esse username é reservado pela plataforma.' };
  }
  if (BLOCKED_USERNAME_TERMS.some((term) => compactUsername.includes(term))) {
    return { ok: false, username, message: 'Esse username não pode conter palavras ofensivas.' };
  }

  return { ok: true, username, message: '' };
}
