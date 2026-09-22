import { describe, it, expect } from 'vitest';
import { buildSmartStudyPlan } from './studyRecommendation';

// Um curso pode juntar um concurso com a faculdade, e os dois tem prazos diferentes. Sem
// olhar os objetivos, a rotina dava o mesmo peso para a materia da prova de sabado e para a
// do semestre que termina em tres meses.
const disciplinas = [
  { nome: 'Direito Penal', percentual: 0, topicos: [{ nome: 'a', concluido: false }] },
  { nome: 'Cálculo II', percentual: 0, topicos: [{ nome: 'b', concluido: false }] },
];

const objetivos = [
  { id: 'concurso', nome: 'Delegado', tipo: 'concurso', prova_data: proximo(10) },
  { id: 'faculdade', nome: 'Engenharia', tipo: 'faculdade', prova_data: proximo(120) },
];

function proximo(dias) {
  const data = new Date();
  data.setDate(data.getDate() + dias);
  return data.toISOString().slice(0, 10);
}

const mapa = {
  'Direito Penal': ['concurso'],
  'Cálculo II': ['faculdade'],
};

describe('buildSmartStudyPlan com objetivos de tipos diferentes', () => {
  it('poe na frente a materia do prazo mais proximo', () => {
    const plano = buildSmartStudyPlan({
      disciplines: disciplinas,
      objetivos,
      objetivosDaDisciplina: (nome) => mapa[nome] || [],
    });
    expect(plano.primary.nome).toBe('Direito Penal');
  });

  it('diz por que ela veio antes', () => {
    const plano = buildSmartStudyPlan({
      disciplines: disciplinas,
      objetivos,
      objetivosDaDisciplina: (nome) => mapa[nome] || [],
    });
    expect(plano.primary.reason).toContain('Delegado');
    expect(plano.primary.objetivoUrgente).toBe('Delegado');
  });

  // Sem os objetivos o motor segue como antes — nenhuma tela quebra por nao passar o novo
  // parametro.
  it('funciona sem objetivos, como antes', () => {
    const plano = buildSmartStudyPlan({ disciplines: disciplinas });
    expect(plano.primary).toBeTruthy();
    expect(plano.primary.objetivoUrgente).toBe('');
  });

  // Com um objetivo so nao ha o que priorizar entre objetivos: o bonus nao entra.
  it('nao marca urgencia quando ha um objetivo so', () => {
    const plano = buildSmartStudyPlan({
      disciplines: disciplinas,
      objetivos: [objetivos[0]],
      objetivosDaDisciplina: (nome) => mapa[nome] || [],
    });
    expect(plano.primary.objetivoUrgente).toBe('');
  });
});
