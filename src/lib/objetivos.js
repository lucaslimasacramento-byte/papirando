// O curso agrupa OBJETIVOS.
//
// Até aqui o curso continha cargos: um curso era um concurso, e os cargos eram variações
// dele. Isso não comporta o que o aluno de fato faz — juntar dois editais, ou um concurso
// com a faculdade — e deixa a data de prova, a banca e o cargo presos ao curso inteiro,
// quando são de cada alvo.
//
//   CURSO (plano de estudo)      nome que o aluno dá
//     ├── OBJETIVO  Oficial de Estado-Maior · PMAL · prova 19/07
//     └── OBJETIVO  Soldado do Quadro de Praças · PMAL · prova 19/07
//
// O objetivo é quem tem data, banca e cargo — e é ele que vira o alvo. O curso é o plano
// que os agrupa, e onde vivem a rotina e a meta.
//
// A disciplina continua sabendo a quais objetivos serve: matéria comum é estudada uma vez e
// conta para todos; exclusiva conta só para o seu.

import { chaveDeDisciplina } from './edital';

export const PREFIXO_OBJETIVO = 'objetivo:';
// Alvo gravado antes desta mudança apontava para o curso inteiro. Continua resolvendo — na
// migração o curso vira um curso com objetivos, e o alvo antigo cai no primeiro deles.
export const PREFIXO_CURSO_LEGADO = 'curso:';

export function idDoObjetivo(cursoId, objetivoId) {
  return `${PREFIXO_OBJETIVO}${cursoId}:${objetivoId}`;
}

export function partesDoIdDeObjetivo(id) {
  const bruto = String(id || '');
  if (!bruto.startsWith(PREFIXO_OBJETIVO)) return null;
  const resto = bruto.slice(PREFIXO_OBJETIVO.length);
  const corte = resto.indexOf(':');
  if (corte < 0) return null;
  return { cursoId: resto.slice(0, corte), objetivoId: resto.slice(corte + 1) };
}

export function ehIdDeCursoLegado(id) {
  return String(id || '').startsWith(PREFIXO_CURSO_LEGADO);
}

// Um objetivo a partir dos campos que ficavam no topo do curso.
function objetivoDoTopo(curso) {
  return {
    id: 'principal',
    nome: String(curso?.cargo || curso?.concurso || curso?.nome || 'Objetivo').trim(),
    tipo: curso?.intent || curso?.tipo || 'concurso',
    banca: curso?.banca || '',
    cargo: curso?.cargo || '',
    vagas: curso?.vagas || '',
    salario: curso?.salario || '',
    escolaridade: curso?.escolaridade || '',
    lotacao: curso?.lotacao || '',
    carga_horaria: curso?.carga_horaria || '',
    inscricao_valor: curso?.inscricao_valor || '',
    etapas_tags: Array.isArray(curso?.etapas_tags) ? curso.etapas_tags : [],
    prova: Array.isArray(curso?.prova) ? curso.prova : [],
    prova_data: curso?.prova_data || '',
    status_concurso: curso?.status_concurso || '',
  };
}

function objetivoDoCargo(cargo, curso) {
  return {
    id: String(cargo?.id || 'principal'),
    nome: String(cargo?.nome || curso?.nome || 'Objetivo').trim(),
    tipo: curso?.intent || curso?.tipo || 'concurso',
    // Banca e inscrição são do certame, não do cargo: os cargos do mesmo edital dividem.
    banca: curso?.banca || '',
    inscricao_valor: curso?.inscricao_valor || '',
    etapas_tags: Array.isArray(curso?.etapas_tags) ? curso.etapas_tags : [],
    cargo: String(cargo?.nome || '').trim(),
    vagas: cargo?.vagas || '',
    salario: cargo?.salario || '',
    escolaridade: cargo?.escolaridade || '',
    lotacao: cargo?.lotacao || '',
    carga_horaria: cargo?.carga_horaria || '',
    prova: Array.isArray(cargo?.prova) ? cargo.prova : [],
    // O cargo guardava a data como examDate (texto do edital) — o curso guarda prova_data
    // (ISO). Na duvida vale a do curso, que ja passou pelo parse.
    prova_data: cargo?.prova_data || curso?.prova_data || '',
    status_concurso: curso?.status_concurso || '',
  };
}

// Converte um curso de qualquer geração para o formato com objetivos.
//
// Roda na carga, então curso antigo (sem `cargos`, ou com `cargos` e `disciplinasPorCargo`)
// continua funcionando sem migração de banco: o formato novo é derivado do que existe.
export function migrarCurso(curso) {
  if (!curso) return curso;
  if (Array.isArray(curso.objetivos) && curso.objetivos.length) return curso;

  const cargos = Array.isArray(curso.cargos) ? curso.cargos : [];
  const objetivos = cargos.length
    ? cargos.map((cargo) => objetivoDoCargo(cargo, curso))
    : [objetivoDoTopo(curso)];

  const porCargo = curso.disciplinasPorCargo || {};
  const disciplinasPorObjetivo = Object.keys(porCargo).length
    ? porCargo
    : // Sem mapa, toda disciplina do curso serve a todos os objetivos dele — senao o
      // progresso de quem ja usava o app zeraria da noite para o dia.
      {};

  return { ...curso, objetivos, disciplinasPorObjetivo };
}

export function objetivosDoCurso(curso) {
  const migrado = migrarCurso(curso);
  return Array.isArray(migrado?.objetivos) ? migrado.objetivos : [];
}

export function objetivosDaDisciplina(curso, nomeDaDisciplina) {
  const migrado = migrarCurso(curso);
  const mapa = migrado?.disciplinasPorObjetivo || {};
  const encontrados = mapa[chaveDeDisciplina(nomeDaDisciplina)];
  if (Array.isArray(encontrados) && encontrados.length) return encontrados;
  return objetivosDoCurso(migrado).map((objetivo) => objetivo.id);
}

// Mapa disciplina -> objetivos, montado na revisão do edital.
export function montarMapaDeObjetivos(disciplinasRevisadas) {
  const mapa = {};
  (disciplinasRevisadas || []).forEach((item) => {
    const chave = chaveDeDisciplina(item?.nome);
    if (!chave) return;
    const objetivos = (item?.objetivos || item?.cargos || []).filter(Boolean);
    mapa[chave] = [...new Set([...(mapa[chave] || []), ...objetivos])];
  });
  return mapa;
}

// Progresso de cada objetivo do curso.
//
// A mesma disciplina entra na conta de todos os objetivos que ela serve, sem duplicar
// esforço: é estudada uma vez, e o avanço aparece em todos.
export function progressoPorObjetivo(curso, disciplinasDoCurso) {
  const objetivos = objetivosDoCurso(curso);
  if (!objetivos.length) return [];

  const disciplinas = Array.isArray(disciplinasDoCurso) ? disciplinasDoCurso : [];

  return objetivos.map((objetivo) => {
    const minhas = disciplinas.filter((disciplina) =>
      objetivosDaDisciplina(curso, disciplina?.nome).includes(objetivo.id)
    );

    const topicos = minhas.reduce((acc, disciplina) => acc + (disciplina?.topicos?.length || 0), 0);
    const concluidos = minhas.reduce(
      (acc, disciplina) => acc + (disciplina?.topicos || []).filter((topico) => topico?.concluido).length,
      0
    );

    return {
      ...objetivo,
      disciplinas: minhas.length,
      topicos,
      concluidos,
      percentual: topicos > 0 ? Math.round((concluidos / topicos) * 100) : 0,
      questoes: (objetivo.prova || []).reduce((acc, linha) => acc + (Number(linha?.questoes) || 0), 0),
    };
  });
}

// Quantas disciplinas servem a mais de um objetivo. É o número que justifica o curso único:
// "12 das 17 matérias valem para os dois".
export function disciplinasCompartilhadas(curso, disciplinasDoCurso) {
  if (objetivosDoCurso(curso).length < 2) return 0;
  return (disciplinasDoCurso || []).filter(
    (disciplina) => objetivosDaDisciplina(curso, disciplina?.nome).length > 1
  ).length;
}
