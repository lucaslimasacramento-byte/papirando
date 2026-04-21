import { describe, expect, it } from 'vitest';
import { galleryMapFromRow, sanitizeDadosForGallerySave } from './mindMapGalleryApi';

describe('sanitizeDadosForGallerySave', () => {
  it('remove metadados de galeria e mantém o restante', () => {
    const map = {
      id: 'x',
      galleryRowId: 'uuid',
      sortOrder: 3,
      sourceType: 'gallery',
      titulo: 'Meu mapa',
      nodes: [{ topicId: '1', label: 'A' }],
    };
    const out = sanitizeDadosForGallerySave(map);
    expect(out).toEqual({
      titulo: 'Meu mapa',
      nodes: [{ topicId: '1', label: 'A' }],
    });
  });

  it('retorna objeto vazio para entrada inválida', () => {
    expect(sanitizeDadosForGallerySave(null)).toEqual({});
    expect(sanitizeDadosForGallerySave(undefined)).toEqual({});
  });
});

describe('galleryMapFromRow', () => {
  it('monta registro normalizado com id estável gallery-… e sourceType gallery', () => {
    const row = {
      id: 'row-uuid-1',
      titulo: 'Direito Constitucional',
      sort_order: 5,
      dados: { promptBase: 'Revisão' },
    };
    const m = galleryMapFromRow(row, {});
    expect(m).not.toBeNull();
    expect(m.id).toBe('gallery-row-uuid-1');
    expect(m.sourceType).toBe('gallery');
    expect(m.titulo).toBe('Direito Constitucional');
    expect(m.promptBase).toBe('Revisão');
  });

  it('retorna null para linha inválida', () => {
    expect(galleryMapFromRow(null)).toBeNull();
    expect(galleryMapFromRow(undefined)).toBeNull();
  });
});
