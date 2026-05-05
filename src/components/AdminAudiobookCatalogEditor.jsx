import React, { useEffect, useMemo, useState } from 'react';
import { BookMarked, Plus, Trash2 } from 'lucide-react';

const ACCENTS = [
  { value: 'blue', label: 'Azul' },
  { value: 'indigo', label: 'Índigo' },
  { value: 'emerald', label: 'Esmeralda' },
];

function inputCls() {
  return 'mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-800 outline-none focus:border-violet-500';
}

function getBookMeta(book, index) {
  const tracks = Array.isArray(book?.tracks) ? book.tracks : [];
  return {
    title: book?.title?.trim() || `Obra ${index + 1}`,
    category: book?.category?.trim() || 'Sem categoria',
    trackCount: tracks.length,
  };
}

/**
 * @param {object[]} props.draft
 * @param {(fn: (d: object[]) => object[]) => void} props.onDraftChange
 */
export function AdminAudiobookCatalogEditor({ draft, onDraftChange }) {
  const books = Array.isArray(draft) ? draft : [];
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (books.length === 0) {
      setSelectedIndex(0);
      return;
    }
    if (selectedIndex > books.length - 1) {
      setSelectedIndex(books.length - 1);
    }
  }, [books.length, selectedIndex]);

  const selectedBook = books[selectedIndex] || null;
  const totalTracks = useMemo(
    () => books.reduce((count, book) => count + (Array.isArray(book?.tracks) ? book.tracks.length : 0), 0),
    [books]
  );

  const updateSelectedBook = (updater) => {
    onDraftChange((prev) => prev.map((book, index) => (index === selectedIndex ? updater(book) : book)));
  };

  const addBook = () => {
    const newBook = {
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
    };

    onDraftChange((prev) => [...prev, newBook]);
    setSelectedIndex(books.length);
  };

  const removeSelectedBook = () => {
    onDraftChange((prev) => prev.filter((_, index) => index !== selectedIndex));
    setSelectedIndex((prev) => Math.max(0, prev - 1));
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="rounded-[1.8rem] border border-violet-100 bg-violet-50/40 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-violet-100 pb-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-500">Biblioteca</p>
            <h3 className="mt-2 text-xl font-semibold text-slate-900">Obras salvas</h3>
          </div>
          <button
            type="button"
            onClick={addBook}
            className="inline-flex items-center gap-1.5 rounded-xl border border-violet-200 bg-white px-3 py-2 text-xs font-bold text-violet-900"
          >
            <Plus size={14} />
            Nova obra
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-white/80 bg-white px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">Obras</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{books.length}</p>
          </div>
          <div className="rounded-2xl border border-white/80 bg-white px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">Faixas</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{totalTracks}</p>
          </div>
        </div>

        <p className="mt-4 text-sm font-medium leading-relaxed text-gray-600">
          Cadastre uma obra por vez. A lista lateral vira o índice do catálogo já salvo no rascunho atual.
        </p>

        <div className="mt-4 max-h-[min(62vh,680px)] space-y-3 overflow-y-auto pr-1">
          {books.map((book, index) => {
            const meta = getBookMeta(book, index);
            const isActive = index === selectedIndex;
            return (
              <button
                key={book.id || index}
                type="button"
                onClick={() => setSelectedIndex(index)}
                className={`w-full rounded-[1.4rem] border px-4 py-4 text-left transition ${
                  isActive
                    ? 'border-violet-300 bg-white shadow-sm'
                    : 'border-white/80 bg-white/75 hover:border-violet-200 hover:bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{meta.title}</p>
                    <p className="mt-1 text-xs font-medium text-gray-500">{meta.category}</p>
                  </div>
                  <div className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                    {meta.trackCount} faixas
                  </div>
                </div>
              </button>
            );
          })}

          {books.length === 0 && (
            <div className="rounded-[1.4rem] border border-dashed border-violet-200 bg-white/70 px-4 py-8 text-center">
              <BookMarked className="mx-auto text-violet-400" size={20} />
              <p className="mt-3 text-sm font-semibold text-slate-800">Nenhuma obra cadastrada</p>
              <p className="mt-1 text-xs font-medium text-gray-500">Crie a primeira obra para começar o catálogo.</p>
            </div>
          )}
        </div>
      </aside>

      <section className="rounded-[1.8rem] border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        {selectedBook ? (
          <>
            <div className="mb-6 flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 pb-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">Editor da obra</p>
                <h3 className="mt-2 text-2xl font-semibold text-slate-900">{selectedBook.title || 'Nova obra'}</h3>
                <p className="mt-2 text-sm font-medium text-gray-500">
                  Ajuste os dados principais e depois organize as faixas de áudio da obra selecionada.
                </p>
              </div>
              <button
                type="button"
                onClick={removeSelectedBook}
                className="inline-flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700"
              >
                <Trash2 size={15} />
                Remover obra
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">ID</span>
                <input
                  type="text"
                  value={selectedBook.id}
                  onChange={(e) => updateSelectedBook((book) => ({ ...book, id: e.target.value }))}
                  className={`${inputCls()} font-mono text-xs`}
                />
              </label>
              <label>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Categoria</span>
                <input
                  type="text"
                  value={selectedBook.category || ''}
                  onChange={(e) => updateSelectedBook((book) => ({ ...book, category: e.target.value }))}
                  className={inputCls()}
                />
              </label>
              <label>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Cor da interface</span>
                <select
                  value={selectedBook.accent || 'blue'}
                  onChange={(e) => updateSelectedBook((book) => ({ ...book, accent: e.target.value }))}
                  className={inputCls()}
                >
                  {ACCENTS.map((accent) => (
                    <option key={accent.value} value={accent.value}>
                      {accent.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="sm:col-span-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Título</span>
                <input
                  type="text"
                  value={selectedBook.title}
                  onChange={(e) => updateSelectedBook((book) => ({ ...book, title: e.target.value }))}
                  className={inputCls()}
                />
              </label>
              <label className="sm:col-span-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Subtítulo</span>
                <input
                  type="text"
                  value={selectedBook.subtitle || ''}
                  onChange={(e) => updateSelectedBook((book) => ({ ...book, subtitle: e.target.value }))}
                  className={inputCls()}
                />
              </label>
              <label className="sm:col-span-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Disciplina vinculada</span>
                <input
                  type="text"
                  value={selectedBook.disciplineName || ''}
                  onChange={(e) => updateSelectedBook((book) => ({ ...book, disciplineName: e.target.value }))}
                  className={inputCls()}
                  placeholder="Ex.: Direito Constitucional"
                />
              </label>
              <label className="sm:col-span-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Rótulo do material</span>
                <input
                  type="text"
                  value={selectedBook.materialLabel || ''}
                  onChange={(e) => updateSelectedBook((book) => ({ ...book, materialLabel: e.target.value }))}
                  className={inputCls()}
                />
              </label>
              <label className="sm:col-span-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Descrição</span>
                <textarea
                  rows={3}
                  value={selectedBook.description || ''}
                  onChange={(e) => updateSelectedBook((book) => ({ ...book, description: e.target.value }))}
                  className={inputCls()}
                />
              </label>
            </div>

            <div className="mt-6 border-t border-gray-100 pt-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">Faixas</p>
                  <h4 className="mt-1 text-lg font-semibold text-slate-900">
                    {(selectedBook.tracks || []).length} {(selectedBook.tracks || []).length === 1 ? 'faixa' : 'faixas'}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    updateSelectedBook((book) => ({
                      ...book,
                      tracks: [
                        ...(book.tracks || []),
                        {
                          id: `${book.id || 'livro'}-f-${Date.now()}`,
                          title: 'Nova faixa',
                          durationLabel: '5 min',
                          audioUrl: '',
                        },
                      ],
                    }))
                  }
                  className="inline-flex items-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-bold text-violet-900"
                >
                  <Plus size={14} />
                  Nova faixa
                </button>
              </div>

              <ul className="space-y-3">
                {(selectedBook.tracks || []).map((track, trackIndex) => (
                  <li key={track.id || trackIndex} className="rounded-[1.4rem] border border-gray-100 bg-gray-50/80 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-900">{track.title || `Faixa ${trackIndex + 1}`}</p>
                      <button
                        type="button"
                        onClick={() =>
                          updateSelectedBook((book) => ({
                            ...book,
                            tracks: (book.tracks || []).filter((_, index) => index !== trackIndex),
                          }))
                        }
                        className="text-xs font-semibold text-red-600 hover:underline"
                      >
                        Remover faixa
                      </button>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="sm:col-span-2">
                        <span className="text-[10px] font-semibold text-gray-400">URL do áudio</span>
                        <input
                          type="text"
                          value={track.audioUrl || ''}
                          onChange={(e) =>
                            updateSelectedBook((book) => ({
                              ...book,
                              tracks: (book.tracks || []).map((item, index) =>
                                index === trackIndex ? { ...item, audioUrl: e.target.value } : item
                              ),
                            }))
                          }
                          className={inputCls()}
                          placeholder="https://..."
                        />
                      </label>
                      <label>
                        <span className="text-[10px] font-semibold text-gray-400">ID da faixa</span>
                        <input
                          type="text"
                          value={track.id}
                          onChange={(e) =>
                            updateSelectedBook((book) => ({
                              ...book,
                              tracks: (book.tracks || []).map((item, index) =>
                                index === trackIndex ? { ...item, id: e.target.value } : item
                              ),
                            }))
                          }
                          className={`${inputCls()} font-mono text-xs`}
                        />
                      </label>
                      <label>
                        <span className="text-[10px] font-semibold text-gray-400">Duração</span>
                        <input
                          type="text"
                          value={track.durationLabel || ''}
                          onChange={(e) =>
                            updateSelectedBook((book) => ({
                              ...book,
                              tracks: (book.tracks || []).map((item, index) =>
                                index === trackIndex ? { ...item, durationLabel: e.target.value } : item
                              ),
                            }))
                          }
                          className={inputCls()}
                          placeholder="8 min"
                        />
                      </label>
                      <label className="sm:col-span-2">
                        <span className="text-[10px] font-semibold text-gray-400">Título da faixa</span>
                        <input
                          type="text"
                          value={track.title}
                          onChange={(e) =>
                            updateSelectedBook((book) => ({
                              ...book,
                              tracks: (book.tracks || []).map((item, index) =>
                                index === trackIndex ? { ...item, title: e.target.value } : item
                              ),
                            }))
                          }
                          className={inputCls()}
                        />
                      </label>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </>
        ) : (
          <div className="flex min-h-[420px] items-center justify-center rounded-[1.6rem] border border-dashed border-gray-200 bg-gray-50/60 px-6 text-center">
            <div>
              <BookMarked className="mx-auto text-violet-400" size={24} />
              <h3 className="mt-4 text-xl font-semibold text-slate-900">Selecione uma obra</h3>
              <p className="mt-2 text-sm font-medium text-gray-500">Escolha um item na biblioteca lateral ou crie uma nova obra.</p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
