import React from 'react';
import { Check, Crown, X } from 'lucide-react';

// O convite para assinar.
//
// Quando a cortesia acaba, o aluno nao pode receber um ERRO. Erro diz "deu problema"; aqui
// nao deu problema nenhum — ele chegou no limite de um periodo que sempre teve fim, e o que
// falta e uma decisao dele. Tela de erro empurra para fora; convite mostra o que esta do
// outro lado.

const PRECO = '19,90';

// O que o aluno recebe. Curto: a lista completa esta na pagina de Assinatura, e aqui o
// objetivo e responder "vale a pena?" em cinco segundos.
const DESTAQUES = [
  'Questões, flashcards e correções de redação sem limite',
  'Cronograma montado a partir do seu edital',
  'Chat de estudo e plano que se recalcula sozinho',
];

export default function ConviteParaAssinar({ acao, onFechar, onAssinar }) {
  // O titulo fala da acao que o aluno tentou. "Gerar questões faz parte do Papiro" diz muito
  // mais do que "Recurso premium" — ele acabou de querer exatamente aquilo.
  const titulo = acao ? `${acao} faz parte do Papiro.` : 'Isso faz parte do Papiro.';

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      role="dialog"
      aria-modal="true"
    >
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)' }} onClick={onFechar} />

      <div
        className="pl-card"
        style={{ position: 'relative', width: '100%', maxWidth: 440, padding: '22px 24px 20px', boxShadow: 'var(--pl-sh-high)' }}
      >
        <button
          type="button"
          onClick={onFechar}
          aria-label="Fechar"
          style={{ position: 'absolute', top: 12, right: 12, border: 0, background: 'transparent', color: 'var(--pl-ink-3)', cursor: 'pointer', padding: 4 }}
        >
          <X size={18} />
        </button>

        <span className="pl-tag pl-tag-highlight" style={{ gap: 5 }}>
          <Crown size={12} /> Papiro
        </span>

        <h2 style={{ margin: '12px 0 0', fontFamily: 'var(--pl-serif)', fontStyle: 'italic', fontWeight: 400, fontSize: 25, lineHeight: 1.2, letterSpacing: '-0.02em', color: 'var(--pl-ink)' }}>
          {titulo}
        </h2>

        {/* Antes de vender, tranquilizar: o medo de ter perdido o que construiu e o que faz
            o aluno fechar o app em vez de assinar. */}
        <p style={{ margin: '10px 0 0', fontSize: 13.5, lineHeight: 1.55, color: 'var(--pl-ink-2)' }}>
          Seu período de cortesia terminou. Seu edital, seus cursos e seu progresso continuam
          guardados — assinando, tudo volta de onde parou.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '16px 0' }}>
          {DESTAQUES.map((item) => (
            <div key={item} style={{ display: 'grid', gridTemplateColumns: '14px minmax(0,1fr)', gap: 9, alignItems: 'start' }}>
              <Check size={13} style={{ marginTop: 2, color: 'var(--pl-success)', flexShrink: 0 }} />
              <span style={{ fontSize: 12.5, lineHeight: 1.45, color: 'var(--pl-ink-2)' }}>{item}</span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 14 }}>
          <span style={{ fontSize: 12.5, color: 'var(--pl-ink-3)', fontWeight: 600 }}>R$</span>
          <span className="pl-num" style={{ fontSize: 30, lineHeight: 1, color: 'var(--pl-ink)' }}>{PRECO}</span>
          <span style={{ fontSize: 12.5, color: 'var(--pl-ink-3)', fontWeight: 600 }}>/mês · cancele quando quiser</span>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="pl-btn pl-btn-primary" style={{ flex: '1 1 200px', justifyContent: 'center' }} onClick={onAssinar}>
            Assinar o Papiro
          </button>
          {/* "Agora não" e nao "Cancelar": recusar nao e abortar uma operacao, e adiar uma
              decisao — e o aluno tem de poder adiar sem sentir que fechou uma porta. */}
          <button type="button" className="pl-btn pl-btn-ghost" onClick={onFechar}>
            Agora não
          </button>
        </div>
      </div>
    </div>
  );
}
