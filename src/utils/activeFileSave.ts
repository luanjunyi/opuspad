import type { ActiveFile } from '../types';

interface SavedTextFileStateInput {
  content: string;
  fileHandle: FileSystemFileHandle;
  originalPath: string;
  savePath: string;
}

export function applySavedTextFileState(
  current: ActiveFile | null,
  { content, fileHandle, originalPath, savePath }: SavedTextFileStateInput
): ActiveFile | null {
  if (!current || current.node.path !== originalPath || current.state.kind !== 'text') {
    return current;
  }

  return {
    ...current,
    node: {
      ...current.node,
      handle: fileHandle,
      path: savePath,
      name: fileHandle.name,
    },
    state: {
      ...current.state,
      path: savePath,
      content,
    },
  };
}
