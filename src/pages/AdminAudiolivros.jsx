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
    <div className="page-shell mx-auto flex h-full w-full max-w-[1320px] flex-col gap-6">
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

      <section className="rounded-[2rem] border border-violet-100 bg-white p-6 shadow-sm">
        {feedback ? (
          <div className="mb-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
            {feedback}
          </div>
        ) : null}

        <AdminAudiobookCatalogEditor draft={draft} onDraftChange={setDraft} />

        <div className="mt-6 flex flex-wrap gap-3">
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
            className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-5 py-2.5 text-sm font-bold text-violet-900 disabled:opacity-50"
          >
            <Save size={16} />
            {saving ? 'Salvando...' : 'Salvar catálogo de audiolivros'}
          </button>
        </div>
      </section>
    </div>
  );
}
