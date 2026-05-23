export const AREA_TOKENS = {
  militar: { label: 'Militar', cover: '#1f3a2b', coverGlow: '#2d5840', chip: '#e0eddc', chipInk: '#2d5840' },
  policial: { label: 'Policial', cover: '#152849', coverGlow: '#1f3c70', chip: '#d8e3f5', chipInk: '#1f3c70' },
  fiscal: { label: 'Fiscal', cover: '#3d2818', coverGlow: '#5a3c24', chip: '#efe2cf', chipInk: '#5a3c24' },
  tribunais: { label: 'Tribunais', cover: '#1f3030', coverGlow: '#2c4847', chip: '#dceae9', chipInk: '#2c4847' },
  saude: { label: 'Saude', cover: '#3d1a26', coverGlow: '#5c2b3a', chip: '#f0d8df', chipInk: '#5c2b3a' },
};

const normalizeAreaKey = (key) =>
  String(key || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

export const getAreaToken = (key) => {
  const normalized = normalizeAreaKey(key);
  return AREA_TOKENS[normalized] || {
    label: key || 'Outros',
    cover: '#3a342c',
    coverGlow: '#52483c',
    chip: 'var(--pl-bg-soft)',
    chipInk: 'var(--pl-ink-2)',
  };
};
