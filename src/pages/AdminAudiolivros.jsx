import React, { useEffect, useState } from 'react';
import { BookMarked, Headphones, Save } from 'lucide-react';
import PageHeadPremium, { PageHeadPremiumBadge } from '../components/PageHeadPremium';
import { AdminAudiobookCatalogEditor, sanitizeAudiobooksForSave } from '../components/AdminAudiobookCatalogEditor';
import { buildDefaultAudiobookCatalog } from '../lib/audiobooks';

function stripAudiobookForDraft(book) {
  if (!book || typeof book !== 'object') return book;
  const { linkedDiscipline, linkedTopic, ...rest } = book;
  const tracks = (Array.isArray(rest.tracks) ? rest.tracks : []).map((t) => {
    if (!t || typeof t !== 'object') return t;
    const { disciplineId, ...tr } = t;
    return tr;
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
    const ab = audiobookCatalogOverride?.length ? audiobookCatalogOverride : buildDefaultAudiobookCatalog();
    setDraft(JSON.parse(JSON.stringify(ab)).map(stripAudiobookForDraft));
  }, [audiobookCatalogOverride]);

  return (
    <div className="page-shell mx-auto flex h-full w-full max-w-[1100px] flex-col gap-6 p-6">
      <PageHeadPremium
        icon={Headphones}
        badge={
          <PageHeadPremiumBadge icon={BookMarked}>Admin · conteúdo</PageHeadPremiumBadge>
        }
        title="Catálogo de audiolivros"
        titleAs="h2"
        subtitle={(
          <span>
            Cadastre obras e faixas com URL de áudio. Os dados são gravados na tabela{' '}
            <code className="rounded bg-white/10 px-1 text-[11px]">redacao_site_content</code>, coluna{' '}
            <code className="rounded bg-white/10 px-1 text-[11px]">audiobook_catalog_json</code> — use o script{' '}
            <code className="rounded bg-white/10 px-1 text-[11px]">supabase/redacao_site_content_audiobooks.sql</code> se ainda
            não existir. Sem obras válidas após salvar, a aba de audiolivros ficará vazia.
          </span>
        )}
        leadingClassName="min-w-0 flex-1"
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
                setFeedback('Inclua ao menos uma obra com faixas válidas (id, título e URL de áudio em cada faixa).');
                window.setTimeout(() => setFeedback(''), 4500);
                return;
              }
              setSaving(true);
              setFeedback('');
              try {
                const r = await onSaveAudiolivrosContent(parsed);
                setFeedback(r?.ok ? 'Catálogo de audiolivros salvo no Supabase.' : `Erro: ${r?.error || 'falha'}`);
                window.setTimeout(() => setFeedback(''), 3200);
              } catch (e) {
                setFeedback(String(e?.message || e));
              } finally {
                setSaving(false);
              }
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-5 py-2.5 text-sm font-bold text-violet-900 disabled:opacity-50"
          >
            <Save size={16} />
            {saving ? 'Salvando…' : 'Salvar catálogo de audiolivros'}
          </button>
        </div>
      </section>
    </div>
  );
}
