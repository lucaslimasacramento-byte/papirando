import React, { useEffect, useState } from 'react';
import { Headphones, Save } from 'lucide-react';
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
      <section className="rounded-[2rem] border border-violet-100 bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-wrap items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-600 text-white">
            <Headphones size={22} strokeWidth={1.75} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-600">Admin · conteúdo</p>
            <h2 className="page-title mt-1 text-3xl font-semibold tracking-tight text-slate-900">Catálogo de audiolivros</h2>
            <p className="mt-2 max-w-3xl text-sm font-medium leading-relaxed text-gray-600">
              Cadastre obras e faixas com URL de áudio. Os dados são gravados na tabela{' '}
              <code className="rounded bg-gray-100 px-1 text-xs">redacao_site_content</code>, coluna{' '}
              <code className="rounded bg-gray-100 px-1 text-xs">audiobook_catalog_json</code> — use o script{' '}
              <code className="rounded bg-gray-100 px-1 text-xs">supabase/redacao_site_content_audiobooks.sql</code> se ainda
              não existir. Sem obras válidas após salvar, o app volta ao catálogo de demonstração do código.
            </p>
          </div>
        </div>

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
