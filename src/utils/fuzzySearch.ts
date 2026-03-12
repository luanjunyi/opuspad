import type { FileNode } from '../types';

export interface FuzzyMatch {
  score: number;
  indices: number[];
}

export interface FuzzyMatchResult {
  node: Pick<FileNode, 'name' | 'path' | 'handle' | 'kind'>;
  score: number;
}

export function fuzzyMatchPath(relativePath: string, rawQuery: string): FuzzyMatch | null {
  const query = rawQuery.trim().toLowerCase();
  if (!query) {
    return { score: 0, indices: [] };
  }

  const candidate = relativePath.toLowerCase().replace(/\\/g, '/');
  const indices: number[] = [];
  let candidateIndex = 0;
  let score = 0;

  for (let queryIndex = 0; queryIndex < query.length; queryIndex += 1) {
    const nextIndex = candidate.indexOf(query[queryIndex], candidateIndex);
    if (nextIndex === -1) {
      return null;
    }

    indices.push(nextIndex);
    score += 1;

    if (nextIndex === queryIndex) {
      score += 4;
    }

    const previousCharacter = candidate[nextIndex - 1];
    if (
      nextIndex === 0 ||
      previousCharacter === '/' ||
      previousCharacter === '-' ||
      previousCharacter === '_' ||
      previousCharacter === '.'
    ) {
      score += 5;
    }

    if (indices.length > 1 && nextIndex === indices[indices.length - 2] + 1) {
      score += 3;
    }

    candidateIndex = nextIndex + 1;
  }

  return { score, indices };
}

export function sortFuzzyMatches<T extends FuzzyMatchResult>(matches: T[]): T[] {
  return [...matches].sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }

    if (left.node.path.length !== right.node.path.length) {
      return left.node.path.length - right.node.path.length;
    }

    return left.node.path.localeCompare(right.node.path);
  });
}
