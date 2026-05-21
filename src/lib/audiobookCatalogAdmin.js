function stripLinkedFields(book) {
  if (!book || typeof book !== 'object') return book;
  const { linkedDiscipline: _linkedDiscipline, linkedTopic: _linkedTopic, ...rest } = book;
  const tracks = (Array.isArray(rest.tracks) ? rest.tracks : []).map((track) => {
    if (!track || typeof track !== 'object') return track;
    const { disciplineId: _disciplineId, ...cleanTrack } = track;
    return cleanTrack;
  });
  return { ...rest, tracks };
}

/** @param {object[]} books */
export function sanitizeAudiobooksForSave(books) {
  if (!Array.isArray(books)) return [];
  return books
    .map((raw) => {
      const book = stripLinkedFields(raw);
      const id = String(book.id || '').trim();
      const title = String(book.title || '').trim();
      if (!id || !title) return null;
      const tracks = (Array.isArray(book.tracks) ? book.tracks : [])
        .map((track) => {
          const trackId = String(track.id || '').trim();
          const trackTitle = String(track.title || '').trim();
          const durationLabel = String(track.durationLabel || '1 min').trim() || '1 min';
          const audioUrl = String(track.audioUrl || '').trim();
          if (!trackId || !trackTitle || !audioUrl) return null;
          return { id: trackId, title: trackTitle, durationLabel, audioUrl };
        })
        .filter(Boolean);
      if (!tracks.length) return null;
      return {
        id,
        title,
        subtitle: String(book.subtitle || '').trim(),
        category: String(book.category || 'Geral').trim() || 'Geral',
        accent: ['blue', 'indigo', 'emerald'].includes(book.accent) ? book.accent : 'blue',
        disciplineName: String(book.disciplineName || '').trim(),
        materialLabel: String(book.materialLabel || '').trim(),
        description: String(book.description || '').trim(),
        tracks,
      };
    })
    .filter(Boolean);
}
