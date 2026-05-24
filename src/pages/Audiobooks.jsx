import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AudioLines,
  BookOpen,
  ChevronRight,
  Clock3,
  Headphones,
  Library,
  ListMusic,
  Pause,
  Play,
  Search,
  SkipBack,
  SkipForward,
  Sparkles,
  Star,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  buildAudiobookLibrary,
  DEFAULT_AUDIOBOOK_PLAYBACK_RATE,
  SEEK_INTERVAL_SECONDS,
} from '../lib/audiobooks';

function formatClock(seconds) {
  const safe = Math.max(0, Math.floor(Number(seconds || 0)));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  if (h > 0) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatListeningHours(seconds) {
  const total = Math.round(Math.max(0, Number(seconds || 0)) / 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

function resolveAudiobookAudioSrc(url) {
  const u = String(url || '').trim();
  if (!u) return '';
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith('//')) return `${window.location.protocol}${u}`;
  try { return new URL(u, window.location.origin).href; } catch { return u; }
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
  const totalListenedSeconds = useMemo(
    () => library.reduce((acc, item) => acc + item.listenedDuration, 0),
    [library]
  );

  const categories = useMemo(() => {
    const counts = library.reduce((acc, item) => {
      const key = item.category || 'Geral';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, { Todos: library.length });
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [library]);

  const filteredLibrary = useMemo(() => {
    const query = search.trim().toLowerCase();
    const tokens = query.split(/\s+/).filter(Boolean);
    return library.filter((item) => {
      const matchesCategory = activeCategory === 'Todos' || item.category === activeCategory;
      const matchesFavorite = !showFavoritesOnly || item.favorite;
      const searchable = [
        item.title, item.subtitle, item.category, item.description,
        item.linkedDiscipline?.nome, item.linkedTopic?.nome,
      ].join(' ').toLowerCase();
      const matchesQuery = tokens.length === 0 || tokens.every((t) => searchable.includes(t));
      return matchesCategory && matchesQuery && matchesFavorite;
    });
  }, [activeCategory, library, search, showFavoritesOnly]);

  const activeBook = useMemo(() => {
    const direct = library.find((item) => item.id === audiobookState.activeAudiobookId);
    if (direct) return direct;
    return filteredLibrary[0] || library[0] || null;
  }, [audiobookState.activeAudiobookId, filteredLibrary, library]);

  const activeTrack = useMemo(() => {
    if (!activeBook) return null;
    return (
      activeBook.tracks.find((t) => t.id === audiobookState.activeTrackId) ||
      activeBook.nextTrack || activeBook.tracks[0] || null
    );
  }, [activeBook, audiobookState.activeTrackId]);

  const activeTrackProgress = useMemo(
    () => activeBook?.tracks.find((t) => t.id === activeTrack?.id) || null,
    [activeBook, activeTrack]
  );

  /* ─── auto-select first ─── */
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

  /* ─── audio element sync ─── */
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !activeTrack) return;
    const nextSrc = resolveAudiobookAudioSrc(activeTrack.audioUrl);
    if (nextSrc && audio.src !== nextSrc) audio.src = nextSrc;
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
      audio.play().catch((err) => {
        console.warn('Não foi possível iniciar a reprodução do audiolivro.', err);
        setIsPlaying(false);
      });
      return;
    }
    audio.pause();
  }, [activeTrack, isPlaying]);

  useEffect(() => () => { const a = audioRef.current; if (a) a.pause(); }, []);

  /* ─── persistors ─── */
  const persistProgress = (track, updates = {}) => {
    if (!track || !onSaveAudiobookState || !activeBook) return;
    onSaveAudiobookState((prev) => {
      const prevP = prev.progressByTrack?.[track.id] || {};
      const dur = Math.max(
        Number(updates.duration ?? 0),
        Number(prevP.duration || 0),
        Number(track.durationSecondsEstimate || 0),
      );
      const ct = Math.max(0, Number(updates.currentTime ?? prevP.currentTime ?? 0));
      const far = Math.max(Number(prevP.farthestTime || 0), Number(updates.farthestTime ?? ct));
      const completed = Boolean(updates.completed) || (dur > 0 && far / dur >= 0.95);
      return {
        ...prev,
        activeAudiobookId: activeBook.id,
        activeTrackId: track.id,
        progressByTrack: {
          ...(prev.progressByTrack || {}),
          [track.id]: {
            ...prevP,
            currentTime: ct,
            farthestTime: far,
            duration: dur,
            completed,
            playCount: Math.max(Number(prevP.playCount || 0), Number(updates.playCount ?? prevP.playCount ?? 0)),
            updatedAt: new Date().toISOString(),
          },
        },
      };
    });
  };

  const selectTrack = (book, track, shouldPlay = false) => {
    if (!book || !track || !onSaveAudiobookState) return;
    onSaveAudiobookState((prev) => ({ ...prev, activeAudiobookId: book.id, activeTrackId: track.id }));
    if (shouldPlay) {
      persistProgress(track, { playCount: Number(audiobookState.progressByTrack?.[track.id]?.playCount || 0) + 1 });
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
    }
  };

  const handleTogglePlay = () => {
    if (!activeBook || !activeTrack) return;
    if (!isPlaying) {
      persistProgress(activeTrack, { playCount: Number(audiobookState.progressByTrack?.[activeTrack.id]?.playCount || 0) + 1 });
    }
    setIsPlaying((prev) => !prev);
  };

  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (!audio || !activeTrack) return;
    persistProgress(activeTrack, { currentTime: audio.currentTime, farthestTime: audio.currentTime, duration: audio.duration });
  };

  const handleLoadedMetadata = () => {
    const audio = audioRef.current;
    if (!audio || !activeTrack) return;
    persistProgress(activeTrack, { currentTime: audio.currentTime, farthestTime: audio.currentTime, duration: audio.duration });
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
    if (!activeBook) { setIsPlaying(false); return; }
    const idx = activeBook.tracks.findIndex((t) => t.id === activeTrack?.id);
    const next = activeBook.tracks[idx + 1] || null;
    if (next) { selectTrack(activeBook, next, true); return; }
    setIsPlaying(false);
  };

  const handleSeekRelative = (delta) => {
    const audio = audioRef.current;
    if (!audio || !activeTrack) return;
    const next = Math.max(0, Math.min(Number(audio.duration || activeTrack.durationSecondsEstimate || 0), audio.currentTime + delta));
    audio.currentTime = next;
    persistProgress(activeTrack, { currentTime: next, farthestTime: next, duration: Number(audio.duration || activeTrack.durationSecondsEstimate || 0) });
  };

  const handleTimelineChange = (event) => {
    const audio = audioRef.current;
    if (!audio || !activeTrack) return;
    const next = Number(event.target.value || 0);
    audio.currentTime = next;
    persistProgress(activeTrack, { currentTime: next, farthestTime: next, duration: Number(audio.duration || activeTrack.durationSecondsEstimate || 0) });
  };

  const handleChangePlaybackRate = () => {
    if (!onSaveAudiobookState) return;
    const options = [1, 1.25, 1.5, 1.75, 2];
    const idx = options.findIndex((o) => o === Number(audiobookState.playbackRate || DEFAULT_AUDIOBOOK_PLAYBACK_RATE));
    const next = options[(idx + 1) % options.length];
    onSaveAudiobookState((prev) => ({ ...prev, playbackRate: next }));
  };

  const handleVolumeToggle = () => {
    if (!onSaveAudiobookState) return;
    const muted = Number(audiobookState.volume ?? 1) === 0;
    onSaveAudiobookState((prev) => ({ ...prev, volume: muted ? 1 : 0 }));
  };

  const handleToggleFavorite = (bookId) => {
    if (!bookId || !onSaveAudiobookState) return;
    onSaveAudiobookState((prev) => {
      const list = Array.isArray(prev.favorites) ? prev.favorites : [];
      const exists = list.includes(bookId);
      return { ...prev, favorites: exists ? list.filter((i) => i !== bookId) : [...list, bookId] };
    });
  };

  const handleContinueBook = (book, shouldPlay = true) => {
    if (!book) return;
    const next = book.nextTrack || book.tracks[0] || null;
    if (!next) return;
    selectTrack(book, next, shouldPlay);
  };

  const activeDuration = Number(activeTrackProgress?.duration || activeTrack?.durationSecondsEstimate || 0);
  const activeCurrentTime = Number(activeTrackProgress?.currentTime || 0);
  const activeRemaining = Math.max(0, activeDuration - activeCurrentTime);
  const playbackRate = Number(audiobookState.playbackRate || DEFAULT_AUDIOBOOK_PLAYBACK_RATE);
  const isMuted = Number(audiobookState.volume ?? 1) === 0;
  const trackIndex = activeTrack ? (activeBook?.tracks.findIndex((t) => t.id === activeTrack.id) + 1) : null;

  return (
    <div className="pl-page">
      <audio
        ref={audioRef}
        preload="metadata"
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleTrackEnd}
      />

      {/* ═══ Hero compacto ═══ */}
      <header className="pl-hero-compact">
        <div>
          <div className="lede-row">
            <div className="pl-hero-icon">
              <AudioLines size={18} strokeWidth={1.75} />
            </div>
            <span className="pl-eyebrow">Aprendizado passivo</span>
          </div>
          <h1>Audiolivros em Lei Seca<span className="dot">.</span></h1>
          <p className="subtitle">
            Sua biblioteca, player e retomada num só lugar — ouça enquanto o resto da rotina acontece.
          </p>
        </div>
        <div className="pl-hero-kpis">
          <div className="pl-hero-kpi">
            <span className="lab">Tempo ouvido</span>
            <span className="val">{formatListeningHours(totalListenedSeconds)}</span>
          </div>
          <div className="pl-hero-kpi accent">
            <span className="lab">Biblioteca</span>
            <span className="val">{String(library.length).padStart(2, '0')}</span>
          </div>
          <div className="pl-hero-kpi success">
            <span className="lab">Favoritos</span>
            <span className="val">{String(favorites.length).padStart(2, '0')}</span>
          </div>
        </div>
      </header>

      {/* ═══ Player slim ═══ */}
      <section className="pl-player">
        <div className="topline">
          <div className="cover">
            <BookOpen />
          </div>
          <div className="info">
            <span className="eyebrow">
              <Sparkles /> Ouvindo agora
            </span>
            <h2>{activeBook?.title || 'Selecione um audiolivro'}</h2>
            <p className="track">{activeTrack?.title || 'Nenhuma faixa selecionada'}</p>
            <p className="ctx">
              {activeBook?.linkedTopic?.nome || activeBook?.materialLabel || 'Sem material vinculado'}
            </p>
            <div className="meta-bar">
              <span><span className="strong">{trackIndex ? String(trackIndex).padStart(2, '0') : '--'}</span> faixa</span>
              <span className="sep">·</span>
              <span><span className="strong">{activeTrackProgress?.percent || 0}%</span> ouvido</span>
              <span className="sep">·</span>
              <span><span className="strong">{playbackRate.toFixed(2).replace('.00', '').replace('.', ',')}x</span></span>
              <span className="sep">·</span>
              <span>resta <span className="strong">{formatClock(activeRemaining)}</span></span>
            </div>
          </div>
        </div>

        <div className="timeline-row">
          <input
            type="range"
            min={0}
            max={Math.max(activeDuration, 1)}
            value={Math.min(activeCurrentTime, Math.max(activeDuration, 1))}
            onChange={handleTimelineChange}
          />
          <div className="clock">
            <span>{formatClock(activeCurrentTime)}</span>
            <span>{formatClock(activeDuration)}</span>
          </div>
        </div>

        <div className="transport">
          <div className="side">
            <button type="button" onClick={handleChangePlaybackRate} className="ctl" title="Velocidade">
              {playbackRate.toFixed(2).replace('.00', '').replace('.', ',')}x
            </button>
          </div>
          <div className="center-ctls">
            <button type="button" onClick={() => handleSeekRelative(-Number(SEEK_INTERVAL_SECONDS || 15))} className="skip" aria-label="Voltar 15s">
              <SkipBack />
            </button>
            <button type="button" onClick={handleTogglePlay} className="play-main" aria-label={isPlaying ? 'Pausar' : 'Tocar'}>
              {isPlaying ? <Pause /> : <Play />}
            </button>
            <button type="button" onClick={() => handleSeekRelative(Number(SEEK_INTERVAL_SECONDS || 15))} className="skip" aria-label="Avançar 15s">
              <SkipForward />
            </button>
          </div>
          <div className="side">
            <button type="button" onClick={handleVolumeToggle} className="ctl icon-only" aria-label={isMuted ? 'Ativar som' : 'Silenciar'}>
              {isMuted ? <VolumeX /> : <Volume2 />}
            </button>
          </div>
        </div>
      </section>

      {/* ═══ Biblioteca ═══ */}
      <section className="pl-lib-section">
        <div className="pl-lib-head-row">
          <h2>Sua biblioteca</h2>
          <div className="pl-lib-toolbar">
            <div className="pl-lib-search">
              <Search />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar áudio, disciplina ou material…"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowFavoritesOnly((v) => !v)}
              className={`pl-fav-toggle ${showFavoritesOnly ? 'active' : ''}`}
            >
              <Star /> Só favoritos · {favorites.length}
            </button>
          </div>
        </div>

        <div className="pl-cat-chips">
          {categories.map((cat) => (
            <button
              key={cat.name}
              type="button"
              onClick={() => setActiveCategory(cat.name)}
              className={`pl-cat-chip ${activeCategory === cat.name ? 'active' : ''}`}
            >
              {cat.name}
              <span className="cnt">{cat.count}</span>
            </button>
          ))}
        </div>

        <div className="pl-audio-list">
          {filteredLibrary.length === 0 ? (
            <div className="pl-audio-empty">
              <h4>Nada nessa busca.</h4>
              <p>Ajuste o filtro de categoria, limpe a busca ou desligue "Só favoritos" para ver mais.</p>
            </div>
          ) : (
            filteredLibrary.map((item) => {
              const isActive = activeBook?.id === item.id;
              return (
                <div
                  key={item.id}
                  className={`pl-audio-row ${isActive ? 'active' : ''}`}
                  onClick={() => handleContinueBook(item, false)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleContinueBook(item, false); }}
                >
                  <div className={`cover ${item.favorite ? 'fav' : ''}`}>
                    <BookOpen />
                  </div>
                  <div className="meta-col">
                    <p className="title">{item.title}</p>
                    <p className="sub">
                      {item.category}{item.subtitle ? ` · ${item.subtitle}` : ''}
                    </p>
                    {item.description ? <p className="desc">{item.description}</p> : null}
                  </div>
                  <div className="progress-col">
                    <div className="bar"><div className="fill" style={{ width: `${item.progressPercent}%` }} /></div>
                    <span className="pct">{item.progressPercent}% ouvido</span>
                  </div>
                  <div className="duration-col">
                    <Clock3 size={11} style={{ display: 'inline', marginRight: 4, verticalAlign: '-1px' }} />
                    {formatClock(item.totalDuration)}
                  </div>
                  <div className="actions" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className={`star ${item.favorite ? 'is-fav' : ''}`}
                      onClick={() => handleToggleFavorite(item.id)}
                      aria-label={item.favorite ? 'Remover dos favoritos' : 'Marcar como favorito'}
                    >
                      <Star />
                    </button>
                    <button
                      type="button"
                      className="play-btn"
                      onClick={() => handleContinueBook(item, true)}
                    >
                      <Play /> Tocar
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
