import { describe, expect, it } from 'vitest';
import type { ActiveFile } from '../types';
import { applySavedTextFileState } from './activeFileSave';

function createActiveFile(path: string, content: string): ActiveFile {
  return {
    node: {
      name: path.split('/').pop() || path,
      kind: 'file',
      path,
      handle: { kind: 'file', name: path.split('/').pop() || path, path } as any,
    },
    state: {
      kind: 'text',
      path,
      content,
      editor: 'text',
    },
  };
}

describe('applySavedTextFileState', () => {
  it('updates both node and state paths after Save As', () => {
    const nextHandle = { kind: 'file', name: 'renamed.md' } as FileSystemFileHandle;

    const updated = applySavedTextFileState(createActiveFile('draft.md', 'before'), {
      content: 'after',
      fileHandle: nextHandle,
      originalPath: 'draft.md',
      savePath: 'renamed.md',
    });

    expect(updated?.node.path).toBe('renamed.md');
    expect(updated?.node.name).toBe('renamed.md');
    expect(updated?.node.handle).toBe(nextHandle);
    expect(updated?.state.kind).toBe('text');
    if (updated?.state.kind === 'text') {
      expect(updated.state.path).toBe('renamed.md');
      expect(updated.state.content).toBe('after');
    }
  });

  it('ignores late saves after the active file has changed', () => {
    const current = createActiveFile('other.md', 'current');

    expect(
      applySavedTextFileState(current, {
        content: 'stale',
        fileHandle: { kind: 'file', name: 'draft.md' } as FileSystemFileHandle,
        originalPath: 'draft.md',
        savePath: 'draft.md',
      })
    ).toBe(current);
  });
});
