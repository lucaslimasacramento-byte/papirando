/**
 * Espelho de src/lib/cpfAlgorithm.js para Deno.
 * Ao alterar o algoritmo, mantenha os dois em sincronia ou extraia gerador de código.
 */

export function normalizeCpf(value: string): string {
  return String(value || '')
    .replace(/\D/g, '')
    .slice(0, 11);
}

export function isValidCpf(value: string): boolean {
  const digits = normalizeCpf(value);
  if (digits.length !== 11) return false;
  if (/^(\d)\1+$/.test(digits)) return false;

  const calculateDigit = (sliceLength: number) => {
    let total = 0;
    for (let index = 0; index < sliceLength; index += 1) {
      total += Number(digits[index]) * (sliceLength + 1 - index);
    }
    const rest = (total * 10) % 11;
    return rest === 10 ? 0 : rest;
  };

  const firstDigit = calculateDigit(9);
  const secondDigit = calculateDigit(10);
  return firstDigit === Number(digits[9]) && secondDigit === Number(digits[10]);
}
