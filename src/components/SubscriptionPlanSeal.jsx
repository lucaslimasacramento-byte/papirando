import React from 'react';
import { Crown, Sparkles, Circle, FlaskConical } from 'lucide-react';

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
    wrapper:
      'border-ink-200/90 bg-ink-50 text-ink-600 shadow-sm seal-plan-gratuito hover:border-ink-300 hover:bg-ink-100 py-1 pl-2 pr-2.5 gap-1 text-[10px] font-semibold',
    iconClass: 'text-ink-400',
  },
  tatico: {
    label: 'Tático',
    title: 'Plano Tático — toque para gerenciar assinatura',
    icon: Sparkles,
    iconSize: 14,
    wrapper:
      'border-brand-400/60 bg-gradient-to-r from-brand-900 via-brand-700 to-brand-600 text-white shadow-md shadow-brand-900/25 ring-2 ring-brand-400/35 seal-plan-tatico hover:brightness-[1.06] hover:shadow-lg py-1.5 pl-2.5 pr-3 gap-1.5 text-xs font-bold',
    iconClass: 'text-brand-100',
  },
  beta: {
    label: 'Beta 3 meses',
    title: 'Acesso beta completo por 3 meses',
    icon: FlaskConical,
    iconSize: 14,
    wrapper:
      'border-cyan-300/80 bg-gradient-to-r from-cyan-700 via-brand-700 to-brand-700 text-white shadow-md shadow-brand-900/25 ring-2 ring-cyan-300/40 hover:brightness-[1.06] py-1.5 pl-2.5 pr-3 gap-1.5 text-[10px] font-extrabold tracking-wide',
    iconClass: 'text-cyan-100',
  },
  elite: {
    label: 'Elite',
    title: 'Plano Elite — toque para gerenciar assinatura',
    icon: Crown,
    iconSize: 16,
    wrapper:
      'border-amber-300/90 bg-gradient-to-r from-amber-800 via-amber-500 to-yellow-300 text-amber-950 shadow-lg shadow-amber-900/30 ring-2 ring-amber-400/60 seal-plan-elite hover:brightness-[1.05] hover:shadow-xl scale-[1.02] py-2 pl-3 pr-3.5 gap-2 text-xs font-extrabold tracking-wide',
    iconClass: 'text-amber-950',
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
      className={`relative inline-flex max-w-full items-center overflow-hidden rounded-lg border text-left uppercase transition ${cfg.wrapper}`}
    >
      <Icon size={iconSize} strokeWidth={key === 'gratuito' ? 2.5 : 2} className={`relative z-[1] shrink-0 ${cfg.iconClass}`} />
      <span className="relative z-[1] truncate">{cfg.label}</span>
    </button>
  );
}
