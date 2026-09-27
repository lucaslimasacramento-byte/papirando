// Iniciais para o quadradinho do cartão, quando não há imagem.
//
// Um ícone genérico repetido em todos os cartões não ajuda a distinguir nada; duas letras do
// próprio nome, sim. "TJ-SP — Analista Judiciário" vira TJ, "Soldado do Quadro de Praças"
// vira SQ.
const IGNORADAS = new Set([
  'de', 'da', 'do', 'das', 'dos', 'e', 'em', 'a', 'o', 'as', 'os', 'ao', 'aos',
  'para', 'com', 'ao', 'na', 'no', 'nas', 'nos',
]);

export function iniciaisDe(nome, quantidade = 2) {
  const limpo = String(nome || '').trim();
  if (!limpo) return '—';

  // Sigla que o próprio nome já traz ("TJ-SP", "INSS") diz mais que as iniciais soltas.
  const sigla = limpo.match(/\b[A-ZÀ-Ú]{2,}\b/);
  if (sigla && sigla[0].length <= 4) return sigla[0].slice(0, 4);

  const palavras = limpo
    .split(/[\s—–-]+/)
    .map((palavra) => palavra.replace(/[^\p{L}\p{N}]/gu, ''))
    .filter((palavra) => palavra && !IGNORADAS.has(palavra.toLowerCase()));

  if (palavras.length === 0) return limpo.slice(0, quantidade).toUpperCase();

  return palavras
    .slice(0, quantidade)
    .map((palavra) => palavra[0])
    .join('')
    .toUpperCase();
}
