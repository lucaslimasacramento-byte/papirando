import React, { useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import { startCheckout } from '../lib/subscriptionApi';
import { showToast } from '../lib/dialogs';
import { SITUACAO, DIAS_DE_CORTESIA } from '../lib/acessoDoAluno';

// Um plano so.
//
// O Folha deixou de existir: toda conta ganha 30 dias de cortesia ao se cadastrar e, depois
// disso, so continua escrevendo quem assina. Manter o cartao do gratuito ao lado seria
// oferecer uma escolha que nao existe mais — e a tela de planos nao e lugar para anunciar
// uma porta fechada.
const PAPIRO = {
  id: 'papiro',
  name: 'Papiro',
  audience: 'Acesso total à plataforma. Sem limites.',
  monthlyPrice: '19,90',
  annualPrice: '13,30',
  annualNote: 'R$ 159,90/ano',
  annualDiscount: '33% off',
  cta: 'Assinar o Papiro',
  included: [
    'Uploads ilimitados de material',
    'Questões e flashcards ilimitados',
    'Correções de redação ilimitadas',
    'Chat de estudo ilimitado',
    'Plano adaptativo com recálculo de rota',
    'Modo Banca: CESPE, FGV, FCC, Cesgranrio',
    'Cronograma gerado a partir de edital',
    'Audiobooks e materiais exclusivos',
    'Comunidade completa + sala VIP',
    'Suporte prioritário em até 4h',
  ],
};

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
  // Situacao da conta, de src/lib/acessoDoAluno.js. Sem ela a tela cai num estado neutro —
  // mostra o plano e nada sobre o prazo —, que e o que acontece se alguem renderizar esta
  // pagina sem passar o estado.
  estado = null,
  onSelectPlan = null,
  checkoutLoading = false,
}) {
  const [isAnual, setIsAnual] = useState(false);
  const [internalBusy, setInternalBusy] = useState(false);

  // Se o pai passou um handler (ex.: Perfil), usa ele. Senão, dispara o checkout
  // aqui mesmo — assim a tela funciona mesmo renderizada standalone (AppTabContent).
  const handleSelect = async (planId) => {
    if (typeof onSelectPlan === 'function') {
      onSelectPlan(planId, isAnual);
      return;
    }
    setInternalBusy(true);
    try {
      const url = await startCheckout({ planId: 'papiro', billing: isAnual ? 'annual' : 'monthly' });
      window.location.href = url;
    } catch (err) {
      showToast(err?.message || 'Erro ao iniciar o pagamento. Tente novamente.', 'error');
      setInternalBusy(false);
    }
  };

  // Assinante de verdade: so quem paga. Cortesia nao conta — e justamente quem a tela
  // precisa convencer.
  const ehAssinante = useMemo(() => {
    if (estado) return estado.ehPagante;
    const raw = String(currentPlan || user?.subscription_plan || '').toLowerCase();
    return ['papiro', 'elite', 'tatico'].includes(raw);
  }, [estado, currentPlan, user?.subscription_plan]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      <SituacaoDaConta estado={estado} expiresAt={expiresAt} />

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

      {/* Um cartao so, e nao largo demais: uma coluna de 10 itens esticada por 1400px vira
          uma lista solta no meio do branco. */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 520 }}>
          <PlanCard
            plan={PAPIRO}
            isAnual={isAnual}
            isCurrent={ehAssinante}
            expiresAt={ehAssinante ? expiresAt : null}
            onSelect={(planId) => handleSelect(planId)}
            checkoutLoading={checkoutLoading || internalBusy}
          />
        </div>
      </div>

      <p style={{ fontSize: 11.5, color: 'var(--pl-ink-3)', textAlign: 'center', marginTop: 4 }}>
        Pagamento via cartão de crédito ou PIX · Cancele a qualquer momento · Sem fidelidade
      </p>
    </div>
  );
}

// Em que pe esta a conta, no topo da propria tela de planos.
//
// Sem isto, o aluno em cortesia e o aluno vencido veem exatamente a mesma pagina — e os dois
// precisam de respostas diferentes: um quer saber quanto tempo ainda tem, o outro quer saber
// se perdeu o que construiu. Essa segunda pergunta e a que decide entre assinar e sumir, e
// por isso a resposta vem antes do preco.
function SituacaoDaConta({ estado, expiresAt }) {
  if (!estado || estado.porSerAdmin) return null;
  if (estado.ehPagante) {
    const ate = fmtDate(expiresAt);
    return (
      <Faixa tom="success">
        <strong>Assinatura ativa.</strong>{ate ? ` Próxima renovação em ${ate}.` : ''}
      </Faixa>
    );
  }

  if (estado.situacao === SITUACAO.TRIAL) {
    const dias = estado.diasRestantes;
    const apertado = dias <= 7;
    return (
      <Faixa tom={apertado ? 'warn' : 'accent'}>
        {dias <= 0 ? (
          <><strong>Sua cortesia termina hoje.</strong> Assine para não perder o ritmo.</>
        ) : (
          <>
            <strong>{dias} {dias === 1 ? 'dia' : 'dias'}</strong> de cortesia{apertado ? ' — e depois?' : ` dos ${DIAS_DE_CORTESIA}.`}
            {apertado ? ' Assinando agora, nada para.' : ' Use à vontade; nada é cobrado até você assinar.'}
          </>
        )}
      </Faixa>
    );
  }

  if (estado.situacao === SITUACAO.VENCIDO) {
    return (
      <Faixa tom="danger">
        <strong>Sua cortesia terminou.</strong> Seu edital, seus cursos e seu progresso continuam
        aqui — você só não consegue estudar nem criar nada novo até assinar.
      </Faixa>
    );
  }

  return null;
}

const TONS_DA_FAIXA = {
  success: { fundo: 'var(--pl-success-soft)', borda: 'var(--pl-success)', texto: 'var(--pl-success)' },
  accent: { fundo: 'var(--pl-accent-soft)', borda: 'var(--pl-accent-ring)', texto: 'var(--pl-accent)' },
  warn: { fundo: 'var(--pl-warn-soft)', borda: 'var(--pl-warn)', texto: 'var(--pl-warn)' },
  danger: { fundo: 'var(--pl-danger-soft)', borda: 'var(--pl-danger)', texto: 'var(--pl-danger)' },
};

function Faixa({ tom = 'accent', children }) {
  const cores = TONS_DA_FAIXA[tom] || TONS_DA_FAIXA.accent;
  return (
    <div style={{
      borderRadius: 8,
      background: cores.fundo,
      border: `1px solid ${cores.borda}`,
      borderLeft: `3px solid ${cores.borda}`,
      padding: '10px 14px',
      fontSize: 13,
      lineHeight: 1.5,
      color: cores.texto,
      fontWeight: 600,
    }}>
      {children}
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
      {plan.featured && !isCurrent && (
        <div style={{
          position: 'absolute', top: 0, right: 0,
          background: 'var(--pl-accent)', color: 'var(--pl-bg)',
          fontSize: 10.5, fontWeight: 800, letterSpacing: '0.06em',
          padding: '4px 12px', borderBottomLeftRadius: 8,
          textTransform: 'uppercase',
        }}>
          1 mês grátis incluso
        </div>
      )}

      {/* Header — altura reservada para duas linhas de subtitulo.
          Em tela estreita um dos textos quebra antes do outro, e so isso ja bastava para
          empurrar o botao de um cartao para baixo do outro. */}
      <div style={{ marginBottom: 4 }}>
        <p className="pl-eyebrow" style={{ marginBottom: 4 }}>{plan.name}</p>
        <p style={{ fontSize: 12.5, color: 'var(--pl-ink-2)', lineHeight: 1.4, minHeight: 35 }}>
          {plan.audience}
        </p>
      </div>

      {/* Faixa do plano atual — espaço fixo, pelo mesmo motivo da linha de desconto logo
          abaixo: ela só aparece em UM dos cartões, e sem reservar o lugar no outro os dois
          botões caem em alturas diferentes. Comparar planos lado a lado é a função desta
          tela; com as chamadas desalinhadas, o olho perde a régua. */}
      <div style={{ height: 32, marginTop: 4, marginBottom: 4 }}>
        {isCurrent && (
          <div style={{
            height: '100%',
            borderRadius: 8, background: 'var(--pl-accent-soft)',
            border: '1px solid var(--pl-accent-ring)',
            padding: '0 10px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--pl-accent)' }}>✓ Plano atual</span>
            {expiry && <span style={{ fontSize: 11, color: 'var(--pl-ink-3)' }}>Expira {expiry}</span>}
          </div>
        )}
      </div>

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
        className={
          isCurrent
            ? 'pl-btn pl-btn-current'
            : plan.featured ? 'pl-btn pl-btn-ai' : 'pl-btn pl-btn-ghost'
        }
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
