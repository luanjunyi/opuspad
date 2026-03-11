import { FileSystemService, FileNode, LoadFileResult } from '../types';

interface MockFileSystemTree {
  [key: string]: string | ArrayBuffer | MockFileSystemTree;
}

type MockFileSystemEntry = string | ArrayBuffer | MockFileSystemTree;

export class MockFileSystemService implements FileSystemService {
  private fileSystem: MockFileSystemTree = {
    'notes.md': '# Hello World\n\nThis is a mock note.',
    'notes-with-table.md': '| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |',
    'data.json': '{"hello": "world"}',
    'image.png': new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x00, 0x00, 0x00]).buffer as any, // Mock binary
    'folder1': {
      'nested.txt': 'Nested text',
    }
  };

  private isDirectoryEntry(entry: MockFileSystemEntry): entry is MockFileSystemTree {
    return typeof entry === 'object' && entry !== null && !(entry instanceof ArrayBuffer);
  }

  private async getByPath(pathParts: string[]): Promise<MockFileSystemEntry> {
    let current: MockFileSystemEntry = this.fileSystem;
    for (const part of pathParts) {
      if (!this.isDirectoryEntry(current) || current[part] === undefined) {
        throw new Error('Not found');
      }
      current = current[part];
    }
    return current;
  }

  private async setByPath(pathParts: string[], content: string): Promise<void> {
    if (pathParts.length === 0) {
      throw new Error('Invalid path');
    }

    let current: MockFileSystemTree = this.fileSystem;
    for (const part of pathParts.slice(0, -1)) {
      const next = current[part];
      if (!this.isDirectoryEntry(next)) {
        throw new Error('Parent directory not found');
      }
      current = next;
    }

    const leaf = pathParts[pathParts.length - 1];
    if (current[leaf] === undefined) {
      throw new Error('Not found');
    }

    current[leaf] = content;
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

    if (!this.isDirectoryEntry(current)) {
      return [];
    }

    const nodes: FileNode[] = [];
    for (const [name, value] of Object.entries(current)) {
      const isDir = this.isDirectoryEntry(value);
      const path = currentPath ? `${currentPath}/${name}` : name;
      nodes.push({
        name,
        kind: isDir ? 'directory' : 'file',
        path,
        handle: { kind: isDir ? 'directory' : 'file', name, path } as any,
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

      if (content instanceof ArrayBuffer) {
         return { kind: 'error', path, reason: 'binary', message: 'Binary files cannot be edited' };
      }

      if (this.isDirectoryEntry(content) || typeof content !== 'string') {
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
    const path = (fileHandle as any).path ?? (fileHandle as any).name;
    await this.setByPath(path.split('/'), content);
  }
}

export const mockFileSystemService = new MockFileSystemService();
