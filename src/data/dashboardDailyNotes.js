const DASHBOARD_DAILY_NOTES = [
  {
    quote: 'Constancia vence intensidade quando o objetivo e aprovacao.',
    author: 'Papirando',
  },
  {
    quote: 'O melhor bloco de estudo e o que comeca agora, mesmo sem perfeicao.',
    author: 'Papirando',
  },
  {
    quote: 'Revisar cedo evita reaprender tarde.',
    author: 'Papirando',
  },
  {
    quote: 'Quem organiza a semana estuda com menos atrito e mais clareza.',
    author: 'Papirando',
  },
  {
    quote: 'Questoes bem corrigidas ensinam mais do que volume sem atencao.',
    author: 'Papirando',
  },
  {
    quote: 'Seu avanco aparece primeiro na rotina e so depois no resultado.',
    author: 'Papirando',
  },
  {
    quote: 'Disciplina simples, repetida por muitos dias, muda o jogo.',
    author: 'Papirando',
  },
];

function buildLocalDayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function hashDayKey(dayKey) {
  return Array.from(String(dayKey || '')).reduce(
    (acc, char, index) => acc + char.charCodeAt(0) * (index + 1),
    0
  );
}

export function getDashboardDailyNote(date = new Date()) {
  if (DASHBOARD_DAILY_NOTES.length === 0) {
    return { quote: '', author: '' };
  }

  const dayKey = buildLocalDayKey(date);
  const index = hashDayKey(dayKey) % DASHBOARD_DAILY_NOTES.length;
  return DASHBOARD_DAILY_NOTES[index];
}

export default DASHBOARD_DAILY_NOTES;
