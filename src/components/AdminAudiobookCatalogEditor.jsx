import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

const ACCENTS = [
  { value: 'blue', label: 'Azul' },
  { value: 'indigo', label: 'Índigo' },
  { value: 'emerald', label: 'Esmeralda' },
];

function inputCls() {
  return 'mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-800 outline-none focus:border-violet-500';
}

/**
 * @param {object[]} props.draft
 * @param {(fn: (d: object[]) => object[]) => void} props.onDraftChange
 */
export function AdminAudiobookCatalogEditor({ draft, onDraftChange }) {
  const books = Array.isArray(draft) ? draft : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium text-gray-600">
          Obras e faixas com URL de áudio. O app liga <strong>disciplina</strong> pelo nome, se existir no banco do aluno.
        </p>
        <button
          type="button"
          onClick={() =>
            onDraftChange((prev) => [
              ...prev,
              {
                id: `livro-${Date.now()}`,
                title: 'Nova obra',
                subtitle: '',
                category: 'Geral',
                accent: 'blue',
                disciplineName: '',
                materialLabel: '',
                description: '',
                tracks: [
                  {
                    id: `faixa-${Date.now()}`,
                    title: 'Faixa 1',
                    durationLabel: '5 min',
                    audioUrl: '',
                  },
                ],
              },
            ])
          }
          className="inline-flex items-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-900"
        >
          <Plus size={14} />
          Nova obra
        </button>
      </div>

      <div className="max-h-[min(72vh,560px)] space-y-4 overflow-y-auto pr-1">
        {books.map((book, bi) => (
          <div key={book.id || bi} className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-violet-600">Obra {bi + 1}</span>
              <button
                type="button"
                onClick={() => onDraftChange((prev) => prev.filter((_, i) => i !== bi))}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-100 bg-red-50 text-red-600"
                aria-label="Remover obra"
              >
                <Trash2 size={15} />
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">id</span>
                <input
                  type="text"
                  value={book.id}
                  onChange={(e) =>
                    onDraftChange((prev) => prev.map((b, i) => (i === bi ? { ...b, id: e.target.value } : b)))
                  }
                  className={`${inputCls()} font-mono text-xs`}
                />
              </label>
              <label>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Categoria</span>
                <input
                  type="text"
                  value={book.category || ''}
                  onChange={(e) =>
                    onDraftChange((prev) => prev.map((b, i) => (i === bi ? { ...b, category: e.target.value } : b)))
                  }
                  className={inputCls()}
                />
              </label>
              <label>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Cor (UI)</span>
                <select
                  value={book.accent || 'blue'}
                  onChange={(e) =>
                    onDraftChange((prev) => prev.map((b, i) => (i === bi ? { ...b, accent: e.target.value } : b)))
                  }
                  className={inputCls()}
                >
                  {ACCENTS.map((a) => (
                    <option key={a.value} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="sm:col-span-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Título</span>
                <input
                  type="text"
                  value={book.title}
                  onChange={(e) =>
                    onDraftChange((prev) => prev.map((b, i) => (i === bi ? { ...b, title: e.target.value } : b)))
                  }
                  className={inputCls()}
                />
              </label>
              <label className="sm:col-span-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Subtítulo</span>
                <input
                  type="text"
                  value={book.subtitle || ''}
                  onChange={(e) =>
                    onDraftChange((prev) => prev.map((b, i) => (i === bi ? { ...b, subtitle: e.target.value } : b)))
                  }
                  className={inputCls()}
                />
              </label>
              <label className="sm:col-span-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Nome da disciplina (ligação)</span>
                <input
                  type="text"
                  value={book.disciplineName || ''}
                  onChange={(e) =>
                    onDraftChange((prev) =>
                      prev.map((b, i) => (i === bi ? { ...b, disciplineName: e.target.value } : b))
                    )
                  }
                  className={inputCls()}
                  placeholder="Ex.: Direito Constitucional"
                />
              </label>
              <label className="sm:col-span-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Rótulo do material</span>
                <input
                  type="text"
                  value={book.materialLabel || ''}
                  onChange={(e) =>
                    onDraftChange((prev) =>
                      prev.map((b, i) => (i === bi ? { ...b, materialLabel: e.target.value } : b))
                    )
                  }
                  className={inputCls()}
                />
              </label>
              <label className="sm:col-span-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Descrição</span>
                <textarea
                  rows={2}
                  value={book.description || ''}
                  onChange={(e) =>
                    onDraftChange((prev) =>
                      prev.map((b, i) => (i === bi ? { ...b, description: e.target.value } : b))
                    )
                  }
                  className={inputCls()}
                />
              </label>
            </div>

            <div className="mt-4 border-t border-gray-100 pt-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Faixas</span>
                <button
                  type="button"
                  onClick={() =>
                    onDraftChange((prev) =>
                      prev.map((b, i) =>
                        i === bi
                          ? {
                              ...b,
                              tracks: [
                                ...(b.tracks || []),
                                {
                                  id: `${b.id}-f-${Date.now()}`,
                                  title: 'Nova faixa',
                                  durationLabel: '5 min',
                                  audioUrl: '',
                                },
                              ],
                            }
                          : b
                      )
                    )
                  }
                  className="text-xs font-bold text-violet-700 hover:underline"
                >
                  + Faixa
                </button>
              </div>
              <ul className="space-y-3">
                {(book.tracks || []).map((tr, ti) => (
                  <li key={tr.id || ti} className="rounded-xl border border-gray-100 bg-gray-50/80 p-3">
                    <div className="mb-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() =>
                          onDraftChange((prev) =>
                            prev.map((b, i) =>
                              i === bi
                                ? { ...b, tracks: (b.tracks || []).filter((_, j) => j !== ti) }
                                : b
                            )
                          )
                        }
                        className="text-xs font-bold text-red-600 hover:underline"
                      >
                        Remover faixa
                      </button>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <label className="sm:col-span-2">
                        <span className="text-[10px] font-semibold text-gray-400">URL do áudio (https ou /assets/...)</span>
                        <input
                          type="text"
                          value={tr.audioUrl || ''}
                          onChange={(e) =>
                            onDraftChange((prev) =>
                              prev.map((b, i) => {
                                if (i !== bi) return b;
                                const tracks = (b.tracks || []).map((t, j) =>
                                  j === ti ? { ...t, audioUrl: e.target.value } : t
                                );
                                return { ...b, tracks };
                              })
                            )
                          }
                          className={inputCls()}
                          placeholder="https://..."
                        />
                      </label>
                      <label>
                        <span className="text-[10px] font-semibold text-gray-400">id da faixa</span>
                        <input
                          type="text"
                          value={tr.id}
                          onChange={(e) =>
                            onDraftChange((prev) =>
                              prev.map((b, i) => {
                                if (i !== bi) return b;
                                const tracks = (b.tracks || []).map((t, j) =>
                                  j === ti ? { ...t, id: e.target.value } : t
                                );
                                return { ...b, tracks };
                              })
                            )
                          }
                          className={`${inputCls()} font-mono text-xs`}
                        />
                      </label>
                      <label>
                        <span className="text-[10px] font-semibold text-gray-400">Duração (rótulo)</span>
                        <input
                          type="text"
                          value={tr.durationLabel || ''}
                          onChange={(e) =>
                            onDraftChange((prev) =>
                              prev.map((b, i) => {
                                if (i !== bi) return b;
                                const tracks = (b.tracks || []).map((t, j) =>
                                  j === ti ? { ...t, durationLabel: e.target.value } : t
                                );
                                return { ...b, tracks };
                              })
                            )
                          }
                          className={inputCls()}
                          placeholder="8 min"
                        />
                      </label>
                      <label className="sm:col-span-2">
                        <span className="text-[10px] font-semibold text-gray-400">Título da faixa</span>
                        <input
                          type="text"
                          value={tr.title}
                          onChange={(e) =>
                            onDraftChange((prev) =>
                              prev.map((b, i) => {
                                if (i !== bi) return b;
                                const tracks = (b.tracks || []).map((t, j) =>
                                  j === ti ? { ...t, title: e.target.value } : t
                                );
                                return { ...b, tracks };
                              })
                            )
                          }
                          className={inputCls()}
                        />
                      </label>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
