import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
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
  Instagram,
  HeartPulse,
  Gift,
  User,
  ShieldCheck,
  Crown,
  WalletCards,
  MessageSquareHeart,
  AlarmClock,
  Target,
  Network,
  BookOpen,
  Play,
  Moon,
  Sun,
  GraduationCap,
} from 'lucide-react';

const NAV_SECTIONS_BASE = [
  {
    title: 'Principal',
    items: [
      { id: 'home', icon: Home, label: 'Início' },
      { id: 'planos', icon: Book, label: 'Meus cursos' },
      { id: 'concursos', icon: Compass, label: 'Objetivos' },
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
      { id: 'instagram', icon: Instagram, label: 'Instagram', badge: 'IA' },
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
    { id: 'admin_concursos', icon: GraduationCap, label: 'Catálogo', badge: 'Admin' },
    { id: 'admin_questoes', icon: HelpCircle, label: 'Questões', badge: 'Admin' },
    { id: 'admin_disciplinas', icon: Book, label: 'Disciplinas', badge: 'Admin' },
    { id: 'admin_usuarios', icon: Users, label: 'Usuários', badge: 'Admin' },
    { id: 'admin_finance', icon: WalletCards, label: 'Financeiro', badge: 'Admin' },
    { id: 'admin_crm', icon: MessageSquareHeart, label: 'CRM', badge: 'Admin' },
    { id: 'admin_audiolivros', icon: Headphones, label: 'Audiolivros', badge: 'Admin' },
    { id: 'admin_mapas_mentais', icon: Network, label: 'Mapas mentais', badge: 'Admin' },
    { id: 'admin_legislacao', icon: BookOpen, label: 'Legislação', badge: 'Admin' },
    { id: 'admin_beta_feedback', icon: MessageSquareHeart, label: 'Feedback', badge: 'Admin' },
    { id: 'admin_assinaturas', icon: WalletCards, label: 'Assinaturas', badge: 'Admin' },
    { id: 'admin_configuracoes', icon: Compass, label: 'Configurações', badge: 'Admin' },
  ],
};

const LAUNCH_MVP_MODE = import.meta.env.VITE_LAUNCH_MVP !== 'false';
const LAUNCH_HIDDEN_TABS = new Set(['comunidades', 'esquadroes', 'conciliar', 'instagram', 'aplicativos']);

// eslint-disable-next-line react-refresh/only-export-components
export function getSidebarNavLabelSchema() {
  return [...NAV_SECTIONS_BASE, ADMIN_SECTION].flatMap((section) =>
    section.items.map((item) => ({
      id: item.id,
      defaultLabel: item.label,
      sectionTitle: section.title,
    }))
  );
}

function PlMark({ size = 26 }) {
  const fold = Math.round(size * 0.25);
  return (
    <div
      className="pl-mark"
      style={{ '--m-size': size + 'px', '--m-fold': fold + 'px' }}
    >
      <div className="pl-mark-tile" />
      <div className="pl-mark-fold" />
      <div className="pl-mark-p">P</div>
    </div>
  );
}

function PlLogo({ size = 26, showWordmark = true }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}>
      <PlMark size={size} />
      {showWordmark && (
        <span style={{
          fontFamily: 'var(--pl-serif)', fontStyle: 'italic', fontWeight: 300,
          fontSize: 19, color: 'var(--pl-ink)', letterSpacing: '-0.045em', lineHeight: 1,
        }}>
          Papirando<span style={{ color: 'var(--pl-accent)' }}>.</span>
        </span>
      )}
    </div>
  );
}

function NavBadge({ label }) {
  const isAdmin = label === 'Admin';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      height: 18, padding: '0 6px', borderRadius: 4,
      fontSize: 10, fontWeight: 700, letterSpacing: '0.01em',
      background: isAdmin ? 'var(--pl-warn-soft)' : 'var(--pl-accent-soft)',
      color: isAdmin ? 'var(--pl-warn)' : 'var(--pl-accent)',
    }}>
      {label}
    </span>
  );
}

function getSectionTitleForTab(sections, tabId) {
  return sections.find((section) => section.items.some((item) => item.id === tabId))?.title || sections[0]?.title || '';
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  setViewingDiscipline,
  isCollapsed = false,
  onToggleCollapsed,
  isAdmin = false,
  currentUserEmail = '',
  currentProfile = null,
  onNavigate,
  className = '',
  labelOverrides = null,
}) {
  const navSections = useMemo(
    () => {
      const sections = isAdmin ? [...NAV_SECTIONS_BASE, ADMIN_SECTION] : NAV_SECTIONS_BASE;
      if (!LAUNCH_MVP_MODE) return sections;
      return sections
        .map((section) => ({
          ...section,
          items: section.items.filter((item) => !LAUNCH_HIDDEN_TABS.has(item.id)),
        }))
        .filter((section) => section.items.length > 0);
    },
    [isAdmin]
  );
  const overrides =
    labelOverrides && typeof labelOverrides === 'object' && !Array.isArray(labelOverrides) ? labelOverrides : {};

  const [openSectionTitle, setOpenSectionTitle] = useState(() => getSectionTitleForTab(navSections, activeTab));

  useEffect(() => {
    const activeSection = getSectionTitleForTab(navSections, activeTab);
    if (activeSection) setOpenSectionTitle(activeSection);
  }, [activeTab, navSections]);

  const handleItemClick = (itemId, sectionTitle = '') => {
    if (sectionTitle) setOpenSectionTitle(sectionTitle);
    setActiveTab(itemId);
    setViewingDiscipline(null);
    onNavigate?.();
  };

  const displayName = (() => {
    const nome = String(currentProfile?.nome || '').trim();
    if (nome) return nome.split(' ')[0];
    const raw = String(currentUserEmail || '').trim();
    if (!raw) return 'Conta ativa';
    const name = raw.split('@')[0];
    return name.charAt(0).toUpperCase() + name.slice(1);
  })();

  const avatarUrl = String(currentProfile?.avatar_url || '').trim();
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <aside
      className={className}
      style={{
        width: isCollapsed ? 64 : 224,
        minWidth: isCollapsed ? 64 : 224,
        maxWidth: isCollapsed ? 64 : 224,
        background: 'var(--pl-surface)',
        borderRight: '1px solid var(--pl-rule-2)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.18s ease, min-width 0.18s ease, max-width 0.18s ease',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Logo */}
      <div style={{
        height: 52,
        flex: '0 0 52px',
        padding: isCollapsed ? '0' : '0 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: isCollapsed ? 'center' : 'space-between',
        borderBottom: '1px solid var(--pl-rule-2)',
      }}>
        {isCollapsed ? <PlMark size={24} /> : <PlLogo size={24} />}
        {!isCollapsed && (
          <button
            type="button"
            onClick={() => onToggleCollapsed?.(!isCollapsed)}
            title="Recolher menu"
            style={{
              width: 26, height: 26, border: 0, background: 'transparent',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--pl-ink-4)', borderRadius: 4,
            }}
          >
            <ChevronLeft size={14} strokeWidth={2} />
          </button>
        )}
        {isCollapsed && (
          <button
            type="button"
            onClick={() => onToggleCollapsed?.(!isCollapsed)}
            title="Expandir menu"
            style={{
              position: 'absolute', right: -10, top: 20,
              width: 20, height: 20, border: '1px solid var(--pl-rule-strong)',
              background: 'var(--pl-surface)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--pl-ink-3)', borderRadius: 4, zIndex: 10,
              boxShadow: 'var(--pl-sh-low)',
            }}
          >
            <ChevronRight size={11} strokeWidth={2} />
          </button>
        )}
      </div>

      {/* Papirar agora CTA */}
      {!isCollapsed && (
        <div style={{ padding: '12px 12px 4px' }}>
          <button
            className="pl-btn pl-btn-primary"
            style={{ width: '100%', justifyContent: 'center', height: 34, fontSize: 13 }}
            onClick={() => handleItemClick('questoes')}
          >
            <Play size={11} /> Papirar agora
          </button>
        </div>
      )}

      {/* Nav — contain+will-change isolam a região de scroll do resto da árvore,
          evitando que cada tick de rolagem repinte os gradients/backdrop-blur do aside pai */}
      <nav style={{
        flex: 1, overflowY: 'auto', overflowX: 'hidden',
        padding: isCollapsed ? '8px 6px' : '8px 10px',
        display: 'flex', flexDirection: 'column', gap: 0,
        contain: 'paint layout',
        willChange: 'scroll-position',
        overscrollBehavior: 'contain',
      }}>
        {navSections.map((section) => {
          const isSectionOpen = openSectionTitle === section.title;
          const shouldShowItems = isCollapsed || isSectionOpen;

          return (
          <div key={section.title} style={{ marginBottom: isCollapsed ? 8 : 10 }}>
            {!isCollapsed && (
              <button
                type="button"
                onClick={() => setOpenSectionTitle((current) => (current === section.title ? '' : section.title))}
                aria-expanded={isSectionOpen}
                style={{
                  width: '100%',
                  height: 30,
                  border: 0,
                  borderRadius: 6,
                  background: isSectionOpen ? 'var(--pl-bg-soft)' : 'transparent',
                  color: isSectionOpen ? 'var(--pl-ink)' : 'var(--pl-ink-3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                  cursor: 'pointer',
                  padding: '0 8px',
                  marginBottom: isSectionOpen ? 4 : 0,
                  fontFamily: 'var(--pl-sans)',
                  transition: 'background 0.16s ease, color 0.16s ease, margin-bottom 0.18s ease',
                }}
              >
                <span className="pl-eyebrow" style={{ fontSize: 9.5, padding: 0 }}>
                  {section.title}
                </span>
                {isSectionOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              </button>
            )}
            <div
              style={{
                display: 'grid',
                gridTemplateRows: shouldShowItems ? '1fr' : '0fr',
                opacity: shouldShowItems ? 1 : 0,
                transform: shouldShowItems ? 'translateY(0)' : 'translateY(-4px)',
                transition: 'grid-template-rows 0.22s ease, opacity 0.18s ease, transform 0.18s ease',
              }}
            >
            <div style={{ minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 1 }}>
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
                    onClick={() => handleItemClick(item.id, section.title)}
                    title={isCollapsed ? displayLabel : undefined}
                    tabIndex={shouldShowItems ? 0 : -1}
                    style={{
                      display: 'flex', alignItems: 'center',
                      gap: isCollapsed ? 0 : 8,
                      padding: isCollapsed ? '7px 0' : '7px 8px',
                      justifyContent: isCollapsed ? 'center' : 'flex-start',
                      height: 32, borderRadius: 6, border: 0, cursor: 'pointer',
                      background: isActive ? 'var(--pl-bg-soft)' : 'transparent',
                      color: isActive ? 'var(--pl-ink)' : 'var(--pl-ink-2)',
                      fontSize: 13, fontWeight: isActive ? 600 : 500,
                      fontFamily: 'var(--pl-sans)',
                      letterSpacing: '-0.005em', textAlign: 'left',
                      position: 'relative', width: '100%',
                      transition: 'background 0.1s',
                    }}
                  >
                    {isActive && (
                      <span style={{
                        position: 'absolute', left: isCollapsed ? -6 : -10, top: 6, bottom: 6, width: 2,
                        background: 'var(--pl-accent)', borderRadius: '0 2px 2px 0',
                      }} />
                    )}
                    <Icon
                      size={15}
                      strokeWidth={isActive ? 2 : 1.75}
                      style={{ color: isActive ? 'var(--pl-ink)' : 'var(--pl-ink-3)', flexShrink: 0 }}
                    />
                    {!isCollapsed && (
                      <>
                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {displayLabel}
                        </span>
                        {item.badge && <NavBadge label={item.badge} />}
                      </>
                    )}
                  </button>
                );
              })}
            </div>
            </div>
          </div>
          );
        })}
      </nav>

      {/* User profile */}
      <button
        onClick={() => handleItemClick('perfil')}
        style={{
          borderTop: '1px solid var(--pl-rule)',
          padding: isCollapsed ? '10px 6px' : '10px 12px',
          display: 'flex', alignItems: 'center',
          gap: isCollapsed ? 0 : 10,
          justifyContent: isCollapsed ? 'center' : 'flex-start',
          background: 'none', border: 'none', cursor: 'pointer',
          width: '100%', textAlign: 'left',
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--pl-bg-soft)'}
        onMouseLeave={e => e.currentTarget.style.background = 'none'}
        title="Ver perfil"
      >
        <div style={{
          width: 30, height: 30, borderRadius: 999,
          background: 'var(--pl-ink)', color: 'var(--pl-bg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--pl-serif)', fontStyle: 'italic', fontWeight: 400,
          fontSize: 15, letterSpacing: '-0.04em', flexShrink: 0,
          overflow: 'hidden',
        }}>
          {avatarUrl
            ? <img src={avatarUrl} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : initial}
        </div>
        {!isCollapsed && (
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 12, fontWeight: 600, color: 'var(--pl-ink)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {displayName}
            </div>
            <div style={{ fontSize: 10, color: 'var(--pl-ink-3)', fontWeight: 500 }}>
              {isAdmin ? 'Administrador' : 'papireiro'}
            </div>
          </div>
        )}
      </button>
    </aside>
  );
}
