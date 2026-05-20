import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Home,
  Book,
  Layers,
  Compass,
  FileText,
  Calendar as CalendarIcon,
  Clock,
  PieChart,
  Timer,
  Copy,
  CheckCircle2,
  HelpCircle,
  ListChecks,
  FileSignature,
  Headphones,
  Share2,
  Scale,
  FileSearch,
  Users,
  RefreshCw,
  Smartphone,
  HeartPulse,
  Gift,
  User,
  ShieldCheck,
  Crown,
  WalletCards,
  MessageSquareHeart,
  MessageSquare,
  Mail,
  AlarmClock,
  Target,
  Network,
  BookOpen,
} from 'lucide-react';

const NAV_SECTIONS_BASE = [
  {
    title: 'Principal',
    items: [
      { id: 'home', icon: Home, label: 'Início', badge: 'Home' },
      { id: 'planos', icon: Book, label: 'Meus cursos' },
      { id: 'concursos', icon: Compass, label: 'Concursos' },
      { id: 'lembretes', icon: AlarmClock, label: 'Lembretes' },
      { id: 'disciplinas', icon: Layers, label: 'Disciplinas' },
    ],
  },
  {
    title: 'Estudos',
    items: [
      { id: 'edital', icon: FileText, label: 'Edital verticalizado' },
      { id: 'planejamento', icon: CalendarIcon, label: 'Planejamento' },
      { id: 'metas', icon: Target, label: 'Metas semanais' },
      { id: 'historico', icon: Clock, label: 'Histórico' },
      { id: 'estatisticas', icon: PieChart, label: 'Estatísticas' },
    ],
  },
  {
    title: 'Prática',
    items: [
      { id: 'sessoes', icon: Timer, label: 'Sessões', badge: 'Hot' },
      { id: 'flashcards', icon: Copy, label: 'Flashcards', badge: 'IA' },
      { id: 'revisoes', icon: CheckCircle2, label: 'Revisões' },
      { id: 'questoes', icon: HelpCircle, label: 'Questões' },
      { id: 'simulados', icon: ListChecks, label: 'Simulados', badge: 'Rank' },
      { id: 'redacoes', icon: FileSignature, label: 'Redações' },
    ],
  },
  {
    title: 'Biblioteca',
    items: [
      { id: 'materiais', icon: FileText, label: 'Materiais PDF', badge: 'IA' },
      { id: 'audiobooks', icon: Headphones, label: 'Audiolivros' },
      { id: 'mapas', icon: Share2, label: 'Mapas mentais' },
      { id: 'legislacao', icon: Scale, label: 'Legislação' },
      { id: 'edital_questao', icon: FileSearch, label: 'Edital em questão' },
    ],
  },
  {
    title: 'Apoio',
    items: [
      { id: 'comunidades', icon: Users, label: 'Comunidade' },
      { id: 'esquadroes', icon: ShieldCheck, label: 'Esquadrões' },
      { id: 'conciliar', icon: RefreshCw, label: 'Conciliador' },
      { id: 'aplicativos', icon: Smartphone, label: 'Aplicativos' },
      { id: 'bem_estar', icon: HeartPulse, label: 'Bem-estar' },
      { id: 'convide_ganhe', icon: Gift, label: 'Convide e ganhe', badge: 'VIP' },
      { id: 'perfil', icon: User, label: 'Perfil' },
    ],
  },
];

const ADMIN_SECTION = {
  title: 'Admin',
  items: [
    { id: 'admin_dashboard', icon: Crown, label: 'Dashboard', badge: 'Admin' },
    { id: 'admin_concursos', icon: ShieldCheck, label: 'Concursos', badge: 'Admin' },
    { id: 'admin_questoes', icon: HelpCircle, label: 'Questões', badge: 'Admin' },
    { id: 'admin_disciplinas', icon: Book, label: 'Disciplinas', badge: 'Admin' },
    { id: 'admin_usuarios', icon: Users, label: 'Usuários', badge: 'Admin' },
    { id: 'admin_finance', icon: WalletCards, label: 'Financeiro', badge: 'Admin' },
    { id: 'admin_crm', icon: MessageSquareHeart, label: 'CRM', badge: 'Admin' },
    { id: 'admin_audiolivros', icon: Headphones, label: 'Audiolivros', badge: 'Admin' },
    { id: 'admin_mapas_mentais', icon: Network, label: 'Mapas mentais', badge: 'Admin' },
    { id: 'admin_legislacao', icon: BookOpen, label: 'Legislação', badge: 'Admin' },
    { id: 'admin_beta_convites', icon: Mail, label: 'Convites beta', badge: 'Admin' },
    { id: 'admin_beta_feedback', icon: MessageSquare, label: 'Feedback beta', badge: 'Admin' },
    { id: 'admin_assinaturas', icon: WalletCards, label: 'Assinaturas', badge: 'Admin' },
    { id: 'admin_configuracoes', icon: Compass, label: 'Configurações', badge: 'Admin' },
  ],
};

/** Metadados para o admin editar rótulos (id estável, texto padrão, agrupamento). */
function SidebarBadge({ label, active = false }) {
  return (
    <span
      className={`inline-flex min-w-[34px] items-center justify-center rounded-full px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] backdrop-blur-sm ${
        active
          ? 'border border-sky-400/35 bg-white/18 text-white shadow-[0_6px_16px_rgba(59,130,246,0.2)]'
          : 'border border-white/10 bg-white/8 text-sky-100/90'
      }`}
    >
      {label}
    </span>
  );
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  setViewingDiscipline,
  isCollapsed = false,
  onToggleCollapsed,
  isAdmin = false,
  currentUserEmail = '',
  onNavigate,
  className = '',
  labelOverrides = null,
}) {
  const navSections = isAdmin ? [...NAV_SECTIONS_BASE, ADMIN_SECTION] : NAV_SECTIONS_BASE;
  const overrides =
    labelOverrides && typeof labelOverrides === 'object' && !Array.isArray(labelOverrides) ? labelOverrides : {};

  const handleItemClick = (itemId) => {
    setActiveTab(itemId);
    setViewingDiscipline(null);
    onNavigate?.();
  };

  return (
    <aside
      className={`relative flex h-full min-h-0 min-w-0 w-[min(258px,88vw)] shrink-0 flex-col overflow-hidden rounded-none text-ink-50 antialiased shadow-[8px_0_28px_rgba(2,6,23,0.32)] [color-scheme:dark] lg:w-[var(--sidebar-w)] lg:rounded-none ${
        isCollapsed ? 'lg:[--sidebar-w:86px]' : 'lg:[--sidebar-w:252px]'
      } ${className}`}
    >
      {/* Base escura original + identidade azul (login): diagonal suave + royal no fim */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,#1f4b89_0%,#1a375d_28%,#11263e_58%,#0b1727_100%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,#132949_0%,rgba(255,255,255,0.03)_36%,rgba(43,74,224,0.16)_72%,rgba(37,99,235,0.14)_100%)]"
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-[radial-gradient(circle_at_top,rgba(96,165,250,0.22),transparent_70%)]" />
      <div className="pointer-events-none absolute -right-20 bottom-0 h-56 w-56 rounded-full bg-[#1d4ed8]/35 blur-3xl" />
      <div className="pointer-events-none absolute -left-16 top-1/3 h-44 w-44 rounded-full bg-brand-400/12 blur-3xl" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-px bg-white/8" />

      <div className={`relative flex h-[74px] shrink-0 items-center border-b border-white/8 ${isCollapsed ? 'px-2' : 'px-3.5'}`}>
        <div className={`flex h-12 items-center rounded-xl border border-white/12 bg-white/8 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.07)] backdrop-blur-sm ${isCollapsed ? 'w-10 justify-center px-2' : 'w-full justify-center px-2.5'}`}>
          {isCollapsed ? (
            <span
              className="text-sm font-semibold tracking-tight"
              style={{ fontFamily: 'Poppins, "Plus Jakarta Sans", "Segoe UI", sans-serif' }}
            >
              P
            </span>
          ) : (
            <span
              className="truncate bg-[linear-gradient(92deg,#ffffff_8%,#dbeafe_45%,#93c5fd_100%)] bg-clip-text text-center text-[1.7rem] font-extrabold leading-none tracking-tight text-transparent drop-shadow-[0_0_18px_rgba(147,197,253,0.35)]"
              style={{ fontFamily: 'Poppins, "Plus Jakarta Sans", "Segoe UI", sans-serif' }}
            >
              Papirando
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => onToggleCollapsed?.(!isCollapsed)}
          className="absolute right-2 top-1/2 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-sky-100/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md transition hover:bg-white/15 hover:text-white lg:inline-flex"
          title={isCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
          aria-label={isCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
        >
          {isCollapsed ? <ChevronRight size={14} strokeWidth={2.4} /> : <ChevronLeft size={14} strokeWidth={2.4} />}
        </button>
      </div>

      <nav className={`scrollbar-thin relative flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden py-3.5 ${isCollapsed ? 'px-1.5' : 'px-2.5'}`}>
        {navSections.map((section) => (
          <section key={section.title} className="mb-5 last:mb-0">
            {isCollapsed ? null : (
              <div className="mb-2 px-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-200/75">
                {section.title}
              </div>
            )}

            <div className="space-y-1.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                const displayLabel =
                  typeof overrides[item.id] === 'string' && String(overrides[item.id]).trim()
                    ? String(overrides[item.id]).trim()
                    : item.label;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleItemClick(item.id)}
                    title={displayLabel}
                    className={`relative flex w-full items-center overflow-hidden rounded-xl py-2.5 text-left text-[0.95rem] transition-all duration-200 ${
                      isCollapsed ? 'justify-center px-2' : 'justify-between px-2.5'
                    } ${
                      isActive
                        ? `bg-[linear-gradient(135deg,rgba(255,255,255,0.2),rgba(255,255,255,0.1))] text-white ring-1 ring-white/14 shadow-[0_10px_28px_rgba(15,23,42,0.35)] ${isCollapsed ? '' : 'pl-3'}`
                        : 'bg-white/[0.03] text-brand-50/95 hover:bg-white/[0.09] hover:text-white'
                    }`}
                  >
                    {isActive ? (
                      <span
                        className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.55)]"
                        aria-hidden
                      />
                    ) : null}
                    {isActive ? (
                      <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_right,rgba(59,130,246,0.18),transparent_48%)]" />
                    ) : null}
                    <span className="relative flex min-w-0 items-center gap-2 text-inherit">
                      <span
                        className={`relative flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                          isActive
                            ? 'bg-white/16 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] ring-1 ring-sky-400/25'
                            : 'bg-transparent text-sky-200/80'
                        }`}
                      >
                        <Icon size={15} strokeWidth={2.1} />
                      </span>
                      {isCollapsed ? null : <span className="truncate font-semibold text-inherit">{displayLabel}</span>}
                    </span>

                    {!isCollapsed && item.badge ? <SidebarBadge label={item.badge} active={isActive} /> : null}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </nav>

      <div className={`relative shrink-0 border-t border-white/8 py-3.5 ${isCollapsed ? 'px-2' : 'px-3.5'}`}>
        <div className={`flex items-center rounded-xl border border-white/10 bg-white/[0.08] py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-sm ${isCollapsed ? 'justify-center px-2' : 'gap-2.5 px-2.5'}`}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/12 text-white/75 ring-1 ring-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            <User size={16} strokeWidth={2} />
          </div>
          {isCollapsed ? null : (
            <div className="min-w-0 flex-1 text-ink-50">
              <p className="truncate text-sm font-semibold text-white">
                {currentUserEmail || 'Conta ativa'}
              </p>
              <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-sky-200/70">
                {isAdmin ? 'Administrador' : 'Aluno'}
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
