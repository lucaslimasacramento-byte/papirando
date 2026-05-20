import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AudioLines,
  BookOpen,
  Bookmark,
  ChevronRight,
  Clock3,
  Filter,
  Headphones,
  Library,
  ListMusic,
  Pause,
  Play,
  PlayCircle,
  Search,
  SkipBack,
  SkipForward,
  Sparkles,
  Star,
  User2,
  Volume2,
  Waves,
} from 'lucide-react';
import {
  buildAudiobookLibrary,
  DEFAULT_AUDIOBOOK_PLAYBACK_RATE,
  SEEK_INTERVAL_SECONDS,
} from '../lib/audiobooks';
import PageHeadPremium, {
  PAGE_HEAD_PREMIUM_PRIMARY_ACTION_CLASS,
  PAGE_HEAD_PREMIUM_SECONDARY_ACTION_CLASS,
  PageHeadPremiumBadge,
} from '../components/PageHeadPremium';

function formatClock(seconds) {
  const safeSeconds = Math.max(0, Math.floor(Number(seconds || 0)));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = safeSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  }

  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

function formatDurationLabel(seconds) {
  const safeSeconds = Math.max(0, Math.floor(Number(seconds || 0)));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);

  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m restantes`;
  if (hours > 0) return `${hours}h restantes`;
  if (minutes > 0) return `${minutes} min restantes`;
  return 'Menos de 1 min restante';
}

function formatListeningHours(seconds) {
  const totalMinutes = Math.round(Math.max(0, Number(seconds || 0)) / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${String(minutes).padStart(2, '0')}m`;
}

/** Resolve URL absoluta para <audio> (paths relativos ou https). */
function resolveAudiobookAudioSrc(url) {
  const u = String(url || '').trim();
  if (!u) return '';
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith('//')) return `${window.location.protocol}${u}`;
  try {
    return new URL(u, window.location.origin).href;
  } catch {
    return u;
  }
}

function resolveAccentStyles(accent) {
  const variants = {
    blue: {
      icon: 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white',
      progress: 'bg-blue-600',
      text: 'group-hover:text-blue-600',
    },
    indigo: {
      icon: 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white',
      progress: 'bg-indigo-600',
      text: 'group-hover:text-indigo-600',
    },
    emerald: {
      icon: 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white',
      progress: 'bg-emerald-500',
      text: 'group-hover:text-emerald-600',
    },
  };

  return variants[accent] || variants.blue;
}

export default function Audiobooks(props) {
  const {
    profile = {},
    bancoDisciplinas = [],
    catalog = [],
    audiobookState = {},
    onSaveAudiobookState,
    onOpenDiscipline,
    onOpenProfile,
  } = props;

  const audioRef = useRef(null);
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [search, setSearch] = useState('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const library = useMemo(() => buildAudiobookLibrary(catalog, audiobookState), [catalog, audiobookState]);
  const favorites = useMemo(() => library.filter((item) => item.favorite), [library]);
  const inProgressCount = useMemo(
    () => library.filter((item) => item.startedTracks > 0 && item.completedTracks < item.totalTracks).length,
    [library]
  );
  const totalListenedSeconds = useMemo(
    () => library.reduce((acc, item) => acc + item.listenedDuration, 0),
    [library]
  );

  const categories = useMemo(() => {
    const counts = library.reduce(
      (acc, item) => {
        const key = item.category || 'Geral';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      },
      { Todos: library.length }
    );

    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [library]);

  const filteredLibrary = useMemo(() => {
    const query = search.trim().toLowerCase();
    const tokens = query.split(/\s+/).filter(Boolean);
    return library.filter((item) => {
      const matchesCategory = activeCategory === 'Todos' || item.category === activeCategory;
      const matchesFavorite = !showFavoritesOnly || item.favorite;
      const searchableFields = [
        item.title,
        item.subtitle,
        item.category,
        item.description,
        item.linkedDiscipline?.nome,
        item.linkedTopic?.nome,
      ]
        .join(' ')
        .toLowerCase();
      const matchesQuery =
        tokens.length === 0 || tokens.every((token) => searchableFields.includes(token));
      return matchesCategory && matchesQuery && matchesFavorite;
    });
  }, [activeCategory, library, search, showFavoritesOnly]);

  const activeBook = useMemo(() => {
    const directMatch = library.find((item) => item.id === audiobookState.activeAudiobookId);
    if (directMatch) return directMatch;
    return filteredLibrary[0] || library[0] || null;
  }, [audiobookState.activeAudiobookId, filteredLibrary, library]);

  const activeTrack = useMemo(() => {
    if (!activeBook) return null;
    return (
      activeBook.tracks.find((track) => track.id === audiobookState.activeTrackId) ||
      activeBook.nextTrack ||
      activeBook.tracks[0] ||
      null
    );
  }, [activeBook, audiobookState.activeTrackId]);

  const activeTrackProgress = useMemo(
    () => activeBook?.tracks.find((track) => track.id === activeTrack?.id) || null,
    [activeBook, activeTrack]
  );

  const communityPlaylists = useMemo(() => {
    const byFavorites = favorites.slice(0, 3);
    const byProgress = library
      .filter((item) => item.startedTracks > 0)
      .sort((first, second) => second.progressPercent - first.progressPercent)
      .slice(0, 3);

    return [
      {
        id: 'playlist-favorites',
        title: 'Favoritos da sua biblioteca',
        creator: 'Papirando',
        items: `${Math.max(byFavorites.length, 1)} áudio(s)`,
        accent: 'blue',
        description: byFavorites[0]
          ? `Comece por ${byFavorites[0].title} e siga com os salvos.`
          : 'Marque favoritos para montar sua pilha de retomada.',
        firstBook: byFavorites[0] || library[0] || null,
      },
      {
        id: 'playlist-progress',
        title: 'Fila de retomada',
        creator: 'Sua conta',
        items: `${Math.max(byProgress.length, 1)} áudio(s)`,
        accent: 'indigo',
        description: byProgress[0]
          ? `Volte para ${byProgress[0].title} sem perder o ponto de escuta.`
          : 'Assim que você iniciar um áudio, ele passa a aparecer aqui.',
        firstBook: byProgress[0] || library[0] || null,
      },
      {
        id: 'playlist-category',
        title: activeBook?.category ? `${activeBook.category} em foco` : 'Categoria em foco',
        creator: profile?.username || profile?.nome || 'Perfil atual',
        items: `${activeBook?.tracks?.length || 0} faixa(s)`,
        accent: activeBook?.accent || 'emerald',
        description: activeBook
          ? `Playlist rápida baseada no áudio ativo: ${activeBook.title}.`
          : 'Selecione um áudio para abrir uma trilha contextual.',
        firstBook: activeBook,
      },
    ];
  }, [activeBook, favorites, library, profile]);

  useEffect(() => {
    if (!library.length || !onSaveAudiobookState) return;

    if (!audiobookState.activeAudiobookId || !audiobookState.activeTrackId) {
      const initialBook = library[0];
      const initialTrack = initialBook?.nextTrack || initialBook?.tracks?.[0] || null;
      if (!initialBook || !initialTrack) return;

      onSaveAudiobookState((prev) => ({
        ...prev,
        activeAudiobookId: initialBook.id,
        activeTrackId: initialTrack.id,
      }));
    }
  }, [audiobookState.activeAudiobookId, audiobookState.activeTrackId, library, onSaveAudiobookState]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !activeTrack) return;

    const nextSrc = resolveAudiobookAudioSrc(activeTrack.audioUrl);
    if (nextSrc && audio.src !== nextSrc) {
      audio.src = nextSrc;
    }

    audio.playbackRate = Number(audiobookState.playbackRate || DEFAULT_AUDIOBOOK_PLAYBACK_RATE);
    audio.volume = Number(audiobookState.volume ?? 1);

    const resumeTime = Math.min(
      Number(activeTrackProgress?.currentTime || 0),
      Number(activeTrackProgress?.duration || activeTrack.durationSecondsEstimate || 0) || Number(activeTrackProgress?.currentTime || 0)
    );

    if (Math.abs(Number(audio.currentTime || 0) - resumeTime) > 1.2) {
      audio.currentTime = resumeTime;
    }
  }, [activeTrack, activeTrackProgress, audiobookState.playbackRate, audiobookState.volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !activeTrack) return;

    if (isPlaying) {
      audio.play().catch((error) => {
        console.warn('Não foi possível iniciar a reprodução do audiolivro.', error);
        setIsPlaying(false);
      });
      return;
    }

    audio.pause();
  }, [activeTrack, isPlaying]);

  useEffect(() => () => {
    const audio = audioRef.current;
    if (audio) audio.pause();
  }, []);

  const persistProgress = (track, updates = {}) => {
    if (!track || !onSaveAudiobookState || !activeBook) return;

    onSaveAudiobookState((prev) => {
      const previousProgress = prev.progressByTrack?.[track.id] || {};
      const nextDuration = Math.max(
        Number(updates.duration ?? 0),
        Number(previousProgress.duration || 0),
        Number(track.durationSecondsEstimate || 0)
      );
      const nextCurrentTime = Math.max(0, Number(updates.currentTime ?? previousProgress.currentTime ?? 0));
      const nextFarthestTime = Math.max(
        Number(previousProgress.farthestTime || 0),
        Number(updates.farthestTime ?? nextCurrentTime)
      );
      const completed = Boolean(updates.completed) || (nextDuration > 0 && nextFarthestTime / nextDuration >= 0.95);

      return {
        ...prev,
        activeAudiobookId: activeBook.id,
        activeTrackId: track.id,
        progressByTrack: {
          ...(prev.progressByTrack || {}),
          [track.id]: {
            ...previousProgress,
            currentTime: nextCurrentTime,
            farthestTime: nextFarthestTime,
            duration: nextDuration,
            completed,
            playCount: Math.max(
              Number(previousProgress.playCount || 0),
              Number(updates.playCount ?? previousProgress.playCount ?? 0)
            ),
            updatedAt: new Date().toISOString(),
          },
        },
      };
    });
  };

  const selectTrack = (book, track, shouldPlay = false) => {
    if (!book || !track || !onSaveAudiobookState) return;

    onSaveAudiobookState((prev) => ({
      ...prev,
      activeAudiobookId: book.id,
      activeTrackId: track.id,
    }));

    if (shouldPlay) {
      persistProgress(track, {
        playCount: Number(audiobookState.progressByTrack?.[track.id]?.playCount || 0) + 1,
      });
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
    }
  };

  const handleTogglePlay = () => {
    if (!activeBook || !activeTrack) return;

    if (!isPlaying) {
      persistProgress(activeTrack, {
        playCount: Number(audiobookState.progressByTrack?.[activeTrack.id]?.playCount || 0) + 1,
      });
    }

    setIsPlaying((prev) => !prev);
  };

  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (!audio || !activeTrack) return;

    persistProgress(activeTrack, {
      currentTime: audio.currentTime,
      farthestTime: audio.currentTime,
      duration: audio.duration,
    });
  };

  const handleLoadedMetadata = () => {
    const audio = audioRef.current;
    if (!audio || !activeTrack) return;

    persistProgress(activeTrack, {
      currentTime: audio.currentTime,
      farthestTime: audio.currentTime,
      duration: audio.duration,
    });
  };

  const handleTrackEnd = () => {
    const audio = audioRef.current;
    if (activeTrack) {
      persistProgress(activeTrack, {
        currentTime: Number(audio?.duration || activeTrack.durationSecondsEstimate || 0),
        farthestTime: Number(audio?.duration || activeTrack.durationSecondsEstimate || 0),
        duration: Number(audio?.duration || activeTrack.durationSecondsEstimate || 0),
        completed: true,
      });
    }

    if (!activeBook) {
      setIsPlaying(false);
      return;
    }

    const currentIndex = activeBook.tracks.findIndex((track) => track.id === activeTrack?.id);
    const nextTrack = activeBook.tracks[currentIndex + 1] || null;

    if (nextTrack) {
      selectTrack(activeBook, nextTrack, true);
      return;
    }

    setIsPlaying(false);
  };

  const handleSeekRelative = (delta) => {
    const audio = audioRef.current;
    if (!audio || !activeTrack) return;
    const nextTime = Math.max(0, Math.min(Number(audio.duration || activeTrack.durationSecondsEstimate || 0), audio.currentTime + delta));
    audio.currentTime = nextTime;
    persistProgress(activeTrack, {
      currentTime: nextTime,
      farthestTime: nextTime,
      duration: Number(audio.duration || activeTrack.durationSecondsEstimate || 0),
    });
  };

  const handleTimelineChange = (event) => {
    const audio = audioRef.current;
    if (!audio || !activeTrack) return;
    const nextTime = Number(event.target.value || 0);
    audio.currentTime = nextTime;
    persistProgress(activeTrack, {
      currentTime: nextTime,
      farthestTime: nextTime,
      duration: Number(audio.duration || activeTrack.durationSecondsEstimate || 0),
    });
  };

  const handleChangePlaybackRate = () => {
    if (!onSaveAudiobookState) return;
    const options = [1, 1.25, 1.5, 1.75, 2];
    const currentIndex = options.findIndex((item) => item === Number(audiobookState.playbackRate || DEFAULT_AUDIOBOOK_PLAYBACK_RATE));
    const nextRate = options[(currentIndex + 1) % options.length];

    onSaveAudiobookState((prev) => ({
      ...prev,
      playbackRate: nextRate,
    }));
  };

  const handleVolumeToggle = () => {
    if (!onSaveAudiobookState) return;
    const muted = Number(audiobookState.volume ?? 1) === 0;

    onSaveAudiobookState((prev) => ({
      ...prev,
      volume: muted ? 1 : 0,
    }));
  };

  const handleToggleFavorite = (bookId) => {
    if (!bookId || !onSaveAudiobookState) return;

    onSaveAudiobookState((prev) => {
      const favoritesList = Array.isArray(prev.favorites) ? prev.favorites : [];
      const exists = favoritesList.includes(bookId);
      return {
        ...prev,
        favorites: exists ? favoritesList.filter((item) => item !== bookId) : [...favoritesList, bookId],
      };
    });
  };

  const handleContinueBook = (book, shouldPlay = true) => {
    if (!book) return;
    const nextTrack = book.nextTrack || book.tracks[0] || null;
    if (!nextTrack) return;
    selectTrack(book, nextTrack, shouldPlay);
  };

  const activeDuration = Number(activeTrackProgress?.duration || activeTrack?.durationSecondsEstimate || 0);
  const activeCurrentTime = Number(activeTrackProgress?.currentTime || 0);
  const activeRemainingTime = Math.max(0, activeDuration - activeCurrentTime);
  const playerMeta = [
    { label: 'Faixa', value: activeTrack ? String(activeBook?.tracks.findIndex((track) => track.id === activeTrack.id) + 1).padStart(2, '0') : '--' },
    { label: 'Progresso', value: `${activeTrackProgress?.percent || 0}%` },
    { label: 'Velocidade', value: `${Number(audiobookState.playbackRate || DEFAULT_AUDIOBOOK_PLAYBACK_RATE).toFixed(2).replace('.00', '').replace('.', ',')}x` },
    { label: 'Restante', value: formatClock(activeRemainingTime) },
  ];

  return (
    <div className="page-shell animate-in fade-in duration-500 gap-6 !pt-4 sm:!pt-5">
      <audio
        ref={audioRef}
        preload="metadata"
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleTrackEnd}
      />

      <PageHeadPremium
        className="gap-4 lg:!flex-row lg:!items-stretch lg:!justify-between xl:!items-center"
        icon={AudioLines}
        badge={
          <PageHeadPremiumBadge icon={Headphones}>
            Aprendizado passivo
          </PageHeadPremiumBadge>
        }
        title="Audiolivros em Lei Seca"
        subtitle="Biblioteca, player, favoritos e retomada ligados ao seu perfil e às disciplinas."
        leadingClassName="min-w-0 shrink-0 lg:max-w-[26rem] xl:max-w-[28rem]"
        statsStackBelowTrailing
        statsDense
        stats={[
          { key: 'listened', icon: Waves, label: 'Tempo ouvido', value: formatListeningHours(totalListenedSeconds), accent: 'blue' },
          {
            key: 'lib',
            icon: Library,
            label: 'Biblioteca',
            value: String(library.length).padStart(2, '0'),
            accent: 'indigo',
            valueClassName: 'text-amber-300',
          },
          {
            key: 'fav',
            icon: Star,
            label: 'Favoritos',
            value: String(favorites.length).padStart(2, '0'),
            accent: 'emerald',
            className: 'col-span-2 sm:col-span-1',
          },
        ]}
        statGridClassName="grid min-h-0 w-full min-w-0 shrink-0 grid-cols-2 gap-1.5 sm:grid-cols-3 sm:gap-2 [&>*]:min-w-0 [&>*]:self-stretch"
        trailingWrapClassName="lg:ml-auto lg:w-full lg:max-w-none xl:w-auto xl:max-w-[min(100%,40rem)] xl:shrink-0"
        trailing={
          activeBook?.linkedDiscipline ? (
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end sm:gap-2">
              <button
                type="button"
                onClick={() => onOpenDiscipline?.(activeBook.linkedDiscipline)}
                className={`${PAGE_HEAD_PREMIUM_PRIMARY_ACTION_CLASS} w-full sm:w-auto`}
              >
                <BookOpen size={14} aria-hidden />
                Abrir disciplina
              </button>
            </div>
          ) : null
        }
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.35fr)_360px]">
        <div className="flex flex-col gap-6">
          <div className="relative overflow-hidden rounded-xl border border-ink-800 bg-gradient-to-br from-ink-900 via-ink-800 to-ink-900 p-6 text-white shadow-md sm:p-8 lg:p-10">
            <div className="absolute -right-10 -top-8 h-72 w-72 rounded-full bg-blue-400/15 blur-3xl" />
            <div className="absolute bottom-0 left-0 h-52 w-52 rounded-full bg-indigo-400/10 blur-3xl" />

            <div className="relative z-10">
              <div className="flex flex-col gap-8 lg:flex-row lg:items-center">
                <div className="mx-auto flex h-40 w-40 shrink-0 items-center justify-center rounded-[2rem] border border-white/10 bg-gradient-to-br from-blue-500 to-indigo-600 shadow-[0_18px_40px_rgba(37,99,235,0.35)] sm:h-44 sm:w-44 lg:mx-0">
                  <BookOpen size={62} className="text-white/90" />
                </div>

                <div className="min-w-0 flex-1 text-center lg:text-left">
                  <div className="inline-flex items-center gap-2 rounded-full border border-blue-300/20 bg-blue-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-200">
                    <Sparkles size={12} />
                    ouvindo agora
                  </div>

                  <h3 className="mt-4 text-2xl font-semibold leading-tight tracking-tight text-white sm:text-3xl lg:text-4xl">
                    {activeBook?.title || 'Selecione um audiolivro'}
                  </h3>

                  <p className="mt-3 text-base font-bold text-blue-100">
                    {activeTrack?.title || 'Nenhuma faixa selecionada'}
                  </p>

                  <p className="mt-1 text-sm font-medium text-blue-300">
                    {activeBook?.linkedTopic?.nome || activeBook?.materialLabel || 'Sem material vinculado'}
                  </p>

                  <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {playerMeta.map((item) => (
                      <PlayerMeta key={item.label} label={item.label} value={item.value} />
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-8 rounded-[2rem] border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
                <div className="flex flex-col gap-3">
                  <input
                    type="range"
                    min={0}
                    max={Math.max(activeDuration, 1)}
                    value={Math.min(activeCurrentTime, Math.max(activeDuration, 1))}
                    onChange={handleTimelineChange}
                    className="h-3 w-full cursor-pointer appearance-none rounded-full bg-black/25 accent-blue-500"
                  />

                  <div className="flex items-center justify-between text-xs font-bold tabular-nums text-blue-200">
                    <span>{formatClock(activeCurrentTime)}</span>
                    <span>{formatClock(activeDuration)}</span>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between gap-4">
                  <button
                    type="button"
                    onClick={handleChangePlaybackRate}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-blue-100 transition-all duration-300 hover:bg-white/10"
                  >
                    <span className="rounded-md border border-current px-1.5 py-0.5 text-[11px] leading-none">
                      {Number(audiobookState.playbackRate || DEFAULT_AUDIOBOOK_PLAYBACK_RATE).toFixed(2).replace('.00', '').replace('.', ',')}x
                    </span>
                  </button>

                  <div className="flex items-center gap-3 sm:gap-5">
                    <button
                      type="button"
                      onClick={() => handleSeekRelative(-SEEK_INTERVAL_SECONDS)}
                      className="flex h-12 w-12 items-center justify-center rounded-full text-white/80 transition-all duration-300 hover:scale-105 hover:bg-white/10 hover:text-white"
                      title={`Retroceder ${SEEK_INTERVAL_SECONDS}s`}
                    >
                      <SkipBack size={24} />
                    </button>

                    <button
                      type="button"
                      onClick={handleTogglePlay}
                      className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white/10 bg-blue-600 text-white shadow-[0_14px_30px_rgba(37,99,235,0.45)] transition-all duration-300 hover:scale-105 hover:bg-blue-500 sm:h-24 sm:w-24"
                    >
                      {isPlaying ? <Pause size={34} fill="currentColor" /> : <Play size={34} fill="currentColor" className="ml-1.5" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSeekRelative(SEEK_INTERVAL_SECONDS)}
                      className="flex h-12 w-12 items-center justify-center rounded-full text-white/80 transition-all duration-300 hover:scale-105 hover:bg-white/10 hover:text-white"
                      title={`Avancar ${SEEK_INTERVAL_SECONDS}s`}
                    >
                      <SkipForward size={24} />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleVolumeToggle}
                    className="flex h-12 w-12 items-center justify-center rounded-full text-white/80 transition-all duration-300 hover:bg-white/10 hover:text-white"
                    title={Number(audiobookState.volume ?? 1) === 0 ? 'Ativar volume' : 'Silenciar'}
                  >
                    <Volume2 size={22} />
                  </button>
                </div>

                {activeBook ? (
                  <div className="mt-6 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => handleToggleFavorite(activeBook.id)}
                      className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-all duration-300 ${
                        activeBook.favorite ? 'bg-amber-50 text-amber-700' : 'bg-white/10 text-white'
                      }`}
                    >
                      {activeBook.favorite ? <Star size={16} fill="currentColor" /> : <Bookmark size={16} />}
                      {activeBook.favorite ? 'Favorito' : 'Salvar'}
                    </button>

                    {activeBook.linkedDiscipline ? (
                      <button
                        type="button"
                        onClick={() => onOpenDiscipline?.(activeBook.linkedDiscipline)}
                        className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-300 hover:bg-white/15"
                      >
                        <BookOpen size={15} />
                        Abrir disciplina
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="rounded-[2.2rem] border border-ink-100 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-400">Categorias</p>
                <h3 className="mt-2 text-lg font-semibold text-ink-900">Navegação por matéria</h3>
              </div>

              <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
                <label className="relative min-w-0 flex-1 sm:min-w-[320px] lg:w-[360px]">
                  <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-400" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Buscar áudio, disciplina ou material…"
                    className="h-12 w-full rounded-2xl border border-ink-200 bg-ink-50 pl-12 pr-4 text-sm font-semibold text-ink-700 outline-none transition-all duration-300 placeholder:text-ink-400 focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => setShowFavoritesOnly((v) => !v)}
                  className={`inline-flex h-12 items-center justify-center gap-2 rounded-2xl border px-4 text-sm font-semibold transition ${
                    showFavoritesOnly
                      ? 'border-blue-300 bg-blue-50 text-blue-800'
                      : 'border-ink-200 bg-white text-ink-600 hover:border-ink-300'
                  }`}
                >
                  <Filter size={16} />
                  {showFavoritesOnly ? 'Ver todos' : 'Só favoritos'} · {favorites.length}
                </button>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              {categories.map((category) => {
                const active = activeCategory === category.name;
                return (
                  <button
                    key={category.name}
                    type="button"
                    onClick={() => setActiveCategory(category.name)}
                    className={`inline-flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-300 ${
                      active
                        ? 'bg-ink-800 text-white shadow-[0_12px_24px_rgba(23,49,84,0.18)]'
                        : 'border border-ink-200 bg-ink-50 text-ink-600 hover:bg-ink-100 hover:text-ink-900'
                    }`}
                  >
                    <span>{category.name}</span>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] ${active ? 'bg-white/10 text-white' : 'bg-white text-ink-500'}`}>
                      {category.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="overflow-hidden rounded-[2.5rem] border border-ink-100 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-ink-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-ink-900">Continuar da biblioteca</h3>
                <p className="mt-1 text-sm font-medium text-ink-500">
                  Cada item salva favoritos, faixa ativa e ponto de escuta por usuario.
                </p>
              </div>

              <div className="text-sm font-bold text-blue-700">
                {inProgressCount} em andamento
              </div>
            </div>

            <div className="divide-y divide-ink-100">
              {filteredLibrary.length > 0 ? (
                filteredLibrary.map((item) => (
                  <AudioListItem
                    key={item.id}
                    item={item}
                    isActive={item.id === activeBook?.id}
                    onContinue={() => handleContinueBook(item, true)}
                    onToggleFavorite={() => handleToggleFavorite(item.id)}
                    onSelect={() => handleContinueBook(item, false)}
                    onOpenDiscipline={() => item.linkedDiscipline && onOpenDiscipline?.(item.linkedDiscipline)}
                  />
                ))
              ) : (
                <div className="px-6 py-10 text-center">
                  <p className="text-sm font-bold text-ink-500">Nada encontrado nessa categoria.</p>
                </div>
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-[2.5rem] border border-ink-100 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-ink-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-600">
                  <ListMusic size={12} />
                  playlists
                </div>
                <h3 className="mt-3 text-lg font-semibold text-ink-900">Retomadas prontas</h3>
                <p className="mt-1 text-sm font-medium text-ink-500">
                  Blocos rapidos montados com base na sua biblioteca atual.
                </p>
              </div>
            </div>

            <div className="grid gap-4 p-6 md:grid-cols-3">
              {communityPlaylists.map((playlist) => (
                <CommunityPlaylistCard
                  key={playlist.id}
                  playlist={playlist}
                  onOpen={() => handleContinueBook(playlist.firstBook, true)}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="relative overflow-hidden rounded-[2.5rem] border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-white p-6 shadow-sm">
            <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-indigo-100 blur-2xl opacity-70" />

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-600 shadow-sm">
                <Sparkles size={12} />
                progresso por faixa
              </div>

              <h3 className="mt-4 text-2xl font-semibold tracking-tight text-ink-900">Fila ativa do player</h3>

              <p className="mt-2 text-sm font-medium leading-relaxed text-ink-500">
                A retomada acontece pela faixa exata que você deixou aberta, inclusive depois de trocar de página.
              </p>

              <div className="mt-5 space-y-3">
                {(activeBook?.tracks || []).map((track) => (
                  <TrackProgressCard
                    key={track.id}
                    track={track}
                    active={track.id === activeTrack?.id}
                    onOpen={() => selectTrack(activeBook, track, false)}
                    onPlay={() => selectTrack(activeBook, track, true)}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-[2.5rem] border border-ink-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-400">Integrações</p>
                <h3 className="mt-2 text-lg font-semibold text-ink-900">Perfil e materiais</h3>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink-100 text-ink-600">
                <User2 size={20} />
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              <IntegrationCard
                title="Conta atual"
                value={profile?.nome || profile?.username || profile?.email || 'Perfil ativo'}
                helper={`${favorites.length} favorito(s) e ${inProgressCount} áudio(s) em andamento.`}
              />
              <IntegrationCard
                title="Disciplina vinculada"
                value={activeBook?.linkedDiscipline?.nome || activeBook?.disciplineName || 'Sem disciplina encontrada'}
                helper={activeBook?.linkedTopic?.nome || activeBook?.materialLabel || 'Nenhum material relacionado no momento.'}
              />
              <IntegrationCard
                title="Base de materiais"
                value={`${bancoDisciplinas.length} disciplina(s) disponíveis no app`}
                helper="Os audiolivros tentam reaproveitar o mesmo mapa de disciplinas e tópicos."
              />
            </div>

            <div className="mt-5 flex gap-3">
              {activeBook?.linkedDiscipline ? (
                <button
                  type="button"
                  onClick={() => onOpenDiscipline?.(activeBook.linkedDiscipline)}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-ink-800 px-4 py-3 text-sm font-semibold text-white transition-all duration-300 hover:bg-ink-950"
                >
                  <BookOpen size={16} />
                  Abrir disciplina
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => onOpenProfile?.()}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-ink-200 bg-white px-4 py-3 text-sm font-semibold text-ink-700 transition-all duration-300 hover:bg-ink-50"
              >
                <User2 size={16} />
                Perfil
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlayerMeta({ label, value }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-left backdrop-blur-sm">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-200">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function AudioListItem({ item, isActive, onContinue, onToggleFavorite, onSelect, onOpenDiscipline }) {
  const styles = resolveAccentStyles(item.accent);

  return (
    <div className={`group flex flex-col gap-4 px-5 py-5 transition-all duration-300 hover:bg-ink-50 sm:flex-row sm:items-center ${isActive ? 'bg-blue-50/40' : ''}`}>
      <button
        type="button"
        onClick={onSelect}
        className={`relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl transition-all duration-300 ${styles.icon}`}
      >
        <PlayCircle size={28} className="absolute opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        <BookOpen size={22} className="transition-opacity duration-300 group-hover:opacity-0" />
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-ink-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-500">
            {item.category}
          </span>
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-600">
            {item.status}
          </span>
          {item.favorite ? (
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-600">
              Favorito
            </span>
          ) : null}
        </div>

        <h4 className={`mt-3 truncate text-base font-semibold text-ink-900 transition-colors duration-300 ${styles.text}`}>
          {item.title}
        </h4>
        <p className="mt-1 truncate text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-400">{item.subtitle}</p>
        <p className="mt-2 truncate text-sm font-semibold text-ink-500">
          {item.linkedDiscipline?.nome || item.disciplineName}
          {item.linkedTopic?.nome ? ` · ${item.linkedTopic.nome}` : ''}
        </p>

        <div className="mt-3 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-100">
            <div className={`h-full rounded-full ${styles.progress}`} style={{ width: `${item.progressPercent}%` }} />
          </div>
          <span className="text-[10px] font-semibold tabular-nums text-ink-500">{item.progressPercent}%</span>
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-between gap-3 sm:flex-col sm:items-end">
        <span className="flex items-center gap-1 text-xs font-bold text-ink-500">
          <Clock3 size={12} />
          {formatDurationLabel(item.remainingSeconds)}
        </span>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onContinue}
            className="rounded-xl bg-ink-800 px-4 py-2 text-sm font-semibold text-white transition-colors duration-300 hover:bg-ink-950"
          >
            Continuar
          </button>
          {item.linkedDiscipline ? (
            <button
              type="button"
              onClick={onOpenDiscipline}
              className="rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm font-semibold text-ink-700 transition-all duration-300 hover:bg-ink-50"
            >
              Abrir
            </button>
          ) : null}
          <button
            type="button"
            onClick={onToggleFavorite}
            className={`flex h-10 w-10 items-center justify-center rounded-2xl ${item.favorite ? 'bg-amber-50 text-amber-500' : 'bg-ink-100 text-ink-400'} transition-all duration-300 hover:scale-[1.03]`}
          >
            {item.favorite ? <Star size={17} fill="currentColor" /> : <Bookmark size={17} />}
          </button>
        </div>
      </div>
    </div>
  );
}

function CommunityPlaylistCard({ playlist, onOpen }) {
  const styles = {
    blue: 'from-blue-50 to-white border-blue-100 text-blue-700',
    indigo: 'from-indigo-50 to-white border-indigo-100 text-indigo-700',
    emerald: 'from-emerald-50 to-white border-emerald-100 text-emerald-700',
  };

  return (
    <div className={`rounded-[2rem] border bg-gradient-to-br p-5 shadow-sm ${styles[playlist.accent] || styles.blue}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-80">{playlist.items}</p>
          <h4 className="mt-2 text-base font-semibold text-ink-900">{playlist.title}</h4>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-ink-400">por {playlist.creator}</p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-current shadow-sm">
          <ListMusic size={18} />
        </div>
      </div>

      <p className="mt-4 text-sm font-medium leading-relaxed text-ink-500">{playlist.description}</p>

      <button
        type="button"
        onClick={onOpen}
        className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-ink-900 transition-all duration-300 hover:gap-3"
      >
        Abrir playlist
        <ChevronRight size={15} />
      </button>
    </div>
  );
}

function TrackProgressCard({ track, active, onOpen, onPlay }) {
  return (
    <div className={`rounded-2xl border p-4 shadow-sm transition-all duration-300 ${active ? 'border-blue-200 bg-blue-50/70' : 'border-indigo-100 bg-white'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink-900">{track.title}</p>
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-400">
            {track.durationLabel} · retomada em {formatClock(track.currentTime)}
          </p>
        </div>
        <button
          type="button"
          onClick={onPlay}
          className="flex h-10 w-10 items-center justify-center rounded-2xl bg-ink-800 text-white transition-all duration-300 hover:bg-ink-950"
        >
          {active ? <Pause size={16} /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
        </button>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-ink-100">
        <div className="h-full rounded-full bg-blue-600 transition-all duration-300" style={{ width: `${track.percent}%` }} />
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs font-bold text-ink-500">{track.percent}% ouvido</span>
        <button type="button" onClick={onOpen} className="text-xs font-semibold text-blue-700">
          Abrir faixa
        </button>
      </div>
    </div>
  );
}

function IntegrationCard({ title, value, helper }) {
  return (
    <div className="rounded-2xl border border-ink-200 bg-ink-50 px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-400">{title}</p>
      <p className="mt-2 text-sm font-semibold text-ink-800">{value}</p>
      <p className="mt-1 text-sm font-medium text-ink-500">{helper}</p>
    </div>
  );
}
