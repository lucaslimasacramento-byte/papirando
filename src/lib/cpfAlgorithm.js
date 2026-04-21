/**
 * Validação local de CPF (apenas algoritmo dos dígitos verificadores).
 * Mantido puro para reutilização em front, testes e espelho no Edge Function.
 */

export function normalizeCpf(value) {
  return String(value || '')
    .replace(/\D/g, '')
    .slice(0, 11);
}

export function formatCpf(value) {
  const digits = normalizeCpf(value);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export function isValidCpf(value) {
  const digits = normalizeCpf(value);
  if (digits.length !== 11) return false;
  if (/^(\d)\1+$/.test(digits)) return false;

  const calculateDigit = (sliceLength) => {
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
