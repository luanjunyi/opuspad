import { describe, expect, it } from 'vitest';
import { fuzzyMatchPath, sortFuzzyMatches } from './fuzzySearch';

describe('fuzzyMatchPath', () => {
  it('matches contiguous characters strongly', () => {
    const match = fuzzyMatchPath('meeting-notes.md', 'meet');

    expect(match?.score).toBeGreaterThan(0);
    expect(match?.indices).toEqual([0, 1, 2, 3]);
  });

  it('matches non-contiguous subsequences', () => {
    const match = fuzzyMatchPath('release-checklist.md', 'rck');

    expect(match?.score).toBeGreaterThan(0);
    expect(match?.indices).toEqual([0, 8, 12]);
  });

  it('matches against directory segments in the relative path', () => {
    const match = fuzzyMatchPath('docs/guides/getting-started.md', 'dgs');

    expect(match?.score).toBeGreaterThan(0);
    expect(match?.indices).toEqual([0, 5, 10]);
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
