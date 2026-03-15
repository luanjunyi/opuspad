import { FileSystemService, FileNode, LoadFileResult } from '../types';
import { isLikelyBinary, isMarkdownPath } from '../utils/fileType';
import { checkMarkdownCompatibility } from '../utils/markdownCompatibility';

export const BrowserFileSystemService: FileSystemService = {
  async mountWorkspace(): Promise<FileSystemDirectoryHandle | null> {
    try {
      const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
      return handle;
    } catch (error: any) {
      if (error.name === 'AbortError') return null;
      throw error;
    }
  },

  async ensurePermission(
    handle: FileSystemFileHandle | FileSystemDirectoryHandle,
    mode: "read" | "readwrite"
  ): Promise<boolean> {
    const opts = { mode };
    // @ts-ignore - queryPermission and requestPermission are part of FileSystemHandle in newer browsers
    if (typeof handle.queryPermission !== 'function') return true; // fallback
    
    // @ts-ignore
    let permission = await handle.queryPermission(opts);
    if (permission === 'granted') {
      return true;
    }
    
    // @ts-ignore
    permission = await handle.requestPermission(opts);
    return permission === 'granted';
  },

  async readDirectory(
    dirHandle: FileSystemDirectoryHandle,
    currentPath: string = ''
  ): Promise<FileNode[]> {
    const nodes: FileNode[] = [];
    
    // @ts-ignore
    for await (const entry of dirHandle.values()) {
      const path = currentPath ? `${currentPath}/${entry.name}` : entry.name;
      const node: FileNode = {
        name: entry.name,
        kind: entry.kind,
        path,
        handle: entry,
        childrenLoaded: false,
      };
      nodes.push(node);
    }
    
    return nodes.sort((a, b) => {
      if (a.kind === b.kind) {
        return a.name.localeCompare(b.name);
      }
      return a.kind === 'directory' ? -1 : 1;
    });
  },

  async createFile(
    dirHandle: FileSystemDirectoryHandle,
    currentPath: string,
    rawName: string
  ): Promise<FileNode> {
    const name = rawName.trim();
    if (!name) {
      throw new Error('File name is required');
    }

    if (name.includes('/') || name.includes('\\')) {
      throw new Error('Use a file name, not a path');
    }

    const hasPermission = await this.ensurePermission(dirHandle, 'readwrite');
    if (!hasPermission) {
      throw new Error('Permission denied to create file');
    }

    try {
      // @ts-ignore - getFileHandle is part of FileSystemDirectoryHandle
      await dirHandle.getFileHandle(name);
      throw new Error('A file with that name already exists');
    } catch (error: any) {
      if (error?.message === 'A file with that name already exists') {
        throw error;
      }

      if (error?.name && error.name !== 'NotFoundError') {
        throw error;
      }
    }

    // @ts-ignore - getFileHandle is part of FileSystemDirectoryHandle
    const fileHandle = await dirHandle.getFileHandle(name, { create: true });
    const path = currentPath ? `${currentPath}/${name}` : name;

    return {
      name,
      kind: 'file',
      path,
      handle: fileHandle,
      childrenLoaded: false,
    };
  },

  async deleteFile(rootHandle: FileSystemDirectoryHandle, path: string): Promise<void> {
    const parts = path.split('/').filter(Boolean);
    const fileName = parts.pop();

    if (!fileName) {
      throw new Error('File path is required');
    }

    const hasPermission = await this.ensurePermission(rootHandle, 'readwrite');
    if (!hasPermission) {
      throw new Error('Permission denied to delete file');
    }

    let directoryHandle = rootHandle;
    for (const part of parts) {
      // @ts-ignore - getDirectoryHandle is part of FileSystemDirectoryHandle
      directoryHandle = await directoryHandle.getDirectoryHandle(part);
    }

    // @ts-ignore - removeEntry is part of FileSystemDirectoryHandle
    await directoryHandle.removeEntry(fileName);
  },

  async readEditableFile(fileHandle: FileSystemFileHandle, path: string): Promise<LoadFileResult> {
    try {
      const hasPermission = await this.ensurePermission(fileHandle, 'read');
      if (!hasPermission) {
        return { kind: 'error', path, reason: 'permission_denied', message: 'Permission denied to read file' };
      }

      const file = await fileHandle.getFile();
      const buffer = await file.arrayBuffer();
      
      if (isLikelyBinary(buffer)) {
        return { kind: 'error', path, reason: 'binary', message: 'Binary files cannot be edited' };
      }

      let content: string;
      try {
        const decoder = new TextDecoder('utf-8', { fatal: true });
        content = decoder.decode(buffer);
      } catch (e) {
        return { kind: 'error', path, reason: 'unsupported_encoding', message: 'File is not valid UTF-8' };
      }

      let editor: "markdown" | "text" = "text";
      let warning: string | undefined = undefined;
      let canOpenInSourceMode = false;
      let canOpenInRichMode = false;

      if (isMarkdownPath(path)) {
        editor = "markdown";
        canOpenInSourceMode = true;
        const compat = await checkMarkdownCompatibility(content);
        if (!compat.compatible) {
          warning = compat.warning || 'This Markdown may be rewritten when saved from the rich editor. Review the rich preview and switch to source mode if exact formatting matters.';
        }
      } else {
        canOpenInRichMode = false;
      }

      return { kind: 'text', path, content, editor, warning, canOpenInSourceMode, canOpenInRichMode };
    } catch (error: any) {
      return { kind: 'error', path, reason: 'read_failed', message: error.message || 'Failed to read file' };
    }
  },

  async writeFile(fileHandle: FileSystemFileHandle, content: string): Promise<void> {
    const hasPermission = await this.ensurePermission(fileHandle, 'readwrite');
    if (!hasPermission) throw new Error('Permission denied to write file');

    // @ts-ignore - createWritable is part of FileSystemFileHandle
    const writable = await fileHandle.createWritable();
    await writable.write(content);
    await writable.close();
  }
};
