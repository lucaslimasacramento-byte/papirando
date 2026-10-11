import { describe, it, expect } from 'vitest';
import {
  estadoDaAssinatura,
  avisoDaAssinatura,
  motivoDoBloqueio,
  SITUACAO,
  DIAS_DE_CORTESIA,
} from './acessoDoAluno';

const AGORA = new Date('2026-10-11T12:00:00Z');

function emDias(dias) {
  const d = new Date(AGORA);
  d.setDate(d.getDate() + dias);
  return d.toISOString();
}

function emHoras(horas) {
  return new Date(AGORA.getTime() + horas * 3600000).toISOString();
}

describe('estadoDaAssinatura', () => {
  it('cortesia em dia: pode escrever e conta os dias que faltam', () => {
    const estado = estadoDaAssinatura({
      assinatura: { status: 'trialing', current_period_end: emDias(12) },
      agora: AGORA,
    });

    expect(estado).toMatchObject({
      situacao: SITUACAO.TRIAL,
      diasRestantes: 12,
      emCortesia: true,
      ehPagante: false,
      podeEscrever: true,
    });
  });

  it('cortesia vencida: ve, mas nao escreve', () => {
    const estado = estadoDaAssinatura({
      assinatura: { status: 'trialing', current_period_end: emDias(-1) },
      agora: AGORA,
    });

    expect(estado).toMatchObject({ situacao: SITUACAO.VENCIDO, venceu: true, podeEscrever: false });
  });

  it('assinatura paga em dia: pagante e escrevendo', () => {
    const estado = estadoDaAssinatura({
      assinatura: { status: 'active', current_period_end: emDias(20) },
      agora: AGORA,
    });

    expect(estado).toMatchObject({ situacao: SITUACAO.ATIVO, ehPagante: true, podeEscrever: true });
  });

  it('assinatura paga que venceu tambem bloqueia', () => {
    const estado = estadoDaAssinatura({
      assinatura: { status: 'active', current_period_end: emDias(-3) },
      agora: AGORA,
    });

    expect(estado.podeEscrever).toBe(false);
  });

  it('cancelada bloqueia mesmo com data futura', () => {
    const estado = estadoDaAssinatura({
      assinatura: { status: 'canceled', current_period_end: emDias(10) },
      agora: AGORA,
    });

    expect(estado).toMatchObject({ situacao: SITUACAO.VENCIDO, podeEscrever: false });
  });

  it('conta sem assinatura nenhuma nao e bloqueada', () => {
    // Conta antiga, de antes de o trial ser concedido no cadastro. Trata-la como vencida
    // bloquearia quem nunca teve a chance de usar os 30 dias.
    const estado = estadoDaAssinatura({ assinatura: null, agora: AGORA });

    expect(estado).toMatchObject({ situacao: SITUACAO.SEM_ASSINATURA, podeEscrever: true });
  });

  it('admin escreve sempre, e sem virar "pagante"', () => {
    const estado = estadoDaAssinatura({
      assinatura: { status: 'trialing', current_period_end: emDias(-30) },
      isAdmin: true,
      agora: AGORA,
    });

    expect(estado.podeEscrever).toBe(true);
    // Ser admin libera o acesso; nao compra assinatura. Ver planosDaAssinatura.test.js.
    expect(estado.ehPagante).toBe(false);
    expect(estado.porSerAdmin).toBe(true);
  });

  it('data invalida ou ausente nao derruba o calculo', () => {
    expect(estadoDaAssinatura({ assinatura: { status: 'active', current_period_end: 'xx' }, agora: AGORA }))
      .toMatchObject({ situacao: SITUACAO.ATIVO, podeEscrever: true });
    expect(estadoDaAssinatura({}).podeEscrever).toBe(true);
  });

  it('o periodo de cortesia e de 30 dias', () => {
    expect(DIAS_DE_CORTESIA).toBe(30);
  });
});

describe('avisoDaAssinatura', () => {
  const comDias = (dias, status = 'trialing') =>
    avisoDaAssinatura(estadoDaAssinatura({ assinatura: { status, current_period_end: emDias(dias) }, agora: AGORA }));

  it('na reta final o aviso muda de tom', () => {
    expect(comDias(20).tom).toBe('neutro');
    expect(comDias(5).tom).toBe('warn');
  });

  it('menos de 24 horas e "termina hoje", nao "falta 1 dia"', () => {
    // Arredondando para cima, quem le as 23h com 12 horas de prazo acha que tem o dia
    // seguinte inteiro. Esse aviso so existe porque a contagem arredonda para baixo.
    const aviso = avisoDaAssinatura(
      estadoDaAssinatura({ assinatura: { status: 'trialing', current_period_end: emHoras(12) }, agora: AGORA })
    );
    expect(aviso.texto).toContain('termina hoje');
    expect(aviso.tom).toBe('warn');
  });

  it('vencido diz que os dados continuam', () => {
    // O medo de perder o que construiu e o que faz o aluno abandonar em vez de assinar.
    const aviso = comDias(-1);
    expect(aviso.tom).toBe('danger');
    expect(aviso.texto).toContain('dados continuam');
  });

  it('pagante em dia nao recebe aviso', () => {
    expect(comDias(15, 'active')).toBeNull();
  });

  it('admin nao recebe aviso de cortesia', () => {
    const estado = estadoDaAssinatura({ assinatura: null, isAdmin: true, agora: AGORA });
    expect(avisoDaAssinatura(estado)).toBeNull();
  });
});

describe('motivoDoBloqueio', () => {
  it('fala da acao que o aluno tentou', () => {
    expect(motivoDoBloqueio('Gerar questões')).toContain('Gerar questões');
  });

  it('sem acao, ainda diz o que fazer', () => {
    expect(motivoDoBloqueio()).toContain('Assine o Papiro');
  });
});
