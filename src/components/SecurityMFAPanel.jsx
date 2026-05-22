import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

const PRIMARY_BTN =
  'inline-flex w-full items-center justify-center rounded-2xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-60 sm:w-auto';
const SECONDARY_BTN =
  'inline-flex w-full items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 disabled:opacity-60 sm:w-auto';
const DANGER_BTN =
  'rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-60';

function formatSecret(secret) {
  if (!secret) return '';
  return String(secret).replace(/\s+/g, '').match(/.{1,4}/g)?.join(' ') || secret;
}

export default function SecurityMFAPanel() {
  const [factors, setFactors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [enrollment, setEnrollment] = useState(null);
  const [enrollBusy, setEnrollBusy] = useState(false);
  const [verifyCode, setVerifyCode] = useState('');
  const [verifyBusy, setVerifyBusy] = useState(false);
  const [removeBusy, setRemoveBusy] = useState(null);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const refreshFactors = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      const list = Array.isArray(data?.totp)
        ? data.totp
        : Array.isArray(data?.all)
          ? data.all.filter((f) => f.factor_type === 'totp')
          : [];
      setFactors(list);
    } catch (e) {
      setFeedback({ type: 'error', message: `Falha ao listar fatores: ${e.message || e}` });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshFactors();
  }, [refreshFactors]);

  const verified = useMemo(() => factors.filter((f) => f.status === 'verified'), [factors]);
  const unverified = useMemo(() => factors.filter((f) => f.status !== 'verified'), [factors]);

  const startEnroll = useCallback(async () => {
    setEnrollBusy(true);
    setFeedback({ type: '', message: '' });
    try {
      for (const f of unverified) {
        await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
      const friendlyName = `Papirando ${new Date().toLocaleDateString('pt-BR')}`;
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName,
      });
      if (error) throw error;
      setEnrollment({ id: data.id, qr: data.totp?.qr_code || '', secret: data.totp?.secret || '' });
      setVerifyCode('');
    } catch (e) {
      setFeedback({ type: 'error', message: `Falha ao iniciar 2FA: ${e.message || e}` });
    } finally {
      setEnrollBusy(false);
      refreshFactors();
    }
  }, [unverified, refreshFactors]);

  const submitVerify = useCallback(async () => {
    if (!enrollment?.id || verifyCode.length !== 6) return;
    setVerifyBusy(true);
    setFeedback({ type: '', message: '' });
    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId: enrollment.id,
        code: verifyCode.replace(/\s+/g, ''),
      });
      if (error) throw error;
      setFeedback({
        type: 'success',
        message: 'Autenticação em duas etapas ativada com sucesso. Da próxima vez que entrar, vamos pedir o código do app.',
      });
      setEnrollment(null);
      setVerifyCode('');
      refreshFactors();
    } catch (e) {
      setFeedback({
        type: 'error',
        message: `Código não verificado: ${e.message || e}. Confira o relógio do celular e o app autenticador.`,
      });
    } finally {
      setVerifyBusy(false);
    }
  }, [enrollment, verifyCode, refreshFactors]);

  const cancelEnroll = useCallback(async () => {
    if (enrollment?.id) {
      try {
        await supabase.auth.mfa.unenroll({ factorId: enrollment.id });
      } catch {
        /* noop */
      }
    }
    setEnrollment(null);
    setVerifyCode('');
    refreshFactors();
  }, [enrollment, refreshFactors]);

  const handleRemove = useCallback(
    async (factorId) => {
      if (!factorId) return;
      const ok =
        typeof window !== 'undefined' &&
        window.confirm('Remover este fator de autenticação? Sua conta vai voltar a usar só senha.');
      if (!ok) return;
      setRemoveBusy(factorId);
      setFeedback({ type: '', message: '' });
      try {
        const { error } = await supabase.auth.mfa.unenroll({ factorId });
        if (error) throw error;
        setFeedback({ type: 'success', message: 'Fator removido.' });
        refreshFactors();
      } catch (e) {
        setFeedback({ type: 'error', message: `Falha ao remover: ${e.message || e}` });
      } finally {
        setRemoveBusy(null);
      }
    },
    [refreshFactors],
  );

  return (
    <div className="rounded-[22px] border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-slate-500">Segurança</p>
          <h3 className="mt-2 text-xl font-bold text-slate-950">Autenticação em duas etapas (2FA)</h3>
          <p className="mt-1 text-sm text-slate-600">
            Use um app autenticador (Google Authenticator, Authy, 1Password) para adicionar uma camada extra além da senha.
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${
            verified.length > 0 ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
          }`}
        >
          {verified.length > 0 ? 'ATIVA' : 'INATIVA'}
        </span>
      </div>

      {feedback.message ? (
        <div
          className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
            feedback.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {feedback.message}
        </div>
      ) : null}

      {loading ? (
        <p className="mt-4 text-sm text-slate-500">Carregando...</p>
      ) : verified.length > 0 && !enrollment ? (
        <div className="mt-5 space-y-3">
          {verified.map((f) => (
            <div
              key={f.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">{f.friendly_name || 'TOTP'}</p>
                <p className="text-xs text-slate-500">
                  Adicionado em {f.created_at ? new Date(f.created_at).toLocaleDateString('pt-BR') : '—'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(f.id)}
                disabled={removeBusy === f.id}
                className={DANGER_BTN}
              >
                {removeBusy === f.id ? 'Removendo...' : 'Remover'}
              </button>
            </div>
          ))}
          <p className="text-xs text-slate-500">
            Para trocar de app autenticador, remova o fator atual e ative novamente.
          </p>
        </div>
      ) : enrollment ? (
        <div className="mt-5 space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-sm font-semibold text-slate-900">1. Escaneie o QR no seu app autenticador</p>
          <div
            className="mx-auto flex max-w-[220px] items-center justify-center rounded-2xl bg-white p-3"
            dangerouslySetInnerHTML={{ __html: enrollment.qr }}
          />
          <details className="text-xs text-slate-600">
            <summary className="cursor-pointer">Não consegue escanear? Cole este código no app</summary>
            <p className="mt-2 break-all rounded-2xl bg-white px-3 py-2 font-mono text-xs text-slate-900">
              {formatSecret(enrollment.secret)}
            </p>
          </details>

          <p className="text-sm font-semibold text-slate-900">2. Digite o código de 6 dígitos exibido no app</p>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={verifyCode}
            onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-center font-mono text-lg tracking-[0.4em] text-slate-900 focus:border-blue-500 focus:outline-none"
            autoComplete="one-time-code"
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={cancelEnroll} className={SECONDARY_BTN} disabled={verifyBusy}>
              Cancelar
            </button>
            <button
              type="button"
              onClick={submitVerify}
              disabled={verifyBusy || verifyCode.length !== 6}
              className={PRIMARY_BTN}
            >
              {verifyBusy ? 'Verificando...' : 'Ativar 2FA'}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-5">
          <button type="button" onClick={startEnroll} disabled={enrollBusy} className={PRIMARY_BTN}>
            {enrollBusy ? 'Preparando...' : 'Ativar autenticação em duas etapas'}
          </button>
        </div>
      )}
    </div>
  );
}