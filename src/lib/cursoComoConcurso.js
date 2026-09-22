// O curso criado a partir do edital também é um concurso acompanhado.
//
// O objetivo-alvo, o painel "Concursos acompanhados" e a contagem de dias para a prova eram
// alimentados só pelo catálogo publicado (contestLibrary). Fazia sentido no modelo antigo,
// em que todo objetivo vinha de um concurso que nós cadastrávamos.
//
// Depois que a plataforma passou a se montar a partir do PDF que o aluno sobe, isso virou um
// beco: ele importa o edital, ganha o curso, e o botão "Marcar alvo" procura um concurso que
// nunca existiu — não acontece nada, sem erro nenhum. Sem alvo, o Início não tem contagem de
// dias, nem prioridade, nem foco.
//
// Aqui o próprio curso vira a entrada de concurso que faltava.

// Prefixo para o id não colidir com slug de catálogo: o alvo é gravado por id em
// user_contests, e um dia os dois convivem na mesma lista.
export const PREFIXO_CURSO = 'curso:';

export function ehConcursoDeCurso(id) {
  return String(id || '').startsWith(PREFIXO_CURSO);
}

export function concursoDoCurso(curso) {
  if (!curso?.id) return null;

  const nome = String(curso.nome || curso.concurso || curso.plano || '').trim();
  if (!nome) return null;

  // O cargo do curso multi-cargo é o primeiro; o resto vive em curso.cargos.
  const primeiroCargo = Array.isArray(curso.cargos) && curso.cargos.length ? curso.cargos[0] : null;

  return {
    id: `${PREFIXO_CURSO}${curso.id}`,
    origemCursoId: curso.id,
    nome,
    plano: curso.plano || nome,
    concurso: curso.concurso || nome,
    banca: curso.banca || 'A definir',
    cargo: curso.cargo || primeiroCargo?.nome || '',
    area: curso.area || 'Geral',
    vagas: curso.vagas || primeiroCargo?.vagas || '',
    salario: curso.salario || primeiroCargo?.salario || '',
    escolaridade: curso.escolaridade || primeiroCargo?.escolaridade || '',
    prova_data: curso.prova_data || '',
    status_concurso: curso.status_concurso || 'edital_publicado',
    imagem_url: curso.imagem_url || '',
    edital_url: curso.edital_url || '',
    prova: Array.isArray(curso.prova) ? curso.prova : [],
    cargos: Array.isArray(curso.cargos) ? curso.cargos : [],
    origem: curso.origem || 'ia',
  };
}

// Cursos que ainda não têm concurso equivalente no catálogo.
//
// O casamento repete a regra que o app já usa para marcar um concurso como "importado" —
// por plano, nome ou concurso. Se o curso veio do catálogo, ele já está representado lá e
// duplicá-lo criaria dois alvos para o mesmo objetivo.
export function concursosDosCursos(cursos, catalogo) {
  const doCatalogo = Array.isArray(catalogo) ? catalogo : [];

  return (Array.isArray(cursos) ? cursos : [])
    .filter((curso) => {
      const jaNoCatalogo = doCatalogo.some(
        (contest) =>
          (contest.plano && contest.plano === curso.plano) ||
          (contest.nome && contest.nome === curso.nome) ||
          (contest.concurso && contest.concurso === curso.concurso)
      );
      return !jaNoCatalogo;
    })
    .map(concursoDoCurso)
    .filter(Boolean);
}
