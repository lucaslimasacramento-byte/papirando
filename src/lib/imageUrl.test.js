import { describe, it, expect } from 'vitest';
import { storageThumb, storageBanner } from './imageUrl';

const PUBLICA = 'https://xyz.supabase.co/storage/v1/object/public/avatars/lucas/capa.png';

describe('storageThumb', () => {
  it('trava na escada de logos', () => {
    expect(storageThumb(PUBLICA, 40)).toContain('width=128');
    expect(storageThumb(PUBLICA, 200)).toContain('width=256');
    expect(storageThumb(PUBLICA, 9000)).toContain('width=256');
  });

  it('nao mexe em url de fora do storage', () => {
    expect(storageThumb('https://exemplo.com/foto.png', 128)).toBe('https://exemplo.com/foto.png');
    expect(storageThumb('', 128)).toBe('');
  });
});

describe('storageBanner', () => {
  // A capa passava pela escada de logos e chegava borrada: 256px esticados para a largura
  // do cartao, que em tela cheia passa de 1400px.
  it('serve a capa larga o bastante para o cartao', () => {
    const url = storageBanner(PUBLICA);
    expect(url).toContain('width=1600');
    expect(url).toContain('height=500');
  });

  // `cover` e nao `contain`: o corte e intencional, e o enquadramento vertical fica com o
  // aluno (ver posicaoDaCapa).
  it('corta em vez de encaixar', () => {
    expect(storageBanner(PUBLICA)).toContain('resize=cover');
  });

  it('usa o endpoint de transformacao', () => {
    expect(storageBanner(PUBLICA)).toContain('/storage/v1/render/image/public/');
  });

  it('nao mexe em url de fora do storage', () => {
    expect(storageBanner('https://exemplo.com/capa.png')).toBe('https://exemplo.com/capa.png');
    expect(storageBanner('')).toBe('');
    expect(storageBanner(null)).toBe('');
  });
});
