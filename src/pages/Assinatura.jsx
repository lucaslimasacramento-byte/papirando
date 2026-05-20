import React, { useMemo, useState } from 'react';
import {
  Check,
  Star,
  Shield,
  Crown,
  X,
  Zap,
  Target,
  User,
  BookOpen,
  CreditCard,
  Calendar,
  AlertTriangle,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import PageHeadPremium, { PageHeadPremiumBadge } from '../components/PageHeadPremium';
import { useSubscription, startStripeCheckout } from '../lib/subscriptionApi';

const THEME_CONFIG = {
  policial: {
    icon: Shield,
    names: ['Aspirante', 'Tático', 'Elite'],
    ui: {
      accentText: 'text-blue-600',
      accentBg: 'bg-blue-600',
      accentBgHover: 'hover:bg-blue-500',
      accentBorder: 'border-blue-900',
      accentLightText: 'text-blue-200',
      accentMidText: 'text-blue-300',
      accentFeature: 'text-blue-400',
      accentFeatureMuted: 'text-blue-800',
      accentIconBg: 'bg-blue-500',
      accentShadow: 'shadow-blue-500/30',
      accentGradient: 'from-blue-400 to-blue-600',
      accentRing: 'ring-blue-200',
    },
  },
  juridico: {
    icon: Target,
    names: ['Assistente', 'Analista', 'Magistrado'],
    ui: {
      accentText: 'text-indigo-600',
      accentBg: 'bg-indigo-600',
      accentBgHover: 'hover:bg-indigo-500',
      accentBorder: 'border-indigo-900',
      accentLightText: 'text-indigo-200',
      accentMidText: 'text-indigo-300',
      accentFeature: 'text-indigo-400',
      accentFeatureMuted: 'text-indigo-800',
      accentIconBg: 'bg-indigo-500',
      accentShadow: 'shadow-indigo-500/30',
      accentGradient: 'from-indigo-400 to-indigo-600',
      accentRing: 'ring-indigo-200',
    },
  },
  saude: {
    icon: User,
    names: ['Socorrista', 'Residente', 'Especialista'],
    ui: {
      accentText: 'text-emerald-600',
      accentBg: 'bg-emerald-600',
      accentBgHover: 'hover:bg-emerald-500',
      accentBorder: 'border-emerald-900',
      accentLightText: 'text-emerald-200',
      accentMidText: 'text-emerald-300',
      accentFeature: 'text-emerald-400',
      accentFeatureMuted: 'text-emerald-800',
      accentIconBg: 'bg-emerald-500',
      accentShadow: 'shadow-emerald-500/30',
      accentGradient: 'from-emerald-400 to-emerald-600',
      accentRing: 'ring-emerald-200',
    },
  },
  academico: {
    icon: BookOpen,
    names: ['Básico', 'Avançado', 'Mestre'],
    ui: {
      accentText: 'text-orange-600',
      accentBg: 'bg-orange-600',
      accentBgHover: 'hover:bg-orange-500',
      accentBorder: 'border-orange-900',
      accentLightText: 'text-orange-200',
      accentMidText: 'text-orange-300',
      accentFeature: 'text-orange-400',
      accentFeatureMuted: 'text-orange-800',
      accentIconBg: 'bg-orange-500',
      accentShadow: 'shadow-orange-500/30',
      accentGradient: 'from-orange-400 to-orange-600',
      accentRing: 'ring-orange-200',
    },
  },
  gamer: {
    icon: Zap,
    names: ['Starter', 'Pro', 'Ultra'],
    ui: {
      accentText: 'text-purple-600',
      accentBg: 'bg-purple-600',
      accentBgHover: 'hover:bg-purple-500',
      accentBorder: 'border-purple-900',
      accentLightText: 'text-purple-200',
      accentMidText: 'text-purple-300',
      accentFeature: 'text-purple-400',
      accentFeatureMuted: 'text-purple-800',
      accentIconBg: 'bg-purple-500',
      accentShadow: 'shadow-purple-500/30',
      accentGradient: 'from-purple-400 to-purple-600',
      accentRing: 'ring-purple-200',
    },
  },
};

function formatPeriodEnd(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

export default function Assinatura({ temaAtivo, setActiveTab, currentUserId = '', currentProfile = null, onProfileUpdate }) {
  const [planoAnual, setPlanoAnual] = useState(true);
  const [loadingPlan, setLoadingPlan] = useState('');
  const [feedback, setFeedback] = useState('');
  const [checkoutError, setCheckoutError] = useState('');

  // Assinatura real do Supabase
  const { subscription, planName: realPlanName, loading: subLoading } = useSubscription(currentUserId);

  const theme = THEME_CONFIG[temaAtivo] || THEME_CONFIG.policial;
  const ThemeIcon = theme.icon;
  const [nomePlano1, nomePlano2, nomePlano3] = theme.names;

  const planos = useMemo(
    () => [
      {
        id: 'gratuito',
        nome: nomePlano1,
        descricao: 'O básico para começar a organizar a sua rotina.',
        preco: { mensal: '0', anual: '0' },
        destaque: false,
        premium: false,
        popular: false,
        icon: <ThemeIcon size={24} aria-hidden="true" />,
        iconWrapperClass: 'bg-gray-100 text-gray-500',
        cardClass:
          'bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm flex flex-col relative overflow-hidden transition-all duration-300 hover:shadow-md hover:-translate-y-1',
        features: [
          { text: 'Cronômetro de Estudos', available: true },
          { text: 'Edital Verticalizado Básico', available: true },
          { text: '1 Ciclo de Estudo ativo', available: true },
          { text: 'Histórico de 7 dias', available: true },
          { text: 'Limite de 15 questões/dia', available: true },
          { text: 'Estatísticas Avançadas', available: false },
          { text: 'Redações e Flashcards com IA', available: false },
        ],
      },
      {
        id: 'tatico',
        nome: nomePlano2,
        descricao: 'Para quem leva a aprovação a sério.',
        preco: { mensal: '49,90', anual: '29,90', antigo: '49,90' },
        destaque: true,
        premium: false,
        popular: true,
        icon: <Star size={24} aria-hidden="true" />,
        iconWrapperClass: `${theme.ui.accentIconBg} text-white shadow-lg ${theme.ui.accentShadow}`,
        cardClass: `bg-[#1e40af] rounded-[2.5rem] p-8 border ${theme.ui.accentBorder} shadow-2xl flex flex-col relative overflow-hidden transform transition-all duration-300 md:-translate-y-4 hover:-translate-y-5`,
        features: [
          { text: `Tudo do plano ${nomePlano1}`, available: true, color: theme.ui.accentFeature },
          { text: 'Ciclos de Estudo Ilimitados', available: true, color: theme.ui.accentFeature },
          { text: 'Banco de Questões Ilimitado', available: true, color: theme.ui.accentFeature },
          { text: 'Estatísticas e Dashboards Avançados', available: true, color: theme.ui.accentFeature },
          { text: 'Recursos com Inteligência Artificial', available: false, color: theme.ui.accentFeatureMuted },
        ],
      },
      {
        id: 'elite',
        nome: nomePlano3,
        descricao: 'O pacote definitivo com Inteligência Artificial.',
        preco: { mensal: '89,90', anual: '59,90', antigo: '89,90' },
        destaque: false,
        premium: true,
        popular: false,
        icon: <Crown size={24} aria-hidden="true" />,
        iconWrapperClass:
          'bg-gradient-to-br from-yellow-400 to-orange-500 text-white shadow-md shadow-yellow-500/20',
        cardClass:
          'bg-gradient-to-b from-white to-gray-50 rounded-[2.5rem] p-8 border border-yellow-200 shadow-lg flex flex-col relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1',
        features: [
          { text: `Tudo do plano ${nomePlano2}`, available: true, color: 'text-yellow-500' },
          { text: 'Correção de Redações por IA', available: true, color: 'text-yellow-500' },
          { text: 'Geração de Flashcards com IA', available: true, color: 'text-yellow-500' },
          { text: 'Tira-dúvidas Tutor IA 24/7', available: true, color: 'text-yellow-500' },
          { text: 'Simulados Inéditos Mensais', available: true, color: 'text-yellow-500' },
          { text: 'Audiolivros de legislação (Lei Seca)', available: true, color: 'text-yellow-500' },
        ],
      },
    ],
    [nomePlano1, nomePlano2, nomePlano3, theme.ui]
  );

  // planId ativo: prioriza a tabela subscriptions, fallback para profile
  const activePlanId = subLoading
    ? String(currentProfile?.subscription_plan || 'gratuito').toLowerCase()
    : realPlanName;

  function getCurrentPlanName() {
    if (activePlanId === 'beta') return 'Beta 3 meses';
    if (activePlanId === 'elite') return nomePlano3;
    if (activePlanId === 'tatico') return nomePlano2;
    return nomePlano1;
  }

  function getDisplayedPrice(plano) {
    if (plano.id === 'gratuito') return '0';
    return planoAnual ? plano.preco.anual : plano.preco.mensal;
  }

  function handleCancelSubscription() {
    window.alert('Para cancelar sua assinatura, acesse o portal do cliente Stripe ou entre em contato pelo suporte.');
  }

  async function handleActivatePlan(planId) {
    if (!currentUserId || planId === activePlanId) return;

    // Plano gratuito: não precisa de checkout
    if (planId === 'gratuito') {
      setFeedback('Voce ja tem acesso ao plano gratuito.');
      return;
    }

    setLoadingPlan(planId);
    setFeedback('');
    setCheckoutError('');

    try {
      const url = await startStripeCheckout({
        planId,
        billing: planoAnual ? 'annual' : 'monthly',
      });
      // Redireciona para o Stripe Checkout
      window.location.href = url;
    } catch (err) {
      console.warn('[Assinatura] checkout error:', err?.message || err);
      setCheckoutError(err?.message || 'Nao foi possivel abrir o checkout. Tente novamente.');
    } finally {
      setLoadingPlan('');
    }
  }

  function getPlanAction(planId) {
    const currentPlan = activePlanId;

    if (currentPlan === planId) {
      return {
        label: 'Plano ativo',
        disabled: true,
        className:
          'mb-8 flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 py-4 font-semibold text-emerald-700',
        icon: <Check size={18} aria-hidden="true" />,
      };
    }

    if (currentPlan === 'elite' && planId === 'tatico') {
      return {
        label: 'Ativar plano',
        disabled: false,
        className:
          'mb-8 w-full rounded-2xl border-2 border-gray-200 bg-white py-4 font-semibold text-gray-600 transition-colors hover:border-gray-400 hover:bg-gray-50',
      };
    }

    if (planId === 'tatico') {
      return {
        label: 'Ativar plano',
        disabled: false,
        className: `mb-8 w-full rounded-2xl ${theme.ui.accentBg} py-4 font-semibold text-white transition-colors ${theme.ui.accentBgHover} shadow-lg ${theme.ui.accentShadow}`,
      };
    }

    if (planId === 'elite') {
      return {
        label: 'Ativar plano',
        disabled: false,
        className:
          'mb-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-gray-900 py-4 font-semibold text-white shadow-md transition-colors hover:bg-black',
        icon: <Zap size={18} className="text-yellow-400" aria-hidden="true" />,
      };
    }

    return {
      label: 'Ativar plano',
      disabled: false,
      className:
        'mb-8 w-full rounded-2xl border-2 border-gray-200 bg-white py-4 font-semibold text-gray-600 transition-colors hover:border-gray-400 hover:bg-gray-50',
    };
  }

  return (
    <div className="page-shell animate-in fade-in slide-in-from-bottom-6 mx-auto flex w-full max-w-[1320px] flex-col gap-8 pb-16 text-gray-800 duration-700">
      <PageHeadPremium
        icon={ThemeIcon}
        badge={
          <PageHeadPremiumBadge icon={CreditCard}>Assinatura</PageHeadPremiumBadge>
        }
        title="Planos e cobrança"
        titleAs="h1"
        subtitle="Faça upgrade ou downgrade a qualquer momento. O valor é proporcionalizado automaticamente."
        leadingExtra={(
          <button
            type="button"
            onClick={() => setActiveTab('perfil')}
            className="text-left text-sm font-semibold text-slate-300 hover:text-white"
            aria-label="Voltar para o perfil"
          >
            ← Voltar para o Perfil
          </button>
        )}
        leadingClassName="min-w-0 flex-1"
        className="!overflow-hidden !rounded-[1.75rem] !border !border-white/10"
      />

      {feedback ? (
        <div className="mx-auto w-full max-w-3xl rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-center text-sm font-semibold text-emerald-700">
          {feedback}
        </div>
      ) : null}

      {checkoutError ? (
        <div className="mx-auto w-full max-w-3xl rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm font-semibold text-red-700">
          {checkoutError}
        </div>
      ) : null}

      {activePlanId !== 'gratuito' && (
        <div className="bg-white rounded-[2.5rem] border border-gray-200 shadow-sm p-8 lg:p-10 mb-4 flex flex-col lg:flex-row gap-8 justify-between items-center">
          <div className="flex items-center gap-6 w-full lg:w-auto">
            <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0">
              <Crown size={36} aria-hidden="true" />
            </div>

            <div>
              <div className="flex items-center gap-3 mb-1 flex-wrap">
                <h3 className="text-2xl font-semibold text-gray-800">{getCurrentPlanName()}</h3>
                <span className="flex items-center gap-1 rounded-md bg-emerald-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-emerald-700">
                  <Check size={12} aria-hidden="true" /> Ativo
                </span>
              </div>

              <p className="text-sm font-semibold text-gray-500">
                Ciclo de faturamento:{' '}
                <span className="text-gray-800">
                  {subscription?.billing_cycle === 'annual' ? 'Anual' : 'Mensal'}
                </span>
              </p>
            </div>
          </div>

          <div className="hidden lg:block w-px h-20 bg-gray-100" />

          <div className="flex flex-col gap-3 w-full lg:w-auto">
            <div className="flex items-center gap-3 text-sm font-semibold text-gray-600">
              <Calendar size={18} className="text-blue-500 shrink-0" aria-hidden="true" />
              Próxima cobrança:{' '}
              <span className="text-gray-800">
                {subscription?.current_period_end ? formatPeriodEnd(subscription.current_period_end) : '—'}
              </span>
            </div>

            <div className="flex items-center gap-3 text-sm font-semibold text-gray-600">
              <CreditCard size={18} className="text-blue-500 shrink-0" aria-hidden="true" />
              Provedor:{' '}
              <span className="text-gray-800">
                {subscription?.provider === 'manual' ? 'Acesso beta' : 'Stripe'}
              </span>
            </div>

            {subscription?.provider !== 'manual' && (
              <a
                href="https://billing.stripe.com/p/login"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-left text-xs font-semibold text-blue-600 underline hover:text-blue-800"
              >
                Portal de pagamento
                <ExternalLink size={11} />
              </a>
            )}
          </div>

          <div className="flex flex-col gap-3 w-full lg:w-auto shrink-0">
            <button
              type="button"
              className="rounded-xl bg-gray-100 px-6 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-200"
            >
              Ver faturas e recibos
            </button>

            <button
              type="button"
              onClick={handleCancelSubscription}
              className="flex items-center justify-center gap-1.5 rounded-xl px-6 py-2 text-xs font-semibold text-gray-400 transition-colors hover:text-red-500"
            >
              <AlertTriangle size={14} aria-hidden="true" />
              Cancelar Assinatura
            </button>
          </div>
        </div>
      )}

      <h2 className="page-title text-center text-3xl font-semibold tracking-tight text-slate-900">
        Conheça os outros <span className={theme.ui.accentText}>planos</span>
      </h2>

      <div className="flex justify-center mb-4 relative z-10">
        <div
          className="bg-gray-100 p-1.5 rounded-2xl flex items-center relative w-[300px]"
          role="group"
          aria-label="Alternar entre cobrança mensal e anual"
        >
          <div
            className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] ${theme.ui.accentBg} rounded-xl transition-all duration-300 ease-in-out shadow-sm ${
              planoAnual ? 'left-[50%]' : 'left-1.5'
            }`}
          />

          <button
            type="button"
            aria-pressed={!planoAnual}
            onClick={() => setPlanoAnual(false)}
            className={`z-10 flex-1 rounded-xl py-3 text-sm font-semibold transition-colors ${
              !planoAnual ? 'text-white' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Mensal
          </button>

          <button
            type="button"
            aria-pressed={planoAnual}
            onClick={() => setPlanoAnual(true)}
            className={`z-10 flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-colors ${
              planoAnual ? 'text-white' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Anual
            <span
              className={`${
                planoAnual ? 'bg-yellow-400 text-yellow-900' : 'bg-green-100 text-green-700'
              } text-[9px] px-1.5 py-0.5 rounded-md uppercase tracking-widest`}
            >
              -40%
            </span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch max-w-6xl mx-auto w-full">
        {planos.map((plano) => {
          const action = getPlanAction(plano.id);
          const isCurrentPlan = activePlanId === plano.id;
          const price = getDisplayedPrice(plano);

          return (
            <div
              key={plano.id}
              className={`${plano.cardClass} ${isCurrentPlan ? `ring-2 ${theme.ui.accentRing}` : ''}`}
            >
              {plano.destaque && (
                <div className={`absolute top-0 inset-x-0 h-1 bg-gradient-to-r ${theme.ui.accentGradient}`} />
              )}

              {plano.premium && (
                <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-100 rounded-bl-full -z-0 opacity-50" />
              )}

              <div className={`mb-8 ${plano.premium ? 'relative z-10' : ''}`}>
                <div className="flex items-center justify-between gap-3 mb-5 min-h-[28px]">
                  <div>
                    {isCurrentPlan && (
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-widest ${
                          plano.destaque
                            ? 'bg-white text-[#1e40af]'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        <Check size={11} aria-hidden="true" />
                        Plano atual
                      </span>
                    )}
                  </div>

                  <div>
                    {plano.popular && (
                      <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-white backdrop-blur-sm">
                        Mais popular
                      </span>
                    )}
                  </div>
                </div>

                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 ${plano.iconWrapperClass}`}
                >
                  {plano.icon}
                </div>

                <h3 className={`mb-2 text-2xl font-semibold ${plano.destaque ? 'text-white' : 'text-gray-800'}`}>
                  {plano.nome}
                </h3>

                <p
                  className={`text-sm font-medium h-10 ${
                    plano.destaque ? theme.ui.accentLightText : 'text-gray-500'
                  }`}
                >
                  {plano.descricao}
                </p>
              </div>

              <div className={`mb-8 flex flex-col ${plano.premium ? 'relative z-10' : ''}`}>
                {planoAnual && plano.preco.antigo && (
                  <span
                    className={`${
                      plano.destaque ? theme.ui.accentMidText : 'text-gray-400'
                    } text-sm font-bold line-through mb-1`}
                  >
                    De R$ {plano.preco.antigo}
                  </span>
                )}

                <div>
                  <span className={`text-5xl font-semibold ${plano.destaque ? 'text-white' : 'text-gray-800'}`}>
                    R$ {price}
                  </span>
                  <span className={`${plano.destaque ? theme.ui.accentMidText : 'text-gray-500'} font-semibold`}>
                    /mês
                  </span>
                </div>
              </div>

              <button
                type="button"
                disabled={action.disabled}
                onClick={() => handleActivatePlan(plano.id)}
                className={action.className}
                aria-label={action.label}
              >
                {loadingPlan === plano.id ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  Aguarde...
                </span>
              ) : (
                <>{action.icon}{action.label}</>
              )}
              </button>

              <div
                className={`space-y-4 flex-1 ${plano.premium ? 'relative z-10' : ''} ${
                  plano.destaque ? theme.ui.accentLightText : ''
                }`}
              >
                {plano.features.map((feature) => (
                  <Feature
                    key={feature.text}
                    text={feature.text}
                    available={feature.available}
                    color={feature.color}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Feature({ text, available, color = 'text-green-500' }) {
  if (!available) {
    return (
      <div className="flex items-start gap-3 opacity-50 grayscale">
        <X size={18} strokeWidth={3} className="text-gray-400 shrink-0 mt-0.5" aria-hidden="true" />
        <span className="text-sm font-semibold">{text}</span>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3">
      <Check size={18} strokeWidth={4} className={`${color} shrink-0 mt-0.5`} aria-hidden="true" />
      <span className="text-sm font-semibold leading-tight">{text}</span>
    </div>
  );
}

