import React from 'react';
import { avisoDaAssinatura } from '../lib/acessoDoAluno';

// Aviso da cortesia, visivel em qualquer tela.
//
// Duas pessoas diferentes precisam dele, por motivos opostos: quem esta na reta final tem de
// saber ANTES de perder o acesso, e quem ja perdeu tem de entender por que os botoes pararam
// de responder — sem isso o app nao parece bloqueado, parece quebrado.
//
// Some sozinha para quem assina e para o administrador: quem nao tem prazo correndo nao
// precisa de um lembrete fixo no alto da tela (ver avisoDaAssinatura em acessoDoAluno.js).
const CORES = {
  neutro: { fundo: 'var(--pl-accent-soft)', borda: 'var(--pl-accent-ring)', texto: 'var(--pl-accent)' },
  warn: { fundo: 'var(--pl-warn-soft)', borda: 'var(--pl-warn)', texto: 'var(--pl-warn)' },
  danger: { fundo: 'var(--pl-danger-soft)', borda: 'var(--pl-danger)', texto: 'var(--pl-danger)' },
};

export default function FaixaDaCortesia({ estado, onAssinar }) {
  const aviso = avisoDaAssinatura(estado);
  if (!aviso) return null;

  const cores = CORES[aviso.tom] || CORES.neutro;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexWrap: 'wrap',
        gap: 12,
        padding: '8px 16px',
        background: cores.fundo,
        borderBottom: `1px solid ${cores.borda}`,
        fontSize: 12.5,
        fontWeight: 650,
        color: cores.texto,
      }}
    >
      <span>{aviso.texto}</span>
      <button
        type="button"
        onClick={onAssinar}
        className="pl-btn pl-btn-sm"
        style={{ height: 26, fontSize: 12 }}
      >
        Assinar o Papiro
      </button>
    </div>
  );
}
