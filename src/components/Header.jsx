import React, { useEffect, useMemo, useState } from 'react';
import { Bell, Cpu, LogOut, Menu, Search, ShieldAlert, UserCircle2 } from 'lucide-react';
import { checkAiHealth } from '../lib/aiClient';
import { ADMIN_TAB_TITLES } from '../lib/adminTabIds';
import SubscriptionPlanSeal from './SubscriptionPlanSeal';

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
  currentUserEmail = '',
  currentUsername = '',
  profileHasValidCpf = true,
  onOpenProfile,
  onLogout,
  onOpenMobileNav,
  subscriptionPlan = 'gratuito',
  onOpenAssinatura,
}) {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [aiStatus, setAiStatus] = useState({ provider: 'offline', status: 'offline' });

  const displayName = useMemo(() => {
    const capitalizeFirst = (value = '') => {
      const text = String(value || '').trim();
      if (!text) return '';
      return text.charAt(0).toUpperCase() + text.slice(1);
    };
    if (String(currentUsername || '').trim()) return capitalizeFirst(currentUsername);
    const raw = String(currentUserEmail || '').trim();
    if (!raw) return 'Minha conta';
    return capitalizeFirst(raw.split('@')[0]);
  }, [currentUserEmail, currentUsername]);

  useEffect(() => {
    let ignore = false;
    const refreshStatus = async () => {
      const status = await checkAiHealth();
      if (!ignore) setAiStatus(status);
    };
    refreshStatus();
    const intervalId = window.setInterval(refreshStatus, 60000);
    return () => {
      ignore = true;
      window.clearInterval(intervalId);
    };
  }, []);

  const aiOnline = aiStatus?.provider && aiStatus.provider !== 'offline';

  const breadcrumb = (() => {
    const key = String(activeTab || 'home');
    if (key.startsWith('admin_')) return 'Admin / ' + formatTitle(key);
    if (key === 'home') return 'Início / Dashboard';
    if (key === 'questoes') return 'Prática / Questões';
    return formatTitle(key);
  })();

  return (
    <header style={{
      height: 52, flex: '0 0 52px',
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '0 20px',
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
          placeholder="Buscar…"
          style={{ width: '100%', paddingLeft: 30, height: 32, fontSize: 12.5 }}
        />
      </div>

      {/* Right actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {typeof onOpenAssinatura === 'function' && (
          <SubscriptionPlanSeal planId={subscriptionPlan} onClick={onOpenAssinatura} />
        )}

        {/* AI status pill */}
        <div
          title={aiOnline ? 'Serviço de IA disponível' : 'Serviço de IA indisponível'}
          style={{
            display: 'none',
            alignItems: 'center', gap: 5,
            height: 28, padding: '0 10px', borderRadius: 6,
            border: '1px solid var(--pl-rule-strong)',
            background: 'var(--pl-surface-2)',
            fontSize: 11.5, fontWeight: 600, color: 'var(--pl-ink-3)',
            cursor: 'default',
          }}
          className="md:!flex"
        >
          <Cpu size={12} strokeWidth={1.75} />
          <span
            style={{
              width: 6, height: 6, borderRadius: 999,
              background: aiOnline ? 'var(--pl-success)' : 'var(--pl-ink-5)',
            }}
          />
          <span className="hidden lg:inline">{aiOnline ? 'IA ativa' : 'IA off'}</span>
        </div>

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
          {notifications.length > 0 && (
            <span style={{
              position: 'absolute', top: 5, right: 6,
              width: 6, height: 6, borderRadius: 999, background: 'var(--pl-warn)',
            }} />
          )}
          <Bell size={15} strokeWidth={1.75} />
        </button>

        {/* Profile */}
        <button
          type="button"
          onClick={onOpenProfile}
          style={{
            display: 'none',
            alignItems: 'center', gap: 7,
            height: 32, padding: '0 10px', borderRadius: 6,
            border: '1px solid var(--pl-rule-strong)',
            background: 'var(--pl-surface)', cursor: 'pointer',
            fontSize: 12.5, fontWeight: 600, color: 'var(--pl-ink-2)',
            maxWidth: 160, overflow: 'hidden',
          }}
          className="md:!flex"
        >
          <UserCircle2 size={14} strokeWidth={1.75} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {displayName}
          </span>
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
          width: 320, maxHeight: 400,
          background: 'var(--pl-surface)',
          border: '1px solid var(--pl-rule-2)',
          borderRadius: 8, boxShadow: 'var(--pl-sh-mid)',
          zIndex: 40, overflow: 'hidden',
        }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--pl-rule)' }}>
            <div className="pl-eyebrow" style={{ fontSize: 9.5 }}>Lembretes</div>
            <p style={{ margin: '4px 0 0', fontSize: 13, fontWeight: 600, color: 'var(--pl-ink)' }}>
              Próximos alertas
            </p>
          </div>
          <div style={{ maxHeight: 320, overflowY: 'auto', padding: 10 }}>
            {notifications.length === 0 ? (
              <div style={{
                padding: '20px 16px', textAlign: 'center',
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
                    onClick={() => {
                      setIsNotificationsOpen(false);
                      onOpenNotification?.(item.contestId);
                    }}
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
      )}
    </header>
  );
}
