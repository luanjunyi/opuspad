import { describe, expect, it } from 'vitest';
import { MockFileSystemService } from './mockFileSystem';

describe('MockFileSystemService', () => {
  it('writes nested files back to their full path instead of flattening them to the root', async () => {
    const service = new MockFileSystemService();
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
});
