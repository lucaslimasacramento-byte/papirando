// Cada OBJETIVO do aluno também é um concurso acompanhado.
//
// A lista de concursos acompanhados, o objetivo-alvo e a contagem de dias para a prova eram
// alimentados só pelo catálogo publicado. Fazia sentido quando todo objetivo vinha de um
// concurso que nós cadastrávamos; depois que a plataforma passou a se montar pelo PDF do
// aluno, virou um beco — ele importa o edital e o botão "Marcar alvo" procura um concurso
// que nunca existiu.
//
// O alvo aponta para o OBJETIVO, não para o curso: é o objetivo que tem data de prova,
// banca e cargo. Um curso com dois objetivos oferece dois alvos possíveis.

import { idDoObjetivo, objetivosDoCurso, PREFIXO_CURSO_LEGADO } from './objetivos';

export { PREFIXO_CURSO_LEGADO };

export function concursoDoObjetivo(curso, objetivo) {
  if (!curso?.id || !objetivo?.id) return null;

  const nome = String(objetivo.nome || curso.nome || '').trim();
  if (!nome) return null;

  return {
    id: idDoObjetivo(curso.id, objetivo.id),
    origemCursoId: curso.id,
    origemObjetivoId: objetivo.id,
    // O nome do certame vive no curso; o do alvo, no objetivo. Os dois aparecem na tela.
    nome: curso.nome || nome,
    apelido: curso.apelido || '',
    objetivoNome: nome,
    plano: curso.plano || curso.nome || nome,
    concurso: curso.concurso || curso.nome || nome,
    banca: objetivo.banca || curso.banca || 'A definir',
    cargo: objetivo.cargo || nome,
    area: curso.area || 'Geral',
    vagas: objetivo.vagas || '',
    salario: objetivo.salario || '',
    escolaridade: objetivo.escolaridade || '',
    prova_data: objetivo.prova_data || curso.prova_data || '',
    status_concurso: objetivo.status_concurso || curso.status_concurso || 'edital_publicado',
    imagem_url: curso.imagem_url || '',
    edital_url: curso.edital_url || '',
    prova: Array.isArray(objetivo.prova) ? objetivo.prova : [],
    origem: curso.origem || 'ia',
  };
}

// Todos os objetivos dos cursos que ainda não têm equivalente no catálogo.
//
// O casamento repete a regra que o app já usa para marcar um concurso como "importado" —
// por plano, nome ou concurso. Curso vindo do catálogo já está representado lá, e duplicá-lo
// criaria dois alvos para o mesmo objetivo.
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
    .flatMap((curso) => objetivosDoCurso(curso).map((objetivo) => concursoDoObjetivo(curso, objetivo)))
    .filter(Boolean);
}

// Traduz um alvo salvo antes desta mudança.
//
// O alvo antigo apontava para o curso inteiro ("curso:<id>"). Sem esta ponte, todo aluno com
// alvo definido perderia o alvo no deploy — e o Início voltaria a "Nenhum alvo definido"
// sem ninguém ter mexido em nada.
export function migrarAlvoDeCurso(alvoSalvo, cursos) {
  const id = String(alvoSalvo || '');
  if (!id.startsWith(PREFIXO_CURSO_LEGADO)) return alvoSalvo;

  const cursoId = id.slice(PREFIXO_CURSO_LEGADO.length);
  const curso = (cursos || []).find((item) => String(item?.id) === cursoId);
  if (!curso) return alvoSalvo;

  const primeiro = objetivosDoCurso(curso)[0];
  return primeiro ? idDoObjetivo(curso.id, primeiro.id) : alvoSalvo;
}
