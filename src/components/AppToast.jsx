import React from 'react';

const VARIANT_STYLES = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  error: 'border-rose-200 bg-rose-50 text-rose-700',
  info: 'border-brand-200 bg-brand-50 text-brand-700',
};

export default function AppToast({ message = '', variant = 'success', className = '' }) {
  if (!String(message || '').trim()) return null;

  const tone = VARIANT_STYLES[variant] || VARIANT_STYLES.success;
  const classes = `pointer-events-none fixed right-4 top-16 z-[190] rounded-xl border px-4 py-2 text-sm font-semibold shadow-md ${tone} ${className}`.trim();

  return <div className={classes}>{message}</div>;
}
