import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

/**
 * Editor estruturado do `kit_json` (visao, conectivos, frases, modelos).
 * O controle fica no pai; este componente so emite alteracoes imutaveis.
 *
 * @param {{ visaoFinal: object, conectivos: object[], frasesProntas: object[], modelos: object[] }} props.draft
 * @param {(fn: (d: object) => object) => void} props.onDraftChange — mesmo padrao do setState do React.
 */
export function AdminRedacaoKitEditor({ draft, onDraftChange }) {
  const vf = draft?.visaoFinal || { titulo: '', subtitulo: '', checklist: [] };
  const conectivos = Array.isArray(draft?.conectivos) ? draft.conectivos : [];
  const frases = Array.isArray(draft?.frasesProntas) ? draft.frasesProntas : [];
  const modelos = Array.isArray(draft?.modelos) ? draft.modelos : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
      <div className="pl-card" style={{ padding: 20, border: '1px solid var(--pl-accent-soft)', background: 'var(--pl-accent-soft)' }}>
        <p className="pl-eyebrow" style={{ marginBottom: 4 }}>Visao do kit (metadados)</p>
        <p style={{ marginTop: 4, fontSize: 12, fontWeight: 500, color: 'var(--pl-ink-2)' }}>
          Esse bloco nao aparece mais na aba Dicas do aluno; serve para organizar o material e exportacao. Checklist pode virar referencia interna ou futura landing.
        </p>
        <label style={{ display: 'block', marginTop: 16 }}>
          <span className="pl-eyebrow" style={{ display: 'block', marginBottom: 4 }}>Titulo</span>
          <input
            type="text"
            value={vf.titulo}
            onChange={(e) =>
              onDraftChange((d) => ({
                ...d,
                visaoFinal: { ...d.visaoFinal, titulo: e.target.value },
              }))
            }
            className="pl-input"
          />
        </label>
        <label style={{ display: 'block', marginTop: 12 }}>
          <span className="pl-eyebrow" style={{ display: 'block', marginBottom: 4 }}>Subtitulo</span>
          <textarea
            rows={3}
            value={vf.subtitulo}
            onChange={(e) =>
              onDraftChange((d) => ({
                ...d,
                visaoFinal: { ...d.visaoFinal, subtitulo: e.target.value },
              }))
            }
            className="pl-input"
          />
        </label>
        <div style={{ marginTop: 16 }}>
          <span className="pl-eyebrow" style={{ display: 'block', marginBottom: 8 }}>Checklist</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(vf.checklist || []).map((line, i) => (
              <div key={`chk-${i}`} style={{ display: 'flex', gap: 8 }}>
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
                  className="pl-input"
                  style={{ flex: 1, minWidth: 0 }}
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
                  className="pl-btn pl-btn-ghost pl-btn-sm"
                  style={{ flexShrink: 0, width: 40, height: 40, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--pl-danger)', borderColor: 'var(--pl-danger-soft)' }}
                  aria-label="Remover linha"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() =>
              onDraftChange((d) => ({
                ...d,
                visaoFinal: { ...d.visaoFinal, checklist: [...(d.visaoFinal.checklist || []), ''] },
              }))
            }
            className="pl-btn pl-btn-ghost pl-btn-sm"
            style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            <Plus size={14} />
            Linha no checklist
          </button>
        </div>
      </div>

      <BlocoListEditor
        title="Conectivos"
        hint="Um cartao por funcao. Itens: uma frase por linha (como aparece na aba Dicas)."
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
        <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--pl-ink)' }}>Modelos decoraveis</h4>
        <p style={{ marginTop: 4, fontSize: 12, fontWeight: 500, color: 'var(--pl-ink-2)' }}>Texto completo do modelo (faixas 4+7+7+4 etc.).</p>
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {modelos.map((m, i) => (
            <div key={m.id || i} className="pl-card" style={{ padding: 16, background: 'var(--pl-bg-soft)' }}>
              <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span className="pl-eyebrow">Modelo {i + 1}</span>
                <button
                  type="button"
                  onClick={() =>
                    onDraftChange((d) => ({
                      ...d,
                      modelos: d.modelos.filter((_, j) => j !== i),
                    }))
                  }
                  className="pl-btn pl-btn-ghost pl-btn-sm"
                  style={{ width: 36, height: 36, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--pl-danger)', borderColor: 'var(--pl-danger-soft)' }}
                  aria-label="Remover modelo"
                >
                  <Trash2 size={15} />
                </button>
              </div>
              <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 2fr' }}>
                <label>
                  <span className="pl-eyebrow" style={{ display: 'block', marginBottom: 4 }}>id</span>
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
                    className="pl-input"
                    style={{ fontFamily: 'var(--pl-mono)', fontSize: 12 }}
                  />
                </label>
                <label>
                  <span className="pl-eyebrow" style={{ display: 'block', marginBottom: 4 }}>Titulo</span>
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
                    className="pl-input"
                  />
                </label>
              </div>
              <label style={{ display: 'block', marginTop: 12 }}>
                <span className="pl-eyebrow" style={{ display: 'block', marginBottom: 4 }}>Badge (opcional)</span>
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
                  className="pl-input"
                />
              </label>
              <label style={{ display: 'block', marginTop: 12 }}>
                <span className="pl-eyebrow" style={{ display: 'block', marginBottom: 4 }}>Corpo</span>
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
                  className="pl-input"
                  style={{ fontFamily: 'var(--pl-mono)', fontSize: 12 }}
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
            className="pl-btn pl-btn-ghost pl-btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
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
      <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--pl-ink)' }}>{title}</h4>
      <p style={{ marginTop: 4, fontSize: 12, fontWeight: 500, color: 'var(--pl-ink-2)' }}>{hint}</p>
      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {list.map((bloco, i) => (
          <div key={bloco.id || `${field}-${i}`} className="pl-card" style={{ padding: 16, background: 'var(--pl-bg-soft)' }}>
            <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span className="pl-eyebrow">
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
                className="pl-btn pl-btn-ghost pl-btn-sm"
                style={{ width: 36, height: 36, padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--pl-danger)', borderColor: 'var(--pl-danger-soft)' }}
                aria-label="Remover grupo"
              >
                <Trash2 size={15} />
              </button>
            </div>
            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}>
              <label>
                <span className="pl-eyebrow" style={{ display: 'block', marginBottom: 4 }}>id</span>
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
                  className="pl-input"
                  style={{ fontFamily: 'var(--pl-mono)', fontSize: 12 }}
                />
              </label>
              <label>
                <span className="pl-eyebrow" style={{ display: 'block', marginBottom: 4 }}>Emoji</span>
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
                  className="pl-input"
                />
              </label>
            </div>
            <label style={{ display: 'block', marginTop: 12 }}>
              <span className="pl-eyebrow" style={{ display: 'block', marginBottom: 4 }}>Titulo do grupo</span>
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
                className="pl-input"
              />
            </label>
            <label style={{ display: 'block', marginTop: 12 }}>
              <span className="pl-eyebrow" style={{ display: 'block', marginBottom: 4 }}>Itens (um por linha)</span>
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
                className="pl-input"
                style={{ fontFamily: 'var(--pl-mono)', fontSize: 12 }}
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
          className="pl-btn pl-btn-ghost pl-btn-sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
        >
          <Plus size={14} />
          Adicionar grupo em {title}
        </button>
      </div>
    </div>
  );
}
