import { describe, expect, it } from 'vitest';
import { formatCpf, isValidCpf, normalizeCpf } from './cpfAlgorithm';

describe('cpfAlgorithm', () => {
  it('aceita CPF válido (somente dígitos)', () => {
    expect(isValidCpf('39053344705')).toBe(true);
  });

  it('rejeita CPF inválido por dígito verificador', () => {
    expect(isValidCpf('39053344700')).toBe(false);
  });

  it('aceita CPF válido com máscara', () => {
    expect(isValidCpf('390.533.447-05')).toBe(true);
  });

  it('remove não numéricos e normaliza tamanho', () => {
    expect(normalizeCpf('390.533.447-05')).toBe('39053344705');
    expect(normalizeCpf('390.533.447-05 extra')).toBe('39053344705');
  });

  it('rejeita sequência repetida', () => {
    expect(isValidCpf('11111111111')).toBe(false);
    expect(isValidCpf('00000000000')).toBe(false);
  });

  it('rejeita vazio', () => {
    expect(isValidCpf('')).toBe(false);
    expect(isValidCpf('   ')).toBe(false);
  });

  it('rejeita menos de 11 dígitos', () => {
    expect(isValidCpf('1234567890')).toBe(false);
  });

  it('rejeita mais de 11 dígitos (normaliza para 11)', () => {
    expect(normalizeCpf('390533447051234')).toBe('39053344705');
    expect(isValidCpf('390533447051234')).toBe(true);
  });

  it('formatCpf aplica máscara parcial', () => {
    expect(formatCpf('39053344705')).toBe('390.533.447-05');
  });
});
