import React from 'react';
import { Crown, Circle, ShieldCheck } from 'lucide-react';

/**
 * Selo de assinatura alinhado a `profiles.subscription_plan`.
 * Modelo 2 tiers: `folha` (free) e `papiro` (pago).
 * Aliases legados aceitos: gratuito/free → folha; tatico/elite/beta → papiro.
 * Animações por nível: `seal-plan-gratuito`, `seal-plan-elite` em `index.css`.
 */
const PLAN_ALIASES = {
  gratuito: 'folha',
  free: 'folha',
  tatico: 'papiro',
  elite: 'papiro',
  beta: 'papiro',
};

const PLAN_CONFIG = {
  folha: {
    label: 'Folha',
    title: 'Plano Folha — toque para conhecer o Papiro',
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
  papiro: {
    label: 'Papiro',
    title: 'Plano Papiro — toque para gerenciar assinatura',
    icon: Crown,
    iconSize: 16,
    animClass: 'seal-plan-elite',
    style: {
      border: '1px solid rgba(253,224,71,0.95)',
      background: 'linear-gradient(120deg, #b45309 0%, #f59e0b 42%, #fcd34d 70%, #f59e0b 100%)',
      color: '#3b1402',
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

export default function SubscriptionPlanSeal({ planId, onClick, trialDaysLeft = null }) {
  const raw = String(planId || 'folha').toLowerCase();
  const key = PLAN_CONFIG[raw] ? raw : (PLAN_ALIASES[raw] || 'folha');
  const cfg = PLAN_CONFIG[key];
  const Icon = cfg.icon;
  const iconSize = cfg.iconSize ?? 13;

  // Trial em andamento: mostra contagem regressiva no proprio selo Papiro.
  const isTrial = key === 'papiro' && typeof trialDaysLeft === 'number';
  const urgent = isTrial && trialDaysLeft <= 5;
  const countLabel = !isTrial
    ? ''
    : trialDaysLeft <= 0
      ? 'último dia'
      : `${trialDaysLeft} ${trialDaysLeft === 1 ? 'dia' : 'dias'}`;
  const title = isTrial
    ? `Avaliação gratuita do Papiro — ${trialDaysLeft <= 0 ? 'termina hoje' : `${trialDaysLeft} ${trialDaysLeft === 1 ? 'dia restante' : 'dias restantes'}`}. Toque para assinar.`
    : cfg.title;

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`${cfg.animClass}${isTrial ? ' seal-trial' : ''}${urgent ? ' urgent' : ''}`}
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
      <Icon size={iconSize} strokeWidth={key === 'folha' ? 2.5 : 2} style={{ position: 'relative', zIndex: 1, flexShrink: 0 }} />
      <span style={{ position: 'relative', zIndex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cfg.label}</span>
      {isTrial && (
        <span className="seal-trial-count">{countLabel} grátis</span>
      )}
    </button>
  );
}
