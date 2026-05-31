import React, { useMemo, useState } from 'react';
import { Check } from 'lucide-react';

const PLANS = [
  {
    id: 'folha',
    name: 'Folha',
    audience: 'Para começar sem compromisso.',
    monthlyPrice: '0',
    annualPrice: '0',
    annualNote: '',
    annualDiscount: null,
    cta: 'Continuar no Folha',
    featured: false,
    trial: false,
    included: [
      '3 uploads de material por mês',
      '50 questões geradas por IA por mês',
      '1 correção de redação por mês',
      'Chat com IA: 15 mensagens por dia',
      'Plano de estudo básico',
      'Simulados com gabarito',
      'Comunidade (somente leitura)',
    ],
  },
  {
    id: 'papiro',
    name: 'Papiro',
    audience: 'Acesso total à plataforma. Sem limites.',
    monthlyPrice: '19,90',
    annualPrice: '13,30',
    annualNote: 'R$ 159,90/ano',
    annualDiscount: '33% off',
    cta: 'Começar 1º mês grátis',
    featured: true,
    trial: true,
    included: [
      'Uploads ilimitados de material',
      'Questões e flashcards ilimitados por IA',
      'Correções de redação ilimitadas',
      'Chat com IA ilimitado',
      'Plano adaptativo com recálculo de rota',
      'Modo Banca: CESPE, FGV, FCC, Cesgranrio',
      'Cronograma gerado a partir de edital',
      'Audiobooks e materiais exclusivos',
      'Comunidade completa + sala VIP',
      'Suporte prioritário em até 4h',
    ],
  },
];

function fmtDate(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return null; }
}

export default function Assinatura({
  user = null,
  currentPlan = 'folha',
  expiresAt = null,
  onSelectPlan = () => {},
  checkoutLoading = false,
}) {
  const [isAnual, setIsAnual] = useState(false);

  // Normaliza planos legados para os nomes atuais
  const normalizedCurrentPlan = useMemo(() => {
    const raw = String(currentPlan || user?.subscription_plan || 'folha').toLowerCase();
    if (['papiro', 'elite', 'tatico'].includes(raw)) return 'papiro';
    return 'folha';
  }, [currentPlan, user?.subscription_plan]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Toggle mensal / anual */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          role="group"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: 4, border: '1px solid var(--pl-rule-2)',
            borderRadius: 999, background: 'var(--pl-surface)',
          }}
        >
          <BillingButton active={!isAnual} onClick={() => setIsAnual(false)}>Mensal</BillingButton>
          <BillingButton active={isAnual} onClick={() => setIsAnual(true)}>Anual</BillingButton>
        </div>
        {isAnual && (
          <span className="pl-tag pl-tag-success" style={{ fontSize: 11 }}>
            Economize 33% no anual
          </span>
        )}
      </div>

      {/* Cards — 2 colunas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 14, alignItems: 'stretch' }}>
        {PLANS.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            isAnual={isAnual}
            isCurrent={normalizedCurrentPlan === plan.id}
            expiresAt={normalizedCurrentPlan === plan.id ? expiresAt : null}
            onSelect={(planId) => onSelectPlan(planId, isAnual)}
            checkoutLoading={checkoutLoading}
          />
        ))}
      </div>

      <p style={{ fontSize: 11.5, color: 'var(--pl-ink-3)', textAlign: 'center', marginTop: 4 }}>
        Pagamento via cartão de crédito ou PIX · Cancele a qualquer momento · Sem fidelidade
      </p>
    </div>
  );
}

function BillingButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        height: 32, padding: '0 16px', border: 0, borderRadius: 999,
        background: active ? 'var(--pl-ink)' : 'transparent',
        color: active ? 'var(--pl-bg)' : 'var(--pl-ink-2)',
        cursor: 'pointer', fontWeight: 700, fontSize: 13,
      }}
    >
      {children}
    </button>
  );
}

function PlanCard({ plan, isAnual, isCurrent, expiresAt, onSelect, checkoutLoading = false }) {
  const price = isAnual ? plan.annualPrice : plan.monthlyPrice;
  const expiry = fmtDate(expiresAt);
  const isFree = plan.monthlyPrice === '0';

  return (
    <article
      className="pl-card"
      style={{
        padding: 22,
        display: 'flex',
        flexDirection: 'column',
        borderColor: isCurrent
          ? 'var(--pl-accent)'
          : plan.featured
          ? 'var(--pl-accent)'
          : 'var(--pl-rule-2)',
        boxShadow: plan.featured ? '0 12px 32px rgba(20,17,13,0.08)' : 'none',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Badge no topo do card Papiro */}
      {plan.trial && !isCurrent && (
        <div style={{
          position: 'absolute', top: 0, right: 0,
          background: 'var(--pl-accent)', color: 'var(--pl-bg)',
          fontSize: 10.5, fontWeight: 800, letterSpacing: '0.06em',
          padding: '4px 12px', borderBottomLeftRadius: 8,
          textTransform: 'uppercase',
        }}>
          1º mês grátis
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 4 }}>
        <p className="pl-eyebrow" style={{ marginBottom: 4 }}>{plan.name}</p>
        <p style={{ fontSize: 12.5, color: 'var(--pl-ink-2)', lineHeight: 1.4 }}>
          {plan.audience}
        </p>
      </div>

      {/* Plano atual */}
      {isCurrent && (
        <div style={{
          borderRadius: 8, background: 'var(--pl-accent-soft)',
          border: '1px solid var(--pl-accent-ring)',
          padding: '6px 10px', marginTop: 4, marginBottom: 4,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
        }}>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--pl-accent)' }}>✓ Plano atual</span>
          {expiry && <span style={{ fontSize: 11, color: 'var(--pl-ink-3)' }}>Expira {expiry}</span>}
        </div>
      )}

      {/* Preço */}
      <div style={{ marginTop: 12, marginBottom: 2 }}>
        {isFree ? (
          <span className="pl-num" style={{ fontSize: 36, lineHeight: 1, color: 'var(--pl-ink)' }}>
            Grátis
          </span>
        ) : (
          <>
            <span style={{ fontSize: 13, color: 'var(--pl-ink-3)', fontWeight: 600 }}>R$ </span>
            <span className="pl-num" style={{ fontSize: 36, lineHeight: 1, color: 'var(--pl-ink)' }}>
              {price}
            </span>
            <span style={{ marginLeft: 3, color: 'var(--pl-ink-3)', fontSize: 12, fontWeight: 600 }}>/mês</span>
          </>
        )}
      </div>

      {/* Linha de desconto — espaço fixo */}
      <div style={{ height: 22, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
        {isAnual && plan.annualDiscount ? (
          <>
            <span className="pl-tag pl-tag-success" style={{ fontSize: 11 }}>{plan.annualDiscount}</span>
            <span style={{ fontSize: 11, color: 'var(--pl-ink-3)' }}>{plan.annualNote}</span>
          </>
        ) : null}
      </div>

      {/* CTA */}
      <button
        type="button"
        className={plan.featured ? 'pl-btn pl-btn-ai' : 'pl-btn pl-btn-ghost'}
        onClick={() => !isCurrent && !isFree && onSelect(plan.id)}
        style={{ justifyContent: 'center', width: '100%', marginBottom: 16, opacity: (checkoutLoading && !isFree) ? 0.7 : 1 }}
        disabled={isCurrent || (checkoutLoading && !isFree)}
      >
        {isCurrent
          ? 'Plano atual'
          : (checkoutLoading && !isFree)
          ? 'Aguarde...'
          : plan.cta}
      </button>

      {/* Features */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {plan.included.map((feature) => (
          <div key={feature} style={{ display: 'grid', gridTemplateColumns: '14px minmax(0,1fr)', gap: 8, alignItems: 'start' }}>
            <Check size={13} style={{ marginTop: 2, color: 'var(--pl-success)', flexShrink: 0 }} />
            <span style={{ color: 'var(--pl-ink-2)', fontSize: 12.5, lineHeight: 1.4 }}>{feature}</span>
          </div>
        ))}
      </div>
    </article>
  );
}
