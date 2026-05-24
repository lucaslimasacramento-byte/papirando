import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2, Bookmark, MessageSquareText, RotateCcw, ArrowRight } from 'lucide-react';
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
  onReferralCodeCaptured,
  onReferralCodeConsumed,
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
  const [referralCode, setReferralCode] = useState(() => normalizeReferralCode(initialReferralCode));

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const normalizedInitialCode = normalizeReferralCode(initialReferralCode);
    if (!normalizedInitialCode) return;
    setReferralCode((prev) => prev || normalizedInitialCode);
  }, [initialReferralCode]);

  const resetForm = () => {
    setNome('');
    setCpf('');
    setBirthDate('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
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
    if (msg.includes('invalid login credentials')) return 'E-mail ou senha inválidos.';
    if (msg.includes('user already registered')) return 'Este e-mail já está cadastrado. Tente fazer login.';
    if (msg.includes('password should be at least')) return 'A senha precisa ter pelo menos 6 caracteres.';
    return err?.message || 'Ocorreu um erro ao autenticar.';
  };

  const validateForm = () => {
    if (!email.trim()) { setError('Digite o seu e-mail.'); return false; }
    if (!password.trim()) { setError('Digite a sua senha.'); return false; }
    if (!isLoginMode) {
      if (!nome.trim()) { setError('Digite o seu nome completo.'); return false; }
      if (nome.trim().split(/\s+/).filter(Boolean).length < 2) { setError('Digite nome e sobrenome.'); return false; }
      if (cpf.replace(/\D/g, '').length < 11) { setError('Digite o CPF completo (11 dígitos).'); return false; }
      if (!birthDate) { setError('Informe a data de nascimento.'); return false; }
      if (password.length < 6) { setError('A senha deve ter pelo menos 6 caracteres.'); return false; }
      if (password !== confirmPassword) { setError('As senhas não coincidem.'); return false; }
    }
    return true;
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) { setError('Digite o seu e-mail acima para recuperar a senha.'); return; }
    if (loading) return;
    setLoading(true); setError(''); setSuccessMsg('');
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      if (resetError) throw resetError;
      setSuccessMsg('Link de recuperação enviado. Verifique o seu e-mail.');
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
      });
      if (!result.success) {
        const firstFieldError = result.fieldErrors ? Object.values(result.fieldErrors)[0] : null;
        throw new Error(firstFieldError || result.message || 'Não foi possível criar a conta.');
      }
      setSuccessMsg(result.message || 'Conta criada. Verifique o seu e-mail para ativar o acesso.');
      if (normalizedReferralCode) onReferralCodeConsumed?.();
      setIsLoginMode(true);
      setPassword(''); setConfirmPassword(''); setCpf(''); setBirthDate('');
    } catch (err) {
      setError(getReadableError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <style>{`
      .pl-login-page {
        background: var(--pl-bg);
      }

      .pl-login-cover,
      .pl-login-form-shell {
        min-width: 0;
      }

      .pl-login-card {
        width: min(100%, 560px);
        height: min(760px, calc(100vh - 48px));
        background: rgba(255, 255, 255, 0.86);
        border: 1px solid rgba(20, 17, 13, 0.12);
        border-radius: 22px;
        box-shadow: 0 26px 70px rgba(20, 17, 13, 0.14), 0 3px 12px rgba(20, 17, 13, 0.08);
        backdrop-filter: blur(14px);
        overflow: hidden;
      }

      .pl-login-form {
        width: 100%;
      }

      .pl-login-form .pl-input {
        height: 52px !important;
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.92);
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9);
        font-size: 15px;
      }

      .pl-login-form .pl-input:focus {
        border-color: rgba(29, 78, 216, 0.72);
      }

      .pl-login-card.is-register {
        height: min(760px, calc(100vh - 48px));
      }

      .pl-login-card.is-register .pl-login-card-header {
        margin-bottom: 18px !important;
      }

      .pl-login-card.is-register .pl-login-title {
        font-size: 34px !important;
        line-height: 1 !important;
      }

      .pl-login-card.is-register .pl-login-subtitle {
        margin: 8px 0 16px !important;
        font-size: 13.5px !important;
        line-height: 1.38 !important;
      }

      .pl-login-card.is-register .pl-login-form {
        display: grid !important;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        gap: 8px 10px !important;
      }

      .pl-login-card.is-register .pl-input {
        height: 38px !important;
        border-radius: 10px;
        font-size: 13.5px;
      }

      .pl-login-card.is-register .pl-login-submit,
      .pl-login-card.is-register .pl-login-google {
        height: 40px !important;
        min-height: 40px;
        grid-column: 1 / -1;
      }

      .pl-login-card.is-register .pl-login-divider {
        grid-column: 1 / -1;
        margin: 2px 0;
      }

      .pl-login-card.is-register .pl-register-wide {
        grid-column: 1 / -1;
        max-width: none;
      }

      .pl-login-card.is-register .pl-login-footer {
        padding-top: 16px !important;
        font-size: 11.5px !important;
        line-height: 1.4 !important;
      }

      .pl-login-benefits {
        display: grid;
        gap: 18px;
        margin-top: 34px;
        max-width: 360px;
      }

      .pl-login-benefit {
        display: grid;
        grid-template-columns: 42px minmax(0, 1fr);
        gap: 14px;
        align-items: center;
      }

      .pl-login-benefit-icon {
        width: 42px;
        height: 42px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: 1px solid var(--pl-rule-2);
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.48);
        color: var(--pl-ink);
      }

      @media (max-width: 980px) {
        .pl-login-page {
          grid-template-columns: 1fr !important;
          min-height: 100svh !important;
          height: auto !important;
          overflow: auto !important;
          background-image: repeating-linear-gradient(0deg, transparent 0 47px, var(--pl-rule) 47px 48px);
        }

        .pl-login-cover {
          display: none !important;
        }

        .pl-login-form-shell {
          min-height: 100svh;
          padding: 28px 18px !important;
          border-left: 0 !important;
          overflow: hidden !important;
        }

        .pl-login-card {
          max-height: calc(100svh - 56px);
          height: auto;
          border-radius: 18px;
          padding: 28px 22px !important;
          box-shadow: 0 18px 46px rgba(20, 17, 13, 0.13), 0 2px 10px rgba(20, 17, 13, 0.08);
        }

        .pl-login-card.is-register .pl-login-form {
          display: flex !important;
          flex-direction: column;
        }
      }

      @media (max-width: 520px) {
        .pl-login-form-shell {
          padding: 18px 12px !important;
        }

        .pl-login-card {
          width: 100%;
          max-height: calc(100svh - 36px);
          height: auto;
          border-radius: 16px;
          padding: 24px 16px !important;
        }

        .pl-login-card-header {
          align-items: flex-start !important;
          gap: 18px;
          margin-bottom: 34px !important;
        }

        .pl-login-title {
          font-size: 38px !important;
          line-height: 1.02 !important;
        }

        .pl-login-subtitle {
          margin-bottom: 26px !important;
        }

        .pl-login-form {
          gap: 13px !important;
        }

        .pl-login-card.is-register .pl-login-form {
          gap: 7px !important;
        }

        .pl-login-footer {
          text-align: center;
        }
      }
    `}</style>
    <div className="pl-login-page" style={{
      width: '100%', height: '100vh',
      display: 'grid',
      gridTemplateColumns: 'minmax(0, 1.35fr) minmax(460px, 0.95fr)',
      minHeight: 0,
      overflow: 'hidden',
      fontFamily: 'var(--pl-sans)',
    }}>

      {/* ── COVER (esquerda) ────────────────────────────────────── */}
      <div className="pl-login-cover" style={{
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
            A plataforma de estudos para concurso que fala a sua língua. Marque a página,
            papire a questão e volte de onde parou.
          </p>

          <div className="pl-login-benefits">
            {[
              { icon: Bookmark, title: 'Marque', desc: 'Guarde o que importa para revisar depois.' },
              { icon: MessageSquareText, title: 'Papire', desc: 'Anote dúvidas e insights nas questões.' },
              { icon: RotateCcw, title: 'Volte de onde parou', desc: 'Continue seus estudos sem perder o ritmo.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div className="pl-login-benefit" key={title}>
                <span className="pl-login-benefit-icon"><Icon size={18} strokeWidth={1.7} /></span>
                <span>
                  <strong style={{ display: 'block', fontSize: 14, color: 'var(--pl-ink)', marginBottom: 4 }}>{title}</strong>
                  <span style={{ display: 'block', fontSize: 12.5, lineHeight: 1.4, color: 'var(--pl-ink-3)', fontWeight: 500 }}>{desc}</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Rodape */}
        <div style={{ marginTop: 36, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--pl-ink-3)', letterSpacing: '0.22em', textTransform: 'uppercase' }}>
            v1.0
          </span>
        </div>

        <DecorativePage />
      </div>

      {/* ── FORMULARIO (direita) ─────────────────────────────────── */}
      <div className="pl-login-form-shell" style={{
        background: 'radial-gradient(circle at 50% 0%, rgba(255,255,255,0.92), var(--pl-bg) 58%)',
        borderLeft: '1px solid var(--pl-rule-2)',
        padding: '32px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
      }}>
        <div className={`pl-login-card ${isLoginMode ? '' : 'is-register'}`} style={{
          padding: isLoginMode ? '44px 46px' : '22px 40px',
          display: 'flex',
          flexDirection: 'column',
        }}>
        {/* Cabecalho do formulario */}
        <div className="pl-login-card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 52 }}>
          <span style={{
            fontSize: 11, fontWeight: 700, color: 'var(--pl-ink-3)',
            letterSpacing: '0.24em', textTransform: 'uppercase',
          }}>{isLoginMode ? 'Acesso' : 'Registro'}</span>

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
        <h2 className="pl-login-title" style={{
          margin: 0,
          fontFamily: 'var(--pl-serif)', fontStyle: 'italic', fontWeight: 300,
          fontSize: 48, lineHeight: 0.98, letterSpacing: '-0.04em',
          color: 'var(--pl-ink)',
        }}>
          {isLoginMode
            ? <>Bem-vindo de volta<span style={{ color: 'var(--pl-accent)' }}>.</span></>
            : <>Bora começar a papirar<span style={{ color: 'var(--pl-accent)' }}>.</span></>}
        </h2>
        <p className="pl-login-subtitle" style={{
          margin: '14px 0 32px',
          fontSize: 15, lineHeight: 1.55, color: 'var(--pl-ink-2)',
          maxWidth: '42ch', fontWeight: 500,
        }}>
          {isLoginMode
            ? 'Que bom te ver papirando de novo. Sua sequência está esperando por você.'
            : 'Conta grátis. Plano de estudos personalizado em poucos minutos.'}
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
        <form className="pl-login-form" onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 460 }}>

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

          {/* E-mail */}
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
                Mínimo de 6 caracteres.
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

          {/* Código de convite (apenas cadastro) */}
          {!isLoginMode && (
            <PlField label="Código de convite (opcional)" className="pl-register-wide">
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
          <button className="pl-login-submit" type="submit" disabled={loading} style={{
            marginTop: 8, height: 52, padding: '0 22px',
            background: 'var(--pl-ink)', color: 'var(--pl-bg)',
            border: 0, borderRadius: 12,
            fontFamily: 'var(--pl-sans)', fontSize: 15, fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            opacity: loading ? 0.7 : 1,
            transition: 'opacity .12s',
          }}>
            {loading ? (
              <><Loader2 size={16} className="animate-spin" /> Processando...</>
            ) : isLoginMode ? (
              <><ArrowRight size={17} /> Papirar</>
            ) : (
              'Criar conta e começar'
            )}
          </button>

          {/* Divisor */}
          <div className="pl-login-divider" style={{
            display: 'flex', alignItems: 'center', gap: 14,
            color: 'var(--pl-ink-4)',
            fontSize: 11, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase',
          }}>
            <span style={{ flex: 1, height: 1, background: 'var(--pl-rule)' }} />
            ou continuar com
            <span style={{ flex: 1, height: 1, background: 'var(--pl-rule)' }} />
          </div>

          {/* Google */}
          <button className="pl-login-google" type="button" style={{
            height: 52,
            background: 'var(--pl-surface)', border: '1px solid var(--pl-rule-strong)',
            borderRadius: 12,
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
        <div className="pl-login-footer" style={{
          marginTop: 'auto', paddingTop: 32,
          fontSize: 12.5, color: 'var(--pl-ink-3)', fontWeight: 500, lineHeight: 1.55,
        }}>
          {isLoginMode ? (
            <>
              Ainda não tem conta?{' '}
              <button type="button" onClick={() => handleToggleMode('cadastro')} style={{
                background: 'transparent', border: 0, padding: 0,
                fontFamily: 'var(--pl-sans)', fontSize: 12.5, fontWeight: 600,
                color: 'var(--pl-accent)', cursor: 'pointer',
                textDecoration: 'underline', textDecorationColor: 'rgba(29,78,216,0.3)',
              }}>Criar conta</button>
            </>
          ) : (
            <>
              Já é papireiro?{' '}
              <button type="button" onClick={() => handleToggleMode('login')} style={{
                background: 'transparent', border: 0, padding: 0,
                fontFamily: 'var(--pl-sans)', fontSize: 12.5, fontWeight: 600,
                color: 'var(--pl-accent)', cursor: 'pointer',
                textDecoration: 'underline', textDecorationColor: 'rgba(29,78,216,0.3)',
              }}>Entra na sua conta</button>
              {' '}·{' '}
              <a href="#" style={{ color: 'var(--pl-ink-2)', textDecoration: 'underline', textDecorationColor: 'var(--pl-rule-strong)', textUnderlineOffset: 2 }}>termos</a>
              {' '}e{' '}
              <a href="#" style={{ color: 'var(--pl-ink-2)', textDecoration: 'underline', textDecorationColor: 'var(--pl-rule-strong)', textUnderlineOffset: 2 }}>privacidade</a>
            </>
          )}
        </div>
      </div>
      </div>
    </div>
    </>
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
function PlField({ label, aside, children, className = '' }) {
  return (
    <div className={className} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--pl-ink-2)' }}>{label}</label>
        {aside}
      </div>
      {children}
    </div>
  );
}
