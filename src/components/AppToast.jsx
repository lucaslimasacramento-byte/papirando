import React from 'react';

const VARIANT_INLINE = {
  success: { border: '1px solid var(--pl-success)', background: 'var(--pl-success-soft)', color: 'var(--pl-success)' },
  error:   { border: '1px solid var(--pl-danger)',  background: 'var(--pl-danger-soft)',  color: 'var(--pl-danger)'  },
  info:    { border: '1px solid var(--pl-accent)',   background: 'var(--pl-accent-soft)',   color: 'var(--pl-accent)'  },
};

export default function AppToast({ message = '', variant = 'success', className = '' }) {
  if (!String(message || '').trim()) return null;

  const tone = VARIANT_INLINE[variant] || VARIANT_INLINE.success;

  return (
    <div
      className={className}
      style={{
        pointerEvents: 'none',
        position: 'fixed',
        right: 16,
        top: 64,
        zIndex: 190,
        borderRadius: 12,
        padding: '8px 16px',
        fontSize: 13,
        fontWeight: 600,
        boxShadow: 'var(--pl-sh-mid)',
        ...tone,
      }}
    >
      {message}
    </div>
  );
}
