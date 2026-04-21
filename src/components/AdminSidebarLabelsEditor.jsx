import React, { useMemo, useState } from 'react';
import { RotateCcw, Save } from 'lucide-react';
import { getSidebarNavLabelSchema } from './Sidebar';

/**
 * @param {Record<string, string> | null | undefined} props.sidebarLabelsOverride mapa gravado no Supabase (só diferenças)
 * @param {(payload: Record<string, string>) => Promise<{ ok?: boolean, error?: string }>} props.onSave
 */
export function AdminSidebarLabelsEditor({ sidebarLabelsOverride, onSave }) {
  const schema = useMemo(() => getSidebarNavLabelSchema(), []);
  const [draftById, setDraftById] = useState(() => ({}));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const mergedInitial = useMemo(() => {
    const o = sidebarLabelsOverride && typeof sidebarLabelsOverride === 'object' ? sidebarLabelsOverride : {};
    const next = {};
    schema.forEach(({ id, defaultLabel }) => {
      next[id] = (typeof o[id] === 'string' && o[id].trim() ? o[id].trim() : '') || defaultLabel;
    });
    return next;
  }, [schema, sidebarLabelsOverride]);

  React.useEffect(() => {
    setDraftById(mergedInitial);
  }, [mergedInitial]);

  const buildPayloadFromDraft = () => {
    const out = {};
    schema.forEach(({ id, defaultLabel }) => {
      const v = String(draftById[id] ?? '').trim();
      if (v && v !== defaultLabel) out[id] = v;
    });
    return out;
  };

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium leading-relaxed text-gray-600">
        Os textos padrão vêm do código; aqui você grava só o que quiser substituir. Deixe igual ao padrão ou
        vazio para voltar ao texto original daquele item. É necessário ter rodado no Supabase o script{' '}
        <code className="rounded bg-gray-100 px-1 text-xs">redacao_site_content_sidebar_labels.sql</code>.
      </p>

      {message ? (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800">
          {message}
        </div>
      ) : null}

      <div className="max-h-[min(70vh,560px)] overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full min-w-[520px] border-collapse text-left text-sm">
          <thead className="sticky top-0 z-[1] bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="border-b border-gray-200 px-3 py-2.5">Seção</th>
              <th className="border-b border-gray-200 px-3 py-2.5">Id (interno)</th>
              <th className="border-b border-gray-200 px-3 py-2.5">Padrão</th>
              <th className="border-b border-gray-200 px-3 py-2.5">Nome no menu</th>
              <th className="border-b border-gray-200 px-2 py-2.5 text-center"> </th>
            </tr>
          </thead>
          <tbody>
            {schema.map((row) => (
              <tr key={row.id} className="border-b border-gray-100 last:border-0">
                <td className="px-3 py-2 text-xs font-semibold text-slate-600">{row.sectionTitle}</td>
                <td className="px-3 py-2 font-mono text-[11px] text-slate-500">{row.id}</td>
                <td className="px-3 py-2 text-xs text-slate-500">{row.defaultLabel}</td>
                <td className="px-3 py-2">
                  <input
                    type="text"
                    value={draftById[row.id] ?? ''}
                    onChange={(e) => setDraftById((prev) => ({ ...prev, [row.id]: e.target.value }))}
                    className="w-full min-w-[140px] rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500"
                    aria-label={`Nome no menu para ${row.id}`}
                  />
                </td>
                <td className="px-2 py-2 text-center">
                  <button
                    type="button"
                    title="Restaurar padrão"
                    onClick={() =>
                      setDraftById((prev) => ({
                        ...prev,
                        [row.id]: row.defaultLabel,
                      }))
                    }
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-slate-500 transition hover:bg-gray-50"
                  >
                    <RotateCcw size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={saving || !onSave}
          onClick={async () => {
            if (!onSave) return;
            setSaving(true);
            setMessage('');
            try {
              const payload = buildPayloadFromDraft();
              const r = await onSave(payload);
              setMessage(r?.ok ? 'Rótulos do menu salvos no Supabase.' : `Erro: ${r?.error || 'falha'}`);
              window.setTimeout(() => setMessage(''), 3200);
            } catch (e) {
              setMessage(String(e?.message || e));
            } finally {
              setSaving(false);
            }
          }}
          className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-5 py-2.5 text-sm font-bold text-indigo-900 disabled:opacity-50"
        >
          <Save size={16} />
          {saving ? 'Salvando…' : 'Salvar rótulos do menu'}
        </button>
      </div>
    </div>
  );
}
