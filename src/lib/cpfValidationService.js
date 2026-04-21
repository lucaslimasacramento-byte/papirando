/**
 * Camada de validação de CPF pensada para troca futura por provedor externo (Receita, etc.).
 * Hoje: apenas algoritmo local via cpfAlgorithm.
 *
 * Para integrar API paga no futuro: implemente validateCpfExternal() e chame-a aqui antes
 * ou depois do check local, sem alterar telas de cadastro.
 */

import { isValidCpf, normalizeCpf } from './cpfAlgorithm';

/** @typedef {'LOCAL_ALGORITHM'|'EXTERNAL_PENDING'} CpfValidationSource */

/**
 * @param {string} raw
 * @returns {{ ok: boolean, normalized: string, code?: string, message?: string, source: CpfValidationSource }}
 */
export function validateCpfForRegistration(raw) {
  const normalized = normalizeCpf(raw);
  if (!normalized.length) {
    return { ok: false, normalized: '', code: 'CPF_REQUIRED', message: 'Informe o CPF.', source: 'LOCAL_ALGORITHM' };
  }
  if (normalized.length !== 11) {
    return { ok: false, normalized, code: 'CPF_LENGTH', message: 'CPF deve ter 11 dígitos.', source: 'LOCAL_ALGORITHM' };
  }
  if (!isValidCpf(normalized)) {
    return { ok: false, normalized, code: 'CPF_INVALID', message: 'CPF inválido.', source: 'LOCAL_ALGORITHM' };
  }
  return { ok: true, normalized, source: 'LOCAL_ALGORITHM' };
}
