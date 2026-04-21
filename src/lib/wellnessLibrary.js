export const WELLNESS_LIBRARY_STORAGE_KEY = 'papirando_wellness_library';

export function resolveWellnessMediaUrl(item = {}) {
  const mediaType = String(item?.mediaType || 'audio').toLowerCase();

  if (mediaType === 'video') {
    return String(item?.videoUrl || item?.audioUrl || '');
  }

  return String(item?.audioUrl || item?.videoUrl || '');
}

export function buildDefaultWellnessLibrary() {
  return [
    {
      id: 'mindfulness-15',
      title: 'Mindfulness guiado',
      mediaType: 'audio',
      category: 'Meditacao',
      description: 'Pratica guiada para reduzir a tensao e reorganizar o foco.',
      durationLabel: '15 min',
      audioUrl: '/assets/wellness/mindfulness-meditacao-guiada.mp3',
      videoUrl: '',
      coverUrl: '/assets/wellness/mindfulness.jpg',
      credits: 'Audio base enviado pela equipe',
      isFeatured: true,
      isPublic: true,
    },
    {
      id: 'meditacao-guiada',
      title: 'Meditacao guiada',
      mediaType: 'audio',
      category: 'Meditacao',
      description: 'Sessao de relaxamento orientado para pausas entre blocos de estudo.',
      durationLabel: '12 min',
      audioUrl: '/assets/wellness/meditacao-guiada.mp3',
      videoUrl: '',
      coverUrl: '',
      credits: 'Audio base enviado pela equipe',
      isFeatured: false,
      isPublic: true,
    },
    {
      id: 'ruido-marrom',
      title: 'Ruido marrom',
      mediaType: 'audio',
      category: 'Som',
      description: 'Camada sonora continua para leitura profunda e reducao de distracao.',
      durationLabel: 'Loop',
      audioUrl: '/assets/wellness/ruido-marrom.mp3',
      videoUrl: '',
      coverUrl: '',
      credits: 'Audio base enviado pela equipe',
      isFeatured: true,
      isPublic: true,
    },
    {
      id: 'ruido-marrom-pomodoro',
      title: 'Ruido marrom com pomodoro',
      mediaType: 'audio',
      category: 'Som',
      description: 'Ruido marrom com estrutura ritmada para blocos de foco.',
      durationLabel: 'Loop',
      audioUrl: '/assets/wellness/ruido-marrom-com-pomodoro.mp3',
      videoUrl: '',
      coverUrl: '',
      credits: 'Audio base enviado pela equipe',
      isFeatured: false,
      isPublic: true,
    },
    {
      id: 'ruido-branco',
      title: 'Ruido branco',
      mediaType: 'audio',
      category: 'Som',
      description: 'Mascara sonora neutra para ambientes mais barulhentos.',
      durationLabel: 'Loop',
      audioUrl: '/assets/wellness/ruido-branco.mp3',
      videoUrl: '',
      coverUrl: '',
      credits: 'Audio base enviado pela equipe',
      isFeatured: false,
      isPublic: true,
    },
    {
      id: 'ondas-gamma',
      title: 'Ondas gamma binaural 40Hz',
      mediaType: 'audio',
      category: 'Frequencia',
      description: 'Faixa de apoio para foco intenso e consolidacao de atencao.',
      durationLabel: 'Loop',
      audioUrl: '/assets/wellness/ondas-gamma-binaural-40hz.mp3',
      videoUrl: '',
      coverUrl: '',
      credits: 'Audio base enviado pela equipe',
      isFeatured: true,
      isPublic: true,
    },
    {
      id: 'musica-concentracao',
      title: 'Musica para concentracao',
      mediaType: 'audio',
      category: 'Musica',
      description: 'Trilha musical mais suave para manter ritmo sem cansar.',
      durationLabel: 'Longa',
      audioUrl: '/assets/wellness/musica-para-concentracao.mp3',
      videoUrl: '',
      coverUrl: '',
      credits: 'Audio base enviado pela equipe',
      isFeatured: false,
      isPublic: true,
    },
  ];
}

export function normalizeWellnessLibrary(items = []) {
  const source = Array.isArray(items) ? items : buildDefaultWellnessLibrary();

  return source
    .filter(Boolean)
    .map((item, index) => ({
      id: String(item.id || `wellness-${index + 1}`),
      title: String(item.title || `Faixa ${index + 1}`),
      mediaType: String(item.mediaType || 'audio'),
      category: String(item.category || 'Som'),
      description: String(item.description || ''),
      durationLabel: String(item.durationLabel || ''),
      audioUrl: String(item.audioUrl || ''),
      videoUrl: String(item.videoUrl || (String(item.mediaType || 'audio') === 'video' ? item.audioUrl || '' : '')),
      coverUrl: String(item.coverUrl || ''),
      credits: String(item.credits || ''),
      isFeatured: item.isFeatured !== false,
      isPublic: item.isPublic !== false,
    }));
}
