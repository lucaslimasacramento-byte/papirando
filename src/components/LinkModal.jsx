import React from 'react';
import { X, Trash2 } from 'lucide-react';

export default function LinkModal({ linkModalOpen, setLinkModalOpen }) {
  if (!linkModalOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(26,54,93,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--pl-surface)', borderRadius: 20, boxShadow: 'var(--pl-sh-high)', width: '100%', maxWidth: 520, padding: '28px 28px 24px', position: 'relative' }}>
        <button
          onClick={() => setLinkModalOpen(false)}
          style={{ position: 'absolute', top: 20, right: 20, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--pl-ink-3)', borderRadius: 8, padding: 4 }}
          aria-label="Fechar"
        >
          <X size={20} />
        </button>

        <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--pl-ink)', marginBottom: 24 }}>Links</h3>

        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', marginBottom: 24, padding: '8px', borderRadius: 12, border: '1px solid var(--pl-rule)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--pl-ink-3)', marginBottom: 6 }}>#1</div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--pl-ink-3)', marginBottom: 4 }}>Título</label>
            <input
              type="text"
              className="pl-input"
              placeholder="Ex: Aula de Constitucional"
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--pl-ink-3)', marginBottom: 4 }}>Link</label>
            <input
              type="text"
              className="pl-input"
              placeholder="https://..."
              style={{ width: '100%' }}
            />
          </div>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--pl-danger)', padding: '6px', borderRadius: 8, marginBottom: 2 }}>
            <Trash2 size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
          <button className="pl-btn pl-btn-ghost" style={{ borderColor: 'var(--pl-accent)', color: 'var(--pl-accent)' }}>
            Novo Link
          </button>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="pl-btn pl-btn-ghost" onClick={() => setLinkModalOpen(false)}>Cancelar</button>
            <button className="pl-btn pl-btn-primary" onClick={() => setLinkModalOpen(false)}>Salvar</button>
          </div>
        </div>
      </div>
    </div>
  );
}
