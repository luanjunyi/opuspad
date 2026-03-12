import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserFileSystemService } from './fileSystem';

describe('BrowserFileSystemService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock the global window object
    (global as any).window = {
      showDirectoryPicker: vi.fn(),
    };
  });

  it('mountWorkspace calls showDirectoryPicker', async () => {
    const mockHandle = { kind: 'directory', name: 'root' };
    (global.window as any).showDirectoryPicker.mockResolvedValue(mockHandle);
    
    const handle = await BrowserFileSystemService.mountWorkspace();
    expect(handle).toBe(mockHandle);
    expect(global.window.showDirectoryPicker).toHaveBeenCalledWith({ mode: 'readwrite' });
  });

  it('ensurePermission requests permission if not granted', async () => {
    const mockHandle = {
      queryPermission: vi.fn().mockResolvedValue('prompt'),
      requestPermission: vi.fn().mockResolvedValue('granted'),
    };

    const result = await BrowserFileSystemService.ensurePermission(mockHandle as any, 'read');
    expect(result).toBe(true);
    expect(mockHandle.queryPermission).toHaveBeenCalledWith({ mode: 'read' });
    expect(mockHandle.requestPermission).toHaveBeenCalledWith({ mode: 'read' });
  });

  it('ensurePermission returns false if permission denied', async () => {
    const mockHandle = {
      queryPermission: vi.fn().mockResolvedValue('prompt'),
      requestPermission: vi.fn().mockResolvedValue('denied'),
    };

    const result = await BrowserFileSystemService.ensurePermission(mockHandle as any, 'readwrite');
    expect(result).toBe(false);
  });

  it('readDirectory reads values lazily', async () => {
    const entry1 = { kind: 'file', name: 'test.txt' };
    const entry2 = { kind: 'directory', name: 'subfolder' };
    
    const mockDirHandle = {
      values: () => ({
        [Symbol.asyncIterator]: async function* () {
          yield entry1;
          yield entry2;
        }
      })
    };

    const nodes = await BrowserFileSystemService.readDirectory(mockDirHandle as any, 'root');
    expect(nodes.length).toBe(2);
    // Should be sorted: folders first
    expect(nodes[0].name).toBe('subfolder');
    expect(nodes[0].kind).toBe('directory');
    expect(nodes[0].path).toBe('root/subfolder');
    expect(nodes[1].name).toBe('test.txt');
    expect(nodes[1].kind).toBe('file');
  });

  it('createFile creates a child file under the provided directory handle', async () => {
    const createdHandle = { kind: 'file', name: 'notes.md' };
    const mockDirHandle = {
      queryPermission: vi.fn().mockResolvedValue('granted'),
      getFileHandle: vi.fn().mockImplementation((_name: string, options?: { create?: boolean }) => {
        if (options?.create) {
          return Promise.resolve(createdHandle);
        }

        return Promise.reject({ name: 'NotFoundError' });
      }),
    };

    const node = await BrowserFileSystemService.createFile(
      mockDirHandle as any,
      'docs',
      'notes.md'
    );

    expect(mockDirHandle.getFileHandle).toHaveBeenCalledWith('notes.md', { create: true });
    expect(node).toEqual({
      name: 'notes.md',
      kind: 'file',
      path: 'docs/notes.md',
      handle: createdHandle,
      childrenLoaded: false,
    });
  });
});
