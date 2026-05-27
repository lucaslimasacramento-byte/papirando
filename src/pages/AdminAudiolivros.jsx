import React, { useEffect, useMemo, useState } from 'react';
import { BookMarked, Headphones, LibraryBig, Save } from 'lucide-react';
import AdminPageHeader from '../components/AdminPageHeader';
import { AdminAudiobookCatalogEditor } from '../components/AdminAudiobookCatalogEditor';
import { sanitizeAudiobooksForSave } from '../lib/audiobookCatalogAdmin';
import { buildDefaultAudiobookCatalog } from '../lib/audiobooks';

function stripAudiobookForDraft(book) {
  if (!book || typeof book !== 'object') return book;
  const { linkedDiscipline: _linkedDiscipline, linkedTopic: _linkedTopic, ...rest } = book;
  const tracks = (Array.isArray(rest.tracks) ? rest.tracks : []).map((track) => {
    if (!track || typeof track !== 'object') return track;
    const { disciplineId: _disciplineId, ...cleanTrack } = track;
    return cleanTrack;
  });
  return { ...rest, tracks };
}

/**
 * @param {object[] | null} props.audiobookCatalogOverride catálogo vindo do Supabase (ou null = só padrão)
 * @param {(catalog: object[]) => Promise<{ ok?: boolean, error?: string }>} props.onSaveAudiolivrosContent
 */
export default function AdminAudiolivros({ audiobookCatalogOverride = null, onSaveAudiolivrosContent }) {
  const [draft, setDraft] = useState(() => []);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    const audiobooks = audiobookCatalogOverride?.length ? audiobookCatalogOverride : buildDefaultAudiobookCatalog();
    setDraft(JSON.parse(JSON.stringify(audiobooks)).map(stripAudiobookForDraft));
  }, [audiobookCatalogOverride]);

  const totalTracks = useMemo(
    () => draft.reduce((total, book) => total + (Array.isArray(book?.tracks) ? book.tracks.length : 0), 0),
    [draft]
  );

  return (
    <div className="pl-page">
      <AdminPageHeader
        icon={Headphones}
        badgeIcon={BookMarked}
        badge="Admin de conteúdo"
        title="Catálogo de audiolivros"
        subtitle="Cadastre uma obra por vez e mantenha a biblioteca editorial organizada para o app."
        stats={[
          { key: 'books', label: 'Obras no catálogo', value: String(draft.length), icon: LibraryBig, accent: 'violet' },
          { key: 'tracks', label: 'Faixas cadastradas', value: String(totalTracks), icon: Headphones, accent: 'blue' },
        ]}
      />

      <section className="pl-card" style={{ padding: 24 }}>
        {feedback ? (
          <div style={{ marginBottom: 16, borderRadius: 10, border: '1px solid var(--pl-success)', background: 'var(--pl-success-soft)', padding: '12px 16px', fontSize: 13, fontWeight: 700, color: 'var(--pl-ink)' }}>
            {feedback}
          </div>
        ) : null}

        <AdminAudiobookCatalogEditor draft={draft} onDraftChange={setDraft} />

        <div style={{ marginTop: 24, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          <button
            type="button"
            disabled={saving || !onSaveAudiolivrosContent}
            onClick={async () => {
              if (!onSaveAudiolivrosContent) return;
              const parsed = sanitizeAudiobooksForSave(draft);
              if (parsed.length === 0) {
                setFeedback('Inclua ao menos uma obra com faixas válidas: ID, título e URL de áudio em cada faixa.');
                window.setTimeout(() => setFeedback(''), 4500);
                return;
              }
              setSaving(true);
              setFeedback('');
              try {
                const result = await onSaveAudiolivrosContent(parsed);
                setFeedback(result?.ok ? 'Catálogo de audiolivros salvo no Supabase.' : `Erro: ${result?.error || 'falha'}`);
                window.setTimeout(() => setFeedback(''), 3200);
              } catch (error) {
                setFeedback(String(error?.message || error));
              } finally {
                setSaving(false);
              }
            }}
            className="pl-btn pl-btn-primary pl-btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            <Save size={16} />
            {saving ? 'Salvando...' : 'Salvar catálogo de audiolivros'}
          </button>
        </div>
      </section>
    </div>
  );
}
