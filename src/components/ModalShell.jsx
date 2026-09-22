import React from 'react';

// Casca de modal e campo de texto usados pelas telas de curso/objetivo. Ficavam soltos
// dentro de Planos.jsx; saíram para cá quando o modal de personalizar o curso passou a ser
// usado também em Objetivos.

export function ModalShell({ title, subtitle, children, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.55)', padding: 16, backdropFilter: 'blur(4px)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '88vh', width: '100%', maxWidth: 860, overflow: 'hidden', borderRadius: 16, background: 'var(--pl-surface)', border: '1px solid var(--pl-rule-2)', boxShadow: 'var(--pl-sh-high)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, borderBottom: '1px solid var(--pl-rule)', padding: '20px 24px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--pl-ink)' }}>{title}</h3>
            {subtitle && <p style={{ margin: '6px 0 0', fontSize: 13, fontWeight: 500, color: 'var(--pl-ink-3)', lineHeight: 1.5 }}>{subtitle}</p>}
          </div>
          <button onClick={onClose} className="pl-btn pl-btn-sm" style={{ flexShrink: 0 }}>Fechar</button>
        </div>
        <div style={{ overflowY: 'auto', padding: '20px 24px' }}>{children}</div>
      </div>
    </div>
  );
}

export function InputField({ label, value, onChange, placeholder = '' }) {
  return (
    <div>
      <label className="pl-eyebrow" style={{ display: 'block', marginBottom: 6 }}>{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-input"
        style={{ width: '100%', boxSizing: 'border-box' }}
      />
    </div>
  );
}
