/* eslint-disable react-refresh/only-export-components */
/**
 * Diálogos customizados Papirando · substitui window.confirm, window.alert e toasts
 *
 * Uso:
 *   import { showConfirm, showAlert, showToast } from '../lib/dialogs';
 *
 *   const ok = await showConfirm('Excluir?', { title: 'Atenção', danger: true });
 *   await showAlert('Preencha o nome.');
 *   showToast('Salvo com sucesso!', 'success');
 */

import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';

// ─── Modal (confirm / alert) ──────────────────────────────────────────────────

function DialogModal({ title, message, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', danger = false, alertOnly = false, onClose }) {
  const btnRef = useRef(null);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose(false);
      if (e.key === 'Enter') onClose(true);
    };
    document.addEventListener('keydown', handleKey);
    // foco no botão primário
    setTimeout(() => btnRef.current?.focus(), 50);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        background: 'rgba(20,17,13,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
        animation: 'pl-fade-in .12s ease',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(false); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dlg-title"
        style={{
          background: 'var(--pl-surface)',
          border: '1px solid var(--pl-rule-2)',
          borderRadius: 10,
          padding: '24px 24px 20px',
          width: '100%', maxWidth: 400,
          boxShadow: 'var(--pl-sh-high)',
          animation: 'pl-slide-up .14s ease',
        }}
      >
        {/* Cabeçalho */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8, flexShrink: 0,
            background: danger ? 'var(--pl-danger-soft)' : alertOnly ? 'var(--pl-warn-soft)' : 'var(--pl-accent-soft)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {danger
              ? <AlertTriangle size={18} style={{ color: 'var(--pl-danger)' }} />
              : alertOnly
              ? <Info size={18} style={{ color: 'var(--pl-warn)' }} />
              : <AlertTriangle size={18} style={{ color: 'var(--pl-accent)' }} />}
          </div>
          <div style={{ flex: 1 }}>
            {title && (
              <p id="dlg-title" style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: 'var(--pl-ink)' }}>
                {title}
              </p>
            )}
            <p style={{ margin: 0, fontSize: 13.5, color: 'var(--pl-ink-2)', lineHeight: 1.5 }}>
              {message}
            </p>
          </div>
        </div>

        {/* Botões */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          {!alertOnly && (
            <button
              type="button"
              className="pl-btn pl-btn-ghost pl-btn-sm"
              onClick={() => onClose(false)}
            >
              {cancelLabel}
            </button>
          )}
          <button
            ref={btnRef}
            type="button"
            className="pl-btn pl-btn-primary pl-btn-sm"
            onClick={() => onClose(true)}
            style={danger ? { background: 'var(--pl-danger)', borderColor: 'var(--pl-danger)' } : {}}
          >
            {alertOnly ? 'Ok' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function mountDialog(props) {
  return new Promise((resolve) => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    const handleClose = (result) => {
      root.unmount();
      container.remove();
      resolve(result);
    };

    root.render(<DialogModal {...props} onClose={handleClose} />);
  });
}

export function showConfirm(message, { title = 'Confirmar ação', confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', danger = false } = {}) {
  return mountDialog({ title, message, confirmLabel, cancelLabel, danger, alertOnly: false });
}

export function showAlert(message, { title = 'Atenção' } = {}) {
  return mountDialog({ title, message, alertOnly: true });
}

// ─── Toast (notificações transitórias) ───────────────────────────────────────

let toastRoot = null;
let toastContainer = null;
let setToastsGlobal = null;

function ToastHost() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    setToastsGlobal = setItems;
    return () => {
      if (setToastsGlobal === setItems) setToastsGlobal = null;
    };
  }, []);
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 99998,
      display: 'flex', flexDirection: 'column', gap: 8,
      pointerEvents: 'none',
    }}>
      {items.map((t) => (
        <ToastItem key={t.id} toast={t} onRemove={(id) => setItems((prev) => prev.filter((x) => x.id !== id))} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onRemove }) {
  useEffect(() => {
    const timer = setTimeout(() => onRemove(toast.id), toast.duration || 3500);
    return () => clearTimeout(timer);
  }, [toast, onRemove]);

  const icons = {
    success: <CheckCircle2 size={15} style={{ color: 'var(--pl-success)', flexShrink: 0 }} />,
    error: <XCircle size={15} style={{ color: 'var(--pl-danger)', flexShrink: 0 }} />,
    warn: <AlertTriangle size={15} style={{ color: 'var(--pl-warn)', flexShrink: 0 }} />,
    info: <Info size={15} style={{ color: 'var(--pl-accent)', flexShrink: 0 }} />,
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 14px 10px 12px',
      background: 'var(--pl-surface)',
      border: '1px solid var(--pl-rule-2)',
      borderRadius: 8,
      boxShadow: 'var(--pl-sh-mid)',
      pointerEvents: 'all',
      maxWidth: 320,
      animation: 'pl-slide-up .15s ease',
    }}>
      {icons[toast.type] || icons.info}
      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--pl-ink)', flex: 1, lineHeight: 1.4 }}>
        {toast.message}
      </span>
      <button
        type="button"
        onClick={() => onRemove(toast.id)}
        style={{ border: 0, background: 'transparent', cursor: 'pointer', color: 'var(--pl-ink-4)', padding: 2, flexShrink: 0 }}
      >
        <X size={12} />
      </button>
    </div>
  );
}

function ensureToastHost() {
  if (toastRoot) return;
  toastContainer = document.createElement('div');
  document.body.appendChild(toastContainer);
  toastRoot = createRoot(toastContainer);
  toastRoot.render(<ToastHost />);
}

let toastIdCounter = 0;

/**
 * @param {string} message
 * @param {'success'|'error'|'warn'|'info'} type
 * @param {number} [duration] ms (default 3500)
 */
export function showToast(message, type = 'info', duration = 3500) {
  ensureToastHost();
  const id = ++toastIdCounter;
  setTimeout(() => {
    if (setToastsGlobal) {
      setToastsGlobal((prev) => [...prev, { id, message, type, duration }]);
    }
  }, 0);
}
