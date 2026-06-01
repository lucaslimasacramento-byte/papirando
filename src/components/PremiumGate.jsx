import React from 'react';
import { Lock, Sparkles, Zap } from 'lucide-react';
import { getGateHint, getGateLabel, COUNTED_LIMITS } from '../lib/planLimits';

/**
 * PremiumGate — exibe gate de upgrade quando usuário free tenta usar feature premium
 *
 * Modos:
 *   mode="page"    → ocupa a tela inteira (para páginas bloqueadas como Audiobooks)
 *   mode="overlay" → sobreposição sobre os filhos com blur (para seções da página)
 *   mode="banner"  → banner inline abaixo/acima do conteúdo (para limites atingidos)
 *   mode="button"  → substitui um botão por um botão de upgrade
 *
 * Uso:
 *   <PremiumGate locked={!isPremium} feature="audiobooks" mode="page" onUpgrade={...} />
 *   <PremiumGate locked={!isPremium} feature="ai_flashcards" mode="overlay" onUpgrade={...}>
 *     <FlashcardsAIPanel />
 *   </PremiumGate>
 *   <PremiumGate locked={limitReached} feature="questions_daily" mode="banner"
 *     used={8} limit={10} onUpgrade={...} />
 */
export default function PremiumGate({
  locked = false,
  feature = '',
  mode = 'banner',
  children = null,
  onUpgrade,
  used,
  limit,
  // Sobrescreve textos automáticos
  label: labelOverride,
  hint: hintOverride,
}) {
  if (!locked) return children ?? null;

  const label = labelOverride || getGateLabel(feature);
  const hint  = hintOverride  || getGateHint(feature);
  const cfg   = COUNTED_LIMITS[feature];
  const showCounter = cfg && typeof used === 'number' && typeof limit === 'number';

  const handleUpgrade = () => {
    if (typeof onUpgrade === 'function') {
      onUpgrade();
    }
  };

  // ── PAGE ──────────────────────────────────────────────────────────────────
  if (mode === 'page') {
    return (
      <div className="pl-paper-bg" style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: 420, padding: '48px 24px',
        textAlign: 'center',
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: 16, marginBottom: 20,
          background: 'var(--pl-accent-soft)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Lock size={28} style={{ color: 'var(--pl-accent)' }} />
        </div>
        <p className="pl-eyebrow" style={{ marginBottom: 8, color: 'var(--pl-accent)' }}>
          Plano Papiro
        </p>
        <h2 className="pl-display" style={{ fontSize: 28, marginBottom: 12 }}>
          {label}
        </h2>
        <p style={{ fontSize: 14, color: 'var(--pl-ink-2)', maxWidth: 400, lineHeight: 1.6, marginBottom: 28 }}>
          {hint}. Assine o Papiro por <strong>R$&nbsp;19,90/mês</strong> e tenha acesso total à plataforma — primeiro mês incluso no cadastro.
        </p>
        <button type="button" className="pl-btn pl-btn-ai pl-btn-lg" onClick={handleUpgrade}>
          <Sparkles size={16} /> Assinar o Papiro
        </button>
      </div>
    );
  }

  // ── OVERLAY ───────────────────────────────────────────────────────────────
  if (mode === 'overlay') {
    return (
      <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 8 }}>
        {/* Conteúdo com blur */}
        <div style={{ filter: 'blur(4px)', pointerEvents: 'none', userSelect: 'none', opacity: 0.5 }}>
          {children}
        </div>
        {/* Overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: 'rgba(var(--pl-bg-rgb, 247,243,236), 0.85)',
          backdropFilter: 'blur(2px)',
          borderRadius: 8, padding: 24, textAlign: 'center', gap: 12,
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'var(--pl-accent-soft)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Lock size={20} style={{ color: 'var(--pl-accent)' }} />
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--pl-ink)', marginBottom: 4 }}>
              {label}
            </p>
            <p style={{ fontSize: 12.5, color: 'var(--pl-ink-2)', maxWidth: 300, lineHeight: 1.5 }}>
              {hint}
            </p>
          </div>
          <button type="button" className="pl-btn pl-btn-ai" onClick={handleUpgrade}>
            <Sparkles size={14} /> Assinar o Papiro — R$&nbsp;19,90/mês
          </button>
        </div>
      </div>
    );
  }

  // ── BANNER ────────────────────────────────────────────────────────────────
  if (mode === 'banner') {
    return (
      <div style={{
        borderRadius: 10,
        border: '1px solid var(--pl-accent-ring)',
        background: 'var(--pl-accent-soft)',
        padding: '14px 16px',
        display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          background: 'var(--pl-accent)', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Zap size={18} style={{ color: '#fff' }} />
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--pl-ink)', marginBottom: 2 }}>
            {showCounter
              ? `Você usou ${used} de ${limit} ${label}`
              : `${label} — plano Papiro`}
          </p>
          <p style={{ fontSize: 12, color: 'var(--pl-ink-2)' }}>{hint}</p>
        </div>
        <button type="button" className="pl-btn pl-btn-ai pl-btn-sm" onClick={handleUpgrade} style={{ flexShrink: 0 }}>
          <Sparkles size={13} /> Assinar — R$&nbsp;19,90
        </button>
      </div>
    );
  }

  // ── BUTTON ────────────────────────────────────────────────────────────────
  if (mode === 'button') {
    return (
      <button
        type="button"
        className="pl-btn pl-btn-ghost"
        onClick={handleUpgrade}
        title={hint}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, opacity: 0.7 }}
      >
        <Lock size={13} />
        {label}
      </button>
    );
  }

  return children ?? null;
}
