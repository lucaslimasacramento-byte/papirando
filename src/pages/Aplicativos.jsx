import React from 'react';
import { APLICATIVOS_LINKS } from '../config/aplicativosLinks';
import {
  Smartphone,
  DownloadCloud,
  User,
  Bell,
  Target,
  Mic2,
  PlayCircle,
  Home,
  Search,
  BookOpen,
  PieChart,
  WifiOff,
  Headphones,
  BellRing,
  QrCode,
  Sparkles,
  ShieldCheck,
  Cloud,
  ArrowUpRight,
} from 'lucide-react';
import PageHeadPremium, { PageHeadPremiumBadge } from '../components/PageHeadPremium';

export default function Aplicativos() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-6 mx-auto flex w-full max-w-[1400px] flex-col gap-8 p-6 duration-700 lg:p-10">
      <div className="relative mb-1 flex items-center justify-center gap-3 overflow-hidden rounded-[1.5rem] border border-yellow-200 bg-gradient-to-r from-yellow-50 via-amber-50 to-yellow-50 p-4 shadow-sm">
        <div className="absolute bottom-0 left-0 top-0 w-1 bg-yellow-400" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_right,rgba(250,204,21,0.15),transparent_25%)]" />
        <Target size={20} className="shrink-0 animate-pulse text-yellow-600" />
        <span className="text-center text-sm font-bold text-yellow-900">
          Página em fase final de homologação nas lojas de aplicativos. Disponível em breve.
        </span>
      </div>

      <PageHeadPremium
        icon={Smartphone}
        badge={
          <PageHeadPremiumBadge icon={Smartphone}>Estude em qualquer lugar</PageHeadPremiumBadge>
        }
        title={
          (
            <>
              O Papirando no <span className="bg-gradient-to-r from-sky-200 to-indigo-200 bg-clip-text text-transparent">seu bolso</span>
            </>
          )
        }
        titleAs="h2"
        subtitle="A mesma potência da plataforma web, agora otimizada para iOS e Android. Baixe seus materiais e estude offline."
        className="lg:!flex-row lg:!items-center lg:!justify-between"
        leadingClassName="items-center lg:max-w-[calc(100%-28rem)] xl:max-w-[52rem]"
        trailingWrapClassName="lg:ml-auto lg:w-auto lg:max-w-[27rem] lg:self-center"
        trailing={(
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
            <TopPill icon={Cloud} text="Sincronização em nuvem" />
            <TopPill icon={ShieldCheck} text="Acesso rápido e seguro" />
          </div>
        )}
        trailingClassName="w-full min-w-0 sm:w-auto"
      />

      <div className="group relative flex flex-col items-center justify-between gap-14 overflow-hidden rounded-[3.5rem] bg-gradient-to-br from-ink-900 via-ink-800 to-blue-900 p-8 text-white shadow-2xl md:p-10 lg:flex-row lg:p-16">
        <div className="pointer-events-none absolute -mr-20 -mt-20 h-[520px] w-[520px] rounded-full bg-blue-400/20 blur-[110px]" />
        <div className="pointer-events-none absolute -mb-10 -ml-10 bottom-0 left-0 h-[320px] w-[320px] rounded-full bg-cyan-400/10 blur-[100px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:34px_34px] opacity-[0.08]" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-1/2 w-full bg-gradient-to-t from-[#14110d]/50 to-transparent" />

        <div className="relative z-10 flex-1 text-center lg:text-left">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-blue-100 backdrop-blur-sm">
            <Sparkles size={12} />
            experiência mobile
          </div>

          <h3 className="mb-6 text-4xl font-semibold leading-[0.95] lg:text-6xl">
            A sua aprovação não tira férias.
          </h3>

          <p className="mx-auto mb-10 max-w-xl text-lg font-medium leading-relaxed text-blue-100 lg:mx-0 lg:text-xl">
            Sincronize seu progresso na nuvem. Resolva questões no ônibus, ouça as leis enquanto treina e receba lembretes para não perder o ritmo.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 lg:justify-start">
            <LinkOrStaticButton
              href={APLICATIVOS_LINKS.appStore}
              className="flex items-center gap-3 rounded-2xl bg-white px-8 py-4 text-lg font-semibold text-ink-900 shadow-[0_10px_25px_rgba(255,255,255,0.18)] transition-all hover:scale-105 active:scale-95"
            >
              <DownloadCloud size={22} />
              App Store
            </LinkOrStaticButton>

            <LinkOrStaticButton
              href={APLICATIVOS_LINKS.googlePlay}
              className="flex items-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-8 py-4 text-lg font-semibold text-white backdrop-blur-md transition-all hover:scale-105 hover:bg-white/20 active:scale-95"
            >
              <DownloadCloud size={22} />
              Google Play
            </LinkOrStaticButton>
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-3 lg:justify-start">
            <MiniHeroPill icon={WifiOff} text="Modo offline" />
            <MiniHeroPill icon={Headphones} text="Áudio em segundo plano" />
            <MiniHeroPill icon={BellRing} text="Push inteligente" />
          </div>
        </div>

        <div className="relative z-10 shrink-0">
          <div className="relative">
            <div className="absolute inset-0 scale-110 rounded-full bg-blue-500/20 blur-3xl" />

            <div className="relative h-[600px] w-[300px] overflow-hidden rounded-[3.7rem] border-[12px] border-gray-800 bg-neutral-950 shadow-[0_35px_70px_rgba(0,0,0,0.65)] transition-transform duration-700 group-hover:-translate-y-4 lg:-rotate-6 lg:hover:rotate-0">
              <div className="absolute left-1/2 top-2 z-30 flex h-7 w-28 -translate-x-1/2 items-center justify-end rounded-full bg-black px-3 shadow-inner">
                <div className="h-2 w-2 rounded-full bg-blue-950/60" />
              </div>

              <div className="absolute inset-0 z-10 flex flex-col bg-[#F4F6F9]">
                <div className="relative overflow-hidden rounded-b-[2.2rem] bg-gradient-to-br from-[#1d4ed8] to-blue-700 px-6 pb-6 pt-12 shadow-sm">
                  <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
                  <div className="relative z-10 mb-4 flex items-center justify-between text-white">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                      <User size={16} />
                    </div>
                    <Bell size={20} />
                  </div>
                  <h4 className="relative z-10 text-xl font-semibold text-white">Olá, estudante!</h4>
                  <p className="relative z-10 mt-1 text-xs font-bold uppercase tracking-widest text-blue-100">
                    Meta diária: 80%
                  </p>
                </div>

                <div className="flex-1 space-y-4 overflow-hidden p-5">
                  <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="rounded bg-blue-50 px-2 py-1 text-[9px] font-semibold uppercase text-blue-600">
                        Q1520
                      </span>
                      <span className="text-[9px] font-semibold uppercase text-gray-400">CESPE</span>
                    </div>
                    <div className="mb-2 h-3 w-full rounded-full bg-gray-100" />
                    <div className="mb-4 h-3 w-3/4 rounded-full bg-gray-100" />
                    <div className="flex gap-2">
                      <div className="h-8 flex-1 rounded-lg border border-gray-200 bg-gray-50" />
                      <div className="h-8 flex-1 rounded-lg border border-gray-200 bg-gray-50" />
                    </div>
                  </div>

                  <div className="relative flex items-center gap-3 overflow-hidden rounded-2xl bg-ink-900 p-4 text-white shadow-md">
                    <div className="absolute right-0 top-0 h-16 w-16 rounded-full bg-white/10 blur-xl" />
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20">
                      <Mic2 size={16} />
                    </div>
                    <div className="flex-1">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-blue-300">
                        Em reprodução
                      </p>
                      <p className="truncate text-xs font-semibold">Código Penal</p>
                    </div>
                    <PlayCircle size={24} className="text-emerald-400" />
                  </div>

                  <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border-4 border-emerald-400 text-xs font-semibold text-gray-700">
                      80%
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-800">Meta de questões</p>
                      <p className="text-[9px] font-bold text-gray-400">80/100 resolvidas hoje</p>
                    </div>
                  </div>
                </div>

                <div className="flex h-16 items-center justify-around border-t border-gray-100 bg-white px-4 pb-2">
                  <div className="flex flex-col items-center text-blue-600">
                    <Home size={20} />
                    <span className="mt-1 text-[8px] font-semibold">Início</span>
                  </div>
                  <div className="flex flex-col items-center text-gray-400">
                    <Search size={20} />
                    <span className="mt-1 text-[8px] font-bold">Buscar</span>
                  </div>
                  <div className="flex flex-col items-center text-gray-400">
                    <BookOpen size={20} />
                    <span className="mt-1 text-[8px] font-bold">Aulas</span>
                  </div>
                  <div className="flex flex-col items-center text-gray-400">
                    <PieChart size={20} />
                    <span className="mt-1 text-[8px] font-bold">Status</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <FeatureCard
          icon={WifiOff}
          iconClass="bg-emerald-50 text-emerald-600"
          title="Modo offline"
          text="Baixe cadernos de questões inteiros e audiolivros. Estude no metrô, no avião ou onde a internet não chega. Tudo sincroniza quando a conexão voltar."
        />

        <FeatureCard
          icon={Headphones}
          iconClass="bg-orange-50 text-orange-600"
          title="Áudio em segundo plano"
          text="Bloqueie a tela do celular e continue ouvindo as leis em áudio ou a mentoria da semana enquanto corre, dirige ou organiza a rotina."
        />

        <FeatureCard
          icon={BellRing}
          iconClass="bg-purple-50 text-purple-600"
          title="Notificações inteligentes"
          text='O algoritmo percebe quando uma matéria está esfriando. Você recebe um alerta útil direto no celular: "Está na hora de revisar Atos Administrativos".'
        />
      </div>

      <div className="relative flex flex-col items-center justify-between gap-10 overflow-hidden rounded-[2.5rem] border border-gray-100 bg-white p-8 shadow-sm md:flex-row lg:p-12">
        <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-full bg-blue-100/40 blur-3xl" />

        <div className="relative z-10 flex-1 text-center md:text-left">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-700">
            <QrCode size={12} />
            Emparelhamento instantâneo
          </div>

          <h3 className="mb-3 text-2xl font-semibold tracking-tight text-ink-900 lg:text-3xl">
            Já instalou o aplicativo?
          </h3>

          <p className="max-w-xl text-lg font-medium leading-relaxed text-gray-500">
            Abra o app Papirando PRO no seu celular e aponte a câmera para o código ao lado para sincronizar a sua conta instantaneamente, sem precisar digitar senha.
          </p>

          <LinkOrStaticButton
            href={APLICATIVOS_LINKS.syncInstructions}
            className="mt-6 inline-flex items-center gap-2 font-semibold text-blue-600 transition-colors hover:text-blue-700"
          >
            Ver instruções de sincronização
            <ArrowUpRight size={16} />
          </LinkOrStaticButton>
        </div>

        <div className="relative z-10 shrink-0 rounded-[2rem] border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-5 shadow-sm">
          <div className="relative flex h-44 w-44 items-center justify-center rounded-2xl border border-gray-100 bg-white shadow-sm">
            <QrCode size={126} className="text-gray-800" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="rounded-xl border border-gray-100 bg-white p-1.5 shadow-sm">
                <Target size={24} className="text-blue-600" />
              </div>
            </div>
          </div>

          <p className="mt-3 text-center text-[10px] font-semibold uppercase tracking-widest text-gray-400">
            Escaneie para entrar
          </p>
        </div>
      </div>
    </div>
  );
}

/** Mesmas classes no <a> ou no <button>; href vazio = botão estático (sem mudar o visual). */
function LinkOrStaticButton({ href, className, children, ...rest }) {
  const url = typeof href === 'string' ? href.trim() : '';
  if (url) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className={className} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" className={className} {...rest}>
      {children}
    </button>
  );
}

function TopPill({ icon: Icon, text }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-600 shadow-sm">
      <Icon size={14} className="text-blue-600" />
      {text}
    </div>
  );
}

function MiniHeroPill({ icon: Icon, text }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-2 text-xs font-bold text-blue-100 backdrop-blur-sm">
      <Icon size={14} className="text-white" />
      {text}
    </div>
  );
}

function FeatureCard({ icon: Icon, iconClass, title, text }) {
  return (
    <div className="group flex flex-col items-start rounded-[2rem] border border-gray-100 bg-white p-8 shadow-sm transition-all hover:-translate-y-1 hover:border-blue-300 hover:shadow-md">
      <div
        className={`mb-6 flex h-14 w-14 items-center justify-center rounded-2xl shadow-sm transition-transform group-hover:scale-110 ${iconClass}`}
      >
        <Icon size={28} />
      </div>

      <h4 className="mb-3 text-xl font-semibold tracking-tight text-gray-800">{title}</h4>
      <p className="text-sm font-medium leading-relaxed text-gray-500">{text}</p>
    </div>
  );
}
