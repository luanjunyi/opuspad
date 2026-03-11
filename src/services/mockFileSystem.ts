import { FileSystemService, FileNode, LoadFileResult } from '../types';

export class MockFileSystemService implements FileSystemService {
  private fileSystem: Record<string, string | Record<string, any>> = {
    'notes.md': '# Hello World\n\nThis is a mock note.',
    'notes-with-table.md': '| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |',
    'data.json': '{"hello": "world"}',
    'image.png': new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x00, 0x00, 0x00]).buffer as any, // Mock binary
    'folder1': {
      'nested.txt': 'Nested text',
    }
  };

  private async getByPath(pathParts: string[]): Promise<any> {
    let current: any = this.fileSystem;
    for (const part of pathParts) {
      if (current[part] === undefined) {
        throw new Error('Not found');
      }
      current = current[part];
    }
    return current;
  }

  async mountWorkspace(): Promise<FileSystemDirectoryHandle | null> {
    // Return a dummy handle
    return { kind: 'directory', name: 'root' } as unknown as FileSystemDirectoryHandle;
  }

  async ensurePermission(
    handle: FileSystemFileHandle | FileSystemDirectoryHandle,
    mode: "read" | "readwrite"
  ): Promise<boolean> {
    return true; // Always grant in mock unless we want to test denied state
  }

  async readDirectory(
    dirHandle: FileSystemDirectoryHandle,
    currentPath: string = ''
  ): Promise<FileNode[]> {
    const parts = currentPath ? currentPath.split('/') : [];
    let current;
    try {
      current = parts.length === 0 ? this.fileSystem : await this.getByPath(parts);
    } catch {
      return [];
    }

    if (typeof current !== 'object' || current instanceof ArrayBuffer) {
      return [];
    }

    const nodes: FileNode[] = [];
    for (const [name, value] of Object.entries(current)) {
      const isDir = typeof value === 'object' && !(value instanceof ArrayBuffer);
      nodes.push({
        name,
        kind: isDir ? 'directory' : 'file',
        path: currentPath ? `${currentPath}/${name}` : name,
        handle: { kind: isDir ? 'directory' : 'file', name } as any,
        childrenLoaded: false,
      });
    }

    return nodes.sort((a, b) => {
      if (a.kind === b.kind) return a.name.localeCompare(b.name);
      return a.kind === 'directory' ? -1 : 1;
    });
  }

  async readEditableFile(fileHandle: FileSystemFileHandle, path: string): Promise<LoadFileResult> {
    try {
      const parts = path.split('/');
      const content = await this.getByPath(parts);
      
      if (content instanceof ArrayBuffer || content?.buffer) {
         return { kind: 'error', path, reason: 'binary', message: 'Binary files cannot be edited' };
      }

      if (typeof content !== 'string') {
        throw new Error('Not a file');
      }

      let editor: "markdown" | "text" = "text";
      let warning: string | undefined = undefined;

      const lower = path.toLowerCase();
      if (lower.endsWith('.md') || lower.endsWith('.markdown')) {
        // Simple mock of compatibility: if it contains table, incompatible
        if (content.includes('|--')) {
           editor = "text";
           warning = 'Opened in source mode because this Markdown file cannot round-trip safely through the block editor.';
        } else {
           editor = "markdown";
        }
      }

      return { kind: 'text', path, content, editor, warning };

    } catch (e: any) {
      return { kind: 'error', path, reason: 'read_failed', message: e.message || 'Failed to read' };
    }
  }

  async writeFile(fileHandle: FileSystemFileHandle, content: string): Promise<void> {
    // In a real mock, we would need the full path. Since fileHandle doesn't easily store it here,
    // we assume the path was stashed on the handle in this mock implementation.
    const path = (fileHandle as any).name;
    // VERY simple mock write, just ignoring path hierarchy for now if not implemented.
    this.fileSystem[path] = content;
  }
}

export const mockFileSystemService = new MockFileSystemService();
