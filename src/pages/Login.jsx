import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { normalizeReferralCode } from '../lib/referrals';
import { normalizeBetaInviteToken } from '../lib/betaInvitesApi';
import { registerFreeAccount } from '../lib/registerApi';
import { formatCpf, isValidCpf, normalizeCpf } from '../lib/cpfAlgorithm';
import {
  Target,
  BrainCircuit,
  TrendingUp,
  Timer,
  FileText,
  RotateCcw,
  Trophy,
  User,
  Mail,
  Lock,
  EyeOff,
  Eye,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  Stars,
  Loader2,
  Smartphone,
  AlertCircle,
  CalendarDays,
  IdCard,
} from 'lucide-react';

const LOGIN_FEATURES = [
  {
    icon: Target,
    title: 'Foco Extremo',
    desc: 'Ambiente livre de distrações para maximizar sua retenção.',
  },
  {
    icon: FileText,
    title: 'Simulados Inteligentes',
    desc: 'Treine com provas no padrão da banca e acompanhe sua evolução.',
  },
  {
    icon: TrendingUp,
    title: 'Evolução em Tempo Real',
    desc: 'Acompanhe seu desempenho disciplina por disciplina.',
  },
  {
    icon: RotateCcw,
    title: 'Revisão Estratégica',
    desc: 'Reforce os pontos certos antes da prova.',
  },
];

const QUICK_STATS = [
  { label: 'Questões', value: '50k+', helper: 'Atualizadas', icon: FileText },
  { label: 'Simulados', value: '120+', helper: 'Provas realistas', icon: Trophy },
  { label: 'Foco médio', value: '87%', helper: 'Mais retenção', icon: TrendingUp },
];

export default function Login({
  setIsAuthenticated,
  initialReferralCode = '',
  initialBetaInviteToken = '',
  onReferralCodeCaptured,
  onReferralCodeConsumed,
  onBetaInviteConsumed,
}) {
  const [isLoginMode, setIsLoginMode] = useState(() => !normalizeBetaInviteToken(initialBetaInviteToken));
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loginSlide, setLoginSlide] = useState(0);
  const [rememberMe, setRememberMe] = useState(true);

  const [nome, setNome] = useState('');
  const [celular, setCelular] = useState('');
  const [cpf, setCpf] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState(() => normalizeReferralCode(initialReferralCode));
  const [betaInviteToken, setBetaInviteToken] = useState(() => normalizeBetaInviteToken(initialBetaInviteToken));

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const activeFeature = LOGIN_FEATURES[loginSlide];
  const ActiveFeatureIcon = activeFeature.icon;
  const hasBetaInvite = Boolean(betaInviteToken);

  useEffect(() => {
    const interval = setInterval(() => {
      setLoginSlide((prev) => (prev + 1) % LOGIN_FEATURES.length);
    }, 3500);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const normalizedInitialCode = normalizeReferralCode(initialReferralCode);
    if (!normalizedInitialCode) return;
    setReferralCode((prev) => prev || normalizedInitialCode);
  }, [initialReferralCode]);

  useEffect(() => {
    const normalizedToken = normalizeBetaInviteToken(initialBetaInviteToken);
    if (!normalizedToken) return;
    setBetaInviteToken(normalizedToken);
    setIsLoginMode(false);
  }, [initialBetaInviteToken]);

  const resetForm = () => {
    setNome('');
    setCelular('');
    setCpf('');
    setBirthDate('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setReferralCode(normalizeReferralCode(initialReferralCode));
    setBetaInviteToken(normalizeBetaInviteToken(initialBetaInviteToken));
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const handleToggleMode = () => {
    setIsLoginMode((prev) => !prev);
    setError('');
    setSuccessMsg('');
    resetForm();
  };

  const formatPhone = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);

    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const getReadableError = (error) => {
    const message = error?.message?.toLowerCase?.() || '';

    if (message.includes('email rate limit exceeded')) {
      return 'Você tentou enviar emails demais em pouco tempo. Aguarde alguns minutos antes de tentar novamente.';
    }

    if (message.includes('invalid login credentials')) {
      return 'Email ou senha inválidos.';
    }

    if (message.includes('user already registered')) {
      return 'Este email já está cadastrado. Tente fazer login.';
    }

    if (message.includes('password should be at least')) {
      return 'A senha precisa ter pelo menos 6 caracteres.';
    }

    return error?.message || 'Ocorreu um erro ao autenticar.';
  };

  const validateForm = () => {
    if (!email.trim()) {
      setError('Digite o seu email.');
      return false;
    }

    if (!password.trim()) {
      setError('Digite a sua senha.');
      return false;
    }

    if (!isLoginMode) {
      if (!nome.trim()) {
        setError('Digite o seu nome completo.');
        return false;
      }

      if (!celular.trim()) {
        setError('Digite o seu celular.');
        return false;
      }

      if (!isValidCpf(cpf)) {
        setError('Digite um CPF válido.');
        return false;
      }

      if (!birthDate) {
        setError('Informe sua data de nascimento.');
        return false;
      }

      if (password.length < 6) {
        setError('A senha deve ter pelo menos 6 caracteres.');
        return false;
      }

      if (!confirmPassword.trim()) {
        setError('Confirme a sua senha.');
        return false;
      }

      if (password !== confirmPassword) {
        setError('As senhas não coincidem. Verifique e tente novamente.');
        return false;
      }
    }

    return true;
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError('Digite o seu email acima para recuperar a senha.');
      return;
    }

    if (loading) return;

    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });

      if (resetError) throw resetError;

      setSuccessMsg('Link de recuperação enviado! Verifique o seu email.');
    } catch (err) {
      setError(getReadableError(err));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();

    if (loading) return;
    setError('');
    setSuccessMsg('');
    if (!validateForm()) return;

    setLoading(true);

    try {
      if (isLoginMode) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;

        setIsAuthenticated(true);
        return;
      }

      const normalizedReferralCode = normalizeReferralCode(referralCode);
      const result = await registerFreeAccount({
        fullName: nome,
        cpf: normalizeCpf(cpf),
        birthDate,
        email,
        password,
        celular,
        referralCode: normalizedReferralCode,
        betaInviteToken,
      });

      if (!result.success) {
        const firstFieldError = result.fieldErrors ? Object.values(result.fieldErrors).find(Boolean) : '';
        throw new Error(firstFieldError || result.message || 'Não foi possível criar a conta.');
      }

      setSuccessMsg(result.message || 'Cadastro realizado! Verifique seu email para ativar o acesso.');
      if (normalizedReferralCode) {
        onReferralCodeConsumed?.();
      }
      if (betaInviteToken) {
        onBetaInviteConsumed?.();
      }
      setIsLoginMode(true);
      setCpf('');
      setBirthDate('');
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(getReadableError(err));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#F8FAFC] font-sans text-slate-900 animate-in fade-in duration-500 lg:flex">
      <section className="relative flex h-[42vh] min-h-[340px] w-full flex-col justify-center overflow-hidden bg-[radial-gradient(circle_at_18%_10%,rgba(96,165,250,0.28),transparent_28%),radial-gradient(circle_at_82%_78%,rgba(37,99,235,0.38),transparent_34%),linear-gradient(135deg,#081a3b_0%,#102A56_44%,#1D4ED8_100%)] px-6 py-6 sm:px-10 lg:h-screen lg:w-[55%] lg:px-10 lg:py-6 xl:px-14">
        <div className="pointer-events-none absolute inset-0 opacity-[0.12] bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
        <div className="pointer-events-none absolute -left-28 top-16 h-80 w-80 rounded-full bg-sky-300/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 right-0 h-[34rem] w-[34rem] rounded-full bg-blue-500/45 blur-3xl" />
        <div className="pointer-events-none absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-white/8 blur-3xl" />

        <div className="relative z-10 mx-auto flex max-h-full w-full max-w-3xl flex-col overflow-hidden">
          <div className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-blue-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] backdrop-blur-md lg:mb-5">
            <ShieldCheck size={14} />
            Plataforma premium de aprovação
          </div>

          <div className="mb-4 rounded-[2rem] border border-white/12 bg-white/[0.08] p-4 shadow-[0_24px_70px_rgba(2,8,23,0.28)] backdrop-blur-xl sm:p-5 lg:mb-5">
            <div className="flex flex-col gap-3">
              <div className="inline-flex w-fit rounded-2xl border border-white/12 bg-white/8 px-5 py-3 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.07)] backdrop-blur-sm">
                <h1
                  className="bg-[linear-gradient(92deg,#ffffff_8%,#dbeafe_45%,#93c5fd_100%)] bg-clip-text text-3xl font-extrabold leading-none tracking-tight text-transparent drop-shadow-[0_0_18px_rgba(147,197,253,0.35)] sm:text-4xl xl:text-5xl"
                  style={{ fontFamily: 'Poppins, "Plus Jakarta Sans", "Segoe UI", sans-serif' }}
                >
                  Papirando
                </h1>
              </div>
              <p className="max-w-xl break-words text-lg font-semibold leading-snug text-blue-100 sm:text-xl xl:text-2xl">
                Estude com <span className="text-sky-300">estratégia</span>.{' '}
                <span className="block sm:inline">
                  Aprove com <span className="text-sky-300">constância</span>.
                </span>
              </p>
            </div>
          </div>

          <div className="mb-4 flex w-full gap-3 overflow-x-auto pb-1 [scrollbar-width:none] sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible lg:mb-5 [&::-webkit-scrollbar]:hidden">
            {QUICK_STATS.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="w-[150px] shrink-0 rounded-[1.4rem] border border-white/12 bg-white/[0.09] p-3.5 shadow-[0_18px_45px_rgba(2,8,23,0.18)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:bg-white/[0.12] sm:w-auto xl:p-4"
                >
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-400/15 text-sky-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] xl:h-10 xl:w-10">
                    <Icon size={20} />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-200">{item.label}</p>
                  <p className="mt-1 text-2xl font-black tracking-tight text-white xl:text-3xl">{item.value}</p>
                  <p className="mt-1 text-xs font-semibold text-blue-100/75">{item.helper}</p>
                </div>
              );
            })}
          </div>

          <div className="relative hidden min-h-[230px] overflow-hidden rounded-[2rem] border border-white/14 bg-white/[0.09] p-6 shadow-[0_28px_80px_rgba(2,8,23,0.32)] backdrop-blur-xl sm:block xl:min-h-[285px] xl:p-8">
            <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-blue-300/20 blur-3xl" />
            <div className="absolute bottom-0 right-4 hidden h-40 w-60 rotate-[-8deg] rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(15,42,95,0.92),rgba(37,99,235,0.55))] p-4 shadow-2xl xl:block xl:h-48 xl:w-72">
              <div className="mb-4 flex gap-1.5">
                <span className="h-2 w-2 rounded-full bg-sky-300/80" />
                <span className="h-2 w-2 rounded-full bg-white/25" />
                <span className="h-2 w-2 rounded-full bg-white/25" />
              </div>
              <div className="space-y-3">
                <div className="h-4 w-3/4 rounded-full bg-white/18" />
                <div className="h-4 w-1/2 rounded-full bg-white/12" />
                <div className="mt-6 flex items-center gap-4">
                  <div className="grid h-16 w-16 place-items-center rounded-full border-4 border-sky-400/70 text-sm font-black text-sky-100 xl:h-20 xl:w-20">87%</div>
                  <div className="flex-1 space-y-2">
                    <div className="h-3 rounded-full bg-sky-300/45" />
                    <div className="h-3 w-2/3 rounded-full bg-white/12" />
                  </div>
                </div>
              </div>
            </div>

            <div key={activeFeature.title} className="absolute inset-0 flex animate-in fade-in slide-in-from-bottom-4 duration-500 flex-col justify-center px-6 sm:px-8">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/14 bg-white/12 text-sky-300 shadow-lg backdrop-blur-md xl:mb-6 xl:h-16 xl:w-16">
                <ActiveFeatureIcon size={32} />
              </div>
              <h2 className="max-w-[16rem] text-2xl font-black tracking-tight text-white sm:max-w-sm xl:text-3xl">{activeFeature.title}</h2>
              <p className="mt-3 max-w-[16rem] text-base font-medium leading-relaxed text-blue-100/80 sm:max-w-sm">{activeFeature.desc}</p>
            </div>
          </div>

          <div className="mt-4 hidden items-center justify-center gap-2 sm:flex xl:mt-5">
            {LOGIN_FEATURES.map((feature, idx) => (
              <button
                key={feature.title}
                type="button"
                onClick={() => setLoginSlide(idx)}
                className={`h-2 rounded-full transition-all duration-500 focus:outline-none focus:ring-2 focus:ring-sky-300/70 ${
                  loginSlide === idx ? 'w-9 bg-sky-300' : 'w-2.5 bg-white/22 hover:bg-white/45'
                }`}
                aria-label={`Ir para ${feature.title}`}
              />
            ))}
          </div>

          <div className="mt-4 hidden gap-3 rounded-[1.5rem] border border-white/10 bg-white/[0.07] p-3 text-sm text-blue-100/85 shadow-[0_18px_45px_rgba(2,8,23,0.18)] backdrop-blur-xl lg:grid lg:grid-cols-3 xl:mt-5 xl:p-4">
            <TrustItem icon={ShieldCheck} title="Ambiente seguro" text="Dados protegidos" />
            <TrustItem icon={Timer} title="Alta performance" text="Plataforma leve" />
            <TrustItem icon={BrainCircuit} title="Feito para aprovados" text="Metodologia comprovada" />
          </div>
        </div>
      </section>

      <section className="relative flex h-[58vh] w-full flex-col items-center justify-center overflow-hidden px-5 py-5 sm:px-8 lg:h-screen lg:w-[45%] lg:px-10">
        <div className="pointer-events-none absolute -top-24 left-0 h-80 w-80 rounded-full bg-blue-100/80 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-96 w-96 rounded-full bg-sky-100/70 blur-3xl" />
        <div className="pointer-events-none absolute right-16 top-1/4 h-40 w-40 rounded-full border border-blue-100/60" />
        <div className="relative z-10 mb-4 flex w-full max-w-xl justify-center lg:absolute lg:right-8 lg:top-8 lg:mb-0 lg:max-w-none lg:justify-end">
          <div className="rounded-full border border-slate-200/80 bg-white/85 px-4 py-2 text-sm font-bold text-slate-500 shadow-[0_14px_35px_rgba(15,23,42,0.08)] backdrop-blur-xl">
            {isLoginMode ? 'Ainda não tem conta?' : 'Já possui conta?'}
            <button
              type="button"
              onClick={handleToggleMode}
              disabled={loading}
              className="ml-2 inline-flex items-center gap-1 text-[#1d4ed8] transition hover:text-[#1D4ED8] disabled:opacity-60"
            >
              {isLoginMode ? (hasBetaInvite ? 'Ativar convite' : 'Registre-se grátis') : 'Fazer login'}
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

        <div className="relative z-10 w-full max-w-xl space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 lg:space-y-5">
          <div className="text-center lg:text-left">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3.5 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-blue-700 shadow-sm lg:mb-4">
              <Stars size={13} />
              {hasBetaInvite && !isLoginMode ? 'Convite beta liberado' : isLoginMode ? 'Acesso rápido' : 'Criação imediata'}
            </div>

            <h2 className="text-3xl font-black tracking-tight text-[#14110d] xl:text-4xl">
              {hasBetaInvite && !isLoginMode ? 'Seu acesso beta chegou' : isLoginMode ? 'Bem-vindo(a) de volta!' : 'Crie a sua conta'}
            </h2>
            <p className="mt-2 text-sm font-medium leading-relaxed text-[#64748B] xl:text-base">
              {hasBetaInvite && !isLoginMode
                ? 'Entre com o mesmo e-mail que recebeu o convite e ative 3 meses de testes com todos os recursos.'
                : isLoginMode
                ? 'Acesse sua conta e continue sua jornada de aprovação.'
                : 'Comece sua jornada com uma rotina de estudos mais inteligente.'}
            </p>
          </div>

          {hasBetaInvite && !isLoginMode ? <BetaInviteWelcome /> : null}

          {successMsg && (
            <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 shadow-sm">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
              {successMsg}
            </div>
          )}

          {error && (
            <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 shadow-sm">
              <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-400" />
              {error}
            </div>
          )}

          <div className="rounded-[2rem] border border-[#E2E8F0] bg-white/90 p-5 shadow-[0_26px_70px_rgba(15,23,42,0.12)] backdrop-blur-xl sm:p-6 xl:p-8">
            <form onSubmit={handleAuth} className="space-y-4 xl:space-y-5">
              {!isLoginMode && (
                <>
                  <InputField
                    label="Nome Completo"
                    type="text"
                    placeholder="Lucas Sacramento"
                    icon={User}
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                  />

                  <InputField
                    label="Celular"
                    type="tel"
                    placeholder="(75) 99999-9999"
                    icon={Smartphone}
                    value={celular}
                    onChange={(e) => setCelular(formatPhone(e.target.value))}
                  />
                  <InputField
                    label="CPF"
                    type="text"
                    placeholder="000.000.000-00"
                    icon={IdCard}
                    value={cpf}
                    onChange={(e) => setCpf(formatCpf(e.target.value))}
                    inputMode="numeric"
                    maxLength={14}
                  />
                  <InputField
                    label="Data de nascimento"
                    type="date"
                    placeholder=""
                    icon={CalendarDays}
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    max={new Date().toISOString().slice(0, 10)}
                  />
                  <InputField
                    label={hasBetaInvite ? 'Convite beta' : 'Código de convite'}
                    type="text"
                    placeholder={hasBetaInvite ? 'Acesso completo por 3 meses' : 'Opcional'}
                    icon={Stars}
                    value={hasBetaInvite ? 'BETA 3 MESES - TODOS OS RECURSOS' : referralCode}
                    onChange={(e) => {
                      if (hasBetaInvite) return;
                      const nextCode = normalizeReferralCode(e.target.value);
                      setReferralCode(nextCode);
                      onReferralCodeCaptured?.(nextCode);
                    }}
                    required={false}
                    readOnly={hasBetaInvite}
                  />
                </>
              )}

              <InputField
                label="Email"
                type="email"
                placeholder="seu@email.com"
                icon={Mail}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <PasswordField
                label="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                showPassword={showPassword}
                setShowPassword={setShowPassword}
                isLoginMode={isLoginMode}
                onForgotPassword={handleForgotPassword}
                loading={loading}
              />

              {!isLoginMode && (
                <PasswordField
                  label="Confirmar Senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  showPassword={showConfirmPassword}
                  setShowPassword={setShowConfirmPassword}
                  isConfirm
                  loading={loading}
                />
              )}

              {!isLoginMode && (
                <button
                  type="button"
                  onClick={handleToggleMode}
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-3.5 text-sm font-bold text-slate-700 transition-all duration-300 hover:bg-slate-50 hover:shadow-sm disabled:opacity-60"
                >
                  <ArrowLeft size={16} />
                  Voltar para login
                </button>
              )}

              <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
                <label className="flex cursor-pointer select-none items-center gap-2.5 text-sm font-bold text-slate-600">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={() => setRememberMe(!rememberMe)}
                    className="h-5 w-5 rounded-md border-slate-300 text-[#1d4ed8] shadow-sm focus:ring-4 focus:ring-blue-500/20"
                  />
                  Manter sessão ativa
                </label>

                <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-black text-emerald-700 shadow-sm">
                  <ShieldCheck size={14} />
                  Ambiente seguro
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="group mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#1d4ed8,#1D4ED8)] py-3.5 text-sm font-black text-white shadow-[0_18px_36px_rgba(37,99,235,0.32)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_44px_rgba(37,99,235,0.38)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0 xl:mt-4 xl:py-4"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    {isLoginMode ? 'Entrar na Plataforma' : hasBetaInvite ? 'Ativar meu beta de 3 meses' : 'Criar Conta Grátis'}
                    <ArrowRight size={18} className="transition-transform duration-300 group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </form>
          </div>

          <p className="hidden items-center justify-center gap-2 text-center text-xs font-semibold text-slate-500 sm:flex">
            <Lock size={14} className="text-slate-400" />
            Seus dados estão protegidos com criptografia de ponta.
          </p>
        </div>
      </section>
    </div>
  );
}

function TrustItem({ icon: Icon, title, text }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-sky-300">
        <Icon size={18} />
      </span>
      <span>
        <span className="block text-sm font-black text-white">{title}</span>
        <span className="block text-xs font-medium text-blue-100/70">{text}</span>
      </span>
    </div>
  );
}

function BetaInviteWelcome() {
  const benefits = [
    '3 meses de testes com acesso completo à plataforma.',
    'Recursos de IA, redações, flashcards, simulados, ciclos, estatísticas e audiolivros liberados.',
    'Quanto mais feedbacks úteis você enviar durante o beta, mais descontos acumula para usar ao fim do período de testes.',
  ];

  return (
    <section className="overflow-hidden rounded-[28px] border border-blue-100 bg-white shadow-[0_18px_45px_rgba(37,99,235,0.12)]">
      <div className="bg-[linear-gradient(135deg,#0f2a4f,#1d4ed8)] px-5 py-5 text-white">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-blue-100">
          <ShieldCheck size={13} />
          Beta fechado
        </div>
        <h3 className="text-xl font-black tracking-tight">Você foi escolhido para testar o Papirando por dentro.</h3>
        <p className="mt-2 text-sm font-medium leading-relaxed text-blue-100">
          A ideia é simples: use tudo, explore com calma e conte o que funcionou, o que travou e o que faria sua rotina ficar melhor.
        </p>
      </div>

      <div className="space-y-3 px-5 py-5">
        {benefits.map((item) => (
          <div key={item} className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <CheckCircle2 size={14} />
            </span>
            <p className="text-sm font-semibold leading-relaxed text-slate-700">{item}</p>
          </div>
        ))}
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold leading-relaxed text-amber-900">
          Seu feedback vira moeda de desconto: bugs bem descritos, sugestões claras e relatos reais ajudam a moldar a plataforma e podem reduzir o valor quando os testes terminarem.
        </div>
      </div>
    </section>
  );
}

function InputField({
  label,
  type,
  placeholder,
  icon: Icon,
  value,
  onChange,
  required = true,
  inputMode,
  maxLength,
  max,
  readOnly = false,
}) {
  return (
    <div>
      <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
        {label}
      </label>
      <div className="relative">
        <Icon size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type={type}
          placeholder={placeholder}
          required={required}
          value={value}
          onChange={onChange}
          inputMode={inputMode}
          maxLength={maxLength}
          max={max}
          readOnly={readOnly}
          className={`h-[52px] w-full rounded-2xl border border-[#E2E8F0] py-3 pl-12 pr-4 text-base font-semibold text-slate-800 outline-none transition-all placeholder:text-slate-400 xl:h-[60px] xl:py-4 ${
            readOnly
              ? 'bg-blue-50 text-blue-900'
              : 'bg-slate-50/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] focus:border-[#1d4ed8] focus:bg-white focus:ring-4 focus:ring-blue-500/15'
          }`}
        />
      </div>
    </div>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  showPassword,
  setShowPassword,
  isLoginMode = false,
  onForgotPassword,
  isConfirm = false,
  loading = false,
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="block text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
          {label}
        </label>

        {isLoginMode && !isConfirm && (
          <button
            type="button"
            onClick={onForgotPassword}
            disabled={loading}
            className="text-xs font-black text-[#1d4ed8] transition hover:text-[#1D4ED8] disabled:opacity-60"
          >
            Esqueceu a senha?
          </button>
        )}
      </div>

      <div className="relative">
        <Lock size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type={showPassword ? 'text' : 'password'}
          placeholder="••••••••"
          required
          value={value}
          onChange={onChange}
          className="h-[52px] w-full rounded-2xl border border-[#E2E8F0] bg-slate-50/80 py-3 pl-12 pr-12 text-base font-semibold text-slate-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] outline-none transition-all placeholder:text-slate-400 focus:border-[#1d4ed8] focus:bg-white focus:ring-4 focus:ring-blue-500/15 xl:h-[60px] xl:py-4"
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          disabled={loading}
          className="absolute right-4 top-1/2 -translate-y-1/2 rounded-xl p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-60"
          aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
        >
          {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      </div>
    </div>
  );
}
