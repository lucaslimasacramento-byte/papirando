import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { normalizeReferralCode } from '../lib/referrals';
import { registerFreeAccount } from '../lib/registerApi';

// ── Logo mark ──────────────────────────────────────────────────────────────
function PlMark({ size = 36 }) {
  const fold = Math.round(size * 0.25);
  return (
    <div style={{ width: size, height: size, position: 'relative', flexShrink: 0 }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'var(--pl-ink)', borderRadius: 3,
        clipPath: `polygon(0 0, calc(100% - ${fold}px) 0, 100% ${fold}px, 100% 100%, 0 100%)`,
      }} />
      <div style={{
        position: 'absolute', top: 0, right: 0,
        width: fold, height: fold,
        background: 'rgba(0,0,0,0.28)',
        clipPath: 'polygon(100% 0, 0 100%, 100% 100%)',
        borderTopRightRadius: 3,
      }} />
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--pl-serif)', fontStyle: 'italic', fontWeight: 400,
        fontSize: size * 0.72, color: 'var(--pl-bg)',
        letterSpacing: '-0.06em', paddingRight: 1, paddingBottom: 2,
      }}>P</div>
    </div>
  );
}

// ── Decorative page SVG ───────────────────────────────────────────────────
function DecorativePage() {
  return (
    <div style={{
      position: 'absolute', bottom: -80, right: -80,
      width: 360, height: 440,
      transform: 'rotate(-8deg)',
      pointerEvents: 'none', opacity: 0.55,
    }} aria-hidden="true">
      <svg viewBox="0 0 360 440" fill="none" style={{ width: '100%', height: '100%' }}>
        <rect x="40" y="40" width="280" height="380" fill="rgba(20,17,13,0.06)" />
        <path d="M 20 20 L 260 20 L 320 80 L 320 420 L 20 420 Z"
          fill="rgba(255,255,255,0.50)" stroke="var(--pl-ink)" strokeWidth="1.5" />
        <path d="M 260 20 L 260 80 L 320 80 Z"
          fill="rgba(20,17,13,0.10)" stroke="var(--pl-ink)" strokeWidth="1.5" />
        <line x1="40" y1="110" x2="290" y2="110" stroke="var(--pl-ink-4)" strokeWidth="1" />
        <line x1="40" y1="138" x2="270" y2="138" stroke="var(--pl-ink-4)" strokeWidth="1" />
        <line x1="40" y1="166" x2="285" y2="166" stroke="var(--pl-ink-4)" strokeWidth="1" />
        <line x1="40" y1="194" x2="250" y2="194" stroke="var(--pl-ink-4)" strokeWidth="1" />
        <rect x="40" y="220" width="180" height="14" fill="var(--pl-highlight)" opacity="0.7" />
        <line x1="40" y1="254" x2="280" y2="254" stroke="var(--pl-ink-4)" strokeWidth="1" />
        <line x1="40" y1="282" x2="260" y2="282" stroke="var(--pl-ink-4)" strokeWidth="1" />
        <line x1="40" y1="310" x2="275" y2="310" stroke="var(--pl-ink-4)" strokeWidth="1" />
        <line x1="40" y1="338" x2="240" y2="338" stroke="var(--pl-ink-4)" strokeWidth="1" />
      </svg>
    </div>
  );
}

export default function Login({
  setIsAuthenticated,
  initialReferralCode = '',
  initialBetaInviteToken = '',
  onReferralCodeCaptured,
  onReferralCodeConsumed,
  onBetaInviteConsumed,
}) {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [concurso, setConcurso] = useState('');
  const [referralCode, setReferralCode] = useState(() => normalizeReferralCode(initialReferralCode));

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const normalizedInitialCode = normalizeReferralCode(initialReferralCode);
    if (!normalizedInitialCode) return;
    setReferralCode((prev) => prev || normalizedInitialCode);
  }, [initialReferralCode]);

  // Se chegou com beta invite, vai direto pro cadastro
  useEffect(() => {
    if (initialBetaInviteToken) {
      setIsLoginMode(false);
    }
  }, [initialBetaInviteToken]);

  const resetForm = () => {
    setNome('');
    setCpf('');
    setBirthDate('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setConcurso('');
    setReferralCode(normalizeReferralCode(initialReferralCode));
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const handleToggleMode = (mode) => {
    setIsLoginMode(mode === 'login');
    setError('');
    setSuccessMsg('');
    resetForm();
  };

  const getReadableError = (err) => {
    const msg = err?.message?.toLowerCase?.() || '';
    if (msg.includes('email rate limit exceeded')) return 'Muitas tentativas. Aguarde alguns minutos.';
    if (msg.includes('invalid login credentials')) return 'Email ou senha invalidos.';
    if (msg.includes('user already registered')) return 'Este email ja esta cadastrado. Tente fazer login.';
    if (msg.includes('password should be at least')) return 'A senha precisa ter pelo menos 6 caracteres.';
    return err?.message || 'Ocorreu um erro ao autenticar.';
  };

  const validateForm = () => {
    if (!email.trim()) { setError('Digite o seu email.'); return false; }
    if (!password.trim()) { setError('Digite a sua senha.'); return false; }
    if (!isLoginMode) {
      if (!nome.trim()) { setError('Digite o seu nome completo.'); return false; }
      if (nome.trim().split(/\s+/).filter(Boolean).length < 2) { setError('Digite nome e sobrenome.'); return false; }
      if (cpf.replace(/\D/g, '').length < 11) { setError('Digite o CPF completo (11 dígitos).'); return false; }
      if (!birthDate) { setError('Informe a data de nascimento.'); return false; }
      if (password.length < 6) { setError('A senha deve ter pelo menos 6 caracteres.'); return false; }
      if (password !== confirmPassword) { setError('As senhas nao coincidem.'); return false; }
    }
    return true;
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) { setError('Digite o seu email acima para recuperar a senha.'); return; }
    if (loading) return;
    setLoading(true); setError(''); setSuccessMsg('');
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      if (resetError) throw resetError;
      setSuccessMsg('Link de recuperacao enviado! Verifique o seu email.');
    } catch (err) {
      setError(getReadableError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError(''); setSuccessMsg('');
    if (!validateForm()) return;
    setLoading(true);
    try {
      if (isLoginMode) {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        setIsAuthenticated(true);
        return;
      }
      const normalizedReferralCode = normalizeReferralCode(referralCode);
      // Passa pelo Edge Function register-free que valida CPF, aplica rate-limit,
      // antifraude e faz rollback server-side se o perfil falhar (B-004 / B-003).
      const result = await registerFreeAccount({
        fullName: nome.trim(),
        cpf: cpf.replace(/\D/g, ''),
        birthDate,
        email,
        password,
        celular: '',
        referralCode: normalizedReferralCode || undefined,
        betaInviteToken: initialBetaInviteToken || undefined,
      });
      if (!result.success) {
        const firstFieldError = result.fieldErrors ? Object.values(result.fieldErrors)[0] : null;
        throw new Error(firstFieldError || result.message || 'Não foi possível criar a conta.');
      }
      setSuccessMsg(result.message || 'Conta criada! Verifique o seu email para ativar o acesso.');
      if (normalizedReferralCode) onReferralCodeConsumed?.();
      if (initialBetaInviteToken) onBetaInviteConsumed?.();
      setIsLoginMode(true);
      setPassword(''); setConfirmPassword(''); setCpf(''); setBirthDate('');
    } catch (err) {
      setError(getReadableError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      width: '100%', height: '100vh',
      display: 'grid',
      gridTemplateColumns: '1.6fr 1fr',
      minHeight: 680,
      overflow: 'hidden',
      fontFamily: 'var(--pl-sans)',
    }}>

      {/* ── COVER (esquerda) ────────────────────────────────────── */}
      <div style={{
        position: 'relative',
        background: 'var(--pl-bg)',
        backgroundImage: 'repeating-linear-gradient(0deg, transparent 0 47px, var(--pl-rule) 47px 48px)',
        padding: '48px 56px',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Logo */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
          <PlMark size={36} />
          <span style={{
            fontFamily: 'var(--pl-serif)', fontStyle: 'italic', fontWeight: 300,
            fontSize: 24, color: 'var(--pl-ink)', letterSpacing: '-0.045em',
          }}>
            Papirando<span style={{ color: 'var(--pl-accent)' }}>.</span>
          </span>
        </div>

        {/* Bloco central */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <h1 style={{
            margin: 0,
            fontFamily: 'var(--pl-serif)', fontStyle: 'italic', fontWeight: 300,
            fontSize: 'clamp(72px, 10vw, 140px)',
            lineHeight: 0.92, letterSpacing: '-0.045em',
            color: 'var(--pl-ink)',
          }}>
            Bora<br />
            papirar<span style={{ color: 'var(--pl-accent)' }}>.</span>
          </h1>

          <p style={{
            margin: '28px 0 0',
            fontFamily: 'var(--pl-serif)', fontStyle: 'italic', fontWeight: 400,
            fontSize: 21, lineHeight: 1.45, letterSpacing: '-0.01em',
            color: 'var(--pl-ink-2)', maxWidth: '32ch',
          }}>
            A plataforma de estudos pra concurso que fala a sua lingua. Marca a pagina,
            papira a questao, volta de onde parou.
          </p>
        </div>

        {/* Rodape */}
        <div style={{ marginTop: 36, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '8px 14px',
            background: 'var(--pl-surface)', border: '1px solid var(--pl-rule-2)',
            borderRadius: 999,
            fontSize: 12.5, color: 'var(--pl-ink-2)', fontWeight: 500,
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: 999,
              background: 'var(--pl-success)',
              display: 'inline-block',
              animation: 'pl-live-pulse 2.2s ease-in-out infinite',
            }} />
            <em style={{ fontFamily: 'var(--pl-serif)', fontStyle: 'italic', fontWeight: 500, color: 'var(--pl-ink)' }}>1.247</em>
            {' '}papireiros estudando agora
          </span>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--pl-ink-3)', letterSpacing: '0.22em', textTransform: 'uppercase' }}>
            v1.0
          </span>
        </div>

        <DecorativePage />
      </div>

      {/* ── FORMULARIO (direita) ─────────────────────────────────── */}
      <div style={{
        background: 'var(--pl-surface)',
        borderLeft: '1px solid var(--pl-rule-2)',
        padding: '48px 52px',
        display: 'flex', flexDirection: 'column',
        overflowY: 'auto',
      }}>
        {/* Cabecalho do formulario */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 52 }}>
          <span style={{
            fontSize: 11, fontWeight: 700, color: 'var(--pl-ink-3)',
            letterSpacing: '0.24em', textTransform: 'uppercase',
          }}>Acesso</span>

          {/* Toggle pill */}
          <div style={{
            display: 'inline-flex',
            background: 'var(--pl-bg-soft)',
            borderRadius: 999, padding: 3,
          }}>
            {['login', 'cadastro'].map((m) => {
              const active = (m === 'login') === isLoginMode;
              return (
                <button key={m} onClick={() => handleToggleMode(m)} style={{
                  height: 30, padding: '0 16px',
                  border: 0,
                  background: active ? 'var(--pl-surface)' : 'transparent',
                  borderRadius: 999,
                  fontFamily: 'var(--pl-sans)', fontSize: 12.5, fontWeight: 600,
                  color: active ? 'var(--pl-ink)' : 'var(--pl-ink-3)',
                  cursor: 'pointer',
                  boxShadow: active ? '0 1px 2px rgba(20,17,13,0.06)' : 'none',
                  transition: 'background .12s, color .12s',
                }}>
                  {m === 'login' ? 'Entrar' : 'Criar conta'}
                </button>
              );
            })}
          </div>
        </div>

        {/* Titulo */}
        <h2 style={{
          margin: 0,
          fontFamily: 'var(--pl-serif)', fontStyle: 'italic', fontWeight: 300,
          fontSize: 52, lineHeight: 0.98, letterSpacing: '-0.04em',
          color: 'var(--pl-ink)',
        }}>
          {isLoginMode
            ? <>Bem vindo de volta<span style={{ color: 'var(--pl-accent)' }}>.</span></>
            : <>Bora comecar a papirar<span style={{ color: 'var(--pl-accent)' }}>.</span></>}
        </h2>
        <p style={{
          margin: '14px 0 32px',
          fontSize: 15, lineHeight: 1.55, color: 'var(--pl-ink-2)',
          maxWidth: '42ch', fontWeight: 500,
        }}>
          {isLoginMode
            ? 'Que bom te ver papirando de novo. Sua sequencia ta esperando voce la dentro.'
            : 'Conta gratis. Plano de estudos personalizado em 2 minutos.'}
        </p>

        {/* Alertas */}
        {successMsg && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            padding: '12px 16px', marginBottom: 20,
            background: 'var(--pl-success-soft)', border: '1px solid var(--pl-success)',
            borderRadius: 8, fontSize: 13.5, fontWeight: 600, color: 'var(--pl-success)',
          }}>
            <CheckCircle2 size={15} style={{ flexShrink: 0, marginTop: 1 }} />
            {successMsg}
          </div>
        )}
        {error && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            padding: '12px 16px', marginBottom: 20,
            background: 'var(--pl-danger-soft)', border: '1px solid var(--pl-danger)',
            borderRadius: 8, fontSize: 13.5, fontWeight: 600, color: 'var(--pl-danger)',
          }}>
            <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
            {error}
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 420 }}>

          {/* Nome (apenas cadastro) */}
          {!isLoginMode && (
            <PlField label="Nome completo">
              <input
                className="pl-input" type="text"
                placeholder="Lucas Souza" autoComplete="name"
                value={nome} onChange={(e) => setNome(e.target.value)}
                style={{ width: '100%', height: 44 }}
              />
            </PlField>
          )}

          {/* CPF (apenas cadastro) */}
          {!isLoginMode && (
            <PlField label="CPF">
              <input
                className="pl-input" type="text"
                placeholder="000.000.000-00" autoComplete="off"
                value={cpf}
                onChange={(e) => setCpf(formatCpfInput(e.target.value))}
                style={{ width: '100%', height: 44 }}
                inputMode="numeric"
              />
            </PlField>
          )}

          {/* Data de nascimento (apenas cadastro) */}
          {!isLoginMode && (
            <PlField label="Data de nascimento">
              <input
                className="pl-input" type="date"
                autoComplete="bday"
                value={birthDate} onChange={(e) => setBirthDate(e.target.value)}
                style={{ width: '100%', height: 44 }}
              />
            </PlField>
          )}

          {/* Email */}
          <PlField label="E-mail">
            <input
              className="pl-input" type="email"
              placeholder="seu@email.com" autoComplete="email"
              value={email} onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%', height: 44 }}
            />
          </PlField>

          {/* Senha */}
          <PlField
            label="Senha"
            aside={isLoginMode && (
              <button type="button" onClick={handleForgotPassword} disabled={loading} style={{
                background: 'transparent', border: 0, padding: 0,
                fontFamily: 'var(--pl-sans)', fontSize: 12, fontWeight: 600,
                color: 'var(--pl-accent)', cursor: 'pointer',
                textDecoration: 'underline', textDecorationColor: 'rgba(29,78,216,0.3)',
                textUnderlineOffset: 3,
              }}>Esqueci a senha</button>
            )}
          >
            <div style={{ position: 'relative' }}>
              <input
                className="pl-input" type={showPassword ? 'text' : 'password'}
                placeholder="••••••••" autoComplete={isLoginMode ? 'current-password' : 'new-password'}
                value={password} onChange={(e) => setPassword(e.target.value)}
                style={{ width: '100%', height: 44, paddingRight: 44 }}
              />
              <button type="button" onClick={() => setShowPassword((p) => !p)} style={{
                position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 0, padding: 0, cursor: 'pointer',
                color: 'var(--pl-ink-3)', display: 'flex',
              }}>
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {!isLoginMode && (
              <span style={{ fontSize: 11.5, color: 'var(--pl-ink-3)', fontWeight: 500 }}>
                Minimo 6 caracteres.
              </span>
            )}
          </PlField>

          {/* Confirmar senha (apenas cadastro) */}
          {!isLoginMode && (
            <PlField label="Confirmar senha">
              <div style={{ position: 'relative' }}>
                <input
                  className="pl-input" type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••" autoComplete="new-password"
                  value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{ width: '100%', height: 44, paddingRight: 44 }}
                />
                <button type="button" onClick={() => setShowConfirmPassword((p) => !p)} style={{
                  position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 0, padding: 0, cursor: 'pointer',
                  color: 'var(--pl-ink-3)', display: 'flex',
                }}>
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </PlField>
          )}

          {/* Concurso-alvo (apenas cadastro) */}
          {!isLoginMode && (
            <PlField label={
              <>Concurso-alvo <span style={{ color: 'var(--pl-ink-4)', fontWeight: 500 }}>(opcional)</span></>
            }>
              <input
                className="pl-input" type="text"
                placeholder="PC-BA · Investigador"
                value={concurso} onChange={(e) => setConcurso(e.target.value)}
                style={{ width: '100%', height: 44 }}
              />
            </PlField>
          )}

          {/* Codigo de convite (apenas cadastro) */}
          {!isLoginMode && (
            <PlField label="Codigo de convite (opcional)">
              <input
                className="pl-input" type="text"
                placeholder="PAPIREIRO123"
                value={referralCode}
                onChange={(e) => {
                  const next = normalizeReferralCode(e.target.value);
                  setReferralCode(next);
                  onReferralCodeCaptured?.(next);
                }}
                style={{ width: '100%', height: 44 }}
              />
            </PlField>
          )}

          {/* Submit */}
          <button type="submit" disabled={loading} style={{
            marginTop: 8, height: 46, padding: '0 22px',
            background: 'var(--pl-ink)', color: 'var(--pl-bg)',
            border: 0, borderRadius: 10,
            fontFamily: 'var(--pl-sans)', fontSize: 15, fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            opacity: loading ? 0.7 : 1,
            transition: 'opacity .12s',
          }}>
            {loading ? (
              <><Loader2 size={16} className="animate-spin" /> Processando...</>
            ) : isLoginMode ? (
              <><svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 13, height: 13 }}><path d="M8 5 L19 12 L8 19 Z" /></svg> Papirar</>
            ) : (
              'Criar conta & comecar'
            )}
          </button>

          {/* Divisor */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14,
            color: 'var(--pl-ink-4)',
            fontSize: 11, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase',
          }}>
            <span style={{ flex: 1, height: 1, background: 'var(--pl-rule)' }} />
            ou continuar com
            <span style={{ flex: 1, height: 1, background: 'var(--pl-rule)' }} />
          </div>

          {/* Google */}
          <button type="button" style={{
            height: 44,
            background: 'var(--pl-surface)', border: '1px solid var(--pl-rule-strong)',
            borderRadius: 10,
            fontFamily: 'var(--pl-sans)', fontSize: 13.5, fontWeight: 600,
            color: 'var(--pl-ink)', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            transition: 'background .12s, border-color .12s',
          }}>
            <svg viewBox="0 0 48 48" style={{ width: 18, height: 18 }}>
              <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34.5 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z" />
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 18.9 13 24 13c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34.5 6.1 29.6 4 24 4 16.3 4 9.6 8.3 6.3 14.7z" />
              <path fill="#4CAF50" d="M24 44c5.5 0 10.4-2 14.1-5.4l-6.5-5.5C29.6 34.5 26.9 35.5 24 35.5c-5.3 0-9.7-3.4-11.3-8L6.2 32.5C9.5 39.7 16.2 44 24 44z" />
              <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.1 4-3.9 5.3l6.5 5.5c-.5.5 7.1-5.2 7.1-15.8 0-1.3-.1-2.6-.4-3.9z" />
            </svg>
            Continuar com Google
          </button>
        </form>

        {/* Rodape do formulario */}
        <div style={{
          marginTop: 'auto', paddingTop: 32,
          fontSize: 12.5, color: 'var(--pl-ink-3)', fontWeight: 500, lineHeight: 1.55,
        }}>
          {isLoginMode ? (
            <>
              Ainda nao papira aqui?{' '}
              <button type="button" onClick={() => handleToggleMode('cadastro')} style={{
                background: 'transparent', border: 0, padding: 0,
                fontFamily: 'var(--pl-sans)', fontSize: 12.5, fontWeight: 600,
                color: 'var(--pl-accent)', cursor: 'pointer',
                textDecoration: 'underline', textDecorationColor: 'rgba(29,78,216,0.3)',
              }}>Cria conta — leva 2 minutos</button>
            </>
          ) : (
            <>
              Ja e papireiro?{' '}
              <button type="button" onClick={() => handleToggleMode('login')} style={{
                background: 'transparent', border: 0, padding: 0,
                fontFamily: 'var(--pl-sans)', fontSize: 12.5, fontWeight: 600,
                color: 'var(--pl-accent)', cursor: 'pointer',
                textDecoration: 'underline', textDecorationColor: 'rgba(29,78,216,0.3)',
              }}>Entra na sua conta</button>
              <br /><br />
              Criar conta significa que voce topa nossos{' '}
              <a href="#" style={{ color: 'var(--pl-ink-2)', textDecoration: 'underline', textDecorationColor: 'var(--pl-rule-strong)', textUnderlineOffset: 2 }}>termos</a>
              {' '}e a{' '}
              <a href="#" style={{ color: 'var(--pl-ink-2)', textDecoration: 'underline', textDecorationColor: 'var(--pl-rule-strong)', textUnderlineOffset: 2 }}>politica de privacidade</a>.
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────
function formatCpfInput(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

// ── Field wrapper ─────────────────────────────────────────────────────────
function PlField({ label, aside, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--pl-ink-2)' }}>{label}</label>
        {aside}
      </div>
      {children}
    </div>
  );
}
