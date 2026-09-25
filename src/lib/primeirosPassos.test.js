import { describe, it, expect } from 'vitest';
import { primeirosPassos, PASSOS_INICIAIS } from './primeirosPassos';

describe('primeirosPassos', () => {
  // A direcao mudou: o edital e o ponto de partida, nao a escolha num catalogo.
  it('comeca pelo edital', () => {
    expect(PASSOS_INICIAIS[0].id).toBe('edital');
    expect(primeirosPassos().indiceAtual).toBe(0);
  });

  it('anda para a rotina depois que existe curso', () => {
    const { indiceAtual, quantosFeitos } = primeirosPassos({ temCurso: true });
    expect(indiceAtual).toBe(1);
    expect(quantosFeitos).toBe(1);
  });

  it('anda para a sessao depois da rotina', () => {
    expect(primeirosPassos({ temCurso: true, rotinaConfigurada: true }).indiceAtual).toBe(2);
  });

  it('marca como concluido quando nao falta nada', () => {
    const resultado = primeirosPassos({ temCurso: true, rotinaConfigurada: true, temHistorico: true });
    expect(resultado.concluido).toBe(true);
    expect(resultado.indiceAtual).toBe(-1);
    expect(resultado.quantosFeitos).toBe(3);
  });

  // O aluno pode registrar uma sessao antes de definir a rotina: o passo pendente continua
  // sendo o que falta, nao o proximo da fila.
  it('aponta o primeiro pendente mesmo fora de ordem', () => {
    const { indiceAtual, passos } = primeirosPassos({ temCurso: true, temHistorico: true });
    expect(indiceAtual).toBe(1);
    expect(passos[2].feito).toBe(true);
  });

  it('todo passo tem rotulo de acao e detalhe', () => {
    primeirosPassos().passos.forEach((passo) => {
      expect(passo.acao).toBeTruthy();
      expect(passo.detalhe).toBeTruthy();
    });
  });
});
