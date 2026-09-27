import { describe, it, expect } from 'vitest';
import {
  cursoAtivo,
  objetivoPrincipal,
  cursoEstaAtivo,
  objetivoAoAtivar,
  alvoAoAtivar,
  prazoDoCursoAtivo,
  objetivosOrdenados,
} from './alvoDoAluno';

const HOJE = new Date('2026-09-27T12:00:00Z');

function emDias(dias) {
  const data = new Date(HOJE);
  data.setDate(data.getDate() + dias);
  return data.toISOString().slice(0, 10);
}

const PMAL = {
  id: 'c1',
  nome: 'PMAL',
  objetivos: [
    { id: 'oficial', nome: 'Oficial de Estado-Maior', tipo: 'concurso', prova_data: emDias(200) },
    { id: 'soldado', nome: 'Soldado do Quadro de Praças', tipo: 'concurso', prova_data: emDias(60) },
  ],
};
const FACULDADE = {
  id: 'c2',
  nome: 'Engenharia',
  objetivos: [{ id: 'periodo', nome: '2027.1', tipo: 'faculdade', prova_data: emDias(120) }],
};
const CURSOS = [PMAL, FACULDADE];

describe('curso ativo e objetivo principal', () => {
  it('saem do proprio alvo, sem um terceiro estado', () => {
    expect(cursoAtivo(CURSOS, 'objetivo:c1:oficial').id).toBe('c1');
    expect(objetivoPrincipal(CURSOS, 'objetivo:c1:oficial').id).toBe('oficial');
  });

  it('diz qual curso esta ativo', () => {
    expect(cursoEstaAtivo(PMAL, 'objetivo:c1:soldado')).toBe(true);
    expect(cursoEstaAtivo(FACULDADE, 'objetivo:c1:soldado')).toBe(false);
  });

  it('nao quebra sem alvo', () => {
    expect(cursoAtivo(CURSOS, '')).toBeNull();
    expect(objetivoPrincipal(CURSOS, '')).toBeNull();
    expect(cursoEstaAtivo(PMAL, '')).toBe(false);
  });

  it('nao quebra quando o alvo aponta para curso apagado', () => {
    expect(cursoAtivo(CURSOS, 'objetivo:sumiu:x')).toBeNull();
    expect(objetivoPrincipal(CURSOS, 'objetivo:sumiu:x')).toBeNull();
  });
});

describe('ao ativar um curso', () => {
  // Pedir que o aluno escolha o principal num segundo clique e burocracia: o de prazo mais
  // proximo e o que ele escolheria.
  it('ja escolhe o objetivo de prazo mais proximo', () => {
    expect(objetivoAoAtivar(PMAL, HOJE).id).toBe('soldado');
    expect(alvoAoAtivar(PMAL, HOJE)).toBe('objetivo:c1:soldado');
  });

  it('cai no primeiro quando nenhum tem prazo', () => {
    const livre = { id: 'c3', objetivos: [{ id: 'a', nome: 'Inglês', tipo: 'livre' }, { id: 'b', nome: 'Violão', tipo: 'livre' }] };
    expect(objetivoAoAtivar(livre, HOJE).id).toBe('a');
  });

  // Curso salvo sem a lista de objetivos ganha um derivado na leitura (ver migrarCurso), e e
  // esse que vira o principal — o aluno nao fica sem alvo por causa do formato antigo.
  it('usa o objetivo derivado de um curso sem lista propria', () => {
    const antigo = { id: 'c4', nome: 'Curso antigo', cargo: 'Analista' };
    expect(objetivoAoAtivar(antigo, HOJE)).toBeTruthy();
    expect(alvoAoAtivar(antigo, HOJE)).toMatch(/^objetivo:c4:/);
  });

  it('devolve vazio sem curso nenhum', () => {
    expect(objetivoAoAtivar(null, HOJE)).toBeNull();
  });
});

describe('prazoDoCursoAtivo', () => {
  // O ponto da mudanca: a data que aperta e a que aperta, mesmo que o principal seja outro.
  it('conta sempre o marco mais proximo do curso ativo', () => {
    const prazo = prazoDoCursoAtivo(CURSOS, 'objetivo:c1:oficial', HOJE);
    expect(prazo.objetivo.id).toBe('soldado');
    expect(prazo.dias).toBe(60);
  });

  it('avisa quando a data nao e a do objetivo principal', () => {
    expect(prazoDoCursoAtivo(CURSOS, 'objetivo:c1:oficial', HOJE).ehDoPrincipal).toBe(false);
    expect(prazoDoCursoAtivo(CURSOS, 'objetivo:c1:soldado', HOJE).ehDoPrincipal).toBe(true);
  });

  it('olha so o curso ativo, nao os outros', () => {
    const prazo = prazoDoCursoAtivo(CURSOS, 'objetivo:c2:periodo', HOJE);
    expect(prazo.curso.id).toBe('c2');
    expect(prazo.dias).toBe(120);
  });

  it('devolve nulo sem alvo ou sem prazo nenhum', () => {
    expect(prazoDoCursoAtivo(CURSOS, '', HOJE)).toBeNull();
    const livre = { id: 'c5', objetivos: [{ id: 'a', nome: 'Inglês', tipo: 'livre' }] };
    expect(prazoDoCursoAtivo([livre], 'objetivo:c5:a', HOJE)).toBeNull();
  });

  // Data vencida nao e ausencia de data: ou a prova passou, ou o edital foi retificado e
  // ninguem avisou. Esconder deixaria o painel mudo bem quando ha o que corrigir.
  it('mostra o prazo vencido menos antigo quando nenhum e futuro', () => {
    const passado = {
      id: 'c7',
      objetivos: [
        { id: 'velho', nome: 'Antigo', tipo: 'concurso', prova_data: emDias(-200) },
        { id: 'recente', nome: 'Recente', tipo: 'concurso', prova_data: emDias(-70) },
      ],
    };
    const prazo = prazoDoCursoAtivo([passado], 'objetivo:c7:velho', HOJE);
    expect(prazo.objetivo.id).toBe('recente');
    expect(prazo.dias).toBe(-70);
    expect(prazo.vencido).toBe(true);
  });

  it('nao marca vencido quando ha data futura', () => {
    expect(prazoDoCursoAtivo(CURSOS, 'objetivo:c1:oficial', HOJE).vencido).toBe(false);
  });
});

describe('objetivosOrdenados', () => {
  it('ordena pelo calendario, nao pelo principal', () => {
    const lista = objetivosOrdenados(PMAL, 'objetivo:c1:oficial', HOJE);
    expect(lista.map((item) => item.objetivo.id)).toEqual(['soldado', 'oficial']);
    expect(lista[1].ehPrincipal).toBe(true);
  });

  it('joga quem nao tem prazo para o fim', () => {
    const misto = {
      id: 'c6',
      objetivos: [
        { id: 'livre', nome: 'Inglês', tipo: 'livre' },
        { id: 'prova', nome: 'Concurso', tipo: 'concurso', prova_data: emDias(30) },
      ],
    };
    expect(objetivosOrdenados(misto, '', HOJE).map((i) => i.objetivo.id)).toEqual(['prova', 'livre']);
  });
});
