// Um curso, vários cargos.
//
// O aluno que presta dois cargos do mesmo edital não estuda duas vezes. Quando os
// conteúdos se cruzam — e no caso que motivou isto eles batiam 100% —, dois cursos
// separados são a mesma lista estudada em duplicata, com progresso que não conversa: marcar
// "Língua Portuguesa" concluída num curso deixava o outro em zero na mesma matéria.
//
// Então o curso passa a carregar os cargos dentro dele, e cada disciplina sabe a quais
// cargos serve. Uma matéria comum estudada UMA vez conta para os dois; uma matéria exclusiva
// conta só para o seu. É isto que estas funções calculam.

import { chaveDeDisciplina } from './edital';

// Mapa disciplina -> cargos, guardado no próprio curso. A chave é normalizada (sem acento,
// sem caixa) porque o nome exibido pode ser editado pelo aluno depois.
export function montarMapaDeCargos(disciplinasRevisadas) {
  const mapa = {};
  (disciplinasRevisadas || []).forEach((item) => {
    const chave = chaveDeDisciplina(item?.nome);
    if (!chave) return;
    const cargos = (item?.cargos || []).filter(Boolean);
    mapa[chave] = [...new Set([...(mapa[chave] || []), ...cargos])];
  });
  return mapa;
}

export function cargosDaDisciplina(curso, nomeDaDisciplina) {
  const mapa = curso?.disciplinasPorCargo || {};
  const chave = chaveDeDisciplina(nomeDaDisciplina);
  const encontrados = mapa[chave];
  if (Array.isArray(encontrados) && encontrados.length) return encontrados;
  // Curso de cargo único (ou anterior a esta mudança): tudo serve ao cargo que existe.
  return (curso?.cargos || []).map((cargo) => cargo.id).filter(Boolean);
}

// Progresso de cada cargo do curso.
//
// A mesma disciplina entra na conta de todos os cargos que ela serve — sem duplicar
// esforço: ela é estudada uma vez, e o avanço aparece nos dois. Era exatamente o que dois
// cursos separados não conseguiam fazer.
export function progressoPorCargo(curso, disciplinasDoCurso) {
  const cargos = Array.isArray(curso?.cargos) ? curso.cargos : [];
  if (!cargos.length) return [];

  const disciplinas = Array.isArray(disciplinasDoCurso) ? disciplinasDoCurso : [];

  return cargos.map((cargo) => {
    const minhas = disciplinas.filter((disciplina) =>
      cargosDaDisciplina(curso, disciplina?.nome).includes(cargo.id)
    );

    const topicos = minhas.reduce((acc, disciplina) => acc + (disciplina?.topicos?.length || 0), 0);
    const concluidos = minhas.reduce(
      (acc, disciplina) => acc + (disciplina?.topicos || []).filter((topico) => topico?.concluido).length,
      0
    );

    return {
      id: cargo.id,
      nome: cargo.nome,
      disciplinas: minhas.length,
      topicos,
      concluidos,
      percentual: topicos > 0 ? Math.round((concluidos / topicos) * 100) : 0,
      questoes: (cargo.prova || []).reduce((acc, linha) => acc + (Number(linha?.questoes) || 0), 0),
      examDate: cargo.examDate || '',
    };
  });
}

// Quantas disciplinas servem a mais de um cargo. É o número que justifica o curso único:
// "12 das 17 matérias valem para os dois".
export function disciplinasCompartilhadas(curso, disciplinasDoCurso) {
  if ((curso?.cargos || []).length < 2) return 0;
  return (disciplinasDoCurso || []).filter(
    (disciplina) => cargosDaDisciplina(curso, disciplina?.nome).length > 1
  ).length;
}
