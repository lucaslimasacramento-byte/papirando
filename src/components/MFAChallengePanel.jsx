import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function MFAChallengePanel({ onSuccess, onCancel }) {
  const [factors, setFactors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data, error: listError } = await supabase.auth.mfa.listFactors();
        if (listError) throw listError;
        const list = Array.isArray(data?.totp)
          ? data.totp.filter((f) => f.status === 'verified')
          : [];
        if (!cancelled) setFactors(list);
      } catch (e) {
        if (!cancelled) setError(`Falha ao carregar fatores: ${e.message || e}`);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const primaryFactor = useMemo(() => factors[0] || null, [factors]);

  const submit = useCallback(async () => {
    if (!primaryFactor?.id || code.length !== 6) return;
    setBusy(true);
    setError('');
    try {
      const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
        factorId: primaryFactor.id,
        code: code.replace(/\s+/g, ''),
      });
      if (verifyError) throw verifyError;
      onSuccess?.();
    } catch (e) {
      setError(`Código inválido: ${e.message || e}. Confira o relógio do celular e tente novamente.`);
    } finally {
      setBusy(false);
    }
  }, [primaryFactor, code, onSuccess]);

  const cancel = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      /* noop */
    }
    onCancel?.();
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-500">Segurança</p>
        <h2 className="mt-2 text-xl font-bold text-slate-950">Confirme com o seu autenticador</h2>
        <p className="mt-1 text-sm text-slate-600">
          Sua conta tem 2FA ativa. Abra o app autenticador e digite o código de 6 dígitos.
        </p>

        {error ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        ) : null}

        {loading ? (
          <p className="mt-4 text-sm text-slate-500">Carregando...</p>
        ) : !primaryFactor ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Nenhum fator MFA encontrado. Entre em contato com o suporte para destravar a conta.
          </div>
        ) : (
          <>
            <input
              autoFocus
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="mt-5 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-center font-mono text-lg tracking-[0.4em] text-slate-900 focus:border-blue-500 focus:outline-none"
              autoComplete="one-time-code"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && code.length === 6) submit();
              }}
            />

            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={cancel}
                className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 sm:w-auto"
                disabled={busy}
              >
                Sair
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={busy || code.length !== 6}
                className="inline-flex w-full items-center justify-center rounded-2xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-60 sm:w-auto"
              >
                {busy ? 'Verificando...' : 'Confirmar'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}