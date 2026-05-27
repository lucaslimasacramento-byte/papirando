import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { REDACAO_BANCA_OPTIONS } from '../data/redacaoBancaGuides';

const EIXO_OPTIONS = [
  { value: 'seguranca', label: 'Segurança pública' },
  { value: 'meio-ambiente', label: 'Meio ambiente' },
  { value: 'tecnologia', label: 'Tecnologia' },
  { value: 'sociedade', label: 'Sociedade e políticas' },
  { value: 'educacao', label: 'Educação' },
];

/**
 * @param {{ id: string, eixo: string, banca: string, title: string, description: string }[]} props.draft
 * @param {(fn: (d: unknown[]) => unknown[]) => void} props.onDraftChange
 */
export function AdminRedacaoThemeBankEditor({ draft, onDraftChange }) {
  const rows = Array.isArray(draft) ? draft : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--pl-ink-2)' }}>
          Cada item vira um card no banco de temas (aba Redações). Use o botão &quot;Salvar banco, kit e audiolivros&quot; na página de configurações.
        </p>
        <button
          type="button"
          onClick={() =>
            onDraftChange((prev) => [
              ...prev,
              { id: `t-${Date.now()}`, eixo: 'sociedade', banca: 'CESPE / CEBRASPE', title: '', description: '' },
            ])
          }
          className="pl-btn pl-btn-ghost pl-btn-sm"
          style={{ borderColor: 'var(--pl-accent)', color: 'var(--pl-accent)' }}
        >
          <Plus size={13} />
          Novo tema
        </button>
      </div>

      <div style={{ maxHeight: 'min(70vh, 520px)', overflowY: 'auto', paddingRight: 4, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {rows.map((row, index) => (
          <div key={row.id || index} className="pl-card" style={{ padding: 16 }}>
            <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <span className="pl-eyebrow">Tema {index + 1}</span>
              <button
                type="button"
                onClick={() => onDraftChange((prev) => prev.filter((_, i) => i !== index))}
                style={{ width: 34, height: 34, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, border: '1px solid var(--pl-danger-soft)', background: 'var(--pl-danger-soft)', color: 'var(--pl-danger)', cursor: 'pointer' }}
                aria-label="Remover tema"
              >
                <Trash2 size={14} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <label style={{ gridColumn: '1' }}>
                <p className="pl-eyebrow" style={{ marginBottom: 4 }}>id</p>
                <input
                  type="text"
                  value={row.id}
                  onChange={(e) => {
                    const v = e.target.value;
                    onDraftChange((prev) => prev.map((r, i) => (i === index ? { ...r, id: v } : r)));
                  }}
                  className="pl-input"
                  style={{ width: '100%', fontFamily: 'var(--pl-mono)', fontSize: 11 }}
                />
              </label>

              <label>
                <p className="pl-eyebrow" style={{ marginBottom: 4 }}>Eixo</p>
                <select
                  value={row.eixo || ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    onDraftChange((prev) => prev.map((r, i) => (i === index ? { ...r, eixo: v } : r)));
                  }}
                  className="pl-input"
                  style={{ width: '100%' }}
                >
                  {EIXO_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </label>

              <label style={{ gridColumn: '1 / -1' }}>
                <p className="pl-eyebrow" style={{ marginBottom: 4 }}>Banca</p>
                <select
                  value={row.banca || ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    onDraftChange((prev) => prev.map((r, i) => (i === index ? { ...r, banca: v } : r)));
                  }}
                  className="pl-input"
                  style={{ width: '100%' }}
                >
                  {REDACAO_BANCA_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </label>

              <label style={{ gridColumn: '1 / -1' }}>
                <p className="pl-eyebrow" style={{ marginBottom: 4 }}>Título da proposta</p>
                <input
                  type="text"
                  value={row.title}
                  onChange={(e) => {
                    const v = e.target.value;
                    onDraftChange((prev) => prev.map((r, i) => (i === index ? { ...r, title: v } : r)));
                  }}
                  className="pl-input"
                  style={{ width: '100%' }}
                />
              </label>

              <label style={{ gridColumn: '1 / -1' }}>
                <p className="pl-eyebrow" style={{ marginBottom: 4 }}>Descrição / comando</p>
                <textarea
                  rows={3}
                  value={row.description}
                  onChange={(e) => {
                    const v = e.target.value;
                    onDraftChange((prev) => prev.map((r, i) => (i === index ? { ...r, description: v } : r)));
                  }}
                  className="pl-input"
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
