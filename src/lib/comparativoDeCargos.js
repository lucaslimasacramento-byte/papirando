// Ficha e quadro de provas dos cargos, lado a lado.
//
// A revisão mostrava um bloco por cargo, empilhado: "Soldado" com oito cartõezinhos, depois
// "Oficial" com outros oito. Para comparar salário, vagas ou data da prova o aluno tinha que
// rolar de um bloco ao outro e guardar de cabeça — e é exatamente nessa comparação que ele
// decide o que vai prestar. Uma linha por campo, uma coluna por cargo, resolve.

import { mesmaDisciplina } from './edital';

const NAO_ENCONTRADO = /^n[ãa]o\s*encontrado$/i;

// A IA devolve "Não encontrado" quando o campo não está no edital; renderizar isso como dado
// faria a tela afirmar o que ela não sabe.
export function valorOuTraco(valor) {
  const texto = String(valor ?? '').trim();
  return !texto || NAO_ENCONTRADO.test(texto) ? '—' : texto;
}

// Chave de comparacao do quadro de provas.
//
// Aqui as linhas nao sao disciplinas de verdade: o edital agrupa a prova em blocos
// ("Conhecimentos Basicos", "Conhecimentos Especificos"). mesmaDisciplina descarta essas
// palavras como ruido — e com razao, para nao fundir materias diferentes —, so que entao
// "Conhecimentos Basicos" nao casa nem consigo mesmo e o bloco aparecia duas vezes, uma por
// cargo, em vez de lado a lado. No quadro de provas, rotulo igual e a mesma linha.
function chaveDoBloco(nome) {
  return String(nome || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function nomeDoCargo(cargo, indice = 0) {
  return String(cargo?.roleName || cargo?.title || `Cargo ${indice + 1}`).trim();
}

// Os campos da ficha, na ordem em que interessam a quem está escolhendo.
const CAMPOS = [
  { label: 'Vagas', ler: (cargo) => cargo?.vagas },
  { label: 'Remuneração', ler: (cargo) => cargo?.salario },
  { label: 'Escolaridade', ler: (cargo) => cargo?.escolaridade },
  { label: 'Data da prova', ler: (cargo) => cargo?.examDate },
  { label: 'Lotação', ler: (cargo) => cargo?.lotacao },
  { label: 'Carga horária', ler: (cargo) => cargo?.cargaHoraria },
];

export function fichaComparativa(cargos, analysis = null) {
  const lista = Array.isArray(cargos) ? cargos : [];
  const colunas = lista.map((cargo, indice) => nomeDoCargo(cargo, indice));

  const linhas = CAMPOS.map((campo) => {
    const valores = lista.map((cargo) => valorOuTraco(campo.ler(cargo)));
    return {
      label: campo.label,
      valores,
      // Vale marcar o que muda de um cargo para o outro: é o que o aluno está procurando.
      diferente: colunas.length > 1 && new Set(valores).size > 1,
    };
  })
    // Campo que nenhum cargo tem vira uma fileira de traços: ocupa espaço sem informar.
    .filter((linha) => linha.valores.some((valor) => valor !== '—'));

  // A taxa é do certame, não do cargo: aparece uma vez, no fim, com o mesmo valor em todas
  // as colunas.
  const taxa = valorOuTraco(analysis?.inscricaoValor);
  if (taxa !== '—') {
    linhas.push({
      label: 'Taxa de inscrição',
      valores: colunas.map(() => taxa),
      diferente: false,
    });
  }

  return { colunas, linhas };
}

// Quadro de provas de todos os cargos numa tabela só: uma linha por disciplina, uma coluna
// por cargo. Dois cargos do mesmo edital raramente pesam as disciplinas igual, e é esse
// contraste que diz onde estão os pontos de cada prova.
export function provasComparativas(cargos) {
  const lista = Array.isArray(cargos) ? cargos : [];
  const colunas = lista.map((cargo, indice) => nomeDoCargo(cargo, indice));

  const linhas = [];
  lista.forEach((cargo, indice) => {
    (cargo?.prova || []).forEach((item) => {
      const disciplina = String(item?.disciplina || '').trim();
      if (!disciplina) return;

      const questoes = Number(item?.questoes) || 0;
      const peso = String(item?.peso ?? '').trim();

      const chave = chaveDoBloco(disciplina);
      const existente = linhas.find(
        (linha) => chaveDoBloco(linha.disciplina) === chave || mesmaDisciplina(linha.disciplina, disciplina)
      );
      if (existente) {
        existente.celulas[indice] = { questoes, peso };
        if (disciplina.length > existente.disciplina.length) existente.disciplina = disciplina;
        return;
      }

      const celulas = lista.map(() => null);
      celulas[indice] = { questoes, peso };
      linhas.push({ disciplina, celulas });
    });
  });

  linhas.forEach((linha) => {
    const presentes = linha.celulas.filter(Boolean);
    linha.emTodos = presentes.length === colunas.length;
    linha.diferente =
      colunas.length > 1 && new Set(presentes.map((celula) => celula.questoes)).size > 1;
  });

  linhas.sort((a, b) => {
    const somaA = a.celulas.reduce((acc, celula) => acc + (celula?.questoes || 0), 0);
    const somaB = b.celulas.reduce((acc, celula) => acc + (celula?.questoes || 0), 0);
    return somaB - somaA || a.disciplina.localeCompare(b.disciplina, 'pt-BR');
  });

  const totais = colunas.map((_, indice) =>
    linhas.reduce((acc, linha) => acc + (linha.celulas[indice]?.questoes || 0), 0)
  );

  return { colunas, linhas, totais, temDados: linhas.length > 0 };
}
