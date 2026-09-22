// Progresso geral do edital do aluno.
//
// Isto era `const progGeralEdital = 42;` — um numero fixo, de maquete, que aparecia no
// Dashboard como "42% geral" logo abaixo de uma lista onde toda disciplina marcava 0%. Quem
// acabou de subir o edital via o app afirmar que ele ja andou quase metade do caminho.
//
// O progresso e por TOPICO, nao a media dos percentuais das disciplinas: uma disciplina de
// 40 topicos pesa mais que uma de 4, e a media simples diria o contrario.
export function progressoDoEdital(disciplinas = []) {
  const lista = Array.isArray(disciplinas) ? disciplinas : [];

  let topicosTotal = 0;
  let topicosFeitos = 0;

  lista.forEach((disciplina) => {
    const topicos = Array.isArray(disciplina?.topicos) ? disciplina.topicos : [];
    topicosTotal += topicos.length;
    topicosFeitos += topicos.filter((topico) => topico?.concluido).length;
  });

  if (topicosTotal > 0) {
    return Math.round((topicosFeitos / topicosTotal) * 100);
  }

  // Disciplina sem topicos (veio do catalogo antigo, ou o edital so listou os nomes) ainda
  // pode ter percentual proprio. Sem nada disso, e zero — nunca um numero inventado.
  const comPercentual = lista
    .map((disciplina) => Number(disciplina?.percentual ?? disciplina?.progresso))
    .filter((valor) => Number.isFinite(valor));

  if (comPercentual.length === 0) return 0;

  const soma = comPercentual.reduce((acc, valor) => acc + valor, 0);
  return Math.round(soma / comPercentual.length);
}
