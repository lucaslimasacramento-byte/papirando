import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

/**
 * Editor estruturado do `kit_json` (visão, conectivos, frases, modelos).
 * O controle fica no pai; este componente só emite alterações imutáveis.
 *
 * @param {{ visaoFinal: object, conectivos: object[], frasesProntas: object[], modelos: object[] }} props.draft
 * @param {(fn: (d: object) => object) => void} props.onDraftChange — mesmo padrão do setState do React.
 */
export function AdminRedacaoKitEditor({ draft, onDraftChange }) {
  const vf = draft?.visaoFinal || { titulo: '', subtitulo: '', checklist: [] };
  const conectivos = Array.isArray(draft?.conectivos) ? draft.conectivos : [];
  const frases = Array.isArray(draft?.frasesProntas) ? draft.frasesProntas : [];
  const modelos = Array.isArray(draft?.modelos) ? draft.modelos : [];

  return (
    <div className="space-y-10">
      <div className="rounded-2xl border border-sky-100 bg-sky-50/40 p-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sky-700">Visão do kit (metadados)</p>
        <p className="mt-1 text-xs font-medium text-ink-600">
          Esse bloco não aparece mais na aba Dicas do aluno; serve para organizar o material e exportação. Checklist pode virar referência interna ou futura landing.
        </p>
        <label className="mt-4 block">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">Título</span>
          <input
            type="text"
            value={vf.titulo}
            onChange={(e) =>
              onDraftChange((d) => ({
                ...d,
                visaoFinal: { ...d.visaoFinal, titulo: e.target.value },
              }))
            }
            className="mt-1 w-full rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-sm font-semibold text-ink-800 outline-none focus:border-blue-600"
          />
        </label>
        <label className="mt-3 block">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">Subtítulo</span>
          <textarea
            rows={3}
            value={vf.subtitulo}
            onChange={(e) =>
              onDraftChange((d) => ({
                ...d,
                visaoFinal: { ...d.visaoFinal, subtitulo: e.target.value },
              }))
            }
            className="mt-1 w-full rounded-xl border border-ink-200 bg-white px-3 py-2.5 text-sm font-medium leading-relaxed text-ink-700 outline-none focus:border-blue-600"
          />
        </label>
        <div className="mt-4">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">Checklist</span>
          <ul className="mt-2 space-y-2">
            {(vf.checklist || []).map((line, i) => (
              <li key={`chk-${i}`} className="flex gap-2">
                <input
                  type="text"
                  value={line}
                  onChange={(e) => {
                    const v = e.target.value;
                    onDraftChange((d) => ({
                      ...d,
                      visaoFinal: {
                        ...d.visaoFinal,
                        checklist: d.visaoFinal.checklist.map((c, j) => (j === i ? v : c)),
                      },
                    }));
                  }}
                  className="min-w-0 flex-1 rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm font-medium text-ink-800 outline-none focus:border-blue-600"
                />
                <button
                  type="button"
                  onClick={() =>
                    onDraftChange((d) => ({
                      ...d,
                      visaoFinal: {
                        ...d.visaoFinal,
                        checklist: d.visaoFinal.checklist.filter((_, j) => j !== i),
                      },
                    }))
                  }
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-600"
                  aria-label="Remover linha"
                >
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() =>
              onDraftChange((d) => ({
                ...d,
                visaoFinal: { ...d.visaoFinal, checklist: [...(d.visaoFinal.checklist || []), ''] },
              }))
            }
            className="mt-3 inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-white px-4 py-2 text-xs font-bold text-sky-900"
          >
            <Plus size={14} />
            Linha no checklist
          </button>
        </div>
      </div>

      <BlocoListEditor
        title="Conectivos"
        hint="Um cartão por função. Itens: uma frase por linha (como aparece na aba Dicas)."
        list={conectivos}
        onDraftChange={onDraftChange}
        field="conectivos"
      />

      <BlocoListEditor
        title="Frases prontas"
        hint="Mesma regra: uma frase por linha dentro de cada grupo."
        list={frases}
        onDraftChange={onDraftChange}
        field="frasesProntas"
      />

      <div>
        <h4 className="text-sm font-bold text-ink-900">Modelos decoráveis</h4>
        <p className="mt-1 text-xs font-medium text-ink-500">Texto completo do modelo (faixas 4+7+7+4 etc.).</p>
        <div className="mt-4 space-y-4">
          {modelos.map((m, i) => (
            <div key={m.id || i} className="rounded-2xl border border-ink-200 bg-ink-50/70 p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">Modelo {i + 1}</span>
                <button
                  type="button"
                  onClick={() =>
                    onDraftChange((d) => ({
                      ...d,
                      modelos: d.modelos.filter((_, j) => j !== i),
                    }))
                  }
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-100 bg-red-50 text-red-600"
                  aria-label="Remover modelo"
                >
                  <Trash2 size={15} />
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="sm:col-span-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">id</span>
                  <input
                    type="text"
                    value={m.id}
                    onChange={(e) => {
                      const v = e.target.value;
                      onDraftChange((d) => ({
                        ...d,
                        modelos: d.modelos.map((x, j) => (j === i ? { ...x, id: v } : x)),
                      }));
                    }}
                    className="mt-1 w-full rounded-xl border border-ink-200 bg-white px-3 py-2 font-mono text-xs font-semibold text-ink-800 outline-none focus:border-blue-600"
                  />
                </label>
                <label className="sm:col-span-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">Título</span>
                  <input
                    type="text"
                    value={m.titulo}
                    onChange={(e) => {
                      const v = e.target.value;
                      onDraftChange((d) => ({
                        ...d,
                        modelos: d.modelos.map((x, j) => (j === i ? { ...x, titulo: v } : x)),
                      }));
                    }}
                    className="mt-1 w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm font-semibold text-ink-800 outline-none focus:border-blue-600"
                  />
                </label>
              </div>
              <label className="mt-3 block">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">Badge (opcional)</span>
                <input
                  type="text"
                  value={m.badge || ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    onDraftChange((d) => ({
                      ...d,
                      modelos: d.modelos.map((x, j) => (j === i ? { ...x, badge: v || undefined } : x)),
                    }));
                  }}
                  className="mt-1 w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-xs font-medium text-ink-700 outline-none focus:border-blue-600"
                />
              </label>
              <label className="mt-3 block">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">Corpo</span>
                <textarea
                  rows={14}
                  value={m.corpo}
                  onChange={(e) => {
                    const v = e.target.value;
                    onDraftChange((d) => ({
                      ...d,
                      modelos: d.modelos.map((x, j) => (j === i ? { ...x, corpo: v } : x)),
                    }));
                  }}
                  spellCheck={false}
                  className="mt-1 w-full rounded-xl border border-ink-200 bg-white px-3 py-2 font-mono text-xs font-medium leading-relaxed text-ink-800 outline-none focus:border-blue-600"
                />
              </label>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              onDraftChange((d) => ({
                ...d,
                modelos: [
                  ...d.modelos,
                  {
                    id: `modelo-${Date.now()}`,
                    titulo: 'Novo modelo',
                    badge: '',
                    corpo: '',
                  },
                ],
              }))
            }
            className="inline-flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-4 py-2 text-xs font-bold text-ink-800"
          >
            <Plus size={14} />
            Adicionar modelo
          </button>
        </div>
      </div>
    </div>
  );
}

function BlocoListEditor({ title, hint, list, onDraftChange, field }) {
  return (
    <div>
      <h4 className="text-sm font-bold text-ink-900">{title}</h4>
      <p className="mt-1 text-xs font-medium text-ink-500">{hint}</p>
      <div className="mt-4 space-y-4">
        {list.map((bloco, i) => (
          <div key={bloco.id || `${field}-${i}`} className="rounded-2xl border border-ink-200 bg-ink-50/70 p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">
                {title} · {i + 1}
              </span>
              <button
                type="button"
                onClick={() =>
                  onDraftChange((d) => ({
                    ...d,
                    [field]: d[field].filter((_, j) => j !== i),
                  }))
                }
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-100 bg-red-50 text-red-600"
                aria-label="Remover grupo"
              >
                <Trash2 size={15} />
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">id</span>
                <input
                  type="text"
                  value={bloco.id}
                  onChange={(e) => {
                    const v = e.target.value;
                    onDraftChange((d) => ({
                      ...d,
                      [field]: d[field].map((b, j) => (j === i ? { ...b, id: v } : b)),
                    }));
                  }}
                  className="mt-1 w-full rounded-xl border border-ink-200 bg-white px-3 py-2 font-mono text-xs font-semibold text-ink-800 outline-none focus:border-blue-600"
                />
              </label>
              <label>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">Emoji</span>
                <input
                  type="text"
                  value={bloco.emoji || ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    onDraftChange((d) => ({
                      ...d,
                      [field]: d[field].map((b, j) => (j === i ? { ...b, emoji: v || '📌' } : b)),
                    }));
                  }}
                  className="mt-1 w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-600"
                />
              </label>
            </div>
            <label className="mt-3 block">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">Título do grupo</span>
              <input
                type="text"
                value={bloco.titulo}
                onChange={(e) => {
                  const v = e.target.value;
                  onDraftChange((d) => ({
                    ...d,
                    [field]: d[field].map((b, j) => (j === i ? { ...b, titulo: v } : b)),
                  }));
                }}
                className="mt-1 w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm font-semibold text-ink-800 outline-none focus:border-blue-600"
              />
            </label>
            <label className="mt-3 block">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-400">Itens (um por linha)</span>
              <textarea
                rows={8}
                value={(bloco.itens || []).join('\n')}
                onChange={(e) => {
                  const lines = e.target.value
                    .split('\n')
                    .map((s) => s.trim())
                    .filter(Boolean);
                  onDraftChange((d) => ({
                    ...d,
                    [field]: d[field].map((b, j) => (j === i ? { ...b, itens: lines } : b)),
                  }));
                }}
                spellCheck={false}
                className="mt-1 w-full rounded-xl border border-ink-200 bg-white px-3 py-2 font-mono text-xs font-medium leading-relaxed text-ink-800 outline-none focus:border-blue-600"
              />
            </label>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            onDraftChange((d) => ({
              ...d,
              [field]: [
                ...d[field],
                { id: `novo-${Date.now()}`, titulo: 'Novo grupo', emoji: '📌', itens: [] },
              ],
            }))
          }
          className="inline-flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-4 py-2 text-xs font-bold text-ink-800"
        >
          <Plus size={14} />
          Adicionar grupo em {title}
        </button>
      </div>
    </div>
  );
}
