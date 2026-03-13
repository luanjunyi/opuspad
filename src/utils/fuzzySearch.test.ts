import { describe, expect, it } from 'vitest';
import { fuzzyMatchPath, sortFuzzyMatches } from './fuzzySearch';

function pickCharacters(source: string, indices: number[]): string {
  return indices.map((index) => source[index]).join('');
}

describe('fuzzyMatchPath', () => {
  it('matches contiguous characters strongly', () => {
    const match = fuzzyMatchPath('meeting-notes.md', 'meet');

    expect(match?.score).toBeGreaterThan(0);
    expect(match?.indices).toEqual([0, 1, 2, 3]);
  });

  it('matches non-contiguous subsequences', () => {
    const source = 'release-checklist.md';
    const match = fuzzyMatchPath(source, 'rck');

    expect(match?.score).toBeGreaterThan(0);
    expect(match?.indices).toHaveLength(3);
    expect(pickCharacters(source, match?.indices ?? [])).toBe('rck');
  });

  it('matches against directory segments in the relative path', () => {
    const source = 'docs/guides/getting-started.md';
    const match = fuzzyMatchPath(source, 'dgs');

    expect(match?.score).toBeGreaterThan(0);
    expect(match?.indices).toHaveLength(3);
    expect(pickCharacters(source, match?.indices ?? [])).toBe('dgs');
  });

  it('prefers a contiguous basename match over scattered directory matches', () => {
    const basenameMatch = fuzzyMatchPath('src/components/Sidebar.tsx', 'side');
    const scatteredMatch = fuzzyMatchPath('src/types/index.ts', 'side');

    expect(basenameMatch?.indices).toEqual([15, 16, 17, 18]);
    expect(basenameMatch?.score).toBeGreaterThan(scatteredMatch?.score ?? 0);
  });

  it('normalizes backslashes in the query', () => {
    expect(fuzzyMatchPath('docs/guide.md', 'docs\\guide')).toEqual(
      fuzzyMatchPath('docs/guide.md', 'docs/guide')
    );
  });

  it('returns null when the query cannot be formed', () => {
    expect(fuzzyMatchPath('notes.md', 'zq')).toBeNull();
  });
});

describe('sortFuzzyMatches', () => {
  it('prioritizes higher scores and then shorter relative paths', () => {
    const sorted = sortFuzzyMatches([
      { node: { name: 'meeting-notes.md', path: 'longer/path/meeting-notes.md', kind: 'file', handle: null }, score: 16 },
      { node: { name: 'meet.md', path: 'meet.md', kind: 'file', handle: null }, score: 16 },
      { node: { name: 'my-editor.ts', path: 'my-editor.ts', kind: 'file', handle: null }, score: 11 },
    ]);

    expect(sorted.map((entry) => entry.node.path)).toEqual([
      'meet.md',
      'longer/path/meeting-notes.md',
      'my-editor.ts',
    ]);
  });
});
