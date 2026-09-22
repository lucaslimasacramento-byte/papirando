// Nome curto sugerido para o objetivo.
//
// Nome oficial de concurso e uma frase inteira ("Concurso Publico para Admissao ao Curso de
// Formacao de Oficiais (CFO) e ao Curso de Formacao de Pracas (CFP) da PMAL") e, cortado no
// meio pelo cartao, nao identifica nada. A sugestao junta a sigla do orgao com o cargo, que
// e como o aluno chama o proprio alvo.
export function apelidoSugerido(curso) {
  const nome = String(curso?.nome || curso?.concurso || '').trim();
  // Nome que ja cabe no cartao nao precisa de apelido: "ENEM 2026" vira "ENEM" se a regra
  // da sigla rodar antes, e a abreviacao passa a informar menos que o original.
  if (nome.length <= 40) return nome;
  // Siglas em caixa alta com 2+ letras (PMAL, CFO, TJ, INSS), tirando as genericas.
  const genericas = new Set(['CFO', 'CFP', 'CFS', 'CHO']);
  const sigla = (nome.match(/\b[A-Z]{2,}(?:\/[A-Z]{2,})?\b/g) || []).find((s) => !genericas.has(s));
  const cargo = String(curso?.cargo || (curso?.cargos || [])[0]?.nome || '').trim();

  if (sigla && cargo) return `${sigla} — ${cargo}`;
  if (sigla) return sigla;
  if (cargo) return cargo;
  return nome.length > 40 ? `${nome.slice(0, 38).trim()}…` : nome;
}

// O que mostrar no cartao: o apelido que o aluno deu, o sugerido, ou o nome.
export function nomeCurtoDoCurso(curso) {
  return String(curso?.apelido || '').trim() || apelidoSugerido(curso) || String(curso?.nome || '');
}
