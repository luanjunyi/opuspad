import type { FileNode } from '../types';

export interface FuzzyMatch {
  score: number;
  indices: number[];
}

export interface FuzzyMatchResult {
  node: Pick<FileNode, 'name' | 'path' | 'handle' | 'kind'>;
  score: number;
}

const MATCH_BOUNDARY_CHARACTERS = new Set(['/', '-', '_', '.']);

export function fuzzyMatchPath(relativePath: string, rawQuery: string): FuzzyMatch | null {
  const query = normalizeForSearch(rawQuery);
  if (!query) {
    return { score: 0, indices: [] };
  }

  const candidate = normalizeForSearch(relativePath);
  const contiguousMatch = findContiguousMatch(candidate, query);
  if (contiguousMatch) {
    return contiguousMatch;
  }

  return findBestSubsequenceMatch(candidate, query);
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

function normalizeForSearch(value: string): string {
  return value.trim().toLowerCase().replace(/\\/g, '/');
}

function isBoundaryCharacter(character: string | undefined): boolean {
  return character !== undefined && MATCH_BOUNDARY_CHARACTERS.has(character);
}

function buildIndices(start: number, length: number): number[] {
  return Array.from({ length }, (_, offset) => start + offset);
}

function findContiguousMatch(candidate: string, query: string): FuzzyMatch | null {
  const matchStart = candidate.indexOf(query);
  if (matchStart === -1) {
    return null;
  }

  const baseNameStart = candidate.lastIndexOf('/') + 1;
  const matchEnd = matchStart + query.length - 1;
  let score = query.length * 12;

  if (matchStart >= baseNameStart) {
    score += 30;
  }

  if (matchStart === baseNameStart) {
    score += 25;
  }

  if (matchStart === 0 || isBoundaryCharacter(candidate[matchStart - 1])) {
    score += 12;
  }

  const nextCharacter = candidate[matchEnd + 1];
  if (
    matchEnd === candidate.length - 1 ||
    nextCharacter === '/' ||
    nextCharacter === '.' ||
    isBoundaryCharacter(nextCharacter)
  ) {
    score += 6;
  }

  return {
    score,
    indices: buildIndices(matchStart, query.length),
  };
}

function findBestSubsequenceMatch(candidate: string, query: string): FuzzyMatch | null {
  const occurrences = Array.from(query, (character) => collectCharacterPositions(candidate, character));
  if (occurrences.some((positions) => positions.length === 0)) {
    return null;
  }

  const baseNameStart = candidate.lastIndexOf('/') + 1;
  let previousLayer = occurrences[0].map((position) => ({
    position,
    score: scoreSubsequenceCharacter(position, null, baseNameStart, candidate),
    previousIndex: -1,
  }));
  const backtrackLayers: number[][] = [previousLayer.map((entry) => entry.previousIndex)];

  for (let queryIndex = 1; queryIndex < occurrences.length; queryIndex += 1) {
    const currentPositions = occurrences[queryIndex];
    const currentLayer = currentPositions.map((position) => {
      let bestScore = Number.NEGATIVE_INFINITY;
      let bestPreviousIndex = -1;

      for (let previousIndex = 0; previousIndex < previousLayer.length; previousIndex += 1) {
        const previousEntry = previousLayer[previousIndex];
        if (previousEntry.position >= position) {
          continue;
        }

        const candidateScore =
          previousEntry.score + scoreSubsequenceCharacter(position, previousEntry.position, baseNameStart, candidate);
        if (candidateScore > bestScore) {
          bestScore = candidateScore;
          bestPreviousIndex = previousIndex;
        }
      }

      return {
        position,
        score: bestScore,
        previousIndex: bestPreviousIndex,
      };
    });

    previousLayer = currentLayer;
    backtrackLayers.push(currentLayer.map((entry) => entry.previousIndex));
  }

  let bestFinalIndex = -1;
  let bestFinalScore = Number.NEGATIVE_INFINITY;

  for (let index = 0; index < previousLayer.length; index += 1) {
    if (previousLayer[index].score > bestFinalScore) {
      bestFinalScore = previousLayer[index].score;
      bestFinalIndex = index;
    }
  }

  if (bestFinalIndex === -1 || bestFinalScore === Number.NEGATIVE_INFINITY) {
    return null;
  }

  const indices = new Array<number>(query.length);
  let layerIndex = occurrences.length - 1;
  let entryIndex = bestFinalIndex;

  while (layerIndex >= 0 && entryIndex !== -1) {
    indices[layerIndex] = occurrences[layerIndex][entryIndex];
    entryIndex = backtrackLayers[layerIndex][entryIndex];
    layerIndex -= 1;
  }

  return {
    score: bestFinalScore,
    indices,
  };
}

function collectCharacterPositions(candidate: string, character: string): number[] {
  const positions: number[] = [];

  for (let index = 0; index < candidate.length; index += 1) {
    if (candidate[index] === character) {
      positions.push(index);
    }
  }

  return positions;
}

function scoreSubsequenceCharacter(
  position: number,
  previousPosition: number | null,
  baseNameStart: number,
  candidate: string
): number {
  let score = 1;

  if (position >= baseNameStart) {
    score += 2;
  }

  if (position === baseNameStart) {
    score += 3;
  }

  if (position === 0 || isBoundaryCharacter(candidate[position - 1])) {
    score += 5;
  }

  if (previousPosition === null) {
    score -= Math.min(position, 4);
    return score;
  }

  const gap = position - previousPosition - 1;
  if (gap === 0) {
    score += 5;
  } else {
    score -= Math.min(gap, 4);
  }

  return score;
}
