import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle, Zap } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

const VARIANTS = {
  success: {
    icon: CheckCircle2,
    bar: 'bg-emerald-500',
    iconColor: 'text-emerald-500',
    bg: 'bg-white dark:bg-zinc-900',
    border: 'border-emerald-200 dark:border-emerald-800',
    title: 'text-zinc-800 dark:text-zinc-100',
    body: 'text-zinc-500 dark:text-zinc-400',
  },
  error: {
    icon: XCircle,
    bar: 'bg-rose-500',
    iconColor: 'text-rose-500',
    bg: 'bg-white dark:bg-zinc-900',
    border: 'border-rose-200 dark:border-rose-800',
    title: 'text-zinc-800 dark:text-zinc-100',
    body: 'text-zinc-500 dark:text-zinc-400',
  },
  warning: {
    icon: AlertTriangle,
    bar: 'bg-amber-400',
    iconColor: 'text-amber-500',
    bg: 'bg-white dark:bg-zinc-900',
    border: 'border-amber-200 dark:border-amber-800',
    title: 'text-zinc-800 dark:text-zinc-100',
    body: 'text-zinc-500 dark:text-zinc-400',
  },
  info: {
    icon: Info,
    bar: 'bg-indigo-500',
    iconColor: 'text-indigo-500',
    bg: 'bg-white dark:bg-zinc-900',
    border: 'border-indigo-200 dark:border-indigo-800',
    title: 'text-zinc-800 dark:text-zinc-100',
    body: 'text-zinc-500 dark:text-zinc-400',
  },
  ai: {
    icon: Zap,
    bar: 'bg-violet-500',
    iconColor: 'text-violet-500',
    bg: 'bg-white dark:bg-zinc-900',
    border: 'border-violet-200 dark:border-violet-800',
    title: 'text-zinc-800 dark:text-zinc-100',
    body: 'text-zinc-500 dark:text-zinc-400',
  },
};

const DEFAULT_DURATION = 5000;

// ─── Context ─────────────────────────────────────────────────────────────────

const ToastContext = createContext(null);

let _globalAdd = null;
export function _setGlobalToastAdd(fn) {
  _globalAdd = fn;
}

// Override window.alert as early as possible (module load time).
// This covers alerts triggered before React mounts or in catch blocks
// that run synchronously before useEffect fires.
if (typeof window !== 'undefined') {
  const _nativeAlert = window.alert.bind(window);
  window.alert = (msg) => {
    if (_globalAdd) {
      _globalAdd({ variant: 'warning', message: String(msg || '') });
    } else {
      _nativeAlert(msg);
    }
  };
}

// ─── Single Toast Item ────────────────────────────────────────────────────────

function ToastItem({ id, variant = 'info', title, message, duration = DEFAULT_DURATION, onDismiss }) {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [progress, setProgress] = useState(100);
  const startRef = useRef(null);
  const rafRef = useRef(null);
  const v = VARIANTS[variant] || VARIANTS.info;
  const Icon = v.icon;

  const dismiss = useCallback(() => {
    setLeaving(true);
    setTimeout(() => onDismiss(id), 320);
  }, [id, onDismiss]);

  // Animate in
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  // Progress bar
  useEffect(() => {
    if (!duration) return;
    startRef.current = performance.now();

    const tick = (now) => {
      const elapsed = now - startRef.current;
      const pct = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(pct);
      if (pct > 0) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        dismiss();
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [duration, dismiss]);

  const base = `pointer-events-auto w-full max-w-sm overflow-hidden rounded-2xl border shadow-xl transition-all duration-300`;
  const state = leaving
    ? 'translate-x-full opacity-0 scale-95'
    : visible
      ? 'translate-x-0 opacity-100 scale-100'
      : 'translate-x-full opacity-0 scale-95';

  return (
    <div className={`${base} ${v.bg} ${v.border} ${state}`}>
      {/* Progress bar */}
      <div className="h-0.5 w-full bg-zinc-100 dark:bg-zinc-800">
        <div
          className={`h-full ${v.bar} transition-none`}
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex items-start gap-3 px-4 py-3.5">
        {/* Icon */}
        <div className={`mt-0.5 shrink-0 ${v.iconColor}`}>
          <Icon size={18} strokeWidth={2.2} />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          {title && (
            <p className={`text-sm font-semibold leading-tight ${v.title}`}>{title}</p>
          )}
          {message && (
            <p className={`mt-0.5 text-xs leading-relaxed ${title ? v.body : v.title} ${!title ? 'font-medium' : ''}`}>
              {message}
            </p>
          )}
        </div>

        {/* Close */}
        <button
          onClick={dismiss}
          className="shrink-0 rounded-lg p-0.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

// ─── Container ────────────────────────────────────────────────────────────────

export function ToastContainer({ toasts, onDismiss }) {
  if (!toasts.length) return null;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed right-4 top-16 z-[9999] flex flex-col-reverse items-end gap-2 sm:right-5 sm:top-20"
      style={{ maxWidth: '380px', width: 'calc(100vw - 2rem)' }}
    >
      {[...toasts].reverse().map((t) => (
        <ToastItem key={t.id} {...t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

// ─── Provider ─────────────────────────────────────────────────────────────────

let _id = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const add = useCallback((opts) => {
    const id = ++_id;
    const toast = typeof opts === 'string'
      ? { id, variant: 'warning', message: opts, duration: DEFAULT_DURATION }
      : { id, duration: DEFAULT_DURATION, ...opts };
    setToasts((prev) => [...prev.slice(-4), toast]); // máx 5 toasts
    return id;
  }, []);

  // Expose globally so non-React code (alert override) can use it
  useEffect(() => {
    _setGlobalToastAdd(add);
    return () => _setGlobalToastAdd(null);
  }, [add]);

  // No need to override here — already done at module load time above.

  return (
    <ToastContext.Provider value={add}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useToast() {
  const add = useContext(ToastContext);
  if (!add) throw new Error('useToast must be used inside <ToastProvider>');

  return {
    toast: add,
    success: (message, title) => add({ variant: 'success', title, message }),
    error: (message, title) => add({ variant: 'error', title, message }),
    warning: (message, title) => add({ variant: 'warning', title, message }),
    info: (message, title) => add({ variant: 'info', title, message }),
    ai: (message, title) => add({ variant: 'ai', title, message }),
  };
}

// ─── Imperative API (outside React) ───────────────────────────────────────────
// Use this in event handlers or utility files that don't have access to hooks.

export const toast = {
  success: (message, title) => _globalAdd?.({ variant: 'success', title, message }),
  error: (message, title) => _globalAdd?.({ variant: 'error', title, message }),
  warning: (message, title) => _globalAdd?.({ variant: 'warning', title, message }),
  info: (message, title) => _globalAdd?.({ variant: 'info', title, message }),
  ai: (message, title) => _globalAdd?.({ variant: 'ai', title, message }),
};
