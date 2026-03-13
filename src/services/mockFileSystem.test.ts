import { describe, expect, it } from 'vitest';
import { MockFileSystemService } from './mockFileSystem';

describe('MockFileSystemService', () => {
  it('writes nested files back to their full path instead of flattening them to the root', async () => {
    const service = new MockFileSystemService({
      folder1: {
        'nested.txt': 'Original nested content',
      },
    });
    const rootNodes = await service.readDirectory({} as FileSystemDirectoryHandle);
    const folderNode = rootNodes.find((node) => node.path === 'folder1');

    expect(folderNode).toBeDefined();
    expect(folderNode?.kind).toBe('directory');

    const nestedNodes = await service.readDirectory(folderNode!.handle as FileSystemDirectoryHandle, folderNode!.path);
    const nestedNode = nestedNodes.find((node) => node.path === 'folder1/nested.txt');

    expect(nestedNode).toBeDefined();

    await service.writeFile(nestedNode!.handle as FileSystemFileHandle, 'Updated nested content');

    const nestedFile = await service.readEditableFile(nestedNode!.handle as FileSystemFileHandle, nestedNode!.path);
    expect(nestedFile).toEqual({
      kind: 'text',
      path: 'folder1/nested.txt',
      content: 'Updated nested content',
      editor: 'text',
      warning: undefined,
      canOpenInSourceMode: false,
      canOpenInRichMode: false,
    });

    const topLevelNodes = await service.readDirectory({} as FileSystemDirectoryHandle);
    expect(topLevelNodes.some((node) => node.path === 'nested.txt')).toBe(false);
  });

  it('creates files in the requested directory instead of the root', async () => {
    const service = new MockFileSystemService({
      docs: {},
    });
    const rootNodes = await service.readDirectory({} as FileSystemDirectoryHandle);
    const docsNode = rootNodes.find((node) => node.path === 'docs');

    expect(docsNode).toBeDefined();
    expect(docsNode?.kind).toBe('directory');

    const createdNode = await service.createFile(
      docsNode!.handle as FileSystemDirectoryHandle,
      docsNode!.path,
      'draft.md'
    );

    expect(createdNode.path).toBe('docs/draft.md');

    const nestedNodes = await service.readDirectory(docsNode!.handle as FileSystemDirectoryHandle, docsNode!.path);
    expect(nestedNodes.some((node) => node.path === 'docs/draft.md')).toBe(true);

    const topLevelNodes = await service.readDirectory({} as FileSystemDirectoryHandle);
    expect(topLevelNodes.some((node) => node.path === 'draft.md')).toBe(false);
  });

  it('deletes files at their nested path instead of from the root', async () => {
    const service = new MockFileSystemService({
      docs: {
        'draft.md': 'Draft',
      },
    });

    await service.deleteFile({} as FileSystemDirectoryHandle, 'docs/draft.md');

    const docsNodes = await service.readDirectory({} as FileSystemDirectoryHandle, 'docs');
    expect(docsNodes.some((node) => node.path === 'docs/draft.md')).toBe(false);
  });
});
