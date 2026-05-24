import React from 'react';
import { Sparkles } from 'lucide-react';

/**
 * Botão de IA Bizu · Papirando v1.0
 *
 * @param {object}  props
 * @param {boolean} [props.aura]     — halo pulsante (usar só em CTAs IA premium: máx. 1 por tela)
 * @param {boolean} [props.onDark]   — variante sobre fundo escuro (sidebar, dark mode)
 * @param {boolean} [props.beta]     — suffix "beta" em Fraunces italic
 * @param {React.ReactNode} [props.icon] — ícone customizado; default: Sparkles
 * @param {React.ReactNode} props.children
 */
export default function AIButton({
  aura = false,
  onDark = false,
  beta = false,
  icon,
  children,
  ...rest
}) {
  const iconEl = icon ?? <Sparkles size={14} aria-hidden />;

  const button = (
    <button className={`btn-ai${onDark ? ' is-on-dark' : ''}`} {...rest}>
      {iconEl}
      {children}
      {beta && <span className="beta">beta</span>}
    </button>
  );

  if (aura) {
    return <span className="btn-ai-aura">{button}</span>;
  }
  return button;
}
