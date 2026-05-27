import React from 'react';
import { Crown, Sparkles, Circle, ShieldCheck } from 'lucide-react';

/**
 * Selo de assinatura alinhado a `profiles.subscription_plan` (gratuito | tatico | elite).
 * Animações por nível: `seal-plan-gratuito`, `seal-plan-tatico`, `seal-plan-elite` em `index.css`.
 */
const PLAN_CONFIG = {
  gratuito: {
    label: 'Gratuito',
    title: 'Plano gratuito — toque para ver planos',
    icon: Circle,
    iconSize: 12,
    animClass: 'seal-plan-gratuito',
    style: {
      border: '1px solid var(--pl-rule-strong)',
      background: 'var(--pl-bg-soft)',
      color: 'var(--pl-ink-2)',
      padding: '4px 10px',
      gap: 4,
      fontSize: 10,
      fontWeight: 600,
    },
  },
  tatico: {
    label: 'Tático',
    title: 'Plano Tático — toque para gerenciar assinatura',
    icon: Sparkles,
    iconSize: 14,
    animClass: 'seal-plan-tatico',
    style: {
      border: '1px solid rgba(96,165,250,0.6)',
      background: 'linear-gradient(135deg, #1e3a8a, #1d4ed8, #2563eb)',
      color: '#fff',
      padding: '6px 12px',
      gap: 6,
      fontSize: 12,
      fontWeight: 700,
    },
  },
  elite: {
    label: 'Elite',
    title: 'Plano Elite — toque para gerenciar assinatura',
    icon: Crown,
    iconSize: 16,
    animClass: 'seal-plan-elite',
    style: {
      border: '1px solid rgba(251,191,36,0.9)',
      background: 'linear-gradient(135deg, #92400e, #d97706, #fbbf24)',
      color: '#451a03',
      padding: '7px 14px',
      gap: 8,
      fontSize: 12,
      fontWeight: 800,
      letterSpacing: '0.04em',
    },
  },
  master: {
    label: 'Master',
    title: 'Plano Master — acesso administrativo',
    icon: ShieldCheck,
    iconSize: 15,
    animClass: 'seal-plan-elite',
    style: {
      border: '1px solid var(--pl-warn-soft)',
      background: 'var(--pl-warn-soft)',
      color: 'var(--pl-warn)',
      padding: '6px 12px',
      gap: 6,
      fontSize: 12,
      fontWeight: 800,
      letterSpacing: '0.04em',
    },
  },
};

export default function SubscriptionPlanSeal({ planId, onClick }) {
  const key = String(planId || 'gratuito').toLowerCase();
  const cfg = PLAN_CONFIG[key] || PLAN_CONFIG.gratuito;
  const Icon = cfg.icon;
  const iconSize = cfg.iconSize ?? 13;

  return (
    <button
      type="button"
      onClick={onClick}
      title={cfg.title}
      className={cfg.animClass}
      style={{
        position: 'relative',
        display: 'inline-flex',
        maxWidth: '100%',
        alignItems: 'center',
        overflow: 'hidden',
        borderRadius: 8,
        textAlign: 'left',
        textTransform: 'uppercase',
        cursor: 'pointer',
        transition: 'filter 0.15s, box-shadow 0.15s',
        ...cfg.style,
      }}
    >
      <Icon size={iconSize} strokeWidth={key === 'gratuito' ? 2.5 : 2} style={{ position: 'relative', zIndex: 1, flexShrink: 0 }} />
      <span style={{ position: 'relative', zIndex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cfg.label}</span>
    </button>
  );
}
