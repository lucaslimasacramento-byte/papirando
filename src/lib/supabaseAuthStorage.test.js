import { describe, expect, it } from 'vitest';

import { isUsableSupabaseAccessToken, isUsableSupabaseStoredSession } from './supabase';

function jwt(payload) {
  const encode = (value) =>
    btoa(JSON.stringify(value))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');

  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode(payload)}.sig`;
}

describe('storage de auth do Supabase', () => {
  it('rejeita JWT sem sub para evitar sessao anon como usuario', () => {
    expect(isUsableSupabaseAccessToken(jwt({ role: 'anon', exp: Math.floor(Date.now() / 1000) + 3600 }))).toBe(false);
  });

  it('aceita token de usuario do projeto quando possui sub e ainda nao expirou', () => {
    expect(
      isUsableSupabaseAccessToken(
        jwt({
          sub: '00000000-0000-4000-8000-000000000001',
          role: 'authenticated',
          exp: Math.floor(Date.now() / 1000) + 3600,
        })
      )
    ).toBe(true);
  });

  it('preserva sessao expirada quando ainda possui sub para permitir refresh token', () => {
    const stored = JSON.stringify({
      access_token: jwt({
        sub: '00000000-0000-4000-8000-000000000001',
        role: 'authenticated',
        exp: Math.floor(Date.now() / 1000) - 3600,
      }),
    });

    expect(isUsableSupabaseStoredSession(stored)).toBe(true);
  });
});
