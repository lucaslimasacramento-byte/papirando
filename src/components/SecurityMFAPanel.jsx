import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { showConfirm } from '../lib/dialogs';

const SOFT_BOX = {
  borderRadius: 12,
  border: '1px solid var(--pl-rule-2)',
  background: 'var(--pl-bg-soft)',
};

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
      const ok = await showConfirm(
        'Remover este fator de autenticação? Sua conta vai voltar a usar só senha.',
        { title: 'Remover 2FA', confirmLabel: 'Remover', danger: true },
      );
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
    <div className="pl-card" style={{ padding: 20 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <p className="pl-eyebrow" style={{ marginBottom: 2 }}>Segurança</p>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--pl-ink)', marginBottom: 4 }}>
            Autenticação em duas etapas (2FA)
          </h3>
          <p style={{ fontSize: 12.5, color: 'var(--pl-ink-3)', lineHeight: 1.5 }}>
            Use um app autenticador (Google Authenticator, Authy, 1Password) para adicionar uma camada extra além da senha.
          </p>
        </div>
        <span className={`pl-tag ${verified.length > 0 ? 'pl-tag-success' : 'pl-tag-warn'}`}>
          {verified.length > 0 ? 'Ativa' : 'Inativa'}
        </span>
      </div>

      {feedback.message ? (
        <div
          style={{
            marginTop: 14,
            borderRadius: 12,
            padding: '10px 14px',
            fontSize: 12.5,
            lineHeight: 1.5,
            border: '1px solid var(--pl-rule-2)',
            background: feedback.type === 'success' ? 'var(--pl-success-soft)' : 'var(--pl-danger-soft)',
            color: feedback.type === 'success' ? 'var(--pl-success)' : 'var(--pl-danger)',
          }}
        >
          {feedback.message}
        </div>
      ) : null}

      {loading ? (
        <p style={{ marginTop: 14, fontSize: 12.5, color: 'var(--pl-ink-3)' }}>Carregando...</p>
      ) : verified.length > 0 && !enrollment ? (
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {verified.map((f) => (
            <div
              key={f.id}
              style={{
                ...SOFT_BOX,
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
                padding: '10px 14px',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--pl-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {f.friendly_name || 'TOTP'}
                </p>
                <p style={{ marginTop: 3, fontSize: 11, color: 'var(--pl-ink-3)' }}>
                  Adicionado em {f.created_at ? new Date(f.created_at).toLocaleDateString('pt-BR') : '—'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(f.id)}
                disabled={removeBusy === f.id}
                className="pl-btn pl-btn-sm"
                style={{ color: 'var(--pl-danger)', opacity: removeBusy === f.id ? 0.6 : 1 }}
              >
                {removeBusy === f.id ? 'Removendo...' : 'Remover'}
              </button>
            </div>
          ))}
          <p style={{ fontSize: 11, color: 'var(--pl-ink-3)' }}>
            Para trocar de app autenticador, remova o fator atual e ative novamente.
          </p>
        </div>
      ) : enrollment ? (
        <div className="pl-card-paper" style={{ marginTop: 14, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--pl-ink)' }}>
            1. Escaneie o QR no seu app autenticador
          </p>
          {/* Fundo branco fixo de propósito: leitor de QR precisa do contraste, inclusive no tema escuro. */}
          <div
            style={{
              margin: '0 auto',
              display: 'flex',
              maxWidth: 220,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 12,
              border: '1px solid var(--pl-rule-2)',
              background: '#ffffff',
              padding: 12,
            }}
            dangerouslySetInnerHTML={{ __html: enrollment.qr }}
          />
          <details style={{ fontSize: 11.5, color: 'var(--pl-ink-3)' }}>
            <summary style={{ cursor: 'pointer' }}>Não consegue escanear? Cole este código no app</summary>
            <p
              style={{
                marginTop: 8,
                wordBreak: 'break-all',
                borderRadius: 10,
                border: '1px solid var(--pl-rule-2)',
                background: 'var(--pl-surface)',
                padding: '8px 12px',
                fontFamily: 'var(--pl-mono)',
                fontSize: 12,
                color: 'var(--pl-ink)',
              }}
            >
              {formatSecret(enrollment.secret)}
            </p>
          </details>

          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--pl-ink)' }}>
            2. Digite o código de 6 dígitos exibido no app
          </p>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={verifyCode}
            onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            className="pl-input"
            style={{
              width: '100%',
              height: 42,
              textAlign: 'center',
              fontFamily: 'var(--pl-mono)',
              fontSize: 17,
              letterSpacing: '0.4em',
            }}
            autoComplete="one-time-code"
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" onClick={cancelEnroll} className="pl-btn" disabled={verifyBusy} style={{ opacity: verifyBusy ? 0.6 : 1 }}>
              Cancelar
            </button>
            <button
              type="button"
              onClick={submitVerify}
              disabled={verifyBusy || verifyCode.length !== 6}
              className="pl-btn pl-btn-primary"
              style={{ opacity: verifyBusy || verifyCode.length !== 6 ? 0.6 : 1 }}
            >
              {verifyBusy ? 'Verificando...' : 'Ativar 2FA'}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ marginTop: 14 }}>
          <button
            type="button"
            onClick={startEnroll}
            disabled={enrollBusy}
            className="pl-btn pl-btn-primary"
            style={{ opacity: enrollBusy ? 0.6 : 1 }}
          >
            {enrollBusy ? 'Preparando...' : 'Ativar autenticação em duas etapas'}
          </button>
        </div>
      )}
    </div>
  );
}
