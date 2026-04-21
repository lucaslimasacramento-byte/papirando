import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { normalizeReferralCode } from '../lib/referrals';
import {
  Target,
  BrainCircuit,
  TrendingUp,
  Timer,
  FileText,
  RotateCcw,
  Trophy,
  Calendar as CalendarIcon,
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
} from 'lucide-react';

const LOGIN_FEATURES = [
  {
    icon: Target,
    title: 'Foco Extremo',
    desc: 'Ambiente livre de distrações para maximizar a sua retenção.',
  },
  {
    icon: BrainCircuit,
    title: 'Tutor com IA',
    desc: 'Correção de redações e flashcards gerados automaticamente.',
  },
  {
    icon: TrendingUp,
    title: 'Estatísticas Profundas',
    desc: 'Saiba exatamente onde está errando e como melhorar o desempenho.',
  },
  {
    icon: Timer,
    title: 'Sessões Otimizadas',
    desc: 'Pomodoro e cronômetro integrados ao seu ciclo de estudos.',
  },
  {
    icon: FileText,
    title: 'Edital Verticalizado',
    desc: 'Controle absoluto do seu progresso, tópico por tópico.',
  },
  {
    icon: RotateCcw,
    title: 'Revisões Inteligentes',
    desc: 'Algoritmo de repetição espaçada para não esquecer a matéria.',
  },
  {
    icon: Trophy,
    title: 'Simulados Inéditos',
    desc: 'Teste-se contra milhares de concurseiros com ranking nacional.',
  },
  {
    icon: CalendarIcon,
    title: 'Agenda Integrada',
    desc: 'Organize a sua rotina com um painel Kanban e calendário sincronizado.',
  },
];

const QUICK_STATS = [
  { label: 'Questões', value: '50k+' },
  { label: 'Simulados', value: '120+' },
  { label: 'Foco médio', value: '87%' },
];

export default function Login({
  setIsAuthenticated,
  initialReferralCode = '',
  onReferralCodeCaptured,
  onReferralCodeConsumed,
}) {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loginSlide, setLoginSlide] = useState(0);
  const [rememberMe, setRememberMe] = useState(true);

  const [nome, setNome] = useState('');
  const [celular, setCelular] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState(() => normalizeReferralCode(initialReferralCode));

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const activeFeature = useMemo(() => LOGIN_FEATURES[loginSlide], [loginSlide]);

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

  const resetForm = () => {
    setNome('');
    setCelular('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setReferralCode(normalizeReferralCode(initialReferralCode));
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
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;

        console.log('✅ Logado:', data);
        setIsAuthenticated(true);
        return;
      }

      const normalizedReferralCode = normalizeReferralCode(referralCode);
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nome: nome || '',
            celular: celular || '',
            referred_by_code: normalizedReferralCode || '',
          },
        },
      });

      if (signUpError) throw signUpError;

      if (data?.user?.id) {
        const { error: profileError } = await supabase.from('profiles').upsert({
          id: data.user.id,
          nome: nome || '',
          email: data.user.email,
          celular: celular || '',
          referred_by_code: normalizedReferralCode || null,
        });

        if (profileError) {
          console.error('Erro ao criar perfil:', profileError.message);
        }
      }

      setSuccessMsg('Conta criada! Verifique o seu email para ativar o acesso.');
      if (normalizedReferralCode) {
        onReferralCodeConsumed?.();
      }
      setIsLoginMode(true);
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
    <div className="flex min-h-screen w-full overflow-hidden bg-[linear-gradient(180deg,#eef3fb_0%,#f7faff_50%,#eef3fb_100%)] font-sans animate-in fade-in duration-500">
      <div className="hidden lg:flex w-1/2 bg-[linear-gradient(135deg,#102347_0%,#173768_52%,#2b4ae0_100%)] relative items-center justify-center overflow-hidden flex-col p-10">
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
        <div className="absolute -right-24 -bottom-24 w-[28rem] h-[28rem] bg-[#2563EB] rounded-full blur-3xl opacity-40" />
        <div className="absolute -left-24 -top-24 w-[24rem] h-[24rem] bg-blue-400 rounded-full blur-3xl opacity-20" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_30%)]" />

        <div className="relative z-10 flex w-full max-w-xl flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 text-blue-100 px-4 py-2 rounded-full border border-white/10 text-[10px] font-black uppercase tracking-[0.22em] mb-8 backdrop-blur-md">
            <ShieldCheck size={14} />
            Plataforma premium de aprovação
          </div>

          <div className="mb-4 flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-white/20 bg-white/10 p-2.5 backdrop-blur-sm shadow-xl">
            <img
              src="/assets/branding/papirando-logo.png"
              alt="Papirando"
              className="h-full w-full object-contain"
            />
          </div>

          <h2 className="text-3xl font-black text-white tracking-tight mb-1">Papirando</h2>
          <p className="text-base text-blue-200/80 font-medium mb-10">A máquina de aprovação.</p>

          <div className="grid grid-cols-3 gap-3 w-full mb-10">
            {QUICK_STATS.map((item) => (
              <div
                key={item.label}
                className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-lg"
              >
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-200 mb-1">
                  {item.label}
                </p>
                <p className="text-2xl font-black text-white tracking-tight">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="relative w-full rounded-[2rem] border border-white/10 bg-white/10 backdrop-blur-md px-8 py-10 shadow-2xl min-h-[260px] flex flex-col items-center justify-center">
            {LOGIN_FEATURES.map((feat, idx) => {
              const Icon = feat.icon;
              return (
                <div
                  key={feat.title}
                  className={`absolute flex flex-col items-center transition-all duration-700 ease-in-out px-8 ${
                    loginSlide === idx
                      ? 'opacity-100 translate-y-0 scale-100'
                      : 'opacity-0 translate-y-8 scale-95 pointer-events-none'
                  }`}
                >
                  <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 text-blue-300 mb-5 shadow-lg">
                    <Icon size={34} />
                  </div>
                  <h3 className="text-white font-black text-2xl mb-2 tracking-tight">{feat.title}</h3>
                  <p className="text-blue-100/80 text-sm max-w-sm leading-relaxed">{feat.desc}</p>
                </div>
              );
            })}

            <div className="opacity-0 pointer-events-none">
              <div className="bg-white/10 rounded-2xl p-4 mb-5">
                <activeFeature.icon size={34} />
              </div>
              <h3 className="text-2xl font-black mb-2">{activeFeature.title}</h3>
              <p className="text-sm">{activeFeature.desc}</p>
            </div>
          </div>

          <div className="flex gap-2 mt-8">
            {LOGIN_FEATURES.map((feature, idx) => (
              <button
                key={feature.title}
                type="button"
                onClick={() => setLoginSlide(idx)}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  loginSlide === idx ? 'w-8 bg-[#60A5FA]' : 'w-2 bg-white/20 hover:bg-white/40'
                }`}
                aria-label={`Ir para ${feature.title}`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 sm:p-8 relative">
        <div className="absolute top-6 right-6 sm:top-8 sm:right-8 text-sm font-bold text-gray-500 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full border border-gray-100 shadow-sm">
          {isLoginMode ? 'Ainda não tem conta?' : 'Já possui conta?'}
          <button
            type="button"
            onClick={handleToggleMode}
            disabled={loading}
            className="ml-2 text-[#2563EB] hover:underline disabled:opacity-60"
          >
            {isLoginMode ? 'Registre-se grátis' : 'Fazer login'}
          </button>
        </div>

        <div className="w-full max-w-md space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="text-center lg:text-left">
            <div className="lg:hidden w-16 h-16 bg-[#142B4D] rounded-2xl shadow-md flex items-center justify-center mb-6 mx-auto border border-blue-100/20 overflow-hidden p-2">
              <img
                src="/assets/branding/papirando-logo.png"
                alt="papirando.app"
                className="h-full w-full object-cover object-right"
              />
            </div>

            <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-100 mb-4">
              <Stars size={12} />
              {isLoginMode ? 'Acesso rápido' : 'Criação imediata'}
            </div>

            <h2 className="text-3xl font-extrabold text-gray-900 mb-2 tracking-tight">
              {isLoginMode ? 'Bem-vindo(a) de volta!' : 'Crie a sua conta'}
            </h2>
            <p className="text-gray-500 font-medium leading-relaxed">
              {isLoginMode
                ? 'Insira suas credenciais para acessar o painel.'
                : 'Junte-se à elite dos concurseiros hoje.'}
            </p>
          </div>

          {successMsg && (
            <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
              {successMsg}
            </div>
          )}

          {error && (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-400" />
              {error}
            </div>
          )}

          <div className="surface-card-strong rounded-[28px] p-6 sm:p-7">
            <form onSubmit={handleAuth} className="space-y-5">
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
                    label="Código de convite"
                    type="text"
                    placeholder="Opcional"
                    icon={Stars}
                    value={referralCode}
                    onChange={(e) => {
                      const nextCode = normalizeReferralCode(e.target.value);
                      setReferralCode(nextCode);
                      onReferralCodeCaptured?.(nextCode);
                    }}
                    required={false}
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
                  className="w-full border border-gray-200 bg-white text-gray-700 py-3.5 rounded-xl font-bold text-sm transition-all duration-300 hover:bg-gray-50 hover:shadow-sm flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <ArrowLeft size={16} />
                  Voltar para login
                </button>
              )}

              <div className="flex items-center justify-between gap-4 pt-1">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-500 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={() => setRememberMe(!rememberMe)}
                    className="w-4 h-4 rounded border-gray-300 text-[#2563EB] focus:ring-[#2563EB]"
                  />
                  Manter sessão ativa
                </label>

                <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-full">
                  <CheckCircle2 size={14} />
                  Ambiente seguro
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#2563EB] text-white py-4 rounded-xl font-bold text-sm shadow-[0_4px_14px_rgba(37,99,235,0.3)] hover:bg-[#1D4ED8] hover:scale-[1.02] active:scale-[0.99] transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    {isLoginMode ? 'Entrar na Plataforma' : 'Criar Conta Grátis'}
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

function InputField({ label, type, placeholder, icon: Icon, value, onChange, required = true }) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">
        {label}
      </label>
      <div className="relative">
        <Icon size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type={type}
          placeholder={placeholder}
          required={required}
          value={value}
          onChange={onChange}
          className="w-full bg-gray-50 border-2 border-gray-200 text-gray-800 font-semibold rounded-xl py-3.5 pl-12 pr-4 focus:ring-4 focus:ring-blue-500/20 focus:border-[#2563EB] focus:bg-white outline-none transition-all"
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
      <div className="flex justify-between items-center mb-2">
        <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest">
          {label}
        </label>

        {isLoginMode && !isConfirm && (
          <button
            type="button"
            onClick={onForgotPassword}
            disabled={loading}
            className="text-xs font-bold text-[#2563EB] hover:underline disabled:opacity-60"
          >
            Esqueceu a senha?
          </button>
        )}
      </div>

      <div className="relative">
        <Lock size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type={showPassword ? 'text' : 'password'}
          placeholder="••••••••"
          required
          value={value}
          onChange={onChange}
          className="w-full bg-gray-50 border-2 border-gray-200 text-gray-800 font-semibold rounded-xl py-3.5 pl-12 pr-12 focus:ring-4 focus:ring-blue-500/20 focus:border-[#2563EB] focus:bg-white outline-none transition-all"
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          disabled={loading}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 disabled:opacity-60"
        >
          {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      </div>
    </div>
  );
}
