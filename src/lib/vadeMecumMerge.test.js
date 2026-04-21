import { describe, expect, it } from 'vitest';
import {
  mergeMarkers,
  mergeNoteStrings,
  mergeSearchHistory,
  mergeSectionStates,
  mergeVadeBootstrapState,
} from './vadeMecumMerge';

describe('mergeMarkers', () => {
  it('mantém marcações só no local quando o remoto tem outras', () => {
    const remote = [{ id: 'a', page: 1, label: 'R', createdAt: '2026-01-01T00:00:00.000Z' }];
    const local = [{ id: 'b', page: 2, label: 'L', createdAt: '2026-01-02T00:00:00.000Z' }];
    const out = mergeMarkers(remote, local);
    expect(out.map((m) => m.id).sort()).toEqual(['a', 'b']);
  });

  it('em id duplicado prefere createdAt mais recente', () => {
    const remote = [{ id: 'x', page: 1, label: 'old', createdAt: '2026-01-01T00:00:00.000Z' }];
    const local = [{ id: 'x', page: 1, label: 'new', createdAt: '2026-06-01T00:00:00.000Z' }];
    expect(mergeMarkers(remote, local)[0].label).toBe('new');
    expect(mergeMarkers(local, remote)[0].label).toBe('new');
  });
});

describe('mergeSectionStates', () => {
  it('combina favorito e revisão com OR', () => {
    const out = mergeSectionStates(
      { CF: { favorite: true, reviewed: false, note: '' } },
      { CF: { favorite: false, reviewed: true, note: '' } }
    );
    expect(out.CF.favorite).toBe(true);
    expect(out.CF.reviewed).toBe(true);
  });

  it('une notas sem duplicar quando uma contém a outra', () => {
    expect(mergeSectionStates({ A: { note: 'foo' } }, { A: { note: 'foo bar' } }).A.note).toBe('foo bar');
  });
});

describe('mergeNoteStrings', () => {
  it('retorna a mais longa quando são trechos diferentes', () => {
    expect(mergeNoteStrings('aaa', 'bb').length).toBe(3);
  });
});

describe('mergeSearchHistory', () => {
  it('deduplica e respeita o máximo', () => {
    const out = mergeSearchHistory(['b', 'a'], ['a', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k'], 4);
    expect(out).toEqual(['a', 'c', 'd', 'e']);
  });
});

describe('mergeVadeBootstrapState', () => {
  it('preserva marcadores locais junto com remotos', () => {
    const merged = mergeVadeBootstrapState({
      remote: {
        markers: [{ id: '1', page: 1, createdAt: '2026-01-01T00:00:00.000Z' }],
        sectionStates: {},
        searchHistory: [],
        selectedSection: 'CF',
        currentPage: 10,
        lastPdfSearch: '',
        updatedAt: '',
      },
      local: {
        markers: [{ id: '2', page: 2, createdAt: '2026-01-02T00:00:00.000Z' }],
        sectionStates: {},
        searchHistory: [],
        selectedSection: 'Outro',
        currentPage: 3,
        lastPdfSearch: 'lei',
        updatedAt: '',
      },
    });
    expect(merged.markers.map((m) => m.id).sort()).toEqual(['1', '2']);
    expect(merged.selectedSection).toBe('CF');
    expect(merged.currentPage).toBe(10);
    expect(merged.lastPdfSearch).toBe('lei');
  });
});
