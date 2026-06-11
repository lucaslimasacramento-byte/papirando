import React, { useMemo, useRef, useState } from 'react';
import { Bell, LogOut, Menu, Moon, Megaphone, Search, Send, ShieldAlert, Sun, UserCircle2, X } from 'lucide-react';
import { ADMIN_TAB_TITLES } from '../lib/adminTabIds';
import SubscriptionPlanSeal from './SubscriptionPlanSeal';

const SEARCH_ITEMS_BASE = [
  { id: 'home', label: 'Início', group: 'Principal' },
  { id: 'planos', label: 'Meus cursos', group: 'Principal' },
  { id: 'concursos', label: 'Objetivos de estudo', group: 'Principal' },
  { id: 'lembretes', label: 'Lembretes', group: 'Principal' },
  { id: 'disciplinas', label: 'Disciplinas', group: 'Estudos' },
  { id: 'edital', label: 'Edital verticalizado', group: 'Estudos' },
  { id: 'planejamento', label: 'Planejamento', group: 'Estudos' },
  { id: 'metas', label: 'Metas semanais', group: 'Estudos' },
  { id: 'historico', label: 'Histórico', group: 'Estudos' },
  { id: 'estatisticas', label: 'Estatísticas', group: 'Estudos' },
  { id: 'sessoes', label: 'Sessões', group: 'Prática' },
  { id: 'flashcards', label: 'Flashcards', group: 'Prática' },
  { id: 'revisoes', label: 'Revisões', group: 'Prática' },
  { id: 'questoes', label: 'Questões', group: 'Prática' },
  { id: 'simulados', label: 'Simulados', group: 'Prática' },
  { id: 'redacoes', label: 'Redações', group: 'Prática' },
  { id: 'materiais', label: 'Materiais PDF', group: 'Biblioteca' },
  { id: 'audiobooks', label: 'Audiolivros', group: 'Biblioteca' },
  { id: 'mapas', label: 'Mapas mentais', group: 'Biblioteca' },
  { id: 'legislacao', label: 'Legislação', group: 'Biblioteca' },
  { id: 'edital_questao', label: 'Edital em questão', group: 'Biblioteca' },
  { id: 'comunidades', label: 'Comunidade', group: 'Apoio' },
  { id: 'esquadroes', label: 'Esquadrões', group: 'Apoio' },
  { id: 'conciliar', label: 'Conciliador', group: 'Apoio' },
  { id: 'instagram', label: 'Instagram', group: 'Apoio' },
  { id: 'aplicativos', label: 'Aplicativos', group: 'Apoio' },
  { id: 'bem_estar', label: 'Bem-estar', group: 'Apoio' },
  { id: 'convide_ganhe', label: 'Convide e ganhe', group: 'Apoio' },
  { id: 'perfil', label: 'Perfil', group: 'Conta' },
  { id: 'assinatura', label: 'Assinatura', group: 'Conta' },
];

const SEARCH_ITEMS_ADMIN = Object.entries(ADMIN_TAB_TITLES).map(([id, label]) => ({
  id,
  label: `Admin · ${label}`,
  group: 'Admin',
}));

function normalizeSearch(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function formatTitle(activeTab) {
  if (activeTab === 'home') return 'Painel inicial';
  const key = String(activeTab || '');
  if (ADMIN_TAB_TITLES[key]) return ADMIN_TAB_TITLES[key];
  return key
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default function Header({
  activeTab,
  notifications = [],
  onOpenNotification,
  profileHasValidCpf = true,
  onOpenProfile,
  onLogout,
  onOpenMobileNav,
  subscriptionPlan = 'gratuito',
  onOpenAssinatura,
  isAdmin = false,
  onNavigate,
  onOpenOnboarding,
  darkMode = false,
  onToggleDarkMode,
  adminNotices = [],
  onDismissNotice,
  onPublishNotice,
}) {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [broadcastText, setBroadcastText] = useState('');
  const [broadcastSending, setBroadcastSending] = useState(false);
  const broadcastRef = useRef(null);

  const searchItems = useMemo(
    () => (isAdmin ? [...SEARCH_ITEMS_BASE, ...SEARCH_ITEMS_ADMIN] : SEARCH_ITEMS_BASE),
    [isAdmin]
  );

  const searchResults = useMemo(() => {
    const query = normalizeSearch(searchQuery);
    if (!query) return [];
    return searchItems
      .filter((item) => normalizeSearch(`${item.label} ${item.group} ${item.id}`).includes(query))
      .slice(0, 8);
  }, [searchItems, searchQuery]);

  const handleSearchSelect = (item) => {
    if (!item?.id) return;
    setSearchQuery('');
    setIsSearchOpen(false);
    onNavigate?.(item.id);
  };

  const breadcrumb = (() => {
    const key = String(activeTab || 'home');
    if (key.startsWith('admin_')) return 'Admin / ' + formatTitle(key);
    if (key === 'home') return 'Início / Dashboard';
    if (key === 'questoes') return 'Prática / Questões';
    if (key === 'concursos') return 'Objetivos';
    return formatTitle(key);
  })();

  return (
    <header style={{
      height: 52, flex: '0 0 52px',
      display: 'flex', alignItems: 'center', gap: 'clamp(6px, 1.5vw, 14px)',
      padding: '0 clamp(10px, 2.5vw, 20px)',
      borderBottom: '1px solid var(--pl-rule-2)',
      background: 'var(--pl-surface)',
      position: 'sticky', top: 0, zIndex: 30,
    }}>
      {/* Mobile nav toggle */}
      {typeof onOpenMobileNav === 'function' && (
        <button
          type="button"
          onClick={onOpenMobileNav}
          style={{
            width: 32, height: 32, border: '1px solid var(--pl-rule-strong)',
            borderRadius: 6, background: 'transparent', cursor: 'pointer',
            alignItems: 'center', justifyContent: 'center',
            color: 'var(--pl-ink-3)',
          }}
          className="inline-flex lg:!hidden"
          aria-label="Abrir menu"
        >
          <Menu size={16} strokeWidth={1.75} />
        </button>
      )}

      {/* Breadcrumb */}
      <div className="pl-eyebrow" style={{ fontSize: 10, minWidth: 0, flex: 1 }}>
        {breadcrumb}
        {!profileHasValidCpf && (
          <button
            type="button"
            onClick={onOpenProfile}
            style={{
              marginLeft: 12, display: 'inline-flex', alignItems: 'center', gap: 4,
              border: '1px solid var(--pl-warn-soft)', borderRadius: 4,
              background: 'var(--pl-warn-soft)', color: 'var(--pl-warn)',
              padding: '2px 7px', fontSize: 10, fontWeight: 700, cursor: 'pointer',
              letterSpacing: '0.12em', textTransform: 'uppercase',
            }}
          >
            <ShieldAlert size={10} strokeWidth={2} />
            CPF pendente
          </button>
        )}
      </div>

      {/* Search */}
      <div style={{ position: 'relative', width: 240 }} className="hidden md:block">
        <Search size={13} style={{
          position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
          color: 'var(--pl-ink-4)', pointerEvents: 'none',
        }} />
        <input
          className="pl-input"
          placeholder="Buscar..."
          value={searchQuery}
          onChange={(event) => {
            setSearchQuery(event.target.value);
            setIsSearchOpen(true);
          }}
          onFocus={() => setIsSearchOpen(true)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && searchResults[0]) {
              event.preventDefault();
              handleSearchSelect(searchResults[0]);
            }
            if (event.key === 'Escape') {
              setIsSearchOpen(false);
            }
          }}
          style={{ width: '100%', paddingLeft: 30, height: 32, fontSize: 12.5 }}
        />
        {isSearchOpen && searchQuery ? (
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 'calc(100% + 6px)',
              border: '1px solid var(--pl-rule-2)',
              borderRadius: 8,
              background: 'var(--pl-surface)',
              boxShadow: 'var(--pl-sh-mid)',
              overflow: 'hidden',
              zIndex: 50,
            }}
          >
            {searchResults.length === 0 ? (
              <div style={{ padding: '11px 12px', color: 'var(--pl-ink-3)', fontSize: 12.5 }}>
                Nenhum atalho encontrado.
              </div>
            ) : (
              searchResults.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => handleSearchSelect(item)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    padding: '9px 12px',
                    border: 0,
                    borderBottom: '1px solid var(--pl-rule)',
                    background: 'transparent',
                    color: 'var(--pl-ink)',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ fontSize: 12.5, fontWeight: 700 }}>{item.label}</span>
                  <span style={{ fontSize: 10.5, color: 'var(--pl-ink-3)' }}>{item.group}</span>
                </button>
              ))
            )}
          </div>
        ) : null}
      </div>

      {/* Right actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {isAdmin && typeof onOpenOnboarding === 'function' && (
          <button
            type="button"
            onClick={onOpenOnboarding}
            title="Visualizar fluxo de onboarding (admin)"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              height: 28, padding: '0 10px', borderRadius: 6,
              border: '1px dashed var(--pl-warn)',
              background: 'var(--pl-warn-soft)',
              fontSize: 11, fontWeight: 700, color: 'var(--pl-ink-2)',
              cursor: 'pointer', letterSpacing: '0.02em',
            }}
          >
            <ShieldAlert size={12} strokeWidth={2} style={{ color: 'var(--pl-warn)' }} />
            <span className="hidden md:inline">Onboarding</span>
          </button>
        )}
        {typeof onOpenAssinatura === 'function' && (
          <SubscriptionPlanSeal planId={subscriptionPlan} onClick={onOpenAssinatura} />
        )}

        {/* Dark mode toggle */}
        {typeof onToggleDarkMode === 'function' && (
          <button
            type="button"
            onClick={onToggleDarkMode}
            title={darkMode ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
            style={{
              width: 32, height: 32, border: '1px solid var(--pl-rule-strong)',
              borderRadius: 6, background: 'var(--pl-surface)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--pl-ink-2)',
              transition: 'border-color 0.15s, color 0.15s',
            }}
            aria-label={darkMode ? 'Modo claro' : 'Modo escuro'}
          >
            {darkMode
              ? <Sun size={15} strokeWidth={1.75} />
              : <Moon size={15} strokeWidth={1.75} />}
          </button>
        )}

        {/* Notifications */}
        <button
          type="button"
          onClick={() => setIsNotificationsOpen((p) => !p)}
          style={{
            width: 32, height: 32, border: '1px solid var(--pl-rule-strong)',
            borderRadius: 6, background: 'var(--pl-surface)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--pl-ink-2)', position: 'relative',
          }}
          aria-label="Notificações"
        >
          {(notifications.length > 0 || adminNotices.length > 0) && (
            <span style={{
              position: 'absolute', top: 5, right: 6,
              width: 6, height: 6, borderRadius: 999, background: 'var(--pl-warn)',
            }} />
          )}
          <Bell size={15} strokeWidth={1.75} />
        </button>

        {/* Logout */}
        <button
          type="button"
          onClick={onLogout}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            height: 32, padding: '0 10px', borderRadius: 6,
            border: '1px solid var(--pl-rule-strong)',
            background: 'var(--pl-surface)', cursor: 'pointer',
            fontSize: 12.5, fontWeight: 600, color: 'var(--pl-ink-2)',
            transition: 'border-color 0.1s, color 0.1s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--pl-danger)'; e.currentTarget.style.color = 'var(--pl-danger)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--pl-rule-strong)'; e.currentTarget.style.color = 'var(--pl-ink-2)'; }}
        >
          <LogOut size={13} strokeWidth={1.75} />
          <span className="hidden sm:inline">Sair</span>
        </button>
      </div>

      {/* Notifications dropdown */}
      {isNotificationsOpen && (
        <div style={{
          position: 'absolute', right: 16, top: '100%', marginTop: 6,
          width: 340, maxHeight: 520,
          background: 'var(--pl-surface)',
          border: '1px solid var(--pl-rule-2)',
          borderRadius: 10, boxShadow: 'var(--pl-sh-mid)',
          zIndex: 40, overflow: 'hidden', display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--pl-rule)' }}>
            <p className="pl-eyebrow" style={{ fontSize: 9.5 }}>Central de avisos</p>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>

            {/* ── Área de publicação (só admin) ── */}
            {isAdmin && (
              <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--pl-rule)', background: 'var(--pl-bg-soft)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <Megaphone size={13} style={{ color: 'var(--pl-accent)' }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--pl-accent)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    Publicar aviso para todos
                  </span>
                </div>
                <textarea
                  ref={broadcastRef}
                  value={broadcastText}
                  onChange={(e) => setBroadcastText(e.target.value)}
                  placeholder="Digite o aviso que todos os usuários verão..."
                  rows={3}
                  className="pl-input"
                  style={{ width: '100%', resize: 'none', fontSize: 12, fontFamily: 'var(--pl-sans)', marginBottom: 8 }}
                />
                <button
                  disabled={broadcastSending || !broadcastText.trim()}
                  onClick={async () => {
                    if (!broadcastText.trim()) return;
                    setBroadcastSending(true);
                    try {
                      await onPublishNotice?.({ message: broadcastText.trim(), user_id: null });
                      setBroadcastText('');
                    } finally {
                      setBroadcastSending(false);
                    }
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                    background: broadcastText.trim() ? 'var(--pl-accent)' : 'var(--pl-bg)',
                    color: broadcastText.trim() ? '#fff' : 'var(--pl-ink-4)',
                    border: '1px solid var(--pl-accent-ring)',
                    cursor: broadcastSending || !broadcastText.trim() ? 'not-allowed' : 'pointer',
                    transition: 'background 0.15s',
                  }}
                >
                  <Send size={11} />
                  {broadcastSending ? 'Enviando...' : 'Publicar'}
                </button>
              </div>
            )}

            {/* ── Avisos do admin para o usuário atual ── */}
            {adminNotices.length > 0 && (
              <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--pl-rule)' }}>
                <p className="pl-eyebrow" style={{ marginBottom: 8 }}>Avisos da plataforma</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {adminNotices.map((notice) => (
                    <div key={notice.id} className="pl-card" style={{
                      padding: '10px 12px', background: 'var(--pl-accent-soft)',
                      border: '1px solid var(--pl-accent-ring)',
                      display: 'flex', gap: 10, alignItems: 'flex-start',
                    }}>
                      <Megaphone size={13} style={{ color: 'var(--pl-accent)', flexShrink: 0, marginTop: 2 }} />
                      <p style={{ flex: 1, fontSize: 13, color: 'var(--pl-ink)', margin: 0, lineHeight: 1.5 }}>
                        {notice.message}
                      </p>
                      <button
                        onClick={() => onDismissNotice?.(notice.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--pl-ink-3)', flexShrink: 0, padding: 0 }}
                        title="Dispensar"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Lembretes normais ── */}
            <div style={{ padding: 10 }}>
              <p className="pl-eyebrow" style={{ padding: '4px 4px 8px' }}>Lembretes</p>
              {notifications.length === 0 ? (
                <div style={{
                  padding: '16px', textAlign: 'center',
                  fontSize: 13, color: 'var(--pl-ink-3)',
                  border: '1px dashed var(--pl-rule-2)', borderRadius: 6,
                  background: 'var(--pl-bg-soft)',
                }}>
                  Nenhum lembrete no momento.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {notifications.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => { setIsNotificationsOpen(false); onOpenNotification?.(item); }}
                      className="pl-card"
                      style={{
                        width: '100%', padding: '10px 12px', cursor: 'pointer',
                        textAlign: 'left', display: 'flex', justifyContent: 'space-between',
                        alignItems: 'flex-start', gap: 10,
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--pl-ink)', margin: 0 }}>{item.title}</p>
                        <p style={{ fontSize: 12, color: 'var(--pl-ink-3)', margin: '2px 0 0', lineHeight: 1.4 }}>{item.text}</p>
                      </div>
                      {item.date && (
                        <span className="pl-tag" style={{ flexShrink: 0 }}>
                          {String(item.date).split('-').reverse().join('/')}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
