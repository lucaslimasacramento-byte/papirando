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
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        background: 'rgba(20, 17, 13, 0.55)',
        backdropFilter: 'blur(3px)',
      }}
    >
      <div
        className="pl-card"
        style={{
          width: 'min(100%, 420px)',
          padding: 24,
          borderRadius: 18,
          boxShadow: 'var(--pl-sh-high)',
        }}
      >
        <p className="pl-eyebrow" style={{ marginBottom: 2 }}>Segurança</p>
        <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--pl-ink)', marginBottom: 4 }}>
          Confirme com o seu autenticador
        </h2>
        <p style={{ fontSize: 12.5, color: 'var(--pl-ink-3)', lineHeight: 1.5 }}>
          Sua conta tem 2FA ativa. Abra o app autenticador e digite o código de 6 dígitos.
        </p>

        {error ? (
          <div
            style={{
              marginTop: 14,
              borderRadius: 12,
              border: '1px solid var(--pl-rule-2)',
              background: 'var(--pl-danger-soft)',
              color: 'var(--pl-danger)',
              padding: '10px 14px',
              fontSize: 12.5,
              lineHeight: 1.5,
            }}
          >
            {error}
          </div>
        ) : null}

        {loading ? (
          <p style={{ marginTop: 14, fontSize: 12.5, color: 'var(--pl-ink-3)' }}>Carregando...</p>
        ) : !primaryFactor ? (
          <div
            style={{
              marginTop: 14,
              borderRadius: 12,
              border: '1px solid var(--pl-rule-2)',
              background: 'var(--pl-warn-soft)',
              color: 'var(--pl-warn)',
              padding: '10px 14px',
              fontSize: 12.5,
              lineHeight: 1.5,
            }}
          >
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
              className="pl-input"
              style={{
                marginTop: 18,
                width: '100%',
                height: 46,
                textAlign: 'center',
                fontFamily: 'var(--pl-mono)',
                fontSize: 18,
                letterSpacing: '0.4em',
              }}
              autoComplete="one-time-code"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && code.length === 6) submit();
              }}
            />

            <div style={{ marginTop: 18, display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={cancel}
                className="pl-btn"
                disabled={busy}
                style={{ opacity: busy ? 0.6 : 1 }}
              >
                Sair
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={busy || code.length !== 6}
                className="pl-btn pl-btn-primary"
                style={{ opacity: busy || code.length !== 6 ? 0.6 : 1 }}
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
