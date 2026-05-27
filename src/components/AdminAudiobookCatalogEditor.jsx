import React, { useEffect, useMemo, useState } from 'react';
import { BookMarked, Plus, Trash2 } from 'lucide-react';

const ACCENTS = [
  { value: 'blue', label: 'Azul' },
  { value: 'indigo', label: 'Índigo' },
  { value: 'emerald', label: 'Esmeralda' },
];

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
    <div style={{ display: 'grid', gap: 24, gridTemplateColumns: '320px minmax(0,1fr)' }}>
      <aside style={{ borderRadius: 20, border: '1px solid var(--pl-rule-2)', background: 'var(--pl-bg-soft)', padding: 16 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderBottom: '1px solid var(--pl-rule-2)', paddingBottom: 16 }}>
          <div>
            <p className="pl-eyebrow" style={{ marginBottom: 8 }}>Biblioteca</p>
            <h3 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: 'var(--pl-ink)' }}>Obras salvas</h3>
          </div>
          <button
            type="button"
            onClick={addBook}
            className="pl-btn pl-btn-ghost pl-btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Plus size={14} />
            Nova obra
          </button>
        </div>

        <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="pl-card" style={{ padding: '12px 16px' }}>
            <p className="pl-eyebrow" style={{ marginBottom: 8 }}>Obras</p>
            <p className="pl-num" style={{ fontSize: 22, color: 'var(--pl-ink)' }}>{books.length}</p>
          </div>
          <div className="pl-card" style={{ padding: '12px 16px' }}>
            <p className="pl-eyebrow" style={{ marginBottom: 8 }}>Faixas</p>
            <p className="pl-num" style={{ fontSize: 22, color: 'var(--pl-ink)' }}>{totalTracks}</p>
          </div>
        </div>

        <p style={{ marginTop: 16, fontSize: 13, fontWeight: 500, lineHeight: 1.6, color: 'var(--pl-ink-2)' }}>
          Cadastre uma obra por vez. A lista lateral vira o índice do catálogo já salvo no rascunho atual.
        </p>

        <div style={{ marginTop: 16, maxHeight: 'min(62vh,680px)', overflowY: 'auto', paddingRight: 4, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {books.map((book, index) => {
            const meta = getBookMeta(book, index);
            const isActive = index === selectedIndex;
            return (
              <button
                key={book.id || index}
                type="button"
                onClick={() => setSelectedIndex(index)}
                style={{
                  width: '100%', borderRadius: 14, padding: '14px 16px', textAlign: 'left',
                  border: isActive ? '1px solid var(--pl-accent)' : '1px solid var(--pl-rule-2)',
                  background: isActive ? 'var(--pl-surface)' : 'var(--pl-bg-soft)',
                  boxShadow: isActive ? 'var(--pl-sh-low)' : 'none',
                  cursor: 'pointer', transition: 'all .12s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--pl-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{meta.title}</p>
                    <p style={{ margin: '4px 0 0', fontSize: 12, fontWeight: 500, color: 'var(--pl-ink-2)' }}>{meta.category}</p>
                  </div>
                  <span className="pl-tag" style={{ flexShrink: 0, fontSize: 10 }}>
                    {meta.trackCount} faixas
                  </span>
                </div>
              </button>
            );
          })}

          {books.length === 0 && (
            <div style={{ borderRadius: 14, border: '1px dashed var(--pl-rule-strong)', background: 'var(--pl-bg-soft)', padding: '32px 16px', textAlign: 'center' }}>
              <BookMarked style={{ margin: '0 auto', color: 'var(--pl-accent)' }} size={20} />
              <p style={{ marginTop: 12, fontSize: 13, fontWeight: 600, color: 'var(--pl-ink)' }}>Nenhuma obra cadastrada</p>
              <p style={{ marginTop: 4, fontSize: 12, fontWeight: 500, color: 'var(--pl-ink-2)' }}>Crie a primeira obra para começar o catálogo.</p>
            </div>
          )}
        </div>
      </aside>

      <section className="pl-card" style={{ padding: 24, boxShadow: 'var(--pl-sh-low)' }}>
        {selectedBook ? (
          <>
            <div style={{ marginBottom: 24, display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, borderBottom: '1px solid var(--pl-rule)', paddingBottom: 16 }}>
              <div>
                <p className="pl-eyebrow" style={{ marginBottom: 8 }}>Editor da obra</p>
                <h3 style={{ margin: 0, fontSize: 22, fontWeight: 600, color: 'var(--pl-ink)' }}>{selectedBook.title || 'Nova obra'}</h3>
                <p style={{ marginTop: 8, fontSize: 13, fontWeight: 500, color: 'var(--pl-ink-2)' }}>
                  Ajuste os dados principais e depois organize as faixas de áudio da obra selecionada.
                </p>
              </div>
              <button
                type="button"
                onClick={removeSelectedBook}
                className="pl-btn pl-btn-ghost pl-btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--pl-danger)', borderColor: 'var(--pl-danger-soft)' }}
              >
                <Trash2 size={15} />
                Remover obra
              </button>
            </div>

            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}>
              <label>
                <span className="pl-eyebrow" style={{ display: 'block', marginBottom: 4 }}>ID</span>
                <input
                  type="text"
                  value={selectedBook.id}
                  onChange={(e) => updateSelectedBook((book) => ({ ...book, id: e.target.value }))}
                  className="pl-input"
                  style={{ fontFamily: 'var(--pl-mono)', fontSize: 12 }}
                />
              </label>
              <label>
                <span className="pl-eyebrow" style={{ display: 'block', marginBottom: 4 }}>Categoria</span>
                <input
                  type="text"
                  value={selectedBook.category || ''}
                  onChange={(e) => updateSelectedBook((book) => ({ ...book, category: e.target.value }))}
                  className="pl-input"
                />
              </label>
              <label>
                <span className="pl-eyebrow" style={{ display: 'block', marginBottom: 4 }}>Cor da interface</span>
                <select
                  value={selectedBook.accent || 'blue'}
                  onChange={(e) => updateSelectedBook((book) => ({ ...book, accent: e.target.value }))}
                  className="pl-input"
                >
                  {ACCENTS.map((accent) => (
                    <option key={accent.value} value={accent.value}>
                      {accent.label}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ gridColumn: '1 / -1' }}>
                <span className="pl-eyebrow" style={{ display: 'block', marginBottom: 4 }}>Título</span>
                <input
                  type="text"
                  value={selectedBook.title}
                  onChange={(e) => updateSelectedBook((book) => ({ ...book, title: e.target.value }))}
                  className="pl-input"
                />
              </label>
              <label style={{ gridColumn: '1 / -1' }}>
                <span className="pl-eyebrow" style={{ display: 'block', marginBottom: 4 }}>Subtítulo</span>
                <input
                  type="text"
                  value={selectedBook.subtitle || ''}
                  onChange={(e) => updateSelectedBook((book) => ({ ...book, subtitle: e.target.value }))}
                  className="pl-input"
                />
              </label>
              <label style={{ gridColumn: '1 / -1' }}>
                <span className="pl-eyebrow" style={{ display: 'block', marginBottom: 4 }}>Disciplina vinculada</span>
                <input
                  type="text"
                  value={selectedBook.disciplineName || ''}
                  onChange={(e) => updateSelectedBook((book) => ({ ...book, disciplineName: e.target.value }))}
                  className="pl-input"
                  placeholder="Ex.: Direito Constitucional"
                />
              </label>
              <label style={{ gridColumn: '1 / -1' }}>
                <span className="pl-eyebrow" style={{ display: 'block', marginBottom: 4 }}>Rótulo do material</span>
                <input
                  type="text"
                  value={selectedBook.materialLabel || ''}
                  onChange={(e) => updateSelectedBook((book) => ({ ...book, materialLabel: e.target.value }))}
                  className="pl-input"
                />
              </label>
              <label style={{ gridColumn: '1 / -1' }}>
                <span className="pl-eyebrow" style={{ display: 'block', marginBottom: 4 }}>Descrição</span>
                <textarea
                  rows={3}
                  value={selectedBook.description || ''}
                  onChange={(e) => updateSelectedBook((book) => ({ ...book, description: e.target.value }))}
                  className="pl-input"
                />
              </label>
            </div>

            <div style={{ marginTop: 24, borderTop: '1px solid var(--pl-rule)', paddingTop: 20 }}>
              <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <p className="pl-eyebrow" style={{ marginBottom: 4 }}>Faixas</p>
                  <h4 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: 'var(--pl-ink)' }}>
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
                  className="pl-btn pl-btn-ghost pl-btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <Plus size={14} />
                  Nova faixa
                </button>
              </div>

              <ul style={{ display: 'flex', flexDirection: 'column', gap: 12, listStyle: 'none', margin: 0, padding: 0 }}>
                {(selectedBook.tracks || []).map((track, trackIndex) => (
                  <li key={track.id || trackIndex} className="pl-card" style={{ padding: 16, background: 'var(--pl-bg-soft)' }}>
                    <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--pl-ink)' }}>{track.title || `Faixa ${trackIndex + 1}`}</p>
                      <button
                        type="button"
                        onClick={() =>
                          updateSelectedBook((book) => ({
                            ...book,
                            tracks: (book.tracks || []).filter((_, index) => index !== trackIndex),
                          }))
                        }
                        style={{ fontSize: 12, fontWeight: 600, color: 'var(--pl-danger)', background: 'none', border: 0, cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        Remover faixa
                      </button>
                    </div>

                    <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}>
                      <label style={{ gridColumn: '1 / -1' }}>
                        <span className="pl-eyebrow" style={{ display: 'block', marginBottom: 4 }}>URL do áudio</span>
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
                          className="pl-input"
                          placeholder="https://..."
                        />
                      </label>
                      <label>
                        <span className="pl-eyebrow" style={{ display: 'block', marginBottom: 4 }}>ID da faixa</span>
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
                          className="pl-input"
                          style={{ fontFamily: 'var(--pl-mono)', fontSize: 12 }}
                        />
                      </label>
                      <label>
                        <span className="pl-eyebrow" style={{ display: 'block', marginBottom: 4 }}>Duração</span>
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
                          className="pl-input"
                          placeholder="8 min"
                        />
                      </label>
                      <label style={{ gridColumn: '1 / -1' }}>
                        <span className="pl-eyebrow" style={{ display: 'block', marginBottom: 4 }}>Título da faixa</span>
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
                          className="pl-input"
                        />
                      </label>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', minHeight: 420, alignItems: 'center', justifyContent: 'center', borderRadius: 16, border: '1px dashed var(--pl-rule-2)', background: 'var(--pl-bg-soft)', padding: 24, textAlign: 'center' }}>
            <div>
              <BookMarked style={{ margin: '0 auto', color: 'var(--pl-accent)' }} size={24} />
              <h3 style={{ marginTop: 16, fontSize: 20, fontWeight: 600, color: 'var(--pl-ink)' }}>Selecione uma obra</h3>
              <p style={{ marginTop: 8, fontSize: 13, fontWeight: 500, color: 'var(--pl-ink-2)' }}>Escolha um item na biblioteca lateral ou crie uma nova obra.</p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
