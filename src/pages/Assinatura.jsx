import React, { useState } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';

const PLANS = [
  {
    id: 'folha',
    name: 'Folha',
    audience: 'Para quem quer experimentar.',
    monthlyPrice: '0',
    annualPrice: '0',
    annualNote: '',
    cta: 'Começar no Folha',
    featured: false,
    included: [
      '1 material por mês (upload de PDF/texto)',
      'Geração de até 30 questões por IA por mês',
      'Plano de estudo básico (sem recalcular rotas)',
      'Acesso à comunidade (somente leitura)',
      '20 mensagens/dia no chat com IA',
    ],
    excluded: ['Modo banca', 'Correção de redação', 'Calendário inteligente', 'Salas VIP'],
  },
  {
    id: 'caderno',
    name: 'Caderno',
    audience: 'Para universitário, autodidata, concurseiro que está começando.',
    monthlyPrice: '49,90',
    annualPrice: '39,90',
    annualNote: 'Cobrado em R$ 478,80/ano',
    cta: 'Escolher Caderno',
    featured: true,
    included: [
      '10 uploads de material por mês',
      'Geração ilimitada de questões por IA nos materiais carregados',
      'Resumos e flashcards ilimitados',
      'Plano de estudo adaptativo com recálculo de rota',
      'Modo Banca básico (CESPE e FGV)',
      '4 correções de redação por mês',
      '200 mensagens/dia no chat com IA',
      'Calendário inteligente com lembretes',
      'Comunidade completa',
      'Suporte via chat em até 24h',
    ],
    excluded: ['Modo banca completo', 'Sala VIP', 'Correções ilimitadas'],
  },
  {
    id: 'estudio',
    name: 'Estúdio',
    audience: 'Para concurseiro pesado, vestibulando de medicina, profissional que estuda muito.',
    monthlyPrice: '89,90',
    annualPrice: '71,90',
    annualNote: 'Cobrado em R$ 862,80/ano',
    cta: 'Ir para o Estúdio',
    featured: false,
    included: [
      'Uploads ilimitados de material',
      'Geração ilimitada de tudo (questões, resumos, flashcards, mapas mentais)',
      'Modo Banca completo: CESPE, FGV, FCC, Cesgranrio — simulados no padrão exato de cada banca',
      'Cronograma gerado a partir de edital (aluno sobe PDF do edital + data da prova, sistema monta cronograma)',
      '20 correções de redação por mês',
      'Chat com IA ilimitado',
      'Audiobooks e materiais exclusivos',
      'Sala VIP da comunidade',
      'Suporte prioritário em até 4h',
      'Selo "Turma Fundadora" no perfil (se cadastro até 03/06/2026)',
    ],
    excluded: [],
  },
];

const FAQS = [
  {
    question: 'Preciso colocar cartão?',
    answer: 'Não. Cadastro sem cartão no plano Folha e na Turma Fundadora.',
  },
  {
    question: 'O que acontece ao fim do período gratuito?',
    answer: 'Você decide se continua. Nada cobrado automaticamente.',
  },
  {
    question: 'Serve pra qual concurso ou faculdade?',
    answer: 'Qualquer um. Você traz o material; a plataforma adapta.',
  },
  {
    question: 'E se eu não tiver material pronto?',
    answer: 'Temos trilhas e editais mapeados para os concursos mais procurados. Comece por lá.',
  },
  {
    question: 'O plano Folha expira?',
    answer: 'Não. É gratuito para sempre, com os limites descritos.',
  },
];

export default function Assinatura({
  user = null,
  currentPlan = 'folha',
  onSelectPlan = () => {},
}) {
  const [isAnual, setIsAnual] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);

  const normalizedCurrentPlan = String(currentPlan || user?.subscription_plan || 'folha').toLowerCase();

  const handleSelect = (planName) => {
    onSelectPlan(planName, isAnual);
  };

  return (
    <div className="pl-page" style={{ minHeight: '100%', overflow: 'auto', padding: '18px 20px 48px' }}>
      <section className="pl-paper-bg" style={{ padding: '28px 28px 48px' }}>
        <p className="pl-eyebrow">PLANOS</p>
        <h1 className="pl-display">Escolha a sua mesa de trabalho.</h1>
        <p style={{ fontSize: 14, color: 'var(--pl-ink-2)', margin: '12px 0 0', maxWidth: 720 }}>
          Traga seu material. A IA estuda junto com você. Sem curso, sem trilha imposta.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 24 }}>
          <div
            role="group"
            aria-label="Alternar cobrança mensal ou anual"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: 4,
              border: '1px solid var(--pl-rule-2)',
              borderRadius: 999,
              background: 'var(--pl-surface)',
            }}
          >
            <BillingButton active={!isAnual} onClick={() => setIsAnual(false)}>
              Mensal
            </BillingButton>
            <BillingButton active={isAnual} onClick={() => setIsAnual(true)}>
              Anual
            </BillingButton>
          </div>
          <span className="pl-tag pl-tag-accent">Economize 20%</span>
        </div>
      </section>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 16,
          marginTop: 18,
        }}
      >
        {PLANS.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            isAnual={isAnual}
            isCurrent={normalizedCurrentPlan === plan.id}
            onSelect={handleSelect}
          />
        ))}
      </section>

      <section className="pl-card-ai" style={{ marginTop: 18, padding: 24 }}>
        <div style={{ display: 'flex', gap: 18, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <div style={{ maxWidth: 720 }}>
            <p className="pl-eyebrow">TURMA FUNDADORA · ENCERRA 03/06</p>
            <p style={{ margin: '8px 0 0', fontSize: 18, lineHeight: 1.5, color: 'var(--pl-ink)' }}>
              Quem se cadastrar até 3 de junho ganha 3 meses do plano Estúdio por nossa conta. Sem cartão.
            </p>
          </div>
          <button type="button" className="pl-btn pl-btn-ai" onClick={() => handleSelect('estudio')}>
            Entrar na Turma Fundadora
          </button>
        </div>
      </section>

      <section style={{ marginTop: 28 }}>
        <p className="pl-eyebrow">FAQ</p>
        <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
          {FAQS.map((item, index) => {
            const isOpen = openFaq === index;
            return (
              <div key={item.question} className="pl-card" style={{ overflow: 'hidden' }}>
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? -1 : index)}
                  aria-expanded={isOpen}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                    padding: '16px 18px',
                    border: 0,
                    background: 'transparent',
                    color: 'var(--pl-ink)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontWeight: 750,
                  }}
                >
                  {item.question}
                  <ChevronDown
                    size={16}
                    style={{
                      color: 'var(--pl-ink-3)',
                      transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 140ms ease',
                      flexShrink: 0,
                    }}
                  />
                </button>
                {isOpen ? (
                  <p style={{ margin: 0, padding: '0 18px 16px', color: 'var(--pl-ink-2)', fontSize: 14, lineHeight: 1.55 }}>
                    {item.answer}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function BillingButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      style={{
        height: 34,
        padding: '0 16px',
        border: 0,
        borderRadius: 999,
        background: active ? 'var(--pl-ink)' : 'transparent',
        color: active ? 'var(--pl-bg)' : 'var(--pl-ink-2)',
        cursor: 'pointer',
        fontWeight: 750,
        fontSize: 13,
      }}
    >
      {children}
    </button>
  );
}

function PlanCard({ plan, isAnual, isCurrent, onSelect }) {
  const price = isAnual ? plan.annualPrice : plan.monthlyPrice;
  const buttonClass = plan.featured ? 'pl-btn pl-btn-primary' : 'pl-btn pl-btn-ghost';

  return (
    <article
      className="pl-card"
      style={{
        padding: 22,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 620,
        borderColor: plan.featured ? 'var(--pl-accent)' : 'var(--pl-rule-2)',
        boxShadow: plan.featured ? '0 18px 42px rgba(20, 17, 13, 0.12)' : 'none',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
        <div>
          <p className="pl-eyebrow">{plan.name}</p>
          <p style={{ margin: '8px 0 0', minHeight: 42, color: 'var(--pl-ink-2)', fontSize: 13.5, lineHeight: 1.45 }}>
            {plan.audience}
          </p>
        </div>
        {plan.featured ? <span className="pl-tag pl-tag-accent">Mais escolhido</span> : null}
      </div>

      <div style={{ marginTop: 22 }}>
        <span className="pl-num" style={{ fontSize: 48, lineHeight: 1, color: 'var(--pl-ink)' }}>
          R$ {price}
        </span>
        <span style={{ marginLeft: 4, color: 'var(--pl-ink-3)', fontSize: 14, fontWeight: 650 }}>/mês</span>
        {isAnual && plan.annualNote ? (
          <p style={{ margin: '8px 0 0', color: 'var(--pl-ink-3)', fontSize: 12.5, fontWeight: 650 }}>
            {plan.annualNote}
          </p>
        ) : null}
      </div>

      <button
        type="button"
        className={buttonClass}
        onClick={() => onSelect(plan.id)}
        style={{ marginTop: 20, justifyContent: 'center', width: '100%' }}
      >
        {isCurrent ? 'Plano atual' : plan.cta}
      </button>

      <div style={{ display: 'grid', gap: 10, marginTop: 22 }}>
        {plan.included.map((feature) => (
          <FeatureRow key={feature} available>
            {feature}
          </FeatureRow>
        ))}
        {plan.excluded.map((feature) => (
          <FeatureRow key={feature} available={false}>
            {feature}
          </FeatureRow>
        ))}
      </div>
    </article>
  );
}

function FeatureRow({ available, children }) {
  const Icon = available ? Check : X;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '18px minmax(0, 1fr)', gap: 9, alignItems: 'start' }}>
      <Icon
        size={16}
        aria-hidden="true"
        style={{
          marginTop: 2,
          color: available ? 'var(--pl-success)' : 'var(--pl-ink-4)',
        }}
      />
      <span style={{ color: available ? 'var(--pl-ink-2)' : 'var(--pl-ink-3)', fontSize: 13.5, lineHeight: 1.45 }}>
        {children}
      </span>
    </div>
  );
}
