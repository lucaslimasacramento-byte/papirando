import { supabaseAnonKey, supabaseDirectUrl } from './supabase';

/**
 * Cadastro gratuito via Edge Function (validação e antifraude no servidor).
 * @param {{
 *   fullName: string,
 *   cpf: string,
 *   birthDate: string,
 *   email: string,
 *   password: string,
 *   celular?: string,
 *   referralCode?: string,
 * }} payload
 * @returns {Promise<{ success: boolean, message: string, code?: string, fieldErrors?: Record<string, string> }>}
 */
export async function registerFreeAccount(payload) {
  const base = String(supabaseDirectUrl || '').replace(/\/+$/, '');
  if (!base || !supabaseAnonKey) {
    return {
      success: false,
      code: 'CONFIG',
      message: 'Configuração do servidor incompleta. Tente mais tarde.',
    };
  }

  try {
    const res = await fetch(`${base}/functions/v1/register-free`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supabaseAnonKey}`,
        apikey: supabaseAnonKey,
      },
      body: JSON.stringify(payload),
    });

    const json = await res.json().catch(() => ({}));

    if (json && typeof json.success === 'boolean') {
      return {
        success: json.success,
        message: String(json.message || ''),
        code: json.code ? String(json.code) : undefined,
        fieldErrors: json.fieldErrors && typeof json.fieldErrors === 'object' ? json.fieldErrors : undefined,
      };
    }

    return {
      success: false,
      code: 'BAD_RESPONSE',
      message: 'Resposta inválida do servidor. Tente novamente.',
    };
  } catch (e) {
    console.error('[registerApi]', e);
    return {
      success: false,
      code: 'NETWORK',
      message: 'Não foi possível conectar. Verifique a internet ou tente mais tarde.',
    };
  }
}
