import { canonicalizeSubjectName } from './subjectCatalogUtils';

export const AUDIOBOOKS_STORAGE_KEY = 'papirando_audiobooks_state';
export const DEFAULT_AUDIOBOOK_PLAYBACK_RATE = 1.25;
export const SEEK_INTERVAL_SECONDS = 15;

function estimateDurationSeconds(label) {
  const text = String(label || '').toLowerCase();
  const hourMatch = text.match(/(\d+)\s*h/);
  const minuteMatch = text.match(/(\d+)\s*min/);
  const totalMinutes = (hourMatch ? Number(hourMatch[1]) * 60 : 0) + (minuteMatch ? Number(minuteMatch[1]) : 0);
  return totalMinutes > 0 ? totalMinutes * 60 : 0;
}

export function buildTrack(id, title, durationLabel, audioUrl) {
  return {
    id,
    title,
    durationLabel,
    durationSecondsEstimate: estimateDurationSeconds(durationLabel),
    audioUrl,
  };
}

const ACCENTS = new Set(['blue', 'indigo', 'emerald']);

function enrichBookWithDisciplineLinks(book, normalizedDisciplines, subjectCatalog) {
  const canonicalTarget = canonicalizeSubjectName(book.disciplineName || '', subjectCatalog);
  const linkedDiscipline =
    normalizedDisciplines.find(
      (discipline) => canonicalizeSubjectName(discipline?.nome || '', subjectCatalog) === canonicalTarget
    ) || null;
  const topics = Array.isArray(linkedDiscipline?.topicos) ? linkedDiscipline.topicos : [];
  const nextTopic = topics.find((topic) => !topic?.concluido) || topics[0] || null;

  return {
    ...book,
    linkedDiscipline,
    linkedTopic: nextTopic,
    tracks: (Array.isArray(book.tracks) ? book.tracks : []).map((track) => ({
      ...track,
      disciplineId: linkedDiscipline?.id || '',
    })),
  };
}

function normalizeRemoteAudiobookBook(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const id = String(raw.id || '').trim();
  const title = String(raw.title || raw.titulo || '').trim();
  const subtitle = String(raw.subtitle || raw.subtitulo || '').trim();
  const category = String(raw.category || raw.categoria || 'Geral').trim() || 'Geral';
  const accent = ACCENTS.has(raw.accent) ? raw.accent : 'blue';
  const disciplineName = String(raw.disciplineName || raw.disciplinaNome || '').trim();
  const materialLabel = String(raw.materialLabel || '').trim();
  const description = String(raw.description || '').trim();
  const tracks = Array.isArray(raw.tracks)
    ? raw.tracks
        .map((t, i) => {
          if (!t || typeof t !== 'object') return null;
          const tid = String(t.id || `${id}-${i + 1}`).trim();
          const ttitle = String(t.title || t.titulo || '').trim();
          const durationLabel = String(t.durationLabel || t.duracao || '1 min').trim() || '1 min';
          const audioUrl = String(t.audioUrl || t.url || '').trim();
          if (!tid || !ttitle || !audioUrl) return null;
          return buildTrack(tid, ttitle, durationLabel, audioUrl);
        })
        .filter(Boolean)
    : [];
  if (!id || !title || !tracks.length) return null;
  return { id, title, subtitle, category, accent, disciplineName, materialLabel, description, tracks };
}

/** Usa somente o catálogo remoto válido; sem fallback de demonstração para a área do aluno. */
export function mergeAudiobookCatalogFromRemote(overrideBooks, bancoDisciplinas = [], subjectCatalog = []) {
  const normalizedDisciplines = Array.isArray(bancoDisciplinas) ? bancoDisciplinas : [];
  if (!Array.isArray(overrideBooks) || overrideBooks.length === 0) return [];

  const parsed = overrideBooks.map((row) => normalizeRemoteAudiobookBook(row)).filter(Boolean);
  if (!parsed.length) return [];

  return parsed.map((book) => enrichBookWithDisciplineLinks(book, normalizedDisciplines, subjectCatalog));
}

export function buildDefaultAudiobookCatalog() {
  return [
    {
      id: 'cf88-direitos',
      title: 'Constituição Federal de 1988',
      subtitle: 'Direitos e garantias fundamentais em blocos curtos',
      category: 'Constitucional',
      accent: 'blue',
      disciplineName: 'Direito Constitucional',
      materialLabel: 'Art. 1 ao Art. 17',
      description: 'Sequência focada para revisar princípios, direitos e organização do Estado em áudio.',
      tracks: [
        buildTrack('cf88-direitos-01', 'Princípios fundamentais e estrutura constitucional', '8 min', '/assets/wellness/mindfulness-meditacao-guiada.mp3'),
        buildTrack('cf88-direitos-02', 'Direitos e deveres individuais e coletivos', '12 min', '/assets/wellness/musica-para-concentracao.mp3'),
        buildTrack('cf88-direitos-03', 'Organização do Estado e administração pública', '10 min', '/assets/wellness/ondas-gamma-binaural-40hz.mp3'),
      ],
    },
    {
      id: 'lei-8112',
      title: 'Lei 8.112/90',
      subtitle: 'Regime jurídico, deveres e responsabilidades',
      category: 'Administrativo',
      accent: 'indigo',
      disciplineName: 'Direito Administrativo',
      materialLabel: 'Agentes públicos e regime disciplinar',
      description: 'Resumo falado para retomar os pontos mais cobrados do regime jurídico dos servidores.',
      tracks: [
        buildTrack('lei-8112-01', 'Provimento, vacância e formas de ingresso', '9 min', '/assets/wellness/ruido-marrom-com-pomodoro.mp3'),
        buildTrack('lei-8112-02', 'Deveres, proibições e responsabilidades', '11 min', '/assets/wellness/ruido-branco.mp3'),
      ],
    },
    {
      id: 'codigo-penal',
      title: 'Código Penal',
      subtitle: 'Parte geral com foco em teoria do crime',
      category: 'Penal',
      accent: 'emerald',
      disciplineName: 'Direito Penal',
      materialLabel: 'Parte geral e teoria do crime',
      description: 'Faixas para consolidar estrutura da parte geral sem abrir mão da revisão contínua.',
      tracks: [
        buildTrack('codigo-penal-01', 'Aplicação da lei penal e princípios', '7 min', '/assets/wellness/ruido-marrom.mp3'),
        buildTrack('codigo-penal-02', 'Fato típico, ilicitude e culpabilidade', '13 min', '/assets/wellness/meditacao-guiada.mp3'),
      ],
    },
    {
      id: 'cpp-inquerito',
      title: 'Código de Processo Penal',
      subtitle: 'Inquérito, ação penal e competência',
      category: 'Processo Penal',
      accent: 'blue',
      disciplineName: 'Direito Processual Penal',
      materialLabel: 'Inquérito policial e ação penal',
      description: 'Linha direta para revisar os marcos do processo penal e os temas introdutórios.',
      tracks: [
        buildTrack('cpp-inquerito-01', 'Inquérito policial sem enrolação', '10 min', '/assets/wellness/musica-para-concentracao.mp3'),
        buildTrack('cpp-inquerito-02', 'Ação penal, competência e procedimentos iniciais', '12 min', '/assets/wellness/ondas-gamma-binaural-40hz.mp3'),
      ],
    },
    {
      id: 'improbidade',
      title: 'Lei de Improbidade Administrativa',
      subtitle: 'Atos, sanções e jurisprudência quente',
      category: 'Leis Especiais',
      accent: 'indigo',
      disciplineName: 'Direito Administrativo',
      materialLabel: 'Improbidade administrativa',
      description: 'Bom para fechar revisões de leis especiais com uma passada objetiva nos pontos sensíveis.',
      tracks: [
        buildTrack('improbidade-01', 'Atos de improbidade e sujeitos envolvidos', '8 min', '/assets/wellness/ruido-marrom-com-pomodoro.mp3'),
        buildTrack('improbidade-02', 'Sanções, rito e atualizações recentes', '9 min', '/assets/wellness/ruido-branco.mp3'),
      ],
    },
    {
      id: 'maria-da-penha',
      title: 'Lei Maria da Penha',
      subtitle: 'Medidas protetivas e procedimento',
      category: 'Leis Especiais',
      accent: 'emerald',
      disciplineName: 'Legislação penal especial',
      materialLabel: 'Violência doméstica e medidas protetivas',
      description: 'Revisão auditiva objetiva para memorizar fluxo, competências e medidas protetivas.',
      tracks: [
        buildTrack('maria-da-penha-01', 'Conceitos centrais e formas de violência', '8 min', '/assets/wellness/meditacao-guiada.mp3'),
        buildTrack('maria-da-penha-02', 'Medidas protetivas e atendimento da vítima', '10 min', '/assets/wellness/mindfulness-meditacao-guiada.mp3'),
      ],
    },
  ];
}

export function normalizeAudiobookState(input) {
  const state = input && typeof input === 'object' ? input : {};
  const favorites = Array.isArray(state.favorites) ? Array.from(new Set(state.favorites.map((item) => String(item)).filter(Boolean))) : [];
  const progressByTrack = Object.entries(state.progressByTrack || {}).reduce((acc, [trackId, value]) => {
    const progress = value && typeof value === 'object' ? value : {};
    acc[String(trackId)] = {
      currentTime: Math.max(0, Number(progress.currentTime || 0)),
      farthestTime: Math.max(0, Number(progress.farthestTime || progress.currentTime || 0)),
      duration: Math.max(0, Number(progress.duration || 0)),
      completed: Boolean(progress.completed),
      updatedAt: String(progress.updatedAt || ''),
      playCount: Math.max(0, Number(progress.playCount || 0)),
    };
    return acc;
  }, {});

  return {
    favorites,
    progressByTrack,
    activeAudiobookId: String(state.activeAudiobookId || ''),
    activeTrackId: String(state.activeTrackId || ''),
    playbackRate: Math.max(0.75, Math.min(2, Number(state.playbackRate || DEFAULT_AUDIOBOOK_PLAYBACK_RATE))),
    volume: Math.max(0, Math.min(1, Number(state.volume ?? 1))),
  };
}

function resolveTrackProgress(progress = {}, track = {}) {
  const duration = Math.max(0, Number(progress.duration || track.durationSecondsEstimate || 0));
  const currentTime = Math.max(0, Number(progress.currentTime || 0));
  const farthestTime = Math.max(currentTime, Number(progress.farthestTime || currentTime || 0));
  const percent = duration > 0 ? Math.min(100, Math.round((farthestTime / duration) * 100)) : 0;

  return {
    currentTime,
    farthestTime,
    duration,
    percent,
    completed: Boolean(progress.completed) || percent >= 95,
    playCount: Math.max(0, Number(progress.playCount || 0)),
  };
}

export function buildAudiobookCatalog(bancoDisciplinas = [], subjectCatalog = []) {
  const normalizedDisciplines = Array.isArray(bancoDisciplinas) ? bancoDisciplinas : [];
  return buildDefaultAudiobookCatalog().map((book) =>
    enrichBookWithDisciplineLinks(book, normalizedDisciplines, subjectCatalog)
  );
}

export function buildAudiobookLibrary(catalog = [], state = {}) {
  const safeState = normalizeAudiobookState(state);

  return (Array.isArray(catalog) ? catalog : []).map((book) => {
    const trackSummaries = (Array.isArray(book.tracks) ? book.tracks : []).map((track) => {
      const progress = resolveTrackProgress(safeState.progressByTrack?.[track.id], track);
      return {
        ...track,
        ...progress,
      };
    });

    const totalTracks = trackSummaries.length;
    const startedTracks = trackSummaries.filter((track) => track.farthestTime > 0).length;
    const completedTracks = trackSummaries.filter((track) => track.completed).length;
    const totalDuration = trackSummaries.reduce((acc, track) => acc + track.duration, 0);
    const listenedDuration = trackSummaries.reduce((acc, track) => acc + track.farthestTime, 0);
    const progressPercent = totalDuration > 0 ? Math.min(100, Math.round((listenedDuration / totalDuration) * 100)) : 0;
    const remainingSeconds = Math.max(0, totalDuration - listenedDuration);
    const nextTrack =
      trackSummaries.find((track) => !track.completed && track.farthestTime > 0) ||
      trackSummaries.find((track) => !track.completed) ||
      trackSummaries[0] ||
      null;
    const lastPlayedTrack = trackSummaries.find((track) => track.id === safeState.activeTrackId) || null;

    return {
      ...book,
      favorite: safeState.favorites.includes(book.id),
      progressPercent,
      totalTracks,
      startedTracks,
      completedTracks,
      listenedDuration,
      totalDuration,
      remainingSeconds,
      nextTrack,
      lastPlayedTrack,
      status:
        completedTracks === totalTracks && totalTracks > 0
          ? 'Concluido'
          : startedTracks > 0
            ? 'Em andamento'
            : 'Novo',
      tracks: trackSummaries,
    };
  });
}

export function buildAudiobookSummary(catalog = [], state = {}) {
  const library = buildAudiobookLibrary(catalog, state);
  const totalBooks = library.length;
  const inProgress = library.filter((item) => item.startedTracks > 0 && item.completedTracks < item.totalTracks).length;
  const completedBooks = library.filter((item) => item.totalTracks > 0 && item.completedTracks === item.totalTracks).length;
  const favoriteCount = library.filter((item) => item.favorite).length;
  const totalListenedSeconds = library.reduce((acc, item) => acc + item.listenedDuration, 0);
  const totalTracks = library.reduce((acc, item) => acc + item.totalTracks, 0);
  const completedTracks = library.reduce((acc, item) => acc + item.completedTracks, 0);
  const overallProgress = totalTracks > 0 ? Math.round((completedTracks / totalTracks) * 100) : 0;
  const continueListening =
    library
      .filter((item) => item.nextTrack)
      .sort((first, second) => {
        const firstTime = new Date(first.nextTrack?.updatedAt || 0).getTime();
        const secondTime = new Date(second.nextTrack?.updatedAt || 0).getTime();
        return secondTime - firstTime;
      })[0] || null;

  return {
    totalBooks,
    inProgress,
    completedBooks,
    favoriteCount,
    totalListenedSeconds,
    overallProgress,
    continueListening,
  };
}
