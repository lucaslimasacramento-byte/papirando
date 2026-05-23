export const CONTEST_AREA_THEME = {
  Policial: {
    accentStart: '#38bdf8',
    accentEnd: '#1e3a5f',
    accentShadow: 'rgba(56, 189, 248, 0.34)',
    dark: '#071526',
    darkSoft: '#102a56',
  },
  Militar: {
    accentStart: '#22c55e',
    accentEnd: '#3f6212',
    accentShadow: 'rgba(34, 197, 94, 0.32)',
    dark: '#07170f',
    darkSoft: '#18351f',
  },
  Agropecuária: {
    accentStart: '#84cc16',
    accentEnd: '#16a34a',
    accentShadow: 'rgba(132, 204, 22, 0.28)',
    dark: '#0b1f12',
    darkSoft: '#1e3a1d',
  },
  Tribunais: {
    accentStart: '#a78bfa',
    accentEnd: '#4f46e5',
    accentShadow: 'rgba(167, 139, 250, 0.3)',
    dark: '#120f24',
    darkSoft: '#271a4a',
  },
  Fiscal: {
    accentStart: '#facc15',
    accentEnd: '#d97706',
    accentShadow: 'rgba(250, 204, 21, 0.28)',
    dark: '#1f1606',
    darkSoft: '#3a280c',
  },
  Controle: {
    accentStart: '#2dd4bf',
    accentEnd: '#0891b2',
    accentShadow: 'rgba(45, 212, 191, 0.28)',
    dark: '#062323',
    darkSoft: '#0f3a45',
  },
  Legislativo: {
    accentStart: '#60a5fa',
    accentEnd: '#7c3aed',
    accentShadow: 'rgba(96, 165, 250, 0.3)',
    dark: '#10172a',
    darkSoft: '#241b4a',
  },
  Administrativa: {
    accentStart: '#94a3b8',
    accentEnd: '#1e3a5f',
    accentShadow: 'rgba(148, 163, 184, 0.28)',
    dark: '#101827',
    darkSoft: '#1e293b',
  },
  Educação: {
    accentStart: '#38bdf8',
    accentEnd: '#8b5cf6',
    accentShadow: 'rgba(56, 189, 248, 0.28)',
    dark: '#10142b',
    darkSoft: '#292052',
  },
  Saúde: {
    accentStart: '#34d399',
    accentEnd: '#0d9488',
    accentShadow: 'rgba(52, 211, 153, 0.28)',
    dark: '#061f1c',
    darkSoft: '#103b35',
  },
  Geral: {
    accentStart: '#65a9ff',
    accentEnd: '#6474ff',
    accentShadow: 'rgba(84, 132, 255, 0.38)',
    dark: '#0c1425',
    darkSoft: '#121d33',
  },
};

export function getContestAreaTheme(area = '') {
  return CONTEST_AREA_THEME[area] || CONTEST_AREA_THEME.Geral;
}

export function getContestAreaBackground(area = '', color = '') {
  const theme = getContestAreaTheme(area);
  const glow = color || theme.accentStart;

  return `radial-gradient(circle at 50% 48%, ${glow}55 0%, transparent 34%), linear-gradient(135deg, ${theme.dark} 0%, ${theme.darkSoft} 52%, ${theme.accentEnd} 140%)`;
}
