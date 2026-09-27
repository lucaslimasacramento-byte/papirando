// Qual curso está ativo, qual objetivo é o principal, e de quem é o prazo que conta.
//
// O alvo era um objetivo solto: cada cartão tinha "Definir alvo", e objetivos de cursos
// diferentes disputavam o mesmo lugar. Só que o curso é o caderno — é ele que carrega as
// disciplinas, o plano e as metas; os objetivos são o que se persegue dentro dele. Quem fica
// ativo é o CURSO; o principal só desempata a prioridade lá dentro.
//
// O prazo não se escolhe. Ele é sempre o do marco mais próximo entre os objetivos do curso
// ativo: não adianta marcar o Oficial como principal se a prova do Soldado é antes — a data
// que aperta é a que aperta.

import { objetivosDoCurso, partesDoIdDeObjetivo, idDoObjetivo } from './objetivos';
import { marcoDoObjetivo, marcoMaisProximo } from './tiposDeObjetivo';

// O curso ativo e o objetivo principal saem do próprio alvo — não são um terceiro estado a
// manter em sincronia.
export function cursoAtivo(cursos, alvoId) {
  const partes = partesDoIdDeObjetivo(alvoId);
  if (!partes) return null;
  return (cursos || []).find((curso) => String(curso?.id) === String(partes.cursoId)) || null;
}

export function objetivoPrincipal(cursos, alvoId) {
  const partes = partesDoIdDeObjetivo(alvoId);
  const curso = cursoAtivo(cursos, alvoId);
  if (!curso || !partes) return null;
  return objetivosDoCurso(curso).find((objetivo) => objetivo.id === partes.objetivoId) || null;
}

export function cursoEstaAtivo(curso, alvoId) {
  const partes = partesDoIdDeObjetivo(alvoId);
  return Boolean(partes && curso && String(curso.id) === String(partes.cursoId));
}

// Ao ativar um curso, o principal já vem escolhido: o de prazo mais próximo. É a escolha que
// o aluno faria, e pedir que ele a repita num segundo clique é burocracia.
export function objetivoAoAtivar(curso, hoje = new Date()) {
  const objetivos = objetivosDoCurso(curso);
  if (objetivos.length === 0) return null;
  return marcoMaisProximo(objetivos, hoje)?.objetivo || objetivos[0];
}

export function alvoAoAtivar(curso, hoje = new Date()) {
  const objetivo = objetivoAoAtivar(curso, hoje);
  return objetivo ? idDoObjetivo(curso.id, objetivo.id) : '';
}

// O prazo que a plataforma conta: o marco mais próximo do curso ativo, dizendo de quem é.
//
// `ehDoPrincipal` existe para a tela poder nomear a data quando ela NÃO é do objetivo
// principal — "112 dias para a prova do Soldado" com o Oficial marcado como principal não é
// contradição, é a informação que salva o aluno de estudar para a prova errada primeiro.
export function prazoDoCursoAtivo(cursos, alvoId, hoje = new Date()) {
  const curso = cursoAtivo(cursos, alvoId);
  if (!curso) return null;

  const objetivos = objetivosDoCurso(curso);
  const marco = marcoMaisProximo(objetivos, hoje) || marcoVencidoMaisRecente(objetivos, hoje);
  if (!marco) return null;

  const principal = objetivoPrincipal(cursos, alvoId);
  return {
    ...marco,
    curso,
    ehDoPrincipal: Boolean(principal && marco.objetivo?.id === principal.id),
    // Data que já passou não é ausência de data: ou a prova aconteceu, ou o edital foi
    // retificado e ninguém avisou a plataforma. Esconder isso deixaria o aluno com um
    // painel mudo justo quando ele precisa corrigir alguma coisa.
    vencido: marco.dias < 0,
  };
}

// O prazo vencido menos antigo — usado só quando nenhum objetivo tem data futura.
function marcoVencidoMaisRecente(objetivos, hoje) {
  return (objetivos || [])
    .map((objetivo) => {
      const marco = marcoDoObjetivo(objetivo, hoje);
      return marco ? { ...marco, objetivo } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.dias - a.dias)[0] || null;
}

// Ordena os objetivos de um curso do prazo mais próximo para o mais distante; o principal
// ganha a marca, mas não fura a fila — a ordem é do calendário.
export function objetivosOrdenados(curso, alvoId, hoje = new Date()) {
  const principal = partesDoIdDeObjetivo(alvoId)?.objetivoId;

  return objetivosDoCurso(curso)
    .map((objetivo) => ({
      objetivo,
      marco: marcoDoObjetivo(objetivo, hoje),
      ehPrincipal: objetivo.id === principal,
    }))
    .sort((a, b) => {
      // Sem prazo vai para o fim: estudo livre não disputa urgência com prova marcada.
      const diasA = a.marco?.dias ?? Number.POSITIVE_INFINITY;
      const diasB = b.marco?.dias ?? Number.POSITIVE_INFINITY;
      return diasA - diasB;
    });
}
